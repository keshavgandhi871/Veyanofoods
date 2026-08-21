/**
 * api/public/auth.js — Public Authentication & User Sync Routes
 */

const express = require('express');
const router = express.Router();
const { getDB, getClerk } = require('../clients');

// Customer auth token verification
async function customerAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const clerk = getClerk();
  if (!clerk) return res.status(500).json({ error: 'Clerk not configured.' });

  try {
    const decoded = await clerk.verifyToken(token);
    const user = await clerk.users.getUser(decoded.sub);
    if (!user) throw new Error('User not found');
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/** GET /api/auth/config — Expose Clerk publishable key to frontend */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_cG9ldGljLWJ1enphcmQtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA'
  });
});

/** POST /api/auth/sync — Sync Clerk user with Supabase */
router.post('/sync', customerAuthMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const db = getDB();

    const clerkId = user.id;
    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
    const phone = user.phoneNumbers[0]?.phoneNumber || 'N/A';

    const { data: upsertedUser, error } = await db
      .from('users')
      .upsert({
        clerk_id: clerkId,
        email: email,
        name: name,
        phone: phone,
        role: 'customer',
        password: 'AUTH_MANAGED_BY_CLERK'
      }, { onConflict: 'clerk_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'User synced successfully', user: upsertedUser });
  } catch (err) {
    console.error('[Auth] Sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync user', detail: err.message });
  }
});

/** GET /api/auth/me — Get current user profile */
router.get('/me', customerAuthMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      email: req.user.emailAddresses[0]?.emailAddress,
    },
  });
});

module.exports = router;
