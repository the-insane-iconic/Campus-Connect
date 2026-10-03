/* ═══════════════════════════════════════════════════════════
   UNIMALL — ORDERS CONTROLLER (orders.js)
   Full functional frontend + mock backend state engine
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── CONSTANTS & SEED DATA ──────────────────────────────── */
var STORAGE_KEY = window.STORAGE_KEY || 'unimall_v1';

const INITIAL_DEMO_ORDERS = [];

/* ─── ORDERS STATE ───────────────────────────────────────── */
const OrdersState = {
  orders: [],
  currentTab: 'all', // 'all' | 'active' | 'delivered' | 'cancelled'
  searchQuery: '',
  selectedOrderId: null
};

/* ─── STORAGE SYNC ───────────────────────────────────────── */
function loadStateFromStorage() {
  try {
    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    const currentUid = activeUser?.uid || activeUser?.id || activeUser?.guestId;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) {
        if (currentUid) {
          OrdersState.orders = parsed.orders.filter(o => o.user_id === currentUid);
        } else {
          OrdersState.orders = [];
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      currentData = JSON.parse(raw);
    }
    let existingOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    const currentUid = activeUser?.uid || activeUser?.id || activeUser?.guestId;
    if (currentUid) {
      const otherUsersOrders = existingOrders.filter(o => o.user_id && o.user_id !== currentUid);
      currentData.orders = [...otherUsersOrders, ...OrdersState.orders];
    } else {
      currentData.orders = OrdersState.orders;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
  } catch (e) {
    console.error('Failed to save orders to localStorage:', e);
  }
}

/* ─── LIVE STATUS SIMULATION ENGINE ──────────────────────── */
/**
 * Status transitions are driven exclusively by authentic database & store owner actions.
 * Fake client-side simulation is disabled to prevent inconsistent order state resets.
 */
function startLiveStatusSimulator() {
  // Intentionally disabled. Realtime status comes from Neon DB & BroadcastChannel.
}

/* ─── FORMATTERS ─────────────────────────────────────────── */
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
  return fmtDate(isoString);
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

function fmtTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


/* ─── FILTERING & GETTERS ────────────────────────────────── */
function getFilteredOrders() {
  let list = [...OrdersState.orders];
  const tab = OrdersState.currentTab;
  const q = OrdersState.searchQuery.trim().toLowerCase();

  // Tab filter
  if (tab === 'active') {
    list = list.filter(o => o.status === 'placed' || o.status === 'preparing' || o.status === 'ready');
  } else if (tab === 'delivered') {
    list = list.filter(o => o.status === 'delivered');
  } else if (tab === 'cancelled') {
    list = list.filter(o => o.status === 'cancelled');
  }

  // Search filter
  if (q) {
    list = list.filter(o => {
      const idMatch = o.id.toLowerCase().includes(q);
      const storeMatch = (o.storeName || '').toLowerCase().includes(q);
      const itemsMatch = o.items.some(item => item.name.toLowerCase().includes(q));
      return idMatch || storeMatch || itemsMatch;
    });
  }

  return list;
}

function getActiveOrders() {
  return OrdersState.orders.filter(o => o.status === 'placed' || o.status === 'preparing' || o.status === 'ready');
}

function updateTabCounts() {
  const allCount = OrdersState.orders.length;
  const activeCount = getActiveOrders().length;
  const deliveredCount = OrdersState.orders.filter(o => o.status === 'delivered').length;
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
      : 'Track & manage your orders';
  }
}

/* ─── LIVE TRACKER COMPONENT ─────────────────────────────── */
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
  const order = activeOrders[0]; // Highlight the newest active order

  const statusMap = {
    placed: { title: 'Order Placed', desc: 'Store has received your order and is confirming items.', stepIdx: 0, eta: '15–20 mins' },
    preparing: { title: 'Preparing Order', desc: `${order.storeName || 'Store'} is preparing and packing your items.`, stepIdx: 1, eta: '10–12 mins' },
    ready: {
      title: order.fulfillmentType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup',
      desc: order.fulfillmentType === 'delivery' ? `Delivery partner is heading to ${order.deliveryInfo?.room || 'your room'}.` : `Available for collection at ${order.pickupLocation || 'Main Entrance'}.`,
      stepIdx: 2,
      eta: 'Arriving soon'
    }
  };

  const currentInfo = statusMap[order.status] || statusMap.placed;
  const progressPercent = (currentInfo.stepIdx / 2) * 100;

  card.innerHTML = `
    <div class="live-card-top">
      <div class="live-badge">
        <span class="pulse-dot"></span> Live Order ${order.order_number_display || '#' + order.id}
      </div>
      <div class="live-eta">ETA: <strong>${currentInfo.eta}</strong></div>
    </div>

    <div class="live-status-title">${currentInfo.title}</div>
    <div class="live-status-desc">${currentInfo.desc}</div>

    <div class="live-stepper">
      <div class="stepper-track"></div>
      <div class="stepper-progress" style="width: ${progressPercent}%;"></div>

      <div class="stepper-node ${currentInfo.stepIdx >= 0 ? (currentInfo.stepIdx === 0 ? 'current' : 'completed') : ''}">
        <div class="stepper-circle">1</div>
        <div class="stepper-label">Placed</div>
      </div>

      <div class="stepper-node ${currentInfo.stepIdx >= 1 ? (currentInfo.stepIdx === 1 ? 'current' : 'completed') : ''}">
        <div class="stepper-circle">2</div>
        <div class="stepper-label">Preparing</div>
      </div>

      <div class="stepper-node ${currentInfo.stepIdx >= 2 ? (currentInfo.stepIdx === 2 ? 'current' : 'completed') : ''}">
        <div class="stepper-circle">3</div>
        <div class="stepper-label">${order.fulfillmentType === 'delivery' ? 'On Way' : 'Ready'}</div>
      </div>
    </div>

    <div class="live-footer">
      <div class="live-otp-wrap" role="button" title="Click to copy" style="cursor: pointer;" onclick="copyOrderText('${order.fulfillmentType === 'delivery' ? (order.deliveryInfo?.room || order.user_room || 'Room') : (order.otp || '4829')}', '${order.fulfillmentType === 'delivery' ? 'Room' : 'OTP'}')">
        <span class="live-otp-label">${order.fulfillmentType === 'delivery' ? 'Room:' : 'Pickup OTP:'}</span>
        <span class="live-otp-code">${order.fulfillmentType === 'delivery' ? (order.deliveryInfo?.room || order.user_room || 'Assigned') : (order.otp || '4829')} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:4px;vertical-align:middle;opacity:0.75;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>
      </div>
      <button class="live-action-btn" id="liveViewDetailsBtn" data-oid="${order.id}">View Details</button>
    </div>
  `;

  document.getElementById('liveViewDetailsBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openOrderModal(order.id);
  });
}

let isOrdersLoading = true;

/* ─── ORDER SKELETON SHIMMER ──────────────────────────────── */
function renderOrderSkeletons(count = 3) {
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('emptyState');
  if (!listEl) return;
  listEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = Array(count).fill(0).map(() => `
    <div class="order-card-skeleton" aria-hidden="true">
      <div class="sk-header">
        <div class="sk-icon skeleton-shimmer"></div>
        <div class="sk-store-meta">
          <div class="skeleton-shimmer" style="width: 140px; height: 16px; border-radius: 4px;"></div>
          <div class="skeleton-shimmer" style="width: 90px; height: 12px; border-radius: 4px; margin-top: 4px;"></div>
        </div>
        <div class="sk-badge skeleton-shimmer"></div>
      </div>
      <div class="sk-items">
        <div class="skeleton-shimmer" style="width: 75%; height: 14px; border-radius: 4px;"></div>
        <div class="skeleton-shimmer" style="width: 50%; height: 14px; border-radius: 4px; margin-top: 6px;"></div>
      </div>
      <div class="sk-footer">
        <div class="skeleton-shimmer" style="width: 80px; height: 18px; border-radius: 4px;"></div>
        <div class="skeleton-shimmer" style="width: 90px; height: 28px; border-radius: 8px;"></div>
      </div>
    </div>
  `).join('');
}

/* ─── ORDERS LIST COMPONENT ──────────────────────────────── */
function renderOrdersList() {
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('emptyState');
  const sectionTitle = document.getElementById('ordersSectionTitle');
  const sectionCount = document.getElementById('ordersSectionCount');
  if (!listEl || !emptyEl) return;

  if (isOrdersLoading && OrdersState.orders.length === 0) {
    renderOrderSkeletons(3);
    return;
  }

  const orders = getFilteredOrders();

  if (sectionTitle && sectionCount) {
    const tabTitles = {
      all: 'All Orders',
      active: 'Active Orders',
      delivered: 'Completed Orders',
      cancelled: 'Cancelled Orders'
    };
    sectionTitle.textContent = tabTitles[OrdersState.currentTab] || 'Orders';
    sectionCount.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  }

  if (orders.length === 0) {
    listEl.innerHTML = '';
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');

    const emptyTitle = document.getElementById('emptyTitle');
    const emptySub = document.getElementById('emptySub');
    if (emptyTitle && emptySub) {
      if (OrdersState.searchQuery) {
        emptyTitle.textContent = 'No matching orders';
        emptySub.textContent = `No orders found for "${OrdersState.searchQuery}". Try a different keyword.`;
      } else {
        emptyTitle.textContent = OrdersState.currentTab === 'all' ? 'No orders placed yet' : `No ${OrdersState.currentTab} orders`;
        emptySub.textContent = 'Place an order from campus stores to track and manage them here.';
      }
    }
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  const statusLabel = {
    placed: 'Order placed',
    preparing: 'Preparing',
    ready: 'Ready for pickup',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  listEl.innerHTML = orders.map((order, idx) => {
    const delay = Math.min(idx * 30, 180);
    const firstItems = order.items.slice(0, 3);
    const hasMore = order.items.length > 3;

    return `
      <div class="order-card fade-up" style="animation-delay: ${delay}ms;" data-oid="${order.id}">
        <div class="order-card-header">
          <div class="order-store-meta">
            <div class="order-store-icon">${order.storeIcon || '🛍️'}</div>
            <div class="order-id-block">
              <div class="order-number" onclick="event.stopPropagation(); copyOrderText('${order.order_number_display ? order.order_number_display.replace(/^#/, '') : order.id}', 'Order ID')" title="Click to copy ${order.order_number_display || '#' + order.id}" style="cursor: pointer;">
                ${order.order_number_display || '#' + order.id} · ${order.storeName || 'UniMall Store'}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:4px;vertical-align:middle;opacity:0.6;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </div>
              <div class="order-time-text" data-timestamp="${order.createdAt || ''}"><span class="rel-time">${fmtRelativeTime(order.createdAt)}</span> · ${fmtTime(order.createdAt)}</div>
            </div>
          </div>
          <span class="status-pill status-${order.status}">
            ${statusLabel[order.status] || order.status}
          </span>
        </div>

        <div class="order-items-box">
          ${firstItems.map(item => `
            <div class="order-item-row">
              <span class="order-item-title">${item.emoji || '📦'} ${item.name || item.product_name || 'Item'}</span>
              <span class="order-item-qty">×${item.qty !== undefined ? item.qty : (item.quantity || 1)}</span>
            </div>
          `).join('')}
          ${hasMore ? `<div class="order-item-row"><span class="order-item-qty" style="color:var(--blue);">+ ${order.items.length - 3} more items</span></div>` : ''}
        </div>

        <div class="order-card-footer">
          <div class="order-total-block">
            <span class="order-total-label">Total Amount</span>
            <span class="order-total-amount">₹${fmtPrice(order.total)}</span>
          </div>

          <div class="order-card-actions">
            ${(order.fulfillmentType === 'pickup' && order.status !== 'cancelled') ? `
              <button class="counter-pass-btn" data-oid="${order.id}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                <span>🎟️</span> Show at Counter
              </button>
            ` : ''}
            <button class="reorder-btn" data-oid="${order.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Order Again
            </button>
            <button class="details-btn" data-oid="${order.id}">Details</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  listEl.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.reorder-btn') || e.target.closest('.counter-pass-btn')) return;
      const orderId = card.dataset.oid;
      openOrderModal(orderId);
    });
  });

  // Attach Counter Pass buttons
  listEl.querySelectorAll('.counter-pass-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.oid;
      openOrderModal(orderId);
    });
  });

  // Attach Reorder buttons
  listEl.querySelectorAll('.reorder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.oid;
      handleReorder(orderId);
    });
  });

  // Attach Details buttons
  listEl.querySelectorAll('.details-btn').forEach(btn => {
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    // Set cart to ONLY the items of this reordered order to eliminate mixing with previous sessions
    appData.cart = [];

    const targetStoreId = order.storeId || order.store_id || 'campus-cafe';

    // Populate fresh cart from this order
    order.items.forEach(item => {
      const pId = item.productId || item.product_id || item.id;
      const pName = item.name || item.product_name || 'Campus Item';
      const pQty = Number(item.qty !== undefined ? item.qty : (item.quantity || 1));
      const pPrice = Number(item.price || 0);
      const pImage = item.image || item.image_url || '';
      const pEmoji = item.emoji || '🛍️';

      const itemObj = {
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
      };
      appData.cart.push(itemObj);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    syncCartBadge();
    const orderNumText = order.order_number_display || order.order_number || `#${order.id}`;
    showToast(`Added ${order.items.length} item${order.items.length > 1 ? 's' : ''} from ${orderNumText} to cart! Opening cart...`);
    setTimeout(() => {
      window.location.href = 'cart.html';
    }, 700);
  } catch (e) {
    console.error('Reorder error:', e);
  }
}

/* ─── CANCEL ORDER FUNCTIONALITY ─────────────────────────── */
function handleCancelOrder(orderId) {
  const order = OrdersState.orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.status === 'delivered' || order.status === 'cancelled') {
    showToast('This order cannot be cancelled.');
    return;
  }

  order.status = 'cancelled';
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
  showToast(`Order #${order.id} has been cancelled.`);
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

function closeOrderModal() {
  OrdersState.selectedOrderId = null;
  const backdrop = document.getElementById('orderModalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderModalContent(orderId) {
  const order = OrdersState.orders.find(o => o.id === orderId);
  if (!order) return;

  const modalOrderId = document.getElementById('modalOrderId');
  const modalOrderDate = document.getElementById('modalOrderDate');
  const modalBody = document.getElementById('modalBody');

  if (modalOrderId) modalOrderId.textContent = `${order.order_number_display || '#' + order.id} · ${order.storeName || 'UniMall Store'}`;
  if (modalOrderDate) modalOrderDate.textContent = fmtDate(order.createdAt);

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

  modalBody.innerHTML = `
    ${order.fulfillmentType === 'pickup' ? `
    <!-- COUNTER PICKUP PASS CARD -->
    <div class="modal-pass-card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 18px 20px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.25);">
      <div>
        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase;">COUNTER PICKUP PASS</div>
        <div style="font-size: 17px; font-weight: 800; margin-top: 4px; color: #f8fafc;">${order.customerName || order.user_name || 'STUDENT'}</div>
        <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Flash at ${order.storeName || 'Store'} counter</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; text-align: center;">
        <div style="font-size: 9px; font-weight: 700; color: #93c5fd; letter-spacing: 0.08em;">PICKUP OTP</div>
        <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #ffffff; letter-spacing: 2px;">${order.otp || 'Ready'}</div>
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
        📍 ${order.fulfillmentType === 'delivery' ? `${order.deliveryInfo?.hostel || order.user_hostel || 'Campus Hostel'}, ${order.deliveryInfo?.room || order.user_room || 'Room'}` : (order.pickupLocation || 'Ground floor, near main entrance')}
      </div>
      ${order.otp ? `<div class="modal-info-sub">Show verification code to pickup: <strong style="color:var(--blue); font-family:monospace; font-size:14px;">${order.otp}</strong></div>` : ''}
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
            <span>${i.emoji || '📦'} ${name} <strong>×${qty}</strong></span>
            <span>₹${fmtPrice(price * qty)}</span>
          </div>
        `}).join('')}
      </div>

      <div class="modal-price-breakdown">
        <div class="modal-price-row">
          <span>Item Subtotal</span>
          <span>₹${fmtPrice(order.subtotal)}</span>
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
        💳 UPI / Online Payment <span class="status-pill status-delivered" style="margin-left:auto;">PAID</span>
      </div>
    </div>

    <div class="modal-actions-wrap">
      <button class="modal-btn-primary" id="modalReorderBtn">Order Again</button>
      ${(order.status === 'placed' || order.status === 'preparing') ? `<button class="modal-btn-danger" id="modalCancelBtn">Cancel Order</button>` : ''}
    </div>
  `;

  document.getElementById('modalReorderBtn')?.addEventListener('click', () => {
    handleReorder(order.id);
    closeOrderModal();
  });

  document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
    handleCancelOrder(order.id);
  });
}

/* ─── TOAST ──────────────────────────────────────────────── */
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('orderToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

/* ─── CART BADGE SYNC ────────────────────────────────────── */
function syncCartBadge() {
  try {
    let items = [];
    const raw = localStorage.getItem(STORAGE_KEY);
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
    const v1 = localStorage.getItem(STORAGE_KEY);
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
  document.getElementById('backButton')?.addEventListener('click', () => {
    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  // Search Toggle
  const searchToggle = document.getElementById('searchToggle');
  const searchSection = document.getElementById('searchSection');
  const orderSearch = document.getElementById('orderSearch');
  const clearSearch = document.getElementById('clearSearch');

  searchToggle?.addEventListener('click', () => {
    searchSection?.classList.toggle('hidden');
    if (!searchSection?.classList.contains('hidden')) {
      orderSearch?.focus();
    }
  });

  orderSearch?.addEventListener('input', (e) => {
    OrdersState.searchQuery = e.target.value;
    renderOrdersList();
  });

  clearSearch?.addEventListener('click', () => {
    if (orderSearch) orderSearch.value = '';
    OrdersState.searchQuery = '';
    renderOrdersList();
  });

  // Status Tab Chips
  document.querySelectorAll('.tab-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.tab-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      OrdersState.currentTab = chip.dataset.tab;
      renderOrdersList();
    });
  });

  // Modal Close
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeOrderModal);
  document.getElementById('orderModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModalBackdrop') {
      closeOrderModal();
    }
  });
}

/* ─── SUPABASE LIVE SYNC ─────────────────────────────────── */
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
    const userId = activeUser?.uid || activeUser?.id || activeUser?.guestId;
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
      'campus-cafe': 'Campus Café',
      'book-corner': 'Book Corner',
      'techstop': 'TechStop',
      'campus-mart': 'Campus Mart',
      'campus-wear': 'Campus Wear',
      'health-hub': 'Health Hub'
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
          qty: it.qty || it.quantity || 1,
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
        createdAt: remote.created_at || new Date().toISOString()
      };
    });

    // Merge DB orders with any locally placed orders for this user
    const dbMap = new Map(formattedOrders.map(o => [o.id, o]));
    const merged = [...formattedOrders];

    // Retain any local order for this user that hasn't synced yet
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

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  initEvents();
  updateTabCounts();
  renderLiveTracker();
  renderOrdersList();
  syncCartBadge();
  syncSidebarProfile();

  // Neon DB order sync on initial page load
  syncOrdersWithSupabase();
  // Automatic polling interval and background resetting disabled — user reloads manually for fresh data

  // Live relative timestamp ticker (updates "2m ago" -> "3m ago" every 30s)
  setInterval(() => {
    document.querySelectorAll('.order-time-text[data-timestamp]').forEach(el => {
      const ts = el.getAttribute('data-timestamp');
      const rel = el.querySelector('.rel-time');
      if (ts && rel) {
        rel.textContent = fmtRelativeTime(ts);
      }
    });
  }, 30000);

  // Check URL hash for direct order view (e.g., orders.html#UM1024)
  const hash = window.location.hash.replace('#', '');
  if (hash && OrdersState.orders.some(o => o.id === hash)) {
    openOrderModal(hash);
  }

  // Live SWR revalidation listener
  window.addEventListener('unimall:dataRevalidated', (e) => {
    if (e.detail && e.detail.key && e.detail.key.startsWith('user_orders:')) {
      syncOrdersWithSupabase();
    }
  });
});

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

window.renderOrdersView = function() {
  loadStateFromStorage();
  updateTabCounts();
  renderLiveTracker();
  renderOrdersList();
  syncOrdersWithSupabase();
};
