/**
 * UniMall Store Admin — Orders Controller (admin/js/orders.js)
 */

'use strict';

let currentOrdersList = [];
let currentOrderStatusFilter = 'ALL';

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'orders') {
    loadOrders(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-orders') {
    loadOrders(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Status filter tabs
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

async function loadOrders(storeId) {
  if (!storeId) return;

  const tbody = document.getElementById('orders-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6">Loading orders...</td></tr>';
  }

  try {
    const data = await apiRequest(`/admin/stores/${storeId}/orders`);
    currentOrdersList = data.orders || [];
    renderOrdersTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6" style="color: var(--danger);">Failed to load orders: ${err.message}</td></tr>`;
    }
  }
}

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
    const nextAction = getNextActionButton(o);

    return `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.customer_name)}</div>
          <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(o.customer_phone || o.customer_email)}</div>
        </td>
        <td>
          <span style="font-size: 12.5px;">${o.delivery_method === 'delivery' ? '🛵 ' + escapeHtml(o.delivery_address || 'Hostel Delivery') : '🛍️ Counter Pickup'}</span>
        </td>
        <td>${o.items.length} item${o.items.length === 1 ? '' : 's'}</td>
        <td><strong>₹${(o.store_subtotal || o.total).toLocaleString('en-IN')}</strong></td>
        <td style="font-size: 12.5px; color: var(--text-muted);">${placedTime}</td>
        <td><span class="badge-status ${o.status.toLowerCase()}">${o.status}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${nextAction}
            <button type="button" class="btn-action secondary" onclick="viewOrderDetail('${o.id}')" style="height: 30px; font-size: 11.5px; padding: 0 8px;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getNextActionButton(order) {
  const s = (order.status || '').toUpperCase();
  const transitions = {
    'PLACED': { next: 'ACCEPTED', label: 'Accept', class: 'primary' },
    'ACCEPTED': { next: 'PREPARING', label: 'Start Prep', class: 'primary' },
    'PREPARING': { next: 'READY', label: 'Mark Ready', class: 'primary' },
    'READY': { next: 'DELIVERED', label: 'Mark Delivered', class: 'primary' }
  };

  const action = transitions[s];
  if (!action) return '<span style="font-size: 12px; color: var(--text-muted);">—</span>';

  return `
    <button type="button" class="btn-action ${action.class}"
            onclick="updateOrderStatusQuick('${order.id}', '${action.next}')"
            style="height: 30px; font-size: 11.5px; padding: 0 10px;">
      ${action.label}
    </button>
  `;
}

async function updateOrderStatusQuick(orderId, newStatus) {
  try {
    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });

    showToast(`Order #${orderId} marked as ${newStatus}`, 'success');

    // Reload orders list
    if (activeStoreId) loadOrders(activeStoreId);
  } catch {
    // Handled by apiRequest toast
  }
}
window.updateOrderStatusQuick = updateOrderStatusQuick;

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
          <div><strong>Name:</strong> ${escapeHtml(order.customer_name)}</div>
          <div><strong>Contact:</strong> ${escapeHtml(order.customer_phone || order.customer_email)}</div>
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
              ${order.items.map(it => `
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
          <span style="color: var(--primary);">₹${order.total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    `;

    // Next action buttons in modal footer
    const s = (order.status || '').toUpperCase();
    const nextTransitions = {
      'PLACED': { next: 'ACCEPTED', label: 'Accept Order', btnClass: 'primary' },
      'ACCEPTED': { next: 'PREPARING', label: 'Start Preparing', btnClass: 'primary' },
      'PREPARING': { next: 'READY', label: 'Mark Ready', btnClass: 'primary' },
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

    if (!['COMPLETED', 'CANCELLED'].includes(order.status)) {
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
    await updateOrderStatusQuick(orderId, newStatus);
    const modal = document.getElementById('modal-order-detail');
    if (modal) modal.classList.add('hidden');
  } catch {
    // Handled
  }
}
window.executeOrderTransition = executeOrderTransition;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
