/**
 * VEYANO Foods — Core Frontend Controller & D2C State Management
 * 
 * Features:
 * - Centralized Product Catalog Integration (VeyanoProducts)
 * - Dynamic Category Filtering & Product Grid Rendering
 * - Multi-Step Cart & Checkout (Free Delivery Progress @ ₹499, Transparent Fees)
 * - Indian Pincode Auto-Fill for City & State (India Post API)
 * - Clerk Authentication & Saved Address Management
 * - Razorpay Prepaid Gateway & Verified COD Checkout
 * - Dynamic WhatsApp Order Link Builder
 * - Mobile Navigation & Accessible Accordions
 */

// Global Configuration
const CONFIG = {
  SHIPPING_THRESHOLD: 499,
  SHIPPING_FEE: 50,
  COD_FEE: 79,
  FSSAI_LIC: '20826010000397',
  WHATSAPP_NUMBER: '919350598909',
  CLERK_PUBLISHABLE_KEY: 'pk_test_cG9ldGljLWJ1enphcmQtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA'
};

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
  : '';

CONFIG.API_BASE = API_BASE_URL;
window.API_BASE_URL = API_BASE_URL;

// Cart State
let cart = JSON.parse(localStorage.getItem('veyano_cart')) || [];
let clerk = null;

// --- UTILITIES ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- CART STATE MANAGEMENT ---
function saveCart() {
  localStorage.setItem('veyano_cart', JSON.stringify(cart));
  updateCartUI();
}

window.addToCart = (productId, quantity = 1) => {
  const catalog = window.VeyanoProducts ? window.VeyanoProducts.getAll() : (window.DEFAULT_PRODUCTS || []);
  const product = catalog.find(p => p.id === productId || p.slug === productId || (p.sku && p.sku.toLowerCase() === productId.toLowerCase()));

  if (!product) {
    showToast('Product not found.', 'error');
    return;
  }

  if (product.stock_status === 'coming_soon' || product.stock_status === 'hidden' || product.price == null) {
    showToast('This product is coming soon — not available for purchase yet.', 'info');
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi VEYANO! I\'d like to be notified when trial packs launch.')}`, '_blank');
    return;
  }

  if (product.stock_status === 'out_of_stock' || product.stock <= 0) {
    showToast('This product is currently out of stock.', 'info');
    return;
  }


  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      sku: product.sku || product.id.toUpperCase(),
      title: product.name,
      price: product.price,
      weight: product.weight,
      image: product.images && product.images.length > 0 ? product.images[0] : './assets/plain.webp',
      quantity: quantity
    });
  }

  saveCart();
  showToast(`Added ${product.name} to cart!`);
  toggleCart(true);
};

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
  showToast('Item removed from cart.');
};

function updateCartUI() {
  const cartCountEls = document.querySelectorAll('.cart-count, #cart-count');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('display-subtotal');
  const shippingEl = document.getElementById('display-shipping');
  const codFeeRow = document.getElementById('cod-row');
  const codFeeEl = document.getElementById('display-cod');
  const totalEl = document.getElementById('display-total');
  const progressText = document.getElementById('shipping-msg');
  const progressBar = document.getElementById('shipping-bar');
  const progressSection = document.getElementById('cart-progress-section');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountEls.forEach(el => { if (el) el.textContent = totalItems; });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paymentMethod = (document.querySelector('input[name="paymentMethod"]:checked')?.value) || 'cod';
  const isCOD = paymentMethod === 'cod';

  const shippingCharge = (subtotal === 0 || subtotal >= CONFIG.SHIPPING_THRESHOLD) ? 0 : CONFIG.SHIPPING_FEE;
  const codCharge = (subtotal === 0 || !isCOD) ? 0 : CONFIG.COD_FEE;
  const grandTotal = subtotal + shippingCharge + codCharge;

  // Render Items
  if (cartItemsContainer) {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; fill: none; stroke: currentColor; stroke-width: 1.5;" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <p style="font-family: var(--font-heading); font-weight: 600; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">Your Cart is Empty</p>
          <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">Explore our roasted snacks and trial packs.</p>
          <a href="shop.html" class="btn btn-sm" onclick="toggleCart(false)">Shop Now</a>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${escapeHtml(item.title)}" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-title">${escapeHtml(item.title)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${item.weight || ''}</div>
            <div class="cart-item-price">₹${item.price}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
            <div class="qty-counter">
              <button onclick="window.updateQty('${item.id}', -1)">-</button>
              <span>${item.quantity}</span>
              <button onclick="window.updateQty('${item.id}', 1)">+</button>
            </div>
            <button onclick="window.removeCartItem('${item.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; cursor:pointer; text-decoration:underline;">Remove</button>
          </div>
        </div>
      `).join('');
    }
  }

  // Update Free Shipping Progress Bar
  if (progressSection && progressText && progressBar) {
    if (subtotal === 0) {
      progressSection.style.display = 'none';
    } else {
      progressSection.style.display = 'block';
      const needed = CONFIG.SHIPPING_THRESHOLD - subtotal;
      if (needed > 0) {
        const pct = Math.min(100, Math.round((subtotal / CONFIG.SHIPPING_THRESHOLD) * 100));
        progressBar.style.width = `${pct}%`;
        progressText.innerHTML = `Add <b>₹${needed}</b> more for <b>FREE Pan-India Delivery</b>!`;
      } else {
        progressBar.style.width = '100%';
        progressText.innerHTML = `🎉 You've unlocked <b>FREE Pan-India Delivery</b>!`;
      }
    }
  }

  // Update Numerical Displays
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (shippingEl) {
    shippingEl.textContent = shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`;
    shippingEl.style.color = shippingCharge === 0 ? 'var(--brand-green)' : 'inherit';
    shippingEl.style.fontWeight = shippingCharge === 0 ? '700' : '500';
  }

  const shippingStep = document.getElementById('cart-step-shipping');
  const isCheckoutStep = shippingStep && shippingStep.style.display === 'block';

  if (codFeeRow) {
    codFeeRow.style.display = (isCheckoutStep && isCOD) ? 'flex' : 'none';
    if (codFeeEl) codFeeEl.textContent = `₹${CONFIG.COD_FEE}`;
  }

  if (totalEl) {
    const finalAmount = isCheckoutStep ? grandTotal : (subtotal + shippingCharge);
    totalEl.textContent = `₹${finalAmount}`;
  }

  // Optional Celebration (Confetti) on reaching free shipping threshold
  if (typeof confetti === 'function' && subtotal >= CONFIG.SHIPPING_THRESHOLD && !window.freeShippingConfettiPlayed) {
    const drawer = document.getElementById('cart-drawer');
    if (drawer && drawer.classList.contains('open')) {
      window.freeShippingConfettiPlayed = true;
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    }
  } else if (subtotal < CONFIG.SHIPPING_THRESHOLD) {
    window.freeShippingConfettiPlayed = false;
  }
}

// Cart Drawer Step Navigation
function toggleCart(open) {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (open) {
    drawer?.classList.add('open');
    overlay?.classList.add('open');
    updateCartUI();
  } else {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
    goToStep(1);
  }
}

function goToStep(step) {
  const s1 = document.getElementById('cart-step-items');
  const s2 = document.getElementById('cart-step-shipping');
  const s3 = document.getElementById('cart-step-success');
  const nextBtn = document.getElementById('next-step-btn');
  const actions = document.getElementById('checkout-actions');
  const summary = document.getElementById('summary-section');

  [s1, s2, s3].forEach(s => { if (s) s.style.display = 'none'; });

  if (step === 1) {
    if (s1) s1.style.display = 'block';
    if (nextBtn) { nextBtn.style.display = 'block'; nextBtn.textContent = 'Proceed to Checkout'; }
    if (actions) actions.style.display = 'none';
    if (summary) summary.style.display = 'block';
  } else if (step === 2) {
    if (s2) s2.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'none';
    if (actions) actions.style.display = 'flex';
    if (summary) summary.style.display = 'block';
    syncCheckoutAddressSelector();
  } else if (step === 3) {
    if (s3) s3.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'none';
    if (actions) actions.style.display = 'none';
    if (summary) summary.style.display = 'none';
  }

  updateCartUI();
}

// --- PINCODE AUTO-LOOKUP (INDIA POST API) ---
function initPincodeAutofill() {
  const pincodeInput = document.getElementById('ship-pincode');
  const stateSelect = document.getElementById('ship-state');
  const cityInput = document.getElementById('ship-city');

  if (!pincodeInput) return;

  pincodeInput.addEventListener('input', async () => {
    const pin = pincodeInput.value.trim();
    if (/^[1-9][0-9]{5}$/.test(pin)) {
      pincodeInput.style.borderColor = 'var(--accent-color)';
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/pincode/${pin}`);
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();
        if (data && data.success) {
          if (cityInput && !cityInput.value) cityInput.value = data.district || '';
          if (stateSelect && data.state) {
            const matched = Array.from(stateSelect.options).find(opt =>
              opt.value.toLowerCase() === data.state.toLowerCase()
            );
            if (matched) stateSelect.value = matched.value;
          }
        }
      } catch (err) {
        console.warn('Pincode lookup note:', err);
      } finally {
        pincodeInput.style.borderColor = '';
      }
    }
  });
}

// --- ORDER PLACEMENT & PAYMENTS ---
async function placeOrder() {
  const form = document.getElementById('checkout-form');
  if (!form?.checkValidity()) return form?.reportValidity();

  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    return;
  }

  const placeBtn = document.getElementById('place-order-btn');
  if (placeBtn) {
    placeBtn.disabled = true;
    placeBtn.textContent = 'Processing...';
  }

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';

  if (paymentMethod === 'prepaid') {
    try {
      await initiateRazorpayCheckout();
    } catch (err) {
      console.error('Razorpay Error:', err);
      showToast(err.message || 'Payment initiation failed.', 'error');
    } finally {
      if (placeBtn) {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order';
      }
    }
    return;
  }

  // COD Path
  const name = document.getElementById('ship-name')?.value.trim();
  const email = document.getElementById('ship-email')?.value.trim();
  const phone = document.getElementById('ship-phone')?.value.trim();
  const baseAddress = document.getElementById('ship-address')?.value.trim();
  const landmark = document.getElementById('ship-landmark')?.value.trim();
  const city = document.getElementById('ship-city')?.value.trim();
  const pincode = document.getElementById('ship-pincode')?.value.trim();
  const state = document.getElementById('ship-state')?.value;

  const fullAddress = landmark ? `${baseAddress} (Landmark: ${landmark})` : baseAddress;

  // Auto-save address if checkbox is checked
  const saveCheckbox = document.getElementById('save-address-checkbox');
  if (!saveCheckbox || saveCheckbox.checked) {
    if (typeof window.saveAddressFromCheckout === 'function') {
      window.saveAddressFromCheckout(false);
    }
  }

  const orderPayload = {
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    shippingAddress: fullAddress,
    shippingCity: city,
    shippingState: state,
    shippingPincode: pincode,
    paymentMethod: 'cod',
    items: cart.map(i => ({
      id: i.id,
      sku: i.sku || i.id.toUpperCase(),
      productName: i.title,
      quantity: i.quantity,
      unitPrice: i.price,
      weight: i.weight
    }))
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order.');

    // Clear cart and show confirmation
    cart = [];
    saveCart();
    const orderNumEl = document.getElementById('order-number-display');
    if (orderNumEl) orderNumEl.textContent = `Order #${data.orderNumber || data.orderId}`;
    goToStep(3);
    showToast('Order placed successfully! Check your email for details.');
  } catch (err) {
    showToast(err.message || 'Could not connect to order server.', 'error');
  } finally {
    if (placeBtn) {
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order';
    }
  }
}

async function initiateRazorpayCheckout() {
  const name = document.getElementById('ship-name')?.value.trim();
  const email = document.getElementById('ship-email')?.value.trim();
  const phone = document.getElementById('ship-phone')?.value.trim();
  const baseAddress = document.getElementById('ship-address')?.value.trim();
  const landmark = document.getElementById('ship-landmark')?.value.trim();
  const city = document.getElementById('ship-city')?.value.trim();
  const pincode = document.getElementById('ship-pincode')?.value.trim();
  const state = document.getElementById('ship-state')?.value;

  const fullAddress = landmark ? `${baseAddress} (Landmark: ${landmark})` : baseAddress;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal >= CONFIG.SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
  const totalPaise = (subtotal + shippingFee) * 100;

  // Auto-save address if checkbox is checked
  const saveCheckbox = document.getElementById('save-address-checkbox');
  if (!saveCheckbox || saveCheckbox.checked) {
    if (typeof window.saveAddressFromCheckout === 'function') {
      window.saveAddressFromCheckout(false);
    }
  }

  // 1. Fetch Razorpay config
  const configRes = await fetch(`${API_BASE_URL}/api/payments/config`);
  const configData = await configRes.json();
  const keyId = configData.keyId;

  if (!keyId) {
    throw new Error('Online payment gateway is temporarily unavailable. Please choose Cash on Delivery or Order via WhatsApp.');
  }

  // 2. Create Razorpay order
  const orderRes = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: totalPaise, receipt: `rcpt_${Date.now()}` })
  });
  const rzpOrder = await orderRes.json();
  if (!orderRes.ok) throw new Error(rzpOrder.error || 'Failed to create payment session.');

  // 3. Launch Razorpay UI
  const options = {
    key: keyId,
    amount: rzpOrder.amount,
    currency: 'INR',
    name: 'VEYANO Foods',
    description: 'Clean Roasted Snacks Order',
    image: './assets/logo.png',
    order_id: rzpOrder.id,
    prefill: {
      name: name,
      email: email,
      contact: phone
    },
    theme: {
      color: '#18181b'
    },
    handler: async function (response) {
      try {
        const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          // Create confirmed order in database
          const createOrderRes = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              shippingAddress: fullAddress,
              shippingCity: city,
              shippingState: state,
              shippingPincode: pincode,
              paymentMethod: 'prepaid',
              razorpayOrderId: response.razorpay_order_id,
              items: cart.map(i => ({
                id: i.id,
                sku: i.sku || i.id.toUpperCase(),
                productName: i.title,
                quantity: i.quantity,
                unitPrice: i.price,
                weight: i.weight
              }))
            })
          });
          const createdOrder = await createOrderRes.json();

          cart = [];
          saveCart();
          const orderNumEl = document.getElementById('order-number-display');
          if (orderNumEl) orderNumEl.textContent = `Order #${createdOrder.orderNumber || createdOrder.orderId}`;
          goToStep(3);
          showToast('Payment successful! Your order has been placed.');
        } else {
          showToast('Payment verification failed. Please contact support.', 'error');
        }
      } catch (e) {
        showToast('Error processing payment confirmation.', 'error');
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

// --- DYNAMIC WHATSAPP ORDER LINK BUILDER ---
window.buildWhatsAppOrderLink = (productVariant = null) => {
  const catalog = window.VeyanoProducts ? window.VeyanoProducts.getAll() : (window.DEFAULT_PRODUCTS || []);
  let text = "Hello VEYANO Foods team! 👋\n\n";

  if (productVariant) {
    const prod = catalog.find(p => p.id === productVariant || p.slug === productVariant || (p.sku && p.sku.toLowerCase() === productVariant.toLowerCase()));
    if (prod) {
      text += `I would like to order: *${prod.name} (${prod.weight})* for ₹${prod.price}.\n`;
    }
  } else if (cart.length > 0) {
    text += "I'd like to place an order for the following items:\n";
    cart.forEach((item, idx) => {
      text += `${idx + 1}. ${item.title} (${item.weight || ''}) x ${item.quantity} = ₹${item.price * item.quantity}\n`;
    });
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const ship = subtotal >= CONFIG.SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
    text += `\n*Subtotal:* ₹${subtotal}\n*Shipping:* ${ship === 0 ? 'FREE' : '₹' + ship}\n*Total:* ₹${subtotal + ship}\n`;
  } else {
    text += "I'd like to know more about your clean roasted snacks collection.";
  }

  text += '\nPlease share details on payment and dispatch!';
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
};

// --- PRODUCT GRID RENDERING (DYNAMIC) ---
window.renderProductsGrid = (containerId, filterCategory = 'all') => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const catalog = window.VeyanoProducts ? window.VeyanoProducts.getAll() : (window.DEFAULT_PRODUCTS || []);
  let filtered = catalog;

  if (filterCategory === 'trial-packs' || filterCategory === 'trial') {
    filtered = catalog.filter(p => p.is_trial);
  } else if (filterCategory === 'combos' || filterCategory === 'combo') {
    filtered = catalog.filter(p => p.is_combo);
  } else if (filterCategory === 'new') {
    filtered = catalog.filter(p => p.is_new && p.stock_status === 'in_stock');
  } else if (filterCategory && filterCategory !== 'all') {
    filtered = catalog.filter(p => p.category === filterCategory);
  }

  // For general grids: hide products with stock_status === 'hidden'
  // Keep coming_soon products in grid only if they are trial products (shown as "Coming Soon" teasers)
  // Non-trial coming_soon products are excluded from purchasable grids
  if (filterCategory !== 'trial-packs' && filterCategory !== 'trial') {
    filtered = filtered.filter(p => 
      p.stock_status !== 'hidden' && 
      !(p.stock_status === 'coming_soon' && p.is_trial)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p>No products found in this category right now. New snacks launching soon!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const isComingSoon = product.stock_status === 'coming_soon';
    const isOutOfStock = product.stock_status === 'out_of_stock';
    const isAvailable = !isComingSoon && !isOutOfStock && product.price != null;

    // Coming Soon card: no price, no cart button, no product detail link
    if (isComingSoon) {
      return `
        <div class="product-card" id="card-${product.id}" style="opacity: 0.88;">
          <div class="product-card-media">
            <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" class="product-card-img base-img" loading="lazy" style="filter: grayscale(15%);">
            <div class="product-badge-group">
              <span class="badge badge-coming-soon">Coming Soon</span>
              ${product.is_trial ? '<span class="badge badge-trial">Trial Pack</span>' : ''}
            </div>
          </div>
          <div class="product-card-body">
            <h3 class="product-card-title" style="color: var(--text-primary);">${escapeHtml(product.name)}</h3>
            <p class="product-card-desc">${escapeHtml(product.short_description)}</p>
            <div class="product-card-actions">
              <a href="https://wa.me/919350598909?text=${encodeURIComponent('Hi VEYANO! I\'d like to be notified when trial packs launch.')}" 
                 class="btn btn-sm btn-outline" style="grid-column: 1/-1;" target="_blank" rel="noopener">
                Notify Me on WhatsApp
              </a>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="product-card" id="card-${product.id}">
        <div class="product-card-media">
          <a href="product.html?slug=${product.slug || product.id}">
            <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" class="product-card-img base-img" loading="lazy">
            <img src="${product.hoverImage || product.images[0]}" alt="${escapeHtml(product.name)}" class="product-card-img hover-img" loading="lazy">
          </a>
          <div class="product-badge-group">
            ${product.is_trial ? '<span class="badge badge-trial">Trial Pack</span>' : ''}
            ${product.is_new ? '<span class="badge badge-new">New</span>' : ''}
            ${product.is_featured && !product.is_trial ? '<span class="badge badge-featured">Popular</span>' : ''}
            ${isOutOfStock ? '<span class="badge badge-coming-soon">Out of Stock</span>' : ''}
          </div>
          <span class="badge-weight">${product.weight}</span>
        </div>
        <div class="product-card-body">
          <h3 class="product-card-title">
            <a href="product.html?slug=${product.slug || product.id}">${escapeHtml(product.name)}</a>
          </h3>
          <p class="product-card-desc">${escapeHtml(product.short_description)}</p>
          <div class="product-card-price-row">
            <span class="product-price-current">₹${product.price}</span>
            ${product.mrp && product.mrp > product.price ? `<span class="product-price-mrp">₹${product.mrp}</span>` : ''}
          </div>
          <div class="product-card-actions">
            ${isOutOfStock ? `
              <button class="btn btn-sm btn-outline" style="grid-column: 1/-1; cursor: default; opacity: 0.6;" disabled>Out of Stock</button>
            ` : `
              <button class="btn btn-sm btn-accent" onclick="window.addToCart('${product.id}')">Add to Cart</button>
              <a href="product.html?slug=${product.slug || product.id}" class="btn btn-sm btn-outline">Details</a>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
};


// --- CLERK AUTHENTICATION INTEGRATION ---
const CLERK_PUBLISHABLE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.CLERK_PUBLISHABLE_KEY) 
  ? CONFIG.CLERK_PUBLISHABLE_KEY 
  : 'pk_test_cG9ldGljLWJ1enphcmQtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA';

function getClerkFrontendApi(key) {
  try {
    const parts = (key || '').split('_');
    if (parts.length >= 3 && parts[2]) {
      return atob(parts[2]).replace(/\$$/, '');
    }
  } catch (e) {
    console.warn('Error parsing Clerk publishable key:', e);
  }
  return 'poetic-buzzard-27.clerk.accounts.dev';
}

async function initClerkAuth() {
  try {
    if (!window.Clerk) {
      const frontendApi = getClerkFrontendApi(CLERK_PUBLISHABLE_KEY);
      const scriptUrl = `https://${frontendApi}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;

      const clerkScript = document.createElement('script');
      clerkScript.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
      clerkScript.async = true;
      clerkScript.crossOrigin = 'anonymous';
      clerkScript.src = scriptUrl;
      
      await new Promise((resolve, reject) => {
        clerkScript.addEventListener('load', resolve);
        clerkScript.addEventListener('error', (err) => {
          console.error('Failed to load Clerk script from', scriptUrl, err);
          reject(err);
        });
        document.head.appendChild(clerkScript);
      });
    }

    if (!window.Clerk) {
      console.error('Clerk object not found after script load');
      return;
    }

    clerk = window.Clerk;

    await clerk.load({
      signInUrl: '/login.html',
      signUpUrl: '/signup.html'
    });

    // Render navbar auth UI
    renderAuthUI();
    syncCheckoutAddressSelector();
    syncUserWithBackend();

    // Listen to real-time auth changes (Sign In / Sign Out / Token refresh)
    if (typeof clerk.addListener === 'function') {
      clerk.addListener(() => {
        renderAuthUI();
        syncCheckoutAddressSelector();
        syncUserWithBackend();
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect_url') || '/index.html';

    // Mount SignIn on login.html
    const signInContainer = document.getElementById('clerk-signin-container');
    if (signInContainer) {
      signInContainer.innerHTML = '';
      clerk.mountSignIn(signInContainer, {
        routing: 'hash',
        signUpUrl: '/signup.html',
        fallbackRedirectUrl: redirectUrl,
        afterSignInUrl: redirectUrl
      });
    }

    // Mount SignUp on signup.html
    const signUpContainer = document.getElementById('clerk-signup-container');
    if (signUpContainer) {
      signUpContainer.innerHTML = '';
      clerk.mountSignUp(signUpContainer, {
        routing: 'hash',
        signInUrl: '/login.html',
        fallbackRedirectUrl: redirectUrl,
        afterSignUpUrl: redirectUrl
      });
    }
  } catch (err) {
    console.warn('Clerk SDK initialization note:', err);
  }
}

function renderAuthUI() {
  const navAuthContainers = document.querySelectorAll('#nav-auth-container, .nav-auth-mount');
  if (clerk && clerk.user) {
    navAuthContainers.forEach(container => {
      if (container) {
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button onclick="window.openAddressesModal()" class="btn btn-sm btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">📍 Saved Addresses</button>
            <div class="user-button-mount"></div>
          </div>
        `;
        const mountEl = container.querySelector('.user-button-mount');
        if (mountEl) clerk.mountUserButton(mountEl);
      }
    });
  } else {
    navAuthContainers.forEach(container => {
      if (container) {
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button onclick="window.openAddressesModal()" class="btn btn-sm btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">📍 Saved Addresses</button>
            <a href="login.html" class="nav-link" style="font-size: 0.9rem; font-weight:600;">Sign In</a>
          </div>
        `;
      }
    });
  }
}

async function syncUserWithBackend() {
  if (!clerk || !clerk.user || !clerk.session) return;
  try {
    const token = await clerk.session.getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (err) {
    console.warn('Background user sync notice:', err.message);
  }
}

// --- SAVED ADDRESS STORAGE & PERSISTENCE ---
function getSavedAddresses() {
  let list = [];
  try {
    const local = JSON.parse(localStorage.getItem('veyano_saved_addresses')) || [];
    if (Array.isArray(local)) list = local;
  } catch (e) {}

  if (clerk && clerk.user && clerk.user.unsafeMetadata && Array.isArray(clerk.user.unsafeMetadata.addresses)) {
    const clerkAddresses = clerk.user.unsafeMetadata.addresses;
    clerkAddresses.forEach(ca => {
      if (!list.some(la => la.address === ca.address && la.pincode === ca.pincode)) {
        list.push(ca);
      }
    });
  }
  return list;
}

async function persistSavedAddresses(addresses) {
  try {
    localStorage.setItem('veyano_saved_addresses', JSON.stringify(addresses));
  } catch (e) {}

  if (clerk && clerk.user) {
    try {
      await clerk.user.update({
        unsafeMetadata: {
          ...(clerk.user.unsafeMetadata || {}),
          addresses: addresses
        }
      });
    } catch (err) {
      console.warn('Clerk address metadata update notice:', err);
    }
  }

  syncCheckoutAddressSelector();
  renderModalAddressList();
}

window.saveAddressFromCheckout = async function(showToastFlag = true) {
  const name = document.getElementById('ship-name')?.value.trim();
  const phone = document.getElementById('ship-phone')?.value.trim();
  const email = document.getElementById('ship-email')?.value.trim() || '';
  const address = document.getElementById('ship-address')?.value.trim();
  const landmark = document.getElementById('ship-landmark')?.value.trim() || '';
  const pincode = document.getElementById('ship-pincode')?.value.trim();
  const city = document.getElementById('ship-city')?.value.trim();
  const state = document.getElementById('ship-state')?.value || '';

  if (!name || !phone || !address || !pincode) {
    if (showToastFlag) showToast('Please complete name, phone, address, and pincode first.', 'error');
    return false;
  }

  const newAddr = {
    id: 'addr_' + Date.now(),
    name,
    phone,
    email,
    address,
    landmark,
    pincode,
    city: city || 'City',
    state: state || 'State'
  };

  const current = getSavedAddresses();
  const existingIdx = current.findIndex(a => 
    a.address?.toLowerCase() === address.toLowerCase() && 
    a.pincode === pincode
  );

  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...newAddr };
  } else {
    current.unshift(newAddr);
  }

  await persistSavedAddresses(current);
  if (showToastFlag) showToast('Address saved for future orders!');
  return true;
};

function syncCheckoutAddressSelector() {
  const container = document.getElementById('checkout-saved-addresses');
  if (!container) return;

  const addresses = getSavedAddresses();
  if (addresses.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="saved-address-selector-box">
      <div class="saved-address-header">
        <span class="saved-address-title">📍 Saved Delivery Addresses (${addresses.length})</span>
        <button type="button" onclick="window.openAddressesModal()" class="saved-address-manage-btn">+ Manage</button>
      </div>
      <select id="saved-address-dropdown" class="form-control" style="font-size: 0.88rem; background: #fff; cursor: pointer;">
        <option value="">-- Choose a saved address --</option>
        ${addresses.map((a, i) => `<option value="${i}">${escapeHtml(a.name)} — ${escapeHtml(a.address)}, ${escapeHtml(a.city)} (${escapeHtml(a.pincode)})</option>`).join('')}
        <option value="new">➕ Enter a new address...</option>
      </select>
    </div>
  `;

  document.getElementById('saved-address-dropdown')?.addEventListener('change', (e) => {
    const idx = e.target.value;
    if (idx === 'new') {
      if (document.getElementById('ship-name')) document.getElementById('ship-name').value = '';
      if (document.getElementById('ship-phone')) document.getElementById('ship-phone').value = '';
      if (document.getElementById('ship-email')) document.getElementById('ship-email').value = '';
      if (document.getElementById('ship-address')) document.getElementById('ship-address').value = '';
      if (document.getElementById('ship-landmark')) document.getElementById('ship-landmark').value = '';
      if (document.getElementById('ship-city')) document.getElementById('ship-city').value = '';
      if (document.getElementById('ship-pincode')) document.getElementById('ship-pincode').value = '';
      if (document.getElementById('ship-state')) document.getElementById('ship-state').value = '';
      document.getElementById('ship-name')?.focus();
      return;
    }

    if (idx !== '' && addresses[idx]) {
      const a = addresses[idx];
      if (document.getElementById('ship-name')) document.getElementById('ship-name').value = a.name || '';
      if (document.getElementById('ship-phone')) document.getElementById('ship-phone').value = a.phone || '';
      if (document.getElementById('ship-email')) document.getElementById('ship-email').value = a.email || '';
      if (document.getElementById('ship-address')) document.getElementById('ship-address').value = a.address || '';
      if (document.getElementById('ship-landmark')) document.getElementById('ship-landmark').value = a.landmark || '';
      if (document.getElementById('ship-pincode')) document.getElementById('ship-pincode').value = a.pincode || '';
      if (document.getElementById('ship-city')) document.getElementById('ship-city').value = a.city || '';
      if (document.getElementById('ship-state') && a.state) {
        const stateSelect = document.getElementById('ship-state');
        const matched = Array.from(stateSelect.options).find(opt => opt.value.toLowerCase() === a.state.toLowerCase());
        if (matched) stateSelect.value = matched.value;
      }
      showToast(`Loaded address for ${a.name}`);
    }
  });
}

// --- ADDRESS MODAL MANAGEMENT ---
window.openAddressesModal = () => {
  let modal = document.getElementById('addresses-modal-overlay');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'addresses-modal-overlay';
  modal.className = 'cart-overlay open';
  modal.style.zIndex = '3000';
  modal.innerHTML = `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 92%; max-width: 520px; background: #fff; border-radius: var(--radius-lg, 12px); padding: 1.75rem; box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1)); max-height: 88vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-subtle, #e5e7eb); padding-bottom: 0.75rem;">
        <h3 style="font-size: 1.25rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">📍 Saved Addresses</h3>
        <button onclick="document.getElementById('addresses-modal-overlay').remove()" style="background:none; border:none; font-size:1.6rem; cursor:pointer; line-height: 1; color: var(--text-muted);">&times;</button>
      </div>

      ${(!clerk || !clerk.user) ? `
        <div style="background: rgba(192, 139, 92, 0.08); border-left: 3px solid var(--accent-color, #c08b5c); padding: 0.6rem 0.85rem; border-radius: 4px; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
          💡 Addresses are securely saved on this device. <a href="login.html" style="color: var(--accent-color); font-weight: 600; text-decoration: underline;">Sign In</a> to sync across devices.
        </div>
      ` : ''}

      <div id="modal-address-list"></div>

      <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-subtle, #e5e7eb);">
      <h4 style="font-size: 1rem; margin-bottom: 0.85rem; color: var(--accent-color, #c08b5c); font-weight: 600;">+ Add New Address</h4>
      <form id="modal-address-form" onsubmit="window.saveNewModalAddress(event)">
        <div class="form-group"><input type="text" id="m-name" class="form-control" placeholder="Full Name *" required minlength="3"></div>
        <div class="form-row">
          <div class="form-group"><input type="tel" id="m-phone" class="form-control" placeholder="10-digit Phone *" required pattern="[6-9][0-9]{9}"></div>
          <div class="form-group"><input type="email" id="m-email" class="form-control" placeholder="Email Address"></div>
        </div>
        <div class="form-group"><textarea id="m-address" class="form-control" placeholder="House/Flat No, Building, Street Address *" rows="2" required></textarea></div>
        <div class="form-group"><input type="text" id="m-landmark" class="form-control" placeholder="Landmark (Optional)"></div>
        <div class="form-row">
          <div class="form-group"><input type="text" id="m-pincode" class="form-control" placeholder="6-digit PIN *" required pattern="[0-9]{6}"></div>
          <div class="form-group"><input type="text" id="m-city" class="form-control" placeholder="City *" required></div>
        </div>
        <div class="form-group">
          <select id="m-state" class="form-control" required>
            <option value="" disabled selected>Select State *</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            <option value="Assam">Assam</option>
            <option value="Bihar">Bihar</option>
            <option value="Chhattisgarh">Chhattisgarh</option>
            <option value="Goa">Goa</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Haryana">Haryana</option>
            <option value="Himachal Pradesh">Himachal Pradesh</option>
            <option value="Jharkhand">Jharkhand</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Manipur">Manipur</option>
            <option value="Meghalaya">Meghalaya</option>
            <option value="Mizoram">Mizoram</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Odisha">Odisha</option>
            <option value="Punjab">Punjab</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Telangana">Telangana</option>
            <option value="Tripura">Tripura</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Uttarakhand">Uttarakhand</option>
            <option value="West Bengal">West Bengal</option>
            <option value="Delhi">Delhi</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
            <option value="Ladakh">Ladakh</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button type="submit" class="btn btn-sm btn-accent" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem;">Save Address</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  renderModalAddressList();

  // Wire up pincode auto-fill in modal
  const mPin = document.getElementById('m-pincode');
  const mCity = document.getElementById('m-city');
  const mState = document.getElementById('m-state');
  if (mPin) {
    mPin.addEventListener('input', async () => {
      const pin = mPin.value.trim();
      if (/^[1-9][0-9]{5}$/.test(pin)) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/orders/pincode/${pin}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              if (mCity && !mCity.value) mCity.value = data.district || '';
              if (mState && data.state) {
                const matched = Array.from(mState.options).find(opt => opt.value.toLowerCase() === data.state.toLowerCase());
                if (matched) mState.value = matched.value;
              }
            }
          }
        } catch (err) {}
      }
    });
  }
};

function renderModalAddressList() {
  const container = document.getElementById('modal-address-list');
  if (!container) return;

  const addresses = getSavedAddresses();
  if (addresses.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem 0;">No saved addresses yet. Add one below!</p>';
    return;
  }

  container.innerHTML = addresses.map((a, i) => `
    <div class="address-card-item">
      <div class="addr-details">
        <div class="addr-name">${escapeHtml(a.name)} ${a.phone ? `<span style="font-weight: 400; color: var(--text-secondary); font-size: 0.85rem;">(${escapeHtml(a.phone)})</span>` : ''}</div>
        <div class="addr-text">
          ${escapeHtml(a.address)}${a.landmark ? `, <em>${escapeHtml(a.landmark)}</em>` : ''}<br>
          ${escapeHtml(a.city)}, ${escapeHtml(a.state || '')} - <strong>${escapeHtml(a.pincode)}</strong>
        </div>
      </div>
      <div class="addr-actions">
        <button type="button" onclick="window.useAddressInCheckout(${i})" class="btn btn-sm btn-accent" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">Use Address</button>
        <button type="button" onclick="window.deleteSavedAddress(${i})" style="background:none; border:none; color:#ef4444; font-size:0.78rem; cursor:pointer; text-decoration: underline; margin-top: 0.2rem;">Delete</button>
      </div>
    </div>
  `).join('');
}

window.useAddressInCheckout = (index) => {
  const addresses = getSavedAddresses();
  if (!addresses[index]) return;
  const a = addresses[index];

  if (document.getElementById('ship-name')) document.getElementById('ship-name').value = a.name || '';
  if (document.getElementById('ship-phone')) document.getElementById('ship-phone').value = a.phone || '';
  if (document.getElementById('ship-email')) document.getElementById('ship-email').value = a.email || '';
  if (document.getElementById('ship-address')) document.getElementById('ship-address').value = a.address || '';
  if (document.getElementById('ship-landmark')) document.getElementById('ship-landmark').value = a.landmark || '';
  if (document.getElementById('ship-pincode')) document.getElementById('ship-pincode').value = a.pincode || '';
  if (document.getElementById('ship-city')) document.getElementById('ship-city').value = a.city || '';
  if (document.getElementById('ship-state') && a.state) {
    const stateSelect = document.getElementById('ship-state');
    const matched = Array.from(stateSelect.options).find(opt => opt.value.toLowerCase() === a.state.toLowerCase());
    if (matched) stateSelect.value = matched.value;
  }

  document.getElementById('addresses-modal-overlay')?.remove();

  // If cart drawer exists, open it and navigate to step 2
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer && overlay) {
    drawer.classList.add('open');
    overlay.classList.add('open');
    if (typeof goToStep === 'function') goToStep(2);
  }

  showToast(`Applied ${a.name}'s address to checkout.`);
};

window.saveNewModalAddress = async (e) => {
  e.preventDefault();

  const newAddr = {
    id: 'addr_' + Date.now(),
    name: document.getElementById('m-name')?.value.trim() || '',
    phone: document.getElementById('m-phone')?.value.trim() || '',
    email: document.getElementById('m-email')?.value.trim() || '',
    address: document.getElementById('m-address')?.value.trim() || '',
    landmark: document.getElementById('m-landmark')?.value.trim() || '',
    city: document.getElementById('m-city')?.value.trim() || '',
    pincode: document.getElementById('m-pincode')?.value.trim() || '',
    state: document.getElementById('m-state')?.value || ''
  };

  const current = getSavedAddresses();
  current.unshift(newAddr);

  try {
    await persistSavedAddresses(current);
    showToast('Address saved successfully!');
    renderModalAddressList();
    document.getElementById('modal-address-form')?.reset();
  } catch (err) {
    showToast('Failed to save address.', 'error');
  }
};

window.deleteSavedAddress = async (index) => {
  const current = getSavedAddresses();
  if (index >= 0 && index < current.length) {
    current.splice(index, 1);
    try {
      await persistSavedAddresses(current);
      showToast('Address removed.');
      renderModalAddressList();
    } catch (err) {
      showToast('Failed to delete address.', 'error');
    }
  }
};

// --- INITIALIZATION & EVENT BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Drawer Toggle
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const mobileDrawer = document.getElementById('mobile-menu-drawer');
  const mobileOverlay = document.getElementById('mobile-drawer-overlay');
  const mobileClose = document.getElementById('mobile-drawer-close');

  const openMobileMenu = () => {
    mobileDrawer?.classList.add('open');
    mobileOverlay?.classList.add('open');
  };
  const closeMobileMenu = () => {
    mobileDrawer?.classList.remove('open');
    mobileOverlay?.classList.remove('open');
  };

  mobileToggle?.addEventListener('click', openMobileMenu);
  mobileClose?.addEventListener('click', closeMobileMenu);
  mobileOverlay?.addEventListener('click', closeMobileMenu);

  // 2. Cart Icon & Drawer Controls
  document.querySelectorAll('.cart-trigger-btn, .cart-icon-btn, #cart-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCart(true);
    });
  });

  document.getElementById('close-cart-btn')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-overlay')?.addEventListener('click', () => toggleCart(false));

  document.getElementById('next-step-btn')?.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Please add items to your cart first!', 'error');
      return;
    }
    goToStep(2);
  });

  document.getElementById('back-to-cart-btn')?.addEventListener('click', () => goToStep(1));
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);

  // Payment radio listener
  document.querySelectorAll('input[name="paymentMethod"]').forEach(r => {
    r.addEventListener('change', updateCartUI);
  });

  // 3. Category Filter Buttons (on Homepage / Shop)
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.dataset.category || 'all';
      window.renderProductsGrid('products-grid-container', cat);
    });
  });

  // Render initial products grid if container exists
  if (document.getElementById('products-grid-container')) {
    window.renderProductsGrid('products-grid-container', 'all');
  }

  // 4. Accessible FAQ Accordions
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      }
    });
  });

  // 5. Product Page Image Gallery Thumbnail Swapper
  document.querySelectorAll('.product-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const mainImg = document.getElementById('main-product-img') || document.getElementById('main-product-image');
      const src = thumb.dataset.src;
      if (mainImg && src) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
          mainImg.src = src;
          mainImg.style.opacity = '1';
        }, 150);
      }
    });
  });

  // 6. Info Accordions (on Product Detail Page)
  document.querySelectorAll('.info-accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.info-accordion-item');
      if (item) {
        item.classList.toggle('open');
      }
    });
  });

  // 7. Initialize Pincode Autofill & Cart
  initPincodeAutofill();
  updateCartUI();

  // 8. Auto-open cart if query param has ?cart=open
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('cart') === 'open' || window.location.pathname === '/cart') {
    setTimeout(() => toggleCart(true), 400);
  }

  // 9. Load Clerk SDK
  initClerkAuth();
});
