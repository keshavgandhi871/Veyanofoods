// server/routes/blog.js — Blog Management API
const express = require('express');
const router = express.Router();
const path = require('path');
const supabase = require('../config/supabase');
const Blog = require('../models/Blog');

let staticBlogs = [];
try {
  staticBlogs = require('../../public/blogs-data.js');
} catch (_) {
  try {
    staticBlogs = require(path.join(process.cwd(), 'public/blogs-data.js'));
  } catch (__) {
    staticBlogs = [];
  }
}

function categorize(post) {
  const title = ((post && post.title) || '').toLowerCase();
  const slug = ((post && post.slug) || '').toLowerCase();
  const text = title + ' ' + slug;

  if (text.includes('fssai') || text.includes('label') || text.includes('claim') || text.includes('transparency') || text.includes('deception') || text.includes('trust') || text.includes('hfss') || text.includes('fopnl') || text.includes('misleading') || text.includes('unmasking') || text.includes('truth') || text.includes('loophole') || text.includes('front-of-pack') || text.includes('supply chain') || text.includes('marketing') || text.includes('crackdown') || text.includes('warning') || text.includes('back-label') || text.includes('whole grain')) {
    return 'Food Transparency';
  }
  if (text.includes('palm oil') || text.includes('maltodextrin') || text.includes('sugar') || text.includes('msg') || text.includes('sodium') || text.includes('calcium') || text.includes('fiber') || text.includes('kaempferol') || text.includes('antioxidant') || text.includes('amino acid') || text.includes('seed oil') || text.includes('micronutrient') || text.includes('bioavailability') || text.includes('acrylamide') || text.includes('glycation') || text.includes('cortisol') || text.includes('potassium') || text.includes('electrolyte') || text.includes('preservative') || text.includes('additive')) {
    return 'Ingredients';
  }
  if (text.includes('what is makhana') || text.includes('makhana benefits') || text.includes('makhana calories') || text.includes('makhana protein') || text.includes('is makhana healthy') || text.includes('makhana vs') || text.includes('makhana for weight loss') || text.includes('makhana side effects') || text.includes('fox nuts') || text.includes('lotus seed') || text.includes('makhana science') || text.includes('roasted makhana') || text.includes('plain makhana') || text.includes('store makhana') || text.includes('original makhana') || text.includes('makhana nutrition') || text.includes('makhana calcium') || text.includes('makhana antioxidants') || text.includes('makhana fiber') || text.includes('makhana uric acid') || text.includes('makhana for diabetics')) {
    return 'Makhana';
  }
  if (text.includes('snack') || text.includes('tiffin') || text.includes('office') || text.includes('workout') || text.includes('evening') || text.includes('fasting') || text.includes('fitness') || text.includes('travel') || text.includes('popcorn') || text.includes('chips') || text.includes('weight loss') || text.includes('pcos') || text.includes('diabetic') || text.includes('hypertension') || text.includes('recovery') || text.includes('kids') || text.includes('pregnancy') || text.includes('yoga') || text.includes('sattvic') || text.includes('cognitive') || text.includes('desk') || text.includes('drain') || text.includes('challenge') || text.includes('coding') || text.includes('fuel') || text.includes('plateau') || text.includes('habit')) {
    return 'Snacking';
  }
  return 'Makhana';
}

function getExcerpt(content) {
  if (!content) return 'Read the full article on clean snacking, nutrition, and honest ingredients.';
  const match = content.match(/<p>([\s\S]*?)<\/p>/i);
  let text = match ? match[1] : content;
  text = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 175 ? text.substring(0, 172) + '...' : text;
}

function getReadTime(content) {
  if (!content) return '4 min read';
  const clean = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).length;
  const minutes = Math.max(3, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * GET /api/blog — Fetch all blogs
 */
router.get('/', async (req, res, next) => {
  try {
    // 1. Try Supabase with a short timeout
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase Timeout')), 1500)
        );
        
        const supabaseData = await Promise.race([
          supabase.from('blogs')
            .select('id, title, slug, image_url, author, created_at')
            .order('created_at', { ascending: false }),
          timeoutPromise
        ]);

        if (supabaseData && !supabaseData.error && supabaseData.data && supabaseData.data.length > 0) {
          const mapped = supabaseData.data.map(b => ({
            ...b,
            category: categorize(b),
            read_time: '4 min read',
            created_at: b.created_at || new Date().toISOString()
          }));
          return res.json(mapped);
        }
      }
    } catch (sbErr) {
      // Supabase is optional, continue to local storage
    }

    // 2. Query SQLite
    const blogs = await Blog.findAll({
      order: [['created_at', 'DESC']]
    });

    if (blogs && blogs.length > 0) {
      const result = blogs.map(b => {
        const raw = b.toJSON();
        return {
          id: raw.id,
          title: raw.title,
          slug: raw.slug,
          category: categorize(raw),
          image_url: raw.image_url || './assets/makhana-science.webp',
          author: raw.author || 'VEYANO Team',
          created_at: raw.created_at || new Date().toISOString(),
          read_time: getReadTime(raw.content),
          excerpt: getExcerpt(raw.content)
        };
      });
      return res.json(result);
    }

    // 3. Fallback to static catalog
    res.json(staticBlogs);
  } catch (err) {
    if (staticBlogs && staticBlogs.length > 0) {
      return res.json(staticBlogs);
    }
    next(err);
  }
});

/**
 * GET /api/blog/:slug — Fetch single blog by slug
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    // 1. Try Supabase
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase Timeout')), 1500)
        );

        const supabaseData = await Promise.race([
          supabase.from('blogs').select('*').eq('slug', slug).single(),
          timeoutPromise
        ]);

        if (supabaseData && !supabaseData.error && supabaseData.data) {
          const post = supabaseData.data;
          post.category = categorize(post);
          post.read_time = getReadTime(post.content);
          return res.json(post);
        }
      }
    } catch (sbErr) {
      // Supabase skipped
    }

    // 2. Check SQLite
    const post = await Blog.findOne({ where: { slug } });
    if (post) {
      const raw = post.toJSON();
      raw.category = categorize(raw);
      raw.read_time = getReadTime(raw.content);
      return res.json(raw);
    }

    // 3. Fallback to static catalog
    const staticPost = staticBlogs.find(b => b.slug === slug || b.id === slug);
    if (staticPost) {
      staticPost.category = categorize(staticPost);
      return res.json(staticPost);
    }
    
    res.status(404).json({ error: 'Blog not found' });
  } catch (err) {
    const staticPost = staticBlogs.find(b => b.slug === req.params.slug || b.id === req.params.slug);
    if (staticPost) {
      staticPost.category = categorize(staticPost);
      return res.json(staticPost);
    }
    next(err);
  }
});

module.exports = router;
