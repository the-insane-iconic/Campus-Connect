/* ═══════════════════════════════════════════════════════════
   UniMall · js/data.js
   Database is the single source of truth. STORES and PRODUCTS
   are populated exclusively from Neon PostgreSQL at runtime.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── STORES ─────────────────────────────────────────────── */
// Intentionally empty — populated from Neon DB via syncCatalogWithSupabase()
let STORES = [];

/* ─── CATEGORIES ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'food',        label: 'Food & Drinks', colorClass: 'cat-food',        icon: `<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>` },
  { id: 'fashion',     label: 'Fashion',       colorClass: 'cat-fashion',     icon: `<svg viewBox="0 0 24 24"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>` },
  { id: 'electronics', label: 'Electronics',   colorClass: 'cat-electronics', icon: `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
  { id: 'stationery',  label: 'Stationery',    colorClass: 'cat-stationery',  icon: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>` },
  { id: 'essentials',  label: 'Essentials',    colorClass: 'cat-essentials',  icon: `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>` },
  { id: 'more',        label: 'More',          colorClass: 'cat-more',        icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>` },
];

/* ─── AVAILABILITY FILTER CHIPS ──────────────────────────── */
const AVAIL_CHIPS = [
  { id: 'nearby',   label: 'Near you',       dotClass: '',      field: 'isNearby',          value: true  },
  { id: 'instock',  label: 'In stock',        dotClass: '',      field: 'availability',      value: 'in-stock' },
  { id: 'lowstock', label: 'Low stock',       dotClass: 'amber', field: 'availability',      value: 'low-stock' },
  { id: 'delivery', label: 'Hostel delivery', dotClass: 'blue',  field: 'deliveryAvailable', value: true  },
  { id: 'pickup',   label: 'Pickup only',     dotClass: 'grey',  field: 'pickupAvailable',   value: true  },
];

/* ─── PRODUCTS ───────────────────────────────────────────── */
// Intentionally empty — populated from Neon DB via syncCatalogWithSupabase()
// Shape reference:
//   id, name, description, price, emoji, bg, categoryId, storeId,
//   stock, availability, deliveryAvailable, pickupAvailable,
//   rating, isNearby, isPopular, isRestocked
let PRODUCTS = [];
/* ─── CAMPUS OPERATIONAL INFO ────────────────────────────── */
const CAMPUS_INFO = {
  mallHours:   '8:00 AM – 10:00 PM',
  isOpen:      true,
  delivery:    { available: true,  window: '30–45 min' },
  pickupPoint: 'Ground floor, near main entrance',
  storesOpen:  0,
  storesTotal: 0,
};

/* ─── NOTIFICATIONS ─────────────────────────────────────── */
// Populated from DB at runtime — no hardcoded notifications
const INITIAL_NOTIFICATIONS = [];

/* ─── AUTHENTICATED USER STATE ───────────────────────────── */
const DEFAULT_USER = {
  name:   '',
  email:  '',
  hostel: '',
  room:   '',
  avatar: '',
  phone:  '',
  isGuest: true
};

/* ─── SUPABASE LIVE SYNC ─────────────────────────────────── */
async function syncCatalogWithSupabase() {
  if (typeof window.UniMallDB === 'undefined') return false;
  try {
    const [dbStores, dbProducts] = await Promise.all([
      window.UniMallDB.getStores().catch(() => null),
      window.UniMallDB.getProducts().catch(() => null)
    ]);

    let hasChanged = false;

    if (dbStores && Array.isArray(dbStores) && dbStores.length > 0) {
      const prevIds = STORES.map(s => s.id).sort().join(',');
      const newIds = dbStores.map(s => s.id).sort().join(',');
      if (prevIds !== newIds || dbStores.length !== STORES.length) {
        hasChanged = true;
      STORES = dbStores.map(s => ({
          id: s.id,
          name: s.name,
          floor: s.floor ? s.floor.replace(' Floor', '') : 'Ground',
          openNow: s.is_open !== false,
          isVisible: s.is_visible !== false, // default visible when null (new stores)
          hours: `${s.opening_time || '8:00 AM'} – ${s.closing_time || '10:00 PM'}`,
          category: s.category || 'essentials',
          location: s.location || 'Campus Center',
          coverImage: s.cover_image || '',
          rating: Number(s.rating) || 4.5
        }));
      }
    }

    if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
      const prevProdIds = PRODUCTS.map(p => p.id).sort().join(',');
      const newProdIds = dbProducts.map(p => p.id).sort().join(',');
      if (prevProdIds !== newProdIds || dbProducts.length !== PRODUCTS.length) {
        hasChanged = true;
        PRODUCTS = dbProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price) || 0,
          emoji: p.emoji || '📦',
          bg: p.bg || '#F8FAFC',
          image: p.image || '',
          categoryId: p.category_id,
          storeId: p.store_id,
          description: p.description || '',
          stock: p.stock ?? 20,
          availability: p.availability || 'in-stock',
          deliveryAvailable: p.delivery_available !== false,
          pickupAvailable: p.pickup_available !== false,
          rating: Number(p.rating) || 4.5,
          isNearby: Boolean(p.is_nearby),
          isPopular: Boolean(p.is_popular),
          isRestocked: Boolean(p.is_restocked)
        }));
      }
    }
    return hasChanged;
  } catch (err) {
    console.warn('[UniMall] Supabase catalog sync note:', err.message);
    return false;
  }
}

/* ─── SYNC STORE STATUSES & ADMIN EDITS ───────────────────── */
function syncStoreStatusesFromAdmin() {
  try {
    const raw = localStorage.getItem('unimall_store_statuses');
    const storeStatuses = raw ? JSON.parse(raw) : {};
    const visRaw = localStorage.getItem('unimall_store_visibility');
    const storeVisibility = visRaw ? JSON.parse(visRaw) : {};

    // 1. Update STORES openNow and isVisible status using direct store ID
    STORES.forEach(s => {
      if (storeStatuses[s.id] !== undefined) {
        s.openNow = Boolean(storeStatuses[s.id]);
      }
      // Apply localStorage visibility override (immediate cross-tab, before DB reflects)
      if (storeVisibility[s.id] !== undefined) {
        s.isVisible = Boolean(storeVisibility[s.id]);
      }
    });

    // 2. Incorporate approved registered stores
    const regRaw = localStorage.getItem('unimall_registered_stores');
    if (regRaw) {
      const regStores = JSON.parse(regRaw);
      regStores.filter(r => r.status === 'approved').forEach(r => {
        if (!STORES.some(s => s.id === r.storeId)) {
          const isOpen = storeStatuses[r.storeId] !== false;
          STORES.push({
            id: r.storeId,
            name: r.storeName,
            floor: r.location || 'Campus Center',
            openNow: isOpen,
            hours: r.operatingHours || '9:00 AM – 9:00 PM',
            category: r.storeType || 'general',
            location: r.location || 'Campus Center',
            rating: 4.8
          });
        }
      });
    }

    // 3. Sync any price/stock updates from admin catalog
    const catRaw = localStorage.getItem('unimall_products_catalog');
    if (catRaw) {
      const adminCatalog = JSON.parse(catRaw);
      adminCatalog.forEach(ap => {
        const prod = PRODUCTS.find(p => p.id === ap.id);
        if (prod) {
          if (ap.price !== undefined) prod.price = parseFloat(ap.price);
          if (ap.stock !== undefined) prod.stock = parseInt(ap.stock, 10);
          if (ap.is_active !== undefined) prod.isActive = ap.is_active === 1;
        } else if (ap.name && ap.store_id) {
          // New product created by store manager
          PRODUCTS.push({
            id: ap.id,
            name: ap.name,
            price: parseFloat(ap.price) || 0,
            emoji: '📦',
            bg: '#F8FAFC',
            image: ap.image_url || '',
            categoryId: ap.category_id || 'food',
            storeId: ap.store_id,
            description: ap.description || '',
            stock: ap.stock ?? 20,
            availability: ap.stock === 0 ? 'out-of-stock' : 'in-stock',
            deliveryAvailable: true,
            pickupAvailable: true,
            rating: 4.8,
            isNearby: true,
            isPopular: false,
            isRestocked: false
          });
        }
      });
    }

    // 4. Update AppState if available — filter out products from hidden stores
    if (typeof AppState !== 'undefined') {
      const hiddenStoreIds = new Set(
        STORES.filter(s => s.isVisible === false).map(s => s.id)
      );
      AppState.products = PRODUCTS.filter(p =>
        p.isActive !== false && !hiddenStoreIds.has(p.storeId)
      );
    }
  } catch (err) {
    console.warn('[UniMall] syncStoreStatusesFromAdmin note:', err);
  }
}
window.syncStoreStatusesFromAdmin = syncStoreStatusesFromAdmin;
