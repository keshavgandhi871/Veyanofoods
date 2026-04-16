const productData = {
  plain: { id: "plain", title: "Classic Plain Makhana", price: 399, mrp: 799, hoverImage: "./assets/plain_hover.png", image: "./assets/plain.png", ingredients: "Premium Grade Fox Nuts (Makhana)." },
  salted: { id: "salted", title: "Lightly Salted Makhana", price: 399, mrp: 799, hoverImage: "./assets/salted_hover.png", image: "./assets/salted.png", ingredients: "Premium Grade Fox Nuts (Makhana), Himalayan Pink Salt, Rice Bran Oil." },
  periperi: { id: "periperi", title: "Fiery Peri-Peri Makhana", price: 399, mrp: 799, hoverImage: "./assets/periperi_hover.png", image: "./assets/periperi.png", ingredients: "Premium Grade Fox Nuts (Makhana), Peri-Peri Spice Blend, Rice Bran Oil." },
  combo: { id: "combo", title: "The Ultimate Combo Pack", price: 999, mrp: 2397, hoverImage: "./assets/combo_hover.png", image: "./assets/combo.png", ingredients: "Contains Plain, Salted, and Peri-Peri 200g Packs." }
};

let clerk = null;
const CLERK_PUBLISHABLE_KEY = 'pk_test_cG9ldGljLWJ1enphcmQtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA';

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

const API_BASE_URL = 'http://localhost:3001';
let cart = JSON.parse(localStorage.getItem('veyano_cart')) || [];
let currentUser = null;

async function saveCart() {
  localStorage.setItem('veyano_cart', JSON.stringify(cart));
  updateCartUI();
}

async function fetchUserCart() {}

function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const deliveryEl = document.getElementById('cart-delivery');
  const totalEl = document.getElementById('cart-total');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if(cartCount) cartCount.textContent = totalItems;

  let subtotal = 0;
  if (cart.length > 0) {
    cart.forEach(item => { subtotal += item.price * item.quantity; });
  }

  const subtotalVal = subtotal;
  const deliveryFee = subtotalVal === 0 ? 0 : (subtotalVal >= 499 ? 0 : 50);
  const paymentMethod = (document.querySelector('input[name="paymentMethod"]:checked')?.value) || 'cod'; 
  const codFee = (subtotalVal === 0 || paymentMethod !== 'cod') ? 0 : 79;
  const total = subtotalVal + deliveryFee + codFee;

  // 1. Update List Container
  if (cartItemsContainer) {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
    } else {
      cartItemsContainer.innerHTML = '';
      cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
          <img src="${item.image}" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">₹${item.price}</div>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="window.updateQty('${item.id}', -1)">-</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" onclick="window.updateQty('${item.id}', 1)">+</button>
              <button class="qty-btn" style="margin-left:auto; border:none; color:red;" onclick="window.removeCartItem('${item.id}')">✕</button>
            </div>
          </div>
        `;
        cartItemsContainer.appendChild(itemEl);
      });
    }
  }

  // 2. Track Free Delivery Milestone & Party Popper
  if (typeof confetti === 'function') {
    const isCartOpen = document.getElementById('cart-drawer')?.classList.contains('open');
    if (subtotalVal >= 499) {
      if (!window.freeDeliveryUnlocked) {
        window.freeDeliveryUnlocked = true;
        window.celebrationPending = true;
      }
      // Only blast if cart is open AND one is pending
      if (isCartOpen && window.celebrationPending) {
        window.celebrationPending = false;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FF9900', '#FFCC00', '#FFFFFF', '#000000'], zIndex: 2000 });
      }
    } else {
      window.freeDeliveryUnlocked = false;
      window.celebrationPending = false;
    }
  }

  // 3. Update Progress Bar
  const progSection = document.getElementById('cart-progress-section');
  const progText = document.getElementById('cart-progress-text');
  const progBar = document.getElementById('cart-progress-bar');
  if (progSection && progText && progBar) {
    if (subtotalVal === 0) {
      progSection.style.display = 'none';
      progBar.style.width = '0%';
    } else {
      progSection.style.display = 'block';
      const remaining = 499 - subtotalVal;
      if (remaining > 0) {
        progText.textContent = `Add ₹${remaining} more for FREE DELIVERY`;
        progBar.style.width = `${Math.min((subtotalVal / 499) * 100, 100)}%`;
      } else {
        progText.textContent = `You've unlocked FREE DELIVERY!`;
        progBar.style.width = `100%`;
      }
    }
  }

  // 4. Update Summary
  if(subtotalEl) subtotalEl.textContent = `₹${subtotalVal}`;
  if(deliveryEl) deliveryEl.textContent = deliveryFee > 0 ? `₹${deliveryFee}` : (subtotalVal === 0 ? '₹0' : 'FREE');

  // Robust Step Detection: Only show fees if Shipping Step is active
  const shippingStep = document.getElementById('cart-step-shipping');
  const isShippingStep = shippingStep && (shippingStep.style.display === 'block');
  
  const deliveryRow = document.getElementById('sidebar-delivery-row');
  const codRow = document.getElementById('cod-fee-row-summary');
  const incentiveMsg = document.getElementById('checkout-incentive-msg');

  if (isShippingStep) {
    // Final Checkout View: Show Fees
    if (deliveryRow) deliveryRow.style.display = deliveryFee > 0 ? 'flex' : 'none';
    if (codRow) {
      codRow.style.display = codFee > 0 ? 'flex' : 'none';
      const codDisp = document.getElementById('cart-cod-fee');
      if (codDisp) codDisp.textContent = `₹${codFee}`;
    }
    if (totalEl) totalEl.textContent = `₹${total}`;
    if (incentiveMsg) incentiveMsg.style.display = 'block';
  } else {
    // Sidebar View: Hide Fees
    if (deliveryRow) deliveryRow.style.display = 'none';
    if (codRow) codRow.style.display = 'none';
    if (totalEl) totalEl.textContent = `₹${subtotalVal}`;
    if (incentiveMsg) incentiveMsg.style.display = 'none';
  }
}

window.updateQty = (id, delta) => {
  const itemIndex = cart.findIndex(i => i.id === id);
  if (itemIndex !== -1) {
    cart[itemIndex].quantity += delta;
    if (cart[itemIndex].quantity <= 0) cart.splice(itemIndex, 1);
    saveCart();
  }
};

window.removeCartItem = (id) => {
  cart = cart.filter(i => i.id !== id);
  saveCart();
};

window.addToCart = (id) => {
  const product = productData[id];
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  saveCart();
  showToast(`${product.title} added to cart!`);
};

// --- AUTH LOGIC ---
async function initClerk() {
  if (window.Clerk) {
    clerk = window.Clerk;
    try {
      await clerk.load();
      console.log('Clerk SDK Loaded');
      
      clerk.addListener(({ user }) => {
        console.log('Auth Listener fired. User:', user);
        updateAuthUI(user);
        updateCartUI();
        if (user) syncUserWithBackend();
      });

      if (clerk.user) {
        console.log('Initial User detected');
        updateAuthUI(clerk.user);
        syncUserWithBackend();
      } else {
        console.log('Initial Guest detected');
        updateAuthUI(null);
      }
    } catch (err) {
      console.error('Clerk Initialization Error:', err);
    }
  } else {
    setTimeout(initClerk, 100);
  }
}

function updateAuthUI(user) {
  console.log('Updating UI for user:', user);
  const authContainer = document.getElementById('clerk-auth-container');
  const profileBar = document.getElementById('user-profile-bar');
  const userButtonContainer = document.getElementById('clerk-user-button');
  const navAuthContainer = document.getElementById('nav-auth-container');

  if (user) {
    // Drawer UI
    if (authContainer) authContainer.style.display = 'none';
    if (profileBar) profileBar.style.display = 'flex';
    if (userButtonContainer && clerk) {
      clerk.mountUserButton(userButtonContainer);
    }

    // Navbar UI
    if (navAuthContainer && clerk) {
      navAuthContainer.innerHTML = '<div id="nav-user-button"></div>';
      clerk.mountUserButton(document.getElementById('nav-user-button'));
    }

    // Login Page Redirect
    if (window.location.pathname.includes('login.html')) {
      window.location.href = 'index.html';
    }

    const shipName = document.getElementById('ship-name');
    const shipEmail = document.getElementById('ship-email');
    if (shipName && !shipName.value) shipName.value = user.fullName || user.firstName || '';
    if (shipEmail && !shipEmail.value) shipEmail.value = user.primaryEmailAddress?.emailAddress || '';
  } else {
    // Drawer UI
    if (authContainer) authContainer.style.display = 'block';
    if (profileBar) profileBar.style.display = 'none';
    mountClerkSignIn();

    // Navbar UI
    if (navAuthContainer) {
      navAuthContainer.innerHTML = '<a href="login.html" class="nav-login-link">Login</a>';
    }

    // Standalone Login Page UI
    mountPageSignIn();
  }
}

function mountClerkSignIn() {
  const container = document.getElementById('clerk-auth-container');
  if (container && clerk && !clerk.user) {
    clerk.mountSignIn(container, { appearance: { elements: { rootBox: { width: '100%' }, card: { boxShadow: 'none', border: '1px solid #eee' } } } });
  }
}

function mountPageSignIn() {
  const container = document.getElementById('clerk-signin-container');
  if (container && clerk && !clerk.user) {
    clerk.mountSignIn(container, { 
      appearance: { 
        elements: { 
          rootBox: { width: '100%' }, 
          card: { boxShadow: 'none', background: 'transparent' } 
        } 
      },
      afterSignInUrl: 'index.html',
      afterSignUpUrl: 'index.html'
    });
  }
}

async function syncUserWithBackend() {
  if (!clerk?.session) return;
  try {
    const token = await clerk.session.getToken();
    await fetch(`${API_BASE_URL}/api/auth/sync`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
  } catch (err) { console.error('Sync Error:', err); }
}

function toggleCart(open) {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if(open) { 
    drawer?.classList.add('open'); 
    overlay?.classList.add('open'); 
    updateCartUI(); // Trigger UI check (including delayed confetti)
  }
  else { drawer?.classList.remove('open'); overlay?.classList.remove('open'); goToStep(1); }
}

function goToStep(step) {
  const s1 = document.getElementById('cart-step-items'), s2 = document.getElementById('cart-step-shipping'), s3 = document.getElementById('cart-step-success');
  const nextBtn = document.getElementById('next-step-btn'), actions = document.getElementById('checkout-actions'), summary = document.getElementById('summary-section');
  [s1, s2, s3].forEach(s => { if(s) s.style.display = 'none'; });
  if (step === 1) { if(s1) s1.style.display = 'block'; if(nextBtn) { nextBtn.style.display = 'block'; nextBtn.textContent = 'Proceed to Checkout'; } if(actions) actions.style.display = 'none'; if(summary) summary.style.display = 'block'; }
  else if (step === 2) { if(s2) s2.style.display = 'block'; if(nextBtn) nextBtn.style.display = 'none'; if(actions) actions.style.display = 'flex'; if(summary) summary.style.display = 'block'; }
  else if (step === 3) { if(s3) s3.style.display = 'block'; if(nextBtn) nextBtn.style.display = 'none'; if(actions) actions.style.display = 'none'; if(summary) summary.style.display = 'none'; }
  
  // Trigger UI refresh to show/hide fees based on the new step
  updateCartUI();
}

async function handleLogout() {
  if (clerk) { await clerk.signOut(); cart = []; localStorage.removeItem('veyano_cart'); updateCartUI(); showToast('Logged out'); }
}

async function placeOrder() {
  const form = document.getElementById('checkout-form');
  if (!form?.checkValidity()) return form?.reportValidity();
  const placeBtn = document.getElementById('place-order-btn');
  placeBtn.disabled = true; placeBtn.textContent = 'Processing...';
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  const orderData = { customerName: document.getElementById('ship-name').value, customerEmail: document.getElementById('ship-email').value, customerPhone: document.getElementById('ship-phone').value, shippingAddress: document.getElementById('ship-address').value, shippingCity: document.getElementById('ship-city').value, shippingState: document.getElementById('ship-state').value, shippingPincode: document.getElementById('ship-pincode').value, paymentMethod, items: cart.map(item => ({ sku: item.id, productName: item.title, quantity: item.quantity, unitPrice: item.price })) };
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (clerk?.session) headers['Authorization'] = `Bearer ${await clerk.session.getToken()}`;
    const res = await fetch(`${API_BASE_URL}/api/orders`, { method: 'POST', headers, body: JSON.stringify(orderData) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed');
    showSuccess(result.orderNumber);
  } catch (err) { alert(err.message); } finally { placeBtn.disabled = false; placeBtn.textContent = 'Place Order'; }
}

function showSuccess(nr) { const d = document.getElementById('order-number-display'); if(d) d.textContent = `Order #${nr}`; goToStep(3); cart = []; saveCart(); }

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  let variant = urlParams.get('variant');
  if (window.location.pathname.includes('product.html')) {
    if (!variant || !productData[variant]) variant = 'plain';
    const mainImg = document.getElementById('main-product-image'), title = document.getElementById('product-title'), price = document.getElementById('product-price'), ing = document.getElementById('ingredients-text'), btns = document.querySelectorAll('.variant-btn');
    function update(v) {
      const d = productData[v];
      if(mainImg) { mainImg.style.opacity = '0'; setTimeout(() => { mainImg.src = d.image; mainImg.style.opacity = '1'; }, 200); }
      if(title) title.textContent = d.title;
      if(price) price.innerHTML = `<span style="text-decoration: line-through; color: #888; font-size: 0.8em; margin-right: 8px;">₹${d.mrp}</span>₹${d.price} <span style="font-size:0.9rem; color:#666;">(${v === 'combo' ? '3 x 200g' : '200g'})</span>`;
      if(ing) ing.textContent = d.ingredients;
      btns.forEach(b => { b.classList.remove('active'); if (b.dataset.variant === v) b.classList.add('active'); });
    }
    update(variant);
    btns.forEach(b => b.addEventListener('click', (e) => { variant = e.target.dataset.variant; update(variant); const u = window.location.pathname + '?variant=' + variant; window.history.replaceState({path:u},'',u); }));
    document.getElementById('add-to-cart-btn')?.addEventListener('click', () => window.addToCart(variant));
  }
  document.getElementById('cart-icon-btn')?.addEventListener('click', () => toggleCart(true));
  document.getElementById('nav-login-btn')?.addEventListener('click', () => toggleCart(true));
  document.getElementById('close-cart-btn')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-overlay')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('next-step-btn')?.addEventListener('click', () => { if (!cart.length) return alert("Empty!"); goToStep(2); });
  document.getElementById('back-to-cart-btn')?.addEventListener('click', () => goToStep(1));
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);
  initClerk();
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.querySelectorAll('input[name="paymentMethod"]').forEach(i => i.addEventListener('change', updateCartUI));
  updateCartUI();
});
