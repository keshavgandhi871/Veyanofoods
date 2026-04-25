const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const sequelize = require('../config/db');
const Blog = require('../models/Blog');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const blogContent = `
<p>For decades, the Indian "4 PM ritual" has been dominated by a predictable, albeit oily, cast of characters. From the ubiquitous yellow packets of Bhujia and Namkeen to the street-side Samosas dripping with saturated fats, snacking in India has historically been about one thing: <strong>taste at the cost of health.</strong></p>

<p>But as we move into 2026, a seismic shift is occurring in the Indian pantry. The "Tasty but Oily" era is being dismantled by a new generation of conscious consumers who demand more from their food. We are witnessing <strong>The Protein Revolution</strong>, where snacks are no longer just a "time-pass" activity but a functional tool for energy management. Leading this charge is a humble, ancient superfood reimagined for the modern palate: <strong>VEYANO Roasted Makhana.</strong></p>

<hr />

<h2>Section 1: The Protein Gap in Indian Snacking</h2>
<p>The Indian diet has a glaring, well-documented problem: the Protein Gap. Statistics suggest that nearly 80% of Indians are protein-deficient, often relying on carb-heavy meals that lead to mid-day crashes and long-term metabolic issues. For the average urban professional or the health-conscious homemaker, snacks were traditionally the biggest "nutritional leak" of the day.</p>

<p>Traditional fried Namkeen is a calorie bomb designed to provide a momentary salt hit followed by a lethargic "slump." These snacks are "empty calories"—high in trans-fats and carbohydrates, but nearly void of any muscle-building protein or gut-friendly fiber.</p>

<p><strong>VEYANO</strong> has positioned its <strong>Roasted Makhana</strong> as a strategic ally in this battle. Unlike deep-fried snacks that drain your energy, makhana (fox nuts) provides a steady release of complex carbohydrates paired with plant-based protein. By choosing VEYANO, you are managing your energy levels. It is the transition from "mindless munching" to "mindful fueling." The shift toward <strong>Healthy Snacks India</strong> is fueled by the realization that what you eat at 4 PM determines how you feel at 8 PM.</p>

<hr />

<h2>Section 2: The Truth About 'Clean Labels'</h2>
<p>In the world of mass-market snacking, a quick glance at the fine print of a standard namkeen bag reveals a cocktail of palm oil, maltodextrin (a high-glycemic sugar substitute), and synthetic flavor enhancers. At VEYANO, we believe that if you can’t pronounce an ingredient, it shouldn't be in your body. This is the cornerstone of our <strong>Clean Snacking Revolution.</strong></p>

<p>While mass-market brands optimize for cost by using cheap palm oil, VEYANO prioritizes <strong>Recognizable Ingredients.</strong> Our label is a testament to transparency. We use real spices, minimal processing, and the highest grade of fox nuts. The <strong>Clean Snacking Revolution</strong> is about reclaiming the right to know what we consume. When you pick up a pack of VEYANO, you see a commitment to purity.</p>

<hr />

<h2>Section 3: Product Deep Dive (Internal Linking)</h2>
<h3>1. Peri-Peri Makhana: A Bold Communication of Flavor</h3>
<p>For those who believe that "healthy" must mean "bland," our <strong>Peri-Peri Makhana</strong> is a loud, spicy rebuttal. We describe this as a 'bold communication of flavor.' Using a signature blend of African bird’s eye chili and aromatic herbs, we’ve created a snack that delivers a punchy, zesty experience without sacrificing health.</p>

<h3>2. Salted & Plain Variants: The 'Sattvic' Choice</h3>
<p>In many Indian households, makhana has always been a 'Sattvic' food—pure, wholesome, and spiritually aligned with wellness. Our <strong>Salted and Plain</strong> variants honor this tradition. These are the 'pure' options for fasting or daily routine moments, ensuring you stay within your caloric budget while keeping your hunger at bay.</p>

<hr />

<h2>Section 4: Extensive Q&A Section (SEO FAQ)</h2>
<h3>Is roasted makhana better than protein bars for weight loss?</h3>
<p>Absolutely. While many protein bars are loaded with sugar alcohols, VEYANO <strong>Roasted Makhana</strong> offers a superior satiety-to-calorie ratio. A typical serving is high in volume but low in density, meaning you can eat more for fewer calories.</p>

<h3>Why is VEYANO's slow-roasting process better than 'olive oil' frying?</h3>
<p>Many brands claim to use olive oil but still "flash-fry" at high temperatures. VEYANO utilizes a <strong>meticulous slow-roasting process.</strong> We use heat to achieve the perfect crunch without submerging the makhana in oil, preserving the delicate micronutrients.</p>

<h3>Can makhana help with gut health and immunity?</h3>
<p>Yes. Makhana is naturally gluten-free and has a low glycemic index. It is rich in functional antioxidants like kaempferol, which help fight inflammation and support immune function. Swapping fried namkeen for makhana is one of the easiest health upgrades you can make.</p>

<h3>How many grams of protein are in a 200g VEYANO pack?</h3>
<p>A 200g pack of VEYANO Roasted Makhana contains approximately <strong>18 to 20 grams</strong> of high-quality plant protein. This makes it a significant contributor to your daily requirements compared to traditional snacks.</p>

<hr />

<h2>Conclusion: The Smartest Investment for Your 4 PM Cravings</h2>
<p>The era of choosing between 'tasty' and 'healthy' is over. Join the <strong>Clean Snacking Revolution</strong> with VEYANO. Investing in your health starts with a simple swap. Replace that bowl of fried bhujia with a handful of nutrient-dense, perfectly roasted fox nuts.</p>

<div style="background: #fdf6e7; padding: 2rem; border-radius: 12px; text-align: center; margin-top: 2rem; border: 1px solid #FF9900;">
  <h3 style="color: #FF9900; margin-bottom: 0.5rem;">The Smartest Investment</h3>
  <p style="font-weight: 700; font-size: 1.25rem;">Get the Makhana Trio Combo (3 x 200g) for ₹999 – This is the smartest investment for your 4 PM Cravings!</p>
  <p><a href="product.html?variant=combo" class="btn">Shop the Trio Combo</a></p>
</div>
`;

const blogData = {
  title: "The Protein Revolution: Why India is Swapping Fried Namkeen for VEYANO Roasted Makhana",
  slug: "protein-revolution-india-swapping-fried-namkeen-veyano",
  content: blogContent,
  image_url: "./assets/plain.png",
  author: "Veyano Editorial"
};

async function publish() {
  console.log('🚀 Publishing "The Protein Revolution" post...');

  // 1. Sync SQLite
  try {
    await sequelize.sync();
    await Blog.upsert(blogData);
    console.log('✅ SQLite: Blog post published locally.');
  } catch (err) {
    console.error('❌ SQLite Error:', err.message);
  }

  // 2. Sync Supabase (if available)
  if (supabase) {
    try {
      const { error } = await supabase.from('blogs').upsert([blogData], { onConflict: 'slug' });
      if (error) throw error;
      console.log('✅ Supabase: Blog post published remotely.');
    } catch (err) {
      console.warn('⚠️ Supabase sync failed (expected if credentials invalid):', err.message);
    }
  } else {
    console.log('ℹ️ Supabase: Skipping (not configured).');
  }

  console.log('\n🔗 New Blog Slug:', blogData.slug);
}

publish();
