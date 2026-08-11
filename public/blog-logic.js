/**
 * VEYANO Foods — Blog Content Loader
 * Externalized to comply with Content Security Policy (CSP).
 */

// Scroll position restoration utility
function saveScroll() {
  sessionStorage.setItem('scroll_' + window.location.href, window.scrollY);
}

let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) return;
  scrollTimeout = setTimeout(() => {
    saveScroll();
    scrollTimeout = null;
  }, 100);
});

function restoreScroll() {
  const savedScroll = sessionStorage.getItem('scroll_' + window.location.href);
  if (savedScroll) {
    const scrollPos = parseInt(savedScroll, 10);
    window.scrollTo(0, scrollPos);
    
    // Multiple scroll attempts to handle dynamic layout adjustments as assets load
    setTimeout(() => window.scrollTo(0, scrollPos), 50);
    setTimeout(() => window.scrollTo(0, scrollPos), 150);
    setTimeout(() => window.scrollTo(0, scrollPos), 300);
    setTimeout(() => window.scrollTo(0, scrollPos), 500);
  }
}

async function fetchBlogs() {
  const container = document.getElementById('blog-container');
  if (!container) return; // Exit if not on blog.html

  const API_URL = '/api/blog';
  const LOCAL_BACKEND = 'http://localhost:3001/api/blog';

  try {
    let res;
    try {
      res = await fetch(API_URL);
      if (!res.ok && window.location.hostname === 'localhost') {
        throw new Error('Relative fetch failed on localhost');
      }
    } catch (e) {
      if (window.location.hostname === 'localhost') {
        console.warn('Backend not found at relative path, trying localhost:3001...');
        res = await fetch(LOCAL_BACKEND);
      } else {
        throw e;
      }
    }

    if (!res.ok) throw new Error('API Response Error');
    const blogs = await res.json();
    
    if (!blogs || blogs.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;"><p>No stories found yet. Come back soon!</p></div>';
      return;
    }

    container.innerHTML = blogs.map(post => `
      <div class="blog-card">
        <a href="blog-post.html?slug=${post.slug}">
          <img src="${post.image_url || './assets/plain.png'}" alt="${post.title}" class="blog-card-img">
        </a>
        <div class="blog-card-content">
          <h3 class="blog-card-title">
            <a href="blog-post.html?slug=${post.slug}" style="color: inherit; text-decoration: none;">${post.title}</a>
          </h3>
          <div class="blog-card-meta">
            <span>By ${post.author}</span>
            <span>${new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <a href="blog-post.html?slug=${post.slug}" class="blog-btn">
            Read More
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    `).join('');
    restoreScroll();
  } catch (err) {
    console.error('Blog load error:', err);
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">
        <p style="color: red; margin-bottom: 1rem;">Unable to load stories at this time.</p>
        <p style="font-size: 0.9rem;">Please ensure the backend server is running (npm start) and try refreshing the page.</p>
      </div>
    `;
  }
}

async function fetchPost() {
  const container = document.getElementById('blog-content');
  if (!container) return; // Exit if not on blog-post.html

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    window.location.href = 'blog.html';
    return;
  }

  const API_URL = `/api/blog/${slug}`;
  const LOCAL_BACKEND = `http://localhost:3001/api/blog/${slug}`;

  try {
    let res;
    try {
      res = await fetch(API_URL);
      if (!res.ok && window.location.hostname === 'localhost' && res.status !== 404) {
        throw new Error('Relative fetch failed on localhost');
      }
    } catch (e) {
      if (window.location.hostname === 'localhost') {
        console.warn('Backend not found at relative path, trying localhost:3001...');
        res = await fetch(LOCAL_BACKEND);
      } else {
        throw e;
      }
    }

    if (!res.ok) {
       if (res.status === 404) throw new Error('Not found');
       throw new Error('API Response Error');
    }
    const post = await res.json();
    
    document.title = `${post.title} | Veyano Blog`;

    container.innerHTML = `
      <img src="${post.image_url || './assets/plain.png'}" class="blog-post-hero" alt="${post.title}">
      <div class="blog-post-body">
        <a href="blog.html" class="back-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
          Back to Blogs
        </a>
        <h1 style="margin-top: 1.5rem; font-size: 2.8rem; line-height: 1.2;">${post.title}</h1>
        <div style="margin: 1.5rem 0; color: #888; font-size: 0.9rem;">
          By <strong>${post.author}</strong> &bull; ${new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div class="blog-post-content">
          ${post.content}
        </div>
      </div>
    `;
    restoreScroll();
  } catch (err) {
    console.error('Post load error:', err);
    container.innerHTML = `
      <div class="container" style="text-align: center; padding: 10rem 0;">
        <h2>${err.message === 'Not found' ? 'Story not found' : 'Unable to load story'}</h2>
        <p style="margin: 1rem 0;">${err.message === 'Not found' ? "It seems this page has moved or doesn't exist." : "There was an error connecting to the server. Please ensure the backend is running."}</p>
        <a href="blog.html" class="btn">Return to Blog</a>
      </div>
    `;
  }
}

// Initializers
window.addEventListener('load', () => {
  if (document.getElementById('blog-container')) fetchBlogs();
  if (document.getElementById('blog-content')) fetchPost();
});
