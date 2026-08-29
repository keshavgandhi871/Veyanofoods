// server/routes/admin.js — Enterprise Admin & Operations Controller
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const clerkClient = require('../config/clerk');
const { ROLES, PERMISSIONS, hasPermission, requirePermission } = require('../middleware/rbac');
const { logAuditEvent, getAuditLogs } = require('../services/auditLogger');
const { recordInventoryMovement, getInventoryLedger } = require('../services/inventoryService');
const { createApprovalRequest, getApprovals, reviewApprovalRequest } = require('../services/approvalService');
const { getAllProducts, getProductByIdOrSlug, upsertProduct, getPriceHistory } = require('../services/productMasterService');
const retailService = require('../services/retailNetworkService');

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET || 'veyano_vault_secret_admin_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'veyano2026';

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── Rate Limiter for Login Attempts ──────────────────────────────────────────
const loginAttempts = new Map();
function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip';
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (entry && now < entry.lockUntil) {
    const remainingMinutes = Math.ceil((entry.lockUntil - now) / 60000);
    return res.status(429).json({
      error: `Too many failed attempts. Account locked for ${remainingMinutes} minute(s).`
    });
  }
  next();
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  entry.count++;
  if (entry.count >= 5) {
    entry.lockUntil = now + 15 * 60 * 1000;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}

function clearFailedLogin(ip) {
  loginAttempts.delete(ip);
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

// ── 1. POST /api/admin/auth/login — Secure Passcode & Role Auth ───────────────
router.post('/auth/login', loginRateLimiter, async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip';
  const { passcode, email, role } = req.body || {};

  if (!passcode || typeof passcode !== 'string') {
    recordFailedLogin(ip);
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  const inputBuffer = Buffer.from(passcode);
  const targetBuffer = Buffer.from(ADMIN_PASSCODE);

  let isMatch = false;
  if (inputBuffer.length === targetBuffer.length) {
    isMatch = crypto.timingSafeEqual(inputBuffer, targetBuffer);
  }

  if (!isMatch) {
    recordFailedLogin(ip);
    await logAuditEvent({
      actorName: email || 'Unknown',
      actorEmail: email || 'unknown',
      action: 'FAILED_LOGIN',
      entityType: 'SECURITY',
      reason: 'Failed admin login attempt',
      ipAddress: ip
    });
    return res.status(401).json({ error: 'Incorrect admin passcode. Access denied.' });
  }

  clearFailedLogin(ip);

  // Selected or assigned role
  const assignedRole = (role && ROLES[role]) ? role : 'OWNER';
  const assignedEmail = email || 'keshavgandhi871@gmail.com';
  const assignedName = assignedRole === 'OWNER' ? 'Keshav Gandhi (Founder)' : `${assignedRole.replace(/_/g, ' ')} Operator`;

  const token = generateAdminToken(assignedRole, assignedEmail, assignedName);

  await logAuditEvent({
    actorName: assignedName,
    actorEmail: assignedEmail,
    actorRole: assignedRole,
    action: 'ADMIN_LOGIN',
    entityType: 'SECURITY',
    reason: `Admin session initialized as ${assignedRole}`,
    ipAddress: ip
  });

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
    if (typeof clerkClient?.verifyToken === 'function') {
      return clerkClient.verifyToken(token)
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
 * GET /api/admin/me — Current User & Role Profile
 */
router.get('/me', (req, res) => {
  const role = req.admin?.role || 'OWNER';
  res.json({
    name: req.admin?.name || 'Administrator',
    email: req.admin?.email || 'admin@veyano.in',
    role,
    permissions: Object.keys(PERMISSIONS).filter(p => hasPermission(role, p))
  });
});

/**
 * GET /api/admin/auth/verify
 */
router.get('/auth/verify', (req, res) => {
  res.json({ valid: true, role: req.admin?.role || 'OWNER', name: req.admin?.name });
});

/**
 * GET /api/admin/analytics — Store KPIs & Executive Operations Overview
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, is_cod, created_at');

    let clerkUsersCount = 0;
    try {
      const clerkUsers = await clerkClient.users.getUserList({ limit: 100 });
      clerkUsersCount = clerkUsers.data ? clerkUsers.data.length : (Array.isArray(clerkUsers) ? clerkUsers.length : 0);
    } catch (e) {}

    const totalOrders = (orders || []).length;
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = (orders || []).filter(o => o.status === 'pending' || o.status === 'processing' || !o.status).length;
    const shippedOrders = (orders || []).filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length;
    const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
    const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled').length;

    const uniqueOrderEmails = new Set((orders || []).map(o => o.customer_email).filter(Boolean));
    const totalCustomers = Math.max(clerkUsersCount, uniqueOrderEmails.size);

    // Calculate AOV
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Check low stock products
    const products = getAllProducts();
    const lowStockCount = products.filter(p => p.stock <= (p.reorder_threshold || 25) && p.stock_status !== 'coming_soon').length;

    // Check pending approvals
    const pendingApprovals = (await getApprovals({ status: 'PENDING' })).length;

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      aov,
      lowStockCount,
      pendingApprovals,
      recentOrdersCount: totalOrders
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/orders — List all orders with items
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
 * PATCH /api/admin/orders/:id/status — Update order status with audit log & timeline
 */
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, awb_code, courier_name, tracking_url, notes, payment_status } = req.body;

    const { data: oldOrder } = await supabase.from('orders').select('*').eq('id', id).single();

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

    // Record Audit Log
    await logAuditEvent({
      actorName: req.admin?.name || 'Admin',
      actorEmail: req.admin?.email || 'admin@veyano.in',
      actorRole: req.admin?.role || 'OPERATIONS',
      action: status ? 'ORDER_STATUS_CHANGED' : 'ORDER_UPDATED',
      entityType: 'ORDER',
      entityId: id,
      entityName: `Order #${updatedOrder.order_number || id}`,
      previousValue: { status: oldOrder?.status, awb: oldOrder?.awb_code },
      newValue: { status: updatedOrder.status, awb: updatedOrder.awb_code },
      reason: notes || `Order updated to ${updatedOrder.status}`
    });

    res.json({ message: 'Order updated successfully.', order: updatedOrder });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers — List all customer profiles
 */
router.get('/customers', async (req, res, next) => {
  try {
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    let clerkUsers = [];
    try {
      const resList = await clerkClient.users.getUserList({ limit: 100 });
      clerkUsers = resList.data || (Array.isArray(resList) ? resList : []);
    } catch (e) {}

    const { data: dbUsers } = await supabase.from('users').select('*');
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
    next(err);
  }
});

/**
 * DELETE /api/admin/orders/:id — Delete or Cancel an Order
 */
router.delete('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabase.from('order_items').delete().eq('order_id', id);
    } catch (_) {}
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      actorName: req.admin?.name || 'Admin',
      actorEmail: req.admin?.email || 'admin@veyano.in',
      actorRole: req.admin?.role || 'OWNER',
      action: 'ORDER_DELETED',
      entityType: 'ORDER',
      entityId: id,
      entityName: `Order #${id}`,
      reason: req.body?.reason || 'Order removed by admin'
    });

    res.json({ success: true, message: `Order ${id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/customers/:id — Delete Customer Profile & Orders
 */
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabase.from('users').delete().or(`id.eq.${id},email.eq.${id},clerk_id.eq.${id}`);
    } catch (_) {}

    await logAuditEvent({
      actorName: req.admin?.name || 'Admin',
      actorEmail: req.admin?.email || 'admin@veyano.in',
      actorRole: req.admin?.role || 'OWNER',
      action: 'CUSTOMER_DELETED',
      entityType: 'CUSTOMER',
      entityId: id,
      entityName: `Customer ${id}`,
      reason: req.body?.reason || 'Customer removed by admin'
    });

    res.json({ success: true, message: `Customer ${id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/bulk-delete — Bulk Delete Hub
 */
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { type, ids, reason } = req.body || {};
    if (!type || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid entity type and array of IDs required.' });
    }

    if (type === 'retailer') {
      for (const id of ids) {
        try {
          retailService.deleteRetailerPermanently(id, 'DELETE RETAILER PERMANENTLY', reason || 'Bulk permanent delete', req.admin);
        } catch (_) {
          try { retailService.archiveRetailer(id, reason || 'Bulk archive', req.admin); } catch (__) {}
        }
      }
      await retailService.savePersistentRetailDataAsync();
    } else if (type === 'order') {
      for (const id of ids) {
        try {
          await supabase.from('order_items').delete().eq('order_id', id);
          await supabase.from('orders').delete().eq('id', id);
        } catch (_) {}
      }
    } else if (type === 'customer') {
      for (const id of ids) {
        try {
          await supabase.from('users').delete().or(`id.eq.${id},email.eq.${id}`);
        } catch (_) {}
      }
    }

    res.json({ success: true, message: `Successfully deleted ${ids.length} ${type}(s).` });
  } catch (err) {
    next(err);
  }
});

// ── 3. PRODUCT MASTER & PRICING MANAGEMENT ──────────────────────────────────
router.get('/products', (req, res) => {
  const products = getAllProducts({ includeInactive: true });
  res.json({ data: products });
});

router.post('/products', async (req, res, next) => {
  try {
    const productData = req.body;
    const actorRole = req.admin?.role || 'OWNER';
    const oldProduct = getProductByIdOrSlug(productData.id || productData.sku);

    // If changing price and role is NOT OWNER or ADMIN, require approval workflow
    if (oldProduct && productData.price && oldProduct.price !== productData.price && actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
      const approval = await createApprovalRequest({
        requestType: 'PRICE_CHANGE',
        entityType: 'PRODUCT',
        entityId: productData.sku,
        entityName: productData.name,
        requestedBy: req.admin?.name || 'Staff',
        requesterRole: actorRole,
        requestedChanges: {
          old: { price: oldProduct.price, mrp: oldProduct.mrp },
          new: { price: productData.price, mrp: productData.mrp }
        },
        reason: req.body.reason || 'Catalog price modification'
      });

      return res.json({
        message: 'Price change submitted to Owner Approval Queue.',
        requiresApproval: true,
        approvalId: approval.id
      });
    }

    const updated = await upsertProduct(productData, {
      actorName: req.admin?.name || 'Admin',
      actorEmail: req.admin?.email || 'admin@veyano.in',
      actorRole: req.admin?.role || 'OWNER',
      reason: req.body.reason || 'Product catalog update'
    });

    res.json({ message: 'Product SKU updated successfully.', product: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/products/:sku/price-history', (req, res) => {
  const history = getPriceHistory(req.params.sku);
  res.json({ data: history });
});

// ── 4. INVENTORY LEDGER & STOCK ADJUSTMENTS ──────────────────────────────────
router.get('/inventory/ledger', async (req, res) => {
  const { limit = 50, offset = 0, sku, movementType } = req.query;
  const result = await getInventoryLedger({
    limit: parseInt(limit),
    offset: parseInt(offset),
    sku,
    movementType
  });
  res.json(result);
});

router.post('/inventory/adjust', async (req, res, next) => {
  try {
    const { sku, quantityDelta, movementType, reason, warehouseId } = req.body;
    const product = getProductByIdOrSlug(sku);

    if (!product) return res.status(404).json({ error: 'Product SKU not found.' });
    if (quantityDelta === undefined || !movementType) {
      return res.status(400).json({ error: 'quantityDelta and movementType are required.' });
    }

    const beforeQuantity = product.stock || 0;
    const afterQuantity = Math.max(0, beforeQuantity + parseInt(quantityDelta));

    product.stock = afterQuantity;
    product.stock_status = afterQuantity === 0 ? 'out_of_stock' : (afterQuantity <= (product.reorder_threshold || 25) ? 'low_stock' : 'in_stock');

    await recordInventoryMovement({
      sku: product.sku,
      productName: product.name,
      warehouseId: warehouseId || 'karnal-central',
      quantityDelta: parseInt(quantityDelta),
      beforeQuantity,
      afterQuantity,
      movementType,
      reason: reason || 'Manual stock ledger adjustment',
      createdBy: req.admin?.name || 'Admin',
      creatorEmail: req.admin?.email || 'admin@veyano.in',
      creatorRole: req.admin?.role || 'INVENTORY_MANAGER'
    });

    await upsertProduct(product, {
      actorName: req.admin?.name || 'Admin',
      actorRole: req.admin?.role || 'INVENTORY_MANAGER',
      reason: `Stock adjustment: ${movementType}`
    });

    res.json({
      message: 'Inventory ledger updated successfully.',
      sku: product.sku,
      beforeQuantity,
      afterQuantity,
      delta: quantityDelta
    });
  } catch (err) {
    next(err);
  }
});

// ── 5. APPROVALS WORKFLOW ───────────────────────────────────────────────────
router.get('/approvals', async (req, res) => {
  const { status } = req.query;
  const approvals = await getApprovals({ status });
  res.json({ data: approvals });
});

router.post('/approvals/:id/review', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body; // APPROVE or REJECT
    const reviewerRole = req.admin?.role || 'OWNER';

    if (reviewerRole !== 'OWNER' && reviewerRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only OWNER or ADMIN can review approval requests.' });
    }

    const reviewed = await reviewApprovalRequest(id, {
      decision,
      reviewerName: req.admin?.name || 'Owner',
      reviewerRole,
      remarks
    });

    // If approved and it was a price change, commit price to product master
    if (decision === 'APPROVE' && reviewed.request_type === 'PRICE_CHANGE') {
      const product = getProductByIdOrSlug(reviewed.entity_id);
      if (product && reviewed.requested_changes?.new) {
        product.price = reviewed.requested_changes.new.price;
        if (reviewed.requested_changes.new.mrp) product.mrp = reviewed.requested_changes.new.mrp;
        await upsertProduct(product, {
          actorName: req.admin?.name || 'Owner',
          actorRole: reviewerRole,
          reason: `Approved Price Change: ${remarks || 'Approved'}`
        });
      }
    }

    res.json({ message: `Request ${decision === 'APPROVE' ? 'approved and executed' : 'rejected'}.`, approval: reviewed });
  } catch (err) {
    next(err);
  }
});

// ── 6. IMMUTABLE AUDIT LOGS ─────────────────────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  const { limit = 50, offset = 0, entityType, actorEmail, action, search } = req.query;
  const logs = await getAuditLogs({
    limit: parseInt(limit),
    offset: parseInt(offset),
    entityType,
    actorEmail,
    action,
    search
  });
  res.json(logs);
});

// ── 7. FINANCE DASHBOARD & REVENUE SUMMARY ──────────────────────────────────
router.get('/finance/summary', async (req, res, next) => {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('*, items:order_items(*)');

    const totalOrders = (orders || []).length;
    const grossRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const paidOrders = (orders || []).filter(o => o.payment_status === 'paid');
    const codOrders = (orders || []).filter(o => o.is_cod || o.payment_method === 'cod');
    const codRevenue = codOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const onlineRevenue = paidOrders.filter(o => !o.is_cod).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const refundsCount = (orders || []).filter(o => o.status === 'refunded').length;
    const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;

    // Sales by SKU breakdown
    const skuSales = {};
    (orders || []).forEach(o => {
      (o.items || []).forEach(item => {
        const key = item.product_name || item.sku;
        if (!skuSales[key]) skuSales[key] = { name: key, units: 0, revenue: 0 };
        skuSales[key].units += (item.quantity || 1);
        skuSales[key].revenue += (item.total_price || (item.unit_price * item.quantity) || 0);
      });
    });

    res.json({
      grossRevenue,
      netRevenue: grossRevenue, // No refunds recorded yet
      totalOrders,
      aov,
      codOrdersCount: codOrders.length,
      codRevenue,
      onlineOrdersCount: Math.max(0, totalOrders - codOrders.length),
      onlineRevenue,
      refundsCount,
      skuBreakdown: Object.values(skuSales)
    });
  } catch (err) {
    next(err);
  }
});

// ── 8. SYSTEM HEALTH & DIAGNOSTICS ──────────────────────────────────────────
router.get('/system/health', async (req, res) => {
  const startDb = Date.now();
  let dbLatency = 0;
  let dbStatus = 'HEALTHY';

  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    dbLatency = Date.now() - startDb;
    if (error) dbStatus = 'WARNING';
  } catch (e) {
    dbStatus = 'ERROR';
  }

  res.json({
    application: { status: 'HEALTHY', version: '2.0.0-enterprise', uptime: process.uptime() },
    database: { status: dbStatus, latencyMs: dbLatency, provider: 'Supabase PostgreSQL' },
    authentication: { status: clerkClient ? 'HEALTHY' : 'WARNING', engine: 'Clerk SSO / HMAC Admin Session' },
    payments: { status: 'HEALTHY', gateway: 'Razorpay PG' },
    inventoryLedger: { status: 'HEALTHY', engine: 'Immutable Transaction Ledger' },
    auditSystem: { status: 'HEALTHY', appendOnly: true },
    compliance: { fssai: '20826010000397', validUntil: '2031' },
    timestamp: new Date().toISOString()
  });
});

// ── 9. RETAIL NETWORK & INVENTORY MODULE ENDPOINTS ────────────────────────────

// 9.1 Dashboard KPIs
router.get('/retail/dashboard', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const kpis = retailService.getRetailDashboardKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retail dashboard KPIs', detail: err.message });
  }
});

// 9.2 Retailer Directory (Search, Filter, Sort)
router.get('/retail/retailers', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const retailers = retailService.getAllRetailers(req.query);
    res.json({ success: true, data: retailers, total: retailers.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retailers', detail: err.message });
  }
});

// 9.3 Retailer 360 Profile
router.get('/retail/retailers/:id', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const profile = retailService.getRetailerProfile(req.params.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 9.4 Create Retailer
router.post('/retail/retailers', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const retailer = retailService.createRetailer(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, message: 'Retailer created successfully.', data: retailer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.5 Update Retailer
router.put('/retail/retailers/:id', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const updated = retailService.updateRetailer(req.params.id, req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, message: 'Retailer updated successfully.', data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.6 Archive / Soft Delete Retailer
router.delete('/retail/retailers/:id', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const result = retailService.archiveRetailer(req.params.id, req.body?.reason, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.6b Permanent Hard Delete (Owner Only)
router.post('/retail/retailers/:id/hard-delete', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OWNER' };
    const result = retailService.deleteRetailerPermanently(req.params.id, req.body?.confirmation_phrase, req.body?.reason, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.6c Retailer Audit History
router.get('/retail/retailers/:id/history', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const profile = retailService.getRetailerProfile(req.params.id);
    res.json({ success: true, data: profile.change_history || [] });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 9.7 Record Supply Order
router.post('/retail/supply', requirePermission(PERMISSIONS.RECORD_RETAIL_SUPPLY), async (req, res) => {
  try {
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

// 9.8 Record Payment
router.post('/retail/payments', requirePermission(PERMISSIONS.RECORD_RETAIL_PAYMENT), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'FINANCE' };
    const result = retailService.recordPayment(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.9 Record Return & Quarantine
router.post('/retail/returns', requirePermission(PERMISSIONS.RECORD_RETAIL_RETURN), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const result = retailService.recordReturn(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.10 Physical Stock Reconciliation
router.post('/retail/reconcile', requirePermission(PERMISSIONS.RECONCILE_RETAIL_STOCK), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const result = retailService.reconcileStock(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.11 Global Retail Stock Matrix
router.get('/retail/stock', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const matrix = retailService.getRetailStockMatrix(req.query);
    res.json({ success: true, data: matrix, total: matrix.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock matrix', detail: err.message });
  }
});

// 9.12 Follow-ups (Get & Create & Complete)
router.get('/retail/followups', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const list = retailService.getFollowups(req.query);
    res.json({ success: true, data: list, total: list.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-ups', detail: err.message });
  }
});

router.post('/retail/followups', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'SALES' };
    const item = retailService.createFollowup(req.body, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/retail/followups/:id/complete', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'SALES' };
    const item = retailService.completeFollowup(req.params.id, req.body?.notes, actor);
    await retailService.savePersistentRetailDataAsync();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.13 Internal Notes
router.post('/retail/notes', requirePermission(PERMISSIONS.MANAGE_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const actor = { name: req.admin?.name || 'Admin', role: req.admin?.role || 'OPERATIONS' };
    const note = retailService.addRetailerNote(req.body.retailer_id, req.body.content, actor);
    await retailService.savePersistentRetailDataAsync();
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.14 Statement
router.get('/retail/statement/:id', requirePermission(PERMISSIONS.VIEW_RETAILERS), async (req, res) => {
  try {
    await retailService.ensureDataLoaded();
    const statement = retailService.getRetailerStatement(req.params.id, req.query);
    res.json({ success: true, data: statement });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9.15 CSV Export
router.get('/retail/export/:type', requirePermission(PERMISSIONS.EXPORT_RETAIL_REPORTS), async (req, res) => {
  try {
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
