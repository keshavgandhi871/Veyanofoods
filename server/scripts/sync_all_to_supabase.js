const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const Blog = require('../models/Blog');
const sequelize = require('../config/db');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  console.log('🔄 Syncing SQLite blogs to Supabase...');
  try {
    const localBlogs = await Blog.findAll();
    if (localBlogs.length === 0) {
      console.log('ℹ️ No local blogs to sync.');
      return;
    }

    const blogData = localBlogs.map(b => ({
      title: b.title,
      slug: b.slug,
      content: b.content,
      image_url: b.image_url,
      author: b.author,
      created_at: b.created_at
    }));

    const { error } = await supabase.from('blogs').upsert(blogData, { onConflict: 'slug' });
    if (error) throw error;

    console.log(`✅ Successfully synced ${localBlogs.length} blogs to Supabase.`);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  }
}

sync();
