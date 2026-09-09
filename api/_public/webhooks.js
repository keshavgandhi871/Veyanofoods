/**
 * api/_public/webhooks.js — Vercel Serverless Razorpay Webhook Handler
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../_clients');
const { sendAdminOrderNotification } = require('../_services/notificationService');

/**
 * POST /api/webhooks/razorpay
 */
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY;

  if (!signature) {
    return res.status(400).json({ error: 'Signature header missing.' });
  }

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  const rawPayload = (typeof req.rawBody === 'string') 
    ? req.rawBody 
    : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body;
  const eventType = event.event;

  try {
    const db = getDB();

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderEntity = event.payload?.order?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        const { data: existingOrder } = await db
          .from('orders')
          .select('*')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (existingOrder) {
          if (existingOrder.payment_status !== 'paid') {
            const { data: updatedOrder } = await db
              .from('orders')
              .update({
                payment_status: 'paid',
                order_status: 'processing',
                status: 'confirmed',
                razorpay_payment_id: razorpayPaymentId || existingOrder.razorpay_payment_id,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingOrder.id)
              .select()
              .single();

            setImmediate(() => sendAdminOrderNotification(updatedOrder || existingOrder));
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        await db
          .from('orders')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('razorpay_order_id', razorpayOrderId);
      }
    }

    res.json({ status: 'ok', event: eventType });
  } catch (err) {
    console.error('[Webhook Serverless] Ingestion error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

module.exports = router;
