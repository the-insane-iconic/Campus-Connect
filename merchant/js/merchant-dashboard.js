/**
* UniMall Merchant Portal — Store Dashboard Metrics Controller (merchant/js/merchant-dashboard.js)
* Computes live operational metrics strictly for the authenticated store from Neon DB.
*/

'use strict';

async function loadMerchantDashboard() {
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  const salesEl = document.getElementById('dash-metric-sales');
  const custEl = document.getElementById('dash-metric-customers');
  const ordersEl = document.getElementById('dash-metric-orders');
  const payoutEl = document.getElementById('dash-metric-payout');

  try {
    let orders = [];
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getOrders === 'function') {
      orders = await window.UniMallDB.getOrders(storeId).catch(() => []);
    }

    // Calculate metrics
    const now = new Date();
    const isToday = (dStr) => {
      if (!dStr) return false;
      const d = new Date(dStr);
      return d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    };

    let todaySales = 0;
    const uniqueCustomers = new Set();
    let totalStoreOrders = orders.length;

    orders.forEach(o => {
      const amt = parseFloat(o.total_amount || o.total || 0) || 0;
      if (isToday(o.created_at || o.createdAt)) {
        todaySales += amt;
      }
      const cId = o.user_id || o.user_name || o.customer_name || o.email;
      if (cId) uniqueCustomers.add(cId);
    });

    // Payout after platform commission (5% platform fee)
    const netPayout = Math.round(todaySales * 0.95);

    if (salesEl) salesEl.textContent = `₹${todaySales.toLocaleString('en-IN')}`;
    if (custEl) custEl.textContent = uniqueCustomers.size;
    if (ordersEl) ordersEl.textContent = totalStoreOrders;
    if (payoutEl) payoutEl.textContent = `₹${netPayout.toLocaleString('en-IN')}`;

    // Render recent orders snapshot in dashboard
    renderDashboardRecentOrders(orders.slice(0, 5));

  } catch (err) {
    console.error('[Merchant Dashboard] Error loading store metrics:', err);
  }
}
window.loadMerchantDashboard = loadMerchantDashboard;

function renderDashboardRecentOrders(orders) {
  const container = document.getElementById('dash-recent-orders-list');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
        <p style="font-weight: 600; font-size: 14px;">No orders yet today</p>
        <p style="font-size: 12px;">New incoming orders from students will appear here in real-time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(o => {
    const orderId = (o.id || '').slice(0, 8).toUpperCase();
    const customer = o.user_name || o.customer_name || 'Campus Student';
    const total = parseFloat(o.total_amount || o.total || 0);
    const status = (o.status || 'pending').toUpperCase();
    const time = o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

    let statusBg = '#FEF3C7';
    let statusColor = '#B45309';
    if (status === 'READY') { statusBg = '#DBEAFE'; statusColor = '#1D4ED8'; }
    if (status === 'DELIVERED' || status === 'COMPLETED') { statusBg = '#DCFCE7'; statusColor = '#15803D'; }
    if (status === 'CANCELLED') { statusBg = '#FEE2E2'; statusColor = '#B91C1C'; }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle);">
        <div>
          <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main);">#${orderId} • ${customer}</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${time} • ₹${total.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${statusBg}; color: ${statusColor};">
            ${status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}
