const path = require('path');
const sequelize = require('../config/db');
const Blog = require('../models/Blog');

const blogs = [
  {
    title: "The Ultimate Guide to Clean Snacking: Why Roasted Makhana is the Future of Indian Tea-Time",
    slug: "ultimate-guide-clean-snacking-roasted-makhana",
    author: "Veyano Team",
    image_url: "./assets/plain.png",
    content: `
      <p>In the heart of every Indian home, there is a sacred ritual: the 4 PM tea-time. But for decades, this cherished moment has been overshadowed by a silent intruder—processed inflammation.</p>
      <p>For most of us, tea-time has become synonymous with deep-fried namkeens and palm oil-soaked biscuits. VEYANO Foods steps in as the bridge between ancient Vedic intelligence and your modern lifestyle.</p>
      <h2>The 'Big 5' Deep Dive</h2>
      <p>1. The Protein Punch: Muscle Recovery and Beyond.</p>
      <p>2. Heart-Health: Roasted, Not Fried.</p>
      <p>3. Metabolism Booster: Low Glycemic Hero.</p>
      <p>4. Detox & Digestion: Antioxidant Shield.</p>
      <p>5. Small Batch Perfection: The Artisanal Difference.</p>
    `
  },
  {
    title: "The Elite Snacker’s Playbook: How VEYANO Makhana Replaces Junk With Science",
    slug: "elite-snackers-playbook-veyano-makhana-science",
    author: "Veyano Dietitian Team",
    image_url: "./assets/plain.png",
    content: `
      <p>When you reach for regular chips, you ingest a chemical reaction. Mass-market snacks are deep-fried in cheap oils pushed beyond their smoke point.</p>
      <p>VEYANO employs an artisanal, slow-roasting process. This gentle technique locks in Kaempferol, a powerful natural flavonoid present in Makhana.</p>
      <h2>PILLAR 2: The Modern Professional’s Survival Kit</h2>
      <p>Perfect for those 10 AM and 4 PM cravings, providing steady energy without the 'Brain Fog'.</p>
    `
  },
  {
    title: "Why Premium Roasted Makhana is the Smartest Investment for Your Health in 2026",
    slug: "premium-roasted-makhana-investment-health-2026",
    author: "Veyano Team",
    image_url: "./assets/plain.png",
    content: `
      <p>In a world of 'Cheap' snacks, we pay a heavy price with our health. VEYANO is a 'Clean Snacking' promise.</p>
      <h2>1. The True Cost of 'Cheap' Snacks</h2>
      <p>Most fried snacks use low-quality oils. VEYANO is roasted in small batches to preserve vitality.</p>
      <h2>2. Why 200g is the Perfect Size?</h2>
      <p>Our Jumbo Packs are designed for serious snackers who value nutrition and volume.</p>
    `
  },
  {
    title: "The Protein Revolution: Why India is Swapping Fried Namkeen for VEYANO Roasted Makhana",
    slug: "protein-revolution-india-swapping-fried-namkeen-veyano",
    author: "Veyano Editorial",
    image_url: "./assets/plain.png",
    content: `
      <p>The "Tasty but Oily" era is being dismantled. We are witnessing The Protein Revolution.</p>
      <p>VEYANO Roasted Makhana is leading this charge as a functional tool for energy management.</p>
    `
  }
];

async function recover() {
  console.log('🚀 Starting Blog Recovery for SQLite...');
  try {
    await sequelize.sync();
    for (const blog of blogs) {
      await Blog.upsert(blog);
      console.log(`✅ Recovered: ${blog.title}`);
    }
    console.log('\n✨ All blogs have been restored to the local database.');
  } catch (err) {
    console.error('❌ Recovery failed:', err.message);
  }
}

recover();
