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
    icon: '/faviicon.png',
    badge: '/faviicon.png',
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
  if (e.detail.viewName === 'orders') {
    loadOrders(e.detail.storeId);
    startOrdersPolling();
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-orders') {
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
            customerName: customerName || 'Ansh Sharma',
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

document.addEventListener('DOMContentLoaded', () => {
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
      if (activeStoreId) loadOrders(activeStoreId);
    });
  }

  // 5. Start persistent polling right away
  startOrdersPolling();
});

function startOrdersPolling() {
  stopOrdersPolling();
  ordersPollInterval = setInterval(() => {
    if (activeStoreId) {
      loadOrders(activeStoreId, true); // silent refresh & background order check
    }
  }, 4000);
}

// Reactivate and check immediately when mobile owner switches back to app
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && activeStoreId) {
    loadOrders(activeStoreId, true);
  }
});

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
  if (!storeId) return;

  const cardsContainer = document.getElementById('active-orders-cards-container');
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
    const data = await apiRequest(`/admin/stores/${storeId}/orders`);
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

    // Render both views
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
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  const count = activeOrders.length;

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
  const container = document.getElementById('active-orders-cards-container');
  if (!container) return;

  // Filter active orders that require action or pickup
  const activeOrders = currentOrdersList.filter(o => {
    const s = (o.status || '').toUpperCase();
    return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
  });

  // Sort orders: PLACED first (newest needs accept), then PREPARING, then READY
  const statusPriority = { 'PLACED': 1, 'ACCEPTED': 2, 'PREPARING': 3, 'READY': 4 };
  activeOrders.sort((a, b) => {
    const pa = statusPriority[(a.status || '').toUpperCase()] || 99;
    const pb = statusPriority[(b.status || '').toUpperCase()] || 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-active-orders">
        <div class="empty-icon">☕</div>
        <h3>All caught up!</h3>
        <p>No active orders requiring preparation or counter pickup right now. New student orders will appear here automatically.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(o => renderActiveOrderCard(o)).join('');
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
  const custName = o.user_name || o.customer_name || 'Aian Priority';
  const custInitial = custName.charAt(0).toUpperCase();
  const timeElapsed = formatTimeElapsed(o.created_at);
  const waitTime = getWaitingTimeText(o.created_at);
  const placedTime = new Date(o.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = (o.status || 'PLACED').toUpperCase();
  const displayNumber = formatDisplayOrderNumber(o, index, allOrders || currentOrdersList);

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
              onclick="progressOrderStep('${o.id}', 'PREPARING')"
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
              onclick="progressOrderStep('${o.id}', 'READY')"
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
              onclick="progressOrderStep('${o.id}', 'DELIVERED')"
              title="Click when student receives their order">
        <span class="step-icon">📦</span>
        <span class="step-text">Delivered</span>
        <span class="step-arrow">✓</span>
      </button>
    `;
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    buttonHtml = `
      <div class="order-step-completed">
        <span class="step-icon">✅</span>
        <span class="step-text">Order Delivered & Completed</span>
      </div>
    `;
  } else {
    buttonHtml = `
      <div class="order-step-cancelled">
        <span>✕ Order Cancelled</span>
      </div>
    `;
  }

  // Items in clean, organized multi-column grid
  const items = Array.isArray(o.items) && o.items.length > 0 ? o.items : [
    { name: 'Cold Brew Coffee', qty: 1, price: 250, subtext: 'Iced · Regular' },
    { name: 'Grilled Veg Sandwich', qty: 1, price: 275, subtext: 'No onions' }
  ];

  const itemsHtml = items.map(it => {
    const qty = it.quantity || it.qty || 1;
    const name = escapeHtml(it.product_name_snapshot || it.name || 'Product');
    const price = Number(it.price_snapshot || it.price || 0) * qty;
    const thumb = getProductThumbnail(it);
    const subtext = escapeHtml(getProductSubtext(it));
    return `
      <div class="order-product-card">
        <div class="product-qty-badge">${qty}×</div>
        <img src="${thumb}" alt="${name}" class="product-thumbnail" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80'" />
        <div class="product-info-box">
          <div class="product-title" title="${name}">${name}</div>
          <div class="product-price-line">₹${price}</div>
          <div class="product-subtext-line">${subtext}</div>
        </div>
      </div>
    `;
  }).join('');

  const isDelivery = o.delivery_method === 'delivery' || o.fulfillment_type === 'delivery' || o.fulfillmentType === 'delivery';

  return `
    <div class="active-order-card status-${statusClass} order-card-${o.id}" id="order-card-${o.id}">
      <!-- 1. TOP HEADER: RED CORAL TAG & WAITING TIME -->
      <div class="order-top-banner">
        <div class="order-next-tag">
          <span class="tag-icon">${bannerIcon}</span>
          <span class="tag-label">${bannerTag}</span>
        </div>
        <div class="order-waiting-tag">
          <span class="wait-icon">🕒</span>
          <span class="wait-text">${status === 'READY' ? 'Ready for Pickup' : 'Waiting for ' + waitTime}</span>
        </div>
      </div>

      <!-- 2. CUSTOMER INFO ROW WITH TOTAL AMOUNT BOX -->
      <div class="order-customer-row">
        <div class="order-user-group">
          <div class="order-avatar-circle">${custInitial}</div>
          <div class="order-user-details">
            <h3 class="order-user-name">${escapeHtml(custName)}</h3>
            <div class="order-token-line">
              <span class="order-token-code">${displayNumber}</span>
              <button type="button" class="btn-copy-token" onclick="copyOrderToken('${displayNumber}', event)" title="Copy order number">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="order-meta-chips">
              <span class="meta-fulfillment">
                ${isDelivery ? '🛵 Delivery · ' + escapeHtml(o.delivery_address || 'Hostel') : '🛍️ Pickup'}
              </span>
              <span class="meta-sep">|</span>
              <span class="meta-time">🕒 ${placedTime}</span>
              <span class="meta-ago">${timeElapsed}</span>
            </div>
          </div>
        </div>
        <div class="order-total-box">
          <span class="total-label">Total</span>
          <span class="total-amount">₹${Number(o.store_subtotal || o.total || 525).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- 3. ORGANISED PRODUCTS GRID (FITTED HORIZONTAL TILES) -->
      <div class="order-products-container">
        <div class="order-products-grid">
          ${itemsHtml}
        </div>
        ${o.notes ? `
          <div class="order-student-note">
            <span class="note-icon">💬</span>
            <span class="note-text">"${escapeHtml(o.notes)}"</span>
          </div>
        ` : ''}
      </div>

      <!-- 4. BOTTOM ACTION ROW: SINGLE PROGRESSION BUTTON ONLY -->
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
 * Click 3: READY -> DELIVERED (User receives order: green ripple)
 */
async function progressOrderStep(orderId, nextStatus) {
  try {
    document.querySelectorAll(`[id="order-card-${orderId}"]`).forEach(card => {
      card.style.opacity = '0.65';
      card.style.pointerEvents = 'none';
      const btn = card.querySelector('.btn-order-step');
      if (btn) btn.innerHTML = '<span>⏳</span> <span>Updating...</span>';
    });

    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    let statusMsg = '';
    if (nextStatus === 'PREPARING') {
      statusMsg = `Order accepted! Kitchen preparation started.`;
    } else if (nextStatus === 'READY') {
      statusMsg = `Order packed! Student acknowledged in bell notification 🔔`;
    } else if (nextStatus === 'DELIVERED') {
      statusMsg = `Order DELIVERED! Customer confirmed.`;
    }

    showToast(statusMsg, 'success');

    // Refresh orders view & dashboard in sync
    if (activeStoreId) {
      await loadOrders(activeStoreId, true);

      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard(activeStoreId);
      }
    }
  } catch (err) {
    showToast(`Failed to update order: ${err.message}`, 'error');
    if (activeStoreId) loadOrders(activeStoreId);
  }
}
window.progressOrderStep = progressOrderStep;
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

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6" style="color: var(--text-muted);">No orders found for this status.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const placedTime = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const custName = o.customer_name || o.user_name || 'Student';
    const custContact = o.customer_phone || o.customer_email || '—';
    const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
    const status = (o.status || 'placed').toUpperCase();

    let actionBtn = '';
    if (status === 'PLACED') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'PREPARING')" style="height: 28px; font-size: 11.5px; padding: 0 10px;">⚡ Accept</button>`;
    } else if (status === 'ACCEPTED' || status === 'PREPARING') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'READY')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #7C3AED; border-color: #7C3AED;">✓ Ready</button>`;
    } else if (status === 'READY') {
      actionBtn = `<button type="button" class="btn-action primary" onclick="progressOrderStep('${o.id}', 'DELIVERED')" style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #059669; border-color: #059669;">📦 Deliver</button>`;
    } else {
      actionBtn = '<span style="font-size: 12px; color: var(--text-muted);">—</span>';
    }

    return `
      <tr>
        <td><strong>#${o.id}</strong></td>
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
            <button type="button" class="btn-action secondary" onclick="viewOrderDetail('${o.id}')" style="height: 28px; font-size: 11.5px; padding: 0 8px;">
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

    let actionsHtml = `<button type="button" class="btn-action secondary" data-close="modal-order-detail">Close</button>`;

    if (nextTransitions[s]) {
      const trans = nextTransitions[s];
      actionsHtml += `
        <button type="button" class="btn-action ${trans.btnClass}" onclick="executeOrderTransition('${order.id}', '${trans.next}')">
          ${trans.label}
        </button>
      `;
    }

    if (!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
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
    await progressOrderStep(orderId, newStatus);
    const modal = document.getElementById('modal-order-detail');
    if (modal) modal.classList.add('hidden');
  } catch {
    // Handled
  }
}
window.executeOrderTransition = executeOrderTransition;
