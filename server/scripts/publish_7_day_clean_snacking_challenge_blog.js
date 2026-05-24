/**
 * VEYANO Foods — Blog Post Insertion Script (7-Day Clean Snacking Challenge)
 * Published: May 24, 2026
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
<p class="blog-lead" style="font-size: 1.2rem; line-height: 1.8; color: #475569; margin-bottom: 2rem;">If you have been following our deep-dives this week, you now know a truth that mass-market food corporations desperately try to hide: the persistent bloating, sudden mid-afternoon fatigue, and frustrating fitness plateaus you experience aren't personal failures. They are the direct physical consequences of highly processed "health foods" engineered with oxidized palm oils, synthetic stabilizers, and chemical flavor enhancers.</p>

<p>But knowing the truth is only the first step. True transformation requires structure, consistency, and absolute discipline.</p>

<p>To help you flush out the synthetic additives sabotaging your hard work, <strong>VEYANO Foods</strong> invites you to take the <strong>7-Day Clean Snacking Challenge</strong>. This professional, educational blueprint is designed to systematically reset your metabolic baseline, stabilize your cellular energy, and introduce your body to the power of Real Food.</p>

<p style="text-align: center; margin: 3rem 0;">
  <img src="./assets/7_day_clean_snacking_challenge.png" alt="VEYANO Foods 7-Day Clean Snacking Challenge Reset Your Metabolism" style="max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;" />
</p>

<h2 style="font-size: 2.2rem; color: #111; border-bottom: 2px solid #FF9900; padding-bottom: 0.5rem; margin-top: 3rem; margin-bottom: 2rem; font-family: 'Outfit', sans-serif;">The 7-Day Blueprint: Rules of Engagement</h2>
<p>For the next seven days, you will commit to a simple, non-negotiable protocol: <strong>Zero ultra-processed inputs during your snack intervals.</strong> Every time you feel an impulse to crunch between meals, you will substitute industrial packets with whole, single-ingredient fuel.</p>

<p>Here is your day-by-day integration roadmap:</p>

<div class="challenge-phase-container" style="margin: 3rem 0;">
  <!-- Phase 1 -->
  <div class="phase-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">1</span>
      Days 1 to 3: The Sodium & Fluid Flush
    </h3>
    <p style="color: #475569; line-height: 1.7;">The initial three days are focused entirely on reversing the water retention caused by hidden industrial salts in commercial "diet" puffs.</p>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The Action:</strong>
      <span style="color: #14532d;">Replace all mid-morning office snacks with <strong>VEYANO Plain Natural Roasted Makhana</strong>.</span>
    </div>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #e2e8f0;">
      <strong style="color: #334155; display: block; margin-bottom: 0.25rem;">🔬 The Science:</strong>
      <span style="color: #475569;">Because our premium fox nuts are naturally packed with potassium and exceptionally low in sodium, they act as an organic diuretic. This shifts your cellular fluid balance, signaling your kidneys to flush out retained water weight, reducing physical puffiness and evening bloating.</span>
    </div>
  </div>

  <!-- Phase 2 -->
  <div class="phase-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">2</span>
      Days 4 & 5: Breaking the Insulin Rollercoaster
    </h3>
    <p style="color: #475569; line-height: 1.7;">By mid-week, your body will attempt to trigger its usual 4 PM panic button, craving a rapid sugar or carbohydrate hit due to years of conditioned industrial snacking.</p>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The Action:</strong>
      <span style="color: #14532d;">At exactly 4:00 PM, fuel your body with a generous bowl of <strong>VEYANO Salted Makhana</strong> paired with a handful of raw almonds.</span>
    </div>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #e2e8f0;">
      <strong style="color: #334155; display: block; margin-bottom: 0.25rem;">🔬 The Science:</strong>
      <span style="color: #475569;">Instead of simple starches like maltodextrin that cause volatile glucose spikes, VEYANO provides a steady, slow-release stream of complex carbohydrates and plant protein. This keeps your insulin flat, keeping your prefrontal cortex fully oxygenated and eliminating brain fog entirely.</span>
    </div>
  </div>

  <!-- Phase 3 -->
  <div class="phase-card" style="background: #fffdf9; border: 1px solid #f0e6d2; border-left: 5px solid #FF9900; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <h3 style="margin-top: 0; color: #111; font-size: 1.5rem; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif;">
      <span style="background: #FF9900; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">3</span>
      Days 6 & 7: The Cognitive & Physical Peak
    </h3>
    <p style="color: #475569; line-height: 1.7;">As you hit the weekend, your gut inflammation will subside, your digestive tract will feel light, and your natural metabolic heat generation will optimize.</p>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #dcfce7;">
      <strong style="color: #15803d; display: block; margin-bottom: 0.25rem;">✨ The Action:</strong>
      <span style="color: #14532d;">Before your weekend workout or deep-work sessions, fuel your momentum with <strong>VEYANO Peri-Peri Roasted Makhana</strong>.</span>
    </div>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 1.2rem; margin-top: 1rem; border: 1px solid #e2e8f0;">
      <strong style="color: #334155; display: block; margin-bottom: 0.25rem;">🔬 The Science:</strong>
      <span style="color: #475569;">Our advanced, oil-free spice misting technology ensures our natural chili seasonings bond perfectly to the seed without grease. The natural capsicums provide a clean metabolic spark while clean amino acids like glutamine directly support cellular muscle repair.</span>
    </div>
  </div>
</div>

<h2 style="font-size: 2rem; color: #111; margin-top: 3rem; margin-bottom: 1.5rem; font-family: 'Outfit', sans-serif;">The 7-Day Clean Snacking Challenge Schedule</h2>
<div style="overflow-x: auto; margin-bottom: 3rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background: white; font-size: 0.95rem;">
    <thead>
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 1.2rem; font-weight: 600; color: #475569;">Phase</th>
        <th style="padding: 1.2rem; font-weight: 600; color: #475569;">Days</th>
        <th style="padding: 1.2rem; font-weight: 600; color: #475569;">Primary Target</th>
        <th style="padding: 1.2rem; font-weight: 600; color: #FF9900;">Expected Physical Result</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;"><strong>Phase 1</strong></td>
        <td style="padding: 1.2rem; color: #64748b;">Days 1–3</td>
        <td style="padding: 1.2rem; color: #64748b;">Fluid Balance & Sodium Flush</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">Visible reduction in bloating; lighter gut feel</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;"><strong>Phase 2</strong></td>
        <td style="padding: 1.2rem; color: #64748b;">Days 4–5</td>
        <td style="padding: 1.2rem; color: #64748b;">Insulin & Energy Stabilization</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">Zero 4 PM energy crashes; sustained mental focus</td>
      </tr>
      <tr>
        <td style="padding: 1.2rem; font-weight: 600; color: #1e293b;"><strong>Phase 3</strong></td>
        <td style="padding: 1.2rem; color: #64748b;">Days 6–7</td>
        <td style="padding: 1.2rem; color: #64748b;">Macro Purity & Cellular Peak</td>
        <td style="padding: 1.2rem; font-weight: 600; color: #15803d; background: #f0fdf4;">Optimized metabolic rate; crisp muscle definition</td>
      </tr>
    </tbody>
  </table>
</div>

<h2 style="font-size: 2rem; color: #111; margin-top: 3rem; margin-bottom: 1.5rem; font-family: 'Outfit', sans-serif;">Why VEYANO is the Standard of Execution</h2>
<p>This challenge cannot be executed using generic, unverified loose snacks from local open markets. Raw or improperly processed makhana holds high internal moisture, making it incredibly tough to digest and prone to micro-contaminants.</p>

<p>Operating under strict national quality benchmarks at our dedicated facility in Karnal, Haryana, VEYANO ensures absolute structural purity. We are a fully verified, FSSAI-licensed (No: 20826010000397), and GST-compliant brand. Every single pouch represents our commitment to label transparency: zero trans-fats, zero palm oils, and zero synthetic chemical codes.</p>

<p style="font-weight: 500; font-size: 1.1rem; color: #FF9900; margin-top: 1.5rem;">Take the challenge. Reset your system. Demand uncompromised fuel for a high-performance life.</p>

<hr style="border: 0; height: 1px; background: #e2e8f0; margin: 4rem 0;" />

<h2 style="font-size: 2rem; color: #111; margin-bottom: 2rem; text-align: center; font-family: 'Outfit', sans-serif;">The 7-Day Clean Snacking Challenge FAQ</h2>
<div class="faq-section" style="max-width: 800px; margin: 0 auto 3rem;">
  
  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q1: Will I lose real weight during the 7-Day VEYANO Clean Snacking Challenge?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> During the first 72 hours, most participants experience a noticeable drop in "fake weight"—the stubborn water retention caused by high-sodium industrial snacks. Over the full 7 days, replacing high-fat, high-glycemic processed foods with Roasted Makhana creates a clean calorie deficit that actively kickstarts real fat oxidation.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q2: Can I participate in this challenge if I have a highly sedentary corporate desk job?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> This challenge is specifically engineered for you. Sitting for long hours slows down your baseline digestion. Consuming heavy, oil-treated commercial snacks causes immediate fat storage and lethargy. VEYANO is a Real Food alternative that keeps your gut light, preventing evening stomach distension.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q3: Why shouldn't I just eat raw fruit instead of Roasted Makhana during the challenge?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> While fresh fruits are excellent, they lack the distinct, structural "crunch" that satisfies your jaw's sensory habits. Furthermore, fruit sugars (fructose) digest very rapidly. VEYANO Clean Snacking provides essential plant proteins and complex fibers that keep you physically full for significantly longer periods.</p>
  </div>

  <div style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; padding: 1.5rem; margin-bottom: 1.5rem;">
    <h3 style="margin-top: 0; font-size: 1.15rem; color: #FF9900; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Q4: How do I order the correct variants to complete my 7-day routine successfully?</h3>
    <p style="margin-bottom: 0; color: #444; line-height: 1.6;"><strong>A:</strong> To ensure you have the exact toolset required for each phase of the metabolic reset, we have curated our signature flavors into an all-in-one bundle. You can order the official VEYANO 3-Flavor Combo Box safely and directly through our verified web domain at <a href="https://veyano.in" style="color: #FF9900; text-decoration: underline; font-weight: 600;">veyano.in</a>.</p>
  </div>
</div>

<div style="background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%); padding: 3rem; border-radius: 16px; text-align: center; color: white; margin-top: 4rem; box-shadow: 0 10px 25px rgba(255, 153, 0, 0.25);">
  <h3 style="margin-top: 0; font-size: 2rem; font-weight: 700; color: white; font-family: 'Outfit', sans-serif;">Elevate Your Snacking Standard Today</h3>
  <p style="font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.95; max-width: 600px; margin-left: auto; margin-right: auto;">Get all three of our premium, oil-free mist roasted flavors delivered fresh straight to your doorstep.</p>
  <a href="/index.html#products" style="background: white; color: #FF6600; padding: 1.2rem 3rem; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 1.15rem; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: all 0.3s ease;">Shop the Ultimate Trio Combo - ₹999</a>
</div>
`;

const blogData = {
  title: "How to Reset Your Metabolism and Reclaim Your Energy",
  slug: "7-day-clean-snacking-challenge",
  content: blogContent,
  image_url: "./assets/7_day_clean_snacking_challenge.png",
  author: "Veyano Team",
  created_at: new Date("2026-05-24T10:00:00Z")
};

// Previous 5 blog slugs to link
const prevSlugs = [
  "ultimate-guide-healthy-snacks-india",
  "protein-revolution-india-swapping-fried-namkeen-veyano",
  "premium-roasted-makhana-investment-health-2026",
  "elite-snackers-playbook-veyano-makhana-science",
  "ultimate-guide-clean-snacking-roasted-makhana"
];

// Helper to append internal link if not already present
function appendInternalLink(content) {
  const challengeLinkPattern = /7-day-clean-snacking-challenge/i;
  if (challengeLinkPattern.test(content)) {
    console.log('   Already contains link. Skipping append.');
    return content;
  }
  
  const linkHtml = `
<p style="font-size: 0.95rem; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; color: #64748b;">Ready to reset your system and flush out industrial toxins? Take the next step: Join the official <a href="/blog/7-day-clean-snacking-challenge" style="color: #FF9900; font-weight: 600; text-decoration: underline;">VEYANO 7-Day Clean Snacking Challenge</a> to reclaim your metabolic energy and experience the pure power of Real Food.</p>
`;
  return content.trim() + "\n" + linkHtml;
}

async function publishBlog() {
  console.log('🚀 Syncing to local SQLite database via Sequelize ORM...');
  try {
    await sequelize.sync();
    
    // 1. Insert new challenge blog
    await Blog.upsert(blogData);
    console.log('✅ SQLite: Successfully published 7-Day Challenge blog post.');

    // 2. Query and update previous 5 blogs
    console.log('🔄 Updating internal links in previous 5 blog posts...');
    for (const slug of prevSlugs) {
      const prevPost = await Blog.findOne({ where: { slug } });
      if (prevPost) {
        console.log(`   Found: ${prevPost.title}`);
        const updatedContent = appendInternalLink(prevPost.content);
        await Blog.update(
          { content: updatedContent },
          { where: { id: prevPost.id } }
        );
        console.log(`   Updated locally: ${slug}`);
      } else {
        console.warn(`   ⚠️ Warning: Could not find previous blog with slug "${slug}" in local database.`);
      }
    }
  } catch (dbErr) {
    console.error('❌ SQLite Error:', dbErr.message);
  }

  // 3. Supabase Sync
  if (supabase) {
    console.log('\n🚀 Syncing to Supabase cloud database...');
    try {
      // Upsert challenge blog
      const { error: challengeErr } = await supabase
        .from('blogs')
        .upsert([blogData], { onConflict: 'slug' });

      if (challengeErr) throw new Error(challengeErr.message);
      console.log('✅ Supabase: Successfully published 7-Day Challenge blog post.');

      // Update previous 5 blogs
      console.log('🔄 Syncing updated previous blogs to Supabase...');
      for (const slug of prevSlugs) {
        const prevPost = await Blog.findOne({ where: { slug } });
        if (prevPost) {
          const { error: updateErr } = await supabase
            .from('blogs')
            .upsert([{
              title: prevPost.title,
              slug: prevPost.slug,
              content: prevPost.content,
              image_url: prevPost.image_url,
              author: prevPost.author,
              created_at: prevPost.created_at
            }], { onConflict: 'slug' });

          if (updateErr) {
            console.error(`   ❌ Supabase Update failed for ${slug}:`, updateErr.message);
          } else {
            console.log(`   Synced cloud: ${slug}`);
          }
        }
      }
    } catch (sbErr) {
      console.error('❌ Supabase Sync Error:', sbErr.message);
    }
  } else {
    console.log('⚠️ Supabase credentials missing or invalid in .env. Skipped Supabase sync.');
  }

  console.log('\n✨ Publishing process and internal linking sync completed!');
  process.exit(0);
}

publishBlog();
