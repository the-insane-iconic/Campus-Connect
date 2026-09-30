/* ═══════════════════════════════════════════════════════════
   UniMall · js/data.js
   Single source of truth. Replace with fetch() calls when
   a real backend exists — object shapes must stay the same.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── STORES ─────────────────────────────────────────────── */
let STORES = [
  { id: 'campus-cafe',  name: 'Campus Café',   floor: 'Ground',  openNow: true,  hours: '7:30 AM – 9:30 PM' },
  { id: 'book-corner',  name: 'Book Corner',   floor: 'First',   openNow: true,  hours: '9:00 AM – 8:00 PM' },
  { id: 'techstop',     name: 'TechStop',      floor: 'Second',  openNow: true,  hours: '10:00 AM – 9:00 PM' },
  { id: 'campus-mart',  name: 'Campus Mart',   floor: 'Ground',  openNow: true,  hours: '8:00 AM – 10:00 PM' },
  { id: 'campus-wear',  name: 'Campus Wear',   floor: 'First',   openNow: false, hours: '11:00 AM – 8:00 PM' },
  { id: 'health-hub',   name: 'Health Hub',    floor: 'Ground',  openNow: true,  hours: '8:00 AM – 9:00 PM' },
];

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
/*
  Full production shape. Fields:
    id, name, description, price, emoji, bg
    categoryId    — matches CATEGORIES[].id
    storeId       — matches STORES[].id
    stock         — integer (units available)
    availability  — 'in-stock' | 'low-stock' | 'out-of-stock' | 'preorder'
    deliveryAvailable — boolean
    pickupAvailable   — boolean
    rating        — 0–5 float
    isNearby, isPopular, isRestocked — homepage section flags
*/
let PRODUCTS = [
  {
    "id": "prod_cafe_01",
    "name": "Cold Brew Coffee",
    "price": 120,
    "emoji": "☕",
    "bg": "#FEF9EB",
    "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80",
    "categoryId": "food",
    "storeId": "campus-cafe",
    "description": "Smooth, slow-steeped cold brew with a rich, bold flavor. Served ice-cold at the counter.",
    "stock": 25,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_cafe_02",
    "name": "Masala Chai Flask (500ml)",
    "price": 70,
    "emoji": "☕",
    "bg": "#FEF9EB",
    "image": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
    "categoryId": "food",
    "storeId": "campus-cafe",
    "description": "Steaming hot spiced cardamom & ginger tea. Ideal fuel for study sessions with friends.",
    "stock": 30,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.9,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_cafe_03",
    "name": "Butter Croissant",
    "price": 85,
    "emoji": "🥐",
    "bg": "#FFF7ED",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    "categoryId": "food",
    "storeId": "campus-cafe",
    "description": "Flaky, golden-baked buttery croissant prepared fresh in the campus bakery daily.",
    "stock": 18,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.7,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_cafe_04",
    "name": "Grilled Veg Club Sandwich",
    "price": 110,
    "emoji": "🥪",
    "bg": "#F0FDF4",
    "image": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
    "categoryId": "food",
    "storeId": "campus-cafe",
    "description": "Triple-decker toasted sandwich with cheese, fresh veggies, and house herb mayo.",
    "stock": 20,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.6,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": false
  },
  {
    "id": "prod_book_01",
    "name": "A4 Spiral Notebook (200 pgs)",
    "price": 65,
    "emoji": "📓",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    "categoryId": "stationery",
    "storeId": "book-corner",
    "description": "200 pages, 70 GSM ruled paper with smooth writing surface and durable spiral binding.",
    "stock": 50,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.7,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_book_02",
    "name": "Ballpoint Pens (10-Pack)",
    "price": 35,
    "emoji": "🖊️",
    "bg": "#F0FDF4",
    "image": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
    "categoryId": "stationery",
    "storeId": "book-corner",
    "description": "Smooth smudge-free blue ballpoint pens. Reliable for everyday lectures and final exams.",
    "stock": 80,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_book_03",
    "name": "Pastel Sticky Notes 5-Pack",
    "price": 85,
    "emoji": "📝",
    "bg": "#FEF9EE",
    "image": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80",
    "categoryId": "stationery",
    "storeId": "book-corner",
    "description": "Soft pastel sticky reminder pads (400 sheets). Strong residue-free adhesive.",
    "stock": 40,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_book_04",
    "name": "Engineering Graph Pad",
    "price": 75,
    "emoji": "📈",
    "bg": "#F0FDF4",
    "image": "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&auto=format&fit=crop&q=80",
    "categoryId": "stationery",
    "storeId": "book-corner",
    "description": "100 sheets mm-grid millimeter graph sheets with clean perforated tear-off edges.",
    "stock": 35,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.6,
    "isNearby": false,
    "isPopular": false,
    "isRestocked": true
  },
  {
    "id": "prod_tech_01",
    "name": "True Wireless Earbuds",
    "price": 999,
    "emoji": "🎧",
    "bg": "#F5F3FF",
    "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    "categoryId": "electronics",
    "storeId": "techstop",
    "description": "TWS earbuds with 28-hour battery, deep bass, and instant Bluetooth 5.3 pairing.",
    "stock": 12,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_tech_02",
    "name": "USB-C Fast Charger 25W",
    "price": 349,
    "emoji": "🔌",
    "bg": "#ECFDF5",
    "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
    "categoryId": "electronics",
    "storeId": "techstop",
    "description": "25W Type-C Power Delivery wall adapter with certified surge and thermal protection.",
    "stock": 25,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.7,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_tech_03",
    "name": "Power Bank 10,000mAh 22.5W",
    "price": 899,
    "emoji": "🔋",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=600&auto=format&fit=crop&q=80",
    "categoryId": "electronics",
    "storeId": "techstop",
    "description": "Compact pocket battery pack with twin USB outputs and fast bi-directional Type-C PD.",
    "stock": 15,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.9,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_tech_04",
    "name": "Wireless Silent Mouse",
    "price": 499,
    "emoji": "🖱️",
    "bg": "#FEF9EB",
    "image": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
    "categoryId": "electronics",
    "storeId": "techstop",
    "description": "Whisper-quiet clicks, 2.4GHz USB nano receiver, and ergonomic palm contour.",
    "stock": 20,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.6,
    "isNearby": false,
    "isPopular": false,
    "isRestocked": true
  },
  {
    "id": "prod_mart_01",
    "name": "Classic Salted Chips Pack",
    "price": 30,
    "emoji": "🥔",
    "bg": "#FEF9EB",
    "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "campus-mart",
    "description": "Crisp, golden sliced potato chips with classic sea salt seasoning. Quick hostel snack.",
    "stock": 60,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_mart_02",
    "name": "Instant Noodles Cup",
    "price": 45,
    "emoji": "🍜",
    "bg": "#FFF7ED",
    "image": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "campus-mart",
    "description": "Hot ready-in-3-minutes spiced vegetable instant noodles cup. The ultimate late-night meal.",
    "stock": 50,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.6,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": true
  },
  {
    "id": "prod_mart_03",
    "name": "Energy Drink Can 350ml",
    "price": 125,
    "emoji": "⚡",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "campus-mart",
    "description": "Carbonated taurine & B-vitamin booster to stay sharp through project submissions.",
    "stock": 30,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.4,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_mart_04",
    "name": "Natural Mineral Water 1 Litre",
    "price": 20,
    "emoji": "💧",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "campus-mart",
    "description": "Clean, refreshing mineral hydration bottle essential for lectures and campus sports.",
    "stock": 100,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": false
  },
  {
    "id": "prod_wear_01",
    "name": "Oversized Campus Hoodie — Navy",
    "price": 649,
    "emoji": "🧥",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
    "categoryId": "fashion",
    "storeId": "campus-wear",
    "description": "Plush 320 GSM fleece unisex hoodie with kangaroo pocket and embroidered campus monogram.",
    "stock": 15,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_wear_02",
    "name": "Collegiate Varsity Jacket",
    "price": 1299,
    "emoji": "🧥",
    "bg": "#FEF9EB",
    "image": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
    "categoryId": "fashion",
    "storeId": "campus-wear",
    "description": "Vintage collegiate wool-blend varsity jacket with snap buttons and striped rib trims.",
    "stock": 10,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.9,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_wear_03",
    "name": "100% Cotton Crewneck Tee",
    "price": 449,
    "emoji": "👕",
    "bg": "#F0FDF4",
    "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    "categoryId": "fashion",
    "storeId": "campus-wear",
    "description": "Breathable bio-washed combed cotton everyday student tee. Ultra-soft and durable.",
    "stock": 35,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.7,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": false
  },
  {
    "id": "prod_wear_04",
    "name": "Classic Cotton Baseball Cap",
    "price": 299,
    "emoji": "🧢",
    "bg": "#EFF6FF",
    "image": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop&q=80",
    "categoryId": "fashion",
    "storeId": "campus-wear",
    "description": "Unstructured 6-panel strapback cap with curved visor and brass sizing buckle.",
    "stock": 25,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": false
  },
  {
    "id": "prod_health_01",
    "name": "Whey Protein Bar — Chocolate",
    "price": 80,
    "emoji": "🍫",
    "bg": "#FFF1F2",
    "image": "https://images.unsplash.com/photo-1622484212850-cab596d63c5d?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "health-hub",
    "description": "20g whey protein with 0g added sugar. Delicious dark chocolate crisp for quick fuel.",
    "stock": 40,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.7,
    "isNearby": true,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_health_02",
    "name": "Roasted Salted Almonds 100g",
    "price": 140,
    "emoji": "🥜",
    "bg": "#FEF9EE",
    "image": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "health-hub",
    "description": "Slow-roasted California almonds lightly seasoned with mineral-rich pink Himalayan salt.",
    "stock": 30,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.8,
    "isNearby": false,
    "isPopular": true,
    "isRestocked": false
  },
  {
    "id": "prod_health_03",
    "name": "Greek Blueberry Probiotic Yogurt",
    "price": 55,
    "emoji": "🫐",
    "bg": "#F5F3FF",
    "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "health-hub",
    "description": "Thick strained probiotic Greek yogurt made with real wild blueberry compote.",
    "stock": 25,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.6,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": true
  },
  {
    "id": "prod_health_04",
    "name": "Hostel First-Aid Kit",
    "price": 249,
    "emoji": "🩹",
    "bg": "#FFF1F2",
    "image": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80",
    "categoryId": "essentials",
    "storeId": "health-hub",
    "description": "Essential medical pouch containing antiseptic lotion, band-aids, burn cream & cotton gauze.",
    "stock": 20,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.9,
    "isNearby": true,
    "isPopular": false,
    "isRestocked": false
  }
];
/* ─── CAMPUS OPERATIONAL INFO ────────────────────────────── */
const CAMPUS_INFO = {
  mallHours:   '8:00 AM – 10:00 PM',
  isOpen:      true,
  delivery:    { available: true,  window: '30–45 min' },
  pickupPoint: 'Ground floor, near main entrance',
  storesOpen:  14,
  storesTotal: 18,
};

/* ─── MOCK NOTIFICATIONS ─────────────────────────────────── */
const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'order',   title: 'Order ready for pickup',   body: 'Your order #UM1021 is ready at the Ground floor pickup point.', time: '2 min ago',  read: false },
  { id: 'n2', type: 'stock',   title: 'Back in stock',            body: 'Wireless Earbuds are available again at TechStop. Only a few left!', time: '1 hr ago', read: false },
  { id: 'n3', type: 'request', title: 'Item request update',      body: 'We found "Scientific Calculator" at Book Corner. Tap to view.', time: '3 hr ago', read: true  },
  { id: 'n4', type: 'order',   title: 'Order delivered',          body: 'Your order #UM1018 was delivered to Room 214. Enjoy!', time: 'Yesterday', read: true  },
];

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

    // 1. Update STORES openNow status
    const aliasMap = {
      'campus-cafe': ['store-bakery', 'campus-cafe'],
      'book-corner': ['store-stationery', 'book-corner'],
      'techstop': ['store-electronics', 'techstop'],
      'campus-mart': ['store-sports', 'campus-mart'],
      'campus-wear': ['store-fashion', 'campus-wear'],
      'health-hub': ['store-pharmacy', 'health-hub']
    };

    STORES.forEach(s => {
      const checkKeys = [s.id, ...(aliasMap[s.id] || [])];
      for (const k of checkKeys) {
        if (storeStatuses[k] !== undefined) {
          s.openNow = Boolean(storeStatuses[k]);
          break;
        }
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

    // 4. Update AppState if available
    if (typeof AppState !== 'undefined') {
      AppState.products = PRODUCTS.filter(p => p.isActive !== false);
    }
  } catch (err) {
    console.warn('[UniMall] syncStoreStatusesFromAdmin note:', err);
  }
}
window.syncStoreStatusesFromAdmin = syncStoreStatusesFromAdmin;
