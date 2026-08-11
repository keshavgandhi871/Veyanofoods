const productData = {
  plain: { id: "plain", title: "Classic Plain Makhana", price: 399, mrp: 799, hoverImage: "./assets/plain_hover.webp", image: "./assets/plain.webp", ingredients: "Premium Grade Fox Nuts (Makhana)." },
  salted: { id: "salted", title: "Lightly Salted Makhana", price: 399, mrp: 799, hoverImage: "./assets/salted_hover.webp", image: "./assets/salted.webp", ingredients: "Premium Grade Fox Nuts (Makhana), Himalayan Pink Salt, Rice Bran Oil." },
  periperi: { id: "periperi", title: "Fiery Peri-Peri Makhana", price: 399, mrp: 799, hoverImage: "./assets/periperi_hover.webp", image: "./assets/periperi.webp", ingredients: "Premium Grade Fox Nuts (Makhana), Peri-Peri Spice Blend, Rice Bran Oil." },
  combo: { id: "combo", title: "The Ultimate Combo Pack", price: 999, mrp: 2397, hoverImage: "./assets/combo_hover.webp", image: "./assets/combo.webp", ingredients: "Contains Plain, Salted, and Peri-Peri 200g Packs." }
};

// Configuration
const SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 50;
const COD_FEE = 79;

let clerk = null;
const CLERK_PUBLISHABLE_KEY = 'pk_test_cG9ldGljLWJ1enphcmQtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA';

function getClerkFrontendApi(publishableKey) {
  try {
    let payload = publishableKey.split('_')[2].replace(/-/g, '+').replace(/_/g, '/');
    payload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return atob(payload).replace(/\$$/, '');
  } catch (err) {
    console.error('Unable to derive Clerk frontend API from publishable key:', err);
    return null;
  }
}

function injectScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script) => script.src === src);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === 'true') resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = src;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

let clerkScriptLoading = false;
async function loadClerkSDK() {
  if (clerkScriptLoading) return;
  clerkScriptLoading = true;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/config`);
    if (!res.ok) throw new Error('Failed to fetch Clerk config');
    const config = await res.json();
    const publishableKey = config.publishableKey || CLERK_PUBLISHABLE_KEY;
    const clerkFrontendApi = getClerkFrontendApi(publishableKey);
    if (!clerkFrontendApi) throw new Error('Invalid Clerk publishable key');

    await injectScript(`https://${clerkFrontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await injectScript(`https://${clerkFrontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
      'data-clerk-publishable-key': publishableKey
    });
    console.log('Clerk SDK scripts loaded successfully.');
  } catch (err) {
    console.warn('Config fetch failed, falling back to local static Clerk key:', err);
    const clerkFrontendApi = getClerkFrontendApi(CLERK_PUBLISHABLE_KEY);
    if (!clerkFrontendApi) throw err;

    await injectScript(`https://${clerkFrontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await injectScript(`https://${clerkFrontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
      'data-clerk-publishable-key': CLERK_PUBLISHABLE_KEY
    });
  }
}

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

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
  : '';
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
const clerkAppearance = {
  elements: {
    formButtonPrimary: {
      backgroundColor: '#000',
      '&:hover': { backgroundColor: '#27272a' },
      fontSize: '0.875rem',
      textTransform: 'none',
      borderRadius: '0px'
    },
    card: {
      boxShadow: 'none',
      border: 'none',
      backgroundColor: 'transparent'
    },
    cardBox: {
      boxShadow: 'none',
      border: 'none',
      backgroundColor: 'transparent'
    },
    headerTitle: {
      color: '#09090b',
      fontWeight: '700'
    },
    headerSubtitle: {
      color: '#71717a'
    }
  }
};

let clerkInitRetries = 0;
const MAX_CLERK_RETRIES = 50; // 50 * 100ms = 5 seconds max wait

async function initClerk() {
  if (window.Clerk) {
    clerk = window.Clerk;
    try {
      await clerk.load({
        appearance: clerkAppearance,
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        signInUrl: '/login',
        signUpUrl: '/signup'
      });
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
      showClerkError();
    }
  } else {
    clerkInitRetries++;
    if (clerkInitRetries < MAX_CLERK_RETRIES) {
      setTimeout(initClerk, 100);
    } else {
      console.error('Clerk SDK failed to load after max retries');
      showClerkError();
    }
  }
}

function showClerkError() {
  const container = document.getElementById('clerk-signin-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #71717a; margin-bottom: 1rem;">Unable to load the sign-in widget.</p>
        <button onclick="window.location.reload()" style="font-family: 'Outfit', sans-serif; padding: 0.75rem 2rem; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">Try Again</button>
      </div>
    `;
  }
}

function updateAuthUI(user) {
  console.log('Updating UI for user:', user);
  const authContainer = document.getElementById('clerk-auth-container');
  const navAuthContainer = document.getElementById('nav-auth-container');

  if (user) {
    // Drawer UI
    if (authContainer) authContainer.style.display = 'none';

    // Navbar UI
    if (navAuthContainer && clerk) {
      navAuthContainer.innerHTML = `
        <button id="nav-addresses-btn" style="background: none; border: none; font-size: 0.85rem; font-weight: 600; color: var(--text-color); cursor: pointer; margin-right: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Outfit', sans-serif;">My Addresses</button>
        <div id="nav-user-button"></div>
      `;
      clerk.mountUserButton(document.getElementById('nav-user-button'), {
        afterSignOutUrl: window.location.origin
      });
      document.getElementById('nav-addresses-btn')?.addEventListener('click', () => {
        if (typeof window.openAddressesModal === 'function') {
          window.openAddressesModal();
        }
      });
    }

    // Login & Signup Page Redirect
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/login' ||
        window.location.pathname.includes('signup.html') || window.location.pathname === '/signup') {
      window.location.href = 'index.html';
    }

    const shipName = document.getElementById('ship-name');
    const shipEmail = document.getElementById('ship-email');
    if (shipName && !shipName.value) shipName.value = user.fullName || user.firstName || '';
    if (shipEmail && !shipEmail.value) shipEmail.value = user.primaryEmailAddress?.emailAddress || '';
  } else {
    // Drawer UI
    if (authContainer) authContainer.style.display = 'block';
    mountClerkSignIn();

    // Navbar UI
    if (navAuthContainer) {
      navAuthContainer.innerHTML = '<a href="/login" class="nav-login-btn" style="text-decoration: none; display: inline-block;">Login</a>';
    }

    // Standalone Login Page UI
    mountPageSignIn();

    // Standalone Signup Page UI
    mountPageSignUp();
  }
}

function mountClerkSignIn() {
  const container = document.getElementById('clerk-auth-container');
  if (container && clerk && !clerk.user) {
    clerk.mountSignIn(container, { 
      appearance: clerkAppearance,
      signInUrl: '/login',
      signUpUrl: '/signup',
      afterSignInUrl: '/index.html',
      afterSignUpUrl: '/index.html'
    });
  }
}

function mountPageSignIn() {
  const container = document.getElementById('clerk-signin-container');
  if (container && clerk && !clerk.user) {
    // Remove loading indicator
    const loadingEl = document.getElementById('clerk-loading');
    if (loadingEl) loadingEl.remove();
    clerk.mountSignIn(container, { 
      appearance: clerkAppearance,
      signInUrl: '/login',
      signUpUrl: '/signup',
      afterSignInUrl: '/index.html',
      afterSignUpUrl: '/index.html'
    });
  }
}

function mountPageSignUp() {
  const container = document.getElementById('clerk-signup-container');
  if (container && clerk && !clerk.user) {
    // Remove loading indicator
    const loadingEl = document.getElementById('clerk-loading');
    if (loadingEl) loadingEl.remove();
    clerk.mountSignUp(container, { 
      appearance: clerkAppearance,
      signInUrl: '/login',
      signUpUrl: '/signup',
      afterSignInUrl: '/index.html',
      afterSignUpUrl: '/index.html'
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
  const waBtn = document.querySelector('.floating-whatsapp');
  if(open) { 
    drawer?.classList.add('open'); 
    overlay?.classList.add('open'); 
    if(waBtn) waBtn.style.display = 'none';
    updateCartUI(); // Trigger UI check (including delayed confetti)
  }
  else { 
    drawer?.classList.remove('open'); 
    overlay?.classList.remove('open'); 
    if(waBtn) waBtn.style.display = 'flex';
    goToStep(1); 
  }
}

function goToStep(step) {
  const s1 = document.getElementById('cart-step-items'), s2 = document.getElementById('cart-step-shipping'), s3 = document.getElementById('cart-step-success');
  const nextBtn = document.getElementById('next-step-btn'), actions = document.getElementById('checkout-actions'), summary = document.getElementById('summary-section');
  [s1, s2, s3].forEach(s => { if(s) s.style.display = 'none'; });
  if (step === 1) { if(s1) s1.style.display = 'block'; if(nextBtn) { nextBtn.style.display = 'block'; nextBtn.textContent = 'Proceed to Checkout'; } if(actions) actions.style.display = 'none'; if(summary) summary.style.display = 'block'; }
  else if (step === 2) { 
    if(s2) s2.style.display = 'block'; 
    if(nextBtn) nextBtn.style.display = 'none'; 
    if(actions) actions.style.display = 'flex'; 
    if(summary) summary.style.display = 'block'; 
    if (typeof syncCheckoutAddressSelector === 'function') syncCheckoutAddressSelector();
  }
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
  placeBtn.disabled = true; 
  placeBtn.textContent = 'Processing...';

  // Save new address on checkout if checked
  const saveCheckbox = document.getElementById('checkout-save-address');
  const addressSelect = document.getElementById('checkout-address-select');
  if (clerk?.user && saveCheckbox?.checked && (!addressSelect || addressSelect.value === "")) {
    try {
      const newAddr = {
        id: Date.now().toString(),
        name: document.getElementById('ship-name').value.trim(),
        email: document.getElementById('ship-email').value.trim(),
        phone: document.getElementById('ship-phone').value.trim(),
        address: document.getElementById('ship-address').value.trim(),
        city: document.getElementById('ship-city').value.trim(),
        pincode: document.getElementById('ship-pincode').value.trim(),
        state: document.getElementById('ship-state').value
      };
      const currentAddresses = clerk.user.unsafeMetadata.addresses || [];
      const isDuplicate = currentAddresses.some(a => 
        a.address.toLowerCase() === newAddr.address.toLowerCase() && 
        a.pincode === newAddr.pincode
      );
      if (!isDuplicate) {
        currentAddresses.push(newAddr);
        await clerk.user.update({
          unsafeMetadata: {
            addresses: currentAddresses
          }
        });
      }
    } catch (saveErr) {
      console.error('Failed to auto-save address on checkout:', saveErr);
    }
  }

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  
  if (paymentMethod === 'prepaid') {
    try {
      await initiateRazorpayCheckout();
    } catch (err) {
      console.error('Razorpay Flow Error:', err);
      showToast(err.message || 'Payment failed', 'error');
    } finally {
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order';
    }
    return;
  }

  // --- COD PATH (Existing) ---
  const landmarkVal = document.getElementById('ship-landmark').value.trim();
  const baseAddressVal = document.getElementById('ship-address').value.trim();
  const shippingAddress = landmarkVal ? `${baseAddressVal} (Landmark: ${landmarkVal})` : baseAddressVal;
  const orderData = { customerName: document.getElementById('ship-name').value, customerEmail: document.getElementById('ship-email').value, customerPhone: document.getElementById('ship-phone').value, shippingAddress, shippingCity: document.getElementById('ship-city').value, shippingState: document.getElementById('ship-state').value, shippingPincode: document.getElementById('ship-pincode').value, paymentMethod, items: cart.map(item => ({ sku: item.id, productName: item.title, quantity: item.quantity, unitPrice: item.price })) };
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (clerk?.session) headers['Authorization'] = `Bearer ${await clerk.session.getToken()}`;
    const res = await fetch(`${API_BASE_URL}/api/orders`, { method: 'POST', headers, body: JSON.stringify(orderData) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed');
    showSuccess(result.orderNumber);
  } catch (err) { alert(err.message); } finally { placeBtn.disabled = false; placeBtn.textContent = 'Place Order'; }
}

async function initiateRazorpayCheckout() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCharge = subtotal >= 499 ? 0 : 50;
  const totalAmountPaise = (subtotal + shippingCharge) * 100;

  // 1. Get KEY_ID
  const configRes = await fetch(`${API_BASE_URL}/api/payments/config`);
  const { keyId } = await configRes.json();

  // 2. Create Razorpay Order
  const orderRes = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: totalAmountPaise, receipt: `order_rcpt_${Date.now()}` })
  });
  const rzpOrder = await orderRes.json();
  if (!orderRes.ok) throw new Error(rzpOrder.error || 'Failed to initialize payment');

  // 3. Open Razorpay Modal
  const options = {
    key: keyId,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    name: "VEYANO Foods",
    description: "Premium Roasted Makhana",
    order_id: rzpOrder.id,
    handler: async function (response) {
      // 4. Verify Signature
      const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      const verifyResult = await verifyRes.json();
      
      if (verifyResult.success) {
        // 5. Finalize Database Order
        await finalizeOrderAfterPayment(rzpOrder.id);
      } else {
        showToast('Payment verification failed. Please contact support.', 'error');
      }
    },
    prefill: {
      name: document.getElementById('ship-name').value,
      email: document.getElementById('ship-email').value,
      contact: document.getElementById('ship-phone').value
    },
    theme: { color: "#c08b5c" }
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    showToast(`Payment failed: ${response.error.description}`, 'error');
  });
  rzp.open();
}

async function finalizeOrderAfterPayment(razorpayOrderId) {
  const landmarkVal = document.getElementById('ship-landmark').value.trim();
  const baseAddressVal = document.getElementById('ship-address').value.trim();
  const shippingAddress = landmarkVal ? `${baseAddressVal} (Landmark: ${landmarkVal})` : baseAddressVal;
  const orderData = { 
    customerName: document.getElementById('ship-name').value, 
    customerEmail: document.getElementById('ship-email').value, 
    customerPhone: document.getElementById('ship-phone').value, 
    shippingAddress, 
    shippingCity: document.getElementById('ship-city').value, 
    shippingState: document.getElementById('ship-state').value, 
    shippingPincode: document.getElementById('ship-pincode').value, 
    paymentMethod: 'prepaid',
    razorpayOrderId,
    items: cart.map(item => ({ sku: item.id, productName: item.title, quantity: item.quantity, unitPrice: item.price })) 
  };

  const headers = { 'Content-Type': 'application/json' };
  if (clerk?.session) headers['Authorization'] = `Bearer ${await clerk.session.getToken()}`;
  
  const res = await fetch(`${API_BASE_URL}/api/orders`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(orderData) 
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to save order');
  
  showSuccess(result.orderNumber);
}

function showSuccess(nr) { const d = document.getElementById('order-number-display'); if(d) d.textContent = `Order #${nr}`; goToStep(3); cart = []; saveCart(); }

function initPincodeAutofill() {
  const pincodeInput = document.getElementById('ship-pincode');
  const stateSelect = document.getElementById('ship-state');
  const cityInput = document.getElementById('ship-city');

  if (!pincodeInput) return;

  pincodeInput.addEventListener('input', async () => {
    const pincode = pincodeInput.value.trim();
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      pincodeInput.style.borderColor = '#c08b5c';
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (!res.ok) throw new Error('Pincode API error');
        const data = await res.json();
        
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const postOffice = data[0].PostOffice[0];
          const state = postOffice.State;
          const district = postOffice.District;

          if (stateSelect) {
            const matchedOption = Array.from(stateSelect.options).find(opt => 
              opt.value.toLowerCase() === state.toLowerCase()
            );
            if (matchedOption) {
              stateSelect.value = matchedOption.value;
            }
          }

          if (cityInput) {
            cityInput.value = district;
          }
        }
      } catch (err) {
        console.error('Error fetching state from pincode:', err);
      } finally {
        pincodeInput.style.borderColor = '';
      }
    }
  });
}

// --- SAVED ADDRESSES SYSTEM ---

// Open the addresses modal for profile address management
window.openAddressesModal = () => {
  if (!clerk || !clerk.user) {
    showToast('Please login to manage addresses.', 'error');
    return;
  }

  // Create modal element if it doesn't exist
  let modalOverlay = document.getElementById('addresses-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'addresses-modal';
    modalOverlay.className = 'addr-modal-overlay';
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        window.closeAddressesModal();
      }
    });
    document.body.appendChild(modalOverlay);
  }

  const renderAddressesList = () => {
    const addresses = clerk.user.unsafeMetadata.addresses || [];
    if (addresses.length === 0) {
      return '<p style="text-align: center; color: #71717a; font-size: 0.95rem; margin: 2rem 0;">No saved addresses found.</p>';
    }
    return addresses.map(addr => `
      <div class="address-item-card" id="addr-card-${addr.id}">
        <div class="address-item-details">
          <strong>${escapeHtml(addr.name)}</strong><br>
          Phone: ${escapeHtml(addr.phone)} | Email: ${escapeHtml(addr.email)}<br>
          ${escapeHtml(addr.address)}, ${addr.landmark ? 'Landmark: ' + escapeHtml(addr.landmark) + ', ' : ''}${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pincode)}
        </div>
        <div class="address-item-actions">
          <button class="address-delete-btn" onclick="window.deleteSavedAddress('${addr.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  };

  modalOverlay.innerHTML = `
    <div class="addr-modal-card">
      <div class="addr-modal-header">
        <h3>My Saved Addresses</h3>
        <button class="addr-close-btn" onclick="window.closeAddressesModal()">&times;</button>
      </div>
      <div id="modal-addresses-list-container">
        ${renderAddressesList()}
      </div>
      <div class="addr-modal-form">
        <h4>+ Add New Address</h4>
        <form id="modal-add-address-form" onsubmit="window.saveNewAddress(event)">
          <div class="form-group" style="margin-bottom: 1rem;">
            <input type="text" id="modal-addr-name" placeholder="Full Name" required minlength="3" style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <input type="email" id="modal-addr-email" placeholder="Email Address" required style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <input type="tel" id="modal-addr-phone" placeholder="Mobile Number (10 Digits)" required pattern="[6-9][0-9]{9}" style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <textarea id="modal-addr-address" placeholder="Full Delivery Address" required style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; height: 80px; resize: none; font-family:'Outfit',sans-serif;"></textarea>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <input type="text" id="modal-addr-landmark" placeholder="Landmark (e.g. Near Temple)" required minlength="3" style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
          </div>
          <div class="form-row" style="display:flex; gap:10px; margin-bottom: 1rem;">
            <input type="text" id="modal-addr-city" placeholder="City" required minlength="2" style="flex:1; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
            <input type="text" id="modal-addr-pincode" placeholder="Pincode" required pattern="[0-9]{6}" style="flex:1; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-family:'Outfit',sans-serif;">
          </div>
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <select id="modal-addr-state" required style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; background:#fff; font-family:'Outfit',sans-serif;">
              <option value="" disabled selected>Select State</option>
              ${getStateOptionsHTML()}
            </select>
          </div>
          <button type="submit" class="btn" style="width:100%; padding:0.8rem; font-family:'Outfit',sans-serif;">Save Address</button>
        </form>
      </div>
    </div>
  `;

  // Autoload email/name if empty
  const nameInput = document.getElementById('modal-addr-name');
  const emailInput = document.getElementById('modal-addr-email');
  if (nameInput) nameInput.value = clerk.user.fullName || clerk.user.firstName || '';
  if (emailInput) emailInput.value = clerk.user.primaryEmailAddress?.emailAddress || '';

  // Setup pincode auto-fill for modal form as well
  initModalPincodeAutofill();

  modalOverlay.classList.add('open');
};

window.closeAddressesModal = () => {
  const modalOverlay = document.getElementById('addresses-modal');
  if (modalOverlay) {
    modalOverlay.classList.remove('open');
  }
};

window.deleteSavedAddress = async (id) => {
  if (!confirm('Are you sure you want to delete this address?')) return;
  
  const currentAddresses = clerk.user.unsafeMetadata.addresses || [];
  const updatedAddresses = currentAddresses.filter(addr => addr.id !== id);
  
  try {
    showToast('Deleting address...');
    await clerk.user.update({
      unsafeMetadata: {
        addresses: updatedAddresses
      }
    });
    
    // Refresh modal UI
    const listContainer = document.getElementById('modal-addresses-list-container');
    if (listContainer) {
      const addresses = clerk.user.unsafeMetadata.addresses || [];
      if (addresses.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #71717a; font-size: 0.95rem; margin: 2rem 0;">No saved addresses found.</p>';
      } else {
        const itemCard = document.getElementById(`addr-card-${id}`);
        if (itemCard) itemCard.remove();
      }
    }
    
    // Sync to checkout selector if visible
    syncCheckoutAddressSelector();
    showToast('Address deleted successfully.');
  } catch (err) {
    console.error('Delete Address Error:', err);
    showToast('Failed to delete address.', 'error');
  }
};

window.saveNewAddress = async (e) => {
  e.preventDefault();
  
  const newAddr = {
    id: Date.now().toString(),
    name: document.getElementById('modal-addr-name').value.trim(),
    email: document.getElementById('modal-addr-email').value.trim(),
    phone: document.getElementById('modal-addr-phone').value.trim(),
    address: document.getElementById('modal-addr-address').value.trim(),
    landmark: document.getElementById('modal-addr-landmark').value.trim(),
    city: document.getElementById('modal-addr-city').value.trim(),
    pincode: document.getElementById('modal-addr-pincode').value.trim(),
    state: document.getElementById('modal-addr-state').value
  };

  const currentAddresses = clerk.user.unsafeMetadata.addresses || [];
  currentAddresses.push(newAddr);

  try {
    showToast('Saving address...');
    await clerk.user.update({
      unsafeMetadata: {
        addresses: currentAddresses
      }
    });

    window.closeAddressesModal();
    syncCheckoutAddressSelector();
    showToast('Address saved successfully!');
  } catch (err) {
    console.error('Save Address Error:', err);
    showToast('Failed to save address.', 'error');
  }
};

// Populate state dropdown options helper
function getStateOptionsHTML() {
  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];
  return states.map(s => `<option value="${s}">${s}</option>`).join('');
}

// XSS prevention helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

function initModalPincodeAutofill() {
  const pincodeInput = document.getElementById('modal-addr-pincode');
  const cityInput = document.getElementById('modal-addr-city');
  const stateSelect = document.getElementById('modal-addr-state');

  if (!pincodeInput) return;

  pincodeInput.addEventListener('input', async () => {
    const pincode = pincodeInput.value.trim();
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      pincodeInput.style.borderColor = '#c08b5c';
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (!res.ok) throw new Error('Pincode API error');
        const data = await res.json();
        
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const postOffice = data[0].PostOffice[0];
          const state = postOffice.State;
          const district = postOffice.District;

          if (stateSelect) {
            const matchedOption = Array.from(stateSelect.options).find(opt => 
              opt.value.toLowerCase() === state.toLowerCase()
            );
            if (matchedOption) {
              stateSelect.value = matchedOption.value;
            }
          }

          if (cityInput) {
            cityInput.value = district;
          }
        }
      } catch (err) {
        console.error('Error fetching state from pincode:', err);
      } finally {
        pincodeInput.style.borderColor = '';
      }
    }
  });
}

function syncCheckoutAddressSelector() {
  const checkoutForm = document.getElementById('checkout-form');
  if (!checkoutForm) return;

  // Only show if user is signed in
  if (!clerk || !clerk.user) {
    const existing = document.getElementById('checkout-address-selector-container');
    if (existing) existing.remove();
    const existingSaveCheckbox = document.getElementById('checkout-save-address-group');
    if (existingSaveCheckbox) existingSaveCheckbox.remove();
    return;
  }

  let container = document.getElementById('checkout-address-selector-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'checkout-address-selector-container';
    container.style.marginBottom = '1.5rem';
    
    // Insert at the top of the form
    checkoutForm.prepend(container);
  }

  const addresses = clerk.user.unsafeMetadata.addresses || [];
  
  let optionsHTML = '<option value="">-- Enter New Address --</option>';
  addresses.forEach(addr => {
    optionsHTML += `
      <option value="${addr.id}">
        ${escapeHtml(addr.name)} (${escapeHtml(addr.city)}, ${escapeHtml(addr.pincode)})
      </option>
    `;
  });

  container.innerHTML = `
    <label style="font-size: 0.85rem; font-weight: 600; color: #c08b5c; display: block; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family:'Outfit',sans-serif;">Select Delivery Address</label>
    <select id="checkout-address-select" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-family: 'Outfit', sans-serif; background: #fff; font-size: 0.9rem;">
      ${optionsHTML}
    </select>
  `;

  // Insert Save Address Checkbox if not already present
  let saveGroup = document.getElementById('checkout-save-address-group');
  if (!saveGroup) {
    saveGroup = document.createElement('div');
    saveGroup.id = 'checkout-save-address-group';
    saveGroup.className = 'form-group';
    saveGroup.style.margin = '1rem 0';
    saveGroup.style.display = 'flex';
    saveGroup.style.alignItems = 'center';
    saveGroup.style.gap = '8px';
    
    // Insert it before the payment methods title
    const paymentMethodsTitle = Array.from(checkoutForm.querySelectorAll('h4')).find(h => h.textContent.includes('Payment Method'));
    if (paymentMethodsTitle) {
      checkoutForm.insertBefore(saveGroup, paymentMethodsTitle);
    } else {
      checkoutForm.appendChild(saveGroup);
    }
  }

  saveGroup.innerHTML = `
    <input type="checkbox" id="checkout-save-address" checked style="width: auto; cursor: pointer;">
    <label for="checkout-save-address" style="font-size: 0.85rem; color: #4b5563; cursor: pointer; user-select: none;">Save this address for future purchases</label>
  `;

  const addressSelect = document.getElementById('checkout-address-select');
  const nameInput = document.getElementById('ship-name');
  const emailInput = document.getElementById('ship-email');
  const phoneInput = document.getElementById('ship-phone');
  const addressInput = document.getElementById('ship-address');
  const landmarkInput = document.getElementById('ship-landmark');
  const cityInput = document.getElementById('ship-city');
  const pincodeInput = document.getElementById('ship-pincode');
  const stateSelect = document.getElementById('ship-state');

  const autofill = () => {
    const selectedId = addressSelect.value;
    if (selectedId) {
      const addr = addresses.find(a => a.id === selectedId);
      if (addr) {
        if (nameInput) nameInput.value = addr.name;
        if (emailInput) emailInput.value = addr.email;
        if (phoneInput) phoneInput.value = addr.phone;
        if (addressInput) addressInput.value = addr.address;
        if (landmarkInput) landmarkInput.value = addr.landmark || '';
        if (cityInput) cityInput.value = addr.city;
        if (pincodeInput) pincodeInput.value = addr.pincode;
        if (stateSelect) stateSelect.value = addr.state;
        
        // Hide the save checkbox since this address is already saved
        if (saveGroup) saveGroup.style.display = 'none';
      }
    } else {
      // Clear fields for new address entry
      if (nameInput) nameInput.value = clerk.user.fullName || clerk.user.firstName || '';
      if (emailInput) emailInput.value = clerk.user.primaryEmailAddress?.emailAddress || '';
      if (phoneInput) phoneInput.value = '';
      if (addressInput) addressInput.value = '';
      if (landmarkInput) landmarkInput.value = '';
      if (cityInput) cityInput.value = '';
      if (pincodeInput) pincodeInput.value = '';
      if (stateSelect) stateSelect.value = '';
      
      // Show the save checkbox
      if (saveGroup) saveGroup.style.display = 'flex';
    }
  };

  addressSelect.addEventListener('change', autofill);
  
  // Trigger initial populate if there is a saved address and nothing has been typed yet
  if (addresses.length > 0 && addressSelect.value === "") {
    addressSelect.value = addresses[0].id;
    autofill();
  }
}

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
  document.getElementById('close-cart-btn')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-overlay')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('next-step-btn')?.addEventListener('click', () => { if (!cart.length) return alert("Empty!"); goToStep(2); });
  document.getElementById('back-to-cart-btn')?.addEventListener('click', () => goToStep(1));
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);
  loadClerkSDK().then(() => {
    initClerk();
  }).catch((err) => {
    console.error('Failed to load Clerk SDK:', err);
    initClerk(); // Try anyway in case it loaded via other means
  });
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.querySelectorAll('input[name="paymentMethod"]').forEach(i => i.addEventListener('change', updateCartUI));
  updateCartUI();
  initPincodeAutofill();

  // Auto-open cart if URL is /cart or has ?cart=open
  if (window.location.pathname === '/cart' || urlParams.get('cart') === 'open') {
    setTimeout(() => {
      toggleCart(true);
      if (cart.length > 0) goToStep(2); // Go directly to checkout flow
    }, 500);
  }
});
