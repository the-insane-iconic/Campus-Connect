/**
 * UniMall — Neon PostgreSQL Migration Script (scripts/migrate_to_neon.js)
 * Migrates local schema, unified 6 stores, and all catalog products to Neon.
 */

const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  try {
    await client.query('BEGIN');

    // 1. Create unimall_stores
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        category TEXT,
        floor TEXT DEFAULT 'Ground Floor',
        location TEXT DEFAULT 'Main Campus Block',
        phone TEXT DEFAULT '+91 98765 43210',
        cover_image TEXT,
        is_open BOOLEAN DEFAULT true,
        opening_time TEXT DEFAULT '8:00 AM',
        closing_time TEXT DEFAULT '10:00 PM',
        delivery_available BOOLEAN DEFAULT false,
        pickup_available BOOLEAN DEFAULT true,
        rating NUMERIC(3, 2) DEFAULT 4.5,
        popularity INTEGER DEFAULT 80,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Create unimall_products
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_products (
        id TEXT PRIMARY KEY,
        store_id TEXT REFERENCES public.unimall_stores(id) ON DELETE CASCADE,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        emoji TEXT DEFAULT '📦',
        image TEXT,
        bg TEXT DEFAULT '#F8FAFC',
        stock INTEGER DEFAULT 20,
        availability TEXT DEFAULT 'in-stock',
        delivery_available BOOLEAN DEFAULT false,
        pickup_available BOOLEAN DEFAULT true,
        rating NUMERIC(3, 2) DEFAULT 4.5,
        is_nearby BOOLEAN DEFAULT false,
        is_popular BOOLEAN DEFAULT false,
        is_restocked BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Create unimall_orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT,
        user_phone TEXT,
        user_hostel TEXT DEFAULT 'Campus Counter',
        user_room TEXT DEFAULT 'Ground Floor',
        store_id TEXT REFERENCES public.unimall_stores(id),
        status TEXT DEFAULT 'PLACED',
        fulfillment_type TEXT DEFAULT 'pickup',
        subtotal NUMERIC(10, 2) NOT NULL,
        delivery_fee NUMERIC(10, 2) DEFAULT 0,
        total NUMERIC(10, 2) NOT NULL,
        payment_method TEXT DEFAULT 'razorpay',
        payment_status TEXT DEFAULT 'PAID',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Create unimall_order_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_order_items (
        id BIGSERIAL PRIMARY KEY,
        order_id TEXT REFERENCES public.unimall_orders(id) ON DELETE CASCADE,
        product_id TEXT,
        product_name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        emoji TEXT,
        image TEXT
      );
    `);

    // 5. Create unimall_order_status_history
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_order_status_history (
        id BIGSERIAL PRIMARY KEY,
        order_id TEXT REFERENCES public.unimall_orders(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Create unimall_admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'store_owner',
        store_id TEXT REFERENCES public.unimall_stores(id),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Create unimall_inventory
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_inventory (
        id BIGSERIAL PRIMARY KEY,
        product_id TEXT UNIQUE REFERENCES public.unimall_products(id) ON DELETE CASCADE,
        store_id TEXT REFERENCES public.unimall_stores(id) ON DELETE CASCADE,
        stock_count INTEGER NOT NULL DEFAULT 10,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Create unimall_demand_requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.unimall_demand_requests (
        id BIGSERIAL PRIMARY KEY,
        student_name TEXT,
        student_phone TEXT,
        product_name TEXT NOT NULL,
        category TEXT,
        preferred_store TEXT,
        votes_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create convenient alias views for backend compatibility
    await client.query(`
      CREATE OR REPLACE VIEW stores AS SELECT * FROM public.unimall_stores;
      CREATE OR REPLACE VIEW products AS SELECT * FROM public.unimall_products;
      CREATE OR REPLACE VIEW orders AS SELECT * FROM public.unimall_orders;
      CREATE OR REPLACE VIEW order_items AS SELECT * FROM public.unimall_order_items;
    `);

    // ─── SEED UNIFIED 6 STORES ───────────────────────────────
    console.log('Seeding unified 6 stores...');
    await client.query(`
      INSERT INTO public.unimall_stores (id, name, slug, description, category, floor, location, phone, cover_image, is_open, opening_time, closing_time, rating, popularity, delivery_available, pickup_available)
      VALUES
      ('campus-cafe', 'Campus Bakery & Café', 'campus-cafe', 'Fresh pastries, hot espresso, cold brews, and study snacks.', 'food', 'Ground Floor', 'Block A, Food Court', '+91 98765 01001', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80', true, '7:30 AM', '10:00 PM', 4.7, 95, false, true),
      ('book-corner', 'Stationery Hub & Book Corner', 'book-corner', 'Course textbooks, notebooks, graphing paper, and fine pens.', 'stationery', 'First Floor', 'Block B, Academic Wing', '+91 98765 01002', 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80', true, '9:00 AM', '8:30 PM', 4.6, 92, false, true),
      ('techstop', 'TechStop Electronics', 'techstop', 'Laptop chargers, true wireless earbuds, mice, and accessories.', 'electronics', 'Ground Floor', 'Block C, Tech Hub', '+91 98765 01003', 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80', true, '10:00 AM', '9:00 PM', 4.5, 88, false, true),
      ('campus-mart', 'Campus Mart & Groceries', 'campus-mart', 'Late night essentials, ramen, beverages, and daily supplies.', 'essentials', 'Ground Floor', 'Hostel Quadrangle', '+91 98765 01004', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80', true, '8:00 AM', '11:00 PM', 4.3, 85, false, true),
      ('campus-wear', 'Campus Wear & Style Square', 'campus-wear', 'College hoodies, varsity jackets, caps, and casual joggers.', 'fashion', 'First Floor', 'Student Activity Center', '+91 98765 01005', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80', true, '11:00 AM', '8:00 PM', 4.6, 80, false, true),
      ('health-hub', 'Health Hub & Care', 'health-hub', 'Protein bars, electrolytes, first-aid kits, and sanitizers.', 'essentials', 'Ground Floor', 'Near Campus Clinic', '+91 98765 01006', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80', true, '8:00 AM', '9:00 PM', 4.5, 78, false, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        floor = EXCLUDED.floor,
        location = EXCLUDED.location,
        phone = EXCLUDED.phone,
        cover_image = EXCLUDED.cover_image,
        opening_time = EXCLUDED.opening_time,
        closing_time = EXCLUDED.closing_time,
        rating = EXCLUDED.rating,
        popularity = EXCLUDED.popularity,
        delivery_available = EXCLUDED.delivery_available,
        pickup_available = EXCLUDED.pickup_available;
    `);

    // ─── SEED ADMIN ACCOUNTS ─────────────────────────────────
    console.log('Seeding store admin & founder accounts...');
    await client.query(`
      INSERT INTO public.unimall_admins (id, email, name, role, store_id, password_hash)
      VALUES
      ('adm-founder', 'founder@unimall.edu', 'UniMall Founder', 'platform_admin', NULL, 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757'),
      ('adm-bakery',  'bakery@unimall.edu',  'Priya Sharma',     'store_owner',    'campus-cafe', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757'),
      ('adm-books',   'books@unimall.edu',   'Rajesh Verma',     'store_owner',    'book-corner', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757'),
      ('adm-tech',    'tech@unimall.edu',    'Karan Patel',      'store_owner',    'techstop',    'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757'),
      ('adm-mart',    'mart@unimall.edu',    'Anita Roy',        'store_owner',    'campus-mart', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757'),
      ('adm-wear',    'wear@unimall.edu',    'Siddharth Nair',   'store_owner',    'campus-wear', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        store_id = EXCLUDED.store_id;
    `);

    // ─── SEED PRODUCTS ───────────────────────────────────────
    console.log('Seeding products catalog...');
    await client.query(`
      INSERT INTO public.unimall_products (id, store_id, category_id, name, description, price, emoji, image, bg, stock, availability, delivery_available, pickup_available, rating, is_nearby, is_popular, is_restocked)
      VALUES
      ('p01', 'campus-cafe', 'food', 'Cold Brew Coffee', 'Smooth, slow-steeped cold brew with a bold flavour. Served over ice.', 120.00, '☕', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 18, 'in-stock', false, true, 4.7, true, false, false),
      ('p02', 'campus-cafe', 'food', 'Instant Coffee Sachets ×10', 'Pack of 10 individual instant coffee sachets. Convenient for late-night study sessions.', 90.00, '☕', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 24, 'in-stock', false, true, 4.2, false, false, true),
      ('p03', 'campus-mart', 'food', 'Classic Chips Snack Pack', 'Salted potato chips in the iconic classic flavour. Great for quick snacking.', 30.00, '🥔', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 50, 'in-stock', false, true, 4.4, false, true, false),
      ('p04', 'health-hub', 'food', 'Protein Bar — Chocolate', '20g of whey protein per bar. Great post-workout or as a filling snack between classes.', 80.00, '🍫', 'https://images.unsplash.com/photo-1622484212850-cab596d63c5d?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 15, 'in-stock', false, true, 4.3, false, true, false),
      ('p06', 'campus-mart', 'food', 'Instant Noodles Cup', 'Ready-in-3-minutes instant noodles. A late-night hostel staple.', 45.00, '🍜', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80', '#FFF7ED', 32, 'in-stock', false, true, 4.1, false, false, true),
      ('p15', 'campus-cafe', 'food', 'Masala Chai Flask (500ml)', 'Steaming hot spiced cardamom & ginger tea. Perfect fuel for group discussions.', 70.00, '☕', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 25, 'in-stock', false, true, 4.8, true, true, false),
      ('p16', 'campus-cafe', 'food', 'Butter Croissant', 'Flaky, buttery baked croissant delivered fresh from the campus bakery daily.', 85.00, '🥐', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', '#FFF7ED', 12, 'low-stock', false, true, 4.6, false, true, false),
      ('p17', 'campus-cafe', 'food', 'Grilled Veg Club Sandwich', 'Triple-decker toasted sandwich with cheese, veggies, and house herb mayo.', 110.00, '🥪', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 20, 'in-stock', false, true, 4.5, true, false, false),
      ('p18', 'campus-cafe', 'food', 'Dark Choco Chip Muffin', 'Moist dark chocolate muffin loaded with rich chocolate chunks.', 65.00, '🧁', 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 16, 'in-stock', false, true, 4.7, false, true, true),
      ('p19', 'campus-mart', 'food', 'Energy Drink 350ml', 'Refreshing carbonated energy booster with taurine and B-vitamins.', 125.00, '⚡', 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 30, 'in-stock', false, true, 4.3, true, false, false),
      ('p20', 'health-hub', 'food', 'Roasted Salted Almonds 100g', 'Slow-roasted California almonds lightly seasoned with Himalayan pink salt.', 140.00, '🥜', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400&auto=format&fit=crop&q=80', '#FEF9EE', 22, 'in-stock', false, true, 4.6, false, false, false),
      ('p21', 'health-hub', 'food', 'Greek Blueberry Yogurt', 'Thick, creamy probiotic Greek yogurt topped with real blueberry puree.', 55.00, '🫐', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 14, 'in-stock', false, true, 4.4, false, false, true),
      ('p22', 'health-hub', 'food', 'Fresh Cut Fruit Bowl', 'Assortment of seasonal fruits freshly prepared and sealed for hygiene.', 75.00, '🍉', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 10, 'low-stock', false, true, 4.5, true, false, false),
      ('p23', 'campus-mart', 'food', 'Cheese Nachos & Salsa', 'Crispy corn tortilla chips accompanied by tangy Mexican salsa dip.', 95.00, '🧀', 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 28, 'in-stock', false, true, 4.2, false, true, false),
      ('p24', 'campus-cafe', 'food', 'Oatmeal & Raisin Cookies', 'Handmade chewy oatmeal cookies packed with plump golden raisins.', 60.00, '🍪', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80', '#FFF7ED', 18, 'in-stock', false, true, 4.4, false, false, true),

      ('p07', 'book-corner', 'stationery', 'A4 Spiral Notebook', '200 pages, 70 GSM ruled paper. Smooth writing, durable spiral binding.', 65.00, '📓', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 42, 'in-stock', false, true, 4.5, true, false, false),
      ('p08', 'book-corner', 'stationery', 'Ballpoint Pen 10-pack', 'Smooth-writing blue ballpoint pens. Pack of 10. Reliable for every exam.', 35.00, '🖊️', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 60, 'in-stock', false, true, 4.2, true, false, false),
      ('p09', 'book-corner', 'stationery', 'Gel Ink Pen Black', 'Fine-tip 0.5mm black gel pen. Smear-resistant ink, comfortable grip.', 15.00, '🖊️', 'https://images.unsplash.com/photo-1585336261026-7f050b1f3c30?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 90, 'in-stock', false, true, 4.6, false, true, false),
      ('p10', 'book-corner', 'stationery', 'Whiteboard Markers 4-pack', 'Assorted colour whiteboard markers. Quick-dry, low-odour, easy to erase.', 120.00, '🖊️', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 18, 'in-stock', false, true, 4.3, false, false, true),
      ('p26', 'book-corner', 'stationery', 'Pastel Sticky Notes 5-pack', 'Soft pastel sticky reminder pads (400 sheets). Strong adhesive, no residue.', 85.00, '📝', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', '#FEF9EE', 35, 'in-stock', false, true, 4.7, true, true, false),
      ('p27', 'book-corner', 'stationery', 'Highlighters Pastel 6-pack', 'Chisel tip aesthetic pastel highlighter set. Does not bleed through textbook pages.', 160.00, '🖍️', 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 24, 'in-stock', false, true, 4.8, false, true, false),
      ('p28', 'techstop', 'stationery', 'Scientific Calculator FX-991', '552 functions advanced natural display scientific calculator. Exam approved.', 890.00, '🔢', 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e485?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 8, 'low-stock', false, true, 4.9, false, true, false),
      ('p29', 'book-corner', 'stationery', 'Mathematical Geometry Set', 'Precision compass, divider, protractor, set squares and metal tin case.', 110.00, '📐', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 30, 'in-stock', false, true, 4.3, false, false, true),
      ('p30', 'book-corner', 'stationery', 'Engineering Graph Pad', '100 sheets mm-grid millimeter graph sheets with perforated tear off.', 75.00, '📈', 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 45, 'in-stock', false, true, 4.4, true, false, false),
      ('p31', 'book-corner', 'stationery', 'Hardcover Executive Journal', 'Faux leather bound dot-grid journal with ribbon bookmark and elastic band.', 220.00, '📖', 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 15, 'in-stock', false, true, 4.7, false, true, false),
      ('p32', 'book-corner', 'stationery', 'Correction Tape Pen 2-pack', 'Instant-dry white tear-proof film correction tape. No drying time needed.', 65.00, '✏️', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 50, 'in-stock', false, true, 4.1, false, false, true),
      ('p33', 'book-corner', 'stationery', 'Expanding File Folder 12-pocket', '12 multi-colored tabbed pockets with secure buckle closure for lecture notes.', 180.00, '📁', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 20, 'in-stock', false, true, 4.5, true, false, false),

      ('p11', 'techstop', 'electronics', 'Wireless Earbuds', 'True wireless earbuds with 6-hour battery and passive noise isolation. Compatible with all devices.', 999.00, '🎧', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 2, 'low-stock', false, true, 4.4, true, false, false),
      ('p12', 'techstop', 'electronics', 'USB-C Fast Charger 25W', '25W USB-C PD charger with cable. Compatible with phones and tablets.', 349.00, '🔌', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 1, 'low-stock', false, true, 4.5, false, true, false),
      ('p36', 'techstop', 'electronics', 'Power Bank 10,000mAh 22.5W', 'Compact pocket power bank with twin USB outputs and fast Type-C PD input.', 899.00, '🔋', 'https://images.unsplash.com/photo-1609592807758-29987c69ec6d?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 14, 'in-stock', false, true, 4.7, true, true, false),
      ('p37', 'techstop', 'electronics', 'Wireless Silent Mouse', 'Quiet click 2.4GHz wireless mouse with nano receiver and ergonomic contour.', 499.00, '🖱️', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 19, 'in-stock', false, true, 4.6, false, true, false),
      ('p38', 'techstop', 'electronics', 'Waterproof Laptop Sleeve 14"', 'Padded fleece interior with water-resistant polyester outer and accessory pouch.', 449.00, '💻', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 22, 'in-stock', false, true, 4.5, true, false, false),
      ('p39', 'techstop', 'electronics', 'Braided 3-in-1 Cable', 'Durable nylon braided 1.2m cable with Type-C, Lightning, and Micro-USB heads.', 249.00, '🔌', 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 35, 'in-stock', false, true, 4.3, false, false, true),
      ('p40', 'techstop', 'electronics', '4-Port High Speed USB Hub', 'USB 3.0 ultra-slim aluminum hub with 5Gbps transfer speed and LED indicator.', 399.00, '🔌', 'https://images.unsplash.com/photo-1625948515291-696130d4655d?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 11, 'in-stock', false, true, 4.4, false, false, false),
      ('p41', 'techstop', 'electronics', 'Portable Bluetooth Speaker Mini', 'IPX5 splashproof outdoor wireless speaker with deep bass and 8h battery.', 799.00, '🔊', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&auto=format&fit=crop&q=80', '#FEF9EE', 6, 'low-stock', false, true, 4.6, true, true, false),
      ('p42', 'techstop', 'electronics', 'Ergonomic Foam Mousepad', 'Cushioned wrist rest mouse pad with non-slip PU base for long study hours.', 199.00, '🖱️', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 28, 'in-stock', false, true, 4.4, false, false, true),
      ('p43', 'techstop', 'electronics', 'Screen Cleaning Spray + Cloth', 'Non-toxic, ammonia-free mist with plush microfiber cloth for laptops and tablets.', 129.00, '🧼', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 40, 'in-stock', false, true, 4.5, true, false, false),
      ('p44', 'techstop', 'electronics', 'Foldable Phone & Tablet Stand', 'Adjustable dual-axis aluminum desktop holder for hands-free video lectures.', 249.00, '📱', 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&auto=format&fit=crop&q=80', '#FFF7ED', 25, 'in-stock', false, true, 4.7, false, true, false),

      ('p13', 'campus-wear', 'fashion', 'Oversized Hoodie — Navy', 'Soft cotton-blend oversized hoodie in navy blue. Unisex sizing. Machine washable.', 649.00, '🧥', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 3, 'low-stock', false, true, 4.8, false, true, false),
      ('p47', 'campus-wear', 'fashion', 'Campus Varsity Jacket', 'Premium wool-blend collegiate letterman jacket with ribbed cuffs and snap buttons.', 1299.00, '🧥', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 5, 'low-stock', false, true, 4.9, true, true, false),
      ('p48', 'campus-wear', 'fashion', 'Cotton Crewneck Tee', '100% bio-washed breathable cotton t-shirt with subtle UniMall chest embroidery.', 449.00, '👕', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 30, 'in-stock', false, true, 4.6, false, true, false),
      ('p49', 'campus-wear', 'fashion', 'Eco Canvas Tote Bag', 'Heavy-duty 14oz unbleached cotton tote bag with sturdy reinforced shoulder straps.', 249.00, '👜', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80', '#FEF9EE', 40, 'in-stock', false, true, 4.5, true, false, true),
      ('p50', 'campus-wear', 'fashion', 'Classic Cotton Baseball Cap', 'Adjustable metal clasp strapback cap with curved brim and breathable eyelets.', 299.00, '🧢', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 22, 'in-stock', false, true, 4.4, false, false, false),
      ('p51', 'campus-wear', 'fashion', 'Comfort Fleece Joggers', 'Relaxed fit tapered sweatpants with drawstring waistband and zippered side pockets.', 699.00, '👖', 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 14, 'in-stock', false, true, 4.7, false, true, false),
      ('p52', 'campus-wear', 'fashion', 'Low-Top Canvas Sneakers', 'Timeless campus vulcanized rubber sole sneakers with cushioned insole.', 999.00, '👟', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 9, 'low-stock', false, true, 4.5, true, false, false),
      ('p53', 'campus-wear', 'fashion', 'Sport Ankle Socks (3-Pack)', 'Moisture-wicking combed cotton ankle socks with arch support compression.', 199.00, '🧦', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 50, 'in-stock', false, true, 4.3, false, false, true),
      ('p54', 'campus-wear', 'fashion', 'Polarized Matte Sunglasses', 'UV400 protection lightweight wayfarer sunglasses with glare reduction lenses.', 399.00, '🕶️', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 18, 'in-stock', false, true, 4.6, false, true, false),
      ('p55', 'campus-wear', 'fashion', 'Ribbed Knit Beanie', 'Warm acrylic knit cuff beanie. Stretchy fit suitable for chilly campus mornings.', 249.00, '🧶', 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 25, 'in-stock', false, true, 4.2, true, false, false),
      ('p56', 'campus-wear', 'fashion', 'Campus Backpack 25L', 'Ergonomic water-repellent student backpack with padded 15.6" laptop compartment.', 1199.00, '🎒', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 12, 'in-stock', false, true, 4.8, false, true, true),

      ('p05', 'campus-mart', 'essentials', 'Mineral Water 1 L', 'Natural mineral water, 1 litre bottle. Essential hydration for long days on campus.', 20.00, '💧', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 80, 'in-stock', false, true, 4.0, true, false, false),
      ('p14', 'campus-mart', 'essentials', 'Compact Umbrella', 'Lightweight folding umbrella that fits in any bag. UV protection & wind-resistant frame.', 199.00, '☂️', 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 10, 'in-stock', false, true, 4.1, false, false, true),
      ('p58', 'campus-mart', 'essentials', 'Insulated Bottle 750ml', 'Double-wall stainless steel vacuum flask. Keeps beverages cold 24h or hot 12h.', 399.00, '🍶', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 26, 'in-stock', false, true, 4.7, true, true, false),
      ('p59', 'health-hub', 'essentials', 'Quick-Dry Microfiber Towel', 'Ultra-absorbent antibacterial compact towel for gym, pool, and hostel life.', 199.00, '🧖', 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&auto=format&fit=crop&q=80', '#ECFDF5', 32, 'in-stock', false, true, 4.4, false, false, true),
      ('p60', 'health-hub', 'essentials', 'Hand Sanitizer 100ml', '70% isopropyl alcohol rinse-free sanitizing gel with aloe vera moisturizer.', 50.00, '🧴', 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 75, 'in-stock', false, true, 4.6, true, false, false),
      ('p61', 'campus-mart', 'essentials', 'Pocket Tissues (Pack of 6)', '3-ply ultra-soft facial pocket tissues, travel-sized convenience.', 40.00, '🧻', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80', '#FFF7ED', 90, 'in-stock', false, true, 4.2, false, false, false),
      ('p62', 'campus-mart', 'essentials', 'Bento Lunch Box 3-Grid', 'BPA-free leakproof lunch container with cutlery set. Microwave safe.', 349.00, '🍱', 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=400&auto=format&fit=crop&q=80', '#FEF9EE', 16, 'in-stock', false, true, 4.5, false, true, false),
      ('p63', 'health-hub', 'essentials', 'Hostel First-Aid Kit', 'Compact medical pouch with antiseptic wipes, bandages, pain relief, and burn gel.', 249.00, '🩹', 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=80', '#FFF1F2', 14, 'in-stock', false, true, 4.8, true, false, false),
      ('p64', 'campus-mart', 'essentials', 'Mosquito Repellent Device', 'Plug-in mosquito repellent vaporizer with 45-night refill liquid.', 99.00, '🦟', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80', '#F0FDF4', 45, 'in-stock', false, true, 4.3, false, false, true),
      ('p65', 'campus-mart', 'essentials', 'Bedside Caddy Organizer', 'Felt bedside hanging storage pocket for water bottle, phone, books, and glasses.', 299.00, '🧺', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&auto=format&fit=crop&q=80', '#F5F3FF', 18, 'in-stock', false, true, 4.6, true, true, false),
      ('p66', 'health-hub', 'essentials', 'Disinfecting Wipes 40-pk', 'Multi-surface sanitizing wipes killing 99.9% of germs for study desk and phone.', 110.00, '🧽', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80', '#EFF6FF', 38, 'in-stock', false, true, 4.4, false, false, false),
      ('p67', 'techstop', 'essentials', 'LED Study Desk Torch', 'USB rechargeable emergency reading lamp with flexible neck and clip base.', 220.00, '🔦', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80', '#FEF9EB', 20, 'in-stock', false, true, 4.5, false, true, true)
      ON CONFLICT (id) DO UPDATE SET
        store_id = EXCLUDED.store_id,
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        image = EXCLUDED.image,
        delivery_available = EXCLUDED.delivery_available,
        pickup_available = EXCLUDED.pickup_available;
    `);

    // ─── SEED INVENTORY ──────────────────────────────────────
    console.log('Seeding inventory table...');
    await client.query(`
      INSERT INTO public.unimall_inventory (product_id, store_id, stock_count, low_stock_threshold)
      SELECT id, store_id, stock, 5 FROM public.unimall_products
      ON CONFLICT (product_id) DO UPDATE SET
        stock_count = EXCLUDED.stock_count,
        store_id = EXCLUDED.store_id;
    `);

    await client.query('COMMIT');
    console.log('Migration committed successfully to Neon PostgreSQL!');

    // Verify row counts
    const storesCount = await client.query('SELECT count(*) FROM public.unimall_stores;');
    const prodsCount = await client.query('SELECT count(*) FROM public.unimall_products;');
    const adminsCount = await client.query('SELECT count(*) FROM public.unimall_admins;');
    const invCount = await client.query('SELECT count(*) FROM public.unimall_inventory;');

    console.log('--- NEON DATABASE SUMMARY ---');
    console.log(`Stores:     ${storesCount.rows[0].count}`);
    console.log(`Products:   ${prodsCount.rows[0].count}`);
    console.log(`Admins:     ${adminsCount.rows[0].count}`);
    console.log(`Inventory:  ${invCount.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
