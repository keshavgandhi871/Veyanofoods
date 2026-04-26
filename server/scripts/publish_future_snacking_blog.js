/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts the "Why Roasted Makhana is the Future of Clean Snacking in India" blog post.
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

const blogContent = `<p>In an era where "healthy" labels often hide palm oil, artificial preservatives, and hidden sugars, the Indian consumer is finally asking: What am I actually eating? At VEYANO Foods, we believe that snacking shouldn't be a compromise between health and taste. As the movement toward Clean Snacking grows in India, one ancient superfood is reclaiming its throne: Roasted Makhana.</p>

<h2>The "Real Food" Crisis in the Snack Industry</h2>
<p>Most mass-market "healthy snacks" in India follow a predictable pattern. They are marketed as high-fiber or protein-rich, but a quick look at the back of the pack reveals:</p>
<ul>
  <li><strong>Refined Vegetable Oils:</strong> Primarily palm oil, which is high in saturated fats.</li>
  <li><strong>Maltodextrin & Syrups:</strong> Used to bind flavors but spike blood sugar.</li>
  <li><strong>Artificial Flavor Enhancers:</strong> Designed to make snacks addictive rather than nourishing.</li>
</ul>
<p>VEYANO was founded to break this cycle. Based in Karnal, we’ve returned to the basics of Real Food—simple ingredients, transparent processes, and zero chemical shortcuts.</p>

<h2>Why Roasted Makhana?</h2>
<p>Fox nuts, or Makhana, have been a staple in Indian households for centuries. However, the VEYANO difference lies in the Roasting Process. Unlike fried snacks that lose their nutritional integrity, our Roasted Makhana maintains:</p>
<ul>
  <li><strong>Low Glycemic Index:</strong> Ideal for those managing blood sugar levels.</li>
  <li><strong>High Plant-Protein:</strong> A vital source of protein for vegetarians.</li>
  <li><strong>Calorie Efficiency:</strong> You can enjoy a satisfying crunch without the "calorie guilt" of potato chips.</li>
  <li><strong>Gluten-Free & Vegan Friendly:</strong> Naturally inclusive for almost any diet.</li>
</ul>

<h2>The VEYANO Promise: Clean Snacking, No Compromise</h2>
<p>When we say "Clean Ingredients," we mean it. Our latest batch—roasted right here in Haryana—uses only the finest fox nuts and real spices. Whether it’s our Fiery Peri-Peri or Classic Salted, you won't find sugar syrups or palm oil on our labels.</p>
<p>We are proud to offer a Healthy Snack in India that is truly "Thoughtfully Made for You."</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: Is Roasted Makhana better than fried snacks?</h3>
<p>A: Yes. Roasting preserves the natural minerals and vitamins of the fox nut while significantly reducing the fat content compared to deep-frying. VEYANO uses a dry-roasting technique to ensure maximum crunch with minimal oil.</p>

<h3>Q2: What does "Clean Snacking" mean?</h3>
<p>A: Clean snacking refers to consuming foods made with whole, recognizable ingredients. It means avoiding artificial additives, refined oils (like palm oil), and hidden sugars.</p>

<h3>Q3: Can I eat VEYANO Makhana if I am on a weight loss diet?</h3>
<p>A: Absolutely. Makhana is high in fiber and protein, which helps you feel full for longer, reducing the urge to overeat. It is a low-calorie alternative to traditional processed snacks.</p>

<h3>Q4: Where are VEYANO products made?</h3>
<p>A: All VEYANO snacks are roasted and packed in Karnal, Haryana. We maintain strict quality control to ensure that every packet meets our "Real Food" standards.</p>`;

const blogData = {
  title: "Why Roasted Makhana is the Future of Clean Snacking in India",
  slug: "why-roasted-makhana-future-clean-snacking-india",
  content: blogContent,
  image_url: "./assets/makhana-future-clean-snacking.png",
  author: "Veyano Team"
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
