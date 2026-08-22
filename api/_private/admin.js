/**
 * api/_private/admin.js — Vercel Serverless Admin Management Router
 */

const express = require('express');
const router = express.Router();
const { getDB, getClerk } = require('../_clients');

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
    const clerk = getClerk();
    if (clerk) {
      return clerk.verifyToken(token)
        .then(decoded => {
          if (decoded && decoded.sub) {
            req.adminUser = decoded;
            return next();
          }
          return res.status(403).json({ error: 'Unauthorized admin access.' });
        })
        .catch(() => res.status(403).json({ error: 'Invalid admin token.' }));
    }
  }

  return res.status(401).json({ error: 'Admin authentication required.' });
}

router.use(adminAuthGuard);

/**
 * GET /api/private/analytics & /api/admin/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const db = getDB();
    const { data: orders, error } = await db
      .from('orders')
      .select('id, total_amount, status, payment_status, is_cod, created_at');

    if (error) throw error;

    let clerkUsersCount = 0;
    const clerk = getClerk();
    if (clerk) {
      try {
        const clerkUsers = await clerk.users.getUserList({ limit: 100 });
        clerkUsersCount = clerkUsers.data ? clerkUsers.data.length : (Array.isArray(clerkUsers) ? clerkUsers.length : 0);
      } catch (e) {
        console.warn('[Admin] Clerk users count note:', e.message);
      }
    }

    const totalOrders = (orders || []).length;
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = (orders || []).filter(o => o.status === 'pending' || o.status === 'processing' || !o.status).length;
    const shippedOrders = (orders || []).filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length;
    const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
    const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled').length;

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
    res.status(500).json({ error: 'Failed to fetch analytics', detail: err.message });
  }
});

/**
 * GET /api/admin/orders & /api/private/orders
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
      } catch (e) {
        console.warn('[Admin] Clerk users note:', e.message);
      }
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
        lastSignInAt: cu.lastSignInAt ? new Date(cu.lastSignInAt).toISOString() : null,
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
            lastSignInAt: null,
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
    res.status(500).json({ error: 'Failed to fetch customers', detail: err.message });
  }
});

module.exports = router;
