/**
 * UniMall Store Admin — Dashboard Controller (admin/js/dashboard.js)
 */

'use strict';

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'dashboard') {
    loadDashboard(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-dashboard') {
    loadDashboard(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Quick action buttons on dashboard
  const btnAdd = document.getElementById('dash-btn-add-product');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      window.openProductModal();
    });
  }

  const btnQuick = document.getElementById('dash-btn-quick-add');
  if (btnQuick) {
    btnQuick.addEventListener('click', () => {
      window.openQuickAddModal();
    });
  }

  // Dashboard links to full views
  const linkOrders = document.getElementById('dash-link-all-orders');
  if (linkOrders) linkOrders.addEventListener('click', () => window.switchView('orders'));

  const linkInv = document.getElementById('dash-link-inventory');
  if (linkInv) linkInv.addEventListener('click', () => window.switchView('inventory'));

  const linkAnalytics = document.getElementById('dash-link-analytics');
  if (linkAnalytics) linkAnalytics.addEventListener('click', () => window.switchView('analytics'));
});

async function loadDashboard(storeId) {
  if (!storeId) return;

  try {
    // 1. Fetch Store Profile & Overview
    const storeData = await apiRequest(`/admin/stores/${storeId}`);
    const store = storeData.store;

    // Update greeting
    const greetingEl = document.getElementById('dash-greeting');
    const storeSubEl = document.getElementById('dash-store-sub');
    if (greetingEl && currentAdminUser) {
      const firstName = currentAdminUser.name.split(' ')[0];
      greetingEl.textContent = `Good morning, ${firstName}`;
    }
    if (storeSubEl) {
      storeSubEl.textContent = `${store.name} · ${store.location}`;
    }

    applyStoreOpenState(store.is_open === 1);

    // 2. Fetch Orders for Urgent Attention & Metrics
    const ordersData = await apiRequest(`/admin/stores/${storeId}/orders`);
    const orders = ordersData.orders || [];

    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at).toDateString();
      const todayDate = new Date().toDateString();
      return orderDate === todayDate;
    });

    const pendingOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status));
    const readyOrders = orders.filter(o => o.status === 'READY');

    const todaySales = todayOrders.reduce((sum, o) => {
      return o.status !== 'CANCELLED' ? sum + (o.store_subtotal || 0) : sum;
    }, 0);

    // Update metrics cards
    const dashOrdersEl = document.getElementById('dash-today-orders');
    const dashPendingEl = document.getElementById('dash-pending-orders');
    const dashReadyEl = document.getElementById('dash-ready-orders');
    const dashSalesEl = document.getElementById('dash-today-sales');

    if (dashOrdersEl) dashOrdersEl.textContent = todayOrders.length;
    if (dashPendingEl) dashPendingEl.textContent = pendingOrders.length;
    if (dashReadyEl) dashReadyEl.textContent = readyOrders.length;
    if (dashSalesEl) dashSalesEl.textContent = `₹${todaySales.toLocaleString('en-IN')}`;

    // Update nav counter badges
    const counterOrders = document.getElementById('counter-orders');
    if (counterOrders) counterOrders.textContent = pendingOrders.length;

    // Render Urgent Orders
    renderUrgentOrders(pendingOrders.slice(0, 5));

    // 3. Fetch Inventory for Low Stock Alerts
    const invData = await apiRequest(`/admin/stores/${storeId}/inventory`);
    const invItems = invData.inventory || [];
    const lowStock = invItems.filter(it => it.availability === 'low_stock' || it.availability === 'out_of_stock');

    const counterLowStock = document.getElementById('counter-low-stock');
    if (counterLowStock) counterLowStock.textContent = lowStock.length;

    renderLowStockAlerts(lowStock.slice(0, 5));

    // 4. Fetch Analytics for Top Products Today
    const analyticsData = await apiRequest(`/admin/stores/${storeId}/analytics?period=today`);
    renderTopProducts(analyticsData.top_products || []);

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderUrgentOrders(orders) {
  const container = document.getElementById('dash-urgent-orders');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13.5px;">
        ✨ All caught up! No orders currently require preparation.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${orders.map(o => {
        const custName = o.user_name || o.customer_name || 'Student';
        const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
        const totalAmount = Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN');
        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 13.5px;">#${o.id}</strong>
              <span class="badge-status ${(o.status || 'placed').toLowerCase()}">${o.status || 'PLACED'}</span>
              <span style="font-size: 12px; color: var(--text-muted);">${o.delivery_method === 'delivery' ? '🛵 Hostel Delivery' : '🛍️ Pickup'}</span>
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 3px;">
              ${escapeHtml(custName)} · ${itemCount} item${itemCount === 1 ? '' : 's'} (₹${totalAmount})
            </div>
          </div>
          <button type="button" class="btn-action primary" onclick="window.viewOrderDetail('${o.id}')" style="height: 32px; font-size: 12px; padding: 0 12px;">
            Process →
          </button>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

function renderLowStockAlerts(items) {
  const container = document.getElementById('dash-low-stock-list');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 13px;">
        ✅ Stock levels healthy. No low-stock items.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${items.map(it => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--surface-alt); border-radius: var(--radius-md); font-size: 13px;">
          <div>
            <div style="font-weight: 600; color: var(--text-main);">${it.name}</div>
            <div style="font-size: 11.5px; color: ${it.quantity === 0 ? 'var(--danger)' : 'var(--warn)'}; font-weight: 700;">
              ${it.quantity === 0 ? 'OUT OF STOCK (0 left)' : `Only ${it.quantity} ${it.unit}s left`}
            </div>
          </div>
          <button type="button" class="btn-action secondary" onclick="window.quickRestock('${it.product_id}', '${it.name}', ${it.quantity})" style="height: 28px; font-size: 11.5px;">
            Restock
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTopProducts(products) {
  const container = document.getElementById('dash-top-products-list');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 13px;">
        No sales recorded yet today.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${products.map((p, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; color: var(--text-tertiary); width: 16px;">${idx + 1}.</span>
            <span style="font-weight: 600;">${p.name}</span>
          </div>
          <div style="font-weight: 700; color: var(--primary);">
            ${p.sold_count} sold <span style="font-weight: 500; font-size: 11.5px; color: var(--text-muted);">(₹${p.total_sales})</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
