/**
 * UniMall Store Admin — Centralized API Client (admin/js/api.js)
 * Supports both Flask backend, direct Supabase execution, and robust localStorage fallback.
 */

'use strict';

const API_BASE = '/api';

// Default metadata for known campus stores
const DEFAULT_STORES_INFO = {
  'campus-cafe': {
    id: 'campus-cafe',
    name: 'Campus Café',
    category: 'Food & Drinks',
    location: 'Ground Floor, Student Center',
    phone: '+91 98765 11001',
    description: 'Fresh coffee, artisanal sandwiches, shakes, and fast bites on campus.',
    image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 1
  },
  'book-corner': {
    id: 'book-corner',
    name: 'Book Corner',
    category: 'Stationery & Books',
    location: 'First Floor, Block B',
    phone: '+91 98765 11002',
    description: 'Textbooks, notebooks, premium pens, art supplies, and calculators.',
    image_url: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 1
  },
  'techstop': {
    id: 'techstop',
    name: 'TechStop',
    category: 'Electronics & Accessories',
    location: 'Second Floor, Unimall',
    phone: '+91 98765 11003',
    description: 'Cables, chargers, peripherals, USB drives, power banks, and audio gear.',
    image_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 1
  },
  'campus-mart': {
    id: 'campus-mart',
    name: 'Campus Mart',
    category: 'Daily Essentials & Groceries',
    location: 'Ground Floor, Unimall',
    phone: '+91 98765 11004',
    description: 'Snacks, packaged beverages, dairy, personal care, and emergency hostel supplies.',
    image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 1
  },
  'campus-wear': {
    id: 'campus-wear',
    name: 'Campus Wear',
    category: 'Fashion & Apparel',
    location: 'First Floor, Unimall',
    phone: '+91 98765 11005',
    description: 'University hoodies, sports t-shirts, casual wear, and campus accessories.',
    image_url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 0
  },
  'health-hub': {
    id: 'health-hub',
    name: 'Health Hub',
    category: 'Health & First Aid',
    location: 'Ground Floor, Medical Wing',
    phone: '+91 98765 11006',
    description: 'Over-the-counter medicine, first aid, vitamins, sanitizers, and wellness products.',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
    accepts_delivery: 1,
    accepts_pickup: 1,
    is_open: 1
  }
};

// Initial base catalog across campus stores
const DEFAULT_PRODUCTS = [
  // Campus Café
  { id: 'p-cappuccino', store_id: 'campus-cafe', category_id: 'food', name: 'Cappuccino', description: 'Freshly brewed espresso with steamed milk foam', price: 90, stock: 25, low_stock_threshold: 5, is_active: 1, sku: 'CAF-CAP', unit: 'cup', image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400' },
  { id: 'p-croissant', store_id: 'campus-cafe', category_id: 'food', name: 'Butter Croissant', description: 'Flaky golden French pastry baked fresh daily', price: 65, stock: 14, low_stock_threshold: 5, is_active: 1, sku: 'CAF-CRO', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { id: 'p-masala-chai', store_id: 'campus-cafe', category_id: 'food', name: 'Masala Chai', description: 'Traditional spiced milk tea with ginger and cardamom', price: 25, stock: 50, low_stock_threshold: 10, is_active: 1, sku: 'CAF-CHA', unit: 'cup', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400' },
  { id: 'p-paneer-sandwich', store_id: 'campus-cafe', category_id: 'food', name: 'Paneer Tikka Sandwich', description: 'Grilled multigrain bread stuffed with spiced paneer tikka', price: 85, stock: 18, low_stock_threshold: 5, is_active: 1, sku: 'CAF-SAN', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
  { id: 'p-cold-coffee', store_id: 'campus-cafe', category_id: 'food', name: 'Thick Cold Coffee', description: 'Chilled blended brew with rich chocolate swirl', price: 75, stock: 30, low_stock_threshold: 6, is_active: 1, sku: 'CAF-COL', unit: 'glass', image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400' },

  // Book Corner
  { id: 'p-notebook', store_id: 'book-corner', category_id: 'stationery', name: 'A4 Spiral Notebook (200 pgs)', description: 'Ruled premium paper for lecture notes and assignments', price: 80, stock: 45, low_stock_threshold: 10, is_active: 1, sku: 'STA-NOT', unit: 'book', image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400' },
  { id: 'p-gel-pens', store_id: 'book-corner', category_id: 'stationery', name: 'Pilot Blue Gel Pens (Pack of 3)', description: 'Smooth 0.5mm tip water-resistant ink pens', price: 60, stock: 32, low_stock_threshold: 8, is_active: 1, sku: 'STA-PEN', unit: 'pack', image_url: 'https://images.unsplash.com/photo-1585336261026-418001642279?w=400' },
  { id: 'p-highlighters', store_id: 'book-corner', category_id: 'stationery', name: 'Pastel Highlighters (Set of 6)', description: 'Non-toxic quick-drying pastel study markers', price: 120, stock: 20, low_stock_threshold: 4, is_active: 1, sku: 'STA-HIG', unit: 'set', image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400' },
  { id: 'p-calculator', store_id: 'book-corner', category_id: 'stationery', name: 'Scientific Calculator fx-991ES', description: 'Approved exam calculator with 417 scientific functions', price: 850, stock: 8, low_stock_threshold: 3, is_active: 1, sku: 'STA-CAL', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400' },

  // TechStop
  { id: 'p-usb-cable', store_id: 'techstop', category_id: 'electronics', name: '60W USB-C Braided Cable', description: 'Fast charging high-durability 1.5m braided cord', price: 299, stock: 15, low_stock_threshold: 4, is_active: 1, sku: 'TEC-USB', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400' },
  { id: 'p-power-bank', store_id: 'techstop', category_id: 'electronics', name: '10000mAh Slim Power Bank', description: 'Dual USB output fast-charging portable charger', price: 899, stock: 9, low_stock_threshold: 3, is_active: 1, sku: 'TEC-POW', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1609592424368-2321852233f2?w=400' },
  { id: 'p-earbuds', store_id: 'techstop', category_id: 'electronics', name: 'Wireless ENC Earbuds', description: 'Clear voice calls with 28hr battery life and low latency', price: 1299, stock: 6, low_stock_threshold: 2, is_active: 1, sku: 'TEC-EAR', unit: 'pair', image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' },
  { id: 'p-wireless-mouse', store_id: 'techstop', category_id: 'electronics', name: 'Silent Wireless Mouse', description: 'Ergonomic 2.4GHz USB optical mouse for study desks', price: 449, stock: 12, low_stock_threshold: 3, is_active: 1, sku: 'TEC-MOU', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400' },

  // Campus Mart
  { id: 'p-instant-noodles', store_id: 'campus-mart', category_id: 'food', name: 'Maggi 2-Minute Noodles (4-Pack)', description: 'Classic masala instant noodles for late night study sessions', price: 56, stock: 40, low_stock_threshold: 10, is_active: 1, sku: 'MAR-MAG', unit: 'pack', image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400' },
  { id: 'p-energy-drink', store_id: 'campus-mart', category_id: 'food', name: 'Red Bull 250ml Can', description: 'Vitalizes body and mind during exam preps', price: 125, stock: 22, low_stock_threshold: 5, is_active: 1, sku: 'MAR-RED', unit: 'can', image_url: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400' },
  { id: 'p-potato-chips', store_id: 'campus-mart', category_id: 'food', name: 'Lays Magic Masala (Large)', description: 'Crispy seasoned potato chips', price: 30, stock: 35, low_stock_threshold: 8, is_active: 1, sku: 'MAR-LAY', unit: 'pack', image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },

  // Campus Wear
  { id: 'p-hoodie', store_id: 'campus-wear', category_id: 'fashion', name: 'UniMall Varsity Navy Hoodie', description: 'Soft fleece heavyweight hoodie with embroidered crest', price: 999, stock: 16, low_stock_threshold: 4, is_active: 1, sku: 'WEA-HOD', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400' },
  { id: 'p-tshirt', store_id: 'campus-wear', category_id: 'fashion', name: 'Campus Connect Graphic Tee', description: '100% combed cotton breathable oversized t-shirt', price: 499, stock: 25, low_stock_threshold: 6, is_active: 1, sku: 'WEA-TEE', unit: 'piece', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400' },

  // Health Hub
  { id: 'p-paracetamol', store_id: 'health-hub', category_id: 'health', name: 'Paracetamol 650mg (Strip of 10)', description: 'Effective relief for mild headache, fever and aches', price: 32, stock: 50, low_stock_threshold: 12, is_active: 1, sku: 'HEA-PAR', unit: 'strip', image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
  { id: 'p-bandages', store_id: 'health-hub', category_id: 'health', name: 'Adhesive First Aid Bandages (20x)', description: 'Waterproof sterile emergency cuts & scrape strips', price: 45, stock: 30, low_stock_threshold: 6, is_active: 1, sku: 'HEA-BAN', unit: 'box', image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400' },
  { id: 'p-sanitizer', store_id: 'health-hub', category_id: 'health', name: 'Pocket Hand Sanitizer 50ml', description: '70% alcohol instant germ protection spray', price: 40, stock: 28, low_stock_threshold: 5, is_active: 1, sku: 'HEA-SAN', unit: 'bottle', image_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400' }
];

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
      window.location.href = 'login.html';
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

/**
 * Unified Client-Side Handler (Supabase PostgREST + LocalStorage)
 */
async function handleClientAdminRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // ── /auth/me ──
  if (endpoint === '/auth/me') {
    const cachedUser = sessionStorage.getItem('unimall_admin_user');
    const cachedStores = sessionStorage.getItem('unimall_admin_stores');
    return {
      user: cachedUser ? JSON.parse(cachedUser) : { id: 'admin', name: 'UniMall Admin', role: 'platform_admin' },
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
      const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
      const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
      const reg = registeredStores.find(r => r.storeId === storeId);

      let store = DEFAULT_STORES_INFO[storeId];
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
      // Save updated store settings
      const customStoreSettings = JSON.parse(localStorage.getItem('unimall_custom_store_settings') || '{}');
      customStoreSettings[storeId] = { ...(customStoreSettings[storeId] || {}), ...body };
      localStorage.setItem('unimall_custom_store_settings', JSON.stringify(customStoreSettings));
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

    // Broadcast event
    window.dispatchEvent(new CustomEvent('unimall:storeStatusChanged', { detail: { storeId, isOpen: newState } }));
    try {
      localStorage.setItem('unimall_store_status_event', JSON.stringify({ storeId, isOpen: newState, timestamp: Date.now() }));
    } catch(e) {}

    return { success: true, is_open: newState ? 1 : 0 };
  }

  // ── GET Orders: /admin/stores/:storeId/orders ──
  const ordersMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/orders/);
  if (ordersMatch && method === 'GET') {
    const storeId = ordersMatch[1];
    let ordersList = [];

    // Try Supabase first
    if (typeof window.UniMallDB !== 'undefined') {
      try {
        let query = `unimall_orders?order=created_at.desc&select=*,unimall_order_items(*),unimall_order_status_history(*)`;
        if (storeId !== 'all') {
          query += `&store_id=eq.${encodeURIComponent(storeId)}`;
        }
        const dbOrders = await window.UniMallDB.req(query);
        if (Array.isArray(dbOrders) && dbOrders.length > 0) {
          ordersList = dbOrders.map(o => ({
            id: o.id,
            order_number: o.id,
            user_name: o.user_name || 'Student',
            user_phone: o.user_phone || 'N/A',
            store_id: o.store_id,
            subtotal: parseFloat(o.subtotal || 0),
            delivery_fee: parseFloat(o.delivery_fee || 0),
            total_amount: parseFloat(o.total || 0),
            total: parseFloat(o.total || 0),
            status: (o.status || 'placed').toUpperCase(),
            fulfillment_type: o.fulfillment_type || 'counter-pickup',
            delivery_location: o.user_hostel ? `${o.user_hostel} - ${o.user_room}` : 'Campus Counter',
            created_at: o.created_at,
            items: (o.unimall_order_items || []).map(i => ({
              product_name: i.product_name,
              name: i.product_name,
              quantity: i.qty || 1,
              price: parseFloat(i.price || 0)
            }))
          }));
        }
      } catch (err) {}
    }

    // Merge with orders from localStorage unimall_v1
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const localOrders = appData.orders
            .filter(o => storeId === 'all' || !o.storeId || o.storeId === storeId || storeId.includes('cafe'))
            .map(o => ({
              id: o.id,
              order_number: o.id,
              user_name: (o.customer?.name || o.userName || 'Student').trim(),
              user_phone: o.customer?.phone || '+91 98765 00000',
              store_id: o.storeId || storeId,
              subtotal: parseFloat(o.subtotal || o.total || 0),
              delivery_fee: parseFloat(o.deliveryFee || 0),
              total_amount: parseFloat(o.total || 0),
              total: parseFloat(o.total || 0),
              status: (o.status || 'placed').toUpperCase(),
              fulfillment_type: o.fulfillmentType || 'counter-pickup',
              delivery_location: o.deliveryInfo ? `${o.deliveryInfo.hostel} - ${o.deliveryInfo.room}` : 'Counter Pickup',
              created_at: o.createdAt || o.date || new Date().toISOString(),
              items: (o.items || []).map(i => ({
                product_name: i.name,
                name: i.name,
                quantity: i.qty || 1,
                price: parseFloat(i.price || 0)
              }))
            }));

          // Deduplicate by ID
          const existingIds = new Set(ordersList.map(o => o.id));
          localOrders.forEach(o => {
            if (!existingIds.has(o.id)) {
              ordersList.push(o);
            }
          });
        }
      }
    } catch(e) {}

    // Sort by created_at desc
    ordersList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
          const ord = appData.orders.find(o => o.id === orderId);
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
      // 1. Get products from localStorage custom modifications or base catalog
      let catalog = getStoredCatalog();
      let storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);

      // If store is empty, fallback to default products
      if (storeProds.length === 0 && storeId !== 'all') {
        storeProds = DEFAULT_PRODUCTS.filter(p => p.store_id === storeId);
        if (storeProds.length > 0) {
          saveStoredCatalog([...catalog, ...storeProds]);
        }
      }

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
      const newProd = {
        id: 'p-' + Date.now().toString().slice(-6),
        store_id: storeId,
        category_id: body.category_id || 'food',
        name: body.name,
        description: body.description || '',
        price: parseFloat(body.price),
        stock: parseInt(body.stock || 20, 10),
        low_stock_threshold: parseInt(body.low_stock_threshold || 5, 10),
        sku: body.sku || 'SKU-' + Date.now().toString().slice(-4),
        unit: body.unit || 'item',
        is_active: 1,
        image_url: body.image_url || '',
        availability: 'in_stock'
      };

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
      if (idx !== -1) {
        catalog[idx] = { ...catalog[idx], ...body };
        if (body.price !== undefined) catalog[idx].price = parseFloat(body.price);
        if (body.stock !== undefined) {
          catalog[idx].stock = parseInt(body.stock, 10);
          catalog[idx].availability = catalog[idx].stock === 0 ? 'out_of_stock' : (catalog[idx].stock <= (catalog[idx].low_stock_threshold || 5) ? 'low_stock' : 'in_stock');
        }
        saveStoredCatalog(catalog);
        notifyCatalogUpdated();
        return { success: true, product: catalog[idx] };
      }
      return { success: true };
    }

    if (method === 'DELETE') {
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
    const catalog = getStoredCatalog();
    let storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);

    if (storeProds.length === 0 && storeId !== 'all') {
      storeProds = DEFAULT_PRODUCTS.filter(p => p.store_id === storeId);
    }

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

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const pendingOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));

    const catalog = getStoredCatalog();
    const storeProds = storeId === 'all' ? catalog : catalog.filter(p => p.store_id === storeId || p.storeId === storeId);
    const lowStockCount = storeProds.filter(p => (p.stock ?? 20) <= (p.low_stock_threshold || 5)).length;

    return {
      stats: {
        total_orders: orders.length,
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

  // Initialize with DEFAULT_PRODUCTS
  localStorage.setItem('unimall_products_catalog', JSON.stringify(DEFAULT_PRODUCTS));
  return [...DEFAULT_PRODUCTS];
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
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
window.escapeHtml = escapeHtml;

