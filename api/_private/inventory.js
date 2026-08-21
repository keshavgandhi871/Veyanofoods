/**
 * api/_private/inventory.js — Private Inventory Management Routes
 * Protected endpoint for stock counts, product queries, and updates.
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../_clients');

/** GET /api/private/inventory — List full product catalog & stock details */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await getDB().from('products').select('*');
    if (error) throw error;
    res.json({ success: true, count: (data || []).length, data: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory', detail: err.message });
  }
});

/** PATCH /api/private/inventory/:id — Update stock or details */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await getDB().from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product', detail: err.message });
  }
});

module.exports = router;
