/**
 * server/services/productMasterService.js — Central Product Master Engine
 * Single source of truth for products, pricing, stock levels, and price change history.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { logAuditEvent } = require('./auditLogger');
const { recordInventoryMovement } = require('./inventoryService');

const LOCAL_PRODUCTS_FILE = path.join(__dirname, '../../scratch/product_catalog.json');
const LOCAL_PRICE_HISTORY_FILE = path.join(__dirname, '../../scratch/price_history.json');

let inMemoryProducts = [];
let inMemoryPriceHistory = [];

const INITIAL_CATALOG = [
  {
    id: "classic-plain",
    sku: "PLAIN-200",
    slug: "classic-plain",
    name: "Classic Plain Roasted Makhana",
    product_name: "Classic Plain Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    cost_price: 180,
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
    allergens: "Naturally Gluten-Free & Vegan.",
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
    id: "lightly-salted",
    sku: "SALTED-200",
    slug: "lightly-salted",
    name: "Lightly Salted Roasted Makhana",
    product_name: "Lightly Salted Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    cost_price: 185,
    weight: "200g",
    short_description: "Slow-roasted fox nuts seasoned with natural mineral-rich Himalayan pink salt.",
    description: "For those who appreciate a perfectly balanced savory snack. We gently slow-roast large-grade makhana to peak crispness, apply a feather-light mist (<1%) of cold-pressed rice bran oil strictly to allow seasoning adhesion, and dust with pure Himalayan pink salt.",
    ingredients: "Premium Lotus Seeds (Fox Nuts), Himalayan Pink Salt, Cold-Pressed Rice Bran Oil (<1%).",
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
    id: "fiery-peri-peri",
    sku: "PERIPERI-200",
    slug: "fiery-peri-peri",
    name: "Fiery Peri-Peri Roasted Makhana",
    product_name: "Fiery Peri-Peri Roasted Makhana",
    category: "makhana",
    category_name: "Roasted Makhana",
    price: 399,
    price_paise: 39900,
    mrp: 399,
    cost_price: 195,
    weight: "200g",
    short_description: "Zesty African bird's eye chili and garlic infused roasted makhana with a bold kick.",
    description: "An invigorating fusion of artisanal hot-air roasted fox nuts tossed with authentic peri-peri spice blend: red chili flakes, crushed garlic, ground onion, tangy citric crystals, and black pepper.",
    ingredients: "Premium Lotus Seeds (Fox Nuts), Peri-Peri Seasoning, Cold-Pressed Rice Bran Oil (<1.5%).",
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
    id: "ultimate-combo",
    sku: "COMBO-600",
    slug: "ultimate-combo",
    name: "The Trio Discovery Combo",
    product_name: "The Trio Discovery Combo",
    category: "combos",
    category_name: "Combos & Bundles",
    price: 999,
    price_paise: 99900,
    mrp: 1197,
    cost_price: 520,
    weight: "3 x 200g (600g Total)",
    short_description: "Complete signature collection: Classic Plain, Lightly Salted, and Fiery Peri-Peri.",
    description: "The complete VEYANO roasted makhana tasting experience. Includes three full-sized 200g packs: one Classic Plain, one Lightly Salted, and one Fiery Peri-Peri.",
    ingredients: "1 x Classic Plain (200g), 1 x Lightly Salted (200g), 1 x Fiery Peri-Peri (200g).",
    nutrition: {
      serving_size: "30g",
      energy: "364 kcal (avg)",
      protein: "9.5g",
      carbohydrates: "76.5g",
      dietary_fiber: "14.1g",
      total_fat: "1.2g",
      sodium: "290.0mg"
    },
    allergens: "Naturally Gluten-Free.",
    oil_information: "Zero Palm Oil.",
    preservative_information: "Zero artificial preservatives.",
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
    id: "discovery-trial-sampler",
    sku: "TRIAL-SAMPLER",
    slug: "discovery-trial-sampler",
    name: "VEYANO Discovery Trial Sampler",
    product_name: "VEYANO Discovery Trial Sampler",
    category: "trial-packs",
    category_name: "Trial Packs",
    price: null,
    price_paise: 0,
    mrp: null,
    cost_price: null,
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

function initProductMaster() {
  try {
    const dir = path.dirname(LOCAL_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_PRODUCTS_FILE, 'utf8');
      inMemoryProducts = JSON.parse(raw || '[]');
    }
    if (!inMemoryProducts || inMemoryProducts.length === 0) {
      inMemoryProducts = INITIAL_CATALOG;
      fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(inMemoryProducts, null, 2));
    }

    if (fs.existsSync(LOCAL_PRICE_HISTORY_FILE)) {
      const rawHistory = fs.readFileSync(LOCAL_PRICE_HISTORY_FILE, 'utf8');
      inMemoryPriceHistory = JSON.parse(rawHistory || '[]');
    }
  } catch (e) {
    inMemoryProducts = INITIAL_CATALOG;
  }
}

initProductMaster();

function getAllProducts({ includeInactive = false } = {}) {
  if (includeInactive) return inMemoryProducts;
  return inMemoryProducts.filter(p => p.is_active !== false);
}

function getProductByIdOrSlug(idOrSlug) {
  if (!idOrSlug) return null;
  const match = idOrSlug.toLowerCase();
  return inMemoryProducts.find(p => 
    (p.id && p.id.toLowerCase() === match) ||
    (p.slug && p.slug.toLowerCase() === match) ||
    (p.sku && p.sku.toLowerCase() === match)
  ) || null;
}

/**
 * Upsert or edit product with audit and price tracking
 */
async function upsertProduct(productData, { actorName = 'Admin', actorEmail = 'admin@veyano.in', actorRole = 'OWNER', reason = '' } = {}) {
  const existingIdx = inMemoryProducts.findIndex(p => p.id === productData.id || p.sku === productData.sku);
  const oldProduct = existingIdx !== -1 ? inMemoryProducts[existingIdx] : null;

  const updatedProduct = {
    ...(oldProduct || {}),
    ...productData,
    price_paise: productData.price ? productData.price * 100 : (oldProduct ? oldProduct.price_paise : 0),
    is_active: productData.is_active !== undefined ? productData.is_active : true
  };

  // Check for Price or MRP change
  if (oldProduct && (oldProduct.price !== updatedProduct.price || oldProduct.mrp !== updatedProduct.mrp)) {
    const historyEntry = {
      id: `PH-${Date.now()}`,
      sku: updatedProduct.sku,
      product_name: updatedProduct.name || updatedProduct.product_name,
      old_price: oldProduct.price,
      new_price: updatedProduct.price,
      old_mrp: oldProduct.mrp,
      new_mrp: updatedProduct.mrp,
      changed_by: `${actorName} (${actorRole})`,
      reason: reason || 'Price updated in catalog',
      created_at: new Date().toISOString()
    };

    inMemoryPriceHistory.unshift(historyEntry);
    try {
      fs.writeFileSync(LOCAL_PRICE_HISTORY_FILE, JSON.stringify(inMemoryPriceHistory, null, 2));
    } catch (e) {}

    await logAuditEvent({
      actorName,
      actorEmail,
      actorRole,
      action: 'PRODUCT_PRICE_CHANGED',
      entityType: 'PRODUCT',
      entityId: updatedProduct.sku,
      entityName: updatedProduct.name,
      previousValue: { price: oldProduct.price, mrp: oldProduct.mrp },
      newValue: { price: updatedProduct.price, mrp: updatedProduct.mrp },
      reason: reason || 'Price modified'
    });
  }

  // Check for stock change
  if (oldProduct && oldProduct.stock !== updatedProduct.stock) {
    const delta = updatedProduct.stock - oldProduct.stock;
    await recordInventoryMovement({
      sku: updatedProduct.sku,
      productName: updatedProduct.name,
      quantityDelta: delta,
      beforeQuantity: oldProduct.stock,
      afterQuantity: updatedProduct.stock,
      movementType: delta > 0 ? 'ADJUSTMENT' : 'DAMAGE',
      reason: reason || 'Stock level adjusted in catalog editor',
      createdBy: actorName,
      creatorEmail: actorEmail,
      creatorRole: actorRole
    });
  }

  if (existingIdx !== -1) {
    inMemoryProducts[existingIdx] = updatedProduct;
  } else {
    inMemoryProducts.push(updatedProduct);
    await logAuditEvent({
      actorName,
      actorEmail,
      actorRole,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: updatedProduct.sku,
      entityName: updatedProduct.name,
      newValue: updatedProduct,
      reason: reason || 'New SKU created'
    });
  }

  // Persist locally
  try {
    fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(inMemoryProducts, null, 2));
  } catch (e) {}

  // Sync to Supabase products table
  try {
    await supabase.from('products').upsert({
      sku: updatedProduct.sku,
      product_name: updatedProduct.name || updatedProduct.product_name,
      price_paise: updatedProduct.price_paise,
      stock_quantity: updatedProduct.stock || 0,
      details: updatedProduct.description,
      image_url: updatedProduct.images?.[0]
    }, { onConflict: 'sku' });
  } catch (e) {}

  return updatedProduct;
}

function getPriceHistory(sku = null) {
  if (sku) return inMemoryPriceHistory.filter(p => p.sku === sku);
  return inMemoryPriceHistory;
}

module.exports = {
  getAllProducts,
  getProductByIdOrSlug,
  upsertProduct,
  getPriceHistory
};
