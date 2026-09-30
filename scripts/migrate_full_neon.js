/**
 * UniMall — Complete Neon PostgreSQL Schema & Unified Seed (scripts/migrate_full_neon.js)
 * Populates all tables with consistent store IDs and catalog.
 */

const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  try {
    await client.query('BEGIN');

    // 1. Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );
    `);

    // 2. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'store_owner', 'platform_admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Store Memberships
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.store_memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        store_id TEXT NOT NULL REFERENCES public.unimall_stores(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'manager', 'staff', 'admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, store_id)
      );
    `);

    // 4. Audit logs & Product requests & User Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        store_id TEXT REFERENCES public.unimall_stores(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metadata_json TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.product_requests (
        id TEXT PRIMARY KEY,
        store_id TEXT REFERENCES public.unimall_stores(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'considering',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── INSERT CATEGORIES ────────────────────────────────────
    console.log('Seeding categories...');
    await client.query(`
      INSERT INTO public.categories (id, name, icon, sort_order)
      VALUES
      ('food', 'Food & Drinks', '☕', 1),
      ('stationery', 'Stationery & Books', '📚', 2),
      ('electronics', 'Electronics', '⚡', 3),
      ('fashion', 'Fashion & Apparel', '👕', 4),
      ('essentials', 'Daily Essentials', '🛒', 5),
      ('services', 'Services & Print', '🖨️', 6)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;
    `);

    // ─── INSERT UNIFIED 6 STORES ──────────────────────────────
    console.log('Seeding stores into public.unimall_stores...');
    await client.query(`
      INSERT INTO public.unimall_stores (id, name, slug, description, category, location, floor, phone, cover_image, is_open, delivery_available, pickup_available, opening_time, closing_time, rating, popularity)
      VALUES
      ('campus-cafe', 'Campus Bakery & Café', 'campus-cafe', 'Fresh pastries, hot espresso, cold brews, and study snacks.', 'food', 'Block A, Food Court', 'Ground Floor', '+91 98765 01001', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', true, false, true, '7:30 AM', '10:00 PM', 4.7, 95),
      ('book-corner', 'Stationery Hub & Book Corner', 'book-corner', 'Course textbooks, notebooks, graphing paper, and fine pens.', 'stationery', 'Block B, Academic Wing', 'First Floor', '+91 98765 01002', 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800', true, false, true, '9:00 AM', '8:30 PM', 4.6, 92),
      ('techstop', 'TechStop Electronics', 'techstop', 'Laptop chargers, true wireless earbuds, mice, and accessories.', 'electronics', 'Block C, Tech Hub', 'Ground Floor', '+91 98765 01003', 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800', true, false, true, '10:00 AM', '9:00 PM', 4.5, 88),
      ('campus-mart', 'Campus Mart & Groceries', 'campus-mart', 'Late night essentials, ramen, beverages, and daily supplies.', 'essentials', 'Hostel Quadrangle', 'Ground Floor', '+91 98765 01004', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800', true, false, true, '8:00 AM', '11:00 PM', 4.3, 85),
      ('campus-wear', 'Campus Wear & Style Square', 'campus-wear', 'College hoodies, varsity jackets, caps, and casual joggers.', 'fashion', 'Student Activity Center', 'First Floor', '+91 98765 01005', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', true, false, true, '11:00 AM', '8:00 PM', 4.6, 80),
      ('health-hub', 'Health Hub & Care', 'health-hub', 'Protein bars, electrolytes, first-aid kits, and sanitizers.', 'essentials', 'Near Campus Clinic', 'Ground Floor', '+91 98765 01006', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800', true, false, true, '8:00 AM', '9:00 PM', 4.5, 78)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        location = EXCLUDED.location,
        floor = EXCLUDED.floor,
        phone = EXCLUDED.phone,
        cover_image = EXCLUDED.cover_image,
        opening_time = EXCLUDED.opening_time,
        closing_time = EXCLUDED.closing_time,
        rating = EXCLUDED.rating,
        popularity = EXCLUDED.popularity;
    `);

    // ─── INSERT USERS & MEMBERSHIPS ───────────────────────────
    console.log('Seeding users and store memberships...');
    await client.query(`
      INSERT INTO public.users (id, name, email, phone, password_hash, role)
      VALUES
      ('usr-founder', 'UniMall Founder', 'founder@unimall.edu', '+91 98765 00001', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'platform_admin'),
      ('usr-bakery',  'Priya Sharma',    'bakery@unimall.edu',  '+91 98765 00002', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'store_owner'),
      ('usr-books',   'Rajesh Verma',    'books@unimall.edu',   '+91 98765 00003', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'store_owner'),
      ('usr-tech',    'Karan Patel',     'tech@unimall.edu',    '+91 98765 00004', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'store_owner'),
      ('usr-mart',    'Anita Roy',       'mart@unimall.edu',    '+91 98765 00005', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'store_owner'),
      ('usr-wear',    'Siddharth Nair',  'wear@unimall.edu',    '+91 98765 00006', 'pbkdf2:sha256:100000$unimallsalt$6df0b9c3fbf285f1da457dfb8929b9f5480749dd43e6da80f339cf9e52516757', 'store_owner')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role;

      INSERT INTO public.store_memberships (id, user_id, store_id, role)
      VALUES
      ('mem-bakery', 'usr-bakery', 'campus-cafe', 'owner'),
      ('mem-books',  'usr-books',  'book-corner', 'owner'),
      ('mem-tech',   'usr-tech',   'techstop',    'owner'),
      ('mem-mart',   'usr-mart',   'campus-mart', 'owner'),
      ('mem-wear',   'usr-wear',   'campus-wear', 'owner')
      ON CONFLICT (user_id, store_id) DO UPDATE SET role = EXCLUDED.role;
    `);

    await client.query('COMMIT');
    console.log('ALL NEON USERS, MEMBERSHIPS, CATEGORIES & AUDIT TABLES INITIALIZED SUCCESSFULLY!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
