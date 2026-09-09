/**
 * api/_public/orders.js — Public Customer Order Placement & Lookup (Vercel Serverless)
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { getDB } = require('../_clients');
const { sendAdminOrderNotification } = require('../_services/notificationService');

// In-memory pincode cache
const pincodeCache = new Map();

/**
 * GET /api/orders/pincode/:pin — Secure server-side pincode resolution
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
    console.warn('[Orders] Pincode lookup note:', err.message);
    res.status(500).json({ error: 'Postal verification service unavailable.' });
  }
});

/**
 * GET /api/orders/lookup/:id or /api/orders/:id — Lookup order details by ID or order number
 */
router.get('/lookup/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    if (!identifier) return res.status(400).json({ error: 'Order identifier required.' });

    const db = getDB();
    let query = db.from('orders').select('*');
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
    res.status(500).json({ error: 'Failed to fetch order', detail: err.message });
  }
});

/**
 * POST /api/orders — Create a new order (COD or verified Prepaid)
 */
router.post('/', async (req, res) => {
  try {
    const {
      paymentMethod = 'cod', items,
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingPincode, shippingCity, shippingState,
      razorpayOrderId, razorpayPaymentId, notes, userId
    } = req.body;

    if (!items || !items.length) return res.status(400).json({ error: 'Order must have at least one item.' });
    if (!customerName || !customerPhone || !shippingAddress) {
      return res.status(400).json({ error: 'Customer name, phone, and shipping address are required.' });
    }

    const db = getDB();
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

    const shippingAddressObj = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      address: shippingAddress,
      city: shippingCity || '',
      state: shippingState || '',
      pincode: shippingPincode || ''
    };

    // Generate order number based on row count
    const year = new Date().getFullYear();
    const { count } = await db.from('orders').select('*', { count: 'exact', head: true });
    const orderNumber = `VFO-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

    const orderData = {
      order_number: orderNumber,
      user_id: userId || null,
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
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone,
      source: 'website',
      is_cod: isCOD,
      razorpay_order_id: razorpayOrderId || null,
      razorpay_payment_id: razorpayPaymentId || null,
      notes: notes || null,
      gst_amount: Math.round(subtotalAmount * 0.05),
    };

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) throw orderError;

    // Trigger instant notifications
    setImmediate(() => {
      sendAdminOrderNotification(order).catch(e => console.warn('[Orders] Notification note:', e.message));
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
    console.error('[Orders] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create order', detail: err.message });
  }
});

module.exports = router;
