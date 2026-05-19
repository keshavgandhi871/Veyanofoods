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

const blogContent = `<p>In the world of <strong>Healthy Snacks India</strong>, the term "roasted" is often used loosely. Many commercial brands flash-fry their snacks and call them "roasted" simply because they aren't fully submerged in oil. At VEYANO Foods, we believe that Clean Snacking requires a deeper level of integrity.</p>

<p>Operating from our facility in Karnal, Haryana, we have perfected a slow-roasting technique that honors the raw nutrient profile of the fox nut while delivering a world-class crunch. Here is how we define the Real Food standard.</p>

<h2>1. Sourcing the Current Season's Harvest</h2>
<p>The journey of Roasted Makhana starts in the freshwater ponds where the Euryale ferox (fox nut) grows. Most mass-market brands buy in bulk and store seeds for years, leading to a stale, "dusty" taste. VEYANO sources only from the most recent harvest, ensuring that the natural antioxidants and proteins are at their peak when they reach you.</p>

<h2>2. The Slow-Roast Philosophy</h2>
<p>Mass-market snacks are often processed at extreme temperatures to save time. This high heat oxidizes the small amount of natural oils in the seed, creating harmful free radicals.</p>

<p><strong>The VEYANO Way:</strong> We use a graduated heat profile. By slowly increasing the temperature, we evaporate the internal moisture without scorching the delicate outer layer. This preserves the bioavailable magnesium and potassium that make makhana a superfood.</p>

<h2>3. The "No-Oil" Spice Infusion</h2>
<p>How do you make spices stick without a layer of oil? This is the VEYANO secret.</p>
<p>Instead of tossing our makhana in vats of palm oil or hydrogenated fats, we use a specialized misting technology. This allows our signature Peri-Peri and Salted blends to bond with the makhana at a molecular level, giving you 100% of the flavor with 0% of the grease.</p>

<h2>4. The Matte Black Standard</h2>
<p>Our premium standing pouches aren't just for aesthetics. They are engineered to block UV light and moisture—the two biggest enemies of Real Food. Because we don't use chemical preservatives, our packaging does the heavy lifting of keeping your snack fresh for months.</p>

<hr />

<h2>VEYANO Production & Transparency FAQ</h2>
<h3>Q1: Is VEYANO Roasted Makhana completely oil-free?</h3>
<p>A: We use an absolute minimum of high-quality olive oil or rice bran oil solely as a carrier for our natural spices during the misting process. This is vastly different from the "oil-soaking" methods used by traditional namkeen brands.</p>

<h3>Q2: Why is the roasting process in Karnal significant?</h3>
<p>A: Karnal, Haryana is a hub for agricultural excellence. By roasting locally, we maintain a tight supply chain that ensures our makhana goes from the roaster to the pouch in record time, locking in the freshness that defines Clean Snacking.</p>

<h3>Q3: Are there any artificial colors in the Peri-Peri flavor?</h3>
<p>A: Never. The vibrant color of our Peri-Peri makhana comes entirely from natural chilies and spices. We believe that if you can't find it in a kitchen, it doesn't belong in a VEYANO pouch.</p>

<h3>Q4: How can I tell if my makhana is truly "Real Food"?</h3>
<p>A: Check the "Feel." Real roasted makhana should feel dry to the touch and leave no oily residue on your fingers. It should have a clean, nutty aftertaste rather than a lingering chemical or metallic flavor.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO is an entrepreneur-led brand based in Karnal committed to providing high-quality <strong>Healthy Snacks in India</strong>. As a registered FSSAI and GST-compliant entity, VEYANO follows national quality and tax standards—building massive trust with our corporate B2B clients and consumers alike.</p>

<div style="background-color: #fdfbf7; padding: 20px; border-left: 4px solid #c08b5c; margin-top: 30px;">
  <p style="margin-bottom: 0;"><strong>Engagement Tip:</strong> Post a video of the "Crunch Test" on your social media today. Record the sound of biting into a VEYANO makhana to show the results of our slow-roasting process!</p>
</div>`;

const blogData = {
  title: "From Farm to Pouch: The Integrity of the VEYANO Roasting Process",
  slug: "farm-to-pouch-integrity-veyano-roasting-process",
  content: blogContent,
  image_url: "./assets/veyano_peri_peri_makhana_closeup.png",
  author: "Veyano Team",
  created_at: "2026-05-15T10:00:00Z"
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
