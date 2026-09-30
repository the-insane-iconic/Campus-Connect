"""
UniMall Backend — Seed Database (backend/seed.py)
Initializes tables and seeds initial campus stores, users, memberships, products, inventory, and orders.
"""

import json
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to sys.path so backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db import init_db, get_connection
from backend.auth import hash_password


def seed_database():
    print("Initializing database schema...")
    init_db()

    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()

    try:
        cursor.execute("DELETE FROM stores WHERE id LIKE 'store_%'")
        cursor.execute("DELETE FROM users WHERE email = 'cafe2@unimall.app'")
        conn.commit()
    except Exception:
        pass

    print("Seeding categories...")
    categories = [
        ('food', 'Food & Drinks', '☕', 1),
        ('stationery', 'Stationery', '📓', 2),
        ('electronics', 'Electronics', '🔌', 3),
        ('fashion', 'Fashion', '👕', 4),
        ('essentials', 'Essentials', '🧼', 5),
        ('services', 'Printing & Services', '🖨️', 6),
        ('more', 'More', '✨', 7),
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO categories (id, name, icon, sort_order, is_active) VALUES (?, ?, ?, ?, 1)",
        categories
    )

    print("Seeding users...")
    users = [
        (
            'usr_admin', 'UniMall Founder', 'admin@unimall.app', '+91 98765 43210',
            hash_password('admin123'), 'platform_admin', now_iso, now_iso
        ),
        (
            'usr_bakery', 'Rahul Sharma (Bakery)', 'bakery@unimall.app', '+91 98765 11111',
            hash_password('bakery123'), 'store_owner', now_iso, now_iso
        ),
        (
            'usr_stationery', 'Vikram Patel (Stationery)', 'stationery@unimall.app', '+91 98765 22222',
            hash_password('stationery123'), 'store_owner', now_iso, now_iso
        ),
        (
            'usr_tech', 'Ankit Verma (TechStop)', 'techstop@unimall.app', '+91 98765 33333',
            hash_password('tech123'), 'store_owner', now_iso, now_iso
        ),
        (
            'usr_mart', 'Sunil Gupta (Campus Mart)', 'mart@unimall.app', '+91 98765 44444',
            hash_password('mart123'), 'store_owner', now_iso, now_iso
        ),
        (
            'usr_student', 'Aarav Singh', 'aarav@student.univ.edu', '+91 98765 55555',
            hash_password('student123'), 'student', now_iso, now_iso
        )
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        users
    )

    print("Seeding stores...")
    default_hours = json.dumps({
        'monday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'tuesday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'wednesday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'thursday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'friday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'saturday': {'open': '09:00', 'close': '21:00', 'closed': False},
        'sunday': {'open': '10:00', 'close': '20:00', 'closed': False}
    })

    stores = [
        (
            'campus-cafe', 'Campus Bakery & Café', 'campus-cafe',
            'Fresh pastries, hot espresso, cold brews, and study snacks.',
            'Food & Drinks', 'Block A, Food Court', '+91 98765 01001',
            'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'store-bakery', 'Campus Bakery & Café', 'campus-bakery',
            'Fresh baked goods, hot snacks, sandwiches, teas, and cold beverages right near Hostel quad.',
            'Food & Drinks', 'Ground Floor, Student Activity Centre', '+91 98765 11111',
            'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'book-corner', 'Stationery Hub & Book Corner', 'book-corner',
            'Course textbooks, notebooks, graphing paper, and fine pens.',
            'Stationery', 'Block B, Academic Wing', '+91 98765 01002',
            'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'store-stationery', 'Stationery Hub & Book Corner', 'stationery-hub',
            'Official campus notebooks, engineering sheets, lab record manuals, art tools, and pens.',
            'Stationery', 'Ground Floor, Academic Block B', '+91 98765 22222',
            'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'techstop', 'TechStop Electronics', 'techstop',
            'Laptop chargers, true wireless earbuds, mice, and accessories.',
            'Electronics', 'Block C, Tech Hub', '+91 98765 01003',
            'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'campus-mart', 'Campus Mart & Groceries', 'campus-mart',
            'Late night essentials, ramen, beverages, and daily supplies.',
            'Essentials', 'Hostel Quadrangle', '+91 98765 01004',
            'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'campus-wear', 'Campus Wear & Style Square', 'campus-wear',
            'College hoodies, varsity jackets, caps, and casual joggers.',
            'Fashion', 'Student Activity Center', '+91 98765 01005',
            'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        ),
        (
            'health-hub', 'Health Hub & Care', 'health-hub',
            'Protein bars, electrolytes, first-aid kits, and sanitizers.',
            'Essentials', 'Near Campus Clinic', '+91 98765 01006',
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
            1, 1, 0, 1, default_hours, now_iso, now_iso
        )
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO stores (id, name, slug, description, category, location, phone, image_url, "
        "is_active, is_open, accepts_delivery, accepts_pickup, hours_json, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        stores
    )

    print("Seeding store memberships...")
    memberships = [
        ('mem_cafe_owner', 'usr_bakery', 'campus-cafe', 'owner', now_iso),
        ('mem_bakery_owner', 'usr_bakery', 'store-bakery', 'owner', now_iso),
        ('mem_book_owner', 'usr_stationery', 'book-corner', 'owner', now_iso),
        ('mem_stationery_owner', 'usr_stationery', 'store-stationery', 'owner', now_iso),
        ('mem_tech_owner', 'usr_tech', 'techstop', 'owner', now_iso),
        ('mem_mart_owner', 'usr_mart', 'campus-mart', 'owner', now_iso),
        ('mem_wear_owner', 'usr_admin', 'campus-wear', 'owner', now_iso),
        ('mem_health_owner', 'usr_admin', 'health-hub', 'owner', now_iso)
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO store_memberships (id, user_id, store_id, role, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        memberships
    )

    print("Seeding products & inventory...")
    products_and_stock = [
        # Campus Bakery
        ('p_bakery_01', 'store-bakery', 'Veg Puff', 'Crispy flaky pastry stuffed with seasoned vegetables.', 'food', 'BAK-PUFF-01', 35.0, 40.0, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80', 'pc', 42, 8),
        ('p_bakery_02', 'store-bakery', 'Cold Brew Coffee', 'Slow steeped 16-hour cold brew over ice.', 'food', 'BAK-COF-01', 90.0, 100.0, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80', 'cup', 18, 5),
        ('p_bakery_03', 'store-bakery', 'Paneer Tikka Roll', 'Grilled spiced paneer cubes wrapped in a soft roti.', 'food', 'BAK-ROL-01', 75.0, 85.0, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80', 'pc', 3, 5), # Low stock!
        ('p_bakery_04', 'store-bakery', 'Chocolate Brownie', 'Warm fudge brownie topped with dark chocolate ganache.', 'food', 'BAK-BRW-01', 50.0, 60.0, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop&q=80', 'pc', 0, 5), # Out of stock!
        ('p_bakery_05', 'store-bakery', 'Masala Chai', 'Traditional brewed tea infused with ginger and cardamom.', 'food', 'BAK-TEA-01', 20.0, None, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80', 'cup', 50, 10),

        # Stationery Hub
        ('p_stat_01', 'store-stationery', 'A4 Spiral Notebook (200 pgs)', 'Single-line ruled, high GSM smooth paper.', 'stationery', 'STA-NOT-01', 85.0, 95.0, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80', 'item', 35, 10),
        ('p_stat_02', 'store-stationery', 'Gel Pen Set (Pack of 5)', '0.5mm quick-dry water-resistant gel ink pens.', 'stationery', 'STA-PEN-01', 60.0, 70.0, 'https://images.unsplash.com/photo-1585336261026-7f41539229be?w=400&auto=format&fit=crop&q=80', 'pack', 25, 5),
        ('p_stat_03', 'store-stationery', 'Scientific Calculator FX-991ES', '417 functions, dual power solar and battery.', 'stationery', 'STA-CALC-01', 990.0, 1150.0, 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&auto=format&fit=crop&q=80', 'unit', 2, 4), # Low stock!

        # TechStop
        ('p_tech_01', 'techstop', '65W Fast Type-C Cable', 'Braided tangle-free 1.5m charging cable.', 'electronics', 'TEC-CAB-01', 249.0, 349.0, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80', 'unit', 15, 3),
        ('p_tech_02', 'techstop', 'Wireless Ergonomic Mouse', '2.4G silent click with adjustable DPI switch.', 'electronics', 'TEC-MOU-01', 499.0, 699.0, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80', 'unit', 8, 3),

        # Campus Mart
        ('p_mart_01', 'campus-mart', 'Maggi 2-Minute Noodles Pack', 'Classic masala noodles, pack of 4.', 'food', 'MRT-MAG-01', 56.0, 60.0, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80', 'pack', 30, 8),
        ('p_mart_02', 'campus-mart', 'Classic Salted Chips (Large)', 'Crispy potato chips in family size pack.', 'food', 'MRT-CHP-01', 40.0, None, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80', 'pack', 4, 10), # Low stock!
        ('p_mart_03', 'campus-mart', 'Mineral Water Bottle 1L', 'Purified natural mineral drinking water.', 'essentials', 'MRT-WAT-01', 20.0, None, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80', 'bottle', 60, 15)
    ]

    for p_id, s_id, name, desc, cat_id, sku, price, compare_price, img, unit, qty, threshold in products_and_stock:
        cursor.execute(
            "INSERT OR REPLACE INTO products (id, store_id, name, description, category_id, sku, price, "
            "compare_at_price, image_url, unit, is_active, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
            (p_id, s_id, name, desc, cat_id, sku, price, compare_price, img, unit, now_iso, now_iso)
        )
        inv_id = f"inv_{p_id}"
        cursor.execute(
            "INSERT OR REPLACE INTO inventory (id, product_id, store_id, quantity, low_stock_threshold, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (inv_id, p_id, s_id, qty, threshold, now_iso)
        )

    print("Seeding sample orders and order items...")
    orders = [
        (
            'UM10293', 'usr_student', 'Rahul Sharma', 'rahul.s@univ.edu', '+91 98765 88888',
            'PREPARING', 125.0, 15.0, 140.0, 'delivery', 'Hostel B, Room 214', 'paid', 'Ring bell upon arrival',
            (datetime.utcnow() - timedelta(minutes=35)).isoformat(), now_iso
        ),
        (
            'UM10294', 'usr_student', 'Priya Patel', 'priya.p@univ.edu', '+91 98765 99999',
            'PLACED', 70.0, 0.0, 70.0, 'pickup', 'Store counter pickup', 'paid', None,
            (datetime.utcnow() - timedelta(minutes=10)).isoformat(), now_iso
        ),
        (
            'UM10290', 'usr_student', 'Amit Kumar', 'amit.k@univ.edu', '+91 98765 77771',
            'COMPLETED', 145.0, 15.0, 160.0, 'delivery', 'Hostel A, Room 102', 'paid', None,
            (datetime.utcnow() - timedelta(hours=3)).isoformat(), now_iso
        )
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO orders (id, user_id, customer_name, customer_email, customer_phone, "
        "status, subtotal, delivery_fee, total, delivery_method, delivery_address, payment_status, notes, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        orders
    )

    order_items = [
        ('item_01', 'UM10293', 'p_bakery_01', 'store-bakery', 'Veg Puff', 35.0, 1, 'PREPARING', now_iso),
        ('item_02', 'UM10293', 'p_bakery_02', 'store-bakery', 'Cold Brew Coffee', 90.0, 1, 'PREPARING', now_iso),
        ('item_03', 'UM10294', 'p_bakery_01', 'store-bakery', 'Veg Puff', 35.0, 2, 'PENDING', now_iso),
        ('item_04', 'UM10290', 'p_stat_01', 'store-stationery', 'A4 Spiral Notebook (200 pgs)', 85.0, 1, 'COMPLETED', now_iso),
        ('item_05', 'UM10290', 'p_stat_02', 'store-stationery', 'Gel Pen Set (Pack of 5)', 60.0, 1, 'COMPLETED', now_iso)
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO order_items (id, order_id, product_id, store_id, product_name_snapshot, "
        "price_snapshot, quantity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        order_items
    )

    print("Seeding customer product requests...")
    requests = [
        ('req_01', 'store-bakery', 'Red Bull Energy Drink', 7, 'considering', now_iso, now_iso),
        ('req_02', 'store-bakery', 'Diet Coke Cans', 4, 'available', now_iso, now_iso),
        ('req_03', 'store-stationery', 'Drawing Drafting Sheet Tube', 5, 'considering', now_iso, now_iso)
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO product_requests (id, store_id, product_name, request_count, status, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        requests
    )

    conn.commit()
    conn.close()
    print("Database seeding successfully completed!")


if __name__ == '__main__':
    seed_database()
