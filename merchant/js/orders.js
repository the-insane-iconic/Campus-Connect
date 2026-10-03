/**
 * UniMall Store Admin — Orders Controller (admin/js/orders.js)
 * 1-Window Active Orders Management & 3-Step Series Progression Button
 */

'use strict';

let currentOrdersList = [];
let currentOrdersViewMode = 'active'; // 'active' | 'table'
let currentOrderStatusFilter = 'ALL';
let ordersPollInterval = null;
const knownOrderIds = new Set();
const finalizedOrderIds = new Set();
const pendingOrderTransitions = new Set();

window.isOrderFinalized = function(id) {
  return finalizedOrderIds.has(String(id));
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getActiveOrdersCardsContainer() {
  return document.getElementById('active-orders-cards-container') || document.getElementById('dashboard-active-orders-grid');
}

/* ─── WEB AUDIO API ORDER CHIME SYNTHESIZER ──────────────── */
let audioCtx = null;
let isAudioUnlocked = false;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

function unlockAudioContext() {
  if (isAudioUnlocked) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Play an inaudible 1ms buffer to satisfy iOS & Android autoplay security
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    isAudioUnlocked = true;
  } catch (e) {}

  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.removeEventListener(evt, unlockAudioContext, true);
  });
}

function isSoundAlertEnabled() {
  return localStorage.getItem('unimall_admin_sound_enabled') !== 'false';
}

function setSoundAlertEnabled(enabled) {
  localStorage.setItem('unimall_admin_sound_enabled', enabled ? 'true' : 'false');
  updateSoundToggleButton();
}

function updateSoundToggleButton() {
  const btn = document.getElementById('btn-sound-toggle');
  if (!btn) return;
  const enabled = isSoundAlertEnabled();

  btn.classList.toggle('sound-on', enabled);
  btn.classList.toggle('sound-off', !enabled);
  btn.title = enabled
    ? 'Order Alert Chime: ON (Click to mute)'
    : 'Order Alert Chime: MUTED (Click to enable)';

  const iconOn = btn.querySelector('.icon-sound-on');
  const iconOff = btn.querySelector('.icon-sound-off');
  if (iconOn) iconOn.classList.toggle('hidden', !enabled);
  if (iconOff) iconOff.classList.toggle('hidden', enabled);
}

/**
 * Plays a smooth, pleasant acoustic chime for store owners.
 * Uses a 4-tone ascending marimba/bell harmonic scale (E5 -> G#5 -> B5 -> E6)
 * with dual oscillators (sine warmth + triangle presence) and natural exponential decay.
 */
function playOrderNotificationChime(force = false) {
  if (!force && !isSoundAlertEnabled()) return;

  // Tactile haptic vibration for mobile in pocket
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([220, 90, 220, 90, 380]);
    } catch (e) {}
  }

  // Pulse animation on the topbar sound button
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    btn.classList.add('chime-ringing');
    setTimeout(() => btn.classList.remove('chime-ringing'), 2500);
  }

  try {
    const ctx = initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Pleasant acoustic 4-note ascending chime: E5 -> G#5 -> B5 -> E6
    const melody = [
      { freq: 659.25, time: 0.00, dur: 0.42, gain: 0.22 }, // E5
      { freq: 830.61, time: 0.11, dur: 0.42, gain: 0.24 }, // G#5
      { freq: 987.77, time: 0.22, dur: 0.48, gain: 0.26 }, // B5
      { freq: 1318.51, time: 0.35, dur: 0.70, gain: 0.28 } // E6
    ];

    melody.forEach(note => {
      const startTime = now + note.time;
      const stopTime = startTime + note.dur;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, startTime);
      masterGain.gain.linearRampToValueAtTime(note.gain, startTime + 0.012);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
      masterGain.connect(ctx.destination);

      // Primary sine oscillator for smooth body
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(note.freq, startTime);
      osc1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(stopTime);

      // Triangle overtone for clarity on mobile phone speakers
      const osc2 = ctx.createOscillator();
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.18, startTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(note.freq * 2, startTime);
      osc2.connect(osc2Gain);
      osc2Gain.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(stopTime);
    });
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}
window.playOrderNotificationChime = playOrderNotificationChime;

// Register Service Worker for mobile background push notifications & lock-screen alerts
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[UniMall SW] Registered:', reg.scope))
      .catch(() => {
        navigator.serviceWorker.register('../sw.js')
          .then(reg => console.log('[UniMall SW] Registered (rel):', reg.scope))
          .catch(() => {});
      });
  });
}

/* ─── SYSTEM BACKGROUND PUSH NOTIFICATIONS ────────────────── */
async function requestPushNotificationPermission() {
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    const banner = document.getElementById('mobile-notif-banner');
    if (banner) {
      banner.classList.add('hidden');
    }

    if (permission === 'granted') {
      if (typeof showToast === 'function') {
        showToast('🔔 Order alerts enabled! You will be notified on incoming orders.');
      }
      playOrderNotificationChime(true);
      return true;
    } else {
      if (typeof showToast === 'function') {
        showToast('Notifications blocked in browser settings.', 'warn');
      }
      return false;
    }
  } catch (e) {
    return false;
  }
}
window.requestPushNotificationPermission = requestPushNotificationPermission;

async function sendOrderPushNotification(orderInfo) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const displayNum = orderInfo.displayNum || orderInfo.orderNumber || (orderInfo.orderId ? `#ORD-${String(orderInfo.orderId).slice(-2)}` : '#ORD');
  const customer = orderInfo.customerName || 'Student';
  const amount = Number(orderInfo.total || 0).toLocaleString('en-IN');
  const itemsCount = orderInfo.itemsCount || 1;
  const title = `🔔 New Order ${displayNum}! (₹${amount})`;
  const options = {
    body: `👤 ${customer} · ${itemsCount} item(s) · Counter Self-Pickup. Tap to prepare.`,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: `unimall-order-${orderInfo.orderId || Date.now()}`,
    renotify: true,
    vibrate: [300, 100, 300, 100, 450],
    data: {
      url: '/admin/index.html#view-orders',
      orderId: orderInfo.orderId
    },
    actions: [
      { action: 'open_orders', title: '⚡ View Order' }
    ]
  };

  // 1. Try ServiceWorkerRegistration (REQUIRED for Android Chrome & mobile devices)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch (swErr) {
      console.warn('SW notification fallback to window.Notification:', swErr);
    }
  }

  // 2. Desktop Browser Fallback
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (typeof switchOrdersViewMode === 'function') {
        switchOrdersViewMode('active');
      }
      if (typeof window.switchView === 'function') {
        window.switchView('orders');
      }
      notif.close();
    };
  } catch (err) {
    console.warn('Failed to send window push notification:', err);
  }
}
window.sendOrderPushNotification = sendOrderPushNotification;

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'orders' || e.detail.viewName === 'dashboard') {
    if (currentOrdersList && currentOrdersList.length > 0) {
      renderActiveOrdersBoard();
      renderOrdersTable();
    }
    loadOrders(e.detail.storeId);
    startOrdersPolling();
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && (currentActiveView.id === 'view-orders' || currentActiveView.id === 'view-dashboard')) {
    loadOrders(e.detail.storeId);
  }
});

// Real-time synchronization listeners across browser tabs / mobile actions
window.addEventListener('storage', (e) => {
  function getActiveAdminStoreId() {
    return (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
      || window.activeStoreId
      || (typeof activeStoreId !== 'undefined' ? activeStoreId : null)
      || sessionStorage.getItem('unimall_admin_active_store');
  }

  if (e.key === 'unimall_new_order_placed_event') {
    try {
      const orderEvt = JSON.parse(e.newValue || '{}');
      if (orderEvt && orderEvt.orderId) {
        const currentStore = getActiveAdminStoreId();
        if (!currentStore || orderEvt.storeId === currentStore || currentStore === 'all') {
          // Play chime and send system notification
          playOrderNotificationChime();
          sendOrderPushNotification(orderEvt);
          if (typeof showToast === 'function') {
            showToast(`🔔 New Order received: ${orderEvt.displayNum || '#' + orderEvt.orderId} (₹${orderEvt.total})`);
          }
          knownOrderIds.add(orderEvt.orderId);
          if (currentStore) {
            loadOrders(currentStore, true);
            if (typeof window.loadDashboard === 'function') {
              window.loadDashboard(currentStore);
            }
          }
        }
      }
    } catch (err) {}
  } else if (e.key === 'unimall_v1' || e.key === 'unimall_order_delivered_event') {
    const currentStore = getActiveAdminStoreId();
    if (currentStore) {
      loadOrders(currentStore, true);
    }
  }
});

try {
  const ordersChannel = new BroadcastChannel('unimall_orders_channel');
  ordersChannel.onmessage = (event) => {
    if (event.data) {
      const { type, orderId, displayNum, storeId, total, customerName, itemsCount } = event.data;
      const currentStore = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
        || window.activeStoreId
        || (typeof activeStoreId !== 'undefined' ? activeStoreId : null)
        || sessionStorage.getItem('unimall_admin_active_store');

      if (type === 'ORDER_PLACED') {
        if (!currentStore || storeId === currentStore || currentStore === 'all') {
          playOrderNotificationChime();
          sendOrderPushNotification({
            orderId,
            displayNum,
            customerName: customerName || 'Student',
            total: total || 0,
            itemsCount: itemsCount || 1
          });
          if (typeof showToast === 'function') {
            showToast(`🔔 New Order received: ${displayNum || '#' + orderId}`);
          }
          if (currentStore) {
            loadOrders(currentStore, true);
            if (typeof window.loadDashboard === 'function') {
              window.loadDashboard(currentStore);
            }
          }
        }
      } else if (type === 'ORDER_STATUS_CHANGED') {
        if (currentStore) {
          loadOrders(currentStore, true);
          if (typeof window.loadDashboard === 'function') {
            window.loadDashboard(currentStore);
          }
        }
      }
    }
  };
} catch(e) {}

window.addEventListener('unimall:orderStatusUpdated', () => {
  if (activeStoreId) {
    loadOrders(activeStoreId, true);
  }
});

let currentStoreOrderFilter = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  // Store filter dropdown
  const storeFilterSelect = document.getElementById('orders-store-filter');
  if (storeFilterSelect) {
    storeFilterSelect.addEventListener('change', (e) => {
      currentStoreOrderFilter = e.target.value;
      renderActiveOrdersBoard();
      renderOrdersTable();
    });
  }

  // Orders search input
  const searchInput = document.getElementById('orders-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      renderActiveOrdersBoard();
      renderOrdersTable();
    });
  }
  // 1. Mobile Audio Unlock on user first touch/interaction
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudioContext, { once: true, capture: true });
  });

  // 2. Sound Toggle button
  const btnSound = document.getElementById('btn-sound-toggle');
  if (btnSound) {
    updateSoundToggleButton();
    btnSound.addEventListener('click', () => {
      unlockAudioContext();
      const current = isSoundAlertEnabled();
      setSoundAlertEnabled(!current);
      if (!current) {
        playOrderNotificationChime(true);
        if (typeof showToast === 'function') {
          showToast('🔊 Order chime enabled! Testing sound...');
        }
        if ('Notification' in window && Notification.permission === 'default') {
          requestPushNotificationPermission();
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('🔇 Order sound muted');
        }
      }
    });
  }

  // 3. Mobile background notification permission banner
  const banner = document.getElementById('mobile-notif-banner');
  if (banner) {
    const isDismissed = localStorage.getItem('unimall_dismiss_notif_banner') === '1';
    const canPrompt = ('Notification' in window) && Notification.permission === 'default';
    if (canPrompt && !isDismissed) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    const btnEnable = document.getElementById('btn-enable-push');
    if (btnEnable) {
      btnEnable.addEventListener('click', () => {
        unlockAudioContext();
        requestPushNotificationPermission();
      });
    }

    const btnDismiss = document.getElementById('btn-dismiss-push');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        banner.classList.add('hidden');
        localStorage.setItem('unimall_dismiss_notif_banner', '1');
      });
    }
  }

  // 4. Status filter tabs for table view
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
      const storeId = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
        || window.activeStoreId
        || (typeof activeStoreId !== 'undefined' ? activeStoreId : null);
      if (storeId) loadOrders(storeId);
    });
  }

  // 5. Start persistent polling right away
  const initialStore = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
    || window.activeStoreId
    || sessionStorage.getItem('unimall_admin_active_store')
    || 'all';
  if (initialStore) {
    loadOrders(initialStore, true);
  }
  startOrdersPolling();
});

function startOrdersPolling() {
  stopOrdersPolling();
  ordersPollInterval = setInterval(() => {
    const storeId = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
      || window.activeStoreId
      || (typeof activeStoreId !== 'undefined' ? activeStoreId : null)
      || sessionStorage.getItem('unimall_admin_active_store');
    if (storeId) {
      loadOrders(storeId, true);
    }
  }, 8000);
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
  const effectiveStoreId = storeId || (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : 'all');
  if (!effectiveStoreId) return;

  const cardsContainer = getActiveOrdersCardsContainer();
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
    const data = await apiRequest(`/admin/stores/${effectiveStoreId}/orders`);
    const fetchedOrders = data.orders || [];

    // Background arrival detection: if we already have known IDs, detect new PLACED orders
    if (knownOrderIds.size > 0) {
      fetchedOrders.forEach(o => {
        const statusUpper = (o.status || '').toUpperCase();
        if (!knownOrderIds.has(o.id) && statusUpper === 'PLACED') {
          playOrderNotificationChime();
          sendOrderPushNotification({
            orderId: o.id,
            orderNumber: o.order_number || o.id,
            displayNum: o.order_number_display || (o.order_number ? `#ORD-${String(o.order_number).slice(-2)}` : '#' + String(o.id).slice(-4)),
            customerName: o.user_name || o.customer_name || 'Student',
            total: o.store_subtotal || o.total || o.total_amount || 0,
            itemsCount: (o.items || []).length || 1
          });
          if (typeof showToast === 'function') {
            showToast(`🔔 New Order received: #${o.order_number || o.id}`);
          }
        }
      });
    }

    // Populate all fetched IDs into knownOrderIds
    fetchedOrders.forEach(o => knownOrderIds.add(o.id));

    currentOrdersList = fetchedOrders;

    const isPlatformUser = (typeof currentAdminUser !== 'undefined' && currentAdminUser && currentAdminUser.role === 'platform_admin');
    const viewTitle = document.getElementById('orders-view-title');
    const viewSubtitle = document.getElementById('orders-view-subtitle');
    if (viewTitle) {
      viewTitle.textContent = isPlatformUser ? 'All Campus Orders' : 'Store Live Orders & Queue';
    }
    if (viewSubtitle) {
      viewSubtitle.textContent = isPlatformUser
        ? 'Real-time campus-wide active queue, kitchen preparation, and order fulfillment history'
        : 'Live incoming orders queue, preparation timers, and complete store order history';
    }

    // Direct rendering: render active cards and full table simultaneously
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
    if (finalizedOrderIds.has(String(o.id))) return false;
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  const count = activeOrders.length;

  // Header active orders badge
  const headerBadge = document.getElementById('dash-active-count-badge');
  if (headerBadge) {
    headerBadge.textContent = `${count} Active`;
    headerBadge.className = count > 0 ? 'badge-status accepted' : 'badge-status completed';
  }

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
  const container = getActiveOrdersCardsContainer();
  if (!container) return;

  // Filter active orders that require action or pickup (excluding finalized orders)
  let activeOrders = currentOrdersList.filter(o => {
    if (finalizedOrderIds.has(String(o.id))) return false;
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  if (currentStoreOrderFilter && currentStoreOrderFilter !== 'all') {
    activeOrders = activeOrders.filter(o => (o.store_id || o.storeId) === currentStoreOrderFilter);
  }

  if (currentSearchQuery) {
    activeOrders = activeOrders.filter(o => {
      const matchNum = String(o.order_number_display || o.order_number || o.id).toLowerCase().includes(currentSearchQuery);
      const matchName = String(o.user_name || o.customerName || '').toLowerCase().includes(currentSearchQuery);
      const matchLoc = String(o.delivery_location || o.user_hostel || '').toLowerCase().includes(currentSearchQuery);
      return matchNum || matchName || matchLoc;
    });
  }

  // Sort orders: Strict FIFO chronological order (earliest/first placed order at the top)
  activeOrders.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  if (activeOrders.length === 0) {
    // If an order transition is currently in flight, don't wipe it with empty state
    if (pendingOrderTransitions.size > 0 && container.querySelector('.active-order-card')) {
      return;
    }
    container.innerHTML = `
      <div class="empty-active-orders">
        <div class="empty-icon">☕</div>
        <h3>All caught up!</h3>
        <p>No active orders requiring preparation or counter pickup right now. New student orders will appear here automatically.</p>
      </div>
    `;
    return;
  }

  // If container had empty state or error, do clean render
  if (container.querySelector('.empty-active-orders') || container.querySelector('.empty-state-sm')) {
    container.innerHTML = activeOrders.map((o, idx) => {
      try {
        return renderActiveOrderCard(o, idx, activeOrders);
      } catch (e) {
        console.error('[Orders] Failed to render order card:', e);
        return '';
      }
    }).join('');
    return;
  }

  // Keyed DOM reconciliation: update existing cards in-place without rebuilding DOM
  const existingCards = new Map();
  container.querySelectorAll('.active-order-card').forEach(el => {
    const id = el.getAttribute('data-order-id');
    if (id) existingCards.set(id, el);
  });

  const activeIds = new Set(activeOrders.map(o => String(o.id)));

  // 1. Remove stale or completed cards (DO NOT REMOVE if animated transition is in flight!)
  existingCards.forEach((cardEl, id) => {
    if (!activeIds.has(id)) {
      if (pendingOrderTransitions.has(id)) return;
      cardEl.remove();
    }
  });

  // 2. Update existing cards or insert new ones
  activeOrders.forEach((o, idx) => {
    const safeId = String(o.id || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
    const existingCard = existingCards.get(safeId);
    const status = (o.status || 'PLACED').toUpperCase();

    if (existingCard) {
      // If currently undergoing transition, protect it from re-render/flicker
      if (pendingOrderTransitions.has(safeId)) return;

      // In-place updates: check if status changed
      const currentStatus = existingCard.getAttribute('data-status');
      if (currentStatus !== status) {
        const temp = document.createElement('div');
        temp.innerHTML = renderActiveOrderCard(o, idx, activeOrders);
        const newCard = temp.firstElementChild;
        if (newCard) {
          existingCard.replaceWith(newCard);
        }
      } else {
        // Status unchanged: smoothly update wait time and elapsed time without flicker
        const waitTextEl = existingCard.querySelector('.wait-text');
        if (waitTextEl) {
          const waitTime = getWaitingTimeText(o.created_at);
          const newWaitText = status === 'READY' ? 'Ready for Pickup' : 'Waiting for ' + waitTime;
          if (waitTextEl.textContent !== newWaitText) waitTextEl.textContent = newWaitText;
        }

        const metaTimeEl = existingCard.querySelector('.meta-time');
        if (metaTimeEl) {
          const timeElapsed = formatTimeElapsed(o.created_at);
          const placedTime = new Date(o.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMeta = `🕒 ${placedTime} (${timeElapsed})`;
          if (metaTimeEl.textContent !== newMeta) metaTimeEl.textContent = newMeta;
        }
      }
    } else {
      // New incoming order: insert into DOM at correct index
      const temp = document.createElement('div');
      temp.innerHTML = renderActiveOrderCard(o, idx, activeOrders);
      const newCard = temp.firstElementChild;
      if (newCard) {
        const currentChildren = Array.from(container.children);
        if (idx < currentChildren.length) {
          container.insertBefore(newCard, currentChildren[idx]);
        } else {
          container.appendChild(newCard);
        }
      }
    }
  });
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

function copyOrderToken(text, e) {
  if (e) e.stopPropagation();
  const clean = text.replace(/^#/, '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(clean).then(() => {
      showToast(`Copied ${text} to clipboard!`, 'info');
    }).catch(() => {
      fallbackCopy(clean, text);
    });
  } else {
    fallbackCopy(clean, text);
  }
}
window.copyOrderToken = copyOrderToken;

function fallbackCopy(clean, text) {
  const ta = document.createElement('textarea');
  ta.value = clean;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`Copied ${text} to clipboard!`, 'info');
  } catch(err) {
    showToast(`Order: ${clean}`, 'info');
  }
  document.body.removeChild(ta);
}

function formatDisplayOrderNumber(o, index, allOrders) {
  if (o.order_number_display) return o.order_number_display;

  if (typeof o.id === 'string' && o.id.startsWith('ORD-')) {
    o.order_number_display = '#' + o.id;
    return o.order_number_display;
  }

  // Derive stable sequential number per store
  if (Array.isArray(allOrders) && allOrders.length > 0) {
    const targetStoreId = o.store_id || o.storeId;
    const storeOrders = allOrders.filter(ord => (ord.store_id || ord.storeId) === targetStoreId);
    if (storeOrders.length > 0) {
      const sorted = [...storeOrders].sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0));
      const idx = sorted.findIndex(ord => ord.id === o.id);
      if (idx !== -1) {
        o.order_number_display = `#ORD-${String(idx + 1).padStart(2, '0')}`;
        return o.order_number_display;
      }
    }
  }

  const digits = String(o.id || '').replace(/\D/g, '');
  if (digits.length > 0) {
    const lastDigits = digits.slice(-2);
    const num = String(parseInt(lastDigits, 10) || (index !== undefined ? index + 1 : 8)).padStart(2, '0');
    o.order_number_display = `#ORD-${num}`;
    return o.order_number_display;
  }

  o.order_number_display = `#ORD-08`;
  return o.order_number_display;
}
window.formatDisplayOrderNumber = formatDisplayOrderNumber;

function getWaitingTimeText(createdIso) {
  if (!createdIso) return '3 min';
  const diffMs = Date.now() - new Date(createdIso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 1) return '1 min';
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ${diffMin % 60}m`;
}

function getProductThumbnail(item) {
  if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    return item.image;
  }
  const name = (item.product_name_snapshot || item.name || '').toLowerCase();
  if (name.includes('cold brew') || name.includes('iced coffee')) {
    return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('coffee') || name.includes('cappuccino') || name.includes('latte') || name.includes('americano')) {
    return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('chai') || name.includes('tea')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('croissant') || name.includes('muffin') || name.includes('cookie') || name.includes('bakery')) {
    return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('notebook') || name.includes('journal') || name.includes('pad')) {
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('pen') || name.includes('highlighter')) {
    return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('hoodie') || name.includes('jacket') || name.includes('tee') || name.includes('jogger')) {
    return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&auto=format&fit=crop&q=80';
  }
  if (name.includes('earbud') || name.includes('speaker') || name.includes('mouse') || name.includes('cable') || name.includes('charger')) {
    return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80';
}

function getProductSubtext(item) {
  if (item.subtext) return item.subtext;
  if (item.options) return item.options;
  if (item.variant) return item.variant;
  if (item.note) return item.note;
  const name = (item.product_name_snapshot || item.name || '').toLowerCase();
  if (name.includes('cold brew')) return 'Iced · Regular';
  if (name.includes('sandwich')) return 'Grilled · Fresh';
  if (name.includes('coffee')) return 'Hot · Medium Roast';
  if (name.includes('chai')) return 'Desi Spiced · 200ml';
  if (name.includes('croissant')) return 'All-Butter · Warm';
  if (item.subcat) return item.subcat;
  return 'Standard · Regular';
}

/**
 * Renders a single active order card matching the reference design:
 * - Red coral border & NEXT ORDER header with Waiting for X min
 * - Avatar + Customer Name + Simple #ORD-08 token with copy icon + Fulfillment & time
 * - Top-right Total box
 * - Organized horizontal product items grid
 * - Single progression button: Accept & Process -> Done Packing -> Delivered
 */
function renderActiveOrderCard(o, index, allOrders) {
  const custName = (o.user_name || o.customer_name || o.customerName || 'Campus Student').trim();
  const custInitial = custName.charAt(0).toUpperCase();
  const timeElapsed = formatTimeElapsed(o.created_at);
  const waitTime = getWaitingTimeText(o.created_at);
  const placedTime = new Date(o.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = (o.status || 'PLACED').toUpperCase();
  const displayNumber = formatDisplayOrderNumber(o, index, allOrders || currentOrdersList);

  // Sanitized attributes to eliminate quote/script breakout vulnerabilities
  const safeOrderId = String(o.id || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
  const safeDisplayNumber = String(displayNumber || '').replace(/[^a-zA-Z0-9_\-#]/g, '');

  const STORE_COLOR_MAP = {
    'campus-cafe': { bg: '#FEF3C7', color: '#92400E', label: 'Campus Café' },
    'book-corner': { bg: '#DBEAFE', color: '#1E40AF', label: 'Book Corner' },
    'techstop':    { bg: '#E0E7FF', color: '#3730A3', label: 'TechStop' },
    'campus-mart': { bg: '#DCFCE7', color: '#166534', label: 'Campus Mart' },
    'campus-wear': { bg: '#F3E8FF', color: '#6B21A8', label: 'Campus Wear' },
    'health-hub':  { bg: '#FEE2E2', color: '#991B1B', label: 'Health Hub' },
  };
  const storeLabel = o.store_name || o.storeName || (window.merchantStoreData && window.merchantStoreData.name) || o.store_id || 'Campus Store';
  const storeTag = STORE_COLOR_MAP[o.store_id] || { bg: '#F1F5F9', color: '#334155', label: storeLabel };

  // Status Classes & Tag labels
  let statusClass = 'placed';
  let bannerTag = 'NEXT ORDER';
  let bannerIcon = '⚡';

  if (status === 'ACCEPTED' || status === 'PREPARING') {
    statusClass = 'preparing';
    bannerTag = 'PACKING ORDER';
    bannerIcon = '🛍️';
  } else if (status === 'READY') {
    statusClass = 'ready';
    bannerTag = 'READY FOR PICKUP';
    bannerIcon = '✓';
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    statusClass = 'completed';
    bannerTag = 'COMPLETED';
    bannerIcon = '✅';
  }

  // Single Sequential Progression Button
  let buttonHtml = '';
  if (status === 'PLACED') {
    // Stage 1: Placed -> Click to Accept & Process
    buttonHtml = `
      <button type="button" class="btn-order-step step-accept" 
              onclick="progressOrderStep('${safeOrderId}', 'PREPARING')"
              title="Click to accept order and start preparation">
        <span class="step-icon">⚡</span>
        <span class="step-text">Accept & Process</span>
        <span class="step-arrow">→</span>
      </button>
    `;
  } else if (status === 'ACCEPTED' || status === 'PREPARING') {
    // Stage 2: Preparing -> Click to Done Packing
    buttonHtml = `
      <button type="button" class="btn-order-step step-packing" 
              onclick="progressOrderStep('${safeOrderId}', 'READY')"
              title="Click when items are packed to notify student in bell notification">
        <span class="step-icon">🛍️</span>
        <span class="step-text">Done Packing</span>
        <span class="step-arrow">→</span>
      </button>
    `;
  } else if (status === 'READY') {
    // Stage 3: Ready -> Click to Delivered
    buttonHtml = `
      <button type="button" class="btn-order-step step-deliver" 
              onclick="progressOrderStep('${safeOrderId}', 'DELIVERED')"
              title="Click when student receives their order">
        <span class="step-icon">📦</span>
        <span class="step-text">Mark Delivered</span>
        <span class="step-arrow">✓</span>
      </button>
    `;
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    buttonHtml = `
      <div class="order-step-completed">
        <span class="step-icon">✅</span>
        <span class="step-text">Order Delivered & Completed ✓</span>
      </div>
    `;
  } else {
    buttonHtml = `
      <div class="order-step-cancelled">
        <span>✕ Order Cancelled</span>
      </div>
    `;
  }

  // Items in clean, consistent 2-column grid with strict truncation rule:
  // If > 4 products: show first 3 products, and 4th slot displays "+X others"
  // If <= 4 products: show up to 4 products
  let items = [];
  if (Array.isArray(o.items)) {
    items = o.items;
  } else if (typeof o.items === 'string') {
    try {
      items = JSON.parse(o.items);
    } catch (e) {
      items = [];
    }
  }
  let visibleItems = [];
  let moreCount = 0;

  if (items.length > 4) {
    visibleItems = items.slice(0, 3);
    moreCount = items.length - 3;
  } else {
    visibleItems = items.slice(0, 4);
  }

  let itemsHtml = '';
  if (items.length === 0) {
    itemsHtml = `
      <div class="order-product-card" style="grid-column: 1 / -1;">
        <span style="font-size: 13px;">📦</span>
        <div class="product-info-box">
          <div class="product-title" style="font-size: 11.5px; color: var(--text-muted);">Standard Counter Package (${escapeHtml(o.fulfillment_type || 'Counter Pickup')})</div>
        </div>
      </div>
    `;
  } else {
    itemsHtml = visibleItems.map(it => {
      const qty = it.quantity || it.qty || 1;
      const name = escapeHtml(it.product_name_snapshot || it.name || it.product_name || 'Item');
      const price = Number(it.price_snapshot || it.price || 0) * qty;
      const thumb = getProductThumbnail(it);
      return `
        <div class="order-product-card" title="${name} (x${qty})">
          <div class="product-qty-badge">${qty}×</div>
          <img src="${thumb}" alt="${name}" class="product-thumbnail" width="24" height="24" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80'" />
          <div class="product-info-box">
            <div class="product-title">${name}</div>
            <div class="product-price-line">₹${price}</div>
          </div>
        </div>
      `;
    }).join('');

    if (moreCount > 0) {
      itemsHtml += `
        <div class="order-product-card product-more-pill" title="${moreCount} more product${moreCount === 1 ? '' : 's'} in this order">
          <div class="more-icon-box">+</div>
          <div class="product-info-box">
            <div class="product-title" style="font-weight: 700; color: #2563EB;">+${moreCount} other${moreCount === 1 ? '' : 's'}</div>
            <div class="product-subtext-line">more items</div>
          </div>
        </div>
      `;
    }
  }

  const isDelivery = o.delivery_method === 'delivery' || o.fulfillment_type === 'delivery' || o.fulfillmentType === 'delivery';

  return `
    <div class="active-order-card status-${statusClass} order-card-${safeOrderId}" id="order-card-${safeOrderId}" data-order-id="${safeOrderId}" data-status="${status}">
      <!-- 1. TOP HEADER: STORE TAG, NEXT ORDER TAG & WAITING TIME -->
      <div class="order-top-banner">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="store-chip-tag" style="background: ${storeTag.bg}; color: ${storeTag.color};">
            ${escapeHtml(storeTag.label)}
          </span>
          <div class="order-next-tag tag-${statusClass}">
            <span class="tag-icon">${bannerIcon}</span>
            <span class="tag-label">${bannerTag}</span>
          </div>
        </div>
        <div class="order-waiting-tag tag-${statusClass}">
          <span class="wait-icon">🕒</span>
          <span class="wait-text">${status === 'READY' ? 'Ready for Pickup' : 'Waiting for ' + waitTime}</span>
        </div>
      </div>

      <!-- 2. COMPACT CUSTOMER INFO ROW WITH INLINE TOTAL AMOUNT BOX -->
      <div class="order-customer-row">
        <div class="order-user-group">
          <div class="order-avatar-circle">${custInitial}</div>
          <div class="order-user-details">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <h3 class="order-user-name">${escapeHtml(custName)}</h3>
              <div class="order-token-line">
                <span class="order-token-code">${safeDisplayNumber}</span>
                <button type="button" class="btn-copy-token" onclick="copyOrderToken('${safeDisplayNumber}', event)" title="Copy order number">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="order-meta-chips">
              <span class="meta-fulfillment">
                ${isDelivery ? '🛵 Delivery · ' + escapeHtml(o.delivery_address || 'Hostel') : '🛍️ Pickup'}
              </span>
              <span class="meta-sep">•</span>
              <span class="meta-time">🕒 ${placedTime} (${timeElapsed})</span>
            </div>
          </div>
        </div>
        <div class="order-inline-total">
          <span class="total-amount">₹${Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- 3. ORGANISED PRODUCTS GRID (CONSISTENT 2-COLUMN TILES) -->
      <div class="order-products-container">
        <div class="order-products-grid">
          ${itemsHtml}
        </div>
        ${o.notes ? `
          <div class="order-student-note">
            <span>💬</span> <span>"${escapeHtml(o.notes)}"</span>
          </div>
        ` : ''}
      </div>

      <!-- 4. BOTTOM ACTION ROW: SINGLE COMPACT PROGRESSION BUTTON -->
      <div class="order-action-row">
        ${buttonHtml}
      </div>
    </div>
  `;
}
window.renderActiveOrderCard = renderActiveOrderCard;

/**
 * 3-Stage Series Progression Function
 * Click 1: PLACED -> PREPARING (User sees: accepted & processing)
 * Click 2: PREPARING -> READY (Done Packing: sends bell notification to user!)
 * Click 3: READY -> DELIVERED (User receives order: 2s hold + smooth fade out)
 */
async function progressOrderStep(orderId, nextStatus) {
  const safeId = String(orderId || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
  if (!safeId) return;

  // Prevent duplicate concurrent requests or clicks on finalized orders
  if (pendingOrderTransitions.has(safeId)) {
    console.log('[Orders] Transition already in flight for order', safeId);
    return;
  }
  if (finalizedOrderIds.has(safeId)) {
    showToast('Order is already delivered and finalized.', 'info');
    return;
  }

  // State Machine Integrity Guard (CIA Integrity)
  const ord = currentOrdersList.find(o => String(o.id) === safeId);
  if (ord) {
    const curStatus = (ord.status || 'PLACED').toUpperCase();
    if (curStatus === 'DELIVERED' || curStatus === 'COMPLETED') {
      finalizedOrderIds.add(safeId);
      showToast('Order is already delivered and finalized.', 'info');
      return;
    }
    if (curStatus === 'CANCELLED') {
      showToast('Order is cancelled and cannot be updated.', 'warn');
      return;
    }
    const ALLOWED = {
      'PLACED': ['PREPARING', 'ACCEPTED', 'CANCELLED'],
      'ACCEPTED': ['PREPARING', 'READY', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['DELIVERED', 'COMPLETED', 'CANCELLED']
    };
    const allowedNext = ALLOWED[curStatus] || [];
    if (!allowedNext.includes(nextStatus.toUpperCase())) {
      console.warn(`[Security] Invalid state transition rejected: ${curStatus} -> ${nextStatus}`);
      showToast(`Cannot move order from ${curStatus} to ${nextStatus}`, 'warn');
      return;
    }
  }

  // Lock transition so background polls or listeners never interfere
  pendingOrderTransitions.add(safeId);

  // Provide immediate disabled button feedback so user knows step is being processed
  const cardEl = document.getElementById(`order-card-${safeId}`) || document.querySelector(`.order-card-${safeId}`);
  let actionBtn = null;
  let prevBtnHtml = '';
  if (cardEl) {
    actionBtn = cardEl.querySelector('.btn-order-step');
    if (actionBtn) {
      prevBtnHtml = actionBtn.innerHTML;
      actionBtn.disabled = true;
      actionBtn.style.pointerEvents = 'none';
      actionBtn.style.opacity = '0.75';
      const label = nextStatus === 'PREPARING' ? 'Accepting...' : (nextStatus === 'READY' ? 'Packing...' : 'Delivering...');
      actionBtn.innerHTML = `<span>⏳</span> <span>${label}</span>`;
    }
  }

  try {
    // 1. Submit authoritative status update to backend / DB
    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    // 2. Step is now finalised on the backend! Update in-memory order model
    if (ord) {
      ord.status = nextStatus.toUpperCase();
    }

    let statusMsg = '';
    if (nextStatus === 'PREPARING') {
      statusMsg = 'Order accepted! Kitchen preparation started.';
    } else if (nextStatus === 'READY') {
      statusMsg = 'Order packed! Ready for counter pickup 🛍️';
    } else if (nextStatus === 'DELIVERED') {
      statusMsg = 'Order DELIVERED! Customer confirmed.';
    }
    showToast(statusMsg, 'success');

    // 3. Broadcast across tabs and windows
    try {
      const bc = new BroadcastChannel('unimall_orders_channel');
      bc.postMessage({
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        status: nextStatus.toLowerCase(),
        timestamp: Date.now()
      });
      bc.close();
    } catch(e) {}

    window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
      detail: { orderId, status: nextStatus }
    }));

    // Update badges and table immediately
    updateOrderBadges();
    renderOrdersTable();

    // 4. Handle UI Card advancement smoothly
    if (nextStatus === 'DELIVERED') {
      // Mark permanently finalized so background polls never resurrect it
      finalizedOrderIds.add(safeId);

      if (cardEl) {
        cardEl.className = `active-order-card status-completed order-card-${safeId}`;
        cardEl.setAttribute('data-status', 'DELIVERED');
        cardEl.style.transition = 'all 0.35s ease';
        cardEl.style.borderColor = '#10B981';
        cardEl.style.background = 'linear-gradient(145deg, #F0FDF4 0%, #DCFCE7 100%)';

        const topBanner = cardEl.querySelector('.order-top-banner');
        if (topBanner) {
          const nextTag = topBanner.querySelector('.order-next-tag');
          if (nextTag) {
            nextTag.className = 'order-next-tag tag-completed';
            nextTag.innerHTML = '<span class="tag-icon">✅</span><span class="tag-label">COMPLETED</span>';
          }
          const waitTag = topBanner.querySelector('.order-waiting-tag');
          if (waitTag) {
            waitTag.className = 'order-waiting-tag tag-completed';
            waitTag.innerHTML = '<span class="wait-icon">✓</span><span class="wait-text">Delivered</span>';
          }
        }

        const actionRow = cardEl.querySelector('.order-action-row');
        if (actionRow) {
          actionRow.innerHTML = `
            <div class="order-step-completed">
              <span class="step-icon">✅</span>
              <span class="step-text">Order Delivered & Completed ✓</span>
            </div>
          `;
        }

        // Hold for 1.8 seconds so merchant sees clean green confirmation, then smoothly collapse
        setTimeout(() => {
          if (cardEl && cardEl.parentNode) {
            cardEl.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            cardEl.style.opacity = '0';
            cardEl.style.transform = 'translateY(-10px) scale(0.98)';
            cardEl.style.maxHeight = '0px';
            cardEl.style.paddingTop = '0px';
            cardEl.style.paddingBottom = '0px';
            cardEl.style.marginTop = '0px';
            cardEl.style.marginBottom = '0px';
            cardEl.style.borderWidth = '0px';
            cardEl.style.overflow = 'hidden';

            setTimeout(() => {
              if (cardEl && cardEl.parentNode) {
                cardEl.parentNode.removeChild(cardEl);
              }
              pendingOrderTransitions.delete(safeId);

              const container = getActiveOrdersCardsContainer();
              if (container && container.querySelectorAll('.active-order-card').length === 0) {
                renderActiveOrdersBoard();
              }
            }, 400);
          } else {
            pendingOrderTransitions.delete(safeId);
          }
        }, 1800);
      } else {
        pendingOrderTransitions.delete(safeId);
      }
    } else {
      // Step advanced to PREPARING or READY: update card in place with next step button
      if (cardEl && ord) {
        const temp = document.createElement('div');
        temp.innerHTML = renderActiveOrderCard(ord, 0, currentOrdersList);
        const newCard = temp.firstElementChild;
        if (newCard) {
          cardEl.replaceWith(newCard);
        }
      }
      pendingOrderTransitions.delete(safeId);
    }

  } catch (err) {
    console.error('[Orders] Failed to progress step:', err);
    // Restore previous button state on error
    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.style.pointerEvents = '';
      actionBtn.style.opacity = '';
      actionBtn.innerHTML = prevBtnHtml;
    }
    pendingOrderTransitions.delete(safeId);
    showToast(`Failed to update order: ${err.message}`, 'error');
  }
}
async function cancelOrderQuick(orderId) {
  if (!confirm(`Are you sure you want to cancel order ${orderId}?`)) return;
  try {
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.updateOrderStatus === 'function') {
      await window.UniMallDB.updateOrderStatus(orderId, 'cancelled', 'Cancelled by store admin');
    }
    showToast(`Order ${orderId} cancelled`, 'info');
    const store = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : 'all');
    loadOrders(store, true);
  } catch (err) {
    showToast(`Failed to cancel: ${err.message}`, 'error');
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

  if (currentStoreOrderFilter && currentStoreOrderFilter !== 'all') {
    filtered = filtered.filter(o => (o.store_id || o.storeId) === currentStoreOrderFilter);
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(o => {
      const matchNum = String(o.order_number_display || o.order_number || o.id).toLowerCase().includes(currentSearchQuery);
      const matchName = String(o.user_name || o.customer_name || '').toLowerCase().includes(currentSearchQuery);
      const matchLoc = String(o.delivery_address || o.delivery_location || '').toLowerCase().includes(currentSearchQuery);
      return matchNum || matchName || matchLoc;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6" style="color: var(--text-muted);">No orders found for this status.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const safeId = String(o.id || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
    const placedTime = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const custName = o.customer_name || o.user_name || 'Student';
    const custContact = o.customer_phone || o.customer_email || '—';
    const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
    const status = (o.status || 'placed').toUpperCase();

    let actionBtn = '';
    if (status === 'PLACED') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${safeId}', 'PREPARING')" style="height: 28px; font-size: 11.5px; padding: 0 10px;">⚡ Accept</button>`;
    } else if (status === 'ACCEPTED' || status === 'PREPARING') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${safeId}', 'READY')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #7C3AED; border-color: #7C3AED;">✓ Ready</button>`;
    } else if (status === 'READY') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${safeId}', 'DELIVERED')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #059669; border-color: #059669;">📦 Deliver</button>`;
    } else {
      actionBtn = '<span style="font-size: 12px; color: var(--text-muted);">—</span>';
    }

    return `
      <tr>
        <td><strong>#${escapeHtml(o.id)}</strong></td>
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
            <button type="button" class="btn-action secondary" onclick="viewOrderDetail('${safeId}')" style="height: 28px; font-size: 11.5px; padding: 0 8px;">
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

    const safeModalOrderId = String(order.id || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
    let actionsHtml = `<button type="button" class="btn-action secondary" data-close="modal-order-detail">Close</button>`;

    if (nextTransitions[s]) {
      const trans = nextTransitions[s];
      actionsHtml += `
        <button type="button" class="btn-action ${trans.btnClass}" onclick="executeOrderTransition('${safeModalOrderId}', '${trans.next}')">
          ${trans.label}
        </button>
      `;
    }

    if (!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      actionsHtml += `
        <button type="button" class="btn-action secondary" style="color: var(--danger);" onclick="executeOrderTransition('${safeModalOrderId}', 'CANCELLED')">
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
window.loadOrders = loadOrders;
window.startOrdersPolling = startOrdersPolling;
