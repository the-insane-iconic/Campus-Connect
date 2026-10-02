/**
 * scripts/sync-android-web.js
 * Syncs the root web application assets directly into the Android native assets directory.
 * Keeps the workspace 100% clean without creating redundant duplicate folders.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_PUBLIC = path.resolve(ROOT, 'android/app/src/main/assets/public');

if (!fs.existsSync(ANDROID_PUBLIC)) {
  fs.mkdirSync(ANDROID_PUBLIC, { recursive: true });
}

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(ANDROID_PUBLIC, relPath);
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function copyDir(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(ANDROID_PUBLIC, relPath);
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'www' || entry.name === 'android') continue;
    const srcEntry = path.join(src, entry.name);
    const destEntry = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(path.relative(ROOT, srcEntry));
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

console.log('📱 Syncing web assets directly into Android app assets...');

const files = [
  'index.html',
  'stores.html',
  'store.html',
  'cart.html',
  'orders.html',
  'profile.html',
  'cart.css',
  'cart.js',
  'orders.css',
  'orders.js',
  'profile.css',
  'profile.js',
  'store.css',
  'store.js',
  'stores.css',
  'stores.js',
  'favicon.png',
  'manifest.json',
  'sw.js'
];
files.forEach(f => copyFile(f));

const dirs = ['assets', 'css', 'js', 'admin', 'vendor'];
dirs.forEach(d => copyDir(d));

// Remove any stale www folder inside Android assets if present
const staleWww = path.join(ANDROID_PUBLIC, 'www');
if (fs.existsSync(staleWww)) {
  fs.rmSync(staleWww, { recursive: true, force: true });
}

console.log('✅ Android assets synced directly — no duplicate folders in workspace.');
