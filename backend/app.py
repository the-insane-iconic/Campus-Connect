"""
UniMall Backend — Flask REST API Server (backend/app.py)
Multi-store REST API, store-level authorization, atomic inventory transactions, and static web serving.
"""

import csv
import io
import json
import os
import secrets
import sys
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, send_file

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db import get_connection, query_all, query_one, execute_mutation, transaction
from backend.auth import (
    hash_password, verify_password, create_session, invalidate_session,
    require_auth, require_role, require_store_access, log_audit, get_auth_token
)

app = Flask(__name__, static_folder=None)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ADMIN_DIR = os.path.join(ROOT_DIR, 'admin')


# ─── CORS & HEADERS ─────────────────────────────────────────────

@app.after_request
def add_security_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


@app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return ('', 204)


# ─── STATIC ROUTES ──────────────────────────────────────────────

@app.route('/admin/')
@app.route('/admin/index.html')
def serve_admin_index():
    return send_from_directory(ADMIN_DIR, 'index.html')


@app.route('/admin/<path:filename>')
def serve_admin_static(filename):
    clean_path = filename.lstrip('/')
    basename = os.path.basename(clean_path)
    if basename.startswith('.') or any(part.startswith('.') for part in clean_path.split('/')):
        return jsonify({'error': 'Access denied'}), 403
    return send_from_directory(ADMIN_DIR, filename)


@app.route('/')
def serve_student_index():
    return send_from_directory(ROOT_DIR, 'index.html')


@app.route('/<path:filename>')
def serve_root_static(filename):
    clean_path = filename.lstrip('/')
    basename = os.path.basename(clean_path)

    # 1. Defense-in-depth: Deny any dotfile/dotfolder (.env, .git, .neon, .agents, .DS_Store, etc.)
    if basename.startswith('.') or any(part.startswith('.') for part in clean_path.split('/')):
        return jsonify({'error': 'Access denied: hidden or sensitive resource'}), 403

    # 2. Deny source code, scripts, databases, backups, and environment configs
    BLOCKED_EXTENSIONS = (
        '.db', '.db-shm', '.db-wal', '.sqlite', '.sqlite3',
        '.py', '.sh', '.env', '.sql', '.log', '.key', '.pem'
    )
    if clean_path.endswith(BLOCKED_EXTENSIONS) or clean_path.startswith(('backend', 'scripts', '.agents', 'node_modules')):
        return jsonify({'error': 'Access denied: restricted system file'}), 403

    # 3. Deny test files and project manifests
    if basename.startswith('test_') or basename in ('package.json', 'package-lock.json', 'skills-lock.json', 'vercel.json'):
        return jsonify({'error': 'Access denied: restricted asset'}), 403

    return send_from_directory(ROOT_DIR, filename)


# ─── 1. AUTHENTICATION ENDPOINTS ────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = query_one("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password.'}), 401

    token = create_session(user['id'])

    # Fetch store memberships
    if user['role'] == 'platform_admin':
        # Platform admin has access to all active stores
        stores = query_all("SELECT id as store_id, name as store_name, slug as store_slug, 'admin' as membership_role FROM stores WHERE is_active = 1")
    else:
        stores = query_all(
            "SELECT sm.store_id, sm.role as membership_role, s.name as store_name, s.slug as store_slug "
            "FROM store_memberships sm "
            "JOIN stores s ON sm.store_id = s.id "
            "WHERE sm.user_id = ? AND s.is_active = 1",
            (user['id'],)
        )

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'phone': user['phone'],
            'role': user['role']
        },
        'stores': stores
    })


@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    token = get_auth_token()
    invalidate_session(token)
    return jsonify({'success': True, 'message': 'Logged out successfully.'})


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    user = request.user
    if user['role'] == 'platform_admin':
        stores = query_all("SELECT id as store_id, name as store_name, slug as store_slug, 'admin' as membership_role FROM stores WHERE is_active = 1")
    else:
        stores = user.get('stores', [])

    return jsonify({
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'phone': user['phone'],
            'role': user['role']
        },
        'stores': stores
    })


# ─── 2. STORE MANAGEMENT ENDPOINTS ──────────────────────────────

@app.route('/api/admin/stores', methods=['GET'])
@require_auth
def list_admin_stores():
    user = request.user
    if user['role'] == 'platform_admin':
        stores = query_all("SELECT * FROM stores ORDER BY name ASC")
    else:
        stores = query_all(
            "SELECT s.*, sm.role as user_store_role "
            "FROM stores s "
            "JOIN store_memberships sm ON s.id = sm.store_id "
            "WHERE sm.user_id = ? "
            "ORDER BY s.name ASC",
            (user['id'],)
        )
    return jsonify({'stores': stores})


@app.route('/api/admin/stores/<store_id>', methods=['GET'])
@require_auth
@require_store_access
def get_admin_store(store_id):
    store = query_one("SELECT * FROM stores WHERE id = ?", (store_id,))
    if not store:
        return jsonify({'error': 'Store not found'}), 404

    # Fetch store stats
    stats = query_one(
        "SELECT "
        "(SELECT count(*) FROM products WHERE store_id = ? AND is_active = 1) as total_products, "
        "(SELECT count(*) FROM inventory i JOIN products p ON i.product_id = p.id "
        " WHERE i.store_id = ? AND p.is_active = 1 AND i.quantity > 0 AND i.quantity <= i.low_stock_threshold) as low_stock_count, "
        "(SELECT count(*) FROM inventory i JOIN products p ON i.product_id = p.id "
        " WHERE i.store_id = ? AND p.is_active = 1 AND i.quantity = 0) as out_of_stock_count, "
        "(SELECT count(DISTINCT order_id) FROM order_items WHERE store_id = ?) as total_orders",
        (store_id, store_id, store_id, store_id)
    )

    store['stats'] = stats or {}
    if store.get('hours_json'):
        try:
            store['hours'] = json.loads(store['hours_json'])
        except Exception:
            store['hours'] = {}
    else:
        store['hours'] = {}

    return jsonify({'store': store})


@app.route('/api/admin/stores/<store_id>', methods=['PATCH'])
@require_auth
@require_store_access
def update_admin_store(store_id):
    data = request.get_json() or {}
    allowed_fields = [
        'name', 'description', 'category', 'location', 'phone', 'image_url',
        'is_open', 'accepts_delivery', 'accepts_pickup', 'hours_json'
    ]

    updates = []
    values = []
    for field in allowed_fields:
        if field in data:
            if field == 'hours_json' and isinstance(data[field], dict):
                values.append(json.dumps(data[field]))
            else:
                values.append(data[field])
            updates.append(f"{field} = ?")

    if not updates:
        return jsonify({'error': 'No valid fields provided for update.'}), 400

    now_iso = datetime.utcnow().isoformat()
    updates.append("updated_at = ?")
    values.append(now_iso)
    values.append(store_id)

    query = f"UPDATE stores SET {', '.join(updates)} WHERE id = ?"
    execute_mutation(query, values)

    log_audit(
        request.user['id'], store_id, 'UPDATE_STORE_PROFILE',
        'store', store_id, {'updated_fields': list(data.keys())}
    )

    return jsonify({'success': True, 'message': 'Store updated successfully.'})


@app.route('/api/admin/stores/<store_id>/toggle-open', methods=['POST'])
@require_auth
@require_store_access
def toggle_store_open(store_id):
    store = query_one("SELECT is_open FROM stores WHERE id = ?", (store_id,))
    if not store:
        return jsonify({'error': 'Store not found'}), 404

    new_state = 0 if store['is_open'] == 1 else 1
    now_iso = datetime.utcnow().isoformat()
    execute_mutation(
        "UPDATE stores SET is_open = ?, updated_at = ? WHERE id = ?",
        (new_state, now_iso, store_id)
    )

    log_audit(
        request.user['id'], store_id, 'TOGGLE_OPEN_STATUS',
        'store', store_id, {'is_open': new_state}
    )
    return jsonify({'success': True, 'is_open': new_state})


# ─── 3. PRODUCT MANAGEMENT ENDPOINTS ────────────────────────────

@app.route('/api/admin/stores/<store_id>/products', methods=['GET'])
@require_auth
@require_store_access
def list_admin_products(store_id):
    search = request.args.get('search', '').strip().lower()
    status = request.args.get('status', 'all')  # all, in_stock, low_stock, out_of_stock, inactive
    category_id = request.args.get('category_id', '')

    query = (
        "SELECT p.*, c.name as category_name, "
        "COALESCE(i.quantity, 0) as stock, "
        "COALESCE(i.low_stock_threshold, 5) as low_stock_threshold, "
        "CASE "
        "  WHEN p.is_active = 0 THEN 'inactive' "
        "  WHEN COALESCE(i.quantity, 0) = 0 THEN 'out_of_stock' "
        "  WHEN COALESCE(i.quantity, 0) <= COALESCE(i.low_stock_threshold, 5) THEN 'low_stock' "
        "  ELSE 'in_stock' "
        "END as availability "
        "FROM products p "
        "LEFT JOIN categories c ON p.category_id = c.id "
        "LEFT JOIN inventory i ON p.id = i.product_id "
        "WHERE p.store_id = ? "
    )
    params = [store_id]

    if search:
        query += "AND (LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.sku, '')) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ?) "
        term = f"%{search}%"
        params.extend([term, term, term])

    if category_id:
        query += "AND p.category_id = ? "
        params.append(category_id)

    if status == 'in_stock':
        query += "AND p.is_active = 1 AND COALESCE(i.quantity, 0) > COALESCE(i.low_stock_threshold, 5) "
    elif status == 'low_stock':
        query += "AND p.is_active = 1 AND COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= COALESCE(i.low_stock_threshold, 5) "
    elif status == 'out_of_stock':
        query += "AND p.is_active = 1 AND COALESCE(i.quantity, 0) = 0 "
    elif status == 'inactive':
        query += "AND p.is_active = 0 "

    query += "ORDER BY p.name ASC"
    products = query_all(query, params)
    return jsonify({'products': products})


@app.route('/api/admin/stores/<store_id>/products', methods=['POST'])
@require_auth
@require_store_access
def create_admin_product(store_id):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    price = data.get('price')

    if not name or price is None:
        return jsonify({'error': 'Product name and price are required.'}), 400

    try:
        price = float(price)
    except ValueError:
        return jsonify({'error': 'Invalid price.'}), 400

    stock = int(data.get('stock', 0))
    low_stock_threshold = int(data.get('low_stock_threshold', 5))
    compare_at_price = float(data['compare_at_price']) if data.get('compare_at_price') else None

    product_id = f"prod_{secrets.token_hex(6)}"
    inv_id = f"inv_{product_id}"
    now_iso = datetime.utcnow().isoformat()

    with transaction() as tx_conn:
        execute_mutation(
            "INSERT INTO products (id, store_id, name, description, category_id, sku, price, "
            "compare_at_price, image_url, unit, is_active, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
            (
                product_id, store_id, name, data.get('description', ''), data.get('category_id'),
                data.get('sku', ''), price, compare_at_price, data.get('image_url', ''),
                data.get('unit', 'item'), now_iso, now_iso
            ),
            conn=tx_conn
        )
        execute_mutation(
            "INSERT INTO inventory (id, product_id, store_id, quantity, low_stock_threshold, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (inv_id, product_id, store_id, stock, low_stock_threshold, now_iso),
            conn=tx_conn
        )

    log_audit(
        request.user['id'], store_id, 'CREATE_PRODUCT',
        'product', product_id, {'name': name, 'price': price, 'initial_stock': stock}
    )

    return jsonify({
        'success': True,
        'message': f'Product "{name}" created successfully.',
        'product_id': product_id
    }), 201


@app.route('/api/admin/stores/<store_id>/products/bulk', methods=['POST'])
@require_auth
@require_store_access
def bulk_create_products(store_id):
    """Fast onboarding endpoint for multi-row quick add and CSV import."""
    data = request.get_json() or {}
    items = data.get('products', [])

    if not items or not isinstance(items, list):
        return jsonify({'error': 'A list of products is required.'}), 400

    now_iso = datetime.utcnow().isoformat()
    created_count = 0
    errors = []

    with transaction() as tx_conn:
        for idx, item in enumerate(items):
            name = item.get('name', '').strip()
            if not name:
                continue

            try:
                price = float(item.get('price', 0))
                stock = int(item.get('stock', 0))
            except (ValueError, TypeError):
                errors.append(f"Row {idx+1} has invalid price or stock.")
                continue

            product_id = f"prod_{secrets.token_hex(6)}"
            inv_id = f"inv_{product_id}"

            execute_mutation(
                "INSERT INTO products (id, store_id, name, description, category_id, sku, price, "
                "unit, is_active, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, 'item', 1, ?, ?)",
                (
                    product_id, store_id, name, item.get('description', ''),
                    item.get('category_id') or 'more', item.get('sku', ''), price, now_iso, now_iso
                ),
                conn=tx_conn
            )
            execute_mutation(
                "INSERT INTO inventory (id, product_id, store_id, quantity, low_stock_threshold, updated_at) "
                "VALUES (?, ?, ?, ?, 5, ?)",
                (inv_id, product_id, store_id, stock, now_iso),
                conn=tx_conn
            )
            created_count += 1

    log_audit(
        request.user['id'], store_id, 'BULK_CREATE_PRODUCTS',
        'store', store_id, {'created_count': created_count}
    )

    return jsonify({
        'success': True,
        'created_count': created_count,
        'errors': errors,
        'message': f'Successfully onboarded {created_count} products.'
    })


@app.route('/api/admin/products/<product_id>', methods=['PATCH'])
@require_auth
def update_admin_product(product_id):
    product = query_one("SELECT * FROM products WHERE id = ?", (product_id,))
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    store_id = product['store_id']
    # Authorize store access
    if request.user['role'] != 'platform_admin':
        authorized_stores = [m['store_id'] for m in request.user.get('stores', [])]
        if store_id not in authorized_stores:
            return jsonify({'error': 'Forbidden. You do not manage this product.'}), 403

    data = request.get_json() or {}
    allowed_fields = [
        'name', 'description', 'category_id', 'sku', 'price',
        'compare_at_price', 'image_url', 'unit', 'is_active'
    ]

    updates = []
    values = []
    for field in allowed_fields:
        if field in data:
            val = data[field]
            if field in ['price', 'compare_at_price'] and val is not None:
                val = float(val)
            updates.append(f"{field} = ?")
            values.append(val)

    if not updates:
        return jsonify({'error': 'No fields to update'}), 400

    now_iso = datetime.utcnow().isoformat()
    updates.append("updated_at = ?")
    values.append(now_iso)
    values.append(product_id)

    execute_mutation(f"UPDATE products SET {', '.join(updates)} WHERE id = ?", values)

    log_audit(
        request.user['id'], store_id, 'UPDATE_PRODUCT',
        'product', product_id, {'fields': list(data.keys())}
    )

    return jsonify({'success': True, 'message': 'Product updated successfully.'})


# ─── 4. INVENTORY MANAGEMENT ENDPOINTS ──────────────────────────

@app.route('/api/admin/stores/<store_id>/inventory', methods=['GET'])
@require_auth
@require_store_access
def list_admin_inventory(store_id):
    items = query_all(
        "SELECT p.id as product_id, p.name, p.price, p.sku, p.image_url, p.unit, p.is_active, "
        "c.name as category_name, "
        "i.id as inventory_id, i.quantity, i.low_stock_threshold, i.updated_at as inventory_updated_at, "
        "CASE "
        "  WHEN p.is_active = 0 THEN 'inactive' "
        "  WHEN i.quantity = 0 THEN 'out_of_stock' "
        "  WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock' "
        "  ELSE 'in_stock' "
        "END as availability "
        "FROM products p "
        "JOIN inventory i ON p.id = i.product_id "
        "LEFT JOIN categories c ON p.category_id = c.id "
        "WHERE p.store_id = ? "
        "ORDER BY i.quantity ASC, p.name ASC",
        (store_id,)
    )
    return jsonify({'inventory': items})


@app.route('/api/admin/inventory/<product_id>', methods=['PATCH'])
@require_auth
def update_inventory_quantity(product_id):
    inv = query_one("SELECT * FROM inventory WHERE product_id = ?", (product_id,))
    if not inv:
        return jsonify({'error': 'Inventory record not found'}), 404

    store_id = inv['store_id']
    if request.user['role'] != 'platform_admin':
        authorized_stores = [m['store_id'] for m in request.user.get('stores', [])]
        if store_id not in authorized_stores:
            return jsonify({'error': 'Forbidden. You do not manage this store.'}), 403

    data = request.get_json() or {}
    now_iso = datetime.utcnow().isoformat()

    with transaction() as tx_conn:
        current_qty = inv['quantity']
        if 'quantity' in data:
            new_qty = max(0, int(data['quantity']))
        elif 'delta' in data:
            new_qty = max(0, current_qty + int(data['delta']))
        else:
            new_qty = current_qty

        threshold = int(data.get('low_stock_threshold', inv['low_stock_threshold']))

        execute_mutation(
            "UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = ? WHERE product_id = ?",
            (new_qty, threshold, now_iso, product_id),
            conn=tx_conn
        )

    log_audit(
        request.user['id'], store_id, 'UPDATE_INVENTORY',
        'inventory', inv['id'],
        {'product_id': product_id, 'old_qty': current_qty, 'new_qty': new_qty}
    )

    # Return updated stock & derived status
    availability = 'out_of_stock' if new_qty == 0 else ('low_stock' if new_qty <= threshold else 'in_stock')

    return jsonify({
        'success': True,
        'product_id': product_id,
        'quantity': new_qty,
        'low_stock_threshold': threshold,
        'availability': availability,
        'message': f'Stock updated to {new_qty}.'
    })


# ─── 5. ORDER PROCESSING ENDPOINTS ──────────────────────────────

@app.route('/api/admin/stores/<store_id>/orders', methods=['GET'])
@require_auth
@require_store_access
def list_store_orders(store_id):
    """
    CRITICAL MULTI-STORE SECURITY:
    A store owner must see ONLY orders containing items from their store,
    and items in the response are strictly scoped to this store.
    """
    status_filter = request.args.get('status', 'all').upper()

    query = (
        "SELECT DISTINCT o.id, o.customer_name, o.customer_email, o.customer_phone, "
        "o.status, o.total, o.delivery_method, o.delivery_address, o.payment_status, o.created_at, "
        "(SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.store_id = ?) as item_count, "
        "(SELECT sum(oi.price_snapshot * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id AND oi.store_id = ?) as store_subtotal "
        "FROM orders o "
        "JOIN order_items oi ON o.id = oi.order_id "
        "WHERE oi.store_id = ? "
    )
    params = [store_id, store_id, store_id]

    if status_filter != 'ALL':
        query += "AND o.status = ? "
        params.append(status_filter)

    query += "ORDER BY o.created_at DESC"
    orders = query_all(query, params)

    # Attach store-specific items to each order
    for o in orders:
        items = query_all(
            "SELECT id, product_id, product_name_snapshot as name, price_snapshot as price, quantity, status "
            "FROM order_items "
            "WHERE order_id = ? AND store_id = ?",
            (o['id'], store_id)
        )
        o['items'] = items

    return jsonify({'orders': orders})


@app.route('/api/admin/orders/<order_id>', methods=['GET'])
@require_auth
def get_order_detail(order_id):
    order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    # Fetch store items
    items = query_all(
        "SELECT oi.*, s.name as store_name "
        "FROM order_items oi "
        "JOIN stores s ON oi.store_id = s.id "
        "WHERE oi.order_id = ?",
        (order_id,)
    )

    # Check store access
    if request.user['role'] != 'platform_admin':
        authorized_stores = [m['store_id'] for m in request.user.get('stores', [])]
        order_stores = set(item['store_id'] for item in items)
        if not order_stores.intersection(authorized_stores):
            return jsonify({'error': 'Forbidden. You do not have access to this order.'}), 403

        # Filter items to only authorized stores
        items = [it for it in items if it['store_id'] in authorized_stores]

    order['items'] = items
    return jsonify({'order': order})


@app.route('/api/admin/orders/<order_id>/status', methods=['PATCH'])
@require_auth
def update_order_status(order_id):
    order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    # Verify authorization
    order_items = query_all("SELECT store_id FROM order_items WHERE order_id = ?", (order_id,))
    order_store_ids = set(it['store_id'] for it in order_items)

    if request.user['role'] != 'platform_admin':
        authorized_stores = set(m['store_id'] for m in request.user.get('stores', []))
        if not order_store_ids.intersection(authorized_stores):
            return jsonify({'error': 'Forbidden. You do not manage stores in this order.'}), 403

    data = request.get_json() or {}
    new_status = data.get('status', '').upper()

    # Valid state machine transitions
    VALID_TRANSITIONS = {
        'PLACED': ['ACCEPTED', 'CANCELLED'],
        'ACCEPTED': ['PREPARING', 'CANCELLED'],
        'PREPARING': ['READY', 'CANCELLED'],
        'READY': ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
        'OUT_FOR_DELIVERY': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
    }

    current_status = order['status']
    allowed_next = VALID_TRANSITIONS.get(current_status, [])

    # Platform admin can override if needed, but store owner must follow sequential flow
    if request.user['role'] != 'platform_admin' and new_status not in allowed_next:
        return jsonify({
            'error': f'Invalid transition from {current_status} to {new_status}. Allowed: {allowed_next}'
        }), 400

    now_iso = datetime.utcnow().isoformat()
    with transaction() as tx_conn:
        execute_mutation(
            "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now_iso, order_id),
            conn=tx_conn
        )
        # Also update relevant order items status
        execute_mutation(
            "UPDATE order_items SET status = ? WHERE order_id = ?",
            (new_status, order_id),
            conn=tx_conn
        )

    # Log audit event for all involved stores
    for sid in order_store_ids:
        log_audit(
            request.user['id'], sid, 'UPDATE_ORDER_STATUS',
            'order', order_id, {'old_status': current_status, 'new_status': new_status}
        )

    return jsonify({
        'success': True,
        'order_id': order_id,
        'previous_status': current_status,
        'status': new_status,
        'message': f'Order status updated to {new_status}.'
    })


# ─── 6. STORE ANALYTICS ENDPOINTS ───────────────────────────────

@app.route('/api/admin/stores/<store_id>/analytics', methods=['GET'])
@require_auth
@require_store_access
def get_store_analytics(store_id):
    period = request.args.get('period', 'today').lower()  # today, week, month, all
    now = datetime.utcnow()

    if period == 'today':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == 'week':
        start_date = (now - timedelta(days=7)).isoformat()
    elif period == 'month':
        start_date = (now - timedelta(days=30)).isoformat()
    else:
        start_date = '2000-01-01T00:00:00'

    # Revenue and order metrics
    metrics = query_one(
        "SELECT "
        "count(DISTINCT o.id) as order_count, "
        "COALESCE(sum(oi.price_snapshot * oi.quantity), 0) as revenue, "
        "COALESCE(sum(oi.quantity), 0) as units_sold "
        "FROM orders o "
        "JOIN order_items oi ON o.id = oi.order_id "
        "WHERE oi.store_id = ? AND o.created_at >= ? AND o.status != 'CANCELLED'",
        (store_id, start_date)
    )

    order_count = metrics['order_count'] or 0
    revenue = metrics['revenue'] or 0.0
    units_sold = metrics['units_sold'] or 0
    aov = round(revenue / order_count, 1) if order_count > 0 else 0.0

    # Top-selling products
    top_products = query_all(
        "SELECT oi.product_name_snapshot as name, sum(oi.quantity) as sold_count, "
        "sum(oi.price_snapshot * oi.quantity) as total_sales "
        "FROM order_items oi "
        "JOIN orders o ON oi.order_id = o.id "
        "WHERE oi.store_id = ? AND o.created_at >= ? AND o.status != 'CANCELLED' "
        "GROUP BY oi.product_name_snapshot "
        "ORDER BY sold_count DESC LIMIT 5",
        (store_id, start_date)
    )

    return jsonify({
        'period': period,
        'metrics': {
            'orders': order_count,
            'revenue': revenue,
            'units_sold': units_sold,
            'average_order_value': aov
        },
        'top_products': top_products
    })


# ─── 7. FOUNDER ONBOARDING TOOLS (Platform Admin Only) ──────────

@app.route('/api/admin/founder/stores', methods=['POST'])
@require_auth
@require_role('platform_admin')
def founder_create_store():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Store name is required'}), 400

    slug = data.get('slug') or name.lower().replace(' ', '-').replace('&', 'and')
    store_id = f"store_{slug.replace('-', '_')}"
    now_iso = datetime.utcnow().isoformat()

    default_hours = json.dumps({
        'monday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'tuesday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'wednesday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'thursday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'friday': {'open': '08:00', 'close': '22:00', 'closed': False},
        'saturday': {'open': '09:00', 'close': '21:00', 'closed': False},
        'sunday': {'open': '10:00', 'close': '20:00', 'closed': False}
    })

    execute_mutation(
        "INSERT INTO stores (id, name, slug, description, category, location, phone, image_url, "
        "is_active, is_open, accepts_delivery, accepts_pickup, hours_json, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, ?, ?, ?)",
        (
            store_id, name, slug, data.get('description', ''), data.get('category', 'Essentials'),
            data.get('location', 'Campus Mall'), data.get('phone', ''),
            data.get('image_url', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80'),
            default_hours, now_iso, now_iso
        )
    )

    log_audit(
        request.user['id'], store_id, 'FOUNDER_CREATE_STORE',
        'store', store_id, {'name': name, 'slug': slug}
    )

    return jsonify({
        'success': True,
        'store_id': store_id,
        'name': name,
        'message': f'Store "{name}" created successfully.'
    }), 201


@app.route('/api/admin/founder/owners', methods=['POST'])
@require_auth
@require_role('platform_admin')
def founder_create_owner():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    store_id = data.get('store_id')

    if not name or not email or not password or not store_id:
        return jsonify({'error': 'Name, email, password, and store_id are required.'}), 400

    existing = query_one("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if existing:
        return jsonify({'error': 'A user with this email already exists.'}), 400

    user_id = f"usr_{secrets.token_hex(6)}"
    mem_id = f"mem_{secrets.token_hex(6)}"
    now_iso = datetime.utcnow().isoformat()

    with transaction() as tx_conn:
        execute_mutation(
            "INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, 'store_owner', ?, ?)",
            (user_id, name, email, data.get('phone', ''), hash_password(password), now_iso, now_iso),
            conn=tx_conn
        )
        execute_mutation(
            "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) "
            "VALUES (?, ?, ?, 'owner', ?)",
            (mem_id, user_id, store_id, now_iso),
            conn=tx_conn
        )

    log_audit(
        request.user['id'], store_id, 'FOUNDER_CREATE_OWNER',
        'user', user_id, {'email': email, 'store_id': store_id}
    )

    return jsonify({
        'success': True,
        'user_id': user_id,
        'email': email,
        'store_id': store_id,
        'message': f'Owner "{name}" created and assigned to store successfully.'
    }), 201


@app.route('/api/admin/founder/overview', methods=['GET'])
@require_auth
@require_role('platform_admin')
def founder_platform_overview():
    stats = query_one(
        "SELECT "
        "(SELECT count(*) FROM stores WHERE is_active = 1) as active_stores, "
        "(SELECT count(*) FROM products WHERE is_active = 1) as active_products, "
        "(SELECT count(*) FROM orders WHERE status != 'CANCELLED') as total_orders, "
        "(SELECT COALESCE(sum(total), 0) FROM orders WHERE status != 'CANCELLED') as platform_revenue"
    )
    audit_events = query_all(
        "SELECT a.*, u.name as user_name, s.name as store_name "
        "FROM audit_logs a "
        "JOIN users u ON a.user_id = u.id "
        "LEFT JOIN stores s ON a.store_id = s.id "
        "ORDER BY a.created_at DESC LIMIT 20"
    )
    return jsonify({'stats': stats, 'recent_audit': audit_events})


# ─── 8. PRODUCT REQUESTS (Student Demand Signals) ───────────────

@app.route('/api/admin/stores/<store_id>/requests', methods=['GET'])
@require_auth
@require_store_access
def list_product_requests(store_id):
    requests_list = query_all(
        "SELECT * FROM product_requests WHERE store_id = ? ORDER BY request_count DESC",
        (store_id,)
    )
    return jsonify({'requests': requests_list})


@app.route('/api/admin/requests/<request_id>/status', methods=['PATCH'])
@require_auth
def update_product_request_status(request_id):
    req_item = query_one("SELECT * FROM product_requests WHERE id = ?", (request_id,))
    if not req_item:
        return jsonify({'error': 'Request item not found'}), 404

    data = request.get_json() or {}
    new_status = data.get('status', '').lower()
    if new_status not in ['considering', 'available', 'dismissed']:
        return jsonify({'error': 'Invalid status'}), 400

    now_iso = datetime.utcnow().isoformat()
    execute_mutation(
        "UPDATE product_requests SET status = ?, updated_at = ? WHERE id = ?",
        (new_status, now_iso, request_id)
    )
    return jsonify({'success': True, 'status': new_status})


# ─── 9. CATEGORIES HELPER ───────────────────────────────────────

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = query_all("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC")
    return jsonify({'categories': categories})


# ─── 10. INVENTORY-SAFE CHECKOUT (Prevents Overselling) ──────────

@app.route('/api/public/orders', methods=['POST'])
def place_order_safe():
    """
    CRITICAL INVENTORY SAFETY:
    Verifies stock and decrements inventory in an atomic transaction.
    If 2 students attempt to buy the last remaining item, only one succeeds.
    """
    data = request.get_json() or {}
    items = data.get('items', [])
    customer_name = data.get('customer_name', 'Campus Student')
    customer_email = data.get('customer_email', 'student@univ.edu')
    customer_phone = data.get('customer_phone', '')
    # Accept user_id from the authenticated frontend session (not hardcoded)
    user_id = (data.get('user_id') or data.get('userId') or '').strip() or None
    delivery_method = data.get('delivery_method', 'pickup')  # 'pickup' | 'delivery'
    delivery_address = data.get('delivery_address', 'Store Counter Pickup Station')
    notes = data.get('notes', '')

    if not items:
        return jsonify({'error': 'Order items are required.'}), 400

    order_id = f"UM{secrets.randbelow(90000) + 10000}"
    now_iso = datetime.utcnow().isoformat()

    try:
        with transaction(immediate=True) as tx_conn:
            subtotal = 0.0
            verified_items = []

            for it in items:
                p_id = it.get('productId') or it.get('product_id')
                qty = int(it.get('qty', 1))
                if qty <= 0:
                    continue

                # Check inventory and lock row
                row = query_one(
                    "SELECT p.id, p.name, p.price, p.store_id, i.quantity "
                    "FROM products p "
                    "JOIN inventory i ON p.id = i.product_id "
                    "WHERE p.id = ? AND p.is_active = 1",
                    (p_id,),
                    conn=tx_conn
                )
                if not row:
                    raise Exception(f'Product {p_id} is no longer available.')

                if row['quantity'] < qty:
                    raise Exception(f'Insufficient stock for "{row["name"]}". Only {row["quantity"]} available.')

                item_total = row['price'] * qty
                subtotal += item_total
                verified_items.append({
                    'product_id': p_id,
                    'store_id': row['store_id'],
                    'name': row['name'],
                    'price': row['price'],
                    'qty': qty
                })

                # Decrement inventory
                execute_mutation(
                    "UPDATE inventory SET quantity = quantity - ?, updated_at = ? WHERE product_id = ?",
                    (qty, now_iso, p_id),
                    conn=tx_conn
                )

            delivery_fee = 0.0  # Counter self-pickup only — ₹0 delivery fee
            total = subtotal + delivery_fee

            # Create Order — user_id comes from the authenticated frontend session
            execute_mutation(
                "INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, status, "
                "subtotal, delivery_fee, total, delivery_method, delivery_address, payment_status, notes, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, 'PLACED', ?, ?, ?, ?, ?, 'paid', ?, ?, ?)",
                (order_id, user_id, customer_name, customer_email, customer_phone, subtotal, delivery_fee, total,
                 delivery_method, delivery_address, notes, now_iso, now_iso),
                conn=tx_conn
            )

            # Create Order Items
            for vi in verified_items:
                item_id = f"oi_{secrets.token_hex(6)}"
                execute_mutation(
                    "INSERT INTO order_items (id, order_id, product_id, store_id, product_name_snapshot, price_snapshot, quantity, status, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)",
                    (item_id, order_id, vi['product_id'], vi['store_id'], vi['name'], vi['price'], vi['qty'], now_iso),
                    conn=tx_conn
                )

        return jsonify({
            'success': True,
            'order_id': order_id,
            'total': total,
            'status': 'PLACED',
            'message': 'Order placed successfully.'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
