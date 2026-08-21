/**
 * api/_public/products.js — Public Products Catalog Route
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// Load default product catalog
let defaultProducts = [];
try {
  const { DEFAULT_PRODUCTS } = require('../../public/products-data');
  defaultProducts = DEFAULT_PRODUCTS;
} catch (e) {
  defaultProducts = [];
}

/** GET /api/products — List all products with optional category query */
router.get('/', (req, res) => {
  const { category, featured, trial, combo } = req.query;
  let results = [...defaultProducts];

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
  const clean = String(slugOrId).toLowerCase().trim();
  const product = defaultProducts.find(
    p => p.id.toLowerCase() === clean || p.slug.toLowerCase() === clean || (p.sku && p.sku.toLowerCase() === clean)
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

module.exports = router;
