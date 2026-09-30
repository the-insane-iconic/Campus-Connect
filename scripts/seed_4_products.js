/**
 * seed_4_products.js
 * Updates Neon PostgreSQL unimall_products table to contain exactly 4 test products per store (24 total).
 */
const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS_4_PER_STORE = [
  // ─── 1. CAMPUS CAFE (4 products) ─────────────────────────
  {
    id: 'prod_cafe_01',
    store_id: 'campus-cafe',
    category_id: 'food',
    name: 'Cold Brew Coffee',
    description: 'Smooth, slow-steeped cold brew with a rich, bold flavor. Served ice-cold at the counter.',
    price: 120.00,
    emoji: '☕',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EB',
    stock: 25,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_cafe_02',
    store_id: 'campus-cafe',
    category_id: 'food',
    name: 'Masala Chai Flask (500ml)',
    description: 'Steaming hot spiced cardamom & ginger tea. Ideal fuel for study sessions with friends.',
    price: 70.00,
    emoji: '☕',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EB',
    stock: 30,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.9,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_cafe_03',
    store_id: 'campus-cafe',
    category_id: 'food',
    name: 'Butter Croissant',
    description: 'Flaky, golden-baked buttery croissant prepared fresh in the campus bakery daily.',
    price: 85.00,
    emoji: '🥐',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    bg: '#FFF7ED',
    stock: 18,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.7,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_cafe_04',
    store_id: 'campus-cafe',
    category_id: 'food',
    name: 'Grilled Veg Club Sandwich',
    description: 'Triple-decker toasted sandwich with cheese, fresh veggies, and house herb mayo.',
    price: 110.00,
    emoji: '🥪',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    bg: '#F0FDF4',
    stock: 20,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.6,
    is_nearby: true,
    is_popular: false,
    is_restocked: false
  },

  // ─── 2. BOOK CORNER (4 products) ─────────────────────────
  {
    id: 'prod_book_01',
    store_id: 'book-corner',
    category_id: 'stationery',
    name: 'A4 Spiral Notebook (200 pgs)',
    description: '200 pages, 70 GSM ruled paper with smooth writing surface and durable spiral binding.',
    price: 65.00,
    emoji: '📓',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 50,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.7,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_book_02',
    store_id: 'book-corner',
    category_id: 'stationery',
    name: 'Ballpoint Pens (10-Pack)',
    description: 'Smooth smudge-free blue ballpoint pens. Reliable for everyday lectures and final exams.',
    price: 35.00,
    emoji: '🖊️',
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
    bg: '#F0FDF4',
    stock: 80,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.5,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_book_03',
    store_id: 'book-corner',
    category_id: 'stationery',
    name: 'Pastel Sticky Notes 5-Pack',
    description: 'Soft pastel sticky reminder pads (400 sheets). Strong residue-free adhesive.',
    price: 85.00,
    emoji: '📝',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EE',
    stock: 40,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_book_04',
    store_id: 'book-corner',
    category_id: 'stationery',
    name: 'Engineering Graph Pad',
    description: '100 sheets mm-grid millimeter graph sheets with clean perforated tear-off edges.',
    price: 75.00,
    emoji: '📈',
    image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&auto=format&fit=crop&q=80',
    bg: '#F0FDF4',
    stock: 35,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.6,
    is_nearby: false,
    is_popular: false,
    is_restocked: true
  },

  // ─── 3. TECHSTOP (4 products) ────────────────────────────
  {
    id: 'prod_tech_01',
    store_id: 'techstop',
    category_id: 'electronics',
    name: 'True Wireless Earbuds',
    description: 'TWS earbuds with 28-hour battery, deep bass, and instant Bluetooth 5.3 pairing.',
    price: 999.00,
    emoji: '🎧',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    bg: '#F5F3FF',
    stock: 12,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_tech_02',
    store_id: 'techstop',
    category_id: 'electronics',
    name: 'USB-C Fast Charger 25W',
    description: '25W Type-C Power Delivery wall adapter with certified surge and thermal protection.',
    price: 349.00,
    emoji: '🔌',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    bg: '#ECFDF5',
    stock: 25,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.7,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_tech_03',
    store_id: 'techstop',
    category_id: 'electronics',
    name: 'Power Bank 10,000mAh 22.5W',
    description: 'Compact pocket battery pack with twin USB outputs and fast bi-directional Type-C PD.',
    price: 899.00,
    emoji: '🔋',
    image: 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 15,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.9,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_tech_04',
    store_id: 'techstop',
    category_id: 'electronics',
    name: 'Wireless Silent Mouse',
    description: 'Whisper-quiet clicks, 2.4GHz USB nano receiver, and ergonomic palm contour.',
    price: 499.00,
    emoji: '🖱️',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EB',
    stock: 20,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.6,
    is_nearby: false,
    is_popular: false,
    is_restocked: true
  },

  // ─── 4. CAMPUS MART (4 products) ─────────────────────────
  {
    id: 'prod_mart_01',
    store_id: 'campus-mart',
    category_id: 'essentials',
    name: 'Classic Salted Chips Pack',
    description: 'Crisp, golden sliced potato chips with classic sea salt seasoning. Quick hostel snack.',
    price: 30.00,
    emoji: '🥔',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EB',
    stock: 60,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.5,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_mart_02',
    store_id: 'campus-mart',
    category_id: 'essentials',
    name: 'Instant Noodles Cup',
    description: 'Hot ready-in-3-minutes spiced vegetable instant noodles cup. The ultimate late-night meal.',
    price: 45.00,
    emoji: '🍜',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    bg: '#FFF7ED',
    stock: 50,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.6,
    is_nearby: true,
    is_popular: true,
    is_restocked: true
  },
  {
    id: 'prod_mart_03',
    store_id: 'campus-mart',
    category_id: 'essentials',
    name: 'Energy Drink Can 350ml',
    description: 'Carbonated taurine & B-vitamin booster to stay sharp through project submissions.',
    price: 125.00,
    emoji: '⚡',
    image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 30,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.4,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_mart_04',
    store_id: 'campus-mart',
    category_id: 'essentials',
    name: 'Natural Mineral Water 1 Litre',
    description: 'Clean, refreshing mineral hydration bottle essential for lectures and campus sports.',
    price: 20.00,
    emoji: '💧',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 100,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: true,
    is_popular: false,
    is_restocked: false
  },

  // ─── 5. CAMPUS WEAR (4 products) ─────────────────────────
  {
    id: 'prod_wear_01',
    store_id: 'campus-wear',
    category_id: 'fashion',
    name: 'Oversized Campus Hoodie — Navy',
    description: 'Plush 320 GSM fleece unisex hoodie with kangaroo pocket and embroidered campus monogram.',
    price: 649.00,
    emoji: '🧥',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 15,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_wear_02',
    store_id: 'campus-wear',
    category_id: 'fashion',
    name: 'Collegiate Varsity Jacket',
    description: 'Vintage collegiate wool-blend varsity jacket with snap buttons and striped rib trims.',
    price: 1299.00,
    emoji: '🧥',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EB',
    stock: 10,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.9,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_wear_03',
    store_id: 'campus-wear',
    category_id: 'fashion',
    name: '100% Cotton Crewneck Tee',
    description: 'Breathable bio-washed combed cotton everyday student tee. Ultra-soft and durable.',
    price: 449.00,
    emoji: '👕',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    bg: '#F0FDF4',
    stock: 35,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.7,
    is_nearby: true,
    is_popular: false,
    is_restocked: false
  },
  {
    id: 'prod_wear_04',
    store_id: 'campus-wear',
    category_id: 'fashion',
    name: 'Classic Cotton Baseball Cap',
    description: 'Unstructured 6-panel strapback cap with curved visor and brass sizing buckle.',
    price: 299.00,
    emoji: '🧢',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop&q=80',
    bg: '#EFF6FF',
    stock: 25,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.5,
    is_nearby: true,
    is_popular: false,
    is_restocked: false
  },

  // ─── 6. HEALTH HUB (4 products) ──────────────────────────
  {
    id: 'prod_health_01',
    store_id: 'health-hub',
    category_id: 'essentials',
    name: 'Whey Protein Bar — Chocolate',
    description: '20g whey protein with 0g added sugar. Delicious dark chocolate crisp for quick fuel.',
    price: 80.00,
    emoji: '🍫',
    image: 'https://images.unsplash.com/photo-1622484212850-cab596d63c5d?w=600&auto=format&fit=crop&q=80',
    bg: '#FFF1F2',
    stock: 40,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.7,
    is_nearby: true,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_health_02',
    store_id: 'health-hub',
    category_id: 'essentials',
    name: 'Roasted Salted Almonds 100g',
    description: 'Slow-roasted California almonds lightly seasoned with mineral-rich pink Himalayan salt.',
    price: 140.00,
    emoji: '🥜',
    image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80',
    bg: '#FEF9EE',
    stock: 30,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.8,
    is_nearby: false,
    is_popular: true,
    is_restocked: false
  },
  {
    id: 'prod_health_03',
    store_id: 'health-hub',
    category_id: 'essentials',
    name: 'Greek Blueberry Probiotic Yogurt',
    description: 'Thick strained probiotic Greek yogurt made with real wild blueberry compote.',
    price: 55.00,
    emoji: '🫐',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    bg: '#F5F3FF',
    stock: 25,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.6,
    is_nearby: true,
    is_popular: false,
    is_restocked: true
  },
  {
    id: 'prod_health_04',
    store_id: 'health-hub',
    category_id: 'essentials',
    name: 'Hostel First-Aid Kit',
    description: 'Essential medical pouch containing antiseptic lotion, band-aids, burn cream & cotton gauze.',
    price: 249.00,
    emoji: '🩹',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80',
    bg: '#FFF1F2',
    stock: 20,
    availability: 'in-stock',
    delivery_available: false,
    pickup_available: true,
    rating: 4.9,
    is_nearby: true,
    is_popular: false,
    is_restocked: false
  }
];

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon PostgreSQL database.');

    await client.query('BEGIN');

    // 1. Clear existing products to ensure strictly 4 products per store
    console.log('Clearing old products in unimall_products...');
    await client.query('DELETE FROM public.unimall_products');

    // 2. Insert exactly the 24 curated test products
    console.log(`Inserting ${PRODUCTS_4_PER_STORE.length} curated products (4 per store)...`);
    const insertSql = `
      INSERT INTO public.unimall_products (
        id, store_id, category_id, name, description, price, emoji, image, bg,
        stock, availability, delivery_available, pickup_available, rating,
        is_nearby, is_popular, is_restocked, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true
      );
    `;

    for (const p of PRODUCTS_4_PER_STORE) {
      await client.query(insertSql, [
        p.id, p.store_id, p.category_id, p.name, p.description, p.price,
        p.emoji, p.image, p.bg, p.stock, p.availability,
        p.delivery_available, p.pickup_available, p.rating,
        p.is_nearby, p.is_popular, p.is_restocked
      ]);
    }

    await client.query('COMMIT');
    console.log('Successfully committed 4 products per store into Neon PostgreSQL!');

    // Verify per store count
    const counts = await client.query(`
      SELECT store_id, COUNT(*) as count 
      FROM public.unimall_products 
      GROUP BY store_id 
      ORDER BY store_id;
    `);
    console.log('Product counts per store in Neon:');
    console.table(counts.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed 4 products per store:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
