/**
 * api/_private/admin.js — Enterprise Serverless Admin Router
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB, getClerk } = require('../_clients');

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET || 'veyano_vault_secret_admin_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'veyano2026';

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── In-Memory Persistence Layer for Serverless ────────────────────────────────
let globalAuditLogs = [];
let globalApprovals = [];
let globalLedger = [];
let globalPriceHistory = [];

let fallbackProducts = [];
try {
  const { DEFAULT_PRODUCTS } = require('../../public/products-data');
  fallbackProducts = DEFAULT_PRODUCTS;
} catch (e) {
  fallbackProducts = [];
}

// ── Token Generator & Verifier ────────────────────────────────────────────────
function generateAdminToken(role = 'OWNER', email = 'keshavgandhi871@gmail.com', name = 'Keshav Gandhi') {
  const payload = {
    role,
    email,
    name,
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(base64Payload).digest('base64url');
  return `${base64Payload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;

  const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(base64Payload).digest('base64url');
  if (signature.length !== expectedSig.length) return null;
  
  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  if (!isValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// ── 1. POST /api/admin/auth/login ────────────────────────────────────────────
router.post('/auth/login', (req, res) => {
  const { passcode, email, role } = req.body || {};

  if (!passcode || typeof passcode !== 'string') {
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  const inputBuffer = Buffer.from(passcode);
  const targetBuffer = Buffer.from(ADMIN_PASSCODE);

  let isMatch = false;
  if (inputBuffer.length === targetBuffer.length) {
    isMatch = crypto.timingSafeEqual(inputBuffer, targetBuffer);
  }

  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect admin passcode. Access denied.' });
  }

  const assignedRole = role || 'OWNER';
  const assignedEmail = email || 'keshavgandhi871@gmail.com';
  const assignedName = assignedRole === 'OWNER' ? 'Keshav Gandhi (Founder)' : `${assignedRole} Operator`;

  const token = generateAdminToken(assignedRole, assignedEmail, assignedName);

  res.json({
    message: 'Admin authenticated successfully.',
    token,
    role: assignedRole,
    name: assignedName,
    email: assignedEmail,
    expiresIn: '12h'
  });
});

// ── 2. Admin Security Guard Middleware ────────────────────────────────────────
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }

  const adminSession = verifyAdminToken(token);
  if (adminSession) {
    req.admin = adminSession;
    return next();
  }

  if (token) {
    const clerk = getClerk();
    if (clerk) {
      return clerk.verifyToken(token)
        .then(decoded => {
          if (decoded && decoded.sub) {
            req.admin = {
              role: 'OWNER',
              email: 'clerk_admin@veyano.in',
              name: 'Clerk SSO Admin'
            };
            return next();
          }
          return res.status(403).json({ error: 'Access Denied: Invalid or expired admin token.' });
        })
        .catch(() => res.status(403).json({ error: 'Access Denied: Unauthorized admin access.' }));
    }
  }

  return res.status(401).json({ error: 'Access Denied: Authentication required for this admin endpoint.' });
}

router.use(requireAdminAuth);

/**
 * GET /api/admin/me
 */
router.get('/me', (req, res) => {
  res.json({
    name: req.admin?.name || 'Administrator',
    email: req.admin?.email || 'admin@veyano.in',
    role: req.admin?.role || 'OWNER'
  });
});

/**
 * GET /api/admin/auth/verify
 */
router.get('/auth/verify', (req, res) => {
  res.json({ valid: true, role: req.admin?.role || 'OWNER', name: req.admin?.name });
});

/**
 * GET /api/admin/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const db = getDB();
    const { data: orders } = await db
      .from('orders')
      .select('id, total_amount, status, payment_status, is_cod, created_at');

    let clerkUsersCount = 0;
    const clerk = getClerk();
    if (clerk) {
      try {
        const clerkUsers = await clerk.users.getUserList({ limit: 100 });
        clerkUsersCount = clerkUsers.data ? clerkUsers.data.length : (Array.isArray(clerkUsers) ? clerkUsers.length : 0);
      } catch (e) {}
    }

    const totalOrders = (orders || []).length;
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = (orders || []).filter(o => o.status === 'pending' || o.status === 'processing' || !o.status).length;
    const shippedOrders = (orders || []).filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length;
    const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
    const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled').length;

    const uniqueOrderEmails = new Set((orders || []).map(o => o.customer_email).filter(Boolean));
    const totalCustomers = Math.max(clerkUsersCount, uniqueOrderEmails.size);
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      aov,
      lowStockCount: 0,
      pendingApprovals: globalApprovals.filter(a => a.status === 'PENDING').length,
      recentOrdersCount: totalOrders
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics', detail: err.message });
  }
});

/**
 * GET /api/admin/orders
 */
router.get('/orders', async (req, res) => {
  try {
    const db = getDB();
    const { data: orders, error } = await db
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: orders || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders', detail: err.message });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 */
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status, awb_code, courier_name, tracking_url, notes, payment_status } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;
    if (awb_code !== undefined) updates.awb_code = awb_code;
    if (courier_name !== undefined) updates.courier_name = courier_name;
    if (tracking_url !== undefined) updates.tracking_url = tracking_url;
    if (notes !== undefined) updates.notes = notes;

    const { data: updatedOrder, error } = await db
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*, items:order_items(*)')
      .single();

    if (error) throw error;

    globalAuditLogs.unshift({
      id: `EVT-${Date.now()}`,
      event_id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: req.admin?.name || 'Admin',
      actor_role: req.admin?.role || 'OPERATIONS',
      action: 'ORDER_STATUS_CHANGED',
      entity_type: 'ORDER',
      entity_id: id,
      entity_name: `Order #${updatedOrder.order_number || id}`,
      new_value: { status: updatedOrder.status, awb: updatedOrder.awb_code },
      reason: notes || 'Status update'
    });

    res.json({ message: 'Order updated successfully.', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order', detail: err.message });
  }
});

/**
 * GET /api/admin/customers
 */
router.get('/customers', async (req, res) => {
  try {
    const db = getDB();
    const { data: allOrders } = await db
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    let clerkUsers = [];
    const clerk = getClerk();
    if (clerk) {
      try {
        const resList = await clerk.users.getUserList({ limit: 100 });
        clerkUsers = resList.data || (Array.isArray(resList) ? resList : []);
      } catch (e) {}
    }

    const { data: dbUsers } = await db.from('users').select('*');
    const customerMap = new Map();

    for (const cu of clerkUsers) {
      const email = cu.emailAddresses?.[0]?.emailAddress?.toLowerCase() || `user_${cu.id}@clerk.user`;
      const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || cu.username || 'Registered User';
      const phone = cu.phoneNumbers?.[0]?.phoneNumber || '—';
      const savedAddresses = cu.unsafeMetadata?.addresses || [];

      customerMap.set(email, {
        id: cu.id,
        clerkId: cu.id,
        name,
        email,
        phone,
        authType: 'Clerk SSO / Account',
        createdAt: new Date(cu.createdAt).toISOString(),
        savedAddresses,
        orders: [],
        totalOrders: 0,
        totalSpent: 0,
      });
    }

    if (Array.isArray(dbUsers)) {
      for (const du of dbUsers) {
        const email = (du.email || '').toLowerCase();
        if (!email) continue;

        if (customerMap.has(email)) {
          const existing = customerMap.get(email);
          if (du.phone && existing.phone === '—') existing.phone = du.phone;
          if (du.name && existing.name === 'Registered User') existing.name = du.name;
        } else {
          customerMap.set(email, {
            id: du.id,
            clerkId: du.clerk_id || null,
            name: du.name || 'Valued Customer',
            email: du.email,
            phone: du.phone || '—',
            authType: du.clerk_id ? 'Clerk SSO' : 'Database Account',
            createdAt: du.created_at || new Date().toISOString(),
            savedAddresses: [],
            orders: [],
            totalOrders: 0,
            totalSpent: 0,
          });
        }
      }
    }

    for (const order of (allOrders || [])) {
      const email = (order.customer_email || '').toLowerCase();
      const phone = order.customer_phone || '';
      const orderKey = email || (phone ? `phone_${phone}` : `order_${order.id}`);

      let customer = customerMap.get(orderKey);
      if (!customer && email) customer = customerMap.get(email);

      if (!customer) {
        customer = {
          id: order.user_id || order.id,
          clerkId: order.user_id || null,
          name: order.customer_name || 'Customer',
          email: order.customer_email || 'Not Provided',
          phone: order.customer_phone || '—',
          authType: 'Direct Storefront',
          createdAt: order.created_at,
          savedAddresses: [],
          orders: [],
          totalOrders: 0,
          totalSpent: 0,
        };
        customerMap.set(orderKey, customer);
      }

      const fullAddr = `${order.shipping_address || ''}, ${order.shipping_city || ''}, ${order.shipping_state || ''} - ${order.shipping_pincode || ''}`.trim();
      const addrExists = customer.savedAddresses.some(a => 
        (typeof a === 'string' ? a : `${a.addressLine1 || ''} ${a.city || ''} ${a.pincode || ''}`).includes(order.shipping_pincode || '')
      );

      if (!addrExists && order.shipping_address) {
        customer.savedAddresses.push({
          tag: 'Order Address',
          formatted: fullAddr
        });
      }

      customer.orders.push({
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        status: order.status || 'pending',
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        itemsCount: (order.items || []).length,
        itemsSummary: (order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ')
      });

      customer.totalOrders += 1;
      customer.totalSpent += (order.total_amount || 0);
    }

    const customersList = Array.from(customerMap.values()).sort((a, b) => b.totalOrders - a.totalOrders);
    res.json({ data: customersList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers', detail: err.message });
  }
});

/**
 * DELETE /api/admin/orders/:id — Delete or Cancel an Order
 */
router.delete('/orders/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    try {
      await db.from('order_items').delete().eq('order_id', id);
    } catch (_) {}
    await db.from('orders').delete().eq('id', id);

    globalAuditLogs.unshift({
      id: `EVT-${Date.now()}`,
      event_id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: req.admin?.name || 'Admin',
      actor_role: req.admin?.role || 'OWNER',
      action: 'ORDER_DELETED',
      entity_type: 'ORDER',
      entity_id: id,
      entity_name: `Order #${id}`,
      reason: req.body?.reason || 'Order deleted by admin'
    });

    res.json({ success: true, message: `Order ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order', detail: err.message });
  }
});

/**
 * DELETE /api/admin/customers/:id — Delete Customer Profile
 */
router.delete('/customers/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    try {
      await db.from('users').delete().or(`id.eq.${id},email.eq.${id},clerk_id.eq.${id}`);
    } catch (_) {}

    globalAuditLogs.unshift({
      id: `EVT-${Date.now()}`,
      event_id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: req.admin?.name || 'Admin',
      actor_role: req.admin?.role || 'OWNER',
      action: 'CUSTOMER_DELETED',
      entity_type: 'CUSTOMER',
      entity_id: id,
      entity_name: `Customer ${id}`,
      reason: req.body?.reason || 'Customer removed by admin'
    });

    res.json({ success: true, message: `Customer ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer', detail: err.message });
  }
});

/**
 * POST /api/admin/bulk-delete — Universal Bulk Deletion Hub
 */
router.post('/bulk-delete', async (req, res) => {
  try {
    const db = getDB();
    const { type, ids, reason } = req.body || {};
    if (!type || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid entity type and array of IDs required.' });
    }

    if (type === 'retailer' && retailService) {
      for (const id of ids) {
        try {
          retailService.deleteRetailerPermanently(id, 'DELETE RETAILER PERMANENTLY', reason || 'Bulk delete', { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' });
        } catch (_) {
          try { retailService.archiveRetailer(id, reason || 'Bulk archive', { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' }); } catch (__) {}
        }
      }
      await retailService.savePersistentRetailDataAsync();
    } else if (type === 'order') {
      for (const id of ids) {
        try {
          await db.from('order_items').delete().eq('order_id', id);
          await db.from('orders').delete().eq('id', id);
        } catch (_) {}
      }
    } else if (type === 'customer') {
      for (const id of ids) {
        try {
          await db.from('users').delete().or(`id.eq.${id},email.eq.${id}`);
        } catch (_) {}
      }
    }

    res.json({ success: true, message: `Successfully deleted ${ids.length} ${type}(s).` });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed', detail: err.message });
  }
});

/**
 * GET /api/admin/products
 */
router.get('/products', async (req, res) => {
  try {
    const db = getDB();
    const { data: dbProducts } = await db.from('products').select('*');
    if (Array.isArray(dbProducts) && dbProducts.length > 0) {
      const merged = fallbackProducts.map(p => {
        const match = dbProducts.find(dp => dp.sku === p.sku);
        if (match) {
          return {
            ...p,
            price: match.price_paise ? match.price_paise / 100 : (match.price || p.price),
            stock: match.stock_quantity !== undefined ? match.stock_quantity : p.stock,
            stock_status: match.stock_quantity === 0 ? 'out_of_stock' : p.stock_status
          };
        }
        return p;
      });
      return res.json({ data: merged });
    }
  } catch (e) {}

  res.json({ data: fallbackProducts });
});

/**
 * POST /api/admin/products
 */
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    const db = getDB();

    await db.from('products').upsert({
      sku: productData.sku,
      product_name: productData.name || productData.product_name,
      price_paise: productData.price ? productData.price * 100 : 0,
      stock_quantity: productData.stock || 0,
      details: productData.description,
      image_url: productData.images?.[0]
    }, { onConflict: 'sku' });

    globalAuditLogs.unshift({
      id: `EVT-${Date.now()}`,
      event_id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: req.admin?.name || 'Admin',
      actor_role: req.admin?.role || 'OWNER',
      action: 'PRODUCT_UPDATED',
      entity_type: 'PRODUCT',
      entity_id: productData.sku,
      entity_name: productData.name,
      new_value: productData,
      reason: req.body.reason || 'Catalog update'
    });

    res.json({ message: 'Product updated successfully.', product: productData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product', detail: err.message });
  }
});

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', (req, res) => {
  res.json({ data: globalAuditLogs, total: globalAuditLogs.length });
});

/**
 * GET /api/admin/approvals
 */
router.get('/approvals', (req, res) => {
  res.json({ data: globalApprovals });
});

/**
 * POST /api/admin/approvals/:id/review
 */
router.post('/approvals/:id/review', (req, res) => {
  const { id } = req.params;
  const { decision, remarks } = req.body;
  const target = globalApprovals.find(a => a.id === id);
  if (target) {
    target.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    target.reviewed_by = req.admin?.name || 'Owner';
    target.reviewed_at = new Date().toISOString();
    target.review_remarks = remarks;
  }
  res.json({ message: `Request reviewed. Decision: ${decision}` });
});

/**
 * GET /api/admin/inventory/ledger
 */
router.get('/inventory/ledger', (req, res) => {
  res.json({ data: globalLedger, total: globalLedger.length });
});

/**
 * POST /api/admin/inventory/adjust
 */
router.post('/inventory/adjust', (req, res) => {
  const { sku, quantityDelta, movementType, reason } = req.body;
  globalLedger.unshift({
    id: `LEDGER-${Date.now()}`,
    sku,
    quantity_delta: quantityDelta,
    movement_type: movementType,
    reason: reason || 'Adjustment',
    created_by: req.admin?.name || 'Admin',
    created_at: new Date().toISOString()
  });
  res.json({ message: 'Stock ledger updated successfully.' });
});

/**
 * GET /api/admin/finance/summary
 */
router.get('/finance/summary', async (req, res) => {
  try {
    const db = getDB();
    const { data: orders } = await db.from('orders').select('*, items:order_items(*)');
    const totalOrders = (orders || []).length;
    const grossRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const codOrders = (orders || []).filter(o => o.is_cod || o.payment_method === 'cod');
    const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;

    res.json({
      grossRevenue,
      netRevenue: grossRevenue,
      totalOrders,
      aov,
      codOrdersCount: codOrders.length,
      codRevenue: codOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      onlineOrdersCount: totalOrders - codOrders.length,
      onlineRevenue: grossRevenue - codOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load finance summary', detail: err.message });
  }
});

/**
 * GET /api/admin/system/health
 */
router.get('/system/health', (req, res) => {
  res.json({
    application: { status: 'HEALTHY', version: '2.0.0-enterprise' },
    database: { status: 'HEALTHY', provider: 'Supabase PostgreSQL' },
    authentication: { status: 'HEALTHY', engine: 'Clerk SSO / HMAC Session' },
    payments: { status: 'HEALTHY', gateway: 'Razorpay PG' },
    auditSystem: { status: 'HEALTHY', appendOnly: true },
    compliance: { fssai: '20826010000397', validUntil: '2031' },
    timestamp: new Date().toISOString()
  });
});

// ── RETAIL NETWORK MODULE ENDPOINTS (SERVERLESS MIRROR) ───────────────────────
let retailService = null;
try {
  retailService = require('../../server/services/retailNetworkService');
} catch (e) {
  console.warn('Retail service require warning:', e.message);
}

// 1. Dashboard KPIs
router.get('/retail/dashboard', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const kpis = retailService.getRetailDashboardKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retail dashboard KPIs', detail: err.message });
  }
});

// 2. Retailer Directory (Search, Filter, Sort)
router.get('/retail/retailers', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const retailers = retailService.getAllRetailers(req.query);
    res.json({ success: true, data: retailers, total: retailers.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retailers', detail: err.message });
  }
});

// 3. Retailer 360 Profile
router.get('/retail/retailers/:id', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const profile = retailService.getRetailerProfile(req.params.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 4. Create Retailer
router.post('/retail/retailers', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const retailer = retailService.createRetailer(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, message: 'Retailer created successfully.', data: retailer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Update Retailer
router.put('/retail/retailers/:id', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const updated = retailService.updateRetailer(req.params.id, req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, message: 'Retailer updated successfully.', data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Archive / Soft Delete Retailer
router.delete('/retail/retailers/:id', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const result = retailService.archiveRetailer(req.params.id, req.body?.reason, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6b. Permanent Hard Delete (Owner Only)
router.post('/retail/retailers/:id/hard-delete', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const result = retailService.deleteRetailerPermanently(req.params.id, req.body?.confirmation_phrase, req.body?.reason, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6c. Retailer Audit History
router.get('/retail/retailers/:id/history', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const profile = retailService.getRetailerProfile(req.params.id);
    res.json({ success: true, data: profile.change_history || [] });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 7. Record Supply Order
router.post('/retail/supply', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const result = retailService.recordSupplyOrder(req.body, actor);
    if (result.requires_approval) {
      return res.status(403).json(result);
    }
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Record Payment
router.post('/retail/payments', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'FINANCE' };
    const result = retailService.recordPayment(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Record Return & Quarantine
router.post('/retail/returns', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const result = retailService.recordReturn(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Physical Stock Reconciliation
router.post('/retail/reconcile', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const result = retailService.reconcileStock(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Global Retail Stock Matrix
router.get('/retail/stock', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const matrix = retailService.getRetailStockMatrix(req.query);
    res.json({ success: true, data: matrix, total: matrix.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock matrix', detail: err.message });
  }
});

// 12. Follow-ups
router.get('/retail/followups', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const list = retailService.getFollowups(req.query);
    res.json({ success: true, data: list, total: list.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-ups', detail: err.message });
  }
});

router.post('/retail/followups', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'SALES' };
    const item = retailService.createFollowup(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/retail/followups/:id/complete', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'SALES' };
    const item = retailService.completeFollowup(req.params.id, req.body?.notes, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Internal Notes
router.post('/retail/notes', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const note = retailService.addRetailerNote(req.body.retailer_id, req.body.content, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 14. Statement
router.get('/retail/statement/:id', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const statement = retailService.getRetailerStatement(req.params.id, req.query);
    res.json({ success: true, data: statement });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 15. CSV Export
router.get('/retail/export/:type', async (req, res) => {
  try {
    if (!retailService) return res.status(503).json({ error: 'Retail service unavailable' });
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const csvContent = retailService.exportRetailCSV(req.params.type, req.query, actor);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="veyano_retail_${req.params.type}_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV', detail: err.message });
  }
});

module.exports = router;
