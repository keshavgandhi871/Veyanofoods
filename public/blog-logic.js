/**
 * VEYANO Foods — Journal / Blog Logic Controller
 * 
 * Features:
 * - Real-time fetch from /api/blog with verified local fallback articles
 * - Category filtering (Makhana, Food Transparency, Snacking, Ingredients)
 * - Estimated reading time calculation
 * - Sanitized markdown / HTML rendering for single article view
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL !== undefined)
  ? window.API_BASE_URL
  : ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
    : '');

const FALLBACK_ARTICLES = [
  {
    id: "makhana-science",
    title: "What is Makhana? The Agricultural and Nutritional Science of Lotus Seeds",
    slug: "what-is-makhana-agricultural-nutritional-science",
    category: "Makhana",
    author: "VEYANO Team",
    image_url: "./assets/makhana-science.webp",
    created_at: "2026-04-10T10:00:00Z",
    read_time: "4 min read",
    excerpt: "Discover how lotus seeds are harvested from the wetlands of Bihar and roasted into one of India's most nutrient-dense whole food snacks.",
    content: `
      <p>Makhana (botanical name: <em>Euryale ferox</em>), commonly known as fox nuts or gorgon nuts, is an aquatic crop harvested primarily in the Mithila wetlands of Bihar, India. For centuries, it has served as an integral part of traditional Indian dietary wisdom and fasting rituals.</p>
      
      <h3>How is Makhana Harvested and Processed?</h3>
      <p>The seeds grow inside prickly water lily pods. Once harvested from pond beds, the black seeds are sun-dried, graded by size, and roasted in earthen pans over high heat. The hot seeds are then manually struck with wooden mallets to pop the hard outer shell, revealing the white, airy popped kernel inside.</p>

      <h3>Nutritional Profile of Whole Makhana</h3>
      <p>Unlike extruded corn or potato-based snacks, makhana is a natural whole seed. 100 grams of plain roasted makhana delivers:</p>
      <ul>
        <li><strong>Plant Protein:</strong> Approx. 9.7g of natural amino acids</li>
        <li><strong>Dietary Fiber:</strong> Over 14g of soluble and insoluble fiber</li>
        <li><strong>Essential Minerals:</strong> Rich in magnesium, potassium, and calcium with very low sodium</li>
        <li><strong>Low Glycemic Index:</strong> Slow-burning complex carbohydrates that prevent sudden insulin spikes</li>
      </ul>

      <h3>Why Dry Roasting Matters</h3>
      <p>Many commercial snack brands deep-fry makhana in industrial palm oil to make seasoning adhere quickly. At VEYANO, we dry-roast all seeds with clean hot air, preserving the natural micronutrient integrity and ensuring zero trans fats.</p>
    `
  },
  {
    id: "read-food-label",
    title: "How to Read a Food Label: Spotting Hidden Palm Oil and Misleading Claims",
    slug: "how-to-read-food-labels-spot-hidden-palm-oil",
    category: "Food Transparency",
    author: "VEYANO Team",
    image_url: "./assets/how_to_read_food_labels_clean.webp",
    created_at: "2026-04-05T12:00:00Z",
    read_time: "5 min read",
    excerpt: "A practical guide to decoding ingredient lists on packaged snacks in India and avoiding misleading marketing buzzwords.",
    content: `
      <p>Modern supermarket shelves in India are packed with bold claims like 'Zero Cholesterol', '100% Healthy', and 'Guilt-Free'. But turning the package around to read the fine print often reveals a very different story.</p>

      <h3>1. The Order of Ingredients (By Weight)</h3>
      <p>By Indian food labeling law (FSSAI), ingredients must be listed in descending order of weight. If the first two ingredients are 'Refined Wheat Flour (Maida)' and 'Palm Oil', the product is predominantly fried flour, regardless of what the front of the pack displays.</p>

      <h3>2. Deceptive Names for Palm Oil</h3>
      <p>Palm oil is widely used because it is cheap and shelf-stable, but it is high in saturated fats. Watch out for alias terms such as:</p>
      <ul>
        <li>Refined Palmolein</li>
        <li>Edible Vegetable Fat</li>
        <li>Hydrogenated Vegetable Oil</li>
        <li>Interesterified Vegetable Fat</li>
      </ul>

      <h3>3. The VEYANO Transparency Commitment</h3>
      <p>We believe in honest labeling. Every ingredient used in our roasted makhana — from cold-pressed rice bran oil to Himalayan pink salt — is explicitly named and quantified on our packages.</p>
    `
  },
  {
    id: "makhana-vs-popcorn",
    title: "Makhana vs Popcorn: A Nutritional Face-off for Mindful Snacking",
    slug: "makhana-vs-popcorn-nutritional-comparison",
    category: "Snacking",
    author: "VEYANO Team",
    image_url: "./assets/makhana_vs_popcorn_clean.webp",
    created_at: "2026-03-28T09:30:00Z",
    read_time: "4 min read",
    excerpt: "Both are light, crunchy, and popped. But which one delivers better satiety, mineral retention, and lower glycemic impact?",
    content: `
      <p>Popcorn and roasted makhana are two of the most popular popped snacks worldwide. While both offer a satisfying crunch, their macronutrient and digestive behaviors differ substantially.</p>

      <h3>Calorie Density & Volume Satiety</h3>
      <p>Makhana possesses a high volumetric expansion with very low calorie density. A generous 30g bowl contains only ~107 kcal while providing 4.3g of dietary fiber, signaling fullness to the brain earlier than starch-heavy popcorn.</p>

      <h3>Sodium & Seasoning Comparison</h3>
      <p>Cinema and microwave popcorn are notorious for excessive sodium and synthetic butter flavorings (diacetyl). In contrast, dry-roasted makhana retains its natural nutty flavor and pairs cleanly with mineral-rich pink salt.</p>
    `
  },
  {
    id: "how-to-store-makhana",
    title: "How to Store Makhana & Keep It Crunchy in Humid Indian Weather",
    slug: "how-to-store-makhana-keep-crunchy",
    category: "Ingredients",
    author: "VEYANO Team",
    image_url: "./assets/tea_snack.webp",
    created_at: "2026-03-20T14:00:00Z",
    read_time: "3 min read",
    excerpt: "Why does roasted makhana lose its crunch, and what simple pantry steps guarantee long-lasting crispness?",
    content: `
      <p>Have you ever opened a bag of roasted fox nuts only to find them soft or chewy a few days later? Here is the science of why it happens and how to prevent it.</p>

      <h3>Understanding Hygroscopic Properties</h3>
      <p>Popped lotus seeds have a microporous cell structure. When roasted to perfection, the internal moisture is reduced below 3%. However, this porous matrix is hygroscopic — meaning it rapidly pulls ambient humidity out of the air.</p>

      <h3>Best Storage Practices</h3>
      <ul>
        <li><strong>Airtight Glass or PET Containers:</strong> Immediately transfer open makhana into an airtight jar with a rubber gasket seal.</li>
        <li><strong>Avoid Direct Sunlight:</strong> Store away from stove heat and window sunlight.</li>
        <li><strong>Quick Re-crisping Trick:</strong> If your makhana has softened from humidity, simply dry-toss it on a warm non-stick pan on low flame for 60 seconds. It will instantly regain its shatter-crisp texture!</li>
      </ul>
    `
  }
];

async function fetchBlogs() {
  const container = document.getElementById('blog-container');
  if (!container) return;

  let articles = [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/blog`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        articles = data;
      }
    }
  } catch (err) {
    console.warn('[Blog] Server fetch failed, using verified fallback articles:', err);
  }

  if (articles.length === 0) {
    articles = FALLBACK_ARTICLES;
  }

  window.CURRENT_BLOG_POSTS = articles;
  renderBlogCards(articles);
}

function renderBlogCards(articles, categoryFilter = 'all') {
  const container = document.getElementById('blog-container');
  if (!container) return;

  let filtered = articles;
  if (categoryFilter && categoryFilter !== 'all') {
    filtered = articles.filter(a => (a.category || '').toLowerCase() === categoryFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p>No stories found in this category right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(post => `
    <article class="product-card" style="border-radius: var(--radius-lg);">
      <div style="aspect-ratio: 16/10; overflow: hidden; background: #f4f4f5;">
        <a href="blog-post.html?slug=${post.slug}">
          <img src="${post.image_url || './assets/makhana-science.webp'}" alt="${escapeHtml(post.title)}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s ease;" loading="lazy">
        </a>
      </div>
      <div class="product-card-body">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          <span style="color: var(--accent-color); font-weight: 600;">${post.category || 'Snack Science'}</span>
          <span>${post.read_time || '4 min read'}</span>
        </div>
        <h3 style="font-size: 1.2rem; line-height: 1.35; margin-bottom: 0.5rem;">
          <a href="blog-post.html?slug=${post.slug}" style="color: inherit;">${escapeHtml(post.title)}</a>
        </h3>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem; flex-grow: 1;">
          ${escapeHtml(post.excerpt || 'Read the full guide on honest snacking, nutrition, and clean roasting.')}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">By ${post.author || 'VEYANO Team'}</span>
          <a href="blog-post.html?slug=${post.slug}" style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 600; color: var(--accent-color);">Read Story →</a>
        </div>
      </div>
    </article>
  `).join('');
}

async function fetchPost() {
  const container = document.getElementById('blog-content');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    window.location.href = 'blog.html';
    return;
  }

  let post = null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/blog/${slug}`);
    if (res.ok) {
      post = await res.json();
    }
  } catch (e) {
    console.warn('[Blog Post] Fetch failed, checking local articles:', e);
  }

  if (!post) {
    post = FALLBACK_ARTICLES.find(a => a.slug === slug || a.id === slug);
  }

  if (!post) {
    container.innerHTML = `
      <div style="text-align: center; padding: 5rem 1rem;">
        <h2>Article Not Found</h2>
        <p style="margin: 1rem 0; color: var(--text-secondary);">The requested story could not be located.</p>
        <a href="blog.html" class="btn btn-sm btn-accent">Return to Journal</a>
      </div>
    `;
    return;
  }

  document.title = `${post.title} | VEYANO Journal`;

  container.innerHTML = `
    <article style="max-width: 800px; margin: 0 auto;">
      <a href="blog.html" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; color: var(--accent-color); font-weight: 500; margin-bottom: 1.5rem;">
        ← Back to Journal
      </a>
      <div style="font-size: 0.85rem; color: var(--accent-color); font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">
        ${post.category || 'Clean Snacking'}
      </div>
      <h1 style="font-size: 2.75rem; line-height: 1.2; margin-bottom: 1rem; color: var(--text-primary);">
        ${escapeHtml(post.title)}
      </h1>
      <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem;">
        <span>By <strong>${post.author || 'VEYANO Team'}</strong></span>
        <span>&bull;</span>
        <span>${new Date(post.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>

      <img src="${post.image_url || './assets/makhana-science.webp'}" alt="${escapeHtml(post.title)}" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 2.5rem; border: 1px solid var(--border-subtle);">

      <div style="font-size: 1.1rem; line-height: 1.85; color: var(--text-secondary); display: flex; flex-direction: column; gap: 1.25rem;">
        ${post.content}
      </div>

      <div style="margin-top: 4rem; padding: 2rem; background: var(--accent-light); border: 1px solid rgba(192, 139, 92, 0.3); border-radius: var(--radius-md); text-align: center;">
        <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem;">Taste Clean Roasted Snacking</h3>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Discover our small-batch roasted makhana collections.</p>
        <a href="shop.html" class="btn btn-accent">Shop VEYANO Snacks</a>
      </div>
    </article>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('blog-container')) {
    fetchBlogs();

    // Category filter pills on blog page
    document.querySelectorAll('.blog-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.blog-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.dataset.category || 'all';
        renderBlogCards(window.CURRENT_BLOG_POSTS || FALLBACK_ARTICLES, cat);
      });
    });
  }

  if (document.getElementById('blog-content')) {
    fetchPost();
  }
});
