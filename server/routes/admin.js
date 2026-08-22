// server/routes/admin.js — Comprehensive Admin Portal APIs

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const clerkClient = require('../config/clerk');

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'veyano2026';

// ── Admin Security Middleware ────────────────────────────────────────────────
function adminAuthGuard(req, res, next) {
  const passcode = req.headers['x-admin-passcode'] || req.headers['x-admin-key'] || req.query.passcode;
  const authHeader = req.headers.authorization;

  if (passcode && passcode === ADMIN_PASSCODE) {
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    return clerkClient.verifyToken(token)
      .then(decoded => {
        if (decoded && decoded.sub) {
          req.adminUser = decoded;
          return next();
        }
        return res.status(403).json({ error: 'Unauthorized admin access.' });
      })
      .catch(() => res.status(403).json({ error: 'Invalid admin token.' }));
  }

  return res.status(401).json({ error: 'Admin authentication required.' });
}

router.use(adminAuthGuard);

/**
 * GET /api/admin/analytics — Store KPIs and distribution
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, is_cod, created_at');

    if (ordersErr) throw ordersErr;

    // Fetch Clerk users
    let clerkUsersCount = 0;
    try {
      const clerkUsers = await clerkClient.users.getUserList({ limit: 100 });
      clerkUsersCount = clerkUsers.data ? clerkUsers.data.length : (Array.isArray(clerkUsers) ? clerkUsers.length : 0);
    } catch (e) {
      console.warn('[Admin] Clerk users count notice:', e.message);
    }

    const totalOrders = (orders || []).length;
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = (orders || []).filter(o => o.status === 'pending' || o.status === 'processing' || !o.status).length;
    const shippedOrders = (orders || []).filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length;
    const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
    const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled').length;

    // Unique customer emails in orders
    const uniqueOrderEmails = new Set((orders || []).map(o => o.customer_email).filter(Boolean));
    const totalCustomers = Math.max(clerkUsersCount, uniqueOrderEmails.size);

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      recentOrdersCount: totalOrders
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/orders — List all orders with items & customer details
 */
router.get('/orders', async (req, res, next) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: orders || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/orders/:id/status — Update order fulfillment & tracking
 */
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      awb_code,
      courier_name,
      tracking_url,
      notes,
      payment_status
    } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;
    if (awb_code !== undefined) updates.awb_code = awb_code;
    if (courier_name !== undefined) updates.courier_name = courier_name;
    if (tracking_url !== undefined) updates.tracking_url = tracking_url;
    if (notes !== undefined) updates.notes = notes;

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*, items:order_items(*)')
      .single();

    if (error) throw error;

    res.json({
      message: 'Order updated successfully.',
      order: updatedOrder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers — Complete customer list with login IDs, addresses & orders
 */
router.get('/customers', async (req, res, next) => {
  try {
    // 1. Fetch all orders with items to correlate customer order history
    const { data: allOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (ordersErr) throw ordersErr;

    // 2. Fetch Clerk registered users
    let clerkUsers = [];
    try {
      const resList = await clerkClient.users.getUserList({ limit: 100 });
      clerkUsers = resList.data || (Array.isArray(resList) ? resList : []);
    } catch (e) {
      console.warn('[Admin] Clerk users list notice:', e.message);
    }

    // 3. Fetch Supabase registered users
    const { data: dbUsers } = await supabase.from('users').select('*');

    // Customer map keyed by email (primary identifier)
    const customerMap = new Map();

    // A. Seed from Clerk registered users
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
        lastSignInAt: cu.lastSignInAt ? new Date(cu.lastSignInAt).toISOString() : null,
        savedAddresses,
        orders: [],
        totalOrders: 0,
        totalSpent: 0,
      });
    }

    // B. Merge Supabase users
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
            lastSignInAt: null,
            savedAddresses: [],
            orders: [],
            totalOrders: 0,
            totalSpent: 0,
          });
        }
      }
    }

    // C. Correlate with all customer orders (captures guest & registered orders)
    for (const order of (allOrders || [])) {
      const email = (order.customer_email || '').toLowerCase();
      const phone = order.customer_phone || '';
      const orderKey = email || (phone ? `phone_${phone}` : `order_${order.id}`);

      let customer = customerMap.get(orderKey);
      if (!customer && email) {
        customer = customerMap.get(email);
      }

      if (!customer) {
        customer = {
          id: order.user_id || order.id,
          clerkId: order.user_id || null,
          name: order.customer_name || 'Customer',
          email: order.customer_email || 'Not Provided',
          phone: order.customer_phone || '—',
          authType: 'Direct Storefront',
          createdAt: order.created_at,
          lastSignInAt: order.created_at,
          savedAddresses: [],
          orders: [],
          totalOrders: 0,
          totalSpent: 0,
        };
        customerMap.set(orderKey, customer);
      }

      // Add order shipping address if not already present
      const fullAddr = `${order.shipping_address || ''}, ${order.shipping_city || ''}, ${order.shipping_state || ''} - ${order.shipping_pincode || ''}`.trim();
      const addrExists = customer.savedAddresses.some(a => 
        (typeof a === 'string' ? a : `${a.addressLine1 || ''} ${a.city || ''} ${a.pincode || ''}`).includes(order.shipping_pincode || '')
      );

      if (!addrExists && order.shipping_address) {
        customer.savedAddresses.push({
          tag: 'Order Address',
          recipientName: order.customer_name,
          phone: order.customer_phone,
          addressLine1: order.shipping_address,
          city: order.shipping_city,
          state: order.shipping_state,
          pincode: order.shipping_pincode,
          formatted: fullAddr
        });
      }

      customer.orders.push({
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        status: order.status || 'pending',
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        itemsCount: (order.items || []).length,
        itemsSummary: (order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ')
      });

      customer.totalOrders += 1;
      customer.totalSpent += (order.total_amount || 0);
    }

    const customersList = Array.from(customerMap.values()).sort((a, b) => b.totalOrders - a.totalOrders || new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ data: customersList });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
