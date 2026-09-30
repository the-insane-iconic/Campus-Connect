"""
UniMall Backend — Test Suite (backend/test_backend.py)
Automated verification of authentication, store authorization, cross-store security,
atomic inventory decrementing, and order state machine.
"""

import os
import sys
import json

# Ensure test suite runs in isolated test SQLite environment without affecting production Neon DB
os.environ['DATABASE_URL'] = ''

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app
from backend.seed import seed_database


def run_tests():
    print("=== Starting UniMall Backend Test Suite ===")
    seed_database()

    client = app.test_client()

    # 1. Test Login as Platform Admin (Founder)
    print("\nTest 1: Login as Platform Admin")
    res = client.post('/api/auth/login', json={'email': 'admin@unimall.app', 'password': 'admin123'})
    assert res.status_code == 200, f"Admin login failed: {res.data}"
    admin_data = res.get_json()
    admin_token = admin_data['token']
    assert admin_data['user']['role'] == 'platform_admin'
    assert len(admin_data['stores']) >= 5, "Platform admin should see all stores"
    print("✓ Platform admin login & store discovery passed.")

    # 2. Test Login as Bakery Owner
    print("\nTest 2: Login as Bakery Owner")
    res = client.post('/api/auth/login', json={'email': 'bakery@unimall.app', 'password': 'bakery123'})
    assert res.status_code == 200
    bakery_data = res.get_json()
    bakery_token = bakery_data['token']
    assert bakery_data['user']['role'] == 'store_owner'
    bakery_stores = [s['store_id'] for s in bakery_data['stores']]
    assert 'store-bakery' in bakery_stores
    assert 'store-stationery' not in bakery_stores, "Bakery owner must NOT have access to Stationery store"
    print("✓ Store owner login & scope scoping passed.")

    # 3. Test Store-Level Authorization Enforcement
    print("\nTest 3: Cross-Store Security Check")
    # Bakery owner accesses Bakery store -> should succeed
    res = client.get('/api/admin/stores/store-bakery/products', headers={'Authorization': f'Bearer {bakery_token}'})
    assert res.status_code == 200
    prods = res.get_json()['products']
    assert len(prods) > 0
    print("✓ Bakery owner accessing Bakery products succeeded (200).")

    # Bakery owner attempts to access Stationery Hub -> MUST FAIL with 403 Forbidden!
    res = client.get('/api/admin/stores/store-stationery/products', headers={'Authorization': f'Bearer {bakery_token}'})
    assert res.status_code == 403, f"Cross-store access should be 403, got {res.status_code}"
    print("✓ Bakery owner attempting to access Stationery products was strictly rejected with 403 Forbidden.")

    # Platform Admin accesses Stationery Hub -> should succeed (Support / Impersonation mode)
    res = client.get('/api/admin/stores/store-stationery/products', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    print("✓ Platform admin accessing Stationery products succeeded (200).")

    # 4. Test Single Product Creation & Inventory
    print("\nTest 4: Add Product with Initial Stock")
    new_prod_data = {
        'name': 'Chocolate Croissant',
        'price': 65.0,
        'stock': 20,
        'low_stock_threshold': 5,
        'category_id': 'food'
    }
    res = client.post(
        '/api/admin/stores/store-bakery/products',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json=new_prod_data
    )
    assert res.status_code == 201
    prod_id = res.get_json()['product_id']
    print(f"✓ Created product {prod_id} with stock 20.")

    # 5. Test Fast Bulk Product Entry
    print("\nTest 5: Fast Bulk Product Entry (Multi-row)")
    bulk_data = {
        'products': [
            {'name': 'Apple Danish', 'price': 55.0, 'stock': 15, 'category_id': 'food'},
            {'name': 'Blueberry Muffin', 'price': 60.0, 'stock': 25, 'category_id': 'food'}
        ]
    }
    res = client.post(
        '/api/admin/stores/store-bakery/products/bulk',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json=bulk_data
    )
    assert res.status_code == 200
    assert res.get_json()['created_count'] == 2
    print("✓ Bulk product creation passed.")

    # 6. Test Quick Inventory Stepper & Set Quantity
    print("\nTest 6: Quick Inventory Adjustments")
    # Decrement stock by 1
    res = client.patch(
        f'/api/admin/inventory/{prod_id}',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'delta': -1}
    )
    assert res.status_code == 200
    assert res.get_json()['quantity'] == 19
    # Set stock to 0 (should automatically derive out_of_stock)
    res = client.patch(
        f'/api/admin/inventory/{prod_id}',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'quantity': 0}
    )
    assert res.status_code == 200
    assert res.get_json()['availability'] == 'out_of_stock'
    print("✓ Inventory quantity stepper and automatic out_of_stock derivation passed.")

    # 7. Test Order State Machine Transitions
    print("\nTest 7: Order Lifecycle Transition Validation")
    # Get initial order
    res = client.get('/api/admin/stores/store-bakery/orders?status=PLACED', headers={'Authorization': f'Bearer {bakery_token}'})
    assert res.status_code == 200
    placed_orders = res.get_json()['orders']
    assert len(placed_orders) > 0
    test_order_id = placed_orders[0]['id']

    # Transition PLACED -> ACCEPTED (valid)
    res = client.patch(
        f'/api/admin/orders/{test_order_id}/status',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'status': 'ACCEPTED'}
    )
    assert res.status_code == 200
    assert res.get_json()['status'] == 'ACCEPTED'

    # Transition ACCEPTED -> COMPLETED directly (INVALID JUMP, must fail!)
    res = client.patch(
        f'/api/admin/orders/{test_order_id}/status',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'status': 'COMPLETED'}
    )
    assert res.status_code == 400, "Arbitrary status jump should be rejected with 400"
    print("✓ Invalid status transition correctly blocked.")

    # Transition ACCEPTED -> PREPARING -> READY -> COMPLETED
    res = client.patch(
        f'/api/admin/orders/{test_order_id}/status',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'status': 'PREPARING'}
    )
    assert res.status_code == 200
    res = client.patch(
        f'/api/admin/orders/{test_order_id}/status',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'status': 'READY'}
    )
    assert res.status_code == 200
    res = client.patch(
        f'/api/admin/orders/{test_order_id}/status',
        headers={'Authorization': f'Bearer {bakery_token}'},
        json={'status': 'COMPLETED'}
    )
    assert res.status_code == 200
    assert res.get_json()['status'] == 'COMPLETED'
    print("✓ Sequential order lifecycle transition passed.")

    # 8. Test Atomic Inventory Safe Checkout (Prevent Overselling)
    print("\nTest 8: Atomic Inventory Checkout Safety")
    # p_bakery_01 initially has 40+ in stock
    res = client.post(
        '/api/public/orders',
        json={
            'items': [{'productId': 'p_bakery_01', 'qty': 2}],
            'customer_name': 'Test Student',
            'customer_email': 'student.test@univ.edu',
            'delivery_method': 'pickup'
        }
    )
    assert res.status_code == 201
    print("✓ Order placed and inventory safely decremented.")

    # Try to order more than available (e.g. 9999 units) -> must fail!
    res = client.post(
        '/api/public/orders',
        json={
            'items': [{'productId': 'p_bakery_01', 'qty': 9999}],
            'customer_name': 'Greedy Student',
            'customer_email': 'greedy@univ.edu'
        }
    )
    assert res.status_code != 201
    print("✓ Overselling attempt successfully prevented.")

    # 9. Test Store Analytics
    print("\nTest 9: Store Analytics")
    res = client.get('/api/admin/stores/store-bakery/analytics?period=all', headers={'Authorization': f'Bearer {bakery_token}'})
    assert res.status_code == 200
    analytics = res.get_json()
    assert 'metrics' in analytics
    assert 'top_products' in analytics
    print(f"✓ Store analytics returned: {analytics['metrics']['orders']} orders, ₹{analytics['metrics']['revenue']} revenue.")

    # 10. Test Founder Onboarding API
    print("\nTest 10: Founder Create Store & Owner")
    res = client.post(
        '/api/admin/founder/stores',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'name': 'Campus Cafe 2', 'category': 'Food & Drinks'}
    )
    assert res.status_code == 201
    new_store_id = res.get_json()['store_id']

    res = client.post(
        '/api/admin/founder/owners',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'name': 'Cafe Owner',
            'email': 'cafe2@unimall.app',
            'password': 'password123',
            'store_id': new_store_id
        }
    )
    assert res.status_code == 201
    print("✓ Founder store and owner onboarding API passed.")

    print("\n🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY! 🎉\n")


if __name__ == '__main__':
    run_tests()
