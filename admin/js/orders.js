/**
 * UniMall Store Admin — Orders Controller (admin/js/orders.js)
 * 1-Window Active Orders Management & 3-Step Series Progression Button
 */

'use strict';

let currentOrdersList = [];
let currentOrdersViewMode = 'active'; // 'active' | 'table'
let currentOrderStatusFilter = 'ALL';
let ordersPollInterval = null;

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'orders') {
    loadOrders(e.detail.storeId);
    startOrdersPolling();
  } else {
    stopOrdersPolling();
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-orders') {
    loadOrders(e.detail.storeId);
  }
});

// Real-time synchronization listeners
window.addEventListener('storage', (e) => {
  if (e.key === 'unimall_v1' || e.key === 'unimall_order_delivered_event') {
    if (activeStoreId) {
      loadOrders(activeStoreId);
    }
  }
});

window.addEventListener('unimall:orderStatusUpdated', () => {
  if (activeStoreId) {
    loadOrders(activeStoreId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Status filter tabs for table view
  document.querySelectorAll('.filter-tabs-bar .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tabs-bar .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderStatusFilter = btn.getAttribute('data-status');
      renderOrdersTable();
    });
  });

  const btnRefresh = document.getElementById('btn-refresh-orders');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (activeStoreId) loadOrders(activeStoreId);
    });
  }
});

function startOrdersPolling() {
  stopOrdersPolling();
  ordersPollInterval = setInterval(() => {
    if (activeStoreId) {
      const activeView = document.querySelector('.admin-view.active');
      if (activeView && (activeView.id === 'view-orders' || activeView.id === 'view-dashboard')) {
        loadOrders(activeStoreId, true); // silent refresh
      }
    }
  }, 10000);
}

function stopOrdersPolling() {
  if (ordersPollInterval) {
    clearInterval(ordersPollInterval);
    ordersPollInterval = null;
  }
}

function switchOrdersViewMode(mode) {
  currentOrdersViewMode = mode;

  const btnActive = document.getElementById('tab-mode-active');
  const btnTable = document.getElementById('tab-mode-table');
  const board = document.getElementById('active-orders-board');
  const tableWrap = document.getElementById('all-orders-table-wrapper');

  if (btnActive) btnActive.classList.toggle('active', mode === 'active');
  if (btnTable) btnTable.classList.toggle('active', mode === 'table');
  if (board) board.classList.toggle('hidden', mode !== 'active');
  if (tableWrap) tableWrap.classList.toggle('hidden', mode !== 'table');

  if (mode === 'active') {
    renderActiveOrdersBoard();
  } else {
    renderOrdersTable();
  }
}
window.switchOrdersViewMode = switchOrdersViewMode;

async function loadOrders(storeId, silent = false) {
  if (!storeId) return;

  const cardsContainer = document.getElementById('active-orders-cards-container');
  const tbody = document.getElementById('orders-tbody');

  if (!silent) {
    if (cardsContainer && currentOrdersList.length === 0) {
      cardsContainer.innerHTML = '<div class="empty-state-sm">Loading active orders...</div>';
    }
    if (tbody && currentOrdersList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6">Loading orders...</td></tr>';
    }
  }

  try {
    const data = await apiRequest(`/admin/stores/${storeId}/orders`);
    currentOrdersList = data.orders || [];

    // Render both views
    renderActiveOrdersBoard();
    renderOrdersTable();

    // Update badges
    updateOrderBadges();

  } catch (err) {
    if (!silent) {
      if (cardsContainer) {
        cardsContainer.innerHTML = `<div class="empty-state-sm" style="color: var(--danger);">Failed to load orders: ${err.message}</div>`;
      }
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6" style="color: var(--danger);">Failed to load orders: ${err.message}</td></tr>`;
      }
    }
  }
}

function updateOrderBadges() {
  const activeOrders = currentOrdersList.filter(o => {
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  const count = activeOrders.length;

  // Counter inside orders mode tab
  const counterTab = document.getElementById('active-orders-counter');
  if (counterTab) counterTab.textContent = count;

  // Desktop sidebar counter
  const navCounter = document.getElementById('counter-orders');
  if (navCounter) navCounter.textContent = count;

  // Mobile bottom nav badge
  const mobBadge = document.getElementById('mob-badge-orders');
  if (mobBadge) {
    mobBadge.textContent = count;
    mobBadge.classList.toggle('hidden', count === 0);
  }
}

function renderActiveOrdersBoard() {
  const container = document.getElementById('active-orders-cards-container');
  if (!container) return;

  // Filter active orders that require action or pickup
  const activeOrders = currentOrdersList.filter(o => {
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  // Sort orders: PLACED first (newest needs accept), then PREPARING, then READY
  const statusPriority = { 'PLACED': 1, 'ACCEPTED': 2, 'PREPARING': 3, 'READY': 4 };
  activeOrders.sort((a, b) => {
    const pa = statusPriority[(a.status || '').toUpperCase()] || 99;
    const pb = statusPriority[(b.status || '').toUpperCase()] || 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-active-orders">
        <div class="empty-icon">☕</div>
        <h3>All caught up!</h3>
        <p>No active orders requiring preparation or counter pickup right now. New student orders will appear here automatically.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(o => renderActiveOrderCard(o)).join('');
}

function formatTimeElapsed(isoDate) {
  if (!isoDate) return 'Just now';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1h ago';
  return `${diffHr}h ago`;
}

/**
 * Renders a single active order card with prominent User Name,
 * fitted item details, and the 1-button 3-stage progression button.
 */
function renderActiveOrderCard(o) {
  const custName = o.user_name || o.customer_name || 'Student';
  const custInitial = custName.charAt(0).toUpperCase();
  const custContact = o.customer_phone || o.customer_email || '';
  const timeElapsed = formatTimeElapsed(o.created_at);
  const placedTime = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = (o.status || 'PLACED').toUpperCase();

  // Status Classes & Labels
  let statusClass = 'placed';
  let statusLabel = 'New Order';
  if (status === 'ACCEPTED' || status === 'PREPARING') {
    statusClass = 'preparing';
    statusLabel = 'Processing';
  } else if (status === 'READY') {
    statusClass = 'ready';
    statusLabel = 'Ready for Pickup';
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    statusClass = 'completed';
    statusLabel = 'Delivered';
  } else if (status === 'CANCELLED') {
    statusClass = 'cancelled';
    statusLabel = 'Cancelled';
  }

  // Single 3-Stage Progression Button in Series
  let buttonHtml = '';
  if (status === 'PLACED') {
    // Stage 1: Placed -> Click to Accept & Process
    buttonHtml = `
      <button type="button" class="btn-order-step step-accept" 
              onclick="progressOrderStep('${o.id}', 'PREPARING')"
              title="Click to accept order and start kitchen preparation">
        <span class="step-icon">⚡</span>
        <span class="step-text">Accept & Process</span>
        <span class="step-arrow">→</span>
      </button>
    `;
  } else if (status === 'ACCEPTED' || status === 'PREPARING') {
    // Stage 2: Processing -> Click to Mark Done (Ready)
    buttonHtml = `
      <button type="button" class="btn-order-step step-ready" 
              onclick="progressOrderStep('${o.id}', 'READY')"
              title="Click when order is packed and ready for pickup">
        <span class="step-icon">✓</span>
        <span class="step-text">Done (Mark Ready)</span>
        <span class="step-arrow">→</span>
      </button>
    `;
  } else if (status === 'READY') {
    // Stage 3: Ready -> Click to Mark Delivered
    buttonHtml = `
      <button type="button" class="btn-order-step step-deliver" 
              onclick="progressOrderStep('${o.id}', 'DELIVERED')"
              title="Click when student picks up or delivery is completed">
        <span class="step-icon">📦</span>
        <span class="step-text">Mark Delivered</span>
        <span class="step-arrow">✓</span>
      </button>
    `;
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    buttonHtml = `
      <div class="order-step-completed">
        <span>✅ Delivered & Completed</span>
      </div>
    `;
  } else {
    buttonHtml = `
      <div class="order-step-cancelled">
        <span>✕ Order Cancelled</span>
      </div>
    `;
  }

  // Items fitted in card
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsHtml = items.map(it => {
    const qty = it.quantity || 1;
    const name = escapeHtml(it.product_name_snapshot || it.name || 'Product');
    const price = Number(it.price_snapshot || it.price || 0) * qty;
    return `
      <div class="order-item-row">
        <span class="order-item-qty">${qty}×</span>
        <span class="order-item-name">${name}</span>
        <span class="order-item-price">₹${price}</span>
      </div>
    `;
  }).join('');

  const isDelivery = o.delivery_method === 'delivery';

  return `
    <div class="active-order-card status-${statusClass}" id="order-card-${o.id}">
      <!-- Top header: Customer / Order Name prioritized -->
      <div class="order-card-header">
        <div class="order-card-user">
          <div class="order-user-avatar">${custInitial}</div>
          <div class="order-user-meta">
            <h3 class="order-user-name">${escapeHtml(custName)}</h3>
            <div class="order-sub-meta">
              <span class="order-id-badge">#${o.id}</span>
              <span class="order-time-tag">${placedTime} · ${timeElapsed}</span>
            </div>
          </div>
        </div>
        <div class="order-status-group">
          <span class="badge-status ${statusClass}">${statusLabel}</span>
          <span class="fulfillment-badge ${isDelivery ? 'delivery' : 'pickup'}">
            ${isDelivery ? '🛵 Delivery' : '🛍️ Pickup'}
          </span>
        </div>
      </div>

      <!-- Hostel room / delivery address if delivery -->
      ${(isDelivery && o.delivery_address) ? `
        <div class="order-card-address">
          <span>📍</span> <strong>${escapeHtml(o.delivery_address)}</strong>
        </div>
      ` : ''}

      <!-- Product details fitted in that same card -->
      <div class="order-card-items">
        ${itemsHtml || '<div style="color: var(--text-muted); font-size: 12.5px;">1 item</div>'}
      </div>

      <!-- Special instructions note if any -->
      ${o.notes ? `
        <div class="order-card-note">
          <span class="note-icon">💬</span>
          <span class="note-text">"${escapeHtml(o.notes)}"</span>
        </div>
      ` : ''}

      <!-- Bottom: Total and the 1 progression button -->
      <div class="order-card-footer">
        <div class="order-card-bill">
          <span class="bill-label">Total Amount</span>
          <span class="bill-val">₹${Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN')}</span>
          ${custContact && custContact !== '—' ? `
            <a href="tel:${escapeHtml(custContact)}" class="bill-phone-link" title="Call ${escapeHtml(custName)}">
              📞 ${escapeHtml(custContact)}
            </a>
          ` : ''}
        </div>
        <div class="order-card-action">
          ${buttonHtml}
          ${(!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) ? `
            <button type="button" class="btn-card-cancel" onclick="cancelOrderQuick('${o.id}')" title="Cancel this order">
              Cancel Order
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}
window.renderActiveOrderCard = renderActiveOrderCard;

/**
 * 3-Stage Series Progression Function
 * Click 1: PLACED -> PREPARING (User sees: accepted & processing)
 * Click 2: PREPARING -> READY (User sees: ready for pickup)
 * Click 3: READY -> DELIVERED (User sees: delivered with green ripple)
 */
async function progressOrderStep(orderId, nextStatus) {
  try {
    document.querySelectorAll(`[id="order-card-${orderId}"]`).forEach(card => {
      card.style.opacity = '0.65';
      card.style.pointerEvents = 'none';
      const btn = card.querySelector('.btn-order-step');
      if (btn) btn.innerHTML = '<span>⏳</span> <span>Updating...</span>';
    });

    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    let statusMsg = '';
    if (nextStatus === 'PREPARING') {
      statusMsg = `Order #${orderId} accepted! Kitchen processing started.`;
    } else if (nextStatus === 'READY') {
      statusMsg = `Order #${orderId} is READY! Customer notified for pickup.`;
    } else if (nextStatus === 'DELIVERED') {
      statusMsg = `Order #${orderId} DELIVERED! Customer confirmed.`;
    }

    showToast(statusMsg, 'success');

    // Refresh orders view & dashboard in sync
    if (activeStoreId) {
      await loadOrders(activeStoreId, true);

      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard(activeStoreId);
      }
    }
  } catch (err) {
    showToast(`Failed to update order: ${err.message}`, 'error');
    if (activeStoreId) loadOrders(activeStoreId);
  }
}
window.progressOrderStep = progressOrderStep;

async function cancelOrderQuick(orderId) {
  const confirmed = confirm(`Are you sure you want to cancel order #${orderId}?`);
  if (!confirmed) return;

  try {
    document.querySelectorAll(`[id="order-card-${orderId}"]`).forEach(card => {
      card.style.opacity = '0.65';
      card.style.pointerEvents = 'none';
    });

    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' })
    });

    showToast(`Order #${orderId} has been cancelled.`, 'error');

    if (activeStoreId) {
      await loadOrders(activeStoreId, true);
      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard(activeStoreId);
      }
    }
  } catch (err) {
    showToast(`Failed to cancel order: ${err.message}`, 'error');
  }
}
window.cancelOrderQuick = cancelOrderQuick;

function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  let filtered = currentOrdersList;
  if (currentOrderStatusFilter !== 'ALL') {
    filtered = currentOrdersList.filter(o => {
      const s = (o.status || '').toUpperCase();
      if (currentOrderStatusFilter === 'COMPLETED') {
        return s === 'COMPLETED' || s === 'DELIVERED';
      }
      return s === currentOrderStatusFilter;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6" style="color: var(--text-muted);">No orders found for this status.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const placedTime = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const custName = o.customer_name || o.user_name || 'Student';
    const custContact = o.customer_phone || o.customer_email || '—';
    const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
    const status = (o.status || 'placed').toUpperCase();

    let actionBtn = '';
    if (status === 'PLACED') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'PREPARING')" style="height: 28px; font-size: 11.5px; padding: 0 10px;">⚡ Accept</button>`;
    } else if (status === 'ACCEPTED' || status === 'PREPARING') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'READY')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #7C3AED; border-color: #7C3AED;">✓ Ready</button>`;
    } else if (status === 'READY') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'DELIVERED')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #059669; border-color: #059669;">📦 Deliver</button>`;
    } else {
      actionBtn = '<span style="font-size: 12px; color: var(--text-muted);">—</span>';
    }

    return `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>
          <div style="font-weight: 700; font-size: 13.5px;">${escapeHtml(custName)}</div>
          <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(custContact)}</div>
        </td>
        <td>
          <span style="font-size: 12.5px;">${o.delivery_method === 'delivery' ? '🛵 ' + escapeHtml(o.delivery_address || 'Hostel Delivery') : '🛍️ Counter Pickup'}</span>
        </td>
        <td>${itemCount} item${itemCount === 1 ? '' : 's'}</td>
        <td><strong>₹${Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN')}</strong></td>
        <td style="font-size: 12.5px; color: var(--text-muted);">${placedTime}</td>
        <td><span class="badge-status ${status.toLowerCase()}">${status}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${actionBtn}
            <button type="button" class="btn-action secondary" onclick="viewOrderDetail('${o.id}')" style="height: 28px; font-size: 11.5px; padding: 0 8px;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function viewOrderDetail(orderId) {
  const modal = document.getElementById('modal-order-detail');
  const titleEl = document.getElementById('order-modal-title');
  const bodyEl = document.getElementById('order-modal-body');
  const footerEl = document.getElementById('order-modal-footer');

  if (!modal || !bodyEl) return;

  titleEl.textContent = `Order #${orderId}`;
  bodyEl.innerHTML = '<div style="text-align: center; padding: 20px;">Loading order details...</div>';
  footerEl.innerHTML = '';
  modal.classList.remove('hidden');

  try {
    const data = await apiRequest(`/admin/orders/${orderId}`);
    const order = data.order;

    const placedTime = new Date(order.created_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    bodyEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Status & Placed Info -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-size: 12px; color: var(--text-muted);">Status</div>
            <div style="margin-top: 2px;"><span class="badge-status ${order.status.toLowerCase()}">${order.status}</span></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: var(--text-muted);">Placed At</div>
            <div style="font-size: 13px; font-weight: 600;">${placedTime}</div>
          </div>
        </div>

        <!-- Customer & Delivery -->
        <div style="background: var(--surface-alt); padding: 12px 14px; border-radius: var(--radius-md); font-size: 13px;">
          <div style="font-weight: 700; margin-bottom: 4px; color: var(--text-main);">Customer & Delivery</div>
          <div><strong>Customer Name:</strong> ${escapeHtml(order.customer_name || order.user_name || 'Student')}</div>
          <div><strong>Contact:</strong> ${escapeHtml(order.customer_phone || order.customer_email || '—')}</div>
          <div><strong>Method:</strong> ${order.delivery_method === 'delivery' ? '🛵 Hostel Delivery' : '🛍️ Counter Pickup'}</div>
          ${order.delivery_address ? `<div><strong>Address/Room:</strong> ${escapeHtml(order.delivery_address)}</div>` : ''}
          ${order.notes ? `<div><strong>Notes:</strong> <em>"${escapeHtml(order.notes)}"</em></div>` : ''}
        </div>

        <!-- Items Table -->
        <div>
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 13px;">Order Items</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                <th style="padding: 6px 0;">Item</th>
                <th style="padding: 6px 0; text-align: center;">Qty</th>
                <th style="padding: 6px 0; text-align: right;">Price</th>
                <th style="padding: 6px 0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(it => `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(it.product_name_snapshot || it.name)}</td>
                  <td style="padding: 8px 0; text-align: center;">${it.quantity}</td>
                  <td style="padding: 8px 0; text-align: right;">₹${(it.price_snapshot || it.price)}</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700;">₹${(it.price_snapshot || it.price) * it.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Total Bill -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border); font-size: 15px; font-weight: 700;">
          <span>Order Total:</span>
          <span style="color: var(--primary);">₹${Number(order.store_subtotal || order.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    `;

    // Next action buttons in modal footer
    const s = (order.status || '').toUpperCase();
    const nextTransitions = {
      'PLACED': { next: 'PREPARING', label: 'Accept & Process', btnClass: 'primary' },
      'ACCEPTED': { next: 'READY', label: 'Mark Done (Ready)', btnClass: 'primary' },
      'PREPARING': { next: 'READY', label: 'Mark Done (Ready)', btnClass: 'primary' },
      'READY': { next: 'DELIVERED', label: 'Mark Delivered', btnClass: 'primary' }
    };

    let actionsHtml = `<button type="button" class="btn-action secondary" data-close="modal-order-detail">Close</button>`;

    if (nextTransitions[s]) {
      const trans = nextTransitions[s];
      actionsHtml += `
        <button type="button" class="btn-action ${trans.btnClass}" onclick="executeOrderTransition('${order.id}', '${trans.next}')">
          ${trans.label}
        </button>
      `;
    }

    if (!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      actionsHtml += `
        <button type="button" class="btn-action secondary" style="color: var(--danger);" onclick="executeOrderTransition('${order.id}', 'CANCELLED')">
          Cancel Order
        </button>
      `;
    }

    footerEl.innerHTML = actionsHtml;

  } catch (err) {
    bodyEl.innerHTML = `<div style="color: var(--danger); padding: 20px;">Failed to load order: ${err.message}</div>`;
  }
}
window.viewOrderDetail = viewOrderDetail;

async function executeOrderTransition(orderId, newStatus) {
  try {
    await progressOrderStep(orderId, newStatus);
    const modal = document.getElementById('modal-order-detail');
    if (modal) modal.classList.add('hidden');
  } catch {
    // Handled
  }
}
window.executeOrderTransition = executeOrderTransition;
