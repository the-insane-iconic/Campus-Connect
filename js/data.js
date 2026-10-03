/* ═══════════════════════════════════════════════════════════
   UniMall · js/data.js
   Database is the single source of truth. STORES and PRODUCTS
   are populated exclusively from Neon PostgreSQL at runtime.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── AUTHORITATIVE PRE-HYDRATED CATALOG (0ms Instant Native Boot) ─── */
const DEFAULT_STORES = [
  {
    "id": "campus-cafe",
    "name": "Campus Bakery & Café",
    "floor": "Ground",
    "openNow": true,
    "isVisible": true,
    "hours": "7:30 AM – 10:00 PM",
    "category": "food",
    "location": "Block A, Food Court",
    "coverImage": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
    "rating": 4.7
  },
  {
    "id": "book-corner",
    "name": "Stationery Hub & Book Corner",
    "floor": "First",
    "openNow": true,
    "isVisible": true,
    "hours": "9:00 AM – 8:30 PM",
    "category": "stationery",
    "location": "Block B, Academic Wing",
    "coverImage": "https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800",
    "rating": 4.6
  },
  {
    "id": "techstop",
    "name": "TechStop Electronics",
    "floor": "Ground",
    "openNow": true,
    "isVisible": true,
    "hours": "10:00 AM – 9:00 PM",
    "category": "electronics",
    "location": "Block C, Tech Hub",
    "coverImage": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800",
    "rating": 4.5
  },
  {
    "id": "campus-mart",
    "name": "Campus Mart & Groceries",
    "floor": "Ground",
    "openNow": true,
    "isVisible": true,
    "hours": "8:00 AM – 11:00 PM",
    "category": "essentials",
    "location": "Hostel Quadrangle",
    "coverImage": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800",
    "rating": 4.3
  },
  {
    "id": "campus-wear",
    "name": "Campus Wear & Style Square",
    "floor": "First",
    "openNow": true,
    "isVisible": true,
    "hours": "11:00 AM – 8:00 PM",
    "category": "fashion",
    "location": "Student Activity Center",
    "coverImage": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
    "rating": 4.6
  },
  {
    "id": "nand-juice",
    "name": "Nand Juice",
    "floor": "Ground",
    "openNow": true,
    "isVisible": true,
    "hours": "09:00 AM – 09:00 PM",
    "category": "food",
    "location": "Infornt of Mba block",
    "coverImage": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=900&auto=format&fit=crop&q=80",
    "rating": 4.5
  },
  {
    "id": "health-hub",
    "name": "Health Hub & Care",
    "floor": "Ground",
    "openNow": true,
    "isVisible": true,
    "hours": "8:00 AM – 9:00 PM",
    "category": "essentials",
    "location": "Near Campus Clinic",
    "coverImage": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    "rating": 4.5
  }
];

const DEFAULT_PRODUCTS = [
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
    "id": "test-prod-1",
    "name": "Fresh Orange Juice",
    "price": 60,
    "emoji": "🍊",
    "bg": "#F8FAFC",
    "image": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500",
    "categoryId": "food",
    "storeId": "nand-juice",
    "description": "Cold pressed orange juice",
    "stock": 25,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": false,
    "isPopular": false,
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
    "id": "p-693337",
    "name": "Mango Juice Buddy",
    "price": 45,
    "emoji": "📦",
    "bg": "#F8FAFC",
    "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
    "categoryId": "food",
    "storeId": "nand-juice",
    "description": "fresh aam ka juice",
    "stock": 100,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": false,
    "isPopular": false,
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
    "id": "p-test-1938",
    "name": "Pineapple Mint Cooler",
    "price": 55,
    "emoji": "🍍",
    "bg": "#F8FAFC",
    "image": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500",
    "categoryId": "food",
    "storeId": "nand-juice",
    "description": "Chilled fresh pineapple juice with crushed mint",
    "stock": 30,
    "availability": "in-stock",
    "deliveryAvailable": false,
    "pickupAvailable": true,
    "rating": 4.5,
    "isNearby": false,
    "isPopular": false,
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
  }
];

/* ─── STORES ─────────────────────────────────────────────── */
let STORES = [...DEFAULT_STORES];
window.STORES = STORES;

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
let PRODUCTS = [...DEFAULT_PRODUCTS];
window.PRODUCTS = PRODUCTS;
/* ─── CAMPUS OPERATIONAL INFO ────────────────────────────── */
const CAMPUS_INFO = {
  mallHours:   '8:00 AM – 10:00 PM',
  isOpen:      true,
  delivery:    { available: true,  window: '30–45 min' },
  pickupPoint: 'Ground floor, near main entrance',
  storesOpen: 7,
  storesTotal: 7,
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
      if (prevIds !== newIds || dbStores.length !== STORES.length || STORES.length === 0) {
        hasChanged = true;
      }
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
      window.STORES = STORES;
    }

    if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
      const prevProdIds = PRODUCTS.map(p => p.id).sort().join(',');
      const newProdIds = dbProducts.map(p => p.id).sort().join(',');
      if (prevProdIds !== newProdIds || dbProducts.length !== PRODUCTS.length || PRODUCTS.length === 0) {
        hasChanged = true;
      }
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
      window.PRODUCTS = PRODUCTS;
    }

    // Apply visibility and store status overrides
    syncStoreStatusesFromAdmin();

    // Authoritatively calculate active campus operational store counts
    const visibleStores = STORES.filter(s => s.isVisible !== false);
    CAMPUS_INFO.storesTotal = visibleStores.length;
    CAMPUS_INFO.storesOpen = visibleStores.filter(s => s.openNow).length;

    // Always keep AppState synchronized
    if (typeof AppState !== 'undefined') {
      AppState.stores = STORES;
      const hiddenStoreIds = new Set(
        STORES.filter(s => s.isVisible === false).map(s => s.id)
      );
      AppState.products = PRODUCTS.filter(p =>
        p.isActive !== false && !hiddenStoreIds.has(p.storeId)
      );
    }

    // Immediately reflect store count in the campus operational info bar
    if (typeof renderCampusInfo === 'function') {
      renderCampusInfo();
    }

    return hasChanged || (typeof AppState !== 'undefined' && AppState.products.length > 0);
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
window.syncCatalogWithSupabase = syncCatalogWithSupabase;
window.DEFAULT_STORES = DEFAULT_STORES;
window.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
window.STORES = STORES;
window.PRODUCTS = PRODUCTS;
window.CATEGORIES = CATEGORIES;
window.AVAIL_CHIPS = AVAIL_CHIPS;
window.CAMPUS_INFO = CAMPUS_INFO;
