/**
 * UniMall Store Admin — Dashboard Controller (admin/js/dashboard.js)
 * Authoritative Backend-Driven Platform Overview & Daily Store Payout Distribution Ledger
 */

'use strict';

let currentDashboardMetrics = null;

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
  // Listen for order status updates from other tabs
  window.addEventListener('unimall:orderStatusUpdated', () => {
    const currentActiveView = document.querySelector('.admin-view.active');
    if (currentActiveView && currentActiveView.id === 'view-dashboard') {
      loadDashboard(window.activeStoreId);
    }
  });

  try {
    const bc = new BroadcastChannel('unimall_orders_channel');
    bc.onmessage = (event) => {
      const currentActiveView = document.querySelector('.admin-view.active');
      if (currentActiveView && currentActiveView.id === 'view-dashboard') {
        loadDashboard(window.activeStoreId);
      }
    };
  } catch (e) {}
});

/**
 * ────────────────────────────────────────────────────────────────
 * LOAD DASHBOARD (Directly & Authoritatively from Neon PostgreSQL)
 * ────────────────────────────────────────────────────────────────
 */
async function loadDashboard(storeId) {
  const effectiveStoreId = storeId || (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : 'all');
  const isPlatformUser = (currentAdminUser && currentAdminUser.role === 'platform_admin');
  const isPlatformView = (effectiveStoreId === 'all') || isPlatformUser;

  // 1. Update Header Greeting
  const greetingEl = document.getElementById('dash-greeting');
  const storeSubEl = document.getElementById('dash-store-sub');

  if (greetingEl) {
    if (isPlatformView) {
      greetingEl.textContent = 'Campus Operations & Daily Settlement';
    } else {
      const currentStore = (currentAuthorizedStores || []).find(s => s.store_id === effectiveStoreId);
      const sName = currentStore ? currentStore.store_name : 'Campus Store';
      greetingEl.textContent = `Good morning, ${sName}`;
    }
  }

  if (storeSubEl) {
    if (isPlatformView) {
      storeSubEl.textContent = "Today's sales, student footfall, and end-of-day store payout distribution ledger";
    } else {
      storeSubEl.textContent = "Store Operating Overview · Counter queue, daily sales & stock";
    }
  }

  // 2. Query Authoritative Dashboard Metrics from Neon PostgreSQL
  try {
    let metrics = null;
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getDashboardMetrics === 'function') {
      metrics = await window.UniMallDB.getDashboardMetrics(isPlatformView ? 'all' : effectiveStoreId);
    }

    const CANONICAL_DEFAULT = [
      { store_id: 'campus-cafe', store_name: 'Campus Bakery & Café', category: 'food' },
      { store_id: 'book-corner', store_name: 'Stationery Hub & Book Corner', category: 'stationery' },
      { store_id: 'techstop', store_name: 'TechStop Electronics', category: 'electronics' },
      { store_id: 'campus-mart', store_name: 'Campus Mart & Groceries', category: 'essentials' },
      { store_id: 'campus-wear', store_name: 'Campus Wear & Style Square', category: 'fashion' },
      { store_id: 'health-hub', store_name: 'Health Hub & Care', category: 'essentials' }
    ].map(s => ({
      ...s,
      today_orders_count: 0,
      today_customers_count: 0,
      today_gross_sales: 0,
      digital_sales: 0,
      cash_sales: 0,
      platform_fee: 0,
      net_payout: 0,
      settlement_status: 'No Sales Today'
    }));

    if (!metrics) {
      metrics = {
        today_sales: 0,
        today_orders: 0,
        today_customers: 0,
        active_orders: 0,
        platform_fee_total: 0,
        net_payout_total: 0,
        stores_ledger: CANONICAL_DEFAULT
      };
    } else if (!metrics.stores_ledger || metrics.stores_ledger.length === 0) {
      metrics.stores_ledger = CANONICAL_DEFAULT;
    }

    currentDashboardMetrics = metrics;

    // 3. Render Top Metric Ribbon
    const salesEl = document.getElementById('dash-today-sales');
    const customersEl = document.getElementById('dash-today-customers');
    const ordersEl = document.getElementById('dash-today-orders');
    const payoutEl = document.getElementById('dash-today-payout');

    if (salesEl) salesEl.textContent = `₹${Math.round(metrics.today_sales).toLocaleString('en-IN')}`;
    if (customersEl) customersEl.textContent = metrics.today_customers;
    if (ordersEl) ordersEl.textContent = metrics.today_orders;
    if (payoutEl) payoutEl.textContent = `₹${Math.round(metrics.net_payout_total).toLocaleString('en-IN')}`;

    // 4. Update Active Orders Counter & Banner
    const activeBadge = document.getElementById('dash-active-count-badge');
    if (activeBadge) activeBadge.textContent = metrics.active_orders;

    const counterOrders = document.getElementById('counter-orders');
    if (counterOrders) counterOrders.textContent = metrics.active_orders;

    const mobBadge = document.getElementById('mob-badge-orders');
    if (mobBadge) {
      mobBadge.textContent = metrics.active_orders;
      mobBadge.classList.toggle('hidden', metrics.active_orders === 0);
    }

    // 5. Render Core End-of-Day Store Sales & Payout Distribution Ledger Table
    renderStorePayoutLedger(metrics.stores_ledger, metrics);

    // 6. Single Store view: Show extra stock & product cards if viewing specific store
    const singleStorePanels = document.getElementById('single-store-extra-panels');
    if (singleStorePanels) {
      singleStorePanels.classList.toggle('hidden', isPlatformView);
      if (!isPlatformView) {
        loadSingleStoreExtras(effectiveStoreId);
      }
    }

  } catch (err) {
    console.error('[Dashboard] Error loading authoritative metrics:', err);
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * RENDER STORE PAYOUT DISTRIBUTION LEDGER TABLE
 * ────────────────────────────────────────────────────────────────
 */
function renderStorePayoutLedger(storesLedger, totals) {
  const tbody = document.getElementById('store-payout-ledger-tbody');
  if (!tbody) return;

  const STORE_ICONS = {
    'campus-cafe': '☕',
    'book-corner': '📚',
    'techstop':    '💻',
    'campus-mart': '🛒',
    'campus-wear': '👕',
    'health-hub':  '💊'
  };

  const settledStores = JSON.parse(localStorage.getItem('unimall_settled_stores_today_' + new Date().toDateString()) || '{}');

  if (!storesLedger || storesLedger.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6" style="color:var(--text-muted);">No campus stores registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = storesLedger.map(row => {
    const icon = STORE_ICONS[row.store_id] || '🏪';
    const isSettled = !!settledStores[row.store_id];
    const hasSales = row.today_gross_sales > 0;

    let statusPill = '';
    if (isSettled) {
      statusPill = `<span class="badge-status completed" style="font-size:11px; padding:3px 8px;">✅ Settled</span>`;
    } else if (hasSales) {
      statusPill = `<button type="button" class="btn-action primary" onclick="window.settleStorePayout('${row.store_id}', '${escapeHtml(row.store_name)}', ${row.net_payout})" style="font-size:11px; padding:4px 10px; height:28px;">
        Disburse ₹${Math.round(row.net_payout).toLocaleString('en-IN')}
      </button>`;
    } else {
      statusPill = `<span style="font-size:11.5px; color:var(--text-muted);">No Sales Today</span>`;
    }

    return `
      <tr class="${isSettled ? 'row-settled' : ''}">
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">${icon}</span>
            <div>
              <strong style="color:var(--text-main); font-size:13.5px;">${escapeHtml(row.store_name)}</strong>
              <div style="font-size:11px; color:var(--text-muted);">${row.store_id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:12px; text-transform:capitalize; background:var(--surface-alt); padding:2px 8px; border-radius:4px; border:1px solid var(--border);">
            ${escapeHtml(row.category || 'General')}
          </span>
        </td>
        <td><strong style="font-size:13.5px;">${row.today_orders_count}</strong></td>
        <td><strong style="font-size:13.5px; color:var(--primary);">${row.today_customers_count}</strong></td>
        <td><strong style="font-size:14px; color:var(--text-main);">₹${Math.round(row.today_gross_sales).toLocaleString('en-IN')}</strong></td>
        <td><span style="color:#2563EB; font-weight:600; font-size:12.5px;">₹${Math.round(row.digital_sales).toLocaleString('en-IN')}</span></td>
        <td><span style="color:#D97706; font-weight:600; font-size:12.5px;">₹${Math.round(row.cash_sales).toLocaleString('en-IN')}</span></td>
        <td><span style="color:var(--text-muted); font-size:12px;">₹${Math.round(row.platform_fee).toLocaleString('en-IN')}</span></td>
        <td>
          <strong style="color:#059669; font-size:14px; font-weight:800;">
            ₹${Math.round(row.net_payout).toLocaleString('en-IN')}
          </strong>
        </td>
        <td>${statusPill}</td>
      </tr>
    `;
  }).join('');

  // 7. Update Settlement Summary Chips
  const totalDigital = storesLedger.reduce((sum, r) => sum + r.digital_sales, 0);
  const totalCash = storesLedger.reduce((sum, r) => sum + r.cash_sales, 0);
  const totalFee = storesLedger.reduce((sum, r) => sum + r.platform_fee, 0);
  const totalNet = storesLedger.reduce((sum, r) => sum + r.net_payout, 0);

  const elDigital = document.getElementById('summary-total-digital');
  const elCash = document.getElementById('summary-total-cash');
  const elFee = document.getElementById('summary-total-fee');
  const elNet = document.getElementById('summary-total-net-payout');

  if (elDigital) elDigital.textContent = `₹${Math.round(totalDigital).toLocaleString('en-IN')}`;
  if (elCash) elCash.textContent = `₹${Math.round(totalCash).toLocaleString('en-IN')}`;
  if (elFee) elFee.textContent = `₹${Math.round(totalFee).toLocaleString('en-IN')}`;
  if (elNet) elNet.textContent = `₹${Math.round(totalNet).toLocaleString('en-IN')}`;
}

/**
 * ────────────────────────────────────────────────────────────────
 * SETTLE STORE PAYOUT (1-Click End-of-Day Settlement Action)
 * ────────────────────────────────────────────────────────────────
 */
window.settleStorePayout = function(storeId, storeName, amount) {
  const confirmMsg = `Disburse & settle ₹${Math.round(amount).toLocaleString('en-IN')} to ${storeName} for today?`;
  if (!confirm(confirmMsg)) return;

  try {
    const todayKey = 'unimall_settled_stores_today_' + new Date().toDateString();
    const settled = JSON.parse(localStorage.getItem(todayKey) || '{}');
    settled[storeId] = {
      settledAt: new Date().toISOString(),
      amount: amount,
      storeName: storeName
    };
    localStorage.setItem(todayKey, JSON.stringify(settled));

    if (typeof showToast === 'function') {
      showToast(`✅ Disbursed ₹${Math.round(amount).toLocaleString('en-IN')} to ${storeName}. Ledger updated!`);
    }

    // Refresh ledger display
    if (currentDashboardMetrics) {
      renderStorePayoutLedger(currentDashboardMetrics.stores_ledger, currentDashboardMetrics);
    }
  } catch (e) {
    console.error('Settlement error:', e);
  }
};

/**
 * ────────────────────────────────────────────────────────────────
 * EXPORT DAILY SETTLEMENT CSV
 * ────────────────────────────────────────────────────────────────
 */
window.exportDailySettlementCSV = function() {
  if (!currentDashboardMetrics || !currentDashboardMetrics.stores_ledger) {
    alert('No settlement data available to export.');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const rows = [
    ['Campus Connect — Daily Store Sales & Settlement Ledger'],
    ['Generated Date', todayStr],
    ['Total Platform Sales', `INR ${currentDashboardMetrics.today_sales}`],
    ['Total Customers', currentDashboardMetrics.today_customers],
    ['Total Orders', currentDashboardMetrics.today_orders],
    ['Total Net Merchant Payouts', `INR ${currentDashboardMetrics.net_payout_total}`],
    [],
    ['Store ID', 'Store Name', 'Category', 'Orders Today', 'Customers Today', 'Gross Sales (INR)', 'Digital Online (INR)', 'Cash Counter (INR)', 'Platform Fee 5% (INR)', 'Net Payout Due (INR)']
  ];

  currentDashboardMetrics.stores_ledger.forEach(r => {
    rows.push([
      r.store_id,
      r.store_name,
      r.category,
      r.today_orders_count,
      r.today_customers_count,
      r.today_gross_sales,
      r.digital_sales,
      r.cash_sales,
      r.platform_fee,
      r.net_payout
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Campus_Connect_Daily_Settlement_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * ────────────────────────────────────────────────────────────────
 * PRINT DAILY SETTLEMENT SLIP
 * ────────────────────────────────────────────────────────────────
 */
window.printDailySettlementSheet = function() {
  if (!currentDashboardMetrics) {
    alert('Please wait for dashboard metrics to load.');
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const rowsHtml = (currentDashboardMetrics.stores_ledger || []).map(r => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #ddd;"><strong>${escapeHtml(r.store_name)}</strong><br><small style="color:#666;">${escapeHtml(r.category)}</small></td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center;">${r.today_orders_count}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center;">${r.today_customers_count}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right;">₹${Math.round(r.today_gross_sales).toLocaleString('en-IN')}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; color:#2563eb;">₹${Math.round(r.digital_sales).toLocaleString('en-IN')}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; color:#d97706;">₹${Math.round(r.cash_sales).toLocaleString('en-IN')}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; color:#888;">₹${Math.round(r.platform_fee).toLocaleString('en-IN')}</td>
      <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#059669;">₹${Math.round(r.net_payout).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Campus Connect — Daily Store Settlement (${todayStr})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #17213A; }
        h1 { margin: 0; font-size: 22px; }
        .meta { color: #64748B; font-size: 13px; margin: 4px 0 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
        th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
        .totals-card { background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 14px; }
        .signature-row { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #64748B; }
      </style>
    </head>
    <body>
      <h1>Campus Connect — Daily Store Sales & Settlement Slip</h1>
      <div class="meta">Settlement Date: ${todayStr} · Single Source of Truth: Neon PostgreSQL</div>

      <table>
        <thead>
          <tr>
            <th>Store Name</th>
            <th style="text-align:center;">Orders</th>
            <th style="text-align:center;">Customers</th>
            <th style="text-align:right;">Gross Sales</th>
            <th style="text-align:right;">Digital Escrow</th>
            <th style="text-align:right;">Counter Cash</th>
            <th style="text-align:right;">Platform Fee (5%)</th>
            <th style="text-align:right;">Net Disbursement Due</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="totals-card">
        <div>Total Platform Sales: <strong>₹${Math.round(currentDashboardMetrics.today_sales).toLocaleString('en-IN')}</strong></div>
        <div>Unique Customers: <strong>${currentDashboardMetrics.today_customers}</strong></div>
        <div>Platform Commission: <strong>₹${Math.round(currentDashboardMetrics.platform_fee_total).toLocaleString('en-IN')}</strong></div>
        <div>Total Net Due to Merchants: <strong style="color:#059669; font-size:16px;">₹${Math.round(currentDashboardMetrics.net_payout_total).toLocaleString('en-IN')}</strong></div>
      </div>

      <div class="signature-row">
        <div>Prepared by: Campus Operations Superadmin</div>
        <div>Store Manager Signature: _______________________</div>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

window.refreshDashboardMetrics = function() {
  loadDashboard(window.activeStoreId);
  if (typeof showToast === 'function') {
    showToast('↻ Refreshed latest metrics from Neon PostgreSQL');
  }
};

/**
 * Single store extras: loads low stock and top products for single store owner view
 */
async function loadSingleStoreExtras(storeId) {
  try {
    const invRes = await apiRequest(`/admin/stores/${storeId}/inventory`).catch(() => ({ products: [] }));
    const lowStock = (invRes.products || []).filter(p => (p.stock || 0) <= (p.low_stock_threshold || 5));
    const lowStockContainer = document.getElementById('dash-low-stock-list');
    if (lowStockContainer) {
      if (lowStock.length === 0) {
        lowStockContainer.innerHTML = '<div class="empty-state-sm">✅ All items healthy and in stock.</div>';
      } else {
        lowStockContainer.innerHTML = lowStock.slice(0, 5).map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span>${escapeHtml(p.name)}</span>
            <span class="badge-status cancelled" style="font-size:11px;">${p.stock} left</span>
          </div>
        `).join('');
      }
    }

    const topRes = await apiRequest(`/admin/stores/${storeId}/analytics?period=today`).catch(() => ({ top_products: [] }));
    const topContainer = document.getElementById('dash-top-products-list');
    if (topContainer) {
      const prods = topRes.top_products || [];
      if (prods.length === 0) {
        topContainer.innerHTML = '<div class="empty-state-sm">No sales yet today.</div>';
      } else {
        topContainer.innerHTML = prods.slice(0, 5).map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span>${escapeHtml(p.name)}</span>
            <strong style="color:var(--primary);">₹${Math.round(p.total_sales || 0)}</strong>
          </div>
        `).join('');
      }
    }
  } catch (e) {}
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
