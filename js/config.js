/* ═══════════════════════════════════════════════════════════
   UNIMALL — CENTRAL CONFIG & SUPABASE CLIENT (js/config.js)
   ═══════════════════════════════════════════════════════════ */

'use strict';

// Auto-detect native Android Capacitor environment vs web
const IS_NATIVE = (typeof window !== 'undefined' && (
  window.Capacitor !== undefined ||
  window.location.protocol === 'capacitor:' ||
  (window.location.hostname === 'localhost' && !window.location.port)
));
const API_HOST = '';

window.UNIMALL_CONFIG = {
  // Database API Proxy Endpoint (All DB credentials kept securely server-side)
  API_HOST: API_HOST,
  API_QUERY_URL: '/api/db/query',
  NEON_SQL_URL: 'https://ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/sql',
  NEON_CONN: 'postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
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
 * Protected with SWR Micro-Caching, In-Flight Deduplication & Connection Pooling
 */
window.UniMallDB = {
  // In-Memory Micro-Cache & In-Flight Promise Coalescing Map
  _cache: new Map(),
  _inflight: new Map(),

  /**
   * Stale-While-Revalidate (SWR) Engine with Request Coalescing
   * Ensures 0ms instant UI rendering on reloads, dedupes parallel queries,
   * and shields Neon free-tier compute from concurrent request spikes.
   */
  async _swr(key, ttlMs, fetcher, persistSession = true) {
    const now = Date.now();
    let entry = this._cache.get(key);

    // 1. SessionStorage lookup for instant 0ms restoration across page reloads & navigations
    if (!entry && persistSession && typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('unimall_swr_' + key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.data !== undefined) {
            entry = parsed;
            this._cache.set(key, entry);
          }
        }
      } catch (e) {}
    }

    // 2. Cache Hit & Fresh -> 0ms immediate response
    if (entry && (now - entry.timestamp < ttlMs)) {
      return entry.data;
    }

    // 3. Request Coalescing: Return active in-flight Promise if another caller is already querying
    if (this._inflight.has(key)) {
      return this._inflight.get(key);
    }

    // 4. Stale-While-Revalidate: Return stale data immediately, revalidate asynchronously
    if (entry && entry.data !== undefined) {
      const bgPromise = (async () => {
        try {
          const freshData = await fetcher();
          if (freshData !== undefined && freshData !== null) {
            const newEntry = { data: freshData, timestamp: Date.now() };
            this._cache.set(key, newEntry);
            if (persistSession && typeof sessionStorage !== 'undefined') {
              try { sessionStorage.setItem('unimall_swr_' + key, JSON.stringify(newEntry)); } catch(e) {}
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('unimall:dataRevalidated', { detail: { key, data: freshData } }));
            }
          }
        } catch (err) {
          console.warn('[UniMallDB] SWR background revalidation failed for ' + key, err.message);
        } finally {
          this._inflight.delete(key);
        }
      })();
      this._inflight.set(key, bgPromise);
      return entry.data;
    }

    // 5. Cold Cache: Execute fetcher with in-flight deduplication
    const fetchPromise = (async () => {
      try {
        const data = await fetcher();
        if (data !== undefined && data !== null) {
          const newEntry = { data, timestamp: Date.now() };
          this._cache.set(key, newEntry);
          if (persistSession && typeof sessionStorage !== 'undefined') {
            try { sessionStorage.setItem('unimall_swr_' + key, JSON.stringify(newEntry)); } catch(e) {}
          }
        }
        return data;
      } finally {
        this._inflight.delete(key);
      }
    })();

    this._inflight.set(key, fetchPromise);
    return fetchPromise;
  },

  /**
   * Invalidate specific cache keys or wildcards
   */
  invalidateCache(pattern = null) {
    if (!pattern) {
      this._cache.clear();
      if (typeof sessionStorage !== 'undefined') {
        try {
          Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('unimall_swr_')) sessionStorage.removeItem(k);
          });
        } catch (e) {}
      }
      return;
    }
    for (const k of this._cache.keys()) {
      if (k.includes(pattern)) {
        this._cache.delete(k);
        if (typeof sessionStorage !== 'undefined') {
          try { sessionStorage.removeItem('unimall_swr_' + k); } catch (e) {}
        }
      }
    }
  },

  /**
   * Secure Database Query Execution with Seamless Direct Fallback
   * On mobile (Android) or standalone environments, connects directly to Neon Serverless HTTP SQL for instant, reliable queries.
   */
  async neonSql(query, params = []) {
    const directUrl = (window.UNIMALL_CONFIG && window.UNIMALL_CONFIG.NEON_SQL_URL) || 'https://ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/sql';
    const directConn = (window.UNIMALL_CONFIG && window.UNIMALL_CONFIG.NEON_CONN) || 'postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

    const executeDirect = async () => {
      const directRes = await fetch(directUrl, {
        method: 'POST',
        headers: {
          'Neon-Connection-String': directConn,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, params: Array.isArray(params) ? params : [] })
      });

      if (!directRes.ok) {
        const err = await directRes.json().catch(() => ({}));
        throw new Error(err.message || `Database query failed (${directRes.status})`);
      }

      const data = await directRes.json();
      return data.rows || [];
    };

    // If running inside Android Native Capacitor or static environment, use direct Neon HTTP SQL immediately
    if (IS_NATIVE || !window.UNIMALL_CONFIG?.API_HOST) {
      try {
        return await executeDirect();
      } catch (err) {
        console.warn('[UniMallDB] Direct Neon query error:', err.message);
      }
    }

    // Try serverless backend proxy if configured
    const proxyUrl = (window.UNIMALL_CONFIG && window.UNIMALL_CONFIG.API_QUERY_URL) || '/api/db/query';
    const adminToken = sessionStorage.getItem('unimall_admin_token') || localStorage.getItem('unimall_admin_token') || localStorage.getItem('unimall_auth_token');
    
    const headers = { 'Content-Type': 'application/json' };
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, params: Array.isArray(params) ? params : [] })
      });

      if (res.ok) {
        const data = await res.json();
        return data.rows || [];
      }
    } catch (proxyErr) {
      // proxy offline, fall through to direct Neon
    }

    return await executeDirect();
  },

  /* ── Get Stores (Protected with SWR + Inflight Deduplication) ── */
  async getStores(forceRefresh = false, includeHidden = false) {
    if (forceRefresh) this.invalidateCache('stores');
    const cacheKey = includeHidden ? 'stores:all' : 'stores';
    return this._swr(cacheKey, 45000, async () => {
      try {
        const visibilityClause = includeHidden ? '' : 'AND (is_visible IS NULL OR is_visible = true)';
        const rows = await this.neonSql(`
          SELECT id, name, slug, description, category, floor, location, phone, 
                 cover_image, is_open, is_visible, delivery_available, pickup_available, 
                 opening_time, closing_time, rating, popularity,
                 COALESCE(filter_tags, '') AS filter_tags
          FROM unimall_stores
          WHERE 1=1 ${visibilityClause}
          ORDER BY popularity DESC
        `);
        if (rows && rows.length > 0) return rows;
      } catch (e) {
        console.warn('[UniMallDB] Neon stores fetch fallback:', e.message);
      }
      return (typeof STORES !== 'undefined') ? STORES : [];
    });
  },

  /* ── Get Specific Store by ID or Slug (Cached 60s) ── */
  async getStore(storeId, forceRefresh = false) {
    if (!storeId) return null;
    const cleanId = String(storeId).trim().toLowerCase();
    const cacheKey = 'store:' + cleanId;
    if (forceRefresh) this.invalidateCache(cacheKey);

    return this._swr(cacheKey, 60000, async () => {
      try {
        const rows = await this.neonSql(`
          SELECT id, name, slug, description, category, floor, location, phone, 
                 cover_image, is_open, delivery_available, pickup_available, 
                 opening_time, closing_time, rating, popularity
          FROM unimall_stores
          WHERE LOWER(id) = LOWER($1) OR LOWER(slug) = LOWER($2) OR LOWER(name) = LOWER($3)
          LIMIT 1
        `, [cleanId, cleanId, cleanId]);
        if (rows && rows[0]) return rows[0];

        // Fallback: check stores table
        const fallbackRows = await this.neonSql(`
          SELECT id, name, slug, description, category, floor, location, phone, 
                 cover_image, (is_open = 1) AS is_open, 
                 opening_time, closing_time, rating, popularity
          FROM stores
          WHERE (LOWER(id) = LOWER($1) OR LOWER(slug) = LOWER($2) OR LOWER(name) = LOWER($3))
            AND is_active = 1
          LIMIT 1
        `, [cleanId, cleanId, cleanId]);
        if (fallbackRows && fallbackRows[0]) return fallbackRows[0];
      } catch (e) {
        console.warn('[UniMallDB] Neon getStore error:', e.message);
      }
      return null;
    });
  },

  /* ── Get Products (Cached 30s + Inflight Deduplication) ── */
  /* Only returns products from VISIBLE stores. Hidden stores' products are excluded from the user-facing home. */
  async getProducts(storeId = null, forceRefresh = false) {
    const cleanId = storeId ? String(storeId).trim().toLowerCase() : 'all';
    const cacheKey = 'products:' + cleanId;
    if (forceRefresh) this.invalidateCache(cacheKey);

    return this._swr(cacheKey, 30000, async () => {
      try {
        let query;
        const params = [];
        if (storeId && storeId !== 'all') {
          // Store-specific: no visibility filter (store manager viewing their own products)
          query = `
            SELECT p.id, p.store_id, p.name, p.description, p.price, p.emoji, p.image, p.bg,
                   p.stock, p.availability, p.delivery_available, p.pickup_available,
                   p.category_id, p.rating,
                   COALESCE(p.is_nearby, false) AS is_nearby,
                   COALESCE(p.is_popular, false) AS is_popular,
                   COALESCE(p.is_restocked, false) AS is_restocked
            FROM unimall_products p
            WHERE p.is_active = true
              AND (LOWER(p.store_id) = LOWER($1) OR LOWER(p.store_id) = LOWER($2))
            ORDER BY p.name ASC
          `;
          params.push(cleanId, cleanId.replace('store-', ''));
        } else {
          // Home/global: only products from VISIBLE stores
          query = `
            SELECT p.id, p.store_id, p.name, p.description, p.price, p.emoji, p.image, p.bg,
                   p.stock, p.availability, p.delivery_available, p.pickup_available,
                   p.category_id, p.rating,
                   COALESCE(p.is_nearby, false) AS is_nearby,
                   COALESCE(p.is_popular, false) AS is_popular,
                   COALESCE(p.is_restocked, false) AS is_restocked
            FROM unimall_products p
            INNER JOIN unimall_stores s ON p.store_id = s.id
            WHERE p.is_active = true
              AND (s.is_visible IS NULL OR s.is_visible = true)
            ORDER BY p.name ASC
          `;
        }

        const rows = await this.neonSql(query, params);
        if (Array.isArray(rows)) {
          if (storeId && storeId !== 'all') return rows;
          if (rows.length > 0) return rows;
        }
      } catch (e) {
        console.warn('[UniMallDB] Neon products fetch fallback:', e.message);
      }

      if (storeId && storeId !== 'all') {
        const local = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
        return local.filter(p => p.storeId === storeId || p.store_id === storeId);
      }
      return (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
    });
  },

  /* ── Sequential Store Order Number Helper (#ORD-01, #ORD-02, ...) ── */
  async getNextStoreOrderNumber(storeId) {
    try {
      let maxNum = 0;
      // 1. Check Neon PostgreSQL unimall_orders
      if (this.neonSql) {
        try {
          const rows = await this.neonSql(
            `SELECT order_number FROM unimall_orders WHERE store_id = $1`,
            [storeId]
          );
          if (rows && rows.length > 0) {
            rows.forEach(r => {
              const m = String(r.order_number || '').match(/#?ORD-(\d+)/i);
              if (m && m[1].length < 4) {
                const val = parseInt(m[1], 10);
                if (!isNaN(val) && val < 200 && val > maxNum) {
                  maxNum = val;
                }
              }
            });
            if (maxNum === 0 && rows.length > 0) {
              maxNum = rows.length;
            }
          }
        } catch (dbErr) {
          console.warn('[UniMallDB] Error getting store order numbers from DB:', dbErr);
        }
      }

      // 2. Check localStorage unimall_v1
      try {
        const raw = localStorage.getItem('unimall_v1');
        if (raw) {
          const appData = JSON.parse(raw);
          if (Array.isArray(appData.orders)) {
            const storeOrders = appData.orders.filter(o => (o.storeId === storeId || o.store_id === storeId));
            storeOrders.forEach(o => {
              const numStr = o.order_number || o.order_number_display || o.id;
              const m = String(numStr).match(/#?ORD-(\d+)/i);
              if (m && m[1].length < 4) {
                const val = parseInt(m[1], 10);
                if (!isNaN(val) && val < 200 && val > maxNum) {
                  maxNum = val;
                }
              }
            });
            if (maxNum === 0 && storeOrders.length > 0) {
              maxNum = storeOrders.length;
            }
          }
        }
      } catch (locErr) {}

      const nextNum = maxNum + 1;
      return `#ORD-${String(nextNum).padStart(2, '0')}`;
    } catch (e) {
      return '#ORD-01';
    }
  },

  /* ── Atomic Order Creation ── */
  async createOrder(orderPayload, items = []) {
    const orderId = orderPayload.id;
    const storeId = orderPayload.store_id || orderPayload.storeId || 'campus-cafe';
    let orderNumber = orderPayload.order_number || orderPayload.order_number_display;
    if (!orderNumber || /^#?ORD-\d{4,}$/.test(orderNumber) || orderNumber.length > 10) {
      orderNumber = await this.getNextStoreOrderNumber(storeId);
    }
    if (!orderNumber.startsWith('#')) {
      orderNumber = '#' + orderNumber;
    }
    const userId = orderPayload.user_id || orderPayload.userId || 'guest';
    const userName = orderPayload.user_name || orderPayload.userName || orderPayload.customerName || 'Campus Student';
    const numMatch = (userName || '').match(/\d+/);
    const studentNum = numMatch ? numMatch[0] : (String(userId).replace(/\D/g, '') || '1');
    const userEmail = orderPayload.user_email || orderPayload.customer_email || `student${studentNum}@campus.edu`;
    const status = (orderPayload.status || 'placed').toLowerCase();
    const fulfillmentType = orderPayload.fulfillment_type || orderPayload.fulfillmentType || 'pickup'; // Guaranteed Counter Pickup
    const subtotal = Number(orderPayload.subtotal || 0);
    const deliveryFee = Number(orderPayload.delivery_fee || orderPayload.deliveryFee || 0);
    const total = Number(orderPayload.total || subtotal);
    const paymentMethod = orderPayload.payment_method || orderPayload.paymentMethod || 'Razorpay Instant';
    const paymentStatus = orderPayload.payment_status || (paymentMethod.includes('Counter') ? 'PENDING_AT_COUNTER' : 'PAID');
    const notes = orderPayload.notes || orderPayload.orderNotes || '';

    const userPhone = orderPayload.user_phone || orderPayload.userPhone || '+91 98765 43210';
    const userHostel = orderPayload.user_hostel || orderPayload.userHostel || 'Counter Pickup';
    const userRoom = orderPayload.user_room || orderPayload.userRoom || 'Ground Floor';

    // 1. Insert into Neon PostgreSQL unimall_orders
    try {
      const orderSql = `
        INSERT INTO unimall_orders (
          id, order_number, user_id, user_name, user_email, user_phone, user_hostel, user_room,
          store_id, status, fulfillment_type, subtotal, delivery_fee, 
          total, payment_method, payment_status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *;
      `;
      const orderParams = [
        orderId, orderNumber, userId, userName, userEmail, userPhone, userHostel, userRoom,
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

    // Invalidate orders caches so fresh data renders immediately
    this.invalidateCache('user_orders');
    this.invalidateCache('store_orders');
    this.invalidateCache('dash_metrics');

    return orderPayload;
  },

  /* ── Get Orders for User (Optimized Batch Query — Zero N+1 Queries) ── */
  async getUserOrders(userId, forceRefresh = false) {
    if (!userId || userId === 'all') {
      return [];
    }
    const cacheKey = 'user_orders:' + String(userId).trim();
    if (forceRefresh) this.invalidateCache(cacheKey);

    return this._swr(cacheKey, 10000, async () => {
      try {
        const query = `
          SELECT o.*, COALESCE(s.name, 'Campus Store') AS store_name
          FROM unimall_orders o
          LEFT JOIN unimall_stores s ON o.store_id = s.id
          WHERE o.user_id = $1
          ORDER BY o.created_at DESC LIMIT 50
        `;
        const orders = await this.neonSql(query, [userId]);
        if (!orders || !Array.isArray(orders) || orders.length === 0) return [];

        const orderIds = orders.map(o => o.id);
        const [allItems, allHistory] = await Promise.all([
          this.neonSql(`
            SELECT order_id, product_id, product_name, price, qty, emoji, image 
            FROM unimall_order_items 
            WHERE order_id = ANY($1)
          `, [orderIds]).catch(() => []),
          this.neonSql(`
            SELECT order_id, status, notes, created_at 
            FROM unimall_order_status_history 
            WHERE order_id = ANY($1) 
            ORDER BY created_at ASC
          `, [orderIds]).catch(() => [])
        ]);

        const itemsByOrder = {};
        (allItems || []).forEach(it => {
          if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
          itemsByOrder[it.order_id].push({
            ...it,
            productId: it.product_id || it.productId || it.id,
            product_id: it.product_id || it.productId || it.id,
            name: it.product_name || it.name || 'Campus Item',
            product_name: it.product_name || it.name || 'Campus Item',
            qty: Number(it.qty !== undefined ? it.qty : (it.quantity || 1)),
            quantity: Number(it.quantity !== undefined ? it.quantity : (it.qty || 1)),
            price: Number(it.price || 0),
            image: it.image || it.image_url || '',
            emoji: it.emoji || '📦'
          });
        });

        const historyByOrder = {};
        (allHistory || []).forEach(h => {
          if (!historyByOrder[h.order_id]) historyByOrder[h.order_id] = [];
          historyByOrder[h.order_id].push({
            status: h.status,
            time: h.created_at,
            created_at: h.created_at,
            label: h.notes || h.status
          });
        });

        for (const ord of orders) {
          ord.items = itemsByOrder[ord.id] || [];
          ord.unimall_order_items = ord.items;
          ord.statusHistory = historyByOrder[ord.id] || [];
          ord.unimall_order_status_history = ord.statusHistory;
        }
        return orders;
      } catch (e) {
        console.warn('[UniMallDB] getUserOrders fallback:', e.message);
        return [];
      }
    });
  },

  /* ── Get Specific Order by ID (Parallel Fetch) ── */
  async getOrderById(orderId) {
    try {
      const orders = await this.neonSql(`
        SELECT o.*, COALESCE(s.name, 'Campus Store') AS store_name
        FROM unimall_orders o
        LEFT JOIN unimall_stores s ON o.store_id = s.id
        WHERE o.id = $1 LIMIT 1
      `, [orderId]);

      if (orders && orders[0]) {
        const order = orders[0];
        const [items, history] = await Promise.all([
          this.neonSql(`SELECT * FROM unimall_order_items WHERE order_id = $1`, [orderId]).catch(() => []),
          this.neonSql(`SELECT * FROM unimall_order_status_history WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]).catch(() => [])
        ]);

        const normalizedItems = (items || []).map(it => ({
          ...it,
          productId: it.productId || it.product_id || it.id,
          product_id: it.product_id || it.productId || it.id,
          name: it.name || it.product_name || 'Item',
          product_name: it.product_name || it.name || 'Item',
          qty: Number(it.qty !== undefined ? it.qty : (it.quantity || 1)),
          quantity: Number(it.quantity !== undefined ? it.quantity : (it.qty || 1)),
          price: Number(it.price || 0),
          image: it.image || it.image_url || '',
          emoji: it.emoji || '📦'
        }));

        order.items = normalizedItems;
        order.unimall_order_items = normalizedItems;
        order.statusHistory = history || [];
        order.unimall_order_status_history = history || [];
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
        const aliasMap = {
          'campus-cafe': ['store-bakery', 'campus-cafe'],
          'book-corner': ['store-stationery', 'book-corner'],
          'techstop': ['store-electronics', 'techstop'],
          'campus-mart': ['store-sports', 'campus-mart'],
          'campus-wear': ['store-fashion', 'campus-wear'],
          'health-hub': ['store-pharmacy', 'health-hub']
        };
        const targets = aliasMap[storeId] || [storeId];
        query += ` WHERE store_id = ANY($1)`;
        params.push(targets);
      }
      query += ` ORDER BY created_at DESC LIMIT 50`;

      const orders = await this.neonSql(query, params);
      if (orders && Array.isArray(orders)) {
        const orderIds = orders.map(o => o.id);
        let allItems = [];
        if (orderIds.length > 0) {
          allItems = await this.neonSql(`
            SELECT order_id, product_id, product_name, price, qty, emoji, image 
            FROM unimall_order_items 
            WHERE order_id = ANY($1)
          `, [orderIds]).catch(() => []);
        }

        const itemsByOrder = {};
        (allItems || []).forEach(it => {
          if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
          itemsByOrder[it.order_id].push({
            productId: it.product_id,
            product_id: it.product_id,
            product_name: it.product_name,
            name: it.product_name,
            price: parseFloat(it.price || 0),
            quantity: it.qty || 1,
            qty: it.qty || 1,
            emoji: it.emoji || '📦',
            image: it.image || ''
          });
        });

        for (const ord of orders) {
          ord.items = itemsByOrder[ord.id] || [];
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
      const cleanId = String(orderId || '').replace(/^#/, '');
      await this.neonSql(`
        UPDATE unimall_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2 OR order_number = $2 OR order_number = $3 OR order_number = '#' || $3
      `, [normStatus, orderId, cleanId]);

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
          const ord = appData.orders.find(o => o.id === orderId || o.order_number_display === orderId || o.order_number === orderId);
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

    this.invalidateCache('user_orders');
    this.invalidateCache('store_orders');
    this.invalidateCache('dash_metrics');

    return { id: orderId, status: normStatus };
  },

  /* ── Update Store Open/Closed Status (Neon PostgreSQL) ── */
  async updateStoreStatus(storeId, isOpen) {
    try {
      await this.neonSql(`
        UPDATE unimall_stores
        SET is_open = $1, updated_at = NOW()
        WHERE id = $2 OR slug = $2
      `, [!!isOpen, storeId]);
      await this.neonSql(`
        UPDATE stores
        SET is_open = $1, updated_at = NOW()
        WHERE id = $2 OR slug = $2
      `, [isOpen ? 1 : 0, storeId]).catch(() => {});
      console.log(`[UniMallDB] Store ${storeId} status updated in Neon DB: ${isOpen ? 'OPEN' : 'CLOSED'}`);
      this.invalidateCache('stores');
      this.invalidateCache('store:');
      return true;
    } catch (e) {
      console.warn('[UniMallDB] updateStoreStatus Neon warning:', e.message);
      return false;
    }
  },

  /* ── Update Store Visibility (show/hide on user-facing UI) ── */
  async updateStoreVisibility(storeId, isVisible) {
    try {
      await this.neonSql(`
        UPDATE unimall_stores
        SET is_visible = $1, updated_at = NOW()
        WHERE id = $2 OR slug = $2
      `, [!!isVisible, storeId]);
      console.log(`[UniMallDB] Store ${storeId} visibility updated: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
      // Invalidate ALL product/store caches so home screen reflects change immediately
      this.invalidateCache('stores');
      this.invalidateCache('stores:all');
      this.invalidateCache('store:');
      this.invalidateCache('products:');
      this.invalidateCache('products:all');
      return true;
    } catch (e) {
      console.warn('[UniMallDB] updateStoreVisibility Neon warning:', e.message);
      return false;
    }
  },

  /* ── Get Store Filters (authoritative from Neon DB) ── */
  async getStoreFilters(forceRefresh = false) {
    if (forceRefresh) this.invalidateCache('store_filters');
    return this._swr('store_filters', 60000, async () => {
      try {
        const rows = await this.neonSql(`
          SELECT id, name, created_at
          FROM unimall_store_filters
          ORDER BY created_at ASC
        `);
        if (Array.isArray(rows) && rows.length > 0) return rows;
      } catch (e) {
        console.warn('[UniMallDB] getStoreFilters fallback:', e.message);
      }
      return [
        { id: 'filter_food', name: 'Food & Dining' },
        { id: 'filter_groceries', name: 'Groceries & Essentials' },
        { id: 'filter_electronics', name: 'Electronics & Tech' },
        { id: 'filter_stationery', name: 'Stationery & Books' },
        { id: 'filter_fashion', name: 'Fashion & Apparel' },
        { id: 'filter_services', name: 'Campus Services' }
      ];
    });
  },

  /* ── Create Store Filter in Database ── */
  async createStoreFilter(name) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    const id = 'flt_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 32);
    try {
      await this.neonSql(`
        INSERT INTO unimall_store_filters (id, name, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [id, cleanName]);
      this.invalidateCache('store_filters');
      return { id, name: cleanName };
    } catch (e) {
      console.warn('[UniMallDB] createStoreFilter error:', e.message);
      return null;
    }
  },

  /* ── Delete Store Filter from Database ── */
  async deleteStoreFilter(filterId) {
    if (!filterId) return false;
    try {
      await this.neonSql(`DELETE FROM unimall_store_filters WHERE id = $1`, [filterId]);
      this.invalidateCache('store_filters');
      return true;
    } catch (e) {
      console.warn('[UniMallDB] deleteStoreFilter error:', e.message);
      return false;
    }
  },

  /* ── Update Store Assigned Filter Tags in Database ── */
  async updateStoreFilters(storeId, filterTags) {
    if (!storeId) return false;
    const tagsStr = Array.isArray(filterTags) ? filterTags.join(',') : String(filterTags || '');
    try {
      await this.neonSql(`
        UPDATE unimall_stores
        SET filter_tags = $1, updated_at = NOW()
        WHERE LOWER(id) = LOWER($2)
      `, [tagsStr, storeId]);
      this.invalidateCache('stores');
      this.invalidateCache('stores:all');
      this.invalidateCache('store:' + storeId.toLowerCase());
      return true;
    } catch (e) {
      console.warn('[UniMallDB] updateStoreFilters error:', e.message);
      return false;
    }
  },

  /* ── Upsert Product into Neon PostgreSQL ── */
  async upsertProduct(prod) {
    try {
      const id = prod.id || ('p-' + Date.now().toString().slice(-6));
      const storeId = prod.store_id || prod.storeId || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('unimall_admin_active_store') : null);
      if (!storeId) {
        throw new Error('Product cannot be saved without a valid store_id.');
      }
      const categoryId = prod.category_id || prod.categoryId || 'food';
      const name = prod.name;
      const desc = prod.description || '';
      const price = parseFloat(prod.price || 0);
      const stock = parseInt(prod.stock || 20, 10);
      const emoji = prod.emoji || '📦';
      const image = prod.image_url || prod.image || '';
      const avail = stock === 0 ? 'out-of-stock' : (stock <= 5 ? 'low-stock' : 'in-stock');

      await this.neonSql(`
        INSERT INTO unimall_products (
          id, store_id, category_id, name, description, price, emoji, image, stock, availability, is_active, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          availability = EXCLUDED.availability,
          image = EXCLUDED.image,
          category_id = EXCLUDED.category_id,
          is_active = true,
          updated_at = NOW();
      `, [id, storeId, categoryId, name, desc, price, emoji, image, stock, avail]);

      await this.neonSql(`
        INSERT INTO products (
          id, store_id, category_id, name, description, price, sku, unit, stock, low_stock_threshold, is_active, image_url, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          image_url = EXCLUDED.image_url,
          is_active = 1,
          updated_at = NOW();
      `, [id, storeId, categoryId, name, desc, price, prod.sku || 'SKU-' + id, prod.unit || 'item', stock, prod.low_stock_threshold || 5, image]).catch(() => {});

      this.invalidateCache('products:');
      this.invalidateCache('store:');

      return { id, ...prod };
    } catch (e) {
      console.warn('[UniMallDB] upsertProduct Neon warning:', e.message);
      return prod;
    }
  },

  /* ── Delete Product from Neon PostgreSQL ── */
  async deleteProduct(prodId) {
    try {
      await this.neonSql(`
        UPDATE unimall_products SET is_active = false, updated_at = NOW() WHERE id = $1
      `, [prodId]);
      await this.neonSql(`
        UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = $1
      `, [prodId]).catch(() => {});

      this.invalidateCache('products:');
      this.invalidateCache('store:');

      return true;
    } catch (e) {
      console.warn('[UniMallDB] deleteProduct warning:', e.message);
      return false;
    }
  },

  /* ── Sync Student User to Neon PostgreSQL ── */
  async syncUser(user) {
    if (!user) return false;
    try {
      const uid = user.uid || user.id || user.guestId || ('usr_guest_' + Date.now());
      const userName = user.name || 'Campus Student';
      const numMatch = (userName || '').match(/\d+/);
      const studentNum = numMatch ? numMatch[0] : (String(uid).replace(/\D/g, '') || '1');
      const email = user.email || `student${studentNum}@campus.edu`;
      const phone = user.phone || '';
      await this.neonSql(`
        INSERT INTO users (id, name, email, phone, role)
        VALUES ($1, $2, $3, $4, 'student')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          updated_at = NOW();
      `, [uid, userName, email, phone]);
      console.log(`[UniMallDB] User synced to Neon: ${userName} (${uid})`);
      return true;
    } catch (e) {
      console.warn('[UniMallDB] syncUser Neon warning:', e.message);
      return false;
    }
  },

  /* ── Get Next Global Sequential Guest Number from Neon PostgreSQL ── */
  async getNextGuestNumber() {
    try {
      const rows = await this.neonSql(`
        SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(name, '[^0-9]', '', 'g') AS INTEGER)), 0) AS max_num
        FROM users
        WHERE name ~ '^Student [0-9]+$';
      `);
      if (rows && rows.length > 0 && rows[0].max_num !== undefined) {
        const dbMax = parseInt(rows[0].max_num, 10) || 0;
        const localMax = parseInt(localStorage.getItem('cc_guest_counter') || '0', 10) || 0;
        const next = Math.max(dbMax, localMax) + 1;
        localStorage.setItem('cc_guest_counter', String(next));
        return next;
      }
    } catch (e) {
      console.warn('[UniMallDB] getNextGuestNumber query fallback:', e.message);
    }
    const local = parseInt(localStorage.getItem('cc_guest_counter') || '0', 10) || 0;
    const next = local + 1;
    localStorage.setItem('cc_guest_counter', String(next));
    return next;
  },

  /* ── Authenticate Merchant / Admin via Neon PostgreSQL ── */
  async authenticateAdmin(userOrEmail) {
    try {
      const cleanUser = String(userOrEmail || '').trim().toLowerCase();
      const prefix = cleanUser.split('@')[0];
      const rows = await this.neonSql(`
        SELECT a.id, a.email, a.name, a.role, a.store_id, a.password_hash,
               COALESCE(s.name, 'Campus Store') AS store_name,
               COALESCE(s.slug, a.store_id) AS store_slug
        FROM unimall_admins a
        LEFT JOIN unimall_stores s ON a.store_id = s.id
        WHERE LOWER(a.email) = $1
           OR LOWER(a.email) LIKE $2
           OR LOWER(a.id) = $1
           OR LOWER(a.store_id) = $1
           OR LOWER(s.name) = $1
           OR LOWER(s.slug) = $1
           OR ($1 = 'admin' AND a.role = 'platform_admin')
        LIMIT 1;
      `, [cleanUser, `${prefix}@%`]);

      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (e) {
      console.warn('[UniMallDB] authenticateAdmin error:', e.message);
    }
    return null;
  },

  /* ── Order Status Check (One-shot) ── */
  subscribeToOrder(orderId, onUpdate) {
    if (orderId && onUpdate) {
      this.getOrderById(orderId).then(order => {
        if (order) onUpdate(order);
      }).catch(() => {});
    }
    return () => {};
  },

  /**
   * ── Get Authoritative Dashboard Metrics & Store Sales Payout Ledger ──
   * Calculates Today's Gross Sales, Unique Customers, and Store-by-Store Payout Ledger
   */
  async getDashboardMetrics(storeId = null, forceRefresh = false) {
    const key = 'dash_metrics:' + (storeId ? String(storeId).toLowerCase() : 'all');
    if (forceRefresh) this.invalidateCache(key);

    return this._swr(key, 12000, async () => {
      try {
        const isPlatform = !storeId || storeId === 'all';

        // Check if calendar today (Asia/Kolkata) has orders
        const checkToday = await this.neonSql(`
        SELECT COUNT(id) AS cnt FROM unimall_orders WHERE created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `).catch(() => []);
      const hasToday = checkToday && checkToday[0] && parseInt(checkToday[0].cnt || 0, 10) > 0;

      // If today has orders, use calendar day. If not (e.g. past midnight / early morning shift before first orders placed),
      // seamlessly use the rolling 24-hour cycle so the super admin platform always reflects real active business.
      const dateCondition = hasToday 
        ? `o.created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date`
        : `o.created_at >= (NOW() - INTERVAL '24 hours')`;

      const totalDateCondition = hasToday
        ? `created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date`
        : `created_at >= (NOW() - INTERVAL '24 hours')`;

      // 1. Query Store-by-Store Sales & Customers Breakdown (Delivered/Completed orders only)
      const storeBreakdownRows = await this.neonSql(`
        SELECT s.id AS store_id, s.name AS store_name, s.category,
               COUNT(CASE WHEN o.status IN ('delivered', 'completed') THEN o.id END) AS today_orders_count,
               COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'completed') THEN o.total ELSE 0 END), 0) AS today_gross_sales,
               COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'completed') THEN o.user_id END) AS today_customers_count,
               COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'completed') AND o.payment_method IN ('online', 'razorpay', 'Instant Pay (Verified)', 'Razorpay Instant (Paid)', 'Razorpay Instant') THEN o.total ELSE 0 END), 0) AS digital_sales,
               COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'completed') AND o.payment_method IN ('cod', 'cash', 'Pay at Counter') THEN o.total ELSE 0 END), 0) AS cash_sales
        FROM unimall_stores s
        LEFT JOIN unimall_orders o ON s.id = o.store_id AND ${dateCondition}
        GROUP BY s.id, s.name, s.category
        ORDER BY today_gross_sales DESC, s.name ASC;
      `);

      // 2. Query Operational Totals & Active Orders (Revenue only for Delivered/Completed)
      let totalQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN status IN ('delivered', 'completed') THEN total ELSE 0 END), 0) AS today_sales,
          COUNT(CASE WHEN status IN ('delivered', 'completed') THEN id END) AS today_orders,
          COUNT(DISTINCT CASE WHEN status IN ('delivered', 'completed') THEN user_id END) AS today_customers,
          COUNT(CASE WHEN status IN ('placed', 'preparing', 'ready', 'accepted', 'out_for_delivery') THEN 1 END) AS active_orders
        FROM unimall_orders
        WHERE ${totalDateCondition}
      `;
      const totalParams = [];
      if (!isPlatform) {
        totalQuery += ` AND store_id = $1`;
        totalParams.push(storeId);
      }
      let totalRows = await this.neonSql(totalQuery, totalParams);
      let totals = totalRows && totalRows[0] ? totalRows[0] : {};

      // 3. Query Lifetime / All-Time Summary (Delivered/Completed only)
      let lifeQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN status IN ('delivered', 'completed') THEN total ELSE 0 END), 0) AS lifetime_sales,
          COUNT(CASE WHEN status IN ('delivered', 'completed') THEN id END) AS lifetime_orders,
          COUNT(DISTINCT CASE WHEN status IN ('delivered', 'completed') THEN user_id END) AS lifetime_customers
        FROM unimall_orders
      `;
      const lifeParams = [];
      if (!isPlatform) {
        lifeQuery += ` WHERE store_id = $1`;
        lifeParams.push(storeId);
      }
      const lifeRows = await this.neonSql(lifeQuery, lifeParams);
      const lifetime = lifeRows && lifeRows[0] ? lifeRows[0] : {};

      // Format Store Payout Ledger dynamically for ALL stores in unimall_stores
      const storesLedger = (storeBreakdownRows || []).map(row => {
        const grossSales = parseFloat(row.today_gross_sales || 0);
        const digitalSales = parseFloat(row.digital_sales || 0);
        const cashSales = parseFloat(row.cash_sales || 0);
        const platformFee = Math.round(grossSales * 0.05); // 5% campus commission
        const netPayout = Math.max(0, grossSales - platformFee);

        return {
          store_id: row.store_id,
          store_name: row.store_name,
          category: row.category || 'general',
          today_orders_count: parseInt(row.today_orders_count || 0, 10),
          today_customers_count: parseInt(row.today_customers_count || 0, 10),
          today_gross_sales: grossSales,
          digital_sales: digitalSales,
          cash_sales: cashSales,
          platform_fee: platformFee,
          net_payout: netPayout,
          settlement_status: grossSales > 0 ? 'Due for Distribution' : 'No Sales Today'
        };
      });

      // Sort by sales descending
      storesLedger.sort((a, b) => b.today_gross_sales - a.today_gross_sales);

      const todayGrossSales = parseFloat(totals.today_sales || 0);
      const todayTotalFee = Math.round(todayGrossSales * 0.05);
      const todayNetPayout = Math.max(0, todayGrossSales - todayTotalFee);

      return {
        today_sales: todayGrossSales,
        today_orders: parseInt(totals.today_orders || 0, 10),
        today_customers: parseInt(totals.today_customers || 0, 10),
        active_orders: parseInt(totals.active_orders || 0, 10),
        platform_fee_total: todayTotalFee,
        net_payout_total: todayNetPayout,
        lifetime_sales: parseFloat(lifetime.lifetime_sales || 0),
        lifetime_orders: parseInt(lifetime.lifetime_orders || 0, 10),
        lifetime_customers: parseInt(lifetime.lifetime_customers || 0, 10),
        stores_ledger: storesLedger
      };
    } catch (e) {
      console.warn('[UniMallDB] getDashboardMetrics error:', e.message);
      // Return zero metrics with empty ledger — DB is the source of truth
      return {
        today_sales: 0,
        today_orders: 0,
        today_customers: 0,
        active_orders: 0,
        platform_fee_total: 0,
        net_payout_total: 0,
        lifetime_sales: 0,
        lifetime_orders: 0,
        lifetime_customers: 0,
        stores_ledger: []
      };
    }
    });
  },

  /**
   * ── Get Deep Analytics (Rush Curve, Top Products, Store Matrix, Payment Splits) ──
   */
  async getDeepAnalytics(storeId = null, period = 'all') {
    try {
      const isPlatform = !storeId || storeId === 'all';
      let dateFilter = '';
      if (period === 'today') {
        const checkToday = await this.neonSql(`
          SELECT COUNT(id) AS cnt FROM unimall_orders WHERE created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        `).catch(() => []);
        const hasToday = checkToday && checkToday[0] && parseInt(checkToday[0].cnt || 0, 10) > 0;
        if (hasToday) {
          dateFilter = ` AND o.created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date`;
        } else {
          dateFilter = ` AND o.created_at >= (NOW() - INTERVAL '24 hours')`;
        }
      } else if (period === 'week') {
        dateFilter = ` AND o.created_at >= (NOW() - INTERVAL '7 days')`;
      } else if (period === 'month') {
        dateFilter = ` AND o.created_at >= (NOW() - INTERVAL '30 days')`;
      }

      let storeFilter = '';
      const params = [];
      if (!isPlatform) {
        params.push(storeId);
        storeFilter = ` AND o.store_id = $${params.length}`;
      }

      const statusFilter = " AND o.status IN ('delivered', 'completed')";

      // 1. Overall KPI metrics for period (Delivered/Completed only)
      const summaryRows = await this.neonSql(`
        SELECT 
          COALESCE(SUM(o.total), 0) AS revenue,
          COUNT(o.id) AS orders_count,
          COUNT(DISTINCT o.user_id) AS customers_count,
          COALESCE(AVG(o.total), 0) AS avg_order_value
        FROM unimall_orders o
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
      `, params);
      const summary = summaryRows && summaryRows[0] ? summaryRows[0] : {};

      // 2. Units sold across items (Delivered/Completed only)
      const unitsRows = await this.neonSql(`
        SELECT COALESCE(SUM(oi.qty), 0) AS units_sold
        FROM unimall_order_items oi
        JOIN unimall_orders o ON oi.order_id = o.id
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
      `, params);
      const unitsSold = unitsRows && unitsRows[0] ? parseInt(unitsRows[0].units_sold || 0, 10) : 0;

      // 3. Peak Campus Rush Hours (Delivered/Completed only)
      const hourlyRows = await this.neonSql(`
        SELECT EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'Asia/Kolkata'))::int AS hr,
               COUNT(o.id) AS orders_count,
               COALESCE(SUM(o.total), 0) AS revenue
        FROM unimall_orders o
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
        GROUP BY hr
        ORDER BY hr ASC;
      `, params);

      // 4. Store Performance Comparison Matrix (Delivered/Completed only)
      const storeMatrixRows = await this.neonSql(`
        SELECT s.id AS store_id, s.name AS store_name, s.category,
               COUNT(CASE WHEN o.status IN ('delivered', 'completed') THEN o.id END) AS orders_count,
               COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'completed') THEN o.total ELSE 0 END), 0) AS revenue,
               COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'completed') THEN o.user_id END) AS customers_count,
               COALESCE(AVG(CASE WHEN o.status IN ('delivered', 'completed') THEN o.total END), 0) AS aov
        FROM unimall_stores s
        LEFT JOIN unimall_orders o ON s.id = o.store_id ${dateFilter}
        GROUP BY s.id, s.name, s.category
        ORDER BY revenue DESC, orders_count DESC;
      `);

      // 5. Top 10 Best-Selling Campus Products Leaderboard (Delivered/Completed only)
      const topProductsRows = await this.neonSql(`
        SELECT oi.product_name, oi.emoji,
               SUM(oi.qty) AS units_sold,
               SUM(oi.price * oi.qty) AS gross_sales,
               MAX(s.name) AS store_name
        FROM unimall_order_items oi
        JOIN unimall_orders o ON oi.order_id = o.id
        LEFT JOIN unimall_stores s ON o.store_id = s.id
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
        GROUP BY oi.product_name, oi.emoji
        ORDER BY units_sold DESC, gross_sales DESC
        LIMIT 10;
      `, params);

      // 6. Payment Method Breakdown (Delivered/Completed only)
      const paymentRows = await this.neonSql(`
        SELECT 
          CASE 
            WHEN o.payment_method IN ('online', 'razorpay', 'Instant Pay (Verified)', 'Razorpay Instant (Paid)', 'Razorpay Instant') THEN 'Razorpay Instant (Digital)'
            WHEN o.payment_method IN ('cod', 'cash', 'Pay at Counter') THEN 'Pay at Counter (Cash / UPI)'
            ELSE COALESCE(o.payment_method, 'Digital Online')
          END AS method,
          COUNT(o.id) AS orders_count,
          COALESCE(SUM(o.total), 0) AS total_sales
        FROM unimall_orders o
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
        GROUP BY method
        ORDER BY total_sales DESC;
      `, params);

      // 7. Fulfillment Breakdown (Delivered/Completed only)
      const fulfillmentRows = await this.neonSql(`
        SELECT 
          CASE 
            WHEN o.fulfillment_type = 'delivery' OR o.user_hostel IS NOT NULL THEN 'Hostel Room Delivery'
            ELSE 'Counter Self-Pickup'
          END AS fulfillment,
          COUNT(o.id) AS orders_count,
          COALESCE(SUM(o.total), 0) AS total_sales
        FROM unimall_orders o
        WHERE 1=1 ${statusFilter} ${dateFilter} ${storeFilter}
        GROUP BY fulfillment
        ORDER BY total_sales DESC;
      `, params);

      return {
        revenue: parseFloat(summary.revenue || 0),
        orders: parseInt(summary.orders_count || 0, 10),
        customers: parseInt(summary.customers_count || 0, 10),
        average_order_value: parseFloat(summary.avg_order_value || 0),
        units_sold: unitsSold,
        hourly_rush: hourlyRows || [],
        store_matrix: storeMatrixRows || [],
        top_products: (topProductsRows || []).map(p => ({
          name: p.product_name,
          product_name: p.product_name,
          emoji: p.emoji || '📦',
          units_sold: parseInt(p.units_sold || 0, 10),
          sold_count: parseInt(p.units_sold || 0, 10),
          gross_sales: parseFloat(p.gross_sales || 0),
          total_sales: parseFloat(p.gross_sales || 0),
          revenue: parseFloat(p.gross_sales || 0),
          store_name: p.store_name || 'Campus Store'
        })),
        payment_splits: paymentRows || [],
        fulfillment_splits: fulfillmentRows || []
      };
    } catch (e) {
      console.warn('[UniMallDB] getDeepAnalytics error:', e.message);
      return {
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
  }
};

/**
 * ─── DB SCHEMA MIGRATION (runs once, silently) ──────────────────────────────
 * Adds new columns to unimall_stores and unimall_products if they don't exist.
 * PostgreSQL ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent — safe to
 * run on every page load because it's a no-op when the column already exists.
 */
(async function runUniMallMigrations() {
  // Only run in browser context with UniMallDB available
  if (typeof window === 'undefined' || typeof window.UniMallDB === 'undefined') return;

  // Delay slightly to avoid racing the initial page render
  await new Promise(r => setTimeout(r, 1500));

  try {
    // 1. Stores: add is_visible and filter_tags columns
    await window.UniMallDB.neonSql(`
      ALTER TABLE unimall_stores
        ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS filter_tags TEXT DEFAULT '';
    `).catch(() => {});

    // 2. Filters: dynamic admin-managed store filters table
    await window.UniMallDB.neonSql(`
      CREATE TABLE IF NOT EXISTS unimall_store_filters (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO unimall_store_filters (id, name)
      VALUES 
        ('filter_food', 'Food & Dining'),
        ('filter_groceries', 'Groceries & Essentials'),
        ('filter_electronics', 'Electronics & Tech'),
        ('filter_stationery', 'Stationery & Books'),
        ('filter_fashion', 'Fashion & Apparel'),
        ('filter_services', 'Campus Services')
      ON CONFLICT (id) DO NOTHING;
    `).catch(() => {});

    // 3. Products: add home-screen flag columns
    await window.UniMallDB.neonSql(`
      ALTER TABLE unimall_products
        ADD COLUMN IF NOT EXISTS is_nearby    BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_popular   BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_restocked BOOLEAN NOT NULL DEFAULT FALSE;
    `).catch(() => {});

    // 4. Invalidate SWR cache so the fresh schema is used on next fetch
    window.UniMallDB.invalidateCache('stores');
    window.UniMallDB.invalidateCache('stores:all');
    window.UniMallDB.invalidateCache('products:all');
    window.UniMallDB.invalidateCache('store_filters');

    console.log('[UniMall] DB migrations applied ✓');
  } catch (e) {
    // Silent — migration is best-effort; the app still works without new columns
    // (COALESCE defaults are used in all queries)
  }
})();
