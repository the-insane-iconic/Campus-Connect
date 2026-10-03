const fs = require('fs');
const path = require('path');

async function main() {
  const tabsRes = await fetch('http://localhost:9222/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page');
  if (!pageTab) {
    console.error('No page tab found');
    return;
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', data.params.type, ...data.params.args.map(a => a.value || a.description));
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log('Connected to Chrome DevTools Protocol');

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  // Pre-seed localStorage to simulate authenticated Student 9
  await send('Page.navigate', { url: 'http://localhost:8123/index.html' });
  await new Promise(r => setTimeout(r, 1000));

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('unimall_has_visited', 'true');
      localStorage.setItem('unimall_auth', JSON.stringify({
        userId: 'student_9',
        name: 'Student 9',
        email: 'student9@campus.edu',
        role: 'student',
        hostel: 'Hostel 4',
        room: '204'
      }));
      localStorage.setItem('unimall_v1', JSON.stringify({
        currentUser: {
          name: 'Student 9',
          email: 'student9@campus.edu',
          role: 'student',
          hostel: 'Hostel 4',
          room: '204',
          isGuest: false
        }
      }));
    `
  });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  const views = ['stores', 'orders', 'cart', 'profile'];
  const artifactDir = '/Users/ansh/.gemini/antigravity-ide/brain/fe538100-c983-4ccf-8c7d-594037f286c3';

  for (const view of views) {
    console.log(`\n================ Testing View: ${view} ================`);
    await send('Page.navigate', { url: `http://localhost:8123/index.html?view=${view}` });
    await new Promise(r => setTimeout(r, 2000));

    const check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const panel = document.getElementById('view-' + '${view}');
          const header = panel ? panel.querySelector('header') : null;
          const title = header ? header.querySelector('.header-title') : null;
          return {
            view: '${view}',
            panelExists: !!panel,
            panelDisplay: panel ? window.getComputedStyle(panel).display : null,
            headerTitleWidth: title ? title.getBoundingClientRect().width : 0,
            headerWidth: header ? header.getBoundingClientRect().width : 0,
            hasReact: typeof window.React !== 'undefined',
            hasReactDOM: typeof window.ReactDOM !== 'undefined'
          };
        })()
      `,
      returnByValue: true
    });
    console.log(`View ${view} metrics:`, check.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(artifactDir, `${view}_repaired.png`);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot to: ${shotPath}`);
  }

  ws.close();
}

main().catch(console.error);
