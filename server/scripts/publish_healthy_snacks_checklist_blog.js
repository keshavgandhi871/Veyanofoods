/**
 * VEYANO Foods — Blog Post Insertion Script (Healthy Snacks India Checklist)
 * Published: May 22, 2026
 */
const fs = require('fs');
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
<p class="blog-lead" style="font-size: 1.2rem; line-height: 1.8; color: #475569; margin-bottom: 2rem;">Let’s cut through the marketing noise. If you are someone who operates with high standards—whether in your career, your business, or your physical fitness—you know that your input dictates your output. You don't tolerate compromises in your work, so why do you tolerate them in your diet?</p>

<p>Yet, finding authentic <strong>Healthy Snacks in India</strong> has become an exhausting chore.</p>

<p>You walk into a supermarket or browse an online marketplace, and every brightly colored package promises the world: <em>"Zero Cholesterol," "Baked, Not Fried," "Diet Friendly."</em> But the moment you flip the pouch over and read the fine print, the illusion shatters. You find cheap palm oil, excessive sodium, and chemical flavor enhancers like MSG hidden under vague names like "hydrolyzed vegetable protein."</p>

<p>At <strong>VEYANO Foods</strong>, we built our brand because we were tired of the deception. Operating from our state-of-the-art facility in Karnal, Haryana, we don't make "diet foods." We make <strong>Real Food</strong>.</p>

<p>Here is the professional, educational checklist you need to separate deceptive marketing from genuine Clean Snacking.</p>

<p style="text-align: center; margin: 3rem 0;">
  <img src="./assets/healthy_snacks_checklist.png" alt="VEYANO Roasted Makhana Healthy Snacks India Clean Snacking facility in Karnal" style="max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;" />
</p>

<div class="transparency-audit-container" style="margin: 3rem 0;">
  <h2 style="font-size: 2.2rem; color: #111; border-bottom: 2px solid #FF9900; padding-bottom: 0.5rem; margin-bottom: 2rem; font-family: 'Outfit', sans-serif;">The 3-Point Transparency Audit</h2>
  <p style="margin-bottom: 2rem;">Before you add any "healthy" snack to your cart, run it through these three non-negotiable checks:</p>
  
  <!-- Point 1 -->
  <div class="audit-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s ease;">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">1</span>
      The Residue Test (The Oil Check)
    </h3>
    <p style="color: #475569; line-height: 1.7; margin-bottom: 1.5rem;">Many commercial brands claim their snacks are "roasted" or "baked." However, to make mass-produced spices stick to the product, they spray a heavy mist of low-grade, highly refined palm oil or hydrogenated fats over the snack after the baking process is done.</p>
    
    <div style="background: #fff5f5; border-radius: 8px; padding: 1.2rem; margin-bottom: 1rem; border: 1px solid #ffe3e3;">
      <strong style="color: #c53030; display: block; margin-bottom: 0.25rem;">🔬 The Test:</strong>
      <span style="color: #7f1d1d;">Pour the snack into your hands. Does it leave a greasy, shiny residue on your fingers? If it does, those oxidized oils are entering your system, triggering gut inflammation and skin breakouts.</span>
    </div>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The VEYANO Standard:</strong>
      <span style="color: #14532d;">We utilize an advanced, oil-free seasoning mist technology. Our signature flavors, like Peri-Peri and Salted, bond with our Roasted Makhana at a molecular level. You get a world-class, crisp crunch with absolute purity.</span>
    </div>
  </div>

  <!-- Point 2 -->
  <div class="audit-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s ease;">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">2</span>
      The Sugar & Starch Double-Check
    </h3>
    <p style="color: #475569; line-height: 1.7; margin-bottom: 1.5rem;">Turn the package around and look at the carbohydrate breakdown. Many "low-fat" namkeens or fitness biscuits substitute fat with high-glycemic starches like maltodextrin or corn syrup to preserve shelf life. These ingredients cause a volatile spike in your blood sugar, resulting in an afternoon energy crash and intense cravings.</p>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The VEYANO Standard:</strong>
      <span style="color: #14532d;">Premium fox nuts naturally possess a remarkably low Glycemic Index (GI). Because we don't add hidden starches or sugars, VEYANO provides a flat, sustained release of glucose, fueling your brain and muscles smoothly without any post-snack lethargy.</span>
    </div>
  </div>

  <!-- Point 3 -->
  <div class="audit-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s ease;">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">3</span>
      Verification and Legitimacy
    </h3>
    <p style="color: #475569; line-height: 1.7; margin-bottom: 1.5rem;">An authentic health brand doesn't hide behind a curtain. A lack of proper corporate and safety credentials on a website or packaging is a massive red flag that the product is being packaged in unverified, unhygienic conditions.</p>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The VEYANO Standard:</strong>
      <span style="color: #14532d;">We operate with absolute corporate discipline. VEYANO Foods is a fully verified, FSSAI-licensed (No: 20826010000397), and GST-registered entity. Our facility follows strict national quality and hygiene protocols, ensuring that every 200g pouch is identical in safety and excellence.</span>
    </div>
  </div>
</div>

<h2 style="font-size: 2rem; color: #111; margin-top: 3rem; margin-bottom: 1.5rem; font-family: 'Outfit', sans-serif;">The Clean Snacking Comparison</h2>
<div style="overflow-x: auto; margin-bottom: 3rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background: white; font-size: 0.95rem;">
    <thead>
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 1.2rem; font-weight: 600; color: #475569;">Feature</th>
        <th style="padding: 1.2rem; font-weight: 600; color: #475569;">Mass-Market "Diet" Snacks</th>
        <th style="padding: 1.2rem; font-weight: 600; color: #FF9900;">VEYANO Roasted Makhana</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;">Primary Fat Source</td>
        <td style="padding: 1.2rem; color: #64748b;">Refined Palm Oil / Trans-Fats</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">Zero-Oil Mist Technology</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;">Flavor Enhancers</td>
        <td style="padding: 1.2rem; color: #64748b;">MSG / Synthetic Chemical Codes</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">100% Natural Ground Spices</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;">Glycemic Impact</td>
        <td style="padding: 1.2rem; color: #64748b;">High (Causes Energy Crashes)</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">Low (Sustained Cognitive Focus)</td>
      </tr>
      <tr>
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;">Manufacturing</td>
        <td style="padding: 1.2rem; color: #64748b;">Unverified / Loose Sourcing</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">FSSAI & GST Compliant (Karnal)</td>
      </tr>
    </tbody>
  </table>
</div>

<h2 style="font-size: 2rem; color: #111; margin-top: 3rem; margin-bottom: 1.5rem; font-family: 'Outfit', sans-serif;">Why Real Food Belongs at Your Desk</h2>
<p>Choosing VEYANO Roasted Makhana is an investment in your daily execution. Rich in natural plant-based protein, dietary fiber, and neuro-protective minerals like magnesium and potassium, it satisfies your sensory cravings while keeping your gut completely light and your mind exceptionally sharp.</p>

<p style="font-weight: 500; font-size: 1.1rem; color: #FF9900; margin-top: 1.5rem;">Stop settling for snacks that sabotage your hard work and leave you feeling sluggish. Elevate your standards.</p>

<hr style="border: 0; height: 1px; background: #e2e8f0; margin: 4rem 0;" />

<h2 style="font-size: 2rem; color: #111; margin-bottom: 2rem; text-align: center; font-family: 'Outfit', sans-serif;">Clean Snacking & Website Discovery FAQ</h2>
<div class="faq-section" style="max-width: 800px; margin: 0 auto 3rem;">
  
  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q1: Where can I buy authentic VEYANO Foods products online?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> To ensure you receive the freshest possible batch straight from our production facility, you can order directly through our official website at <a href="https://veyano.in" style="color: #FF9900; text-decoration: underline; font-weight: 600;">veyano.in</a>. Buying direct guarantees the best available pricing, access to our exclusive 3-flavor combos, and fast, secure shipping.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q2: What makes VEYANO Roasted Makhana different from loose makhana available locally?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> Loose, unbranded makhana sold in open markets often contains high residual moisture, making it chewy, tough to digest, and prone to mold. VEYANO uses a meticulous, low-temperature graduated roasting profile that eliminates moisture perfectly, locking in the bioavailable antioxidants (like kaempferol) and delivering a superior crunch.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q3: Can corporate offices or retail stores place bulk orders on veyano.in?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> Yes. As a fully compliant and GST-registered business, VEYANO Foods provides official tax invoices for all corporate gifting, office pantry supplies, and B2B retail partnerships. You can contact us directly through our website portals for structured wholesale pricing.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q4: Are VEYANO healthy snacks safe for a strict fitness or weight management plan?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> Absolutely. Because our fox nuts are low in calories, virtually fat-free, and contain no artificial stabilizers or hidden sugars, they are highly recommended by nutritionists for weight management, athletic recovery, and maintaining optimal metabolic health.</p>
  </div>
</div>

<div style="background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%); padding: 3rem; border-radius: 16px; text-align: center; color: white; margin-top: 4rem; box-shadow: 0 10px 25px rgba(255, 153, 0, 0.25);">
  <h3 style="margin-top: 0; font-size: 2rem; font-weight: 700; color: white; font-family: 'Outfit', sans-serif;">Elevate Your Snacking Standard Today</h3>
  <p style="font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.95; max-width: 600px; margin-left: auto; margin-right: auto;">Get all three of our premium, oil-free mist roasted flavors delivered fresh straight to your doorstep.</p>
  <a href="/index.html#products" style="background: white; color: #FF6600; padding: 1.2rem 3rem; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 1.15rem; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: all 0.3s ease;">Shop the Ultimate Trio Combo - ₹999</a>
</div>
`;

const blogData = {
  title: "Healthy Snacks India: The Ultimate Checklist for Authentic Clean Snacking",
  slug: "ultimate-guide-healthy-snacks-india",
  content: blogContent,
  image_url: "./assets/healthy_snacks_checklist.png",
  author: "Veyano Team",
  created_at: new Date("2026-05-22T10:00:00Z")
};

async function postBlog() {
  console.log('🚀 Syncing to local SQLite database via Sequelize ORM...');
  try {
    await sequelize.sync();
    await Blog.upsert(blogData);
    console.log('✅ SQLite: Successfully published blog post.');
  } catch (dbErr) {
    console.error('❌ SQLite Error:', dbErr.message);
  }

  if (supabase) {
    console.log('🚀 Syncing to Supabase cloud database...');
    try {
      const { data, error } = await supabase
        .from('blogs')
        .upsert([blogData], { onConflict: 'slug' });

      if (error) {
        throw new Error(error.message);
      }
      console.log('✅ Supabase: Successfully published/synced blog post.');
    } catch (sbErr) {
      console.error('❌ Supabase Sync Error:', sbErr.message);
    }
  } else {
    console.log('⚠️ Supabase credentials missing or invalid in .env. Skipped Supabase sync.');
  }

  console.log('\n✨ Publishing process completed!');
  process.exit(0);
}

postBlog();
