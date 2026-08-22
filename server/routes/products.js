// server/routes/products.js — Dynamic Public Products Catalog
const express = require('express');
const router = express.Router();
const { getAllProducts, getProductByIdOrSlug } = require('../services/productMasterService');

/** GET /api/products — List all public products */
router.get('/', (req, res) => {
  const { category, featured, trial, combo } = req.query;
  let results = getAllProducts({ includeInactive: false });

  if (category && category !== 'all') {
    results = results.filter(p => p.category === category);
  }
  if (featured === 'true') {
    results = results.filter(p => p.is_featured);
  }
  if (trial === 'true') {
    results = results.filter(p => p.is_trial);
  }
  if (combo === 'true') {
    results = results.filter(p => p.is_combo);
  }

  res.json({ count: results.length, data: results });
});

/** GET /api/products/:slugOrId — Get single product details */
router.get('/:slugOrId', (req, res) => {
  const { slugOrId } = req.params;
  const product = getProductByIdOrSlug(slugOrId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

module.exports = router;
