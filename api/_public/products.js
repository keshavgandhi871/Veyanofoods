/**
 * api/_public/products.js — Dynamic Public Products Catalog Route
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../_clients');

let defaultProducts = [];
try {
  const { DEFAULT_PRODUCTS } = require('../../public/products-data');
  defaultProducts = DEFAULT_PRODUCTS;
} catch (e) {
  defaultProducts = [];
}

/** GET /api/products — List all products with optional category query */
router.get('/', async (req, res) => {
  const { category, featured, trial, combo } = req.query;
  let results = [...defaultProducts];

  // Attempt database sync
  try {
    const db = getDB();
    const { data: dbProducts, error } = await db.from('products').select('*');
    if (!error && Array.isArray(dbProducts) && dbProducts.length > 0) {
      // Merge DB prices and stock with full product metadata
      results = results.map(p => {
        const match = dbProducts.find(dp => dp.sku === p.sku);
        if (match) {
          return {
            ...p,
            price: match.price_paise ? match.price_paise / 100 : (match.price || p.price),
            stock: match.stock_quantity !== undefined ? match.stock_quantity : p.stock,
            stock_status: match.stock_quantity === 0 ? 'out_of_stock' : p.stock_status
          };
        }
        return p;
      });
    }
  } catch (e) {
    // Fallback gracefully to defaultProducts
  }

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
router.get('/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  const clean = String(slugOrId).toLowerCase().trim();
  let product = defaultProducts.find(
    p => p.id.toLowerCase() === clean || p.slug.toLowerCase() === clean || (p.sku && p.sku.toLowerCase() === clean)
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const db = getDB();
    const { data: match } = await db.from('products').select('*').eq('sku', product.sku).maybeSingle();
    if (match) {
      product = {
        ...product,
        price: match.price_paise ? match.price_paise / 100 : (match.price || product.price),
        stock: match.stock_quantity !== undefined ? match.stock_quantity : product.stock,
        stock_status: match.stock_quantity === 0 ? 'out_of_stock' : product.stock_status
      };
    }
  } catch (e) {}

  res.json(product);
});

module.exports = router;
