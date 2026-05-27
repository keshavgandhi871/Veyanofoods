const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 Checking Supabase for the new blog post...');
  const { data, error } = await supabase
    .from('blogs')
    .select('title, slug, created_at')
    .eq('slug', 'sourcing-trap-why-cheap-loose-snacks-cost-more-to-your-health')
    .single();

  if (error) {
    console.error('❌ Supabase Error:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Found Blog Post in Supabase:');
    console.log('   Title:', data.title);
    console.log('   Slug:', data.slug);
    console.log('   Created At:', data.created_at);
    process.exit(0);
  }
}

verify();
