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
  /* ── FOOD & DRINKS ── */
  {
    id: 'p01', name: 'Cold Brew Coffee', price: 120, emoji: '☕', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Smooth, slow-steeped cold brew with a bold flavour. Served over ice.',
    stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p02', name: 'Instant Coffee Sachets ×10', price: 90, emoji: '☕', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Pack of 10 individual instant coffee sachets. Convenient for late-night study sessions.',
    stock: 24, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.2, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p03', name: 'Classic Chips Snack Pack', price: 30, emoji: '🥔', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-mart',
    description: 'Salted potato chips in the iconic classic flavour. Great for quick snacking.',
    stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p04', name: 'Protein Bar — Chocolate', price: 80, emoji: '🍫', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1622484212850-cab596d63c5d?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'health-hub',
    description: '20g of whey protein per bar. Great post-workout or as a filling snack between classes.',
    stock: 15, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p06', name: 'Instant Noodles Cup', price: 45, emoji: '🍜', bg: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-mart',
    description: 'Ready-in-3-minutes instant noodles. A late-night hostel staple.',
    stock: 32, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.1, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p15', name: 'Masala Chai Flask (500ml)', price: 70, emoji: '☕', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Steaming hot spiced cardamom & ginger tea. Perfect fuel for group discussions.',
    stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.8, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p16', name: 'Butter Croissant', price: 85, emoji: '🥐', bg: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Flaky, buttery baked croissant delivered fresh from the campus bakery daily.',
    stock: 12, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p17', name: 'Grilled Veg Club Sandwich', price: 110, emoji: '🥪', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Triple-decker toasted sandwich with cheese, veggies, and house herb mayo.',
    stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p18', name: 'Dark Choco Chip Muffin', price: 65, emoji: '🧁', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Moist dark chocolate muffin loaded with rich chocolate chunks.',
    stock: 16, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: false, isPopular: true, isRestocked: true,
  },
  {
    id: 'p19', name: 'Energy Drink 350ml', price: 125, emoji: '⚡', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-mart',
    description: 'Refreshing carbonated energy booster with taurine and B-vitamins.',
    stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p20', name: 'Roasted Salted Almonds 100g', price: 140, emoji: '🥜', bg: '#FEF9EE',
    image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'health-hub',
    description: 'Slow-roasted California almonds lightly seasoned with Himalayan pink salt.',
    stock: 22, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: false, isRestocked: false,
  },
  {
    id: 'p21', name: 'Greek Blueberry Yogurt', price: 55, emoji: '🫐', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'health-hub',
    description: 'Thick, creamy probiotic Greek yogurt topped with real blueberry puree.',
    stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p22', name: 'Fresh Cut Fruit Bowl', price: 75, emoji: '🍉', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'health-hub',
    description: 'Assortment of seasonal fruits freshly prepared and sealed for hygiene.',
    stock: 10, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p23', name: 'Cheese Nachos & Salsa', price: 95, emoji: '🧀', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-mart',
    description: 'Crispy corn tortilla chips accompanied by tangy Mexican salsa dip.',
    stock: 28, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.2, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p24', name: 'Oatmeal & Raisin Cookies', price: 60, emoji: '🍪', bg: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80',
    categoryId: 'food', storeId: 'campus-cafe',
    description: 'Handmade chewy oatmeal cookies packed with plump golden raisins.',
    stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: true,
  },

  /* ── STATIONERY ── */
  {
    id: 'p07', name: 'A4 Spiral Notebook', price: 65, emoji: '📓', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: '200 pages, 70 GSM ruled paper. Smooth writing, durable spiral binding.',
    stock: 42, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p08', name: 'Ballpoint Pen 10-pack', price: 35, emoji: '🖊️', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Smooth-writing blue ballpoint pens. Pack of 10. Reliable for every exam.',
    stock: 60, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.2, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p09', name: 'Gel Ink Pen Black', price: 15, emoji: '🖊️', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1585336261026-7f050b1f3c30?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Fine-tip 0.5mm black gel pen. Smear-resistant ink, comfortable grip.',
    stock: 90, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p10', name: 'Whiteboard Markers 4-pack', price: 120, emoji: '🖊️', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Assorted colour whiteboard markers. Quick-dry, low-odour, easy to erase.',
    stock: 18, availability: 'in-stock', deliveryAvailable: false, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p26', name: 'Pastel Sticky Notes 5-pack', price: 85, emoji: '📝', bg: '#FEF9EE',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Soft pastel sticky reminder pads (400 sheets). Strong adhesive, no residue.',
    stock: 35, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p27', name: 'Highlighters Pastel 6-pack', price: 160, emoji: '🖍️', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Chisel tip aesthetic pastel highlighter set. Does not bleed through textbook pages.',
    stock: 24, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.8, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p28', name: 'Scientific Calculator FX-991', price: 890, emoji: '🔢', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e485?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'techstop',
    description: '552 functions advanced natural display scientific calculator. Exam approved.',
    stock: 8, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.9, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p29', name: 'Mathematical Geometry Set', price: 110, emoji: '📐', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Precision compass, divider, protractor, set squares and metal tin case.',
    stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p30', name: 'Engineering Graph Pad', price: 75, emoji: '📈', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: '100 sheets mm-grid millimeter graph sheets with perforated tear off.',
    stock: 45, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p31', name: 'Hardcover Executive Journal', price: 220, emoji: '📖', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Faux leather bound dot-grid journal with ribbon bookmark and elastic band.',
    stock: 15, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p32', name: 'Correction Tape Pen 2-pack', price: 65, emoji: '✏️', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: 'Instant-dry white tear-proof film correction tape. No drying time needed.',
    stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.1, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p33', name: 'Expanding File Folder 12-pocket', price: 180, emoji: '📁', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
    categoryId: 'stationery', storeId: 'book-corner',
    description: '12 multi-colored tabbed pockets with secure buckle closure for lecture notes.',
    stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },

  /* ── ELECTRONICS ── */
  {
    id: 'p11', name: 'Wireless Earbuds', price: 999, emoji: '🎧', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'True wireless earbuds with 6-hour battery and passive noise isolation. Compatible with all devices.',
    stock: 2, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p12', name: 'USB-C Fast Charger 25W', price: 349, emoji: '🔌', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: '25W USB-C PD charger with cable. Compatible with phones and tablets.',
    stock: 1, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p36', name: 'Power Bank 10,000mAh 22.5W', price: 899, emoji: '🔋', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Compact pocket power bank with twin USB outputs and fast Type-C PD input.',
    stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p37', name: 'Wireless Silent Mouse', price: 499, emoji: '🖱️', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Quiet click 2.4GHz wireless mouse with nano receiver and ergonomic contour.',
    stock: 19, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p38', name: 'Waterproof Laptop Sleeve 14"', price: 449, emoji: '💻', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Padded fleece interior with water-resistant polyester outer and accessory pouch.',
    stock: 22, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p39', name: 'Braided 3-in-1 Cable', price: 249, emoji: '🔌', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Durable nylon braided 1.2m cable with Type-C, Lightning, and Micro-USB heads.',
    stock: 35, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p40', name: '4-Port High Speed USB Hub', price: 399, emoji: '🔌', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1625948515291-696130d4655d?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'USB 3.0 ultra-slim aluminum hub with 5Gbps transfer speed and LED indicator.',
    stock: 11, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: false,
  },
  {
    id: 'p41', name: 'Portable Bluetooth Speaker Mini', price: 799, emoji: '🔊', bg: '#FEF9EE',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'IPX5 splashproof outdoor wireless speaker with deep bass and 8h battery.',
    stock: 6, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p42', name: 'Ergonomic Foam Mousepad', price: 199, emoji: '🖱️', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Cushioned wrist rest mouse pad with non-slip PU base for long study hours.',
    stock: 28, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p43', name: 'Screen Cleaning Spray + Cloth', price: 129, emoji: '🧼', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Non-toxic, ammonia-free mist with plush microfiber cloth for laptops and tablets.',
    stock: 40, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p44', name: 'Foldable Phone & Tablet Stand', price: 249, emoji: '📱', bg: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&auto=format&fit=crop&q=80',
    categoryId: 'electronics', storeId: 'techstop',
    description: 'Adjustable dual-axis aluminum desktop holder for hands-free video lectures.',
    stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: false, isPopular: true, isRestocked: false,
  },

  /* ── FASHION ── */
  {
    id: 'p13', name: 'Oversized Hoodie — Navy', price: 649, emoji: '🧥', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Soft cotton-blend oversized hoodie in navy blue. Unisex sizing. Machine washable.',
    stock: 3, availability: 'low-stock', deliveryAvailable: false, pickupAvailable: true,
    rating: 4.8, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p47', name: 'Campus Varsity Jacket', price: 1299, emoji: '🧥', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Premium wool-blend collegiate letterman jacket with ribbed cuffs and snap buttons.',
    stock: 5, availability: 'low-stock', deliveryAvailable: false, pickupAvailable: true,
    rating: 4.9, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p48', name: 'Cotton Crewneck Tee', price: 449, emoji: '👕', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: '100% bio-washed breathable cotton t-shirt with subtle UniMall chest embroidery.',
    stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p49', name: 'Eco Canvas Tote Bag', price: 249, emoji: '👜', bg: '#FEF9EE',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Heavy-duty 14oz unbleached cotton tote bag with sturdy reinforced shoulder straps.',
    stock: 40, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: true,
  },
  {
    id: 'p50', name: 'Classic Cotton Baseball Cap', price: 299, emoji: '🧢', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Adjustable metal clasp strapback cap with curved brim and breathable eyelets.',
    stock: 22, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: false,
  },
  {
    id: 'p51', name: 'Comfort Fleece Joggers', price: 699, emoji: '👖', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Relaxed fit tapered sweatpants with drawstring waistband and zippered side pockets.',
    stock: 14, availability: 'in-stock', deliveryAvailable: false, pickupAvailable: true,
    rating: 4.7, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p52', name: 'Low-Top Canvas Sneakers', price: 999, emoji: '👟', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Timeless campus vulcanized rubber sole sneakers with cushioned insole.',
    stock: 9, availability: 'low-stock', deliveryAvailable: false, pickupAvailable: true,
    rating: 4.5, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p53', name: 'Sport Ankle Socks (3-Pack)', price: 199, emoji: '🧦', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Moisture-wicking combed cotton ankle socks with arch support compression.',
    stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p54', name: 'Polarized Matte Sunglasses', price: 399, emoji: '🕶️', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'UV400 protection lightweight wayfarer sunglasses with glare reduction lenses.',
    stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p55', name: 'Ribbed Knit Beanie', price: 249, emoji: '🧶', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Warm acrylic knit cuff beanie. Stretchy fit suitable for chilly campus mornings.',
    stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.2, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p56', name: 'Campus Backpack 25L', price: 1199, emoji: '🎒', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80',
    categoryId: 'fashion', storeId: 'campus-wear',
    description: 'Ergonomic water-repellent student backpack with padded 15.6" laptop compartment.',
    stock: 12, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.8, isNearby: false, isPopular: true, isRestocked: true,
  },

  /* ── ESSENTIALS ── */
  {
    id: 'p05', name: 'Mineral Water 1 L', price: 20, emoji: '💧', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'Natural mineral water, 1 litre bottle. Essential hydration for long days on campus.',
    stock: 80, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.0, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p14', name: 'Compact Umbrella', price: 199, emoji: '☂️', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'Lightweight folding umbrella that fits in any bag. UV protection & wind-resistant frame.',
    stock: 10, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.1, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p58', name: 'Insulated Bottle 750ml', price: 399, emoji: '🍶', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'Double-wall stainless steel vacuum flask. Keeps beverages cold 24h or hot 12h.',
    stock: 26, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.7, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p59', name: 'Quick-Dry Microfiber Towel', price: 199, emoji: '🧖', bg: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'health-hub',
    description: 'Ultra-absorbent antibacterial compact towel for gym, pool, and hostel life.',
    stock: 32, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p60', name: 'Hand Sanitizer 100ml', price: 50, emoji: '🧴', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'health-hub',
    description: '70% isopropyl alcohol rinse-free sanitizing gel with aloe vera moisturizer.',
    stock: 75, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p61', name: 'Pocket Tissues (Pack of 6)', price: 40, emoji: '🧻', bg: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: '3-ply ultra-soft facial pocket tissues, travel-sized convenience.',
    stock: 90, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.2, isNearby: false, isPopular: false, isRestocked: false,
  },
  {
    id: 'p62', name: 'Bento Lunch Box 3-Grid', price: 349, emoji: '🍱', bg: '#FEF9EE',
    image: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'BPA-free leakproof lunch container with cutlery set. Microwave safe.',
    stock: 16, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: false, isPopular: true, isRestocked: false,
  },
  {
    id: 'p63', name: 'Hostel First-Aid Kit', price: 249, emoji: '🩹', bg: '#FFF1F2',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'health-hub',
    description: 'Compact medical pouch with antiseptic wipes, bandages, pain relief, and burn gel.',
    stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.8, isNearby: true, isPopular: false, isRestocked: false,
  },
  {
    id: 'p64', name: 'Mosquito Repellent Device', price: 99, emoji: '🦟', bg: '#F0FDF4',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'Plug-in mosquito repellent vaporizer with 45-night refill liquid.',
    stock: 45, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.3, isNearby: false, isPopular: false, isRestocked: true,
  },
  {
    id: 'p65', name: 'Bedside Caddy Organizer', price: 299, emoji: '🧺', bg: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'campus-mart',
    description: 'Felt bedside hanging storage pocket for water bottle, phone, books, and glasses.',
    stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.6, isNearby: true, isPopular: true, isRestocked: false,
  },
  {
    id: 'p66', name: 'Disinfecting Wipes 40-pk', price: 110, emoji: '🧽', bg: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'health-hub',
    description: 'Multi-surface sanitizing wipes killing 99.9% of germs for study desk and phone.',
    stock: 38, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.4, isNearby: false, isPopular: false, isRestocked: false,
  },
  {
    id: 'p67', name: 'LED Study Desk Torch', price: 220, emoji: '🔦', bg: '#FEF9EB',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80',
    categoryId: 'essentials', storeId: 'techstop',
    description: 'USB rechargeable emergency reading lamp with flexible neck and clip base.',
    stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true,
    rating: 4.5, isNearby: false, isPopular: true, isRestocked: true,
  },
  // Store Detail Page Catalog Products
  { id: 'sb-p1', name: 'Cold Brew Coffee', price: 120, emoji: '☕', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Smooth, slow-steeped cold brew with a bold flavour.', stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'sb-p2', name: 'Grilled Veg Sandwich', price: 110, emoji: '🥪', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Triple-decker toasted sandwich with cheese and fresh veggies.', stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'sb-p3', name: 'Dark Choco Muffin', price: 70, emoji: '🧁', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Moist chocolate muffin baked fresh daily.', stock: 16, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'sb-p4', name: 'Iced Americano', price: 110, emoji: '☕', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1561882468-9110d70d2a78?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Double espresso shots poured over iced water.', stock: 24, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'sb-p5', name: 'Butter Croissant', price: 85, emoji: '🥐', bg: '#FFF7ED', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Flaky French butter croissant.', stock: 5, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'sb-p6', name: 'Masala Chai (500ml)', price: 70, emoji: '☕', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Steaming hot spiced tea in flask.', stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.8 },
  { id: 'sb-p7', name: 'Oatmeal Raisin Cookies', price: 60, emoji: '🍪', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Chewy oatmeal raisin bakery cookies.', stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.3 },
  { id: 'sb-p8', name: 'Instant Coffee Sachets ×10', price: 90, emoji: '☕', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Pack of 10 instant coffee sachets.', stock: 24, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.2 },
  { id: 'sb-p9', name: 'Classic Chips Pack', price: 30, emoji: '🥔', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Salted potato chips pack.', stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'sb-p10', name: 'Energy Drink 350ml', price: 90, emoji: '⚡', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80', categoryId: 'food', storeId: 'campus-cafe', description: 'Revitalizing energy drink for late-night exams.', stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.3 },
  { id: 'ss-p1', name: 'A4 Spiral Notebook', price: 65, emoji: '📓', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Rule lined 160-page spiral notebook.', stock: 42, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'ss-p2', name: 'Ballpoint Pens 10-pack', price: 35, emoji: '🖊️', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Smooth writing blue ink ball pens.', stock: 60, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'ss-p3', name: 'Pastel Highlighters 6-pack', price: 160, emoji: '🖍️', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Soft pastel shades chisel tip highlighters.', stock: 24, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'ss-p4', name: 'Hardcover Dot-Grid Journal', price: 220, emoji: '📔', bg: '#F5F3FF', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Premium 100gsm paper dot-grid journal.', stock: 15, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.8 },
  { id: 'ss-p5', name: 'Pastel Sticky Notes 5-pack', price: 85, emoji: '📑', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Self-adhesive sticky notes 100 sheets per pad.', stock: 35, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'ss-p6', name: 'Gel Ink Pen Black', price: 15, emoji: '🖋️', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1585336261026-7f050b1f3c30?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Fast-drying 0.5mm gel ink pen.', stock: 90, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'ss-p7', name: 'Geometry Set 12-piece', price: 110, emoji: '📐', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Complete compass and ruler geometry kit in metal case.', stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'ss-p8', name: 'Expanding File Folder 12-pocket', price: 180, emoji: '📁', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: '12-tab accordion file document organizer.', stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'ss-p9', name: 'Engineering Graph Pad', price: 75, emoji: '📄', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: '5mm grid metric graphing pad.', stock: 45, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'ss-p10', name: 'Correction Tape 2-pack', price: 65, emoji: '✏️', bg: '#FFF7ED', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'book-corner', description: 'Instant dry whiteout tape 5mm x 12m.', stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.3 },
  { id: 'sp-p1', name: 'B&W Print (per page)', price: 1, emoji: '📄', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'Laser print black & white per page.', stock: 999, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.8 },
  { id: 'sp-p2', name: 'Colour Print (per page)', price: 5, emoji: '🖨️', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1583912267550-d974498571b1?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'High resolution color document print.', stock: 999, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'sp-p3', name: 'Spiral Binding', price: 30, emoji: '📚', bg: '#F5F3FF', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'Plastic spiral binding with transparent sheet covers.', stock: 50, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'sp-p4', name: 'Hard Binding (100 pages)', price: 80, emoji: '📕', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'Gold embossed project thesis binding.', stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.9 },
  { id: 'sp-p5', name: 'Document Scanning (per page)', price: 3, emoji: '📱', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'High speed 600dpi optical document scan to PDF.', stock: 999, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'sp-p6', name: 'Lamination A4', price: 20, emoji: '📜', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80', categoryId: 'stationery', storeId: 'campus-mart', description: 'Heat sealed durable pouch lamination.', stock: 40, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'ssp-p1', name: 'Yoga Mat 6mm', price: 699, emoji: '🧘', bg: '#F5F3FF', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80', categoryId: 'essentials', storeId: 'health-hub', description: 'Anti-skid fitness and yoga workout mat.', stock: 12, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'ssp-p2', name: 'Cricket Bat Kashmir Willow', price: 899, emoji: '🏏', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&auto=format&fit=crop&q=80', categoryId: 'essentials', storeId: 'health-hub', description: 'Full size cricket bat with rubber chevron grip.', stock: 6, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'ssp-p3', name: 'Football Size 5', price: 499, emoji: '⚽', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80', categoryId: 'essentials', storeId: 'health-hub', description: 'Standard 32-panel durable campus turf football.', stock: 8, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'ssp-p4', name: 'Resistance Bands Set 5', price: 349, emoji: '💪', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&auto=format&fit=crop&q=80', categoryId: 'essentials', storeId: 'health-hub', description: '5 resistance loop levels for hostel room workouts.', stock: 20, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'ssp-p5', name: 'Sports Dri-Fit T-Shirt', price: 399, emoji: '👕', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'health-hub', description: 'Breathable moisture-wicking activewear tee.', stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'ssp-p6', name: 'Badminton Racket Set', price: 599, emoji: '🏸', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&auto=format&fit=crop&q=80', categoryId: 'essentials', storeId: 'health-hub', description: 'Pair of aluminium rackets with 2 nylon shuttlecocks.', stock: 3, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'sf-p1', name: 'Oversized Hoodie — Navy', price: 649, emoji: '🧥', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Heavyweight fleece cotton oversized university hoodie.', stock: 3, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'sf-p2', name: 'Campus Varsity Jacket', price: 1299, emoji: '🧥', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Wool blend varsity jacket with striped collar and snaps.', stock: 5, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.8 },
  { id: 'sf-p3', name: 'Cotton Crewneck Tee', price: 449, emoji: '👕', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: '100% combed cotton pre-shrunk campus tee.', stock: 30, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'sf-p4', name: 'Eco Canvas Tote Bag', price: 249, emoji: '👜', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Heavy duty natural cotton canvas shoulder tote.', stock: 40, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'sf-p5', name: 'Comfort Fleece Joggers', price: 699, emoji: '👖', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Tapered fit fleece sweatpants with zippered pockets.', stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'sf-p6', name: 'Classic Baseball Cap', price: 299, emoji: '🧢', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Embroidered campus crest dad hat with brass buckle.', stock: 22, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'sf-p7', name: 'Campus Backpack 25L', price: 1199, emoji: '🎒', bg: '#F5F3FF', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'Water resistant laptop backpack with padded straps.', stock: 12, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.8 },
  { id: 'sf-p8', name: 'Polarized Sunglasses', price: 399, emoji: '🕶️', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', categoryId: 'fashion', storeId: 'campus-wear', description: 'UV400 protective polarized lenses in matte frame.', stock: 18, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.3 },
  { id: 'se-p1', name: 'Wireless Earbuds', price: 999, emoji: '🎧', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'True wireless stereo earbuds with charging case and ENC.', stock: 2, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.7 },
  { id: 'se-p2', name: 'USB-C Fast Charger 25W', price: 349, emoji: '🔌', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'PD 3.0 Type-C wall adapter charger.', stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'se-p3', name: 'Power Bank 10,000mAh', price: 899, emoji: '🔋', bg: '#F5F3FF', image: 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Compact fast charging portable battery pack.', stock: 14, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'se-p4', name: 'Braided 3-in-1 Cable', price: 249, emoji: '🔌', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Nylon braided cable with Lightning, Type-C & Micro-USB.', stock: 35, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'se-p5', name: 'Waterproof Laptop Sleeve 14"', price: 449, emoji: '💼', bg: '#F0FDF4', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Shockproof padded fleece lined laptop cover case.', stock: 22, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'se-p6', name: 'Wireless Silent Mouse', price: 499, emoji: '🖱️', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: '2.4GHz optical wireless mouse with quiet clicking buttons.', stock: 19, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'se-p7', name: 'Portable Bluetooth Speaker', price: 799, emoji: '🔊', bg: '#FFF1F2', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Compact outdoor wireless speaker with deep bass.', stock: 6, availability: 'low-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
  { id: 'se-p8', name: 'Ergonomic Foam Mousepad', price: 199, emoji: '🖱️', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Memory foam wrist rest support pad with non-slip base.', stock: 28, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.4 },
  { id: 'se-p9', name: '4-Port USB Hub', price: 399, emoji: '💻', bg: '#EFF6FF', image: 'https://images.unsplash.com/photo-1625948515291-696130d4655d?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'USB 3.0 multi-port splitter adapter with LED indicator.', stock: 11, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.5 },
  { id: 'se-p10', name: 'Foldable Phone Stand', price: 249, emoji: '📱', bg: '#FEF9EB', image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&auto=format&fit=crop&q=80', categoryId: 'electronics', storeId: 'techstop', description: 'Adjustable angle aluminum desktop phone & tablet cradle.', stock: 25, availability: 'in-stock', deliveryAvailable: true, pickupAvailable: true, rating: 4.6 },
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

/* ─── MOCK USER ──────────────────────────────────────────── */
const DEFAULT_USER = {
  name:   'Ansh Sharma',
  email:  'ansh.s@campus.edu',
  hostel: 'Hostel B',
  room:   'Room 214',
  avatar: 'A',
  phone:  '+91 98765 43210',
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

