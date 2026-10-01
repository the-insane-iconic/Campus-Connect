/**
 * UniMall Store Admin — Deep Analytics Controller (admin/js/analytics.js)
 * Full-scale campus operations & sales intelligence suite powered by Neon PostgreSQL
 */

'use strict';

let currentAnalyticsPeriod = 'today';
let latestAnalyticsData = null;

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'analytics') {
    loadAnalytics(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-analytics') {
    loadAnalytics(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Period Tabs
  document.querySelectorAll('.period-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAnalyticsPeriod = btn.getAttribute('data-period');
      loadAnalytics(window.activeStoreId);
    });
  });
});

async function loadAnalytics(storeId) {
  const effectiveStoreId = storeId || (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : 'all');
  const user = (typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : null) || (typeof currentAdminUser !== 'undefined' ? currentAdminUser : null);
  const isPlatformUser = (user && user.role === 'platform_admin');
  const isPlatformView = (effectiveStoreId === 'all') || isPlatformUser;

  // Title update
  const titleEl = document.getElementById('analytics-page-title');
  const subEl = document.getElementById('analytics-page-sub');
  if (titleEl) titleEl.textContent = isPlatformView ? 'Deep Campus Analytics' : 'Store Sales Analytics';
  if (subEl) subEl.textContent = isPlatformView
    ? 'Comprehensive sales intelligence, peak rush curves, store comparison matrix & student trends'
    : 'Realtime velocity, peak hours, best-selling menu items & fulfillment split';

  // Toggle store matrix panel (shown only in platform view)
  const storeMatrixPanel = document.getElementById('analytics-store-matrix-panel');
  if (storeMatrixPanel) {
    storeMatrixPanel.classList.toggle('hidden', !isPlatformView);
  }

  try {
    let data = null;
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getDeepAnalytics === 'function') {
      data = await window.UniMallDB.getDeepAnalytics(isPlatformView ? 'all' : effectiveStoreId, currentAnalyticsPeriod);
    }

    if (!data) {
      data = {
        revenue: 0,
        orders: 0,
        customers: 0,
        average_order_value: 0,
        units_sold: 0,
        hourly_rush: [],
        store_matrix: [],
        top_products: [],
        payment_splits: [],
        fulfillment_splits: []
      };
    }

    latestAnalyticsData = data;

    // 1. Render Top 5 KPI Cards
    const revEl = document.getElementById('analytics-revenue');
    const ordEl = document.getElementById('analytics-orders');
    const untEl = document.getElementById('analytics-units');
    const aovEl = document.getElementById('analytics-aov');
    const custEl = document.getElementById('analytics-customers');

    if (revEl) revEl.textContent = `₹${Math.round(data.revenue).toLocaleString('en-IN')}`;
    if (ordEl) ordEl.textContent = data.orders;
    if (untEl) untEl.textContent = data.units_sold;
    if (aovEl) aovEl.textContent = `₹${Number(data.average_order_value).toFixed(1)}`;
    if (custEl) custEl.textContent = data.customers;

    // 2. Render Campus Hourly Rush Distribution
    renderHourlyRushChart(data.hourly_rush, data.orders, data.revenue);

    // 3. Render Store Performance Comparison Matrix (if platform view)
    if (isPlatformView) {
      renderStoreMatrixTable(data.store_matrix, data.revenue);
    }

    // 4. Render Top 10 Best-Selling Campus Products Leaderboard
    renderTopProductsTable(data.top_products, data.revenue);

    // 5. Render Payment Channels Split
    renderPaymentSplits(data.payment_splits, data.revenue);

    // 6. Render Fulfillment Types Split
    renderFulfillmentSplits(data.fulfillment_splits, data.orders);

  } catch (err) {
    console.error('[Analytics] Failed to load deep analytics:', err);
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * 1. RENDER 24-HOUR PEAK CAMPUS RUSH CURVE
 * ────────────────────────────────────────────────────────────────
 */
function renderHourlyRushChart(hourlyRows, totalOrders, totalRevenue) {
  const container = document.getElementById('hourly-bars-chart');
  if (!container) return;

  // Build a map of 24 hours (0 to 23)
  const hourMap = {};
  for (let h = 0; h < 24; h++) {
    hourMap[h] = { orders: 0, revenue: 0 };
  }

  let maxOrders = 1;
  (hourlyRows || []).forEach(r => {
    const hr = parseInt(r.hr, 10);
    const cnt = parseInt(r.orders_count || 0, 10);
    const rev = parseFloat(r.revenue || 0);
    if (hr >= 0 && hr < 24) {
      hourMap[hr] = { orders: cnt, revenue: rev };
      if (cnt > maxOrders) maxOrders = cnt;
    }
  });

  // Calculate meal slot aggregates
  const getSlotTotals = (startHr, endHr) => {
    let orders = 0, revenue = 0;
    for (let h = startHr; h <= endHr; h++) {
      orders += (hourMap[h]?.orders || 0);
      revenue += (hourMap[h]?.revenue || 0);
    }
    return { orders, revenue };
  };

  const bf = getSlotTotals(8, 10);
  const ln = getSlotTotals(12, 14);
  const ev = getSlotTotals(16, 18);
  const nt = getSlotTotals(20, 23);

  const setSlotStat = (id, stat) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = `${stat.orders} order${stat.orders === 1 ? '' : 's'} · ₹${Math.round(stat.revenue).toLocaleString('en-IN')}`;
    }
  };
  setSlotStat('rush-breakfast-stat', bf);
  setSlotStat('rush-lunch-stat', ln);
  setSlotStat('rush-evening-stat', ev);
  setSlotStat('rush-night-stat', nt);

  // Dynamic hours to show: always include active hours, plus standard campus daytime hours
  const activeHours = Object.keys(hourMap).map(Number).filter(h => hourMap[h]?.orders > 0);
  const baseDayHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const hoursSet = new Set([...activeHours, ...baseDayHours]);
  const hoursToShow = Array.from(hoursSet).sort((a, b) => a - b);

  const formatHourLabel = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  container.innerHTML = `
    <div class="hourly-bars-grid">
      ${hoursToShow.map(h => {
        const item = hourMap[h] || { orders: 0, revenue: 0 };
        const heightPct = Math.max(8, Math.round((item.orders / maxOrders) * 100));
        const isPeak = (h >= 8 && h <= 10) || (h >= 12 && h <= 14) || (h >= 16 && h <= 18) || (h >= 20 && h <= 23);
        const hasActivity = item.orders > 0;

        return `
          <div class="hourly-bar-col">
            <div class="bar-value-top" style="opacity: ${hasActivity ? '1' : '0.2'};">
              ${item.orders > 0 ? item.orders : '0'}
            </div>
            <div class="bar-track">
              <div class="bar-fill ${isPeak && hasActivity ? 'peak' : ''}" 
                   style="height: ${hasActivity ? heightPct : 6}%;" 
                   title="${formatHourLabel(h)}: ${item.orders} orders (₹${Math.round(item.revenue)})">
              </div>
            </div>
            <div class="bar-label">${formatHourLabel(h)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * ────────────────────────────────────────────────────────────────
 * 2. RENDER STORE PERFORMANCE & MARKET SHARE MATRIX
 * ────────────────────────────────────────────────────────────────
 */
function renderStoreMatrixTable(storeMatrix, totalRevenue) {
  const tbody = document.getElementById('analytics-store-matrix-tbody');
  if (!tbody) return;

  const CANONICAL_MATRIX = [
    { store_id: 'campus-cafe', store_name: 'Campus Bakery & Café', category: 'food' },
    { store_id: 'book-corner', store_name: 'Stationery Hub & Book Corner', category: 'stationery' },
    { store_id: 'techstop', store_name: 'TechStop Electronics', category: 'electronics' },
    { store_id: 'campus-mart', store_name: 'Campus Mart & Groceries', category: 'essentials' },
    { store_id: 'campus-wear', store_name: 'Campus Wear & Style Square', category: 'fashion' },
    { store_id: 'health-hub', store_name: 'Health Hub & Care', category: 'essentials' }
  ];

  const fullMatrix = (storeMatrix && storeMatrix.length > 0)
    ? storeMatrix.map(r => ({
        store_id: r.store_id,
        store_name: r.store_name,
        category: r.category,
        revenue: parseFloat(r.revenue || 0),
        orders_count: parseInt(r.orders_count || 0, 10),
        customers_count: parseInt(r.customers_count || 0, 10),
        aov: parseFloat(r.aov || 0)
      }))
    : CANONICAL_MATRIX.map(base => ({
        store_id: base.store_id,
        store_name: base.store_name,
        category: base.category,
        revenue: 0,
        orders_count: 0,
        customers_count: 0,
        aov: 0
      }));

  // Sort by revenue descending
  fullMatrix.sort((a, b) => b.revenue - a.revenue);

  const STORE_ICONS = {
    'campus-cafe': '☕',
    'book-corner': '📚',
    'techstop':    '💻',
    'campus-mart': '🛒',
    'campus-wear': '👕',
    'health-hub':  '💊'
  };

  tbody.innerHTML = fullMatrix.map(row => {
    const rev = parseFloat(row.revenue || 0);
    const sharePct = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : '0.0';
    const icon = STORE_ICONS[row.store_id] || '🏪';

    return `
      <tr>
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
        <td><strong style="font-size:14px; color:var(--text-main);">₹${Math.round(rev).toLocaleString('en-IN')}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; min-width:50px;">
              <div style="width:${sharePct}%; height:100%; background:var(--primary); border-radius:3px;"></div>
            </div>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted); min-width:38px;">${sharePct}%</span>
          </div>
        </td>
        <td><strong style="font-size:13.5px;">${row.orders_count || 0}</strong></td>
        <td><strong style="font-size:13.5px; color:var(--primary);">${row.customers_count || 0}</strong></td>
        <td><span style="font-size:13px; font-weight:600; color:var(--text-main);">₹${Math.round(row.aov || 0)}</span></td>
      </tr>
    `;
  }).join('');
}

/**
 * ────────────────────────────────────────────────────────────────
 * 3. RENDER TOP 10 BEST-SELLING PRODUCTS LEADERBOARD
 * ────────────────────────────────────────────────────────────────
 */
function renderTopProductsTable(topProducts, totalRevenue) {
  const tbody = document.getElementById('analytics-top-products-tbody');
  if (!tbody) return;

  if (!topProducts || topProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6" style="color:var(--text-muted);">No product sales recorded in this period.</td></tr>`;
    return;
  }

  tbody.innerHTML = topProducts.map((p, idx) => {
    const gross = parseFloat(p.gross_sales || p.total_sales || 0);
    const share = totalRevenue > 0 ? ((gross / totalRevenue) * 100).toFixed(1) : '0';
    const rankBadge = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));

    return `
      <tr>
        <td><strong style="font-size:13px; color:var(--primary);">${rankBadge}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">${p.emoji || '📦'}</span>
            <strong style="color:var(--text-main); font-size:13.5px;">${escapeHtml(p.product_name || p.name || 'Campus Item')}</strong>
          </div>
        </td>
        <td><span style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(p.store_name || 'Campus Store')}</span></td>
        <td><strong style="font-size:13.5px;">${p.units_sold || p.sold_count || 0}</strong> units</td>
        <td><strong style="font-size:14px; color:#059669;">₹${Math.round(gross).toLocaleString('en-IN')}</strong></td>
        <td>
          <span style="font-size:12px; font-weight:600; background:var(--surface-alt); padding:2px 8px; border-radius:4px; border:1px solid var(--border);">
            ${share}% of GMV
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * ────────────────────────────────────────────────────────────────
 * 4. RENDER PAYMENT CHANNELS SPLIT
 * ────────────────────────────────────────────────────────────────
 */
function renderPaymentSplits(paymentSplits, totalRevenue) {
  const container = document.getElementById('analytics-payments-container');
  if (!container) return;

  if (!paymentSplits || paymentSplits.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No payment data recorded in this period.</div>';
    return;
  }

  const grandTotal = totalRevenue > 0 ? totalRevenue : paymentSplits.reduce((acc, p) => acc + parseFloat(p.total_sales || 0), 0);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${paymentSplits.map(p => {
        const amt = parseFloat(p.total_sales || 0);
        const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : '0';
        const isDigital = String(p.method).includes('Razorpay') || String(p.method).includes('Digital') || String(p.method).includes('online');
        const icon = isDigital ? '⚡' : '💵';
        const barColor = isDigital ? '#2563EB' : '#D97706';

        return `
          <div style="background:var(--surface-alt); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:13.5px; font-weight:700; display:flex; align-items:center; gap:6px;">
                <span>${icon}</span>
                <span>${escapeHtml(p.method)}</span>
              </span>
              <div style="text-align:right;">
                <strong style="font-size:14px; color:var(--text-main);">₹${Math.round(amt).toLocaleString('en-IN')}</strong>
                <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">(${pct}%)</span>
              </div>
            </div>
            <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:3px;"></div>
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:5px;">
              ${p.orders_count || 0} order${p.orders_count === 1 ? '' : 's'} settled through this channel
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * ────────────────────────────────────────────────────────────────
 * 5. RENDER FULFILLMENT DISTRIBUTION SPLIT
 * ────────────────────────────────────────────────────────────────
 */
function renderFulfillmentSplits(fulfillmentSplits, totalOrders) {
  const container = document.getElementById('analytics-fulfillment-container');
  if (!container) return;

  if (!fulfillmentSplits || fulfillmentSplits.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No fulfillment records in this period.</div>';
    return;
  }

  const grandOrders = totalOrders > 0 ? totalOrders : fulfillmentSplits.reduce((acc, f) => acc + parseInt(f.orders_count || 0, 10), 0);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${fulfillmentSplits.map(f => {
        const count = parseInt(f.orders_count || 0, 10);
        const amt = parseFloat(f.total_sales || 0);
        const pct = grandOrders > 0 ? ((count / grandOrders) * 100).toFixed(1) : '0';
        const isDelivery = String(f.fulfillment).includes('Hostel') || String(f.fulfillment).includes('Delivery');
        const icon = isDelivery ? '🛵' : '🛍️';
        const barColor = isDelivery ? '#10B981' : '#8B5CF6';

        return `
          <div style="background:var(--surface-alt); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:13.5px; font-weight:700; display:flex; align-items:center; gap:6px;">
                <span>${icon}</span>
                <span>${escapeHtml(f.fulfillment)}</span>
              </span>
              <div style="text-align:right;">
                <strong style="font-size:14px; color:var(--text-main);">${count} orders</strong>
                <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">(${pct}%)</span>
              </div>
            </div>
            <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:3px;"></div>
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:5px;">
              Generated gross sales of ₹${Math.round(amt).toLocaleString('en-IN')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
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
