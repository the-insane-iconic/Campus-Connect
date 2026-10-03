(function() {
'use strict';

/* ═══════════════════════════════════════════════════════════
   UNIMALL — ORDERS CONTROLLER (orders.js)
   Matches reference Orders design:
     - Dynamic Live Active Order Card with 4-Step Stepper & OTP
     - Compact Order History Cards with Product Preview Chips
     - Real Authenticated Backend Data from Neon PostgreSQL / Supabase
     - Dynamic Filter Counts & Interactive Sorting & Search
   ═══════════════════════════════════════════════════════════ */

/* ─── CONSTANTS & STATE ──────────────────────────────────── */
var ORDERS_STORAGE_KEY = window.ORDERS_STORAGE_KEY || 'unimall_v1';

const OrdersState = {
  orders: [],
  currentTab: 'all', // 'all' | 'active' | 'delivered' | 'cancelled'
  searchQuery: '',
  currentSort: 'latest', // 'latest' | 'oldest' | 'amount_high' | 'amount_low'
  selectedOrderId: null
};

let isOrdersLoading = true;

/* ─── STORAGE SYNC ───────────────────────────────────────── */
function loadStateFromStorage() {
  try {
    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    if (!activeUser) {
      const auth = localStorage.getItem('unimall_auth');
      if (auth) {
        try { activeUser = JSON.parse(auth); } catch (e) {}
      }
    }
    const currentUid = activeUser?.userId || activeUser?.uid || activeUser?.id || activeUser?.guestId;

    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) {
        if (currentUid) {
          OrdersState.orders = parsed.orders.filter(o => !o.user_id || o.user_id === currentUid || o.userId === currentUid);
        } else {
          OrdersState.orders = parsed.orders;
        }
        return;
      }
    }
    OrdersState.orders = [];
  } catch (e) {
    OrdersState.orders = [];
  }
}

function saveOrdersToStorage() {
  try {
    let currentData = {};
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      currentData = JSON.parse(raw);
    }
    let existingOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    if (!activeUser) {
      const auth = localStorage.getItem('unimall_auth');
      if (auth) {
        try { activeUser = JSON.parse(auth); } catch (e) {}
      }
    }
    const currentUid = activeUser?.userId || activeUser?.uid || activeUser?.id || activeUser?.guestId;
    if (currentUid) {
      const otherUsersOrders = existingOrders.filter(o => o.user_id && o.user_id !== currentUid);
      currentData.orders = [...otherUsersOrders, ...OrdersState.orders];
    } else {
      currentData.orders = OrdersState.orders;
    }
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(currentData));
  } catch (e) {
    console.error('Failed to save orders to localStorage:', e);
  }
}

/* ─── FORMATTERS & UTILITIES ─────────────────────────────── */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtPrice(amount) {
  return Number(amount || 0).toLocaleString('en-IN');
}

function fmtRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `${hrs}h ago`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return fmtDate(isoString);
}

function fmtTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffHours < 48 && date.getDate() === now.getDate() - 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats time string for compact order card:
 * Examples:
 *   "2m ago · 00:48"
 *   "1 day ago · 12 Oct, 2:30 PM"
 */
function fmtOrderCardTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const rel = fmtRelativeTime(isoString);
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${rel} · ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${rel} · ${dateStr}, ${timeStr}`;
}

/* ─── CATALOG LOOKUP HELPERS ─────────────────────────────── */
function getStoreInfo(storeId) {
  let store = null;
  if (typeof STORES !== 'undefined' && Array.isArray(STORES)) {
    store = STORES.find(s => s.id === storeId);
  }
  if (!store && typeof DEFAULT_STORES !== 'undefined' && Array.isArray(DEFAULT_STORES)) {
    store = DEFAULT_STORES.find(s => s.id === storeId);
  }
  return store;
}

function getStoreCoverImage(storeId) {
  const store = getStoreInfo(storeId);
  return store?.coverImage || null;
}

function getProductImage(item) {
  if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    return item.image;
  }
  if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('http')) {
    return item.image_url;
  }
  const pid = item.productId || item.product_id || item.id;
  if (pid) {
    let p = null;
    if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
      p = PRODUCTS.find(x => x.id === pid);
    }
    if (!p && typeof DEFAULT_PRODUCTS !== 'undefined' && Array.isArray(DEFAULT_PRODUCTS)) {
      p = DEFAULT_PRODUCTS.find(x => x.id === pid);
    }
    if (p && p.image) return p.image;
  }
  if (item.name) {
    const cleanName = item.name.trim().toLowerCase();
    const catalog = (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS))
      ? PRODUCTS
      : (typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : []);
    const match = catalog.find(x => x.name && x.name.toLowerCase() === cleanName);
    if (match && match.image) return match.image;
  }
  return null;
}

/* ─── FILTERING & GETTERS ────────────────────────────────── */
function getActiveOrders() {
  return OrdersState.orders.filter(o => ['placed', 'preparing', 'ready', 'confirmed'].includes(o.status));
}

function getFilteredOrders() {
  let list = [...OrdersState.orders];
  const tab = OrdersState.currentTab;
  const q = OrdersState.searchQuery.trim().toLowerCase();

  // 1. Tab filter
  if (tab === 'active') {
    list = list.filter(o => ['placed', 'preparing', 'ready', 'confirmed'].includes(o.status));
  } else if (tab === 'delivered') {
    list = list.filter(o => ['delivered', 'completed'].includes(o.status));
  } else if (tab === 'cancelled') {
    list = list.filter(o => o.status === 'cancelled');
  }

  // 2. Search query filter
  if (q) {
    list = list.filter(o => {
      const idMatch = (o.id || '').toLowerCase().includes(q);
      const numMatch = (o.order_number_display || '').toLowerCase().includes(q);
      const storeMatch = (o.storeName || '').toLowerCase().includes(q);
      const itemsMatch = Array.isArray(o.items) && o.items.some(item =>
        ((item.name || item.product_name || '')).toLowerCase().includes(q)
      );
      return idMatch || numMatch || storeMatch || itemsMatch;
    });
  }

  // 3. Sorting
  const sort = OrdersState.currentSort || 'latest';
  if (sort === 'latest') {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } else if (sort === 'amount_high') {
    list.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  } else if (sort === 'amount_low') {
    list.sort((a, b) => Number(a.total || 0) - Number(b.total || 0));
  }

  return list;
}

function updateTabCounts() {
  const allCount = OrdersState.orders.length;
  const activeCount = getActiveOrders().length;
  const deliveredCount = OrdersState.orders.filter(o => ['delivered', 'completed'].includes(o.status)).length;
  const cancelledCount = OrdersState.orders.filter(o => o.status === 'cancelled').length;

  const countAllEl = document.getElementById('countAll');
  const countActiveEl = document.getElementById('countActive');
  const countDeliveredEl = document.getElementById('countDelivered');
  const countCancelledEl = document.getElementById('countCancelled');

  if (countAllEl) countAllEl.textContent = allCount;
  if (countActiveEl) countActiveEl.textContent = activeCount;
  if (countDeliveredEl) countDeliveredEl.textContent = deliveredCount;
  if (countCancelledEl) countCancelledEl.textContent = cancelledCount;

  const ordersSubtitle = document.getElementById('ordersSubtitle');
  if (ordersSubtitle) {
    ordersSubtitle.textContent = activeCount > 0
      ? `${activeCount} active order${activeCount > 1 ? 's' : ''} in progress`
      : 'Track and manage your orders';
  }
}

/* ─── LIVE TRACKER COMPONENT (Hero Card) ─────────────────── */
function renderLiveTracker() {
  const container = document.getElementById('liveTrackerSection');
  const card = document.getElementById('liveTrackerCard');
  if (!container || !card) return;

  const activeOrders = getActiveOrders();
  if (activeOrders.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  const order = activeOrders[0]; // Most recent active order

  const storeInfo = getStoreInfo(order.storeId || order.store_id);
  const storeName = order.storeName || storeInfo?.name || 'Campus Store';
  const storeCover = getStoreCoverImage(order.storeId || order.store_id) || (order.items?.[0] ? getProductImage(order.items[0]) : null);
  const orderNum = order.order_number_display || (order.id ? (String(order.id).startsWith('#') ? order.id : '#' + order.id) : '#ORD-01');
  const timeAgo = fmtRelativeTime(order.createdAt);
  const placedTime = fmtTime(order.createdAt) || '00:00';

  // Dynamic ETA
  let etaText = '15–20 mins';
  if (order.eta) {
    etaText = order.eta;
  } else if (order.status === 'placed') {
    etaText = '15–20 mins';
  } else if (order.status === 'preparing') {
    etaText = '10–12 mins';
  } else if (order.status === 'ready') {
    etaText = order.fulfillmentType === 'delivery' ? 'Arriving soon' : 'Ready now';
  }

  // 4-Step Stepper states
  let fillWidth = 0;
  let step1Class = 'completed';
  let step2Class = '';
  let step3Class = '';
  let step4Class = '';

  let step1Icon = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  let step2Icon = '2';
  let step3Icon = '3';
  let step4Icon = '4';

  let step2Sub = 'Waiting';
  let step3Sub = '';
  let step4Sub = '';

  const checkSvg = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  if (order.status === 'placed') {
    fillWidth = 0;
    step1Class = 'completed current';
    step2Sub = '';
  } else if (order.status === 'preparing') {
    fillWidth = 33.3;
    step1Class = 'completed';
    step2Class = 'completed current';
    step2Sub = 'Your order is being prepared';
  } else if (order.status === 'ready') {
    fillWidth = 66.6;
    step1Class = 'completed';
    step2Class = 'completed';
    step3Class = 'completed current';
    step2Icon = checkSvg;
    step2Sub = 'Prepared';
    step3Sub = order.fulfillmentType === 'delivery' ? 'Out for delivery' : 'Ready for pickup';
  } else if (order.status === 'delivered' || order.status === 'completed') {
    fillWidth = 100;
    step1Class = 'completed';
    step2Class = 'completed';
    step3Class = 'completed';
    step4Class = 'completed current';
    step2Icon = checkSvg;
    step3Icon = checkSvg;
    step4Icon = checkSvg;
  }

  const step4Label = order.fulfillmentType === 'delivery' ? 'Delivered' : 'Picked Up';
  const otpCode = order.otp || (order.id ? (String(order.id).replace(/\D/g, '').slice(-4) || '4016') : '4016');

  card.innerHTML = `
    <!-- TOP ROW: LIVE PILL & ETA -->
    <div class="live-top-row">
      <div class="live-order-pill">
        <span class="live-dot"></span> LIVE ORDER
      </div>
      <div class="live-eta-pill">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>ETA: ${etaText}</span>
      </div>
    </div>

    <!-- STORE ROW -->
    <div class="live-store-row" id="liveStoreRow" role="button" tabindex="0">
      <div class="live-store-thumb">
        ${storeCover ? `<img src="${storeCover}" alt="${escapeHtml(storeName)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">` : `<span style="font-size:24px;">${order.storeIcon || '☕'}</span>`}
      </div>
      <div class="live-store-meta">
        <h3 class="live-store-name">${escapeHtml(storeName)}</h3>
        <div class="live-order-subtitle">${orderNum} · ${timeAgo}</div>
      </div>
      <svg class="live-chevron" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>

    <!-- 4-STEP STEPPER -->
    <div class="live-stepper-wrap">
      <div class="live-stepper-track">
        <div class="live-stepper-fill" style="width: ${fillWidth}%;"></div>
      </div>
      <div class="live-stepper-nodes">
        <!-- Node 1: Placed -->
        <div class="live-stepper-node ${step1Class}">
          <div class="live-node-circle">${step1Icon}</div>
          <div class="live-node-title">Order Placed</div>
          <div class="live-node-sub">${placedTime}</div>
        </div>

        <!-- Node 2: Preparing -->
        <div class="live-stepper-node ${step2Class}">
          <div class="live-node-circle">${step2Icon}</div>
          <div class="live-node-title">Preparing</div>
          <div class="live-node-sub">${step2Sub}</div>
        </div>

        <!-- Node 3: Ready -->
        <div class="live-stepper-node ${step3Class}">
          <div class="live-node-circle">${step3Icon}</div>
          <div class="live-node-title">Ready</div>
          <div class="live-node-sub">${step3Sub}</div>
        </div>

        <!-- Node 4: Picked Up -->
        <div class="live-stepper-node ${step4Class}">
          <div class="live-node-circle">${step4Icon}</div>
          <div class="live-node-title">${step4Label}</div>
          <div class="live-node-sub">${step4Sub}</div>
        </div>
      </div>
    </div>

    <!-- BOTTOM ROW: OTP & VIEW DETAILS -->
    <div class="live-bottom-row">
      <div class="live-otp-wrap" id="liveOtpBox" title="Click to copy pickup code" role="button" tabindex="0">
        <div class="live-otp-icon-wrap">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <div class="live-otp-meta">
          <span class="live-otp-label">${order.fulfillmentType === 'delivery' ? 'DELIVERY OTP' : 'PICKUP OTP'}</span>
          <span class="live-otp-number">${otpCode}</span>
        </div>
        <div class="live-otp-copy-icon">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </div>
      </div>

      <button type="button" class="live-view-details-btn" id="liveViewDetailsBtn">
        View Details
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  `;

  // Attach event handlers
  document.getElementById('liveStoreRow')?.addEventListener('click', () => {
    openOrderModal(order.id);
  });

  document.getElementById('liveOtpBox')?.addEventListener('click', () => {
    copyOrderText(otpCode, 'Pickup OTP');
  });

  document.getElementById('liveViewDetailsBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openOrderModal(order.id);
  });
}

/* ─── ORDER SKELETON SHIMMER ──────────────────────────────── */
function renderOrderSkeletons(count = 3) {
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('ordersEmptyState');
  if (!listEl) return;
  listEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = Array(count).fill(0).map(() => `
    <div class="order-card" style="opacity:0.75; pointer-events:none;">
      <div class="order-top-row">
        <div class="order-thumb-wrap skeleton-shimmer" style="background:#e2e8f0;"></div>
        <div class="order-main-meta">
          <div class="skeleton-shimmer" style="width: 100px; height: 16px; border-radius: 4px; background:#e2e8f0; margin-bottom: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 130px; height: 12px; border-radius: 4px; background:#e2e8f0;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 90px; height: 24px; border-radius: 99px; background:#e2e8f0;"></div>
      </div>
      <div style="display:flex; gap:8px; margin: 12px 0;">
        <div class="skeleton-shimmer" style="width: 140px; height: 32px; border-radius: 8px; background:#e2e8f0;"></div>
        <div class="skeleton-shimmer" style="width: 120px; height: 32px; border-radius: 8px; background:#e2e8f0;"></div>
      </div>
      <div class="order-bottom-row">
        <div class="skeleton-shimmer" style="width: 80px; height: 20px; border-radius: 4px; background:#e2e8f0;"></div>
        <div class="skeleton-shimmer" style="width: 110px; height: 32px; border-radius: 8px; background:#e2e8f0;"></div>
      </div>
    </div>
  `).join('');
}

/* ─── STATUS BADGE GENERATOR ─────────────────────────────── */
function getStatusBadgeHtml(status) {
  switch (status) {
    case 'placed':
      return `<span class="order-status-badge status-placed"><span class="live-dot" style="width:6px;height:6px;margin-right:2px;display:inline-block;"></span> Order placed</span>`;
    case 'preparing':
      return `<span class="order-status-badge status-preparing">⏳ Preparing</span>`;
    case 'ready':
      return `<span class="order-status-badge status-ready">📦 Ready</span>`;
    case 'delivered':
    case 'completed':
      return `<span class="order-status-badge status-delivered"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Completed</span>`;
    case 'cancelled':
      return `<span class="order-status-badge status-cancelled"><span style="font-size:11px;font-weight:900;margin-right:3px;">✕</span> Cancelled</span>`;
    default:
      return `<span class="order-status-badge status-placed">${escapeHtml(status)}</span>`;
  }
}

/* ─── ORDERS LIST COMPONENT ──────────────────────────────── */
function renderOrdersList() {
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('ordersEmptyState');
  const sectionTitle = document.getElementById('ordersSectionTitle');
  const sectionCount = document.getElementById('ordersSectionCount');
  if (!listEl || !emptyEl) return;

  if (isOrdersLoading && OrdersState.orders.length === 0) {
    renderOrderSkeletons(3);
    return;
  }

  const orders = getFilteredOrders();

  // Section Header Titles & Count
  if (sectionTitle && sectionCount) {
    const tabTitles = {
      all: 'All Orders',
      active: 'Active',
      delivered: 'Completed',
      cancelled: 'Cancelled'
    };
    sectionTitle.textContent = tabTitles[OrdersState.currentTab] || 'Orders';
    sectionCount.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  }

  // Handle Empty State
  if (orders.length === 0) {
    listEl.innerHTML = '';
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');

    const emptyTitle = document.getElementById('ordersEmptyTitle');
    const emptySub = document.getElementById('ordersEmptySub');
    if (emptyTitle && emptySub) {
      if (OrdersState.searchQuery) {
        emptyTitle.textContent = 'No matching orders';
        emptySub.textContent = `No orders found matching "${OrdersState.searchQuery}". Try searching by order ID, store, or item name.`;
      } else if (OrdersState.currentTab === 'active') {
        emptyTitle.textContent = 'No active orders';
        emptySub.textContent = 'You have no orders currently in progress. Place an order to track it live here!';
      } else if (OrdersState.currentTab === 'delivered') {
        emptyTitle.textContent = 'No completed orders';
        emptySub.textContent = 'Completed and picked-up orders will appear in this history list.';
      } else if (OrdersState.currentTab === 'cancelled') {
        emptyTitle.textContent = 'No cancelled orders';
        emptySub.textContent = 'You have no cancelled orders on your account.';
      } else {
        emptyTitle.textContent = 'No orders placed yet';
        emptySub.textContent = 'Browse our vibrant campus stores to order fresh meals, snacks, stationery, and dorm essentials.';
      }
    }
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  listEl.innerHTML = orders.map((order, idx) => {
    const delay = Math.min(idx * 35, 180);
    const orderNum = order.order_number_display || (order.id ? (String(order.id).startsWith('#') ? order.id : '#' + order.id) : '#ORD-01');
    const storeName = order.storeName || 'Campus Store';
    const timeFormatted = fmtOrderCardTime(order.createdAt);
    const items = Array.isArray(order.items) ? order.items : [];

    // Thumbnail: first item's image, or store cover image, or emoji
    const firstItem = items[0];
    const firstImg = firstItem ? getProductImage(firstItem) : null;
    const storeCover = getStoreCoverImage(order.storeId || order.store_id);
    const displayThumb = firstImg || storeCover;
    const firstEmoji = firstItem ? (firstItem.emoji || '🛍️') : (order.storeIcon || '🛍️');
    const extraCount = items.length > 1 ? items.length - 1 : 0;

    // Product Preview Chips (e.g. Collegiate Varsity Jacket ×1)
    const maxChips = 2;
    const previewChips = items.slice(0, maxChips);
    const remainingItemsCount = items.length - maxChips;

    const chipsHtml = previewChips.map(it => {
      const itImg = getProductImage(it);
      const itName = it.name || it.product_name || 'Item';
      const itQty = it.qty !== undefined ? it.qty : (it.quantity || 1);
      const itEmoji = it.emoji || '📦';

      return `
        <div class="order-product-chip">
          <div class="chip-thumb">
            ${itImg ? `<img src="${itImg}" alt="${escapeHtml(itName)}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">` : `<span>${itEmoji}</span>`}
          </div>
          <span class="chip-name" title="${escapeHtml(itName)}">${escapeHtml(itName)}</span>
          <span class="chip-qty">×${itQty}</span>
        </div>
      `;
    }).join('') + (remainingItemsCount > 0 ? `
      <div class="order-product-chip" style="background:#eff6ff; border-color:#dbeafe; color:#2563eb; font-weight:700;">
        +${remainingItemsCount} more
      </div>
    ` : '');

    return `
      <div class="order-card fade-up" style="animation-delay: ${delay}ms;" data-oid="${order.id}">
        <!-- TOP ROW -->
        <div class="order-top-row">
          <div class="order-thumb-wrap">
            ${displayThumb ? `<img src="${displayThumb}" alt="${escapeHtml(storeName)}" class="order-thumb-img">` : `<span class="order-thumb-emoji">${firstEmoji}</span>`}
            ${extraCount > 0 ? `<span class="more-items-badge">+${extraCount}</span>` : ''}
          </div>

          <div class="order-main-meta">
            <h3 class="order-num-title">${orderNum}</h3>
            <div class="order-store-sub">${escapeHtml(storeName)}</div>
            <div class="order-date-sub" data-timestamp="${order.createdAt || ''}">${timeFormatted}</div>
          </div>

          ${getStatusBadgeHtml(order.status)}

          <div class="order-top-chevron">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>

        <!-- PRODUCT PREVIEW CHIPS -->
        <div class="order-products-chips">
          ${chipsHtml}
        </div>

        <!-- BOTTOM ROW -->
        <div class="order-bottom-row">
          <div class="order-amount-wrap">
            <span class="order-amount-label">Total Amount</span>
            <span class="order-amount-value">₹${fmtPrice(order.total)}</span>
          </div>

          <div class="order-card-actions">
            <button type="button" class="order-again-btn" data-oid="${order.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Order Again
            </button>
            <button type="button" class="order-details-btn" data-oid="${order.id}">
              Details
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  listEl.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.order-again-btn')) return;
      const orderId = card.dataset.oid;
      openOrderModal(orderId);
    });
  });

  // Attach Reorder buttons
  listEl.querySelectorAll('.order-again-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.oid;
      handleReorder(orderId);
    });
  });

  // Attach Details buttons
  listEl.querySelectorAll('.order-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.oid;
      openOrderModal(orderId);
    });
  });
}

/* ─── REORDER FUNCTIONALITY ──────────────────────────────── */
function handleReorder(orderId) {
  const order = OrdersState.orders.find(o => o.id === orderId);
  if (!order || !order.items || order.items.length === 0) return;

  try {
    let appData = {};
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    // Fresh cart with reordered items
    appData.cart = [];

    const targetStoreId = order.storeId || order.store_id || 'campus-cafe';

    order.items.forEach(item => {
      const pId = item.productId || item.product_id || item.id;
      const pName = item.name || item.product_name || 'Campus Item';
      const pQty = Number(item.qty !== undefined ? item.qty : (item.quantity || 1));
      const pPrice = Number(item.price || 0);
      const pImage = item.image || item.image_url || '';
      const pEmoji = item.emoji || '🛍️';

      appData.cart.push({
        productId: pId,
        qty: pQty,
        name: pName,
        price: pPrice,
        image: pImage,
        emoji: pEmoji,
        storeId: item.storeId || item.store_id || targetStoreId,
        product: {
          id: pId,
          name: pName,
          price: pPrice,
          image: pImage,
          emoji: pEmoji,
          storeId: item.storeId || item.store_id || targetStoreId
        }
      });
    });

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(appData));
    syncCartBadge();
    const orderNumText = order.order_number_display || order.order_number || `#${order.id}`;
    showOrderToast(`Added items from ${orderNumText} to cart! Opening cart...`);
    setTimeout(() => {
      if (typeof window.navigate === 'function') {
        window.navigate('cart');
      } else {
        window.location.href = 'index.html?view=cart';
      }
    }, 600);
  } catch (e) {
    console.error('Reorder error:', e);
  }
}

/* ─── CANCEL ORDER FUNCTIONALITY ─────────────────────────── */
function handleCancelOrder(orderId) {
  const order = OrdersState.orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.status === 'delivered' || order.status === 'completed' || order.status === 'cancelled') {
    showOrderToast('This order cannot be cancelled.');
    return;
  }

  order.status = 'cancelled';
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: 'cancelled',
    time: new Date().toISOString(),
    label: 'Order Cancelled by Customer'
  });

  saveOrdersToStorage();
  updateTabCounts();
  renderLiveTracker();
  renderOrdersList();
  closeOrderModal();
  showOrderToast(`Order #${order.id} has been cancelled.`);
}

/* ─── ORDER DETAIL MODAL ─────────────────────────────────── */
function openOrderModal(orderId) {
  OrdersState.selectedOrderId = orderId;
  const backdrop = document.getElementById('orderModalBackdrop');
  if (!backdrop) return;

  renderModalContent(orderId);
  backdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
window.openOrderModal = openOrderModal;

function closeOrderModal() {
  OrdersState.selectedOrderId = null;
  const backdrop = document.getElementById('orderModalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
  document.body.style.overflow = '';
}
window.closeOrderModal = closeOrderModal;

function renderModalContent(orderId) {
  const order = OrdersState.orders.find(o => o.id === orderId);
  if (!order) return;

  const modalOrderId = document.getElementById('modalOrderId');
  const modalOrderDate = document.getElementById('modalOrderDate');
  const modalBody = document.getElementById('modalBody');

  if (modalOrderId) {
    modalOrderId.textContent = `${order.order_number_display || '#' + order.id} · ${order.storeName || 'UniMall Store'}`;
  }
  if (modalOrderDate) {
    modalOrderDate.textContent = fmtDate(order.createdAt);
  }

  const steps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'preparing', label: 'Preparing Items' },
    { key: 'ready', label: order.fulfillmentType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup' },
    { key: 'delivered', label: order.fulfillmentType === 'delivery' ? 'Delivered' : 'Picked up' }
  ];

  const curIdx = steps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  const timelineHtml = isCancelled
    ? `<div class="modal-timeline-step current">
         <div class="modal-timeline-dot" style="background:var(--red);"></div>
         <div class="modal-timeline-info">
           <div class="modal-timeline-name" style="color:var(--red);">Order Cancelled</div>
           <div class="modal-timeline-time">Refund will be processed to original payment method</div>
         </div>
       </div>`
    : steps.map((s, i) => {
      const isCompleted = curIdx >= i;
      const isCurrent = curIdx === i;
      const historyEntry = (order.statusHistory || []).find(h => h.status === s.key);

      return `
        <div class="modal-timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
          <div class="modal-timeline-dot"></div>
          <div class="modal-timeline-info">
            <div class="modal-timeline-name">${s.label}</div>
            ${historyEntry ? `<div class="modal-timeline-time">${fmtTime(historyEntry.time)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

  const otpCode = order.otp || (order.id ? (String(order.id).replace(/\D/g, '').slice(-4) || '4016') : '4016');

  if (modalBody) {
    modalBody.innerHTML = `
      ${order.fulfillmentType !== 'delivery' ? `
      <!-- COUNTER PICKUP PASS CARD -->
      <div class="modal-pass-card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 18px 20px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.25);">
        <div>
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase;">COUNTER PICKUP PASS</div>
          <div style="font-size: 17px; font-weight: 800; margin-top: 4px; color: #f8fafc;">${escapeHtml(order.customerName || order.user_name || 'CAMPUS STUDENT')}</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Flash at ${escapeHtml(order.storeName || 'Store')} counter</div>
        </div>
        <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; text-align: center; cursor:pointer;" onclick="copyOrderText('${otpCode}', 'Pickup OTP')">
          <div style="font-size: 9px; font-weight: 700; color: #93c5fd; letter-spacing: 0.08em;">PICKUP OTP</div>
          <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #ffffff; letter-spacing: 2px;">${otpCode}</div>
        </div>
      </div>
      ` : ''}

      <!-- STATUS & TRACKING -->
      <div class="modal-section">
        <div class="modal-section-title">Order Status</div>
        <div class="modal-timeline">${timelineHtml}</div>
      </div>

      <!-- FULFILLMENT DESTINATION -->
      <div class="modal-section">
        <div class="modal-section-title">${order.fulfillmentType === 'delivery' ? 'Delivery Destination' : 'Pickup Location'}</div>
        <div class="modal-info-row">
          📍 ${order.fulfillmentType === 'delivery' ? `${escapeHtml(order.deliveryInfo?.hostel || order.user_hostel || 'Campus Hostel')}, ${escapeHtml(order.deliveryInfo?.room || order.user_room || 'Room')}` : escapeHtml(order.pickupLocation || 'Ground floor, near main entrance')}
        </div>
        ${otpCode ? `<div class="modal-info-sub">Show verification code to pickup: <strong style="color:var(--blue); font-family:monospace; font-size:14px;">${otpCode}</strong></div>` : ''}
      </div>

      <!-- ITEMS BREAKDOWN -->
      <div class="modal-section">
        <div class="modal-section-title">Order Items (${order.items.length})</div>
        <div class="modal-items-list">
          ${order.items.map(i => {
            const qty = i.qty !== undefined ? i.qty : (i.quantity || 1);
            const name = i.name || i.product_name || 'Item';
            const price = Number(i.price || 0);
            return `
            <div class="modal-item-row">
              <span>${i.emoji || '📦'} ${escapeHtml(name)} <strong>×${qty}</strong></span>
              <span>₹${fmtPrice(price * qty)}</span>
            </div>
          `}).join('')}
        </div>

        <div class="modal-price-breakdown">
          <div class="modal-price-row">
            <span>Item Subtotal</span>
            <span>₹${fmtPrice(order.subtotal || order.total)}</span>
          </div>
          <div class="modal-price-row">
            <span>Delivery Fee</span>
            <span>${order.deliveryFee > 0 ? `₹${fmtPrice(order.deliveryFee)}` : 'FREE'}</span>
          </div>
          <div class="modal-price-row grand-total">
            <span>Total Paid</span>
            <span>₹${fmtPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <!-- PAYMENT & ACTIONS -->
      <div class="modal-section">
        <div class="modal-section-title">Payment Method</div>
        <div class="modal-info-row">
          💳 UPI / Online Payment <span class="order-status-badge status-delivered" style="margin-left:auto;">PAID</span>
        </div>
      </div>

      <div class="modal-actions-wrap">
        <button type="button" class="modal-btn-primary" id="modalReorderBtn">Order Again</button>
        ${(order.status === 'placed' || order.status === 'preparing') ? `<button type="button" class="modal-btn-danger" id="modalCancelBtn">Cancel Order</button>` : ''}
      </div>
    `;
  }

  document.getElementById('modalReorderBtn')?.addEventListener('click', () => {
    handleReorder(order.id);
    closeOrderModal();
  });

  document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
    handleCancelOrder(order.id);
  });
}

/* ─── SEARCH & SORT CONTROLLERS ──────────────────────────── */
function toggleOrdersSearch() {
  const searchSection = document.getElementById('orderSearchSection');
  const searchInput = document.getElementById('orderSearch');
  if (!searchSection) return;
  const isHidden = searchSection.classList.toggle('hidden');
  if (!isHidden && searchInput) {
    searchInput.focus();
  }
}
window.toggleOrdersSearch = toggleOrdersSearch;

function toggleOrdersSortMenu() {
  const menu = document.getElementById('ordersSortMenu');
  if (menu) menu.classList.toggle('hidden');
}
window.toggleOrdersSortMenu = toggleOrdersSortMenu;

function setOrdersSort(sortType) {
  OrdersState.currentSort = sortType;
  const labels = {
    latest: 'Latest First',
    oldest: 'Oldest First',
    amount_high: 'Highest Total',
    amount_low: 'Lowest Total'
  };
  const labelEl = document.getElementById('ordersSortLabel');
  if (labelEl) labelEl.textContent = labels[sortType] || 'Sort';

  document.querySelectorAll('#ordersSortMenu .sort-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.sort === sortType);
  });

  const menu = document.getElementById('ordersSortMenu');
  if (menu) menu.classList.add('hidden');

  renderOrdersList();
}
window.setOrdersSort = setOrdersSort;

function selectOrdersTab(tab) {
  OrdersState.currentTab = tab;
  document.querySelectorAll('#ordersFilterPills .order-filter-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.tab === tab);
  });
  renderOrdersList();
}
window.selectOrdersTab = selectOrdersTab;

/* ─── 1-TAP COPY HELPER ──────────────────────────────────── */
function copyOrderText(text, label = 'Code') {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => {
    if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('pop');
    showOrderToast(`Copied ${label}: ${text} ✓`);
  }).catch(() => {
    showOrderToast(`Copied ${label}: ${text}`);
  });
}
window.copyOrderText = copyOrderText;

function showOrderToast(msg) {
  let toast = document.getElementById('orderCopyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'orderCopyToast';
    toast.style.cssText = 'position:fixed;bottom:84px;left:50%;transform:translateX(-50%) translateY(10px);background:#0F172A;color:#fff;padding:9px 18px;border-radius:999px;font-size:12.5px;font-weight:600;z-index:99999;box-shadow:0 4px 18px rgba(15,23,42,0.3);transition:all 0.22s cubic-bezier(0.16,1,0.3,1);opacity:0;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(8px)';
  }, 2200);
}

/* ─── CART BADGE & PROFILE SYNC ──────────────────────────── */
function syncCartBadge() {
  try {
    let items = [];
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) items = parsed.cart;
    }
    const totalCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.nav-badge, .cart-badge, .sidebar-badge');
    badges.forEach(badge => {
      badge.textContent = totalCount > 9 ? '9+' : String(totalCount);
      badge.style.display = totalCount > 0 ? '' : 'none';
      badge.setAttribute('aria-label', `${totalCount} item${totalCount !== 1 ? 's' : ''} in cart`);
    });
    const cartNav = document.getElementById('nav-cart');
    if (cartNav) cartNav.setAttribute('aria-label', `Cart, ${totalCount} item${totalCount !== 1 ? 's' : ''}`);
  } catch (e) { }
}

function syncSidebarProfile() {
  try {
    let user = null;
    const v1 = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (v1) {
      const parsed = JSON.parse(v1);
      if (parsed.currentUser) user = parsed.currentUser;
    }
    const auth = localStorage.getItem('unimall_auth');
    if (auth) {
      const parsedAuth = JSON.parse(auth);
      user = { ...(user || {}), ...parsedAuth };
    }
    if (!user) return;

    const nameEl = document.querySelector('.sidebar-profile-name');
    const roleEl = document.querySelector('.sidebar-profile-role');
    const avatarEl = document.querySelector('.sidebar-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Campus Student';
    if (roleEl) {
      if (user.hostel && user.room) {
        roleEl.textContent = `${user.hostel} · ${user.room}`;
      } else {
        roleEl.textContent = user.email || 'Campus Account';
      }
    }
    if (avatarEl) {
      const initial = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'U';
      avatarEl.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
      avatarEl.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
      avatarEl.style.display = 'flex';
      avatarEl.style.alignItems = 'center';
      avatarEl.style.justifyContent = 'center';
      avatarEl.style.borderRadius = '50%';
    }
  } catch (e) { }
}

/* ─── EVENT LISTENERS ────────────────────────────────────── */
function initEvents() {
  // Back button
  document.getElementById('ordersBackButton')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') {
      window.navigate('home');
    } else if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  // Search input and clear
  const orderSearch = document.getElementById('orderSearch');
  const clearSearch = document.getElementById('clearSearch');

  orderSearch?.addEventListener('input', (e) => {
    OrdersState.searchQuery = e.target.value;
    renderOrdersList();
  });

  clearSearch?.addEventListener('click', () => {
    if (orderSearch) orderSearch.value = '';
    OrdersState.searchQuery = '';
    renderOrdersList();
  });

  // Close sort menu on click outside
  document.addEventListener('click', (e) => {
    const sortWrap = document.querySelector('.orders-sort-wrap');
    const sortMenu = document.getElementById('ordersSortMenu');
    if (sortMenu && !sortMenu.classList.contains('hidden') && sortWrap && !sortWrap.contains(e.target)) {
      sortMenu.classList.add('hidden');
    }
  });

  // Modal Close
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeOrderModal);
  document.getElementById('orderModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModalBackdrop') {
      closeOrderModal();
    }
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && OrdersState.selectedOrderId) {
      closeOrderModal();
    }
  });
}

/* ─── REAL BACKEND (NEON POSTGRESQL / SUPABASE) LIVE SYNC ─── */
async function syncOrdersWithSupabase() {
  if (typeof window.UniMallDB === 'undefined') return;
  try {
    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    if (!activeUser) {
      const auth = localStorage.getItem('unimall_auth');
      if (auth) {
        try { activeUser = JSON.parse(auth); } catch (e) {}
      }
    }
    const userId = activeUser?.userId || activeUser?.uid || activeUser?.id || activeUser?.guestId;
    if (!userId) {
      isOrdersLoading = false;
      OrdersState.orders = [];
      saveOrdersToStorage();
      updateTabCounts();
      renderLiveTracker();
      renderOrdersList();
      return;
    }

    if (OrdersState.orders.length === 0) {
      renderOrderSkeletons(3);
    }

    const dbOrders = await window.UniMallDB.getUserOrders(userId).catch(() => []);
    isOrdersLoading = false;

    const storeNamesMap = {
      'campus-cafe': 'Campus Bakery & Café',
      'book-corner': 'Stationery Hub & Book Corner',
      'techstop': 'TechStop Electronics',
      'campus-mart': 'Campus Mart & Groceries',
      'campus-wear': 'Campus Wear & Style Square',
      'health-hub': 'Health Hub & Care'
    };

    const formattedOrders = (dbOrders || []).map((remote, idx) => {
      const cleanStoreName = remote.store_name || storeNamesMap[remote.store_id] || (typeof STORES !== 'undefined' ? STORES.find(s => s.id === remote.store_id)?.name : null) || 'Campus Store';
      const rawItems = remote.items || remote.unimall_order_items || [];
      let dispNum = remote.order_number;
      if (!dispNum) {
        dispNum = `#ORD-${String(idx + 1).padStart(2, '0')}`;
      } else if (!dispNum.startsWith('#')) {
        dispNum = '#' + dispNum;
      }
      return {
        id: remote.id,
        user_id: remote.user_id,
        order_number_display: dispNum,
        storeId: remote.store_id,
        storeName: cleanStoreName,
        storeIcon: '🛍️',
        items: rawItems.map(it => ({
          productId: it.product_id || it.productId || it.id,
          name: it.product_name || it.name || 'Campus Item',
          price: Number(it.price || 0),
          qty: it.qty !== undefined ? it.qty : (it.quantity || 1),
          emoji: it.emoji || '📦',
          image: it.image || it.image_url || '',
          storeId: remote.store_id || 'campus-cafe'
        })),
        subtotal: Number(remote.subtotal || remote.total || 0),
        deliveryFee: Number(remote.delivery_fee || 0),
        total: Number(remote.total || remote.subtotal || 0),
        fulfillmentType: remote.fulfillment_type || 'pickup',
        deliveryInfo: remote.user_hostel ? { hostel: remote.user_hostel, room: remote.user_room } : null,
        status: (remote.status || 'placed').toLowerCase(),
        statusHistory: (remote.statusHistory || remote.unimall_order_status_history || []).map(h => ({
          status: h.status,
          time: h.created_at || h.time,
          label: h.notes || h.label || h.status
        })),
        createdAt: remote.created_at || new Date().toISOString(),
        otp: remote.otp || null,
        eta: remote.eta || null
      };
    });

    // Merge DB orders with any locally placed orders for this user
    const dbMap = new Map(formattedOrders.map(o => [o.id, o]));
    const merged = [...formattedOrders];

    // Retain any local order for this user that hasn't synced to server yet
    OrdersState.orders.forEach(loc => {
      if (loc.user_id === userId && !dbMap.has(loc.id)) {
        merged.push(loc);
      }
    });
    merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    OrdersState.orders = merged;
    saveOrdersToStorage();
    updateTabCounts();
    renderLiveTracker();
    renderOrdersList();
  } catch (e) {
    isOrdersLoading = false;
    renderOrdersList();
    console.warn('[UniMall] Orders sync note:', e.message);
  }
}

function initOrders() {
  loadStateFromStorage();
  initEvents();
  updateTabCounts();
  renderLiveTracker();
  renderOrdersList();
  syncCartBadge();
  syncSidebarProfile();
  syncOrdersWithSupabase();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOrders);
} else {
  initOrders();
}

// Live relative timestamp ticker (updates "2m ago" -> "3m ago" every 30s)
setInterval(() => {
  document.querySelectorAll('.order-date-sub[data-timestamp]').forEach(el => {
    const ts = el.getAttribute('data-timestamp');
    if (ts) {
      el.textContent = fmtOrderCardTime(ts);
    }
  });
}, 30000);

// Live SWR revalidation listener
window.addEventListener('unimall:dataRevalidated', (e) => {
  if (e.detail && e.detail.key && e.detail.key.startsWith('user_orders:')) {
    syncOrdersWithSupabase();
  }
});

// BroadcastChannel for cross-tab or cross-device real-time updates
try {
  const ordersChannel = new BroadcastChannel('unimall_orders_sync');
  ordersChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'ORDER_UPDATED') {
      syncOrdersWithSupabase();
    }
  };
} catch (e) {}

window.renderOrdersView = function() {
  loadStateFromStorage();
  updateTabCounts();
  renderLiveTracker();
  renderOrdersList();
  syncOrdersWithSupabase();
};

})();
