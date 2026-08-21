/**
 * api/public/payments.js — Public Razorpay Order Creation & Verification Routes
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getRazorpay } = require('../clients');

/** GET /api/payments/config — Expose Razorpay key_id to checkout frontend */
router.get('/config', (req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID || '' });
});

/** POST /api/payments/create-order — Create Razorpay payment order */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1).' });
    }

    const rzp = getRazorpay();
    if (!rzp) return res.status(500).json({ error: 'Razorpay is not configured.' });

    const options = {
      amount: Math.round(amount), // amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('[Razorpay] Create Order Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Razorpay order.' });
  }
});

/** POST /api/payments/verify-payment — Verify Razorpay payment signature */
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required Razorpay fields.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_SECRET;
    if (!secret) return res.status(500).json({ error: 'Razorpay is not configured.' });

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (computedSignature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified successfully.' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature. Payment verification failed.' });
    }
  } catch (error) {
    console.error('[Razorpay] Verify Payment Error:', error);
    res.status(500).json({ error: 'Internal Server Error during verification.' });
  }
});

module.exports = router;
