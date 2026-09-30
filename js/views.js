/* ═══════════════════════════════════════════════════════════
   UniMall · js/views.js
   All non-home screen renderers + navigation controller.
   Depends on: data.js, state.js, ui.js, cart.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   NAVIGATION CONTROLLER
   ═══════════════════════════════════════════════════════════ */

/**
 * Navigate to a named view. Updates active nav states and
 * either shows the home page or opens the overlay.
 * @param {string} viewName
 * @param {Object} [params]
 */
function navigate(viewName, params = {}) {
  setState({ ui: { currentView: viewName, ...params } });
  _syncNavActiveState(viewName);

  switch (viewName) {
    case 'home': closeOverlay(); renderHome(); break;
    case 'stores': window.location.href = 'stores.html'; break;
    case 'product': _openProduct(params.selectedProductId); break;
    case 'cart': window.location.href = 'cart.html'; break;
    case 'checkout': window.location.href = 'cart.html'; break;
    case 'order-confirm': _openOrderConfirmation(params.selectedOrderId); break;
    case 'orders': window.location.href = 'orders.html'; break;
    case 'order-detail': window.location.href = `orders.html#${params.selectedOrderId || ''}`; break;
    case 'profile': window.location.href = 'profile.html'; break;
    case 'notifications': _openNotifications(); break;
    case 'request': _openRequestForm(); break;
    default: closeOverlay();
  }
}

function _syncNavActiveState(viewName) {
  const navMap = {
    home: 'nav-home', stores: 'nav-stores', cart: 'nav-cart', checkout: 'nav-cart',
    orders: 'nav-orders', 'order-detail': 'nav-orders',
    'order-confirm': 'nav-orders',
    profile: 'nav-profile', notifications: 'nav-home',
    product: null, request: null,
  };
  const targetId = navMap[viewName];

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('aria-current');
  });
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) { el.classList.add('active'); el.setAttribute('aria-current', 'page'); }
  }

  // Sidebar
  const sbMap = {
    home: 'sb-home', stores: 'sb-stores', cart: 'sb-cart', orders: 'sb-orders',
    'order-detail': 'sb-orders', profile: 'sb-profile',
    request: 'sb-request',
  };
  const sbId = sbMap[viewName];
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.remove('active'); el.removeAttribute('aria-current');
  });
  if (sbId) {
    const el = document.getElementById(sbId);
    if (el) { el.classList.add('active'); el.setAttribute('aria-current', 'page'); }
  }
}

/* ═══════════════════════════════════════════════════════════
   HOME — filtered product sections
   ═══════════════════════════════════════════════════════════ */

let categoryPageLimit = 10;
window.resetCategoryPageLimit = () => { categoryPageLimit = 10; };

function renderHome() {
  const { searchQuery, selectedCategoryId, activeFilters } = AppState.ui;

  // 1. If a category is selected, show dedicated category products view
  if (selectedCategoryId) {
    _renderCategoryView(selectedCategoryId);
    return;
  }

  // 2. Otherwise ensure category section is hidden and default flow is visible
  const categorySection = document.getElementById('category-view-section');
  const defaultFlow = document.getElementById('home-default-flow');
  if (categorySection) categorySection.style.display = 'none';
  if (defaultFlow) {
    defaultFlow.style.display = '';
    defaultFlow.style.opacity = '1';
    defaultFlow.style.transform = 'none';
  }

  const isFiltered = searchQuery || activeFilters.length > 0;
  if (isFiltered) {
    _renderFilteredResults();
  } else {
    _renderDefaultHomeSections();
  }

  // Render hero active order pickup pass banner
  if (typeof renderActiveOrderBanner === 'function') {
    renderActiveOrderBanner();
  }
}

function _renderCategoryView(categoryId) {
  const categorySection = document.getElementById('category-view-section');
  const defaultFlow = document.getElementById('home-default-flow');
  if (!categorySection) return;

  const cat = CATEGORIES.find(c => c.id === categoryId);
  const catName = cat ? cat.label : 'Category Products';

  // Filter products for this category
  const { activeFilters } = AppState.ui;
  let allCategoryProducts = AppState.products.filter(p => {
    if (categoryId === 'more') return true;
    return p.categoryId === categoryId;
  });

  // Also apply active availability chips if any
  for (const chipId of activeFilters) {
    const chip = AVAIL_CHIPS.find(c => c.id === chipId);
    if (chip) {
      allCategoryProducts = allCategoryProducts.filter(p => p[chip.field] === chip.value);
    }
  }

  const total = allCategoryProducts.length;
  const visibleProducts = allCategoryProducts.slice(0, categoryPageLimit);

  // Update header title & count badge
  const titleEl = document.getElementById('category-view-title');
  const countBadge = document.getElementById('category-view-count-badge');
  if (titleEl) titleEl.textContent = catName;
  if (countBadge) {
    countBadge.textContent = total > 0 ? `${visibleProducts.length} of ${total} items` : '0 items';
  }

  // Wire clear filter button
  const clearBtn = document.getElementById('category-view-clear-btn');
  if (clearBtn) {
    clearBtn.onclick = (e) => {
      e.preventDefault();
      _clearCategoryFilter();
    };
  }

  // Render 2-column grid
  const grid = document.getElementById('category-products-grid');
  if (grid) {
    if (visibleProducts.length === 0) {
      grid.innerHTML = `
        <div class="empty-category-view" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px;">
          <div style="font-size: 38px; margin-bottom: 8px;">📦</div>
          <div style="font-weight: 700; font-size: 16px; color: var(--text-primary);">No items in this category yet</div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Check back soon as campus stores restock.</div>
          <button class="empty-results-btn" style="margin-top: 16px;" id="empty-cat-clear-btn">Browse All Products</button>
        </div>
      `;
      grid.querySelector('#empty-cat-clear-btn')?.addEventListener('click', _clearCategoryFilter);
    } else {
      grid.innerHTML = visibleProducts.map(buildProductCard).join('');
      _wireCategoryCardEvents(grid);
    }
  }

  // Load More Button
  const loadMoreWrap = document.getElementById('category-load-more-wrap');
  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreWrap && loadMoreBtn) {
    if (visibleProducts.length < total) {
      const remaining = total - visibleProducts.length;
      loadMoreWrap.style.display = 'flex';
      loadMoreBtn.disabled = false;
      loadMoreBtn.style.pointerEvents = 'auto';
      loadMoreBtn.style.opacity = '1';
      loadMoreBtn.innerHTML = `
        <span>Load More Products (+${remaining})</span>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"/></svg>
      `;
      loadMoreBtn.onclick = (e) => {
        e.preventDefault();
        categoryPageLimit += 6;
        loadMoreBtn.innerHTML = `<span>Loading products...</span>`;
        setTimeout(() => {
          _renderCategoryView(categoryId);
        }, 120);
      };
    } else if (total > 0) {
      loadMoreWrap.style.display = 'flex';
      loadMoreBtn.disabled = true;
      loadMoreBtn.style.pointerEvents = 'none';
      loadMoreBtn.style.opacity = '0.6';
      loadMoreBtn.innerHTML = `<span>All ${total} products loaded ✓</span>`;
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  // Smooth fade transition: fade out default sections and fade in category section
  if (defaultFlow && defaultFlow.style.display !== 'none') {
    defaultFlow.classList.add('fading-out');
    setTimeout(() => {
      defaultFlow.style.display = 'none';
      defaultFlow.classList.remove('fading-out');
      categorySection.style.display = 'block';
    }, 150);
  } else {
    categorySection.style.display = 'block';
  }
}

function _clearCategoryFilter() {
  categoryPageLimit = 10;
  setState({ ui: { selectedCategoryId: null, searchQuery: '', activeFilters: [] } });
  document.querySelectorAll('.category-item').forEach(ci => ci.classList.remove('active'));

  const categorySection = document.getElementById('category-view-section');
  const defaultFlow = document.getElementById('home-default-flow');

  if (categorySection && defaultFlow) {
    categorySection.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    categorySection.style.opacity = '0';
    categorySection.style.transform = 'translateY(12px)';

    setTimeout(() => {
      categorySection.style.display = 'none';
      categorySection.style.opacity = '';
      categorySection.style.transform = '';
      categorySection.style.transition = '';

      defaultFlow.style.display = '';
      defaultFlow.style.opacity = '0';
      defaultFlow.style.transform = 'translateY(12px)';
      requestAnimationFrame(() => {
        defaultFlow.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        defaultFlow.style.opacity = '1';
        defaultFlow.style.transform = 'translateY(0)';
      });
    }, 180);
  }

  _renderDefaultHomeSections();
}

function _wireCategoryCardEvents(container) {
  container.querySelectorAll('.add-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = getProduct(btn.dataset.pid);
      cartAdd(btn.dataset.pid);
      updateCartBadges();
      showYayCartToast(prod ? prod.name : 'Item');

      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 200);
    });
  });

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => navigate('product', { selectedProductId: card.dataset.pid }));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate('product', { selectedProductId: card.dataset.pid });
    });
  });
}

function _renderDefaultHomeSections() {
  // Show normal section headers
  _setHomeSectionsVisible(true);

  const nearYou = AppState.products.filter(p => p.isNearby);
  const popular = AppState.products.filter(p => p.isPopular);
  const restocked = AppState.products.filter(p => p.isRestocked);

  _fillProductSection('near-you-scroll', nearYou);
  _fillProductSection('popular-scroll', popular);
  _fillProductSection('restocked-scroll', restocked);
}

function _renderFilteredResults() {
  const filtered = getFilteredProducts();

  // Hide default sections and use "Available Near You" slot for results
  _setHomeSectionsVisible(false);

  const section = document.getElementById('near-you-section');
  if (!section) return;
  section.style.display = '';

  const header = section.querySelector('.section-title');
  if (header) {
    const q = AppState.ui.searchQuery;
    header.textContent = q ? `Results for "${q}"` : 'Filtered Results';
  }

  const link = section.querySelector('.section-link');
  if (link) link.style.display = 'none';

  if (filtered.length === 0) {
    const container = document.getElementById('near-you-scroll');
    if (container) {
      container.innerHTML = `
        <div class="empty-results">
          <div class="empty-results-emoji">🔍</div>
          <div class="empty-results-title">Nothing found</div>
          <div class="empty-results-sub">Try a different search term or clear your filters.</div>
          <button class="empty-results-btn" id="clear-filters-btn">Clear filters</button>
        </div>
      `;
      container.querySelector('#clear-filters-btn')?.addEventListener('click', () => {
        setState({ ui: { searchQuery: '', selectedCategoryId: null, activeFilters: [] } });
        document.getElementById('main-search').value = '';
        _resetCategoryHighlight();
        _resetChipHighlight();
        renderHome();
      });
    }
  } else {
    _fillProductSection('near-you-scroll', filtered);
  }
}

function _setHomeSectionsVisible(visible) {
  ['near-you-section', 'popular-section', 'restocked-section'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? '' : 'none';

    const header = el.querySelector('.section-title');
    const link = el.querySelector('.section-link');
    if (header) {
      // Restore original titles
      const titles = { 'near-you-section': 'Available Near You', 'popular-section': 'Popular Right Now', 'restocked-section': 'Recently Restocked' };
      header.textContent = titles[id] || header.textContent;
    }
    if (link) link.style.display = '';
  });

  if (!visible) {
    document.getElementById('near-you-section').style.display = '';
  }
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT CARD BUILDER
   ═══════════════════════════════════════════════════════════ */

function buildProductCard(product) {
  const { id, name, price, availability, stock, storeId, emoji, image, bg } = product;
  const store = getStore(storeId) || {};
  const unavailable = availability === 'out-of-stock';

  const availMap = {
    'in-stock': { cls: 'in-stock', label: 'In stock' },
    'low-stock': { cls: 'low-stock', label: `Only ${stock} left` },
    'out-of-stock': { cls: 'out-of-stock', label: 'Out of stock' },
    'preorder': { cls: 'preorder', label: 'Pre-order' },
  };
  const avail = availMap[availability] || availMap['in-stock'];

  const imgHtml = image
    ? `<img class="product-thumb-img" src="${image}" alt="${name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="product-fallback-emoji" style="display:none;" aria-hidden="true">${emoji}</span>`
    : `<span class="product-fallback-emoji" aria-hidden="true">${emoji}</span>`;

  return `
    <article class="product-card" role="listitem" id="product-${id}"
             tabindex="0" data-pid="${id}"
             aria-label="${name}, ₹${fmtPrice(price)}, ${avail.label}">
      <div class="product-img-wrap" style="background:${bg};" aria-hidden="true">${imgHtml}</div>
      <div class="product-info">
        <div class="product-name">${name}</div>
        <div class="product-store">${store.name || ''}</div>
        <div class="product-price"><span class="currency">₹</span>${fmtPrice(price)}</div>
        <div class="product-footer">
          <span class="avail-badge ${avail.cls}">
            <span class="dot" aria-hidden="true"></span>
            <span class="avail-badge-text">${avail.label}</span>
          </span>
          <button
            class="add-btn${unavailable ? ' disabled' : ''}"
            ${unavailable ? 'disabled aria-disabled="true"' : `data-pid="${id}"`}
            aria-label="${unavailable ? `${name} unavailable` : `Add ${name} to cart`}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function _fillProductSection(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || products.length === 0) {
    const section = container.closest('section');
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = products.map(buildProductCard).join('');

  container.querySelectorAll('.add-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = getProduct(btn.dataset.pid);
      cartAdd(btn.dataset.pid);
      updateCartBadges();
      showYayCartToast(prod ? prod.name : 'Item');

      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 200);
    });
  });

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => navigate('product', { selectedProductId: card.dataset.pid }));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate('product', { selectedProductId: card.dataset.pid });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT DETAIL
   ═══════════════════════════════════════════════════════════ */

function _openProduct(productId) {
  const p = getProduct(productId);
  if (!p) return;
  const store = getStore(p.storeId) || {};

  const inCart = AppState.cart.find(l => l.productId === p.id);
  const qty = inCart ? inCart.qty : 0;
  const unavailable = p.availability === 'out-of-stock';

  const pdImgHtml = p.image
    ? `<img class="pd-full-img" src="${p.image}" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="pd-emoji" style="display:none;">${p.emoji}</span>`
    : `<span class="pd-emoji">${p.emoji}</span>`;

  const html = `
    <div class="pd-img-wrap" style="background:${p.bg};" aria-hidden="true">
      ${pdImgHtml}
    </div>

    <div class="pd-body">
      <div class="pd-store">${store.name || ''}</div>
      <h1 class="pd-name">${p.name}</h1>
      <div class="pd-price"><span class="currency">₹</span>${fmtPrice(p.price)}</div>

      <div class="pd-meta-row">
        ${availBadgeHtml(p)}
        ${p.rating ? `<span class="pd-rating">★ ${p.rating.toFixed(1)}</span>` : ''}
      </div>

      <p class="pd-description">${p.description}</p>

      <div class="pd-info-grid">
        <div class="pd-info-item">
          <span class="pd-info-icon">🏪</span>
          <div>
            <div class="pd-info-label">Store</div>
            <div class="pd-info-val">${store.name || '—'} · ${store.floor || ''} floor</div>
          </div>
        </div>
        <div class="pd-info-item">
          <span class="pd-info-icon">${p.deliveryAvailable ? '🛵' : '❌'}</span>
          <div>
            <div class="pd-info-label">Hostel Delivery</div>
            <div class="pd-info-val">${p.deliveryAvailable ? 'Available' : 'Not available'}</div>
          </div>
        </div>
        <div class="pd-info-item">
          <span class="pd-info-icon">${p.pickupAvailable ? '📦' : '❌'}</span>
          <div>
            <div class="pd-info-label">Pickup</div>
            <div class="pd-info-val">${p.pickupAvailable ? 'Available' : 'Not available'}</div>
          </div>
        </div>
        ${store.openNow !== undefined ? `
        <div class="pd-info-item">
          <span class="pd-info-icon">🕐</span>
          <div>
            <div class="pd-info-label">Store status</div>
            <div class="pd-info-val ${store.openNow ? 'text-green' : 'text-red'}">${store.openNow ? 'Open now' : 'Closed'} · ${store.hours || ''}</div>
          </div>
        </div>` : ''}
      </div>

      ${unavailable ? '' : `
      <div class="pd-qty-row">
        <span class="pd-qty-label">Quantity</span>
        <div class="pd-qty-ctrl">
          <button class="pd-qty-btn" id="pd-qty-dec" aria-label="Decrease quantity">−</button>
          <span class="pd-qty-val" id="pd-qty-val">${qty || 1}</span>
          <button class="pd-qty-btn" id="pd-qty-inc" aria-label="Increase quantity">+</button>
        </div>
      </div>`}

      <div class="pd-actions">
        ${unavailable
      ? `<button class="pd-btn-primary" disabled>Out of Stock</button>`
      : `<button class="pd-btn-primary" id="pd-add-btn">Add to Cart</button>`
    }
      </div>
    </div>
  `;

  showOverlay(html, p.name, () => navigate('home'));

  if (!unavailable) {
    let localQty = qty || 1;
    const qtyVal = document.getElementById('pd-qty-val');
    const decBtn = document.getElementById('pd-qty-dec');
    const incBtn = document.getElementById('pd-qty-inc');
    const addBtn = document.getElementById('pd-add-btn');

    const updateQtyDisplay = () => {
      if (qtyVal) qtyVal.textContent = localQty;
      if (decBtn) decBtn.disabled = localQty <= 1;
      if (incBtn) incBtn.disabled = localQty >= p.stock;
    };
    updateQtyDisplay();

    decBtn?.addEventListener('click', () => { if (localQty > 1) { localQty--; updateQtyDisplay(); } });
    incBtn?.addEventListener('click', () => { if (localQty < p.stock) { localQty++; updateQtyDisplay(); } });

    addBtn?.addEventListener('click', () => {
      // Set qty to desired amount
      const existing = AppState.cart.find(l => l.productId === p.id);
      if (existing) {
        existing.qty = Math.min(existing.qty + localQty, p.stock);
        setState({});
      } else {
        AppState.cart.push({ productId: p.id, qty: localQty });
        setState({});
      }
      updateCartBadges();
      showYayCartToast(p.name);
      closeOverlay();
      navigate('home');
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   CART
   ═══════════════════════════════════════════════════════════ */

function _openCart() {
  showOverlay(_buildCartHtml(), 'Cart', () => navigate('home'));
  _bindCartEvents();
}

function _buildCartHtml() {
  const items = getCartItems();
  const totals = getCartTotals();

  if (items.length === 0) {
    return `
      <div class="empty-screen">
        <div class="empty-screen-emoji">🛒</div>
        <div class="empty-screen-title">Your cart is empty</div>
        <div class="empty-screen-sub">Add items from the home screen to get started.</div>
        <button class="em-btn" id="cart-browse-btn">Browse Products</button>
      </div>
    `;
  }

  const itemsHtml = items.map(line => {
    const itemImg = line.product.image
      ? `<img src="${line.product.image}" alt="${line.product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span style="display:none;">${line.product.emoji}</span>`
      : `<span>${line.product.emoji}</span>`;

    return `
      <div class="cart-item" data-pid="${line.productId}">
        <div class="cart-item-img" style="background:${line.product.bg};">${itemImg}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${line.product.name}</div>
          <div class="cart-item-store">${(getStore(line.product.storeId) || {}).name || ''}</div>
          <div class="cart-item-price">₹${fmtPrice(line.product.price)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn cart-dec" data-pid="${line.productId}" aria-label="Decrease">−</button>
          <span class="cart-qty">${line.qty}</span>
          <button class="cart-qty-btn cart-inc" data-pid="${line.productId}" aria-label="Increase">+</button>
          <button class="cart-remove" data-pid="${line.productId}" aria-label="Remove">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="cart-items">${itemsHtml}</div>
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Subtotal</span><span>₹${fmtPrice(totals.subtotal)}</span></div>
      <div class="cart-summary-row text-secondary"><span>Delivery fee</span><span>${totals.deliveryFee > 0 ? '₹' + totals.deliveryFee : 'Calculated at checkout'}</span></div>
      <div class="cart-summary-row cart-total"><span>Total</span><span>₹${fmtPrice(totals.subtotal)}</span></div>
      <button class="cart-checkout-btn" id="cart-checkout-btn">Proceed to Checkout</button>
    </div>
  `;
}

function _bindCartEvents() {
  const overlay = document.getElementById('screen-overlay');
  if (!overlay) return;

  overlay.querySelector('#cart-checkout-btn')?.addEventListener('click', () => navigate('checkout'));
  overlay.querySelector('#cart-browse-btn')?.addEventListener('click', () => navigate('home'));

  overlay.querySelectorAll('.cart-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      cartUpdateQty(btn.dataset.pid, -1);
      updateCartBadges();
      _refreshCartOverlay();
    });
  });

  overlay.querySelectorAll('.cart-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      cartUpdateQty(btn.dataset.pid, 1);
      updateCartBadges();
      _refreshCartOverlay();
    });
  });

  overlay.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cartRemove(btn.dataset.pid);
      updateCartBadges();
      _refreshCartOverlay();
    });
  });
}

function _refreshCartOverlay() {
  const body = document.querySelector('#screen-overlay .overlay-body');
  if (!body) return;
  body.innerHTML = _buildCartHtml();
  _bindCartEvents();
}

/* ═══════════════════════════════════════════════════════════
   CHECKOUT
   ═══════════════════════════════════════════════════════════ */

function _openCheckout() {
  showOverlay(_buildCheckoutHtml(), 'Checkout', () => navigate('cart'));
  _bindCheckoutEvents();
}

function _buildCheckoutHtml() {
  const items = getCartItems();
  const totals = getCartTotals();
  const user = AppState.currentUser;

  const orderSummaryHtml = items.map(l => `
    <div class="co-item">
      <span>${l.product.emoji} ${l.product.name} ×${l.qty}</span>
      <span>₹${fmtPrice(l.product.price * l.qty)}</span>
    </div>
  `).join('');

  return `
    <div class="co-section">
      <div class="co-section-title">Fulfillment</div>
      <div class="co-toggle-row">
        <button class="co-toggle-btn ${AppState.ui.fulfillmentType === 'pickup' ? 'active' : ''}" id="co-pickup-btn" data-type="pickup">
          📦 Campus Pickup
        </button>
        <button class="co-toggle-btn ${AppState.ui.fulfillmentType === 'delivery' ? 'active' : ''}" id="co-delivery-btn" data-type="delivery">
          🛵 Hostel Delivery
        </button>
      </div>
    </div>

    <div class="co-section" id="co-delivery-form" style="display:${AppState.ui.fulfillmentType === 'delivery' ? '' : 'none'};">
      <div class="co-section-title">Delivery details</div>
      <div class="co-form">
        <label class="co-label">Hostel</label>
        <input class="co-input" id="co-hostel" type="text" placeholder="e.g. Hostel B" value="${user.hostel || ''}"/>
        <label class="co-label">Room / Location</label>
        <input class="co-input" id="co-room" type="text" placeholder="e.g. Room 214" value="${user.room || ''}"/>
      </div>
    </div>

    <div class="co-section" id="co-pickup-info" style="display:${AppState.ui.fulfillmentType === 'pickup' ? '' : 'none'};">
      <div class="co-section-title">Pickup details</div>
      <div class="co-info-row">📍 Ground floor, near main entrance</div>
      <div class="co-info-row text-secondary">Ready in approximately 10–15 minutes after order is placed.</div>
    </div>

    <div class="co-section">
      <div class="co-section-title">Order summary</div>
      <div class="co-items">${orderSummaryHtml}</div>
      <div class="co-totals">
        <div class="co-total-row"><span>Subtotal</span><span>₹${fmtPrice(totals.subtotal)}</span></div>
        <div class="co-total-row"><span>Delivery fee</span><span>${AppState.ui.fulfillmentType === 'delivery' ? '₹20' : 'Free'}</span></div>
        <div class="co-total-row co-grand"><span>Total</span><span>₹${fmtPrice(totals.subtotal + (AppState.ui.fulfillmentType === 'delivery' ? 20 : 0))}</span></div>
      </div>
    </div>

    <div class="co-section">
      <div class="co-section-title">Payment</div>
      <div class="co-payment-note">
        <div class="co-payment-badge">TEST MODE</div>
        <div class="co-payment-text">Payments are in test mode. No real charge will be made.</div>
      </div>
      <div class="co-mock-methods">
        <label class="co-method">
          <input type="radio" name="payment" value="upi" checked/> UPI / PhonePe / GPay
        </label>
        <label class="co-method">
          <input type="radio" name="payment" value="card"/> Credit / Debit Card
        </label>
        <label class="co-method">
          <input type="radio" name="payment" value="cod"/> Pay on Pickup / Cash on Delivery
        </label>
      </div>
    </div>

    <button class="co-place-btn" id="co-place-btn">Place Order</button>
  `;
}

function _bindCheckoutEvents() {
  const overlay = document.getElementById('screen-overlay');
  if (!overlay) return;

  // Fulfillment toggle
  overlay.querySelectorAll('.co-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ ui: { fulfillmentType: btn.dataset.type } });
      overlay.querySelectorAll('.co-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const deliveryForm = overlay.querySelector('#co-delivery-form');
      const pickupInfo = overlay.querySelector('#co-pickup-info');
      if (deliveryForm) deliveryForm.style.display = btn.dataset.type === 'delivery' ? '' : 'none';
      if (pickupInfo) pickupInfo.style.display = btn.dataset.type === 'pickup' ? '' : 'none';
    });
  });

  // Place order
  overlay.querySelector('#co-place-btn')?.addEventListener('click', () => {
    const fulfillment = AppState.ui.fulfillmentType;
    let deliveryInfo = null;

    if (fulfillment === 'delivery') {
      const hostel = overlay.querySelector('#co-hostel')?.value?.trim();
      const room = overlay.querySelector('#co-room')?.value?.trim();
      if (!hostel || !room) {
        showToast('Please enter hostel and room details');
        return;
      }
      deliveryInfo = { hostel, room };
      // Save to user profile
      setState({ currentUser: { ...AppState.currentUser, hostel, room } });
    }

    // Mock payment delay
    const placeBtn = overlay.querySelector('#co-place-btn');
    if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Processing…'; }

    setTimeout(() => {
      const orderId = placeOrder(fulfillment, deliveryInfo);
      navigate('order-confirm', { selectedOrderId: orderId });
    }, 1200);
  });
}

/* ═══════════════════════════════════════════════════════════
   ORDER CONFIRMATION
   ═══════════════════════════════════════════════════════════ */

function _openOrderConfirmation(orderId) {
  const order = AppState.orders.find(o => o.id === orderId);
  if (!order) return;

  const html = `
    <div class="confirm-screen">
      <div class="confirm-icon">✅</div>
      <div class="confirm-order-id">${order.order_number_display || '#' + order.id}</div>
      <div class="confirm-title">Order placed successfully!</div>
      <div class="confirm-sub">
        ${order.fulfillmentType === 'delivery'
      ? `Your order is being prepared and will be delivered to <strong>${order.deliveryInfo?.hostel}, ${order.deliveryInfo?.room}</strong>.`
      : `Your order is being prepared. Pick it up from the Ground floor, near main entrance.`}
      </div>
      <div class="confirm-total">Total paid: ₹${fmtPrice(order.total)}</div>
      <div class="confirm-actions">
        <button class="confirm-btn-primary" id="conf-view-order">View Order</button>
        <button class="confirm-btn-secondary" id="conf-home">Back to Home</button>
      </div>
    </div>
  `;

  showOverlay(html, 'Order Placed');
  updateCartBadges();
  if (typeof window.playOrderPlacedChime === 'function') window.playOrderPlacedChime();
  if (typeof window.UniMallConfetti === 'function') window.UniMallConfetti();

  document.getElementById('conf-view-order')?.addEventListener('click', () => navigate('order-detail', { selectedOrderId: orderId }));
  document.getElementById('conf-home')?.addEventListener('click', () => navigate('home'));
}

/* ═══════════════════════════════════════════════════════════
   ORDERS LIST
   ═══════════════════════════════════════════════════════════ */

function _openOrders() {
  const orders = AppState.orders;

  const statusLabel = { placed: 'Order placed', preparing: 'Preparing', ready: 'Ready', delivered: 'Delivered' };
  const statusCls = { placed: 'status-placed', preparing: 'status-preparing', ready: 'status-ready', delivered: 'status-delivered' };

  const html = orders.length === 0
    ? `<div class="empty-screen">
        <div class="empty-screen-emoji">📦</div>
        <div class="empty-screen-title">No orders yet</div>
        <div class="empty-screen-sub">Your orders will appear here once you place one.</div>
        <button class="em-btn" id="orders-browse-btn">Browse Products</button>
       </div>`
    : `<div class="orders-list">
        ${orders.map(o => `
          <div class="order-card" data-oid="${o.id}" role="button" tabindex="0">
            <div class="order-card-top">
              <div>
                <div class="order-id">#${o.id}</div>
                <div class="order-date">${fmtDate(o.createdAt)} · ${fmtTime(o.createdAt)}</div>
              </div>
              <span class="order-status-badge ${statusCls[o.status] || ''}">${statusLabel[o.status] || o.status}</span>
            </div>
            <div class="order-items-preview">${o.items.map(i => `${i.emoji || '📦'} ${i.name} ×${i.qty}`).join(' · ')}</div>
            <div class="order-card-bottom">
              <span class="order-total">₹${fmtPrice(o.total)}</span>
              <span class="order-arrow">›</span>
            </div>
          </div>
        `).join('')}
       </div>`;

  showOverlay(html, 'My Orders', () => navigate('home'));

  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => navigate('order-detail', { selectedOrderId: card.dataset.oid }));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') card.click(); });
  });
  document.getElementById('orders-browse-btn')?.addEventListener('click', () => navigate('home'));
}

/* ═══════════════════════════════════════════════════════════
   ORDER DETAIL
   ═══════════════════════════════════════════════════════════ */

function _openOrderDetail(orderId) {
  const order = AppState.orders.find(o => o.id === orderId);
  if (!order) { navigate('orders'); return; }

  const steps = ['placed', 'preparing', 'ready', 'delivered'];
  const stepLabels = { placed: 'Order placed', preparing: 'Preparing', ready: order.fulfillmentType === 'delivery' ? 'Out for delivery' : 'Ready for pickup', delivered: order.fulfillmentType === 'delivery' ? 'Delivered' : 'Picked up' };
  const curIdx = steps.indexOf(order.status);

  const timelineHtml = steps.map((s, i) => `
    <div class="timeline-step ${i <= curIdx ? 'done' : ''} ${i === curIdx ? 'current' : ''}">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-label">${stepLabels[s]}</div>
        ${i <= curIdx && order.statusHistory[i] ? `<div class="timeline-time">${fmtTime(order.statusHistory[i].time)}</div>` : ''}
      </div>
    </div>
  `).join('');

  const itemsHtml = order.items.map(i => `
    <div class="od-item">
      <span>${i.name} ×${i.qty}</span>
      <span>₹${fmtPrice(i.price * i.qty)}</span>
    </div>
  `).join('');

  const html = `
    <div class="od-header-row">
      <div>
        <div class="od-order-id">${order.order_number_display || '#' + order.id}</div>
        <div class="od-date">${fmtDate(order.createdAt)}</div>
      </div>
    </div>

    <div class="od-section">
      <div class="od-section-title">Status</div>
      <div class="timeline">${timelineHtml}</div>
    </div>

    <div class="od-section">
      <div class="od-section-title">${order.fulfillmentType === 'delivery' ? 'Delivery to' : 'Pickup from'}</div>
      <div class="od-info-val">
        ${order.fulfillmentType === 'delivery'
      ? `${order.deliveryInfo?.hostel}, ${order.deliveryInfo?.room}`
      : 'Ground floor, near main entrance'}
      </div>
    </div>

    <div class="od-section">
      <div class="od-section-title">Items</div>
      ${itemsHtml}
    </div>

    <div class="od-section">
      <div class="od-total-row"><span>Subtotal</span><span>₹${fmtPrice(order.subtotal)}</span></div>
      <div class="od-total-row"><span>Delivery fee</span><span>₹${fmtPrice(order.deliveryFee)}</span></div>
      <div class="od-total-row od-grand"><span>Total</span><span>₹${fmtPrice(order.total)}</span></div>
    </div>
  `;

  showOverlay(html, `Order #${order.id}`, () => navigate('orders'));
}

/* ═══════════════════════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════════════════════ */

function _openProfile() {
  const u = AppState.currentUser || {};
  const orderCount = AppState.orders.length;
  const initial = (u.name && u.name.trim()) ? u.name.trim().charAt(0).toUpperCase() : 'A';
  const avatarEl = `<span style="font-weight:800;font-size:24px;color:#ffffff;line-height:1;">${initial}</span>`;

  const html = `
    <div class="profile-header">
      <div class="profile-avatar">${avatarEl}</div>
      <div class="profile-name">${u.name}</div>
      <div class="profile-sub">${u.email}</div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">Campus details</div>
      <div class="profile-row">
        <span class="profile-label">Hostel</span>
        <input class="profile-input" id="prof-hostel" type="text" value="${u.hostel}" placeholder="Your hostel"/>
      </div>
      <div class="profile-row">
        <span class="profile-label">Room</span>
        <input class="profile-input" id="prof-room" type="text" value="${u.room}" placeholder="Room number"/>
      </div>
      <button class="profile-save-btn" id="prof-save-btn">Save changes</button>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">Activity</div>
      <div class="profile-menu-item" id="prof-orders" role="button" tabindex="0">
        <span>📦 My Orders</span>
        <span class="profile-menu-count">${orderCount}</span>
        <span class="profile-menu-arrow">›</span>
      </div>
      <div class="profile-menu-item" id="prof-requests" role="button" tabindex="0">
        <span>🔍 Item Requests</span>
        <span class="profile-menu-count">${AppState.itemRequests.length}</span>
        <span class="profile-menu-arrow">›</span>
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">Support</div>
      <div class="profile-menu-item" role="button" tabindex="0">
        <span>❓ Help & Support</span>
        <span class="profile-menu-arrow">›</span>
      </div>
      <div class="profile-menu-item" role="button" tabindex="0">
        <span>📄 Terms & Privacy</span>
        <span class="profile-menu-arrow">›</span>
      </div>
    </div>
  `;

  showOverlay(html, 'Profile', () => navigate('home'));

  document.getElementById('prof-save-btn')?.addEventListener('click', () => {
    const hostel = document.getElementById('prof-hostel')?.value?.trim();
    const room = document.getElementById('prof-room')?.value?.trim();
    setState({ currentUser: { ...AppState.currentUser, hostel, room } });
    showToast('Profile saved');
  });

  document.getElementById('prof-orders')?.addEventListener('click', () => navigate('orders'));
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */

function _openNotifications() {
  // Mark all as read
  AppState.notifications.forEach(n => { n.read = true; });
  setState({});
  _updateNotifDot();

  const iconMap = { order: '📦', stock: '🛒', request: '🔍' };

  const html = AppState.notifications.length === 0
    ? `<div class="empty-screen">
        <div class="empty-screen-emoji">🔔</div>
        <div class="empty-screen-title">No notifications</div>
       </div>`
    : `<div class="notif-list">
        ${AppState.notifications.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}">
            <div class="notif-icon">${iconMap[n.type] || '🔔'}</div>
            <div class="notif-content">
              <div class="notif-title">${n.title}</div>
              <div class="notif-body">${n.body}</div>
              <div class="notif-time">${n.time}</div>
            </div>
          </div>
        `).join('')}
       </div>`;

  showOverlay(html, 'Notifications', () => navigate('home'));
}

function _updateNotifDot() {
  const dot = document.querySelector('.notif-dot');
  if (!dot) return;
  dot.style.display = getUnreadCount() > 0 ? '' : 'none';
}

/* ═══════════════════════════════════════════════════════════
   REQUEST AN ITEM
   ═══════════════════════════════════════════════════════════ */

function _openRequestForm() {
  const html = `
    <div class="req-form">
      <p class="req-intro">Tell us what you're looking for and we'll check with the stores on campus.</p>

      <label class="co-label">What are you looking for? <span class="req-required">*</span></label>
      <input class="co-input" id="req-what" type="text" placeholder="e.g. Scientific Calculator, Protein Powder…"/>

      <label class="co-label">Category</label>
      <select class="co-input" id="req-cat">
        <option value="">Select a category</option>
        ${CATEGORIES.filter(c => c.id !== 'more').map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
      </select>

      <label class="co-label">Additional details (optional)</label>
      <textarea class="co-input" id="req-desc" rows="3" placeholder="Brand, colour, quantity, any other details…"></textarea>

      <button class="co-place-btn" id="req-submit-btn">Submit Request</button>
    </div>
  `;

  showOverlay(html, 'Request an Item', () => navigate('home'));

  document.getElementById('req-submit-btn')?.addEventListener('click', () => {
    const what = document.getElementById('req-what')?.value?.trim();
    if (!what) { showToast('Please describe what you need'); return; }

    submitItemRequest({
      what,
      categoryId: document.getElementById('req-cat')?.value || null,
      description: document.getElementById('req-desc')?.value?.trim() || '',
    });

    const body = document.querySelector('#screen-overlay .overlay-body');
    if (body) {
      body.innerHTML = `
        <div class="confirm-screen">
          <div class="confirm-icon">✅</div>
          <div class="confirm-title">Request received!</div>
          <div class="confirm-sub">We'll check UniMall stores for <strong>"${what}"</strong> and notify you when we find it.</div>
          <button class="confirm-btn-primary" id="req-done-btn">Back to Home</button>
        </div>
      `;
      document.getElementById('req-done-btn')?.addEventListener('click', () => navigate('home'));
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   CAMPUS STORES
   ═══════════════════════════════════════════════════════════ */

function _openStores() {
  const storeEmojis = {
    'campus-cafe': '☕',
    'book-corner': '📚',
    'techstop': '🎧',
    'campus-mart': '🛒',
    'campus-wear': '👕',
    'health-hub': '💊'
  };

  const html = `
    <div class="stores-list">
      ${STORES.map(s => {
    const storeProducts = AppState.products.filter(p => p.storeId === s.id);
    const icon = storeEmojis[s.id] || '🏪';
    return `
          <div class="store-card" data-sid="${s.id}" role="button" tabindex="0" aria-label="${s.name}, ${s.floor} floor">
            <div class="store-icon-wrap">${icon}</div>
            <div class="store-details">
              <div class="store-name-row">
                <span class="store-card-name">${s.name}</span>
                <span class="store-status-pill ${s.openNow ? 'open' : 'closed'}">${s.openNow ? 'Open' : 'Closed'}</span>
              </div>
              <div class="store-card-meta">
                <span>${s.floor} floor</span>
                <span>•</span>
                <span>${s.hours}</span>
              </div>
              <div class="store-items-count">${storeProducts.length} items available</div>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;

  showOverlay(html, 'Campus Stores', () => navigate('home'));

  document.querySelectorAll('.store-card').forEach(card => {
    const onSelect = () => {
      const storeId = card.dataset.sid;
      // Map js/data.js store IDs → stores.js store IDs for the store detail page
      const idMap = {
        'campus-cafe':  'store-bakery',
        'book-corner':  'store-stationery',
        'techstop':     'store-electronics',
        'campus-mart':  'store-sports',
        'campus-wear':  'store-fashion',
        'health-hub':   'store-sports',
      };
      const detailId = idMap[storeId] || storeId;
      window.location.href = `store.html?id=${encodeURIComponent(detailId)}`;
    };

    card.addEventListener('click', onSelect);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   HELPER: category & chip reset
   ═══════════════════════════════════════════════════════════ */

function _resetCategoryHighlight() {
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelectorAll('.category-icon').forEach(icon => {
    icon.style.outline = 'none';
  });
}

function _resetChipHighlight() {
  document.querySelectorAll('.dynamic-chip').forEach(chip => {
    chip.classList.remove('active');
    chip.setAttribute('aria-pressed', 'false');
  });
  // Re-activate "Near you" default
  const defaultChip = document.getElementById('chip-nearby');
  if (defaultChip) {
    defaultChip.classList.add('active');
    defaultChip.setAttribute('aria-pressed', 'true');
  }
}

/* ═══════════════════════════════════════════════════════════
   HERO ACTIVE ORDER PICKUP PASS CONTROLLER
   Matches exact rectangle size of utility banner.
   - User Name priority with dominant font size
   - Organised counter pickup details
   - Center ripple animation & light green transition on store delivery
   - 24-hour retention post-delivery
   ═══════════════════════════════════════════════════════════ */

let _currentDisplayedOrderId = null;
let _currentOrderDeliveredState = false;

/**
 * Returns active order or recent delivered order within 24 hours.
 */
function getActiveOrRecentOrder() {
  let orders = [];
  try {
    const raw = localStorage.getItem('unimall_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) orders = parsed.orders;
    }
  } catch(e) {}

  if ((!orders || orders.length === 0) && typeof AppState !== 'undefined' && Array.isArray(AppState.orders)) {
    orders = AppState.orders;
  }

  if (!orders || orders.length === 0) return null;

  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  // 1. First priority: any active order ('placed', 'accepted', 'preparing', 'ready')
  const activeOrder = orders.find(o => {
    const s = (o.status || '').toLowerCase();
    return ['placed', 'accepted', 'preparing', 'ready'].includes(s);
  });

  if (activeOrder) {
    return { order: activeOrder, isDelivered: false };
  }

  // 2. Second priority: any delivered / completed order within the last 24 hours
  const recentDelivered = orders.find(o => {
    const s = (o.status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      const timeVal = o.deliveredAt || o.updatedAt || o.createdAt;
      const deliveredTime = timeVal ? new Date(timeVal).getTime() : NaN;
      if (!isNaN(deliveredTime)) {
        const elapsed = now - deliveredTime;
        return elapsed >= -60000 && elapsed < TWENTY_FOUR_HOURS_MS;
      }
    }
    return false;
  });

  if (recentDelivered) {
    const timeVal = recentDelivered.deliveredAt || recentDelivered.updatedAt || recentDelivered.createdAt;
    const elapsedMs = Math.max(0, now - new Date(timeVal).getTime());
    return { order: recentDelivered, isDelivered: true, elapsedMs };
  }

  return null;
}

/**
/* ─── HERO DUAL-BANNER & ACTIVE ORDER ENGINE ────────────── */

/**
 * Renders the hero banners:
 * Always keeps at least 2 banners:
 * 1. Main Banner ("Class to Cart")
 * 2. Active Order Banner (if active/delivered <24h) OR "Order something Bro" promotional banner
 */
function renderActiveOrderBanner() {
  if (typeof window.mountActiveOrderBanner === 'function') {
    window.mountActiveOrderBanner();
    return;
  }

  const banner = document.getElementById('active-order-banner');
  const slider = document.getElementById('hero-banners-slider');
  const dotsWrap = document.getElementById('hero-slider-dots');
  const utilityModule = document.getElementById('utility-module');
  const emptyPromo = document.getElementById('empty-order-promo-banner');

  if (!banner || !slider) return;

  const orderData = getActiveOrRecentOrder();

  if (!orderData) {
    // No active or <24h order: show main banner + empty promo banner (strictly 2 banners)
    banner.style.display = 'none';
    if (emptyPromo) emptyPromo.style.display = 'flex';
    if (utilityModule) {
      utilityModule.style.display = 'flex';
      utilityModule.style.margin = '0';
    }
    if (dotsWrap) {
      dotsWrap.style.display = 'flex';
      dotsWrap.innerHTML = `
        <span class="hero-dot active" data-slide="0"></span>
        <span class="hero-dot" data-slide="1"></span>
      `;
    }
    _currentDisplayedOrderId = null;
    _currentOrderDeliveredState = false;
    return;
  }

  const { order, isDelivered, elapsedMs } = orderData;
  _currentDisplayedOrderId = order.id;

  // Active or <24h order exists: hide empty promo banner, show active order pass
  banner.style.display = 'flex';
  if (emptyPromo) emptyPromo.style.display = 'none';
  if (utilityModule) {
    utilityModule.style.display = 'flex';
  }
  if (dotsWrap) {
    dotsWrap.style.display = 'flex';
    dotsWrap.innerHTML = `
      <span class="hero-dot active" data-slide="0"></span>
      <span class="hero-dot" data-slide="1"></span>
    `;
  }

  // 1. Initial Avatar & Customer Name Priority (Dominant, Clearly Visible)
  const avatarEl = document.getElementById('orderBannerAvatar');
  const customerNameEl = document.getElementById('orderBannerCustomerName');
  const rawName = order.customerName || order.user_name || order.customer_name ||
                  (typeof AppState !== 'undefined' && AppState.currentUser && AppState.currentUser.name) ||
                  'Campus Student';

  if (avatarEl) {
    avatarEl.textContent = (rawName.trim()[0] || 'A').toUpperCase();
  }
  if (customerNameEl) {
    customerNameEl.textContent = rawName;
    customerNameEl.title = rawName;
  }

  // 2. Store Info & Pickup Location
  const storeIconEl = document.getElementById('orderBannerStoreIcon');
  const storeNameEl = document.getElementById('orderBannerStoreName');
  const storeLocEl = document.getElementById('orderBannerStoreLoc');

  if (storeIconEl) storeIconEl.textContent = order.storeIcon || '☕';
  if (storeNameEl) storeNameEl.textContent = order.storeName || 'Campus Café';
  if (storeLocEl) {
    storeLocEl.textContent = order.pickupLocation || (order.fulfillmentType === 'delivery' ? (order.deliveryInfo ? `${order.deliveryInfo.hostel} · ${order.deliveryInfo.room}` : 'Hostel Delivery') : 'Ground floor, near main entrance');
  }

  // 3. Live Status Badge & ETA
  const statusBadge = document.getElementById('orderBannerStatusBadge');
  const statusText = document.getElementById('orderBannerStatusText');
  const etaText = document.getElementById('orderBannerEtaText');

  const s = (order.status || '').toLowerCase();
  let badgeLabel = 'Order Confirmed';
  let etaLabel = 'Estimated pickup: 5–10 min';

  if (isDelivered || s === 'delivered' || s === 'completed') {
    badgeLabel = '✓ Order Collected';
    etaLabel = 'Picked up successfully';
  } else if (s === 'ready') {
    badgeLabel = '● Ready for Pickup';
    etaLabel = 'Ready at counter now!';
  } else if (s === 'preparing') {
    badgeLabel = '● Preparing Order';
    etaLabel = 'Estimated pickup: 3–7 min';
  } else if (s === 'placed' || s === 'accepted') {
    badgeLabel = '● Order Confirmed';
    etaLabel = 'Estimated pickup: 5–10 min';
  }

  if (statusText) statusText.textContent = badgeLabel;
  if (etaText) etaText.textContent = etaLabel;

  // 4. Utilise Extra Space: Items Tray with Food Thumbnails, 1x Badges & Prices
  const trayEl = document.getElementById('orderBannerItemsTray');
  if (trayEl) {
    const items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : [
      { name: 'Cold Brew Coffee', price: 120, qty: 1 },
      { name: 'Classic Chips Snack Pack', price: 30, qty: 1 }
    ];

    // Show up to 2 items in the tray (like reference image: Cold Brew Coffee & Sandwich/Chips)
    const displayItems = items.slice(0, 2);
    const extraCount = items.length - 2;

    let trayHtml = displayItems.map((it, idx) => {
      const qty = it.qty || it.quantity || 1;
      const name = it.name || it.product_name || 'Item';
      const price = it.price || 0;
      const imgSrc = getItemThumbnail(it);

      return `
        ${idx > 0 ? '<div class="tray-item-divider" aria-hidden="true"></div>' : ''}
        <div class="tray-item">
          <span class="tray-qty-pill">${qty}x</span>
          <img class="tray-item-thumb" src="${imgSrc}" alt="${escapeHtml(name)}" onerror="this.src='https://images.unsplash.com/photo-1541167760496-1628856ab772?w=120&auto=format&fit=crop&q=80'">
          <div class="tray-item-info">
            <div class="tray-item-name">${escapeHtml(name)}</div>
            <div class="tray-item-price">₹${price * qty}</div>
          </div>
        </div>
      `;
    }).join('');

    if (extraCount > 0) {
      trayHtml += `<div class="tray-extra-pill">+${extraCount} more</div>`;
    }

    trayEl.innerHTML = trayHtml;
  }

  // 5. Total Paid Amount
  const totalEl = document.getElementById('orderBannerTotal');
  if (totalEl) {
    const totalAmount = order.total || order.total_amount || order.subtotal || 150;
    totalEl.textContent = `₹${totalAmount}`;
  }

  // 6. Delivered State styling & 24h retention notice
  const deliveredStamp = document.getElementById('orderBannerDeliveredStamp');
  const actionPill = document.getElementById('orderBannerActionPill');
  const actionText = document.getElementById('orderBannerActionText');

  if (isDelivered) {
    banner.classList.add('is-delivered');
    if (deliveredStamp) {
      deliveredStamp.style.display = 'flex';
      let timeAgo = 'Just now';
      if (elapsedMs) {
        const mins = Math.floor(elapsedMs / (60 * 1000));
        const hours = Math.floor(mins / 60);
        if (hours > 0) {
          timeAgo = `${hours}h ago`;
        } else if (mins > 0) {
          timeAgo = `${mins}m ago`;
        }
      }
      deliveredStamp.innerHTML = `
        <span class="stamp-check">✓</span>
        <span class="stamp-msg">Order Picked Up · Collected ${timeAgo} (Active on home for 24h)</span>
      `;
    }
    if (actionText) actionText.textContent = 'View Pass';
    _currentOrderDeliveredState = true;
  } else {
    banner.classList.remove('is-delivered');
    if (deliveredStamp) deliveredStamp.style.display = 'none';
    if (actionText) actionText.textContent = 'Show at Counter';
    _currentOrderDeliveredState = false;
  }

  // 7. Click Banner opens In-Home 3/4 Screen Bottom Sheet (NO REDIRECT!)
  banner.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openOrderBottomSheet(order);
  };

  if (actionPill) {
    actionPill.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOrderBottomSheet(order);
    };
  }

  banner.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openOrderBottomSheet(order);
    }
  };

  // Ensure slider starts firmly on the active banner with zero auto-swiping
  if (slider.scrollLeft > 0) {
    slider.scrollLeft = 0;
  }
}

/**
 * Resolves or falls back to a clean product photo for the tray thumbnail
 */
function getItemThumbnail(item) {
  if (item && item.image) return item.image;
  const name = (item && item.name) ? item.name.toLowerCase() : '';
  const id = (item && (item.productId || item.id)) ? (item.productId || item.id) : '';

  if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
    const prod = PRODUCTS.find(p => p.id === id || (p.name && p.name.toLowerCase() === name));
    if (prod && prod.image) return prod.image;
  }

  if (name.includes('coffee') || name.includes('brew')) {
    return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=120&auto=format&fit=crop&q=80';
  }
  if (name.includes('chips') || name.includes('snack')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=120&auto=format&fit=crop&q=80';
  }
  if (name.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=120&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=120&auto=format&fit=crop&q=80';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens the in-home 3/4 screen Order Pickup Pass bottom sheet.
 * All details fit within 75vh with zero scrolling!
 */
function openOrderBottomSheet(orderData) {
  let order = orderData;
  if (!order) {
    const activeData = getActiveOrRecentOrder();
    order = activeData ? activeData.order : null;
  }
  if (!order) return;

  const sheet = document.getElementById('orderBottomSheet');
  const backdrop = document.getElementById('orderSheetBackdrop');
  if (!sheet || !backdrop) return;

  // 1. Populate store info
  const storeIconEl = document.getElementById('sheetStoreIcon');
  const storeNameEl = document.getElementById('sheetStoreName');
  const storeLocEl = document.getElementById('sheetStoreLocation');
  if (storeIconEl) storeIconEl.textContent = order.storeIcon || '☕';
  if (storeNameEl) storeNameEl.textContent = order.storeName || 'Campus Café';
  if (storeLocEl) {
    storeLocEl.textContent = order.pickupLocation || 'Ground Floor, Near Main Entrance';
  }

  // 2. Populate pass card
  const passCustEl = document.getElementById('sheetCustomerName');
  const passOrderEl = document.getElementById('sheetOrderId');
  const passOtpEl = document.getElementById('sheetOtpCode');
  const passCardEl = document.getElementById('sheetPassCard');

  const rawName = order.customerName || order.user_name || order.customer_name ||
                  (typeof AppState !== 'undefined' && AppState.currentUser && AppState.currentUser.name) ||
                  'Campus Student';
  if (passCustEl) passCustEl.textContent = rawName.toUpperCase();
  if (passOrderEl) passOrderEl.textContent = order.order_number_display || `#${order.id || 'UM1024'}`;

  const s = (order.status || '').toLowerCase();
  const isDelivered = s === 'delivered' || s === 'completed' || !!order.deliveredAt;
  const isReady = isDelivered || s === 'ready';
  const isPreparing = isReady || s === 'preparing';

  if (passOtpEl) {
    passOtpEl.textContent = isDelivered ? '✓ OK' : (order.otp || '4829');
  }

  if (passCardEl) {
    if (isDelivered) {
      passCardEl.classList.add('is-delivered');
    } else {
      passCardEl.classList.remove('is-delivered');
    }
  }

  // 3. Update stepper
  const stepReadyLine = document.getElementById('sheetStepReadyLine');
  const stepReady = document.getElementById('sheetStepReady');
  const stepDeliveredLine = document.getElementById('sheetStepDeliveredLine');
  const stepDelivered = document.getElementById('sheetStepDelivered');

  if (stepReadyLine) {
    stepReadyLine.className = 'stepper-line ' + (isReady ? 'completed' : (isPreparing ? 'active' : ''));
  }
  if (stepReady) {
    stepReady.className = 'stepper-step ' + (isDelivered ? 'completed' : (isReady ? 'active' : ''));
    const dot = stepReady.querySelector('.step-dot');
    if (dot) dot.textContent = isDelivered ? '✓' : (isReady ? '●' : '○');
  }
  if (stepDeliveredLine) {
    stepDeliveredLine.className = 'stepper-line ' + (isDelivered ? 'completed' : '');
  }
  if (stepDelivered) {
    stepDelivered.className = 'stepper-step ' + (isDelivered ? 'completed' : '');
    const dot = stepDelivered.querySelector('.step-dot');
    if (dot) dot.textContent = isDelivered ? '✓' : '○';
  }

  // 4. Ordered Items list (compact single-screen rows)
  const itemsListEl = document.getElementById('sheetItemsList');
  if (itemsListEl) {
    const items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : [
      { name: 'Cold Brew Coffee', price: 120, qty: 1 },
      { name: 'Classic Chips Snack Pack', price: 30, qty: 1 }
    ];
    itemsListEl.innerHTML = items.map(it => `
      <div class="sheet-item-row">
        <span class="sheet-item-qty">${it.qty || it.quantity || 1}×</span>
        <span class="sheet-item-name">${escapeHtml(it.name || 'Item')}</span>
        <span class="sheet-item-price">₹${(it.price || 0) * (it.qty || it.quantity || 1)}</span>
      </div>
    `).join('');
  }

  // 5. Total
  const totalValEl = document.getElementById('sheetTotalVal');
  if (totalValEl) {
    totalValEl.textContent = `₹${order.total || order.total_amount || 150}`;
  }

  // 6. Test simulator button
  const simBtn = document.getElementById('btnSheetSimulateDelivery');
  if (simBtn) {
    if (isDelivered) {
      simBtn.innerHTML = '<span>🔄 Reset Order for Testing (Set Ready)</span>';
      simBtn.onclick = (e) => {
        e.preventDefault();
        if (typeof window.resetActiveOrderForTesting === 'function') {
          window.resetActiveOrderForTesting();
          openOrderBottomSheet();
        }
      };
    } else {
      simBtn.innerHTML = '<span>⚡ Store Manager: Mark Delivered (Test Ripple)</span>';
      simBtn.onclick = (e) => {
        e.preventDefault();
        if (typeof window.simulateStoreDelivered === 'function') {
          window.simulateStoreDelivered();
          openOrderBottomSheet();
        }
      };
    }
  }

  // 7. Show bottom sheet
  backdrop.classList.add('active');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Closes the 3/4 screen Order Pickup Pass bottom sheet.
 */
function closeOrderBottomSheet() {
  const sheet = document.getElementById('orderBottomSheet');
  const backdrop = document.getElementById('orderSheetBackdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Initializes listeners for closing the bottom sheet.
 */
function initOrderBottomSheetEvents() {
  const sheet = document.getElementById('orderBottomSheet');
  const backdrop = document.getElementById('orderSheetBackdrop');
  const closeBtn = document.getElementById('sheetCloseBtn');
  const handle = document.getElementById('sheetDragHandle');

  if (closeBtn) closeBtn.onclick = closeOrderBottomSheet;
  if (backdrop) backdrop.onclick = closeOrderBottomSheet;
  if (handle) handle.onclick = closeOrderBottomSheet;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet && sheet.classList.contains('open')) {
      closeOrderBottomSheet();
    }
  });
}

// Make open & close methods available globally
window.openOrderBottomSheet = openOrderBottomSheet;
window.closeOrderBottomSheet = closeOrderBottomSheet;

/**
 * Triggers the center ripple animation and transitions the card to satisfaction light green.
 */
function triggerOrderDeliveredRipple(order) {
  const banner = document.getElementById('active-order-banner');
  if (!banner) return;

  const rippleWave = document.getElementById('card-ripple-wave');
  if (rippleWave) {
    rippleWave.classList.remove('rippling');
    void rippleWave.offsetWidth; // Force CSS reflow to replay keyframe
    rippleWave.classList.add('rippling');
  }

  // Smoothly turn card light green
  banner.classList.add('is-delivered');

  // Play sweet success chime audio
  if (window.UniMallSound && typeof window.UniMallSound.play === 'function') {
    try {
      window.UniMallSound.play('success');
    } catch(e) {}
  }

  // Confetti burst
  if (typeof window.UniMallConfetti === 'function') {
    try {
      window.UniMallConfetti();
    } catch(e) {}
  }

  // Update order in state and storage
  if (order) {
    if (!order.deliveredAt) order.deliveredAt = new Date().toISOString();
    order.status = 'delivered';
    renderActiveOrderBanner();
    // If the bottom sheet is currently open, live update it as well
    const sheet = document.getElementById('orderBottomSheet');
    if (sheet && sheet.classList.contains('open')) {
      openOrderBottomSheet(order);
    }
  }
}

/**
 * Initializes slider scroll synchronization & pagination dots.
 * Strictly manual interaction — NO auto-swiping!
 */
function initHeroBannersSlider() {
  const slider = document.getElementById('hero-banners-slider');
  const dotsWrap = document.getElementById('hero-slider-dots');
  if (!slider) return;

  // Initialize sheet close interactions
  initOrderBottomSheetEvents();

  // Scroll listener strictly tracks manual user swipe
  slider.addEventListener('scroll', () => {
    const slides = Array.from(slider.querySelectorAll('.utility-module:not([style*="display: none"]), .active-order-banner:not([style*="display: none"]), .empty-order-promo-banner:not([style*="display: none"])'));
    if (slides.length <= 1) return;

    const sliderRect = slider.getBoundingClientRect();
    let bestIndex = 0;
    let minDiff = Infinity;

    slides.forEach((sl, idx) => {
      const r = sl.getBoundingClientRect();
      const diff = Math.abs(r.left - sliderRect.left);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = idx;
      }
    });

    const dots = (dotsWrap || document).querySelectorAll('.hero-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === bestIndex);
    });
  }, { passive: true });

  // Clicking dots manually navigates to the slide
  if (dotsWrap) {
    dotsWrap.addEventListener('click', (e) => {
      const dot = e.target.closest('.hero-dot');
      if (!dot) return;
      const slideIndex = parseInt(dot.getAttribute('data-slide') || '0', 10);
      const slides = Array.from(slider.querySelectorAll('.utility-module:not([style*="display: none"]), .active-order-banner:not([style*="display: none"]), .empty-order-promo-banner:not([style*="display: none"])'));
      if (slides[slideIndex]) {
        slides[slideIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    });
  }
}

/**
 * Realtime synchronization: detects store manager delivering the order.
 */
function initRealtimeOrderListeners() {
  // 1. Cross-tab storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'unimall_order_ready_event' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        if (typeof Storage !== 'undefined') {
          const saved = Storage.load();
          if (saved.notifications) {
            AppState.notifications = saved.notifications;
            _updateNotifDot();
          }
        }
        renderActiveOrderBanner();
        showToast(`🔔 Your order ${payload.displayNum || ''} is packed and ready to receive!`, 'info');
      } catch(err) {}
    } else if (e.key === 'unimall_order_delivered_event' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        if (payload.status === 'delivered' || payload.status === 'completed') {
          const orderData = getActiveOrRecentOrder();
          if (orderData && orderData.order.id === payload.orderId && !_currentOrderDeliveredState) {
            triggerOrderDeliveredRipple(orderData.order);
          } else {
            renderActiveOrderBanner();
          }
        }
      } catch(err) {}
    } else if (e.key === 'unimall_v1' || e.key === 'unimall_new_order_placed_event') {
      if (typeof Storage !== 'undefined') {
        const saved = Storage.load();
        if (saved.notifications) {
          AppState.notifications = saved.notifications;
          _updateNotifDot();
        }
      }
      const orderData = getActiveOrRecentOrder();
      if (orderData && orderData.isDelivered && !_currentOrderDeliveredState) {
        triggerOrderDeliveredRipple(orderData.order);
      } else {
        renderActiveOrderBanner();
      }
    }
  });

  // 2. BroadcastChannel for instant cross-tab sync without reloads
  try {
    const bc = new BroadcastChannel('unimall_orders_channel');
    bc.onmessage = (event) => {
      const { type, orderId, status } = event.data || {};
      if (type === 'ORDER_STATUS_CHANGED') {
        if (status === 'ready') {
          renderActiveOrderBanner();
          showToast(`🔔 Your order is packed and ready to receive!`, 'info');
        } else if (status === 'delivered' || status === 'completed') {
          const orderData = getActiveOrRecentOrder();
          if (orderData && orderData.order.id === orderId && !_currentOrderDeliveredState) {
            triggerOrderDeliveredRipple(orderData.order);
          } else {
            renderActiveOrderBanner();
          }
        } else {
          renderActiveOrderBanner();
        }
      } else if (type === 'ORDER_PLACED') {
        renderActiveOrderBanner();
      }
    };
  } catch(e) {}

  // 3. Intra-tab custom event
  window.addEventListener('unimall:orderStatusUpdated', (e) => {
    const { orderId, status } = e.detail || {};
    if (typeof Storage !== 'undefined') {
      const saved = Storage.load();
      if (saved.notifications) {
        AppState.notifications = saved.notifications;
        _updateNotifDot();
      }
    }
    if (status === 'ready') {
      renderActiveOrderBanner();
      showToast(`🔔 Your order is packed and ready to receive!`, 'info');
    } else if (status === 'delivered' || status === 'completed') {
      const orderData = getActiveOrRecentOrder();
      if (orderData && orderData.order.id === orderId && !_currentOrderDeliveredState) {
        triggerOrderDeliveredRipple(orderData.order);
      } else {
        renderActiveOrderBanner();
      }
    }
  });

  // 4. Background polling disabled — user/store admin reloads manually
}

/**
 * Developer & Testing Simulation:
 * Call window.simulateStoreDelivered() in console or via test trigger
 * to see the satisfaction center ripple and light-green transition!
 */
window.simulateStoreDelivered = function() {
  let appData = {};
  const raw = localStorage.getItem('unimall_v1');
  if (raw) {
    try { appData = JSON.parse(raw); } catch(e) {}
  }
  if (!Array.isArray(appData.orders) || appData.orders.length === 0) {
    if (typeof AppState !== 'undefined' && Array.isArray(AppState.orders) && AppState.orders.length > 0) {
      appData.orders = [...AppState.orders];
    } else {
      console.warn('[UniMall] No orders available to simulate delivery.');
      return;
    }
  }

  // Find active order or first order
  let order = appData.orders.find(o => ['placed', 'accepted', 'preparing', 'ready'].includes((o.status || '').toLowerCase()));
  if (!order) order = appData.orders[0];

  const nowIso = new Date().toISOString();
  order.status = 'delivered';
  order.deliveredAt = nowIso;
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: 'delivered',
    time: nowIso,
    label: 'Order Delivered by Store Manager'
  });

  localStorage.setItem('unimall_v1', JSON.stringify(appData));
  if (typeof AppState !== 'undefined') {
    AppState.orders = appData.orders;
  }

  try {
    localStorage.setItem('unimall_order_delivered_event', JSON.stringify({
      orderId: order.id,
      status: 'delivered',
      deliveredAt: nowIso,
      timestamp: Date.now()
    }));
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('unimall:orderStatusUpdated', {
    detail: { orderId: order.id, status: 'delivered', deliveredAt: nowIso }
  }));

  triggerOrderDeliveredRipple(order);
  console.log(`%c[UniMall] Store Manager marked #${order.id} Delivered! Center ripple triggered!`, 'color: #059669; font-weight: bold;');
};

/**
 * Reset test order back to 'ready' for repeated testing
 */
window.resetActiveOrderForTesting = function() {
  let appData = {};
  const raw = localStorage.getItem('unimall_v1');
  if (raw) {
    try { appData = JSON.parse(raw); } catch(e) {}
  }
  if (Array.isArray(appData.orders) && appData.orders[0]) {
    appData.orders[0].status = 'ready';
    delete appData.orders[0].deliveredAt;
    localStorage.setItem('unimall_v1', JSON.stringify(appData));
    if (typeof AppState !== 'undefined') AppState.orders = appData.orders;
    _currentOrderDeliveredState = false;
    renderActiveOrderBanner();
    console.log(`%c[UniMall] Order #${appData.orders[0].id} reset to READY FOR PICKUP`, 'color: #2563eb; font-weight: bold;');
  }
};
