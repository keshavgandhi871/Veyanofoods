/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts "The Science of Real Food: Why Roasted Makhana is the Future of Healthy Snacks in India"
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
<p>In an era of "ultra-processed" convenience, the term "Healthy" has become one of the most misused words in the food industry. Walking down a snack aisle today feels like navigating a laboratory, with labels filled with stabilizers, emulsifiers, and "nature-identical" flavors.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/science_of_real_food.png" alt="The Science of Real Food VEYANO Roasted Makhana Clean Snacking India" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<p>At VEYANO Foods, we believe the solution isn't more chemistry—it’s more honesty. By returning to the ancient superfood of the Indian subcontinent—the fox nut—we are leading a movement toward <a href="our-story.html"><strong>Clean Snacking</strong></a> that doesn't compromise on metabolic health.</p>

<h2>The Problem with "Mass-Market" Healthy Snacks</h2>
<p>Many products marketed as Healthy Snacks in India are often just fried chips in disguise. They use high-heat processing that destroys natural enzymes and rely on cheap palm oils that contribute to systemic inflammation.</p>

<p>When you choose <a href="products.html"><strong>Roasted Makhana</strong></a>, you are choosing a "Real Food" alternative. We treat our ingredients with the respect they deserve:</p>

<ul>
  <li><strong>Low-Temperature Roasting:</strong> We don't flash-fry. Our makhana is slow-roasted to preserve its magnesium, potassium, and protein content.</li>
  <li><strong>Zero Trans-Fats:</strong> Unlike mass-market snacks, we don't use hydrogenated oils.</li>
  <li><strong>No Hidden Sugars:</strong> Many "diet" snacks use maltodextrin or corn syrup to make spices stick. We use a specialized misting process that keeps the flavor bold and the ingredients clean.</li>
</ul>

<h2>Why "Clean Snacking" is a Business Superpower</h2>
<p>For the modern professional or student, food is fuel. The "crash" you feel after eating high-carb, processed snacks is your body struggling to process synthetic additives. Clean snacking provides sustained energy. Because Roasted Makhana has a low glycemic index, it provides a steady release of glucose into the bloodstream, keeping you focused during long work hours or study sessions.</p>

<h2>The VEYANO Promise</h2>
<p>Based in Karnal, VEYANO is more than just a brand; it's a standard. We ensure that every 200g pouch of our Peri-Peri or Salted Makhana meets the highest safety and nutritional benchmarks. We don't just follow the rules; we set them.</p>

<hr />

<h2>Clean Snacking & Roasted Makhana FAQ</h2>
<h3>Q1: What exactly makes VEYANO a "Real Food" brand?</h3>
<p>A: Real Food refers to ingredients that are minimally processed and recognizable. Our Roasted Makhana is a whole seed, dry-roasted without chemical modification, making it a bioavailable source of nutrition.</p>

<h3>Q2: Is Roasted Makhana better than roasted peanuts or chickpeas?</h3>
<p>A: While all three are great, Makhana is unique because it is significantly lower in calories and fat while being rich in antioxidants like kaempferol, which helps reduce inflammation.</p>

<h3>Q3: How does VEYANO maintain the crunch without preservatives?</h3>
<p>A: The secret is in our moisture-controlled roasting and premium standing pouches. By removing moisture and sealing the pack immediately, we maintain a 6-month shelf life naturally.</p>

<h3>Q4: Can I consume VEYANO snacks if I have a gluten allergy?</h3>
<p>A: Yes! Roasted Makhana is naturally gluten-free, making it one of the safest and most nutritious Healthy Snacks in India for those with gluten sensitivities or Celiac disease.</p>

<hr />

<p><em>Join the Real Food movement at <a href="https://veyano.in">veyano.in</a>.</em></p>
`;

const blogData = {
  title: "The Science of Real Food: Why Roasted Makhana is the Future of Healthy Snacks in India",
  slug: "science-of-real-food-roasted-makhana",
  content: blogContent,
  image_url: "./assets/science_of_real_food.png",
  author: "Veyano Team"
};

async function postBlog() {
  console.log('🚀 Attempting to post "The Science of Real Food" blog to Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('blogs')
      .upsert([blogData], { onConflict: 'slug' });

    if (error) {
      console.error('❌ Supabase Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Success! The blog has been published.');
    console.log('🔗 Slug:', blogData.slug);
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

postBlog();
