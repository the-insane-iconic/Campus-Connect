const fs = require('fs');
const path = require('path');

async function testFilled() {
  const tabsRes = await fetch('http://localhost:9222/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === msgId) {
        ws.removeEventListener('message', handler);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise(r => ws.onopen = r);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Seed cart and orders into unimall_v1
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        let auth = JSON.parse(localStorage.getItem('unimall_auth') || '{}');
        const uid = auth.userId || 'student_9';
        
        let v1 = JSON.parse(localStorage.getItem('unimall_v1') || '{}');
        v1.cart = [
          {
            productId: 'item_1',
            qty: 2,
            name: 'Belgian Chocolate Croissant',
            price: 120,
            image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'
          },
          {
            productId: 'item_2',
            qty: 1,
            name: 'Iced Caramel Macchiato',
            price: 180,
            image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400'
          }
        ];
        
        v1.orders = [
          {
            id: 'ord_1024',
            order_number_display: '#UM1024',
            user_id: uid,
            storeId: 'store_1',
            storeName: 'Campus Bakery & Café',
            storeIcon: '🥐',
            status: 'preparing',
            total: 420,
            createdAt: new Date().toISOString(),
            deliveryType: 'counter_pickup',
            items: [
              { id: 'item_1', name: 'Belgian Chocolate Croissant', price: 120, quantity: 2 },
              { id: 'item_2', name: 'Iced Caramel Macchiato', price: 180, quantity: 1 }
            ]
          },
          {
            id: 'ord_1020',
            order_number_display: '#UM1020',
            user_id: uid,
            storeId: 'store_2',
            storeName: 'Stationery Hub',
            storeIcon: '📚',
            status: 'delivered',
            total: 250,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            deliveryType: 'hostel_delivery',
            items: [
              { id: 'item_3', name: 'A4 Spiral Notebook (Set of 3)', price: 250, quantity: 1 }
            ]
          }
        ];
        
        localStorage.setItem('unimall_v1', JSON.stringify(v1));
      })()
    `
  });

  // Navigate to Cart view
  await send('Page.navigate', { url: 'http://localhost:8123/index.html?view=cart' });
  await new Promise(r => setTimeout(r, 2000));
  const cartShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ansh/.gemini/antigravity-ide/brain/fe538100-c983-4ccf-8c7d-594037f286c3/cart_filled.png', Buffer.from(cartShot.data, 'base64'));
  console.log('Saved cart_filled.png');

  // Navigate to Orders view
  await send('Page.navigate', { url: 'http://localhost:8123/index.html?view=orders' });
  await new Promise(r => setTimeout(r, 2000));
  const ordersShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ansh/.gemini/antigravity-ide/brain/fe538100-c983-4ccf-8c7d-594037f286c3/orders_filled.png', Buffer.from(ordersShot.data, 'base64'));
  console.log('Saved orders_filled.png');

  ws.close();
}

testFilled().catch(console.error);
