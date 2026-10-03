/**
 * UniMall Merchant Portal — Store Analytics & Student Demand (merchant/js/merchant-analytics.js)
 * Displays store-level sales breakdown and student demand strictly for this store.
 */

'use strict';

async function loadMerchantAnalytics() {
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  try {
    let orders = [];
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getOrders === 'function') {
      orders = await window.UniMallDB.getOrders(storeId).catch(() => []);
    }

    const totalOrders = orders.length;
    let totalRevenue = 0;
    const itemCounts = {};

    orders.forEach(o => {
      totalRevenue += parseFloat(o.total_amount || o.total || 0);
      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          const name = it.product_name || it.name || 'Item';
          itemCounts[name] = (itemCounts[name] || 0) + (it.quantity || 1);
        });
      }
    });

    const netEarnings = Math.round(totalRevenue * 0.95);

    const aRev = document.getElementById('analytic-total-revenue');
    const aOrd = document.getElementById('analytic-total-orders');
    const aEarn = document.getElementById('analytic-net-earnings');
    if (aRev) aRev.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    if (aOrd) aOrd.textContent = totalOrders;
    if (aEarn) aEarn.textContent = `₹${netEarnings.toLocaleString('en-IN')}`;

    // Top selling items
    const topItemsContainer = document.getElementById('analytic-top-items');
    if (topItemsContainer) {
      const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length === 0) {
        topItemsContainer.innerHTML = `<p style="color:var(--text-muted); font-size:13px; padding:12px;">No sales history yet.</p>`;
      } else {
        topItemsContainer.innerHTML = sorted.map(([name, count]) => `
          <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-subtle); font-size:13.5px;">
            <span style="font-weight:600;">${name}</span>
            <span style="font-weight:700; color:var(--primary);">${count} sold</span>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    console.error('[Merchant Analytics] Error:', err);
  }
}
window.loadMerchantAnalytics = loadMerchantAnalytics;

async function loadMerchantRequests() {
  const storeId = window.merchantStoreId;
  const listEl = document.getElementById('merchant-requests-list');
  if (!listEl) return;

  try {
    listEl.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-muted);">
        <p style="font-size:14px; font-weight:600;">Student Item Requests</p>
        <p style="font-size:12px;">Students can request items not currently stocked in ${storeId}. Those requests will appear here.</p>
      </div>
    `;
  } catch (err) {
    console.error('[Merchant Requests] Error:', err);
  }
}
window.loadMerchantRequests = loadMerchantRequests;
