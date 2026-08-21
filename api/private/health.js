/**
 * api/private/health.js — Private Diagnostics & Internal Service Status
 * Protected endpoint returning sensitive backend & infrastructure details.
 */

const express = require('express');
const router = express.Router();
const { getDB, getClerk, getRazorpay } = require('../clients');

router.get('/', async (req, res) => {
  let dbStatus = 'unknown';
  let dbError = null;

  try {
    const { error } = await getDB().from('blogs').select('id').limit(1);
    if (error) {
      dbStatus = 'error';
      dbError = error.message;
    } else {
      dbStatus = 'connected';
    }
  } catch (e) {
    dbStatus = 'error';
    dbError = e.message;
  }

  const rzp = getRazorpay();
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    service: 'Veyano Foods Internal Diagnostic API',
    database: {
      status: dbStatus,
      error: dbError,
    },
    clerk: {
      status: getClerk() ? 'initialized' : 'missing_key',
    },
    razorpay: {
      status: rzp ? 'initialized' : 'missing_key',
      key_id_preview: rzpKeyId ? `...${rzpKeyId.slice(-4)}` : 'not_found',
    },
    system: {
      timestamp: new Date().toISOString(),
      node_version: process.version,
      memory_usage: process.memoryUsage(),
    }
  });
});

module.exports = router;
