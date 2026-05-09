/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts the "Beyond the Bowl: Why VEYANO is a Commitment to a Better India" blog post.
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
<p>In the bustling markets of India, snacks are everywhere. From street-side fried treats to colorful packets on supermarket shelves, the options are endless. But as we’ve discussed throughout this week, not all snacks are created equal. At VEYANO Foods, based in the heart of Karnal, we didn’t just set out to sell <strong>Roasted Makhana</strong>; we set out to change the way India thinks about <strong>Clean Snacking</strong>.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/beyond_the_bowl_v2.webp" alt="Roasted Makhana Healthy Snacks India Clean Snacking VEYANO" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>The "Real Food" Revolution Starts at Home</h2>
<p>When we launched VEYANO, we made a promise: No shortcuts. While mass-market brands optimize for "shelf-life" using synthetic preservatives and cheap palm oil, we optimize for Life.</p>

<p>Our roasting facility isn't just a factory—it's a kitchen on a larger scale. By dry-roasting our fox nuts at precise temperatures, we ensure that the nutrients stay inside the crunch. This is the <strong>Healthy Snacks India</strong> deserves—one that honors our traditional roots while meeting the high-performance demands of modern life.</p>

<h2>Why Your Choice Matters</h2>
<p>Every time you choose a packet of VEYANO over a generic bag of fried chips, you are:</p>
<ul>
  <li><strong>Prioritizing Your Heart:</strong> By avoiding trans-fats and refined oils.</li>
  <li><strong>Supporting Transparency:</strong> Choosing a brand that lists every ingredient clearly, with no hidden chemical codes.</li>
  <li><strong>Fueling <a href="index.html#story">discipline</a>:</strong> As our founder often says, "Success is 0% luck and 100% discipline." That discipline starts with what you put in your body during your 4 PM hunger pangs.</li>
</ul>

<h2>The VEYANO Community</h2>
<p>We are more than just a brand; we are a community of students, entrepreneurs, and parents who refuse to settle for "good enough." Whether you're studying for exams or building the next big startup, VEYANO is the fuel that keeps you going without the mid-day sluggishness caused by processed junk.</p>

<p>Join the Real Food movement. Grab your Peri-Peri pack at <a href="index.html">veyano.in</a> today.</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: Is Roasted Makhana a good snack for weight loss?</h3>
<p>A: Absolutely. Because it is high in protein and fiber but low in calories, it helps you feel full longer, preventing the overeating often associated with "empty calorie" snacks.</p>

<h3>Q2: What makes VEYANO different from other makhana brands?</h3>
<p>A: Many brands "roast" their makhana and then soak them in oil to get the spices to stick. VEYANO uses a specialized misting technique to ensure flavor without the grease, maintaining the "Clean Snacking" standard.</p>

<h3>Q3: Can I eat Makhana every day?</h3>
<p>A: Yes! In fact, it is recommended as a daily snack because it is a natural source of calcium and minerals that support bone health and kidney function.</p>

<h3>Q4: Is VEYANO's packaging eco-friendly?</h3>
<p>A: We use premium standing pouches designed to keep the makhana fresh without extra chemical liners, and we are constantly working toward more sustainable packaging solutions for the future of India.</p>
`;

const blogData = {
  title: "Beyond the Bowl: Why VEYANO is a Commitment to a Better India",
  slug: "beyond-the-bowl-veyano-commitment-better-india",
  content: blogContent,
  image_url: "./assets/beyond_the_bowl_v2.webp",
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
