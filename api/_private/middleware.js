/**
 * api/_private/middleware.js — Private / Admin API Authentication Middleware
 */

const crypto = require('crypto');
const { getClerk } = require('../_clients');

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET || 'veyano_vault_secret_admin_key_2026';

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;

  const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(base64Payload).digest('base64url');
  if (signature.length !== expectedSig.length) return null;
  
  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  if (!isValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

async function privateAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }

  // 1. Check HMAC Admin Session Token
  const adminSession = verifyAdminToken(token);
  if (adminSession) {
    req.admin = adminSession;
    return next();
  }

  // 2. Check Clerk Bearer token for admin user
  if (token) {
    const clerk = getClerk();
    if (clerk) {
      try {
        const decoded = await clerk.verifyToken(token);
        const user = await clerk.users.getUser(decoded.sub);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.warn('[Private Auth] Token verify failed:', err.message);
      }
    }
  }

  return res.status(403).json({
    error: 'Access Denied: Private API endpoint requires valid admin authorization.',
  });
}

module.exports = privateAuthMiddleware;
