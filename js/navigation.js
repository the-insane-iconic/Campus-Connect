/* ═══════════════════════════════════════════════════════════
   UniMall · js/navigation.js
   Sidebar, bottom nav, categories, filter chips.
   Depends on: data.js, state.js, views.js, ui.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── SIDEBAR ────────────────────────────────────────────── */

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const count = getCartCount();
  const user = AppState.currentUser || {};
  const initial = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'A';
  const avatarHtml = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-wordmark">Uni<span>Mall</span></div>
      <div class="sidebar-tagline">Your Campus, Closer.</div>
    </div>

    <nav class="sidebar-nav" aria-label="Site navigation">
      <div class="sidebar-section-label">Discover</div>

      <a href="index.html" class="sidebar-item active" id="sb-home" aria-current="page">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Home
      </a>
      <a href="stores.html" class="sidebar-item" id="sb-stores">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Stores
      </a>

      <div class="sidebar-section-label">My Activity</div>

      <a href="orders.html" class="sidebar-item" id="sb-orders">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        Orders
      </a>
      <a href="cart.html" class="sidebar-item" id="sb-cart">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Cart
        <span class="sidebar-badge" data-cart aria-label="${count} items in cart"
              style="display:${count > 0 ? '' : 'none'}">${count > 9 ? '9+' : count}</span>
      </a>
      <a href="profile.html" class="sidebar-item" id="sb-profile">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </a>
    </nav>

    <div class="sidebar-footer">
      <a href="profile.html" class="sidebar-profile" id="sb-profile-footer" aria-label="View profile">
        <div class="sidebar-avatar">${avatarHtml}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${user.name || 'Campus Student'}</div>
          <div class="sidebar-profile-role">${(user.hostel && user.room) ? (user.hostel + ' · ' + user.room) : (user.email || 'Campus Account')}</div>
        </div>
      </a>
    </div>
  `;

  // Wire sidebar clicks to navigate()
  const routes = {
    'sb-home': () => navigate('home'),
    'sb-stores': () => navigate('stores'),
    'sb-orders': () => navigate('orders'),
    'sb-cart': () => navigate('cart'),
    'sb-profile': () => navigate('profile'),
    'sb-profile-footer': () => navigate('profile'),
  };

  Object.entries(routes).forEach(([id, fn]) => {
    const el = sidebar.querySelector('#' + id);
    if (el) {
      el.addEventListener('click', e => { e.preventDefault(); fn(); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
      });
    }
  });
}

/* ─── BOTTOM NAV ─────────────────────────────────────────── */

function initMobileNav() {
  const routes = {
    'nav-home': () => navigate('home'),
    'nav-stores': () => navigate('stores'),
    'nav-categories': () => navigate('stores'),
    'nav-orders': () => navigate('orders'),
    'nav-cart': () => navigate('cart'),
    'nav-profile': () => navigate('profile'),
  };

  Object.entries(routes).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', e => { e.preventDefault(); fn(); });
    }
  });
}

/* ─── CATEGORIES STRIP ───────────────────────────────────── */

function renderCategories() {
  const el = document.getElementById('categories-scroll');
  if (!el) return;

  el.innerHTML = CATEGORIES.map(c => `
    <div class="category-item" role="listitem" id="cat-${c.id}" tabindex="0" aria-label="${c.label}">
      <div class="category-icon ${c.colorClass}">${c.icon}</div>
      <span class="category-label">${c.label}</span>
    </div>
  `).join('');

  el.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => _onCategoryClick(item));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _onCategoryClick(item); }
    });
  });
}

function _onCategoryClick(item) {
  const catId = item.id.replace('cat-', '');

  // Toggle off if already selected
  const alreadySelected = AppState.ui.selectedCategoryId === catId;
  const newCatId = alreadySelected ? null : catId;

  // Visual highlight: Clean, theme-matched active state without any blue outline
  document.querySelectorAll('.category-item').forEach(ci => ci.classList.remove('active'));
  if (!alreadySelected) {
    item.classList.add('active');
  }

  // Reset category page limit for fresh 2x5-6 grid view
  if (typeof window.resetCategoryPageLimit === 'function') {
    window.resetCategoryPageLimit();
  }

  setState({ ui: { selectedCategoryId: newCatId, searchQuery: '', activeFilters: [] } });
  const searchInput = document.getElementById('main-search');
  if (searchInput) searchInput.value = '';
  _resetAllChips();
  renderHome();
}

/* ─── AVAILABILITY CHIPS ─────────────────────────────────── */

function renderAvailChips() {
  const el = document.getElementById('avail-chips');
  if (!el) return;

  el.innerHTML = AVAIL_CHIPS.map(chip => `
    <div class="dynamic-chip ${chip.id === 'nearby' ? 'active' : ''}"
         id="chip-${chip.id}" role="button" tabindex="0"
         aria-pressed="${chip.id === 'nearby'}">
      <span class="dynamic-chip-dot ${chip.dotClass}"></span>
      <span class="dynamic-chip-label">${chip.label}</span>
    </div>
  `).join('');

  el.querySelectorAll('.dynamic-chip').forEach(chip => {
    chip.addEventListener('click', () => _onChipClick(chip));
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _onChipClick(chip); }
    });
  });
}

function _onChipClick(chip) {
  const chipId = chip.id.replace('chip-', '');
  const filters = [...AppState.ui.activeFilters];
  const idx = filters.indexOf(chipId);

  if (idx >= 0) {
    filters.splice(idx, 1);
    chip.classList.remove('active');
    chip.setAttribute('aria-pressed', 'false');
  } else {
    filters.push(chipId);
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');
  }

  setState({ ui: { activeFilters: filters } });
  renderHome();
}

function _resetAllChips() {
  document.querySelectorAll('.dynamic-chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-pressed', 'false');
  });
}

/* ─── HEADER GREETING ────────────────────────────────────── */

function setHeaderGreeting() {
  const header = document.getElementById('main-header');
  if (!header) return;
  const user = AppState.currentUser || {};
  const firstName = user.name ? user.name.trim().split(' ')[0] : 'there';
  const h = new Date().getHours();

  let greeting;
  if (h >= 22 || h < 5) {
    greeting = `Late-night studying, ${firstName}? 🌙`;
  } else if (h < 12) {
    greeting = `Good morning, ${firstName} ☀️`;
  } else if (h < 17) {
    greeting = `Good afternoon, ${firstName} 🥪`;
  } else {
    greeting = `Good evening, ${firstName} 🌆`;
  }
  header.setAttribute('data-greeting', greeting);
}

/* ─── NOTIFICATION BUTTON ────────────────────────────────── */

function initNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (btn) btn.addEventListener('click', () => navigate('notifications'));
}

/* ─── PROFILE BUTTON ─────────────────────────────────────── */

function initProfileBtn() {
  const btn = document.getElementById('profile-btn');
  const user = AppState.currentUser;
  if (btn && user) {
    const initial = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'A';
    btn.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
    btn.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.borderRadius = '50%';
    btn.addEventListener('click', () => navigate('profile'));
  }
}

/* ─── FOOTER / CANTFIND LINKS ────────────────────────────── */

function initPageLinks() {
  const cantFind = document.getElementById('cantfind-card');
  if (cantFind) {
    cantFind.addEventListener('click', () => navigate('request'));
    cantFind.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('request'); }
    });
  }

  document.getElementById('request-link')?.addEventListener('click', e => { e.preventDefault(); navigate('request'); });
  document.getElementById('help-link')?.addEventListener('click', e => { e.preventDefault(); showToast('Help & Support coming soon'); });
  document.getElementById('all-categories-link')?.addEventListener('click', e => {
    e.preventDefault();
    if (typeof _clearCategoryFilter === 'function') {
      _clearCategoryFilter();
    }
  });
  ['near-you-link', 'popular-link', 'restocked-link'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => e.preventDefault());
  });
}

/* ─── SHORTCUTS (STORES & NEARBY) ────────────────────────── */

function initShortcuts() {
  const storesBtn = document.getElementById('shortcut-stores');
  const nearbyBtn = document.getElementById('shortcut-nearby');

  if (storesBtn) {
    storesBtn.addEventListener('click', () => navigate('stores'));
    storesBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('stores'); }
    });
  }

  if (nearbyBtn) {
    nearbyBtn.addEventListener('click', () => {
      setState({ ui: { activeFilters: ['nearby'], selectedCategoryId: null, searchQuery: '' } });
      const searchInput = document.getElementById('main-search');
      if (searchInput) searchInput.value = '';
      _resetCategoryHighlight();
      _resetAllChips();
      const nearbyChip = document.getElementById('chip-nearby');
      if (nearbyChip) {
        nearbyChip.classList.add('active');
        nearbyChip.setAttribute('aria-pressed', 'true');
      }
      renderHome();
      const nearSec = document.getElementById('near-you-section');
      if (nearSec) {
        nearSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      showToast('Showing nearby items');
    });
    nearbyBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nearbyBtn.click(); }
    });
  }
}

