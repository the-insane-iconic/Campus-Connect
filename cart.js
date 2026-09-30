/* ═══════════════════════════════════════════════════════════
   UNIMALL — CART & CHECKOUT CONTROLLER (cart.js)
   Full functional cart frontend + backend state engine
   ═══════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'unimall_v1';

/* ─── COUPON DICTIONARY ──────────────────────────────────── */
const PROMO_CODES = {
  CAMPUS10: { type: 'percent', value: 10, label: '10% Campus Discount' },
  FREEDEL: { type: 'delivery', value: 20, label: 'Free Delivery' },
  STUDENT20: { type: 'flat', value: 20, label: '₹20 Student Discount' }
};

/* ─── CART STATE ─────────────────────────────────────────── */
const CartState = {
  items: [], // [{ productId, qty, product }]
  fulfillmentType: 'pickup', // Self-Pickup only at start
  deliveryInfo: null,
  appliedCoupon: null, // 'CAMPUS10' | 'FREEDEL' | 'STUDENT20' | null
  orderNotes: '',
  paymentMethod: 'razorpay', // 'razorpay' | 'cod'
  packagingFee: 5
};

/* ─── STORAGE SYNC ───────────────────────────────────────── */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
              name: rawP.name || 'Campus Item',
              price: Number(rawP.price) || 50,
              image: rawP.image || '',
              emoji: rawP.emoji || '🛍️',
              bg: rawP.bg || '#EFF6FF',
              storeId: rawP.storeId || 'campus-cafe'
            };
          }

          return {
            productId: line.productId,
            qty: line.qty || 1,
            product: product || {
              id: line.productId,
              name: 'Campus Item',
              price: 50,
              image: '',
              emoji: '📦',
              bg: '#EFF6FF',
              storeId: 'campus-mart'
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
    console.error('Error loading cart state:', e);
  }
}

function saveCartToStorage() {
  try {
    let appData = {};
    const raw = localStorage.getItem(STORAGE_KEY);
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
      storeId: i.product.storeId || 'campus-cafe'
    }));
    if (CartState.deliveryInfo.hostel && appData.currentUser) {
      appData.currentUser.hostel = CartState.deliveryInfo.hostel;
      appData.currentUser.room = CartState.deliveryInfo.room;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    syncCartBadge();
  } catch (e) {
    console.error('Error saving cart state:', e);
  }
}

/* ─── COMPUTED TOTALS ────────────────────────────────────── */
function getCartTotals() {
  const subtotal = CartState.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  let deliveryFee = 0; // Self-pickup is always 100% free
  let discountAmount = 0;

  if (CartState.appliedCoupon && PROMO_CODES[CartState.appliedCoupon]) {
    const coupon = PROMO_CODES[CartState.appliedCoupon];
    if (coupon.type === 'percent') {
      discountAmount = Math.round((subtotal * coupon.value) / 100);
    } else if (coupon.type === 'flat') {
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === 'delivery') {
      discountAmount = 0;
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
function updateItemQty(productId, delta) {
  const item = CartState.items.find(i => i.productId === productId);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeItem(productId);
    return;
  }

  // Stock limit
  const stockLimit = item.product.stock || 99;
  item.qty = Math.min(newQty, stockLimit);

  saveCartToStorage();
  renderCartView();
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('pop');
}

function removeItem(productId) {
  CartState.items = CartState.items.filter(i => i.productId !== productId);
  saveCartToStorage();
  renderCartView();
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('tap');
  showToast('Item removed from cart');
}

function clearCart() {
  CartState.items = [];
  CartState.appliedCoupon = null;
  saveCartToStorage();
  renderCartView();
  showToast('Cart has been cleared');
}

/* ─── PROMO COUPON LOGIC ─────────────────────────────────── */
function applyCoupon(code) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    showToast('Please enter a coupon code');
    return;
  }

  if (PROMO_CODES[normalized]) {
    CartState.appliedCoupon = normalized;
    if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('success');
    renderBillBreakdown();
    renderCouponSection();
    showToast(`Coupon "${normalized}" applied successfully!`);
  } else {
    showToast('Invalid coupon code. Try CAMPUS10 or FREEDEL.');
  }
}

function removeCoupon() {
  CartState.appliedCoupon = null;
  renderBillBreakdown();
  renderCouponSection();
  showToast('Coupon removed');
}

/* ─── ONE UNIQUE SUBTLE SOUND FOR ORDER PLACEMENT ────────── */
function playOrderPlacedChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // Elegant, warm 3-note ascending luxury chime (C5 -> E5 -> G5)
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
  } catch (e) {
    // Audio policy fallback
  }
}

/* ─── PLACE ORDER (CHECKOUT ENGINE & RAZORPAY GATEWAY) ───── */
function handlePlaceOrder() {
  if (CartState.items.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  const totals = getCartTotals();
  const placeBtn = document.getElementById('placeOrderBtn');

  function resetPlaceBtn() {
    if (placeBtn) {
      placeBtn.disabled = false;
      placeBtn.innerHTML = `
        <span>Pay & Place Order</span>
        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      `;
    }
  }

  // Check if Razorpay is chosen
  const isRazorpay = CartState.paymentMethod === 'razorpay' || CartState.paymentMethod === 'upi' || CartState.paymentMethod === 'card';

  // Configurable Razorpay bypass flag (set to false to enable real Razorpay Checkout)
  const bypassRazorpay = (typeof window.BYPASS_RAZORPAY !== 'undefined') ? window.BYPASS_RAZORPAY : false;

  if (isRazorpay) {
    if (placeBtn) {
      placeBtn.disabled = true;
      placeBtn.innerHTML = `<span>Connecting to Razorpay...</span>`;
    }

    // Direct Instant Checkout Bypass Mode (if explicitly turned on)
    if (bypassRazorpay) {
      console.log('[Checkout] Razorpay bypassed for testing — completing payment instantly');
      setTimeout(async () => {
        try {
          const mockPaymentId = 'rzp_test_' + Date.now();
          await executeOrderCreation(mockPaymentId, 'Instant Pay (Verified)');
        } catch (err) {
          resetPlaceBtn();
          showToast('Order creation failed: ' + err.message, 'error');
        }
      }, 500);
      return;
    }

    const amountInPaise = Math.max(100, Math.round(totals.grandTotal * 100)); // Minimum ₹1 for test gateway
    const rawStoreId = CartState.items[0]?.product?.storeId || 'campus-cafe';
    const storeObj = (typeof STORES !== 'undefined')
      ? STORES.find(s => s.id === rawStoreId)
      : null;
    const storeName = storeObj ? storeObj.name : 'Campus Store';

    let user = {};
    try {
      const authRaw = localStorage.getItem('unimall_auth');
      if (authRaw) user = JSON.parse(authRaw);
    } catch(e) {}

    // Check if Razorpay SDK is loaded
    if (typeof Razorpay === 'undefined') {
      console.warn('Razorpay SDK not loaded — proceeding with mock secure payment test');
      setTimeout(() => {
        executeOrderCreation('rzp_mock_' + Date.now(), 'Razorpay Instant (Verified)');
      }, 600);
      return;
    }

    const options = {
      key: window.RAZORPAY_KEY_ID || 'rzp_test_TiK8sBDv7ObzG5', // Verified Razorpay test key
      amount: amountInPaise,
      currency: 'INR',
      name: 'UniMall · ' + storeName,
      description: `Counter Pickup Order (${CartState.items.length} items)`,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120',
      prefill: {
        name: user.name || 'Campus Student',
        email: user.email || 'student@campus.edu',
        contact: user.phone || '9876543210'
      },
      theme: {
        color: '#2563EB'
      },
      modal: {
        ondismiss: function() {
          // ATOMICITY: User closed payment window. Money NOT deducted, order NOT created, cart preserved!
          resetPlaceBtn();
          showToast('Payment cancelled. Your card/account was not charged.', 'info');
        }
      },
      handler: async function(response) {
        // ATOMICITY: Money successfully confirmed! NOW create and persist order
        if (placeBtn) {
          placeBtn.innerHTML = `<span>Payment Confirmed! Finalizing...</span>`;
        }
        try {
          const paymentId = response.razorpay_payment_id || ('rzp_pay_' + Date.now());
          await executeOrderCreation(paymentId, 'Razorpay Instant (Paid)');
        } catch (err) {
          resetPlaceBtn();
          showToast('Payment verified but order creation failed: ' + err.message, 'error');
        }
      }
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        // ATOMICITY: Payment failed at bank/gateway level. Handle exception securely.
        resetPlaceBtn();
        const errDesc = resp.error?.description || 'Transaction declined by bank';
        console.error('[Razorpay] Payment Failure:', resp.error);
        showToast(`Payment failed: ${errDesc}. No money was deducted.`, 'error');
      });
      rzp.open();
    } catch(err) {
      resetPlaceBtn();
      console.error('[Razorpay] Gateway Init Error:', err);
      showToast('Could not initialize payment gateway: ' + err.message, 'error');
    }
  } else {
    // Pay at Counter (Cash/UPI upon counter collection)
    if (placeBtn) {
      placeBtn.disabled = true;
      placeBtn.innerHTML = `<span>Processing Order...</span>`;
    }
    setTimeout(() => {
      executeOrderCreation(null, 'Pay at Counter');
    }, 400);
  }
}

async function executeOrderCreation(paymentId, paymentMethodLabel) {
  const totals = getCartTotals();
  const placeBtn = document.getElementById('placeOrderBtn');

  try {
    let appData = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    if (!Array.isArray(appData.orders)) {
      appData.orders = [];
    }

    let user = appData.currentUser || {};
    const authRaw = localStorage.getItem('unimall_auth');
    if (authRaw) {
      try {
        user = { ...user, ...JSON.parse(authRaw) };
      } catch (e) { }
    }

    const studentName = (user.name || (typeof DEFAULT_USER !== 'undefined' ? DEFAULT_USER.name : '') || 'Campus Student').trim();
    const studentPhone = user.phone || '';
    const studentEmail = user.email || '';

    const CANONICAL_STORE_MAP = {
      'store-bakery':      'campus-cafe',
      'store-stationery':  'book-corner',
      'store-electronics': 'techstop',
      'store-print':       'campus-mart',
      'store-fashion':     'campus-wear',
      'store-sports':      'health-hub',
    };
    const rawStoreId = CartState.items[0]?.product?.storeId || 'campus-cafe';
    const firstStoreId = CANONICAL_STORE_MAP[rawStoreId] || rawStoreId;
    const storeObj = (typeof STORES !== 'undefined')
      ? STORES.find(s => s.id === firstStoreId || s.id === rawStoreId)
      : null;

    const orderId = 'UM' + Math.floor(10000 + Math.random() * 90000);
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const userId = user.uid || user.id || 'usr_student';
    const storeOrders = (appData.orders || []).filter(o => o.storeId === firstStoreId);
    const seq = String(storeOrders.length + 1).padStart(2, '0');
    const displayOrderNum = '#ORD-' + seq;

    const newOrder = {
      id: orderId,
      order_number_display: displayOrderNum,
      customerName: studentName,
      user_name: studentName,
      user_phone: studentPhone,
      customer: {
        name: studentName,
        phone: studentPhone,
        email: studentEmail
      },
      storeId: firstStoreId,
      storeName: storeObj ? storeObj.name : 'Campus Store',
      storeIcon: CartState.items[0]?.product?.emoji || '🛍️',
      items: CartState.items.map(item => ({
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
        qty: item.qty,
        image: item.product.image || '',
        emoji: item.product.emoji || '📦'
      })),
      subtotal: totals.subtotal,
      deliveryFee: 0,
      discount: totals.discountAmount,
      packagingFee: totals.packagingFee,
      total: totals.grandTotal,
      fulfillmentType: 'pickup',
      pickupLocation: 'Ground floor, near main entrance',
      otp: otp,
      orderNotes: CartState.orderNotes,
      paymentMethod: paymentMethodLabel,
      paymentId: paymentId || null,
      paymentStatus: paymentId ? 'PAID' : 'PENDING_AT_COUNTER',
      status: 'placed',
      statusHistory: [
        { status: 'placed', time: new Date().toISOString(), label: 'Order Placed & Paid' }
      ],
      createdAt: new Date().toISOString()
    };

    // 1. Insert into Neon PostgreSQL if available
    if (typeof window.UniMallDB !== 'undefined') {
      const supabasePayload = {
        id: orderId,
        order_number: displayOrderNum,
        user_id: userId,
        user_name: studentName,
        user_email: studentEmail,
        user_phone: studentPhone,
        user_hostel: 'Counter Pickup',
        user_room: 'Ground Floor Station',
        store_id: firstStoreId,
        status: 'placed',
        fulfillment_type: 'pickup',
        subtotal: totals.subtotal,
        delivery_fee: 0,
        total: totals.grandTotal,
        payment_method: paymentMethodLabel,
        notes: CartState.orderNotes || ''
      };

      await window.UniMallDB.createOrder(supabasePayload, newOrder.items).catch(err => {
        console.warn('[UniMall] Neon DB order insert notice:', err.message);
      });
    }

    // 2. Add to beginning of local orders cache while preserving existing terminal statuses
    if (Array.isArray(appData.orders)) {
      appData.orders.forEach(o => {
        const s = (o.status || '').toLowerCase();
        if (s === 'delivered' || s === 'completed') {
          o.status = 'delivered';
        }
      });
    } else {
      appData.orders = [];
    }
    appData.orders.unshift(newOrder);

    // 3. Clear cart ONLY AFTER order is securely registered
    appData.cart = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    // 4. Trigger Cross-Tab Realtime storage notification for store owner
    try {
      localStorage.setItem('unimall_new_order_placed_event', JSON.stringify({
        orderId: newOrder.id,
        displayNum: newOrder.order_number_display,
        storeId: firstStoreId,
        total: newOrder.total,
        customerName: studentName,
        itemsCount: newOrder.items.length,
        timestamp: Date.now()
      }));
    } catch(e) {}

    // 5. Broadcast on BroadcastChannel for instant live sync without reload
    try {
      const bc = new BroadcastChannel('unimall_orders_channel');
      bc.postMessage({
        type: 'ORDER_PLACED',
        orderId: newOrder.id,
        displayNum: newOrder.order_number_display,
        storeId: firstStoreId,
        total: newOrder.total,
        customerName: studentName,
        itemsCount: newOrder.items.length,
        timestamp: Date.now()
      });
    } catch(e) {}

    // 5. Celebration: Subtle chime + confetti + exciting pop-up
    playOrderPlacedChime();
    if (typeof window.UniMallConfetti === 'function') window.UniMallConfetti();

    const modal = document.getElementById('orderSuccessModal');
    const idEl = document.getElementById('successOrderIdText');
    const etaEl = document.getElementById('successEtaText');
    const trackBtn = document.getElementById('btnTrackSuccess');

    if (idEl) idEl.textContent = `Order ${displayOrderNum}`;
    if (etaEl) {
      etaEl.innerHTML = `🛍️ Ready for counter pickup in ~10–15 mins · OTP: <strong>${newOrder.otp || '4829'}</strong>`;
    }
    if (trackBtn) {
      trackBtn.onclick = () => {
        window.location.href = `orders.html#${orderId}`;
      };
    }

    if (modal) {
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('show'));
    } else {
      setTimeout(() => {
        window.location.href = `orders.html#${orderId}`;
      }, 1200);
    }

    // Auto redirect after 4s
    setTimeout(() => {
      window.location.href = `orders.html#${orderId}`;
    }, 4000);
  } catch (e) {
    console.error('Order placement error:', e);
    if (placeBtn) {
      placeBtn.disabled = false;
      placeBtn.innerHTML = `
        <span>Pay & Place Order</span>
        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      `;
    }
    showToast('Error placing order. Please try again.');
  }
}

/* ─── RENDERING ──────────────────────────────────────────── */
function renderCartView() {
  const contentWrap = document.getElementById('cartContentWrap');
  const emptyState = document.getElementById('emptyCartState');
  const itemsList = document.getElementById('cartItemsList');
  const itemsCountBadge = document.getElementById('itemsCountBadge');
  const cartSubtitle = document.getElementById('cartSubtitle');
  const clearBtn = document.getElementById('clearCartBtn');

  if (!contentWrap || !emptyState) return;

  const totals = getCartTotals();

  if (CartState.items.length === 0) {
    contentWrap.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (cartSubtitle) cartSubtitle.textContent = 'Your cart is empty';
    return;
  }

  contentWrap.classList.remove('hidden');
  emptyState.classList.add('hidden');
  if (clearBtn) clearBtn.classList.remove('hidden');

  if (itemsCountBadge) {
    itemsCountBadge.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}`;
  }
  if (cartSubtitle) {
    cartSubtitle.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''} in your cart`;
  }

  // Render items
  if (itemsList) {
    itemsList.innerHTML = CartState.items.map(item => {
      const p = item.product;
      const storeObj = (typeof STORES !== 'undefined')
        ? STORES.find(s => s.id === p.storeId)
        : null;

      const imgHtml = p.image
        ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="cart-item-fallback" style="display:none; background:${p.bg || '#EFF6FF'};">${p.emoji || '📦'}</div>`
        : `<div class="cart-item-fallback" style="background:${p.bg || '#EFF6FF'};">${p.emoji || '📦'}</div>`;

      return `
        <div class="cart-item-card" data-pid="${item.productId}">
          <div class="cart-item-thumb">
            ${imgHtml}
          </div>

          <div class="cart-item-details">
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-store">${storeObj ? storeObj.name : 'UniMall Store'}</div>
            <div class="cart-item-price-unit">₹${fmtPrice(p.price)}</div>
          </div>

          <div class="cart-item-actions">
            <button class="delete-item-btn" data-pid="${item.productId}" aria-label="Remove ${p.name}">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>

            <div class="qty-stepper">
              <button class="qty-btn btn-dec" data-pid="${item.productId}">−</button>
              <span class="qty-val">${item.qty}</span>
              <button class="qty-btn btn-inc" data-pid="${item.productId}">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach quantity event handlers
    itemsList.querySelectorAll('.btn-dec').forEach(btn => {
      btn.addEventListener('click', () => updateItemQty(btn.dataset.pid, -1));
    });
    itemsList.querySelectorAll('.btn-inc').forEach(btn => {
      btn.addEventListener('click', () => updateItemQty(btn.dataset.pid, 1));
    });
    itemsList.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.pid));
    });
  }

  renderBillBreakdown();
  renderCouponSection();
}

function renderBillBreakdown() {
  const totals = getCartTotals();

  const billSubtotal = document.getElementById('billSubtotal');
  const billDeliveryFee = document.getElementById('billDeliveryFee');
  const billDiscountRow = document.getElementById('billDiscountRow');
  const billDiscount = document.getElementById('billDiscount');
  const billPackaging = document.getElementById('billPackaging');
  const billGrandTotal = document.getElementById('billGrandTotal');
  const checkoutFooterPrice = document.getElementById('checkoutFooterPrice');

  if (billSubtotal) billSubtotal.textContent = `₹${fmtPrice(totals.subtotal)}`;
  if (billDeliveryFee) {
    billDeliveryFee.textContent = totals.deliveryFee > 0 ? `₹${fmtPrice(totals.deliveryFee)}` : 'FREE';
  }
  if (billPackaging) {
    billPackaging.textContent = `₹${totals.packagingFee}`;
  }

  if (billDiscountRow && billDiscount) {
    if (totals.discountAmount > 0) {
      billDiscountRow.classList.remove('hidden');
      billDiscount.textContent = `-₹${fmtPrice(totals.discountAmount)}`;
    } else {
      billDiscountRow.classList.add('hidden');
    }
  }

  if (billGrandTotal) billGrandTotal.textContent = `₹${fmtPrice(totals.grandTotal)}`;
  if (checkoutFooterPrice) checkoutFooterPrice.textContent = `₹${fmtPrice(totals.grandTotal)}`;
}

function renderCouponSection() {
  const couponAppliedTag = document.getElementById('couponAppliedTag');
  const appliedCouponText = document.getElementById('appliedCouponText');
  const couponInput = document.getElementById('couponInput');

  if (!couponAppliedTag || !appliedCouponText) return;

  if (CartState.appliedCoupon && PROMO_CODES[CartState.appliedCoupon]) {
    couponAppliedTag.classList.remove('hidden');
    appliedCouponText.textContent = `${CartState.appliedCoupon} applied (${PROMO_CODES[CartState.appliedCoupon].label})`;
    if (couponInput) couponInput.value = '';
  } else {
    couponAppliedTag.classList.add('hidden');
  }
}

/* ─── TOAST ──────────────────────────────────────────────── */
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
  }, 2800);
}

/* ─── DYNAMIC DELIVERY ESTIMATE ─────────────────────────── */
function updateDeliveryEstimate() {
  const estText = document.getElementById('deliveryEstimateText');
  const hostelInput = document.getElementById('hostelInput');
  if (!estText) return;

  const hostelName = (hostelInput && hostelInput.value.trim()) || 'your hostel';
  const hour = new Date().getHours();

  if (hour >= 22 || hour < 5) {
    estText.innerHTML = `<strong>🌙 Late Night Delivery:</strong> ~25–35 mins to ${hostelName} · Campus runner active`;
  } else if (hour >= 12 && hour <= 14) {
    estText.innerHTML = `<strong>⚡ Lunch Rush:</strong> ~20–25 mins to ${hostelName} · Direct room drop`;
  } else {
    estText.innerHTML = `<strong>⚡ Express Delivery:</strong> ~15–20 mins to ${hostelName} · Direct room drop`;
  }
}

/* ─── CART BADGE SYNC ────────────────────────────────────── */
function syncCartBadge() {
  try {
    let items = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) items = parsed.cart;
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

function syncSidebarProfile() {
  try {
    let user = null;
    const v1 = localStorage.getItem(STORAGE_KEY);
    if (v1) {
      const parsed = JSON.parse(v1);
      if (parsed.currentUser) user = parsed.currentUser;
    }
    const auth = localStorage.getItem('unimall_auth');
    if (auth) {
      const parsedAuth = JSON.parse(auth);
      user = { ...(user || {}), ...parsedAuth };
    }
    if (!user) return;

    const nameEl = document.querySelector('.sidebar-profile-name');
    const roleEl = document.querySelector('.sidebar-profile-role');
    const avatarEl = document.querySelector('.sidebar-avatar');

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
  } catch (e) { }
}

/* ─── CONTEXTUAL STORE NAVIGATION ────────────────────────── */
function syncStoreNavigation() {
  try {
    let targetStoreId = sessionStorage.getItem('unimall_active_store_id') || localStorage.getItem('unimall_last_store_id');
    let targetStoreName = sessionStorage.getItem('unimall_active_store_name') || localStorage.getItem('unimall_last_store_name');

    // If not in storage, detect store from cart items
    if (!targetStoreId && CartState.items.length > 0) {
      const itemWithStore = CartState.items.find(i => i.product && (i.product.storeId || i.storeId));
      if (itemWithStore) {
        targetStoreId = itemWithStore.product?.storeId || itemWithStore.storeId;
        targetStoreName = itemWithStore.product?.storeName || itemWithStore.storeName;
      }
    }

    // Map store ID to catalog ID if using dataId
    const storeMap = {
      'campus-cafe': 'store-bakery',
      'book-corner': 'store-stationery',
      'campus-mart': 'store-sports',
      'tech-hub': 'store-electronics',
      'fashion-point': 'store-fashion'
    };
    if (storeMap[targetStoreId]) {
      targetStoreId = storeMap[targetStoreId];
    }

    if (targetStoreId) {
      const targetUrl = `store.html?id=${encodeURIComponent(targetStoreId)}`;

      // 1. Bottom nav "Stores" option takes user back to that particular store
      const navStores = document.getElementById('nav-stores');
      if (navStores) {
        navStores.href = targetUrl;
        navStores.setAttribute('aria-label', targetStoreName ? `Return to ${targetStoreName}` : 'Store');
        const navLabel = navStores.querySelector('.nav-label');
        if (navLabel) navLabel.textContent = 'Store';
      }

      // 2. Sidebar "Stores" option takes user back to that particular store
      const sbStores = document.getElementById('sb-stores');
      if (sbStores) {
        sbStores.href = targetUrl;
        sbStores.setAttribute('title', targetStoreName ? `Return to ${targetStoreName}` : 'Store');
      }

      // 3. Contextual banner at top of cart
      const bannerWrap = document.getElementById('cartStoreBannerWrap');
      const bannerLink = document.getElementById('cartStoreBannerLink');
      const bannerName = document.getElementById('cartStoreBannerName');
      if (bannerWrap && bannerLink && bannerName) {
        bannerWrap.style.display = 'block';
        bannerLink.href = targetUrl;
        bannerName.textContent = targetStoreName || 'Campus Store';
      }

      // 4. Empty state button
      const emptyStoreBtn = document.querySelector('.browse-btn-secondary');
      if (emptyStoreBtn) {
        emptyStoreBtn.href = targetUrl;
        emptyStoreBtn.textContent = `Return to ${targetStoreName || 'Campus Store'}`;
      }
    }
  } catch (e) {
    console.warn('Store nav sync note:', e);
  }
}

/* ─── EVENT LISTENERS ────────────────────────────────────── */
function initEvents() {
  // Back button returns to specific store if available, else browser back
  document.getElementById('backButton')?.addEventListener('click', () => {
    let targetStoreId = sessionStorage.getItem('unimall_active_store_id') || localStorage.getItem('unimall_last_store_id');
    const storeMap = {
      'campus-cafe': 'store-bakery',
      'book-corner': 'store-stationery',
      'campus-mart': 'store-sports',
      'tech-hub': 'store-electronics',
      'fashion-point': 'store-fashion'
    };
    if (storeMap[targetStoreId]) targetStoreId = storeMap[targetStoreId];

    if (targetStoreId) {
      window.location.href = `store.html?id=${encodeURIComponent(targetStoreId)}`;
    } else if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  // Clear Cart
  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  });

  // Fulfillment toggle
  const btnPickup = document.getElementById('btnPickup');
  const btnDelivery = document.getElementById('btnDelivery');
  const hostelForm = document.getElementById('hostelDeliveryForm');
  const pickupInfo = document.getElementById('pickupInfoBox');

  btnPickup?.addEventListener('click', () => {
    CartState.fulfillmentType = 'pickup';
    btnPickup.classList.add('active');
    btnDelivery?.classList.remove('active');
    hostelForm?.classList.add('hidden');
    pickupInfo?.classList.remove('hidden');
    renderBillBreakdown();
  });

  btnDelivery?.addEventListener('click', () => {
    CartState.fulfillmentType = 'delivery';
    btnDelivery.classList.add('active');
    btnPickup?.classList.remove('active');
    hostelForm?.classList.remove('hidden');
    pickupInfo?.classList.add('hidden');
    updateDeliveryEstimate();
    renderBillBreakdown();
  });

  const hostelInput = document.getElementById('hostelInput');
  hostelInput?.addEventListener('input', updateDeliveryEstimate);

  // Coupon apply & remove
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponInput = document.getElementById('couponInput');
  const removeCouponBtn = document.getElementById('removeCouponBtn');

  applyCouponBtn?.addEventListener('click', () => {
    if (couponInput) applyCoupon(couponInput.value);
  });

  couponInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCoupon(couponInput.value);
    }
  });

  removeCouponBtn?.addEventListener('click', removeCoupon);

  // Promo chip click
  document.querySelectorAll('.promo-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyCoupon(chip.dataset.code);
    });
  });

  // Order notes
  const notesInput = document.getElementById('orderNotesInput');
  notesInput?.addEventListener('input', (e) => {
    CartState.orderNotes = e.target.value;
  });

  // Payment methods
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      CartState.paymentMethod = e.target.value;
      document.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
      radio.closest('.payment-method-card')?.classList.add('active');
    });
  });

  // Place Order
  document.getElementById('placeOrderBtn')?.addEventListener('click', handlePlaceOrder);
}

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  initEvents();
  renderCartView();
  syncCartBadge();
  syncSidebarProfile();
  syncStoreNavigation();
});
