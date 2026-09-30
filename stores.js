/* =========================================================
   UNIMALL — STORES
   Stores directory + search + filters + sorting
========================================================= */

/* =========================================================
   STORE DATA
========================================================= */

let STORES = [
  {
    id: "campus-cafe",
    name: "Campus Bakery & Café",
    categories: ["food"],
    categoryLabel: "Bakery, Snacks, Coffee & Beverages",
    coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "7:30 AM",
    closingTime: "10:00 PM",
    distance: 2,
    walkingTime: 2,
    floor: "Ground Floor",
    location: "Block A, Food Court",
    rating: 4.7,
    popularity: 95
  },
  {
    id: "book-corner",
    name: "Stationery Hub & Book Corner",
    categories: ["stationery"],
    categoryLabel: "Course Books, Notebooks, Stationery & Print",
    coverImage: "https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "9:00 AM",
    closingTime: "8:30 PM",
    distance: 2,
    walkingTime: 2,
    floor: "First Floor",
    location: "Block B, Academic Wing",
    rating: 4.6,
    popularity: 92
  },
  {
    id: "techstop",
    name: "TechStop Electronics",
    categories: ["electronics"],
    categoryLabel: "Chargers, Earbuds, Gadgets, Peripherals",
    coverImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "10:00 AM",
    closingTime: "9:00 PM",
    distance: 3,
    walkingTime: 3,
    floor: "Ground Floor",
    location: "Block C, Tech Hub",
    rating: 4.5,
    popularity: 88
  },
  {
    id: "campus-mart",
    name: "Campus Mart & Groceries",
    categories: ["essentials", "food"],
    categoryLabel: "Late Night Essentials, Ramen & Groceries",
    coverImage: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "8:00 AM",
    closingTime: "11:00 PM",
    distance: 2,
    walkingTime: 2,
    floor: "Ground Floor",
    location: "Hostel Quadrangle",
    rating: 4.3,
    popularity: 85
  },
  {
    id: "campus-wear",
    name: "Campus Wear & Style Square",
    categories: ["fashion"],
    categoryLabel: "Collegiate Hoodies, Varsity Jackets & Sportswear",
    coverImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "11:00 AM",
    closingTime: "8:00 PM",
    distance: 4,
    walkingTime: 4,
    floor: "First Floor",
    location: "Student Activity Center",
    rating: 4.6,
    popularity: 80
  },
  {
    id: "health-hub",
    name: "Health Hub & Care",
    categories: ["essentials"],
    categoryLabel: "Protein Bars, Electrolytes, First-Aid & Wellness",
    coverImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80",
    status: "open",
    statusLabel: "Open",
    openingTime: "8:00 AM",
    closingTime: "9:00 PM",
    distance: 1,
    walkingTime: 1,
    floor: "Ground Floor",
    location: "Near Campus Clinic",
    rating: 4.5,
    popularity: 78
  }
];


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
   STORE CARD
========================================================= */

function createStoreCard(store, index = 0) {
  const delay = Math.min(index * 30, 180);
  const rating = store.rating ? Number(store.rating).toFixed(1) : '4.6';
  const locationText = store.location || `${store.walkingTime || 2} min walk (${store.floor || 'Ground Floor'})`;

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
          <span class="store-badge-pill delivery">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M5 12h14M5 12l4-4M5 12l4 4"/></svg>
            Hostel Delivery
          </span>
          <span class="store-badge-pill floor">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
            ${store.floor || 'Ground Floor'}
          </span>
        </div>

        <div class="store-meta-footer">
          <div class="store-hours">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${store.openingTime} – ${store.closingTime}</span>
          </div>

          <div class="store-location">
            ${locationIcon()}
            <span>${locationText}</span>
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
        store.categories.some(category =>
          category.toLowerCase().includes(query)
        )
      );
    });
  }

  /* Category */
  if (StoreState.category !== "all") {
    results = results.filter(store =>
      store.categories.includes(StoreState.category)
    );
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


/* =========================================================
   RENDER
========================================================= */

function renderStores() {
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
  if (!store) return;

  // Navigate to the store detail page
  window.location.href = `store.html?id=${encodeURIComponent(store.id)}`;
}


/* =========================================================
   CATEGORY FILTER
========================================================= */

categoryFilters
  .querySelectorAll(".filter-chip")
  .forEach(button => {
    button.addEventListener("click", () => {
      categoryFilters
        .querySelectorAll(".filter-chip")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");

      StoreState.category =
        button.dataset.category;

      updateResultsTitle();
      renderStores();
    });
  });


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
    let user = null;
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
    if (!user) return;

    const nameEl = document.querySelector(".sidebar-profile-name");
    const roleEl = document.querySelector(".sidebar-profile-role");
    const avatarEl = document.querySelector(".sidebar-avatar");

    if (nameEl && user.name) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = `${user.hostel || 'Hostel B'} · ${user.room || 'Room 214'}`;
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

    const aliasMap = {
      'store-bakery': ['campus-cafe', 'store-bakery'],
      'store-stationery': ['book-corner', 'store-stationery'],
      'store-electronics': ['techstop', 'store-electronics'],
      'store-sports': ['campus-mart', 'store-sports'],
      'store-fashion': ['campus-wear', 'store-fashion'],
      'store-pharmacy': ['health-hub', 'store-pharmacy']
    };

    STORES.forEach(s => {
      const keys = aliasMap[s.id] || [s.id];
      for (const k of keys) {
        if (statuses[k] !== undefined) {
          const isOpen = Boolean(statuses[k]);
          s.status = isOpen ? 'open' : 'closed';
          s.statusLabel = isOpen ? 'Open' : 'Closed';
          break;
        }
      }
    });

    // Also include approved registered stores
    const regRaw = localStorage.getItem('unimall_registered_stores');
    if (regRaw) {
      const regStores = JSON.parse(regRaw);
      regStores.filter(r => r.status === 'approved').forEach(r => {
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

syncStoreStatuses();
window.addEventListener('storage', (e) => {
  if (e.key === 'unimall_store_status_event' || e.key === 'unimall_store_statuses') {
    syncStoreStatuses();
    renderStores();
  }
});

renderStores();

if (typeof window.UniMallDB !== 'undefined') {
  window.UniMallDB.getStores().then(dbStores => {
    if (dbStores && Array.isArray(dbStores) && dbStores.length > 0) {
      const currentIds = STORES.map(s => s.id).sort().join(',');
      const incomingIds = dbStores.map(s => s.id).sort().join(',');
      if (currentIds !== incomingIds || dbStores.length !== STORES.length) {
        STORES = dbStores.map(s => ({
          id: s.id,
          name: s.name,
          categories: [s.category || 'food'],
          categoryLabel: s.description || 'Campus Store',
          coverImage: s.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&auto=format&fit=crop&q=80',
          status: s.is_open ? 'open' : 'closed',
          statusLabel: s.is_open ? 'Open' : 'Closed',
          openingTime: s.opening_time || '8:00 AM',
          closingTime: s.closing_time || '10:00 PM',
          distance: 2,
          walkingTime: 3,
          floor: s.floor || 'Ground Floor',
          rating: Number(s.rating) || 4.5,
          popularity: s.popularity || 85
        }));
        renderStores();
      }
    }
  }).catch(() => {});
}

