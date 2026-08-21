/**
 * api/_public/blog.js — Public Blog Content Delivery Routes
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../_clients');

/** GET /api/blog — List all published blog articles */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await getDB()
      .from('blogs')
      .select('id, title, slug, image_url, author, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Blog] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch blogs', detail: err.message });
  }
});

/** GET /api/blog/:slug — Single blog article by slug */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { data, error } = await getDB()
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Blog not found' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('[Blog] Single post error:', err.message);
    res.status(500).json({ error: 'Failed to fetch blog post', detail: err.message });
  }
});

module.exports = router;
