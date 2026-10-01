/**
 * UniMall Store Admin — Reactive Orders Components (admin/js/components/AdminOrdersReact.js)
 * Powered by React 18 for flicker-free, zero-reload order processing.
 */

(function () {
  'use strict';

  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.warn('[React AdminOrders] React or ReactDOM not loaded yet.');
    return;
  }

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  const STORE_COLOR_MAP = {
    'campus-cafe': { bg: '#FEF3C7', color: '#92400E', label: 'Campus Café' },
    'book-corner': { bg: '#DBEAFE', color: '#1E40AF', label: 'Book Corner' },
    'techstop':    { bg: '#E0E7FF', color: '#3730A3', label: 'TechStop' },
    'campus-mart': { bg: '#DCFCE7', color: '#166534', label: 'Campus Mart' },
    'campus-wear': { bg: '#F3E8FF', color: '#6B21A8', label: 'Campus Wear' },
    'health-hub':  { bg: '#FEE2E2', color: '#991B1B', label: 'Health Hub' },
  };

  function getStoreTag(storeId) {
    return STORE_COLOR_MAP[storeId] || { bg: '#F1F5F9', color: '#334155', label: storeId || 'Campus Store' };
  }

  function formatTimeAgo(isoDate) {
    if (!isoDate) return 'Just now';
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return '1h ago';
    return `${diffHr}h ago`;
  }

  function getThumb(it) {
    if (it.image && typeof it.image === 'string' && it.image.startsWith('http')) return it.image;
    const name = (it.product_name_snapshot || it.product_name || it.name || '').toLowerCase();
    if (name.includes('cold brew') || name.includes('iced coffee')) {
      return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('sandwich')) {
      return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('coffee') || name.includes('cappuccino') || name.includes('latte')) {
      return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('chai') || name.includes('tea')) {
      return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('croissant') || name.includes('muffin') || name.includes('cookie')) {
      return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('notebook') || name.includes('pen')) {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&auto=format&fit=crop&q=80';
    }
    if (name.includes('hoodie') || name.includes('tee')) {
      return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=160&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80';
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 1. REACT COMPONENT: Single Order Card (Isolated React State)
   * ─────────────────────────────────────────────────────────────
   */
  function OrderCard({ order, onStatusProgress }) {
    const [updating, setUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(order.status || 'PLACED');

    // Keep in sync if prop changes
    useEffect(() => {
      setCurrentStatus(order.status || 'PLACED');
    }, [order.status]);

    const s = (currentStatus || 'PLACED').toUpperCase();
    const custName = (order.user_name || order.customer_name || order.customerName || 'Campus Student').trim();
    const custInitial = (custName[0] || 'S').toUpperCase();
    const displayNum = order.order_number_display || order.order_number || `#ORD-${String(order.id).slice(-2)}`;
    const storeTag = getStoreTag(order.store_id);
    const timeAgo = formatTimeAgo(order.created_at);
    const totalAmount = Number(order.store_subtotal || order.total || order.subtotal || 0).toLocaleString('en-IN');

    const isFading = !!order.isFadingOut;
    const isHoldDelivered = !!order.isCompletedHold || s === 'DELIVERED';

    // Status Classes & Tag labels
    let statusClass = 'placed';
    let bannerTag = 'NEXT ORDER';
    let bannerIcon = '⚡';

    if (isHoldDelivered || s === 'DELIVERED' || s === 'COMPLETED') {
      statusClass = 'completed';
      bannerTag = 'DELIVERED & COMPLETED';
      bannerIcon = '✅';
    } else if (s === 'ACCEPTED' || s === 'PREPARING') {
      statusClass = 'preparing';
      bannerTag = 'PACKING ORDER';
      bannerIcon = '🛍️';
    } else if (s === 'READY') {
      statusClass = 'ready';
      bannerTag = 'READY FOR PICKUP';
      bannerIcon = '✓';
    }

    const items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : [];

    const handleProgressClick = async (e) => {
      e.stopPropagation();
      if (updating || isHoldDelivered) return;

      let next = 'PREPARING';
      if (s === 'PLACED') next = 'PREPARING';
      else if (s === 'ACCEPTED' || s === 'PREPARING') next = 'READY';
      else if (s === 'READY') next = 'DELIVERED';
      else return;

      setUpdating(true);
      setCurrentStatus(next);

      try {
        await onStatusProgress(order.id, next);
      } catch (err) {
        console.error('Failed to progress order:', err);
        setCurrentStatus(s); // Revert on failure
      } finally {
        setUpdating(false);
      }
    };

    // Progression Button Rendering
    let buttonElement = null;
    if (isHoldDelivered || s === 'DELIVERED' || s === 'COMPLETED') {
      buttonElement = h('div', {
        key: 'done',
        className: 'order-step-completed',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#DCFCE7',
          color: '#15803D',
          border: '1.5px solid #86EFAC',
          borderRadius: '10px',
          padding: '10px 16px',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: '0 2px 8px rgba(22, 101, 52, 0.12)'
        }
      }, [
        h('span', { key: 'ico', className: 'step-icon' }, '✅'),
        h('span', { key: 'txt', className: 'step-text' }, 'Order Delivered & Completed ✓')
      ]);
    } else if (s === 'PLACED') {
      buttonElement = h('button', {
        key: 'btn',
        type: 'button',
        className: 'btn-order-step step-accept',
        onClick: handleProgressClick,
        disabled: updating,
        title: 'Click to accept order and start preparation'
      }, [
        h('span', { key: 'ico', className: 'step-icon' }, updating ? '⏳' : '⚡'),
        h('span', { key: 'txt', className: 'step-text' }, updating ? 'Updating...' : 'Accept & Process'),
        h('span', { key: 'arr', className: 'step-arrow' }, '→')
      ]);
    } else if (s === 'ACCEPTED' || s === 'PREPARING') {
      buttonElement = h('button', {
        key: 'btn',
        type: 'button',
        className: 'btn-order-step step-packing',
        onClick: handleProgressClick,
        disabled: updating,
        title: 'Click when items are packed to notify student'
      }, [
        h('span', { key: 'ico', className: 'step-icon' }, updating ? '⏳' : '🛍️'),
        h('span', { key: 'txt', className: 'step-text' }, updating ? 'Updating...' : 'Done Packing'),
        h('span', { key: 'arr', className: 'step-arrow' }, '→')
      ]);
    } else if (s === 'READY') {
      buttonElement = h('button', {
        key: 'btn',
        type: 'button',
        className: 'btn-order-step step-deliver',
        onClick: handleProgressClick,
        disabled: updating,
        title: 'Click when student receives their order'
      }, [
        h('span', { key: 'ico', className: 'step-icon' }, updating ? '⏳' : '📦'),
        h('span', { key: 'txt', className: 'step-text' }, updating ? 'Updating...' : 'Mark Delivered'),
        h('span', { key: 'arr', className: 'step-arrow' }, '✓')
      ]);
    } else {
      buttonElement = h('div', { key: 'canc', className: 'order-step-cancelled' }, [
        h('span', { key: 'txt' }, '✕ Order Cancelled')
      ]);
    }

    const cardStyle = {
      transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: isFading ? 0 : (updating ? 0.8 : 1),
      transform: isFading ? 'translateY(-14px) scale(0.98)' : 'none',
      maxHeight: isFading ? '0px' : '800px',
      marginBottom: isFading ? '0px' : '16px',
      paddingTop: isFading ? '0px' : undefined,
      paddingBottom: isFading ? '0px' : undefined,
      overflow: isFading ? 'hidden' : undefined,
      pointerEvents: isFading ? 'none' : 'auto',
      borderColor: isHoldDelivered ? '#10B981' : undefined,
      boxShadow: isHoldDelivered ? '0 4px 18px rgba(16, 185, 129, 0.16)' : undefined
    };

    return h('div', {
      className: `active-order-card status-${statusClass} order-card-${order.id}${isFading ? ' fading-out' : ''}`,
      id: `order-card-${order.id}`,
      style: cardStyle
    }, [
      // 1. Top Banner Header
      h('div', { key: 'top-banner', className: 'order-top-banner' }, [
        h('div', { key: 'tag-group', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
          h('span', {
            key: 'store-tag',
            className: 'store-chip-tag',
            style: {
              background: storeTag.bg,
              color: storeTag.color
            }
          }, storeTag.label),
          h('div', { key: 'next-tag', className: `order-next-tag tag-${statusClass}` }, [
            h('span', { key: 'ico', className: 'tag-icon' }, bannerIcon),
            h('span', { key: 'lbl', className: 'tag-label' }, bannerTag)
          ])
        ]),
        h('div', { key: 'wait-tag', className: `order-waiting-tag tag-${statusClass}` }, [
          h('span', { key: 'ico', className: 'wait-icon' }, '🕒'),
          h('span', { key: 'txt', className: 'wait-text' }, s === 'READY' ? 'Ready for Pickup' : timeAgo)
        ])
      ]),

      // 2. Customer Info Row (Compact)
      h('div', { key: 'cust-row', className: 'order-customer-row' }, [
        h('div', { key: 'user-group', className: 'order-user-group' }, [
          h('div', { key: 'avatar', className: 'order-avatar-circle' }, custInitial),
          h('div', { key: 'user-meta', className: 'order-user-details' }, [
            h('div', { key: 'name-token-row', style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } }, [
              h('h3', { key: 'name', className: 'order-user-name' }, custName),
              h('div', { key: 'token-line', className: 'order-token-line' }, [
                h('span', { key: 'num', className: 'order-token-code' }, displayNum),
                h('button', {
                  key: 'copy',
                  type: 'button',
                  className: 'btn-copy-token',
                  onClick: (e) => {
                    e.stopPropagation();
                    navigator.clipboard && navigator.clipboard.writeText(displayNum.replace(/^#/, ''));
                    window.showToast && window.showToast(`Copied ${displayNum}!`, 'info');
                  },
                  title: 'Copy order number'
                }, [
                  h('svg', {
                    key: 'svg',
                    width: 12,
                    height: 12,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '2.2'
                  }, [
                    h('rect', { key: 'r', x: 9, y: 9, width: 13, height: 13, rx: 2 }),
                    h('path', { key: 'p', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
                  ])
                ])
              ])
            ]),
            h('div', { key: 'meta-chips', className: 'order-meta-chips' }, [
              h('span', { key: 'm1', className: 'meta-fulfillment' }, '🛍️ Counter Pickup'),
              h('span', { key: 'sep', className: 'meta-sep' }, '•'),
              h('span', { key: 'm2', className: 'meta-ago' }, timeAgo)
            ])
          ])
        ]),

        h('div', { key: 'total-box', className: 'order-inline-total' }, [
          h('span', { key: 'val', className: 'total-amount' }, `₹${totalAmount}`)
        ])
      ]),

      // 3. Products Grid (Consistent 2-column tiles with 4-item truncation limit)
      h('div', { key: 'prods-container', className: 'order-products-container' }, [
        h('div', { key: 'grid', className: 'order-products-grid' }, [
          (() => {
            const rawItems = (Array.isArray(order.items) && order.items.length > 0) ? order.items : [];
            if (rawItems.length === 0) {
              return h('div', {
                key: 'empty-pkg',
                className: 'order-product-card',
                style: { gridColumn: '1 / -1' }
              }, [
                h('span', { key: 'ico', style: { fontSize: '13px' } }, '📦'),
                h('div', { key: 'info', className: 'product-info-box' }, [
                  h('div', { key: 't', className: 'product-title', style: { fontSize: '11.5px', color: 'var(--text-muted)' } }, 'Standard Counter Package')
                ])
              ]);
            }

            let visible = [];
            let moreCount = 0;
            if (rawItems.length > 4) {
              visible = rawItems.slice(0, 3);
              moreCount = rawItems.length - 3;
            } else {
              visible = rawItems.slice(0, 4);
            }

            const cards = visible.map((it, idx) => {
              const qty = it.quantity || it.qty || 1;
              const name = it.product_name || it.name || 'Product';
              const price = Number(it.price || 0) * qty;
              const thumb = getThumb(it);

              return h('div', { key: `prod-${idx}`, className: 'order-product-card', title: `${name} (x${qty})` }, [
                h('div', { key: 'qty', className: 'product-qty-badge' }, `${qty}×`),
                h('img', {
                  key: 'thumb',
                  src: thumb,
                  alt: name,
                  className: 'product-thumbnail',
                  loading: 'lazy'
                }),
                h('div', { key: 'info', className: 'product-info-box' }, [
                  h('div', { key: 'title', className: 'product-title', title: name }, name),
                  h('div', { key: 'price', className: 'product-price-line' }, `₹${price}`)
                ])
              ]);
            });

            if (moreCount > 0) {
              cards.push(
                h('div', {
                  key: 'more-pill',
                  className: 'order-product-card product-more-pill',
                  title: `${moreCount} more product${moreCount === 1 ? '' : 's'} in this order`
                }, [
                  h('div', { key: 'ico', className: 'more-icon-box' }, '+'),
                  h('div', { key: 'info', className: 'product-info-box' }, [
                    h('div', { key: 'title', className: 'product-title', style: { fontWeight: 700, color: '#2563EB' } }, `+${moreCount} other${moreCount === 1 ? '' : 's'}`),
                    h('div', { key: 'sub', className: 'product-subtext-line' }, 'more items')
                  ])
                ])
              );
            }

            return cards;
          })()
        ])
      ]),

      // 4. Action Progression Row
      h('div', { key: 'action-row', className: 'order-action-row' }, [
        buttonElement
      ])
    ]);
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 2. REACT COMPONENT: Active Orders Board (Flicker-Free Board)
   * ─────────────────────────────────────────────────────────────
   */
  function AdminActiveOrdersBoard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async (silent = false) => {
      const storeId = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
        || window.activeStoreId
        || 'all';

      if (!silent) setLoading(true);

      try {
        const res = await window.apiRequest(`/admin/stores/${storeId}/orders`);
        const list = res.orders || [];

        // Filter active orders
        const active = list.filter(o => {
          const s = (o.status || '').toUpperCase();
          return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
        });

        // STRICT FIFO SORTING: First order placed is ALWAYS at the top!
        // No matter their status (Placed, Preparing, Ready), position is stable.
        active.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

        setOrders(active);

        // Update badge counters without re-rendering rest of page
        const counterTab = document.getElementById('active-orders-counter');
        if (counterTab) counterTab.textContent = active.length;
        const navCounter = document.getElementById('counter-orders');
        if (navCounter) navCounter.textContent = active.length;
      } catch (err) {
        console.warn('[React OrdersBoard] Fetch notice:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchOrders();

      let bc = null;
      try {
        bc = new BroadcastChannel('unimall_orders_channel');
        bc.onmessage = (evt) => {
          const { type, storeId } = evt.data || {};
          const currentStore = (typeof window.getActiveStoreId === 'function' ? window.getActiveStoreId() : null)
            || window.activeStoreId || 'all';

          if (type === 'ORDER_PLACED' || type === 'ORDER_STATUS_CHANGED') {
            if (currentStore === 'all' || !storeId || storeId === currentStore) {
              fetchOrders(true); // Silent update: React reconciles diff with zero reload!
            }
          }
        };
      } catch (e) {}

      const handleStoreChange = () => fetchOrders();
      window.addEventListener('unimall:storeChanged', handleStoreChange);
      window.addEventListener('unimall:orderStatusUpdated', () => fetchOrders(true));

      return () => {
        if (bc) bc.close();
        window.removeEventListener('unimall:storeChanged', handleStoreChange);
      };
    }, [fetchOrders]);

    // Handle single order status progress
    const handleStatusProgress = useCallback(async (orderId, nextStatus) => {
      const reqFn = window.apiRequest || (typeof apiRequest !== 'undefined' ? apiRequest : null);

      if (nextStatus === 'DELIVERED') {
        // 1. Immediately hold the card in completed delivered state for 2 seconds
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return { ...o, status: 'DELIVERED', isCompletedHold: true };
          }
          return o;
        }));

        if (typeof window.showToast === 'function') {
          window.showToast('✅ Order Delivered! Completing in 2 seconds...', 'success');
        }

        // 2. Perform API Call to Neon DB & sync
        if (reqFn) {
          await reqFn(`/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
          }).catch(err => console.error('[OrdersBoard] Status API error:', err));
        }

        // 3. Inform customer app via BroadcastChannel
        try {
          const bc = new BroadcastChannel('unimall_orders_channel');
          bc.postMessage({
            type: 'ORDER_STATUS_CHANGED',
            orderId,
            status: 'delivered',
            timestamp: Date.now()
          });
          bc.close();
        } catch (e) {}

        // 4. Hold for 2 seconds (2000ms), then trigger CSS fade-out animation
        setTimeout(() => {
          setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
              return { ...o, isFadingOut: true };
            }
            return o;
          }));

          // After fade-out animation completes (450ms), remove card from board
          setTimeout(() => {
            setOrders(prev => prev.filter(o => o.id !== orderId));

            const counterTab = document.getElementById('active-orders-counter');
            if (counterTab) counterTab.textContent = Math.max(0, parseInt(counterTab.textContent || '1', 10) - 1);
            const navCounter = document.getElementById('counter-orders');
            if (navCounter) navCounter.textContent = Math.max(0, parseInt(navCounter.textContent || '1', 10) - 1);
          }, 450);
        }, 2000);

        return;
      }

      // 1. API Call to Neon DB for progression
      if (reqFn) {
        await reqFn(`/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });
      }

      // 2. React state update: update status in-place without re-sorting or changing position!
      setOrders(prev => {
        return prev.map(o => {
          if (o.id === orderId) {
            return { ...o, status: nextStatus };
          }
          return o;
        });
      });

      // 3. Inform customer app via BroadcastChannel
      try {
        const bc = new BroadcastChannel('unimall_orders_channel');
        bc.postMessage({
          type: 'ORDER_STATUS_CHANGED',
          orderId,
          status: nextStatus.toLowerCase(),
          timestamp: Date.now()
        });
        bc.close();
      } catch (e) {}

      let statusMsg = `Order ${nextStatus}!`;
      if (nextStatus === 'PREPARING') statusMsg = '⚡ Order accepted & kitchen prep started!';
      else if (nextStatus === 'READY') statusMsg = '🛍️ Order packed! Ready for pickup.';

      if (typeof window.showToast === 'function') {
        window.showToast(statusMsg, 'success');
      }
    }, []);

    if (loading && orders.length === 0) {
      return h('div', { className: 'empty-state-sm' }, 'Loading active orders...');
    }

    if (orders.length === 0) {
      return h('div', { className: 'empty-active-orders' }, [
        h('div', { key: 'ico', className: 'empty-icon' }, '☕'),
        h('h3', { key: 'h' }, 'All caught up!'),
        h('p', { key: 'p' }, 'No active orders requiring preparation or pickup. Incoming student orders will appear here dynamically with zero page reloads.')
      ]);
    }

    return h('div', {
      className: 'active-orders-grid-inner',
      style: { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }
    }, [
      orders.map((o, idx) => h(OrderCard, {
        key: o.id || idx,
        order: o,
        onStatusProgress: handleStatusProgress
      }))
    ]);
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 3. REACT COMPONENT: Dashboard Live Orders Stream
   * ─────────────────────────────────────────────────────────────
   */
  function AdminDashboardLiveStream() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLive = useCallback(async () => {
      try {
        const res = await window.apiRequest('/admin/stores/all/orders');
        const list = res.orders || [];
        const active = list.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase()));
        active.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        setOrders(active.slice(0, 8));
      } catch (e) {}
      finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchLive();

      let bc = null;
      try {
        bc = new BroadcastChannel('unimall_orders_channel');
        bc.onmessage = () => fetchLive();
      } catch (e) {}

      window.addEventListener('unimall:orderStatusUpdated', fetchLive);
      return () => {
        if (bc) bc.close();
        window.removeEventListener('unimall:orderStatusUpdated', fetchLive);
      };
    }, [fetchLive]);

    if (loading && orders.length === 0) {
      return h('div', { className: 'empty-state-sm' }, 'Loading live stream...');
    }

    if (orders.length === 0) {
      return h('div', {
        style: { textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '13.5px' }
      }, '✨ All caught up! No active orders currently pending across any campus store.');
    }

    return h('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '12px' }
    }, [
      orders.map(o => {
        const custName = (o.user_name || o.customerName || 'Student').trim();
        const itemCount = (o.items && Array.isArray(o.items)) ? o.items.length : 1;
        const total = Number(o.store_subtotal || o.total || 0).toLocaleString('en-IN');
        const tag = getStoreTag(o.store_id);
        const status = (o.status || 'placed').toUpperCase();

        return h('div', {
          key: o.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            transition: 'background 0.2s ease'
          }
        }, [
          h('div', { key: 'info', style: { flex: 1, minWidth: 0, paddingRight: '12px' } }, [
            h('div', { key: 'line1', style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } }, [
              h('span', {
                key: 'tag',
                style: {
                  background: tag.bg,
                  color: tag.color,
                  fontWeight: 700,
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }
              }, tag.label),
              h('strong', { key: 'num', style: { fontSize: '13.5px' } }, o.order_number_display || `#${o.id}`),
              h('span', {
                key: 'st',
                className: `badge-status ${(o.status || 'placed').toLowerCase()}`,
                style: { fontSize: '11px' }
              }, status)
            ]),
            h('div', {
              key: 'line2',
              style: {
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }, [
              h('strong', { key: 'c', style: { color: 'var(--text-main)' } }, custName),
              ` · ${itemCount} item${itemCount === 1 ? '' : 's'} · `,
              h('span', { key: 'p', style: { fontWeight: 700, color: 'var(--text-main)' } }, `₹${total}`)
            ])
          ]),

          h('button', {
            key: 'act',
            type: 'button',
            className: 'btn-action primary',
            onClick: () => {
              if (typeof window.switchView === 'function') {
                window.switchView('orders');
              }
            },
            style: { height: '32px', fontSize: '12px', padding: '0 12px', whiteSpace: 'nowrap' }
          }, 'Manage →')
        ]);
      })
    ]);
  }

  // Mount Functions
  function mountAdminActiveOrdersBoard() {
    const el = document.getElementById('active-orders-cards-container');
    if (!el) return;

    if (ReactDOM.createRoot) {
      if (!window.__adminOrdersBoardRoot) {
        window.__adminOrdersBoardRoot = ReactDOM.createRoot(el);
      }
      window.__adminOrdersBoardRoot.render(h(AdminActiveOrdersBoard));
    } else if (ReactDOM.render) {
      ReactDOM.render(h(AdminActiveOrdersBoard), el);
    }
  }

  function mountAdminDashboardOrdersStream() {
    const el = document.getElementById('dash-urgent-orders');
    if (!el) return;

    if (ReactDOM.createRoot) {
      if (!window.__adminDashboardStreamRoot) {
        window.__adminDashboardStreamRoot = ReactDOM.createRoot(el);
      }
      window.__adminDashboardStreamRoot.render(h(AdminDashboardLiveStream));
    } else if (ReactDOM.render) {
      ReactDOM.render(h(AdminDashboardLiveStream), el);
    }
  }

  window.mountAdminActiveOrdersBoard = mountAdminActiveOrdersBoard;
  window.mountAdminDashboardOrdersStream = mountAdminDashboardOrdersStream;

  // Mount on view change
  window.addEventListener('unimall:viewChanged', (e) => {
    if (e.detail.viewName === 'dashboard') {
      mountAdminDashboardOrdersStream();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountAdminDashboardOrdersStream();
    });
  } else {
    mountAdminDashboardOrdersStream();
  }
})();
