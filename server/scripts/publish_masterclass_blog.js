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

const newBlogSlug = 'ultimate-guide-clean-snacking-body-deserves-real-food';

const blogContent = `<p>Over the last six days, we have pulled back the curtain on the modern snack industry—from exposing the deceptive labels of "diet" foods to exploring the precise science of slow-roasting. Today, we are bringing it all together. Welcome to the VEYANO masterclass on Clean Snacking. In a world of ultra-processed convenience, choosing Real Food is the single most impactful choice you can make for your metabolic health.</p>

<h2>Defining the "Real Food" Standard</h2>
<p>In the context of the modern Indian diet, clean snacking isn't a marketing buzzword; it’s a lifestyle built on three uncompromised pillars:</p>

<ul>
  <li><strong>Ingredient Transparency:</strong> If the ingredient list reads like a chemistry textbook, it doesn't belong in your body.</li>
  <li><strong>Process Integrity:</strong> True health foods avoid high-heat flash frying that destabilizes natural oils and turns healthy fats into inflammatory trans-fats.</li>
  <li><strong>Nutrient Density:</strong> Every calorie consumed should serve a physiological purpose—whether it’s protein for muscle synthesis or magnesium for cognitive focus.</li>
</ul>

<h2>The VEYANO Framework: Reclaiming the Superfood</h2>
<p>While dozens of brands in the <strong>Healthy Snacks India</strong> market claim health benefits, VEYANO differentiates itself through rigorous quality protocols handled directly at our specialized facility in Karnal.</p>

<p>Our <strong>Roasted Makhana</strong> isn't just tossed in a machine; it undergoes a graduated heat profile. This slow-roasting method preserves the highly bioavailable antioxidants (like kaempferol) and essential minerals naturally present in the fox nut. Unlike mass-market alternatives that soak snacks in cheap palm oil to make spices stick, we use a specialized misting technology. This ensures our signature Peri-Peri and Salted blends deliver maximum flavor with zero grease.</p>

<h2>Your 7-Day Clean Snacking Checklist</h2>
<p>Transitioning away from processed junk food doesn't happen by accident; it happens through consistent discipline. Swap out the empty calories by following this simple, sustainable routine:</p>

<ul>
  <li><strong>The Morning Desk Craving:</strong> Replace sugary cream biscuits with a handful of crisp, iron-rich VEYANO Plain Roasted Makhana.</li>
  <li><strong>The 4 PM Slump:</strong> Instead of heavy, fried samosas that cause brain fog, fuel your focus with a protein-packed bowl of Veyano Peri-Peri Makhana.</li>
  <li><strong>The Midnight Screen Session:</strong> Trade high-sodium potato chips for our Lightly Salted variant to satisfy your sensory crunch without the next-day bloating.</li>
</ul>

<hr />

<h2>The Clean Snacking Masterclass FAQ</h2>
<h3>Q1: Why is Roasted Makhana considered a superior 'Real Food' alternative?</h3>
<p>A: "Real Food" refers to unadulterated whole foods that are minimally processed. VEYANO Roasted Makhana is a whole water seed that is simply dry-roasted and seasoned naturally, keeping its fiber, protein, and complex carbohydrates intact.</p>

<h3>Q2: Can I consume VEYANO snacks daily?</h3>
<p>A: Yes. Because it is high in essential minerals like calcium and magnesium, low in calories, and completely free of artificial preservatives, it serves as an ideal daily dietary addition for children, professionals, and fitness enthusiasts alike.</p>

<h3>Q3: How does VEYANO maintain its signature crunch without preservatives?</h3>
<p>A: The secret lies in our meticulous moisture-evaporation process during roasting, combined with our premium, light-blocking standing pouches. Keeping moisture and UV light out preserves the natural crispness for months without a single chemical additive.</p>

<h3>Q4: Is VEYANO safe for individuals managing blood sugar levels?</h3>
<p>A: Absolutely. Roasted makhana has a remarkably low Glycemic Index (GI), meaning it releases glucose into the bloodstream gradually. This prevents the sharp insulin spikes and subsequent crashes caused by refined-flour snacks.</p>

<hr />

<h2>About VEYANO Foods</h2>
<p>VEYANO Foods is a GST-compliant, fully registered corporate entity committed to providing uncompromising quality. From our facility in Karnal to your doorstep, we maintain the highest standards of safety, transparency, and nutritional integrity.</p>

<div style="background-color: #fdfbf7; padding: 20px; border-left: 4px solid #c08b5c; margin-top: 30px;">
  <p style="margin-bottom: 0;"><strong>Join the Revolution:</strong> Stock up on Real Food today at <a href="https://veyano.in" target="_blank" rel="noopener noreferrer">veyano.in</a>.</p>
</div>`;

const blogData = {
  title: "The Ultimate Guide to Clean Snacking: Why Your Body Deserves Real Food",
  slug: newBlogSlug,
  content: blogContent,
  image_url: "./assets/veyano_clean_snacking_guide.png",
  author: "Veyano Team",
  created_at: "2026-05-17T10:00:00Z"
};

async function postBlogAndUpdateLinks() {
  console.log('🚀 Attempting to post new blog to Supabase...');
  
  try {
    // 1. Post the new blog
    const { data: insertData, error: insertError } = await supabase
      .from('blogs')
      .upsert([blogData], { onConflict: 'slug' });

    if (insertError) {
      console.error('❌ Supabase Error on Upsert:', insertError.message);
      process.exit(1);
    }

    console.log('✅ Success! Blog post has been published.');
    console.log('🔗 Slug:', blogData.slug);

    // 2. Fetch the last 6 blogs
    console.log('🔄 Fetching previous 6 blogs to update internal links...');
    const { data: previousBlogs, error: fetchError } = await supabase
      .from('blogs')
      .select('*')
      .neq('slug', newBlogSlug)
      .order('created_at', { ascending: false })
      .limit(6);

    if (fetchError) {
      console.error('❌ Error fetching previous blogs:', fetchError.message);
    } else if (previousBlogs && previousBlogs.length > 0) {
      const linkHtml = `\n\n<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 30px; border-left: 4px solid #c08b5c;"><p style="margin: 0;"><strong>Must Read:</strong> <a href="/blog/${newBlogSlug}">The Ultimate Guide to Clean Snacking: Why Your Body Deserves Real Food</a></p></div>`;
      
      const updatePromises = previousBlogs.map(async (blog) => {
        if (!blog.content.includes(newBlogSlug)) {
          const updatedContent = blog.content + linkHtml;
          const { error: updateError } = await supabase
            .from('blogs')
            .update({ content: updatedContent })
            .eq('id', blog.id);
          
          if (updateError) {
            console.error(`❌ Error updating blog ${blog.slug}:`, updateError.message);
          } else {
            console.log(`✅ Updated internal link for blog: ${blog.slug}`);
          }
        } else {
          console.log(`ℹ️ Blog ${blog.slug} already contains the link.`);
        }
      });

      await Promise.all(updatePromises);
      console.log('✅ All internal links updated successfully.');
    } else {
      console.log('ℹ️ No previous blogs found to update.');
    }

  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    process.exit(1);
  }
}

postBlogAndUpdateLinks();
