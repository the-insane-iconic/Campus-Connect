/**
 * UniMall Merchant Portal — Live Orders Queue & Status Workflow (merchant/js/merchant-orders.js)
 * Real-time order fulfillment strictly for the merchant's store via Neon PostgreSQL.
 */

'use strict';

let merchantOrders = [];
let currentOrderFilter = 'all';
let currentOrderSearch = '';
let activeOrderDetail = null;

async function loadMerchantOrders() {
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  const tableBody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty-state');
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px;"><div class="spinner"></div> Loading store orders…</td></tr>`;

  try {
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getOrders === 'function') {
      merchantOrders = await window.UniMallDB.getOrders(storeId).catch(() => []);
    } else {
      merchantOrders = [];
    }

    renderMerchantOrdersTable();
    setupOrderEventListenersOnce();

  } catch (err) {
    console.error('[Merchant Orders] Failed to fetch store orders:', err);
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#DC2626; padding: 24px;">Failed to load orders: ${err.message}</td></tr>`;
  }
}
window.loadMerchantOrders = loadMerchantOrders;

function renderMerchantOrdersTable() {
  const tableBody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty-state');
  if (!tableBody) return;

  // Filter orders
  let filtered = merchantOrders.filter(o => {
    const status = (o.status || 'pending').toLowerCase();
    if (currentOrderFilter !== 'all' && status !== currentOrderFilter) {
      return false;
    }
    if (currentOrderSearch) {
      const q = currentOrderSearch.toLowerCase();
      const oId = (o.id || '').toLowerCase();
      const cName = (o.user_name || o.customer_name || '').toLowerCase();
      const phone = (o.phone || '').toLowerCase();
      if (!oId.includes(q) && !cName.includes(q) && !phone.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = filtered.map(o => {
    const oId = (o.id || '').slice(0, 8).toUpperCase();
    const custName = escapeHtml(o.user_name || o.customer_name || 'Campus Student');
    const custContact = escapeHtml(o.phone || o.email || 'Hostel Delivery');
    const total = parseFloat(o.total_amount || o.total || 0);
    const status = (o.status || 'pending').toLowerCase();
    const time = o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const itemsCount = Array.isArray(o.items) ? o.items.length : 1;

    let badgeClass = 'badge-pending';
    let badgeLabel = 'Incoming';
    if (status === 'preparing') { badgeClass = 'badge-preparing'; badgeLabel = 'Preparing'; }
    if (status === 'ready') { badgeClass = 'badge-ready'; badgeLabel = 'Ready for Pickup'; }
    if (status === 'delivered' || status === 'completed') { badgeClass = 'badge-completed'; badgeLabel = 'Delivered'; }
    if (status === 'cancelled') { badgeClass = 'badge-cancelled'; badgeLabel = 'Cancelled'; }

    return `
      <tr class="order-row" data-order-id="${o.id}">
        <td><strong style="color:var(--primary); font-family:monospace; font-size:13px;">#${oId}</strong></td>
        <td>
          <div style="font-weight:600; font-size:13px;">${custName}</div>
          <div style="font-size:11px; color:var(--text-muted);">${custContact}</div>
        </td>
        <td><span style="font-size:12px; font-weight:500;">${itemsCount} item(s)</span></td>
        <td><strong style="font-size:13px;">₹${total.toLocaleString('en-IN')}</strong></td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td style="font-size:12px; color:var(--text-muted);">${time}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-action secondary btn-sm" onclick="openMerchantOrderDetail('${o.id}')">View</button>
            ${renderQuickStatusAction(o)}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderQuickStatusAction(order) {
  const status = (order.status || 'pending').toLowerCase();
  if (status === 'pending') {
    return `<button type="button" class="btn-action primary btn-sm" onclick="updateOrderStatusAction('${order.id}', 'preparing')">Accept</button>`;
  }
  if (status === 'preparing') {
    return `<button type="button" class="btn-action success btn-sm" onclick="updateOrderStatusAction('${order.id}', 'ready')">Ready</button>`;
  }
  if (status === 'ready') {
    return `<button type="button" class="btn-action success btn-sm" onclick="updateOrderStatusAction('${order.id}', 'delivered')">Deliver</button>`;
  }
  return '';
}

async function updateOrderStatusAction(orderId, newStatus) {
  try {
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.updateOrderStatus === 'function') {
      await window.UniMallDB.updateOrderStatus(orderId, newStatus);
    }

    const target = merchantOrders.find(o => o.id === orderId);
    if (target) target.status = newStatus;

    renderMerchantOrdersTable();
    closeOrderDetailModal();

  } catch (err) {
    console.error('[Merchant Orders] Failed to update order status:', err);
    alert('Failed to update status: ' + err.message);
  }
}
window.updateOrderStatusAction = updateOrderStatusAction;

function openMerchantOrderDetail(orderId) {
  const order = merchantOrders.find(o => o.id === orderId);
  if (!order) return;
  activeOrderDetail = order;

  const modal = document.getElementById('modal-order-detail');
  const title = document.getElementById('order-modal-title');
  const body = document.getElementById('order-modal-body');
  const footer = document.getElementById('order-modal-footer');
  if (!modal || !body) return;

  const oId = (order.id || '').slice(0, 8).toUpperCase();
  if (title) title.textContent = `Order #${oId}`;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items.map(item => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:13px;">
      <div>
        <strong>${item.quantity || 1}x</strong> ${escapeHtml(item.product_name || item.name || 'Item')}
      </div>
      <div>₹${parseFloat((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</div>
    </div>
  `).join('') || '<p style="color:var(--text-muted); font-size:13px;">No item details available</p>';

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Customer Details</div>
      <div style="font-weight:700; font-size:15px; margin-top:4px;">${escapeHtml(order.user_name || order.customer_name || 'Student')}</div>
      <div style="font-size:13px; color:var(--text-muted);">${escapeHtml(order.phone || '')} • ${escapeHtml(order.email || '')}</div>
      <div style="font-size:13px; color:var(--text-main); margin-top:4px;"><strong>Location / Delivery:</strong> ${escapeHtml(order.delivery_location || order.hostel_block || 'Store Pickup')}</div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:8px;">Items Ordered</div>
      <div style="background:#F8FAFC; border-radius:8px; padding:12px; border:1px solid var(--border);">${itemsHtml}</div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; font-weight:800; font-size:15px;">
        <span>Total Amount:</span>
        <span style="color:var(--primary);">₹${parseFloat(order.total_amount || order.total || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>
  `;

  if (footer) {
    const status = (order.status || 'pending').toLowerCase();
    footer.innerHTML = `
      <button type="button" class="btn-action secondary" onclick="closeOrderDetailModal()">Close</button>
      ${status === 'pending' ? `<button type="button" class="btn-action primary" onclick="updateOrderStatusAction('${order.id}', 'preparing')">Accept & Prepare</button>` : ''}
      ${status === 'preparing' ? `<button type="button" class="btn-action success" onclick="updateOrderStatusAction('${order.id}', 'ready')">Mark Ready</button>` : ''}
      ${status === 'ready' ? `<button type="button" class="btn-action success" onclick="updateOrderStatusAction('${order.id}', 'delivered')">Mark Delivered</button>` : ''}
      ${status !== 'delivered' && status !== 'cancelled' ? `<button type="button" class="btn-action danger" onclick="updateOrderStatusAction('${order.id}', 'cancelled')">Cancel Order</button>` : ''}
    `;
  }

  modal.classList.remove('hidden');
}
window.openMerchantOrderDetail = openMerchantOrderDetail;

function closeOrderDetailModal() {
  const modal = document.getElementById('modal-order-detail');
  if (modal) modal.classList.add('hidden');
}
window.closeOrderDetailModal = closeOrderDetailModal;

let orderListenersAttached = false;
function setupOrderEventListenersOnce() {
  if (orderListenersAttached) return;
  orderListenersAttached = true;

  // Filter chips
  const filterTabs = document.querySelectorAll('.order-filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentOrderFilter = tab.getAttribute('data-status') || 'all';
      renderMerchantOrdersTable();
    });
  });

  // Search input
  const searchInput = document.getElementById('orders-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentOrderSearch = e.target.value.trim();
      renderMerchantOrdersTable();
    });
  }

  // Close modals on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOrderDetailModal();
  });
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
