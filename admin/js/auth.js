/**
 * UniMall Store Admin — Authentication & Context Controller (admin/js/auth.js)
 */

'use strict';

let currentAdminUser = null;
let currentAuthorizedStores = [];
let activeStoreId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('unimall_admin_token');
  if (!token) {
    window.location.href = 'login.html';
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
    currentAuthorizedStores = meData.stores || [];

    setupUserProfile();
    setupStoreContext();
    setupNavigation();
    setupMobileDrawer();
    setupStoreToggle();
    setupLogout();

    // Trigger initial view load
    switchView('dashboard');
  } catch (err) {
    console.error('Session initialization failed:', err);
    sessionStorage.removeItem('unimall_admin_token');
    window.location.href = 'login.html';
  }
});

function setupUserProfile() {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl) nameEl.textContent = currentAdminUser.name;
  if (roleEl) {
    roleEl.textContent = currentAdminUser.role === 'platform_admin' ? 'Platform Admin' : 'Store Owner';
  }
  if (avatarEl) {
    avatarEl.textContent = currentAdminUser.name.charAt(0).toUpperCase();
  }

  // Show Founder Hub tab if platform_admin
  if (currentAdminUser.role === 'platform_admin') {
    const founderGroup = document.getElementById('nav-founder-group');
    if (founderGroup) founderGroup.classList.remove('hidden');
  }
}

function setupStoreContext() {
  const selector = document.getElementById('store-selector');
  const storedActive = sessionStorage.getItem('unimall_admin_active_store');

  // If platform admin, add all approved registered stores to the authorized list
  if (currentAdminUser && currentAdminUser.role === 'platform_admin') {
    const regStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
    regStores.filter(r => r.status === 'approved').forEach(r => {
      if (!currentAuthorizedStores.some(s => s.store_id === r.storeId)) {
        currentAuthorizedStores.push({
          store_id: r.storeId,
          store_name: r.storeName,
          membership_role: 'admin'
        });
      }
    });
  }

  if (currentAuthorizedStores.length > 0) {
    const matched = currentAuthorizedStores.find(s => s.store_id === storedActive);
    activeStoreId = matched ? matched.store_id : currentAuthorizedStores[0].store_id;
  }

  // Populate dropdown
  if (selector) {
    selector.innerHTML = currentAuthorizedStores.map(s => `
      <option value="${s.store_id}" ${s.store_id === activeStoreId ? 'selected' : ''}>
        ${s.store_name}
      </option>
    `).join('');

    selector.addEventListener('change', (e) => {
      setActiveStore(e.target.value);
    });

    // Hide dropdown if only 1 store and not platform admin
    if (currentAuthorizedStores.length <= 1 && currentAdminUser.role !== 'platform_admin') {
      selector.style.pointerEvents = 'none';
      selector.style.borderColor = 'transparent';
      selector.style.background = 'transparent';
    }
  }

  updateStoreDisplay();
}

function setActiveStore(storeId) {
  activeStoreId = storeId;
  sessionStorage.setItem('unimall_admin_active_store', storeId);
  updateStoreDisplay();

  // Dispatch custom event so modules reload for the new store
  window.dispatchEvent(new CustomEvent('unimall:storeChanged', { detail: { storeId } }));
}

function updateStoreDisplay() {
  const currentStore = currentAuthorizedStores.find(s => s.store_id === activeStoreId);
  const storeName = currentStore ? currentStore.store_name : 'UniMall Store';

  // Update sidebar store badge
  const sidebarStoreName = document.getElementById('sidebar-store-name');
  if (sidebarStoreName) sidebarStoreName.textContent = storeName;

  // Sync open/closed toggle button to the active store's state
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  const isOpen = storeStatuses[activeStoreId] !== false; // default to open
  applyStoreOpenState(isOpen);

  // Founder Impersonation Banner
  const banner = document.getElementById('founder-banner');
  const founderStoreName = document.getElementById('founder-store-name');

  if (currentAdminUser && currentAdminUser.role === 'platform_admin') {
    if (banner) banner.classList.remove('hidden');
    if (founderStoreName) founderStoreName.textContent = storeName;
  } else {
    if (banner) banner.classList.add('hidden');
  }

  // Banner action buttons
  const btnSwitchStore = document.getElementById('btn-switch-store');
  if (btnSwitchStore) {
    btnSwitchStore.onclick = () => {
      const selector = document.getElementById('store-selector');
      if (selector) selector.focus();
    };
  }

  const btnFounderHub = document.getElementById('btn-founder-hub');
  if (btnFounderHub) {
    btnFounderHub.onclick = () => {
      switchView('founder');
    };
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
        window.location.href = 'login.html';
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
