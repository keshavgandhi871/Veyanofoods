/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts "Why Transparency is the Secret Ingredient in VEYANO Foods"
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const blogContent = `
<p>In the world of <strong>Healthy Snacks India</strong>, there is a big difference between a "home-made" snack and a "professionally curated" superfood. Today, we are celebrating a major step in our journey to becoming India’s most trusted Clean Snacking brand. At VEYANO, our commitment to you isn't just about the flavor—it’s about the standard of excellence we uphold in every single pouch of Roasted Makhana.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/makhana-science.png" alt="VEYANO Foods Transparency Quality FSSAI Roasted Makhana" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>The Pillar of Professionalism: More Than Just a Label</h2>
<p>When you see a VEYANO pack, you aren't just seeing a snack; you are seeing a product of rigorous standards. From our FSSAI certification to our official tax registration, every step we take is designed to give you peace of mind. Why does this matter for your health?</p>
<ul>
  <li><strong>Standardized Quality:</strong> Being a registered brand means we follow strict protocols. Our roasting process in Karnal is consistent, ensuring every seed has the same crunch and nutrient profile.</li>
  <li><strong>Traceability:</strong> We know exactly where our fox nuts come from. Unlike unbranded snacks sold in loose packets, VEYANO offers full accountability for what goes into your body.</li>
  <li><strong>Real Food Integrity:</strong> We don't hide behind ambiguous "proprietary spice blends." We are transparent about our ingredients because we have nothing to hide.</li>
</ul>

<h2>Leading the Healthy Snacks India Movement</h2>
<p>As an entrepreneur-led brand, VEYANO is built on the philosophy of "0% luck, 100% discipline." This discipline extends to our compliance. By operating as a fully registered entity, we are able to scale our mission of replacing processed junk with Real Food across the entire country.</p>
<p>When you buy VEYANO, you are supporting a brand that values the legal and health standards of India. You are choosing a snack that is clean by nature and professional by choice.</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: How does a brand’s registration affect the quality of Roasted Makhana?</h3>
<p>A: Registration requires adherence to safety and hygiene standards. VEYANO’s commitment to these standards ensures that our Clean Snacking products are free from contaminants often found in unbranded, loose-sold makhana.</p>

<h3>Q2: Is VEYANO Foods a local brand?</h3>
<p>A: Yes, we are proudly based in Karnal, Haryana. We source high-quality ingredients and handle our roasting and packaging locally to ensure the freshest possible product reaches your doorstep.</p>

<h3>Q3: Can I get a tax invoice for my bulk VEYANO order?</h3>
<p>A: Absolutely. As a registered entity, we provide official invoices for all orders placed on <a href="https://veyano.in">veyano.in</a>, making it easy for corporate offices and retail partners to stock our healthy snacks.</p>

<h3>Q4: What is the best way to store VEYANO Makhana?</h3>
<p>A: Our premium standing pouches are designed to keep moisture out. Simply zip the pouch tight after snacking to maintain that signature "Real Food" crunch without any artificial preservatives.</p>

<p><em>Experience the transparency at <a href="https://veyano.in">veyano.in</a>.</em></p>
`;

const blogData = {
  title: "Why Transparency is the Secret Ingredient in VEYANO Foods",
  slug: "transparency-secret-ingredient-veyano-foods",
  content: blogContent,
  image_url: "./assets/makhana-science.png",
  author: "Veyano Team"
};

async function postBlog() {
  console.log('🚀 Attempting to post the Transparency blog to Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('blogs')
      .upsert([blogData], { onConflict: 'slug' });

    if (error) {
      console.error('❌ Supabase Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Success! The Transparency blog has been published.');
    console.log('🔗 Slug:', blogData.slug);
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    process.exit(1);
  }
}

postBlog();
