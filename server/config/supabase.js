// server/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try loading .env from server directory first, then fallback to root
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), 'server/.env'),
  path.join(process.cwd(), '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}
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
