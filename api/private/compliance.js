/**
 * api/private/compliance.js — Private Compliance & Batch Tracking
 * Protected endpoint for FSSAI compliance audits and order reports.
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../clients');

/** GET /api/private/compliance/orders — Internal order report */
router.get('/orders', async (req, res) => {
  try {
    const { data, error } = await getDB()
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, count: (data || []).length, orders: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compliance orders', detail: err.message });
  }
});

module.exports = router;
