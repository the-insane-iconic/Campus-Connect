/* ═══════════════════════════════════════════════════════════
   UNIMALL — CENTRAL CONFIG & SUPABASE CLIENT (js/config.js)
   ═══════════════════════════════════════════════════════════ */

'use strict';

window.UNIMALL_CONFIG = {
  SUPABASE_URL: 'https://ncfhvkhthtrzrzvlpxdq.supabase.co',
  SUPABASE_KEY: 'sb_publishable_on7DapWFNo1nXC6RzI5PCQ_p6fHKWIf',
  STORAGE_BUCKET: 'unimall-media',
  
  FIREBASE: {
    apiKey: "AIzaSyAI1pYMj_ht9YRrVCMKNYNVtmt_mZw-ysI",
    authDomain: "unimall-d484f.firebaseapp.com",
    projectId: "unimall-d484f",
    storageBucket: "unimall-d484f.firebasestorage.app",
    messagingSenderId: "162359291874",
    appId: "1:162359291874:web:fe413c9fa9b823ce06d3bb",
    measurementId: "G-28QZKVB4K1"
  }
};

/**
 * Initial Avatar Generator
 * Returns a sleek, high-res SVG initials avatar data URI with ZERO network overhead.
 */
window.getInitialsAvatar = function(seed = 'Student') {
  const clean = String(seed || '').trim();
  const initial = (clean.length > 0 ? clean.charAt(0) : 'U').toUpperCase();
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">`
    + `<defs>`
    + `<linearGradient id="ug" x1="0%" y1="0%" x2="100%" y2="100%">`
    + `<stop offset="0%" stop-color="#2563eb"/>`
    + `<stop offset="100%" stop-color="#1d4ed8"/>`
    + `</linearGradient>`
    + `</defs>`
    + `<rect width="100" height="100" rx="50" fill="url(#ug)"/>`
    + `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'DM Sans', 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800">${initial}</text>`
    + `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
window.getStickerAvatar = window.getInitialsAvatar;

/**
 * Instant Page Prefetcher for Silky Smooth Surfing
 */
window.prefetchPage = function(url) {
  if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('http')) return;
  try {
    if (!document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  } catch (e) {}
};

// Prefetch core routes on idle & hover
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const coreRoutes = ['index.html', 'stores.html', 'cart.html', 'orders.html', 'profile.html'];
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => coreRoutes.forEach(r => window.prefetchPage(r)));
    } else {
      setTimeout(() => coreRoutes.forEach(r => window.prefetchPage(r)), 800);
    }

    document.body.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a[href]');
      if (a) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
          window.prefetchPage(href);
        }
      }
    }, { passive: true });
  });
}

/**
 * Lightweight UniMall Supabase Client
 * Works directly via PostgREST with standard fetch — zero external dependency needed.
 */
window.UniMallDB = {
  async req(endpoint, options = {}) {
    const url = `${window.UNIMALL_CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': window.UNIMALL_CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${window.UNIMALL_CONFIG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${res.status})`);
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (e) {
      console.warn(`[UniMallDB] ${endpoint} failed:`, e.message);
      throw e;
    }
  },

  /* ── Stores ── */
  async getStores() {
    return await this.req('unimall_stores?select=*&order=popularity.desc');
  },

  /* ── Products ── */
  async getProducts(storeId = null) {
    let query = 'unimall_products?select=*&is_active=eq.true&order=created_at.desc';
    if (storeId) {
      query += `&store_id=eq.${encodeURIComponent(storeId)}`;
    }
    return await this.req(query);
  },

  /* ── Place Order ── */
  async createOrder(orderPayload, items) {
    // 1. Insert order
    const createdOrders = await this.req('unimall_orders', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(orderPayload)
    });

    const order = createdOrders && createdOrders[0] ? createdOrders[0] : orderPayload;

    // 2. Insert items
    if (items && items.length > 0) {
      const formattedItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId || item.product_id,
        product_name: item.name || item.product_name,
        price: item.price,
        qty: item.qty || 1,
        emoji: item.emoji || '📦',
        image: item.image || ''
      }));

      await this.req('unimall_order_items', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(formattedItems)
      }).catch(err => console.warn('Order items insert warning:', err));
    }

    // 3. Insert initial status history
    await this.req('unimall_order_status_history', {
      method: 'POST',
      body: JSON.stringify({
        order_id: order.id,
        status: order.status || 'placed',
        notes: 'Order placed by student'
      })
    }).catch(() => {});

    return order;
  },

  /* ── Get Orders for User ── */
  async getUserOrders(userId) {
    if (!userId) return [];
    return await this.req(`unimall_orders?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*,unimall_order_items(*)`);
  },

  /* ── Get Specific Order ── */
  async getOrderById(orderId) {
    const orders = await this.req(`unimall_orders?id=eq.${encodeURIComponent(orderId)}&select=*,unimall_order_items(*),unimall_order_status_history(*)`);
    return orders && orders[0] ? orders[0] : null;
  },

  /* ── Update Order Status (Store Admin or Student) ── */
  async updateOrderStatus(orderId, status, notes = '') {
    const isDelivered = (status.toUpperCase() === 'DELIVERED' || status.toUpperCase() === 'COMPLETED');
    const dbStatus = isDelivered ? 'COMPLETED' : status.toUpperCase();
    const nowIso = new Date().toISOString();

    const updated = await this.req(`unimall_orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: dbStatus, updated_at: nowIso })
    }).catch(() => null);

    // Record history
    await this.req('unimall_order_status_history', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        status: dbStatus,
        notes: notes || `Status updated to ${status}`
      })
    }).catch(() => {});

    // Ensure local storage is kept in sync
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const ord = appData.orders.find(o => o.id === orderId);
          if (ord) {
            ord.status = isDelivered ? 'delivered' : status.toLowerCase();
            if (isDelivered) {
              ord.deliveredAt = nowIso;
            }
            if (!ord.statusHistory) ord.statusHistory = [];
            ord.statusHistory.push({
              status: ord.status,
              time: nowIso,
              label: `Order marked as ${status}`
            });
            localStorage.setItem('unimall_v1', JSON.stringify(appData));
          }
        }
      }
      localStorage.setItem('unimall_order_delivered_event', JSON.stringify({
        orderId,
        status: isDelivered ? 'delivered' : status.toLowerCase(),
        deliveredAt: nowIso,
        timestamp: Date.now()
      }));
    } catch(e) {}

    window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
      detail: { orderId, status: isDelivered ? 'delivered' : status.toLowerCase(), deliveredAt: nowIso }
    }));

    return updated && updated[0] ? updated[0] : null;
  },

  /* ── Realtime Listener for Order Status Updates ── */
  subscribeToOrder(orderId, onUpdate) {
    // We poll gently every 5 seconds as a rock-solid fallback that works universally
    const timer = setInterval(async () => {
      try {
        const order = await this.getOrderById(orderId);
        if (order && onUpdate) onUpdate(order);
      } catch (e) {}
    }, 4500);

    return () => clearInterval(timer);
  }
};
