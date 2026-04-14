// server/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  const errorMsg = '❌ CRITICAL ERROR: Missing Supabase credentials in environment variables. ' +
                   'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file or Vercel settings.';
  console.error(errorMsg);
  // In a serverless environment (Vercel), we want to provide a helpful response rather than just crashing
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder_key');

module.exports = supabase;
