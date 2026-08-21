/**
 * api/_clients.js — Shared lazy-initialized clients for Vercel Serverless
 */

const { createClient } = require('@supabase/supabase-js');
const { createClerkClient } = require('@clerk/backend');
const Razorpay = require('razorpay');

let _supabase = null;
function getDB() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

let _clerk = null;
function getClerk() {
  if (!_clerk) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.warn('Missing CLERK_SECRET_KEY. Auth routes will fail.');
      return null;
    }
    _clerk = createClerkClient({ secretKey });
  }
  return _clerk;
}

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_SECRET;
    if (!keyId || !keySecret) {
      console.warn('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Payments will fail.');
      return null;
    }
    _razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return _razorpay;
}

module.exports = {
  getDB,
  getClerk,
  getRazorpay,
};
