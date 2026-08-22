/**
 * api/_public/orders.js — Public Customer Order Placement & Backend Address Helper
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { getDB } = require('../_clients');

// In-memory pincode cache to minimize external network requests
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
    console.warn('[Orders] Server-side pincode lookup note:', err.message);
    res.status(500).json({ error: 'Postal verification service unavailable.' });
  }
});

/**
 * POST /api/orders — Create a new order (COD / Prepaid)
 */
router.post('/', async (req, res) => {
  try {
    const {
      paymentMethod, items,
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingPincode, shippingCity, shippingState,
      razorpayOrderId,
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
        razorpay_order_id: razorpayOrderId || null,
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

module.exports = router;
