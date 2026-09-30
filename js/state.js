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
    if (existing.qty >= product.stock) return; // stock cap
    existing.qty++;
  } else {
    AppState.cart.push({ productId, qty: 1 });
  }
  setState({});
}

function cartRemove(productId) {
  AppState.cart = AppState.cart.filter(l => l.productId !== productId);
  setState({});
}

function cartUpdateQty(productId, delta) {
  const line    = AppState.cart.find(l => l.productId === productId);
  const product = getProduct(productId);
  if (!line || !product) return;

  const newQty = line.qty + delta;
  if (newQty <= 0) {
    cartRemove(productId);
    return;
  }
  line.qty = Math.min(newQty, product.stock);
  setState({});
}

function cartClear() {
  AppState.cart = [];
  setState({});
}

/* ─── ORDER MUTATORS ─────────────────────────────────────── */

/** Create an order from current cart state and return the new order id. */
function placeOrder(fulfillmentType, deliveryInfo) {
  const items   = getCartItems();
  const totals  = getCartTotals();
  const id      = 'UM' + (1020 + AppState.orders.length + 1);
  const displayNum = '#ORD-' + String(AppState.orders.length + 1).padStart(2, '0');
  const firstStore = items.length > 0 && items[0].product ? getStore(items[0].product.storeId) : null;
  const otp = String(Math.floor(1000 + Math.random() * 9000));

  const order   = {
    id,
    order_number_display: displayNum,
    customerName:  (AppState.currentUser && AppState.currentUser.name) || 'Ansh Sharma',
    storeName:     firstStore ? firstStore.name : 'UniMall Store',
    storeIcon:     items.length > 0 && items[0].product ? (items[0].product.emoji || '🛍️') : '🛍️',
    items:         items.map(l => ({
      productId: l.productId,
      name:      l.product.name,
      price:     l.product.price,
      qty:       l.qty,
      emoji:     l.product.emoji || '📦'
    })),
    subtotal:      totals.subtotal,
    deliveryFee:   totals.deliveryFee,
    total:         totals.total,
    fulfillmentType,
    deliveryInfo:  deliveryInfo || null,
    pickupLocation:'Ground floor, near main entrance',
    otp:           fulfillmentType === 'pickup' ? otp : null,
    status:        'placed',     // 'placed'|'preparing'|'ready'|'delivered'
    statusHistory: [{ status: 'placed', time: new Date().toISOString(), label: 'Order Placed' }],
    createdAt:     new Date().toISOString(),
  };

  AppState.orders.unshift(order);
  cartClear();
  setState({});
  return id;
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

  if (saved.orders && Array.isArray(saved.orders)) {
    AppState.orders = saved.orders;
  } else {
    AppState.orders = [];
  }

  if (saved.itemRequests)  AppState.itemRequests  = saved.itemRequests;
  if (saved.notifications) AppState.notifications = saved.notifications;
}

