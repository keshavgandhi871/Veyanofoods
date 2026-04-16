/**
 * VEYANO Foods — Blog Post Insertion Script (Post #3)
 * Title: Why Premium Roasted Makhana is the Smartest Investment for Your Health in 2026
 */
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
<p>In a world full of "Cheap" snacks, we often pay a heavy price with our health. You see them everywhere—oily chips, fried namkeens, and snacks filled with palm oil and hidden preservatives. At <strong>VEYANO</strong>, we decided to do things differently. We don't just sell snacks; we sell a <strong>"Clean Snacking"</strong> promise.</p>

<hr />

<h2>1. The True Cost of "Cheap" Snacks</h2>
<p>Most deep-fried snacks use low-quality oils that are heated and reheated. This creates trans-fats that lead to sluggishness and heart issues. <strong>VEYANO Roasted Makhana</strong> is slowly roasted in small batches. We use heat, not oil, to give you that perfect crunch. It's not just a snack; it's a commitment to your long-term vitality.</p>

<h2>2. Why 200g is the Perfect Size?</h2>
<p>We noticed most brands sell tiny 30g or 50g packs. They are mostly air! Our <strong>200g Jumbo Packs</strong> are designed for the serious snacker. Whether it's for your office drawer or your family's evening tea, one pack of VEYANO lasts longer and provides consistent nutrition. It's the smarter, high-volume choice for those who value both health and value.</p>

<h2>3. The Protein & Fiber Powerhouse</h2>
<p>Did you know Makhana is one of the few plant-based snacks that is naturally gluten-free and high in protein? It’s the perfect "Fuel" for gym-goers in Karnal and busy professionals across India. It keeps your metabolism fast and your stomach full, preventing those mid-day hunger crashes that lead to bad food choices.</p>

<h2>4. A Flavor for Every Mood</h2>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
  <div style="background: #fff5f5; padding: 1.5rem; border-radius: 10px; border-left: 5px solid #ff4d4d;">
    <h3 style="color: #ff4d4d; margin-top: 0;">Fiery Peri-Peri</h3>
    <p>For when you need a spicy kick to wake up your afternoon. Bold, zesty, and unforgettable.</p>
  </div>
  <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 10px; border-left: 5px solid #0077b6;">
    <h3 style="color: #0077b6; margin-top: 0;">Lightly Salted</h3>
    <p>The classic, balanced crunch for movie nights. Pure simplicity at its best.</p>
  </div>
  <div style="background: #fdf6e7; padding: 1.5rem; border-radius: 10px; border-left: 5px solid #FF9900;">
    <h3 style="color: #FF9900; margin-top: 0;">Classic Plain</h3>
    <p>Pure, sattvic, and perfect for your Navratri or Monday fasts. The soul of Makhana.</p>
  </div>
</div>

<hr />

<h2 id="faq">❓ Frequently Asked Questions (The SEO Booster)</h2>

<div style="margin-bottom: 1.5rem;">
  <p><strong>Q: Is VEYANO Makhana purely roasted?</strong></p>
  <p>A: Yes! We use an artisanal roasting process that ensures zero frying. This keeps the nutrients intact and the calories low, unlike mass-market fried alternatives.</p>
</div>

<div style="margin-bottom: 1.5rem;">
  <p><strong>Q: Why does VEYANO cost ₹399?</strong></p>
  <p>A: We use only Grade-A Fox Nuts and premium seasonings. Unlike mass-market brands, we don't use cheap fillers or palm oil. You are paying for purity and a massive 200g high-volume pack that lasts.</p>
</div>

<div style="margin-bottom: 2rem;">
  <p><strong>Q: Can I get a discount if I buy more?</strong></p>
  <p>A: Absolutely. Our <strong>Ultimate Makhana Trio Combo</strong> gives you all three flavors for just ₹999, saving you a significant amount and unlocking <strong>FREE SHIPPING</strong>.</p>
</div>

<hr />

<h2>Conclusion: Join the Clean Snacking Revolution</h2>
<p>Don't settle for junk. Your body deserves the best. Join the thousands of people switching to VEYANO for a guilt-free, high-energy lifestyle. It's time to invest in a healthier you.</p>

<div style="background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%); padding: 2.5rem; border-radius: 15px; text-align: center; color: white; margin-top: 3rem; box-shadow: 0 10px 20px rgba(255, 153, 0, 0.2);">
  <h3 style="margin-top: 0; font-size: 1.8rem;">Ready for the Ultimate Upgrade?</h3>
  <p style="font-size: 1.2rem; margin-bottom: 2rem;">Get the Trio Combo today and save BIG.</p>
  <a href="/product.html" style="background: white; color: #FF6600; padding: 1rem 2.5rem; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: inline-block; transition: transform 0.3s ease;">SHOP THE TRIO COMBO FOR ₹999 - FREE SHIPPING</a>
</div>
`;

const blogData = {
  title: "Why Premium Roasted Makhana is the Smartest Investment for Your Health in 2026",
  slug: "premium-roasted-makhana-investment-health-2026",
  content: blogContent,
  image_url: "./assets/makhana-health-2026.png",
  author: "Veyano Team"
};

async function postBlog() {
  console.log('🚀 Attempting to post new health-focused blog to Supabase...');
  
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
