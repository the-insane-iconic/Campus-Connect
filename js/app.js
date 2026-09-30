/* ═══════════════════════════════════════════════════════════
   UniMall · js/app.js
   Bootstrap — loads state, initializes all modules, renders home.

   Script load order (index.html):
     data.js → storage.js → state.js → ui.js →
     cart.js → search.js → navigation.js → views.js → app.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* 1. Restore persisted state */
  hydrateState();

  /* 2. Render chrome */
  renderSidebar();
  setHeaderGreeting();
  renderCategories();
  renderAvailChips();

  /* 3. Wire interactions */
  initMobileNav();
  initShortcuts();
  initSearch();
  initNotifBtn();
  initProfileBtn();
  initPageLinks();
  if (typeof initHeroBannersSlider === 'function') initHeroBannersSlider();
  if (typeof initOrderBottomSheetEvents === 'function') initOrderBottomSheetEvents();
  if (typeof initRealtimeOrderListeners === 'function') initRealtimeOrderListeners();

  /* 4. Render campus info panel */
  renderCampusInfo();

  /* 5. Render initial product sections */
  renderHome();

  /* 5b. Sync live catalog from Supabase (only re-render if data updated) */
  if (typeof syncCatalogWithSupabase === 'function') {
    syncCatalogWithSupabase().then(hasChanged => {
      if (hasChanged) renderHome();
    }).catch(() => {});
  }

  /* 6. Sync cart badge from persisted state */
  updateCartBadges();

  /* 7. Sync notification dot */
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = getUnreadCount() > 0 ? '' : 'none';

  /* 8. Handle query param (e.g. from stores.html) or hash */
  try {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store');
    if (storeParam) {
      const input = document.getElementById('main-search');
      if (input) input.value = storeParam;
      setState({ ui: { searchQuery: storeParam, selectedCategoryId: null, activeFilters: [] } });
      renderHome();
      showToast(`Showing items from ${storeParam}`);
    }

    const hash = window.location.hash.replace('#', '');
    if (hash && ['cart', 'orders', 'profile', 'notifications', 'request'].includes(hash)) {
      navigate(hash);
    }
  } catch (e) {}
});

/* ─── CAMPUS INFO (kept in app.js — standalone render) ─────*/
function renderCampusInfo() {
  const grid = document.getElementById('campus-info-grid');
  if (!grid) return;
  const { mallHours, isOpen, delivery, pickupPoint, storesOpen, storesTotal } = CAMPUS_INFO;

  grid.innerHTML = `
    <div class="campus-info-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div class="campus-info-content">
        <div class="campus-info-label">Mall hours</div>
        <div class="campus-info-value">${mallHours}</div>
      </div>
      <span class="campus-pill ${isOpen ? 'open' : 'closed'}">${isOpen ? 'Open now' : 'Closed'}</span>
    </div>
    <div class="campus-info-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M5 12l4-4M5 12l4 4"/></svg>
      <div class="campus-info-content">
        <div class="campus-info-label">Hostel delivery</div>
        <div class="campus-info-value">${delivery.available ? `Available · ${delivery.window} window` : 'Not available today'}</div>
      </div>
    </div>
    <div class="campus-info-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div class="campus-info-content">
        <div class="campus-info-label">Pickup point</div>
        <div class="campus-info-value">${pickupPoint}</div>
      </div>
    </div>
    <div class="campus-info-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      <div class="campus-info-content">
        <div class="campus-info-label">Stores open</div>
        <div class="campus-info-value">${storesOpen} of ${storesTotal} stores currently open</div>
      </div>
    </div>
  `;
}
