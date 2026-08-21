/**
 * VEYANO Foods — Admin Controller
 */

const ADMIN_PASSCODE_HASH = 'veyano2026';

function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('veyano_admin_auth');
  const gate = document.getElementById('admin-auth-gate');
  if (isAuth === 'true') {
    if (gate) gate.style.display = 'none';
  } else {
    if (gate) gate.style.display = 'flex';
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const input = document.getElementById('admin-passcode').value;
  if (input === ADMIN_PASSCODE_HASH) {
    sessionStorage.setItem('veyano_admin_auth', 'true');
    checkAdminAuth();
    initAdminDashboard();
  } else {
    alert('Incorrect passcode. Please check and try again.');
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem('veyano_admin_auth');
  location.reload();
}

function initAdminDashboard() {
  // Tab Switching
  document.querySelectorAll('.admin-nav-item').forEach(nav => {
    nav.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
      nav.classList.add('active');

      const targetId = nav.dataset.tab;
      ['tab-products', 'tab-orders', 'tab-leads', 'tab-settings'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === targetId) ? 'block' : 'none';
      });

      if (targetId === 'tab-products') renderAdminProductsTable();
      if (targetId === 'tab-orders') loadAdminOrders();
      if (targetId === 'tab-leads') renderAdminLeads();
    });
  });

  renderAdminProductsTable();
  renderAdminLeads();
}

// --- PRODUCTS MANAGEMENT ---
function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  const catalog = window.VeyanoProducts ? window.VeyanoProducts.getAll() : [];
  
  if (catalog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = catalog.map(p => `
    <tr>
      <td>
        <img src="${p.images?.[0] || './assets/plain.webp'}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;">
      </td>
      <td>
        <strong>${escapeHtml(p.name)}</strong><br>
        <span style="font-size: 0.8rem; color: #64748b;">SKU: ${p.sku || p.id}</span>
      </td>
      <td><span class="badge" style="background: #e2e8f0; color: #334155;">${p.categoryName || p.category}</span></td>
      <td>${p.weight || '—'}</td>
      <td><strong>${p.price != null ? '₹' + p.price : '<span style="color: #94a3b8; font-style: italic;">Not Set</span>'}</strong></td>

      <td>
        <span style="color: ${p.stock_status === 'out_of_stock' ? '#ef4444' : '#15803d'}; font-weight: 600;">
          ${p.stock || 0} (${p.stock_status || 'in_stock'})
        </span>
      </td>
      <td>
        ${p.is_trial ? '<span class="badge badge-trial">Trial</span> ' : ''}
        ${p.is_featured ? '<span class="badge badge-featured">Featured</span> ' : ''}
        ${p.is_new ? '<span class="badge badge-new">New</span>' : ''}
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn btn-sm" style="background: #fee2e2; color: #ef4444; border: none;" onclick="deleteProductItem('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openProductModal(isEdit = false) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-form-title');
  if (title) title.textContent = isEdit ? 'Edit Product SKU' : 'Add New Product SKU';
  if (modal) modal.classList.add('open');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.remove('open');
  document.getElementById('product-upsert-form')?.reset();
  document.getElementById('p-form-id').value = '';
}

function editProduct(productId) {
  const product = window.VeyanoProducts ? window.VeyanoProducts.getByIdOrSlug(productId) : null;
  if (!product) return;

  document.getElementById('p-form-id').value = product.id;
  document.getElementById('p-form-name').value = product.name;
  document.getElementById('p-form-sku').value = product.sku || '';
  document.getElementById('p-form-category').value = product.category || 'makhana';
  document.getElementById('p-form-weight').value = product.weight || '';
  document.getElementById('p-form-price').value = product.price || '';
  document.getElementById('p-form-mrp').value = product.mrp || product.price || '';
  document.getElementById('p-form-short-desc').value = product.short_description || '';
  document.getElementById('p-form-desc').value = product.description || '';
  document.getElementById('p-form-image').value = product.images?.[0] || '';
  document.getElementById('p-form-ingredients').value = product.ingredients || '';
  document.getElementById('p-form-stock').value = product.stock || 100;
  document.getElementById('p-form-status').value = product.stock_status || 'in_stock';
  
  document.getElementById('p-form-featured').checked = !!product.is_featured;
  document.getElementById('p-form-trial').checked = !!product.is_trial;
  document.getElementById('p-form-new').checked = !!product.is_new;

  openProductModal(true);
}

function deleteProductItem(productId) {
  if (confirm(`Are you sure you want to delete SKU: ${productId}?`)) {
    window.VeyanoProducts.deleteProduct(productId);
    renderAdminProductsTable();
  }
}

function handleProductFormSubmit(e) {
  e.preventDefault();
  const existingId = document.getElementById('p-form-id').value;
  const name = document.getElementById('p-form-name').value.trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = existingId || slug;

  const category = document.getElementById('p-form-category').value;
  const categoryNames = {
    'makhana': 'Roasted Makhana',
    'roasted-snacks': 'Roasted Snacks',
    'trial-packs': 'Trial Packs',
    'combos': 'Combos & Bundles'
  };

  const imageSrc = document.getElementById('p-form-image').value.trim();

  const productData = {
    id: id,
    sku: document.getElementById('p-form-sku').value.trim(),
    name: name,
    slug: slug,
    category: category,
    categoryName: categoryNames[category] || 'Roasted Snacks',
    weight: document.getElementById('p-form-weight').value.trim(),
    price: parseInt(document.getElementById('p-form-price').value),
    mrp: parseInt(document.getElementById('p-form-mrp').value),
    short_description: document.getElementById('p-form-short-desc').value.trim(),
    description: document.getElementById('p-form-desc').value.trim(),
    images: [imageSrc],
    hoverImage: imageSrc,
    ingredients: document.getElementById('p-form-ingredients').value.trim(),
    oil_information: category === 'makhana' ? '0% oil (Dry Roasted) or minimal Rice Bran Oil mist' : 'Zero Palm Oil',
    preservative_information: 'Zero artificial preservatives or MSG',
    allergens: 'Naturally gluten-free',
    fssai_information: 'FSSAI Lic. No. 20826010000397',
    shelf_life: '6 Months from packaging date',
    storage_instructions: 'Store in an airtight container in a cool, dry place',
    stock: parseInt(document.getElementById('p-form-stock').value) || 0,
    stock_status: document.getElementById('p-form-status').value,
    is_featured: document.getElementById('p-form-featured').checked,
    is_trial: document.getElementById('p-form-trial').checked,
    is_new: document.getElementById('p-form-new').checked,
    is_combo: category === 'combos'
  };

  window.VeyanoProducts.upsertProduct(productData);
  closeProductModal();
  renderAdminProductsTable();
  alert('Product SKU saved successfully! Updates are live on the website.');
}

function resetCatalogDefaults() {
  if (confirm('Restore the default catalog? This will reset custom product modifications to the factory setup.')) {
    window.VeyanoProducts.resetDefaults();
    renderAdminProductsTable();
    alert('Catalog restored to default settings.');
  }
}

// --- LIVE ORDERS VIEWER ---
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    const orders = data.data || [];

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 3rem;">No customer orders found in database yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${escapeHtml(o.order_number || o.id)}</strong></td>
        <td>${escapeHtml(o.customer_name || 'Customer')}</td>
        <td>${escapeHtml(o.customer_phone || '')} &bull; ${escapeHtml(o.shipping_city || '')}</td>
        <td>
          <span class="badge" style="background: ${o.is_cod ? '#fef3c7' : '#dcfce7'}; color: ${o.is_cod ? '#92400e' : '#15803d'};">
            ${(o.payment_method || 'cod').toUpperCase()}
          </span>
        </td>
        <td><strong>₹${o.total_amount || 0}</strong></td>
        <td>${new Date(o.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; padding: 2rem;">
          <p>Orders endpoint is secured by admin credentials or database is offline locally.</p>
        </td>
      </tr>
    `;
  }
}

// --- B2B INQUIRIES ---
function renderAdminLeads() {
  const tbody = document.getElementById('admin-leads-table-body');
  if (!tbody) return;

  const leads = JSON.parse(localStorage.getItem('veyano_b2b_leads') || '[]');

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 3rem;">No corporate inquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(l => `
    <tr>
      <td><strong>${escapeHtml(l.company)}</strong></td>
      <td>${escapeHtml(l.name)}</td>
      <td>${escapeHtml(l.email)}<br>${escapeHtml(l.phone)}</td>
      <td>${escapeHtml(l.city)}</td>
      <td><span class="badge badge-trial">${escapeHtml(l.quantity)}</span></td>
      <td><small>${escapeHtml(l.notes || 'N/A')}</small></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  if (sessionStorage.getItem('veyano_admin_auth') === 'true') {
    initAdminDashboard();
  }
});
