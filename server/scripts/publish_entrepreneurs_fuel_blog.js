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

const blogContent = `<p>In the high-stakes world of business and academia, "brain fog" is the enemy of progress. We often blame a lack of sleep or high stress, but the culprit is frequently hiding in our snack drawer. Most <strong>Healthy Snacks in India</strong> are secretly loaded with refined flours and hidden sugars that cause a rapid spike—and a devastating crash—in blood glucose levels.</p>

<p>At VEYANO Foods, we believe your food should work as hard as you do. Our <strong>Roasted Makhana</strong> isn't just a treat; it’s a strategic fuel source designed for those who demand peak mental performance.</p>

<h2>The "Glucose Rollercoaster" vs. Sustained Focus</h2>
<p>When you consume mass-market "diet" biscuits or fried chips, your blood sugar spikes. Your body responds with a heavy dose of insulin, leading to that familiar mid-afternoon slump.</p>

<p>Clean Snacking with VEYANO changes the game:</p>

<ul>
  <li><strong>Low Glycemic Index (GI):</strong> <strong>Roasted Makhana</strong> releases energy slowly. This provides your brain with a steady stream of fuel, preventing the "4 PM crash."</li>
  <li><strong>Magnesium for Stress:</strong> Makhana is naturally rich in magnesium, a mineral known to improve sleep quality and reduce cortisol (the stress hormone)—essential for anyone managing a growing business or intense study schedule.</li>
  <li><strong>B-Vitamin Complex:</strong> These essential vitamins found in fox nuts are critical for converting food into cellular energy, keeping your cognitive gears turning without the need for excessive caffeine.</li>
</ul>

<h2>Real Food for Real Hustle</h2>
<p>As an entrepreneur-led brand based in Karnal, we understand the "0% luck, 100% discipline" mindset. Discipline starts with what you put in your body. By choosing a Real Food alternative like VEYANO, you are removing synthetic additives and inflammatory oils from your diet, allowing your body to focus on what matters: Execution.</p>

<p>Our Peri-Peri and Salted variants offer the perfect crunch to satisfy sensory cravings while keeping your gut light and your mind sharp.</p>

<hr />

<h2>Cognitive Health & Healthy Snacking FAQ</h2>
<h3>Q1: Why is Roasted Makhana better for focus than energy bars?</h3>
<p>A: Many energy bars are "glorified candy bars" packed with syrups. VEYANO Roasted Makhana is a whole-seed snack with a balanced profile of protein and complex carbs, ensuring stable energy without the sugar-induced brain fog.</p>

<h3>Q2: Can I eat VEYANO snacks while fasting or on a restricted diet?</h3>
<p>A: Absolutely. Makhana is a traditional "Phalahari" food in India, making it perfect for religious fasts. It is also gluten-free and vegan-friendly, fitting almost any modern dietary protocol.</p>

<h3>Q3: Does the salt content in VEYANO affect focus?</h3>
<p>A: We use a controlled amount of high-quality salt. Unlike mass-market snacks that use excessive sodium to mask low-quality ingredients, VEYANO focuses on flavor balance to avoid the dehydration and lethargy associated with high-salt diets.</p>

<h3>Q4: Is it okay to replace a meal with Makhana during a busy workday?</h3>
<p>A: While we recommend balanced meals, a large serving of VEYANO (50g–70g) is a far superior "emergency meal" than traditional fast food, providing essential minerals and protein to keep you going until your next full meal.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO is an entrepreneur-led brand based in Karnal committed to providing high-quality <strong>Healthy Snacks in India</strong>. As a GST-compliant entity, VEYANO follows national quality and tax standards—building massive trust with our corporate B2B clients and consumers alike.</p>

<div style="background-color: #fdfbf7; padding: 20px; border-left: 4px solid #c08b5c; margin-top: 30px;">
  <p style="margin-bottom: 0;"><strong>Actionable Tip:</strong> Update your Instagram bio to include: "The Entrepreneur's Choice for Clean Snacking. 🚀 Order at <a href="https://veyano.in" target="_blank" rel="noopener noreferrer">veyano.in</a>"</p>
</div>

<p style="font-size: 0.85rem; color: #888; margin-top: 20px;"><em>VEYANO is a registered FSSAI brand (License: 20826010000397). Shop with confidence knowing our products meet the highest safety and quality standards.</em></p>`;

const blogData = {
  title: "The Entrepreneur’s Fuel: How Clean Snacking Enhances Cognitive Focus",
  slug: "entrepreneurs-fuel-clean-snacking-cognitive-focus",
  content: blogContent,
  image_url: "./assets/veyano_entrepreneurs_fuel.png",
  author: "Veyano Team",
  created_at: "2026-05-14T10:00:00Z"
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
