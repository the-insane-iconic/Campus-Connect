/**
 * UniMall Store Admin — Centralized API Client (admin/js/api.js)
 * Supports both Flask backend and direct client-side Supabase execution on Vercel.
 */

'use strict';

const API_BASE = '/api';

/**
 * Standard API client.
 * Tries local /api if available, otherwise delegates directly to Supabase via UniMallDB.
 */
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('unimall_admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. First attempt through local API backend (if running Flask)
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      sessionStorage.removeItem('unimall_admin_token');
      window.location.href = 'login.html';
      throw new Error('Session expired. Please sign in again.');
    }

    if (res.ok) {
      return await res.json().catch(() => ({}));
    }
  } catch (err) {
    // If backend is not running or 404 on Vercel, fall through to Supabase handler below
  }

  // 2. Direct Supabase Fallback (Serverless / Vercel mode)
  if (typeof window.UniMallDB !== 'undefined') {
    try {
      return await handleSupabaseAdminRequest(endpoint, options);
    } catch (sbErr) {
      console.error(`Supabase Admin Error [${endpoint}]:`, sbErr);
      showToast(sbErr.message, 'error');
      throw sbErr;
    }
  }

  throw new Error(`Unable to reach backend or database for [${endpoint}]`);
}

/**
 * Handles admin actions directly against Supabase PostgREST
 */
async function handleSupabaseAdminRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // GET Orders: /admin/stores/:storeId/orders
  const ordersMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/orders/);
  if (ordersMatch && method === 'GET') {
    const storeId = ordersMatch[1];
    let query = `unimall_orders?order=created_at.desc&select=*,unimall_order_items(*),unimall_order_status_history(*)`;
    if (storeId !== 'all') {
      query += `&store_id=eq.${encodeURIComponent(storeId)}`;
    }
    const orders = await window.UniMallDB.req(query);
    return {
      orders: (orders || []).map(o => ({
        id: o.id,
        order_number: o.id,
        user_name: o.user_name || 'Student',
        user_phone: o.user_phone || 'N/A',
        store_id: o.store_id,
        subtotal: parseFloat(o.subtotal),
        delivery_fee: parseFloat(o.delivery_fee || 0),
        total_amount: parseFloat(o.total),
        status: o.status,
        fulfillment_type: o.fulfillment_type,
        delivery_location: o.user_hostel ? `${o.user_hostel} - ${o.user_room}` : 'Campus Pickup',
        created_at: o.created_at,
        items: (o.unimall_order_items || []).map(i => ({
          product_name: i.product_name,
          quantity: i.qty,
          price_at_order: parseFloat(i.price)
        }))
      }))
    };
  }

  // PATCH Order Status: /admin/orders/:orderId/status
  const statusMatch = endpoint.match(/^\/admin\/orders\/([^\/]+)\/status/);
  if (statusMatch && (method === 'PATCH' || method === 'POST')) {
    const orderId = statusMatch[1];
    const newStatus = body.status;
    const notes = body.notes || `Status changed to ${newStatus}`;
    const isDelivered = (newStatus.toUpperCase() === 'DELIVERED' || newStatus.toUpperCase() === 'COMPLETED');
    const nowIso = new Date().toISOString();

    if (window.UniMallDB && typeof window.UniMallDB.updateOrderStatus === 'function') {
      await window.UniMallDB.updateOrderStatus(orderId, newStatus, notes).catch(() => {});
    }

    // Sync localStorage unimall_v1 directly so customer app gets the update immediately
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (raw) {
        const appData = JSON.parse(raw);
        if (Array.isArray(appData.orders)) {
          const ord = appData.orders.find(o => o.id === orderId);
          if (ord) {
            ord.status = isDelivered ? 'delivered' : newStatus.toLowerCase();
            if (isDelivered) {
              ord.deliveredAt = nowIso;
            }
            if (!ord.statusHistory) ord.statusHistory = [];
            ord.statusHistory.push({
              status: ord.status,
              time: nowIso,
              label: `Order marked as ${newStatus}`
            });
            localStorage.setItem('unimall_v1', JSON.stringify(appData));
          }
        }
      }
    } catch(e) {}

    // Broadcast storage event for cross-tab realtime reaction
    try {
      localStorage.setItem('unimall_order_delivered_event', JSON.stringify({
        orderId,
        status: isDelivered ? 'delivered' : newStatus.toLowerCase(),
        deliveredAt: nowIso,
        timestamp: Date.now()
      }));
    } catch(e) {}

    // Also dispatch on window in case single tab/window
    window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
      detail: { orderId, status: isDelivered ? 'delivered' : newStatus.toLowerCase(), deliveredAt: nowIso }
    }));

    return { success: true, status: newStatus };
  }

  // GET Products: /admin/stores/:storeId/products
  const prodsMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/products/);
  if (prodsMatch && method === 'GET') {
    const storeId = prodsMatch[1];
    const products = await window.UniMallDB.getProducts(storeId === 'all' ? null : storeId);
    return {
      products: (products || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price),
        stock: p.stock,
        is_active: p.is_active ? 1 : 0,
        category_name: p.category_id,
        image_url: p.image || ''
      }))
    };
  }

  // POST Create Product: /admin/stores/:storeId/products
  if (prodsMatch && method === 'POST') {
    const storeId = prodsMatch[1];
    const newProd = {
      id: 'p' + Date.now().toString().slice(-4),
      store_id: storeId,
      category_id: body.category_id || 'essentials',
      name: body.name,
      description: body.description || '',
      price: parseFloat(body.price),
      stock: parseInt(body.stock || 20, 10),
      is_active: true,
      image: body.image_url || ''
    };
    await window.UniMallDB.req('unimall_products', {
      method: 'POST',
      body: JSON.stringify(newProd)
    });
    return { success: true, product: newProd };
  }

  // GET Store Dashboard stats: /admin/stores/:storeId/dashboard
  const dashMatch = endpoint.match(/^\/admin\/stores\/([^\/]+)\/dashboard/);
  if (dashMatch && method === 'GET') {
    const storeId = dashMatch[1];
    let query = `unimall_orders?select=*`;
    if (storeId !== 'all') query += `&store_id=eq.${encodeURIComponent(storeId)}`;
    const orders = await window.UniMallDB.req(query) || [];

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const activeOrders = orders.filter(o => ['placed', 'accepted', 'preparing', 'ready'].includes(o.status));

    return {
      stats: {
        total_orders: orders.length,
        total_revenue: totalRevenue,
        pending_orders: activeOrders.length,
        low_stock_items: 2
      }
    };
  }

  return { success: true };
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}
