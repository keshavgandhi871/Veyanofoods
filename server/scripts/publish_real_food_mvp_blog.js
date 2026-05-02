/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts the "Why Roasted Makhana is the 'Real Food' MVP of Healthy Snacks in India" blog post.
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
<p>In a market saturated with "diet" chips and "baked" snacks that are still loaded with palm oil and preservatives, VEYANO Foods is here to set a new standard for Clean Snacking. As we look at the snacking landscape in 2026, one thing is clear: the Indian consumer is no longer just looking for "low calorie"—they are looking for "Real Food."</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/real_food_makhana.png" alt="VEYANO Roasted Makhana premium clean snacking real food India." style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>The VEYANO Philosophy: Beyond the Industrial Crunch</h2>
<p>Most mass-market snacks rely on industrial processing that strips ingredients of their natural nutrition. At VEYANO, we treat our Roasted Makhana with the respect a superfood deserves.</p>

<ul>
  <li><strong>The Roasting Secret:</strong> Unlike snacks that are flash-fried and then labeled "healthy," our fox nuts are dry-roasted in small batches. This preserves the essential minerals like magnesium and potassium.</li>
  <li><strong>No Hidden Chemicals:</strong> We strictly avoid maltodextrin and artificial flavor enhancers. Our Peri-Peri and Salted variants use real spices to provide a premium taste without the chemical aftertaste.</li>
  <li><strong>Sourced with Integrity:</strong> Every packet of VEYANO is a product of our commitment to quality, starting from the raw seeds to the final roast in Karnal.</li>
</ul>

<h2>Why Clean Snacking is a Lifestyle, Not a Trend</h2>
<p>Choosing a Healthy Snack in India shouldn't feel like a chore. VEYANO provides that satisfying crunch that fits perfectly into a busy lifestyle:</p>

<ul>
  <li><strong>Office Fuel:</strong> The high fiber and protein content provide steady energy without the sugar crashes of processed biscuits.</li>
  <li><strong>Post-Workout Recovery:</strong> A natural source of plant-based protein to help your muscles recover.</li>
  <li><strong>Guilt-Free Late Night:</strong> Low in sodium and saturated fats, making it the perfect companion for your late-night work sessions.</li>
</ul>

<h2>The Future of Food is Transparent</h2>
<p>As an entrepreneur-led brand, VEYANO stands for transparency. When you read our labels, you recognize every ingredient. That is our promise of "Real Food" to you. Experience the difference by exploring our offerings at <a href="/">veyano.in</a>.</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: What makes Roasted Makhana a "Clean Snack"?</h3>
<p>A: A snack is "clean" when it is made with whole-food ingredients and free from synthetic additives or refined oils. VEYANO Roasted Makhana uses only fox nuts and natural seasonings, making it a benchmark for clean snacking.</p>

<h3>Q2: Is VEYANO Makhana suitable for a vegan diet?</h3>
<p>A: Yes! Our roasting process and seasonings are entirely plant-based, making it an excellent high-protein snack for vegans and vegetarians.</p>

<h3>Q3: How does VEYANO compare to other "Healthy Snacks in India"?</h3>
<p>A: Many brands use "healthy" as a marketing term while still using palm oil or high levels of sodium. VEYANO is a "Real Food" alternative that prioritizes dry-roasting and clean ingredient labels above all else.</p>

<h3>Q4: Where can I buy VEYANO snacks?</h3>
<p>A: You can find our premium roasted makhana on our official website, <a href="/">veyano.in</a>, and on major marketplaces like Meesho.</p>
`;

const blogData = {
  title: "Why Roasted Makhana is the \"Real Food\" MVP of Healthy Snacks in India",
  slug: "roasted-makhana-real-food-mvp-healthy-snacks-india",
  content: blogContent,
  image_url: "./assets/real_food_makhana.png",
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
