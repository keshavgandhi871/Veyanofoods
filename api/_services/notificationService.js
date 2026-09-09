/**
 * api/_services/notificationService.js — Shared Order Notification Engine for Vercel Serverless
 */

const {
  sendAdminOrderNotification,
  sendCustomerConfirmation,
  sendTelegramAlert,
  sendWhatsAppAlert,
  generateAdminEmailHTML,
  generateCustomerEmailHTML
} = require('../../server/services/notificationService');

module.exports = {
  sendAdminOrderNotification,
  sendCustomerConfirmation,
  sendTelegramAlert,
  sendWhatsAppAlert,
  generateAdminEmailHTML,
  generateCustomerEmailHTML
};
