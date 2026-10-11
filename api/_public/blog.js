/**
 * api/_public/blog.js — Public Blog Content Delivery Routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { getDB } = require('../_clients');

// Load static blog catalog fallback
let staticBlogs = [];
try {
  staticBlogs = require('../../public/blogs-data.js');
} catch (e) {
  try {
    staticBlogs = require(path.join(process.cwd(), 'public/blogs-data.js'));
  } catch (_) {
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
  if (text.includes('palm oil') || text.includes('maltodextrin') || text.includes('sugar') || text.includes('msg') || text.includes('sodium') || text.includes('calcium') || text.includes('fiber') || text.includes('flour') || text.includes('aleurone') || text.includes('kaempferol') || text.includes('antioxidant') || text.includes('amino acid') || text.includes('seed oil') || text.includes('micronutrient') || text.includes('bioavailability') || text.includes('bioavailable') || text.includes('moringa') || text.includes('polyphenol') || text.includes('botanical') || text.includes('mineral') || text.includes('acrylamide') || text.includes('glycation') || text.includes('cortisol') || text.includes('potassium') || text.includes('electrolyte') || text.includes('preservative') || text.includes('additive')) {
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

/** Helper with timeout for Supabase calls */
async function withTimeout(promise, ms = 1500) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase Timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** GET /api/blog — List all published blog articles */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    if (db && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await withTimeout(
        db.from('blogs')
          .select('id, title, slug, image_url, author, created_at')
          .order('created_at', { ascending: false })
      );

      if (!error && data && data.length > 0) {
        const enriched = data.map(b => ({
          ...b,
          category: categorize(b),
          read_time: '4 min read',
          created_at: b.created_at || new Date().toISOString()
        }));
        return res.json(enriched);
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  // Fallback to static blog catalog
  const list = (staticBlogs || []).map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    category: b.category || categorize(b),
    image_url: b.image_url,
    author: b.author || 'VEYANO Team',
    created_at: b.created_at || new Date().toISOString(),
    read_time: b.read_time || '4 min read',
    excerpt: b.excerpt || getExcerpt(b.content)
  }));
  res.json(list);
});

/** GET /api/blog/:slug — Single blog article by slug */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const db = getDB();
    if (db && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await withTimeout(
        db.from('blogs')
          .select('*')
          .eq('slug', slug)
          .single()
      );

      if (!error && data) {
        data.category = data.category || categorize(data);
        return res.json(data);
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  // Fallback to static blog catalog
  const found = (staticBlogs || []).find(b => b.slug === slug || b.id === slug);
  if (found) {
    found.category = found.category || categorize(found);
    return res.json(found);
  }

  res.status(404).json({ error: 'Blog post not found' });
});

module.exports = router;
