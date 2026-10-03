/**
 * UniMall Store Admin — Centralized API Client (admin/js/api.js)
 * Supports both Flask backend, direct Supabase execution, and robust localStorage fallback.
 */

'use strict';

const API_BASE = '/api';

/**
 * Standard API client.
 * Tries local /api if available, otherwise delegates directly to Supabase via UniMallDB,
 * and falls back gracefully to localStorage state.
 */
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('unimall_admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. First attempt through local API backend (if running Flask/Express)
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      sessionStorage.removeItem('unimall_admin_token');
      window.location.href = '../login/';
      throw new Error('Session expired. Please sign in again.');
    }

    if (res.ok) {
      return await res.json().catch(() => ({}));
    }
  } catch (err) {
    // If backend is offline or 404, fall through to client-side handlers
  }

  // 2. Direct Supabase / Client Handler Fallback
  return await handleClientAdminRequest(endpoint, options);
}
window.apiRequest = apiRequest;

/**
 * Unified Client-Side Handler (Supabase PostgREST + LocalStorage)
 */
async function handleClientAdminRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // ── /auth/me ──
  if (endpoint === '/auth/me') {
    const cachedUser = sessionStorage.getItem('unimall_admin_user') || localStorage.getItem('unimall_admin_user');
    const cachedStores = sessionStorage.getItem('unimall_admin_stores') || localStorage.getItem('unimall_admin_stores');
    return {
      user: cachedUser ? JSON.parse(cachedUser) : { id: 'admin', name: 'Campus Connect Admin', role: 'platform_admin' },
      stores: cachedStores ? JSON.parse(cachedStores) : []
    };
  }

  // ── /categories ──
  if (endpoint === '/categories') {
    return {
      categories: [
        { id: 'food', name: 'Food & Drinks' },
        { id: 'stationery', name: 'Stationery' },
        { id: 'electronics', name: 'Electronics' },
        { id: 'fashion', name: 'Fashion' },
        { id: 'essentials', name: 'Daily Essentials' },
        { id: 'health', name: 'Health & Care' },
        { id: 'services', name: 'Services' },
        { id: 'other', name: 'Other' }
      ]
    };
  }

  // ── GET/PATCH Store Profile: /admin/stores/:storeId ──
  const storeMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)$/);
  if (storeMatch) {
    const storeId = storeMatch[1];

    if (method === 'GET') {
      if (storeId === 'all') {
        return {
          store: {
            id: 'all',
            name: 'All Campus Stores',
            category: 'Platform Operations',
            location: 'Platform-wide Executive Overview',
            phone: '+91 UniMall HQ',
            description: 'Platform management and cumulative analytics across all registered campus stores.',
            image_url: '',
            accepts_delivery: 1,
            accepts_pickup: 1,
            is_open: 1
          }
        };
      }

      const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');

      // 1. Authoritative Neon PostgreSQL Query
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStore === 'function') {
        try {
          const dbStore = await window.UniMallDB.getStore(storeId);
          if (dbStore) {
            const isOpen = storeStatuses[storeId] !== undefined ? storeStatuses[storeId] : (dbStore.is_open ? 1 : 0);
            return {
              store: {
                id: dbStore.id,
                name: dbStore.name,
                category: dbStore.category || 'General',
                location: dbStore.location || 'Campus Center',
                phone: dbStore.phone || '',
                description: dbStore.description || '',
                image_url: dbStore.cover_image || '',
                accepts_delivery: dbStore.delivery_available ? 1 : 0,
                accepts_pickup: dbStore.pickup_available ? 1 : 0,
                is_open: isOpen ? 1 : 0
              }
            };
          }
        } catch (e) {
          console.warn('[api.js] Neon getStore error:', e.message);
        }
      }

      // 2. Local Fallback
      const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
      const reg = registeredStores.find(r => r.storeId === storeId);

      let store = null;
      if (!store && reg) {
        store = {
          id: reg.storeId,
          name: reg.storeName,
          category: reg.storeType,
          location: reg.location,
          phone: reg.phone,
          description: reg.description || '',
          image_url: '',
          accepts_delivery: 1,
          accepts_pickup: 1,
          is_open: 1
        };
      } else if (!store) {
        store = {
          id: storeId,
          name: storeId,
          category: 'General',
          location: 'Campus',
          phone: '',
          description: '',
          image_url: '',
          accepts_delivery: 1,
          accepts_pickup: 1,
          is_open: 1
        };
      }

      // Check current open/closed status
      const isOpen = storeStatuses[storeId] !== undefined ? storeStatuses[storeId] : (store.is_open !== 0);
      return {
        store: {
          ...store,
          is_open: isOpen ? 1 : 0
        }
      };
    }

    if (method === 'PATCH' || method === 'POST') {
      const coverImg = body.image_url || body.cover_image || null;
      const deliveryAvail = body.accepts_delivery !== undefined ? Boolean(body.accepts_delivery) : (body.delivery_available !== undefined ? Boolean(body.delivery_available) : null);
      const pickupAvail = body.accepts_pickup !== undefined ? Boolean(body.accepts_pickup) : (body.pickup_available !== undefined ? Boolean(body.pickup_available) : null);
      const openTime = body.opening_time || (body.hours_json?.monday?.open ? body.hours_json.monday.open : null);
      const closeTime = body.closing_time || (body.hours_json?.monday?.close ? body.hours_json.monday.close : null);

      // Persist updated store settings to Neon PostgreSQL online database
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
        try {
          await window.UniMallDB.neonSql(`
            UPDATE unimall_stores
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                category = COALESCE($4, category),
                location = COALESCE($5, location),
                phone = COALESCE($6, phone),
                cover_image = COALESCE($7, cover_image),
                delivery_available = COALESCE($8, delivery_available),
                pickup_available = COALESCE($9, pickup_available),
                opening_time = COALESCE($10, opening_time),
                closing_time = COALESCE($11, closing_time),
                updated_at = NOW()
            WHERE id = $1;
          `, [
            storeId, 
            body.name || null, 
            body.description || null, 
            body.category || null, 
            body.location || null, 
            body.phone || null,
            coverImg,
            deliveryAvail,
            pickupAvail,
            openTime,
            closeTime
          ]);

          await window.UniMallDB.neonSql(`
            UPDATE stores
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                category = COALESCE($4, category),
                location = COALESCE($5, location),
                phone = COALESCE($6, phone),
                cover_image = COALESCE($7, cover_image),
                accepts_delivery = COALESCE($8, accepts_delivery),
                accepts_pickup = COALESCE($9, accepts_pickup),
                opening_time = COALESCE($10, opening_time),
                closing_time = COALESCE($11, closing_time),
                updated_at = NOW()
            WHERE id = $1;
          `, [
            storeId, 
            body.name || null, 
            body.description || null, 
            body.category || null, 
            body.location || null, 
            body.phone || null,
            coverImg,
            deliveryAvail !== null ? (deliveryAvail ? 1 : 0) : null,
            pickupAvail !== null ? (pickupAvail ? 1 : 0) : null,
            openTime,
            closeTime
          ]);
        } catch (e) {
          console.warn('[api.js] Update store DB warning:', e.message);
        }
      }

      // Save updated store settings locally
      const customStoreSettings = JSON.parse(localStorage.getItem('unimall_custom_store_settings') || '{}');
      customStoreSettings[storeId] = { ...(customStoreSettings[storeId] || {}), ...body, image_url: coverImg || customStoreSettings[storeId]?.image_url };
      localStorage.setItem('unimall_custom_store_settings', JSON.stringify(customStoreSettings));

      // Also sync to unimall_registered_stores if present
      try {
        const regList = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
        const regIdx = regList.findIndex(r => r.storeId === storeId);
        if (regIdx !== -1) {
          if (body.name) regList[regIdx].storeName = body.name;
          if (body.description) regList[regIdx].description = body.description;
          if (body.category) regList[regIdx].storeType = body.category;
          if (body.location) regList[regIdx].location = body.location;
          if (body.phone) regList[regIdx].phone = body.phone;
          if (coverImg) regList[regIdx].coverImage = coverImg;
          localStorage.setItem('unimall_registered_stores', JSON.stringify(regList));
        }
      } catch (e) {}

      return { success: true, store: customStoreSettings[storeId] };
    }
  }

  // ── TOGGLE STORE OPEN: /admin/stores/:storeId/toggle-open ──
  const toggleMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/toggle-open$/);
  if (toggleMatch) {
    const storeId = toggleMatch[1];
    const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
    const currentlyOpen = storeStatuses[storeId] !== false; // default true
    const newState = !currentlyOpen;

    storeStatuses[storeId] = newState;
    localStorage.setItem('unimall_store_statuses', JSON.stringify(storeStatuses));

    // Persist to authoritative online database (Neon PostgreSQL)
    if (window.UniMallDB && typeof window.UniMallDB.updateStoreStatus === 'function') {
      await window.UniMallDB.updateStoreStatus(storeId, newState).catch(() => {});
    }

    // Broadcast event
    window.dispatchEvent(new CustomEvent('unimall:storeStatusChanged', { detail: { storeId, isOpen: newState } }));
    try {
      localStorage.setItem('unimall_store_status_event', JSON.stringify({ storeId, isOpen: newState, timestamp: Date.now() }));
    } catch(e) {}

    return { success: true, is_open: newState ? 1 : 0 };
  }

  // ── TOGGLE STORE VISIBILITY: /admin/stores/:storeId/toggle-visibility ──
  const visibilityMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/toggle-visibility$/);
  if (visibilityMatch) {
    const storeId = visibilityMatch[1];
    const storeVisibility = JSON.parse(localStorage.getItem('unimall_store_visibility') || '{}');
    // Default to visible (true). If not set, assume visible; toggling makes it hidden.
    const currentlyVisible = storeVisibility[storeId] !== false;
    const newVisibility = !currentlyVisible;

    storeVisibility[storeId] = newVisibility;
    localStorage.setItem('unimall_store_visibility', JSON.stringify(storeVisibility));

    // Persist to authoritative online database (Neon PostgreSQL)
    if (window.UniMallDB && typeof window.UniMallDB.updateStoreVisibility === 'function') {
      await window.UniMallDB.updateStoreVisibility(storeId, newVisibility).catch(() => {});
    }

    // Broadcast so all open user tabs refresh
    window.dispatchEvent(new CustomEvent('unimall:storeVisibilityChanged', {
      detail: { storeId, isVisible: newVisibility }
    }));
    try {
      localStorage.setItem('unimall_catalog_sync_event', JSON.stringify({
        storeId, isVisible: newVisibility, timestamp: Date.now()
      }));
    } catch(e) {}

    return { success: true, is_visible: newVisibility ? 1 : 0 };
  }

  // ── GET Orders: /admin/stores/:storeId/orders ──
  const ordersMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/orders/);
  if (ordersMatch && method === 'GET') {
    const storeId = ordersMatch[1];
    let ordersList = [];

    // 1. Query authoritative Neon PostgreSQL first
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStoreOrders === 'function') {
      try {
        const dbOrders = await window.UniMallDB.getStoreOrders(storeId);
        if (Array.isArray(dbOrders) && dbOrders.length > 0) {
          ordersList = dbOrders.map(o => {
            let createdAtIso = new Date().toISOString();
            if (o.created_at) {
              try {
                const rawDateStr = String(o.created_at).trim();
                const isoClean = rawDateStr.includes('T') ? rawDateStr : rawDateStr.replace(' ', 'T').replace(/\+00$/, 'Z');
                const parsed = new Date(isoClean);
                if (!isNaN(parsed.getTime())) {
                  createdAtIso = parsed.toISOString();
                }
              } catch (e) {}
            }

              let rawItems = o.items;
              if (typeof rawItems === 'string') {
                try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
              }
              if (!Array.isArray(rawItems)) rawItems = [];

              return {
                id: o.id,
                order_number: o.order_number || o.id,
                order_number_display: o.order_number || (`#ORD-${String(o.id).slice(-4)}`),
                user_name: (o.user_name || o.customerName || o.customer_name || 'Student').trim(),
                user_phone: o.user_phone || '',
                store_id: o.store_id,
                subtotal: parseFloat(o.subtotal || o.total || 0),
                store_subtotal: parseFloat(o.subtotal || o.total || 0),
                delivery_fee: parseFloat(o.delivery_fee || 0),
                total_amount: parseFloat(o.total || 0),
                total: parseFloat(o.total || 0),
                status: (o.status || 'placed').toUpperCase(),
                fulfillment_type: o.fulfillment_type || 'counter-pickup',
                delivery_location: o.delivery_location || 'Campus Counter',
                created_at: createdAtIso,
                items: rawItems.map(i => ({
                  product_name: i.product_name || i.name,
                  name: i.product_name || i.name,
                  quantity: i.quantity || i.qty || 1,
                  qty: i.quantity || i.qty || 1,
                  price: parseFloat(i.price || 0),
                  emoji: i.emoji || '📦',
                  image: i.image || ''
                }))
              };
          });
        }
      } catch (err) {
        console.warn('[Admin API] DB getStoreOrders warning:', err);
      }
    }

    // 2. Read local cache to merge local orders for current store if any
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const aliasMap = {
            'campus-cafe': ['store-bakery', 'campus-cafe'],
            'book-corner': ['store-stationery', 'book-corner'],
            'techstop': ['store-electronics', 'techstop'],
            'campus-mart': ['store-sports', 'campus-mart'],
            'campus-wear': ['store-fashion', 'campus-wear'],
            'health-hub': ['store-pharmacy', 'health-hub']
          };
          const targetIds = aliasMap[storeId] || [storeId];
          const existingIds = new Set(ordersList.map(o => String(o.id || '').replace(/^#/, '').toLowerCase()));

          const localOrders = appData.orders
            .filter(o => storeId === 'all' || (o.storeId && targetIds.includes(o.storeId)))
            .map(o => {
              const custName = (o.user_name || o.customerName || o.customer_name || o.userName || o.customer?.name || 'Student').trim();
              const subtotalVal = parseFloat(o.subtotal || o.total || 0);
              const totalVal = parseFloat(o.total || o.subtotal || 0);
              const rawSt = (o.status || 'placed').toLowerCase();
              const cleanStatus = (rawSt === 'delivered' || rawSt === 'completed') ? 'DELIVERED' : rawSt.toUpperCase();

              return {
                id: o.id,
                order_number: o.order_number_display || o.order_number || o.id,
                order_number_display: o.order_number_display || o.order_number || o.id,
                user_name: custName,
                user_phone: o.user_phone || o.customer?.phone || '+91 98765 43210',
                store_id: o.storeId || storeId,
                subtotal: subtotalVal,
                store_subtotal: subtotalVal,
                delivery_fee: parseFloat(o.deliveryFee || 0),
                total_amount: totalVal,
                total: totalVal,
                status: cleanStatus,
                fulfillment_type: o.fulfillmentType || 'counter-pickup',
                delivery_location: o.deliveryInfo ? `${o.deliveryInfo.hostel} - ${o.deliveryInfo.room}` : 'Counter Pickup',
                created_at: o.createdAt || o.date || new Date().toISOString(),
                items: (o.items || []).map(i => ({
                  product_name: i.name || i.product_name,
                  name: i.name || i.product_name,
                  quantity: i.qty || i.quantity || 1,
                  qty: i.qty || i.quantity || 1,
                  price: parseFloat(i.price || 0),
                  emoji: i.emoji || '📦',
                  image: i.image || ''
                }))
              };
            });

          localOrders.forEach(lo => {
            const cleanId = String(lo.id || '').replace(/^#/, '').toLowerCase();
            if (!existingIds.has(cleanId)) {
              ordersList.push(lo);
              existingIds.add(cleanId);
            }
          });
        }
      }
    } catch(e) {}

    // Sort by created_at desc (newest first in list)
    ordersList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return { orders: ordersList };
  }

  // ── PATCH/POST Order Status: /admin/orders/:orderId/status ──
  const statusMatch = endpoint.match(/^\/admin\/orders\/([^\/]+)\/status/);
  if (statusMatch && (method === 'PATCH' || method === 'POST')) {
    const orderId = statusMatch[1];
    const newStatus = body.status;
    const notes = body.notes || `Status changed to ${newStatus}`;
    const isDelivered = (newStatus.toUpperCase() === 'DELIVERED' || newStatus.toUpperCase() === 'COMPLETED');
    const nowIso = new Date().toISOString();

    if (window.UniMallDB && typeof window.UniMallDB.updateOrderStatus === 'function') {
      await window.UniMallDB.updateOrderStatus(orderId, newStatus, notes).catch(() => {});
    }

    // Sync localStorage unimall_v1 directly so customer app gets the update immediately
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const cleanTarget = String(orderId || '').replace(/^#/, '').toLowerCase();
          const ord = appData.orders.find(o => {
            const oId = String(o.id || '').replace(/^#/, '').toLowerCase();
            const oNum = String(o.order_number || '').replace(/^#/, '').toLowerCase();
            const oDisp = String(o.order_number_display || '').replace(/^#/, '').toLowerCase();
            return oId === cleanTarget || oNum === cleanTarget || oDisp === cleanTarget || o.id === orderId;
          });
          if (ord) {
            ord.status = isDelivered ? 'delivered' : newStatus.toLowerCase();
            if (isDelivered) {
              ord.deliveredAt = nowIso;
            }
            if (!ord.statusHistory) ord.statusHistory = [];
            ord.statusHistory.push({
              status: ord.status,
              time: nowIso,
              label: `Order marked as ${newStatus}`
            });

            if (newStatus.toUpperCase() === 'READY') {
              if (!Array.isArray(appData.notifications)) {
                appData.notifications = [];
              }
              const displayNum = ord.order_number_display || `#ORD-${String(ord.id).replace(/\D/g, '').slice(-2) || '08'}`;
              const storeName = ord.storeName || ord.store_name || 'Campus Store';
              appData.notifications.unshift({
                id: 'notif_' + Date.now(),
                type: 'order',
                title: 'Order Ready to Receive! 🛍️',
                body: `Your order ${displayNum} from ${storeName} is packed and ready to receive!`,
                time: 'Just now',
                read: false,
                orderId: ord.id
              });
            }
            localStorage.setItem('unimall_v1', JSON.stringify(appData));
          }
        }
      }
    } catch(e) {}

    // Broadcast storage event for cross-tab realtime reaction
    try {
      if (newStatus.toUpperCase() === 'READY') {
        localStorage.setItem('unimall_order_ready_event', JSON.stringify({
          orderId,
          status: 'ready',
          timestamp: Date.now()
        }));
      }
      localStorage.setItem('unimall_order_delivered_event', JSON.stringify({
        orderId,
        status: isDelivered ? 'delivered' : newStatus.toLowerCase(),
        deliveredAt: nowIso,
        timestamp: Date.now()
      }));
    } catch(e) {}

    // Broadcast on BroadcastChannel for instant cross-tab sync
    try {
      const bc = new BroadcastChannel('unimall_orders_channel');
      bc.postMessage({
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        status: isDelivered ? 'delivered' : newStatus.toLowerCase(),
        deliveredAt: nowIso,
        timestamp: Date.now()
      });
    } catch(e) {}

    // Also dispatch on window in case single tab/window
    window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
      detail: { orderId, status: isDelivered ? 'delivered' : newStatus.toLowerCase(), deliveredAt: nowIso }
    }));

    return { success: true, status: newStatus };
  }

  // ── GET/POST Products: /admin/stores/:storeId/products ──
  const prodsMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/products/);
  if (prodsMatch) {
    const storeId = prodsMatch[1];

    if (method === 'GET') {
      // 1. Authoritative Online Database Query (Neon PostgreSQL)
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getProducts === 'function') {
        try {
          const dbProds = await window.UniMallDB.getProducts(storeId === 'all' ? null : storeId);
          if (Array.isArray(dbProds)) {
            return {
              products: dbProds.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                price: parseFloat(p.price || 0),
                stock: p.stock ?? 20,
                low_stock_threshold: p.low_stock_threshold ?? 5,
                is_active: p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1,
                category_id: p.category_id || p.categoryId || 'food',
                category_name: p.category_name || p.category_id || 'Food & Drinks',
                image_url: p.image || p.image_url || '',
                sku: p.sku || 'SKU-' + p.id,
                unit: p.unit || 'item',
                availability: (p.stock === 0 ? 'out_of_stock' : (p.stock <= (p.low_stock_threshold || 5) ? 'low_stock' : 'in_stock'))
              }))
            };
          }
        } catch (e) {
          console.warn('[api.js] Neon products query fallback:', e.message);
        }
      }

      // 2. Local fallback
      let catalog = getStoredCatalog();
      let storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);

      // No local products for store — defer to DB fetch above

      return {
        products: storeProds.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: parseFloat(p.price),
          stock: p.stock ?? 20,
          low_stock_threshold: p.low_stock_threshold ?? 5,
          is_active: p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1,
          category_id: p.category_id || p.categoryId || 'food',
          category_name: p.category_name || p.category_id || 'Food & Drinks',
          image_url: p.image_url || p.image || '',
          sku: p.sku || 'SKU-' + p.id,
          unit: p.unit || 'item',
          availability: (p.stock === 0 ? 'out_of_stock' : (p.stock <= (p.low_stock_threshold || 5) ? 'low_stock' : 'in_stock'))
        }))
      };
    }

    if (method === 'POST') {
      const resolvedStoreId = (storeId && storeId !== 'all') 
        ? storeId 
        : (sessionStorage.getItem('unimall_admin_active_store') || (window.currentAuthorizedStores && window.currentAuthorizedStores[0]?.store_id));
      
      if (!resolvedStoreId) {
        throw new Error('No active store selected. Please select a store before creating products.');
      }

      const imgVal = body.image || body.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
      const newProd = {
        id: 'p-' + Date.now().toString().slice(-6),
        store_id: resolvedStoreId,
        category_id: body.category_id || 'food',
        name: body.name,
        description: body.description || '',
        price: parseFloat(body.price),
        stock: parseInt(body.stock || 20, 10),
        low_stock_threshold: parseInt(body.low_stock_threshold || 5, 10),
        sku: body.sku || 'SKU-' + Date.now().toString().slice(-4),
        unit: body.unit || 'item',
        is_active: 1,
        image_url: imgVal,
        image: imgVal,
        emoji: body.emoji || '📦',
        availability: 'in_stock'
      };

      // Persist to Neon PostgreSQL online database
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.upsertProduct === 'function') {
        try {
          await window.UniMallDB.upsertProduct(newProd);
        } catch (dbErr) {
          console.error('[api.js] Neon upsertProduct error:', dbErr);
          throw dbErr;
        }
      }

      const catalog = getStoredCatalog();
      catalog.push(newProd);
      saveStoredCatalog(catalog);

      // Notify student app
      notifyCatalogUpdated();

      return { success: true, product: newProd };
    }
  }

  // ── PATCH/DELETE Product: /admin/products/:productId ──
  const prodPatchMatch = endpoint.match(/^\/admin\/products\/([^\/]+)$/);
  if (prodPatchMatch) {
    const prodId = prodPatchMatch[1];
    const catalog = getStoredCatalog();
    const idx = catalog.findIndex(p => p.id === prodId);

    if (method === 'PATCH') {
      let prodObj = null;
      if (idx !== -1) {
        catalog[idx] = { ...catalog[idx], ...body };
        if (body.price !== undefined) catalog[idx].price = parseFloat(body.price);
        if (body.stock !== undefined) {
          catalog[idx].stock = parseInt(body.stock, 10);
          catalog[idx].availability = catalog[idx].stock === 0 ? 'out_of_stock' : (catalog[idx].stock <= (catalog[idx].low_stock_threshold || 5) ? 'low_stock' : 'in_stock');
        }
        prodObj = catalog[idx];
      } else {
        prodObj = { id: prodId, ...body };
        catalog.push(prodObj);
      }

      if (!prodObj.store_id) {
        prodObj.store_id = sessionStorage.getItem('unimall_admin_active_store') || (window.currentAuthorizedStores && window.currentAuthorizedStores[0]?.store_id);
      }

      // Persist to Neon PostgreSQL online database
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.upsertProduct === 'function') {
        try {
          await window.UniMallDB.upsertProduct(prodObj);
        } catch (dbErr) {
          console.warn('[api.js] Neon upsertProduct patch warning:', dbErr);
        }
      }

      saveStoredCatalog(catalog);
      notifyCatalogUpdated();
      return { success: true, product: prodObj };
    }

    if (method === 'DELETE') {
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.deleteProduct === 'function') {
        await window.UniMallDB.deleteProduct(prodId).catch(() => {});
      }

      if (idx !== -1) {
        catalog.splice(idx, 1);
        saveStoredCatalog(catalog);
        notifyCatalogUpdated();
      }
      return { success: true };
    }
  }

  // ── GET/PATCH Inventory: /admin/stores/:storeId/inventory ──
  const invMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/inventory$/);
  if (invMatch && method === 'GET') {
    const storeId = invMatch[1];

    // 1. Authoritative Online Database Query (Neon PostgreSQL)
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getProducts === 'function') {
      try {
        const dbProds = await window.UniMallDB.getProducts(storeId === 'all' ? null : storeId);
        if (Array.isArray(dbProds)) {
          return {
            inventory: dbProds.map(p => ({
              product_id: p.id,
              name: p.name,
              sku: p.sku || 'SKU-' + p.id,
              price: parseFloat(p.price || 0),
              category_name: p.category_id || p.categoryId || 'General',
              image_url: p.image || p.image_url || '',
              quantity: p.stock ?? 20,
              low_stock_threshold: p.low_stock_threshold ?? 5,
              updated_at: new Date().toISOString()
            }))
          };
        }
      } catch (e) {
        console.warn('[api.js] Neon inventory query fallback:', e.message);
      }
    }

    // 2. Local fallback
    const catalog = getStoredCatalog();
    let storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);

    // No local inventory — defer to DB fetch above

    return {
      inventory: storeProds.map(p => ({
        product_id: p.id,
        name: p.name,
        sku: p.sku || 'SKU-' + p.id,
        price: parseFloat(p.price),
        category_name: p.category_id || 'General',
        image_url: p.image_url || p.image || '',
        quantity: p.stock ?? 20,
        low_stock_threshold: p.low_stock_threshold ?? 5,
        updated_at: new Date().toISOString()
      }))
    };
  }

  // ── PATCH Inventory: /admin/inventory/:productId ──
  const invPatchMatch = endpoint.match(/^\/admin\/inventory\/([^\/]+)$/);
  if (invPatchMatch && (method === 'PATCH' || method === 'POST')) {
    const prodId = invPatchMatch[1];
    const catalog = getStoredCatalog();
    const idx = catalog.findIndex(p => p.id === prodId);

    if (idx !== -1) {
      if (body.quantity !== undefined) {
        catalog[idx].stock = Math.max(0, parseInt(body.quantity, 10));
        catalog[idx].availability = catalog[idx].stock === 0 ? 'out_of_stock' : (catalog[idx].stock <= (catalog[idx].low_stock_threshold || 5) ? 'low_stock' : 'in_stock');
      }
      if (body.low_stock_threshold !== undefined) {
        catalog[idx].low_stock_threshold = parseInt(body.low_stock_threshold, 10);
      }

      // Persist directly to Neon PostgreSQL online database
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.upsertProduct === 'function') {
        await window.UniMallDB.upsertProduct(catalog[idx]).catch(() => {});
      }

      saveStoredCatalog(catalog);
      notifyCatalogUpdated();
      return { success: true, updated: catalog[idx] };
    }
    return { success: true };
  }

  // ── GET Dashboard Stats: /admin/stores/:storeId/dashboard ──
  const dashMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/dashboard/);
  if (dashMatch && method === 'GET') {
    const storeId = dashMatch[1];
    const ordersRes = await handleClientAdminRequest(`/admin/stores/${storeId}/orders`);
    const orders = ordersRes.orders || [];

    const deliveredOrders = orders.filter(o => {
      const s = (o.status || '').toUpperCase();
      return s === 'DELIVERED' || s === 'COMPLETED';
    });
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const pendingOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase()));

    const catalog = getStoredCatalog();
    const storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);
    const lowStockCount = storeProds.filter(p => (p.stock ?? 20) <= (p.low_stock_threshold || 5)).length;

    return {
      stats: {
        total_orders: deliveredOrders.length,
        total_revenue: totalRevenue,
        pending_orders: pendingOrders.length,
        low_stock_items: lowStockCount
      }
    };
  }

  return { success: true };
}

// ── CATALOG PERSISTENCE HELPERS ──

function getStoredCatalog() {
  try {
    const raw = localStorage.getItem('unimall_products_catalog');
    if (raw) return JSON.parse(raw);
  } catch(e) {}

  // No products in catalog yet — DB is the source of truth
  localStorage.setItem('unimall_products_catalog', JSON.stringify([]));
  return [];
}

function saveStoredCatalog(catalog) {
  try {
    localStorage.setItem('unimall_products_catalog', JSON.stringify(catalog));
  } catch(e) {}
}

function notifyCatalogUpdated() {
  try {
    localStorage.setItem('unimall_catalog_sync_event', JSON.stringify({ timestamp: Date.now() }));
    window.dispatchEvent(new CustomEvent('unimall:catalogUpdated'));
  } catch(e) {}
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

