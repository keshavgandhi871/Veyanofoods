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

const blogContent = `<p>As a parent in India, the daily struggle of "The Tiffin" is real. We want our children to have the energy for school and play, but the market is flooded with snacks that are essentially "hidden junk"—biscuits loaded with sugar, fried chips with excessive sodium, and "healthy" bars filled with preservatives.</p>

<p>At VEYANO Foods, we are redefining the school snack. By introducing <strong>Roasted Makhana</strong> into your child’s routine, you aren't just giving them a treat; you are providing a Real Food foundation that supports their growth, focus, and long-term health.</p>

<h2>Beyond "Empty Calories"</h2>
<p>Most kids' snacks are "empty calories"—they provide a quick burst of energy followed by a focus-killing crash. Clean Snacking with VEYANO is different:</p>

<ul>
  <li><strong>Brain Fuel:</strong> The complex carbohydrates and protein in fox nuts provide a steady stream of glucose to the brain, helping children stay focused during those crucial mid-day lessons.</li>
  <li><strong>Bone Health:</strong> Makhana is a natural source of calcium, vital for growing bones and teeth.</li>
  <li><strong>Gut Health:</strong> High in fiber and easy to digest, VEYANO helps maintain a healthy gut, which is directly linked to a stronger immune system in children.</li>
</ul>

<h2>The VEYANO "Safe-Snack" Guarantee</h2>
<p>We know that for parents, "Healthy" isn't enough—it has to be Safe.</p>

<ul>
  <li><strong>Zero Trans-Fats:</strong> We never use the inflammatory oils common in mass-market snacks.</li>
  <li><strong>No MSG or Artificial Colors:</strong> Our Salted and Peri-Peri variants use 100% natural seasonings. No chemical flavor enhancers allowed.</li>
  <li><strong>Allergy-Friendly:</strong> Naturally gluten-free and processed in our dedicated facility in Karnal, VEYANO is a safe choice for children with gluten sensitivities.</li>
</ul>

<h2>Making Healthy Fun</h2>
<p>The secret to sustainable <strong>Healthy Snacks in India</strong> is taste. VEYANO’s signature crunch and bold flavors make kids feel like they’re having a "treat," while parents know they are consuming a superfood.</p>

<hr />

<h2>Parenting & Healthy Snacking FAQ</h2>
<h3>Q1: At what age can kids start eating VEYANO Roasted Makhana?</h3>
<p>A: Makhana is safe for children once they are comfortable with solid, crunchy foods (usually 2+ years). For younger children, ensure they are supervised while eating to avoid choking hazards, as with any puffed snack.</p>

<h3>Q2: Is the Peri-Peri flavor too spicy for children?</h3>
<p>A: Our Peri-Peri is designed to be flavorful rather than overwhelming. However, for younger children or those sensitive to spice, our Salted or Plain Natural versions are the perfect tiffin-friendly alternatives.</p>

<h3>Q3: How many packets of VEYANO can a child eat in a week?</h3>
<p>A: Since it is a Real Food with no harmful additives, it can be a daily part of a balanced diet. A small 30g serving (about a cup) is an ideal daily snack size for a school-going child.</p>

<h3>Q4: Can Roasted Makhana replace biscuits in my child’s diet?</h3>
<p>A: Absolutely. Replacing refined-flour biscuits with VEYANO is one of the easiest ways to reduce sugar intake and increase protein and mineral consumption in your child’s lifestyle.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO Foods is a GST-registered business committed to providing high-quality <strong>Healthy Snacks in India</strong>. As you scale into the family market, being a GST-registered business shows parents we are a professional brand that cares about quality standards and safety.</p>

<div style="background-color: #fdfbf7; padding: 20px; border-left: 4px solid #c08b5c; margin-top: 30px;">
  <p style="margin-bottom: 0;"><strong>Make the switch today.</strong> Grab a 3-flavor combo for your family at <a href="https://veyano.in" target="_blank" rel="noopener noreferrer">veyano.in</a> and see the difference in their energy levels.</p>
</div>`;

const blogData = {
  title: "The Lunchbox Revolution: Why Clean Snacking is the Key to Childhood Nutrition",
  slug: "lunchbox-revolution-clean-snacking-key-childhood-nutrition",
  content: blogContent,
  image_url: "./assets/veyano_lunchbox_revolution.png",
  author: "Veyano Team",
  created_at: "2026-05-16T10:00:00Z"
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
