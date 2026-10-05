/**
 * VEYANO Foods — Journal / Blog Logic Controller
 * 
 * Features:
 * - Instant rendering from window.VEYANO_BLOGS (100+ curated articles) with real-time server sync
 * - Complete Category Filtering (All Articles, Makhana, Food Transparency, Snacking, Ingredients)
 * - Prominent publication date display on every card and single article page
 * - Instant search by keyword, ingredient, or topic
 * - Robust single article renderer with related articles recommendation
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL !== undefined)
  ? window.API_BASE_URL
  : ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
    : '');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBlogDate(dateStr) {
  if (!dateStr) return 'Aug 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Aug 2026';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return 'Aug 2026';
  }
}

function categorizeBlog(post) {
  if (post && post.category && ['makhana', 'food transparency', 'snacking', 'ingredients'].includes(post.category.trim().toLowerCase())) {
    const lower = post.category.trim().toLowerCase();
    if (lower === 'makhana') return 'Makhana';
    if (lower === 'food transparency') return 'Food Transparency';
    if (lower === 'snacking') return 'Snacking';
    if (lower === 'ingredients') return 'Ingredients';
  }

  const title = ((post && post.title) || '').toLowerCase();
  const slug = ((post && post.slug) || '').toLowerCase();
  const text = title + ' ' + slug;

  // 1. Food Transparency: Labeling, FSSAI, regulations, deceptive claims, marketing
  if (text.includes('fssai') || text.includes('label') || text.includes('claim') || text.includes('transparency') || text.includes('deception') || text.includes('trust') || text.includes('hfss') || text.includes('fopnl') || text.includes('misleading') || text.includes('unmasking') || text.includes('truth') || text.includes('loophole') || text.includes('front-of-pack') || text.includes('supply chain') || text.includes('marketing') || text.includes('crackdown') || text.includes('warning') || text.includes('back-label') || text.includes('whole grain')) {
    return 'Food Transparency';
  }

  // 2. Ingredients: Specific ingredients, biochemicals, additives, oils, vitamins, minerals
  if (text.includes('palm oil') || text.includes('maltodextrin') || text.includes('sugar') || text.includes('msg') || text.includes('sodium') || text.includes('calcium') || text.includes('fiber') || text.includes('kaempferol') || text.includes('antioxidant') || text.includes('amino acid') || text.includes('seed oil') || text.includes('micronutrient') || text.includes('bioavailability') || text.includes('acrylamide') || text.includes('glycation') || text.includes('cortisol') || text.includes('potassium') || text.includes('electrolyte') || text.includes('preservative') || text.includes('additive')) {
    return 'Ingredients';
  }

  // 3. Makhana: Core makhana superfood guides, benefits, calories, comparison, varieties
  if (text.includes('what is makhana') || text.includes('makhana benefits') || text.includes('makhana calories') || text.includes('makhana protein') || text.includes('is makhana healthy') || text.includes('makhana vs') || text.includes('makhana for weight loss') || text.includes('makhana side effects') || text.includes('fox nuts') || text.includes('lotus seed') || text.includes('makhana science') || text.includes('roasted makhana') || text.includes('plain makhana') || text.includes('store makhana') || text.includes('original makhana') || text.includes('makhana nutrition') || text.includes('makhana calcium') || text.includes('makhana antioxidants') || text.includes('makhana fiber') || text.includes('makhana uric acid') || text.includes('makhana for diabetics')) {
    return 'Makhana';
  }

  // 4. Snacking: Lifestyle snacking, work, workout, kids, family, tea-time, fasting
  if (text.includes('snack') || text.includes('tiffin') || text.includes('office') || text.includes('workout') || text.includes('evening') || text.includes('fasting') || text.includes('fitness') || text.includes('travel') || text.includes('popcorn') || text.includes('chips') || text.includes('weight loss') || text.includes('pcos') || text.includes('diabetic') || text.includes('hypertension') || text.includes('recovery') || text.includes('kids') || text.includes('pregnancy') || text.includes('yoga') || text.includes('sattvic') || text.includes('cognitive') || text.includes('desk') || text.includes('drain') || text.includes('challenge') || text.includes('coding') || text.includes('fuel') || text.includes('plateau') || text.includes('habit')) {
    return 'Snacking';
  }

  return 'Makhana';
}

if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.formatBlogDate = formatBlogDate;
  window.categorizeBlog = categorizeBlog;
}

let activeCategory = 'all';
let activeSearchQuery = '';

function getAllArticles() {
  if (typeof window !== 'undefined' && Array.isArray(window.VEYANO_BLOGS) && window.VEYANO_BLOGS.length > 0) {
    return window.VEYANO_BLOGS.map(a => ({
      ...a,
      category: categorizeBlog(a)
    }));
  }
  return [];
}

async function fetchBlogs() {
  const container = document.getElementById('blog-container');
  if (!container) return;

  // 1. Instant load from preloaded static catalog
  let articles = getAllArticles();
  if (articles.length > 0) {
    window.CURRENT_BLOG_POSTS = articles;
    renderBlogCards(articles, activeCategory, activeSearchQuery);
  }

  // 2. Fetch from backend API to sync latest server records
  try {
    const res = await fetch(`${API_BASE_URL}/api/blog`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        articles = data.map(b => ({
          ...b,
          category: categorizeBlog(b)
        }));
        window.CURRENT_BLOG_POSTS = articles;
        renderBlogCards(articles, activeCategory, activeSearchQuery);
      }
    }
  } catch (err) {
    console.warn('[Blog] API fetch skipped, using local blog database:', err);
  }

  if (!window.CURRENT_BLOG_POSTS || window.CURRENT_BLOG_POSTS.length === 0) {
    window.CURRENT_BLOG_POSTS = articles;
    renderBlogCards(articles, activeCategory, activeSearchQuery);
  }
}

function renderBlogCards(articles, categoryFilter = 'all', searchQuery = '') {
  const container = document.getElementById('blog-container');
  if (!container) return;

  let rawList = (articles && articles.length > 0) ? articles : getAllArticles();
  
  // Guarantee every article has its proper category assigned
  let filtered = rawList.map(a => ({
    ...a,
    category: categorizeBlog(a)
  }));

  // Filter by category
  if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
    const targetCat = categoryFilter.toLowerCase().trim();
    filtered = filtered.filter(a => {
      const cat = (a.category || categorizeBlog(a)).toLowerCase().trim();
      return cat === targetCat;
    });
  }

  // Filter by search query
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(a => {
      const title = (a.title || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      const cat = (a.category || categorizeBlog(a)).toLowerCase();
      return title.includes(q) || excerpt.includes(q) || cat.includes(q);
    });
  }

  // Update counter badge
  const countBadge = document.getElementById('blog-count-badge');
  if (countBadge) {
    const catLabel = categoryFilter === 'all' ? 'All Stories' : categoryFilter;
    countBadge.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'Story' : 'Stories'} in ${catLabel}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔍</div>
        <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem;">No stories found in this category</h3>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
          Try selecting "All Articles" or adjusting your search keyword.
        </p>
        <button class="btn btn-sm btn-outline" onclick="resetBlogFilters()">View All Articles</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(post => {
    const slug = post.slug || post.id;
    const postUrl = `blog-post.html?slug=${encodeURIComponent(slug)}`;
    const imgUrl = post.image_url || './assets/makhana-science.webp';
    const categoryName = post.category || categorizeBlog(post);
    const dateFormatted = formatBlogDate(post.created_at);
    const readTime = post.read_time || '4 min read';
    const author = post.author || 'VEYANO Team';
    const excerpt = post.excerpt || 'Read the full guide on honest snacking, nutrition, and clean roasting.';

    return `
      <article class="blog-card">
        <div class="blog-card-media">
          <a href="${postUrl}" aria-label="${escapeHtml(post.title)}">
            <img src="${imgUrl}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='./assets/makhana-science.webp'">
          </a>
        </div>
        <div class="blog-card-body">
          <div class="blog-meta-row">
            <span class="blog-category-badge">${escapeHtml(categoryName)}</span>
            <span class="blog-meta-dot">•</span>
            <span class="blog-date-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${dateFormatted}
            </span>
            <span class="blog-meta-dot">•</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${readTime}</span>
          </div>

          <h3 class="blog-card-title">
            <a href="${postUrl}">${escapeHtml(post.title)}</a>
          </h3>

          <p class="blog-card-excerpt">
            ${escapeHtml(excerpt)}
          </p>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-top: auto;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">By ${escapeHtml(author)}</span>
            <a href="${postUrl}" style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 600; color: var(--accent-color); display: inline-flex; align-items: center; gap: 4px;">
              Read Story <span>→</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function resetBlogFilters() {
  activeCategory = 'all';
  activeSearchQuery = '';
  const searchInput = document.getElementById('blog-search-input');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('#blog-category-bar .filter-pill').forEach(p => {
    p.classList.toggle('active', p.textContent.trim().toLowerCase() === 'all articles');
  });

  renderBlogCards(window.CURRENT_BLOG_POSTS || getAllArticles(), 'all', '');
}

function filterBlogCategory(cat) {
  activeCategory = cat || 'all';
  document.querySelectorAll('#blog-category-bar .filter-pill').forEach(p => p.classList.remove('active'));
  
  const activeBtn = Array.from(document.querySelectorAll('#blog-category-bar .filter-pill')).find(p => {
    const text = (p.dataset.category || p.textContent).trim().toLowerCase();
    return activeCategory === 'all' 
      ? (text === 'all articles' || text === 'all') 
      : (text === activeCategory.toLowerCase());
  });
  if (activeBtn) activeBtn.classList.add('active');

  const articles = window.CURRENT_BLOG_POSTS || getAllArticles();
  renderBlogCards(articles, activeCategory, activeSearchQuery);
}

if (typeof window !== 'undefined') {
  window.filterBlogCategory = filterBlogCategory;
  window.resetBlogFilters = resetBlogFilters;
  window.renderBlogCards = renderBlogCards;
}

async function fetchPost() {
  const container = document.getElementById('blog-content');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let slug = urlParams.get('slug');

  // Fallback: Check pathname if route is /blog/:slug
  if (!slug) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'blog' && pathParts[1]) {
      slug = pathParts[1];
    }
  }

  if (!slug) {
    window.location.href = 'blog.html';
    return;
  }

  let post = null;

  // 1. Try finding in preloaded catalog first
  const localCatalog = getAllArticles();
  post = localCatalog.find(a => a.slug === slug || a.id === slug);

  // 2. Try fetching from API
  try {
    const res = await fetch(`${API_BASE_URL}/api/blog/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const serverPost = await res.json();
      if (serverPost && serverPost.title) {
        post = serverPost;
      }
    }
  } catch (e) {
    console.warn('[Blog Post] API fetch failed, relying on local article:', e);
  }

  if (!post) {
    container.innerHTML = `
      <div style="text-align: center; padding: 5rem 1rem;">
        <h2 style="font-size: 2rem; margin-bottom: 0.75rem;">Article Not Found</h2>
        <p style="margin: 1rem 0 2rem; color: var(--text-secondary); max-width: 500px; margin-inline: auto;">
          The requested story could not be located. It may have been moved or updated.
        </p>
        <a href="blog.html" class="btn btn-accent">Return to Journal</a>
      </div>
    `;
    return;
  }

  post.category = post.category || categorizeBlog(post);
  const formattedDate = formatBlogDate(post.created_at);

  document.title = `${post.title} | VEYANO Journal`;

  // Find 3 related stories
  const related = localCatalog
    .filter(a => a.slug !== post.slug && a.id !== post.id)
    .slice(0, 3);

  container.innerHTML = `
    <article style="max-width: 820px; margin: 0 auto;">
      <div style="margin-bottom: 1.5rem;">
        <a href="blog.html" style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--accent-color); font-weight: 600; text-decoration: none;">
          ← Back to All Articles
        </a>
      </div>

      <div style="display: inline-block; font-size: 0.8rem; font-weight: 700; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.05em; background: var(--accent-light); padding: 0.35rem 0.75rem; border-radius: var(--radius-full); margin-bottom: 1rem;">
        ${escapeHtml(post.category)}
      </div>

      <h1 style="font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.2; margin-bottom: 1.25rem; color: var(--text-primary); font-family: var(--font-heading);">
        ${escapeHtml(post.title)}
      </h1>

      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 2rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
        <span>By <strong style="color: var(--text-primary);">${escapeHtml(post.author || 'VEYANO Team')}</strong></span>
        <span>•</span>
        <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formattedDate}
        </span>
        <span>•</span>
        <span>${post.read_time || '4 min read'}</span>
      </div>

      <div style="border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 2.5rem; border: 1px solid var(--border-subtle); max-height: 480px;">
        <img src="${post.image_url || './assets/makhana-science.webp'}" alt="${escapeHtml(post.title)}" style="width: 100%; height: 100%; max-height: 480px; object-fit: cover; display: block;" onerror="this.src='./assets/makhana-science.webp'">
      </div>

      <div class="blog-article-content" style="font-size: 1.1rem; line-height: 1.85; color: var(--text-secondary); display: flex; flex-direction: column; gap: 1.25rem;">
        ${post.content || `<p>${escapeHtml(post.excerpt || '')}</p>`}
      </div>

      <!-- Call to Action Banner -->
      <div style="margin-top: 4rem; padding: 2.5rem 2rem; background: linear-gradient(135deg, #fdfbf7 0%, var(--accent-light) 100%); border: 1px solid rgba(192, 139, 92, 0.35); border-radius: var(--radius-lg); text-align: center; box-shadow: var(--shadow-sm);">
        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-color);">Experience Honest Snacking</span>
        <h3 style="font-size: 1.5rem; color: var(--text-primary); margin: 0.5rem 0 0.75rem; font-family: var(--font-heading);">Slow-Roasted Whole Food Makhana</h3>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem; max-width: 540px; margin-inline: auto;">
          0% Palm Oil. 0% Added Sugars. 100% Purity and crunch crafted for mindful high-performers.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="shop.html" class="btn btn-accent" style="padding: 0.75rem 1.75rem;">Shop All Snacks</a>
          <a href="try-veyano.html" class="btn btn-outline" style="padding: 0.75rem 1.75rem;">Try Starter Pack</a>
        </div>
      </div>

      <!-- Related Stories Grid -->
      ${related.length > 0 ? `
        <div style="margin-top: 4rem; border-top: 1px solid var(--border-subtle); padding-top: 3rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h3 style="font-size: 1.4rem; font-family: var(--font-heading);">More from the Journal</h3>
            <a href="blog.html" style="font-size: 0.88rem; font-weight: 600; color: var(--accent-color);">View All →</a>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
            ${related.map(r => `
              <div class="blog-card" style="border-radius: var(--radius-md);">
                <div style="aspect-ratio: 16/10; overflow: hidden; background: var(--bg-subtle);">
                  <a href="blog-post.html?slug=${encodeURIComponent(r.slug || r.id)}">
                    <img src="${r.image_url || './assets/makhana-science.webp'}" alt="${escapeHtml(r.title)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                  </a>
                </div>
                <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
                  <span style="font-size: 0.75rem; font-weight: 600; color: var(--accent-color); margin-bottom: 0.35rem; text-transform: uppercase;">${escapeHtml(r.category || categorizeBlog(r))}</span>
                  <h4 style="font-size: 1rem; line-height: 1.35; margin-bottom: 0.5rem; flex-grow: 1;">
                    <a href="blog-post.html?slug=${encodeURIComponent(r.slug || r.id)}" style="color: inherit;">${escapeHtml(r.title)}</a>
                  </h4>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">
                    <span>${formatBlogDate(r.created_at)}</span>
                    <a href="blog-post.html?slug=${encodeURIComponent(r.slug || r.id)}" style="font-weight: 600; color: var(--accent-color);">Read Story →</a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </article>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('blog-container')) {
    fetchBlogs();

    // Bind category filter clicks
    document.querySelectorAll('#blog-category-bar .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = pill.dataset.category || pill.textContent.trim();
        filterBlogCategory(cat === 'All Articles' ? 'all' : cat);
      });
    });

    // Bind search input
    const searchInput = document.getElementById('blog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeSearchQuery = e.target.value;
        const articles = window.CURRENT_BLOG_POSTS || getAllArticles();
        renderBlogCards(articles, activeCategory, activeSearchQuery);
      });
    }
  }

  if (document.getElementById('blog-content')) {
    fetchPost();
  }
});
