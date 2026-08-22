/**
 * VEYANO Foods — Executive Admin Controller (Hardened Security)
 * Zero hardcoded passcodes, HMAC session tokens, and encrypted backend API authorization.
 */

// Global cache
window.ADMIN_ORDERS = [];
window.ADMIN_CUSTOMERS = [];
window.CURRENT_ORDER_STATUS_FILTER = 'all';

function getAdminToken() {
  return sessionStorage.getItem('veyano_admin_token') || '';
}

function getAdminHeaders() {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function checkAdminAuth() {
  const token = getAdminToken();
  const gate = document.getElementById('admin-auth-gate');
  
  if (!token) {
    if (gate) gate.style.display = 'flex';
    return false;
  }

  try {
    const res = await fetch('/api/admin/auth/verify', { headers: getAdminHeaders() });
    if (res.ok) {
      if (gate) gate.style.display = 'none';
      return true;
    } else {
      sessionStorage.removeItem('veyano_admin_token');
      if (gate) gate.style.display = 'flex';
      return false;
    }
  } catch (e) {
    // If offline, preserve screen
    return false;
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const input = document.getElementById('admin-passcode').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn ? btn.textContent : 'Unlock';

  if (!input) {
    alert('Please enter the admin passcode.');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Verifying Security Token...';
    }

    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: input })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Authentication failed. Access denied.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
      return;
    }

    // Save secure session token
    sessionStorage.setItem('veyano_admin_token', data.token);
    
    const gate = document.getElementById('admin-auth-gate');
    if (gate) gate.style.display = 'none';

    initAdminDashboard();
  } catch (err) {
    alert('Login error: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem('veyano_admin_token');
  location.reload();
}

function initAdminDashboard() {
  // Navigation Tabs Setup
  document.querySelectorAll('.admin-nav-item').forEach(nav => {
    nav.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
      nav.classList.add('active');

      const targetId = nav.dataset.tab;
      ['tab-orders', 'tab-customers', 'tab-products', 'tab-leads', 'tab-settings'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === targetId) ? 'block' : 'none';
      });

      if (targetId === 'tab-orders') loadAdminOrders();
      if (targetId === 'tab-customers') loadAdminCustomers();
      if (targetId === 'tab-products') renderAdminProductsTable();
      if (targetId === 'tab-leads') renderAdminLeads();
    });
  });

  // Load all operational data
  refreshDashboardData();
}

async function refreshDashboardData() {
  await Promise.allSettled([
    loadAdminAnalytics(),
    loadAdminOrders(),
    loadAdminCustomers()
  ]);
  renderAdminProductsTable();
  renderAdminLeads();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── 1. KPI ANALYTICS ─────────────────────────────────────────────────────────
async function loadAdminAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics', { headers: getAdminHeaders() });
    if (res.status === 401 || res.status === 403) {
      handleAdminLogout();
      return;
    }
    if (!res.ok) throw new Error('Analytics request failed');
    const data = await res.json();

    const revEl = document.getElementById('kpi-revenue');
    const ordEl = document.getElementById('kpi-total-orders');
    const custEl = document.getElementById('kpi-total-customers');
    const pendEl = document.getElementById('kpi-pending-fulfillment');

    if (revEl) revEl.textContent = `₹${(data.totalRevenue || 0).toLocaleString('en-IN')}`;
    if (ordEl) ordEl.textContent = data.totalOrders || 0;
    if (custEl) custEl.textContent = data.totalCustomers || 0;
    if (pendEl) pendEl.textContent = data.pendingOrders || 0;

    const ordBadge = document.getElementById('badge-orders-count');
    const custBadge = document.getElementById('badge-customers-count');
    if (ordBadge) ordBadge.textContent = data.totalOrders || 0;
    if (custBadge) custBadge.textContent = data.totalCustomers || 0;
  } catch (err) {
    console.warn('[Admin] Analytics fetch note:', err.message);
  }
}

// ── 2. ORDERS & LIVE TRACKING MANAGEMENT ─────────────────────────────────────
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/orders', { headers: getAdminHeaders() });
    if (res.status === 401 || res.status === 403) {
      handleAdminLogout();
      return;
    }
    if (!res.ok) throw new Error(`Orders fetch failed (${res.status})`);
    const data = await res.json();
    window.ADMIN_ORDERS = data.data || [];

    updateOrderStatusCounts(window.ADMIN_ORDERS);
    filterOrdersTable();
  } catch (err) {
    console.warn('[Admin] Orders error:', err.message);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #64748b; padding: 2.5rem;">
          <p style="margin-bottom: 0.5rem;">⚠️ Unable to sync live orders from backend.</p>
          <button onclick="loadAdminOrders()" class="btn btn-sm btn-outline">Retry Connection</button>
        </td>
      </tr>
    `;
  }
}

function updateOrderStatusCounts(orders) {
  const counts = {
    all: orders.length,
    pending: 0,
    processing: 0,
    shipped: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0
  };

  orders.forEach(o => {
    const s = (o.status || 'pending').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
    else counts.pending++;
  });

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('count-all-orders', counts.all);
  setTxt('count-pending-orders', counts.pending);
  setTxt('count-processing-orders', counts.processing);
  setTxt('count-shipped-orders', counts.shipped);
  setTxt('count-out-orders', counts.out_for_delivery);
  setTxt('count-delivered-orders', counts.delivered);
  setTxt('count-cancelled-orders', counts.cancelled);
}

function setOrderStatusFilter(status, btnElement) {
  window.CURRENT_ORDER_STATUS_FILTER = status;
  document.querySelectorAll('.status-filter-pills .status-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  filterOrdersTable();
}

function filterOrdersTable() {
  const query = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();
  const filter = window.CURRENT_ORDER_STATUS_FILTER || 'all';

  let filtered = (window.ADMIN_ORDERS || []).filter(order => {
    const orderStatus = (order.status || 'pending').toLowerCase();
    if (filter !== 'all' && orderStatus !== filter) return false;

    if (!query) return true;
    const matchFields = [
      order.order_number,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.shipping_city,
      order.shipping_pincode,
      order.awb_code,
      order.courier_name
    ].map(f => (f || '').toLowerCase());

    return matchFields.some(field => field.includes(query));
  });

  renderAdminOrdersTable(filtered);
}

function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #94a3b8; padding: 3rem;">
          No matching customer orders found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isCOD = order.is_cod || (order.payment_method || '').toLowerCase() === 'cod';
    const status = (order.status || 'pending').toLowerCase();

    const items = order.items || [];
    const itemsPreview = items.length > 0
      ? items.map(i => `<div style="font-size:0.8rem; margin-bottom:0.2rem;"><strong>${i.quantity}x</strong> ${escapeHtml(i.product_name || i.sku)}</div>`).join('')
      : `<span style="color:#94a3b8; font-size:0.8rem;">Standard Package</span>`;

    const hasTracking = !!order.awb_code;
    const trackingHtml = hasTracking
      ? `
        <div style="font-size: 0.82rem;">
          <div><strong>${escapeHtml(order.courier_name || 'Courier')}</strong></div>
          <div style="color: #475569; font-family: monospace;">AWB: ${escapeHtml(order.awb_code)}</div>
          ${order.tracking_url ? `<a href="${escapeHtml(order.tracking_url)}" target="_blank" style="color:#2563eb; text-decoration:underline; font-size:0.75rem;">Track Package ↗</a>` : ''}
        </div>
      `
      : `<span style="color: #94a3b8; font-size: 0.8rem;">No AWB assigned</span>`;

    return `
      <tr>
        <!-- Order # & Date -->
        <td>
          <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; color: #0f172a;">
            ${escapeHtml(order.order_number || order.id.slice(0, 8))}
          </div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">${dateStr}</div>
        </td>

        <!-- Customer & Contact -->
        <td>
          <strong>${escapeHtml(order.customer_name || 'Valued Customer')}</strong>
          <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
            ✉️ <a href="mailto:${escapeHtml(order.customer_email || '')}" style="color: inherit;">${escapeHtml(order.customer_email || 'No email')}</a>
          </div>
          <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
            📞 <a href="tel:${escapeHtml(order.customer_phone || '')}" style="color: inherit;">${escapeHtml(order.customer_phone || '—')}</a>
            ${order.customer_phone ? `<a href="https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}" target="_blank" style="margin-left: 0.4rem; color: #16a34a; font-size: 0.8rem;" title="Chat on WhatsApp">💬</a>` : ''}
          </div>
        </td>

        <!-- Shipping Address -->
        <td>
          <div style="font-size: 0.82rem; line-height: 1.35; color: #334155;">
            ${escapeHtml(order.shipping_address || '—')}
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: #64748b; margin-top: 0.25rem;">
            📍 ${escapeHtml(order.shipping_city || '')}, ${escapeHtml(order.shipping_state || '')} - ${escapeHtml(order.shipping_pincode || '')}
          </div>
        </td>

        <!-- Items -->
        <td>
          ${itemsPreview}
        </td>

        <!-- Amount & Payment -->
        <td>
          <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.05rem; color: #0f172a;">
            ₹${(order.total_amount || 0).toLocaleString('en-IN')}
          </div>
          <span class="${isCOD ? 'payment-badge-cod' : 'payment-badge-paid'}" style="margin-top: 0.25rem; display: inline-block;">
            ${isCOD ? '💵 Cash on Delivery' : '💳 Prepaid Online'}
          </span>
        </td>

        <!-- Fulfillment Status Changer -->
        <td>
          <select class="status-quick-select" onchange="quickUpdateOrderStatus('${order.id}', this.value)" style="margin-bottom: 0.35rem;">
            <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="processing" ${status === 'processing' ? 'selected' : ''}>📦 Processing</option>
            <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
            <option value="out_for_delivery" ${status === 'out_for_delivery' ? 'selected' : ''}>🛵 Out for Delivery</option>
            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
          <div>
            <span class="order-status-badge status-${status}">
              ${status.replace(/_/g, ' ')}
            </span>
          </div>
        </td>

        <!-- Tracking & Courier -->
        <td>
          ${trackingHtml}
          <div style="margin-top: 0.4rem;">
            <button onclick="openTrackingModal('${order.id}')" class="btn btn-sm btn-outline" style="padding: 0.25rem 0.55rem; font-size: 0.74rem;">
              ✏️ Update AWB
            </button>
          </div>
        </td>

        <!-- Actions -->
        <td>
          <button onclick="openOrderDetailsModal('${order.id}')" class="btn btn-sm btn-outline" style="padding: 0.4rem 0.7rem; font-size: 0.78rem;">
            👁️ Details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function quickUpdateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error('Status update failed');
    
    const target = (window.ADMIN_ORDERS || []).find(o => o.id === orderId);
    if (target) target.status = newStatus;

    updateOrderStatusCounts(window.ADMIN_ORDERS);
    filterOrdersTable();
    loadAdminAnalytics();
  } catch (err) {
    alert('Failed to update order status: ' + err.message);
    loadAdminOrders();
  }
}

// ── 3. TRACKING MODAL ────────────────────────────────────────────────────────
function openTrackingModal(orderId) {
  const order = (window.ADMIN_ORDERS || []).find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('tracking-order-id').value = order.id;
  document.getElementById('tracking-modal-subtitle').textContent = `Order #${order.order_number || order.id} • ${order.customer_name || 'Customer'}`;
  document.getElementById('tracking-form-status').value = order.status || 'pending';
  document.getElementById('tracking-form-courier').value = order.courier_name || '';
  document.getElementById('tracking-form-awb').value = order.awb_code || '';
  document.getElementById('tracking-form-url').value = order.tracking_url || '';
  document.getElementById('tracking-form-notes').value = order.notes || '';

  const modal = document.getElementById('tracking-modal');
  if (modal) modal.classList.add('open');
}

function closeTrackingModal() {
  const modal = document.getElementById('tracking-modal');
  if (modal) modal.classList.remove('open');
}

async function handleTrackingFormSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('tracking-order-id').value;
  const status = document.getElementById('tracking-form-status').value;
  const courier_name = document.getElementById('tracking-form-courier').value.trim();
  const awb_code = document.getElementById('tracking-form-awb').value.trim();
  const tracking_url = document.getElementById('tracking-form-url').value.trim();
  const notes = document.getElementById('tracking-form-notes').value.trim();

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, courier_name, awb_code, tracking_url, notes })
    });

    if (!res.ok) throw new Error('Failed to update tracking');
    const result = await res.json();

    const idx = (window.ADMIN_ORDERS || []).findIndex(o => o.id === orderId);
    if (idx !== -1 && result.order) {
      window.ADMIN_ORDERS[idx] = result.order;
    }

    closeTrackingModal();
    filterOrdersTable();
    loadAdminAnalytics();
    alert(`Fulfillment & Tracking updated for Order #${result.order?.order_number || orderId}!`);
  } catch (err) {
    alert('Error saving tracking: ' + err.message);
  }
}

// ── 4. ORDER FULL DETAILS MODAL ──────────────────────────────────────────────
function openOrderDetailsModal(orderId) {
  const order = (window.ADMIN_ORDERS || []).find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('order-detail-title').textContent = `Order #${order.order_number || order.id}`;
  document.getElementById('order-detail-date').textContent = `Placed on ${new Date(order.created_at || Date.now()).toLocaleString('en-IN')}`;

  const items = order.items || [];
  const itemsRows = items.map(i => `
    <tr>
      <td style="padding: 0.6rem 0;"><strong>${escapeHtml(i.product_name || i.sku)}</strong></td>
      <td style="text-align: center; padding: 0.6rem 0;">${i.quantity}</td>
      <td style="text-align: right; padding: 0.6rem 0;">₹${i.unit_price}</td>
      <td style="text-align: right; padding: 0.6rem 0;"><strong>₹${i.total_price}</strong></td>
    </tr>
  `).join('');

  const bodyEl = document.getElementById('order-detail-body');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <div style="background: #f8fafc; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
          <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem;">Customer Details</h4>
          <div style="font-weight: 700; font-size: 1.05rem;">${escapeHtml(order.customer_name)}</div>
          <div style="font-size: 0.85rem; color: #475569; margin-top: 0.25rem;">Login / Email: <strong>${escapeHtml(order.customer_email || '—')}</strong></div>
          <div style="font-size: 0.85rem; color: #475569; margin-top: 0.25rem;">Phone: <strong>${escapeHtml(order.customer_phone || '—')}</strong></div>
        </div>

        <div style="background: #f8fafc; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
          <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem;">Delivery Destination</h4>
          <div style="font-size: 0.88rem; line-height: 1.4;">${escapeHtml(order.shipping_address || '—')}</div>
          <div style="font-weight: 600; font-size: 0.88rem; color: #0f172a; margin-top: 0.35rem;">
            ${escapeHtml(order.shipping_city || '')}, ${escapeHtml(order.shipping_state || '')} - ${escapeHtml(order.shipping_pincode || '')}
          </div>
        </div>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.75rem;">Itemized Receipt</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase;">
              <th style="text-align: left; padding-bottom: 0.4rem;">Product SKU</th>
              <th style="text-align: center; padding-bottom: 0.4rem;">Qty</th>
              <th style="text-align: right; padding-bottom: 0.4rem;">Price</th>
              <th style="text-align: right; padding-bottom: 0.4rem;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #e2e8f0; font-size: 1rem;">
              <td colspan="3" style="text-align: right; padding-top: 0.75rem;"><strong>Grand Total:</strong></td>
              <td style="text-align: right; padding-top: 0.75rem; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.2rem; color: #0f172a;">
                ₹${(order.total_amount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
        <div>
          <span style="font-size: 0.82rem; color: #64748b;">Fulfillment Status: </span>
          <span class="order-status-badge status-${(order.status || 'pending').toLowerCase()}">
            ${(order.status || 'pending').replace(/_/g, ' ')}
          </span>
        </div>
        <button onclick="openTrackingModal('${order.id}'); closeOrderDetailsModal();" class="btn btn-sm btn-accent">
          Update Tracking & Status
        </button>
      </div>
    `;
  }

  const modal = document.getElementById('order-details-modal');
  if (modal) modal.classList.add('open');
}

function closeOrderDetailsModal() {
  const modal = document.getElementById('order-details-modal');
  if (modal) modal.classList.remove('open');
}

// ── 5. CUSTOMERS & ACCOUNTS DIRECTORY ───────────────────────────────────────
async function loadAdminCustomers() {
  const tbody = document.getElementById('admin-customers-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/customers', { headers: getAdminHeaders() });
    if (res.status === 401 || res.status === 403) {
      handleAdminLogout();
      return;
    }
    if (!res.ok) throw new Error(`Customers fetch failed (${res.status})`);
    const data = await res.json();
    window.ADMIN_CUSTOMERS = data.data || [];

    const custBadge = document.getElementById('badge-customers-count');
    if (custBadge) custBadge.textContent = window.ADMIN_CUSTOMERS.length;

    filterCustomersTable();
  } catch (err) {
    console.warn('[Admin] Customers error:', err.message);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #64748b; padding: 2.5rem;">
          <p style="margin-bottom: 0.5rem;">⚠️ Unable to sync customer records.</p>
          <button onclick="loadAdminCustomers()" class="btn btn-sm btn-outline">Retry Sync</button>
        </td>
      </tr>
    `;
  }
}

function filterCustomersTable() {
  const query = (document.getElementById('customers-search-input')?.value || '').toLowerCase().trim();

  let filtered = (window.ADMIN_CUSTOMERS || []).filter(c => {
    if (!query) return true;
    const matchFields = [
      c.name,
      c.email,
      c.phone,
      c.clerkId,
      c.authType,
      ...(c.savedAddresses || []).map(a => typeof a === 'string' ? a : `${a.addressLine1 || ''} ${a.city || ''} ${a.pincode || ''}`)
    ].map(f => (f || '').toLowerCase());

    return matchFields.some(f => f.includes(query));
  });

  renderAdminCustomersTable(filtered);
}

function renderAdminCustomersTable(customers) {
  const tbody = document.getElementById('admin-customers-table-body');
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #94a3b8; padding: 3rem;">
          No matching registered customers found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = customers.map(cust => {
    const addresses = cust.savedAddresses || [];
    const addrHtml = addresses.length > 0
      ? addresses.map(a => {
          const formatted = typeof a === 'string' ? a : (a.formatted || `${a.addressLine1 || ''}, ${a.city || ''} ${a.pincode || ''}`);
          const tag = (typeof a === 'object' && a.tag) ? `<span style="font-size:0.68rem; background:#e2e8f0; padding:1px 5px; border-radius:3px; font-weight:700; color:#334155; margin-right:4px;">${escapeHtml(a.tag)}</span>` : '';
          return `<div style="font-size: 0.8rem; line-height: 1.3; margin-bottom: 0.35rem; color: #334155;">${tag}${escapeHtml(formatted)}</div>`;
        }).join('')
      : `<span style="color: #94a3b8; font-size: 0.8rem;">No saved address yet</span>`;

    return `
      <tr>
        <!-- Name -->
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0;">
              ${(cust.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <strong style="font-size: 0.92rem; color: #0f172a;">${escapeHtml(cust.name)}</strong>
              <div style="font-size: 0.72rem; color: #64748b;">Joined ${new Date(cust.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </td>

        <!-- Login ID / Email -->
        <td>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-family: monospace; font-size: 0.84rem; color: #0f172a; font-weight: 600;">
              ${escapeHtml(cust.email)}
            </span>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(cust.email)}'); alert('Copied email: ${escapeHtml(cust.email)}')" style="background: none; border: none; cursor: pointer; font-size: 0.8rem;" title="Copy Login ID">📋</button>
          </div>
          ${cust.clerkId ? `<div style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">ID: ${cust.clerkId.slice(0, 14)}...</div>` : ''}
        </td>

        <!-- Phone -->
        <td>
          <div style="font-size: 0.85rem; font-weight: 600;">
            ${escapeHtml(cust.phone || '—')}
          </div>
          ${cust.phone && cust.phone !== '—' ? `<a href="https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}" target="_blank" style="font-size: 0.75rem; color: #16a34a;">💬 WhatsApp</a>` : ''}
        </td>

        <!-- Account Type -->
        <td>
          <span style="background: #eff6ff; color: #1e40af; padding: 0.2rem 0.55rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
            ${escapeHtml(cust.authType || 'Account')}
          </span>
        </td>

        <!-- Saved Addresses -->
        <td>
          ${addrHtml}
        </td>

        <!-- Order Count -->
        <td>
          <span style="font-weight: 700; font-size: 1rem; color: #0f172a;">${cust.totalOrders || 0}</span>
          <span style="font-size: 0.75rem; color: #64748b;">orders</span>
        </td>

        <!-- Total Spent -->
        <td>
          <strong style="font-family: 'Outfit', sans-serif; font-size: 1rem; color: #15803d;">
            ₹${(cust.totalSpent || 0).toLocaleString('en-IN')}
          </strong>
        </td>

        <!-- Actions -->
        <td>
          <button onclick="openCustomerProfileModal('${cust.email}')" class="btn btn-sm btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.76rem;">
            👁️ History
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCustomerProfileModal(customerEmail) {
  const cust = (window.ADMIN_CUSTOMERS || []).find(c => c.email === customerEmail);
  if (!cust) return;

  document.getElementById('cust-modal-name').textContent = cust.name || 'Customer Profile';
  document.getElementById('cust-modal-email').textContent = `Login ID: ${cust.email} • Phone: ${cust.phone || '—'}`;

  const orders = cust.orders || [];
  const ordersListHtml = orders.length > 0
    ? orders.map(o => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <div>
              <strong style="font-size: 0.95rem;">Order #${escapeHtml(o.orderNumber || o.id)}</strong>
              <span style="font-size: 0.75rem; color: #64748b; margin-left: 0.5rem;">${new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
            </div>
            <span class="order-status-badge status-${(o.status || 'pending').toLowerCase()}">
              ${(o.status || 'pending').replace(/_/g, ' ')}
            </span>
          </div>
          <div style="font-size: 0.82rem; color: #475569; margin-bottom: 0.3rem;">
            🛒 <strong>Items:</strong> ${escapeHtml(o.itemsSummary || `${o.itemsCount || 1} items`)}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border-top: 1px dashed #e2e8f0; padding-top: 0.4rem; margin-top: 0.4rem;">
            <span>Payment: <strong style="text-transform: uppercase;">${escapeHtml(o.paymentMethod || 'COD')}</strong></span>
            <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; color: #0f172a;">Total: ₹${(o.totalAmount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      `).join('')
    : `<div style="text-align: center; color: #94a3b8; padding: 2rem;">No orders recorded for this customer account yet.</div>`;

  const addresses = cust.savedAddresses || [];
  const addrHtml = addresses.map(a => {
    const formatted = typeof a === 'string' ? a : (a.formatted || `${a.addressLine1 || ''}, ${a.city || ''} ${a.pincode || ''}`);
    return `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 0.5rem; font-size: 0.85rem;">📍 ${escapeHtml(formatted)}</div>`;
  }).join('');

  const bodyEl = document.getElementById('cust-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0; text-align: center;">
          <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Orders</div>
          <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit', sans-serif; color: #0f172a; margin-top: 0.2rem;">${cust.totalOrders || 0}</div>
        </div>
        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0; text-align: center;">
          <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Lifetime Spend</div>
          <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit', sans-serif; color: #15803d; margin-top: 0.2rem;">₹${(cust.totalSpent || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #e2e8f0; text-align: center;">
          <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Account Engine</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #1e40af; margin-top: 0.4rem;">${escapeHtml(cust.authType || 'Direct')}</div>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem;">Saved & Shipping Addresses</h4>
        ${addrHtml || '<p style="font-size: 0.85rem; color: #94a3b8;">No addresses recorded.</p>'}
      </div>

      <div>
        <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.75rem;">Complete Order History (${orders.length})</h4>
        ${ordersListHtml}
      </div>
    `;
  }

  const modal = document.getElementById('customer-modal');
  if (modal) modal.classList.add('open');
}

function closeCustomerModal() {
  const modal = document.getElementById('customer-modal');
  if (modal) modal.classList.remove('open');
}

// ── 6. CSV EXPORT ────────────────────────────────────────────────────────────
function exportOrdersToCSV() {
  const orders = window.ADMIN_ORDERS || [];
  if (orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = ['Order Number', 'Date', 'Customer Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Amount (INR)', 'Payment Method', 'Payment Status', 'Status', 'Courier', 'AWB Code'];
  
  const rows = orders.map(o => [
    `"${o.order_number || o.id}"`,
    `"${new Date(o.created_at || Date.now()).toISOString()}"`,
    `"${(o.customer_name || '').replace(/"/g, '""')}"`,
    `"${(o.customer_email || '').replace(/"/g, '""')}"`,
    `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_city || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_state || '').replace(/"/g, '""')}"`,
    `"${(o.shipping_pincode || '').replace(/"/g, '""')}"`,
    o.total_amount || 0,
    `"${o.payment_method || 'COD'}"`,
    `"${o.payment_status || 'pending'}"`,
    `"${o.status || 'pending'}"`,
    `"${(o.courier_name || '').replace(/"/g, '""')}"`,
    `"${(o.awb_code || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `veyano_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── 7. PRODUCTS MANAGEMENT ──────────────────────────────────────────────────
function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  const catalog = window.VeyanoProducts ? window.VeyanoProducts.getAll() : [];
  if (catalog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">No products found in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = catalog.map(p => `
    <tr>
      <td>
        <img src="${p.images?.[0] || './assets/plain.webp'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
      </td>
      <td>
        <strong>${escapeHtml(p.name)}</strong><br>
        <span style="font-size: 0.8rem; color: #64748b;">SKU: ${p.sku || p.id}</span>
      </td>
      <td><span class="badge" style="background: #e2e8f0; color: #334155;">${p.categoryName || p.category}</span></td>
      <td>${p.weight || '—'}</td>
      <td>
        <strong>₹${p.price || 0}</strong>
        ${p.mrp ? `<span style="font-size: 0.75rem; color: #94a3b8; text-decoration: line-through; margin-left: 0.25rem;">₹${p.mrp}</span>` : ''}
      </td>
      <td>
        <span style="color: ${p.stock_status === 'out_of_stock' ? '#ef4444' : '#15803d'}; font-weight: 600; font-size: 0.85rem;">
          ${p.stock || 0} (${p.stock_status || 'in_stock'})
        </span>
      </td>
      <td>
        ${p.is_trial ? '<span class="badge badge-trial">Trial</span> ' : ''}
        ${p.is_featured ? '<span class="badge badge-featured">Featured</span> ' : ''}
        ${p.is_new ? '<span class="badge badge-new">New</span>' : ''}
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
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
  alert('Product SKU saved to catalog successfully!');
}

function resetCatalogDefaults() {
  if (confirm('Restore the default product catalog? Custom product edits will be reset.')) {
    window.VeyanoProducts.resetDefaults();
    renderAdminProductsTable();
    alert('Catalog restored to default settings.');
  }
}

// ── 8. B2B INQUIRIES ────────────────────────────────────────────────────────
function renderAdminLeads() {
  const tbody = document.getElementById('admin-leads-table-body');
  if (!tbody) return;

  const leads = JSON.parse(localStorage.getItem('veyano_b2b_leads') || '[]');
  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2.5rem;">No corporate inquiries received yet.</td></tr>`;
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

// ── AUTO-INIT ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await checkAdminAuth();
  if (isAuth) {
    initAdminDashboard();
  }
});
