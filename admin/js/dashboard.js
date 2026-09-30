/**
 * UniMall Store Admin — Dashboard Controller (admin/js/dashboard.js)
 * Supports:
 *   - Cumulative Platform Executive Overview (when activeStoreId === 'all' or Platform Admin)
 *   - Single Store Operational Dashboard (when activeStoreId !== 'all')
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
      if (typeof window.openProductModal === 'function') {
        window.openProductModal();
      } else {
        window.switchView('products');
      }
    });
  }

  const btnQuick = document.getElementById('dash-btn-quick-add');
  if (btnQuick) {
    btnQuick.addEventListener('click', () => {
      if (typeof window.openQuickAddModal === 'function') {
        window.openQuickAddModal();
      } else {
        window.switchView('products');
      }
    });
  }

  // Dashboard links to full views
  const linkOrders = document.getElementById('dash-link-all-orders');
  if (linkOrders) linkOrders.addEventListener('click', () => window.switchView('orders'));

  const linkInv = document.getElementById('dash-link-inventory');
  if (linkInv) linkInv.addEventListener('click', () => {
    if (window.activeStoreId === 'all') {
      window.switchView('founder');
    } else {
      window.switchView('inventory');
    }
  });

  const linkAnalytics = document.getElementById('dash-link-analytics');
  if (linkAnalytics) linkAnalytics.addEventListener('click', () => window.switchView('analytics'));
});

async function loadDashboard(storeId) {
  const effectiveStoreId = storeId || (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : 'all');
  const isPlatformView = (effectiveStoreId === 'all') || (currentAdminUser && currentAdminUser.role === 'platform_admin' && effectiveStoreId === 'all');

  if (isPlatformView) {
    await loadPlatformCumulativeDashboard();
  } else {
    await loadSingleStoreDashboard(effectiveStoreId);
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * 1. PLATFORM CUMULATIVE DASHBOARD (Platform Admin View)
 * ────────────────────────────────────────────────────────────────
 */
async function loadPlatformCumulativeDashboard() {
  try {
    // 1. Header greeting & subtitle
    const greetingEl = document.getElementById('dash-greeting');
    const storeSubEl = document.getElementById('dash-store-sub');
    const headerActions = document.getElementById('dash-header-actions');

    if (greetingEl) {
      const name = (currentAdminUser && currentAdminUser.name) ? currentAdminUser.name.split(' ')[0] : 'Admin';
      greetingEl.textContent = `Good morning, ${name}`;
    }
    if (storeSubEl) {
      storeSubEl.textContent = '🏢 Platform Executive Dashboard · Realtime Cumulative Analytics Across All Stores';
    }

    // Configure header action buttons for platform admin
    const btnAdd = document.getElementById('dash-btn-add-product');
    const btnQuick = document.getElementById('dash-btn-quick-add');
    if (btnAdd) {
      btnAdd.textContent = '🏬 Registered Shops';
      btnAdd.onclick = () => window.switchView('founder');
    }
    if (btnQuick) {
      btnQuick.textContent = '↻ Refresh Feed';
      btnQuick.onclick = () => loadPlatformCumulativeDashboard();
    }

    // 2. Fetch authoritative orders across ALL stores from Neon PostgreSQL
    const ordersData = await apiRequest('/admin/stores/all/orders');
    const orders = ordersData.orders || [];

    const todayOrders = orders.filter(o => {
      if (!o.created_at) return true;
      try {
        const orderDate = new Date(o.created_at);
        const isSameDay = orderDate.toDateString() === new Date().toDateString();
        const isRecent = (Date.now() - orderDate.getTime()) < 24 * 3600 * 1000;
        return isSameDay || isRecent;
      } catch (e) {
        return true;
      }
    });

    const activeOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase()));
    activeOrders.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    const pendingOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()));
    const readyOrders = orders.filter(o => (o.status || '').toUpperCase() === 'READY');

    const totalSales = todayOrders.reduce((sum, o) => {
      const isCancelled = (o.status || '').toUpperCase() === 'CANCELLED';
      const amt = Number(o.store_subtotal || o.total || o.total_amount || o.subtotal || 0);
      return !isCancelled ? sum + amt : sum;
    }, 0);

    // Get stores list and operational open/close statuses
    const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
    const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
    const approvedReg = registeredStores.filter(r => r.status === 'approved');

    const BASE_STORES = [
      { id: 'campus-cafe', name: 'Campus Café', category: 'Food & Drinks', location: 'Ground Floor, Student Center', icon: '☕' },
      { id: 'book-corner', name: 'Book Corner', category: 'Stationery & Books', location: 'First Floor, Block B', icon: '📚' },
      { id: 'techstop', name: 'TechStop', category: 'Electronics & Peripherals', location: 'Second Floor, Unimall', icon: '💻' },
      { id: 'campus-mart', name: 'Campus Mart', category: 'Daily Essentials & Snacks', location: 'Ground Floor, Unimall', icon: '🛒' },
      { id: 'campus-wear', name: 'Campus Wear', category: 'Fashion & Apparel', location: 'First Floor, Unimall', icon: '👕' },
      { id: 'health-hub', name: 'Health Hub', category: 'Health & Care', location: 'Ground Floor, Medical Wing', icon: '💊' },
    ];

    const allStoresList = [...BASE_STORES];
    approvedReg.forEach(r => {
      if (!allStoresList.some(s => s.id === r.storeId)) {
        allStoresList.push({
          id: r.storeId,
          name: r.storeName,
          category: r.storeType || 'General',
          location: r.location || 'Campus Center',
          icon: '🏪'
        });
      }
    });

    const onlineStoresCount = allStoresList.filter(s => storeStatuses[s.id] !== false).length;

    // 3. Update Metric Cards for Platform View
    const dashOrdersEl = document.getElementById('dash-today-orders');
    const dashPendingEl = document.getElementById('dash-pending-orders');
    const dashReadyEl = document.getElementById('dash-ready-orders');
    const dashSalesEl = document.getElementById('dash-today-sales');

    const lblOrders = document.getElementById('lbl-dash-orders') || document.querySelector('#card-metric-orders .metric-label');
    const lblPending = document.getElementById('lbl-dash-pending') || document.querySelector('#card-metric-pending .metric-label');
    const lblReady = document.getElementById('lbl-dash-ready') || document.querySelector('#card-metric-ready .metric-label');
    const lblSales = document.getElementById('lbl-dash-sales') || document.querySelector('#card-metric-sales .metric-label');

    if (lblOrders) lblOrders.textContent = "Today's Platform Orders";
    if (lblPending) lblPending.textContent = "Active Kitchen / Prep";
    if (lblReady) lblReady.textContent = "Active Stores Online";
    if (lblSales) lblSales.textContent = "Overall Platform Sales";

    if (dashOrdersEl) dashOrdersEl.textContent = todayOrders.length;
    if (dashPendingEl) dashPendingEl.textContent = pendingOrders.length;
    if (dashReadyEl) dashReadyEl.textContent = `${onlineStoresCount} / ${allStoresList.length}`;
    if (dashSalesEl) dashSalesEl.textContent = `₹${totalSales.toLocaleString('en-IN')}`;

    // Nav counter badges
    const counterOrders = document.getElementById('counter-orders');
    if (counterOrders) counterOrders.textContent = activeOrders.length;

    const mobBadge = document.getElementById('mob-badge-orders');
    if (mobBadge) {
      mobBadge.textContent = activeOrders.length;
      mobBadge.classList.toggle('hidden', activeOrders.length === 0);
    }

    // 3b. Authoritative Neon PostgreSQL Platform User Analytics & Lifetime GMV
    const userAnalyticsCard = document.getElementById('dash-platform-user-analytics');
    if (userAnalyticsCard) {
      userAnalyticsCard.classList.remove('hidden');

      let userStats = {
        user_count: 6,
        active_buyers: todayOrders.length,
        total_orders: orders.length,
        total_gmv: totalSales
      };

      if (window.UniMallDB && typeof window.UniMallDB.neonSql === 'function') {
        try {
          const dbRows = await window.UniMallDB.neonSql(`
            SELECT 
              (SELECT count(*) FROM users) as user_count,
              (SELECT count(distinct user_email) FROM unimall_orders) as active_buyers,
              (SELECT count(*) FROM unimall_orders) as total_orders,
              (SELECT COALESCE(sum(total), 0) FROM unimall_orders) as total_gmv;
          `);
          if (dbRows && dbRows[0]) {
            userStats = {
              user_count: Number(dbRows[0].user_count || 0),
              active_buyers: Number(dbRows[0].active_buyers || 0),
              total_orders: Number(dbRows[0].total_orders || 0),
              total_gmv: Number(dbRows[0].total_gmv || 0)
            };
          }
        } catch (dbErr) {
          console.warn('[Dashboard] User stats query fallback:', dbErr.message);
        }
      }

      const statUserCount = document.getElementById('stat-user-count');
      const statActiveBuyers = document.getElementById('stat-active-buyers');
      const statLifetimeGmv = document.getElementById('stat-lifetime-gmv');
      const statLifetimeOrders = document.getElementById('stat-lifetime-orders');

      if (statUserCount) statUserCount.textContent = userStats.user_count;
      if (statActiveBuyers) statActiveBuyers.textContent = userStats.active_buyers;
      if (statLifetimeGmv) statLifetimeGmv.textContent = `₹${userStats.total_gmv.toLocaleString('en-IN')}`;
      if (statLifetimeOrders) statLifetimeOrders.textContent = userStats.total_orders;
    }

    // 4. Render LEFT PANEL: Live Platform Orders Stream (React Powered)
    const ordersTitle = document.getElementById('dash-orders-panel-title');
    if (ordersTitle) ordersTitle.textContent = `⚡ Live Platform Orders Stream (${activeOrders.length} Active)`;
    if (typeof window.mountAdminDashboardOrdersStream === 'function') {
      window.mountAdminDashboardOrdersStream();
    } else {
      renderPlatformOrdersStream(activeOrders);
    }

    // 5. Render RIGHT PANEL TOP: Registered Stores Performance Summary
    const invTitle = document.getElementById('dash-inventory-panel-title');
    if (invTitle) invTitle.textContent = '🏪 Registered Stores Operational Breakdown';
    renderPlatformStoresSummary(allStoresList, todayOrders, storeStatuses);

    // 6. Render RIGHT PANEL BOTTOM: Top Selling Products Platform-Wide
    const topProdsRes = await apiRequest('/admin/stores/all/analytics?period=today').catch(() => ({ top_products: [] }));
    renderTopProducts(topProdsRes.top_products || []);

  } catch (err) {
    console.error('Failed to load cumulative platform dashboard:', err);
  }
}

/**
 * Renders the Platform-wide Active Orders Stream with store pill tags
 */
function renderPlatformOrdersStream(orders) {
  const container = document.getElementById('dash-urgent-orders');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 16px; color: var(--text-muted); font-size: 13.5px;">
        ✨ All caught up! No active orders currently pending across any campus store.
      </div>
    `;
    return;
  }

  const STORE_COLOR_MAP = {
    'campus-cafe': { bg: '#FEF3C7', color: '#92400E', label: 'Campus Café' },
    'book-corner': { bg: '#DBEAFE', color: '#1E40AF', label: 'Book Corner' },
    'techstop':    { bg: '#E0E7FF', color: '#3730A3', label: 'TechStop' },
    'campus-mart': { bg: '#DCFCE7', color: '#166534', label: 'Campus Mart' },
    'campus-wear': { bg: '#F3E8FF', color: '#6B21A8', label: 'Campus Wear' },
    'health-hub':  { bg: '#FEE2E2', color: '#991B1B', label: 'Health Hub' },
  };

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${orders.slice(0, 8).map(o => {
        const custName = (o.user_name || o.customerName || 'Student').trim();
        const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
        const totalAmount = Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN');
        const storeTag = STORE_COLOR_MAP[o.store_id] || { bg: '#F1F5F9', color: '#334155', label: o.store_id || 'Campus Store' };
        const statusVal = (o.status || 'placed').toUpperCase();

        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="flex: 1; min-width: 0; padding-right: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="background: ${storeTag.bg}; color: ${storeTag.color}; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.2px;">
                ${storeTag.label}
              </span>
              <strong style="font-size: 13.5px;">${o.order_number_display || '#' + o.id}</strong>
              <span class="badge-status ${(o.status || 'placed').toLowerCase()}" style="font-size: 11px;">${statusVal}</span>
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <strong>${escapeHtml(custName)}</strong> · ${itemCount} item${itemCount === 1 ? '' : 's'} · <span style="font-weight: 700; color: var(--text-main);">₹${totalAmount}</span>
            </div>
          </div>
          <button type="button" class="btn-action primary" onclick="window.viewOrderDetail('${o.id}')" style="height: 32px; font-size: 12px; padding: 0 12px; white-space: nowrap;">
            Process →
          </button>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

/**
 * Renders the Registered Stores summary table on Platform Dashboard
 */
function renderPlatformStoresSummary(stores, todayOrders, storeStatuses) {
  const container = document.getElementById('dash-low-stock-list');
  if (!container) return;

  const aliasMap = {
    'campus-cafe': ['store-bakery', 'campus-cafe'],
    'book-corner': ['store-stationery', 'book-corner'],
    'techstop': ['store-electronics', 'techstop'],
    'campus-mart': ['store-sports', 'campus-mart'],
    'campus-wear': ['store-fashion', 'campus-wear'],
    'health-hub': ['store-pharmacy', 'health-hub']
  };

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${stores.map(s => {
        const validIds = aliasMap[s.id] || [s.id];
        const storeOrders = todayOrders.filter(o => validIds.includes(o.store_id || o.storeId));
        const storeSales = storeOrders.reduce((acc, o) => {
          const isCancelled = (o.status || '').toUpperCase() === 'CANCELLED';
          return !isCancelled ? acc + Number(o.store_subtotal || o.total || 0) : acc;
        }, 0);
        const isOpen = storeStatuses[s.id] !== false;

        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${s.icon || '🏪'}</span>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main);">${escapeHtml(s.name)}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(s.category)} · ${escapeHtml(s.location)}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 13px; color: var(--primary);">₹${storeSales.toLocaleString('en-IN')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${storeOrders.length} order${storeOrders.length === 1 ? '' : 's'}</div>
            </div>
            <span class="badge-status ${isOpen ? 'completed' : 'cancelled'}" style="font-size: 10.5px; padding: 2px 8px;">
              ${isOpen ? '● Online' : '○ Closed'}
            </span>
            <button type="button" class="btn-action secondary" onclick="window.drillDownStore('${s.id}')" style="height: 28px; font-size: 11.5px; padding: 0 8px;">
              Manage →
            </button>
          </div>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

/**
 * Drill down from Platform Admin cumulative view into a specific store
 */
window.drillDownStore = function(storeId) {
  if (typeof window.setActiveStore === 'function') {
    window.setActiveStore(storeId);
  }
  const selector = document.getElementById('store-selector');
  if (selector) selector.value = storeId;
  if (typeof window.switchView === 'function') {
    window.switchView('store');
  }
};

/**
 * ────────────────────────────────────────────────────────────────
 * 2. SINGLE STORE OPERATIONAL DASHBOARD (Store Owner View)
 * ────────────────────────────────────────────────────────────────
 */
async function loadSingleStoreDashboard(storeId) {
  try {
    // Hide platform user analytics widget on single store view
    const userAnalyticsCard = document.getElementById('dash-platform-user-analytics');
    if (userAnalyticsCard) userAnalyticsCard.classList.add('hidden');

    // 1. Fetch Store Profile & Overview
    const storeData = await apiRequest(`/admin/stores/${storeId}`);
    const store = storeData.store;

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

    // Reset button labels
    const btnAdd = document.getElementById('dash-btn-add-product');
    const btnQuick = document.getElementById('dash-btn-quick-add');
    if (btnAdd) {
      btnAdd.textContent = '+ Add Product';
      btnAdd.onclick = () => window.openProductModal ? window.openProductModal() : window.switchView('products');
    }
    if (btnQuick) {
      btnQuick.textContent = '⚡ Quick Add';
      btnQuick.onclick = () => window.openQuickAddModal ? window.openQuickAddModal() : window.switchView('products');
    }

    // Reset card labels for Store View
    const lblOrders = document.getElementById('lbl-dash-orders') || document.querySelector('#card-metric-orders .metric-label');
    const lblPending = document.getElementById('lbl-dash-pending') || document.querySelector('#card-metric-pending .metric-label');
    const lblReady = document.getElementById('lbl-dash-ready') || document.querySelector('#card-metric-ready .metric-label');
    const lblSales = document.getElementById('lbl-dash-sales') || document.querySelector('#card-metric-sales .metric-label');

    if (lblOrders) lblOrders.textContent = "Today's Orders";
    if (lblPending) lblPending.textContent = "Pending / Kitchen";
    if (lblReady) lblReady.textContent = "Ready for Pickup";
    if (lblSales) lblSales.textContent = "Today's Sales";

    // 2. Fetch Orders for this specific store
    const ordersData = await apiRequest(`/admin/stores/${storeId}/orders`);
    const orders = ordersData.orders || [];

    const todayOrders = orders.filter(o => {
      if (!o.created_at) return true;
      try {
        const orderDate = new Date(o.created_at);
        const isSameDay = orderDate.toDateString() === new Date().toDateString();
        const isRecent = (Date.now() - orderDate.getTime()) < 24 * 3600 * 1000;
        return isSameDay || isRecent;
      } catch (e) {
        return true;
      }
    });

    const activeOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase()));
    activeOrders.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    const pendingOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()));
    const readyOrders = orders.filter(o => (o.status || '').toUpperCase() === 'READY');

    const todaySales = todayOrders.reduce((sum, o) => {
      const isCancelled = (o.status || '').toUpperCase() === 'CANCELLED';
      const amt = Number(o.store_subtotal || o.total || o.total_amount || o.subtotal || 0);
      return !isCancelled ? sum + amt : sum;
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

    // Nav counter badges
    const counterOrders = document.getElementById('counter-orders');
    if (counterOrders) counterOrders.textContent = activeOrders.length;

    const mobBadge = document.getElementById('mob-badge-orders');
    if (mobBadge) {
      mobBadge.textContent = activeOrders.length;
      mobBadge.classList.toggle('hidden', activeOrders.length === 0);
    }

    // Panel titles
    const ordersTitle = document.getElementById('dash-orders-panel-title');
    if (ordersTitle) ordersTitle.textContent = 'Orders Requiring Action';

    const invTitle = document.getElementById('dash-inventory-panel-title');
    if (invTitle) invTitle.textContent = 'Low Stock Alerts';

    // Render Urgent / Active Orders
    renderUrgentOrders(activeOrders.slice(0, 6));

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
    console.error('Failed to load single store dashboard:', err);
  }
}

function renderUrgentOrders(orders) {
  const container = document.getElementById('dash-urgent-orders');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
        ✨ All caught up! No active orders requiring preparation or pickup.
      </div>
    `;
    return;
  }

  if (typeof window.renderActiveOrderCard === 'function') {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
        ${orders.map((o, idx) => window.renderActiveOrderCard(o, idx, orders)).join('')}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${orders.map(o => {
        const custName = (o.user_name || o.customer_name || 'Student').trim();
        const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
        const totalAmount = Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN');
        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 13.5px;">${o.order_number_display || '#' + o.id}</strong>
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
            <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(it.name)}</div>
            <div style="font-size: 11.5px; color: ${it.quantity === 0 ? 'var(--danger)' : 'var(--warn)'}; font-weight: 700;">
              ${it.quantity === 0 ? 'OUT OF STOCK (0 left)' : `Only ${it.quantity} ${it.unit || 'item'}s left`}
            </div>
          </div>
          <button type="button" class="btn-action secondary" onclick="window.quickRestock('${it.product_id}', '${escapeHtml(it.name)}', ${it.quantity})" style="height: 28px; font-size: 11.5px;">
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
            <span style="font-weight: 600;">${escapeHtml(p.name)}</span>
          </div>
          <div style="font-weight: 700; color: var(--primary);">
            ${p.sold_count} sold <span style="font-weight: 500; font-size: 11.5px; color: var(--text-muted);">(₹${p.total_sales})</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.loadDashboard = loadDashboard;
