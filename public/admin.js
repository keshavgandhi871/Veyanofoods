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
  currentOrderFilter: 'all'
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
    fetchLeads()
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
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
          <button onclick="openCustomerModal('${cust.email}')" class="btn btn-sm btn-outline" style="font-size:0.74rem;">👁️ History</button>
        </td>
      </tr>
    `;
  }).join('');
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
