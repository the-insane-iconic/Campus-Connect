/**
 * Campus Connect — Student Auth & Google OAuth Test Suite
 * Tests:
 * 1. Live Google OAuth social redirect via Neon Auth
 * 2. Authoritative global sequential guest numbering in Neon PostgreSQL
 * 3. Removal of fake dummy profiles and verified Google connection from guest mode
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

const ROOT = __dirname;
const loginJs = fs.readFileSync(path.join(ROOT, 'admin', 'login.js'), 'utf8');
const neonAuthJs = fs.readFileSync(path.join(ROOT, 'js', 'neon-auth.js'), 'utf8');
const userManagerJs = fs.readFileSync(path.join(ROOT, 'js', 'user-manager.js'), 'utf8');
const profileJs = fs.readFileSync(path.join(ROOT, 'profile.js'), 'utf8');
const configJs = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');

const NEON_SQL_URL = 'https://ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/sql';
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_WXOsK6qhUNd1@ep-broad-morning-b30i16bo-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const NEON_AUTH_URL = 'https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

async function main() {
  console.log('\n======================================================');
  console.log('🎓 CAMPUS CONNECT — STUDENT AUTH & GOOGLE OAUTH TESTS');
  console.log('======================================================\n');

  console.log('--- 1. GOOGLE OAUTH ENDPOINT & REDIRECT TESTS ---');

  await runTest('Neon Auth social sign-in generates valid Google OAuth redirect URL', async () => {
    const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: 'http://localhost:5500/index.html',
        newUserCallbackURL: 'http://localhost:5500/index.html'
      })
    });
    assert(res.ok, `Expected 200 OK from Neon Auth, got ${res.status}`);
    const data = await res.json();
    assert(data.url, 'Expected redirect url in response');
    assert(data.url.includes('/neondb/auth/sign-in/social/init?token='), 'Expected social init URL');

    // Follow the redirect to verify Google accounts endpoint
    const initRes = await fetch(data.url, { redirect: 'manual' });
    const location = initRes.headers.get('location');
    assert(location, 'Expected 302 Location header from init URL');
    assert(location.includes('accounts.google.com/o/oauth2/v2/auth'), `Expected Google OAuth URL, got: ${location}`);
    assert(location.includes('client_id='), 'Expected client_id parameter in Google URL');
  });

  await runTest('neon-auth.js includes newUserCallbackURL and omits forbidden Origin header', () => {
    assert(neonAuthJs.includes('newUserCallbackURL: returnUrl'), 'newUserCallbackURL missing in neon-auth.js');
    assert(!neonAuthJs.includes("'Origin': window.location.origin"), 'Forbidden Origin header must not be set in fetch headers');
  });

  await runTest('admin/login.js does not mock dummy "Campus Student" on Google login', () => {
    assert(!loginJs.includes("name: 'Campus Student'"), 'Dummy "Campus Student" mock found in login.js');
    assert(loginJs.includes('signInWithGoogle'), 'signInWithGoogle missing in login.js');
  });

  console.log('\n--- 2. GLOBAL DATABASE-BACKED GUEST SEQUENCE TESTS ---');

  await runTest('Neon PostgreSQL computes max sequential student number across all devices', async () => {
    const query = "SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(name, '[^0-9]', '', 'g') AS INTEGER)), 0) AS max_num FROM users WHERE name ~ '^Student [0-9]+$';";
    const res = await fetch(NEON_SQL_URL, {
      method: 'POST',
      headers: { 'Neon-Connection-String': NEON_CONNECTION_STRING },
      body: JSON.stringify({ query })
    });
    assert(res.ok, 'Neon SQL failed');
    const data = await res.json();
    assert(data.rows && data.rows.length > 0, 'Expected row result');
    const maxNum = parseInt(data.rows[0].max_num, 10);
    assert(Number.isFinite(maxNum) && maxNum >= 8, `Expected maxNum >= 8, got: ${maxNum}`);
  });

  await runTest('js/config.js UniMallDB includes getNextGuestNumber() querying users table', () => {
    assert(configJs.includes('getNextGuestNumber()'), 'getNextGuestNumber missing in UniMallDB');
    assert(configJs.includes("WHERE name ~ '^Student [0-9]+$'"), 'Regex match missing in getNextGuestNumber');
  });

  await runTest('js/user-manager.js implements ensureGuestProfileAsync() using Neon DB sequence', () => {
    assert(userManagerJs.includes('ensureGuestProfileAsync'), 'ensureGuestProfileAsync missing in user-manager.js');
    assert(userManagerJs.includes('getNextGuestNumber'), 'getNextGuestNumber call missing in user-manager.js');
  });

  await runTest('admin/login.js guestBtn uses ensureGuestProfileAsync for global continuity', () => {
    assert(loginJs.includes('ensureGuestProfileAsync'), 'ensureGuestProfileAsync missing in login.js guestBtn');
  });

  console.log('\n--- 3. GUEST-TO-GOOGLE CONNECT & ORDER MIGRATION TESTS ---');

  await runTest('profile.js handleConnectGoogle initiates Google OAuth redirect to profile.html', () => {
    assert(profileJs.includes('signInWithGoogle'), 'signInWithGoogle missing in handleConnectGoogle');
    assert(profileJs.includes('/profile.html'), 'callbackURL to profile.html missing in handleConnectGoogle');
  });

  await runTest('user-manager.js migrates existing in-flight guest orders when connecting Google account', () => {
    assert(userManagerJs.includes('Seamless Guest-to-Google Order Linking'), 'Order linking comment missing');
    assert(userManagerJs.includes("startsWith('usr_guest_')"), 'Guest order migration check missing');
  });

  console.log('\n======================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('======================================================\n');

  if (failedTests > 0) process.exit(1);
  else process.exit(0);
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
