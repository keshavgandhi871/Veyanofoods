/**
 * api/private/middleware.js — Private / Admin API Authentication Middleware
 */

const { getClerk } = require('../clients');

async function privateAuthMiddleware(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.headers['x-api-key'] || req.query.admin_key;
  const configuredSecret = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET || 'veyano_super_secret_jwt_key_change_in_production_2024';

  // 1. Check direct admin secret key match
  if (adminKey && adminKey === configuredSecret) {
    return next();
  }

  // 2. Check Clerk Bearer token for admin user
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
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
