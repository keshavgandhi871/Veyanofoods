// server/routes/blog.js — Blog Management API
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/blog — Fetch all blogs
 */
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('id, title, slug, image_url, author, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/blog/:slug — Fetch single blog by slug
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { data, error } = await supabase
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
    next(err);
  }
});

module.exports = router;
