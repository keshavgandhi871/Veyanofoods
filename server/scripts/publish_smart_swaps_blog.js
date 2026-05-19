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

const blogContent = `<p>When most people embark on a wellness journey or a structural lifestyle change, they assume it requires a complete overhaul of their kitchen. They trade traditional Indian flavors for bland, imported salads or expensive, chemical-laden meal replacement shakes.</p>

<p>At VEYANO Foods, we believe true wellness doesn't require abandoning our culinary roots; it requires upgrading them. By shifting from ultra-processed additives to Real Food alternatives, you can enjoy classic Indian comfort foods while maintaining perfect metabolic health. The secret weapon in this lifestyle upgrade? Premium, slow-roasted fox nuts.</p>

<p>Here is your educational guide to seamless <a href="/index.html#about">Clean Snacking</a> integrations that transform your standard daily meals into nutrient-dense powerhouses.</p>

<h2>1. The Breakfast Boost: Ditch the Cornflakes for Makhana Granola</h2>
<p>Commercial breakfast cereals marketed as "low-fat" or "fitness-friendly" are often packed with hidden sugars like maltodextrin and high-fructose corn syrup. They spike your insulin first thing in the morning, leading to intense sluggishness by 11 AM.</p>

<p><strong>The Clean Swap:</strong> Create a savory or sweet breakfast bowl using VEYANO Plain <a href="/product.html">Roasted Makhana</a>. Gently crush a handful into your skimmed milk, low-fat curd, or almond milk. Add a dash of raw honey, chia seeds, and almonds. Because our makhana is slow-roasted under precise temperature controls at our facility in Karnal, it retains its structural crunch, giving you a high-fiber, low-glycemic start to the day.</p>

<h2>2. The Mid-Day Crunch: Elevating the Humble Raita</h2>
<p>Raita is a staple in almost every household across India, valued for its cooling properties and digestive enzymes. However, many people routinely top it with fried boondi—which is made of refined flour (besan) and deep-fried in oxidized palm oil.</p>

<p><strong>The Clean Swap:</strong> Upgrade your lunch by making a classic Makhana Raita. Whip fresh, home-made curd, stir in roasted cumin, roasted pink salt, and top it generously with VEYANO Salted Makhana. The fox nuts absorb just enough moisture to soften slightly while keeping a distinct, satisfying bite. This swap instantly removes empty trans-fats and replaces them with bone-strengthening calcium and bioavailable plant protein.</p>

<h2>3. The Pre-Workout Fuel: Re-Engineering the Chaat</h2>
<p>If you are hit with a sudden wave of fatigue before heading to the gym or starting a deep-work professional session, reaching for a commercial "energy bar" can backfire due to the high synthetic sugar content.</p>

<p><strong>The Clean Swap:</strong> Toss chopped cucumbers, tomatoes, fresh coriander, and a squeeze of lemon juice with a full pouch of VEYANO Peri-Peri Makhana. The natural capsaicin in our chili blend gives your metabolism a gentle kickstart, while the complex carbohydrates provide a steady, slow-release stream of glycogen to fuel your muscles and brain without any post-snack crash.</p>

<hr />

<h2>The Culinary Integration FAQ (SEO Edition)</h2>
<h3>Q1: Does adding Roasted Makhana to milk or curd destroy its nutritional value?</h3>
<p>A: Not at all. Combining Roasted Makhana with dairy or plant-based milks actually creates a complete amino acid profile. The proteins in the milk complement the plant-based proteins in the fox nut, maximizing muscle recovery and prolonged satiety.</p>

<h3>Q2: Can I use VEYANO flavored makhana (like Peri-Peri) in cooking, or will it alter the taste?</h3>
<p>A: Our flavored profiles are crafted using 100% natural ground spices through a specialized misting technology rather than oily coatings. This makes them exceptional texturizers and flavor-boosters for contemporary salads, dry stir-fries, or healthy evening chaats.</p>

<h3>Q3: Why should I buy VEYANO over loose, unbranded raw makhana for cooking?</h3>
<p>A: Raw makhana contains residual moisture that makes it chewy and difficult for the body to digest smoothly. VEYANO provides a standardized, quality-tested product that is already dry-roasted to perfection. This saves you time in the kitchen and ensures you are getting a clean, contaminant-free product that aligns with official safety and national quality standards.</p>

<h3>Q4: Is it safe to reheat or cook makhana based dishes for office tiffins?</h3>
<p>A: Yes. If you are packing a dish like Makhana Raita or a dry savory mix for your office routine, pack the VEYANO elements in a small, separate dry container and mix them right before consumption. This ensures you enjoy that signature, crisp "Real Food" crunch every single time.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO is an authentic, premium brand committed to transforming the Indian snacking ecosystem. As a fully registered, GST-compliant entity, we ensure that every pouch of makhana delivered to you meets the highest safety, transparency, and nutritional standards.</p>`;

const blogData = {
  title: "The Smart Swaps: How to Integrate Clean Snacking Into Your Daily Indian Diet Plan",
  slug: "smart-swaps-integrate-clean-snacking-daily-indian-diet",
  content: blogContent,
  image_url: "./assets/veyano_makhana_raita.png",
  author: "Veyano Team",
  created_at: "2026-05-18T10:00:00Z"
};

async function postBlog() {
  console.log('🚀 Attempting to post new blog to Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('blogs')
      .upsert([blogData], { onConflict: 'slug' });

    if (error) {
      console.error('❌ Supabase Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Success! Blog post has been published.');
    console.log('🔗 Slug:', blogData.slug);
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    process.exit(1);
  }
}

postBlog();
