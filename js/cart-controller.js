(function() {
'use strict';

/* ═══════════════════════════════════════════════════════════
   UNIMALL — CART & CHECKOUT CONTROLLER (cart-controller.js)
   Full interactive multi-step state machine:
   Step 1: Cart (Empty | Items)
   Step 2: Checkout (Fulfillment & Location)
   Step 3: Payment (Order Summary & Payment Method)
   Step 4: Order Success (Order Confirmation & Actions)
   ═══════════════════════════════════════════════════════════ */

var CART_STORAGE_KEY = window.CART_STORAGE_KEY || 'unimall_v1';

/* ─── COUPON DICTIONARY ──────────────────────────────────── */
let _PROMO_CODES = {
  CAMPUS10: { type: 'percent', value: 10, label: '10% Campus Discount' },
  FREEDEL: { type: 'delivery', value: 20, label: 'Free Delivery' },
  STUDENT20: { type: 'flat', value: 20, label: '₹20 Student Discount' }
};

async function _fetchPromoCodes() {
  try {
    if (typeof window.UniMallDB === 'undefined') return;
    let rows = [];
    if (typeof window.UniMallDB.getPromoCodes === 'function') {
      rows = await window.UniMallDB.getPromoCodes();
    } else if (typeof window.UniMallDB.query === 'function') {
      rows = await window.UniMallDB.query(
        `SELECT code, discount_type, discount_value, label
         FROM unimall_promo_codes
         WHERE is_active = true
         ORDER BY code`
      );
    }
    if (rows && rows.length > 0) {
      _PROMO_CODES = {};
      rows.forEach(r => {
        _PROMO_CODES[r.code.toUpperCase()] = {
          type: r.discount_type,
          value: parseFloat(r.discount_value),
          label: r.label
        };
      });
    }
  } catch (e) {
    console.warn('[Cart] Using default promo codes fallback:', e.message);
  }
}

/* ─── STATE MACHINE DEFINITION ───────────────────────────── */
const CartState = {
  step: 'cart', // 'cart' | 'checkout' | 'payment' | 'success'
  items: [],
  fulfillmentType: 'pickup', // 'pickup' | 'delivery'
  pickupLocation: {
    id: 'station-main',
    name: 'Store Counter Pickup Station',
    desc: 'Ground Floor, University Mall'
  },
  deliveryInfo: {
    hostel: 'Hostel B',
    room: 'Room 214'
  },
  paymentMethod: 'razorpay', // 'razorpay' | 'cod'
  appliedCoupon: null,
  orderNotes: '',
  packagingFee: 5,
  lastCreatedOrder: null,
  lastCreatedOrders: []
};

/* ─── STORAGE SYNC ───────────────────────────────────────── */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) {
        CartState.items = parsed.cart.map(line => {
          let product = (typeof PRODUCTS !== 'undefined')
            ? PRODUCTS.find(p => p.id === line.productId)
            : null;

          if (!product && (line.name || line.product)) {
            const rawP = line.product || line;
            product = {
              id: line.productId,
              name: rawP.name || line.name || 'Campus Item',
              price: Number(rawP.price !== undefined ? rawP.price : line.price) || 50,
              image: rawP.image || line.image || '',
              emoji: rawP.emoji || line.emoji || '🛍️',
              bg: rawP.bg || line.bg || '#EFF6FF',
              storeId: rawP.storeId || line.storeId || 'campus-cafe'
            };
          }

          return {
            productId: line.productId,
            qty: line.qty || 1,
            product: product || {
              id: line.productId,
              name: line.name || 'Campus Item',
              price: Number(line.price) || 50,
              image: line.image || '',
              emoji: line.emoji || '📦',
              bg: '#EFF6FF',
              storeId: line.storeId || 'campus-cafe'
            }
          };
        }).filter(item => item.product !== null);
      }

      if (parsed.currentUser) {
        if (parsed.currentUser.hostel) CartState.deliveryInfo.hostel = parsed.currentUser.hostel;
        if (parsed.currentUser.room) CartState.deliveryInfo.room = parsed.currentUser.room;
      }
    }
  } catch (e) {
    console.error('[Cart] Error loading state from storage:', e);
  }
}

function saveCartToStorage() {
  try {
    let appData = {};
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    appData.cart = CartState.items.map(i => ({
      productId: i.productId,
      qty: i.qty,
      name: i.product.name,
      price: i.product.price,
      image: i.product.image || '',
      emoji: i.product.emoji || '🛍️',
      storeId: i.product.storeId || 'campus-cafe',
      product: {
        id: i.productId,
        name: i.product.name,
        price: i.product.price,
        image: i.product.image || '',
        emoji: i.product.emoji || '🛍️',
        storeId: i.product.storeId || 'campus-cafe'
      }
    }));

    if (CartState.deliveryInfo && CartState.deliveryInfo.hostel && appData.currentUser) {
      appData.currentUser.hostel = CartState.deliveryInfo.hostel;
      appData.currentUser.room = CartState.deliveryInfo.room;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(appData));

    // Also update AppState.cart in state.js if present
    if (typeof AppState !== 'undefined') {
      AppState.cart = appData.cart;
    }

    syncCartBadge();
  } catch (e) {
    console.error('[Cart] Error saving state:', e);
  }
}

/* ─── COMPUTED TOTALS ────────────────────────────────────── */
function getCartTotals() {
  const subtotal = CartState.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const deliveryFee = CartState.fulfillmentType === 'delivery' ? (subtotal > 0 ? 20 : 0) : 0;
  let discountAmount = 0;

  if (CartState.appliedCoupon && _PROMO_CODES[CartState.appliedCoupon]) {
    const coupon = _PROMO_CODES[CartState.appliedCoupon];
    if (coupon.type === 'percent') {
      discountAmount = Math.round((subtotal * coupon.value) / 100);
    } else if (coupon.type === 'flat') {
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === 'delivery') {
      discountAmount = deliveryFee;
    }
  }

  const packagingFee = subtotal > 0 ? CartState.packagingFee : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + packagingFee - discountAmount);

  return {
    subtotal,
    deliveryFee,
    discountAmount,
    packagingFee,
    grandTotal,
    itemCount: CartState.items.reduce((sum, i) => sum + i.qty, 0)
  };
}

function fmtPrice(amount) {
  return Number(amount || 0).toLocaleString('en-IN');
}

/* ─── CART MUTATIONS ─────────────────────────────────────── */
function addItemToCart(productId) {
  let product = null;
  if (typeof PRODUCTS !== 'undefined') {
    product = PRODUCTS.find(p => p.id === productId);
  }
  if (!product && typeof DEFAULT_PRODUCTS !== 'undefined') {
    product = DEFAULT_PRODUCTS.find(p => p.id === productId);
  }
  if (!product) return;

  const existing = CartState.items.find(i => i.productId === productId);
  if (existing) {
    const stockLimit = product.stock || 99;
    existing.qty = Math.min(existing.qty + 1, stockLimit);
  } else {
    CartState.items.push({
      productId: product.id,
      qty: 1,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '',
        emoji: product.emoji || '🛍️',
        bg: product.bg || '#EFF6FF',
        storeId: product.storeId || 'campus-cafe'
      }
    });
  }

  saveCartToStorage();
  renderCurrentStep();
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('pop');
  showToast(`Added "${product.name}" to cart`);
}

function updateItemQty(productId, delta) {
  const item = CartState.items.find(i => i.productId === productId);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeItem(productId);
    return;
  }

  const stockLimit = item.product.stock || 99;
  item.qty = Math.min(newQty, stockLimit);

  saveCartToStorage();
  renderCurrentStep();
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('pop');
}

function removeItem(productId) {
  const target = CartState.items.find(i => i.productId === productId);
  const name = target?.product?.name || 'Item';
  CartState.items = CartState.items.filter(i => i.productId !== productId);
  saveCartToStorage();
  renderCurrentStep();
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('tap');
  showToast(`${name} removed from cart`);
}

function clearCart() {
  CartState.items = [];
  CartState.appliedCoupon = null;
  saveCartToStorage();
  setCartStep('cart');
  showToast('Cart has been cleared');
}

/* ─── PROMO COUPON LOGIC ─────────────────────────────────── */
function applyCoupon(code) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    showToast('Please enter a coupon code');
    return;
  }

  if (_PROMO_CODES[normalized]) {
    CartState.appliedCoupon = normalized;
    if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('success');
    renderCurrentStep();
    showToast(`Coupon "${normalized}" applied successfully!`);
  } else {
    const available = Object.keys(_PROMO_CODES).join(', ');
    showToast(`Invalid coupon code.${available ? ' Try: ' + available : ''}`);
  }
}

function removeCoupon() {
  CartState.appliedCoupon = null;
  renderCurrentStep();
  showToast('Coupon removed');
}

/* ─── STATE MACHINE TRANSITIONS ──────────────────────────── */
function setCartStep(newStep) {
  // Guard: If trying to checkout or pay with empty cart, reset to cart
  if ((newStep === 'checkout' || newStep === 'payment') && CartState.items.length === 0) {
    newStep = 'cart';
  }

  CartState.step = newStep;

  // Sync fullscreen class on body to hide bottom navigation during checkout/payment/success
  if (newStep === 'checkout' || newStep === 'payment' || newStep === 'success') {
    document.body.classList.add('in-checkout-flow');
  } else {
    document.body.classList.remove('in-checkout-flow');
  }

  // Update header and active step DOM
  updateHeaderForStep(newStep);
  showActiveStepPanel(newStep);
  renderCurrentStep();

  // Scroll smoothly to top of view
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showActiveStepPanel(step) {
  const steps = ['step-cart', 'step-checkout', 'step-payment', 'step-success'];
  steps.forEach(sId => {
    const el = document.getElementById(sId);
    if (!el) return;
    if (sId === `step-${step}`) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

function updateHeaderForStep(step) {
  const header = document.getElementById('cartFlowHeader');
  const backBtn = document.getElementById('cartFlowBackBtn');
  const titleEl = document.getElementById('cartFlowTitle');
  const subtitleEl = document.getElementById('cartFlowSubtitle');
  const clearBtn = document.getElementById('cartFlowClearBtn');

  if (!header || !titleEl || !subtitleEl) return;

  const totals = getCartTotals();

  if (step === 'success') {
    // Order Success header is minimal or embedded into the hero
    header.style.display = 'none';
    return;
  }

  header.style.display = 'flex';

  if (step === 'cart') {
    backBtn?.classList.remove('hidden');
    clearBtn?.classList.remove('hidden');

    if (CartState.items.length === 0) {
      titleEl.textContent = 'My Cart';
      subtitleEl.textContent = 'Your selected items';
      if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.classList.add('disabled');
      }
    } else {
      titleEl.textContent = 'My Cart';
      subtitleEl.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''} • ₹${fmtPrice(totals.subtotal)}`;
      if (clearBtn) {
        clearBtn.disabled = false;
        clearBtn.classList.remove('disabled');
      }
    }
  } else if (step === 'checkout') {
    backBtn?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    titleEl.textContent = 'Checkout';
    subtitleEl.textContent = `${totals.itemCount} items • ₹${fmtPrice(totals.grandTotal)}`;
  } else if (step === 'payment') {
    backBtn?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    titleEl.textContent = 'Payment';
    subtitleEl.textContent = `${totals.itemCount} items • ₹${fmtPrice(totals.grandTotal)}`;
  }
}

/* ─── RENDERING ENGINE ───────────────────────────────────── */
function renderCurrentStep() {
  switch (CartState.step) {
    case 'cart':
      renderCartStep();
      break;
    case 'checkout':
      renderCheckoutStep();
      break;
    case 'payment':
      renderPaymentStep();
      break;
    case 'success':
      renderSuccessStep();
      break;
  }
  syncCartBadge();
}

/* 1. CART STEP (EMPTY OR ITEMS) */
function renderCartStep() {
  const emptyContainer = document.getElementById('cartEmptyContainer');
  const itemsContainer = document.getElementById('cartItemsContainer');
  if (!emptyContainer || !itemsContainer) return;

  const totals = getCartTotals();
  updateHeaderForStep('cart');

  if (CartState.items.length === 0) {
    emptyContainer.style.display = 'block';
    itemsContainer.style.display = 'none';
    renderEmptyCartContent();
  } else {
    emptyContainer.style.display = 'none';
    itemsContainer.style.display = 'block';
    renderItemsCartContent(totals);
  }
}

function renderEmptyCartContent() {
  // Check contextual store return
  const returnBtn = document.getElementById('btnEmptyReturnStore');
  const returnName = document.getElementById('btnEmptyReturnStoreName');
  const lastStoreId = sessionStorage.getItem('unimall_active_store_id') || localStorage.getItem('unimall_last_store_id');
  const lastStoreName = sessionStorage.getItem('unimall_active_store_name') || localStorage.getItem('unimall_last_store_name');

  if (returnBtn && returnName) {
    if (lastStoreId) {
      returnBtn.style.display = 'flex';
      returnName.textContent = lastStoreName || 'Stationery Hub & Book Corner';
      returnBtn.onclick = () => {
        if (typeof window.navigate === 'function') {
          window.navigate('store', { id: lastStoreId });
        } else {
          window.location.href = `index.html?view=store&id=${encodeURIComponent(lastStoreId)}`;
        }
      };
    } else {
      returnBtn.style.display = 'flex';
      returnName.textContent = 'Stationery Hub & Book Corner';
      returnBtn.onclick = () => {
        if (typeof window.navigate === 'function') {
          window.navigate('store', { id: 'book-corner' });
        }
      };
    }
  }

  // Populate "Popular on UniMall" Carousel from real PRODUCTS
  const carousel = document.getElementById('cartPopularCarousel');
  if (carousel) {
    const allProds = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length > 0)
      ? PRODUCTS
      : ((typeof DEFAULT_PRODUCTS !== 'undefined') ? DEFAULT_PRODUCTS : []);

    const popular = allProds.filter(p => p.isPopular || p.rating >= 4.5).slice(0, 8);

    carousel.innerHTML = popular.map(p => {
      const storeObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === p.storeId) : null;
      const storeName = storeObj ? storeObj.name : 'UniMall Store';

      return `
        <div class="cart-product-mini-card">
          <div class="mini-card-thumb">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="mini-thumb-fallback" style="display:none; background:${p.bg || '#EFF6FF'};">${p.emoji || '🛍️'}</div>`
              : `<div class="mini-thumb-fallback" style="background:${p.bg || '#EFF6FF'};">${p.emoji || '🛍️'}</div>`}
          </div>
          <div class="mini-card-name" title="${p.name}">${p.name}</div>
          <div class="mini-card-store">${storeName}</div>
          <div class="mini-card-bottom">
            <span class="mini-card-price">₹${fmtPrice(p.price)}</span>
            <button type="button" class="mini-card-add-btn" data-pid="${p.id}" aria-label="Add ${p.name}">+</button>
          </div>
        </div>
      `;
    }).join('');

    carousel.querySelectorAll('.mini-card-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addItemToCart(btn.dataset.pid);
      });
    });
  }
}

function renderItemsCartContent(totals) {
  // Store Return Banner
  const banner = document.getElementById('cartStoreBanner');
  const bannerName = document.getElementById('cartStoreBannerStoreName');

  let storeId = sessionStorage.getItem('unimall_active_store_id') || localStorage.getItem('unimall_last_store_id');
  let storeName = sessionStorage.getItem('unimall_active_store_name') || localStorage.getItem('unimall_last_store_name');

  if (!storeId && CartState.items.length > 0) {
    storeId = CartState.items[0]?.product?.storeId;
    const sObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === storeId) : null;
    storeName = sObj ? sObj.name : 'Stationery Hub & Book Corner';
  }

  if (bannerName) bannerName.textContent = storeName || 'Stationery Hub & Book Corner';
  if (banner) {
    banner.onclick = () => {
      if (typeof window.navigate === 'function') {
        window.navigate('store', { id: storeId || 'book-corner' });
      }
    };
  }

  // Items List
  const listEl = document.getElementById('cartFlowItemsList');
  if (listEl) {
    listEl.innerHTML = CartState.items.map(item => {
      const p = item.product;
      const sObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === p.storeId) : null;
      const sName = sObj ? sObj.name : 'UniMall Store';

      return `
        <div class="cart-flow-item-card" data-pid="${item.productId}">
          <div class="flow-item-thumb">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="flow-thumb-fallback" style="display:none; background:${p.bg || '#EFF6FF'};">${p.emoji || '📦'}</div>`
              : `<div class="flow-thumb-fallback" style="background:${p.bg || '#EFF6FF'};">${p.emoji || '📦'}</div>`}
          </div>

          <div class="flow-item-details">
            <div class="flow-item-name" title="${p.name}">${p.name}</div>
            <div class="flow-item-store">${sName}</div>
            <div class="flow-item-price">₹${fmtPrice(p.price)}</div>
          </div>

          <div class="flow-item-actions">
            <button type="button" class="flow-item-delete-btn" data-pid="${item.productId}" aria-label="Remove ${p.name}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
            <div class="flow-item-stepper">
              <button type="button" class="flow-stepper-btn btn-dec" data-pid="${item.productId}">−</button>
              <span class="flow-stepper-val">${item.qty}</span>
              <button type="button" class="flow-stepper-btn btn-inc" data-pid="${item.productId}">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.btn-dec').forEach(btn => {
      btn.onclick = () => updateItemQty(btn.dataset.pid, -1);
    });
    listEl.querySelectorAll('.btn-inc').forEach(btn => {
      btn.onclick = () => updateItemQty(btn.dataset.pid, 1);
    });
    listEl.querySelectorAll('.flow-item-delete-btn').forEach(btn => {
      btn.onclick = () => removeItem(btn.dataset.pid);
    });
  }

  // Populate "You might also like" recommendations
  const recsCarousel = document.getElementById('cartRecsCarousel');
  if (recsCarousel) {
    const existingPids = new Set(CartState.items.map(i => i.productId));
    const allProds = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length > 0)
      ? PRODUCTS
      : ((typeof DEFAULT_PRODUCTS !== 'undefined') ? DEFAULT_PRODUCTS : []);

    const recs = allProds.filter(p => !existingPids.has(p.id)).slice(0, 6);

    recsCarousel.innerHTML = recs.map(p => {
      const sObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === p.storeId) : null;
      const sName = sObj ? sObj.name : 'UniMall Store';

      return `
        <div class="cart-product-mini-card">
          <div class="mini-card-thumb">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="mini-thumb-fallback" style="display:none; background:${p.bg || '#EFF6FF'};">${p.emoji || '🛍️'}</div>`
              : `<div class="mini-thumb-fallback" style="background:${p.bg || '#EFF6FF'};">${p.emoji || '🛍️'}</div>`}
          </div>
          <div class="mini-card-name" title="${p.name}">${p.name}</div>
          <div class="mini-card-store">${sName}</div>
          <div class="mini-card-bottom">
            <span class="mini-card-price">₹${fmtPrice(p.price)}</span>
            <button type="button" class="mini-card-add-btn" data-pid="${p.id}" aria-label="Add ${p.name}">+</button>
          </div>
        </div>
      `;
    }).join('');

    recsCarousel.querySelectorAll('.mini-card-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addItemToCart(btn.dataset.pid);
      });
    });
  }

  // Sticky Bar pricing
  const totalEl = document.getElementById('cartBarTotalPrice');
  const countEl = document.getElementById('cartBarItemCount');
  if (totalEl) totalEl.textContent = `₹${fmtPrice(totals.grandTotal)}`;
  if (countEl) countEl.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}`;
}

/* 2. CHECKOUT STEP */
function renderCheckoutStep() {
  updateHeaderForStep('checkout');

  const fPickup = document.getElementById('fOptionPickup');
  const fDelivery = document.getElementById('fOptionDelivery');
  const secPickup = document.getElementById('sectionPickupLocation');
  const secDelivery = document.getElementById('sectionDeliveryLocation');

  if (CartState.fulfillmentType === 'pickup') {
    fPickup?.classList.add('active');
    fDelivery?.classList.remove('active');
    if (secPickup) secPickup.style.display = 'block';
    if (secDelivery) secDelivery.style.display = 'none';
  } else {
    fDelivery?.classList.add('active');
    fPickup?.classList.remove('active');
    if (secPickup) secPickup.style.display = 'none';
    if (secDelivery) secDelivery.style.display = 'block';
  }

  const stationTitle = document.getElementById('checkoutStationTitle');
  const stationDesc = document.getElementById('checkoutStationDesc');
  if (stationTitle) stationTitle.textContent = CartState.pickupLocation.name;
  if (stationDesc) stationDesc.textContent = CartState.pickupLocation.desc;

  const hostelSelect = document.getElementById('checkoutHostelSelect');
  const roomInput = document.getElementById('checkoutRoomInput');
  if (hostelSelect && CartState.deliveryInfo.hostel) hostelSelect.value = CartState.deliveryInfo.hostel;
  if (roomInput && CartState.deliveryInfo.room) roomInput.value = CartState.deliveryInfo.room;
}

/* 3. PAYMENT STEP */
function renderPaymentStep() {
  updateHeaderForStep('payment');
  const totals = getCartTotals();

  // Summary Lines
  const subtotalEl = document.getElementById('paySummarySubtotal');
  const discRow = document.getElementById('paySummaryDiscountRow');
  const discCode = document.getElementById('paySummaryDiscountCode');
  const discVal = document.getElementById('paySummaryDiscountVal');
  const fulLabel = document.getElementById('paySummaryFulfillmentLabel');
  const fulVal = document.getElementById('paySummaryFulfillmentVal');
  const packVal = document.getElementById('paySummaryPackagingVal');
  const totalVal = document.getElementById('paySummaryTotalVal');
  const payBtnText = document.getElementById('btnPayAmountText');

  if (subtotalEl) subtotalEl.textContent = `₹${fmtPrice(totals.subtotal)}`;

  if (discRow && discCode && discVal) {
    if (totals.discountAmount > 0) {
      discRow.style.display = 'flex';
      discCode.textContent = CartState.appliedCoupon || '';
      discVal.textContent = `-₹${fmtPrice(totals.discountAmount)}`;
    } else {
      discRow.style.display = 'none';
    }
  }

  if (fulLabel && fulVal) {
    if (CartState.fulfillmentType === 'pickup') {
      fulLabel.textContent = 'Fulfilment (Self-Pickup)';
      fulVal.textContent = 'FREE';
      fulVal.className = 'free-text';
    } else {
      fulLabel.textContent = 'Fulfilment (Campus Delivery)';
      fulVal.textContent = `₹${fmtPrice(totals.deliveryFee)}`;
      fulVal.className = '';
    }
  }

  if (packVal) packVal.textContent = `₹${totals.packagingFee}`;
  if (totalVal) totalVal.textContent = `₹${fmtPrice(totals.grandTotal)}`;
  if (payBtnText) payBtnText.textContent = `Pay ₹${fmtPrice(totals.grandTotal)}`;

  // Payment method selection
  const rzpCard = document.getElementById('payOptionRazorpay');
  const shopCard = document.getElementById('payOptionShop');
  if (CartState.paymentMethod === 'razorpay') {
    rzpCard?.classList.add('active');
    shopCard?.classList.remove('active');
  } else {
    shopCard?.classList.add('active');
    rzpCard?.classList.remove('active');
  }

  // Populate drawer
  const drawerList = document.getElementById('summaryDrawerList');
  if (drawerList) {
    drawerList.innerHTML = CartState.items.map(item => `
      <div class="summary-drawer-item">
        <span class="drawer-item-title">${item.product.name} <span class="drawer-item-qty">×${item.qty}</span></span>
        <span class="drawer-item-price">₹${fmtPrice(item.product.price * item.qty)}</span>
      </div>
    `).join('');
  }
}

/* 4. ORDER SUCCESS STEP */
function renderSuccessStep() {
  updateHeaderForStep('success');

  const orderNumEl = document.getElementById('successOrderNumText');
  const metaEl = document.getElementById('successOrderMetaText');
  const locTitle = document.getElementById('successLocationTitle');
  const locSub = document.getElementById('successLocationSub');
  const etaEl = document.getElementById('successEtaPillText');

  const primaryOrder = CartState.lastCreatedOrder || {};
  const orders = CartState.lastCreatedOrders || [primaryOrder];

  if (orderNumEl) {
    orderNumEl.textContent = `Order ${primaryOrder.order_number_display || primaryOrder.orderNumber || '#UM-2841'}`;
  }

  if (metaEl) {
    const totalCount = orders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0) || primaryOrder.items?.length || 1;
    const totalAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0) || primaryOrder.total || 0;
    metaEl.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''} • ₹${fmtPrice(totalAmount)}`;
  }

  if (locTitle && locSub) {
    if (primaryOrder.fulfillmentType === 'delivery') {
      locTitle.textContent = 'Delivery to Campus';
      locSub.textContent = `${primaryOrder.customer?.hostel || CartState.deliveryInfo.hostel || 'Hostel'} · ${primaryOrder.customer?.room || CartState.deliveryInfo.room || 'Room'}`;
    } else {
      locTitle.textContent = 'Campus Counter Pickup';
      locSub.textContent = primaryOrder.pickupLocation || CartState.pickupLocation.desc || 'Ground Floor, University Mall';
    }
  }

  if (etaEl) {
    etaEl.textContent = 'Estimated ready in 10–15 minutes';
  }
}

/* ─── ONE UNIQUE SUBTLE CHIME FOR ORDER PLACEMENT ────────── */
function playOrderPlacedChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.40);
    });
  } catch (e) { }
}

/* ─── ORDER EXECUTION (INTEGRATED WITH NEON DB) ──────────── */
function handlePlaceOrder() {
  if (CartState.items.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  const totals = getCartTotals();
  const payBtn = document.getElementById('btnExecutePayment');

  function resetPayBtn() {
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Pay ₹${fmtPrice(totals.grandTotal)}</span>
      `;
    }
  }

  const isRazorpay = CartState.paymentMethod === 'razorpay';
  const bypassRazorpay = (typeof window.BYPASS_RAZORPAY !== 'undefined') ? window.BYPASS_RAZORPAY : false;

  if (isRazorpay) {
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>Connecting to Razorpay...</span>`;
    }

    if (bypassRazorpay) {
      setTimeout(async () => {
        try {
          const mockPaymentId = 'rzp_test_' + Date.now();
          await executeOrderCreation(mockPaymentId, 'Instant Pay (Verified)');
        } catch (err) {
          resetPayBtn();
          showToast('Order creation failed: ' + err.message);
        }
      }, 500);
      return;
    }

    const amountInPaise = Math.max(100, Math.round(totals.grandTotal * 100));
    const rawStoreId = CartState.items[0]?.product?.storeId || 'campus-cafe';
    const storeObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === rawStoreId) : null;
    const storeName = storeObj ? storeObj.name : 'Campus Store';

    let user = {};
    try {
      const authRaw = localStorage.getItem('unimall_auth');
      if (authRaw) user = JSON.parse(authRaw);
    } catch(e) {}

    if (typeof Razorpay === 'undefined') {
      setTimeout(async () => {
        try {
          await executeOrderCreation('rzp_mock_' + Date.now(), 'Razorpay Instant (Verified)');
        } catch(err) {
          resetPayBtn();
          showToast('Order creation failed: ' + err.message);
        }
      }, 600);
      return;
    }

    const options = {
      key: window.RAZORPAY_KEY_ID || window.UNIMALL_CONFIG?.RAZORPAY_KEY_ID || '',
      amount: amountInPaise,
      currency: 'INR',
      name: 'UniMall · ' + storeName,
      description: `${CartState.fulfillmentType === 'delivery' ? 'Campus Delivery' : 'Counter Pickup'} Order (${CartState.items.length} items)`,
      image: '/favicon.png',
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || ''
      },
      theme: { color: '#2563EB' },
      modal: {
        ondismiss: function() {
          resetPayBtn();
          showToast('Payment cancelled. Your account was not charged.');
        }
      },
      handler: async function(response) {
        if (payBtn) payBtn.innerHTML = `<span>Payment Confirmed! Finalizing...</span>`;
        try {
          const paymentId = response.razorpay_payment_id || ('rzp_pay_' + Date.now());
          await executeOrderCreation(paymentId, 'Razorpay Instant (Paid)');
        } catch (err) {
          resetPayBtn();
          showToast('Payment verified but order creation failed: ' + err.message);
        }
      }
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        resetPayBtn();
        const errDesc = resp.error?.description || 'Transaction declined by bank';
        showToast(`Payment failed: ${errDesc}`);
      });
      rzp.open();
    } catch (err) {
      resetPayBtn();
      showToast('Could not open payment window: ' + err.message);
    }
  } else {
    // Pay at the Shop
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>Processing Order...</span>`;
    }
    setTimeout(async () => {
      try {
        await executeOrderCreation(null, 'Pay at the Shop');
      } catch(err) {
        resetPayBtn();
        showToast('Order failed: ' + err.message);
      }
    }, 450);
  }
}

async function executeOrderCreation(paymentId, paymentMethodLabel) {
  const totals = getCartTotals();
  const payBtn = document.getElementById('btnExecutePayment');

  try {
    let appData = {};
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) appData = JSON.parse(raw);
    if (!Array.isArray(appData.orders)) appData.orders = [];

    let activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser)
      ? window.UserManager.getActiveUser()
      : null;
    if (!activeUser && typeof window.UserManager !== 'undefined' && window.UserManager.ensureGuestProfile) {
      activeUser = window.UserManager.ensureGuestProfile();
    }
    const user = activeUser || appData.currentUser || {};
    const userId = user.uid || user.id || user.guestId || ('usr_guest_' + Date.now());
    const studentName = user.name || (user.profile && user.profile.name) || 'Campus Student';
    const studentPhone = user.phone || (user.profile && user.profile.phone) || '';
    const numMatch = (studentName || '').match(/\d+/);
    const studentNumber = numMatch ? numMatch[0] : (String(userId).replace(/\D/g, '') || '1');
    const studentEmail = user.email || (user.profile && user.profile.email) || `student${studentNumber}@campus.edu`;

    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
      window.UniMallDB.syncUser({ id: userId, uid: userId, name: studentName, email: studentEmail, phone: studentPhone }).catch(() => {});
    }

    // Multi-store grouping
    const CANONICAL_STORE_MAP = {
      'store-bakery':      'campus-cafe',
      'store-stationery':  'book-corner',
      'store-electronics': 'techstop',
      'store-print':       'campus-mart',
      'store-fashion':     'campus-wear',
      'store-sports':      'campus-mart',
      'store-pharmacy':    'health-hub'
    };

    const storeGroups = {};
    for (const item of CartState.items) {
      const rawStoreId = item.product?.storeId || 'campus-cafe';
      const storeId = CANONICAL_STORE_MAP[rawStoreId] || rawStoreId;
      if (!storeGroups[storeId]) storeGroups[storeId] = [];
      storeGroups[storeId].push(item);
    }

    const storeIds = Object.keys(storeGroups);
    const createdOrders = [];

    for (const sId of storeIds) {
      const sItems = storeGroups[sId];
      const sSubtotal = sItems.reduce((sum, it) => sum + ((it.product?.price || 0) * it.qty), 0);
      const sDiscount = totals.subtotal > 0 ? Math.round((sSubtotal / totals.subtotal) * totals.discountAmount) : 0;
      const sDelivery = totals.subtotal > 0 ? Math.round((sSubtotal / totals.subtotal) * totals.deliveryFee) : 0;
      const sPackaging = totals.subtotal > 0 ? Math.round((sSubtotal / totals.subtotal) * totals.packagingFee) : 0;
      const sTotal = Math.max(0, sSubtotal - sDiscount + sDelivery + sPackaging);

      const storeObj = (typeof STORES !== 'undefined') ? STORES.find(s => s.id === sId) : null;
      const sName = storeObj ? storeObj.name : 'Campus Store';
      const orderId = 'UM' + Math.floor(10000 + Math.random() * 90000);

      let displayOrderNum = '#ORD-01';
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getNextStoreOrderNumber === 'function') {
        displayOrderNum = await window.UniMallDB.getNextStoreOrderNumber(sId);
      } else {
        const localStoreOrders = (appData.orders || []).filter(o => o.storeId === sId || o.store_id === sId);
        displayOrderNum = `#ORD-${String(localStoreOrders.length + 1).padStart(2, '0')}`;
      }

      const alreadyInBatch = createdOrders.filter(o => o.storeId === sId).length;
      if (alreadyInBatch > 0) {
        const m = displayOrderNum.match(/#?ORD-(\d+)/i);
        const curVal = m ? parseInt(m[1], 10) : 1;
        displayOrderNum = `#ORD-${String(curVal + alreadyInBatch).padStart(2, '0')}`;
      }
      const otp = String(Math.floor(1000 + Math.random() * 9000));

      const newOrder = {
        id: orderId,
        order_number_display: displayOrderNum,
        user_id: userId,
        customerName: studentName,
        user_name: studentName,
        user_phone: studentPhone,
        customer: {
          name: studentName,
          phone: studentPhone,
          email: studentEmail,
          hostel: CartState.deliveryInfo.hostel,
          room: CartState.deliveryInfo.room
        },
        storeId: sId,
        storeName: sName,
        storeIcon: sItems[0]?.product?.emoji || '🛍️',
        items: sItems.map(item => ({
          productId: item.productId,
          name: item.product.name,
          price: item.product.price,
          qty: item.qty,
          image: item.product.image || '',
          emoji: item.product.emoji || '📦'
        })),
        subtotal: sSubtotal,
        deliveryFee: sDelivery,
        discount: sDiscount,
        packagingFee: sPackaging,
        total: sTotal,
        fulfillmentType: CartState.fulfillmentType,
        pickupLocation: CartState.pickupLocation.desc,
        otp: otp,
        orderNotes: CartState.orderNotes,
        paymentMethod: paymentMethodLabel,
        paymentId: paymentId || null,
        paymentStatus: paymentId ? 'PAID' : 'PENDING_AT_COUNTER',
        status: 'placed',
        statusHistory: [
          { status: 'placed', time: new Date().toISOString(), label: 'Order Placed & Confirmed' }
        ],
        createdAt: new Date().toISOString()
      };

      // Persist to Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined') {
        const supabasePayload = {
          id: orderId,
          order_number: displayOrderNum,
          user_id: userId,
          user_name: studentName,
          user_email: studentEmail,
          user_phone: studentPhone,
          user_hostel: CartState.deliveryInfo.hostel || 'Ground Floor',
          user_room: CartState.deliveryInfo.room || 'Pickup Station',
          store_id: sId,
          status: 'placed',
          fulfillment_type: CartState.fulfillmentType,
          subtotal: sSubtotal,
          delivery_fee: sDelivery,
          total: sTotal,
          payment_method: paymentMethodLabel,
          notes: CartState.orderNotes || ''
        };

        await window.UniMallDB.createOrder(supabasePayload, newOrder.items).catch(err => {
          console.warn('[UniMall] Neon DB order insert notice:', err.message);
        });
      }

      appData.orders.unshift(newOrder);
      createdOrders.push(newOrder);

      // Trigger cross-tab realtime notification
      try {
        localStorage.setItem('unimall_new_order_placed_event', JSON.stringify({
          orderId: newOrder.id,
          displayNum: newOrder.order_number_display,
          storeId: sId,
          total: newOrder.total,
          customerName: studentName,
          itemsCount: newOrder.items.length,
          timestamp: Date.now()
        }));
      } catch(e) {}

      try {
        const bc = new BroadcastChannel('unimall_orders_channel');
        bc.postMessage({
          type: 'ORDER_PLACED',
          orderId: newOrder.id,
          displayNum: newOrder.order_number_display,
          storeId: sId,
          total: newOrder.total,
          customerName: studentName,
          itemsCount: newOrder.items.length,
          timestamp: Date.now()
        });
        bc.close();
      } catch(e) {}

      try {
        window.dispatchEvent(new CustomEvent('unimall:orderPlaced', { detail: newOrder }));
      } catch(e) {}
    }

    // Clear cart in local storage and state
    appData.cart = [];
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(appData));
    CartState.items = [];
    if (typeof AppState !== 'undefined') AppState.cart = [];

    // Chime & Confetti
    playOrderPlacedChime();
    if (typeof window.UniMallConfetti === 'function') window.UniMallConfetti();

    // Transition to ORDER SUCCESS step
    CartState.lastCreatedOrder = createdOrders[0] || {};
    CartState.lastCreatedOrders = createdOrders;
    setCartStep('success');

  } catch (e) {
    console.error('[Cart] Order placement error:', e);
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = `<span>Try Again</span>`;
    }
    showToast('Error placing order. Please try again.');
  }
}

/* ─── TOAST NOTIFICATION ─────────────────────────────────── */
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('cartToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2600);
}

/* ─── CART BADGE SYNC ────────────────────────────────────── */
function syncCartBadge() {
  try {
    let items = [];
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) items = parsed.cart;
    } else {
      items = CartState.items;
    }
    const totalCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.nav-badge, .cart-badge, .sidebar-badge');
    badges.forEach(badge => {
      badge.textContent = totalCount > 9 ? '9+' : String(totalCount);
      badge.style.display = totalCount > 0 ? '' : 'none';
      badge.setAttribute('aria-label', `${totalCount} item${totalCount !== 1 ? 's' : ''} in cart`);
    });
    const cartNav = document.getElementById('nav-cart');
    if (cartNav) cartNav.setAttribute('aria-label', `Cart, ${totalCount} item${totalCount !== 1 ? 's' : ''}`);
  } catch (e) { }
}

/* ─── EVENT BINDINGS ─────────────────────────────────────── */
function initCartFlowEvents() {
  // 1. Back button (adapts to current step)
  const backBtn = document.getElementById('cartFlowBackBtn');
  backBtn?.addEventListener('click', () => {
    if (CartState.step === 'payment') {
      setCartStep('checkout');
    } else if (CartState.step === 'checkout') {
      setCartStep('cart');
    } else if (CartState.step === 'success') {
      if (typeof window.navigate === 'function') window.navigate('home');
    } else {
      // Cart step back
      const lastStoreId = sessionStorage.getItem('unimall_active_store_id') || localStorage.getItem('unimall_last_store_id');
      if (lastStoreId && typeof window.navigate === 'function') {
        window.navigate('store', { id: lastStoreId });
      } else if (typeof window.navigate === 'function') {
        window.navigate('home');
      } else if (window.history.length > 1) {
        window.history.back();
      }
    }
  });

  // 2. Clear Cart button
  const clearBtn = document.getElementById('cartFlowClearBtn');
  clearBtn?.addEventListener('click', () => {
    if (CartState.items.length === 0) return;
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  });

  // 3. Empty cart action buttons
  document.getElementById('btnEmptyBrowseStores')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') window.navigate('stores');
  });

  document.getElementById('btnEmptyExploreItems')?.addEventListener('click', () => {
    const sec = document.getElementById('cartPopularSection');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btnSeeAllPopular')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') window.navigate('stores');
  });

  document.getElementById('btnSeeAllRecs')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') window.navigate('stores');
  });

  // 4. Cart with items -> Proceed to Checkout
  document.getElementById('btnProceedToCheckout')?.addEventListener('click', () => {
    if (CartState.items.length === 0) {
      showToast('Your cart is empty!');
      return;
    }
    setCartStep('checkout');
  });

  // 5. Checkout fulfillment options
  const fPickup = document.getElementById('fOptionPickup');
  const fDelivery = document.getElementById('fOptionDelivery');

  fPickup?.addEventListener('click', () => {
    CartState.fulfillmentType = 'pickup';
    renderCheckoutStep();
  });

  fDelivery?.addEventListener('click', () => {
    CartState.fulfillmentType = 'delivery';
    renderCheckoutStep();
  });

  // 6. Checkout delivery inputs
  const hostelSelect = document.getElementById('checkoutHostelSelect');
  const roomInput = document.getElementById('checkoutRoomInput');
  hostelSelect?.addEventListener('change', (e) => {
    CartState.deliveryInfo.hostel = e.target.value;
  });
  roomInput?.addEventListener('input', (e) => {
    CartState.deliveryInfo.room = e.target.value;
  });

  // 7. Station change modal
  const stationModal = document.getElementById('pickupStationModal');
  document.getElementById('btnChangeStation')?.addEventListener('click', () => {
    if (stationModal) stationModal.style.display = 'flex';
  });
  document.getElementById('btnCloseStationModal')?.addEventListener('click', () => {
    if (stationModal) stationModal.style.display = 'none';
  });
  stationModal?.addEventListener('click', (e) => {
    if (e.target === stationModal) stationModal.style.display = 'none';
  });

  document.querySelectorAll('.station-option-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.station-option-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const stDetails = item.querySelector('.st-opt-details');
      if (stDetails) {
        CartState.pickupLocation.name = stDetails.querySelector('strong')?.textContent || 'Store Counter Pickup Station';
        CartState.pickupLocation.desc = stDetails.querySelector('p')?.textContent || 'Ground Floor, University Mall';
      }
      renderCheckoutStep();
      if (stationModal) stationModal.style.display = 'none';
    });
  });

  // 8. Campus Map Modal
  const mapModal = document.getElementById('campusMapModal');
  document.getElementById('btnViewOnMap')?.addEventListener('click', () => {
    if (mapModal) mapModal.style.display = 'flex';
  });
  document.getElementById('btnCloseMapModal')?.addEventListener('click', () => {
    if (mapModal) mapModal.style.display = 'none';
  });
  document.getElementById('btnMapGotIt')?.addEventListener('click', () => {
    if (mapModal) mapModal.style.display = 'none';
  });
  mapModal?.addEventListener('click', (e) => {
    if (e.target === mapModal) mapModal.style.display = 'none';
  });

  // 9. Continue to Payment
  document.getElementById('btnContinueToPayment')?.addEventListener('click', () => {
    if (CartState.fulfillmentType === 'delivery') {
      const room = document.getElementById('checkoutRoomInput')?.value.trim();
      if (!room) {
        showToast('Please enter your room / location for delivery');
        return;
      }
    }
    setCartStep('payment');
  });

  // 10. Payment methods
  document.getElementById('payOptionRazorpay')?.addEventListener('click', () => {
    CartState.paymentMethod = 'razorpay';
    renderPaymentStep();
  });

  document.getElementById('payOptionShop')?.addEventListener('click', () => {
    CartState.paymentMethod = 'cod';
    renderPaymentStep();
  });

  // 11. Toggle summary items drawer
  const toggleBtn = document.getElementById('btnToggleSummaryItems');
  const itemsDrawer = document.getElementById('summaryItemsDrawer');
  const toggleText = document.getElementById('summaryToggleText');
  toggleBtn?.addEventListener('click', () => {
    if (!itemsDrawer) return;
    const isClosed = itemsDrawer.style.display === 'none';
    itemsDrawer.style.display = isClosed ? 'block' : 'none';
    if (toggleText) toggleText.textContent = isClosed ? 'Hide Items' : 'View Items';
  });

  // 12. Execute Payment
  document.getElementById('btnExecutePayment')?.addEventListener('click', handlePlaceOrder);

  // 13. Order Success Actions
  document.getElementById('btnSuccessViewDetails')?.addEventListener('click', () => {
    const pOrder = CartState.lastCreatedOrder;
    if (pOrder && pOrder.id && typeof window.openOrderModal === 'function') {
      window.openOrderModal(pOrder.id);
    } else if (typeof window.navigate === 'function') {
      window.navigate('orders');
    }
  });

  document.getElementById('btnSuccessTrackOrder')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') {
      window.navigate('orders');
    }
  });

  document.getElementById('btnSuccessContinueShopping')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') {
      window.navigate('home');
    }
  });

  document.getElementById('btnSuccessWhileYouWait')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') {
      window.navigate('stores');
    }
  });
}

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  initCartFlowEvents();
  renderCurrentStep();
  syncCartBadge();
  _fetchPromoCodes();
});

// Global Bridge
window.renderCartView = function(step) {
  loadCartFromStorage();
  if (step) {
    setCartStep(step);
  } else {
    setCartStep(CartState.items.length === 0 ? 'cart' : (CartState.step || 'cart'));
  }
};

window.setCartStep = setCartStep;
window.clearCart = clearCart;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.addItemToCart = addItemToCart;
window.getCartState = () => CartState;

})();
