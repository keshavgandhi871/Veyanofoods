// server/scripts/generate_blogs_data.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Blog = require('../models/Blog');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (_) {}

function categorize(post) {
  if (post && post.category && ['makhana', 'food transparency', 'snacking', 'ingredients'].includes(post.category.trim().toLowerCase())) {
    const lower = post.category.trim().toLowerCase();
    if (lower === 'makhana') return 'Makhana';
    if (lower === 'food transparency') return 'Food Transparency';
    if (lower === 'snacking') return 'Snacking';
    if (lower === 'ingredients') return 'Ingredients';
  }

  const title = ((post && post.title) || '').toLowerCase();
  const slug = ((post && post.slug) || '').toLowerCase();
  const text = title + ' ' + slug;

  // 1. Food Transparency: Labeling, FSSAI, regulations, deceptive claims, marketing
  if (text.includes('fssai') || text.includes('label') || text.includes('claim') || text.includes('transparency') || text.includes('deception') || text.includes('trust') || text.includes('hfss') || text.includes('fopnl') || text.includes('misleading') || text.includes('unmasking') || text.includes('truth') || text.includes('loophole') || text.includes('front-of-pack') || text.includes('supply chain') || text.includes('marketing') || text.includes('crackdown') || text.includes('warning') || text.includes('back-label') || text.includes('whole grain')) {
    return 'Food Transparency';
  }

  // 2. Ingredients: Specific ingredients, biochemicals, additives, oils, vitamins, minerals, seeds
  if (text.includes('palm oil') || text.includes('maltodextrin') || text.includes('sugar') || text.includes('msg') || text.includes('sodium') || text.includes('calcium') || text.includes('fiber') || text.includes('kaempferol') || text.includes('antioxidant') || text.includes('amino acid') || text.includes('seed oil') || text.includes('seeds') || text.includes('omega') || text.includes('chia') || text.includes('flax') || text.includes('hemp') || text.includes('micronutrient') || text.includes('bioavailability') || text.includes('acrylamide') || text.includes('glycation') || text.includes('cortisol') || text.includes('potassium') || text.includes('electrolyte') || text.includes('preservative') || text.includes('additive')) {
    return 'Ingredients';
  }

  // 3. Makhana: Core makhana superfood guides, benefits, calories, comparison, varieties
  if (text.includes('what is makhana') || text.includes('makhana benefits') || text.includes('makhana calories') || text.includes('makhana protein') || text.includes('is makhana healthy') || text.includes('makhana vs') || text.includes('makhana for weight loss') || text.includes('makhana side effects') || text.includes('fox nuts') || text.includes('lotus seed') || text.includes('makhana science') || text.includes('roasted makhana') || text.includes('plain makhana') || text.includes('store makhana') || text.includes('original makhana') || text.includes('makhana nutrition') || text.includes('makhana calcium') || text.includes('makhana antioxidants') || text.includes('makhana fiber') || text.includes('makhana uric acid') || text.includes('makhana for diabetics')) {
    return 'Makhana';
  }

  // 4. Snacking: Lifestyle snacking, work, workout, kids, family, tea-time, fasting
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
  if (text.length > 175) {
    return text.substring(0, 172) + '...';
  }
  return text;
}

function getReadTime(content) {
  if (!content) return '4 min read';
  const clean = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).length;
  const minutes = Math.max(3, Math.ceil(words / 200));
  return `${minutes} min read`;
}

async function run() {
  let rawList = [];

  // Try fetching from Supabase first
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        console.log(`📦 Loaded ${data.length} blogs from Supabase.`);
        rawList = data;
      }
    } catch (e) {
      console.warn('Supabase fetch failed during export, falling back to SQLite:', e.message);
    }
  }

  // Fallback to SQLite if needed
  if (rawList.length === 0) {
    const sqliteBlogs = await Blog.findAll({ order: [['created_at', 'DESC']] });
    rawList = sqliteBlogs.map(b => b.toJSON());
    console.log(`📦 Loaded ${rawList.length} blogs from SQLite.`);
  }

  const blogList = rawList.map(raw => {
    const cat = categorize(raw);
    const excerpt = getExcerpt(raw.content);
    const readTime = getReadTime(raw.content);
    return {
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      category: cat,
      author: raw.author || 'VEYANO Team',
      image_url: raw.image_url || './assets/makhana-science.webp',
      created_at: raw.created_at || new Date().toISOString(),
      read_time: readTime,
      excerpt: excerpt,
      content: raw.content
    };
  });

  const header = `/**\n * VEYANO Foods — Complete Blog & Journal Articles Dataset\n * Total articles: ${blogList.length}\n * Generated: ${new Date().toISOString()}\n */\n\n`;
  const code = `const ALL_BLOG_ARTICLES = ${JSON.stringify(blogList, null, 2)};\n\nif (typeof window !== 'undefined') {\n  window.VEYANO_BLOGS = ALL_BLOG_ARTICLES;\n}\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ALL_BLOG_ARTICLES;\n}\n`;

  const outputPath = path.resolve(__dirname, '../../public/blogs-data.js');
  fs.writeFileSync(outputPath, header + code, 'utf-8');
  console.log(`✅ Successfully generated ${outputPath} with ${blogList.length} articles.`);
}

run().catch(err => {
  console.error('Error generating blogs-data:', err);
  process.exit(1);
});
