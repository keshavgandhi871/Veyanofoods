const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const Blog = require('../models/Blog');
const sequelize = require('../config/db');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const blogContent = `<p class="blog-lead" style="font-size: 1.25rem; color: #555; line-height: 1.6; margin-bottom: 2rem;">When you decide to commit to a clean lifestyle, you quickly realize that premium wellness requires a financial investment. You look at your monthly budget and allocate funds for organic groceries, quality fitness memberships, and genuine Clean Snacking alternatives.</p>

<p>But as you browse the markets, a quiet skepticism sets in. You see raw, unbranded fox nuts sold in loose, open-air bins at local wholesale markets for a fraction of the price of packaged alternatives. A voice in your head whispers an insecurity that every smart consumer shares: <em>“Am I being fooled? Am I just paying a premium price for a fancy box and clever marketing, when the loose stuff down the street is exactly the same?”</em></p>

<p>At <strong>VEYANO Foods</strong>, we want to address this skepticism with absolute operational transparency. The truth is, when it comes to whole-seed superfoods, the price difference isn't in the packaging—it is in the physics of processing. Choosing cheap, unverified raw materials doesn't save you money; it charges a heavy tax on your digestive health and systemic inflammation.</p>

<hr style="border: 0; border-top: 1px solid #eee; margin: 3rem 0;" />

<h2 style="font-family: 'Montserrat', sans-serif; font-weight: 700; color: #111; font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem;">The Invisible Hazards of Open-Market Sourcing</h2>
<p>Makhana (fox nut) is an aquatic crop harvested from the wetlands of India. In its raw, unrefined state, it is highly sensitive to environmental conditions. When you purchase loose, unbranded snacks to save on costs, you are exposing your body to two hidden processing failures:</p>

<h3 style="font-family: 'Montserrat', sans-serif; font-weight: 600; color: #222; font-size: 1.4rem; margin-top: 1.5rem; margin-bottom: 0.5rem;">1. The Moisture and Degradation Equation</h3>
<p>Raw fox seeds naturally contain a high percentage of internal moisture. To make them shelf-stable, they must undergo a highly controlled, multi-stage drying and roasting process.</p>

<p>When loose makhana is processed using primitive, unregulated methods, significant residual moisture remains trapped inside the seed's core. This trapped moisture triggers lipid degradation—a process where the healthy natural fats inside the seed break down and turn rancid. You might not notice it immediately under heavy local spices, but your gut detects it instantly, resulting in low-grade bloating, gas, and an uncomfortably heavy stomach.</p>

<h3 style="font-family: 'Montserrat', sans-serif; font-weight: 600; color: #222; font-size: 1.4rem; margin-top: 1.5rem; margin-bottom: 0.5rem;">2. The Atmospheric Contamination Risk</h3>
<p>Makhana sold in open wholesale bins or packed in non-regulated environments is continuously exposed to ambient humidity, dust, and pest contact. Because the outer shell of a fox nut is highly porous, it acts like a sponge, absorbing airborne contaminants and chemical impurities from the environment. What looks like a cost-effective "natural" snack is often a vehicle for environmental toxins that place a heavy detox tax on your liver and immune system.</p>

<!-- The Purity Ledger Table -->
<h3 style="font-family: 'Montserrat', sans-serif; font-weight: 600; color: #111; font-size: 1.3rem; margin-top: 2rem; margin-bottom: 1rem; text-align: center;">Visual Asset Matrix: The Purity Ledger</h3>
<div class="table-container" style="overflow-x: auto; margin: 1.5rem 0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eee;">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background: #fff; font-family: 'Outfit', sans-serif;">
    <thead>
      <tr style="background: #111; color: #fff;">
        <th style="padding: 1.2rem; font-weight: 600; font-size: 1rem; border-bottom: 3px solid #FF9900; width: 50%;">Open-Market Loose Snacks</th>
        <th style="padding: 1.2rem; font-weight: 600; font-size: 1rem; border-bottom: 3px solid #FF9900; width: 50%;">VEYANO Controlled Standard</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #eee; transition: background 0.3s;">
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #555; line-height: 1.5;"><span style="color: #e74c3c; font-weight: bold; margin-right: 8px;">❌</span> Trapped Core Moisture (Rancidity)</td>
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #2ecc71; font-weight: 600; line-height: 1.5;"><span style="color: #2ecc71; font-weight: bold; margin-right: 8px;">✓</span> Processed at Facility in Karnal</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee; background: #fdfbf7; transition: background 0.3s;">
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #555; line-height: 1.5;"><span style="color: #e74c3c; font-weight: bold; margin-right: 8px;">❌</span> High Atmospheric Dust Absorption</td>
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #2ecc71; font-weight: 600; line-height: 1.5;"><span style="color: #2ecc71; font-weight: bold; margin-right: 8px;">✓</span> 100% Light-Blocking Zero-Moisture Pouches</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee; transition: background 0.3s;">
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #555; line-height: 1.5;"><span style="color: #e74c3c; font-weight: bold; margin-right: 8px;">❌</span> Coated in Extruded Industrial Oil</td>
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #2ecc71; font-weight: 600; line-height: 1.5;"><span style="color: #2ecc71; font-weight: bold; margin-right: 8px;">✓</span> Oil-Free Seasoning Mist Technology</td>
      </tr>
      <tr style="border-bottom: none; background: #fdfbf7; transition: background 0.3s;">
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #555; line-height: 1.5;"><span style="color: #e74c3c; font-weight: bold; margin-right: 8px;">❌</span> Zero Regulatory Accountability</td>
        <td style="padding: 1.2rem; font-size: 0.95rem; color: #2ecc71; font-weight: 600; line-height: 1.5;"><span style="color: #2ecc71; font-weight: bold; margin-right: 8px;">✓</span> Verified FSSAI & GST Compliance</td>
      </tr>
    </tbody>
  </table>
</div>

<hr style="border: 0; border-top: 1px solid #eee; margin: 3rem 0;" />

<h2 style="font-family: 'Montserrat', sans-serif; font-weight: 700; color: #111; font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem;">The VEYANO Standard: Engineering Purity in Karnal</h2>
<p>True luxury in food isn't defined by a gold foil label; it is defined by the discipline of clean engineering. When you choose a Real Food alternative like <strong>VEYANO Roasted Makhana</strong>, your investment goes directly into protecting your biology:</p>

<ul style="font-family: 'Outfit', sans-serif; font-size: 1.05rem; line-height: 1.7; color: #444; padding-left: 1.5rem;">
  <li style="margin-bottom: 1rem;"><strong>Graduated, Low-Temperature Roasting:</strong> Operating out of our dedicated, hygienic production facility in Karnal, Haryana, we utilize a precise, low-temperature roasting profile. This systematic thermal process drives out 100% of the internal core moisture without scorching the seed, locking in vital anti-aging flavonoids like kaempferol and guaranteeing a permanent, crisp crunch.</li>
  <li style="margin-bottom: 1rem;"><strong>The Absolute Zero-Oil Standard:</strong> To make spices adhere to loose snacks, local vendors routinely drench them in low-grade, highly oxidized vegetable oils. VEYANO completely rejects this practice. Our advanced, oil-free seasoning mist technology allows our natural Peri-Peri and Salted profiles to bond seamlessly with the makhana without using a single drop of inflammatory fat.</li>
  <li style="margin-bottom: 1rem;"><strong>Institutional Legitimacy:</strong> We protect your peace of mind through strict corporate accountability. VEYANO Foods is an active FSSAI-licensed (No: 20826010000397) and GST-registered entity. Every batch is tracked, tested, and packaged in airtight, light-blocking standing pouches that preserve nutritional integrity from our facility floor straight to your office desk or home pantry.</li>
</ul>

<p>Stop treating your health like a bargain hunt. When you buy VEYANO, you aren't paying for marketing—you are paying for uncompromised safety, macro-purity, and a brand that respects your body too much to ever cut corners.</p>

<hr style="border: 0; border-top: 1px solid #eee; margin: 3rem 0;" />

<h2 style="font-family: 'Montserrat', sans-serif; font-weight: 700; color: #111; font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem;">The Sourcing Purity & Healthy Snacks India FAQ</h2>

<div class="faq-container" style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; font-family: 'Outfit', sans-serif;">
  <div style="background: #fdfbf7; padding: 1.5rem; border-radius: 12px; border: 1px solid #f0ece4;">
    <h4 style="margin-top: 0; color: #111; font-size: 1.1rem; font-weight: 600; font-family: 'Montserrat', sans-serif; margin-bottom: 0.5rem;">Q1: Why does loose makhana from the local market sometimes feel tough or chewy compared to VEYANO?</h4>
    <p style="color: #555; font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;"><strong>A:</strong> Chewiness is the primary indicator of trapped internal moisture or poor storage conditions. When makhana absorbs moisture from the air, it loses its nutritional potency and becomes difficult for your digestive enzymes to break down smoothly. VEYANO Roasted Makhana undergoes a specialized moisture-elimination process, ensuring every single seed maintains an optimal, dry-roasted crispness.</p>
  </div>

  <div style="background: #fdfbf7; padding: 1.5rem; border-radius: 12px; border: 1px solid #f0ece4;">
    <h4 style="margin-top: 0; color: #111; font-size: 1.1rem; font-weight: 600; font-family: 'Montserrat', sans-serif; margin-bottom: 0.5rem;">Q2: Does VEYANO use any artificial preservatives to keep its snacks fresh without oil?</h4>
    <p style="color: #555; font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;"><strong>A:</strong> Absolutely not. We reject all synthetic chemical codes, artificial stabilizers, and MSG. Our freshness is preserved entirely through physical science: we eliminate moisture, use 100% natural ground spices, and seal our products in premium, airtight pouches that block out light and humidity completely.</p>
  </div>

  <div style="background: #fdfbf7; padding: 1.5rem; border-radius: 12px; border: 1px solid #f0ece4;">
    <h4 style="margin-top: 0; color: #111; font-size: 1.1rem; font-weight: 600; font-family: 'Montserrat', sans-serif; margin-bottom: 0.5rem;">Q3: How can I buy the authentic VEYANO 3-Flavor Combo Box safely online?</h4>
    <p style="color: #555; font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;"><strong>A:</strong> To guarantee you are receiving a fresh batch processed straight from our Karnal facility, always purchase directly through our official web domain at <a href="product.html?variant=combo" style="color: #FF9900; font-weight: 600; text-decoration: underline;">veyano.in</a>. Ordering direct ensures strict quality control, verified secure payment processing, and access to our fully compliant tax invoicing. You can get our optimized ₹999 <a href="product.html?variant=combo" style="color: #FF9900; font-weight: 600; text-decoration: underline;">VEYANO 3-Flavor Combo Box</a> with free shipping today.</p>
  </div>

  <div style="background: #fdfbf7; padding: 1.5rem; border-radius: 12px; border: 1px solid #f0ece4;">
    <h4 style="margin-top: 0; color: #111; font-size: 1.1rem; font-weight: 600; font-family: 'Montserrat', sans-serif; margin-bottom: 0.5rem;">Q4: Is VEYANO Roasted Makhana suitable for elderly individuals with sensitive digestion?</h4>
    <p style="color: #555; font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;"><strong>A:</strong> Yes, it is the ideal snack. Because our fox nuts are completely oil-free, water-roasted, and free from industrial additives or heavy sodium levels, they are exceptionally light on the stomach and highly bioavailable, making them safe and nourishing for all age groups.</p>
  </div>
</div>

<!-- Premium Combo CTA -->
<div style="background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%); padding: 2.5rem; border-radius: 15px; text-align: center; color: white; margin-top: 3rem; box-shadow: 0 10px 20px rgba(255, 153, 0, 0.2); font-family: 'Outfit', sans-serif;">
  <h3 style="margin-top: 0; font-size: 1.8rem; font-family: 'Montserrat', sans-serif; font-weight: 700;">Experience the Premium VEYANO Standard</h3>
  <p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.95;">Respect your body with uncompromised sourcing purity. Order the <a href="product.html?variant=combo" style="color: white; font-weight: bold; text-decoration: underline;">VEYANO 3-Flavor Combo Box</a> featuring our premium dry-roasted Peri-Peri, Salted, and Plain Natural variants for just ₹999.</p>
  <a href="product.html?variant=combo" style="background: white; color: #FF6600; padding: 1rem 2.5rem; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: inline-block; transition: transform 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">GET YOUR PURE SNACKS TRIO — ₹999</a>
</div>`;

const blogData = {
  title: "The Sourcing Trap: Why Cheap 'Loose' Snacks Cost More to Your Health Than You Think",
  slug: "sourcing-trap-why-cheap-loose-snacks-cost-more-to-your-health",
  content: blogContent,
  image_url: "./assets/sourcing_trap.png",
  author: "Veyano Team",
  created_at: "2026-05-27T10:00:00Z"
};

async function publish() {
  console.log('🚀 Syncing local database and publishing blog post...');
  try {
    // 1. Publish to local SQLite database
    await sequelize.sync();
    await Blog.upsert(blogData);
    console.log('✅ SQLite: Successfully published/updated the blog post.');

    // 2. Publish to production Supabase database
    if (supabase) {
      const { data, error } = await supabase
        .from('blogs')
        .upsert([blogData], { onConflict: 'slug' });

      if (error) {
        console.error('❌ Supabase Error:', error.message);
      } else {
        console.log('✅ Supabase: Successfully published/updated the blog post.');
      }
    } else {
      console.warn('⚠️ Supabase skipped: credentials missing or placeholders.');
    }
    
    console.log('\n✨ All operations complete! Blog slug:', blogData.slug);
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    process.exit(1);
  }
}

publish();
