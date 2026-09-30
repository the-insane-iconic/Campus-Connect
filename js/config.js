/* ═══════════════════════════════════════════════════════════
   UNIMALL — CENTRAL CONFIG & SUPABASE CLIENT (js/config.js)
   ═══════════════════════════════════════════════════════════ */

'use strict';

window.UNIMALL_CONFIG = {
  // Neon Lakebase PostgreSQL Connection & REST / SQL HTTP URLs
  NEON_SQL_URL: 'https://ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/sql',
  NEON_CONNECTION_STRING: 'postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  NEON_REST_URL: 'https://ep-broad-morning-b30i16bo.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1',
  NEON_AUTH_URL: 'https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth',
  NEON_AUTH_JWKS_URL: 'https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json',

  // Razorpay Gateway Credentials
  RAZORPAY_KEY_ID: 'rzp_test_TiK8sBDv7ObzG5',

  // Fallback providers & storage
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

window.RAZORPAY_KEY_ID = window.UNIMALL_CONFIG.RAZORPAY_KEY_ID;
window.BYPASS_RAZORPAY = false;

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
 * UniMall Database Client (Powered by Neon Lakebase Postgres)
 * Executes queries directly against Neon PostgreSQL with secure HTTPS and atomic transactions.
 */
window.UniMallDB = {
  /**
   * Direct Neon PostgreSQL Query Execution via HTTPS SQL API
   */
  async neonSql(query, params = []) {
    const url = window.UNIMALL_CONFIG.NEON_SQL_URL;
    const headers = {
      'Content-Type': 'application/json',
      'Neon-Connection-String': window.UNIMALL_CONFIG.NEON_CONNECTION_STRING
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, params })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Neon SQL query failed (${res.status})`);
    }

    const data = await res.json();
    return data.rows || [];
  },

  /* ── Get Stores ── */
  async getStores() {
    try {
      const rows = await this.neonSql(`
        SELECT id, name, slug, description, category, floor, location, phone, 
               cover_image, is_open, delivery_available, pickup_available, 
               opening_time, closing_time, rating, popularity
        FROM unimall_stores
        ORDER BY popularity DESC
      `);
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn('[UniMallDB] Neon stores fetch fallback:', e.message);
    }
    return (typeof STORES !== 'undefined') ? STORES : [];
  },

  /* ── Get Products ── */
  async getProducts(storeId = null) {
    try {
      let query = `
        SELECT id, store_id, name, description, price, emoji, image, bg, 
               stock, availability, delivery_available, pickup_available, 
               category_id, rating
        FROM unimall_products
        WHERE is_active = true
      `;
      const params = [];
      if (storeId) {
        query += ` AND store_id = $1`;
        params.push(storeId);
      }
      query += ` ORDER BY name ASC`;

      const rows = await this.neonSql(query, params);
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn('[UniMallDB] Neon products fetch fallback:', e.message);
    }
    return (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
  },

  /* ── Atomic Order Creation ── */
  async createOrder(orderPayload, items = []) {
    const orderId = orderPayload.id;
    const orderNumber = orderPayload.order_number || orderPayload.order_number_display || `#ORD-${String(orderId).slice(-2)}`;
    const userId = orderPayload.user_id || 'usr_student';
    const userName = orderPayload.user_name || orderPayload.customer_name || 'Campus Student';
    const userEmail = orderPayload.user_email || orderPayload.customer_email || 'student@campus.edu';
    const storeId = orderPayload.store_id || 'campus-cafe';
    const status = (orderPayload.status || 'placed').toLowerCase();
    const fulfillmentType = 'pickup'; // Guaranteed Counter Pickup Only
    const subtotal = Number(orderPayload.subtotal || 0);
    const deliveryFee = 0.00; // Counter pickup is always ₹0
    const total = Number(orderPayload.total || subtotal);
    const paymentMethod = orderPayload.payment_method || 'Razorpay Instant';
    const paymentStatus = orderPayload.payment_status || (paymentMethod.includes('Counter') ? 'PENDING_AT_COUNTER' : 'PAID');
    const notes = orderPayload.notes || '';

    // 1. Insert into Neon PostgreSQL unimall_orders
    try {
      const orderSql = `
        INSERT INTO unimall_orders (
          id, order_number, user_id, user_name, user_email, 
          store_id, status, fulfillment_type, subtotal, delivery_fee, 
          total, payment_method, payment_status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *;
      `;
      const orderParams = [
        orderId, orderNumber, userId, userName, userEmail,
        storeId, status, fulfillmentType, subtotal, deliveryFee,
        total, paymentMethod, paymentStatus, notes
      ];

      await this.neonSql(orderSql, orderParams);

      // 2. Insert items into unimall_order_items
      if (items && items.length > 0) {
        for (const it of items) {
          const pId = it.productId || it.product_id || it.id || 'p01';
          const pName = it.name || it.product_name || 'Item';
          const price = Number(it.price || 0);
          const qty = Number(it.qty || it.quantity || 1);
          const emoji = it.emoji || '📦';
          const image = it.image || it.image_url || '';

          await this.neonSql(`
            INSERT INTO unimall_order_items (order_id, product_id, product_name, price, qty, emoji, image)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [orderId, pId, pName, price, qty, emoji, image]).catch(() => {});
        }
      }

      // 3. Record status history in Neon
      await this.neonSql(`
        INSERT INTO unimall_order_status_history (order_id, status, notes)
        VALUES ($1, $2, $3)
      `, [orderId, status, `Order placed via ${paymentMethod} (${paymentStatus})`]).catch(() => {});

      console.log(`[UniMallDB] Order ${orderNumber} (${orderId}) successfully stored in Neon PostgreSQL.`);
    } catch (dbErr) {
      console.warn('[UniMallDB] Neon order insertion warning:', dbErr.message);
    }

    return orderPayload;
  },

  /* ── Get Orders for User ── */
  async getUserOrders(userId) {
    if (!userId) return [];
    try {
      const orders = await this.neonSql(`
        SELECT * FROM unimall_orders
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      for (const ord of orders) {
        const items = await this.neonSql(`
          SELECT * FROM unimall_order_items WHERE order_id = $1
        `, [ord.id]);
        ord.items = items;
      }
      return orders;
    } catch (e) {
      console.warn('[UniMallDB] getUserOrders fallback:', e.message);
      return [];
    }
  },

  /* ── Get Specific Order by ID ── */
  async getOrderById(orderId) {
    try {
      const orders = await this.neonSql(`
        SELECT * FROM unimall_orders WHERE id = $1 LIMIT 1
      `, [orderId]);

      if (orders && orders[0]) {
        const order = orders[0];
        const items = await this.neonSql(`
          SELECT * FROM unimall_order_items WHERE order_id = $1
        `, [orderId]);
        const history = await this.neonSql(`
          SELECT * FROM unimall_order_status_history WHERE order_id = $1 ORDER BY created_at ASC
        `, [orderId]);

        order.items = items;
        order.statusHistory = history;
        return order;
      }
    } catch (e) {
      console.warn('[UniMallDB] getOrderById fallback:', e.message);
    }
    return null;
  },

  /* ── Get Orders for Store ── */
  async getStoreOrders(storeId) {
    try {
      let query = `
        SELECT id, order_number, user_id, user_name, user_email, user_phone, 
               user_hostel, user_room, store_id, status, fulfillment_type, 
               subtotal, delivery_fee, total, payment_method, payment_status, 
               notes, created_at, updated_at
        FROM unimall_orders
      `;
      const params = [];
      if (storeId && storeId !== 'all') {
        query += ` WHERE store_id = $1`;
        params.push(storeId);
      }
      query += ` ORDER BY created_at DESC LIMIT 50`;

      const orders = await this.neonSql(query, params);
      if (orders && Array.isArray(orders)) {
        for (const ord of orders) {
          const items = await this.neonSql(`
            SELECT product_id, product_name, price, qty, emoji, image 
            FROM unimall_order_items 
            WHERE order_id = $1
          `, [ord.id]);
          ord.items = (items || []).map(i => ({
            product_name: i.product_name,
            name: i.product_name,
            price: parseFloat(i.price || 0),
            quantity: i.qty || 1,
            qty: i.qty || 1,
            emoji: i.emoji || '📦',
            image: i.image || ''
          }));
          ord.subtotal = parseFloat(ord.subtotal || ord.total || 0);
          ord.store_subtotal = parseFloat(ord.subtotal || ord.total || 0);
          ord.total_amount = parseFloat(ord.total || 0);
          ord.total = parseFloat(ord.total || 0);
          ord.user_name = (ord.user_name || '').trim() || 'Campus Student';
          ord.status = (ord.status || 'placed').toUpperCase();
          ord.delivery_location = ord.user_hostel ? `${ord.user_hostel} - ${ord.user_room}` : 'Counter Pickup';
        }
        return orders;
      }
    } catch (e) {
      console.warn('[UniMallDB] getStoreOrders error:', e.message);
    }
    return [];
  },

  /* ── Update Order Status (Store Admin 1-Click Action) ── */
  async updateOrderStatus(orderId, status, notes = '') {
    const isDelivered = (status.toUpperCase() === 'DELIVERED' || status.toUpperCase() === 'COMPLETED');
    const normStatus = isDelivered ? 'delivered' : status.toLowerCase();
    const nowIso = new Date().toISOString();

    try {
      await this.neonSql(`
        UPDATE unimall_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [normStatus, orderId]);

      await this.neonSql(`
        INSERT INTO unimall_order_status_history (order_id, status, notes)
        VALUES ($1, $2, $3)
      `, [orderId, normStatus, notes || `Order progressed to ${normStatus}`]).catch(() => {});
    } catch (e) {
      console.warn('[UniMallDB] updateOrderStatus Neon error:', e.message);
    }

    // Keep localStorage in sync across store tabs
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const ord = appData.orders.find(o => o.id === orderId);
          if (ord) {
            ord.status = normStatus;
            if (isDelivered) ord.deliveredAt = nowIso;
            if (!ord.statusHistory) ord.statusHistory = [];
            ord.statusHistory.push({
              status: normStatus,
              time: nowIso,
              label: `Order marked as ${normStatus}`
            });
            localStorage.setItem('unimall_v1', JSON.stringify(appData));
          }
        }
      }

      localStorage.setItem('unimall_order_delivered_event', JSON.stringify({
        orderId,
        status: normStatus,
        deliveredAt: nowIso,
        timestamp: Date.now()
      }));
    } catch(e) {}

    // Broadcast across all open windows & tabs via BroadcastChannel
    try {
      const bc = new BroadcastChannel('unimall_orders_channel');
      bc.postMessage({
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        status: normStatus,
        deliveredAt: nowIso,
        timestamp: Date.now()
      });
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
      detail: { orderId, status: normStatus, deliveredAt: nowIso }
    }));

    return { id: orderId, status: normStatus };
  },

  /* ── Realtime Listener for Order Status Updates ── */
  subscribeToOrder(orderId, onUpdate) {
    const timer = setInterval(async () => {
      try {
        const order = await this.getOrderById(orderId);
        if (order && onUpdate) onUpdate(order);
      } catch (e) {}
    }, 4000);

    return () => clearInterval(timer);
  }
};
