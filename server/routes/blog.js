// server/routes/blog.js — Blog Management API
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const Blog = require('../models/Blog');

/**
 * GET /api/blog — Fetch all blogs
 */
router.get('/', async (req, res, next) => {
  try {
    // 1. Try Supabase with a short timeout
    let supabaseData = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase Timeout')), 2000)
      );
      
      supabaseData = await Promise.race([
        supabase.from('blogs')
          .select('id, title, slug, image_url, author, created_at')
          .order('created_at', { ascending: false }),
        timeoutPromise
      ]);

      if (supabaseData && !supabaseData.error && supabaseData.data && supabaseData.data.length > 0) {
        return res.json(supabaseData.data);
      }
    } catch (sbErr) {
      console.warn('[Blog] Supabase fetch skipped/failed:', sbErr.message);
    }

    // 2. Fallback to SQLite
    const blogs = await Blog.findAll({
      attributes: ['id', 'title', 'slug', 'image_url', 'author', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    res.json(blogs);
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

    // 1. Try Supabase with a short timeout
    let supabaseData = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase Timeout')), 2000)
      );

      supabaseData = await Promise.race([
        supabase.from('blogs').select('*').eq('slug', slug).single(),
        timeoutPromise
      ]);

      if (supabaseData && !supabaseData.error && supabaseData.data) {
        return res.json(supabaseData.data);
      }
    } catch (sbErr) {
      console.warn('[Blog] Supabase single fetch skipped/failed:', sbErr.message);
    }

    // 2. Fallback to SQLite
    const post = await Blog.findOne({ where: { slug } });
    if (!post) return res.status(404).json({ error: 'Blog not found' });
    
    res.json(post);
  } catch (err) {
    next(err);
  }
});




module.exports = router;
