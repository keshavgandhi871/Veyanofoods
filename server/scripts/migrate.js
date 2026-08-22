/**
 * server/scripts/migrate.js — Enterprise Database Initializer & Product Catalog Seeder
 */

require('dotenv').config({ path: './server/.env' });
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

const DEFAULT_PRODUCTS = [
  {
    sku: "PLAIN-200",
    slug: "classic-plain",
    name: "Classic Plain Roasted Makhana",
    product_name: "Classic Plain Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    weight: "200g",
    short_description: "Pure, slow-roasted fox nuts with a crisp, airy crunch. 0% added oil.",
    description: "Our signature Classic Plain Roasted Makhana is crafted from premium lotus seeds harvested in the wetlands of Mithila. Slowly dry-roasted using hot air without a single drop of added oil, it delivers a clean, delicate crunch that lets the natural earthy flavor of the seed shine through.",
    ingredients: "100% Premium Grade Lotus Seeds (Fox Nuts / Makhana).",
    nutrition: {
      serving_size: "30g",
      energy: "356 kcal / 100g",
      protein: "9.7g",
      carbohydrates: "77.2g",
      dietary_fiber: "14.5g",
      total_fat: "0.5g",
      sodium: "2.1mg"
    },
    allergens: "Naturally Gluten-Free & Vegan. Processed in a clean facility that handles seeds.",
    oil_information: "0% Added Oil. 100% Dry Hot-Air Roasted. Never deep-fried.",
    preservative_information: "Zero artificial preservatives, zero synthetic additives, zero MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from packaging",
    images: ["./assets/plain.webp", "./assets/plain_hover.webp", "./assets/real_food_makhana.webp"],
    hover_image: "./assets/plain_hover.webp",
    stock: 200,
    reorder_threshold: 25,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false,
    is_active: true
  },
  {
    sku: "SALTED-200",
    slug: "lightly-salted",
    name: "Lightly Salted Roasted Makhana",
    product_name: "Lightly Salted Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    weight: "200g",
    short_description: "Slow-roasted fox nuts seasoned with natural mineral-rich Himalayan pink salt.",
    description: "For those who appreciate a perfectly balanced savory snack. We gently slow-roast large-grade makhana to peak crispness, apply a feather-light mist (<1%) of cold-pressed rice bran oil strictly to allow seasoning adhesion, and dust with pure Himalayan pink salt.",
    ingredients: "Premium Lotus Seeds (Fox Nuts), Himalayan Pink Salt, Cold-Pressed Rice Bran Oil (<1% for seasoning adhesion).",
    nutrition: {
      serving_size: "30g",
      energy: "360 kcal / 100g",
      protein: "9.4g",
      carbohydrates: "76.8g",
      dietary_fiber: "14.2g",
      total_fat: "1.1g",
      sodium: "280.0mg"
    },
    allergens: "Naturally Gluten-Free & Vegan.",
    oil_information: "Zero Palm Oil. Minimal Cold-Pressed Rice Bran Oil mist (<1%).",
    preservative_information: "Zero artificial preservatives, zero synthetic additives, zero MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from packaging",
    images: ["./assets/salted.webp", "./assets/salted_hover.webp", "./assets/real_food_makhana.webp"],
    hover_image: "./assets/salted_hover.webp",
    stock: 200,
    reorder_threshold: 25,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false,
    is_active: true
  },
  {
    sku: "PERIPERI-200",
    slug: "fiery-peri-peri",
    name: "Fiery Peri-Peri Roasted Makhana",
    product_name: "Fiery Peri-Peri Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    weight: "200g",
    short_description: "Zesty African bird's eye chili and garlic infused roasted makhana with a bold kick.",
    description: "An invigorating fusion of artisanal hot-air roasted fox nuts tossed with authentic peri-peri spice blend: red chili flakes, crushed garlic, ground onion, tangy citric crystals, and black pepper.",
    ingredients: "Premium Lotus Seeds (Fox Nuts), Peri-Peri Seasoning (Red Chili, Dehydrated Garlic, Onion Powder, Black Pepper, Himalayan Pink Salt), Cold-Pressed Rice Bran Oil (<1.5%).",
    nutrition: {
      serving_size: "30g",
      energy: "372 kcal / 100g",
      protein: "9.1g",
      carbohydrates: "75.4g",
      dietary_fiber: "13.8g",
      total_fat: "2.1g",
      sodium: "490.0mg"
    },
    allergens: "Naturally Gluten-Free. Contains garlic, onion, and spices.",
    oil_information: "Zero Palm Oil. Minimal Cold-Pressed Rice Bran Oil mist (<1.5%).",
    preservative_information: "Zero artificial preservatives, zero synthetic colors, zero MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from packaging",
    images: ["./assets/periperi.webp", "./assets/periperi_hover.webp", "./assets/real_food_makhana.webp"],
    hover_image: "./assets/periperi_hover.webp",
    stock: 200,
    reorder_threshold: 25,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false,
    is_active: true
  },
  {
    sku: "COMBO-600",
    slug: "ultimate-combo",
    name: "The Trio Discovery Combo",
    product_name: "The Trio Discovery Combo",
    category: "combos",
    category_name: "Combos & Bundles",
    price: 999,
    price_paise: 99900,
    mrp: 1197,
    weight: "3 x 200g (600g Total)",
    short_description: "Complete signature collection: Classic Plain, Lightly Salted, and Fiery Peri-Peri.",
    description: "The complete VEYANO roasted makhana tasting experience. Includes three full-sized 200g packs: one Classic Plain, one Lightly Salted, and one Fiery Peri-Peri.",
    ingredients: "Pack includes 3 individual jars: 1 x Classic Plain (200g), 1 x Lightly Salted (200g), 1 x Fiery Peri-Peri (200g).",
    nutrition: {
      serving_size: "30g",
      energy: "364 kcal (avg)",
      protein: "9.5g",
      carbohydrates: "76.5g",
      dietary_fiber: "14.1g",
      total_fat: "1.2g",
      sodium: "290.0mg"
    },
    allergens: "Naturally Gluten-Free. See individual variant details.",
    oil_information: "Zero Palm Oil. Dry roasted / minimal non-hydrogenated rice bran oil mist.",
    preservative_information: "Zero artificial preservatives across all 3 packs.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from packaging",
    images: ["./assets/combo.webp", "./assets/combo_hover.webp", "./assets/real_food_makhana.webp"],
    hover_image: "./assets/combo_hover.webp",
    stock: 150,
    reorder_threshold: 20,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: true,
    is_active: true
  },
  {
    sku: "TRIAL-SAMPLER",
    slug: "discovery-trial-sampler",
    name: "VEYANO Discovery Trial Sampler",
    product_name: "VEYANO Discovery Trial Sampler",
    category: "trial-packs",
    category_name: "Trial Packs",
    price: null,
    price_paise: 0,
    mrp: null,
    weight: "To be decided",
    short_description: "Trial packs are coming soon. We're working on smaller formats so you can try VEYANO before committing to a larger pack.",
    description: "New to VEYANO? We understand that buying a 200g jar from a new brand is a leap of faith. We are working on smaller trial pack formats so you can experience our clean roasted crunch before committing to a full-sized jar.",
    ingredients: "To be confirmed at launch.",
    nutrition: null,
    allergens: "To be confirmed at launch.",
    oil_information: "Zero Palm Oil.",
    preservative_information: "Zero artificial preservatives or MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "To be confirmed at launch.",
    images: ["./assets/makhana_hero_1775492594943.webp"],
    hover_image: "./assets/makhana_hero_1775492594943.webp",
    stock: 0,
    reorder_threshold: 0,
    stock_status: "coming_soon",
    is_featured: false,
    is_new: false,
    is_trial: true,
    is_combo: false,
    is_active: true
  }
];

async function runMigration() {
  console.log('🚀 Starting VEYANO Enterprise Database Migration...');

  // 1. Seed / Upsert Products into Supabase
  console.log('\n📦 Seeding Product Catalog into Supabase...');
  for (const prod of DEFAULT_PRODUCTS) {
    try {
      // First check if product with SKU exists
      const { data: existing } = await supabase
        .from('products')
        .select('id, sku')
        .eq('sku', prod.sku)
        .maybeSingle();

      const productPayload = {
        sku: prod.sku,
        product_name: prod.product_name,
        price_paise: prod.price ? prod.price * 100 : 0,
        stock_quantity: prod.stock || 0,
        details: prod.description,
        image_url: prod.images[0]
      };

      if (existing) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', existing.id);
        if (error) console.warn(`⚠️ Update error for SKU ${prod.sku}:`, error.message);
        else console.log(`✅ Updated product SKU: ${prod.sku}`);
      } else {
        const { error } = await supabase.from('products').insert([productPayload]);
        if (error) console.warn(`⚠️ Insert error for SKU ${prod.sku}:`, error.message);
        else console.log(`✅ Inserted product SKU: ${prod.sku}`);
      }
    } catch (e) {
      console.warn(`Product SKU ${prod.sku} note:`, e.message);
    }
  }

  // 2. Seed Initial Admin Users
  console.log('\n👥 Seeding Admin Users...');
  const initialAdmins = [
    {
      name: "Keshav Gandhi",
      email: "keshavgandhi871@gmail.com",
      phone: "9896418148",
      role: "OWNER",
      is_active: true
    },
    {
      name: "Operations Lead",
      email: "operations@veyano.in",
      phone: "9350598909",
      role: "OPERATIONS",
      is_active: true
    },
    {
      name: "Inventory Manager",
      email: "inventory@veyano.in",
      phone: "9350598909",
      role: "INVENTORY_MANAGER",
      is_active: true
    }
  ];

  try {
    for (const adm of initialAdmins) {
      const { error } = await supabase.from('admin_users').upsert(adm, { onConflict: 'email' });
      if (error) console.warn('Admin user seed note:', error.message);
      else console.log(`✅ Seeded admin user: ${adm.email} (${adm.role})`);
    }
  } catch (e) {
    console.warn('Admin users table note:', e.message);
  }

  // 3. Seed Initial Audit Log Entry
  console.log('\n📜 Seeding Initial Audit Log Entry...');
  try {
    const initLog = {
      event_id: `EVT-${Date.now()}-SYS01`,
      action: "SYSTEM_UPGRADED",
      entity_type: "SYSTEM",
      entity_id: "VEYANO_CORE",
      entity_name: "Enterprise Architecture Upgrade",
      actor_name: "Keshav Gandhi",
      actor_email: "keshavgandhi871@gmail.com",
      actor_role: "OWNER",
      reason: "Initial deployment of VEYANO Enterprise Control Platform",
      previous_value: { status: "Legacy Admin" },
      new_value: { status: "Enterprise Control Center v2.0", rbac: "Active", audit: "Active" }
    };
    const { error } = await supabase.from('audit_logs').insert([initLog]);
    if (error) console.warn('Audit log seed note:', error.message);
    else console.log('✅ Seeded initial audit log');
  } catch (e) {
    console.warn('Audit log note:', e.message);
  }

  console.log('\n✨ Database migration and seeding check completed.');
}

runMigration().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
