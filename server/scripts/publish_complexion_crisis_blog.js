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

const blogContent = `<p>You invest in premium skincare routines, drink your daily water, and try to get enough rest. Yet, you still find yourself dealing with unexpected breakouts, persistent skin inflammation, or a dull, fatigued complexion that makes you feel insecure when stepping into important meetings or social events.</p>

<p>When we look in the mirror and see our skin suffering, we immediately blame stress, hormones, or pollution. But there is a hidden contributor to premature aging that the mainstream snack industry desperately hopes you never look into: The oxidized, low-grade oils hidden inside your "diet" food.</p>

<p>At VEYANO Foods, we believe true aesthetics are a direct reflection of cellular respect. Your skin isn't failing you; it is simply reacting to the inflammatory inputs of fake health snacks.</p>

<h2>The Inflammation Trap of Mass-Market Snacks</h2>
<p>When choosing <strong>Healthy Snacks in India</strong>, consumers frequently look at the front of the packaging for buzzwords like "Baked," "Diet," or "Less Fat." What they fail to realize is how those spices and seasonings are actually bonded to the snack.</p>

<p>To mass-produce baked puffs or diet mixtures cheaply, commercial manufacturers spray the snacks with highly refined, industrial palm oil or hydrogenated fats. When these low-grade oils are subjected to high processing temperatures, they undergo a chemical process called lipid oxidation.</p>

<p>This oxidation creates a massive influx of free radicals in your body. For your skin, free radicals are an absolute disaster:</p>

<ul>
  <li><strong>Collagen Destruction:</strong> Free radicals attack your body's natural collagen and elastin reserves, leading to premature fine lines, loss of skin elasticity, and a tired appearance.</li>
  <li><strong>Sebum Oxidation:</strong> These inflammatory fats alter the composition of your skin's natural oils, clogging pores from the inside out and triggering painful, stubborn adult acne.</li>
</ul>

<div class="blog-infographic" style="margin: 2.5rem 0; padding: 2.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; font-family: 'Outfit', sans-serif; box-shadow: var(--shadow-sm);">
  <h3 style="text-align: center; margin-top: 0; color: #fdfbf7; font-size: 1.4rem; font-weight: 600; letter-spacing: -0.02em;">The Skin-Snack Connection</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; margin-top: 2rem;">
    <div style="padding: 1.8rem; background: rgba(239, 68, 68, 0.03); border-left: 4px solid #ef4444; border-radius: 8px; border-top: 1px solid rgba(239, 68, 68, 0.05); border-right: 1px solid rgba(239, 68, 68, 0.05); border-bottom: 1px solid rgba(239, 68, 68, 0.05);">
      <h4 style="margin-top: 0; color: #ef4444; font-size: 1.1rem; font-weight: 600; margin-bottom: 0.8rem;">Commercial Baked Puffs</h4>
      <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.95rem; line-height: 1.6; color: #a1a1aa; display: flex; flex-direction: column; gap: 0.4rem;">
        <li>Oxidized Palm Oil</li>
        <li>Free Radical Damage</li>
        <li>Skin Inflammation & Aging</li>
      </ul>
    </div>
    <div style="padding: 1.8rem; background: rgba(34, 197, 94, 0.03); border-left: 4px solid #22c55e; border-radius: 8px; border-top: 1px solid rgba(34, 197, 94, 0.05); border-right: 1px solid rgba(34, 197, 94, 0.05); border-bottom: 1px solid rgba(34, 197, 94, 0.05);">
      <h4 style="margin-top: 0; color: #22c55e; font-size: 1.1rem; font-weight: 600; margin-bottom: 0.8rem;">VEYANO Clean Snacking</h4>
      <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.95rem; line-height: 1.6; color: #a1a1aa; display: flex; flex-direction: column; gap: 0.4rem;">
        <li>Zero-Oil Mist</li>
        <li>Kaempferol Antioxidants</li>
        <li>Cellular Glow & Repair</li>
      </ul>
    </div>
  </div>
</div>

<h2>Reclaim Your Glow with VEYANO Clean Snacking</h2>
<p>True Clean Snacking should elevate your health, your performance, and your confidence. Transitioning to an authentic, Real Food alternative like VEYANO <a href="/product.html">Roasted Makhana</a> turns your mid-day snack break into a beauty and wellness ritual.</p>

<p><strong>The Power of Kaempferol:</strong> Fox nuts are a rare dietary source of kaempferol, a potent, naturally occurring flavonoid antioxidant. Kaempferol is highly celebrated in nutritional science for its ability to neutralize free radicals, actively dampening internal inflammation and protecting your skin's youthful texture.</p>

<p><strong>The No-Oil Mist Advantage:</strong> Operating out of our dedicated facility in Karnal, we completely reject the industrial practice of drenching snacks in low-grade oils. Our advanced misting technology uses zero heavy fats to apply our seasonings, completely eliminating the systemic inflammation triggers that cause skin breakouts.</p>

<p><strong>Natural Amino Acid Integrity:</strong> Makhana contains essential amino acids like glutamine, cystine, and arginine, which are the foundational building blocks for cellular repair and tissue regeneration. It’s not just a snack; it’s internal skincare.</p>

<p>You are building a lifestyle focused on excellence, discipline, and pride in how you present yourself to the world. Your snack choice should be an extension of that standard—protecting your health, your focus, and your appearance.</p>

<hr />

<h2>The Skin Health & Clean Snacking FAQ (SEO Edition)</h2>
<h3>Q1: Can eating 'baked' commercial snacks still cause acne and breakouts?</h3>
<p>A: Yes. Even if a snack is technically "baked," manufacturers almost always spray a layer of cheap, highly refined oil (like palm oil) over the product after baking so that the spices stick. These oxidized oils are major triggers for systemic inflammation and adult acne.</p>

<h3>Q2: How does VEYANO Roasted Makhana actively benefit skin health?</h3>
<p>A: VEYANO is a Real Food that is naturally rich in anti-aging antioxidants like kaempferol and essential amino acids. These nutrients combat free radical damage, protect your body's natural collagen, and support the cell-renewal processes that keep your skin clear and vibrant.</p>

<h3>Q3: Are the spices in the Peri-Peri variant safe for someone prone to skin redness or inflammation?</h3>
<p>A: Unlike mass-market brands that use synthetic chili oleoresins and artificial colors that can trigger inflammatory skin flushes, VEYANO uses 100% natural, ground spices. It delivers an authentic, clean kick that supports your metabolism without irritating your body's internal systems.</p>

<h3>Q4: How does VEYANO guarantee absolute purity in its manufacturing process?</h3>
<p>A: Purity and transparency are our core pillars. As a fully registered, B2B-compliant enterprise, we label every single ingredient clearly on our premium standing pouches. We completely ban trans-fats, MSG, and synthetic flavor enhancers, ensuring your high-performance snacking is truly healthy.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO Foods is a fully registered, GST-compliant entity dedicated to redefining Clean Snacking. Operating out of our state-of-the-art facility in Karnal, we adhere to the highest production benchmarks and national safety standards, delivering unmatched quality that corporate B2B clients and everyday athletes can trust.</p>`;

const blogData = {
  title: "The Complexion Crisis: How Cheap Oils in 'Healthy' Snacks are Aging Your Skin",
  slug: "complexion-crisis-cheap-oils-healthy-snacks-aging-skin",
  content: blogContent,
  image_url: "./assets/veyano_complexion_crisis.png",
  author: "Veyano Team",
  created_at: "2026-05-21T11:00:00Z"
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
