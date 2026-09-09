/**
 * server/routes/checkout.js — Dedicated Razorpay & COD Checkout Endpoints
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const supabase = require('../config/supabase');
const { deductStock } = require('../services/fefoService');
const { generateInvoice } = require('../services/invoiceService');
const { sendAdminOrderNotification } = require('../services/notificationService');

// Lazy Razorpay instance
let _rzp = null;
function getRazorpay() {
  if (!_rzp) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_SECRET;
    if (!keyId || !keySecret) {
      console.warn('[Checkout] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.');
      return null;
    }
    _rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _rzp;
}

// Generate human-friendly order sequence: VFO-YYYY-XXXXX
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  const orderCount = count || 0;
  return `VFO-${year}-${String(orderCount + 1).padStart(5, '0')}`;
}

/**
 * GET /api/checkout/config — Expose public Razorpay key_id
 */
router.get('/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    shippingThreshold: 499,
    shippingFee: 50,
    codFee: 79,
  });
});

/**
 * POST /api/checkout/create-order — Create Razorpay order session
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, items } = req.body;

    let totalPaise = Number(amount);

    // If items array provided, calculate server-side amount for security
    if (Array.isArray(items) && items.length > 0) {
      const subtotal = items.reduce((sum, i) => sum + ((Number(i.unitPrice) || Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
      const shippingFee = subtotal >= 499 ? 0 : 50;
      totalPaise = Math.round((subtotal + shippingFee) * 100);
    }

    if (!totalPaise || totalPaise < 100) {
      return res.status(400).json({ error: 'Order amount must be at least ₹1 (100 paise).' });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(500).json({ error: 'Razorpay gateway is not configured on the server.' });
    }

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
    console.error('[Checkout] Razorpay Create Order Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment session.' });
  }
});

/**
 * POST /api/checkout/verify — Verify Razorpay signature and persist confirmed prepaid order
 */
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
      return res.status(400).json({ error: 'Missing required Razorpay verification parameters.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Razorpay secret key is not configured.' });
    }

    // Verify HMAC SHA-256 signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (computedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature. Verification failed.' });
    }

    // If order was already created by webhook or previous step, fetch or update
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.payment_status !== 'paid') {
        const { data: updated } = await supabase
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

    // If order details supplied with verify call, create the confirmed prepaid order
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

    const orderNumber = await generateOrderNumber();

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

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (insertError) {
      console.error('[Checkout] Order insert error:', insertError);
      throw insertError;
    }

    // Insert order_items for legacy tables
    const itemInserts = cleanItems.map(item => ({
      order_id: order.id,
      sku: item.sku,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));
    await supabase.from('order_items').insert(itemInserts).catch(e => console.warn('[Checkout] order_items insert:', e.message));

    // Deduct stock & Invoice generation
    setImmediate(async () => {
      try {
        for (const item of cleanItems) {
          try { await deductStock(item.sku, item.quantity); } catch (_) {}
        }
        await generateInvoice(order, cleanItems).catch(() => {});
        await sendAdminOrderNotification(order);
      } catch (err) {
        console.error('[Checkout] Post-order background task error:', err.message);
      }
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
    console.error('[Checkout] Verify & create error:', error);
    res.status(500).json({ error: 'Failed to complete payment verification', detail: error.message });
  }
});

/**
 * POST /api/checkout/cod — Place Cash on Delivery order with ₹79 fee & ₹50 shipping (<₹499)
 */
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
      return res.status(400).json({ error: 'Please provide full name, phone number, address, and 6-digit pincode.' });
    }

    if (!/^[6-9][0-9]{9}$/.test(String(customerPhone).trim().replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    if (!/^[1-9][0-9]{5}$/.test(String(shippingPincode).trim())) {
      return res.status(400).json({ error: 'Please provide a valid 6-digit Indian postal pincode.' });
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
    const codFee = 79; // ₹79 Cash on Delivery Handling Fee
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

    const orderNumber = await generateOrderNumber();

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

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (insertError) {
      console.error('[Checkout] COD Order insert error:', insertError);
      throw insertError;
    }

    // Insert legacy order_items
    const itemInserts = cleanItems.map(item => ({
      order_id: order.id,
      sku: item.sku,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));
    await supabase.from('order_items').insert(itemInserts).catch(e => console.warn('[Checkout] COD order_items insert:', e.message));

    // Deduct stock & trigger notifications
    setImmediate(async () => {
      try {
        for (const item of cleanItems) {
          try { await deductStock(item.sku, item.quantity); } catch (_) {}
        }
        await generateInvoice(order, cleanItems).catch(() => {});
        await sendAdminOrderNotification(order);
      } catch (err) {
        console.error('[Checkout] COD background tasks error:', err.message);
      }
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
    console.error('[Checkout] COD Placement error:', error);
    res.status(500).json({ error: 'Failed to place COD order', detail: error.message });
  }
});

module.exports = router;
