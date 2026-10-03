/* ═══════════════════════════════════════════════════════════
   UniMall · store.js
   Store Detail Page — standalone controller.
   Reads ?id= from URL, renders store hero, info, tabs.
   Cart reads/writes to localStorage('unimall_v1').
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────
   STORES DATA
   Enhanced version with all fields needed for store detail.
   IDs match both the stores.js STORES and js/data.js storeId.
   ───────────────────────────────────────────────────────── */
const STORE_CATALOG = [
  {
    id: 'campus-cafe',
    dataId: 'campus-cafe',
    name: 'Campus Bakery & Café',
    emoji: '🥐',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Your go-to place for freshly baked goods, hot espresso, cold brews, and study snacks. Perfect for a quick break between classes or a cozy study session.',
    categoryLabel: 'Bakery, Snacks, Beverages',
    productCategories: ['All', 'Coffee', 'Snacks', 'Bakery', 'Beverages'],
    status: 'open',
    openingTime: '7:30 AM',
    closingTime: '10:00 PM',
    walkingTime: 2,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block A — near main entrance',
    phone: '+91 98765 01001',
    paymentMethods: 'Razorpay UPI, Cards, Cash',
    rating: 4.7,
    ratingBreakdown: [75, 16, 5, 2, 2],
    reviewCount: 0,
  },
  {
    id: 'book-corner',
    dataId: 'book-corner',
    name: 'Stationery Hub & Book Corner',
    emoji: '📚',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Everything you need for lectures, exams, and projects. Notebooks, pens, highlighters, course books, printing and study supplies all in one place.',
    categoryLabel: 'Notebooks, Pens, Supplies & Print',
    productCategories: ['All', 'Notebooks', 'Pens', 'Art', 'Files', 'Calculators'],
    status: 'open',
    openingTime: '9:00 AM',
    closingTime: '8:30 PM',
    walkingTime: 2,
    floor: 'First Floor',
    location: 'First Floor, Block B — near library',
    phone: '+91 98765 01002',
    paymentMethods: 'Razorpay UPI, Cash',
    rating: 4.6,
    ratingBreakdown: [68, 20, 7, 3, 2],
    reviewCount: 0,
  },
  {
    id: 'techstop',
    dataId: 'techstop',
    name: 'TechStop Electronics',
    emoji: '⚡',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1593344484962-796055d4a3a4?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Essential tech accessories for campus life. Chargers, earbuds, cables, power banks, laptop sleeves and study desk gadgets.',
    categoryLabel: 'Chargers, Accessories, Gadgets',
    productCategories: ['All', 'Audio', 'Charging', 'Storage', 'Accessories'],
    status: 'open',
    openingTime: '10:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 3,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block C — Tech Hub',
    phone: '+91 98765 01003',
    paymentMethods: 'Razorpay UPI, Card, Cash',
    rating: 4.5,
    ratingBreakdown: [62, 24, 9, 3, 2],
    reviewCount: 0,
  },
  {
    id: 'campus-mart',
    dataId: 'campus-mart',
    name: 'Campus Mart & Groceries',
    emoji: '🛒',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Daily campus supermarket. Late night instant noodles, ramen, chips, packaged drinks, dairy, and hostel emergency supplies.',
    categoryLabel: 'Late Night Essentials, Ramen & Groceries',
    productCategories: ['All', 'Snacks', 'Beverages', 'Instant Food', 'Essentials'],
    status: 'open',
    openingTime: '8:00 AM',
    closingTime: '11:00 PM',
    walkingTime: 2,
    floor: 'Ground Floor',
    location: 'Ground Floor, Hostel Quadrangle',
    phone: '+91 98765 01004',
    paymentMethods: 'Razorpay UPI, Card, Cash',
    rating: 4.3,
    ratingBreakdown: [55, 27, 11, 4, 3],
    reviewCount: 0,
  },
  {
    id: 'campus-wear',
    dataId: 'campus-wear',
    name: 'Campus Wear & Style Square',
    emoji: '👕',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Trendy campus apparel and collegiate merchandise. University hoodies, varsity jackets, comfortable sweatpants, caps, and casual wear.',
    categoryLabel: 'Clothing, Merchandise & Sportswear',
    productCategories: ['All', 'Hoodies', 'T-Shirts', 'Joggers', 'Caps', 'Backpacks'],
    status: 'open',
    openingTime: '11:00 AM',
    closingTime: '8:00 PM',
    walkingTime: 4,
    floor: 'First Floor',
    location: 'First Floor, Student Activity Center',
    phone: '+91 98765 01005',
    paymentMethods: 'Razorpay UPI, Card',
    rating: 4.6,
    ratingBreakdown: [66, 22, 7, 3, 2],
    reviewCount: 0,
  },
  {
    id: 'health-hub',
    dataId: 'health-hub',
    name: 'Health Hub & Care',
    emoji: '💊',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Campus pharmacy and wellness center. Protein bars, electrolytes, first-aid kits, bandages, sanitizers, and daily wellness items.',
    categoryLabel: 'Health, Wellness & First Aid',
    productCategories: ['All', 'First Aid', 'Protein & Snacks', 'Personal Care', 'Sanitizers'],
    status: 'open',
    openingTime: '8:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 1,
    floor: 'Ground Floor',
    location: 'Ground Floor, Near Campus Clinic',
    phone: '+91 98765 01006',
    paymentMethods: 'Razorpay UPI, Card, Cash',
    rating: 4.5,
    ratingBreakdown: [64, 23, 8, 3, 2],
    reviewCount: 0,
  },
  {
    id: 'nand-juice',
    dataId: 'nand-juice',
    name: 'Nand Juice',
    emoji: '🥤',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=900&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80'
    ],
    description: 'Freshly squeezed fruit juices, revitalizing shakes, and chilled campus refreshments made to order.',
    categoryLabel: 'Fresh Juices & Smoothies',
    productCategories: ['All', 'Fresh Juices', 'Fruit Bowls'],
    status: 'open',
    openingTime: '9:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 2,
    floor: 'Ground Floor',
    location: 'In front of MBA Block',
    phone: '+91 98765 01007',
    paymentMethods: 'Razorpay UPI, Cash',
    rating: 4.5,
    ratingBreakdown: [70, 20, 8, 2, 0],
    reviewCount: 0,
  },
  // Legacy alias redirects
  { id: 'store-bakery', dataId: 'campus-cafe', name: 'Campus Bakery & Café', emoji: '🥐', coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800' },
  { id: 'store-stationery', dataId: 'book-corner', name: 'Stationery Hub & Book Corner', emoji: '📚', coverImage: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800' },
  { id: 'store-print', dataId: 'book-corner', name: 'Print & Copy Center', emoji: '🖨️', coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800' },
  { id: 'store-sports', dataId: 'campus-wear', name: 'Sports Zone', emoji: '🏅', coverImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800' },
  { id: 'store-fashion', dataId: 'campus-wear', name: 'Style Square', emoji: '👗', coverImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800' },
  { id: 'store-electronics', dataId: 'techstop', name: 'Campus Electronics', emoji: '🎧', coverImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800' },
  { id: 'store-grocery', dataId: 'campus-mart', name: 'Campus Mart', emoji: '🛒', coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800' },
  { id: 'store-books', dataId: 'book-corner', name: 'Book Corner', emoji: '📖', coverImage: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800' }
];

/* ─────────────────────────────────────────────────────────
   PRODUCTS DATA (per store, rich details)
   ───────────────────────────────────────────────────────── */
const STORE_PRODUCTS = {
  // ─── 1. CAMPUS CAFE (4 products) ─────────────────────────
  'campus-cafe': [
    { id: 'prod_cafe_01', name: 'Cold Brew Coffee', price: 120, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Coffee', emoji: '☕' },
    { id: 'prod_cafe_02', name: 'Masala Chai Flask (500ml)', price: 70, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Beverages', emoji: '☕' },
    { id: 'prod_cafe_03', name: 'Butter Croissant', price: 85, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 18, subcat: 'Bakery', emoji: '🥐' },
    { id: 'prod_cafe_04', name: 'Grilled Veg Club Sandwich', price: 110, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Snacks', emoji: '🥪' },
  ],
  // ─── 2. BOOK CORNER (4 products) ─────────────────────────
  'book-corner': [
    { id: 'prod_book_01', name: 'A4 Spiral Notebook (200 pgs)', price: 65, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 50, subcat: 'Notebooks', emoji: '📓' },
    { id: 'prod_book_02', name: 'Ballpoint Pens (10-Pack)', price: 35, image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 80, subcat: 'Pens', emoji: '🖊️' },
    { id: 'prod_book_03', name: 'Pastel Sticky Notes 5-Pack', price: 85, image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 40, subcat: 'Stationery', emoji: '📝' },
    { id: 'prod_book_04', name: 'Engineering Graph Pad', price: 75, image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 35, subcat: 'Notebooks', emoji: '📈' },
  ],
  // ─── 3. TECHSTOP (4 products) ────────────────────────────
  'techstop': [
    { id: 'prod_tech_01', name: 'True Wireless Earbuds', price: 999, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 12, subcat: 'Audio', emoji: '🎧' },
    { id: 'prod_tech_02', name: 'USB-C Fast Charger 25W', price: 349, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Charging', emoji: '🔌' },
    { id: 'prod_tech_03', name: 'Power Bank 10,000mAh 22.5W', price: 899, image: 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 15, subcat: 'Charging', emoji: '🔋' },
    { id: 'prod_tech_04', name: 'Wireless Silent Mouse', price: 499, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Accessories', emoji: '🖱️' },
  ],
  // ─── 4. CAMPUS MART (4 products) ─────────────────────────
  'campus-mart': [
    { id: 'prod_mart_01', name: 'Classic Salted Chips Pack', price: 30, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 60, subcat: 'Snacks', emoji: '🥔' },
    { id: 'prod_mart_02', name: 'Instant Noodles Cup', price: 45, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 50, subcat: 'Snacks', emoji: '🍜' },
    { id: 'prod_mart_03', name: 'Energy Drink Can 350ml', price: 125, image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Beverages', emoji: '⚡' },
    { id: 'prod_mart_04', name: 'Natural Mineral Water 1 Litre', price: 20, image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 100, subcat: 'Beverages', emoji: '💧' },
  ],
  // ─── 5. CAMPUS WEAR (4 products) ─────────────────────────
  'campus-wear': [
    { id: 'prod_wear_01', name: 'Oversized Campus Hoodie — Navy', price: 649, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 15, subcat: 'Tops', emoji: '🧥' },
    { id: 'prod_wear_02', name: 'Collegiate Varsity Jacket', price: 1299, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 10, subcat: 'Tops', emoji: '🧥' },
    { id: 'prod_wear_03', name: '100% Cotton Crewneck Tee', price: 449, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 35, subcat: 'Tops', emoji: '👕' },
    { id: 'prod_wear_04', name: 'Classic Cotton Baseball Cap', price: 299, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Accessories', emoji: '🧢' },
  ],
  // ─── 6. HEALTH HUB (4 products) ──────────────────────────
  'health-hub': [
    { id: 'prod_health_01', name: 'Whey Protein Bar — Chocolate', price: 80, image: 'https://images.unsplash.com/photo-1622484212850-cab596d63c5d?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 40, subcat: 'Wellness', emoji: '🍫' },
    { id: 'prod_health_02', name: 'Roasted Salted Almonds 100g', price: 140, image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Wellness', emoji: '🥜' },
    { id: 'prod_health_03', name: 'Greek Blueberry Probiotic Yogurt', price: 55, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Wellness', emoji: '🫐' }
  ],
  // ─── 7. NAND JUICE (3 products) ──────────────────────────
  'nand-juice': [
    { id: 'prod_juice_01', name: 'Fresh Mosambi Sweet Lime Juice', price: 60, image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Fresh Juices', emoji: '🍊' },
    { id: 'prod_juice_02', name: 'Cold-Pressed Pomegranate Juice', price: 90, image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Fresh Juices', emoji: '🥤' },
    { id: 'prod_juice_03', name: 'Fresh Mixed Fruit Bowl', price: 80, image: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=600&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Fruit Bowls', emoji: '🍓' }
  ]
};

// Aliases for legacy store IDs
STORE_PRODUCTS['store-bakery'] = STORE_PRODUCTS['campus-cafe'];
STORE_PRODUCTS['store-stationery'] = STORE_PRODUCTS['book-corner'];
STORE_PRODUCTS['store-electronics'] = STORE_PRODUCTS['techstop'];
STORE_PRODUCTS['store-print'] = STORE_PRODUCTS['campus-mart'];
STORE_PRODUCTS['store-fashion'] = STORE_PRODUCTS['campus-wear'];
STORE_PRODUCTS['store-sports'] = STORE_PRODUCTS['health-hub'];

/* ─────────────────────────────────────────────────────────
   REVIEWS DATA
   ───────────────────────────────────────────────────────── */
const STORE_REVIEWS = {
  default: [
    {
      name: 'Arjun Verma', avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Arjun&radius=50&backgroundColor=b6e3f4',
      rating: 5, text: 'Really convenient between classes. Fresh products every day and the staff is super friendly!', date: '2 days ago', helpful: 12
    },
    {
      name: 'Priya Nair', avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Priya&radius=50&backgroundColor=c0aede',
      rating: 4, text: 'Great selection, reasonable prices for campus. Sometimes the queue gets long during lunch but otherwise excellent.', date: '1 week ago', helpful: 8
    },
    {
      name: 'Rohit Gupta', avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Rohit&radius=50&backgroundColor=d1d4f9',
      rating: 5, text: 'Best place on campus for a quick bite. The cold brew is my go-to before morning lectures.', date: '2 weeks ago', helpful: 21
    },
    {
      name: 'Sneha Iyer', avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sneha&radius=50&backgroundColor=ffd5dc',
      rating: 3, text: 'Good stuff but gets crowded during exam week. Wish they had more seating outside.', date: '3 weeks ago', helpful: 4
    },
  ],
};

/* ─────────────────────────────────────────────────────────
   APP STATE
   ───────────────────────────────────────────────────────── */
const SSD = {
  store: null,
  products: [],
  filteredProducts: [],
  activeCategory: 'All',
  searchQuery: '',
  activeTab: 'products',
  isFav: false,
  reviewRating: 0,
  _yayTimer: null,
  _simpleTimer: null,
};

/* ─────────────────────────────────────────────────────────
   CART UTILITIES (localStorage only)
   ───────────────────────────────────────────────────────── */
const CART_KEY = 'unimall_v1';

function cartGet() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.cart) ? parsed.cart : [];
  } catch { return []; }
}

function cartSave(items) {
  try {
    let data = {};
    const raw = localStorage.getItem(CART_KEY);
    if (raw) data = JSON.parse(raw);
    data.cart = items;
    localStorage.setItem(CART_KEY, JSON.stringify(data));
  } catch {}
}

function cartCount() {
  return cartGet().reduce((s, l) => s + (l.qty || 1), 0);
}

function cartAddProduct(product) {
  const items = cartGet();
  const existing = items.find(i => i.productId === product.id);
  if (existing) {
    if (existing.qty >= product.stock) return false;
    existing.qty++;
  } else {
    items.push({
      productId: product.id,
      qty: 1,
      name: product.name,
      price: product.price,
      image: product.image || '',
      emoji: product.emoji || '🛍️',
      storeId: SSD.store?.dataId || SSD.store?.id || 'campus-cafe',
      storeName: SSD.store?.name || 'Campus Store'
    });
  }
  cartSave(items);
  updateCartBadgeUI();

  // Keep global AppState and cart badge in sync across SPA
  if (typeof AppState !== 'undefined') {
    if (typeof loadCart === 'function') {
      try { loadCart(); } catch(e) {}
    } else {
      AppState.cart = items;
    }
    if (typeof updateCartBadges === 'function') {
      try { updateCartBadges(); } catch(e) {}
    }
  }
  return true;
}

function updateCartBadgeUI() {
  const count = cartCount();
  const navBadge = document.getElementById('nav-cart-badge');
  const sbBadge  = document.getElementById('sb-cart-badge');
  [navBadge, sbBadge].forEach(el => {
    if (!el) return;
    el.textContent = count > 9 ? '9+' : String(count);
    el.style.display = count > 0 ? '' : 'none';
    el.setAttribute('aria-label', `${count} item${count !== 1 ? 's' : ''} in cart`);
    el.style.transition = 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)';
    el.style.transform = 'scale(1.35)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
  });
  const navCart = document.getElementById('nav-cart');
  if (navCart) navCart.setAttribute('aria-label', `Cart, ${count} item${count !== 1 ? 's' : ''}`);
}

/* ─────────────────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────────────────── */
function showYayToast(productName) {
  const toast = document.getElementById('ssd-yay-toast');
  const nameEl = document.getElementById('ssd-toast-name');
  if (!toast) return;
  if (nameEl) nameEl.textContent = productName;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(SSD._yayTimer);
  SSD._yayTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showSimpleToast(msg) {
  const toast = document.getElementById('ssd-simple-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(SSD._simpleTimer);
  SSD._simpleTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ─────────────────────────────────────────────────────────
   SVG HELPERS
   ───────────────────────────────────────────────────────── */
function starSvg(filled, color = '#FBBF24') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function starSvgLarge(filled, idx) {
  const c = filled ? '#FBBF24' : '#E5E7EB';
  return `<button class="review-star-btn" data-star="${idx + 1}" aria-label="${idx + 1} star">
    <svg viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="${c}" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>`;
}

function thumbsSvg() {
  return `<svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
}

function getCategoryEmoji(cat) {
  const map = {
    food: '🥐',
    electronics: '⚡',
    stationery: '📚',
    fashion: '👕',
    essentials: '🧴',
    health: '💊',
    services: '✂️',
    other: '📦'
  };
  return map[(cat || '').toLowerCase()] || '🏪';
}

function renderStoreNotFound(storeId) {
  document.title = 'Store Not Found — UniMall';
  const root = document.getElementById('store-page-root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 65vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px;">
        <div style="font-size: 54px; margin-bottom: 16px;">🏬</div>
        <h2 style="font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 8px;">Store Not Found</h2>
        <p style="font-size: 14.5px; color: var(--text-secondary); max-width: 380px; margin: 0 auto 24px; line-height: 1.5;">
          The store "${storeId || 'unknown'}" does not exist or has not been approved yet.
        </p>
        <a href="index.html?view=stores" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 26px; background: #2563EB; color: #fff; border-radius: 999px; font-weight: 700; text-decoration: none; font-size: 14.5px; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
          ← Browse Campus Stores
        </a>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────
   PRODUCT SKELETON SHIMMER LOADER
   ───────────────────────────────────────────────────────── */
function renderProductSkeletons(count = 6) {
  const grid = document.getElementById('store-products-grid');
  if (!grid) return;
  grid.innerHTML = Array(count).fill(0).map(() => `
    <div class="store-product-card-skeleton" aria-hidden="true">
      <div class="skeleton-thumb skeleton-shimmer"></div>
      <div class="skeleton-body">
        <div class="skeleton-line-title skeleton-shimmer"></div>
        <div class="skeleton-line-price skeleton-shimmer"></div>
        <div class="skeleton-btn skeleton-shimmer"></div>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────── */
let _storeListenersAttached = false;

async function initStoreDetail(targetStoreId) {
  let storeId = targetStoreId;
  if (!storeId) {
    const params = new URLSearchParams(window.location.search);
    storeId = params.get('id') || params.get('store') || '';
  }
  if (!storeId) {
    return;
  }

  // Ensure store detail panel is visible when rendered
  const viewStorePanel = document.getElementById('view-store');
  if (viewStorePanel && viewStorePanel.style.display === 'none') {
    viewStorePanel.style.display = 'block';
  }

  // Render skeletons immediately on page parse so there is zero blank state
  renderProductSkeletons(6);

  // 0. Instant 0ms Sync Hydration: If store exists locally in STORE_CATALOG, render IMMEDIATELY
  let localStore = STORE_CATALOG.find(s => s.id === storeId || s.dataId === storeId);
  if (localStore) {
    SSD.store = localStore;
    const localProds = STORE_PRODUCTS[localStore.id] || STORE_PRODUCTS[localStore.dataId] || [];
    if (localProds.length > 0) {
      const distinctSubcats = [...new Set(localProds.map(p => p.subcat).filter(Boolean))];
      SSD.store.productCategories = distinctSubcats.length > 0 ? ['All', ...distinctSubcats] : ['All'];
      SSD.products = [...localProds];
      SSD.filteredProducts = [...localProds];
      document.title = `${SSD.store.name} — UniMall`;
      updateCartBadgeUI();
      syncSidebarProfile();
      renderHero();
      renderInfoSheet();
      renderTabs();
      renderProductsPanel();
    } else {
      renderProductSkeletons(4);
    }
  } else {
    // Render skeletons only when store metadata is unknown and must be fetched
    renderProductSkeletons(6);
  }

  let store = localStore;

  // 1. Authoritative Neon PostgreSQL Database Query for Store (Primary)
  if (storeId && typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStore === 'function') {
    try {
      const dbStore = await window.UniMallDB.getStore(storeId);
      if (dbStore) {
        store = {
          id: dbStore.id,
          dataId: dbStore.id,
          name: dbStore.name,
          emoji: getCategoryEmoji(dbStore.category),
          logo: null,
          coverImage: dbStore.cover_image || (localStore ? localStore.coverImage : 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80'),
          gallery: [dbStore.cover_image || (localStore ? localStore.coverImage : 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80')],
          description: dbStore.description || (localStore ? localStore.description : `Welcome to ${dbStore.name}. Campus store providing quality products.`),
          categoryLabel: dbStore.category ? (dbStore.category.charAt(0).toUpperCase() + dbStore.category.slice(1)) : (localStore ? localStore.categoryLabel : 'Campus Store'),
          productCategories: localStore ? localStore.productCategories : ['All'],
          status: dbStore.is_open ? 'open' : 'closed',
          openingTime: dbStore.opening_time || (localStore ? localStore.openingTime : '9:00 AM'),
          closingTime: dbStore.closing_time || (localStore ? localStore.closingTime : '9:00 PM'),
          walkingTime: 2,
          floor: dbStore.floor || dbStore.location || 'Campus Center',
          location: dbStore.location || 'Campus Center',
          phone: dbStore.phone || (localStore ? localStore.phone : '+91 98765 00000'),
          paymentMethods: 'Razorpay UPI, Cash',
          rating: Number(dbStore.rating) || (localStore ? localStore.rating : 4.8),
          ratingBreakdown: [85, 10, 5, 0, 0],
          reviewCount: localStore ? localStore.reviewCount : 0,
          isCustomStore: true
        };
      }
    } catch (e) {
      console.warn('[store.js] Neon getStore error:', e);
    }
  }

  // 2. Check dynamically registered stores in localStorage
  if (!store && storeId) {
    const regRaw = localStorage.getItem('unimall_registered_stores');
    if (regRaw) {
      try {
        const regList = JSON.parse(regRaw);
        const r = regList.find(s => 
          (s.storeId && s.storeId.toLowerCase() === storeId.toLowerCase()) || 
          (s.storeName && s.storeName.toLowerCase() === storeId.toLowerCase())
        );
        if (r) {
          store = {
            id: r.storeId,
            dataId: r.storeId,
            name: r.storeName,
            emoji: getCategoryEmoji(r.storeType),
            logo: null,
            coverImage: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80',
            gallery: ['https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80'],
            description: r.description || `Welcome to ${r.storeName}. Campus store providing quality items.`,
            categoryLabel: r.storeType ? (r.storeType.charAt(0).toUpperCase() + r.storeType.slice(1)) : 'Campus Store',
            productCategories: ['All'],
            status: 'open',
            openingTime: r.operatingHours ? (r.operatingHours.split('–')[0]?.trim() || '9:00 AM') : '9:00 AM',
            closingTime: r.operatingHours ? (r.operatingHours.split('–')[1]?.trim() || '9:00 PM') : '9:00 PM',
            walkingTime: 2,
            floor: r.location || 'Campus Center',
            location: r.location || 'Campus Center, Ground Floor',
            phone: r.phone || '+91 98765 00000',
            paymentMethods: 'Razorpay UPI, Cash',
            rating: 4.8,
            ratingBreakdown: [85, 10, 5, 0, 0],
            reviewCount: 0,
            isCustomStore: true
          };
        }
      } catch (e) {}
    }
  }

  // 3. Fallback to hardcoded catalog if still not resolved
  if (!store && storeId) {
    store = STORE_CATALOG.find(s => s.id === storeId || s.dataId === storeId);
  }

  // If store was not found anywhere, render Store Not Found
  if (!store) {
    renderStoreNotFound(storeId);
    return;
  }

  SSD.store = store;

  // 4. Resolve products for this store (Neon PostgreSQL authoritative)
  let prods = (SSD.products && SSD.products.length > 0) ? SSD.products : [];

  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getProducts === 'function') {
    try {
      const dbProds = await window.UniMallDB.getProducts(store.id);
      if (Array.isArray(dbProds) && dbProds.length > 0) {
        prods = dbProds.map(p => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price || 0),
          image: p.image || p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
          availability: (p.stock === 0 ? 'out-of-stock' : (p.stock <= (p.low_stock_threshold || 5) ? 'low-stock' : 'in-stock')),
          stock: p.stock ?? 20,
          subcat: p.category_id || p.categoryId || 'General',
          description: p.description || ''
        }));
      }
    } catch (e) {
      console.warn('[store.js] Products fetch error:', e);
    }
  }

  // Fallback to static catalog if DB returned nothing
  // Products marked db_fallback=true are offline-only stale copies — availability shown as 'check-store'
  if (prods.length === 0 && (STORE_PRODUCTS[store.id] || STORE_PRODUCTS[store.dataId])) {
    const staticProds = STORE_PRODUCTS[store.id] || STORE_PRODUCTS[store.dataId] || [];
    prods = staticProds.map(p => ({ ...p, db_fallback: true, availability: 'check-store', stock: null }));
  }

  // Derive dynamic category chips from actual product subcategories
  const distinctSubcats = [...new Set(prods.map(p => p.subcat).filter(Boolean))];
  if (distinctSubcats.length > 0) {
    SSD.store.productCategories = ['All', ...distinctSubcats];
  } else {
    SSD.store.productCategories = ['All'];
  }

  SSD.products = prods;
  SSD.filteredProducts = [...SSD.products];

  // Sync live open/closed status from admin panel
  syncCurrentStoreStatus();

  // Persist current store for navigation and cart convenience
  try {
    localStorage.setItem('unimall_last_store_id', SSD.store.id);
    localStorage.setItem('unimall_last_store_name', SSD.store.name);
    sessionStorage.setItem('unimall_active_store_id', SSD.store.id);
    sessionStorage.setItem('unimall_active_store_name', SSD.store.name);
  } catch (e) {}

  document.title = `${SSD.store.name} — UniMall`;

  updateCartBadgeUI();
  syncSidebarProfile();
  renderHero();
  renderInfoSheet();
  renderTabs();
  renderProductsPanel();
  renderAboutPanel();
  renderReviewsPanel();
  renderRecommended('about-recommended');
  renderRecommended('reviews-recommended');
  if (!_storeListenersAttached) {
    initEventListeners();
    _storeListenersAttached = true;
  }

  // Live reactivity when store status changes in admin
  window.addEventListener('storage', (e) => {
    if (e.key === 'unimall_store_status_event' || e.key === 'unimall_store_statuses') {
      syncCurrentStoreStatus();
      renderInfoSheet();
      renderProductsPanel();
    }
  });

  // Background SWR revalidation listener
  window.addEventListener('unimall:dataRevalidated', (e) => {
    if (e.detail && SSD.store) {
      const activeId = String(SSD.store.id).toLowerCase();
      if (e.detail.key === 'store:' + activeId && e.detail.data) {
        SSD.store.name = e.detail.data.name || SSD.store.name;
        SSD.store.status = e.detail.data.is_open ? 'open' : 'closed';
        renderHero();
        renderInfoSheet();
      } else if (e.detail.key === 'products:' + activeId && Array.isArray(e.detail.data)) {
        SSD.products = e.detail.data.map(p => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price || 0),
          image: p.image || p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
          availability: (p.stock === 0 ? 'out-of-stock' : (p.stock <= (p.low_stock_threshold || 5) ? 'low-stock' : 'in-stock')),
          stock: p.stock ?? 20,
          subcat: p.category_id || p.categoryId || 'General',
          description: p.description || ''
        }));
        SSD.filteredProducts = [...SSD.products];
        renderProductGrid();
      }
    }
  });
}

// Expose globally for SPA navigation
window.renderStoreDetailView = initStoreDetail;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const storeId = params.get('id') || params.get('store');
  if (view === 'store' || (storeId && !window.location.pathname.includes('/admin') && !window.location.pathname.includes('/merchant') && !window.location.pathname.includes('/login'))) {
    initStoreDetail(storeId);
  }
});

function syncCurrentStoreStatus() {
  try {
    const raw = localStorage.getItem('unimall_store_statuses');
    if (!raw) return;
    const storeStatuses = JSON.parse(raw);
    const targetId = SSD.store.dataId || SSD.store.id;
    if (storeStatuses[targetId] !== undefined) {
      SSD.store.status = storeStatuses[targetId] ? 'open' : 'closed';
    } else if (storeStatuses[SSD.store.id] !== undefined) {
      SSD.store.status = storeStatuses[SSD.store.id] ? 'open' : 'closed';
    }
  } catch(e) {}
}

/* ─────────────────────────────────────────────────────────
   RENDER HERO
   ───────────────────────────────────────────────────────── */
function renderHero() {
  const s = SSD.store;
  const img = document.getElementById('store-hero-img');
  if (img) {
    img.src = s.coverImage;
    img.alt = `${s.name} storefront`;
    img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80'; };
  }
}

/* ─────────────────────────────────────────────────────────
   RENDER INFO SHEET
   ───────────────────────────────────────────────────────── */
function renderInfoSheet() {
  const s = SSD.store;

  // Logo
  const logoWrap = document.getElementById('store-logo-wrap');
  if (logoWrap) {
    if (s.logo) {
      logoWrap.innerHTML = `<img src="${s.logo}" alt="${s.name} logo" onerror="this.style.display='none'">`;
    } else {
      logoWrap.textContent = s.emoji || '🏪';
    }
  }

  const nameEl = document.getElementById('store-name-heading');
  if (nameEl) nameEl.textContent = s.name;

  const catEl = document.getElementById('store-categories-line');
  if (catEl) catEl.textContent = s.categoryLabel;

  const badge = document.getElementById('store-open-badge');
  if (badge) {
    badge.className = `store-open-badge ${s.status}`;
    badge.innerHTML = `<span class="status-dot"></span> ${s.status === 'open' ? 'Open' : s.status === 'closing' ? 'Closing Soon' : 'Closed'}`;
  }

  const closesEl = document.getElementById('store-closes-text');
  if (closesEl) {
    closesEl.textContent = s.status === 'open'
      ? `Closes at ${s.closingTime}`
      : s.status === 'closing'
        ? `Closes soon · ${s.closingTime}`
        : `Currently Offline · Not accepting orders`;
  }

  const locEl = document.getElementById('store-location-text');
  if (locEl) locEl.textContent = `${s.walkingTime} min walk · ${s.floor}`;

  const descEl = document.getElementById('store-description');
  if (descEl) descEl.textContent = s.description;
}

/* ─────────────────────────────────────────────────────────
   RENDER PRODUCTS PANEL
   ───────────────────────────────────────────────────────── */
function renderProductsPanel() {
  const container = document.getElementById('panel-products');
  let banner = document.getElementById('store-offline-banner');

  if (SSD.store?.status === 'closed') {
    if (!banner && container) {
      banner = document.createElement('div');
      banner.id = 'store-offline-banner';
      banner.style.cssText = 'background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 16px; margin: 12px 0 16px; display: flex; align-items: center; gap: 12px; color: #991B1B; font-family: inherit;';
      banner.innerHTML = `
        <span style="font-size: 20px;">⏸️</span>
        <div>
          <div style="font-weight: 700; font-size: 13.5px;">Store Offline / Orders Paused</div>
          <div style="font-size: 12px; color: #B91C1C; margin-top: 2px;">This store has paused online orders due to counter rush. Please check back shortly!</div>
        </div>
      `;
      container.insertBefore(banner, container.firstChild);
    }
  } else if (banner) {
    banner.remove();
  }

  renderProductGrid();
}

function filterAndRenderProducts() {
  const q = SSD.searchQuery.trim().toLowerCase();
  SSD.filteredProducts = SSD.products.filter(p => {
    return !q || p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });
  renderProductGrid();
}

function openProductModal(p) {
  if (!p) return;
  const backdrop = document.getElementById('product-detail-modal-backdrop');
  if (!backdrop) return;

  const imgEl = document.getElementById('modal-prod-img');
  const nameEl = document.getElementById('modal-prod-name');
  const priceEl = document.getElementById('modal-prod-price');
  const storeEl = document.getElementById('modal-prod-store');
  const descEl = document.getElementById('modal-prod-desc');
  const badgeEl = document.getElementById('modal-prod-stock-badge');
  const addBtn = document.getElementById('modal-add-to-cart-btn');

  const avail = p.availability === 'in-stock' ? 'in-stock' : p.availability === 'low-stock' ? 'low-stock' : 'out-stock';
  const availLabel = p.availability === 'in-stock' ? '● In stock' : p.availability === 'low-stock' ? `● Only ${p.stock} left` : '○ Out of stock';
  const isOut = p.availability === 'out-of-stock';

  if (imgEl) imgEl.src = p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  if (nameEl) nameEl.textContent = p.name;
  if (priceEl) priceEl.textContent = `₹${p.price.toLocaleString('en-IN')}`;
  if (storeEl) storeEl.innerHTML = `🏪 <span>${SSD.store?.name || 'Campus Store'}</span>`;
  if (descEl) {
    descEl.textContent = p.description || 'This item is freshly offered by the campus store. Visit store or add to cart for on-campus pickup/delivery.';
  }
  if (badgeEl) {
    badgeEl.className = `product-modal-badge ${avail}`;
    badgeEl.textContent = availLabel;
  }
  if (addBtn) {
    addBtn.disabled = isOut;
    addBtn.onclick = () => {
      if (SSD.store?.status === 'closed') {
        showSimpleToast(`⚠️ ${SSD.store.name} is offline. Online ordering is paused.`);
        return;
      }
      const added = cartAddProduct(p);
      if (added) {
        showYayToast(p.name);
        closeProductModal();
      } else {
        showSimpleToast('Max quantity reached');
      }
    };
  }

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeProductModal() {
  const backdrop = document.getElementById('product-detail-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
}

function renderProductGrid() {
  const grid = document.getElementById('store-products-grid');
  if (!grid) return;

  if (SSD.products.length === 0) {
    grid.innerHTML = `
      <div class="store-no-products" style="padding: 56px 20px; text-align: center; width: 100%; grid-column: 1 / -1;">
        <div style="font-size: 48px; margin-bottom: 12px;">🏪</div>
        <h4 style="font-size: 19px; font-weight: 800; color: var(--text); margin-bottom: 6px;">No products added yet</h4>
        <p style="font-size: 14px; color: var(--text-secondary); max-width: 360px; margin: 0 auto; line-height: 1.5;">
          <strong>${SSD.store.name}</strong> hasn't published any items yet. The store manager will add their menu and products soon!
        </p>
      </div>`;
    return;
  }

  if (SSD.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="store-no-products" style="padding: 48px 20px; text-align: center; width: 100%; grid-column: 1 / -1;">
        <svg viewBox="0 0 24 24" style="width: 36px; height: 36px; stroke: var(--text-muted); fill: none; margin-bottom: 10px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h4 style="font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 6px;">No matching products found</h4>
        <p style="font-size: 13.5px; color: var(--text-secondary);">Try clearing your search query</p>
      </div>`;
    return;
  }

  grid.innerHTML = SSD.filteredProducts.map(p => {
    const isCheckStore = p.availability === 'check-store' || p.db_fallback;
    const isOut = p.availability === 'out-of-stock' || isCheckStore;
    const avail = isCheckStore ? 'out-stock'
      : p.availability === 'in-stock' ? 'in-stock'
      : p.availability === 'low-stock' ? 'low-stock' : 'out-stock';
    const availLabel = isCheckStore ? 'Check in store'
      : p.availability === 'in-stock' ? 'In stock'
      : p.availability === 'low-stock' ? `Only ${p.stock} left` : 'Out of stock';
    const descText = p.description ? p.description.trim() : '';

    return `
      <div class="store-product-card" data-pid="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
        <div class="store-product-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'">
          <span class="store-product-stock-tag ${avail}">
            <span class="avdot"></span>${availLabel}
          </span>
        </div>
        <div class="store-product-body">
          <div class="store-product-name" title="${p.name}">${p.name}</div>
          ${descText ? `
            <div class="store-product-desc" title="${descText}">${descText}</div>
          ` : `
            <div class="store-product-desc store-desc-placeholder">Tap to view details & options</div>
          `}
          <div class="store-product-footer">
            <div class="store-product-price-block">
              <span class="currency-symbol">₹</span>
              <span class="price-val">${p.price.toLocaleString('en-IN')}</span>
            </div>
            <button class="store-add-btn" data-pid="${p.id}" aria-label="Add ${p.name} to cart" ${isOut ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Wire product card click to open product modal
  grid.querySelectorAll('.store-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If user clicked the Add button directly, let button handler deal with it
      if (e.target.closest('.store-add-btn')) return;
      const pid = card.dataset.pid;
      const product = SSD.products.find(p => p.id === pid);
      if (product) openProductModal(product);
    });
  });

  // Wire add-to-cart button
  grid.querySelectorAll('.store-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const pid = btn.dataset.pid;
      const product = SSD.products.find(p => p.id === pid);
      if (!product || product.availability === 'out-of-stock') return;
      if (SSD.store?.status === 'closed') {
        showSimpleToast(`⚠️ ${SSD.store.name} is offline. Online ordering is paused.`);
        return;
      }
      const added = cartAddProduct(product);
      if (added) {
        showYayToast(product.name);
        // Spring animation on the button
        btn.style.transform = 'scale(0.85)';
        setTimeout(() => { btn.style.transform = ''; }, 180);
      } else {
        showSimpleToast('Max quantity reached');
      }
    });
  });

  // Wire close buttons for the modal if present
  const closeBtn = document.getElementById('product-modal-close-btn');
  if (closeBtn) closeBtn.onclick = closeProductModal;
  const backdrop = document.getElementById('product-detail-modal-backdrop');
  if (backdrop) {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeProductModal();
    };
  }
}

/* ─────────────────────────────────────────────────────────
   RENDER ABOUT PANEL
   ───────────────────────────────────────────────────────── */
function renderAboutPanel() {
  const s = SSD.store;

  const desc = document.getElementById('about-description');
  if (desc) desc.textContent = s.description;

  const card = document.getElementById('about-info-card');
  if (card) {
    card.innerHTML = `
      <div class="about-info-row">
        <div class="about-info-icon">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="about-info-content">
          <div class="about-info-label">Location</div>
          <div class="about-info-value">${s.location}</div>
        </div>
        <div class="about-info-action">
          <button class="btn-view-map" id="btn-view-map">View on Map</button>
        </div>
      </div>
      <div class="about-info-row">
        <div class="about-info-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="about-info-content">
          <div class="about-info-label">Timings</div>
          <div class="about-info-value">${s.openingTime} – ${s.closingTime}</div>
          ${s.status === 'open' ? '<div class="about-open-now-badge"><span class="status-dot"></span> Open now</div>' : ''}
        </div>
      </div>
      <div class="about-info-row">
        <div class="about-info-icon">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <div class="about-info-content">
          <div class="about-info-label">Contact</div>
          <div class="about-info-value"><a href="tel:${s.phone}">${s.phone}</a></div>
        </div>
      </div>
      <div class="about-info-row">
        <div class="about-info-icon">
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <div class="about-info-content">
          <div class="about-info-label">Categories</div>
          <div class="about-info-value">${s.categoryLabel}</div>
        </div>
      </div>
      <div class="about-info-row">
        <div class="about-info-icon">
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
        <div class="about-info-content">
          <div class="about-info-label">Payment Methods</div>
          <div class="about-info-value">${s.paymentMethods}</div>
        </div>
      </div>
    `;

    document.getElementById('btn-view-map')?.addEventListener('click', openMapOverlay);
  }

  const gallery = document.getElementById('about-gallery');
  if (gallery) {
    if (s.gallery && s.gallery.length > 0) {
      gallery.innerHTML = s.gallery.map(url => `
        <div class="about-gallery-img">
          <img src="${url}" alt="Store interior" loading="lazy"
               onerror="this.parentElement.style.display='none'">
        </div>`).join('');
    } else {
      gallery.innerHTML = `<div class="about-gallery-img"><img src="${s.coverImage}" alt="Store" loading="lazy"></div>`;
    }
  }
}

/* ─────────────────────────────────────────────────────────
   RENDER REVIEWS PANEL
   ───────────────────────────────────────────────────────── */
function renderReviewsPanel() {
  const s = SSD.store;

  // Summary — show real rating from DB, no breakdown bars (they were hardcoded)
  const summary = document.getElementById('reviews-summary');
  if (summary) {
    const avgRating = s.rating || 0;
    const starsHtml = [1,2,3,4,5].map(i => starSvg(i <= Math.round(avgRating))).join('');
    if (avgRating > 0) {
      summary.innerHTML = `
        <div class="reviews-big-rating">
          <div class="reviews-big-num">${avgRating.toFixed(1)}</div>
          <div class="reviews-stars-row">${starsHtml}</div>
          <div class="reviews-count-text">Campus Rating</div>
        </div>`;
    } else {
      summary.innerHTML = '';
    }
  }

  // Review cards — fetch from DB; show empty state until real reviews exist
  const list = document.getElementById('reviews-list');
  if (!list) return;

  // Async: try fetching real reviews from Neon
  (async () => {
    let reviews = [];
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
      try {
        reviews = await window.UniMallDB.neonSql(
          `SELECT r.id, r.rating, r.text, r.created_at, u.name, u.avatar
           FROM unimall_reviews r
           JOIN users u ON r.user_id = u.id
           WHERE r.store_id = $1
           ORDER BY r.created_at DESC LIMIT 20`,
          [s.id]
        );
      } catch (e) { reviews = []; }
    }

    if (!reviews || reviews.length === 0) {
      // Clean empty state — no fake reviews
      list.innerHTML = `
        <div style="text-align:center;padding:40px 20px 24px;">
          <div style="font-size:42px;margin-bottom:12px;">💬</div>
          <div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:6px;">No reviews yet</div>
          <div style="font-size:13.5px;color:var(--text-secondary);max-width:260px;margin:0 auto;line-height:1.5;">Be the first to share your experience at ${s.name}!</div>
        </div>`;
      return;
    }

    list.innerHTML = reviews.map(r => {
      const starsHtml = [1,2,3,4,5].map(i => starSvg(i <= (r.rating || 5))).join('');
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';
      const avatarSrc = r.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(r.name || 'user')}&radius=50`;
      return `
        <div class="review-card">
          <div class="review-card-header">
            <div class="review-avatar">
              <img src="${avatarSrc}" alt="${r.name || 'Student'}" referrerpolicy="no-referrer"
                   onerror="this.src='https://api.dicebear.com/7.x/fun-emoji/svg?seed=student&radius=50'">
            </div>
            <div class="review-user-info">
              <div class="review-user-name">${r.name || 'Campus Student'}</div>
              <div class="review-verified">✓ Verified Student</div>
            </div>
          </div>
          <div class="review-stars">${starsHtml}</div>
          <p class="review-text">"${r.text || ''}"</p>
          <div class="review-footer"><span class="review-date">${date}</span></div>
        </div>`;
    }).join('');
  })();
}

/* ─────────────────────────────────────────────────────────
   RENDER RECOMMENDED STORES
   ───────────────────────────────────────────────────────── */
function renderRecommended(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const others = STORE_CATALOG.filter(s => s.id !== SSD.store.id);
  if (others.length === 0) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <div class="recommended-header">
      <div class="recommended-title">You might also like</div>
      <button class="recommended-see-all" onclick="window.location.href='index.html?view=stores'">
        See all <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="recommended-scroll">
      ${others.slice(0, 6).map(s => `
        <div class="recommended-store-card" data-sid="${s.id}" role="button" tabindex="0" aria-label="Open ${s.name}">
          <img class="recommended-store-img" src="${s.coverImage}" alt="${s.name}"
               loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&auto=format&fit=crop&q=80'">
          <div class="recommended-store-body">
            <div class="recommended-store-name">${s.name}</div>
            <div class="recommended-store-cat">${s.categoryLabel}</div>
          </div>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('.recommended-store-card').forEach(card => {
    const go = () => {
      if (typeof window.navigate === 'function') {
        window.navigate('store', { id: card.dataset.sid });
      } else {
        window.location.href = `index.html?view=store&id=${encodeURIComponent(card.dataset.sid)}`;
      }
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

/* ─────────────────────────────────────────────────────────
   TABS
   ───────────────────────────────────────────────────────── */
function renderTabs() {
  document.querySelectorAll('.store-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      SSD.activeTab = tabId;

      document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`panel-${tabId}`);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ─────────────────────────────────────────────────────────
   SEARCH
   ───────────────────────────────────────────────────────── */
function initSearch() {
  const toggle = document.getElementById('store-search-toggle');
  const box = document.getElementById('store-search-box');
  const input = document.getElementById('store-search-input');
  const close = document.getElementById('store-search-close');

  toggle?.addEventListener('click', () => {
    box.classList.add('open');
    toggle.style.display = 'none';
    input?.focus();
  });

  close?.addEventListener('click', () => {
    box.classList.remove('open');
    toggle.style.display = '';
    SSD.searchQuery = '';
    if (input) input.value = '';
    filterAndRenderProducts();
  });

  input?.addEventListener('input', e => {
    SSD.searchQuery = e.target.value;
    filterAndRenderProducts();
  });
}

/* ─────────────────────────────────────────────────────────
   MAP OVERLAY
   ───────────────────────────────────────────────────────── */
function openMapOverlay() {
  const s = SSD.store;
  const backdrop = document.getElementById('map-overlay-backdrop');
  if (!backdrop) return;

  const labelEl = document.getElementById('map-store-name-label');
  if (labelEl) labelEl.textContent = s.name;

  const titleEl = document.getElementById('map-store-label-title');
  if (titleEl) titleEl.textContent = `${s.name} — Location`;

  const infoList = document.getElementById('map-info-list');
  if (infoList) {
    infoList.innerHTML = `
      <div class="map-info-row">
        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${s.location}
      </div>
      <div class="map-info-row">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${s.walkingTime} min walk from main gate
      </div>
      <div class="map-info-row">
        <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
        ${s.floor}, UniMall Campus
      </div>`;
  }

  backdrop.classList.add('open');
}

function closeMapOverlay() {
  document.getElementById('map-overlay-backdrop')?.classList.remove('open');
}

/* ─────────────────────────────────────────────────────────
   REVIEW MODAL
   ───────────────────────────────────────────────────────── */
function openReviewModal() {
  SSD.reviewRating = 0;
  const textarea = document.getElementById('review-textarea');
  if (textarea) textarea.value = '';
  renderStarSelect(0);
  document.getElementById('review-modal-backdrop')?.classList.add('open');
}

function closeReviewModal() {
  document.getElementById('review-modal-backdrop')?.classList.remove('open');
}

function renderStarSelect(selected) {
  const el = document.getElementById('review-star-select');
  if (!el) return;
  el.innerHTML = [0,1,2,3,4].map(i => starSvgLarge(i < selected, i)).join('');
  el.querySelectorAll('.review-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SSD.reviewRating = parseInt(btn.dataset.star, 10);
      renderStarSelect(SSD.reviewRating);
    });
    btn.addEventListener('mouseover', () => {
      const hov = parseInt(btn.dataset.star, 10);
      el.querySelectorAll('.review-star-btn').forEach((b, i) => {
        const svg = b.querySelector('path');
        if (svg) {
          const on = i < hov;
          svg.setAttribute('fill', on ? '#FBBF24' : '#E5E7EB');
          svg.setAttribute('stroke', on ? '#FBBF24' : '#E5E7EB');
        }
      });
    });
    btn.addEventListener('mouseleave', () => {
      renderStarSelect(SSD.reviewRating);
    });
  });
}

/* ─────────────────────────────────────────────────────────
   EVENT LISTENERS
   ───────────────────────────────────────────────────────── */
function initEventListeners() {
  // Back button
  document.getElementById('hero-back-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.navigate === 'function') {
      window.navigate('stores');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html?view=stores';
    }
  });

  // Favourite
  document.getElementById('hero-fav-btn')?.addEventListener('click', () => {
    SSD.isFav = !SSD.isFav;
    document.getElementById('hero-fav-btn')?.classList.toggle('active', SSD.isFav);
    showSimpleToast(SSD.isFav ? `${SSD.store.name} saved to favourites ❤️` : 'Removed from favourites');
  });

  // Search
  initSearch();

  // Review modal
  document.getElementById('btn-write-review')?.addEventListener('click', openReviewModal);
  document.getElementById('btn-review-cancel')?.addEventListener('click', closeReviewModal);
  document.getElementById('review-modal-backdrop')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeReviewModal();
  });
  document.getElementById('btn-review-submit')?.addEventListener('click', () => {
    const text = document.getElementById('review-textarea')?.value.trim();
    if (!SSD.reviewRating) { showSimpleToast('Please select a star rating'); return; }
    if (!text || text.length < 10) { showSimpleToast('Please write at least 10 characters'); return; }
    closeReviewModal();
    showSimpleToast('Review submitted! Thank you 🌟');
  });

  // Map overlay
  document.getElementById('map-overlay-backdrop')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMapOverlay();
  });

  // Review helpful click handled in renderReviewsPanel
}

/* ─────────────────────────────────────────────────────────
   SIDEBAR PROFILE SYNC
   ───────────────────────────────────────────────────────── */
function syncSidebarProfile() {
  try {
    let user = (typeof window.UserManager !== 'undefined' && typeof window.UserManager.getActiveUser === 'function')
      ? window.UserManager.getActiveUser()
      : null;

    if (!user) {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.currentUser) user = p.currentUser;
      }
      const auth = localStorage.getItem('unimall_auth');
      if (auth) {
        const a = JSON.parse(auth);
        user = { ...(user || {}), ...a };
      }
    }
    if (!user) return;

    const nameEl = document.getElementById('sidebarProfileName') || document.getElementById('sidebar-name-el') || document.querySelector('.sidebar-profile-name');
    const roleEl = document.getElementById('sidebarProfileRole') || document.getElementById('sidebar-role-el') || document.querySelector('.sidebar-profile-role');
    const avatarEl = document.getElementById('sidebarAvatar') || document.getElementById('sidebar-avatar-el') || document.querySelector('.sidebar-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Campus Student';
    if (roleEl) {
      if (user.hostel && user.room) {
        roleEl.textContent = `${user.hostel} · ${user.room}`;
      } else {
        roleEl.textContent = user.email || 'Campus Account';
      }
    }
    if (avatarEl) {
      const initial = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'U';
      avatarEl.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
      avatarEl.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
      avatarEl.style.display = 'flex';
      avatarEl.style.alignItems = 'center';
      avatarEl.style.justifyContent = 'center';
      avatarEl.style.borderRadius = '50%';
    }
  } catch {}
}
