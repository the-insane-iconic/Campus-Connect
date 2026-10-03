/* =========================================================
   UNIMALL — STORES
   Stores directory + search + filters + sorting
========================================================= */

/* =========================================================
   STORE DATA
========================================================= */

// Intentionally empty — populated from Neon DB at runtime
let STORES = [];

/* =========================================================
   APPLICATION STATE
========================================================= */

const StoreState = {
  searchQuery: "",
  category: "all",
  status: "all",
  sort: "distance"
};


/* =========================================================
   DOM
========================================================= */

const storeList = document.getElementById("storeList");
const emptyState = document.getElementById("emptyState");

const storeCount = document.getElementById("storeCount");
const resultsTitle = document.getElementById("resultsTitle");

const searchSection = document.getElementById("searchSection");
const storeSearch = document.getElementById("storeSearch");
const clearSearch = document.getElementById("clearSearch");

const categoryFilters =
  document.getElementById("categoryFilters");

const filterButton =
  document.getElementById("filterButton");

const filterSheet =
  document.getElementById("filterSheet");

const sheetBackdrop =
  document.getElementById("sheetBackdrop");

const closeSheet =
  document.getElementById("closeSheet");

const applyFilters =
  document.getElementById("applyFilters");


/* =========================================================
   ICONS
========================================================= */

function locationIcon() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/>
      <circle cx="12" cy="9" r="2.2"/>
    </svg>
  `;
}


/* =========================================================
   STORE TYPE VISUAL HELPER
========================================================= */

function getStoreTypeVisual(category) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('cafe') || cat.includes('bakery') || cat.includes('dine') || cat.includes('restaurant') || cat.includes('canteen')) {
    return {
      label: 'Food & Dining',
      icon: '🍔',
      badgeClass: 'type-food',
      color: '#EA580C',
      bg: '#FFF7ED',
      border: '#FDBA74'
    };
  }
  if (cat.includes('groc') || cat.includes('snack') || cat.includes('daily') || cat.includes('essential')) {
    return {
      label: 'Groceries & Essentials',
      icon: '🛒',
      badgeClass: 'type-grocery',
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0'
    };
  }
  if (cat.includes('elect') || cat.includes('tech') || cat.includes('gadget') || cat.includes('mobile')) {
    return {
      label: 'Electronics & Tech',
      icon: '💻',
      badgeClass: 'type-electronics',
      color: '#4F46E5',
      bg: '#EEF2FF',
      border: '#C7D2FE'
    };
  }
  if (cat.includes('stat') || cat.includes('book') || cat.includes('print') || cat.includes('study')) {
    return {
      label: 'Stationery & Books',
      icon: '📚',
      badgeClass: 'type-stationery',
      color: '#E11D48',
      bg: '#FFF1F2',
      border: '#FECDD3'
    };
  }
  if (cat.includes('fash') || cat.includes('cloth') || cat.includes('wear') || cat.includes('apparel')) {
    return {
      label: 'Fashion & Apparel',
      icon: '👕',
      badgeClass: 'type-fashion',
      color: '#7C3AED',
      bg: '#FAF5FF',
      border: '#E9D5FF'
    };
  }
  if (cat.includes('sport') || cat.includes('fit') || cat.includes('gym')) {
    return {
      label: 'Sports & Fitness',
      icon: '⚽',
      badgeClass: 'type-sports',
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD'
    };
  }
  return {
    label: (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Campus Store'),
    icon: '🏪',
    badgeClass: 'type-default',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE'
  };
}

/* =========================================================
   STORE CARD
========================================================= */

function createStoreCard(store, index = 0) {
  const delay = Math.min(index * 30, 180);
  const rating = store.rating ? Number(store.rating).toFixed(1) : '4.6';
  const typeVisual = getStoreTypeVisual(store.category || store.categories?.[0]);
  const realLocation = store.location || store.floor || 'Campus Center';

  return `
    <button
      class="store-card fade-up"
      style="animation-delay: ${delay}ms;"
      data-store-id="${store.id}"
      aria-label="Open ${store.name}"
    >
      <div class="store-image-wrap">
        <img
          class="store-image"
          src="${store.coverImage}"
          alt="${store.name} storefront"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&auto=format&fit=crop&q=80'"
        >
        <span class="status-overlay-badge ${store.status}">
          <span class="status-dot"></span>
          ${store.statusLabel}
        </span>
      </div>

      <div class="store-content">
        <div class="store-header-row">
          <div class="store-name" title="${store.name}">
            ${store.name}
          </div>
          <div class="store-rating-tag" title="Rating ${rating} out of 5">
            ⭐ <span>${rating}</span>
          </div>
        </div>

        <div class="store-category">
          ${store.categoryLabel}
        </div>

        <div class="store-badges-row">
          <span class="store-type-badge ${typeVisual.badgeClass}" style="color:${typeVisual.color}; background:${typeVisual.bg}; border-color:${typeVisual.border};">
            <span class="store-type-icon">${typeVisual.icon}</span>
            <span class="store-type-label">${typeVisual.label}</span>
          </span>
          <span class="store-location-badge" title="${realLocation}">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span>${realLocation}</span>
          </span>
        </div>

        <div class="store-meta-footer">
          <div class="store-hours">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${store.openingTime} – ${store.closingTime}</span>
          </div>

          <div class="store-fulfillment-badge">
            <span class="fulfillment-dot"></span>${store.deliveryAvailable ? 'Hostel Delivery' : 'Pickup Only'}
          </div>
        </div>
      </div>

      <div class="store-arrow">
        <svg viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </button>
  `;
}


/* =========================================================
   FILTER
========================================================= */

function getFilteredStores() {
  let results = [...STORES];

  /* Search */
  const query =
    StoreState.searchQuery.trim().toLowerCase();

  if (query) {
    results = results.filter(store => {
      return (
        store.name.toLowerCase().includes(query) ||
        store.categoryLabel.toLowerCase().includes(query) ||
        (store.location && store.location.toLowerCase().includes(query)) ||
        store.categories.some(category =>
          category.toLowerCase().includes(query)
        )
      );
    });
  }

  /* Category / Admin-defined dynamic filter */
  if (StoreState.category && StoreState.category !== "all") {
    const selectedFilterId = StoreState.category.toLowerCase();
    const selectedFilterName = (StoreState.categoryName || '').toLowerCase();
    results = results.filter(store => {
      // 1. Matches store category directly
      const storeCat = String(store.category || store.categories?.[0] || '').toLowerCase();
      if (storeCat && (
        storeCat === selectedFilterId.replace('filter_', '') || 
        selectedFilterId.includes(storeCat) ||
        selectedFilterName.includes(storeCat) ||
        storeCat.includes(selectedFilterName)
      )) {
        return true;
      }
      // 2. Matches store.filterTags assigned by admin
      if (Array.isArray(store.filterTags) && store.filterTags.length > 0) {
        return store.filterTags.some(t => {
          const cleanT = String(t).toLowerCase();
          return cleanT === selectedFilterId || cleanT === selectedFilterName || selectedFilterName.includes(cleanT) || cleanT.includes(selectedFilterId.replace('filter_', ''));
        });
      }
      return false;
    });
  }

  /* Status */
  if (StoreState.status !== "all") {
    results = results.filter(store =>
      store.status === StoreState.status
    );
  }

  /* Sorting */
  switch (StoreState.sort) {
    case "distance":
      results.sort(
        (a, b) => a.distance - b.distance
      );
      break;

    case "name":
      results.sort(
        (a, b) =>
          a.name.localeCompare(b.name)
      );
      break;

    case "rating":
      results.sort(
        (a, b) =>
          b.rating - a.rating
      );
      break;

    case "popular":
      results.sort(
        (a, b) =>
          b.popularity - a.popularity
      );
      break;
  }

  return results;
}


let isStoresLoading = true;

/* =========================================================
   SKELETON SHIMMER LOADER
========================================================= */

function renderStoreSkeletons(count = 4) {
  if (!storeList) return;
  storeList.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");
  if (storeCount) storeCount.textContent = "Loading campus stores…";

  storeList.innerHTML = Array(count).fill(0).map(() => `
    <div class="store-card-skeleton" aria-hidden="true">
      <div class="skeleton-img skeleton-shimmer"></div>
      <div class="skeleton-details">
        <div>
          <div class="skeleton-line skeleton-shimmer" style="width: 75%; height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton-line skeleton-shimmer" style="width: 45%; height: 13px; margin-bottom: 12px;"></div>
        </div>
        <div style="display:flex; gap:8px; margin: 6px 0;">
          <div class="skeleton-shimmer" style="width: 90px; height: 22px; border-radius: 999px;"></div>
          <div class="skeleton-shimmer" style="width: 80px; height: 22px; border-radius: 999px;"></div>
        </div>
        <div class="skeleton-line skeleton-shimmer" style="width: 85%; height: 12px; margin-top: auto;"></div>
      </div>
    </div>
  `).join("");
}

/* =========================================================
   RENDER
========================================================= */

function renderStores() {
  if (isStoresLoading && STORES.length === 0) {
    renderStoreSkeletons(4);
    return;
  }

  const stores = getFilteredStores();

  storeList.innerHTML = "";

  if (stores.length === 0) {
    storeList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    storeCount.textContent = "0 stores";
    return;
  }

  storeList.classList.remove("hidden");
  emptyState.classList.add("hidden");

  storeCount.textContent =
    `${stores.length} ${stores.length === 1 ? "store" : "stores"}`;

  storeList.innerHTML =
    stores.map((store, index) => createStoreCard(store, index)).join("");

  document
    .querySelectorAll(".store-card")
    .forEach(card => {
      card.addEventListener("click", () => {
        const storeId = card.dataset.storeId;
        openStore(storeId);
      });
    });
}


/* =========================================================
   STORE OPEN
========================================================= */

function openStore(storeId) {
  const store = STORES.find(s => s.id === storeId);
  const targetId = (store && store.id) ? store.id : storeId;
  if (!targetId) return;

  // Navigate to the store detail page
  window.location.href = `store.html?id=${encodeURIComponent(targetId)}`;
}


/* =========================================================
   DYNAMIC DATABASE-DRIVEN CATEGORY & FILTER CHIPS
========================================================= */

async function loadAndRenderFilters() {
  const container = document.getElementById("categoryFilters");
  if (!container) return;

  let filters = [];
  if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStoreFilters === 'function') {
    try {
      filters = await window.UniMallDB.getStoreFilters();
    } catch (e) {
      console.warn('[stores.js] Error fetching DB store filters:', e);
    }
  }

  if (!filters || filters.length === 0) {
    filters = [
      { id: 'filter_food', name: 'Food & Dining' },
      { id: 'filter_groceries', name: 'Groceries & Essentials' },
      { id: 'filter_electronics', name: 'Electronics & Tech' },
      { id: 'filter_stationery', name: 'Stationery & Books' },
      { id: 'filter_fashion', name: 'Fashion & Apparel' },
      { id: 'filter_services', name: 'Campus Services' }
    ];
  }

  container.innerHTML = `
    <button class="filter-chip ${(!StoreState.category || StoreState.category === 'all') ? 'active' : ''}" data-category="all">All</button>
    ${filters.map(f => `
      <button class="filter-chip ${StoreState.category === f.id ? 'active' : ''}" data-category="${f.id}" data-name="${f.name}">
        ${f.name}
      </button>
    `).join('')}
  `;

  container.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      StoreState.category = button.dataset.category;
      StoreState.categoryName = button.dataset.name || '';
      updateResultsTitle();
      renderStores();
    });
  });
}
loadAndRenderFilters();


/* =========================================================
   SEARCH
========================================================= */

document
  .getElementById("searchToggle")
  .addEventListener("click", () => {
    searchSection.classList.toggle("hidden");

    if (!searchSection.classList.contains("hidden")) {
      storeSearch.focus();
    }
  });


storeSearch.addEventListener("input", event => {
  StoreState.searchQuery = event.target.value;
  renderStores();
});


clearSearch.addEventListener("click", () => {
  storeSearch.value = "";
  StoreState.searchQuery = "";
  renderStores();
  storeSearch.focus();
});


/* =========================================================
   FILTER SHEET
========================================================= */

filterButton.addEventListener("click", () => {
  sheetBackdrop.classList.remove("hidden");
  requestAnimationFrame(() => {
    filterSheet.classList.add("open");
  });
});


function closeFilterSheet() {
  filterSheet.classList.remove("open");
  setTimeout(() => {
    sheetBackdrop.classList.add("hidden");
  }, 250);
}


closeSheet.addEventListener(
  "click",
  closeFilterSheet
);

sheetBackdrop.addEventListener(
  "click",
  closeFilterSheet
);


/* =========================================================
   SHEET CATEGORY
========================================================= */

document
  .querySelectorAll("[data-sheet-category]")
  .forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-sheet-category]")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");

      StoreState.category =
        button.dataset.sheetCategory;
    });
  });


/* =========================================================
   SHEET STATUS
========================================================= */

document
  .querySelectorAll("[data-status]")
  .forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-status]")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");

      StoreState.status =
        button.dataset.status;
    });
  });


/* =========================================================
   SHEET SORT
========================================================= */

document
  .querySelectorAll("[data-sort]")
  .forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-sort]")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");

      StoreState.sort =
        button.dataset.sort;
    });
  });


/* =========================================================
   APPLY FILTERS
========================================================= */

applyFilters.addEventListener("click", () => {
  syncCategoryChip();
  updateResultsTitle();
  renderStores();
  closeFilterSheet();
});


/* =========================================================
   SYNC TOP CATEGORY CHIP
========================================================= */

function syncCategoryChip() {
  categoryFilters
    .querySelectorAll(".filter-chip")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category ===
        StoreState.category
      );
    });
}


/* =========================================================
   RESULTS TITLE
========================================================= */

function updateResultsTitle() {
  if (StoreState.searchQuery) {
    resultsTitle.textContent = "Search Results";
    return;
  }

  const categoryNames = {
    all: "All Stores",
    food: "Food Stores",
    stationery: "Stationery Stores",
    fashion: "Fashion Stores",
    sports: "Sports Stores",
    electronics: "Electronics Stores",
    services: "Services"
  };

  resultsTitle.textContent =
    categoryNames[StoreState.category] ||
    "All Stores";
}


/* =========================================================
   CLEAR FILTERS
========================================================= */

document
  .getElementById("clearFilters")
  .addEventListener("click", () => {
    resetFilters();
  });


document
  .getElementById("viewAll")
  .addEventListener("click", () => {
    resetFilters();
  });


function resetFilters() {
  StoreState.searchQuery = "";
  StoreState.category = "all";
  StoreState.status = "all";
  StoreState.sort = "distance";

  storeSearch.value = "";

  syncCategoryChip();

  document
    .querySelectorAll("[data-sheet-category]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.sheetCategory === "all"
      );
    });

  document
    .querySelectorAll("[data-status]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.status === "all"
      );
    });

  document
    .querySelectorAll("[data-sort]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.sort === "distance"
      );
    });

  updateResultsTitle();
  renderStores();
}


/* =========================================================
   BACK BUTTON
========================================================= */

document
  .getElementById("backButton")
  .addEventListener("click", () => {
    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = "index.html";
    }
  });


/* =========================================================
   SYNC CART BADGE
========================================================= */

function syncCartBadge() {
  try {
    let items = [];
    const v1 = localStorage.getItem("unimall_v1");
    if (v1) {
      const parsed = JSON.parse(v1);
      if (Array.isArray(parsed.cart)) items = parsed.cart;
    } else {
      const legacy = localStorage.getItem("unimall_cart");
      if (legacy) items = JSON.parse(legacy);
    }
    const totalCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const badges = document.querySelectorAll(".nav-badge, .cart-badge, .sidebar-badge");
    badges.forEach(badge => {
      badge.textContent = totalCount > 9 ? "9+" : String(totalCount);
      badge.style.display = totalCount > 0 ? "" : "none";
      badge.setAttribute("aria-label", `${totalCount} item${totalCount !== 1 ? 's' : ''} in cart`);
    });
    const cartNav = document.getElementById("nav-cart");
    if (cartNav) cartNav.setAttribute("aria-label", `Cart, ${totalCount} item${totalCount !== 1 ? 's' : ''}`);
  } catch (e) {}
}

function syncSidebarProfile() {
  try {
    let user = (typeof window.UserManager !== 'undefined' && typeof window.UserManager.getActiveUser === 'function')
      ? window.UserManager.getActiveUser()
      : null;

    if (!user) {
      const v1 = localStorage.getItem("unimall_v1");
      if (v1) {
        const parsed = JSON.parse(v1);
        if (parsed.currentUser) user = parsed.currentUser;
      }
      const auth = localStorage.getItem("unimall_auth");
      if (auth) {
        const parsedAuth = JSON.parse(auth);
        user = { ...(user || {}), ...parsedAuth };
      }
    }
    if (!user) return;

    const nameEl = document.querySelector(".sidebar-profile-name");
    const roleEl = document.querySelector(".sidebar-profile-role");
    const avatarEl = document.querySelector(".sidebar-avatar");

    if (nameEl) nameEl.textContent = user.name || 'Campus Student';
    if (roleEl) {
      if (user.hostel && user.room) {
        roleEl.textContent = `${user.hostel} · ${user.room}`;
      } else {
        roleEl.textContent = user.email || 'Campus Account';
      }
    }
    if (avatarEl) {
      const initial = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'U';
      avatarEl.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
      avatarEl.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
      avatarEl.style.display = 'flex';
      avatarEl.style.alignItems = 'center';
      avatarEl.style.justifyContent = 'center';
      avatarEl.style.borderRadius = '50%';
    }
  } catch (e) {}
}

syncCartBadge();
syncSidebarProfile();


function syncStoreStatuses() {
  try {
    const raw = localStorage.getItem('unimall_store_statuses');
    const statuses = raw ? JSON.parse(raw) : {};
    const visibilityRaw = localStorage.getItem('unimall_store_visibility');
    const visibility = visibilityRaw ? JSON.parse(visibilityRaw) : {};

    // Update store open/closed status using direct store ID (no legacy alias map)
    STORES.forEach(s => {
      if (statuses[s.id] !== undefined) {
        const isOpen = Boolean(statuses[s.id]);
        s.status = isOpen ? 'open' : 'closed';
        s.statusLabel = isOpen ? 'Open' : 'Closed';
      }
      // Apply localStorage visibility override (cross-tab real-time, before DB reflects)
      if (visibility[s.id] !== undefined) {
        s.isVisible = Boolean(visibility[s.id]);
      }
    });

    // Filter out stores that are explicitly hidden
    STORES = STORES.filter(s => s.isVisible !== false);

    // Also include approved registered stores
    const regRaw = localStorage.getItem('unimall_registered_stores');
    if (regRaw) {
      const regStores = JSON.parse(regRaw);
      regStores.filter(r => r.status === 'approved').forEach(r => {
        const isVisible = visibility[r.storeId] !== false;
        if (!isVisible) return; // skip hidden stores
        if (!STORES.some(s => s.id === r.storeId)) {
          const isOpen = statuses[r.storeId] !== false;
          STORES.push({
            id: r.storeId,
            name: r.storeName,
            categories: [r.storeType || 'food'],
            categoryLabel: r.description || `${r.storeType || 'Campus'} Store`,
            coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&auto=format&fit=crop&q=80',
            status: isOpen ? 'open' : 'closed',
            statusLabel: isOpen ? 'Open' : 'Closed',
            isVisible: true,
            openingTime: '9:00 AM',
            closingTime: '9:00 PM',
            distance: 2,
            walkingTime: 3,
            floor: r.location || 'Campus Center',
            rating: 4.8,
            popularity: 90
          });
        }
      });
    }
  } catch(e) {}
}

function mapDbStoreToCard(s) {
  const loc = s.location ? s.location.trim() : (s.floor ? s.floor.trim() : 'Campus Center');
  const cat = s.category || 'food';
  const filterTags = s.filter_tags 
    ? String(s.filter_tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    id: s.id,
    name: s.name,
    category: cat,
    categories: [cat],
    categoryLabel: s.description || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Store`,
    location: loc,
    floor: loc,
    filterTags: filterTags,
    coverImage: s.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&auto=format&fit=crop&q=80',
    status: s.is_open ? 'open' : 'closed',
    statusLabel: s.is_open ? 'Open' : 'Closed',
    isVisible: s.is_visible !== false,
    deliveryAvailable: s.delivery_available !== false,
    pickupAvailable: s.pickup_available !== false,
    openingTime: s.opening_time || '8:00 AM',
    closingTime: s.closing_time || '10:00 PM',
    rating: Number(s.rating) || 4.5,
    popularity: s.popularity || 85
  };
}

// 1. Instant 0ms hydration from cache on reload or navigation
try {
  const cached = sessionStorage.getItem('unimall_swr_stores');
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
      STORES = parsed.data.map(mapDbStoreToCard);
      isStoresLoading = false;
    }
  }
} catch (e) {}

syncStoreStatuses();

window.addEventListener('storage', (e) => {
  if (e.key === 'unimall_store_status_event' || e.key === 'unimall_store_statuses') {
    syncStoreStatuses();
    renderStores();
  }
});

// Render immediately (either 0ms cached cards or 4 shimmering skeletons)
renderStores();

// 2. Fetch authoritative stores from Neon DB (SWR protected)
// getStores() already filters hidden stores (is_visible = true) at the DB level
if (typeof window.UniMallDB !== 'undefined') {
  window.UniMallDB.getStores().then(dbStores => {
    isStoresLoading = false;
    if (dbStores && Array.isArray(dbStores) && dbStores.length > 0) {
      STORES = dbStores.map(mapDbStoreToCard).filter(s => s.isVisible !== false);
      syncStoreStatuses();
      renderStores();
    }
  }).catch(() => {
    isStoresLoading = false;
    renderStores();
  });
}

// 3. Listen for background SWR revalidation updates
window.addEventListener('unimall:dataRevalidated', (e) => {
  if (e.detail && e.detail.key === 'stores' && Array.isArray(e.detail.data)) {
    STORES = e.detail.data.map(mapDbStoreToCard).filter(s => s.isVisible !== false);
    syncStoreStatuses();
    renderStores();
  }
});

// 4. Re-fetch when store visibility changes (admin hiding/showing a store)
window.addEventListener('unimall:storeVisibilityChanged', () => {
  if (typeof window.UniMallDB !== 'undefined') {
    window.UniMallDB.invalidateCache('stores');
    window.UniMallDB.getStores().then(dbStores => {
      if (dbStores && Array.isArray(dbStores)) {
        STORES = dbStores.map(mapDbStoreToCard).filter(s => s.isVisible !== false);
        renderStores();
      }
    }).catch(() => {});
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'unimall_store_visibility' || e.key === 'unimall_catalog_sync_event') {
    if (typeof window.UniMallDB !== 'undefined') {
      window.UniMallDB.invalidateCache('stores');
      window.UniMallDB.getStores().then(dbStores => {
        if (dbStores && Array.isArray(dbStores)) {
          STORES = dbStores.map(mapDbStoreToCard).filter(s => s.isVisible !== false);
          syncStoreStatuses();
          renderStores();
        }
      }).catch(() => {});
    }
  }
});


