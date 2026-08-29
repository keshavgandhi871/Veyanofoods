/**
 * public/admin.js — Enterprise Admin & Operations Controller
 * Full RBAC enforcement, dynamic product master sync, inventory ledger, and audit explorer.
 */

const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:3001' : '';

let ADMIN_STATE = {
  token: localStorage.getItem('veyano_admin_token') || null,
  role: localStorage.getItem('veyano_admin_role') || 'OWNER',
  name: localStorage.getItem('veyano_admin_name') || 'Admin',
  orders: [],
  filteredOrders: [],
  customers: [],
  filteredCustomers: [],
  products: [],
  inventoryLedger: [],
  approvals: [],
  auditLogs: [],
  finance: null,
  leads: [],
  currentOrderFilter: 'all',
  retailers: [],
  filteredRetailers: [],
  retailStockMatrix: [],
  retailFollowups: [],
  currentRetailFilter: 'all',
  currentRetailerProfileId: null
};

document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  checkAuthAndLoad();
});

// ── Tab Switching ─────────────────────────────────────────────────────────────
function initTabNavigation() {
  const tabs = document.querySelectorAll('.admin-nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.admin-nav-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

  const targetTabBtn = document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`);
  const targetContent = document.getElementById(tabId);

  if (targetTabBtn) targetTabBtn.classList.add('active');
  if (targetContent) targetContent.style.display = 'block';
}

// ── Auth Handling ─────────────────────────────────────────────────────────────
async function handleAdminLogin(e) {
  e.preventDefault();
  const passcode = document.getElementById('admin-passcode').value.trim();
  const role = document.getElementById('login-role-select').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, role })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    ADMIN_STATE.token = data.token;
    ADMIN_STATE.role = data.role;
    ADMIN_STATE.name = data.name;

    localStorage.setItem('veyano_admin_token', data.token);
    localStorage.setItem('veyano_admin_role', data.role);
    localStorage.setItem('veyano_admin_name', data.name);

    document.getElementById('admin-auth-gate').style.display = 'none';
    updateRoleBadge();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

function handleAdminLogout() {
  localStorage.removeItem('veyano_admin_token');
  localStorage.removeItem('veyano_admin_role');
  localStorage.removeItem('veyano_admin_name');
  window.location.reload();
}

async function checkAuthAndLoad() {
  if (!ADMIN_STATE.token) {
    document.getElementById('admin-auth-gate').style.display = 'flex';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/auth/verify`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    if (!res.ok) throw new Error('Session expired');

    document.getElementById('admin-auth-gate').style.display = 'none';
    updateRoleBadge();
    refreshDashboardData();
  } catch (e) {
    localStorage.removeItem('veyano_admin_token');
    document.getElementById('admin-auth-gate').style.display = 'flex';
  }
}

function updateRoleBadge() {
  const badge = document.getElementById('current-role-badge');
  const secRole = document.getElementById('sec-current-role');
  if (badge) badge.innerText = `👑 ${ADMIN_STATE.role}`;
  if (secRole) secRole.innerText = ADMIN_STATE.role;
}

function switchRole(newRole) {
  ADMIN_STATE.role = newRole;
  localStorage.setItem('veyano_admin_role', newRole);
  updateRoleBadge();
  alert(`Switched active simulator role to: ${newRole}`);
  refreshDashboardData();
}

// ── Data Refresh Orchestrator ─────────────────────────────────────────────────
async function refreshDashboardData() {
  await Promise.all([
    fetchAnalytics(),
    fetchOrders(),
    fetchCustomers(),
    fetchProducts(),
    fetchInventoryLedger(),
    fetchApprovals(),
    fetchAuditLogs(),
    fetchFinanceSummary(),
    fetchLeads(),
    fetchRetailDashboard(),
    fetchRetailers(),
    fetchRetailStock(),
    fetchRetailFollowups()
  ]);
}

// ── 1. Fetch Analytics & KPIs ─────────────────────────────────────────────────
async function fetchAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById('kpi-revenue').innerText = `₹${(data.totalRevenue || 0).toLocaleString('en-IN')}`;
    document.getElementById('kpi-total-orders').innerText = data.totalOrders || 0;
    document.getElementById('kpi-total-customers').innerText = data.totalCustomers || 0;
    document.getElementById('kpi-pending-fulfillment').innerText = data.pendingOrders || 0;
    document.getElementById('kpi-aov').innerText = `₹${data.aov || 0}`;

    document.getElementById('overview-pending-orders').innerText = data.pendingOrders || 0;
    document.getElementById('overview-pending-approvals').innerText = data.pendingApprovals || 0;
    document.getElementById('badge-approvals-count').innerText = data.pendingApprovals || 0;
  } catch (e) {
    console.warn('Analytics fetch error:', e);
  }
}

// ── 2. Fetch & Render Orders ──────────────────────────────────────────────────
async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.orders = resJson.data || [];
    document.getElementById('badge-orders-count').innerText = ADMIN_STATE.orders.length;
    updateOrderStatusCounts();
    filterOrdersTable();
  } catch (e) {
    console.warn('Orders fetch error:', e);
  }
}

function updateOrderStatusCounts() {
  const counts = { all: ADMIN_STATE.orders.length, pending: 0, processing: 0, shipped: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
  ADMIN_STATE.orders.forEach(o => {
    const s = o.status || 'pending';
    if (counts[s] !== undefined) counts[s]++;
  });

  document.getElementById('count-all-orders').innerText = counts.all;
  document.getElementById('count-pending-orders').innerText = counts.pending;
  document.getElementById('count-processing-orders').innerText = counts.processing;
  document.getElementById('count-shipped-orders').innerText = counts.shipped;
  document.getElementById('count-out-orders').innerText = counts.out_for_delivery;
  document.getElementById('count-delivered-orders').innerText = counts.delivered;
  document.getElementById('count-cancelled-orders').innerText = counts.cancelled;
}

function setOrderStatusFilter(status, btn) {
  ADMIN_STATE.currentOrderFilter = status;
  document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterOrdersTable();
}

function filterOrdersTable() {
  const q = (document.getElementById('orders-search-input')?.value || '').toLowerCase();
  ADMIN_STATE.filteredOrders = ADMIN_STATE.orders.filter(o => {
    const matchStatus = ADMIN_STATE.currentOrderFilter === 'all' || (o.status || 'pending') === ADMIN_STATE.currentOrderFilter;
    const matchQuery = !q || 
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q) ||
      (o.customer_email || '').toLowerCase().includes(q) ||
      (o.shipping_city || '').toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  if (ADMIN_STATE.filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">No orders found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.filteredOrders.map(order => {
    const status = order.status || 'pending';
    const statusClass = `status-${status}`;
    const items = order.items || [];
    const itemsSummary = items.map(i => `<span style="display:block; font-size:0.8rem;">• ${i.quantity}x <strong>${escapeHtml(i.product_name)}</strong></span>`).join('');
    const fullAddress = `${escapeHtml(order.shipping_address || '')}, ${escapeHtml(order.shipping_city || '')}, ${escapeHtml(order.shipping_state || '')} - ${escapeHtml(order.shipping_pincode || '')}`;

    return `
      <tr>
        <td>
          <strong style="font-family:'Outfit',sans-serif; color:#0f172a;">${escapeHtml(order.order_number || 'VFO-XXXX')}</strong>
          <div style="font-size:0.75rem; color:#64748b;">${new Date(order.created_at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}</div>
        </td>
        <td>
          <div style="font-weight:600; color:#0f172a;">${escapeHtml(order.customer_name || 'Customer')}</div>
          <div style="font-size:0.78rem; color:#475569;">📞 ${escapeHtml(order.customer_phone || '—')}</div>
          <div style="font-size:0.75rem; color:#64748b;">✉️ ${escapeHtml(order.customer_email || '—')}</div>
        </td>
        <td>
          <div style="font-size:0.8rem; color:#334155; max-width: 220px; line-height: 1.4;">${fullAddress}</div>
        </td>
        <td>${itemsSummary || '<span style="color:#94a3b8;">No items</span>'}</td>
        <td>
          <div style="font-size:0.95rem; font-weight:700; color:#0f172a;">₹${(order.total_amount || 0).toLocaleString('en-IN')}</div>
          <span class="${order.is_cod ? 'payment-badge-cod' : 'payment-badge-paid'}">${order.is_cod ? 'COD' : 'PREPAID'}</span>
        </td>
        <td>
          <span class="order-status-badge ${statusClass}">${status.replace(/_/g, ' ')}</span>
        </td>
        <td>
          ${order.awb_code ? `<div style="font-size:0.78rem;"><strong>${escapeHtml(order.courier_name || 'Courier')}:</strong> ${escapeHtml(order.awb_code)}</div>` : '<span style="color:#94a3b8; font-size:0.78rem;">Unassigned</span>'}
        </td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button onclick="openTrackingModal('${order.id}')" class="btn btn-sm btn-outline" style="font-size:0.74rem; padding:0.25rem 0.5rem;" title="Edit Tracking & Status">🚚 Update</button>
            <button onclick="openOrderDetailsModal('${order.id}')" class="btn btn-sm btn-outline" style="font-size:0.74rem; padding:0.25rem 0.5rem;" title="View Complete Receipt">👁️ Details</button>
            <button onclick="deleteOrder('${order.id}')" class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:none; font-size:0.74rem; padding:0.25rem 0.45rem;" title="Delete Order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to delete order "${orderId}"? This will remove the order permanently.`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ reason: 'Deleted by admin via Orders Table' })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to delete order');

    ADMIN_STATE.orders = ADMIN_STATE.orders.filter(o => o.id !== orderId);
    ADMIN_STATE.filteredOrders = ADMIN_STATE.filteredOrders.filter(o => o.id !== orderId);
    document.getElementById('badge-orders-count').innerText = ADMIN_STATE.orders.length;
    renderOrdersTable();
    alert(`🗑️ Order ${orderId} deleted successfully.`);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 3. Customers Directory ────────────────────────────────────────────────────
async function fetchCustomers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/customers`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.customers = resJson.data || [];
    document.getElementById('badge-customers-count').innerText = ADMIN_STATE.customers.length;
    filterCustomersTable();
  } catch (e) {
    console.warn('Customers fetch error:', e);
  }
}

function filterCustomersTable() {
  const q = (document.getElementById('customers-search-input')?.value || '').toLowerCase();
  ADMIN_STATE.filteredCustomers = ADMIN_STATE.customers.filter(c => {
    return !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q);
  });
  renderCustomersTable();
}

function renderCustomersTable() {
  const tbody = document.getElementById('admin-customers-table-body');
  if (!tbody) return;

  if (ADMIN_STATE.filteredCustomers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No customers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.filteredCustomers.map(cust => {
    const addresses = (cust.savedAddresses || []).map(a => `<div style="font-size:0.76rem; color:#475569;">📍 ${escapeHtml(typeof a === 'string' ? a : a.formatted || 'Address')}</div>`).join('');

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:#0f172a;">${escapeHtml(cust.name)}</div>
          <div style="font-size:0.72rem; color:#64748b;">Joined: ${new Date(cust.createdAt).toLocaleDateString('en-IN')}</div>
        </td>
        <td>
          <span style="font-family:monospace; font-size:0.82rem; background:#f1f5f9; padding:0.15rem 0.4rem; border-radius:4px;">${escapeHtml(cust.email)}</span>
        </td>
        <td>
          <a href="https://wa.me/91${(cust.phone || '').replace(/[^0-9]/g, '')}" target="_blank" style="color:#16a34a; text-decoration:none; font-weight:600; font-size:0.82rem;">
            💬 ${escapeHtml(cust.phone)}
          </a>
        </td>
        <td>
          <span style="font-size:0.74rem; background:#e0e7ff; color:#3730a3; padding:0.2rem 0.5rem; border-radius:9999px; font-weight:600;">${cust.authType}</span>
        </td>
        <td style="max-width: 250px;">${addresses || '<span style="color:#94a3b8; font-size:0.78rem;">None saved</span>'}</td>
        <td style="font-weight:700;">${cust.totalOrders}</td>
        <td style="font-weight:700; color:#0f172a;">₹${(cust.totalSpent || 0).toLocaleString('en-IN')}</td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button onclick="openCustomerModal('${cust.email}')" class="btn btn-sm btn-outline" style="font-size:0.74rem; padding:0.25rem 0.5rem;">👁️ History</button>
            <button onclick="deleteCustomer('${cust.id || cust.email}')" class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:none; font-size:0.74rem; padding:0.25rem 0.45rem;" title="Delete Customer">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteCustomer(customerId) {
  if (!confirm(`Are you sure you want to delete customer "${customerId}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ reason: 'Deleted by admin via Customers Table' })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to delete customer');

    ADMIN_STATE.customers = ADMIN_STATE.customers.filter(c => c.id !== customerId && c.email !== customerId);
    ADMIN_STATE.filteredCustomers = ADMIN_STATE.filteredCustomers.filter(c => c.id !== customerId && c.email !== customerId);
    document.getElementById('badge-customers-count').innerText = ADMIN_STATE.customers.length;
    renderCustomersTable();
    alert(`🗑️ Customer profile removed successfully.`);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 4. Product Master & Single Source of Truth ────────────────────────────────
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.products = resJson.data || [];
    renderProductsTable();
    renderOverviewProducts();
  } catch (e) {
    console.warn('Products fetch error:', e);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  tbody.innerHTML = ADMIN_STATE.products.map(prod => {
    const isLowStock = prod.stock <= (prod.reorder_threshold || 25) && prod.stock_status !== 'coming_soon';

    return `
      <tr>
        <td>
          <img src="${prod.images?.[0] || 'assets/plain.webp'}" alt="${escapeHtml(prod.name)}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0;">
        </td>
        <td>
          <strong style="color:#0f172a;">${escapeHtml(prod.name)}</strong>
          <div style="font-size:0.75rem; font-family:monospace; color:#64748b;">SKU: ${escapeHtml(prod.sku)}</div>
        </td>
        <td><span style="font-size:0.8rem; text-transform:capitalize;">${escapeHtml(prod.category)}</span></td>
        <td>${escapeHtml(prod.weight || '200g')}</td>
        <td>
          <div style="font-weight:700; color:#0f172a;">₹${prod.price || 0}</div>
          <div style="font-size:0.74rem; color:#94a3b8; text-decoration:line-through;">MRP: ₹${prod.mrp || 0}</div>
        </td>
        <td>
          <div style="font-weight:700; color:${isLowStock ? '#dc2626' : '#0f172a'};">${prod.stock} units</div>
          ${isLowStock ? '<span style="font-size:0.7rem; background:#fee2e2; color:#dc2626; padding:0.1rem 0.4rem; border-radius:4px; font-weight:700;">LOW STOCK</span>' : ''}
        </td>
        <td>
          ${prod.is_trial ? '<span style="background:#fae8ff; color:#86198f; font-size:0.7rem; padding:0.15rem 0.4rem; border-radius:4px; font-weight:700;">Trial</span> ' : ''}
          ${prod.is_featured ? '<span style="background:#fef3c7; color:#b45309; font-size:0.7rem; padding:0.15rem 0.4rem; border-radius:4px; font-weight:700;">Featured</span>' : ''}
        </td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button onclick="openProductModal(true, '${prod.sku}')" class="btn btn-sm btn-outline" style="font-size:0.74rem;">✏️ Edit</button>
            <button onclick="openPriceHistoryModal('${prod.sku}')" class="btn btn-sm btn-outline" style="font-size:0.74rem;">📊 Prices</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOverviewProducts() {
  const tbody = document.getElementById('overview-products-summary');
  if (!tbody) return;

  tbody.innerHTML = ADMIN_STATE.products.map(prod => `
    <tr>
      <td><strong>${escapeHtml(prod.name)}</strong></td>
      <td>₹${prod.price || 0}</td>
      <td><strong>${prod.stock}</strong></td>
      <td><span style="font-size:0.75rem; font-weight:700; color:${prod.stock > 25 ? '#16a34a' : '#dc2626'};">${prod.stock_status.replace(/_/g, ' ').toUpperCase()}</span></td>
    </tr>
  `).join('');
}

// ── 5. Inventory Ledger ───────────────────────────────────────────────────────
async function fetchInventoryLedger() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inventory/ledger`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.inventoryLedger = resJson.data || [];
    renderInventoryLedger();
  } catch (e) {
    console.warn('Ledger fetch error:', e);
  }
}

function renderInventoryLedger() {
  const tbody = document.getElementById('admin-inventory-ledger-body');
  if (!tbody) return;

  if (ADMIN_STATE.inventoryLedger.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">No stock movements recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.inventoryLedger.map(entry => {
    const deltaStr = entry.quantity_delta > 0 ? `+${entry.quantity_delta}` : `${entry.quantity_delta}`;
    const deltaColor = entry.quantity_delta > 0 ? '#16a34a' : '#dc2626';

    return `
      <tr>
        <td style="font-size:0.78rem; color:#64748b;">${new Date(entry.created_at).toLocaleString('en-IN')}</td>
        <td><strong>${escapeHtml(entry.sku)}</strong></td>
        <td><span style="font-size:0.75rem; background:#f1f5f9; padding:0.2rem 0.5rem; border-radius:4px; font-weight:600;">${entry.movement_type}</span></td>
        <td style="font-weight:700; color:${deltaColor};">${deltaStr}</td>
        <td>${entry.before_quantity} ➔ <strong>${entry.after_quantity}</strong></td>
        <td style="font-size:0.78rem; font-family:monospace;">${escapeHtml(entry.reference_id || '—')}</td>
        <td style="font-size:0.8rem; color:#475569;">${escapeHtml(entry.reason)} <br><span style="font-size:0.72rem; color:#94a3b8;">By: ${escapeHtml(entry.created_by)}</span></td>
      </tr>
    `;
  }).join('');
}

// ── 6. Dual-Custody Approvals Queue ───────────────────────────────────────────
async function fetchApprovals() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/approvals`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.approvals = resJson.data || [];
    renderApprovals();
  } catch (e) {
    console.warn('Approvals fetch error:', e);
  }
}

function renderApprovals() {
  const container = document.getElementById('approvals-container');
  if (!container) return;

  if (ADMIN_STATE.approvals.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 3rem; color: #64748b;">✨ No pending approval requests. All systems up to date.</div>`;
    return;
  }

  container.innerHTML = ADMIN_STATE.approvals.map(appr => {
    const isPending = appr.status === 'PENDING';
    return `
      <div style="border: 1px solid ${isPending ? '#f59e0b' : '#e2e8f0'}; border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem; background: #ffffff;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <div>
            <span style="font-size:0.75rem; background:#fef3c7; color:#b45309; padding:0.2rem 0.5rem; border-radius:9999px; font-weight:700;">${appr.request_type}</span>
            <strong style="margin-left:0.5rem; color:#0f172a;">${escapeHtml(appr.entity_name || appr.entity_id)}</strong>
          </div>
          <span style="font-size:0.78rem; font-weight:700; color:${isPending ? '#d97706' : '#16a34a'};">${appr.status}</span>
        </div>

        <div class="diff-box">
          <div class="diff-old">
            <div style="font-size:0.72rem; font-weight:700; color:#e11d48;">PREVIOUS VALUE</div>
            <pre style="margin:0.25rem 0 0; font-size:0.78rem;">${JSON.stringify(appr.requested_changes.old, null, 2)}</pre>
          </div>
          <div class="diff-new">
            <div style="font-size:0.72rem; font-weight:700; color:#16a34a;">REQUESTED NEW VALUE</div>
            <pre style="margin:0.25rem 0 0; font-size:0.78rem;">${JSON.stringify(appr.requested_changes.new, null, 2)}</pre>
          </div>
        </div>

        <div style="font-size:0.8rem; color:#64748b; margin:0.5rem 0;">
          <strong>Requested By:</strong> ${escapeHtml(appr.requested_by)} (${appr.requester_role}) • Reason: ${escapeHtml(appr.reason)}
        </div>

        ${isPending ? `
          <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.75rem;">
            <button onclick="handleApprovalDecision('${appr.id}', 'REJECT')" class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:none;">Reject Request</button>
            <button onclick="handleApprovalDecision('${appr.id}', 'APPROVE')" class="btn btn-sm btn-accent">Approve & Execute</button>
          </div>
        ` : `<div style="font-size:0.78rem; color:#16a34a;">Reviewed by ${escapeHtml(appr.reviewed_by)} on ${new Date(appr.reviewed_at).toLocaleDateString()}</div>`}
      </div>
    `;
  }).join('');
}

async function handleApprovalDecision(id, decision) {
  const remarks = prompt(`Enter optional remarks for ${decision}:`) || '';
  try {
    const res = await fetch(`${API_BASE}/api/admin/approvals/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ decision, remarks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to review approval');

    alert(`✅ Request ${decision === 'APPROVE' ? 'Approved & Committed to Database' : 'Rejected'}.`);
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 7. Immutable Audit Logs Explorer ──────────────────────────────────────────
async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.auditLogs = resJson.data || [];
    renderAuditLogs();
    renderOverviewActivityFeed();
  } catch (e) {
    console.warn('Audit logs fetch error:', e);
  }
}

function renderAuditLogs() {
  const tbody = document.getElementById('admin-audit-logs-body');
  if (!tbody) return;

  if (ADMIN_STATE.auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#64748b;">No audit entries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.auditLogs.map(log => `
    <tr>
      <td>
        <div style="font-size:0.75rem; font-family:monospace; color:#64748b;">${escapeHtml(log.event_id || log.id)}</div>
        <div style="font-size:0.75rem; color:#0f172a;">${new Date(log.timestamp).toLocaleString('en-IN')}</div>
      </td>
      <td>
        <strong style="color:#0f172a;">${escapeHtml(log.actor_name || 'Admin')}</strong>
        <div style="font-size:0.72rem; color:#38bdf8; background:#0f172a; display:inline-block; padding:0.1rem 0.35rem; border-radius:3px; font-weight:700;">${log.actor_role || 'OPERATOR'}</div>
      </td>
      <td><span style="font-weight:700; font-size:0.78rem; color:#0f172a;">${log.action}</span></td>
      <td>
        <div style="font-weight:600;">${escapeHtml(log.entity_name || log.entity_id || '—')}</div>
        <div style="font-size:0.72rem; color:#64748b;">${log.entity_type}</div>
      </td>
      <td style="max-width:280px; font-size:0.78rem;">
        ${log.previous_value ? `<span style="color:#e11d48;">Old: ${JSON.stringify(log.previous_value)}</span><br>` : ''}
        ${log.new_value ? `<span style="color:#16a34a;">New: ${JSON.stringify(log.new_value)}</span>` : ''}
      </td>
      <td style="font-size:0.8rem; color:#475569;">${escapeHtml(log.reason || '—')}</td>
    </tr>
  `).join('');
}

function renderOverviewActivityFeed() {
  const container = document.getElementById('overview-activity-feed');
  if (!container) return;

  container.innerHTML = ADMIN_STATE.auditLogs.slice(0, 8).map(log => `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:0.75rem; font-size:0.82rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <strong style="color:#0f172a;">${log.action.replace(/_/g, ' ')}</strong>
        <span style="font-size:0.72rem; color:#64748b;">${new Date(log.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
      </div>
      <div style="color:#475569; font-size:0.78rem;">${escapeHtml(log.entity_name || log.entity_type)}</div>
      <div style="font-size:0.72rem; color:#94a3b8; margin-top:0.2rem;">By ${escapeHtml(log.actor_name)} (${log.actor_role})</div>
    </div>
  `).join('');
}

// ── 8. Finance & Revenue Summary ──────────────────────────────────────────────
async function fetchFinanceSummary() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/finance/summary`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const data = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.finance = data;
    document.getElementById('fin-gross-rev').innerText = `₹${(data.grossRevenue || 0).toLocaleString('en-IN')}`;
    document.getElementById('fin-online-rev').innerText = `₹${(data.onlineRevenue || 0).toLocaleString('en-IN')}`;
    document.getElementById('fin-cod-rev').innerText = `₹${(data.codRevenue || 0).toLocaleString('en-IN')}`;
    document.getElementById('fin-aov').innerText = `₹${data.aov || 0}`;

    const tbody = document.getElementById('finance-sku-breakdown-body');
    if (tbody && data.skuBreakdown) {
      tbody.innerHTML = data.skuBreakdown.map(sku => `
        <tr>
          <td><strong>${escapeHtml(sku.name)}</strong></td>
          <td>${sku.units} units</td>
          <td style="font-weight:700; color:#0f172a;">₹${(sku.revenue || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
    }
  } catch (e) {
    console.warn('Finance fetch error:', e);
  }
}

// ── 9. B2B Leads ──────────────────────────────────────────────────────────────
async function fetchLeads() {
  const tbody = document.getElementById('admin-leads-table-body');
  if (!tbody) return;

  const mockLeads = [
    { company: 'Apex Tech Cafeteria', contact: 'Rohit Sharma', email: 'rohit@apextech.in', phone: '9810029384', city: 'Gurugram', volume: '100 kg / month', notes: 'Interested in Classic Plain & Salted 200g packs' },
    { company: 'PureBites Retailers', contact: 'Ananya Verma', email: 'ananya@purebites.com', phone: '9871102938', city: 'New Delhi', volume: '500 jars initial trial', notes: 'Requested distributor wholesale pricing' }
  ];

  tbody.innerHTML = mockLeads.map(l => `
    <tr>
      <td><strong>${escapeHtml(l.company)}</strong></td>
      <td>${escapeHtml(l.contact)}</td>
      <td>
        <div>✉️ ${escapeHtml(l.email)}</div>
        <div>📞 ${escapeHtml(l.phone)}</div>
      </td>
      <td>${escapeHtml(l.city)}</td>
      <td><span style="font-weight:700; color:#0f172a;">${escapeHtml(l.volume)}</span></td>
      <td style="font-size:0.8rem; color:#475569;">${escapeHtml(l.notes)}</td>
    </tr>
  `).join('');
}

// ── 10. Modals & Action Controllers ───────────────────────────────────────────

// Stock Modal
function openStockAdjustmentModal() {
  document.getElementById('stock-modal').classList.add('open');
}
function closeStockModal() {
  document.getElementById('stock-modal').classList.remove('open');
}
async function handleStockAdjustmentSubmit(e) {
  e.preventDefault();
  const sku = document.getElementById('stock-adjust-sku').value;
  const movementType = document.getElementById('stock-adjust-type').value;
  const quantityDelta = parseInt(document.getElementById('stock-adjust-qty').value);
  const reason = document.getElementById('stock-adjust-reason').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ sku, movementType, quantityDelta, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

    alert(`✅ Stock ledger updated: ${data.sku} now at ${data.afterQuantity} units.`);
    closeStockModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// Product Upsert Modal
function openProductModal(isEdit, sku = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-form-title');
  const form = document.getElementById('product-upsert-form');

  if (isEdit && sku) {
    title.innerText = `Edit Product SKU: ${sku}`;
    const p = ADMIN_STATE.products.find(prod => prod.sku === sku);
    if (p) {
      document.getElementById('p-form-id').value = p.id || '';
      document.getElementById('p-form-name').value = p.name || '';
      document.getElementById('p-form-sku').value = p.sku || '';
      document.getElementById('p-form-category').value = p.category || 'makhana';
      document.getElementById('p-form-price').value = p.price || 0;
      document.getElementById('p-form-mrp').value = p.mrp || 0;
      document.getElementById('p-form-short-desc').value = p.short_description || '';
      document.getElementById('p-form-desc').value = p.description || '';
      document.getElementById('p-form-stock').value = p.stock || 0;
      document.getElementById('p-form-threshold').value = p.reorder_threshold || 25;
      document.getElementById('p-form-reason').value = '';
    }
  } else {
    title.innerText = 'Add New SKU';
    form.reset();
    document.getElementById('p-form-id').value = '';
  }

  modal.classList.add('open');
}
function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
}
async function handleProductFormSubmit(e) {
  e.preventDefault();
  const payload = {
    id: document.getElementById('p-form-id').value || undefined,
    name: document.getElementById('p-form-name').value,
    sku: document.getElementById('p-form-sku').value,
    category: document.getElementById('p-form-category').value,
    price: parseInt(document.getElementById('p-form-price').value),
    mrp: parseInt(document.getElementById('p-form-mrp').value),
    short_description: document.getElementById('p-form-short-desc').value,
    description: document.getElementById('p-form-desc').value,
    stock: parseInt(document.getElementById('p-form-stock').value),
    reorder_threshold: parseInt(document.getElementById('p-form-threshold').value),
    reason: document.getElementById('p-form-reason').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save product');

    if (data.requiresApproval) {
      alert(`⚠️ ${data.message}`);
    } else {
      alert('✅ Product catalog persisted directly to database.');
    }
    closeProductModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// Price History Modal
async function openPriceHistoryModal(sku) {
  const modal = document.getElementById('price-history-modal');
  document.getElementById('price-history-subtitle').innerText = `SKU: ${sku}`;
  const body = document.getElementById('price-history-body');
  body.innerHTML = 'Loading price history...';
  modal.classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/api/admin/products/${sku}/price-history`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    const history = resJson.data || [];

    if (history.length === 0) {
      body.innerHTML = `<div style="color:#64748b; padding:1.5rem; text-align:center;">No historical price changes recorded for this SKU.</div>`;
      return;
    }

    body.innerHTML = history.map(h => `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.85rem; margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-weight:700; color:#0f172a;">
          <span>₹${h.old_price} ➔ <span style="color:#16a34a;">₹${h.new_price}</span> (MRP: ₹${h.new_mrp})</span>
          <span style="font-size:0.75rem; color:#64748b;">${new Date(h.created_at).toLocaleDateString()}</span>
        </div>
        <div style="font-size:0.8rem; color:#475569; margin-top:0.25rem;">Reason: ${escapeHtml(h.reason || 'Price update')}</div>
        <div style="font-size:0.72rem; color:#94a3b8;">Changed by: ${escapeHtml(h.changed_by)}</div>
      </div>
    `).join('');
  } catch (e) {
    body.innerHTML = `<div style="color:#dc2626;">Failed to load price history.</div>`;
  }
}
function closePriceHistoryModal() {
  document.getElementById('price-history-modal').classList.remove('open');
}

// Order Details Receipt Modal
function openOrderDetailsModal(orderId) {
  const order = ADMIN_STATE.orders.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('order-details-modal');
  document.getElementById('order-detail-title').innerText = `Order #${order.order_number || 'VFO-XXXX'}`;
  document.getElementById('order-detail-date').innerText = `Placed on ${new Date(order.created_at).toLocaleString('en-IN')}`;

  const body = document.getElementById('order-detail-body');
  const items = order.items || [];
  const fullAddress = `${order.shipping_address || ''}, ${order.shipping_city || ''}, ${order.shipping_state || ''} - ${order.shipping_pincode || ''}`;

  body.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; font-size:0.88rem;">
      <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
        <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:#0f172a;">Customer Information</h4>
        <div><strong>Name:</strong> ${escapeHtml(order.customer_name)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</div>
        <div><strong>Email:</strong> ${escapeHtml(order.customer_email || '—')}</div>
      </div>
      <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
        <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:#0f172a;">Shipping Destination</h4>
        <div>${escapeHtml(fullAddress)}</div>
      </div>
    </div>

    <h4 style="font-size:1rem; margin-bottom:0.75rem; color:#0f172a;">Itemized Breakdown</h4>
    <table class="admin-table" style="margin-bottom:1.5rem;">
      <thead>
        <tr>
          <th>SKU / Product</th>
          <th>Unit Price</th>
          <th>Quantity</th>
          <th>Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td><strong>${escapeHtml(item.product_name)}</strong> <span style="font-size:0.75rem; color:#64748b;">(${escapeHtml(item.sku)})</span></td>
            <td>₹${item.unit_price}</td>
            <td>${item.quantity}</td>
            <td style="font-weight:700;">₹${item.total_price || (item.unit_price * item.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display:flex; justify-content:flex-end;">
      <div style="width:260px; font-size:0.9rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
          <span>Subtotal:</span>
          <span>₹${order.subtotal_amount || order.total_amount}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
          <span>Shipping Fee:</span>
          <span style="color:#16a34a;">FREE</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:1.1rem; border-top:1px solid #e2e8f0; padding-top:0.5rem; color:#0f172a;">
          <span>Total Paid:</span>
          <span>₹${(order.total_amount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
}
function closeOrderDetailsModal() {
  document.getElementById('order-details-modal').classList.remove('open');
}

// Tracking Modal
function openTrackingModal(orderId) {
  const order = ADMIN_STATE.orders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('tracking-order-id').value = order.id;
  document.getElementById('tracking-modal-subtitle').innerText = `Order #${order.order_number || 'VFO-XXXX'}`;
  document.getElementById('tracking-form-status').value = order.status || 'pending';
  document.getElementById('tracking-form-courier').value = order.courier_name || '';
  document.getElementById('tracking-form-awb').value = order.awb_code || '';
  document.getElementById('tracking-form-url').value = order.tracking_url || '';
  document.getElementById('tracking-form-notes').value = order.notes || '';

  document.getElementById('tracking-modal').classList.add('open');
}
function closeTrackingModal() {
  document.getElementById('tracking-modal').classList.remove('open');
}
async function handleTrackingFormSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('tracking-order-id').value;
  const payload = {
    status: document.getElementById('tracking-form-status').value,
    courier_name: document.getElementById('tracking-form-courier').value,
    awb_code: document.getElementById('tracking-form-awb').value,
    tracking_url: document.getElementById('tracking-form-url').value,
    notes: document.getElementById('tracking-form-notes').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update order status');

    alert('✅ Order status and tracking updated.');
    closeTrackingModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// Customer Modal
function openCustomerModal(email) {
  const cust = ADMIN_STATE.customers.find(c => c.email === email);
  if (!cust) return;

  const modal = document.getElementById('customer-modal');
  document.getElementById('cust-modal-name').innerText = cust.name;
  document.getElementById('cust-modal-email').innerText = cust.email;

  const body = document.getElementById('cust-modal-body');
  const orders = cust.orders || [];

  body.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
      <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
        <div style="font-size:0.75rem; color:#64748b; font-weight:700;">TOTAL ORDERS</div>
        <div style="font-size:1.5rem; font-weight:700; color:#0f172a;">${cust.totalOrders}</div>
      </div>
      <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
        <div style="font-size:0.75rem; color:#64748b; font-weight:700;">LIFETIME VALUE</div>
        <div style="font-size:1.5rem; font-weight:700; color:#16a34a;">₹${(cust.totalSpent || 0).toLocaleString('en-IN')}</div>
      </div>
      <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
        <div style="font-size:0.75rem; color:#64748b; font-weight:700;">PHONE</div>
        <div style="font-size:1.1rem; font-weight:600; color:#0f172a; margin-top:0.25rem;">${escapeHtml(cust.phone)}</div>
      </div>
    </div>

    <h4 style="font-size:1rem; margin-bottom:0.75rem; color:#0f172a;">Order History</h4>
    <table class="admin-table">
      <thead>
        <tr>
          <th>Order Number</th>
          <th>Items Ordered</th>
          <th>Total Amount</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td><strong>${escapeHtml(o.orderNumber || o.id)}</strong></td>
            <td>${escapeHtml(o.itemsSummary || 'Items')}</td>
            <td style="font-weight:700;">₹${o.totalAmount}</td>
            <td><span class="order-status-badge status-${o.status}">${o.status}</span></td>
            <td style="font-size:0.78rem; color:#64748b;">${new Date(o.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  modal.classList.add('open');
}
function closeCustomerModal() {
  document.getElementById('customer-modal').classList.remove('open');
}

// CSV Export
function exportOrdersToCSV() {
  if (ADMIN_STATE.orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Email', 'Shipping Address', 'City', 'State', 'Pincode', 'Total Amount (INR)', 'Payment Method', 'Status', 'Courier', 'AWB'];
  const rows = ADMIN_STATE.orders.map(o => [
    o.order_number || '',
    new Date(o.created_at).toISOString(),
    `"${(o.customer_name || '').replace(/"/g, '""')}"`,
    `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
    `"${(o.customer_email || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_city || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_state || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_pincode || '').replace(/"/g, '""')}"`,
    o.total_amount || 0,
    o.payment_method || '',
    o.status || '',
    `"${(o.courier_name || '').replace(/"/g, '""')}"`,
    `"${(o.awb_code || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `veyano_orders_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── RETAIL NETWORK CONTROLLER & STATE MANAGEMENT ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Sub-Tab Navigation inside Retail Module
function switchRetailSubTab(paneId, btn) {
  document.querySelectorAll('.retail-subtab-pane').forEach(p => p.style.display = 'none');
  const retailNav = document.querySelector('#tab-retail .sub-nav-bar');
  if (retailNav) retailNav.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));

  const pane = document.getElementById(paneId);
  if (pane) pane.style.display = 'block';
  if (btn) btn.classList.add('active');

  // Refresh matching subtab data
  if (paneId === 'rsub-directory') fetchRetailers();
  if (paneId === 'rsub-stock' || paneId === 'rsub-stock-matrix') fetchRetailStock();
  if (paneId === 'rsub-supplies') fetchRetailSupplies();
  if (paneId === 'rsub-ledger') fetchRetailLedger();
  if (paneId === 'rsub-returns') fetchRetailReturns();
  if (paneId === 'rsub-followups') fetchRetailFollowups();
}

// Sub-Tab Navigation inside Retailer 360 Profile Drawer
function switchProfileTab(paneId, btn) {
  document.querySelectorAll('.profile-subtab-pane').forEach(p => p.style.display = 'none');
  const modalSubNav = document.querySelector('#retail-profile-modal .sub-nav-bar');
  if (modalSubNav) modalSubNav.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));

  const pane = document.getElementById(paneId);
  if (pane) pane.style.display = 'block';
  if (btn) btn.classList.add('active');
}

// ── 1. Fetch Retail Dashboard KPIs ────────────────────────────────────────────
async function fetchRetailDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/dashboard?_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_STATE.token}`,
        'Cache-Control': 'no-cache, no-store'
      },
      cache: 'no-store'
    });
    const resJson = await res.json();
    if (!res.ok || !resJson.data) return;

    renderRetailKPIs(resJson.data);
  } catch (err) {
    console.warn('Retail dashboard fetch error:', err);
  }
}

function renderRetailKPIs(kpis) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setEl('rkpi-total', kpis.total_retailers || 0);
  setEl('rkpi-active', kpis.active_retailers || 0);
  setEl('rkpi-with-stock', kpis.retailers_with_stock || 0);
  setEl('rkpi-low-stock', kpis.low_stock_retailers || 0);
  setEl('rkpi-reorder-due', kpis.reorder_due_retailers || 0);
  setEl('rkpi-stock-units', (kpis.total_stock_units || 0).toLocaleString('en-IN') + ' units');
  setEl('rkpi-stock-value', `₹${(kpis.total_stock_value || 0).toLocaleString('en-IN')}`);
  setEl('rkpi-credit-outstanding', `₹${(kpis.total_credit_outstanding || 0).toLocaleString('en-IN')}`);
  setEl('rkpi-amount-received', `₹${(kpis.total_amount_received || 0).toLocaleString('en-IN')}`);
  setEl('rkpi-returns', `${kpis.total_returns_count || 0} (${kpis.total_returns_units || 0} u)`);
  setEl('rkpi-capital-tied', `₹${(kpis.total_capital_tied_up || 0).toLocaleString('en-IN')}`);

  const badge = document.getElementById('badge-retailers-count');
  if (badge) badge.innerText = kpis.active_retailers || kpis.total_retailers || 0;
}

// ── 2. Fetch & Render Retailers Directory ──────────────────────────────────────
async function fetchRetailers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers?_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_STATE.token}`,
        'Cache-Control': 'no-cache, no-store'
      },
      cache: 'no-store'
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.retailers = resJson.data || [];
    filterRetailersTable();
    populateRetailerDropdowns();
  } catch (err) {
    console.warn('Retailers fetch error:', err);
  }
}

function handleRetailSearch() {
  filterRetailersTable();
}

function setRetailFilter(filterType, pillEl) {
  ADMIN_STATE.currentRetailFilter = filterType;
  const parent = pillEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
  }
  pillEl.classList.add('active');
  filterRetailersTable();
}

function handleRetailSort() {
  filterRetailersTable();
}

function filterRetailersTable() {
  const query = (document.getElementById('retail-search-input')?.value || '').toLowerCase().trim();
  const filter = ADMIN_STATE.currentRetailFilter || 'all';
  const sort = document.getElementById('retail-sort-select')?.value || 'name_asc';

  let list = [...ADMIN_STATE.retailers];

  // 1. Search filter
  if (query) {
    list = list.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.code && r.code.toLowerCase().includes(query)) ||
      (r.contact_person && r.contact_person.toLowerCase().includes(query)) ||
      (r.phone && r.phone.includes(query)) ||
      (r.city && r.city.toLowerCase().includes(query)) ||
      (r.area && r.area.toLowerCase().includes(query))
    );
  }

  // 2. Status / Flag filter
  if (filter === 'active') list = list.filter(r => r.status === 'ACTIVE');
  else if (filter === 'inactive') list = list.filter(r => r.status === 'INACTIVE' || r.status === 'ON_HOLD');
  else if (filter === 'has_stock') list = list.filter(r => (r.current_stock_units || 0) > 0);
  else if (filter === 'low_stock') list = list.filter(r => (r.current_stock_units || 0) > 0 && (r.current_stock_units || 0) < 15);
  else if (filter === 'credit_outstanding') list = list.filter(r => (r.outstanding_credit || 0) > 0);
  else if (filter === 'payment_due') list = list.filter(r => r.health_status?.is_overdue || (r.outstanding_credit || 0) > (r.credit_limit || 0));
  else if (filter === 'reorder_due') list = list.filter(r => r.health_status?.reorder_due || (r.current_stock_units || 0) === 0);

  // 3. Sorting
  if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === 'stock_high') list.sort((a, b) => (b.current_stock_value || 0) - (a.current_stock_value || 0));
  else if (sort === 'outstanding_high') list.sort((a, b) => (b.outstanding_credit || 0) - (a.outstanding_credit || 0));
  else if (sort === 'last_order') list.sort((a, b) => new Date(b.last_order_date || 0) - new Date(a.last_order_date || 0));

  ADMIN_STATE.filteredRetailers = list;
  renderRetailersTable();
}

function renderRetailersTable() {
  const tbody = document.getElementById('retailers-table-body');
  if (!tbody) return;

  if (ADMIN_STATE.filteredRetailers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 2.5rem 1rem;">No retail partners match the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.filteredRetailers.map(r => {
    const health = r.health_status || { color: 'green', label: 'HEALTHY', reasons: [] };
    const healthPill = `<span class="health-pill ${health.color}" title="${escapeHtml(health.reasons.join(' | ') || health.label)}">● ${health.label}</span>`;
    
    const formattedLastOrder = r.last_order_date ? new Date(r.last_order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';
    const formattedNextOrder = r.next_expected_order_date ? new Date(r.next_expected_order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';

    const waLink = r.whatsapp ? `https://wa.me/91${r.whatsapp.replace(/\D/g, '')}` : `https://wa.me/91${(r.phone || '').replace(/\D/g, '')}`;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #0f172a; cursor: pointer; text-decoration: underline;" onclick="openRetailProfile('${r.id}')">${escapeHtml(r.name)}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(r.code)} • ${escapeHtml(r.retailer_type || 'Store')}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(r.contact_person)}</div>
          <div style="font-size: 0.78rem; color: #64748b;">📞 ${escapeHtml(r.phone)}</div>
          <a href="${waLink}" target="_blank" style="font-size: 0.75rem; color: #059669; text-decoration: none; font-weight: 600;">💬 WhatsApp</a>
        </td>
        <td>
          <div style="font-size: 0.85rem;">${escapeHtml(r.area || '')}</div>
          <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(r.city || '')}, ${escapeHtml(r.state || '')}</div>
        </td>
        <td>
          <div style="cursor: pointer;" onclick="quickToggleStatus('${r.id}')" title="Click to toggle store status">${healthPill}</div>
          <div style="font-size: 0.72rem; color: #0284c7; cursor: pointer; margin-top: 0.2rem; text-decoration: underline;" onclick="quickToggleStatus('${r.id}')">${r.status === 'ACTIVE' ? 'Active ▾' : 'Inactive ▾'}</div>
        </td>
        <td>
          <div style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(r.current_stock_value || 0).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${r.current_stock_units || 0} units</div>
        </td>
        <td>
          <div style="font-weight: 700; font-family: 'Outfit', sans-serif; color: ${(r.outstanding_credit || 0) > 0 ? '#dc2626' : '#16a34a'};">₹${(r.outstanding_credit || 0).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.72rem; color: #64748b; cursor: pointer; text-decoration: underline;" onclick="quickEditCreditLimit('${r.id}')" title="Click to edit credit limit">Limit: ₹${(r.credit_limit || 0).toLocaleString('en-IN')} ✏️</div>
        </td>
        <td style="font-size: 0.82rem; color: #334155;">
          ${formattedLastOrder}
        </td>
        <td>
          <div style="font-size: 0.82rem; font-weight: 600; color: ${health.reorder_due ? '#e11d48' : '#334155'};">${formattedNextOrder}</div>
          ${health.reorder_due ? '<span style="font-size:0.7rem; color:#e11d48; font-weight:700;">Reorder Due!</span>' : ''}
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            <button onclick="openRetailProfile('${r.id}')" class="btn btn-sm btn-outline" style="font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.5rem;" title="View 360 Profile">360° Profile</button>
            <button onclick="openRetailSupplyModal('${r.id}')" class="btn btn-sm btn-accent" style="font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.5rem;" title="Supply Stock">+ Supply</button>
            <button onclick="openRetailPaymentModal('${r.id}')" class="btn btn-sm" style="background:#059669; color:#fff; border:none; font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.5rem;" title="Record Payment">💳 Pay</button>
            <button onclick="openRetailerModal('${r.id}')" class="btn btn-sm btn-outline" style="font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.45rem;" title="Edit Store Details & Dates">✏️ Edit</button>
            <button onclick="promptDeleteRetailer('${r.id}')" class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:none; font-size:0.74rem; font-weight: 600; padding:0.25rem 0.45rem;" title="Delete / Archive Store">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Universal Toast Notification Engine ───────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColor = type === 'error' ? '#dc2626' : (type === 'warn' ? '#d97706' : '#059669');
  const icon = type === 'error' ? '❌' : (type === 'warn' ? '⚠️' : '✅');

  toast.style.cssText = `
    background: ${bgColor};
    color: #ffffff;
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    pointer-events: auto;
    max-width: 380px;
    word-break: break-word;
    transition: all 0.3s ease;
  `;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Universal Custom Confirmation Dialog ──────────────────────────────────────
function showConfirmDialog({ title = 'Confirm Deletion', message = 'Are you sure?', confirmText = 'Delete', confirmColor = '#dc2626', icon = '🗑️' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('action-confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const iconEl = document.getElementById('confirm-modal-icon');
    const okBtn = document.getElementById('confirm-modal-ok-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

    if (!modal) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    if (iconEl) iconEl.innerText = icon;
    if (okBtn) {
      okBtn.innerText = confirmText;
      okBtn.style.background = confirmColor;
    }

    modal.classList.add('open');

    const cleanup = () => {
      modal.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
    };

    const onOk = (e) => {
      e.stopPropagation();
      cleanup();
      resolve(true);
    };

    const onCancel = (e) => {
      e.stopPropagation();
      cleanup();
      resolve(false);
    };

    const onBackdrop = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
  });
}

async function promptDeleteRetailer(retailerId) {
  const r = (ADMIN_STATE.retailers || []).find(item => item.id === retailerId || item.code === retailerId || item.retailer_code === retailerId);
  const name = r ? r.name : retailerId;

  const confirmed = await showConfirmDialog({
    title: `Delete "${name}"?`,
    message: `Are you sure you want to permanently remove "${name}" from the retail network? All associated stock positions and ledger records will be deleted.`,
    confirmText: 'Yes, Delete Permanently',
    confirmColor: '#dc2626',
    icon: '🗑️'
  });

  if (!confirmed) return;

  // Immediately remove from UI state
  ADMIN_STATE.retailers = (ADMIN_STATE.retailers || []).filter(item => item.id !== retailerId && item.code !== retailerId && item.retailer_code !== retailerId);
  filterRetailersTable();
  populateRetailerDropdowns();

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${retailerId}/hard-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_STATE.token}` },
      body: JSON.stringify({ confirmation_phrase: 'DELETE RETAILER PERMANENTLY', reason: 'Admin UI Delete' })
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to delete permanently');

    showToast(`Store "${name}" deleted permanently.`);
    refreshDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
    fetchRetailers();
  }
}

async function quickEditCreditLimit(retailerId) {
  const r = (ADMIN_STATE.retailers || []).find(item => item.id === retailerId);
  if (!r) return;
  const newLimit = prompt(`Enter new credit limit (₹) for "${r.name}":`, r.credit_limit || 20000);
  if (newLimit === null) return;
  const numLimit = parseFloat(newLimit);
  if (isNaN(numLimit) || numLimit < 0) {
    alert('⚠️ Invalid credit limit amount.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${retailerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ credit_limit: numLimit, audit_reason: `Quick edit credit limit to ₹${numLimit}` })
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to update credit limit');
    alert(`✅ Credit limit for ${r.name} updated to ₹${numLimit.toLocaleString('en-IN')}!`);
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

async function quickToggleStatus(retailerId) {
  const r = (ADMIN_STATE.retailers || []).find(item => item.id === retailerId);
  if (!r) return;
  const currentStatus = r.status || 'ACTIVE';
  const newStatus = currentStatus === 'ACTIVE' ? 'ON_HOLD' : (currentStatus === 'ON_HOLD' ? 'INACTIVE' : 'ACTIVE');

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${retailerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ status: newStatus, audit_reason: `Quick toggle status to ${newStatus}` })
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to update status');
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

function populateRetailerDropdowns() {
  const options = (ADMIN_STATE.retailers || []).map(r => `<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.city || '')})</option>`).join('');
  const selects = ['rsupply-retailer-select', 'rpay-retailer-select', 'rreturn-retailer-select', 'rrecon-retailer-select', 'rfol-retailer-select'];
  selects.forEach(sId => {
    const el = document.getElementById(sId);
    if (el) el.innerHTML = options || '<option value="">No retailers registered</option>';
  });
}

// ── 3. Retail Stock Matrix View ───────────────────────────────────────────────
async function fetchRetailStock() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/stock`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.retailStockMatrix = resJson.data || [];
    filterRetailStockMatrix();
  } catch (err) {
    console.warn('Retail stock matrix fetch error:', err);
  }
}

function filterRetailStockMatrix() {
  const skuFilter = document.getElementById('rstock-sku-filter')?.value || '';
  const cityFilter = (document.getElementById('rstock-city-filter')?.value || '').toLowerCase().trim();

  let list = [...(ADMIN_STATE.retailStockMatrix || [])];

  if (skuFilter) list = list.filter(item => item.sku === skuFilter);
  if (cityFilter) {
    list = list.filter(item => 
      (item.retailer_city && item.retailer_city.toLowerCase().includes(cityFilter)) ||
      (item.retailer_area && item.retailer_area.toLowerCase().includes(cityFilter)) ||
      (item.retailer_name && item.retailer_name.toLowerCase().includes(cityFilter))
    );
  }

  const tbody = document.getElementById('retail-stock-matrix-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b; padding:2rem 1rem;">No retail stock rows match the filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(row => {
    const lastSupplied = row.last_supplied_at ? new Date(row.last_supplied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never';
    const reorderStatus = row.reorder_forecast?.reorder_suggested 
      ? `<span class="health-pill red">● Reorder Due</span>` 
      : `<span class="health-pill green">● Stock Adequate</span>`;

    return `
      <tr>
        <td style="font-weight: 700; color: #0f172a; cursor: pointer; text-decoration: underline;" onclick="openRetailProfile('${row.retailer_id}')">${escapeHtml(row.retailer_name)}</td>
        <td style="font-size: 0.82rem; color: #64748b;">${escapeHtml(row.retailer_area || '')}, ${escapeHtml(row.retailer_city || '')}</td>
        <td><span class="role-badge-pill">${escapeHtml(row.sku)}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <input type="number" id="inline-stock-${row.retailer_id}-${row.sku}" value="${row.current_stock}" min="0" style="width: 70px; padding: 0.25rem 0.4rem; font-weight: 700; font-size: 0.9rem; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
            <button onclick="quickUpdateStock('${row.retailer_id}', '${row.sku}')" class="btn btn-sm btn-accent" style="font-size: 0.72rem; padding: 0.25rem 0.45rem;" title="Save stock count immediately">💾 Save</button>
          </div>
        </td>
        <td style="font-weight: 600; font-family: 'Outfit', sans-serif;">₹${(row.stock_value || 0).toLocaleString('en-IN')}</td>
        <td style="font-size: 0.82rem; color: #64748b;">${lastSupplied}</td>
        <td style="font-size: 0.85rem; font-weight: 600; color: ${row.reorder_forecast?.days_remaining <= 5 ? '#dc2626' : '#334155'};">${row.reorder_forecast?.days_remaining || 0} days</td>
        <td>${reorderStatus}</td>
        <td>
          <button onclick="openRetailReconcileModal('${row.retailer_id}', '${row.sku}')" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.2rem 0.45rem;">🔍 Full Audit</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function quickUpdateStock(retailerId, sku) {
  const input = document.getElementById(`inline-stock-${retailerId}-${sku}`);
  if (!input) return;
  const newCount = parseInt(input.value, 10);
  if (isNaN(newCount) || newCount < 0) {
    alert('⚠️ Please enter a valid stock number (0 or greater).');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        sku,
        physical_count: newCount,
        discrepancy_reason: 'Direct Stock Adjustment',
        notes: 'Updated directly from Retail Stock Matrix'
      })
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to update stock');
    alert(`✅ Stock for ${sku} updated to ${newCount} units!`);
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 4. Supply Orders, Financial Ledger, Returns, Follow-ups ───────────────────
async function fetchRetailSupplies() {
  const tbody = document.getElementById('retail-supplies-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:1.5rem;">Loading supply history...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    let allOrders = [];
    (resJson.data || []).forEach(r => {
      (r.supply_orders || []).forEach(o => {
        allOrders.push({ ...o, retailer_name: r.name, retailer_id: r.id });
      });
    });

    allOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (allOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#64748b; padding:2rem 1rem;">No supply orders recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = allOrders.map(o => {
      const itemsList = (o.items || []).map(i => `${i.sku} (${i.quantity}u @ ₹${i.unit_price})`).join(', ');
      const isPaid = (o.amount_paid || 0) >= (o.total_amount || 0);
      const outstanding = Math.max(0, (o.total_amount || 0) - (o.amount_paid || 0));

      return `
        <tr>
          <td style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(o.order_number)}</td>
          <td style="font-weight: 600; cursor:pointer;" onclick="openRetailProfile('${o.retailer_id}')">${escapeHtml(o.retailer_name)}</td>
          <td style="font-size: 0.82rem; color: #64748b;">${new Date(o.supply_date || o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td style="font-size: 0.78rem; color: #475569; max-width: 200px;">${escapeHtml(itemsList)}</td>
          <td style="font-weight: 700;">${o.total_units || 0}</td>
          <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(o.total_amount || 0).toLocaleString('en-IN')}</td>
          <td style="font-size: 0.82rem; color: #64748b;">${o.payment_due_date ? new Date(o.payment_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}</td>
          <td>
            <span class="health-pill ${isPaid ? 'green' : (outstanding === o.total_amount ? 'red' : 'yellow')}">
              ${isPaid ? 'PAID' : (outstanding === o.total_amount ? 'UNPAID' : 'PARTIAL')}
            </span>
          </td>
          <td style="font-weight: 700; color: ${outstanding > 0 ? '#dc2626' : '#16a34a'};">₹${outstanding.toLocaleString('en-IN')}</td>
          <td>
            ${outstanding > 0 ? `<button onclick="openRetailPaymentModal('${o.retailer_id}')" class="btn btn-sm btn-accent" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">Pay</button>` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.warn('Supply fetch error:', e);
  }
}

async function fetchRetailLedger() {
  const tbody = document.getElementById('retail-ledger-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:1.5rem;">Loading financial ledger entries...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    let allEntries = [];
    (resJson.data || []).forEach(r => {
      (r.financial_ledger || []).forEach(e => {
        allEntries.push({ ...e, retailer_name: r.name, retailer_id: r.id });
      });
    });

    allEntries.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (allEntries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b; padding:2rem 1rem;">No financial ledger records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allEntries.map(e => `
      <tr>
        <td style="font-size: 0.8rem; color: #64748b;">${new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td style="font-weight: 600; cursor:pointer;" onclick="openRetailProfile('${e.retailer_id}')">${escapeHtml(e.retailer_name)}</td>
        <td><span class="role-badge-pill">${escapeHtml(e.entry_type)}</span></td>
        <td style="font-size: 0.8rem; font-family: monospace;">${escapeHtml(e.reference_id || '—')}</td>
        <td style="font-weight: 700; color: ${e.debit > 0 ? '#dc2626' : '#64748b'};">${e.debit > 0 ? `+₹${e.debit.toLocaleString('en-IN')}` : '—'}</td>
        <td style="font-weight: 700; color: ${e.credit > 0 ? '#16a34a' : '#64748b'};">${e.credit > 0 ? `-₹${e.credit.toLocaleString('en-IN')}` : '—'}</td>
        <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(e.running_balance || 0).toLocaleString('en-IN')}</td>
        <td style="font-size: 0.78rem; color: #475569;">${escapeHtml(e.payment_method || '—')} ${e.utr_number ? `(${escapeHtml(e.utr_number)})` : ''}</td>
        <td style="font-size: 0.78rem; color: #64748b;">${escapeHtml(e.actor_name || 'System')}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.warn('Ledger fetch error:', e);
  }
}

async function fetchRetailReturns() {
  const tbody = document.getElementById('retail-returns-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:1.5rem;">Loading return & quarantine log...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    let allReturns = [];
    (resJson.data || []).forEach(r => {
      (r.returns || []).forEach(ret => {
        allReturns.push({ ...ret, retailer_name: r.name, retailer_id: r.id });
      });
    });

    allReturns.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (allReturns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#64748b; padding:2rem 1rem;">No returned food items recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = allReturns.map(ret => `
      <tr>
        <td style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(ret.return_number)}</td>
        <td style="font-weight: 600; cursor:pointer;" onclick="openRetailProfile('${ret.retailer_id}')">${escapeHtml(ret.retailer_name)}</td>
        <td style="font-size: 0.82rem; color: #64748b;">${new Date(ret.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
        <td><span class="role-badge-pill">${escapeHtml(ret.sku)}</span></td>
        <td style="font-weight: 700; color: #dc2626;">${ret.quantity} units</td>
        <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(ret.credit_amount || 0).toLocaleString('en-IN')}</td>
        <td style="font-size: 0.82rem; font-weight: 600;">${escapeHtml(ret.reason)}</td>
        <td style="font-size: 0.78rem; color: #64748b;">${escapeHtml(ret.condition || '—')} ${ret.batch_number ? `(${escapeHtml(ret.batch_number)})` : ''}</td>
        <td><span class="health-pill red">● QUARANTINED</span></td>
        <td style="font-size: 0.78rem; color: #64748b;">${escapeHtml(ret.received_by || 'Staff')}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.warn('Returns fetch error:', e);
  }
}

async function fetchRetailFollowups() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/followups`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (!res.ok) return;

    ADMIN_STATE.retailFollowups = resJson.data || [];
    renderFollowupCards();
  } catch (e) {
    console.warn('Followups fetch error:', e);
  }
}

function renderFollowupCards() {
  const container = document.getElementById('retail-followups-cards-container');
  if (!container) return;

  if (ADMIN_STATE.retailFollowups.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem;">No pending follow-ups scheduled.</div>`;
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  container.innerHTML = ADMIN_STATE.retailFollowups.map(f => {
    const isOverdue = !f.completed && f.due_date < todayStr;
    const isToday = !f.completed && f.due_date === todayStr;

    return `
      <div style="background: ${f.completed ? '#f8fafc' : (isOverdue ? '#fff1f2' : (isToday ? '#fffbeb' : '#ffffff'))}; border: 1px solid ${isOverdue ? '#fecdd3' : '#e2e8f0'}; border-radius: var(--radius-md); padding: 1.1rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; cursor: pointer;" onclick="openRetailProfile('${f.retailer_id}')">${escapeHtml(f.retailer_name)}</h4>
            <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(f.retailer_city || '')} • 📞 ${escapeHtml(f.retailer_phone || '')}</div>
          </div>
          <span class="health-pill ${f.completed ? 'green' : (isOverdue ? 'red' : (isToday ? 'yellow' : 'blue'))}">
            ${f.completed ? 'COMPLETED' : (isOverdue ? 'OVERDUE' : (isToday ? 'DUE TODAY' : 'UPCOMING'))}
          </span>
        </div>

        <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-bottom: 0.35rem;">
          📌 ${escapeHtml(f.reason)}
        </div>
        <p style="font-size: 0.8rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.4;">
          ${escapeHtml(f.notes || 'No extra notes provided.')}
        </p>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 0.6rem; font-size: 0.75rem; color: #64748b;">
          <div>📅 Due: <strong>${new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong> (${escapeHtml(f.assigned_to)})</div>
          ${!f.completed ? `<button onclick="completeFollowupTask('${f.id}')" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: #fff;">Mark Done ✓</button>` : '<span style="color:#059669; font-weight:600;">✓ Completed</span>'}
        </div>
      </div>
    `;
  }).join('');
}

async function completeFollowupTask(id) {
  const notes = prompt('Enter any outcome / resolution notes (optional):');
  if (notes === null) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/followups/${id}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ notes: notes || 'Completed via Retail Follow-ups Dashboard' })
    });

    if (!res.ok) throw new Error('Failed to complete task');
    fetchRetailFollowups();
    fetchRetailDashboard();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

function openEditFollowupModal(followupId) {
  const f = (ADMIN_STATE.retailFollowups || []).find(item => item.id === followupId);
  if (!f) return;
  const modal = document.getElementById('retail-edit-followup-modal');
  if (!modal) return;

  document.getElementById('edit-rfol-id').value = f.id;
  document.getElementById('edit-rfol-store-name').innerText = `${f.retailer_name || 'Retailer'} (Current Due: ${f.due_date})`;
  document.getElementById('edit-rfol-date').value = f.due_date || '';
  document.getElementById('edit-rfol-reason').value = f.reason || '';
  document.getElementById('edit-rfol-assignee').value = f.assigned_to || 'Keshav Gandhi';
  document.getElementById('edit-rfol-notes').value = f.notes || '';

  modal.classList.add('open');
}

function closeEditFollowupModal() {
  document.getElementById('retail-edit-followup-modal')?.classList.remove('open');
}

async function handleEditFollowupSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-rfol-id').value;
  const dueDate = document.getElementById('edit-rfol-date').value;
  const reason = document.getElementById('edit-rfol-reason').value.trim();
  const assignedTo = document.getElementById('edit-rfol-assignee').value.trim();
  const notes = document.getElementById('edit-rfol-notes').value.trim();

  const f = (ADMIN_STATE.retailFollowups || []).find(item => item.id === id);
  if (f) {
    f.due_date = dueDate;
    f.reason = reason;
    f.assigned_to = assignedTo;
    f.notes = notes;
  }

  alert('✅ Follow-up task updated successfully!');
  closeEditFollowupModal();
  renderFollowupCards();
}

// ── 5. Retailer 360° Profile Drawer ──────────────────────────────────────────
async function openRetailProfile(retailerId) {
  ADMIN_STATE.currentRetailerProfileId = retailerId;
  const modal = document.getElementById('retail-profile-modal');
  if (!modal) return;

  // 1. Optimistically find retailer in memory and open modal immediately
  const localR = (ADMIN_STATE.retailers || []).find(item => item.id === retailerId || item.code === retailerId || item.retailer_code === retailerId || item.name === retailerId);
  if (localR) {
    renderRetailProfileDrawer({
      retailer: localR,
      inventory: [],
      movements: [],
      orders: localR.supply_orders || [],
      financial_ledger: [],
      returns: localR.returns || [],
      followups: [],
      notes: [],
      change_history: []
    });
    modal.classList.add('open');
  }

  // 2. Fetch full 360 profile from backend to enrich
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${retailerId}`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    const resJson = await res.json();
    if (res.ok && resJson.data) {
      renderRetailProfileDrawer(resJson.data);
      modal.classList.add('open');
    }
  } catch (err) {
    if (!localR) alert(`❌ ${err.message}`);
  }
}

function closeRetailProfileModal() {
  document.getElementById('retail-profile-modal')?.classList.remove('open');
}

function renderRetailProfileDrawer(data) {
  const r = data.retailer;
  const health = data.health || { color: 'green', label: 'HEALTHY', reasons: [] };

  document.getElementById('rprof-name').innerText = r.name;
  document.getElementById('rprof-code').innerText = `${r.code} (${r.retailer_type || 'Store'})`;
  document.getElementById('rprof-address').innerText = `${r.address || ''}, ${r.area || ''}, ${r.city || ''} - ${r.pincode || ''}`;
  document.getElementById('rprof-contact-line').innerText = `Manager: ${r.contact_person} | 📞 ${r.phone} | Credit Terms: ${r.payment_terms} | Credit Limit: ₹${(r.credit_limit || 0).toLocaleString('en-IN')}`;

  const waLink = r.whatsapp ? `https://wa.me/91${r.whatsapp.replace(/\D/g, '')}` : `https://wa.me/91${(r.phone || '').replace(/\D/g, '')}`;
  document.getElementById('rprof-whatsapp-btn').href = waLink;

  document.getElementById('rprof-health-badge').innerHTML = `<span class="health-pill ${health.color}">● ${health.label}</span>`;

  const healthAlert = document.getElementById('rprof-health-alert');
  if (health.reasons && health.reasons.length > 0) {
    healthAlert.style.display = 'block';
    healthAlert.style.background = health.color === 'red' ? '#fff1f2' : '#fffbeb';
    healthAlert.style.color = health.color === 'red' ? '#991b1b' : '#92400e';
    healthAlert.style.border = `1px solid ${health.color === 'red' ? '#fecdd3' : '#fde68a'}`;
    healthAlert.innerHTML = `<strong>Store Health Notice:</strong> ${escapeHtml(health.reasons.join(' • '))}`;
  } else {
    healthAlert.style.display = 'none';
  }

  // KPIs
  document.getElementById('rprof-kpi-supplied').innerText = `₹${(r.total_supplied_value || 0).toLocaleString('en-IN')}`;
  document.getElementById('rprof-kpi-stock').innerText = `${r.current_stock_units || 0} units`;
  document.getElementById('rprof-kpi-stock-val').innerText = `₹${(r.current_stock_value || 0).toLocaleString('en-IN')}`;
  document.getElementById('rprof-kpi-outstanding').innerText = `₹${(r.outstanding_credit || 0).toLocaleString('en-IN')}`;
  document.getElementById('rprof-kpi-paid').innerText = `₹${(r.total_amount_received || 0).toLocaleString('en-IN')}`;
  document.getElementById('rprof-kpi-reorder').innerText = r.next_expected_order_date ? new Date(r.next_expected_order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';

  // 1. Stock Breakdown
  const stockBody = document.getElementById('rprof-stock-table-body');
  if (stockBody) {
    stockBody.innerHTML = (data.inventory || []).map(inv => `
      <tr>
        <td><span class="role-badge-pill">${escapeHtml(inv.sku)}</span></td>
        <td style="font-weight: 600;">${escapeHtml(inv.product_name)}</td>
        <td>${inv.total_supplied || 0}</td>
        <td>${inv.quantity_sold || 0}</td>
        <td>${inv.quantity_returned || 0}</td>
        <td>${inv.quantity_damaged || 0}</td>
        <td style="font-weight: 700; font-size: 1rem; color: ${inv.current_stock <= 5 ? '#dc2626' : '#0f172a'};">${inv.current_stock || 0} units</td>
        <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${((inv.current_stock || 0) * (inv.unit_price || 0)).toLocaleString('en-IN')}</td>
        <td>
          <button onclick="openRetailReconcileModal('${r.id}', '${inv.sku}')" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.2rem 0.4rem;">Audit</button>
        </td>
      </tr>
    `).join('');
  }

  // 2. Stock Ledger Movements
  const moveBody = document.getElementById('rprof-movements-table-body');
  if (moveBody) {
    moveBody.innerHTML = (data.movements || []).map(m => `
      <tr>
        <td style="font-size: 0.8rem; color: #64748b;">${new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td><span class="role-badge-pill">${escapeHtml(m.sku)}</span></td>
        <td style="font-weight: 600;">${escapeHtml(m.movement_type)}</td>
        <td style="font-weight: 700; color: ${m.quantity_delta > 0 ? '#16a34a' : '#dc2626'};">${m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}</td>
        <td style="font-size: 0.8rem;">${m.before_quantity} ➔ ${m.after_quantity}</td>
        <td style="font-size: 0.78rem; color: #475569;">${escapeHtml(m.reason || '')} ${m.reference_id ? `(${escapeHtml(m.reference_id)})` : ''}</td>
        <td style="font-size: 0.78rem; color: #64748b;">${escapeHtml(m.actor_name || 'Admin')}</td>
      </tr>
    `).join('');
  }

  // 3. Financial Ledger
  const ledBody = document.getElementById('rprof-ledger-table-body');
  if (ledBody) {
    ledBody.innerHTML = (data.ledger || []).map(e => `
      <tr>
        <td style="font-size: 0.8rem; color: #64748b;">${new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td><span class="role-badge-pill">${escapeHtml(e.entry_type)}</span></td>
        <td style="font-size: 0.8rem; font-family: monospace;">${escapeHtml(e.reference_id || '—')}</td>
        <td style="font-weight: 700; color: ${e.debit > 0 ? '#dc2626' : '#64748b'};">${e.debit > 0 ? `+₹${e.debit.toLocaleString('en-IN')}` : '—'}</td>
        <td style="font-weight: 700; color: ${e.credit > 0 ? '#16a34a' : '#64748b'};">${e.credit > 0 ? `-₹${e.credit.toLocaleString('en-IN')}` : '—'}</td>
        <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(e.running_balance || 0).toLocaleString('en-IN')}</td>
        <td style="font-size: 0.78rem; color: #475569;">${escapeHtml(e.payment_method || '—')} ${e.utr_number ? `(${escapeHtml(e.utr_number)})` : ''}</td>
        <td style="font-size: 0.78rem; color: #64748b;">${escapeHtml(e.actor_name || 'Admin')}</td>
      </tr>
    `).join('');
  }

  // 4. Supply Orders
  const ordBody = document.getElementById('rprof-orders-table-body');
  if (ordBody) {
    ordBody.innerHTML = (data.supply_orders || []).map(o => {
      const isPaid = (o.amount_paid || 0) >= (o.total_amount || 0);
      const out = Math.max(0, (o.total_amount || 0) - (o.amount_paid || 0));
      return `
        <tr>
          <td style="font-weight: 700;">${escapeHtml(o.order_number)}</td>
          <td style="font-size: 0.82rem;">${new Date(o.supply_date || o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
          <td style="font-size: 0.78rem; color: #475569;">${(o.items || []).map(i => `${i.sku} (${i.quantity}u)`).join(', ')}</td>
          <td style="font-weight: 700;">${o.total_units || 0}</td>
          <td style="font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(o.total_amount || 0).toLocaleString('en-IN')}</td>
          <td><span class="health-pill ${isPaid ? 'green' : (out === o.total_amount ? 'red' : 'yellow')}">${isPaid ? 'PAID' : (out === o.total_amount ? 'UNPAID' : 'PARTIAL')}</span></td>
          <td style="font-weight: 600; color: #059669;">₹${(o.amount_paid || 0).toLocaleString('en-IN')}</td>
          <td style="font-weight: 700; color: ${out > 0 ? '#dc2626' : '#16a34a'};">₹${out.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');
  }

  // 5. Returns
  const retBody = document.getElementById('rprof-returns-table-body');
  if (retBody) {
    retBody.innerHTML = (data.returns || []).map(ret => `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(ret.return_number)}</td>
        <td style="font-size: 0.82rem;">${new Date(ret.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
        <td><span class="role-badge-pill">${escapeHtml(ret.sku)}</span></td>
        <td style="font-weight: 700; color: #dc2626;">${ret.quantity}</td>
        <td style="font-weight: 700;">₹${(ret.credit_amount || 0).toLocaleString('en-IN')}</td>
        <td style="font-size: 0.82rem;">${escapeHtml(ret.reason)}</td>
        <td><span class="health-pill red">● QUARANTINED</span></td>
      </tr>
    `).join('');
  }

  // 6. Notes & Follow-ups
  const notesList = document.getElementById('rprof-notes-list');
  if (notesList) {
    notesList.innerHTML = (data.notes || []).map(n => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 0.65rem 0.85rem; font-size: 0.82rem;">
        <p style="margin-bottom: 0.25rem; color: #1e293b;">${escapeHtml(n.content)}</p>
        <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(n.author_name)} • ${new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `).join('') || '<p style="font-size:0.8rem; color:#64748b;">No notes recorded yet.</p>';
  }

  const fList = document.getElementById('rprof-followups-list');
  if (fList) {
    fList.innerHTML = (data.followups || []).map(f => `
      <div style="background: ${f.completed ? '#f8fafc' : '#fffbeb'}; border: 1px solid ${f.completed ? '#e2e8f0' : '#fde68a'}; border-radius: var(--radius-md); padding: 0.65rem 0.85rem; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between;">
          <strong>${escapeHtml(f.reason)}</strong>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${f.completed ? '#059669' : '#b45309'};">${f.completed ? '✓ Completed' : 'Pending'}</span>
        </div>
        <p style="margin: 0.25rem 0; color: #475569; font-size: 0.78rem;">${escapeHtml(f.notes || '')}</p>
        <div style="font-size: 0.72rem; color: #64748b;">Due: ${new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${escapeHtml(f.assigned_to)})</div>
      </div>
    `).join('') || '<p style="font-size:0.8rem; color:#64748b;">No follow-ups recorded.</p>';
  }

  // 7. Statement of Account
  const stContainer = document.getElementById('rprof-statement-container');
  if (stContainer) {
    stContainer.innerHTML = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0;">VEYANO FOODS PRIVATE LIMITED</h2>
          <p style="font-size: 0.78rem; color: #64748b; margin: 0.2rem 0 0 0;">FSSAI Lic: 20826010000397 | Email: veyanosupport@gmail.com</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0;">STATEMENT OF ACCOUNT</h3>
          <p style="font-size: 0.78rem; color: #64748b; margin: 0.2rem 0 0 0;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 1.25rem; font-size: 0.84rem;">
        <div>
          <strong>Statement To:</strong><br>
          <span style="font-size: 1rem; font-weight: 700; color: #0f172a;">${escapeHtml(r.name)}</span><br>
          ${escapeHtml(r.address || '')}, ${escapeHtml(r.city || '')}<br>
          Contact: ${escapeHtml(r.contact_person)} (📞 ${escapeHtml(r.phone)})
        </div>
        <div style="text-align: right; background: #f8fafc; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
          <div style="font-size: 0.78rem; color: #64748b;">Closing Outstanding Balance</div>
          <div style="font-size: 1.45rem; font-weight: 800; color: #dc2626; font-family: 'Outfit', sans-serif;">₹${(r.outstanding_credit || 0).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Credit Limit: ₹${(r.credit_limit || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <table class="admin-table statement-table" style="width: 100%; border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description & Reference #</th>
            <th>Type</th>
            <th style="text-align: right;">Debit (+)</th>
            <th style="text-align: right;">Credit (-)</th>
            <th style="text-align: right;">Running Balance</th>
          </tr>
        </thead>
        <tbody>
          ${(data.ledger || []).map(e => `
            <tr>
              <td style="font-size: 0.8rem;">${new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td style="font-size: 0.82rem; font-weight: 600;">${escapeHtml(e.notes || e.reference_id || 'Transaction')}</td>
              <td><span class="role-badge-pill">${escapeHtml(e.entry_type)}</span></td>
              <td style="text-align: right; font-weight: 600; color: #dc2626;">${e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '—'}</td>
              <td style="text-align: right; font-weight: 600; color: #16a34a;">${e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '—'}</td>
              <td style="text-align: right; font-weight: 700; font-family: 'Outfit', sans-serif;">₹${(e.running_balance || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align:center;">No statement entries</td></tr>'}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 0.75rem;">
        <div>For inquiries regarding this statement, please contact VEYANO Accounts at veyanosupport@gmail.com</div>
        <div><strong>Auth Signatory:</strong> Veyano Operations</div>
      </div>
    `;
  }

  // 8. Change History / Audit Trail
  const histBody = document.getElementById('rprof-history-table-body');
  if (histBody) {
    const historyLogs = data.change_history || data.history || [];
    if (historyLogs.length === 0) {
      histBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding:1.5rem;">No historical changes logged yet for this retailer.</td></tr>`;
    } else {
      histBody.innerHTML = historyLogs.map(h => {
        let diffHtml = '—';
        if (h.previous_value || h.new_value) {
          try {
            diffHtml = `<pre style="font-size:0.72rem; max-width:280px; overflow-x:auto; margin:0; white-space:pre-wrap; background:#f1f5f9; padding:0.35rem; border-radius:4px;">${escapeHtml(JSON.stringify(h.new_value || h.previous_value, null, 1))}</pre>`;
          } catch(e) {}
        }
        return `
          <tr>
            <td style="font-size:0.78rem; color:#64748b;">${new Date(h.timestamp || h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
            <td><span class="role-badge-pill">${escapeHtml(h.action || 'UPDATE')}</span></td>
            <td style="font-size:0.8rem; font-weight:600;">${escapeHtml(h.actor_name || 'Admin')} <span style="font-size:0.7rem; color:#64748b;">(${escapeHtml(h.actor_role || '')})</span></td>
            <td>${diffHtml}</td>
            <td style="font-size:0.78rem; color:#475569;">${escapeHtml(h.reason || '—')}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

async function handleAddProfileNote() {
  const input = document.getElementById('rprof-new-note-input');
  if (!input || !input.value.trim() || !ADMIN_STATE.currentRetailerProfileId) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: ADMIN_STATE.currentRetailerProfileId,
        content: input.value.trim()
      })
    });

    if (!res.ok) throw new Error('Failed to save note');
    input.value = '';
    openRetailProfile(ADMIN_STATE.currentRetailerProfileId);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

function printCurrentStatement() {
  const container = document.getElementById('rprof-statement-container');
  if (!container) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>VEYANO Statement of Account</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #cbd5e1; padding: 0.65rem 0.8rem; font-size: 0.85rem; }
          th { background: #f1f5f9; text-align: left; }
          .role-badge-pill { display: inline-block; padding: 0.2rem 0.5rem; background: #e2e8f0; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        </style>
      </head>
      <body>
        ${container.innerHTML}
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function openSupplyForCurrentRetailer() {
  if (ADMIN_STATE.currentRetailerProfileId) {
    closeRetailProfileModal();
    openRetailSupplyModal(ADMIN_STATE.currentRetailerProfileId);
  }
}

function openPaymentForCurrentRetailer() {
  if (ADMIN_STATE.currentRetailerProfileId) {
    closeRetailProfileModal();
    openRetailPaymentModal(ADMIN_STATE.currentRetailerProfileId);
  }
}

function openEditForCurrentRetailer() {
  if (ADMIN_STATE.currentRetailerProfileId) {
    const id = ADMIN_STATE.currentRetailerProfileId;
    closeRetailProfileModal();
    openRetailerModal(id);
  }
}

// ── 6. Supply Order Modal Controller ──────────────────────────────────────────
function openRetailSupplyModal(preselectedRetailerId = null) {
  const modal = document.getElementById('retail-supply-modal');
  if (!modal) return;

  populateRetailerDropdowns();

  if (preselectedRetailerId) {
    const sel = document.getElementById('rsupply-retailer-select');
    if (sel) sel.value = preselectedRetailerId;
  }

  const dateInput = document.getElementById('rsupply-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  const dueInput = document.getElementById('rsupply-due-date');
  if (dueInput) {
    const due = new Date();
    due.setDate(due.getDate() + 15);
    dueInput.value = due.toISOString().slice(0, 10);
  }

  // Populate dynamic supply items with live warehouse stock
  const tbody = document.getElementById('rsupply-items-tbody');
  if (tbody) {
    const defaultSkus = [
      { sku: 'PLAIN-200', name: 'Classic Plain Roasted Makhana', price: 239 },
      { sku: 'SALTED-200', name: 'Lightly Salted Roasted Makhana', price: 239 },
      { sku: 'PERIPERI-200', name: 'Fiery Peri-Peri Roasted Makhana', price: 239 },
      { sku: 'COMBO-600', name: 'The Trio Discovery Combo', price: 679 }
    ];

    tbody.innerHTML = defaultSkus.map(p => {
      const liveProd = (ADMIN_STATE.products || []).find(prod => prod.sku === p.sku);
      const whStock = liveProd ? liveProd.stock_quantity : 100;

      return `
        <tr data-sku="${p.sku}">
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            <div style="font-size: 0.75rem; color: #64748b;">${p.sku}</div>
          </td>
          <td>
            <span class="role-badge-pill" style="background: ${whStock < 25 ? '#fee2e2' : '#f1f5f9'}; color: ${whStock < 25 ? '#dc2626' : '#334155'}; font-weight: 700;">
              ${whStock} units
            </span>
          </td>
          <td>
            <input type="number" class="form-control rsupply-item-qty" data-sku="${p.sku}" data-price="${p.price}" value="0" min="0" max="${whStock}" style="width: 90px;" oninput="recalcSupplyTotals()">
          </td>
          <td>
            <input type="number" class="form-control rsupply-item-price" data-sku="${p.sku}" value="${p.price}" min="1" style="width: 100px;" oninput="recalcSupplyTotals()">
          </td>
          <td style="font-weight: 700; font-family: 'Outfit', sans-serif;" class="rsupply-item-total" id="rsupply-tot-${p.sku}">₹0</td>
        </tr>
      `;
    }).join('');
  }

  updateSupplyCreditWarning();
  recalcSupplyTotals();
  modal.classList.add('open');
}

function closeRetailSupplyModal() {
  document.getElementById('retail-supply-modal')?.classList.remove('open');
}

function recalcSupplyTotals() {
  let totalUnits = 0;
  let totalAmount = 0;

  const rows = document.querySelectorAll('#rsupply-items-tbody tr');
  rows.forEach(r => {
    const sku = r.getAttribute('data-sku');
    const qty = parseInt(r.querySelector('.rsupply-item-qty')?.value || 0, 10);
    const price = parseFloat(r.querySelector('.rsupply-item-price')?.value || 0);
    const lineTot = qty * price;

    totalUnits += qty;
    totalAmount += lineTot;

    const lineTotEl = document.getElementById(`rsupply-tot-${sku}`);
    if (lineTotEl) lineTotEl.innerText = `₹${lineTot.toLocaleString('en-IN')}`;
  });

  const unitsEl = document.getElementById('rsupply-total-units');
  const amtEl = document.getElementById('rsupply-total-amount');

  if (unitsEl) unitsEl.innerText = totalUnits;
  if (amtEl) amtEl.innerText = `₹${totalAmount.toLocaleString('en-IN')}`;

  updateSupplyCreditWarning(totalAmount);
}

function updateSupplyCreditWarning(newOrderAmount = 0) {
  const retId = document.getElementById('rsupply-retailer-select')?.value;
  const retailer = (ADMIN_STATE.retailers || []).find(r => r.id === retId);
  const warnBox = document.getElementById('rsupply-credit-warning');
  const warnText = document.getElementById('rsupply-credit-warning-text');

  if (!warnBox || !retailer) return;

  const currentOutstanding = retailer.outstanding_credit || 0;
  const limit = retailer.credit_limit || 20000;
  const projected = currentOutstanding + newOrderAmount;

  if (projected > limit) {
    warnBox.style.display = 'block';
    warnText.innerText = `This order will bring outstanding to ₹${projected.toLocaleString('en-IN')}, exceeding credit limit of ₹${limit.toLocaleString('en-IN')}. Dual approval or credit override will be applied.`;
  } else {
    warnBox.style.display = 'none';
  }
}

async function handleRetailSupplySubmit(e) {
  e.preventDefault();

  const retailerId = document.getElementById('rsupply-retailer-select').value;
  const supplyDate = document.getElementById('rsupply-date').value;
  const paymentTerms = document.getElementById('rsupply-terms').value;
  const paymentDueDate = document.getElementById('rsupply-due-date').value;
  const notes = document.getElementById('rsupply-notes').value;

  const items = [];
  const rows = document.querySelectorAll('#rsupply-items-tbody tr');
  rows.forEach(r => {
    const sku = r.getAttribute('data-sku');
    const qty = parseInt(r.querySelector('.rsupply-item-qty')?.value || 0, 10);
    const price = parseFloat(r.querySelector('.rsupply-item-price')?.value || 0);

    if (qty > 0) {
      items.push({ sku, quantity: qty, unit_price: price });
    }
  });

  if (items.length === 0) {
    alert('⚠️ Please specify at least 1 unit of a product to supply.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/supply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        items,
        supply_date: supplyDate,
        payment_terms: paymentTerms,
        payment_due_date: paymentDueDate,
        notes
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to record supply');

    alert(`✅ Supply order ${resJson.order?.order_number || ''} recorded successfully!`);
    closeRetailSupplyModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 7. Payment Modal Controller ───────────────────────────────────────────────
function openRetailPaymentModal(preselectedRetailerId = null) {
  const modal = document.getElementById('retail-payment-modal');
  if (!modal) return;

  populateRetailerDropdowns();

  if (preselectedRetailerId) {
    const sel = document.getElementById('rpay-retailer-select');
    if (sel) sel.value = preselectedRetailerId;
  }

  const dateInput = document.getElementById('rpay-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  updatePaymentOutstandingNotice();
  modal.classList.add('open');
}

function closeRetailPaymentModal() {
  document.getElementById('retail-payment-modal')?.classList.remove('open');
}

function updatePaymentOutstandingNotice() {
  const retId = document.getElementById('rpay-retailer-select')?.value;
  const retailer = (ADMIN_STATE.retailers || []).find(r => r.id === retId);
  const outEl = document.getElementById('rpay-outstanding-val');

  if (outEl && retailer) {
    outEl.innerText = `₹${(retailer.outstanding_credit || 0).toLocaleString('en-IN')}`;
  }
}

async function handleRetailPaymentSubmit(e) {
  e.preventDefault();

  const retailerId = document.getElementById('rpay-retailer-select').value;
  const amount = parseFloat(document.getElementById('rpay-amount').value);
  const paymentDate = document.getElementById('rpay-date').value;
  const paymentMethod = document.getElementById('rpay-method').value;
  const utrNumber = document.getElementById('rpay-ref').value;
  const notes = document.getElementById('rpay-notes').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        utr_number: utrNumber,
        notes
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to record payment');

    alert(`✅ Payment of ₹${amount.toLocaleString('en-IN')} posted to ledger successfully!`);
    closeRetailPaymentModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 8. Return & Quarantine Modal Controller ───────────────────────────────────
function openRetailReturnModal(preselectedRetailerId = null) {
  const modal = document.getElementById('retail-return-modal');
  if (!modal) return;

  populateRetailerDropdowns();

  if (preselectedRetailerId) {
    const sel = document.getElementById('rreturn-retailer-select');
    if (sel) sel.value = preselectedRetailerId;
  }

  modal.classList.add('open');
}

function closeRetailReturnModal() {
  document.getElementById('retail-return-modal')?.classList.remove('open');
}

async function handleRetailReturnSubmit(e) {
  e.preventDefault();

  const retailerId = document.getElementById('rreturn-retailer-select').value;
  const sku = document.getElementById('rreturn-sku').value;
  const quantity = parseInt(document.getElementById('rreturn-qty').value, 10);
  const reason = document.getElementById('rreturn-reason').value;
  const condition = document.getElementById('rreturn-condition').value;
  const batchNumber = document.getElementById('rreturn-batch').value;
  const creditValue = document.getElementById('rreturn-credit-val').value;
  const notes = document.getElementById('rreturn-notes').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/returns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        sku,
        quantity,
        reason,
        condition,
        batch_number: batchNumber,
        credit_amount: creditValue ? parseFloat(creditValue) : undefined,
        notes
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to record return');

    alert(`✅ Return ${resJson.return_record?.return_number || ''} recorded to QUARANTINE! Retailer inventory decremented.`);
    closeRetailReturnModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 9. Physical Stock Reconciliation Modal Controller ─────────────────────────
function openRetailReconcileModal(preselectedRetailerId = null, preselectedSku = null) {
  const modal = document.getElementById('retail-reconcile-modal');
  if (!modal) return;

  populateRetailerDropdowns();

  if (preselectedRetailerId) {
    const sel = document.getElementById('rrecon-retailer-select');
    if (sel) sel.value = preselectedRetailerId;
  }
  if (preselectedSku) {
    const skuSel = document.getElementById('rrecon-sku');
    if (skuSel) skuSel.value = preselectedSku;
  }

  updateReconcileSystemStock();
  modal.classList.add('open');
}

function closeRetailReconcileModal() {
  document.getElementById('retail-reconcile-modal')?.classList.remove('open');
}

function updateReconcileSystemStock() {
  const retId = document.getElementById('rrecon-retailer-select')?.value;
  const sku = document.getElementById('rrecon-sku')?.value;
  const sysEl = document.getElementById('rrecon-current-system-stock');

  const matrixItem = (ADMIN_STATE.retailStockMatrix || []).find(m => m.retailer_id === retId && m.sku === sku);
  const sysStock = matrixItem ? matrixItem.current_stock : 0;

  if (sysEl) sysEl.innerText = `${sysStock} units`;
  calculateReconcileDelta();
}

function calculateReconcileDelta() {
  const retId = document.getElementById('rrecon-retailer-select')?.value;
  const sku = document.getElementById('rrecon-sku')?.value;
  const physicalInput = document.getElementById('rrecon-physical-count');
  const deltaEl = document.getElementById('rrecon-delta-val');

  const matrixItem = (ADMIN_STATE.retailStockMatrix || []).find(m => m.retailer_id === retId && m.sku === sku);
  const sysStock = matrixItem ? matrixItem.current_stock : 0;
  const physicalCount = parseInt(physicalInput?.value || sysStock, 10);
  const delta = physicalCount - sysStock;

  if (deltaEl) {
    deltaEl.innerText = delta > 0 ? `+${delta}` : `${delta}`;
    deltaEl.style.color = delta === 0 ? '#16a34a' : (delta < 0 ? '#dc2626' : '#2563eb');
  }
}

async function handleRetailReconcileSubmit(e) {
  e.preventDefault();

  const retailerId = document.getElementById('rrecon-retailer-select').value;
  const sku = document.getElementById('rrecon-sku').value;
  const physicalCount = parseInt(document.getElementById('rrecon-physical-count').value, 10);
  const reason = document.getElementById('rrecon-reason').value;
  const notes = document.getElementById('rrecon-notes').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        sku,
        physical_count: physicalCount,
        discrepancy_reason: reason,
        notes
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to reconcile stock');

    alert(`✅ Stock reconciled! Delta of ${resJson.delta > 0 ? `+${resJson.delta}` : resJson.delta} logged to movement ledger.`);
    closeRetailReconcileModal();
    refreshDashboardData();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 10. Follow-up Modal Controller ────────────────────────────────────────────
function openRetailFollowupModal(preselectedRetailerId = null) {
  const modal = document.getElementById('retail-followup-modal');
  if (!modal) return;

  populateRetailerDropdowns();

  if (preselectedRetailerId) {
    const sel = document.getElementById('rfol-retailer-select');
    if (sel) sel.value = preselectedRetailerId;
  }

  const dateInput = document.getElementById('rfol-date');
  if (dateInput) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dateInput.value = nextWeek.toISOString().slice(0, 10);
  }

  modal.classList.add('open');
}

function closeRetailFollowupModal() {
  document.getElementById('retail-followup-modal')?.classList.remove('open');
}

async function handleRetailFollowupSubmit(e) {
  e.preventDefault();

  const retailerId = document.getElementById('rfol-retailer-select').value;
  const dueDate = document.getElementById('rfol-date').value;
  const reason = document.getElementById('rfol-reason').value;
  const assignedTo = document.getElementById('rfol-assignee').value;
  const notes = document.getElementById('rfol-notes').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        retailer_id: retailerId,
        due_date: dueDate,
        reason,
        assigned_to: assignedTo,
        notes
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to schedule follow-up');

    alert('✅ Follow-up task scheduled successfully!');
    closeRetailFollowupModal();
    fetchRetailFollowups();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// ── 11. Add / Edit Retailer Modal Controller ──────────────────────────────────
async function openRetailerModal(retailerId = null) {
  const modal = document.getElementById('retailer-modal');
  if (!modal) return;

  const form = document.getElementById('retailer-form');
  if (form) form.reset();

  const title = document.getElementById('retailer-modal-title');
  const idInput = document.getElementById('ret-form-id');
  const archiveBtn = document.getElementById('ret-form-archive-btn');
  const deleteBtn = document.getElementById('ret-form-delete-btn');

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  if (retailerId) {
    if (title) title.innerText = '✏️ Edit Retail Partner Master Profile';
    if (idInput) idInput.value = retailerId;

    let r = (ADMIN_STATE.retailers || []).find(item => item.id === retailerId || item.code === retailerId || item.retailer_code === retailerId || item.name === retailerId);

    const populateForm = (data) => {
      if (!data) return;
      setVal('ret-form-name', data.name);
      setVal('ret-form-code', data.code || data.retailer_code);
      setVal('ret-form-contact', data.contact_person);
      setVal('ret-form-phone', data.phone);
      setVal('ret-form-whatsapp', data.whatsapp);
      setVal('ret-form-email', data.email);
      setVal('ret-form-gstin', data.gstin);
      setVal('ret-form-type', data.retailer_type || 'Gourmet Store');
      setVal('ret-form-address', data.address);
      setVal('ret-form-area', data.area);
      setVal('ret-form-city', data.city || 'New Delhi');
      setVal('ret-form-state', data.state || 'Delhi');
      setVal('ret-form-pincode', data.pincode);
      setVal('ret-form-landmark', data.landmark);
      setVal('ret-form-gps', data.gps_coordinates);
      setVal('ret-form-status', data.status || 'ACTIVE');
      setVal('ret-form-terms', data.payment_terms || '15_DAYS');
      setVal('ret-form-limit', data.credit_limit || 20000);
      setVal('ret-form-frequency', data.reorder_frequency_days || data.usual_reorder_frequency_days || 14);
      setVal('ret-form-pref-contact', data.preferred_contact_method || 'WHATSAPP');
      setVal('ret-form-salesperson', data.assigned_salesperson || 'Keshav Gandhi');
      setVal('ret-form-notes', data.notes);
      setVal('ret-form-created-at', data.created_at ? data.created_at.slice(0, 10) : '');
      setVal('ret-form-last-order', data.last_order_date ? data.last_order_date.slice(0, 10) : '');
      const nextOrd = data.expected_next_order_date || data.next_expected_order_date;
      setVal('ret-form-next-order', nextOrd ? nextOrd.slice(0, 10) : '');
    };

    if (r) {
      populateForm(r);
    } else {
      fetch(`${API_BASE}/api/admin/retail/retailers/${retailerId}`, {
        headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
      })
        .then(res => res.json())
        .then(json => { if (json.data && json.data.retailer) populateForm(json.data.retailer); })
        .catch(() => {});
    }

    if (archiveBtn) archiveBtn.style.display = 'inline-block';
    if (deleteBtn) deleteBtn.style.display = ADMIN_STATE.role === 'OWNER' ? 'inline-block' : 'none';
  } else {
    if (title) title.innerText = '+ Add New Retail Partner';
    if (idInput) idInput.value = '';

    let maxNum = 0;
    (ADMIN_STATE.retailers || []).forEach(item => {
      const codeStr = String(item.code || item.retailer_code || item.id || '');
      const match = codeStr.match(/RET-20\d\d-(\d+)/i) || codeStr.match(/RET-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n < 2000 && n > maxNum) maxNum = n;
      }
    });
    const autoCode = `RET-${String(maxNum + 1).padStart(3, '0')}`;
    
    setVal('ret-form-code', autoCode);
    setVal('ret-form-name', '');
    setVal('ret-form-contact', '');
    setVal('ret-form-phone', '');
    setVal('ret-form-whatsapp', '');
    setVal('ret-form-email', '');
    setVal('ret-form-gstin', '');
    setVal('ret-form-type', 'Gourmet Store');
    setVal('ret-form-address', '');
    setVal('ret-form-area', '');
    setVal('ret-form-city', 'New Delhi');
    setVal('ret-form-state', 'Delhi');
    setVal('ret-form-pincode', '');
    setVal('ret-form-landmark', '');
    setVal('ret-form-gps', '');
    setVal('ret-form-status', 'ACTIVE');
    setVal('ret-form-terms', '15_DAYS');
    setVal('ret-form-limit', '20000');
    setVal('ret-form-frequency', '14');
    setVal('ret-form-pref-contact', 'WHATSAPP');
    setVal('ret-form-salesperson', 'Keshav Gandhi');
    setVal('ret-form-notes', '');
    setVal('ret-form-created-at', new Date().toISOString().slice(0, 10));
    setVal('ret-form-last-order', '');
    setVal('ret-form-next-order', '');

    if (archiveBtn) archiveBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  modal.classList.add('open');
}

function closeRetailerModal() {
  document.getElementById('retailer-modal')?.classList.remove('open');
}

async function handleRetailerFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('ret-form-id')?.value;
  const getVal = (fieldId, fallback = '') => document.getElementById(fieldId)?.value?.trim() || fallback;

  const storeName = getVal('ret-form-name');
  if (!storeName) {
    showToast('Store Name is required.', 'warn');
    return;
  }

  const phone = getVal('ret-form-phone');
  if (!phone) {
    showToast('Contact Phone is required.', 'warn');
    return;
  }

  const payload = {
    name: storeName,
    code: getVal('ret-form-code'),
    retailer_code: getVal('ret-form-code'),
    contact_person: getVal('ret-form-contact') || storeName || 'Store Manager',
    phone: phone,
    whatsapp: getVal('ret-form-whatsapp') || phone,
    email: getVal('ret-form-email'),
    gstin: getVal('ret-form-gstin'),
    retailer_type: document.getElementById('ret-form-type')?.value || 'Gourmet Store',
    address: getVal('ret-form-address') || getVal('ret-form-city') || 'Delhi',
    area: getVal('ret-form-area') || getVal('ret-form-city') || 'Delhi',
    city: getVal('ret-form-city', 'New Delhi'),
    state: getVal('ret-form-state', 'Delhi'),
    pincode: getVal('ret-form-pincode'),
    landmark: getVal('ret-form-landmark'),
    gps_coordinates: getVal('ret-form-gps'),
    status: document.getElementById('ret-form-status')?.value || 'ACTIVE',
    payment_terms: document.getElementById('ret-form-terms')?.value || '15_DAYS',
    credit_limit: parseFloat(document.getElementById('ret-form-limit')?.value || 20000),
    usual_reorder_frequency_days: parseInt(document.getElementById('ret-form-frequency')?.value || 14, 10),
    reorder_frequency_days: parseInt(document.getElementById('ret-form-frequency')?.value || 14, 10),
    preferred_contact_method: document.getElementById('ret-form-pref-contact')?.value || 'WHATSAPP',
    assigned_salesperson: getVal('ret-form-salesperson', 'Keshav Gandhi'),
    notes: getVal('ret-form-notes'),
    created_at: getVal('ret-form-created-at') || undefined,
    last_order_date: getVal('ret-form-last-order') || null,
    expected_next_order_date: getVal('ret-form-next-order') || null
  };

  try {
    const url = id ? `${API_BASE}/api/admin/retail/retailers/${id}` : `${API_BASE}/api/admin/retail/retailers`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to save retailer');

    // Optimistically update memory
    if (id) {
      const idx = ADMIN_STATE.retailers.findIndex(item => item.id === id || item.code === id);
      if (idx !== -1) {
        ADMIN_STATE.retailers[idx] = { ...ADMIN_STATE.retailers[idx], ...payload, ...(resJson.data || {}) };
      }
    } else {
      const newRet = resJson.data || { id: `RET-${Date.now()}`, ...payload };
      ADMIN_STATE.retailers.unshift(newRet);
    }

    filterRetailersTable();
    populateRetailerDropdowns();

    showToast(`Retail Partner "${payload.name}" saved successfully!`);
    closeRetailerModal();
    refreshDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Archive Current Retailer ──────────────────────────────────────────────────
async function handleArchiveCurrentRetailer() {
  const id = document.getElementById('ret-form-id')?.value;
  const name = document.getElementById('ret-form-name')?.value;
  if (!id) return;

  const confirmed = await showConfirmDialog({
    title: `Archive "${name}"?`,
    message: `Are you sure you want to archive "${name}"? Historical orders and ledger entries will be preserved.`,
    confirmText: 'Yes, Archive Store',
    confirmColor: '#d97706',
    icon: '📦'
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ reason: 'Archived via Admin Portal' })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to archive retailer');

    ADMIN_STATE.retailers = (ADMIN_STATE.retailers || []).filter(item => item.id !== id && item.code !== id && item.retailer_code !== id);
    filterRetailersTable();
    populateRetailerDropdowns();

    showToast(`Retailer ${name} archived successfully.`);
    closeRetailerModal();
    refreshDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Permanent Hard Delete Modal (Owner Only) ──────────────────────────────────
function openHardDeleteModal() {
  const retId = document.getElementById('ret-form-id')?.value;
  if (!retId) return;

  const modal = document.getElementById('retail-hard-delete-modal');
  if (!modal) return;

  document.getElementById('hard-delete-ret-id').value = retId;
  document.getElementById('hard-delete-form').reset();
  modal.classList.add('open');
}

function closeHardDeleteModal() {
  document.getElementById('retail-hard-delete-modal')?.classList.remove('open');
}

async function handleHardDeleteSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('hard-delete-ret-id').value;
  const reason = document.getElementById('hard-delete-reason')?.value.trim() || 'Store removed by owner';

  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${id}/hard-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({
        confirmation_phrase: 'DELETE RETAILER PERMANENTLY',
        reason
      })
    });

    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || 'Failed to permanently delete store');

    ADMIN_STATE.retailers = (ADMIN_STATE.retailers || []).filter(item => item.id !== id && item.code !== id && item.retailer_code !== id);
    filterRetailersTable();
    populateRetailerDropdowns();

    showToast('Retailer permanently removed from database.');
    closeHardDeleteModal();
    closeRetailerModal();
    refreshDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 12. CSV Export Handlers ───────────────────────────────────────────────────
function toggleExportMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('retail-export-menu');
  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

document.addEventListener('click', () => {
  const menu = document.getElementById('retail-export-menu');
  if (menu) menu.style.display = 'none';
});

async function downloadRetailCSV(type) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/retail/export/${type}`, {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    if (!res.ok) throw new Error('Failed to generate CSV');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veyano_retail_${type}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 13. Universal Delete & Management Dropbox Controller ─────────────────────
function openUniversalDeleteModal() {
  const modal = document.getElementById('universal-delete-modal');
  if (!modal) return;
  handleUniversalTypeChange();
  modal.classList.add('open');
}

function closeUniversalDeleteModal() {
  document.getElementById('universal-delete-modal')?.classList.remove('open');
}

function handleUniversalTypeChange() {
  const type = document.getElementById('univ-entity-type')?.value || 'retailer';
  const itemSelect = document.getElementById('univ-item-select');
  const itemLabel = document.getElementById('univ-item-label');
  const actionGroup = document.getElementById('univ-action-group');
  if (!itemSelect) return;

  if (type === 'retailer') {
    if (itemLabel) itemLabel.innerText = '2. Select Store to Delete / Archive *';
    if (actionGroup) actionGroup.style.display = 'block';
    const list = ADMIN_STATE.retailers || [];
    itemSelect.innerHTML = list.length > 0 
      ? list.map(r => `<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.city || '')}) [${escapeHtml(r.code || r.id)}]</option>`).join('')
      : '<option value="">No retailers available</option>';
  } else if (type === 'order') {
    if (itemLabel) itemLabel.innerText = '2. Select Order to Delete *';
    if (actionGroup) actionGroup.style.display = 'none';
    const list = ADMIN_STATE.orders || [];
    itemSelect.innerHTML = list.length > 0
      ? list.map(o => `<option value="${o.id}">${escapeHtml(o.order_number || o.id)} — ${escapeHtml(o.customer_name || 'Customer')} (₹${(o.total_amount || 0).toLocaleString('en-IN')}) [${o.status || 'pending'}]</option>`).join('')
      : '<option value="">No orders available</option>';
  } else if (type === 'customer') {
    if (itemLabel) itemLabel.innerText = '2. Select Customer Profile to Delete *';
    if (actionGroup) actionGroup.style.display = 'none';
    const list = ADMIN_STATE.customers || [];
    itemSelect.innerHTML = list.length > 0
      ? list.map(c => `<option value="${c.id || c.email}">${escapeHtml(c.name)} (${escapeHtml(c.email)}) [Orders: ${c.totalOrders || 0}]</option>`).join('')
      : '<option value="">No customers available</option>';
  }
}

async function executeUniversalDelete(e) {
  e.preventDefault();
  const type = document.getElementById('univ-entity-type').value;
  const id = document.getElementById('univ-item-select').value;
  const action = document.getElementById('univ-action-select')?.value || 'permanent_delete';
  const reason = document.getElementById('univ-delete-reason')?.value.trim() || 'Deleted via Universal Delete Hub';

  if (!id) {
    showToast('Please select a valid item to delete.', 'warn');
    return;
  }

  const confirmed = await showConfirmDialog({
    title: `Delete selected ${type}?`,
    message: `Are you sure you want to delete this ${type}? This action cannot be undone.`,
    confirmText: 'Confirm Delete',
    confirmColor: '#dc2626',
    icon: '🗑️'
  });
  if (!confirmed) return;

  try {
    if (type === 'retailer') {
      if (action === 'archive') {
        const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_STATE.token}` },
          body: JSON.stringify({ reason })
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || 'Failed to archive retailer');
        showToast('Store archived successfully.');
      } else {
        const res = await fetch(`${API_BASE}/api/admin/retail/retailers/${id}/hard-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_STATE.token}` },
          body: JSON.stringify({ confirmation_phrase: 'DELETE RETAILER PERMANENTLY', reason })
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || 'Failed to delete retailer permanently');
        showToast('Store permanently removed from database.');
      }
      ADMIN_STATE.retailers = (ADMIN_STATE.retailers || []).filter(r => r.id !== id && r.code !== id && r.retailer_code !== id);
      filterRetailersTable();
      populateRetailerDropdowns();
    } else if (type === 'order') {
      const res = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_STATE.token}` },
        body: JSON.stringify({ reason })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to delete order');
      ADMIN_STATE.orders = ADMIN_STATE.orders.filter(o => o.id !== id);
      ADMIN_STATE.filteredOrders = ADMIN_STATE.filteredOrders.filter(o => o.id !== id);
      renderOrdersTable();
      showToast(`Order ${id} deleted successfully.`);
    } else if (type === 'customer') {
      const res = await fetch(`${API_BASE}/api/admin/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_STATE.token}` },
        body: JSON.stringify({ reason })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to delete customer');
      ADMIN_STATE.customers = ADMIN_STATE.customers.filter(c => c.id !== id && c.email !== id);
      ADMIN_STATE.filteredCustomers = ADMIN_STATE.filteredCustomers.filter(c => c.id !== id && c.email !== id);
      renderCustomersTable();
      showToast('Customer profile deleted successfully.');
    }

    closeUniversalDeleteModal();
    refreshDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Global Window Function Exposures for UI Events ───────────────────────────
window.openRetailerModal = openRetailerModal;
window.closeRetailerModal = closeRetailerModal;
window.handleRetailerFormSubmit = handleRetailerFormSubmit;
window.openRetailSupplyModal = openRetailSupplyModal;
window.closeRetailSupplyModal = closeRetailSupplyModal;
window.handleRetailSupplySubmit = handleRetailSupplySubmit;
window.openRetailPaymentModal = openRetailPaymentModal;
window.closeRetailPaymentModal = closeRetailPaymentModal;
window.handleRetailPaymentSubmit = handleRetailPaymentSubmit;
window.openRetailReturnModal = openRetailReturnModal;
window.closeRetailReturnModal = closeRetailReturnModal;
window.handleRetailReturnSubmit = handleRetailReturnSubmit;
window.openRetailReconcileModal = openRetailReconcileModal;
window.closeRetailReconcileModal = closeRetailReconcileModal;
window.handleRetailReconcileSubmit = handleRetailReconcileSubmit;
window.openRetailFollowupModal = openRetailFollowupModal;
window.closeRetailFollowupModal = closeRetailFollowupModal;
window.handleRetailFollowupSubmit = handleRetailFollowupSubmit;
window.openEditFollowupModal = openEditFollowupModal;
window.closeEditFollowupModal = closeEditFollowupModal;
window.handleEditFollowupSubmit = handleEditFollowupSubmit;
window.completeFollowupTask = completeFollowupTask;
window.openRetailProfile = openRetailProfile;
window.closeRetailProfileModal = closeRetailProfileModal;
window.switchRetailSubTab = switchRetailSubTab;
window.switchProfileTab = switchProfileTab;
window.toggleExportMenu = toggleExportMenu;
window.downloadRetailCSV = downloadRetailCSV;
window.handleArchiveCurrentRetailer = handleArchiveCurrentRetailer;
window.openHardDeleteModal = openHardDeleteModal;
window.closeHardDeleteModal = closeHardDeleteModal;
window.handleHardDeleteSubmit = handleHardDeleteSubmit;
window.openSupplyForCurrentRetailer = openSupplyForCurrentRetailer;
window.openPaymentForCurrentRetailer = openPaymentForCurrentRetailer;
window.openEditForCurrentRetailer = openEditForCurrentRetailer;
window.quickUpdateStock = quickUpdateStock;
window.quickEditCreditLimit = quickEditCreditLimit;
window.quickToggleStatus = quickToggleStatus;
window.promptDeleteRetailer = promptDeleteRetailer;
window.deleteOrder = deleteOrder;
window.deleteCustomer = deleteCustomer;
window.openUniversalDeleteModal = openUniversalDeleteModal;
window.closeUniversalDeleteModal = closeUniversalDeleteModal;
window.handleUniversalTypeChange = handleUniversalTypeChange;
window.executeUniversalDelete = executeUniversalDelete;
window.setRetailFilter = setRetailFilter;
window.handleRetailSearch = handleRetailSearch;
window.handleRetailSort = handleRetailSort;
window.filterRetailStockMatrix = filterRetailStockMatrix;


