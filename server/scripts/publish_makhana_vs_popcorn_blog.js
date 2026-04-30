/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts the "Makhana vs. Popcorn: Why Roasted Makhana is India’s New Superfood Champion" blog post.
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

const blogContent = `<p>When it comes to Healthy Snacks in India, the debate often boils down to two heavyweights: Popcorn and Makhana. While popcorn has dominated cinema halls for decades, Roasted Makhana is rapidly becoming the preferred choice for those committed to Clean Snacking. At VEYANO Foods, we’ve analyzed the nutritional profiles, and the results are clear—Makhana isn't just a snack; it’s a "Real Food" powerhouse.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/makhana_vs_popcorn_chart.png" alt="VEYANO Roasted Makhana vs. Butter Popcorn nutrition comparison chart." style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>The Nutritional Breakdown: Seeds vs. Kernels</h2>
<p>While both are low in calories compared to fried chips, the similarities end there. Here is why VEYANO’s dry-roasted fox nuts take the lead:</p>
<ul>
  <li><strong>Protein Density:</strong> Makhana contains significantly higher plant-based protein per serving than popcorn, making it essential for muscle repair and satiety.</li>
  <li><strong>The Fiber Factor:</strong> While popcorn has fiber, it also contains "hulls" that can be difficult for some to digest. Makhana offers a smoother digestive experience with high-quality dietary fiber.</li>
  <li><strong>Mineral Richness:</strong> Makhana is naturally loaded with Magnesium, Potassium, and Phosphorus—minerals often missing from the highly processed corn used in mass-market popcorn.</li>
</ul>

<h2>The VEYANO Difference: Avoiding the "Butter Trap"</h2>
<p>Mass-market popcorn is almost always compromised by:</p>
<ul>
  <li><strong>Synthetic Butter Flavorings:</strong> Often containing diacetyl, which has been linked to respiratory issues.</li>
  <li><strong>Excessive Sodium:</strong> Designed to make the snack addictive.</li>
  <li><strong>GMO Corn:</strong> A large portion of commercial corn is genetically modified.</li>
</ul>
<p>VEYANO’s Roasted Makhana is the Real Food alternative. We use non-GMO fox nuts sourced responsibly and roasted in small batches in Karnal. Our Peri-Peri and Salted variants use cold-pressed oils and real spices, ensuring your snack is as clean as it is crunchy. <a href="/about.html">Learn more about our Karnal roasting heritage on our About Us page.</a></p>

<h2>Why Clean Snacking Matters for Your Daily Routine</h2>
<p>Choosing VEYANO means you are choosing a snack with a Low Glycemic Index. Unlike popcorn, which can cause a quicker rise in blood sugar, Makhana provides a steady release of energy. Whether you are working late in an office in Delhi or packing a tiffin in Karnal, VEYANO keeps you full without the "heavy" feeling of processed grains.</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: Is Roasted Makhana better for weight loss than popcorn?</h3>
<p>A: Yes. Makhana’s high protein-to-calorie ratio helps suppress hunger hormones more effectively than popcorn, making it a superior choice for weight management.</p>

<h3>Q2: Does VEYANO use any preservatives in their snacks?</h3>
<p>A: No. Our Clean Snacking philosophy means we use zero synthetic preservatives. We rely on high-quality roasting and airtight packaging to maintain freshness and crunch.</p>

<h3>Q3: Can people with gluten sensitivity eat VEYANO Makhana?</h3>
<p>A: Absolutely. Makhana is naturally gluten-free. Since we roast in a controlled environment without cross-contamination, it is a safe and healthy snack for those with Celiac disease or gluten intolerance.</p>

<h3>Q4: Why is Makhana called a "Superfood"?</h3>
<p>A: It is considered a superfood because it is one of the few snacks that provides a balanced mix of protein, fiber, and essential micronutrients like manganese, which supports bone health and metabolism.</p>
`;

const blogData = {
  title: "Makhana vs. Popcorn: Why Roasted Makhana is India’s New Superfood Champion",
  slug: "makhana-vs-popcorn-indias-superfood-champion",
  content: blogContent,
  image_url: "./assets/makhana_vs_popcorn_chart.png",
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
