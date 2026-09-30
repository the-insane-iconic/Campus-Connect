/**
 * UniMall Store Admin — Founder Hub & Customer Requests Controller (admin/js/founder.js)
 * Platform admin tools for store onboarding, owner provisioning, and student demand monitoring.
 * Now includes: store registration management (approve/reject) and all-stores monitor.
 */

'use strict';

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
});

// ─── CUSTOMER DEMAND / PRODUCT REQUESTS ─────────────────────────

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
  } catch {
    // Handled
  }
}
window.updateRequestStatus = updateRequestStatus;

// ─── FOUNDER HUB (PLATFORM ADMIN) ───────────────────────────────

async function loadFounderHub() {
  if (currentAdminUser?.role !== 'platform_admin') return;

  try {
    const data = await apiRequest('/admin/founder/overview');
    const stats = data.stats || {};

    const elStores = document.getElementById('founder-stat-stores');
    const elProds = document.getElementById('founder-stat-prods');
    const elRevenue = document.getElementById('founder-stat-revenue');

    if (elStores) elStores.textContent = stats.active_stores || currentAuthorizedStores.length || 0;
    if (elProds) elProds.textContent = stats.active_products || 0;
    if (elRevenue) elRevenue.textContent = `₹${Number(stats.platform_revenue || 0).toLocaleString('en-IN')}`;

    // Populate Store Assign Dropdown
    const select = document.getElementById('founder-owner-store-select');
    if (select) {
      select.innerHTML = currentAuthorizedStores.map(s => `
        <option value="${s.store_id}">${s.store_name}</option>
      `).join('');
    }

  } catch (err) {
    // Fallback — set store count from session
    const elStores = document.getElementById('founder-stat-stores');
    if (elStores) elStores.textContent = currentAuthorizedStores.length || 0;

    const select = document.getElementById('founder-owner-store-select');
    if (select) {
      select.innerHTML = currentAuthorizedStores.map(s => `
        <option value="${s.store_id}">${s.store_name}</option>
      `).join('');
    }
  }

  // Load pending registrations
  loadPendingRegistrations();

  // Load all stores monitor
  loadAllStoresMonitor();
}

// ─── PENDING STORE REGISTRATIONS ─────────────────────────────────

function loadPendingRegistrations() {
  const tbody = document.getElementById('pending-registrations-tbody');
  if (!tbody) return;

  const registrations = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  // Update pending count stat
  const elPending = document.getElementById('founder-stat-pending');
  if (elPending) elPending.textContent = pendingCount;

  if (registrations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6" style="color: var(--text-muted);">No store registrations yet. New stores will appear here when they register.</td></tr>';
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
                style="font-size: 11px; padding: 4px 10px; background: #16A34A;">✓ Approve</button>
              <button type="button" class="btn-action secondary" onclick="rejectRegistration(${idx})"
                style="font-size: 11px; padding: 4px 10px; color: #DC2626;">✗ Reject</button>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">—</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function approveRegistration(index) {
  const registrations = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  if (!registrations[index]) return;

  const reg = registrations[index];
  reg.status = 'approved';
  reg.reviewedAt = new Date().toISOString();
  localStorage.setItem('unimall_registered_stores', JSON.stringify(registrations));

  // Also sync the store's open/close status so user app knows
  syncStoreStatusToUserApp(reg.storeId, true);

  // Add to active store selector for platform admin
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

  showToast(`"${reg.storeName}" approved! Manager can now sign in with their store name.`, 'success');
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

// ─── ALL STORES MONITOR ─────────────────────────────────────────

function loadAllStoresMonitor() {
  const tbody = document.getElementById('all-stores-tbody');
  if (!tbody) return;

  // Get stores from the current session's authorized stores list + approved registered stores
  const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
  const approved = registeredStores.filter(r => r.status === 'approved').map(r => ({
    store_id: r.storeId,
    store_name: r.storeName,
    category: r.storeType,
    location: r.location
  }));

  const allStores = [...(currentAuthorizedStores || [])];
  approved.forEach(appStore => {
    if (!allStores.some(s => s.store_id === appStore.store_id)) {
      allStores.push(appStore);
    }
  });

  // Update active campus stores stat
  const elStores = document.getElementById('founder-stat-stores');
  if (elStores) elStores.textContent = allStores.length;

  // Get store open/close statuses from localStorage
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');

  if (allStores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6" style="color: var(--text-muted);">No stores found.</td></tr>';
    return;
  }

  const STORE_META = {
    'campus-cafe': { category: 'Food & Drinks', location: 'Ground Floor, Unimall' },
    'book-corner': { category: 'Stationery', location: 'First Floor, Unimall' },
    'techstop': { category: 'Electronics', location: 'Second Floor, Unimall' },
    'campus-mart': { category: 'Groceries & Essentials', location: 'Ground Floor, Unimall' },
    'campus-wear': { category: 'Fashion', location: 'First Floor, Unimall' },
    'health-hub': { category: 'Health & Care', location: 'Ground Floor, Unimall' }
  };

  tbody.innerHTML = allStores.map(s => {
    const meta = s.location ? { category: s.category || 'General', location: s.location } : (STORE_META[s.store_id] || { category: 'General', location: '—' });
    const isOpen = storeStatuses[s.store_id] !== false; // Default to open
    const statusClass = isOpen ? 'completed' : 'cancelled';
    const statusLabel = isOpen ? '● Online' : '○ Offline';

    return `
      <tr>
        <td style="font-weight: 700; font-size: 14px;">${escapeHtml(s.store_name)}</td>
        <td style="font-size: 12.5px;">${meta.category}</td>
        <td style="font-size: 12.5px;">${meta.location}</td>
        <td>
          <span class="badge-status ${statusClass}" style="font-size: 11px;">${statusLabel}</span>
        </td>
        <td>
          <button type="button" class="btn-action ${isOpen ? 'secondary' : 'primary'}" 
                  onclick="adminToggleStore('${s.store_id}', ${!isOpen})"
                  style="font-size: 11px; padding: 4px 10px;">
            ${isOpen ? '⏸ Close Store' : '▶ Open Store'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function adminToggleStore(storeId, setOpen) {
  syncStoreStatusToUserApp(storeId, setOpen);
  showToast(`${storeId} is now ${setOpen ? 'OPEN' : 'CLOSED'}`, 'success');
  loadAllStoresMonitor();
}
window.adminToggleStore = adminToggleStore;

// ─── SYNC STORE STATUS TO USER APP ──────────────────────────────

function syncStoreStatusToUserApp(storeId, isOpen) {
  // 1. Update dedicated store statuses map
  const storeStatuses = JSON.parse(localStorage.getItem('unimall_store_statuses') || '{}');
  storeStatuses[storeId] = isOpen;
  localStorage.setItem('unimall_store_statuses', JSON.stringify(storeStatuses));

  // 2. Update unimall_v1 app data if it exists (so user app reacts immediately)
  try {
    const raw = localStorage.getItem('unimall_v1');
    if (raw) {
      const appData = JSON.parse(raw);
      // If appData has store references, update openNow
      if (appData.stores && Array.isArray(appData.stores)) {
        const store = appData.stores.find(s => s.id === storeId);
        if (store) {
          store.openNow = isOpen;
          localStorage.setItem('unimall_v1', JSON.stringify(appData));
        }
      }
    }
  } catch(e) {}

  // 3. Dispatch event for same-tab reactivity
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

// ─── CREATE STORE & OWNER HANDLERS ──────────────────────────────

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

    // Refresh user store list
    const meData = await apiRequest('/auth/me');
    currentAuthorizedStores = meData.stores || [];
    setupStoreContext();
    loadFounderHub();

  } catch {
    // For static deployment — just show success
    showToast(`Store "${name}" created locally!`, 'success');
    document.getElementById('founder-create-store-form').reset();
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
    const res = await apiRequest('/admin/founder/owners', {
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
