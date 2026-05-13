/**
 * VEYANO Foods — Blog Post Insertion Script
 * This script inserts "The Weight Loss Secret: Why Roasted Makhana is India’s Favorite Metabolism Booster"
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
<p>If you’ve ever embarked on a fitness journey in India, you know the "4 PM Trap." It’s that hour between lunch and dinner when hunger strikes, and the easiest options are usually fried namkeens or sugary biscuits. This is where most health goals go to die.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/makhana_weight_loss_hero.png" alt="Roasted Makhana Weight Loss Metabolism Booster VEYANO Foods" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<p>At <a href="index.html">VEYANO Foods</a>, we’ve engineered a solution. By focusing on <strong>Clean Snacking</strong>, we’ve turned the humble fox nut into a strategic tool for weight management. Here is why Roasted Makhana is the undisputed heavyweight champion of Healthy Snacks in India.</p>

<h2>1. The Calorie-to-Volume Ratio</h2>
<p>Weight loss is often about volume. You want to feel like you’ve eaten a lot without actually consuming massive calories.</p>

<p><strong>The Comparison:</strong> 100g of fried potato chips contains roughly 530 calories and 35g of fat.</p>

<p><strong>The VEYANO Edge:</strong> 100g of our <a href="products.html">Roasted Makhana</a> contains only about 350 calories and is virtually fat-free. Because makhana is light and airy, a 50g serving looks like a massive bowl, keeping you psychologically and physically satisfied.</p>

<h2>2. High Protein, Higher Satiety</h2>
<p>One of the biggest hurdles in any "Real Food" diet is staying full. Makhana is a plant-based protein powerhouse. Protein takes longer to digest than simple carbohydrates, meaning a handful of VEYANO prevents the "insulin spike" that leads to more cravings an hour later.</p>

<h2>3. Detoxification and Digestion</h2>
<p>Unlike mass-market snacks loaded with preservatives that slow down your gut, Clean Snacking supports your body’s natural rhythm. Roasted Makhana is rich in fiber, which aids digestion and helps flush out toxins—a key component of any successful weight loss plan.</p>

<p style="text-align: center; margin: 2rem 0;">
  <img src="./assets/makhana_vs_chips_infographic.png" alt="Fried Snacks vs VEYANO Roasted Makhana Calories and Protein Infographic" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

<h2>Why VEYANO?</h2>
<p>We don't just roast; we curate. Operating out of Karnal, we ensure that our makhana is sourced from the current season’s harvest, ensuring maximum crunch and nutrient density. We don't use the "hidden oils" that many commercial brands use to make spices stick. Our process is as clean as your goals.</p>

<hr />

<h2>Weight Loss & Healthy Snacking FAQ</h2>

<h3>Q1: Can I eat Roasted Makhana at night for weight loss?</h3>
<p>A: Yes! Because it is low in sodium (especially our Plain or Lightly Salted versions) and easy to digest, it is an ideal late-night snack that won't cause morning bloating.</p>

<h3>Q2: How much VEYANO Makhana should I eat in a day?</h3>
<p>A: For weight management, a 30g to 50g serving (about 1.5 to 2 cups) is the perfect snack size to keep your metabolism active between meals.</p>

<h3>Q3: Is Roasted Makhana better than 'Diet' chips sold in stores?</h3>
<p>A: Many 'Diet' chips are highly processed and contain maltodextrin. VEYANO is a Real Food—it’s a whole seed that is simply roasted. The less processing, the better it is for your metabolism.</p>

<h3>Q4: Does the Peri-Peri flavor help in burning fat?</h3>
<p>A: While the spice itself isn't a magic pill, capsaicin (found in chili spices) is known to slightly boost thermogenesis (heat production) in the body, which can support a healthy metabolic rate.</p>

<hr />

<p><em>Start your weight loss journey with clean fuel at <a href="https://veyano.in">veyano.in</a>.</em></p>
`;

const blogData = {
  title: "The Weight Loss Secret: Why Roasted Makhana is India’s Favorite Metabolism Booster",
  slug: "makhana-weight-loss-metabolism-booster",
  content: blogContent,
  image_url: "./assets/makhana_weight_loss_hero.png",
  author: "Veyano Team"
};

async function postBlog() {
  console.log('🚀 Attempting to post "The Weight Loss Secret" blog to Supabase...');
  
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
