/**
 * server/routes/webhooks.js — Razorpay Webhook Handler & Event Ingestion
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendAdminOrderNotification } = require('../services/notificationService');

/**
 * POST /api/webhooks/razorpay — Secure Webhook Receiver
 */
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY;

  if (!signature) {
    console.warn('[Webhook] Missing x-razorpay-signature header');
    return res.status(400).json({ error: 'Signature header missing.' });
  }

  if (!webhookSecret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server.');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  // Calculate expected signature
  const rawPayload = (typeof req.rawBody === 'string') 
    ? req.rawBody 
    : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('[Webhook] Signature verification mismatch.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body;
  const eventType = event.event;
  console.log(`[Webhook] Razorpay event received: ${eventType}`);

  try {
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderEntity = event.payload?.order?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        // Find matching order in Supabase
        const { data: existingOrder, error: findError } = await supabase
          .from('orders')
          .select('*')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (findError) {
          console.warn('[Webhook] DB find error:', findError.message);
        }

        if (existingOrder) {
          if (existingOrder.payment_status !== 'paid') {
            const { data: updatedOrder, error: updateError } = await supabase
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

            if (updateError) {
              console.error('[Webhook] DB update error:', updateError.message);
            } else {
              console.log(`[Webhook] Order ${existingOrder.order_number || existingOrder.id} marked as PAID via Webhook.`);
              setImmediate(() => sendAdminOrderNotification(updatedOrder || existingOrder));
            }
          } else {
            console.log(`[Webhook] Order ${existingOrder.order_number || existingOrder.id} was already marked as PAID.`);
          }
        } else {
          console.log(`[Webhook] No pre-existing order found for Razorpay Order ID: ${razorpayOrderId}`);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        await supabase
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
    console.error('[Webhook] Ingestion error:', err);
    res.status(500).json({ error: 'Webhook processing error', detail: err.message });
  }
});

module.exports = router;
