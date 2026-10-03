/**
 * UniMall Merchant Portal — Isolated Authentication & Navigation Controller (merchant/js/auth.js)
 * STRICT SINGLE-STORE ISOLATION: A merchant can ONLY access and operate their assigned store.
 * Absolutely no store-switching is permitted.
 */

'use strict';

var currentAdminUser = null;
var currentMerchantUser = null;
var activeStoreId = null;
var currentAuthorizedStores = [];
var merchantStoreData = null;

window.activeStoreId = null;
window.merchantStoreId = null;
window.currentAdminUser = null;
window.currentMerchantUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('unimall_admin_token');
  if (!token) {
    window.location.replace('/admin/login.html');
    return;
  }

  try {
    let meData;
    try {
      meData = await apiRequest('/auth/me');
    } catch (e) {
      const cachedUser = sessionStorage.getItem('unimall_admin_user');
      const cachedStores = sessionStorage.getItem('unimall_admin_stores');
      if (cachedUser) {
        meData = {
          user: JSON.parse(cachedUser),
          stores: cachedStores ? JSON.parse(cachedStores) : []
        };
      } else {
        throw e;
      }
    }

    currentAdminUser = meData.user;
    currentMerchantUser = meData.user;
    window.currentAdminUser = currentAdminUser;
    window.currentMerchantUser = currentMerchantUser;

    // Security Gate: If Platform Admin opens the merchant URL, route to Platform Admin HQ
    if (currentAdminUser.role === 'platform_admin' || currentAdminUser.role === 'admin' || (currentAdminUser.email && currentAdminUser.email.toLowerCase() === 'anupamyadav6477@gmail.com')) {
      console.info('[Merchant Guard] Platform administrator detected. Redirecting to Executive HQ…');
      window.location.replace('/admin/index.html');
      return;
    }

    // Single-Store Strict Isolation Lock
    activeStoreId = currentAdminUser.store_id;
    if (!activeStoreId && meData.stores && meData.stores.length > 0) {
      activeStoreId = meData.stores[0].store_id;
    }

    if (!activeStoreId) {
      alert('Error: No campus store is assigned to this merchant account. Please contact campus admin.');
      sessionStorage.clear();
      window.location.replace('/admin/login.html');
      return;
    }

    // Permanently lock activeStoreId to this merchant's store
    window.activeStoreId = activeStoreId;
    window.merchantStoreId = activeStoreId;
    sessionStorage.setItem('unimall_admin_active_store', activeStoreId);

    // Provide single store in currentAuthorizedStores
    currentAuthorizedStores = [{
      store_id: activeStoreId,
      store_name: currentAdminUser.name || 'Campus Store',
      membership_role: 'owner'
    }];
    window.currentAuthorizedStores = currentAuthorizedStores;

    window.getActiveStoreId = function() {
      return activeStoreId;
    };

    window.getCurrentAdminUser = function() {
      return currentAdminUser;
    };

    // Fetch authoritative store metadata from Neon PostgreSQL
    await loadMerchantStoreMetadata();

    setupUserProfile();
    setupNavigation();
    setupMobileDrawer();
    setupStoreToggle();
    setupSoundToggle();
    setupLogout();

    // Remove auth cloak now that session is authenticated
    document.documentElement.classList.remove('auth-checking');

    // Trigger initial view load (Dashboard)
    switchView('dashboard');

  } catch (err) {
    console.error('[Merchant Auth] Session initialization failed:', err);
    sessionStorage.clear();
    window.location.replace('/admin/login.html');
  }
});

async function loadMerchantStoreMetadata() {
  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStore === 'function') {
    try {
      merchantStoreData = await window.UniMallDB.getStore(activeStoreId);
    } catch (e) {
      console.warn('[Merchant Auth] DB store fetch warning:', e.message);
    }
  }

  if (!merchantStoreData) {
    merchantStoreData = {
      id: activeStoreId,
      name: currentAdminUser.name || 'Campus Store',
      category: 'General Store',
      is_open: true
    };
  }

  if (currentAuthorizedStores && currentAuthorizedStores[0]) {
    currentAuthorizedStores[0].store_name = merchantStoreData.name || currentAuthorizedStores[0].store_name;
  }
}

function setupUserProfile() {
  const storeName = merchantStoreData?.name || currentAdminUser.name || 'Campus Store';
  const storeCategory = merchantStoreData?.category || 'Retail';
  const initial = storeName.charAt(0).toUpperCase();

  // Topbar store badge (No store switcher)
  const tbAvatar = document.getElementById('tb-store-avatar');
  const tbName = document.getElementById('tb-store-name');
  const tbCat = document.getElementById('tb-store-category');
  if (tbAvatar) tbAvatar.textContent = initial;
  if (tbName) tbName.textContent = storeName;
  if (tbCat) tbCat.textContent = storeCategory;

  // Sidebar store badge
  const sbAvatar = document.getElementById('sidebar-store-avatar');
  const sbName = document.getElementById('sidebar-store-name');
  const sbStatus = document.getElementById('sidebar-store-status');
  if (sbAvatar) sbAvatar.textContent = initial;
  if (sbName) sbName.textContent = storeName;
  if (sbStatus) {
    const isOpen = Boolean(merchantStoreData?.is_open);
    sbStatus.textContent = isOpen ? '● Open' : '○ Closed';
    sbStatus.style.color = isOpen ? '#16A34A' : '#DC2626';
  }

  // Sidebar user footer
  const userName = document.getElementById('sidebar-user-name');
  const userRole = document.getElementById('sidebar-user-role');
  const userAvatar = document.getElementById('sidebar-user-avatar');
  if (userName) userName.textContent = currentAdminUser.name || storeName + ' Manager';
  if (userRole) userRole.textContent = 'Store Owner';
  if (userAvatar) userAvatar.textContent = (currentAdminUser.name || 'M').charAt(0).toUpperCase();

  // Storefront preview link
  const storefrontLink = document.getElementById('btn-storefront-link');
  if (storefrontLink) {
    storefrontLink.href = `/store.html?store=${encodeURIComponent(activeStoreId)}`;
  }

  updateStoreOpenStatusUI(merchantStoreData?.is_open);
}

function updateStoreOpenStatusUI(isOpen) {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  const statusText = document.getElementById('topbar-status-text');
  const sbStatus = document.getElementById('sidebar-store-status');
  const settingsIndicator = document.getElementById('settings-status-indicator');
  const settingsHeading = document.getElementById('settings-status-heading');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle-open');

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
    sbStatus.style.color = openState ? '#16A34A' : '#DC2626';
  }
  if (settingsIndicator) {
    settingsIndicator.style.background = openState ? '#16A34A' : '#DC2626';
  }
  if (settingsHeading) {
    settingsHeading.textContent = openState ? 'Store is Online & Accepting Orders' : 'Store is Temporarily Paused';
  }
  if (btnSettingsToggle) {
    btnSettingsToggle.textContent = openState ? '⏸ Pause Store (Go Offline)' : '▶ Resume Store (Go Online)';
  }
}

function setupStoreToggle() {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle-open');

  async function toggleStatus() {
    const currentIsOpen = Boolean(merchantStoreData?.is_open);
    const newIsOpen = !currentIsOpen;

    try {
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.updateStoreStatus === 'function') {
        await window.UniMallDB.updateStoreStatus(activeStoreId, newIsOpen);
      }
      if (merchantStoreData) merchantStoreData.is_open = newIsOpen;
      updateStoreOpenStatusUI(newIsOpen);
    } catch (err) {
      console.error('[Merchant] Failed to update store status:', err);
      alert('Could not update store status: ' + err.message);
    }
  }

  if (btnToggle) btnToggle.addEventListener('click', toggleStatus);
  if (btnSettingsToggle) btnSettingsToggle.addEventListener('click', toggleStatus);
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
      closeMobileDrawer();
    });
  });

  // Mobile bottom bar links
  document.querySelectorAll('.admin-mobile-nav .mobile-nav-item[data-view], .mobile-nav-item[data-view], .mob-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
      closeMobileDrawer();
    });
  });
}

function switchView(viewName) {
  // 1. Update sidebar active item
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });
  // 1b. Update mobile bottom nav active item
  document.querySelectorAll('.admin-mobile-nav .mobile-nav-item, .mobile-nav-item, .mob-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  // 2. Toggle .active class on .admin-view sections (Required by admin.css!)
  const views = ['dashboard', 'orders', 'products', 'store', 'analytics', 'requests'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      el.classList.toggle('active', v === viewName);
    }
  });

  // 3. Trigger view-specific loaders
  if (viewName === 'dashboard') {
    if (typeof window.loadDashboard === 'function') window.loadDashboard(activeStoreId);
  } else if (viewName === 'orders') {
    if (typeof window.loadOrders === 'function') window.loadOrders(activeStoreId);
  } else if (viewName === 'products') {
    if (typeof window.loadProductsAndStock === 'function') window.loadProductsAndStock(activeStoreId);
  } else if (viewName === 'store') {
    if (typeof window.loadStoreSettings === 'function') window.loadStoreSettings(activeStoreId);
  } else if (viewName === 'analytics') {
    if (typeof window.loadAnalytics === 'function') window.loadAnalytics(activeStoreId);
  }

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchView = switchView;

function setupSoundToggle() {
  const btn = document.getElementById('btn-sound-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const isMuted = btn.classList.contains('sound-off');
    btn.classList.toggle('sound-off', !isMuted);
    btn.classList.toggle('sound-on', isMuted);
    btn.querySelector('.icon-sound-on')?.classList.toggle('hidden', !isMuted);
    btn.querySelector('.icon-sound-off')?.classList.toggle('hidden', isMuted);
    sessionStorage.setItem('unimall_order_sound_muted', isMuted ? 'false' : 'true');
  });
}

function setupMobileDrawer() {
  const btnMenu = document.getElementById('btn-mobile-menu');
  const btnClose = document.getElementById('btn-close-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const sidebar = document.getElementById('merchant-sidebar') || document.getElementById('admin-sidebar');

  if (btnMenu && sidebar) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
      sidebar.classList.toggle('drawer-open');
      if (backdrop) {
        backdrop.classList.toggle('open');
        backdrop.classList.toggle('visible');
      }
    });
  }

  function closeMobileDrawer() {
    if (sidebar) {
      sidebar.classList.remove('open');
      sidebar.classList.remove('drawer-open');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.classList.remove('visible');
    }
  }
  window.closeMobileDrawer = closeMobileDrawer;

  if (btnClose) btnClose.addEventListener('click', closeMobileDrawer);
  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);
}

function setupLogout() {
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
