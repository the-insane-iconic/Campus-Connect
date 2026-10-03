/* ═══════════════════════════════════════════════════════════
   UniMall · js/state.js
   Centralized application state + computed getters + mutators.
   Depends on: data.js, storage.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── INITIAL STATE ──────────────────────────────────────── */
const AppState = {
  /* Immutable reference data (from data.js) */
  products:    PRODUCTS,
  categories:  CATEGORIES,
  stores:      STORES,

  /* Mutable — persisted to localStorage */
  cart:         [],    // [{ productId, qty }]
  orders:       [],    // [order objects]
  itemRequests: [],    // [request objects]
  notifications: [...INITIAL_NOTIFICATIONS],
  currentUser:  { ...DEFAULT_USER },

  /* UI state — not persisted */
  ui: {
    currentView:       'home',    // 'home'|'product'|'cart'|'checkout'|'order-confirm'|'orders'|'order-detail'|'profile'|'notifications'|'request'
    selectedProductId: null,
    selectedOrderId:   null,
    searchQuery:       '',
    selectedCategoryId: null,
    activeFilters:     [],        // array of AVAIL_CHIPS ids
    checkoutStep:      1,
    fulfillmentType:   'pickup',  // 'pickup'|'delivery'
  },
};

/* ─── STATE MUTATOR ──────────────────────────────────────── */

/**
 * Shallow-merge a patch into AppState, then persist and re-render.
 * UI patches must be nested: setState({ ui: { currentView: 'cart' } })
 */
function setState(patch) {
  if (patch.ui) {
    Object.assign(AppState.ui, patch.ui);
    delete patch.ui;
  }
  Object.assign(AppState, patch);
  Storage.save(AppState);
}

/* ─── COMPUTED GETTERS ───────────────────────────────────── */

/**
 * Return products filtered by current search + category + availability chips.
 * Used by renderHome() and renderFilteredView().
 */
function getFilteredProducts() {
  const { searchQuery, selectedCategoryId, activeFilters } = AppState.ui;
  const q = searchQuery.trim().toLowerCase();

  return AppState.products.filter(p => {
    // Text search
    if (q) {
      const store = (STORES.find(s => s.id === p.storeId) || {}).name || '';
      const cat   = (CATEGORIES.find(c => c.id === p.categoryId) || {}).label || '';
      const haystack = `${p.name} ${store} ${cat}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Category filter
    if (selectedCategoryId && selectedCategoryId !== 'more') {
      if (p.categoryId !== selectedCategoryId) return false;
    }

    // Availability chips (AND logic)
    for (const chipId of activeFilters) {
      const chip = AVAIL_CHIPS.find(c => c.id === chipId);
      if (!chip) continue;
      if (p[chip.field] !== chip.value) return false;
    }

    return true;
  });
}

/** Return full product object by id, or null. */
function getProduct(id) {
  return AppState.products.find(p => p.id === id) || null;
}

/** Return store object by id, or null. */
function getStore(id) {
  return AppState.stores.find(s => s.id === id) || null;
}

/** Return cart lines with full product objects merged in. */
function getCartItems() {
  return AppState.cart.map(line => {
    let prod = getProduct(line.productId);
    if (!prod && (line.name || line.price)) {
      prod = {
        id: line.productId,
        name: line.name || 'Campus Item',
        price: Number(line.price) || 50,
        image: line.image || '',
        emoji: line.emoji || '🛍️',
        bg: '#EFF6FF',
        storeId: line.storeId || 'campus-cafe'
      };
    }
    return {
      ...line,
      product: prod,
    };
  }).filter(line => line.product !== null);
}

/** Return total number of individual items in cart. */
function getCartCount() {
  return AppState.cart.reduce((sum, line) => sum + line.qty, 0);
}

/** Return { subtotal, deliveryFee, total } */
function getCartTotals() {
  const items    = getCartItems();
  const subtotal = items.reduce((s, l) => s + l.product.price * l.qty, 0);
  const deliveryFee = AppState.ui.fulfillmentType === 'delivery' ? (subtotal > 0 ? 20 : 0) : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

/** Unread notification count. */
function getUnreadCount() {
  return AppState.notifications.filter(n => !n.read).length;
}

/* ─── CART MUTATORS ──────────────────────────────────────── */

function cartAdd(productId) {
  const product = getProduct(productId);
  if (!product) return;

  const existing = AppState.cart.find(l => l.productId === productId);
  if (existing) {
    if (existing.qty >= (product.stock || 99)) return; // stock cap
    existing.qty++;
    existing.name = product.name;
    existing.price = product.price;
    existing.image = product.image || '';
    existing.emoji = product.emoji || '🛍️';
    existing.storeId = product.storeId || 'campus-cafe';
    existing.product = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
      emoji: product.emoji || '🛍️',
      storeId: product.storeId || 'campus-cafe'
    };
  } else {
    AppState.cart.push({
      productId,
      qty: 1,
      name: product.name,
      price: product.price,
      image: product.image || '',
      emoji: product.emoji || '🛍️',
      storeId: product.storeId || 'campus-cafe',
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '',
        emoji: product.emoji || '🛍️',
        storeId: product.storeId || 'campus-cafe'
      }
    });
  }
  setState({});
}

function cartRemove(productId) {
  AppState.cart = AppState.cart.filter(l => l.productId !== productId);
  setState({});
}

function cartUpdateQty(productId, delta) {
  const line    = AppState.cart.find(l => l.productId === productId);
  const product = getProduct(productId) || (line && line.product);
  if (!line || !product) return;

  const newQty = line.qty + delta;
  if (newQty <= 0) {
    cartRemove(productId);
    return;
  }
  line.qty = Math.min(newQty, product.stock || 99);
  setState({});
}

function cartClear() {
  AppState.cart = [];
  setState({});
}

/* ─── ORDER MUTATORS ─────────────────────────────────────── */

/** Create an order from current cart state, sync to Neon DB, notify store, and return new order id. */
async function placeOrder(fulfillmentType, deliveryInfo) {
  const items   = getCartItems();
  const totals  = getCartTotals();
  const id      = 'UM' + Math.floor(10000 + Math.random() * 90000);
  const otp     = String(Math.floor(1000 + Math.random() * 9000));

  // 1. Resolve canonical user identity
  let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
    ? window.UserManager.getActiveUser()
    : null;
  if (!activeUser && typeof window.UserManager !== 'undefined' && window.UserManager.ensureGuestProfile) {
    activeUser = window.UserManager.ensureGuestProfile();
  }
  const user = activeUser || AppState.currentUser || {};
  const userId = user.userId || user.uid || user.id || user.guestId || ('usr_guest_' + Date.now());
  const studentName = user.name || (user.profile && user.profile.name) || (deliveryInfo && deliveryInfo.name) || 'Campus Student';
  const studentPhone = user.phone || (user.profile && user.profile.phone) || (deliveryInfo && deliveryInfo.phone) || '+91 98765 43210';
  const numMatch = (studentName || '').match(/\d+/);
  const studentNum = numMatch ? numMatch[0] : (String(userId).replace(/\D/g, '') || '1');
  const studentEmail = user.email || (AppState.currentUser && AppState.currentUser.email) || `student${studentNum}@campus.edu`;

  // Sync user profile to Neon PostgreSQL
  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
    window.UniMallDB.syncUser({ id: userId, uid: userId, name: studentName, email: studentEmail, phone: studentPhone }).catch(() => {});
  }

  // 2. Group items by canonical store
  const CANONICAL_STORE_MAP = {
    'store-bakery':      'campus-cafe',
    'store-stationery':  'book-corner',
    'store-electronics': 'techstop',
    'store-print':       'campus-mart',
    'store-fashion':     'campus-wear',
    'store-sports':      'campus-mart',
    'store-pharmacy':    'health-hub'
  };

  const storeGroups = {};
  for (const it of items) {
    const rawStoreId = it.product ? it.product.storeId : 'campus-cafe';
    const storeId = CANONICAL_STORE_MAP[rawStoreId] || rawStoreId || 'campus-cafe';
    if (!storeGroups[storeId]) storeGroups[storeId] = [];
    storeGroups[storeId].push(it);
  }

  const storeIds = Object.keys(storeGroups);
  const createdOrders = [];

  // Keep existing current-user orders in local state
  AppState.orders = AppState.orders.filter(o => o.user_id === userId);

  // Create an isolated order per campus store
  for (const sId of storeIds) {
    const sItems = storeGroups[sId];
    const sSubtotal = sItems.reduce((acc, it) => acc + (((it.product && it.product.price) || 0) * it.qty), 0);
    const sDeliveryFee = fulfillmentType === 'delivery' ? Math.round((totals.deliveryFee || 0) / storeIds.length) : 0;
    const sTotal = sSubtotal + sDeliveryFee;

    const firstStore = (typeof getStore === 'function') ? getStore(sId) : (typeof STORES !== 'undefined' ? STORES.find(s => s.id === sId) : null);
    const id = 'UM' + Math.floor(10000 + Math.random() * 90000);
    let displayNum = '#ORD-01';
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getNextStoreOrderNumber === 'function') {
      try {
        displayNum = await window.UniMallDB.getNextStoreOrderNumber(sId);
      } catch (e) {
        const localStoreOrders = (AppState.orders || []).filter(o => o.storeId === sId || o.store_id === sId);
        displayNum = `#ORD-${String(localStoreOrders.length + 1).padStart(2, '0')}`;
      }
    } else {
      const localStoreOrders = (AppState.orders || []).filter(o => o.storeId === sId || o.store_id === sId);
      displayNum = `#ORD-${String(localStoreOrders.length + 1).padStart(2, '0')}`;
    }
    const alreadyInBatch = createdOrders.filter(o => o.storeId === sId).length;
    if (alreadyInBatch > 0) {
      const m = displayNum.match(/#?ORD-(\d+)/i);
      const curVal = m ? parseInt(m[1], 10) : 1;
      displayNum = `#ORD-${String(curVal + alreadyInBatch).padStart(2, '0')}`;
    }
    const otp = String(Math.floor(1000 + Math.random() * 9000));

    const order = {
      id,
      order_number_display: displayNum,
      user_id:       userId,
      customerName:  studentName,
      user_name:     studentName,
      user_email:    studentEmail,
      user_phone:    studentPhone,
      storeId:       sId,
      storeName:     firstStore ? firstStore.name : 'Campus Store',
      storeIcon:     sItems.length > 0 && sItems[0].product ? (sItems[0].product.emoji || '🛍️') : '🛍️',
      items:         sItems.map(l => ({
        productId: l.productId,
        name:      (l.product && l.product.name) || 'Item',
        price:     (l.product && l.product.price) || 0,
        qty:       l.qty,
        image:     (l.product && l.product.image) || '',
        emoji:     (l.product && l.product.emoji) || '📦'
      })),
      subtotal:      sSubtotal,
      deliveryFee:   sDeliveryFee,
      total:         sTotal,
      fulfillmentType: fulfillmentType || 'pickup',
      deliveryInfo:  deliveryInfo || null,
      pickupLocation:'Ground floor, near main entrance',
      otp:           fulfillmentType === 'pickup' ? otp : null,
      paymentMethod: 'Pay at Counter / Direct',
      paymentStatus: 'PENDING_AT_COUNTER',
      status:        'placed',     // 'placed'|'preparing'|'ready'|'delivered'
      statusHistory: [{ status: 'placed', time: new Date().toISOString(), label: 'Order Placed' }],
      createdAt:     new Date().toISOString(),
    };

    // 3. Persist order directly into Neon PostgreSQL
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.createOrder === 'function') {
      const dbPayload = {
        id: order.id,
        order_number: displayNum,
        user_id: userId,
        user_name: studentName,
        user_email: studentEmail,
        user_phone: studentPhone,
        user_hostel: deliveryInfo?.hostel || (AppState.currentUser && AppState.currentUser.hostel) || 'Counter Pickup',
        user_room: deliveryInfo?.room || (AppState.currentUser && AppState.currentUser.room) || 'Ground Floor Station',
        store_id: sId,
        status: 'placed',
        fulfillment_type: fulfillmentType || 'pickup',
        subtotal: sSubtotal,
        delivery_fee: sDeliveryFee,
        total: sTotal,
        payment_method: 'Pay at Counter',
        payment_status: 'PENDING_AT_COUNTER',
        notes: (deliveryInfo && deliveryInfo.notes) || ''
      };
      window.UniMallDB.createOrder(dbPayload, order.items).catch(err => {
        console.warn('[UniMall] Neon DB order insert notice:', err.message);
      });
    }

    // Add to AppState
    AppState.orders.unshift(order);
    createdOrders.push(order);

    // Cross-tab Realtime Store Admin notification
    try {
      localStorage.setItem('unimall_new_order_placed_event', JSON.stringify({
        orderId: order.id,
        displayNum: order.order_number_display,
        storeId: sId,
        total: order.total,
        customerName: studentName,
        itemsCount: order.items.length,
        timestamp: Date.now()
      }));
    } catch(e) {}

    // Broadcast on BroadcastChannel for instant live sync without reload
    try {
      const bc = new BroadcastChannel('unimall_orders_channel');
      bc.postMessage({
        type: 'ORDER_PLACED',
        orderId: order.id,
        displayNum: order.order_number_display,
        storeId: sId,
        total: order.total,
        customerName: studentName,
        itemsCount: order.items.length,
        timestamp: Date.now()
      });
      bc.close();
    } catch(e) {}

    // Local Custom Event for reactive banner & views
    try {
      window.dispatchEvent(new CustomEvent('unimall:orderPlaced', { detail: order }));
    } catch (e) {}
  }

  cartClear();
  setState({});

  return createdOrders[0]?.id || null;
}

/* ─── ITEM REQUEST MUTATORS ──────────────────────────────── */

function submitItemRequest(data) {
  const req = {
    id:          'REQ' + Date.now(),
    what:        data.what,
    categoryId:  data.categoryId || null,
    description: data.description || '',
    status:      'received',
    createdAt:   new Date().toISOString(),
  };
  AppState.itemRequests.unshift(req);
  setState({});
  return req.id;
}

/* ─── STATE BOOTSTRAP ────────────────────────────────────── */

/** Merge persisted slices back into AppState on load. */
function hydrateState() {
  const saved = Storage.load();
  if (saved.cart)          AppState.cart          = saved.cart;
  if (saved.currentUser)   AppState.currentUser   = { ...DEFAULT_USER, ...saved.currentUser };

  // Prefer UserManager for canonical user profile resolution
  if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.getActiveUser === 'function') {
    const activeUser = window.UserManager.getActiveUser();
    if (activeUser) {
      AppState.currentUser = { ...AppState.currentUser, ...activeUser };
    }
  } else {
    // Fallback: check unimall_auth for Google session
    try {
      const authRaw = localStorage.getItem('unimall_auth');
      if (authRaw) {
        const authUser = JSON.parse(authRaw);
        AppState.currentUser = { ...AppState.currentUser, ...authUser };
      }
    } catch (e) {}
  }

  const curUid = AppState.currentUser ? (AppState.currentUser.userId || AppState.currentUser.uid || AppState.currentUser.id || AppState.currentUser.guestId) : null;

  if (saved.orders && Array.isArray(saved.orders)) {
    if (curUid) {
      AppState.orders = saved.orders.filter(o => !o.user_id || o.user_id === curUid || o.userId === curUid);
    } else {
      AppState.orders = saved.orders;
    }
  } else {
    AppState.orders = [];
  }

  // Neon DB async sync for authoritative orders for current user
  if (curUid && typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getUserOrders === 'function') {
    window.UniMallDB.getUserOrders(curUid).then(dbOrders => {
      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
        const storeNames = {
          'campus-cafe': 'Campus Café',
          'book-corner': 'Book Corner',
          'techstop': 'TechStop',
          'campus-mart': 'Campus Mart',
          'campus-wear': 'Campus Wear',
          'health-hub': 'Health Hub'
        };

        const formatted = dbOrders.map(remote => ({
          id: remote.id,
          order_number_display: remote.order_number || (`#ORD-${String(remote.id).slice(-4)}`),
          user_id: remote.user_id,
          customerName: remote.user_name || 'Campus Student',
          storeId: remote.store_id,
          storeName: storeNames[remote.store_id] || (typeof STORES !== 'undefined' && STORES.find(s => s.id === remote.store_id)?.name) || 'Campus Store',
          storeIcon: '🛍️',
          items: (remote.items || remote.unimall_order_items || []).map(it => ({
            productId: it.product_id || it.productId || it.id,
            name: it.product_name || it.name,
            price: Number(it.price || 0),
            qty: Number(it.qty || it.quantity || 1),
            emoji: it.emoji || '📦'
          })),
          subtotal: Number(remote.subtotal || remote.total || 0),
          deliveryFee: Number(remote.delivery_fee || 0),
          total: Number(remote.total || remote.subtotal || 0),
          fulfillmentType: remote.fulfillment_type || 'pickup',
          deliveryInfo: remote.user_hostel ? { hostel: remote.user_hostel, room: remote.user_room } : null,
          pickupLocation: 'Ground floor, near main entrance',
          status: (remote.status || 'placed').toLowerCase(),
          statusHistory: (remote.statusHistory || remote.unimall_order_status_history || []).map(h => ({
            status: h.status,
            time: h.created_at || h.time,
            label: h.notes || h.label || h.status
          })),
          createdAt: remote.created_at || new Date().toISOString()
        }));

        // Merge keeping the latest status
        formatted.forEach(fo => {
          const existing = AppState.orders.find(o => o.id === fo.id);
          if (existing) {
            existing.status = fo.status;
            existing.statusHistory = fo.statusHistory;
          } else {
            AppState.orders.push(fo);
          }
        });
        AppState.orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        Storage.save(AppState);
        window.dispatchEvent(new CustomEvent('unimall:stateChange', { detail: AppState }));
        if (typeof window.mountActiveOrderBanner === 'function') window.mountActiveOrderBanner();
      }
    }).catch(() => {});
  }

  if (saved.itemRequests)  AppState.itemRequests  = saved.itemRequests;
  if (saved.notifications) AppState.notifications = saved.notifications;
}

// Hydrate state from localStorage immediately on script load
try {
  hydrateState();
} catch (e) {
  console.warn('[state] Hydration warning:', e);
}
