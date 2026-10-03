# 🏫 Campus Connect / UniMall — AI Handoff Document (Updated)
> Last Updated: 2026-10-04 | Session 2 complete

---

## 📁 Project Location
```
/Users/ansh/Documents/Github/Campus-Connect
```
Dev server: `python3 -m http.server 3000` → `http://localhost:3000`

---

## 🏗️ Architecture Overview

### Two Database Systems
| System | Used By | Tables |
|--------|---------|--------|
| **Neon PostgreSQL** (cloud, primary) | Frontend JS via `UniMallDB.neonSql()` | `unimall_stores`, `unimall_products`, `unimall_orders`, `unimall_order_items`, `users`, `unimall_admins`, `unimall_reviews` |
| **SQLite** (local fallback) | Python Flask backend (`backend/app.py`) | `stores`, `products`, `orders`, `order_items`, `inventory`, `store_memberships` |

**Primary live system = Neon PostgreSQL** queried directly from the browser JS.

### Connection Config (in js/config.js → window.UNIMALL_CONFIG)
- Neon SQL endpoint: `https://ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/sql`
- Neon connection string is embedded in `js/config.js` `neonSql()` function

---

## ✅ ALL COMPLETED WORK

### Session 1
- Cart + Checkout multi-step flow (Empty → Browse → Review → Checkout → Confirm)
- Profile system — real DB data, edit saves to Neon
- Orders UI redesign — real DB data only
- Home screen redesign — unimbag.png banner, deals, spotlight sections
- Bug fix: `backend/app.py` `/api/public/orders` — removed hardcoded `user_id = 'usr_student'`

### Session 2 (just completed)
- `js/store.js` — STORE_PRODUCTS fallback: offline products now tagged `db_fallback=true`, shown as "Check in store" — never shows stale in-stock availability
- `js/store.js` — Product grid handles `check-store` availability correctly
- `js/store.js` — Reviews: replaced all fake hardcoded reviews (Arjun Verma, Priya Nair, etc.) with real async Neon DB fetch + clean empty state "No reviews yet" when no reviews exist
- `js/store.js` — All `reviewCount` values set to `0` (were hardcoded 142, 110, 96, etc.)
- `index.html` — "6 STORES" badge given `id="stores-count-badge"`
- `js/app.js` — Added `_updateStoresBadge()` helper — badge now reads live count from `window.STORES` after catalog sync
- `js/config.js` — DB migration now adds `users.updated_at`, and creates `unimall_reviews` table (with UNIQUE constraint per user+store)

---

## 🔴 Remaining Issues

### HIGH

**1. Admin platform audit (`/admin/js/app.js`)**
- Open in editor but never audited
- Check for: hardcoded analytics figures, hardcoded store IDs in filters, merchant login flow connecting to correct `unimall_admins` table

### MEDIUM

**2. `STORE_CATALOG` in `store.js` — hardcoded phone numbers**
- e.g. `phone: '+91 98765 01001'` for campus-cafe
- These only show if DB store has no phone. The DB `unimall_stores` table should have real phone numbers seeded for each store.
- Fix: Add real phone data to each store row in Neon, or add `phone` to store info in the merchant dashboard.

**3. `CAMPUS_INFO.mallHours` hardcoded**
- `mallHours: '8:00 AM – 10:00 PM'` in `data.js` line ~667
- Should derive from store hours in a `unimall_config` table or from the earliest opening / latest closing store.

### LOW

**4. Review submission UI (write a review)**
- `unimall_reviews` table exists in DB now
- There is NO UI yet to submit a review from the student app
- Add a "Write a Review" button + form in the store Reviews tab in `store.js`

**5. `STORE_CATALOG` `ratingBreakdown` arrays are still hardcoded**
- e.g. `ratingBreakdown: [75, 16, 5, 2, 2]` for campus-cafe
- These were used in the reviews bar chart which is now removed. Can be deleted from STORE_CATALOG entirely to clean up.

---

## 📌 Store IDs (consistent everywhere)
| ID | Store Name |
|----|-----------|
| `campus-cafe` | Campus Bakery & Café |
| `book-corner` | Stationery Hub & Book Corner |
| `techstop` | TechStop Electronics |
| `campus-mart` | Campus Mart & Groceries |
| `campus-wear` | Campus Wear & Style Square |
| `health-hub` | Health Hub & Care |
| `nand-juice` | Nand Juice |

---

## 🗄️ Neon PostgreSQL Tables (frontend)
```
unimall_stores       -- id, name, category, floor, location, is_open, is_visible, rating, popularity, filter_tags, opening_time, closing_time, cover_image, phone
unimall_products     -- id, store_id, name, price, stock, availability, category_id, emoji, image, bg, is_active, is_nearby, is_popular, is_restocked
unimall_orders       -- id, order_number, user_id, store_id, status, total, fulfillment_type, payment_method, payment_status
unimall_order_items  -- order_id, product_id, product_name, price, qty, emoji, image
unimall_order_status_history -- order_id, status, notes, created_at
unimall_admins       -- id, email, name, role, store_id, password_hash
unimall_reviews      -- id, store_id, user_id, rating, text, created_at [NEW - created by migration]
unimall_promo_codes  -- code, discount_type, discount_value, is_active
users                -- id, name, email, phone, role, hostel, room, avatar, avatar_url, preferences, updated_at
```

---

## 🔗 Data Flow Summary
```
Student opens app
  → UserManager.boot() → restores from localStorage → syncs to Neon users table
  → syncCatalogWithSupabase() → fetches unimall_stores + unimall_products
  → AppState hydrated with live DB data
  → _updateStoresBadge() → updates "X STORES" badge from live count
  → renderHome() → shows deals, stores, best sellers

Student places order
  → cart-controller.js → UniMallDB.createOrder()
  → inserts into unimall_orders + unimall_order_items with real user_id, store_id
  → decrements stock in unimall_products

Store manager logs in
  → authenticateAdmin() → queries unimall_admins
  → getDashboardMetrics(storeId) → real revenue, AOV, units_sold

DB Schema auto-migrates on page load
  → runUniMallMigrations() in config.js
  → Adds missing columns idempotently (IF NOT EXISTS)
  → Creates unimall_reviews table if not exists
```

---

## 🛠️ Dev Server
```bash
cd /Users/ansh/Documents/Github/Campus-Connect
python3 -m http.server 3000
# App: http://localhost:3000
# Admin: http://localhost:3000/admin/
# Merchant: http://localhost:3000/merchant/
```
