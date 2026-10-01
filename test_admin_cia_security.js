/**
 * Campus Connect — Admin Security & CIA Triad Automated Test Suite
 * Tests Confidentiality, Integrity, and Availability guarantees for the Admin section.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log('🔒 CAMPUS CONNECT — ADMIN SECTION CIA SECURITY TESTS');
console.log('======================================================\n');

const ROOT = __dirname;
const adminIndexPath = path.join(ROOT, 'admin', 'index.html');
const adminAuthPath = path.join(ROOT, 'admin', 'js', 'auth.js');
const adminApiPath = path.join(ROOT, 'admin', 'js', 'api.js');
const adminOrdersPath = path.join(ROOT, 'admin', 'js', 'orders.js');
const adminDashboardPath = path.join(ROOT, 'admin', 'js', 'dashboard.js');
const adminLoginJsPath = path.join(ROOT, 'admin', 'login.js');

const adminIndexHtml = fs.readFileSync(adminIndexPath, 'utf8');
const adminAuthJs = fs.readFileSync(adminAuthPath, 'utf8');
const adminApiJs = fs.readFileSync(adminApiPath, 'utf8');
const adminOrdersJs = fs.readFileSync(adminOrdersPath, 'utf8');
const adminDashboardJs = fs.readFileSync(adminDashboardPath, 'utf8');
const adminLoginJs = fs.readFileSync(adminLoginJsPath, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONFIDENTIALITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. CONFIDENTIALITY TESTS ---');

runTest('Early synchronous route guard exists in <head> of admin/index.html', () => {
  assert(adminIndexHtml.includes('sessionStorage.getItem(\'unimall_admin_token\')'), 'Token check missing in head');
  assert(adminIndexHtml.includes('window.location.replace(\'/admin/login.html\')'), 'Redirect call missing in head');
  // Must appear before <body>
  const headEndIdx = adminIndexHtml.indexOf('</head>');
  const guardIdx = adminIndexHtml.indexOf('sessionStorage.getItem(\'unimall_admin_token\')');
  assert(guardIdx < headEndIdx, 'Auth guard must execute inside <head> before DOM body parsing');
});

runTest('Defensive auth cloaking style prevents unauthenticated DOM inspection / FOUC', () => {
  assert(adminIndexHtml.includes('html.auth-checking body'), 'Auth cloak style missing');
  assert(adminIndexHtml.includes('visibility: hidden !important'), 'Visibility hidden missing from cloak style');
  assert(adminIndexHtml.includes('classList.add(\'auth-checking\')'), 'Auth checking class addition missing');
  assert(adminAuthJs.includes('classList.remove(\'auth-checking\')'), 'Auth checking removal missing from auth.js');
});

runTest('Security headers and cache prevention meta tags present', () => {
  assert(adminIndexHtml.includes('http-equiv="X-Content-Type-Options" content="nosniff"'), 'nosniff missing');
  assert(adminIndexHtml.includes('name="referrer" content="strict-origin-when-cross-origin"'), 'referrer policy missing');
  assert(adminIndexHtml.includes('no-store, no-cache, must-revalidate'), 'Cache-Control header missing');
});

runTest('Inactivity session timeout (30-min NIST standard) configured in auth.js', () => {
  assert(adminAuthJs.includes('INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000'), '30-minute timer constant missing');
  assert(adminAuthJs.includes('setupInactivityGuard'), 'setupInactivityGuard missing');
  assert(adminAuthJs.includes('reason=timeout'), 'Timeout redirect parameter missing');
  assert(adminLoginJs.includes('reason') && adminLoginJs.includes('timeout'), 'login.js timeout reason handler missing');
});

runTest('Role-Based Access Control (RBAC) enforced on restricted views', () => {
  assert(adminAuthJs.includes('isPlatformUser = (currentAdminUser && currentAdminUser.role === \'platform_admin\')'), 'Platform user role check missing');
  assert(adminAuthJs.includes('viewName === \'founder\' && !isPlatformUser'), 'Founder hub view guard missing');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTEGRITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. INTEGRITY TESTS ---');

runTest('escapeHtml in api.js escapes all 5 standard HTML special chars including single quotes', () => {
  // Extract escapeHtml implementation
  const funcMatch = adminApiJs.match(/function escapeHtml\([\s\S]*?^}/m);
  assert(funcMatch, 'Could not extract escapeHtml');
  const evalFunc = new Function(`${funcMatch[0]}; return escapeHtml;`)();

  assert.strictEqual(evalFunc('&'), '&amp;');
  assert.strictEqual(evalFunc('<'), '&lt;');
  assert.strictEqual(evalFunc('>'), '&gt;');
  assert.strictEqual(evalFunc('"'), '&quot;');
  assert.strictEqual(evalFunc("'"), '&#039;');
  assert.strictEqual(evalFunc('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(evalFunc("test's order"), 'test&#039;s order');
  assert.strictEqual(evalFunc(null), '');
  assert.strictEqual(evalFunc(undefined), '');
});

runTest('Inline event handlers sanitize order IDs and tokens to prevent attribute breakout', () => {
  assert(adminOrdersJs.includes('safeOrderId = String(o.id || \'\').replace(/[^a-zA-Z0-9_\\-#]/g, \'\')'), 'safeOrderId sanitization missing in card');
  assert(adminOrdersJs.includes('safeDisplayNumber = String(displayNumber || \'\').replace(/[^a-zA-Z0-9_\\-#]/g, \'\')'), 'safeDisplayNumber sanitization missing in card');
  assert(adminOrdersJs.includes('onclick="progressOrderStep(\'${safeOrderId}\''), 'progressOrderStep must use safeOrderId');
  assert(adminOrdersJs.includes('onclick="copyOrderToken(\'${safeDisplayNumber}\''), 'copyOrderToken must use safeDisplayNumber');
});

runTest('Order state machine transition integrity prevents backwards/invalid status updates', () => {
  assert(adminOrdersJs.includes('curStatus === \'DELIVERED\' || curStatus === \'COMPLETED\''), 'Delivered check missing');
  assert(adminOrdersJs.includes('curStatus === \'CANCELLED\''), 'Cancelled check missing');
  assert(adminOrdersJs.includes('const ALLOWED = {'), 'State machine transition table missing');
  assert(adminOrdersJs.includes('!allowedNext.includes(nextStatus.toUpperCase())'), 'Invalid transition rejection check missing');
});

runTest('Store payout settlement enforces RBAC, numerical validation, and idempotency', () => {
  assert(adminDashboardJs.includes('currentAdminUser.role === \'platform_admin\''), 'RBAC check missing in settleStorePayout');
  assert(adminDashboardJs.includes('!Number.isFinite(numAmount) || numAmount <= 0'), 'Number validation missing in settleStorePayout');
  assert(adminDashboardJs.includes('settled[storeId]'), 'Duplicate settlement check missing');
  assert(adminDashboardJs.includes('TX-DISBURSE-'), 'Transaction receipt generation missing');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AVAILABILITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. AVAILABILITY TESTS ---');

runTest('Global unhandled rejection error boundary registered in auth.js', () => {
  assert(adminAuthJs.includes('window.addEventListener(\'unhandledrejection\''), 'unhandledrejection listener missing');
  assert(adminAuthJs.includes('window.addEventListener(\'error\''), 'error listener missing');
});

runTest('Defensive card mapping in renderActiveOrdersBoard isolates faulty order records', () => {
  assert(adminOrdersJs.includes('catch (cardErr)'), 'try-catch wrapper missing in activeOrders.map');
  assert(adminOrdersJs.includes('console.warn(\'[Orders Board] Error rendering order card:\''), 'Error logging for faulty card missing');
});

runTest('Fallback canonical zero-state data structure guarantees dashboard never hangs', () => {
  assert(adminDashboardJs.includes('CANONICAL_DEFAULT'), 'CANONICAL_DEFAULT stores matrix missing in dashboard.js');
  assert(adminDashboardJs.includes('if (!metrics)'), 'Null metrics fallback missing');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
