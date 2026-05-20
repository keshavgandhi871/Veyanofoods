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

const blogContent = `<p>You’ve been tracking your calories, hitting your step goals, and consistently making an effort to stay active. Yet, you step on the weighing scale in the morning, and the number has mysteriously jumped up by a kilo. Or you look in the mirror by evening, and you feel soft, puffy, and uncomfortably bloated.</p>

<p>Immediately, a wave of frustration and self-doubt hits you. You start questioning your progress, feeling insecure about your body, and wondering why your hard work isn't showing up on the scale.</p>

<p>At <strong>VEYANO Foods</strong>, we want to reveal a medical and psychological truth that mass-market brands hide from you: <strong>You didn't gain fat overnight.</strong> You are suffering from a "Sodium Hangover" caused by fake health foods.</p>

<h2>The Illusion of "Low-Calorie" Puffery</h2>
<p>When people try to adopt a <strong>Clean Snacking</strong> routine in their search for premium <strong>Healthy Snacks India</strong>, they naturally look for light, puffed snacks. The commercial food industry knows this, filling the shelves with "diet mixtures," "baked chips," and unverified loose snacks boasting low-calorie labels.</p>

<p>But to make these ultra-processed items taste good without deep-frying them, manufacturers rely on a dangerous shortcut: Excessive, low-grade sodium and chemical flavor enhancers (like MSG).</p>

<p>When you consume these high-sodium snacks during your mid-day breaks, a chain reaction occurs in your body:</p>

<ul>
  <li><strong>The Water Trap:</strong> Excess sodium disrupts your cellular fluid balance. To prevent dehydration, your kidneys are biologically forced to hold onto water. This fluid retention can easily add 1 to 2 kilograms of "fake weight" to the scale.</li>
  <li><strong>The Gut Inflame:</strong> Cheap, highly refined oils used to stick seasoning onto mass-market puffs irritate your stomach lining, causing slow digestion and physical bloating.</li>
</ul>

<p>You aren't failing your fitness goals. You are simply consuming hidden ingredients that mask your real progress.</p>

<!-- Beautiful responsive visual comparison matrix -->
<div style="background-color: #fdfcf7; border: 1px solid #e6dfd3; border-radius: 12px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 20px rgba(192, 139, 92, 0.05);">
  <h3 style="color: #4a3e3d; text-align: center; font-size: 1.4rem; margin-top: 0; margin-bottom: 25px; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px;">
    📊 VISUAL MATRIX: Real Progress vs. Water Bloat
  </h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
    
    <!-- Left Side: Commercial Baked Puffs -->
    <div style="background-color: #fff9f9; border: 1px solid #fcdcdc; border-radius: 10px; padding: 20px; text-align: center;">
      <h4 style="color: #d9534f; margin-top: 0; font-size: 1.15rem; font-family: 'Outfit', sans-serif;">
        ⚠️ Commercial Baked Puffs
      </h4>
      <div style="margin: 15px 0; font-size: 0.95rem; line-height: 1.8; color: #665;">
        <div style="font-weight: bold; color: #444;">High Sodium</div>
        <div style="color: #d9534f; font-size: 1.2rem;">↓</div>
        <div style="font-weight: bold; color: #444;">Cellular Water Retention</div>
        <div style="color: #d9534f; font-size: 1.2rem;">↓</div>
        <div style="font-weight: bold; color: #d9534f; font-size: 1.1rem; background-color: #ffebeb; padding: 5px; border-radius: 6px;">Scale Panic 😰</div>
      </div>
      <p style="font-size: 0.85rem; color: #777; margin-bottom: 0; line-height: 1.4;">
        Excess low-grade salt forces kidneys to hold water, adding 1-2 kg of fake weight overnight.
      </p>
    </div>

    <!-- Right Side: VEYANO Roasted Makhana -->
    <div style="background-color: #f7faf7; border: 1px solid #dcf0dc; border-radius: 10px; padding: 20px; text-align: center;">
      <h4 style="color: #2e7d32; margin-top: 0; font-size: 1.15rem; font-family: 'Outfit', sans-serif;">
        🛡️ VEYANO Roasted Makhana
      </h4>
      <div style="margin: 15px 0; font-size: 0.95rem; line-height: 1.8; color: #665;">
        <div style="font-weight: bold; color: #444;">High Potassium & Low Sodium</div>
        <div style="color: #2e7d32; font-size: 1.2rem;">↓</div>
        <div style="font-weight: bold; color: #444;">Fluid Balance</div>
        <div style="color: #2e7d32; font-size: 1.2rem;">↓</div>
        <div style="font-weight: bold; color: #2e7d32; font-size: 1.1rem; background-color: #e8f5e9; padding: 5px; border-radius: 6px;">Real Definition ✨</div>
      </div>
      <p style="font-size: 0.85rem; color: #777; margin-bottom: 0; line-height: 1.4;">
        Potassium triggers fluid release, flushing out bloating and revealing actual fitness progress.
      </p>
    </div>

  </div>
</div>

<h2>The VEYANO Shield: Flush the Bloat with Potassium-Rich Superfoods</h2>
<p>True health food doesn't play tricks on your body. Shifting to an authentic, Real Food alternative like VEYANO <strong>Roasted Makhana</strong> changes your physical definition entirely.</p>

<ul>
  <li><strong>Natural Diuretic Properties:</strong> Fox nuts are structurally unique because they are naturally exceptionally high in potassium and remarkably low in sodium. Potassium acts as the biological antagonist to sodium—it actively signals your kidneys to release trapped water weight, flushing out bloating and clearing your physical definition.</li>
  <li><strong>The No-Oil Mist Advantage:</strong> Operating from our professional facility in Karnal, we reject the industry practice of using heavy oils to glue spices to our snacks. Our advanced misting technology applies natural seasonings cleanly, eliminating the inflammatory gut triggers that cause evening stomach distension.</li>
  <li><strong>Psychological Certainty:</strong> When you eat our <a href="https://veyano.in/product.html?variant=combo" target="_blank" rel="noopener noreferrer">Peri-Peri or Lightly Salted variants</a>, you are consuming clean ingredients tracked under strict national quality benchmarks. You can step on the scale the next morning with absolute peace of mind.</li>
</ul>

<hr />

<h2>The Fluid Balance & Healthy Snacking FAQ</h2>

<h3>Q1: Why does the scale jump up even when I eat 'low-fat' commercial snacks?</h3>
<p>A: Because fat isn't the only thing that alters the scale. When searching for <strong>Healthy Snacks India</strong>, many products advertise as 'low-fat' but are loaded with hidden sodium and chemical preservatives. These cause your body to retain water to dilute the salt in your bloodstream. VEYANO <strong>Roasted Makhana</strong> contains zero chemical stabilizers and controlled, premium salt levels to protect your fluid balance.</p>

<h3>Q2: How quickly can VEYANO help flush out existing water retention?</h3>
<p>A: Thanks to the high potassium-to-sodium ratio naturally present in premium fox nuts, incorporating VEYANO into your daily routine while drinking adequate water can help your body naturally expel retained fluids within 24 to 48 hours.</p>

<h3>Q3: Can I trust the nutritional labeling on VEYANO packages for strict diet tracking?</h3>
<p>A: Absolutely. As a fully verified, GST-compliant, and FSSAI-licensed brand, our packaging reflects absolute transparency. There are no hidden chemical numbers, vague "proprietary spice blends," or unlisted fats. What you read is precisely what you digest.</p>

<h3>Q4: Will the Peri-Peri flavor cause stomach irritation or bloating?</h3>
<p>A: No. Mass-market spicy snacks use synthetic chili oleoresins and artificial colors that inflame the gut. VEYANO uses 100% natural ground spices that support metabolic heat generation without irritating your digestive tract.</p>

<hr />

<div style="background-color: #fdfbf7; padding: 25px; border-left: 4px solid #c08b5c; margin-top: 30px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
  <p style="margin-bottom: 12px; font-size: 1.1rem; color: #4a3e3d; font-weight: bold; font-family: 'Outfit', sans-serif;">
    📢 Brand Notice today:
  </p>
  <blockquote style="margin: 0 0 15px 0; padding: 10px 15px; border-left: 3px solid #e6dfd3; background: #faf8f5; font-style: italic; color: #555;">
    "Your scale isn't broken, your snacks are. Stop letting hidden sodium steal your peace of mind."
  </blockquote>
  <p style="margin-bottom: 0; font-size: 0.95rem;">
    Stop the scale panic today. Experience true water weight flushing and real metabolic definition. Switch to <strong>Clean Snacking</strong> with our premium collections at <a href="https://veyano.in/product.html?variant=combo" target="_blank" rel="noopener noreferrer">veyano.in</a>.
  </p>
</div>`;

const blogData = {
  title: "The Scale Panic: How Hidden Sodium in 'Diet' Snacks is Causing False Weight Gain",
  slug: "scale-panic-hidden-sodium-diet-snacks-false-weight-gain",
  content: blogContent,
  image_url: "./assets/veyano_scale_panic.png",
  author: "Veyano Team",
  created_at: "2026-05-20T18:00:00Z"
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
