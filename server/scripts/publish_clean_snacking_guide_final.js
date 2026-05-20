/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts "The Ultimate Guide to Clean Snacking: Why Your Body Deserves Real Food"
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
<p>Over the last six days, we’ve explored the deceptive labels of the snack industry and the nutritional powerhouse that is the fox nut. Today, we’re bringing it all together. Welcome to the VEYANO masterclass on <strong>Clean Snacking</strong>. In a world of "ultra-processed" convenience, choosing Real Food is the ultimate act of self-care.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/makhana_clean_snacking.png" alt="Clean Snacking Guide VEYANO Roasted Makhana Real Food" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>What Exactly is "Clean Snacking"?</h2>
<p>In the context of the modern Indian diet, clean snacking means consuming foods that are as close to their natural state as possible. It’s about three core pillars:</p>
<ul>
  <li><strong>Ingredient Transparency:</strong> If a 10-year-old can’t read the label, it shouldn't be in the bag.</li>
  <li><strong>Nutrient Density:</strong> Every calorie should serve a purpose—whether it’s protein for muscle or fiber for digestion.</li>
  <li><strong>Process Integrity:</strong> Avoiding high-heat frying that turns healthy fats into trans-fats.</li>
</ul>

<h2>The VEYANO Standard: More Than Just "Roasted"</h2>
<p>While many brands in the <strong>Healthy Snacks India</strong> market claim to be healthy, VEYANO differentiates itself through a "Source-to-Pouch" integrity check.</p>
<p>Our <strong>Roasted Makhana</strong> isn't just a snack; it's a superfood treated with precision. By sourcing directly from farmers and roasting in our specialized facility in Karnal, we ensure that the natural antioxidants and minerals—like kaempferol, which has anti-aging properties—remain intact. Unlike mass-market alternatives, we don't hide behind "nature-identical" flavors. We use the real deal.</p>

<h2>Transitioning to a Real Food Lifestyle</h2>
<p>Switching to a clean snacking routine doesn't happen overnight. It starts with a simple swap:</p>
<ul>
  <li><strong>Morning Hunger:</strong> Swap the sugary biscuit for a handful of VEYANO Plain Roasted Makhana.</li>
  <li><strong>The 4 PM Slump:</strong> Instead of fried samosas, reach for our Peri-Peri variant for a metabolism-boosting kick.</li>
  <li><strong>Late Night Cravings:</strong> Opt for Salted Makhana to satisfy the crunch without the morning-after bloating caused by high-sodium chips.</li>
</ul>

<hr />

<h2>The Clean Snacking FAQ (SEO Edition)</h2>
<h3>Q1: Why is Roasted Makhana considered a "Real Food" alternative?</h3>
<p>A: "Real Food" refers to items with minimal processing and no synthetic additives. VEYANO Roasted Makhana fits this perfectly, as it is a whole seed that is simply dry-roasted and lightly seasoned with natural spices.</p>

<h3>Q2: Can I give VEYANO snacks to my children for school?</h3>
<p>A: Yes. In fact, it is one of the best <strong>Healthy Snacks in India</strong> for kids. It provides sustained energy and essential minerals like calcium for bone growth without the "sugar high" of processed snacks.</p>

<h3>Q3: How does VEYANO stay crunchy without using preservatives?</h3>
<p>A: We use a high-tech moisture-controlled roasting process and nitrogen-flushed, premium standing pouches. This keeps the crunch fresh and the nutrients locked in naturally.</p>

<h3>Q4: Is your makhana safe for people with high blood pressure?</h3>
<p>A: Yes. Our snacks are low in sodium and high in potassium, a combination that is clinically recognized as heart-friendly and helpful for maintaining healthy blood pressure levels.</p>

<hr />

<h2>Explore More from Our Clean Snacking Series</h2>
<p>This guide is the finale of our deep-dive series. Catch up on our previous explorations into the world of real food:</p>
<ul>
  <li><a href="blog-post.html?slug=beyond-the-bowl-veyano-commitment-better-india">Beyond the Bowl: Why VEYANO is a Commitment to a Better India</a></li>
  <li><a href="blog-post.html?slug=roasted-makhana-real-food-mvp-healthy-snacks-india">Roasted Makhana as the Real Food MVP</a></li>
  <li><a href="blog-post.html?slug=makhana-vs-popcorn-indias-superfood-champion">Makhana vs. Popcorn: India’s Superfood Champion</a></li>
  <li><a href="blog-post.html?slug=hidden-ingredients-snack-cupboard-guide-clean-snacking">The Hidden Ingredients in Your Snack Cupboard</a></li>
  <li><a href="blog-post.html?slug=why-roasted-makhana-future-clean-snacking-india">Why Roasted Makhana is the Future of Clean Snacking</a></li>
  <li><a href="blog-post.html?slug=protein-revolution-india-swapping-fried-namkeen-veyano">The Protein Revolution: Swapping Fried Namkeen for VEYANO</a></li>
</ul>

<p><em>Join the Real Food movement at <a href="https://veyano.in">veyano.in</a>.</em></p>
`;

const blogData = {
  title: "The Ultimate Guide to Clean Snacking: Why Your Body Deserves Real Food",
  slug: "ultimate-guide-clean-snacking-real-food",
  content: blogContent,
  image_url: "./assets/makhana_clean_snacking.png",
  author: "Veyano Team"
};

async function postBlog() {
  console.log('🚀 Attempting to post the Clean Snacking Guide to Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('blogs')
      .upsert([blogData], { onConflict: 'slug' });

    if (error) {
      console.error('❌ Supabase Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Success! The Ultimate Guide has been published.');
    console.log('🔗 Slug:', blogData.slug);
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

postBlog();
