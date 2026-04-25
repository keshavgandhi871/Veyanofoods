/**
 * api/index.js — Veyano Foods Vercel Serverless Handler
 *
 * Self-contained, lightweight serverless handler. Avoids importing
 * server/index.js which requires node-cron, sqlite3, pdfkit etc. that
 * are incompatible with Vercel serverless environments.
 */

// Load .env for local development (harmless no-op if file doesn't exist)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const { createClerkClient } = require('@clerk/backend');

const app = express();

// ── Clerk Client ──────────────────────────────────────────────────────────────
let _clerk = null;
function getClerk() {
  if (!_clerk) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.warn('Missing CLERK_SECRET_KEY. Auth routes will fail.');
      return null;
    }
    _clerk = createClerkClient({ secretKey });
  }
  return _clerk;
}

// ── Auth Middleware ───────────────────────────────────────────────────────────
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const clerk = getClerk();
  if (!clerk) return res.status(500).json({ error: 'Clerk not configured.' });

  try {
    const decoded = await clerk.verifyToken(token);
    const user = await clerk.users.getUser(decoded.sub);
    if (!user) throw new Error('User not found');
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// ── Supabase Client (lazy singleton — safe for serverless cold starts) ────────
let _supabase = null;
function getDB() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. Set them in Vercel project settings.');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const { error } = await getDB().from('blogs').select('id').limit(1);
    dbStatus = error ? `error: ${error.message}` : 'connected';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }
  res.json({
    status: 'ok',
    service: 'Veyano Foods API (Serverless)',
    db_status: dbStatus,
    clerk_status: getClerk() ? 'initialized' : 'missing_key',
    timestamp: new Date().toISOString(),
  });
});

// ── Auth Routes ──────────────────────────────────────────────────────────────
/** POST /api/auth/sync — Sync Clerk user with Supabase */
app.post('/api/auth/sync', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const db = getDB();

    const clerkId = user.id;
    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
    const phone = user.phoneNumbers[0]?.phoneNumber || 'N/A';

    const { data: upsertedUser, error } = await db
      .from('users')
      .upsert({
        clerk_id: clerkId,
        email: email,
        name: name,
        phone: phone,
        role: 'customer',
        password: 'AUTH_MANAGED_BY_CLERK'
      }, { onConflict: 'clerk_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'User synced successfully', user: upsertedUser });
  } catch (err) {
    console.error('[Auth] Sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync user', detail: err.message });
  }
});

/** GET /api/auth/me — Get current user info */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      email: req.user.emailAddresses[0]?.emailAddress,
    },
  });
});

// ── Blog Routes ───────────────────────────────────────────────────────────────

/** GET /api/blog — All published blog posts */
app.get('/api/blog', async (req, res) => {
  try {
    const { data, error } = await getDB()
      .from('blogs')
      .select('id, title, slug, image_url, author, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Blog] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch blogs', detail: err.message });
  }
});

/** GET /api/blog/:slug — Single blog post by slug */
app.get('/api/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { data, error } = await getDB()
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Blog not found' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('[Blog] Single post error:', err.message);
    res.status(500).json({ error: 'Failed to fetch blog post', detail: err.message });
  }
});

// ── Orders Route ──────────────────────────────────────────────────────────────

/**
 * POST /api/orders — Create a new COD order
 * Core order + items inserted into Supabase.
 * Heavy async tasks (email, WhatsApp, PDF invoice) are skipped in
 * serverless mode — add a queue/webhook for those if needed.
 */
app.post('/api/orders', async (req, res) => {
  try {
    const {
      paymentMethod, items,
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingPincode, shippingCity, shippingState,
      notes = '',
    } = req.body;

    if (!paymentMethod) return res.status(400).json({ error: 'paymentMethod is required.' });
    if (!items || !items.length) return res.status(400).json({ error: 'Order must have at least one item.' });

    const db = getDB();
    const subtotalAmount = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const isCOD = paymentMethod === 'cod';
    const shippingFee = subtotalAmount >= 499 ? 0 : 50;
    const codFee = isCOD ? 79 : 0;
    const totalAmount = subtotalAmount + shippingFee + codFee;

    // Generate order number based on row count
    const { count } = await db.from('orders').select('*', { count: 'exact', head: true });
    const orderNumber = `VFO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`;

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert([{
        order_number:   orderNumber,
        source:         'website',
        status:         'pending',
        payment_method: paymentMethod,
        payment_status: isCOD ? 'pending' : 'paid',
        customer_name:  customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        shipping_pincode: shippingPincode,
        shipping_city:  shippingCity,
        shipping_state: shippingState,
        subtotal_amount: subtotalAmount,
        shipping_fee:   shippingFee,
        gst_amount:     Math.round(subtotalAmount * 0.05),
        total_amount:   totalAmount,
        is_cod:         isCOD,
        notes,
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const itemInserts = items.map(item => ({
      order_id:     order.id,
      sku:          (item.sku || item.id || 'UNKNOWN').toUpperCase(),
      product_name: item.productName,
      quantity:     item.quantity,
      unit_price:   item.unitPrice,
      total_price:  item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await db.from('order_items').insert(itemInserts);
    if (itemsError) console.error('[Orders] Items insert error:', itemsError.message);

    res.status(201).json({
      message:     'Order created successfully.',
      orderId:     order.id,
      orderNumber: order.order_number,
      isCOD:       order.is_cod,
      totalAmount: order.total_amount,
    });
  } catch (err) {
    console.error('[Orders] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create order', detail: err.message });
  }
});

// ── Inventory Route ───────────────────────────────────────────────────────────
app.get('/api/inventory', async (req, res) => {
  try {
    const { data, error } = await getDB().from('products').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-All 404 ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
