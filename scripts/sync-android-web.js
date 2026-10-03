/**
 * scripts/sync-android-web.js
 * Syncs the web application assets into `www/` (for Capacitor CLI) and `android/app/src/main/assets/public/`
 * Ensures Capacitor and Android Studio builds have 100% live, identical code.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW_DIR = path.resolve(ROOT, 'www');
const ANDROID_PUBLIC = path.resolve(ROOT, 'android/app/src/main/assets/public');

// Clean target directories to prevent accumulation of stale files
[WWW_DIR, ANDROID_PUBLIC].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
});

// Purge any macOS iCloud duplicate conflict files in Android directory
function cleanSyncDuplicates(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanSyncDuplicates(full);
    } else if (/\s\d+\./.test(entry.name) || entry.name.startsWith('.DS_Store')) {
      fs.rmSync(full, { force: true });
    }
  }
}
cleanSyncDuplicates(path.resolve(ROOT, 'android/app/src/main/res'));
cleanSyncDuplicates(path.resolve(ROOT, 'android/app/src/main/assets'));

function copyFileTo(srcPath, destDir) {
  if (fs.existsSync(srcPath)) {
    const base = path.basename(srcPath);
    // Ignore duplicates/temp files like "file 2.js" or ".DS_Store"
    if (base.startsWith('.') || base.includes(' 2.') || base.includes(' 3.')) return;
    const rel = path.relative(ROOT, srcPath);
    const dest = path.join(destDir, rel);
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(srcPath, dest);
  }
}

function copyDirTo(srcPath, destDir) {
  if (!fs.existsSync(srcPath)) return;
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'www' || entry.name === 'android') continue;
    if (entry.name.includes(' 2.') || entry.name.includes(' 3.')) continue;
    const fullSrc = path.join(srcPath, entry.name);
    if (entry.isDirectory()) {
      copyDirTo(fullSrc, destDir);
    } else {
      copyFileTo(fullSrc, destDir);
    }
  }
}

console.log('📱 Syncing web assets to www/ and Android assets...');

const files = [
  'index.html',
  'favicon.png',
  'manifest.json',
  'sw.js'
];

files.forEach(f => {
  const p = path.join(ROOT, f);
  copyFileTo(p, WWW_DIR);
  copyFileTo(p, ANDROID_PUBLIC);
});

const dirs = ['assets', 'css', 'js', 'admin', 'merchant', 'login', 'vendor'];
dirs.forEach(d => {
  const p = path.join(ROOT, d);
  copyDirTo(p, WWW_DIR);
  copyDirTo(p, ANDROID_PUBLIC);
});

// Remove any nested stale www folder inside Android assets if present
const staleWww = path.join(ANDROID_PUBLIC, 'www');
if (fs.existsSync(staleWww)) {
  fs.rmSync(staleWww, { recursive: true, force: true });
}

console.log('✅ Web assets synced successfully for Capacitor & Android Studio.');
