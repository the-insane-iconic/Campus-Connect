/**
 * UniMall Store Admin — Authentication & Context Controller (admin/js/auth.js)
 */

'use strict';

var currentAdminUser = null;
var currentAuthorizedStores = [];
var activeStoreId = null;
window.activeStoreId = null;
window.currentAdminUser = null;
window.currentAuthorizedStores = [];

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('unimall_admin_token') || localStorage.getItem('unimall_admin_token');
  if (!token) {
    window.location.href = '../login/';
    return;
  }
  document.documentElement.classList.remove('auth-checking');

  try {
    let meData;
    try {
      meData = await apiRequest('/auth/me');
    } catch (e) {
      const cachedUser = sessionStorage.getItem('unimall_admin_user') || localStorage.getItem('unimall_admin_user');
      const cachedStores = sessionStorage.getItem('unimall_admin_stores') || localStorage.getItem('unimall_admin_stores');
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
    currentAuthorizedStores = meData.stores || [];
    window.currentAdminUser = currentAdminUser;
    window.currentAuthorizedStores = currentAuthorizedStores;

    // Strict Security Guard: Platform Admin only! If a merchant accesses /admin, route to /merchant/
    const isPlatform = (currentAdminUser && (
      currentAdminUser.role === 'platform_admin' ||
      currentAdminUser.role === 'admin' ||
      currentAdminUser.role === 'superadmin' ||
      (currentAdminUser.email && currentAdminUser.email.toLowerCase() === 'anupamyadav6477@gmail.com') ||
      currentAdminUser.name === 'Campus Connect Admin'
    ));

    if (!isPlatform) {
      console.info('[Admin Guard] Merchant detected in admin area. Redirecting to ../merchant/index.html…');
      window.location.replace('../merchant/index.html');
      return;
    }

    // Force role to platform_admin for consistent downstream behavior
    currentAdminUser.role = 'platform_admin';
    window.activeStoreId = 'all';
    activeStoreId = 'all';
    sessionStorage.setItem('unimall_admin_active_store', 'all');

    window.getCurrentAdminUser = function() {
      if (window.currentAdminUser) return window.currentAdminUser;
      if (typeof currentAdminUser !== 'undefined' && currentAdminUser) return currentAdminUser;
      try {
        const raw = sessionStorage.getItem('unimall_admin_user');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    };

    setupUserProfile();
    setupStoreContext();
    setupNavigation();
    setupMobileDrawer();
    setupStoreToggle();
    setupLogout();
    setupInactivityGuard();

    // Remove auth cloak now that session is authenticated
    document.documentElement.classList.remove('auth-checking');

    // Trigger initial view load
    switchView('dashboard');
  } catch (err) {
    console.error('Session initialization failed:', err);
    sessionStorage.removeItem('unimall_admin_token');
    sessionStorage.removeItem('unimall_admin_user');
    sessionStorage.removeItem('unimall_admin_stores');
    sessionStorage.removeItem('unimall_admin_active_store');
    window.location.replace('../login/');
  }
});

function setupUserProfile() {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  const isPlatform = (currentAdminUser && currentAdminUser.role === 'platform_admin');

  if (nameEl) nameEl.textContent = (currentAdminUser && currentAdminUser.name) ? currentAdminUser.name : (isPlatform ? 'Admin' : 'Store Manager');
  if (roleEl) {
    roleEl.textContent = isPlatform ? 'Platform Superadmin' : 'Store Owner';
  }
  if (avatarEl && currentAdminUser && currentAdminUser.name) {
    avatarEl.textContent = currentAdminUser.name.charAt(0).toUpperCase();
  }

  // Configure Navigation based on Role
  const opsLabel = document.getElementById('label-ops-group');
  const dashLabel = document.getElementById('nav-dash-label');
  const ordersLabel = document.getElementById('nav-orders-label');
  const founderNav = document.getElementById('nav-founder');
  const settingsLabel = document.getElementById('label-settings-group');
  const analyticsLabel = document.getElementById('nav-analytics-label');
  const requestsLabel = document.getElementById('nav-requests-label');

  if (isPlatform) {
    // ── Platform Admin Experience (Isolated Campus Control HQ) ──
    if (opsLabel) opsLabel.textContent = 'CAMPUS OPERATIONS';
    if (dashLabel) dashLabel.textContent = 'Platform Overview';
    if (ordersLabel) ordersLabel.textContent = 'All Campus Orders';
    if (founderNav) founderNav.classList.remove('hidden');

    document.querySelectorAll('.store-only-nav').forEach(el => el.classList.add('hidden'));

    if (settingsLabel) {
      settingsLabel.classList.remove('hidden');
      settingsLabel.textContent = 'CAMPUS INTELLIGENCE';
    }
    if (analyticsLabel) analyticsLabel.textContent = 'Deep Analytics';
    if (requestsLabel) requestsLabel.textContent = 'Student Demand';

    // Branding
    const brandLabel = document.getElementById('brand-portal-label');
    if (brandLabel) brandLabel.textContent = 'Platform Admin';

    // Role-based visibility: show platform-admin sections, hide merchant sections
    document.body.classList.remove('role-merchant');
    document.body.classList.add('role-platform_admin');
    document.querySelectorAll('.platform-admin-only').forEach(el => {
      el.style.display = '';
      el.classList.remove('hidden');
    });
    document.querySelectorAll('.merchant-only').forEach(el => {
      el.style.display = 'none';
    });

    // Configure Platform Admin specific metric labels
    const lblSales = document.getElementById('lbl-dash-sales');
    const lblCustomers = document.getElementById('lbl-dash-customers');
    const lblOrders = document.getElementById('lbl-dash-orders');
    const lblPayout = document.getElementById('lbl-dash-payout');
    const subSales = document.getElementById('sub-dash-sales');
    const subCustomers = document.getElementById('sub-dash-customers');
    const subOrders = document.getElementById('sub-dash-orders');
    const subPayout = document.getElementById('sub-dash-payout');

    if (lblSales) lblSales.textContent = "Today's Campus GMV";
    if (lblCustomers) lblCustomers.textContent = 'Active Customers';
    if (lblOrders) lblOrders.textContent = 'Total Campus Orders';
    if (lblPayout) lblPayout.textContent = 'Platform Commission';
    if (subSales) subSales.textContent = 'Cumulative campus sales today';
    if (subCustomers) subCustomers.textContent = 'Students ordering across campus';
    if (subOrders) subOrders.textContent = 'Orders across all stores';
    if (subPayout) subPayout.textContent = 'Platform commission revenue';
  } else {
    // ── Merchant / Single Store Owner Experience ──
    document.body.classList.remove('role-platform_admin');
    document.body.classList.add('role-merchant');
    if (opsLabel) opsLabel.textContent = 'MY STORE';
    if (dashLabel) dashLabel.textContent = 'Store Dashboard';
    if (founderNav) founderNav.classList.add('hidden');

    const ordersLabel = document.getElementById('nav-orders-label');
    if (ordersLabel) ordersLabel.textContent = 'Live Orders';
    const navOrders = document.getElementById('nav-orders');
    if (navOrders) navOrders.style.display = '';
    const mobNavOrders = document.getElementById('mob-nav-orders');
    if (mobNavOrders) mobNavOrders.style.display = '';

    document.querySelectorAll('.store-only-nav').forEach(el => el.classList.remove('hidden'));

    if (settingsLabel) {
      settingsLabel.classList.remove('hidden');
      settingsLabel.textContent = 'STORE SETTINGS';
    }
    if (analyticsLabel) analyticsLabel.textContent = 'Store Analytics';
    if (requestsLabel) requestsLabel.textContent = 'Product Requests';

    // Branding
    const brandLabel = document.getElementById('brand-portal-label');
    if (brandLabel) brandLabel.textContent = 'Merchant Dashboard';

    // Role-based visibility: hide platform-admin sections, show merchant sections
    document.querySelectorAll('.platform-admin-only').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.merchant-only').forEach(el => {
      el.style.display = 'block';
    });

    // Update merchant-specific metric labels
    const lblSales = document.getElementById('lbl-dash-sales');
    const lblCustomers = document.getElementById('lbl-dash-customers');
    const lblOrders = document.getElementById('lbl-dash-orders');
    const lblPayout = document.getElementById('lbl-dash-payout');
    const subSales = document.getElementById('sub-dash-sales');
    const subCustomers = document.getElementById('sub-dash-customers');
    const subOrders = document.getElementById('sub-dash-orders');
    const subPayout = document.getElementById('sub-dash-payout');

    if (lblSales) lblSales.textContent = "Today's Revenue";
    if (lblCustomers) lblCustomers.textContent = 'My Customers';
    if (lblOrders) lblOrders.textContent = 'Orders Received';
    if (lblPayout) lblPayout.textContent = 'My Earnings';
    if (subSales) subSales.textContent = 'Your store sales today';
    if (subCustomers) subCustomers.textContent = 'Students who ordered from you';
    if (subOrders) subOrders.textContent = 'Orders placed at your store';
    if (subPayout) subPayout.textContent = 'Net earnings after platform fee';
  }
}

function setupStoreContext() {
  const selectorWrapper = document.getElementById('store-selector-wrapper');
  const platformPill = document.getElementById('platform-control-pill');

  activeStoreId = 'all';
  window.activeStoreId = 'all';
  sessionStorage.setItem('unimall_admin_active_store', 'all');

  // Permanently remove store switcher in Platform Admin HQ
  if (selectorWrapper) selectorWrapper.style.display = 'none';
  if (platformPill) platformPill.classList.remove('hidden');

  updateStoreDisplay();
}

function setActiveStore(storeId) {
  if (!storeId) return;
  activeStoreId = storeId;
  window.activeStoreId = storeId;
  sessionStorage.setItem('unimall_admin_active_store', storeId);
  updateStoreDisplay();

  // Dispatch custom event so modules reload for the new store
  window.dispatchEvent(new CustomEvent('unimall:storeChanged', { detail: { storeId } }));
}

window.getActiveStoreId = function() {
  if (currentAdminUser && currentAdminUser.role === 'platform_admin') {
    return 'all';
  }
  return window.activeStoreId || activeStoreId || sessionStorage.getItem('unimall_admin_active_store') || 'all';
};

function updateStoreDisplay() {
  const currentStore = currentAuthorizedStores.find(s => s.store_id === activeStoreId);
  const storeName = currentStore ? currentStore.store_name : 'Campus Connect';
  const isPlatformUser = (currentAdminUser && currentAdminUser.role === 'platform_admin');
  const isPlatformMode = (activeStoreId === 'all') || isPlatformUser;

  // Update sidebar store badge
  const sidebarStoreName = document.getElementById('sidebar-store-name');
  const sidebarStoreAvatar = document.getElementById('sidebar-store-avatar');
  const sidebarStoreStatus = document.getElementById('sidebar-store-status');

  if (isPlatformMode) {
    if (sidebarStoreName) sidebarStoreName.textContent = 'Campus Connect Platform';
    if (sidebarStoreAvatar) sidebarStoreAvatar.textContent = '🏢';
    if (sidebarStoreStatus) sidebarStoreStatus.textContent = '● Platform HQ';
  } else {
    if (sidebarStoreName) sidebarStoreName.textContent = storeName;
    if (sidebarStoreAvatar) sidebarStoreAvatar.textContent = (storeName.includes('Café') || storeName.includes('Cafe')) ? '☕' : '🏬';
    if (sidebarStoreStatus) sidebarStoreStatus.textContent = '● Store View';
  }

  // Sync open/closed toggle button to the active store's state
  const btnToggle = document.getElementById('btn-store-status-toggle');
  if (isPlatformMode) {
    if (btnToggle) {
      btnToggle.className = 'btn-status-toggle open';
      const label = document.getElementById('topbar-status-text');
      if (label) label.textContent = 'Platform Live';
    }
  } else {
    const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
    const isOpen = storeStatuses[activeStoreId] !== false; // default to open
    applyStoreOpenState(isOpen);
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewName = btn.getAttribute('data-view');
      switchView(viewName);

      // Close mobile drawer if open
      closeMobileDrawer();
    });
  });

  // Header modal close triggers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
    });
  });
}

function switchView(viewName) {
  // CIA Triad: RBAC Route Guard
  const isPlatformUser = (currentAdminUser && currentAdminUser.role === 'platform_admin');
  if (viewName === 'founder' && !isPlatformUser) {
    if (typeof showToast === 'function') {
      showToast('Access restricted: Platform Superadmin credentials required.', 'error');
    }
    viewName = 'dashboard';
  }

  // Redirect inventory view to merged products view
  if (viewName === 'inventory') {
    viewName = 'products';
  }

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  // Update mobile bottom nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  // Toggle view visibility
  document.querySelectorAll('.admin-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });

  // Smooth scroll to top for mobile
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Notify modules to load data for the view
  window.dispatchEvent(new CustomEvent('unimall:viewChanged', { detail: { viewName, storeId: activeStoreId } }));
}
window.switchView = switchView;

function setupMobileDrawer() {
  const btnMenu = document.getElementById('btn-mobile-menu');
  const btnClose = document.getElementById('btn-close-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const sidebar = document.getElementById('admin-sidebar');

  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeMobileDrawer);
  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);
}

function closeMobileDrawer() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('drawer-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function setupStoreToggle() {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  if (!btnToggle) return;

  // Load initial state from localStorage
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  if (activeStoreId && storeStatuses[activeStoreId] !== undefined) {
    applyStoreOpenState(storeStatuses[activeStoreId]);
  }

  btnToggle.addEventListener('click', async () => {
    if (!activeStoreId) return;

    // Get current state & toggle
    const currentStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
    const currentlyOpen = currentStatuses[activeStoreId] !== false; // default to open
    const newState = !currentlyOpen;

    try {
      btnToggle.disabled = true;

      // Try API first
      const res = await apiRequest(`/admin/stores/${activeStoreId}/toggle-open`, { method: 'POST' });
      applyStoreOpenState(res.is_open === 1);
      syncStoreStatusToUserApp(activeStoreId, res.is_open === 1);
      showToast(res.is_open === 1 ? 'Store is now OPEN to students' : 'Store is now CLOSED', 'success');
    } catch {
      // Fallback — direct toggle via localStorage
      applyStoreOpenState(newState);
      syncStoreStatusToUserApp(activeStoreId, newState);
      showToast(newState ? 'Store is now OPEN to students' : 'Store is now CLOSED', 'success');
    } finally {
      btnToggle.disabled = false;
    }
  });
}

function applyStoreOpenState(isOpen) {
  const btnToggle = document.getElementById('btn-store-status-toggle');
  const label = document.getElementById('topbar-status-text');
  const sidebarStatus = document.getElementById('sidebar-store-status');

  if (btnToggle && label) {
    if (isOpen) {
      btnToggle.className = 'btn-status-toggle open';
      label.textContent = 'Store Open';
    } else {
      btnToggle.className = 'btn-status-toggle closed';
      label.textContent = 'Store Closed';
    }
  }

  if (sidebarStatus) {
    if (isOpen) {
      sidebarStatus.className = 'store-badge-status';
      sidebarStatus.textContent = '● Open';
    } else {
      sidebarStatus.className = 'store-badge-status closed';
      sidebarStatus.textContent = '○ Closed';
    }
  }
}

function setupLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', async () => {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout request errors
      } finally {
        sessionStorage.removeItem('unimall_admin_token');
        sessionStorage.removeItem('unimall_admin_user');
        sessionStorage.removeItem('unimall_admin_stores');
        sessionStorage.removeItem('unimall_admin_active_store');
        window.location.href = '../login/';
      }
    });
  }
}

function syncStoreStatusToUserApp(storeId, isOpen) {
  // 1. Update dedicated store statuses map
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  storeStatuses[storeId] = isOpen;

  // Map aliases so all versions of the store ID sync together
  const aliasMap = {
    'campus-cafe': ['store-bakery', 'campus-cafe'],
    'book-corner': ['store-stationery', 'book-corner'],
    'techstop': ['store-electronics', 'techstop'],
    'campus-mart': ['store-sports', 'campus-mart'],
    'campus-wear': ['store-fashion', 'campus-wear'],
    'health-hub': ['store-pharmacy', 'health-hub']
  };
  const targets = aliasMap[storeId] || [storeId];
  targets.forEach(id => {
    storeStatuses[id] = isOpen;
  });
  localStorage.setItem('unimall_store_statuses', JSON.stringify(storeStatuses));

  // 2. Update unimall_v1 app data if present
  try {
    const raw = localStorage.getItem('unimall_v1');
    if (raw) {
      const appData = JSON.parse(raw);
      if (appData.stores && Array.isArray(appData.stores)) {
        appData.stores.forEach(s => {
          if (targets.includes(s.id)) {
            s.openNow = isOpen;
          }
        });
        localStorage.setItem('unimall_v1', JSON.stringify(appData));
      }
    }
  } catch(e) {}

  // 3. Dispatch local event
  window.dispatchEvent(new CustomEvent('unimall:storeStatusChanged', {
    detail: { storeId, isOpen }
  }));

  // 4. Cross-tab event
  try {
    localStorage.setItem('unimall_store_status_event', JSON.stringify({
      storeId,
      isOpen,
      timestamp: Date.now()
    }));
  } catch(e) {}
}
window.syncStoreStatusToUserApp = syncStoreStatusToUserApp;

/**
 * ────────────────────────────────────────────────────────────────
 * CIA CONFIDENTIALITY: INACTIVITY SESSION TIMEOUT (30-MIN NIST SPEC)
 * Automatically clears privileged credentials and forces re-login
 * when admin console is left unattended.
 * ────────────────────────────────────────────────────────────────
 */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.warn('[Security] Session timed out after 30 minutes of idle inactivity.');
    sessionStorage.removeItem('unimall_admin_token');
    sessionStorage.removeItem('unimall_admin_user');
    sessionStorage.removeItem('unimall_admin_stores');
    sessionStorage.removeItem('unimall_admin_active_store');
    window.location.replace('../login/?reason=timeout');
  }, INACTIVITY_TIMEOUT_MS);
}

function setupInactivityGuard() {
  resetInactivityTimer();
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  let lastRecorded = Date.now();
  events.forEach(evt => {
    window.addEventListener(evt, () => {
      const now = Date.now();
      // Throttle timer reset to once every 10 seconds to eliminate CPU overhead
      if (now - lastRecorded > 10000) {
        lastRecorded = now;
        resetInactivityTimer();
      }
    }, { passive: true });
  });
}
window.setupInactivityGuard = setupInactivityGuard;

/**
 * ────────────────────────────────────────────────────────────────
 * CIA AVAILABILITY: GLOBAL DEFENSIVE ERROR BOUNDARY
 * Prevents intermittent network drops or malformed telemetry
 * from crashing the admin UI thread or locking the viewport.
 * ────────────────────────────────────────────────────────────────
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Admin Security & Resilience] Unhandled Promise Rejection:', event.reason);
  // Prevent unhandled promise errors from crashing the console
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[Admin Security & Resilience] Caught error:', event.message, event.filename, event.lineno);
});

