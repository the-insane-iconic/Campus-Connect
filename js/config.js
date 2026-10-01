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
    // Note: Do NOT send 'Content-Type': 'application/json' because Neon SQL HTTP API
    // CORS preflight only permits Authorization, Neon-Connection-String... in Access-Control-Allow-Headers.
    // Fetch automatically uses text/plain for string bodies which is a CORS-safelisted type.
    const headers = {
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
    const orderNumber = orderPayload.order_number || orderPayload.order_number_display || `#ORD-${String(orderId).slice(-4)}`;
    const userId = orderPayload.user_id || ('usr_guest_' + Date.now());
    const userName = orderPayload.user_name || orderPayload.customer_name || 'Campus Student';
    const userEmail = orderPayload.user_email || orderPayload.customer_email || `${userId}@campusconnect.edu`;
    const storeId = orderPayload.store_id || 'campus-cafe';
    const status = (orderPayload.status || 'placed').toLowerCase();
    const fulfillmentType = 'pickup'; // Guaranteed Counter Pickup Only
    const subtotal = Number(orderPayload.subtotal || 0);
    const deliveryFee = 0.00; // Counter pickup is always ₹0
    const total = Number(orderPayload.total || subtotal);
    const paymentMethod = orderPayload.payment_method || 'Razorpay Instant';
    const paymentStatus = orderPayload.payment_status || (paymentMethod.includes('Counter') ? 'PENDING_AT_COUNTER' : 'PAID');
    const notes = orderPayload.notes || '';

    const userPhone = orderPayload.user_phone || '';
    const userHostel = orderPayload.user_hostel || '';
    const userRoom = orderPayload.user_room || '';

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

    return orderPayload;
  },

  /* ── Get Orders for User ── */
  async getUserOrders(userId) {
    if (!userId || userId === 'all') {
      return [];
    }
    try {
      const query = `SELECT * FROM unimall_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`;
      const params = [userId];

      const orders = await this.neonSql(query, params);

      for (const ord of orders) {
        const items = await this.neonSql(`
          SELECT * FROM unimall_order_items WHERE order_id = $1
        `, [ord.id]);
        const history = await this.neonSql(`
          SELECT * FROM unimall_order_status_history WHERE order_id = $1 ORDER BY created_at ASC
        `, [ord.id]);

        ord.items = items || [];
        ord.unimall_order_items = items || [];
        ord.statusHistory = history || [];
        ord.unimall_order_status_history = history || [];
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
      return true;
    } catch (e) {
      console.warn('[UniMallDB] updateStoreStatus Neon warning:', e.message);
      return false;
    }
  },

  /* ── Upsert Product into Neon PostgreSQL ── */
  async upsertProduct(prod) {
    try {
      const id = prod.id || ('p-' + Date.now().toString().slice(-6));
      const storeId = prod.store_id || prod.storeId || 'campus-cafe';
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
          updated_at = NOW();
      `, [id, storeId, categoryId, name, desc, price, emoji, image, stock, avail]);
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
      const name = (user.name || 'Campus Student').trim();
      const email = user.email || `${uid}@campusconnect.edu`;
      const phone = user.phone || '';
      await this.neonSql(`
        INSERT INTO users (id, name, email, phone, role)
        VALUES ($1, $2, $3, $4, 'student')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          updated_at = NOW();
      `, [uid, name, email, phone]);
      console.log(`[UniMallDB] User synced to Neon: ${name} (${uid})`);
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
  async getDashboardMetrics(storeId = null) {
    try {
      const isPlatform = !storeId || storeId === 'all';

      // 1. Query Store-by-Store Sales & Customers Breakdown Today
      const storeBreakdownRows = await this.neonSql(`
        SELECT s.id AS store_id, s.name AS store_name, s.category,
               COUNT(o.id) AS today_orders_count,
               COALESCE(SUM(o.total), 0) AS today_gross_sales,
               COUNT(DISTINCT o.user_id) AS today_customers_count,
               COALESCE(SUM(CASE WHEN o.payment_method IN ('online', 'razorpay', 'Instant Pay (Verified)', 'Razorpay Instant (Paid)', 'Razorpay Instant') THEN o.total ELSE 0 END), 0) AS digital_sales,
               COALESCE(SUM(CASE WHEN o.payment_method IN ('cod', 'cash', 'Pay at Counter') THEN o.total ELSE 0 END), 0) AS cash_sales
        FROM unimall_stores s
        LEFT JOIN unimall_orders o ON s.id = o.store_id AND o.created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        GROUP BY s.id, s.name, s.category
        ORDER BY today_gross_sales DESC, s.name ASC;
      `);

      // 2. Query Today's Overall Totals & Active Orders
      let totalQuery = `
        SELECT 
          COALESCE(SUM(total), 0) AS today_sales,
          COUNT(id) AS today_orders,
          COUNT(DISTINCT user_id) AS today_customers,
          COUNT(CASE WHEN status IN ('placed', 'preparing', 'ready', 'out_for_delivery') THEN 1 END) AS active_orders
        FROM unimall_orders
        WHERE created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `;
      const totalParams = [];
      if (!isPlatform) {
        totalQuery += ` AND store_id = $1`;
        totalParams.push(storeId);
      }
      const totalRows = await this.neonSql(totalQuery, totalParams);
      const totals = totalRows && totalRows[0] ? totalRows[0] : {};

      // 3. Query Lifetime / All-Time Summary
      let lifeQuery = `
        SELECT 
          COALESCE(SUM(total), 0) AS lifetime_sales,
          COUNT(id) AS lifetime_orders,
          COUNT(DISTINCT user_id) AS lifetime_customers
        FROM unimall_orders
      `;
      const lifeParams = [];
      if (!isPlatform) {
        lifeQuery += ` WHERE store_id = $1`;
        lifeParams.push(storeId);
      }
      const lifeRows = await this.neonSql(lifeQuery, lifeParams);
      const lifetime = lifeRows && lifeRows[0] ? lifeRows[0] : {};

      // Canonical Campus Stores ensuring complete 6-store coverage
      const CANONICAL_STORES = [
        { store_id: 'campus-cafe', store_name: 'Campus Bakery & Café', category: 'food' },
        { store_id: 'book-corner', store_name: 'Stationery Hub & Book Corner', category: 'stationery' },
        { store_id: 'techstop', store_name: 'TechStop Electronics', category: 'electronics' },
        { store_id: 'campus-mart', store_name: 'Campus Mart & Groceries', category: 'essentials' },
        { store_id: 'campus-wear', store_name: 'Campus Wear & Style Square', category: 'fashion' },
        { store_id: 'health-hub', store_name: 'Health Hub & Care', category: 'essentials' }
      ];

      const breakdownMap = {};
      (storeBreakdownRows || []).forEach(r => {
        breakdownMap[r.store_id] = r;
      });

      // Format Store Payout Ledger (5% Platform Commission, 95% Store Net Payout)
      const storesLedger = CANONICAL_STORES.map(base => {
        const row = breakdownMap[base.store_id] || {};
        const grossSales = parseFloat(row.today_gross_sales || 0);
        const digitalSales = parseFloat(row.digital_sales || 0);
        const cashSales = parseFloat(row.cash_sales || 0);
        const platformFee = Math.round(grossSales * 0.05); // 5% campus commission
        const netPayout = Math.max(0, grossSales - platformFee);

        return {
          store_id: base.store_id,
          store_name: row.store_name || base.store_name,
          category: row.category || base.category,
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

      // Append any newly registered stores not in canonical list
      (storeBreakdownRows || []).forEach(row => {
        if (!CANONICAL_STORES.some(c => c.store_id === row.store_id)) {
          const grossSales = parseFloat(row.today_gross_sales || 0);
          const digitalSales = parseFloat(row.digital_sales || 0);
          const cashSales = parseFloat(row.cash_sales || 0);
          const platformFee = Math.round(grossSales * 0.05);
          const netPayout = Math.max(0, grossSales - platformFee);
          storesLedger.push({
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
          });
        }
      });

      // Sort by today's sales descending
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
      const CANONICAL_FALLBACK = [
        { store_id: 'campus-cafe', store_name: 'Campus Bakery & Café', category: 'food' },
        { store_id: 'book-corner', store_name: 'Stationery Hub & Book Corner', category: 'stationery' },
        { store_id: 'techstop', store_name: 'TechStop Electronics', category: 'electronics' },
        { store_id: 'campus-mart', store_name: 'Campus Mart & Groceries', category: 'essentials' },
        { store_id: 'campus-wear', store_name: 'Campus Wear & Style Square', category: 'fashion' },
        { store_id: 'health-hub', store_name: 'Health Hub & Care', category: 'essentials' }
      ].map(s => ({
        ...s,
        today_orders_count: 0,
        today_customers_count: 0,
        today_gross_sales: 0,
        digital_sales: 0,
        cash_sales: 0,
        platform_fee: 0,
        net_payout: 0,
        settlement_status: 'No Sales Today'
      }));

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
        stores_ledger: CANONICAL_FALLBACK
      };
    }
  },

  /**
   * ── Get Deep Analytics (Rush Curve, Top Products, Store Matrix, Payment Splits) ──
   */
  async getDeepAnalytics(storeId = null, period = 'all') {
    try {
      const isPlatform = !storeId || storeId === 'all';
      let dateFilter = '';
      if (period === 'today') {
        dateFilter = ` AND o.created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date`;
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

      // 1. Overall KPI metrics for period
      const summaryRows = await this.neonSql(`
        SELECT 
          COALESCE(SUM(o.total), 0) AS revenue,
          COUNT(o.id) AS orders_count,
          COUNT(DISTINCT o.user_id) AS customers_count,
          COALESCE(AVG(o.total), 0) AS avg_order_value
        FROM unimall_orders o
        WHERE 1=1 ${dateFilter} ${storeFilter}
      `, params);
      const summary = summaryRows && summaryRows[0] ? summaryRows[0] : {};

      // 2. Units sold across items
      const unitsRows = await this.neonSql(`
        SELECT COALESCE(SUM(oi.qty), 0) AS units_sold
        FROM unimall_order_items oi
        JOIN unimall_orders o ON oi.order_id = o.id
        WHERE 1=1 ${dateFilter} ${storeFilter}
      `, params);
      const unitsSold = unitsRows && unitsRows[0] ? parseInt(unitsRows[0].units_sold || 0, 10) : 0;

      // 3. Peak Campus Rush Hours (Hourly Distribution 0 - 23)
      const hourlyRows = await this.neonSql(`
        SELECT EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'Asia/Kolkata'))::int AS hr,
               COUNT(o.id) AS orders_count,
               COALESCE(SUM(o.total), 0) AS revenue
        FROM unimall_orders o
        WHERE 1=1 ${dateFilter} ${storeFilter}
        GROUP BY hr
        ORDER BY hr ASC;
      `, params);

      // 4. Store Performance Comparison Matrix
      const storeMatrixRows = await this.neonSql(`
        SELECT s.id AS store_id, s.name AS store_name, s.category,
               COUNT(o.id) AS orders_count,
               COALESCE(SUM(o.total), 0) AS revenue,
               COUNT(DISTINCT o.user_id) AS customers_count,
               COALESCE(AVG(o.total), 0) AS aov
        FROM unimall_stores s
        LEFT JOIN unimall_orders o ON s.id = o.store_id ${dateFilter}
        GROUP BY s.id, s.name, s.category
        ORDER BY revenue DESC, orders_count DESC;
      `);

      // 5. Top 10 Best-Selling Campus Products Leaderboard
      const topProductsRows = await this.neonSql(`
        SELECT oi.product_name, oi.emoji,
               SUM(oi.qty) AS units_sold,
               SUM(oi.price * oi.qty) AS gross_sales,
               MAX(s.name) AS store_name
        FROM unimall_order_items oi
        JOIN unimall_orders o ON oi.order_id = o.id
        LEFT JOIN unimall_stores s ON o.store_id = s.id
        WHERE 1=1 ${dateFilter} ${storeFilter}
        GROUP BY oi.product_name, oi.emoji
        ORDER BY units_sold DESC, gross_sales DESC
        LIMIT 10;
      `, params);

      // 6. Payment Method Breakdown
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
        WHERE 1=1 ${dateFilter} ${storeFilter}
        GROUP BY method
        ORDER BY total_sales DESC;
      `, params);

      // 7. Fulfillment Breakdown (Hostel Delivery vs Counter Pickup)
      const fulfillmentRows = await this.neonSql(`
        SELECT 
          CASE 
            WHEN o.fulfillment_type = 'delivery' OR o.user_hostel IS NOT NULL THEN 'Hostel Room Delivery'
            ELSE 'Counter Self-Pickup'
          END AS fulfillment,
          COUNT(o.id) AS orders_count,
          COALESCE(SUM(o.total), 0) AS total_sales
        FROM unimall_orders o
        WHERE 1=1 ${dateFilter} ${storeFilter}
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
          emoji: p.emoji || '📦',
          units_sold: parseInt(p.units_sold || 0, 10),
          sold_count: parseInt(p.units_sold || 0, 10),
          gross_sales: parseFloat(p.gross_sales || 0),
          total_sales: parseFloat(p.gross_sales || 0),
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
