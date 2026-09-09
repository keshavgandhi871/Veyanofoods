/**
 * api/_public/checkout.js — Vercel Serverless Checkout Routes (Razorpay & COD)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB, getRazorpay } = require('../_clients');
const { sendAdminOrderNotification } = require('../_services/notificationService');

async function generateOrderNumber(db) {
  const year = new Date().getFullYear();
  const { count } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  const orderCount = count || 0;
  return `VFO-${year}-${String(orderCount + 1).padStart(5, '0')}`;
}

/** GET /api/checkout/config */
router.get('/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    shippingThreshold: 499,
    shippingFee: 50,
    codFee: 79,
  });
});

/** POST /api/checkout/create-order */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, items } = req.body;

    let totalPaise = Number(amount);
    if (Array.isArray(items) && items.length > 0) {
      const subtotal = items.reduce((sum, i) => sum + ((Number(i.unitPrice) || Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
      const shippingFee = subtotal >= 499 ? 0 : 50;
      totalPaise = Math.round((subtotal + shippingFee) * 100);
    }

    if (!totalPaise || totalPaise < 100) {
      return res.status(400).json({ error: 'Order amount must be at least ₹1 (100 paise).' });
    }

    const rzp = getRazorpay();
    if (!rzp) return res.status(500).json({ error: 'Razorpay gateway is not configured.' });

    const options = {
      amount: totalPaise,
      currency,
      receipt: receipt || `vfo_${Date.now()}`,
    };

    const rzpOrder = await rzp.orders.create(options);
    res.json({
      ...rzpOrder,
      keyId: process.env.RAZORPAY_KEY_ID || '',
    });
  } catch (error) {
    console.error('[Checkout] Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment session.' });
  }
});

/** POST /api/checkout/verify */
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingPincode,
      userId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required Razorpay parameters.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_SECRET;
    if (!secret) return res.status(500).json({ error: 'Razorpay secret key not configured.' });

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (computedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
    }

    const db = getDB();

    const { data: existingOrder } = await db
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.payment_status !== 'paid') {
        const { data: updated } = await db
          .from('orders')
          .update({
            payment_status: 'paid',
            order_status: 'processing',
            status: 'confirmed',
            razorpay_payment_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOrder.id)
          .select()
          .single();

        setImmediate(() => sendAdminOrderNotification(updated || existingOrder));
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully.',
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        totalAmount: existingOrder.total_amount
      });
    }

    if (!items || !items.length) {
      return res.json({ success: true, message: 'Payment signature verified.' });
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

    const subtotalAmount = cleanItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingFee = subtotalAmount >= 499 ? 0 : 50;
    const codFee = 0;
    const totalAmount = subtotalAmount + shippingFee + codFee;

    const shippingAddressObj = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      address: shippingAddress,
      city: shippingCity,
      state: shippingState,
      pincode: shippingPincode
    };

    const orderNumber = await generateOrderNumber(db);

    const orderData = {
      order_number: orderNumber,
      user_id: userId || null,
      items: cleanItems,
      subtotal: subtotalAmount,
      subtotal_amount: subtotalAmount,
      shipping_fee: shippingFee,
      cod_fee: codFee,
      total_amount: totalAmount,
      payment_method: 'prepaid',
      payment_status: 'paid',
      order_status: 'processing',
      status: 'confirmed',
      shipping_address: shippingAddressObj,
      razorpay_order_id,
      razorpay_payment_id,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone,
      source: 'website',
      is_cod: false,
      gst_amount: Math.round(subtotalAmount * 0.05)
    };

    const { data: order, error: insertError } = await db
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (insertError) throw insertError;

    // Background alert dispatch
    setImmediate(() => {
      sendAdminOrderNotification(order).catch(e => console.warn('[Checkout] Notification note:', e.message));
    });

    res.status(201).json({
      success: true,
      message: 'Prepaid order placed successfully.',
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      isCOD: false,
    });
  } catch (error) {
    console.error('[Checkout] Verify error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed.' });
  }
});

/** POST /api/checkout/cod */
router.post('/cod', async (req, res) => {
  try {
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingPincode,
      userId,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    if (!customerName || !customerPhone || !shippingAddress || !shippingPincode) {
      return res.status(400).json({ error: 'Please provide full name, phone number, address, and pincode.' });
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

    const subtotalAmount = cleanItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingFee = subtotalAmount >= 499 ? 0 : 50;
    const codFee = 79;
    const totalAmount = subtotalAmount + shippingFee + codFee;

    const shippingAddressObj = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      address: shippingAddress,
      city: shippingCity || '',
      state: shippingState || '',
      pincode: shippingPincode
    };

    const db = getDB();
    const orderNumber = await generateOrderNumber(db);

    const orderData = {
      order_number: orderNumber,
      user_id: userId || null,
      items: cleanItems,
      subtotal: subtotalAmount,
      subtotal_amount: subtotalAmount,
      shipping_fee: shippingFee,
      cod_fee: codFee,
      total_amount: totalAmount,
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'new',
      status: 'pending',
      shipping_address: shippingAddressObj,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone,
      source: 'website',
      is_cod: true,
      notes: notes || null,
      gst_amount: Math.round(subtotalAmount * 0.05)
    };

    const { data: order, error: insertError } = await db
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (insertError) throw insertError;

    // Background alert dispatch
    setImmediate(() => {
      sendAdminOrderNotification(order).catch(e => console.warn('[Checkout] Notification note:', e.message));
    });

    res.status(201).json({
      success: true,
      message: 'Cash on Delivery order placed successfully.',
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      subtotal: subtotalAmount,
      shippingFee,
      codFee,
      isCOD: true,
    });
  } catch (error) {
    console.error('[Checkout] COD error:', error);
    res.status(500).json({ error: error.message || 'Failed to place COD order.' });
  }
});

module.exports = router;
