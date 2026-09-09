/**
 * server/services/notificationService.js — Centralized Order Notification Engine
 *
 * Dispatches instant multi-channel alerts on successful orders (Prepaid Webhook & COD):
 * 1. Admin Email Alert (Resend REST API or Nodemailer SMTP)
 * 2. Admin WhatsApp Alert (WhatsApp Cloud API or Custom WhatsApp Webhook)
 * 3. Admin Telegram Alert (Telegram Bot API or Webhook)
 * 4. Customer Confirmation (Email & WhatsApp)
 */

const https = require('https');
const http = require('http');
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (_) {}

// ── Helper: Helper to safely format currency & address ──────────────────────
function formatINR(val) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function parseOrderItems(order) {
  let items = order.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_) { items = []; }
  }
  if (!Array.isArray(items)) items = [];
  return items;
}

function parseShippingAddress(order) {
  let addr = order.shipping_address;
  if (typeof addr === 'string') {
    try { addr = JSON.parse(addr); } catch (_) {}
  }
  if (addr && typeof addr === 'object') {
    const parts = [
      addr.address || '',
      addr.landmark ? `(Landmark: ${addr.landmark})` : '',
      addr.city ? `${addr.city},` : '',
      addr.state || '',
      addr.pincode ? `- ${addr.pincode}` : ''
    ].filter(Boolean);
    return {
      formatted: parts.join(' ') || (order.shipping_address || 'Address provided'),
      name: addr.name || order.customer_name || 'Valued Customer',
      phone: addr.phone || order.customer_phone || '',
      email: addr.email || order.customer_email || '',
      pincode: addr.pincode || order.shipping_pincode || '',
      city: addr.city || order.shipping_city || '',
      state: addr.state || order.shipping_state || '',
      street: addr.address || ''
    };
  }
  return {
    formatted: order.shipping_address || `${order.shipping_city || ''} ${order.shipping_pincode || ''}`.trim() || 'Not specified',
    name: order.customer_name || 'Valued Customer',
    phone: order.customer_phone || '',
    email: order.customer_email || '',
    pincode: order.shipping_pincode || '',
    city: order.shipping_city || '',
    state: order.shipping_state || '',
    street: order.shipping_address || ''
  };
}

// ── Resend API Sender ────────────────────────────────────────────────────────
async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM || 'VEYANO Orders <orders@veyano.in>';
  const body = JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 8000,
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[NotificationService] Email sent via Resend to:', to);
          resolve(true);
        } else {
          console.warn('[NotificationService] Resend API error:', res.statusCode, resData);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[NotificationService] Resend request failed:', err.message);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

// ── Nodemailer SMTP Sender ───────────────────────────────────────────────────
async function sendViaNodemailer({ to, subject, html, text }) {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || !nodemailer) return false;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 7000,
    });

    await transporter.sendMail({
      from: `"VEYANO Foods" <${user}>`,
      to,
      subject,
      html,
      text,
    });
    console.log('[NotificationService] Email sent via Nodemailer SMTP to:', to);
    return true;
  } catch (err) {
    console.warn('[NotificationService] Nodemailer error:', err.message);
    return false;
  }
}

// ── Generic HTTP Webhook Dispatcher ──────────────────────────────────────────
async function postJSON(url, payload) {
  if (!url) return false;
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;
  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'VeyanoFoods-OrderNotifier/1.0',
      },
      timeout: 6000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
    });

    req.on('error', (err) => {
      console.warn('[NotificationService] Webhook error:', err.message);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

// ── Telegram Notification ────────────────────────────────────────────────────
async function sendTelegramAlert(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || process.env.ADMIN_NOTIFICATION_WEBHOOK;

  const addr = parseShippingAddress(order);
  const items = parseOrderItems(order);
  const isCOD = (order.payment_method || '').toLowerCase() === 'cod';
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;

  const itemsText = items.map((i, idx) => 
    `  ${idx + 1}. *${i.productName || i.title || i.name}* x ${i.quantity} — ${formatINR((i.unitPrice || i.price) * i.quantity)}`
  ).join('\n') || '  (1x Assorted Snacks)';

  const message = 
`🔔 *NEW VEYANO ORDER RECEIVED!*
━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Order:* \`${orderNum}\`
👤 *Customer:* ${addr.name}
📞 *Phone:* [${addr.phone}](tel:${addr.phone})
📧 *Email:* ${addr.email || 'N/A'}

📍 *Shipping Address:*
${addr.formatted}
*Pincode:* ${addr.pincode || 'N/A'}

🛒 *Items Ordered:*
${itemsText}

💰 *Payment Summary:*
• Subtotal: ${formatINR(order.subtotal || order.subtotal_amount)}
• Shipping Fee: ${Number(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}
• COD Fee: ${isCOD ? formatINR(order.cod_fee || 79) : '₹0 (Prepaid)'}
• *Total Amount:* *${formatINR(order.total_amount)}*
💳 *Payment Mode:* *${(order.payment_method || 'PREPAID').toUpperCase()}* (${(order.payment_status || 'pending').toUpperCase()})
${order.razorpay_payment_id ? `🆔 *Razorpay ID:* \`${order.razorpay_payment_id}\`\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━`;

  if (token && chatId) {
    try {
      const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      await postJSON(tgUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      });
      console.log('[NotificationService] Telegram alert sent to Chat ID:', chatId);
      return true;
    } catch (e) {
      console.warn('[NotificationService] Telegram API error:', e.message);
    }
  }

  if (webhookUrl && !webhookUrl.includes('api.telegram.org')) {
    await postJSON(webhookUrl, {
      text: message,
      order_id: order.id,
      order_number: orderNum,
      customer: addr,
      total: order.total_amount,
      payment_method: order.payment_method
    });
  }
}

// ── WhatsApp Notification ────────────────────────────────────────────────────
async function sendWhatsAppAlert(order) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER;
  const webhookUrl = process.env.ADMIN_WHATSAPP_WEBHOOK;

  const addr = parseShippingAddress(order);
  const items = parseOrderItems(order);
  const isCOD = (order.payment_method || '').toLowerCase() === 'cod';
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;

  const itemsList = items.map((i, idx) => 
    `• ${i.productName || i.title || i.name} (${i.quantity}x) = ${formatINR((i.unitPrice || i.price) * i.quantity)}`
  ).join('\n');

  const textBody = 
`🛍️ *NEW ORDER ALERT — VEYANO FOODS* 🌾\n\n` +
`*Order No:* ${orderNum}\n` +
`*Customer Name:* ${addr.name}\n` +
`*Phone:* ${addr.phone}\n` +
`*Address:* ${addr.formatted}\n` +
`*Pincode:* ${addr.pincode}\n\n` +
`*Ordered Items:*\n${itemsList}\n\n` +
`*Subtotal:* ${formatINR(order.subtotal || order.subtotal_amount)}\n` +
`*Shipping:* ${Number(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}\n` +
`*COD Fee:* ${isCOD ? formatINR(order.cod_fee || 79) : '₹0'}\n` +
`*Total Amount:* *${formatINR(order.total_amount)}*\n` +
`*Payment Mode:* *${(order.payment_method || 'PREPAID').toUpperCase()}* (${(order.payment_status || 'pending').toUpperCase()})`;

  // WhatsApp Cloud API
  if (phoneId && accessToken && adminNumber) {
    const formattedAdmin = adminNumber.replace(/\D/g, '');
    try {
      const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
      const body = JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedAdmin,
        type: 'text',
        text: { body: textBody }
      });

      await new Promise((resolve) => {
        const req = https.request(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          },
          timeout: 6000
        }, (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.write(body);
        req.end();
      });
      console.log('[NotificationService] WhatsApp Cloud API alert dispatched to admin');
      return true;
    } catch (err) {
      console.warn('[NotificationService] WhatsApp Cloud API error:', err.message);
    }
  }

  if (webhookUrl) {
    await postJSON(webhookUrl, {
      to: adminNumber,
      message: textBody,
      order_id: order.id,
      order_number: orderNum
    });
  }
}

// ── Admin Order Email Generator ──────────────────────────────────────────────
function generateAdminEmailHTML(order) {
  const addr = parseShippingAddress(order);
  const items = parseOrderItems(order);
  const isCOD = (order.payment_method || '').toLowerCase() === 'cod';
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const rows = items.map(item => {
    const unitPrice = item.unitPrice || item.price || 0;
    const qty = item.quantity || 1;
    const lineTotal = unitPrice * qty;
    return `
      <tr style="border-bottom: 1px solid #27272a;">
        <td style="padding: 12px 8px; color: #f4f4f5; font-size: 14px;">
          <strong>${item.productName || item.title || item.name}</strong>
          ${item.weight ? `<br><span style="color: #a1a1aa; font-size: 12px;">Pack: ${item.weight}</span>` : ''}
          ${item.sku ? `<br><span style="color: #71717a; font-size: 11px;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #e4e4e7; font-size: 14px;">${qty}</td>
        <td style="padding: 12px 8px; text-align: right; color: #e4e4e7; font-size: 14px;">${formatINR(unitPrice)}</td>
        <td style="padding: 12px 8px; text-align: right; color: #fbbf24; font-weight: 600; font-size: 14px;">${formatINR(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order ${orderNum}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18181b 0%, #000000 100%); border-bottom: 2px solid #fbbf24; padding: 24px 32px;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: #fbbf24; letter-spacing: 2px;">VEYANO</span>
                    <span style="font-size: 14px; font-weight: 600; color: #e4e4e7; letter-spacing: 1px;"> FOODS</span>
                    <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">⚡ Real-Time Admin Order Notification</div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${isCOD ? '#854d0e' : '#166534'}; color: #fef08a; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                      ${order.payment_method || 'PREPAID'} • ${(order.payment_status || 'PENDING')}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Order Header Meta -->
              <div style="background-color: #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <table width="100%">
                  <tr>
                    <td>
                      <div style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; font-weight: 600;">Order Number</div>
                      <div style="font-size: 18px; font-weight: 700; color: #fbbf24; margin-top: 2px;">${orderNum}</div>
                    </td>
                    <td align="right">
                      <div style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; font-weight: 600;">Date & Time</div>
                      <div style="font-size: 13px; color: #f4f4f5; margin-top: 2px;">${orderDate}</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Customer & Delivery Info -->
              <table width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td width="48%" valign="top" style="background-color: #27272a; border-radius: 8px; padding: 18px; border: 1px solid #3f3f46;">
                    <div style="font-size: 12px; font-weight: 700; color: #fbbf24; text-transform: uppercase; margin-bottom: 8px;">👤 Customer Details</div>
                    <div style="font-size: 14px; font-weight: 600; color: #fff;">${addr.name}</div>
                    <div style="font-size: 13px; color: #d4d4d8; margin-top: 4px;">📞 <a href="tel:${addr.phone}" style="color: #38bdf8; text-decoration: none; font-weight: 600;">${addr.phone}</a></div>
                    ${addr.email ? `<div style="font-size: 13px; color: #a1a1aa; margin-top: 3px;">✉️ ${addr.email}</div>` : ''}
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" style="background-color: #27272a; border-radius: 8px; padding: 18px; border: 1px solid #3f3f46;">
                    <div style="font-size: 12px; font-weight: 700; color: #fbbf24; text-transform: uppercase; margin-bottom: 8px;">📍 Shipping Address</div>
                    <div style="font-size: 13px; color: #e4e4e7; line-height: 1.5;">${addr.formatted}</div>
                    <div style="font-size: 12px; font-weight: 600; color: #fbbf24; margin-top: 6px;">Pincode: ${addr.pincode}</div>
                  </td>
                </tr>
              </table>

              <!-- Order Items Table -->
              <div style="font-size: 14px; font-weight: 700; color: #f4f4f5; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">📦 Items Breakdown</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px; background-color: #1f1f23; border-radius: 8px; overflow: hidden; border: 1px solid #27272a;">
                <tr style="background-color: #27272a;">
                  <th style="padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Product</th>
                  <th style="padding: 10px 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Price</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Total</th>
                </tr>
                ${rows}
              </table>

              <!-- Financial Totals -->
              <table width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%">
                    <table width="100%" style="font-size: 14px; color: #d4d4d8;">
                      <tr>
                        <td style="padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="font-weight: 600; color: #f4f4f5;">${formatINR(order.subtotal || order.subtotal_amount)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">Shipping Fee:</td>
                        <td align="right" style="font-weight: 600; color: ${Number(order.shipping_fee) === 0 ? '#4ade80' : '#f4f4f5'};">
                          ${Number(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}
                        </td>
                      </tr>
                      ${isCOD ? `
                      <tr>
                        <td style="padding: 4px 0;">COD Handling Fee:</td>
                        <td align="right" style="font-weight: 600; color: #fbbf24;">${formatINR(order.cod_fee || 79)}</td>
                      </tr>` : ''}
                      <tr style="border-top: 1px solid #3f3f46;">
                        <td style="padding: 12px 0 4px; font-size: 16px; font-weight: 700; color: #fff;">Grand Total:</td>
                        <td align="right" style="padding: 12px 0 4px; font-size: 20px; font-weight: 800; color: #fbbf24;">${formatINR(order.total_amount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${isCOD ? `
              <!-- COD Action Notice -->
              <div style="background-color: #451a03; border: 1px solid #b45309; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #fef08a;">⚠️ COD Order Confirmation Required</div>
                <div style="font-size: 12px; color: #fed7aa; margin-top: 4px;">
                  Please call the customer at <a href="tel:${addr.phone}" style="color: #fff; font-weight: 700; text-decoration: underline;">${addr.phone}</a> to verify delivery readiness before generating shipping label.
                </div>
              </div>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #121215; border-top: 1px solid #27272a; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #71717a;">
                VEYANO Foods D2C Platform &nbsp;|&nbsp; FSSAI Lic: 20826010000397
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                Admin Portal: <a href="https://veyano.in/admin" style="color: #fbbf24; text-decoration: none;">veyano.in/admin</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ── Customer Order Confirmation Email Generator ──────────────────────────────
function generateCustomerEmailHTML(order) {
  const addr = parseShippingAddress(order);
  const items = parseOrderItems(order);
  const isCOD = (order.payment_method || '').toLowerCase() === 'cod';
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;

  const rows = items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; color: #1f2937; font-size: 14px;">
        <strong>${item.productName || item.title || item.name}</strong>
        ${item.weight ? `<br><span style="color: #6b7280; font-size: 12px;">${item.weight} (Standing Pouch)</span>` : ''}
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #4b5563; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600; font-size: 14px;">${formatINR((item.unitPrice || item.price) * item.quantity)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmed — VEYANO Foods</title></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 28px 36px; text-align: center;">
              <span style="font-size: 26px; font-weight: 800; color: #fbbf24; letter-spacing: 2px;">VEYANO</span>
              <span style="font-size: 15px; font-weight: 600; color: #f4f4f5; letter-spacing: 1px;"> FOODS</span>
              <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0;">Thoughtfully Made for You • Clean Roasted Snacks</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 12px; font-size: 22px; color: #111827;">Order Confirmed! 🎉</h2>
              <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                Hi <strong>${addr.name}</strong>, thank you for ordering with VEYANO Foods. We're getting your freshly roasted standing pouches packed and ready for dispatch!
              </p>

              <!-- Delivery Timeframe Callout -->
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: 700; color: #065f46;">🚚 Estimated Delivery: 3–5 Business Days</div>
                <div style="font-size: 13px; color: #047857; margin-top: 3px;">We will send tracking updates directly to your email and phone once shipped.</div>
              </div>

              <!-- Order Details Box -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <table width="100%" style="font-size: 13px;">
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Order Number:</td>
                    <td align="right" style="font-weight: 700; color: #111827;">${orderNum}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Payment Method:</td>
                    <td align="right" style="font-weight: 600; text-transform: uppercase; color: #111827;">
                      ${isCOD ? 'Cash on Delivery (COD)' : 'Prepaid (Online)'}
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Delivery Address:</td>
                    <td align="right" style="font-weight: 600; color: #111827;">${addr.formatted}</td>
                  </tr>
                </table>
              </div>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Item</th>
                  <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Qty</th>
                  <th style="padding: 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280;">Price</th>
                </tr>
                ${rows}
              </table>

              <!-- Total Breakdown -->
              <table width="100%" style="font-size: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="color: #6b7280; padding: 3px 0;">Subtotal:</td>
                  <td align="right" style="font-weight: 600;">${formatINR(order.subtotal || order.subtotal_amount)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 3px 0;">Shipping Fee:</td>
                  <td align="right" style="font-weight: 600; color: #059669;">
                    ${Number(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}
                  </td>
                </tr>
                ${isCOD ? `
                <tr>
                  <td style="color: #6b7280; padding: 3px 0;">COD Fee:</td>
                  <td align="right" style="font-weight: 600;">${formatINR(order.cod_fee || 79)}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-size: 16px; font-weight: 700;">Total Amount:</td>
                  <td align="right" style="padding: 10px 0; font-size: 18px; font-weight: 800; color: #18181b;">${formatINR(order.total_amount)}</td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
                Have questions or need assistance? Reply to this email or reach us on WhatsApp at 
                <a href="https://wa.me/919350598909" style="color: #d97706; font-weight: 600; text-decoration: none;">+91 93505 98909</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f3f4f6; border-top: 1px solid #e5e7eb; padding: 20px 36px; text-align: center; font-size: 11px; color: #6b7280;">
              © ${new Date().getFullYear()} VEYANO Foods • FSSAI License: 20826010000397<br>
              Thoughtfully Made in Karnal, Haryana — 132001
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ── Customer Confirmation Dispatcher ─────────────────────────────────────────
async function sendCustomerConfirmation(order) {
  const addr = parseShippingAddress(order);
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;

  // 1. Email
  if (addr.email) {
    const subject = `✅ Order Confirmed — ${orderNum} | VEYANO Foods`;
    const html = generateCustomerEmailHTML(order);
    const text = `Hi ${addr.name}, your VEYANO Foods order ${orderNum} for ${formatINR(order.total_amount)} has been confirmed! Estimated delivery is 3-5 business days.`;

    const sentViaResend = await sendViaResend({ to: addr.email, subject, html, text });
    if (!sentViaResend) {
      await sendViaNodemailer({ to: addr.email, subject, html, text });
    }
  }

  // 2. Customer WhatsApp Notification
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (phoneId && accessToken && addr.phone) {
    const cleanPhone = addr.phone.replace(/\D/g, '');
    const toPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${addr.name}! 👋\n\n` +
      `Thank you for ordering with *VEYANO Foods*! 🌾\n\n` +
      `Your order *${orderNum}* for *${formatINR(order.total_amount)}* has been successfully placed.\n\n` +
      `📦 *Estimated Delivery:* 3–5 Business Days\n` +
      `We'll share tracking updates once dispatched. Stay crunching! ✨`;

    try {
      const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
      await postJSON(url, {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: msg }
      });
    } catch (_) {}
  }
}

// ── Master Admin Notification Trigger ────────────────────────────────────────
/**
 * Triggers all instant admin alerts and customer confirmation on a successful order
 * @param {object} order - Clean Supabase order record
 */
async function sendAdminOrderNotification(order) {
  if (!order) return;

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'veyanosupport@gmail.com';
  const orderNum = order.order_number || `#${String(order.id).slice(0, 8)}`;
  const isCOD = (order.payment_method || '').toLowerCase() === 'cod';

  console.log(`[NotificationService] Triggering instant alerts for order ${orderNum} (${order.payment_method})`);

  // 1. Send Admin Email
  const adminSubject = `🛍️ New Order Alert — ${orderNum} (${isCOD ? 'COD' : 'PREPAID'} ${formatINR(order.total_amount)})`;
  const adminHtml = generateAdminEmailHTML(order);
  const adminText = `New order ${orderNum} from ${order.customer_name || 'Customer'}. Total: ${formatINR(order.total_amount)} (${order.payment_method})`;

  const resendSuccess = await sendViaResend({ to: adminEmail, subject: adminSubject, html: adminHtml, text: adminText });
  if (!resendSuccess) {
    await sendViaNodemailer({ to: adminEmail, subject: adminSubject, html: adminHtml, text: adminText });
  }

  // 2. Send Telegram Alert
  await sendTelegramAlert(order).catch(err => console.warn('[NotificationService] Telegram alert error:', err.message));

  // 3. Send WhatsApp Alert
  await sendWhatsAppAlert(order).catch(err => console.warn('[NotificationService] WhatsApp alert error:', err.message));

  // 4. Send Customer Confirmation
  await sendCustomerConfirmation(order).catch(err => console.warn('[NotificationService] Customer confirmation error:', err.message));
}

module.exports = {
  sendAdminOrderNotification,
  sendCustomerConfirmation,
  sendTelegramAlert,
  sendWhatsAppAlert,
  generateAdminEmailHTML,
  generateCustomerEmailHTML
};
