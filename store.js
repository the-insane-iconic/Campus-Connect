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
    id: 'store-bakery',
    dataId: 'campus-cafe',           // maps to js/data.js storeId
    name: 'Campus Bakery',
    emoji: '🥐',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Your go-to place for freshly baked goods, hot coffee, and campus snacks. Perfect for a quick break between classes or a cozy study session.',
    categoryLabel: 'Bakery, Snacks, Beverages',
    productCategories: ['All', 'Coffee', 'Snacks', 'Bakery', 'Beverages'],
    status: 'open',
    openingTime: '8:00 AM',
    closingTime: '10:00 PM',
    walkingTime: 2,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block A — near main entrance',
    phone: '+91 98765 43210',
    paymentMethods: 'UPI, Card, Cash',
    rating: 4.6,
    ratingBreakdown: [72, 18, 6, 2, 2],  // 5★ 4★ 3★ 2★ 1★ as % approx
    reviewCount: 128,
  },
  {
    id: 'store-stationery',
    dataId: 'book-corner',
    name: 'Stationery Hub',
    emoji: '📚',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Everything you need for lectures, exams, and projects. Notebooks, pens, highlighters, and study supplies all in one place.',
    categoryLabel: 'Notebooks, Pens, Supplies',
    productCategories: ['All', 'Notebooks', 'Pens', 'Art', 'Files'],
    status: 'open',
    openingTime: '9:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 2,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block B — near library',
    phone: '+91 98765 11223',
    paymentMethods: 'UPI, Cash',
    rating: 4.5,
    ratingBreakdown: [65, 22, 8, 3, 2],
    reviewCount: 94,
  },
  {
    id: 'store-print',
    dataId: 'book-corner',
    name: 'Print & Copy Center',
    emoji: '🖨️',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583912267550-d974498571b1?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Fast and affordable printing, photocopying, scanning, and binding. B&W prints from ₹1, colour from ₹5. Spiral and hard binding available.',
    categoryLabel: 'Printing, Photocopy, Binding',
    productCategories: ['All', 'B&W Print', 'Colour Print', 'Binding', 'Scan'],
    status: 'open',
    openingTime: '9:00 AM',
    closingTime: '8:00 PM',
    walkingTime: 4,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block C — near admin office',
    phone: '+91 98765 44556',
    paymentMethods: 'UPI, Cash',
    rating: 4.4,
    ratingBreakdown: [60, 25, 10, 3, 2],
    reviewCount: 76,
  },
  {
    id: 'store-sports',
    dataId: 'campus-mart',
    name: 'Sports Zone',
    emoji: '🏅',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Premium sportswear, fitness gear, and equipment for every sport. From yoga mats to cricket gear — we\'ve got you covered.',
    categoryLabel: 'Sportswear, Fitness, Gear',
    productCategories: ['All', 'Sportswear', 'Fitness', 'Cricket', 'Football'],
    status: 'open',
    openingTime: '10:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 3,
    floor: 'First Floor',
    location: 'First Floor, Block D — near gym entrance',
    phone: '+91 98765 77889',
    paymentMethods: 'UPI, Card, Cash',
    rating: 4.3,
    ratingBreakdown: [55, 28, 12, 3, 2],
    reviewCount: 58,
  },
  {
    id: 'store-fashion',
    dataId: 'campus-wear',
    name: 'Style Square',
    emoji: '👗',
    logo: null,
    coverImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400&auto=format&fit=crop&q=80',
    ],
    description: 'Trendy campus fashion for every style. Oversized hoodies, comfy joggers, totes, accessories, and more. Student-friendly prices.',
    categoryLabel: 'Clothing, Accessories',
    productCategories: ['All', 'Tops', 'Bottoms', 'Accessories', 'Bags'],
    status: 'closing',
    openingTime: '10:00 AM',
    closingTime: '8:00 PM',
    walkingTime: 5,
    floor: 'First Floor',
    location: 'First Floor, Block E — near cafeteria exit',
    phone: '+91 98765 99001',
    paymentMethods: 'UPI, Card',
    rating: 4.2,
    ratingBreakdown: [50, 30, 12, 5, 3],
    reviewCount: 43,
  },
  {
    id: 'store-electronics',
    dataId: 'techstop',
    name: 'Campus Electronics',
    emoji: '🎧',
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
    openingTime: '9:00 AM',
    closingTime: '9:00 PM',
    walkingTime: 3,
    floor: 'Ground Floor',
    location: 'Ground Floor, Block A — near main entrance',
    phone: '+91 98765 22334',
    paymentMethods: 'UPI, Card, Cash',
    rating: 4.4,
    ratingBreakdown: [60, 25, 10, 3, 2],
    reviewCount: 89,
  },
];

/* ─────────────────────────────────────────────────────────
   PRODUCTS DATA (per store, rich details)
   ───────────────────────────────────────────────────────── */
const STORE_PRODUCTS = {
  'store-bakery': [
    { id: 'sb-p1', name: 'Cold Brew Coffee', price: 120, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 18, subcat: 'Coffee' },
    { id: 'sb-p2', name: 'Grilled Veg Sandwich', price: 110, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Snacks' },
    { id: 'sb-p3', name: 'Dark Choco Muffin', price: 70, image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 16, subcat: 'Bakery' },
    { id: 'sb-p4', name: 'Iced Americano', price: 110, image: 'https://images.unsplash.com/photo-1561882468-9110d70d2a78?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 24, subcat: 'Coffee' },
    { id: 'sb-p5', name: 'Butter Croissant', price: 85, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 5, subcat: 'Bakery' },
    { id: 'sb-p6', name: 'Masala Chai (500ml)', price: 70, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Beverages' },
    { id: 'sb-p7', name: 'Oatmeal Raisin Cookies', price: 60, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 18, subcat: 'Bakery' },
    { id: 'sb-p8', name: 'Instant Coffee Sachets ×10', price: 90, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 24, subcat: 'Coffee' },
    { id: 'sb-p9', name: 'Classic Chips Pack', price: 30, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 50, subcat: 'Snacks' },
    { id: 'sb-p10', name: 'Energy Drink 350ml', price: 90, image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Beverages' },
  ],
  'store-stationery': [
    { id: 'ss-p1', name: 'A4 Spiral Notebook', price: 65, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 42, subcat: 'Notebooks' },
    { id: 'ss-p2', name: 'Ballpoint Pens 10-pack', price: 35, image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 60, subcat: 'Pens' },
    { id: 'ss-p3', name: 'Pastel Highlighters 6-pack', price: 160, image: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 24, subcat: 'Pens' },
    { id: 'ss-p4', name: 'Hardcover Dot-Grid Journal', price: 220, image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 15, subcat: 'Notebooks' },
    { id: 'ss-p5', name: 'Pastel Sticky Notes 5-pack', price: 85, image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 35, subcat: 'Notebooks' },
    { id: 'ss-p6', name: 'Gel Ink Pen Black', price: 15, image: 'https://images.unsplash.com/photo-1585336261026-7f050b1f3c30?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 90, subcat: 'Pens' },
    { id: 'ss-p7', name: 'Geometry Set 12-piece', price: 110, image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Art' },
    { id: 'ss-p8', name: 'Expanding File Folder 12-pocket', price: 180, image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Files' },
    { id: 'ss-p9', name: 'Engineering Graph Pad', price: 75, image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 45, subcat: 'Notebooks' },
    { id: 'ss-p10', name: 'Correction Tape 2-pack', price: 65, image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 50, subcat: 'Art' },
  ],
  'store-print': [
    { id: 'sp-p1', name: 'B&W Print (per page)', price: 1, image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 999, subcat: 'B&W Print' },
    { id: 'sp-p2', name: 'Colour Print (per page)', price: 5, image: 'https://images.unsplash.com/photo-1583912267550-d974498571b1?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 999, subcat: 'Colour Print' },
    { id: 'sp-p3', name: 'Spiral Binding', price: 30, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 50, subcat: 'Binding' },
    { id: 'sp-p4', name: 'Hard Binding (100 pages)', price: 80, image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Binding' },
    { id: 'sp-p5', name: 'Document Scanning (per page)', price: 3, image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 999, subcat: 'Scan' },
    { id: 'sp-p6', name: 'Lamination A4', price: 20, image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 40, subcat: 'B&W Print' },
  ],
  'store-sports': [
    { id: 'ssp-p1', name: 'Yoga Mat 6mm', price: 699, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 12, subcat: 'Fitness' },
    { id: 'ssp-p2', name: 'Cricket Bat Kashmir Willow', price: 899, image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 6, subcat: 'Cricket' },
    { id: 'ssp-p3', name: 'Football Size 5', price: 499, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 8, subcat: 'Football' },
    { id: 'ssp-p4', name: 'Resistance Bands Set 5', price: 349, image: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 20, subcat: 'Fitness' },
    { id: 'ssp-p5', name: 'Sports Dri-Fit T-Shirt', price: 399, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Sportswear' },
    { id: 'ssp-p6', name: 'Badminton Racket Set', price: 599, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 3, subcat: 'Football' },
  ],
  'store-fashion': [
    { id: 'sf-p1', name: 'Oversized Hoodie — Navy', price: 649, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 3, subcat: 'Tops' },
    { id: 'sf-p2', name: 'Campus Varsity Jacket', price: 1299, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 5, subcat: 'Tops' },
    { id: 'sf-p3', name: 'Cotton Crewneck Tee', price: 449, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 30, subcat: 'Tops' },
    { id: 'sf-p4', name: 'Eco Canvas Tote Bag', price: 249, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 40, subcat: 'Bags' },
    { id: 'sf-p5', name: 'Comfort Fleece Joggers', price: 699, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 14, subcat: 'Bottoms' },
    { id: 'sf-p6', name: 'Classic Baseball Cap', price: 299, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 22, subcat: 'Accessories' },
    { id: 'sf-p7', name: 'Campus Backpack 25L', price: 1199, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 12, subcat: 'Bags' },
    { id: 'sf-p8', name: 'Polarized Sunglasses', price: 399, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 18, subcat: 'Accessories' },
  ],
  'store-electronics': [
    { id: 'se-p1', name: 'Wireless Earbuds', price: 999, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 2, subcat: 'Audio' },
    { id: 'se-p2', name: 'USB-C Fast Charger 25W', price: 349, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 14, subcat: 'Charging' },
    { id: 'se-p3', name: 'Power Bank 10,000mAh', price: 899, image: 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 14, subcat: 'Charging' },
    { id: 'se-p4', name: 'Braided 3-in-1 Cable', price: 249, image: 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 35, subcat: 'Charging' },
    { id: 'se-p5', name: 'Waterproof Laptop Sleeve 14"', price: 449, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 22, subcat: 'Accessories' },
    { id: 'se-p6', name: 'Wireless Silent Mouse', price: 499, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 19, subcat: 'Accessories' },
    { id: 'se-p7', name: 'Portable Bluetooth Speaker', price: 799, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&auto=format&fit=crop&q=80', availability: 'low-stock', stock: 6, subcat: 'Audio' },
    { id: 'se-p8', name: 'Ergonomic Foam Mousepad', price: 199, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 28, subcat: 'Accessories' },
    { id: 'se-p9', name: '4-Port USB Hub', price: 399, image: 'https://images.unsplash.com/photo-1625948515291-696130d4655d?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 11, subcat: 'Storage' },
    { id: 'se-p10', name: 'Foldable Phone Stand', price: 249, image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&auto=format&fit=crop&q=80', availability: 'in-stock', stock: 25, subcat: 'Accessories' },
  ],
};

/* ─────────────────────────────────────────────────────────
   REVIEWS DATA
   ───────────────────────────────────────────────────────── */
const STORE_REVIEWS = {
  default: [
    {
      name: 'Aarav Sharma', avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Aarav&radius=50&backgroundColor=b6e3f4',
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

/* ─────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const storeId = params.get('id') || '';

  SSD.store = STORE_CATALOG.find(s => s.id === storeId || s.dataId === storeId) || STORE_CATALOG[0];
  SSD.products = STORE_PRODUCTS[SSD.store.id] || [];
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
  initEventListeners();

  // Live reactivity when store status changes in admin
  window.addEventListener('storage', (e) => {
    if (e.key === 'unimall_store_status_event' || e.key === 'unimall_store_statuses') {
      syncCurrentStoreStatus();
      renderInfoSheet();
      renderProductsPanel();
    }
  });
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

  renderCategoryChips();
  renderProductGrid();
}

function renderCategoryChips() {
  const chips = document.getElementById('store-cat-chips');
  if (!chips) return;
  const cats = SSD.store.productCategories || ['All'];
  chips.innerHTML = cats.map(c => `
    <button class="store-cat-chip ${c === SSD.activeCategory ? 'active' : ''}"
            data-cat="${c}" aria-pressed="${c === SSD.activeCategory}">${c}</button>
  `).join('');

  chips.querySelectorAll('.store-cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      SSD.activeCategory = btn.dataset.cat;
      SSD.searchQuery = '';
      const input = document.getElementById('store-search-input');
      if (input) input.value = '';
      chips.querySelectorAll('.store-cat-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === SSD.activeCategory);
        b.setAttribute('aria-pressed', b.dataset.cat === SSD.activeCategory);
      });
      filterAndRenderProducts();
    });
  });
}

function filterAndRenderProducts() {
  const q = SSD.searchQuery.trim().toLowerCase();
  SSD.filteredProducts = SSD.products.filter(p => {
    const matchCat = SSD.activeCategory === 'All' || p.subcat === SSD.activeCategory;
    const matchQ = !q || p.name.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderProductGrid();
}

function renderProductGrid() {
  const grid = document.getElementById('store-products-grid');
  if (!grid) return;

  if (SSD.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="store-no-products">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h4>No products found</h4>
        <p>Try a different search or category</p>
      </div>`;
    return;
  }

  grid.innerHTML = SSD.filteredProducts.map(p => {
    const avail = p.availability === 'in-stock' ? 'in-stock' : p.availability === 'low-stock' ? 'low-stock' : 'out-stock';
    const availLabel = p.availability === 'in-stock' ? 'In stock' : p.availability === 'low-stock' ? `Only ${p.stock} left` : 'Out of stock';
    const isOut = p.availability === 'out-of-stock';

    return `
      <div class="store-product-card" data-pid="${p.id}">
        <div class="store-product-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1503602642458-232111445657?w=400&auto=format&fit=crop&q=80'">
        </div>
        <div class="store-product-body">
          <div class="store-product-name">${p.name}</div>
          <div class="store-product-price">₹${p.price.toLocaleString('en-IN')}</div>
          <div class="store-product-avail ${avail}">
            <span class="avdot"></span>${availLabel}
          </div>
        </div>
        <button class="store-add-btn" data-pid="${p.id}" aria-label="Add ${p.name} to cart" ${isOut ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>`;
  }).join('');

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
        btn.style.transform = 'scale(0.7)';
        setTimeout(() => { btn.style.transform = ''; }, 180);
      } else {
        showSimpleToast('Max quantity reached');
      }
    });
  });
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
  const reviews = STORE_REVIEWS[s.id] || STORE_REVIEWS.default;

  // Summary
  const summary = document.getElementById('reviews-summary');
  if (summary) {
    const avgRating = s.rating || 4.5;
    const breakdown = s.ratingBreakdown || [60, 25, 10, 3, 2];
    const starsHtml = [1,2,3,4,5].map(i => starSvg(i <= Math.round(avgRating))).join('');
    const barsHtml = [5,4,3,2,1].map((star, idx) => `
      <div class="review-bar-row">
        <div class="review-bar-label">${star}★</div>
        <div class="review-bar-track">
          <div class="review-bar-fill" style="width:${breakdown[4 - idx] || 0}%"></div>
        </div>
        <div class="review-bar-pct">${breakdown[4 - idx] || 0}%</div>
      </div>`).join('');

    summary.innerHTML = `
      <div class="reviews-big-rating">
        <div class="reviews-big-num">${avgRating.toFixed(1)}</div>
        <div class="reviews-stars-row">${starsHtml}</div>
        <div class="reviews-count-text">${s.reviewCount || reviews.length * 10}+ reviews</div>
      </div>
      <div class="reviews-bars">${barsHtml}</div>`;
  }

  // Review cards
  const list = document.getElementById('reviews-list');
  if (list) {
    list.innerHTML = reviews.map(r => {
      const starsHtml = [1,2,3,4,5].map(i => starSvg(i <= r.rating)).join('');
      return `
        <div class="review-card">
          <div class="review-card-header">
            <div class="review-avatar">
              <img src="${r.avatar}" alt="${r.name}"
                   onerror="this.src='${typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar(r.name) : ''}'"
                   referrerpolicy="no-referrer">
            </div>
            <div class="review-user-info">
              <div class="review-user-name">${r.name}</div>
              <div class="review-verified">✓ Verified Student</div>
            </div>
          </div>
          <div class="review-stars">${starsHtml}</div>
          <p class="review-text">"${r.text}"</p>
          <div class="review-footer">
            <span class="review-date">${r.date}</span>
            <button class="review-helpful-btn" data-helpful="${r.helpful}">
              ${thumbsSvg()} Helpful ${r.helpful}
            </button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.review-helpful-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        let count = parseInt(btn.dataset.helpful || '0', 10) + 1;
        btn.dataset.helpful = count;
        btn.innerHTML = `${thumbsSvg()} Helpful ${count}`;
        btn.style.color = '#2563EB';
        btn.style.borderColor = '#93C5FD';
        btn.disabled = true;
      });
    });
  }
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
      <button class="recommended-see-all" onclick="window.location.href='stores.html'">
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
    const go = () => { window.location.href = `store.html?id=${card.dataset.sid}`; };
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
  document.getElementById('hero-back-btn')?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'stores.html';
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
    let user = null;
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
    if (!user) return;

    const nameEl = document.getElementById('sidebar-name-el');
    const roleEl = document.getElementById('sidebar-role-el');
    const avatarEl = document.getElementById('sidebar-avatar-el');

    if (nameEl && user.name) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = `${user.hostel || 'Hostel B'} · ${user.room || 'Room 214'}`;
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
