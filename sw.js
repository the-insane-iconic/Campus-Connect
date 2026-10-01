/**
 * UniMall & CampusConnect — Service Worker (sw.js)
 * Powers background push notifications, audio chime wakeups, and offline resilience for store owners.
 */

const CACHE_NAME = 'unimall-v2-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/admin/index.html',
  '/admin/admin.css',
  '/admin/js/orders.js',
  '/admin/js/dashboard.js',
  '/favicon.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Push Notification Event (from Web Push or Serverless trigger)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Order Received', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 New Order Received!';
  const options = {
    body: data.body || 'A student placed an order for counter pickup. Tap to view and prepare.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || `unimall-order-${Date.now()}`,
    renotify: true,
    vibrate: [300, 100, 300, 100, 450],
    data: {
      url: data.url || '/admin/index.html#view-orders',
      orderId: data.orderId
    },
    actions: [
      { action: 'open_orders', title: '⚡ View Order' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Handler (Brings browser tab to front or navigates to order)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/admin/index.html#view-orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If admin tab already open, focus it and notify
      for (let client of windowClients) {
        if (client.url.includes('/admin/')) {
          client.postMessage({
            type: 'FOCUS_ORDERS',
            orderId: event.notification.data ? event.notification.data.orderId : null
          });
          return client.focus();
        }
      }
      // If no admin tab open, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Event (allows client tabs to ask SW to display mobile notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_ORDER_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
