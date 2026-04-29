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

const blogContent = `<p>Most Indians believe that "Baked" or "Multigrain" on a label automatically means healthy. However, the reality of the food industry is often hidden in the fine print. At VEYANO Foods, we believe that if you can’t pronounce an ingredient, it shouldn't be in your body. Today, we’re pulling back the curtain on mass-market snacks and showing you why Roasted Makhana is the gold standard of Clean Snacking.</p>

<h2>The Deception of "Zero Cholesterol"</h2>
<p>You’ve likely seen "Zero Cholesterol" plastered across packets of fried chips. While technically true (plant-based oils don't contain cholesterol), these snacks are often loaded with Palm Oil and Hydrogenated Fats.</p>
<p>These fats are the primary drivers of inflammation and heart disease in India. VEYANO takes a different approach. Our roasting process in Karnal uses zero palm oil, ensuring that our Roasted Makhana is not just "cholesterol-free" by nature, but "inflammation-free" by design.</p>

<h2>Decoding the Labels: What VEYANO Leaves Out</h2>
<p>When you compare a VEYANO label to a typical "diet" snack found in supermarkets, the difference is striking:</p>
<ul>
  <li><strong>No Maltodextrin:</strong> Often used as a filler or flavor carrier, this highly processed carbohydrate spikes blood sugar faster than table sugar.</li>
  <li><strong>No INS 627 or 631:</strong> These are chemical flavor enhancers designed to make snacks addictive. We rely on real spices like black pepper, sea salt, and peri-peri chilies.</li>
  <li><strong>No Artificial Colors:</strong> Our makhana looks like real food because it is real food.</li>
</ul>

<h2>Why VEYANO is the "Real Food" Choice</h2>
<p>Clean Snacking isn't a marketing buzzword for us; it’s our manufacturing blueprint. By sourcing high-quality fox nuts and roasting them in small batches, we maintain a level of purity that mass-produced snacks simply can't match. When you choose VEYANO, you aren't just buying a snack; you're voting for transparency in the Indian food ecosystem.</p>

<hr />

<h2>Frequently Asked Questions (SEO FAQ)</h2>
<h3>Q1: Why is palm oil bad for healthy snacking?</h3>
<p>A: Palm oil is high in saturated fats and is often highly refined, which can lead to increased LDL (bad) cholesterol and environmental concerns. VEYANO uses alternative, healthier methods to ensure our roasted makhana stays crunchy without the need for low-quality oils.</p>

<h3>Q2: How does VEYANO ensure its makhana is "Clean"?</h3>
<p>A: We follow a "Kitchen-First" philosophy. If an ingredient isn't found in a standard home kitchen, we don't use it. Our makhana is dry-roasted and seasoned with natural spices, avoiding all synthetic preservatives and flavor enhancers.</p>

<h3>Q3: Is Roasted Makhana better than "Baked" potato chips?</h3>
<p>A: Yes. Many baked chips still use refined flours and starches. Makhana is a whole-seed superfood that is naturally high in protein and minerals, providing actual nourishment rather than just "less bad" calories.</p>

<h3>Q4: Can children eat VEYANO Roasted Makhana?</h3>
<p>A: Absolutely. In fact, it is one of the best snacks for children as it provides sustained energy without the "sugar crash" associated with processed snacks, helping them stay focused and active.</p>

<hr />

<div style="background-color: #fdfbf7; padding: 20px; border-left: 4px solid #c08b5c; margin-top: 30px;">
  <p style="margin-bottom: 0;"><strong>Join the Conversation:</strong> What's the one ingredient you're shocked to find in your current snacks?</p>
</div>

<p style="font-size: 0.85rem; color: #888; margin-top: 20px;"><em>VEYANO is a registered FSSAI brand (License: 20826010000397). Shop with confidence knowing our products meet the highest safety and quality standards.</em></p>`;

const blogData = {
  title: "The \"Hidden\" Ingredients in Your Snack Cupboard: A Guide to Clean Snacking",
  slug: "hidden-ingredients-snack-cupboard-guide-clean-snacking",
  content: blogContent,
  image_url: "./assets/makhana_clean_snacking.png",
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
