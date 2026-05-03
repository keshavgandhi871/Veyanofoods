const productData = {
  plain: { id: "plain", title: "Classic Plain Makhana", price: 399, mrp: 799, hoverImage: "./assets/plain_hover.png", image: "./assets/plain.png", ingredients: "Premium Grade Fox Nuts (Makhana)." },
  salted: { id: "salted", title: "Lightly Salted Makhana", price: 399, mrp: 799, hoverImage: "./assets/salted_hover.png", image: "./assets/salted.png", ingredients: "Premium Grade Fox Nuts (Makhana), Himalayan Pink Salt, Rice Bran Oil." },
  periperi: { id: "periperi", title: "Fiery Peri-Peri Makhana", price: 399, mrp: 799, hoverImage: "./assets/periperi_hover.png", image: "./assets/periperi.png", ingredients: "Premium Grade Fox Nuts (Makhana), Peri-Peri Spice Blend, Rice Bran Oil." },
  combo: { id: "combo", title: "The Ultimate Combo Pack", price: 999, mrp: 2397, hoverImage: "./assets/combo_hover.png", image: "./assets/combo.png", ingredients: "Contains Plain, Salted, and Peri-Peri 200g Packs." }
};

// Configuration
const SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 50;
const COD_FEE = 79;

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
  const subtotalEl = document.getElementById('display-subtotal');
  const deliveryEl = document.getElementById('display-shipping');
  const totalEl = document.getElementById('display-total');
  const codRow = document.getElementById('cod-row');
  const codFeeEl = document.getElementById('display-cod');
  const deliveryRow = document.getElementById('sidebar-delivery-row');
  const progSection = document.getElementById('cart-progress-section');
  const progText = document.getElementById('shipping-msg');
  const progBar = document.getElementById('shipping-bar');
  const incentiveMsg = document.getElementById('checkout-incentive-msg');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if(cartCount) cartCount.textContent = totalItems;

  let subtotal = 0;
  cart.forEach(item => { subtotal += item.price * item.quantity; });

  const paymentMethod = (document.querySelector('input[name="paymentMethod"]:checked')?.value) || 'cod';
  const isCOD = paymentMethod === 'cod';

  // 1. Calculate Charges (Transparent Math)
  const shippingCharge = (subtotal === 0 || subtotal >= SHIPPING_THRESHOLD) ? 0 : SHIPPING_FEE;
  const codCharge = (subtotal === 0 || !isCOD) ? 0 : COD_FEE;
  const total = subtotal + shippingCharge + codCharge;

  // 2. Render Cart Items
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

  // 3. Update Progress Bar
  if (progSection && progText && progBar) {
    if (subtotal === 0) {
      progSection.style.display = 'none';
    } else {
      progSection.style.display = 'block';
      const progressNeeded = SHIPPING_THRESHOLD - subtotal;
      if (progressNeeded > 0) {
        let percentage = (subtotal / SHIPPING_THRESHOLD) * 100;
        progBar.style.width = `${percentage}%`;
        progText.innerText = `Add ₹${progressNeeded} more for FREE DELIVERY`;
      } else {
        progBar.style.width = `100%`;
        progText.innerText = `Congrats! You've earned FREE DELIVERY`;
      }
    }
  }

  // 4. Update Price Breakdown (The "Anti-Gravity" Fix)
  if (subtotalEl) subtotalEl.innerText = `₹${subtotal}`;
  
  if (deliveryEl) {
    deliveryEl.innerText = shippingCharge === 0 ? "FREE" : `₹${shippingCharge}`;
    deliveryEl.style.color = shippingCharge === 0 ? "#28a745" : "#000";
    deliveryEl.style.fontWeight = shippingCharge === 0 ? "700" : "400";
  }

  // Robust Step Detection
  const shippingStep = document.getElementById('cart-step-shipping');
  const isCheckoutView = shippingStep && (shippingStep.style.display === 'block');

  // Logic: Always show shipping/total if there are items. Show COD fee only in checkout step.
  if (deliveryRow) deliveryRow.style.display = subtotal > 0 ? 'flex' : 'none';
  
  if (isCheckoutView) {
    if (codRow) {
      codRow.style.display = isCOD ? "flex" : "none";
      if (codFeeEl) codFeeEl.innerText = `₹${codCharge}`;
    }
    if (totalEl) totalEl.innerText = `₹${total}`;
    if (incentiveMsg) incentiveMsg.style.display = 'block';
  } else {
    // Sidebar view: Show subtotal + shipping (Transparent Math)
    if (codRow) codRow.style.display = 'none';
    if (totalEl) totalEl.innerText = `₹${subtotal + shippingCharge}`;
    if (incentiveMsg) incentiveMsg.style.display = 'none';
  }

  // 5. Celebration (Confetti)
  if (typeof confetti === 'function' && subtotal >= SHIPPING_THRESHOLD) {
    const isCartOpen = document.getElementById('cart-drawer')?.classList.contains('open');
    if (!window.freeDeliveryUnlocked) {
      window.freeDeliveryUnlocked = true;
      window.celebrationPending = true;
    }
    if (isCartOpen && window.celebrationPending) {
      window.celebrationPending = false;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FF9900', '#FFCC00', '#FFFFFF', '#000000'], zIndex: 2000 });
    }
  } else {
    window.freeDeliveryUnlocked = false;
    window.celebrationPending = false;
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
  
  // Robust product page check: look for the add-to-cart button
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const viewCartBtn = document.getElementById('view-cart-btn');

  if (addToCartBtn) {
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
    
    addToCartBtn.addEventListener('click', () => window.addToCart(variant));
    
    // VIEW CART: Immediately takes the user to the checkout flow (Step 2)
    viewCartBtn?.addEventListener('click', () => {
      if (cart.length === 0) {
        toggleCart(true); // Open drawer to show empty state
        showToast('Your cart is empty!', 'error');
      } else {
        toggleCart(true);
        goToStep(2); // Immediately go to checkout flow
      }
    });
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

  // Auto-open cart if URL is /cart or has ?cart=open
  if (window.location.pathname === '/cart' || urlParams.get('cart') === 'open') {
    setTimeout(() => {
      toggleCart(true);
      if (cart.length > 0) goToStep(2); // Go directly to checkout flow
    }, 500);
  }
});
