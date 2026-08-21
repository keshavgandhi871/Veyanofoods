/**
 * VEYANO Foods — Centralized Product Catalog & SKU Data Layer
 * 
 * Features:
 * - Complete data schema for all current and future snack SKUs
 * - Comprehensive nutritional facts, ingredient transparency, oil disclosures, and FSSAI data
 * - Future-proof category support (Makhana, Roasted Snacks, Trial Packs, Combos)
 * - Isomorphic: usable in browser (window.VeyanoProducts) and Node.js backend (module.exports)
 * - LocalStorage persistence layer for no-code Admin management
 */

const DEFAULT_PRODUCTS = [
  {
    id: "classic-plain",
    slug: "classic-plain",
    sku: "PLAIN",
    name: "Classic Plain Roasted Makhana",
    category: "makhana",
    categoryName: "Roasted Makhana",
    price: 399,
    mrp: 399,
    weight: "200g",
    short_description: "Pure, slow-roasted fox nuts with a crisp, airy crunch. 0% added oil.",
    description: "Our signature Classic Plain Roasted Makhana is crafted from premium lotus seeds harvested in the wetlands of Mithila. Slowly dry-roasted using hot air without a single drop of added oil, it delivers a clean, delicate crunch that lets the natural earthy flavor of the seed shine through. An exceptional whole-food canvas for mindful everyday snacking.",
    images: [
      "./assets/plain.webp",
      "./assets/plain_hover.webp",
      "./assets/real_food_makhana.webp"
    ],
    hoverImage: "./assets/plain_hover.webp",
    ingredients: "100% Premium Grade Lotus Seeds (Fox Nuts / Makhana).",
    nutrition: {
      serving_size: "30g",
      servings_per_pack: "Approx. 6.6",
      per_100g: {
        energy: "356 kcal",
        protein: "9.7 g",
        carbohydrates: "77.2 g",
        dietary_fiber: "14.5 g",
        total_sugar: "0.0 g",
        added_sugar: "0.0 g",
        total_fat: "0.5 g",
        saturated_fat: "0.1 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "2.1 mg",
        calcium: "60.0 mg",
        iron: "1.4 mg"
      },
      per_serving: {
        energy: "106.8 kcal",
        protein: "2.9 g",
        carbohydrates: "23.1 g",
        dietary_fiber: "4.3 g",
        total_sugar: "0.0 g",
        added_sugar: "0.0 g",
        total_fat: "0.15 g",
        saturated_fat: "0.03 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "0.6 mg"
      }
    },
    allergens: "Naturally Gluten-Free & Vegan. Processed in a clean facility that handles seeds.",
    oil_information: "0% Added Oil. 100% Dry Hot-Air Roasted. Never deep-fried.",
    preservative_information: "Zero artificial preservatives, zero synthetic additives, zero MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from the date of packaging.",
    storage_instructions: "Store in an airtight container in a cool, dry place away from moisture and direct sunlight. Re-seal pack immediately after opening to preserve crispness.",
    taste_profile: "Light, earthy, naturally nutty with an airy, shatter-crisp crunch.",
    why_you_will_like_it: [
      "100% Dry roasted with hot air — zero added oil or frying",
      "High natural dietary fiber (14.5g / 100g) that promotes gentle satiety",
      "Virtually sodium-free (2.1mg / 100g) for mindful cardiovascular diets",
      "Pure single-ingredient food with complete transparency"
    ],
    stock: 200,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false
  },
  {
    id: "lightly-salted",
    slug: "lightly-salted",
    sku: "SALTED",
    name: "Lightly Salted Roasted Makhana",
    category: "makhana",
    categoryName: "Roasted Makhana",
    price: 399,
    mrp: 399,
    weight: "200g",
    short_description: "Slow-roasted fox nuts seasoned with natural mineral-rich Himalayan pink salt.",
    description: "For those who appreciate a perfectly balanced savory snack. We gently slow-roast large-grade makhana to peak crispness, apply a feather-light mist (<1%) of cold-pressed rice bran oil strictly to allow seasoning adhesion, and dust with pure Himalayan pink salt. Clean, satisfying, and free from palm oil or chemical flavor boosters.",
    images: [
      "./assets/salted.webp",
      "./assets/salted_hover.webp",
      "./assets/real_food_makhana.webp"
    ],
    hoverImage: "./assets/salted_hover.webp",
    ingredients: "Premium Grade Lotus Seeds (Makhana), Himalayan Pink Salt, Cold-Pressed Rice Bran Oil (less than 1% mist used strictly for seasoning adhesion).",
    nutrition: {
      serving_size: "30g",
      servings_per_pack: "Approx. 6.6",
      per_100g: {
        energy: "364 kcal",
        protein: "9.5 g",
        carbohydrates: "76.8 g",
        dietary_fiber: "14.2 g",
        total_sugar: "0.0 g",
        added_sugar: "0.0 g",
        total_fat: "1.2 g",
        saturated_fat: "0.3 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "380.0 mg",
        calcium: "58.0 mg",
        iron: "1.4 mg"
      },
      per_serving: {
        energy: "109.2 kcal",
        protein: "2.8 g",
        carbohydrates: "23.0 g",
        dietary_fiber: "4.2 g",
        total_sugar: "0.0 g",
        added_sugar: "0.0 g",
        total_fat: "0.36 g",
        saturated_fat: "0.09 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "114.0 mg"
      }
    },
    allergens: "Naturally Gluten-Free. Processed in a clean facility that handles seeds.",
    oil_information: "Zero Palm Oil. Minimal Cold-Pressed Rice Bran Oil mist (<1%) used strictly for salt adhesion.",
    preservative_information: "Zero artificial preservatives, zero MSG, zero artificial flavor enhancers.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from the date of packaging.",
    storage_instructions: "Store in an airtight container in a cool, dry place away from direct sunlight.",
    taste_profile: "Balanced mineral saltiness with an addictive, delicate crunch.",
    why_you_will_like_it: [
      "Natural Himalayan pink salt containing essential trace minerals",
      "Zero palm oil — only a minimal non-hydrogenated rice bran oil mist",
      "Satisfies 4 PM savory cravings without fried heaviness",
      "No greasy fingers or heavy post-snack aftertaste"
    ],
    stock: 200,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false
  },
  {
    id: "fiery-peri-peri",
    slug: "fiery-peri-peri",
    sku: "PERIPERI",
    name: "Fiery Peri-Peri Roasted Makhana",
    category: "makhana",
    categoryName: "Roasted Makhana",
    price: 399,
    mrp: 399,
    weight: "200g",
    short_description: "Zesty, bold peri-peri spice blend over crunchy slow-roasted fox nuts.",
    description: "Crafted for lovers of bold, vibrant Indian and African chili notes. Slow-roasted makhana coated with our house-crafted peri-peri spice blend — featuring sun-dried red chili, crushed black pepper, toasted garlic, onion flakes, and zesty citrus notes. An energetic crunch that packs genuine punch without MSG or artificial colorants.",
    images: [
      "./assets/periperi.webp",
      "./assets/periperi_hover.webp",
      "./assets/real_food_makhana.webp"
    ],
    hoverImage: "./assets/periperi_hover.webp",
    ingredients: "Premium Grade Lotus Seeds (Makhana), Peri-Peri Seasoning Blend (Red Chili, Garlic, Onion, Black Pepper, Oregano, Citric Acid), Himalayan Pink Salt, Cold-Pressed Rice Bran Oil (<1.5% mist).",
    nutrition: {
      serving_size: "30g",
      servings_per_pack: "Approx. 6.6",
      per_100g: {
        energy: "372 kcal",
        protein: "9.4 g",
        carbohydrates: "75.5 g",
        dietary_fiber: "13.8 g",
        total_sugar: "1.2 g",
        added_sugar: "0.0 g",
        total_fat: "1.8 g",
        saturated_fat: "0.4 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "490.0 mg",
        calcium: "56.0 mg",
        iron: "1.6 mg"
      },
      per_serving: {
        energy: "111.6 kcal",
        protein: "2.8 g",
        carbohydrates: "22.6 g",
        dietary_fiber: "4.1 g",
        total_sugar: "0.36 g",
        added_sugar: "0.0 g",
        total_fat: "0.54 g",
        saturated_fat: "0.12 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "147.0 mg"
      }
    },
    allergens: "Naturally Gluten-Free. Contains garlic, onion, and spices.",
    oil_information: "Zero Palm Oil. Minimal Cold-Pressed Rice Bran Oil mist (<1.5%) for spice adhesion.",
    preservative_information: "Zero artificial preservatives, zero synthetic colors, zero MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from the date of packaging.",
    storage_instructions: "Store in an airtight container in a cool, dry place. Keep seal closed tightly.",
    taste_profile: "Bold, tangy, spicy with a fragrant roasted garlic and herb finish.",
    why_you_will_like_it: [
      "Real kitchen spices — no maltodextrin bulking agents or synthetic colors",
      "Exciting, lively kick that satisfies junk-food cravings with whole food",
      "Zero deep-frying, zero hydrogenated vegetable fats",
      "Clean post-snack digestive feel"
    ],
    stock: 200,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: false
  },
  {
    id: "ultimate-combo",
    slug: "ultimate-combo",
    sku: "COMBO",
    name: "The Trio Discovery Combo",
    category: "combos",
    categoryName: "Combos & Bundles",
    price: 999,
    mrp: 1197,
    weight: "3 x 200g (600g Total)",
    short_description: "Complete signature collection: Classic Plain, Lightly Salted, and Fiery Peri-Peri.",
    description: "The complete VEYANO roasted makhana tasting experience. Includes three full-sized 200g packs: one Classic Plain, one Lightly Salted, and one Fiery Peri-Peri. Perfect for sharing with family, stocking the office pantry, or exploring every flavor profile across different moods and occasions. Unlocks automatic FREE pan-India delivery.",
    images: [
      "./assets/combo.webp",
      "./assets/combo_hover.webp",
      "./assets/real_food_makhana.webp"
    ],
    hoverImage: "./assets/combo_hover.webp",
    ingredients: "Pack includes 3 individual jars/pouches: 1 x Classic Plain (200g), 1 x Lightly Salted (200g), 1 x Fiery Peri-Peri (200g). See individual packs for full ingredient breakdowns.",
    nutrition: {
      serving_size: "30g",
      servings_per_pack: "20 Servings Total",
      per_100g: {
        energy: "364 kcal (avg)",
        protein: "9.5 g",
        carbohydrates: "76.5 g",
        dietary_fiber: "14.1 g",
        total_sugar: "0.4 g",
        added_sugar: "0.0 g",
        total_fat: "1.2 g",
        saturated_fat: "0.27 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "290.0 mg (avg)"
      },
      per_serving: {
        energy: "109.2 kcal",
        protein: "2.8 g",
        carbohydrates: "22.9 g",
        dietary_fiber: "4.2 g",
        total_sugar: "0.12 g",
        added_sugar: "0.0 g",
        total_fat: "0.36 g",
        saturated_fat: "0.08 g",
        trans_fat: "0.0 g",
        cholesterol: "0.0 mg",
        sodium: "87.0 mg"
      }
    },
    allergens: "Naturally Gluten-Free. See individual variant details.",
    oil_information: "Zero Palm Oil. Dry roasted / minimal non-hydrogenated rice bran oil mist.",
    preservative_information: "Zero artificial preservatives, zero MSG, zero synthetic colors across all 3 packs.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "6 Months from the date of packaging.",
    storage_instructions: "Store in airtight containers in a cool, dry place.",
    taste_profile: "Experience all 3 signatures: pure earthy crunch, subtle pink salt, and zesty peri-peri.",
    why_you_will_like_it: [
      "Maximum value bundle — saves ₹298 compared to buying 3 individual jars",
      "Instantly unlocks FREE Pan-India Shipping at checkout",
      "Great variety for household members with different snacking preferences",
      "Thoughtfully packed to lock in freshness"
    ],
    stock: 150,
    stock_status: "in_stock",
    is_featured: true,
    is_new: false,
    is_trial: false,
    is_combo: true
  },
  {
    // IMPORTANT: This product is NOT currently available for sale.
    // It is preserved for future activation when smaller trial packs are ready to launch.
    // To activate: change stock_status to 'in_stock', set a real price, and add actual stock.
    id: "discovery-trial-sampler",
    slug: "discovery-trial-sampler",
    sku: "TRIAL-SAMPLER",
    name: "VEYANO Discovery Trial Sampler",
    category: "trial-packs",
    categoryName: "Trial Packs",
    price: null,           // NOT FOR SALE — no price set until launch
    mrp: null,             // NOT FOR SALE — no MRP until actual packaging is ready
    weight: "To be decided",
    short_description: "Trial packs are coming soon. We're working on smaller formats so you can try VEYANO before committing to a larger pack.",
    description: "New to VEYANO? We understand that buying a 200g jar from a new brand is a leap of faith. We are working on smaller trial pack formats so you can experience our clean roasted crunch before committing to a full-sized jar. Watch this space.",
    images: [
      "./assets/makhana_hero_1775492594943.webp"
    ],
    hoverImage: "./assets/makhana_hero_1775492594943.webp",
    ingredients: "To be confirmed at launch.",
    nutrition: null,
    allergens: "To be confirmed at launch.",
    oil_information: "Zero Palm Oil.",
    preservative_information: "Zero artificial preservatives or MSG.",
    fssai_information: "FSSAI Lic. No. 20826010000397",
    shelf_life: "To be confirmed at launch.",
    storage_instructions: "To be confirmed at launch.",
    taste_profile: "All three VEYANO signatures in one discovery pack.",
    why_you_will_like_it: [],
    stock: 0,
    stock_status: "coming_soon",  // Controls availability across all storefront pages
    is_featured: false,            // Hidden from main product grids
    is_new: false,
    is_trial: true,
    is_combo: false
  }
];

// Client-side Catalog Management (supports localStorage overrides from Admin panel)
class VeyanoCatalogService {
  constructor() {
    this.storageKey = 'veyano_custom_catalog';
  }

  getAll() {
    if (typeof window !== 'undefined') {
      try {
        const custom = localStorage.getItem(this.storageKey);
        if (custom) {
          const parsed = JSON.parse(custom);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error loading custom catalog from localStorage:', e);
      }
    }
    return DEFAULT_PRODUCTS;
  }

  getByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    const clean = String(idOrSlug).toLowerCase().trim();
    const catalog = this.getAll();
    return catalog.find(p => 
      (p.id && p.id.toLowerCase() === clean) || 
      (p.slug && p.slug.toLowerCase() === clean) || 
      (p.sku && p.sku.toLowerCase() === clean)
    ) || null;
  }

  getByCategory(category) {
    const catalog = this.getAll();
    if (!category || category === 'all') return catalog;
    if (category === 'trial-packs' || category === 'trial') return catalog.filter(p => p.is_trial);
    if (category === 'combos' || category === 'combo') return catalog.filter(p => p.is_combo);
    if (category === 'new') return catalog.filter(p => p.is_new);
    return catalog.filter(p => p.category === category);
  }

  upsertProduct(product) {
    if (typeof window === 'undefined') return;
    const current = [...this.getAll()];
    const index = current.findIndex(p => p.id === product.id || p.slug === product.slug);
    if (index !== -1) {
      current[index] = { ...current[index], ...product };
    } else {
      current.push(product);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  deleteProduct(productId) {
    if (typeof window === 'undefined') return;
    const current = this.getAll().filter(p => p.id !== productId && p.slug !== productId);
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  resetDefaults() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }
}

const catalogService = new VeyanoCatalogService();

if (typeof window !== 'undefined') {
  window.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
  window.VeyanoProducts = catalogService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PRODUCTS,
    VeyanoCatalogService,
    catalogService
  };
}
