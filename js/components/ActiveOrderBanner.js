/**
 * UniMall — Reactive Active Order Banner (js/components/ActiveOrderBanner.js)
 * Powered by React 18 for zero-interruption, flicker-free live order tracking.
 * Supports multiple active orders in a swipeable carousel with dynamic pagination dots.
 */

(function () {
  'use strict';

  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.warn('[React ActiveOrderBanner] React or ReactDOM not loaded yet.');
    return;
  }

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  /**
   * Helper: Get ALL active or recent (<24h) orders from localStorage
   */
  function fetchAllActiveOrders() {
    try {
      const raw = localStorage.getItem('unimall_v1');
      if (!raw) return [];
      const appData = JSON.parse(raw);
      if (!appData.orders || !Array.isArray(appData.orders) || appData.orders.length === 0) {
        return [];
      }

      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      // 1. Active orders (placed, accepted, preparing, ready)
      const active = appData.orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        return ['placed', 'accepted', 'preparing', 'ready'].includes(s);
      }).map(o => ({ order: o, isDelivered: false }));

      // 2. Recent delivered orders (< 24h) — show at most the latest 1 delivered order in carousel
      const recentDelivered = appData.orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        if (s !== 'delivered' && s !== 'completed') return false;
        const timeVal = o.deliveredAt || o.updatedAt || o.createdAt;
        const deliveredTime = timeVal ? new Date(timeVal).getTime() : NaN;
        if (!isNaN(deliveredTime)) {
          const diffMs = now - deliveredTime;
          return diffMs >= -60000 && diffMs < TWENTY_FOUR_HOURS_MS;
        }
        return false;
      }).sort((a, b) => new Date(b.deliveredAt || b.createdAt || 0) - new Date(a.deliveredAt || a.createdAt || 0))
        .slice(0, 1)
        .map(o => ({ order: o, isDelivered: true }));

      // Combine: active orders first, then recent delivered order
      return [...active, ...recentDelivered];
    } catch (e) {
      console.warn('[ActiveOrderBanner] Failed to read active orders:', e);
      return [];
    }
  }

  function getProductThumb(it) {
    if (it.image && typeof it.image === 'string' && it.image.startsWith('http')) {
      return it.image;
    }
    const name = (it.name || it.product_name || '').toLowerCase();
    if (name.includes('cold brew') || name.includes('iced coffee')) {
      return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('sandwich')) {
      return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('coffee') || name.includes('cappuccino') || name.includes('latte')) {
      return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('chai') || name.includes('tea')) {
      return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('croissant') || name.includes('muffin') || name.includes('cookie')) {
      return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('hoodie') || name.includes('tee')) {
      return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=120&auto=format&fit=crop&q=80';
    }
    if (name.includes('notebook') || name.includes('pen')) {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=120&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80';
  }

  /**
   * Helper: Synchronize dots pagination in the hero slider
   */
  function syncSliderDots(totalSlides) {
    const dotsWrap = document.getElementById('hero-slider-dots');
    if (!dotsWrap) return;

    const count = Math.max(2, totalSlides);
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<span class="hero-dot${i === 0 ? ' active' : ''}" data-slide="${i}"></span>`;
    }
    dotsWrap.innerHTML = html;
    dotsWrap.style.display = 'flex';
  }

  /**
   * Sub-Component: Single Active Order Banner Card
   */
  function OrderBannerCard({ item, isUpdating, rippleActive, index }) {
    const { order, isDelivered } = item;
    const s = (order.status || 'placed').toLowerCase();
    const isCompleted = isDelivered || s === 'delivered' || s === 'completed';

    // Status label and ETA text
    let badgeText = '● Order Confirmed';
    let etaText = 'Estimated pickup: 5–10 min';
    let statusClass = 'placed';

    if (isCompleted) {
      badgeText = '✓ Order Collected';
      etaText = 'Picked up successfully';
      statusClass = 'completed';
    } else if (s === 'ready') {
      badgeText = '● Ready for Pickup';
      etaText = 'Ready at counter now!';
      statusClass = 'ready';
    } else if (s === 'preparing') {
      badgeText = '● Preparing Order';
      etaText = 'Estimated pickup: 3–7 min';
      statusClass = 'preparing';
    } else if (s === 'accepted') {
      badgeText = '● Order Accepted';
      etaText = 'Estimated pickup: 5–10 min';
      statusClass = 'accepted';
    }

    const custName = (order.customerName || order.user_name || order.userName || 'Student').trim();
    const custInitial = (custName[0] || 'S').toUpperCase();
    const storeName = order.storeName || order.store_name || 'Campus Café';
    const storeIcon = order.storeIcon || ((storeName.includes('Café') || storeName.includes('Cafe')) ? '☕' : '🏬');
    const storeLoc = order.pickupLocation || (order.fulfillmentType === 'delivery' ? 'Campus Delivery' : 'Ground floor, near main entrance');
    const totalAmount = Number(order.total || order.subtotal || 0);

    const items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : [];
    const displayItems = items.slice(0, 2);
    const extraCount = items.length - 2;

    const bannerClasses = [
      'active-order-banner',
      isCompleted ? 'is-delivered' : '',
      isUpdating ? 'state-updating' : '',
      rippleActive ? 'has-ripple' : ''
    ].filter(Boolean).join(' ');

    const handleBannerClick = () => {
      if (typeof window.openOrderPassModal === 'function') {
        window.openOrderPassModal(order);
      }
    };

    return h('div', {
      key: order.id || index,
      className: bannerClasses,
      id: `active-order-banner-${order.id || index}`,
      role: 'button',
      tabIndex: 0,
      onClick: handleBannerClick,
      'aria-label': `Active order pickup pass #${order.id} — tap to view details`,
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: '100%',
        maxWidth: '100%',
        flex: '0 0 100%',
        boxSizing: 'border-box',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isUpdating ? 0.85 : 1
      }
    }, [
      // 1. Center Ripple Expanding Wave
      h('div', {
        key: 'ripple',
        className: 'card-ripple-wave',
        style: rippleActive ? { animation: 'cardRippleExpand 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' } : {}
      }),

      // 2. Header Row: Customer & Store (Left), Status & ETA (Right)
      h('div', { key: 'header', className: 'active-order-header-row' }, [
        h('div', { key: 'profile-left', className: 'active-order-profile-left' }, [
          h('div', { key: 'avatar', className: 'active-order-avatar-circle' }, custInitial),
          h('div', { key: 'meta', className: 'active-order-user-meta' }, [
            h('span', { key: 'eyebrow', className: 'active-order-eyebrow' }, 'YOUR ORDER'),
            h('h3', { key: 'name', className: 'active-order-name-priority' }, custName),
            h('div', { key: 'store-inline', className: 'active-order-store-inline' }, [
              h('span', { key: 'ico', className: 'active-order-store-ico' }, storeIcon),
              h('span', { key: 'store', className: 'active-order-store-name' }, storeName),
              h('span', { key: 'chev', className: 'store-inline-chevron' }, '›')
            ]),
            h('div', { key: 'loc', className: 'active-order-store-loc' }, storeLoc)
          ])
        ]),

        h('div', { key: 'status-right', className: 'active-order-status-right' }, [
          h('div', {
            key: 'badge',
            className: `active-order-status-pill status-${statusClass}`,
            style: { transition: 'background 0.3s ease, color 0.3s ease' }
          }, [
            !isCompleted && h('span', { key: 'pulse', className: 'status-pulse-dots' }, [
              h('span', { key: 'p1', className: 'pulse-dot' }),
              h('span', { key: 'p2', className: 'pulse-dot' })
            ]),
            h('span', { key: 'text', className: 'status-pill-text' }, badgeText)
          ]),
          h('div', { key: 'eta', className: 'active-order-eta-text' }, etaText)
        ])
      ]),

      // 3. Middle Row: Items Tray
      displayItems.length > 0 && h('div', { key: 'tray', className: 'active-order-items-tray' }, [
        ...displayItems.map((it, idx) => {
          const qty = it.qty || it.quantity || 1;
          const name = it.name || it.product_name || 'Item';
          const price = Number(it.price || 0);
          const thumb = getProductThumb(it);

          return h('div', { key: `item-${idx}`, style: { display: 'flex', alignItems: 'center' } }, [
            idx > 0 && h('div', { key: `div-${idx}`, className: 'tray-item-divider' }),
            h('div', { key: `content-${idx}`, className: 'tray-item' }, [
              h('span', { key: 'qty', className: 'tray-qty-pill' }, `${qty}x`),
              h('img', {
                key: 'img',
                className: 'tray-item-thumb',
                src: thumb,
                alt: name,
                loading: 'lazy'
              }),
              h('div', { key: 'details', className: 'tray-item-meta' }, [
                h('div', { key: 'title', className: 'tray-item-name' }, name),
                h('div', { key: 'pr', className: 'tray-item-price' }, `₹${price * qty}`)
              ])
            ])
          ]);
        }),
        extraCount > 0 && h('div', { key: 'extra', className: 'tray-extra-pill' }, `+${extraCount} more`)
      ]),

      // 4. Bottom Footer Row: Total, Divider, and Show at Counter Button
      h('div', { key: 'footer', className: 'active-order-footer-row' }, [
        h('div', { key: 'total-block', className: 'active-order-total-block' }, [
          h('span', { key: 'lbl', className: 'active-order-total-label' }, 'Total'),
          h('span', { key: 'val', className: 'active-order-total-val' }, `₹${totalAmount}`)
        ]),

        h('div', { key: 'divider', className: 'active-order-footer-divider' }),

        h('button', {
          key: 'action-btn',
          type: 'button',
          className: 'active-order-action-btn'
        }, [
          h('svg', {
            key: 'svg',
            viewBox: '0 0 24 24',
            width: 16,
            height: 16,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2.2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }, [
            h('path', { key: 'p1', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' }),
            h('line', { key: 'l1', x1: 3, y1: 6, x2: 21, y2: 6 }),
            h('path', { key: 'p2', d: 'M16 10a4 4 0 0 1-8 0' })
          ]),
          h('span', { key: 'btn-txt' }, isCompleted ? 'Receipt / Reorder' : 'Show at Counter'),
          h('span', { key: 'chevron', className: 'cta-chevron' }, '›')
        ])
      ]),

      // 5. Delivered celebration stamp
      isCompleted && h('div', {
        key: 'stamp',
        className: 'active-order-delivered-stamp',
        style: { display: 'flex' }
      }, [
        h('span', { key: 'chk', className: 'stamp-check' }, '✓'),
        h('span', { key: 'msg', className: 'stamp-msg' }, 'Order Picked Up & Delivered · Active on home for 24h')
      ])
    ]);
  }

  /**
   * Main Active Order Banner Component
   * Renders a dynamic slide for EACH active order
   */
  function ActiveOrderBanner() {
    const [ordersList, setOrdersList] = useState(() => fetchAllActiveOrders());
    const [isUpdating, setIsUpdating] = useState(false);
    const [rippleActive, setRippleActive] = useState(false);

    // Refresh state from authoritative sources
    const refreshOrders = useCallback((hintStatus = null, hintOrderId = null) => {
      let list = fetchAllActiveOrders();
      if (hintStatus && hintOrderId && list.length > 0) {
        list = list.map(item => {
          if (item.order.id === hintOrderId) {
            item.order.status = hintStatus;
            if (hintStatus === 'delivered' || hintStatus === 'completed') {
              item.isDelivered = true;
            }
          }
          return item;
        });
      }
      setOrdersList(list);

      // Manage visibility of the empty promo fallback banner & sync dots
      const emptyPromo = document.getElementById('empty-order-promo-banner');
      if (list.length === 0) {
        if (emptyPromo) emptyPromo.style.display = 'flex';
        syncSliderDots(2); // Class to Cart + Empty Promo
      } else {
        if (emptyPromo) emptyPromo.style.display = 'none';
        syncSliderDots(1 + list.length); // Class to Cart + Each Active Order Banner
      }
    }, []);

    // Initial mount & sync with Neon DB if available
    useEffect(() => {
      refreshOrders();

      // Async sync from Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getUserOrders === 'function') {
        window.UniMallDB.getUserOrders().then(dbOrders => {
          if (Array.isArray(dbOrders) && dbOrders.length > 0) {
            try {
              const raw = localStorage.getItem('unimall_v1');
              if (raw) {
                const appData = JSON.parse(raw);
                if (Array.isArray(appData.orders)) {
                  let changed = false;
                  dbOrders.forEach(rem => {
                    const loc = appData.orders.find(o => o.id === rem.id);
                    if (loc && loc.status !== (rem.status || '').toLowerCase()) {
                      loc.status = (rem.status || '').toLowerCase();
                      if (loc.status === 'delivered' || loc.status === 'completed') {
                        loc.deliveredAt = loc.deliveredAt || new Date().toISOString();
                      }
                      changed = true;
                    }
                  });
                  if (changed) {
                    localStorage.setItem('unimall_v1', JSON.stringify(appData));
                    refreshOrders();
                  }
                }
              }
            } catch (e) {}
          }
        }).catch(() => {});
      }

      let bc = null;
      try {
        bc = new BroadcastChannel('unimall_orders_channel');
        bc.onmessage = (event) => {
          const { type, orderId, status } = event.data || {};
          if (type === 'ORDER_STATUS_CHANGED' || type === 'ORDER_PLACED') {
            setIsUpdating(true);
            setTimeout(() => {
              refreshOrders(status, orderId);
              setIsUpdating(false);

              if (status === 'delivered' || status === 'completed') {
                setRippleActive(true);
                setTimeout(() => setRippleActive(false), 2400);
              }
            }, 80);
          }
        };
      } catch (e) {}

      const handleStorage = (e) => {
        if (e.key === 'unimall_v1' || e.key === 'unimall_new_order_placed_event' || e.key === 'unimall_order_delivered_event') {
          refreshOrders();
        }
      };

      const handleCustom = (e) => {
        const { status, orderId } = e.detail || {};
        refreshOrders(status, orderId);
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener('unimall:orderStatusUpdated', handleCustom);
      window.addEventListener('unimall:orderPlaced', handleCustom);

      return () => {
        if (bc) bc.close();
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('unimall:orderStatusUpdated', handleCustom);
        window.removeEventListener('unimall:orderPlaced', handleCustom);
      };
    }, [refreshOrders]);

    if (!ordersList || ordersList.length === 0) {
      return null;
    }

    return h(React.Fragment, null, [
      ordersList.map((item, idx) => h(OrderBannerCard, {
        key: item.order.id || idx,
        item,
        isUpdating,
        rippleActive,
        index: idx
      }))
    ]);
  }

  // Mount React Component to DOM Root
  function mountActiveOrderBanner() {
    const rootEl = document.getElementById('active-order-banner-root');
    if (!rootEl) return;

    if (ReactDOM.createRoot) {
      if (!window.__activeOrderBannerRoot) {
        window.__activeOrderBannerRoot = ReactDOM.createRoot(rootEl);
      }
      window.__activeOrderBannerRoot.render(h(ActiveOrderBanner));
    } else if (ReactDOM.render) {
      ReactDOM.render(h(ActiveOrderBanner), rootEl);
    }
  }

  window.mountActiveOrderBanner = mountActiveOrderBanner;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountActiveOrderBanner);
  } else {
    mountActiveOrderBanner();
  }
})();
