const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllBlogs() {
  console.log('🔍 Listing all blog posts from Supabase...');
  const { data, error } = await supabase
    .from('blogs')
    .select('title, slug, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase Error:', error.message);
    process.exit(1);
  } else {
    console.log(`✅ Found ${data.length} blog posts in Supabase:`);
    data.forEach((blog, index) => {
      console.log(`${index + 1}. [${blog.created_at}] - ${blog.title} (${blog.slug})`);
    });
    process.exit(0);
  }
}

listAllBlogs();
