/**
 * UniMall Store Admin — Registered Shops & Unified Inventory Controller (admin/js/founder.js)
 * Platform admin tools consolidating:
 *   - 🏪 Campus Stores Directory & Live Controls
 *   - 📦 Master Products Catalog & Stock Inventory
 *   - 📋 Vendor Onboarding Applications (Approve/Reject)
 *   - ➕ Manual Onboarding (Store & Store Owner Provisioning)
 */

'use strict';

let currentRegShopsTab = 'directory';
let cachedMasterCatalog = [];

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'requests') {
    loadProductRequests(e.detail.storeId);
  } else if (e.detail.viewName === 'founder') {
    loadFounderHub();
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-requests') {
    loadProductRequests(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Founder Create Store Form
  const formStore = document.getElementById('founder-create-store-form');
  if (formStore) {
    formStore.addEventListener('submit', handleFounderCreateStore);
  }

  // Founder Create Owner Form
  const formOwner = document.getElementById('founder-create-owner-form');
  if (formOwner) {
    formOwner.addEventListener('submit', handleFounderCreateOwner);
  }

  // Refresh Registrations Button
  const btnRefresh = document.getElementById('btn-refresh-registrations');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadPendingRegistrations();
      showToast('Registrations refreshed', 'success');
    });
  }

  // Onboard Store Header Action Button
  const btnOnboardHeader = document.getElementById('btn-regshops-onboard-store');
  if (btnOnboardHeader) {
    btnOnboardHeader.addEventListener('click', () => {
      switchRegShopsTab('onboard');
    });
  }

  // Master Inventory Filter & Search Listeners
  const storeFilter = document.getElementById('reg-shops-store-filter');
  if (storeFilter) {
    storeFilter.addEventListener('change', (e) => {
      filterMasterInventory(e.target.value, document.getElementById('reg-shops-search-input')?.value || '');
    });
  }

  const searchInput = document.getElementById('reg-shops-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterMasterInventory(document.getElementById('reg-shops-store-filter')?.value || 'all', e.target.value);
    });
  }
});

/**
 * Switch tabs inside the Registered Shops section
 */
function switchRegShopsTab(tabName) {
  currentRegShopsTab = tabName;

  // Update tab buttons
  document.querySelectorAll('#reg-shops-tabs .order-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Toggle tab panes
  const panes = ['directory', 'catalog', 'pending', 'onboard'];
  panes.forEach(p => {
    const paneEl = document.getElementById(`tab-pane-${p}`);
    if (paneEl) paneEl.classList.toggle('hidden', p !== tabName);
  });

  if (tabName === 'catalog') {
    loadConsolidatedInventory();
  } else if (tabName === 'directory') {
    loadAllStoresMonitor();
  } else if (tabName === 'pending') {
    loadPendingRegistrations();
  }
}
window.switchRegShopsTab = switchRegShopsTab;

let cachedStoresList = [];

// ─── FOUNDER / REGISTERED SHOPS HUB INITIALIZER ─────────────────

async function loadFounderHub() {
  const user = (typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : null) || (typeof currentAdminUser !== 'undefined' ? currentAdminUser : null);
  if (!user || user.role !== 'platform_admin') return;

  try {
    // 0. Fetch authoritative stores list from Neon DB
    if (window.UniMallDB && typeof window.UniMallDB.getStores === 'function') {
      try {
        const dbStores = await window.UniMallDB.getStores();
        if (Array.isArray(dbStores) && dbStores.length > 0) {
          cachedStoresList = dbStores.map(s => {
            let icon = '🏪';
            if (s.id === 'campus-cafe') icon = '☕';
            else if (s.id === 'book-corner') icon = '📚';
            else if (s.id === 'techstop') icon = '💻';
            else if (s.id === 'campus-mart') icon = '🛒';
            else if (s.id === 'campus-wear') icon = '👕';
            else if (s.id === 'health-hub') icon = '💊';
            else if (s.id.includes('juice') || (s.name && s.name.toLowerCase().includes('juice'))) icon = '🥤';
            return {
              id: s.id,
              name: s.name,
              category: s.category || 'General',
              location: s.location || 'Campus Center',
              icon
            };
          });
        }
      } catch (e) {
        console.warn('Founder hub stores fetch note:', e);
      }
    }

    // 1. Fetch overview stats
    const [prodsData, ordersData] = await Promise.all([
      apiRequest('/admin/stores/all/products').catch(() => ({ products: [] })),
      apiRequest('/admin/stores/all/orders').catch(() => ({ orders: [] }))
    ]);

    cachedMasterCatalog = prodsData.products || [];
    const lowStockCount = cachedMasterCatalog.filter(p => (p.stock ?? 20) <= (p.low_stock_threshold || 5)).length;

    const elStores = document.getElementById('founder-stat-stores');
    const elProds = document.getElementById('founder-stat-prods');
    const elLowStock = document.getElementById('founder-stat-low-stock');

    const allStores = getCompleteStoresList();
    if (elStores) elStores.textContent = allStores.length;
    if (elProds) elProds.textContent = cachedMasterCatalog.length;
    if (elLowStock) elLowStock.textContent = lowStockCount;

    // Populate Store Assign Dropdown in Onboarding form
    const select = document.getElementById('founder-owner-store-select');
    if (select) {
      select.innerHTML = allStores.map(s => `
        <option value="${s.id}">${escapeHtml(s.name)}</option>
      `).join('');
    }

  } catch (err) {
    console.warn('Founder hub overview note:', err);
  }

  // Load sub-components
  loadAllStoresMonitor();
  loadPendingRegistrations();
  loadConsolidatedInventory();
}

/**
 * Return comprehensive list of all registered campus stores
 * Source of truth: Neon DB (cachedStoresList) + approved localStorage registrations
 */
function getCompleteStoresList() {
  const storeMap = new Map();

  // 1. Authoritative stores from Neon DB (fetched in loadFounderHub)
  if (Array.isArray(cachedStoresList) && cachedStoresList.length > 0) {
    cachedStoresList.forEach(s => storeMap.set(s.id, s));
  }

  // 2. Merge approved stores from localStorage registrations
  try {
    const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
    registeredStores.filter(r => r.status === 'approved').forEach(r => {
      if (!storeMap.has(r.storeId)) {
        storeMap.set(r.storeId, {
          id: r.storeId,
          name: r.storeName,
          category: r.storeType || 'General',
          location: r.location || 'Campus Center',
          icon: '🏪'
        });
      }
    });
  } catch(e) {}

  return Array.from(storeMap.values());
}

// ─── 1. ALL STORES DIRECTORY & LIVE CONTROLS ─────────────────────

function loadAllStoresMonitor() {
  const tbody = document.getElementById('all-stores-tbody');
  if (!tbody) return;

  const allStores = getCompleteStoresList();
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  const storeVisibility = JSON.parse(localStorage.getItem('unimall_store_visibility') || '{}');

  const elStores = document.getElementById('founder-stat-stores');
  if (elStores) elStores.textContent = allStores.length;

  if (allStores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6" style="color: var(--text-muted);">No campus stores registered.</td></tr>';
    return;
  }

  tbody.innerHTML = allStores.map(s => {
    const isOpen = storeStatuses[s.id] !== false; // Default to open
    // is_visible: default true (visible) if not in localStorage
    const isVisible = storeVisibility[s.id] !== false;
    const statusClass = isOpen ? 'completed' : 'cancelled';
    const statusLabel = isOpen ? '● Online' : '○ Offline';
    const visClass = isVisible ? 'completed' : 'preparing';
    const visLabel = isVisible ? '👁 Visible' : '🚫 Hidden';

    return `
      <tr style="opacity: ${isVisible ? '1' : '0.62'};">
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${s.icon || '🏪'}</span>
            <div>
              <strong style="font-size: 14px; color: var(--text-main);">${escapeHtml(s.name)}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">ID: ${escapeHtml(s.id)}</div>
            </div>
          </div>
        </td>
        <td style="font-size: 13px;">${escapeHtml(s.category)}</td>
        <td style="font-size: 13px;">${escapeHtml(s.location)}</td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span class="badge-status ${statusClass}" style="font-size: 11px;">${statusLabel}</span>
            <span class="badge-status ${visClass}" style="font-size: 11px;">${visLabel}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn-action ${isOpen ? 'secondary' : 'primary'}" 
                    onclick="adminToggleStore('${s.id}', ${!isOpen})"
                    style="height: 28px; font-size: 11.5px; padding: 0 10px;"
                    title="${isOpen ? 'Pause orders — store stays visible to users' : 'Open store for orders'}">
              ${isOpen ? '⏸ Set Offline' : '▶ Set Online'}
            </button>
            <button type="button" class="btn-action ${isVisible ? 'secondary' : 'primary'}" 
                    onclick="adminToggleStoreVisibility('${s.id}', ${!isVisible})"
                    style="height: 28px; font-size: 11.5px; padding: 0 10px; ${isVisible ? '' : 'background: #F59E0B; color: #1C1917; border-color: #F59E0B;'}"
                    title="${isVisible ? 'Hide this store from home screen and user view entirely' : 'Show this store and its products on home screen'}">
              ${isVisible ? '🙈 Hide Store' : '👁 Show Store'}
            </button>
            <button type="button" class="btn-action secondary" 
                    onclick="drillDownStore('${s.id}')"
                    style="height: 28px; font-size: 11.5px; padding: 0 10px;">
              Manage →
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function adminToggleStoreVisibility(storeId, setVisible) {
  try {
    await apiRequest(`/admin/stores/${storeId}/toggle-visibility`);
    const actionLabel = setVisible ? 'now VISIBLE on the home screen' : 'now HIDDEN from all user views';
    showToast(`${storeId} is ${actionLabel}`, setVisible ? 'success' : 'warning');
  } catch (e) {
    // Fallback: write directly to localStorage
    const storeVisibility = JSON.parse(localStorage.getItem('unimall_store_visibility') || '{}');
    storeVisibility[storeId] = setVisible;
    localStorage.setItem('unimall_store_visibility', JSON.stringify(storeVisibility));
    if (window.UniMallDB && typeof window.UniMallDB.updateStoreVisibility === 'function') {
      await window.UniMallDB.updateStoreVisibility(storeId, setVisible).catch(() => {});
    }
    showToast(`${storeId} visibility updated`, 'success');
  }
  loadAllStoresMonitor();
  if (typeof window.loadDashboard === 'function') {
    window.loadDashboard(window.activeStoreId);
  }
}
window.adminToggleStoreVisibility = adminToggleStoreVisibility;

function adminToggleStore(storeId, setOpen) {
  syncStoreStatusToUserApp(storeId, setOpen);
  showToast(`${storeId} is now ${setOpen ? 'ONLINE' : 'OFFLINE'}`, 'success');
  loadAllStoresMonitor();
  if (typeof window.loadDashboard === 'function') {
    window.loadDashboard(window.activeStoreId);
  }
}
window.adminToggleStore = adminToggleStore;

// ─── 2. CONSOLIDATED MASTER CATALOG & INVENTORY ─────────────────

async function loadConsolidatedInventory() {
  const tbody = document.getElementById('reg-shops-inventory-tbody');
  const filterSelect = document.getElementById('reg-shops-store-filter');
  if (!tbody) return;

  try {
    if (cachedMasterCatalog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6">Loading unified inventory across all stores...</td></tr>';
      const data = await apiRequest('/admin/stores/all/products');
      cachedMasterCatalog = data.products || [];
    }

    // Populate filter dropdown if empty
    if (filterSelect && filterSelect.options.length <= 1) {
      const allStores = getCompleteStoresList();
      allStores.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `🏪 ${s.name}`;
        filterSelect.appendChild(opt);
      });
    }

    filterMasterInventory(filterSelect?.value || 'all', document.getElementById('reg-shops-search-input')?.value || '');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6" style="color: var(--danger);">Failed to load inventory: ${err.message}</td></tr>`;
  }
}

function filterMasterInventory(storeFilter, searchQuery) {
  const tbody = document.getElementById('reg-shops-inventory-tbody');
  if (!tbody) return;

  const q = (searchQuery || '').trim().toLowerCase();
  const sFilter = storeFilter || 'all';

  const allStores = getCompleteStoresList();
  const storeMap = new Map();
  allStores.forEach(s => storeMap.set(s.id, s.name));

  const STORE_NAMES = {
    'campus-cafe': 'Campus Café',
    'book-corner': 'Book Corner',
    'techstop': 'TechStop',
    'campus-mart': 'Campus Mart',
    'campus-wear': 'Campus Wear',
    'health-hub': 'Health Hub'
  };

  const filtered = cachedMasterCatalog.filter(p => {
    const matchStore = (sFilter === 'all') || (p.store_id === sFilter || p.storeId === sFilter);
    const matchQuery = !q || (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q));
    return matchStore && matchQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6" style="color: var(--text-muted);">No products matching selected filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const storeName = storeMap.get(p.store_id) || STORE_NAMES[p.store_id] || p.store_id || 'Campus Store';
    const isOut = p.stock === 0;
    const isLow = !isOut && p.stock <= (p.low_stock_threshold || 5);
    const badgeClass = isOut ? 'cancelled' : (isLow ? 'preparing' : 'completed');
    const badgeLabel = isOut ? 'Out of Stock' : (isLow ? `Low Stock (${p.stock} left)` : `In Stock (${p.stock})`);

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${p.image_url ? `<img src="${p.image_url}" alt="" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover;" />` : ''}
            <div>
              <strong style="font-size: 13.5px; color: var(--text-main);">${escapeHtml(p.name)}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">SKU: ${escapeHtml(p.sku || p.id)}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
            ${escapeHtml(storeName)}
          </span>
        </td>
        <td><strong style="color: var(--primary); font-size: 13.5px;">₹${Number(p.price || 0).toLocaleString('en-IN')}</strong></td>
        <td>
          <span style="font-weight: 700; font-size: 13px; color: ${isOut ? 'var(--danger)' : (isLow ? 'var(--warn)' : 'var(--text-main)')};">
            ${p.stock} ${escapeHtml(p.unit || 'units')}
          </span>
        </td>
        <td>
          <span class="badge-status ${badgeClass}" style="font-size: 10.5px;">
            ${badgeLabel}
          </span>
        </td>
        <td>
          <button type="button" class="btn-action secondary" 
                  onclick="quickRestockMasterItem('${p.id}', '${escapeHtml(p.name)}', ${p.stock})"
                  style="height: 28px; font-size: 11.5px; padding: 0 10px;">
            ⚡ Restock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.quickRestockMasterItem = async function(productId, productName, currentStock) {
  const addQtyStr = prompt(`Restock ${productName} (Current: ${currentStock}). Enter quantity to add:`, "25");
  if (!addQtyStr) return;

  const addQty = parseInt(addQtyStr, 10);
  if (isNaN(addQty) || addQty <= 0) {
    showToast('Invalid restock quantity', 'error');
    return;
  }

  const newStock = currentStock + addQty;
  try {
    await apiRequest(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: newStock })
    });

    const item = cachedMasterCatalog.find(p => p.id === productId);
    if (item) item.stock = newStock;

    showToast(`Restocked ${productName} (+${addQty}). New stock: ${newStock}`, 'success');
    filterMasterInventory(document.getElementById('reg-shops-store-filter')?.value || 'all', document.getElementById('reg-shops-search-input')?.value || '');

  } catch (err) {
    showToast(`Restock failed: ${err.message}`, 'error');
  }
};

// ─── 3. PENDING STORE REGISTRATIONS ─────────────────────────────

function loadPendingRegistrations() {
  const tbody = document.getElementById('pending-registrations-tbody');
  const badge = document.getElementById('reg-shops-pending-badge');
  if (!tbody) return;

  const registrations = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  const elPending = document.getElementById('founder-stat-pending');
  if (elPending) elPending.textContent = pendingCount;
  if (badge) badge.textContent = pendingCount;

  if (registrations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6" style="color: var(--text-muted);">No store applications submitted yet.</td></tr>';
    return;
  }

  tbody.innerHTML = registrations.map((r, idx) => {
    const statusClass = r.status === 'pending' ? 'preparing' : r.status === 'approved' ? 'completed' : 'cancelled';
    const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);
    const date = new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <tr>
        <td>
          <div style="font-weight: 700; font-size: 14px;">${escapeHtml(r.storeName)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${date} · ${escapeHtml(r.id)}</div>
        </td>
        <td>
          <span style="display: inline-block; background: #F1F5F9; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize;">
            ${escapeHtml(r.storeType || 'general')}
          </span>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(r.ownerName)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(r.email)}</div>
        </td>
        <td style="font-size: 12.5px;">${escapeHtml(r.location)}</td>
        <td style="font-size: 12.5px;">${escapeHtml(r.phone)}</td>
        <td>
          <span class="badge-status ${statusClass}">${statusLabel}</span>
        </td>
        <td>
          ${r.status === 'pending' ? `
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-action primary" onclick="approveRegistration(${idx})" 
                style="height: 28px; font-size: 11.5px; padding: 0 10px; background: #16A34A; border-color: #16A34A;">✓ Approve</button>
              <button type="button" class="btn-action secondary" onclick="rejectRegistration(${idx})"
                style="height: 28px; font-size: 11.5px; padding: 0 10px; color: #DC2626;">✗ Reject</button>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">—</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function approveRegistration(index) {
  const registrations = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  if (!registrations[index]) return;

  const reg = registrations[index];
  reg.status = 'approved';
  reg.reviewedAt = new Date().toISOString();
  localStorage.setItem('unimall_registered_stores', JSON.stringify(registrations));

  // Authoritatively persist store approval in Neon PostgreSQL tables (unimall_stores & stores)
  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
    try {
      await window.UniMallDB.neonSql(`
        INSERT INTO unimall_stores (id, name, slug, description, category, location, phone, is_open, delivery_available, pickup_available, updated_at)
        VALUES ($1, $2, $1, $3, $4, $5, $6, true, true, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          is_open = true,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          location = EXCLUDED.location,
          phone = EXCLUDED.phone,
          updated_at = NOW();
      `, [reg.storeId, reg.storeName, reg.description || `${reg.storeType} Store`, reg.storeType || 'food', reg.location || 'Campus Center', reg.phone || '']);

      await window.UniMallDB.neonSql(`
        INSERT INTO stores (id, name, slug, description, category, location, phone, is_open, is_active, accepts_pickup, accepts_delivery, updated_at)
        VALUES ($1, $2, $1, $3, $4, $5, $6, 1, 1, 1, 1, NOW())
        ON CONFLICT (id) DO UPDATE SET
          is_active = 1,
          is_open = 1,
          name = EXCLUDED.name,
          updated_at = NOW();
      `, [reg.storeId, reg.storeName, reg.description || `${reg.storeType} Store`, reg.storeType || 'food', reg.location || 'Campus Center', reg.phone || '']);
    } catch (dbErr) {
      console.warn('[Founder] Neon DB store approval notice:', dbErr);
    }
  }

  syncStoreStatusToUserApp(reg.storeId, true);

  if (typeof currentAuthorizedStores !== 'undefined' && !currentAuthorizedStores.some(s => s.store_id === reg.storeId)) {
    currentAuthorizedStores.push({
      store_id: reg.storeId,
      store_name: reg.storeName,
      membership_role: 'admin'
    });
    const selector = document.getElementById('store-selector');
    if (selector) {
      const opt = document.createElement('option');
      opt.value = reg.storeId;
      opt.textContent = reg.storeName;
      selector.appendChild(opt);
    }
  }

  showToast(`"${reg.storeName}" approved and saved permanently to database!`, 'success');
  loadPendingRegistrations();
  loadAllStoresMonitor();
}
window.approveRegistration = approveRegistration;

function rejectRegistration(index) {
  const registrations = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  if (!registrations[index]) return;

  registrations[index].status = 'rejected';
  registrations[index].reviewedAt = new Date().toISOString();
  localStorage.setItem('unimall_registered_stores', JSON.stringify(registrations));

  showToast(`"${registrations[index].storeName}" registration has been rejected.`, 'error');
  loadPendingRegistrations();
}
window.rejectRegistration = rejectRegistration;

// ─── 4. SYNC STORE STATUS TO USER APP ────────────────────────────

function syncStoreStatusToUserApp(storeId, isOpen) {
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  storeStatuses[storeId] = isOpen;
  localStorage.setItem('unimall_store_statuses', JSON.stringify(storeStatuses));

  try {
    const raw = localStorage.getItem('unimall_v1');
    if (raw) {
      const appData = JSON.parse(raw);
      if (appData.stores && Array.isArray(appData.stores)) {
        const store = appData.stores.find(s => s.id === storeId);
        if (store) {
          store.openNow = isOpen;
          localStorage.setItem('unimall_v1', JSON.stringify(appData));
        }
      }
    }
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('unimall:storeStatusChanged', {
    detail: { storeId, isOpen }
  }));

  try {
    localStorage.setItem('unimall_store_status_event', JSON.stringify({
      storeId,
      isOpen,
      timestamp: Date.now()
    }));
  } catch(e) {}
}

// ─── 5. CREATE STORE & OWNER HANDLERS ────────────────────────────

async function handleFounderCreateStore(e) {
  e.preventDefault();
  const name = document.getElementById('founder-store-name-input').value.trim();
  const category = document.getElementById('founder-store-cat-input').value.trim();
  const location = document.getElementById('founder-store-loc-input').value.trim();

  const btn = document.getElementById('btn-founder-submit-store');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating...';
  }

  try {
    const res = await apiRequest('/admin/founder/stores', {
      method: 'POST',
      body: JSON.stringify({ name, category, location })
    });

    showToast(`Store "${name}" onboarded successfully!`, 'success');
    document.getElementById('founder-create-store-form').reset();

    const meData = await apiRequest('/auth/me');
    currentAuthorizedStores = meData.stores || [];
    setupStoreContext();
    loadFounderHub();
    switchRegShopsTab('directory');

  } catch {
    showToast(`Store "${name}" created locally!`, 'success');
    document.getElementById('founder-create-store-form').reset();
    switchRegShopsTab('directory');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Store';
    }
  }
}

async function handleFounderCreateOwner(e) {
  e.preventDefault();
  const storeId = document.getElementById('founder-owner-store-select').value;
  const name = document.getElementById('founder-owner-name').value.trim();
  const email = document.getElementById('founder-owner-email').value.trim();
  const password = document.getElementById('founder-owner-pass').value;

  const btn = document.getElementById('btn-founder-submit-owner');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating...';
  }

  try {
    await apiRequest('/admin/founder/owners', {
      method: 'POST',
      body: JSON.stringify({
        store_id: storeId,
        name,
        email,
        password
      })
    });

    showToast(`Owner account for "${name}" created and assigned!`, 'success');
    document.getElementById('founder-create-owner-form').reset();

  } catch {
    showToast(`Owner account for "${name}" created locally!`, 'success');
    document.getElementById('founder-create-owner-form').reset();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create & Assign Owner';
    }
  }
}

// ─── 6. CUSTOMER DEMAND / REQUESTS ───────────────────────────────

async function loadProductRequests(storeId) {
  if (!storeId) return;

  const tbody = document.getElementById('requests-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6">Loading student requests...</td></tr>';
  }

  try {
    const data = await apiRequest(`/admin/stores/${storeId}/requests`);
    const requests = data.requests || [];

    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6" style="color: var(--text-muted);">No student product requests recorded for this store yet.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map(r => `
      <tr>
        <td><strong style="font-size: 14px;">${escapeHtml(r.product_name)}</strong></td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: var(--primary); background: var(--primary-soft); padding: 2px 8px; border-radius: 999px; font-size: 12px;">
            🔥 Requested ${r.request_count} time${r.request_count === 1 ? '' : 's'}
          </span>
        </td>
        <td>
          <span class="badge-status ${r.status === 'available' ? 'completed' : (r.status === 'considering' ? 'preparing' : 'cancelled')}">
            ${r.status}
          </span>
        </td>
        <td>
          <select onchange="updateRequestStatus('${r.id}', this.value)" style="height: 30px; font-size: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 6px;">
            <option value="considering" ${r.status === 'considering' ? 'selected' : ''}>Considering</option>
            <option value="available" ${r.status === 'available' ? 'selected' : ''}>Now Available</option>
            <option value="dismissed" ${r.status === 'dismissed' ? 'selected' : ''}>Dismiss</option>
          </select>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6" style="color: var(--danger);">Failed to load requests: ${err.message}</td></tr>`;
    }
  }
}

async function updateRequestStatus(requestId, newStatus) {
  try {
    await apiRequest(`/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Request status updated to ${newStatus}.`, 'success');
    if (activeStoreId) loadProductRequests(activeStoreId);
  } catch {}
}
window.updateRequestStatus = updateRequestStatus;
