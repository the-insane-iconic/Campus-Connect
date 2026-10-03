/**
 * UniMall Merchant Portal — Isolated Store Authentication & Context Controller (merchant/js/merchant-auth.js)
 * STRICT ISOLATION: A merchant can ONLY access and operate their own store.
 * Absolutely no store-switching is permitted.
 */

'use strict';

var currentMerchantUser = null;
var merchantStoreId = null;
var merchantStoreData = null;

window.currentMerchantUser = null;
window.merchantStoreId = null;
window.activeStoreId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('unimall_admin_token');
  if (!token) {
    window.location.replace('/admin/login.html');
    return;
  }

  const rawUser = sessionStorage.getItem('unimall_admin_user');
  if (!rawUser) {
    window.location.replace('/admin/login.html');
    return;
  }

  try {
    currentMerchantUser = JSON.parse(rawUser);
    window.currentMerchantUser = currentMerchantUser;

    // Security Gate: If Platform Admin opens the merchant URL, route to Platform Admin HQ
    if (currentMerchantUser.role === 'platform_admin' || currentMerchantUser.role === 'admin' || currentMerchantUser.email === 'anupamyadav6477@gmail.com') {
      console.info('[Merchant Guard] Platform administrator detected. Redirecting to Executive HQ…');
      window.location.replace('/admin/index.html');
      return;
    }

    // Single-Store Strict Isolation Lock
    merchantStoreId = currentMerchantUser.store_id;
    if (!merchantStoreId) {
      // Check cached stores if store_id wasn't on user object
      const cachedStores = JSON.parse(sessionStorage.getItem('unimall_admin_stores') || '[]');
      if (cachedStores.length > 0) {
        merchantStoreId = cachedStores[0].store_id;
      }
    }

    if (!merchantStoreId) {
      alert('Error: No campus store is assigned to this merchant account. Please contact campus admin.');
      sessionStorage.clear();
      window.location.replace('/admin/login.html');
      return;
    }

    // Permanently lock activeStoreId to this merchant's store
    window.merchantStoreId = merchantStoreId;
    window.activeStoreId = merchantStoreId;
    sessionStorage.setItem('unimall_admin_active_store', merchantStoreId);

    // Fetch authoritative store metadata from Neon PostgreSQL
    await loadMerchantStoreData();

    setupMerchantProfileUI();
    setupMerchantNavigation();
    setupMerchantStoreToggle();
    setupMerchantLogout();

    document.documentElement.classList.remove('auth-checking');

    // Default view: dashboard
    switchMerchantView('dashboard');

  } catch (err) {
    console.error('[Merchant Auth] Failed to initialize merchant session:', err);
    sessionStorage.clear();
    window.location.replace('/admin/login.html');
  }
});

async function loadMerchantStoreData() {
  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStore === 'function') {
    try {
      merchantStoreData = await window.UniMallDB.getStore(merchantStoreId);
    } catch (e) {
      console.warn('[Merchant Auth] DB store fetch warning:', e.message);
    }
  }

  if (!merchantStoreData) {
    merchantStoreData = {
      id: merchantStoreId,
      name: currentMerchantUser.name || 'Campus Store',
      category: 'General Store',
      is_open: true
    };
  }
}

function setupMerchantProfileUI() {
  const storeName = merchantStoreData?.name || currentMerchantUser.name || 'Campus Store';
  const storeCategory = merchantStoreData?.category || 'Retail';
  const initial = storeName.charAt(0).toUpperCase();

  // Topbar store badge
  const tbAvatar = document.getElementById('tb-store-avatar');
  const tbName = document.getElementById('tb-store-name');
  const tbCat = document.getElementById('tb-store-category');
  if (tbAvatar) tbAvatar.textContent = initial;
  if (tbName) tbName.textContent = storeName;
  if (tbCat) tbCat.textContent = storeCategory;

  // Sidebar store badge
  const sbAvatar = document.getElementById('sidebar-store-avatar');
  const sbName = document.getElementById('sidebar-store-name');
  if (sbAvatar) sbAvatar.textContent = initial;
  if (sbName) sbName.textContent = storeName;

  // Sidebar user footer
  const userName = document.getElementById('sidebar-user-name');
  const userRole = document.getElementById('sidebar-user-role');
  const userAvatar = document.getElementById('sidebar-user-avatar');
  if (userName) userName.textContent = currentMerchantUser.name || storeName + ' Manager';
  if (userRole) userRole.textContent = 'Store Owner';
  if (userAvatar) userAvatar.textContent = (currentMerchantUser.name || 'M').charAt(0).toUpperCase();

  // Storefront preview link
  const storefrontLink = document.getElementById('btn-storefront-link');
  if (storefrontLink) {
    storefrontLink.href = `/store.html?store=${encodeURIComponent(merchantStoreId)}`;
  }

  updateStoreOpenStatusUI(merchantStoreData?.is_open);
}

function updateStoreOpenStatusUI(isOpen) {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  const statusText = document.getElementById('topbar-status-text');
  const sbStatus = document.getElementById('sidebar-store-status');

  const openState = Boolean(isOpen);
  if (btnToggle) {
    btnToggle.classList.toggle('open', openState);
    btnToggle.classList.toggle('closed', !openState);
  }
  if (statusText) {
    statusText.textContent = openState ? 'Store Open' : 'Store Closed';
  }
  if (sbStatus) {
    sbStatus.textContent = openState ? '● Open' : '○ Closed';
    sbStatus.style.color = openState ? '#059669' : '#DC2626';
  }
}

function setupMerchantStoreToggle() {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  if (!btnToggle) return;

  btnToggle.addEventListener('click', async () => {
    btnToggle.disabled = true;
    const currentIsOpen = btnToggle.classList.contains('open');
    const newIsOpen = !currentIsOpen;

    try {
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.updateStoreStatus === 'function') {
        await window.UniMallDB.updateStoreStatus(merchantStoreId, newIsOpen);
      }
      if (merchantStoreData) merchantStoreData.is_open = newIsOpen;
      updateStoreOpenStatusUI(newIsOpen);
    } catch (err) {
      console.error('[Merchant] Failed to update store status:', err);
      alert('Could not update store status: ' + err.message);
    } finally {
      btnToggle.disabled = false;
    }
  });
}

function setupMerchantNavigation() {
  const navItems = document.querySelectorAll('.sidebar .nav-item[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchMerchantView(view);
    });
  });
}

function switchMerchantView(viewName) {
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  const views = ['dashboard', 'orders', 'products', 'store', 'analytics', 'requests'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      el.classList.toggle('hidden', v !== viewName);
    }
  });

  // Call view loaders
  if (viewName === 'dashboard' && typeof window.loadMerchantDashboard === 'function') {
    window.loadMerchantDashboard();
  } else if (viewName === 'orders' && typeof window.loadMerchantOrders === 'function') {
    window.loadMerchantOrders();
  } else if (viewName === 'products' && typeof window.loadMerchantProducts === 'function') {
    window.loadMerchantProducts();
  } else if (viewName === 'store' && typeof window.loadMerchantSettings === 'function') {
    window.loadMerchantSettings();
  } else if (viewName === 'analytics' && typeof window.loadMerchantAnalytics === 'function') {
    window.loadMerchantAnalytics();
  } else if (viewName === 'requests' && typeof window.loadMerchantRequests === 'function') {
    window.loadMerchantRequests();
  }
}
window.switchMerchantView = switchMerchantView;

function setupMerchantLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out of your merchant portal?')) {
        sessionStorage.clear();
        window.location.replace('/admin/login.html');
      }
    });
  }
}
