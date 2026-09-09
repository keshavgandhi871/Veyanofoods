// server/routes/orders.js — Omni-channel order management
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const clerkClient = require('../config/clerk');
const { deductStock } = require('../services/fefoService');
const { generateInvoice } = require('../services/invoiceService');
const { sendAdminOrderNotification } = require('../services/notificationService');

// Order number generator: VFO-YYYY-XXXXX
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  const orderCount = count || 0;
  return `VFO-${year}-${String(orderCount + 1).padStart(5, '0')}`;
}

const pincodeCache = new Map();
const https = require('https');

/**
 * GET /api/orders/pincode/:pin — Secure server-side pincode lookup
 */
router.get('/pincode/:pin', async (req, res) => {
  const pin = req.params.pin;
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    return res.status(400).json({ error: 'Invalid 6-digit Indian pincode.' });
  }

  if (pincodeCache.has(pin)) {
    return res.json(pincodeCache.get(pin));
  }

  try {
    const fetchPostal = () => new Promise((resolve, reject) => {
      const request = https.get(`https://api.postalpincode.in/pincode/${pin}`, { timeout: 4000 }, (response) => {
        let rawData = '';
        response.on('data', (chunk) => rawData += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            reject(e);
          }
        });
      });
      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Postal lookup timeout'));
      });
    });

    const data = await fetchPostal();
    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      const result = {
        success: true,
        district: po.District || po.Block || '',
        state: po.State || '',
        pincode: pin
      };
      pincodeCache.set(pin, result);
      return res.json(result);
    }
    return res.status(404).json({ error: 'Pincode not found.' });
  } catch (err) {
    console.warn('[Orders] Pincode lookup error:', err.message);
    res.status(500).json({ error: 'Postal service unavailable.' });
  }
});

/**
 * GET /api/orders/lookup/:id or /api/orders/:id — Public order confirmation lookup (by UUID or order_number)
 */
router.get('/lookup/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    if (!identifier) return res.status(400).json({ error: 'Order ID is required.' });

    let query = supabase.from('orders').select('*');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('order_number', identifier);
    }

    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup order', detail: err.message });
  }
});

/**
 * POST /api/orders — Create a new order (COD or verified Prepaid)
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      source = 'website',
      paymentMethod = 'cod',
      items,
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingPincode, shippingCity, shippingState,
      notes, razorpayOrderId, razorpayPaymentId
    } = req.body;

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await clerkClient.verifyToken(token);
        if (decoded && decoded.sub) userId = decoded.sub;
      } catch (err) {
        console.warn('[Orders] Could not verify Clerk token for order:', err.message);
      }
    }

    if (!items || !items.length) return res.status(400).json({ error: 'Order must have at least one item.' });
    if (!customerName || !customerPhone || !shippingAddress) {
      return res.status(400).json({ error: 'Customer name, phone, and shipping address are required.' });
    }

    const cleanItems = items.map(i => ({
      id: i.id || i.sku,
      sku: (i.sku || i.id || 'UNKNOWN').toUpperCase(),
      productName: i.productName || i.title || i.name,
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unitPrice) || Number(i.price) || 0,
      totalPrice: (Number(i.unitPrice) || Number(i.price) || 0) * (Number(i.quantity) || 1),
      weight: i.weight || ''
    }));

    const isCOD = paymentMethod === 'cod';
    const subtotalAmount = cleanItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingFee = subtotalAmount >= 499 ? 0 : 50;
    const codFee = isCOD ? 79 : 0;
    const totalAmount = subtotalAmount + shippingFee + codFee;
    const gstAmount = Math.round(subtotalAmount * 0.05);

    const shippingAddressObj = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      address: shippingAddress,
      city: shippingCity || '',
      state: shippingState || '',
      pincode: shippingPincode || ''
    };

    const orderNumber = await generateOrderNumber();

    const supabaseOrder = {
      order_number: orderNumber,
      user_id: userId,
      items: cleanItems,
      subtotal: subtotalAmount,
      subtotal_amount: subtotalAmount,
      shipping_fee: shippingFee,
      cod_fee: codFee,
      total_amount: totalAmount,
      payment_method: isCOD ? 'cod' : 'prepaid',
      payment_status: isCOD ? 'pending' : (razorpayPaymentId ? 'paid' : 'pending'),
      order_status: isCOD ? 'new' : 'processing',
      status: isCOD ? 'pending' : 'confirmed',
      shipping_address: shippingAddressObj,
      razorpay_order_id: razorpayOrderId || null,
      razorpay_payment_id: razorpayPaymentId || null,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone,
      source,
      is_cod: isCOD,
      notes: notes || null,
      gst_amount: gstAmount
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([supabaseOrder])
      .select()
      .single();

    if (orderError) {
      console.warn('[Orders] Insert error:', orderError.message);
      throw orderError;
    }

    // Insert order items for legacy order_items table
    const itemInserts = cleanItems.map(item => ({
      order_id: order.id,
      sku: item.sku,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice
    }));
    await supabase.from('order_items').insert(itemInserts).catch(e => console.warn('[Orders] order_items insert:', e.message));

    // Post-create async tasks
    setImmediate(async () => {
      try {
        for (const item of cleanItems) {
          try { await deductStock(item.sku, item.quantity); } catch (_) {}
        }
        await generateInvoice(order, cleanItems).catch(() => {});
        await sendAdminOrderNotification(order);
      } catch (e) {
        console.error('[Orders] Post-create task error:', e.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      orderId: order.id,
      orderNumber: order.order_number,
      isCOD: order.is_cod,
      totalAmount: order.total_amount,
    });

  } catch (err) {
    next(err);
  }
});

// Authenticated routes
router.use(authMiddleware);

/**
 * GET /api/orders — Fetch customer's own orders or all orders if admin
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    // If not global admin, only fetch current user's orders
    if (!req.user?.isAdmin) {
      if (userId && userEmail) {
        query = query.or(`user_id.eq.${userId},customer_email.eq.${userEmail}`);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (userEmail) {
        query = query.eq('customer_email', userEmail);
      } else {
        return res.json({ data: [] });
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
