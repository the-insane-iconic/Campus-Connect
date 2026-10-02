/**
 * Campus Connect — Comprehensive Backend Connection & Security Test Suite
 * Tests:
 * 1. Information disclosure & sensitive file blocking (403 for .env, .git, .neon, source code)
 * 2. Security response headers (nosniff, SAMEORIGIN, strict-origin-when-cross-origin, XSS-Protection)
 * 3. Neon PostgreSQL live database connectivity (both via HTTPS SQL and direct driver)
 * 4. Admin authentication hardening (elimination of username-as-password and substring bypasses)
 * 5. Inventory mutation synchronization with Neon PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

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

async function main() {
  console.log('\n======================================================');
  console.log('🛡️  CAMPUS CONNECT — BACKEND & SECURITY VALIDATION');
  console.log('======================================================\n');

  console.log('--- 1. INFORMATION DISCLOSURE & STATIC SERVING DEFENSE ---');

  await runTest('Sensitive files (.env, .git, .neon, scripts, package.json) return 403 in Flask app', () => {
    const pythonCode = `
from backend.app import app
client = app.test_client()
targets = ['.env', '.git/config', '.neon', 'backend/app.py', 'scripts/migrate_to_neon.js', 'package.json']
for t in targets:
    res = client.get('/' + t)
    assert res.status_code == 403, f"Target {t} returned {res.status_code}, expected 403"
print("OK")
`;
    const res = spawnSync('python3', ['-c', pythonCode], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, `Python test failed: ${res.stderr || res.stdout}`);
    assert(res.stdout.includes('OK'), 'Expected OK response from Flask static guard');
  });

  await runTest('Security response headers (nosniff, SAMEORIGIN, referrer policy) configured', () => {
    const pythonCode = `
from backend.app import app
client = app.test_client()
res = client.get('/')
assert res.headers.get('X-Content-Type-Options') == 'nosniff', "Missing X-Content-Type-Options"
assert res.headers.get('X-Frame-Options') == 'SAMEORIGIN', "Missing X-Frame-Options"
assert res.headers.get('Referrer-Policy') == 'strict-origin-when-cross-origin', "Missing Referrer-Policy"
assert res.headers.get('X-XSS-Protection') == '1; mode=block', "Missing X-XSS-Protection"
print("OK")
`;
    const res = spawnSync('python3', ['-c', pythonCode], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, `Headers verification failed: ${res.stderr || res.stdout}`);
    assert(res.stdout.includes('OK'));
  });

  console.log('\n--- 2. NEON POSTGRESQL BACKEND CONNECTIVITY ---');

  await runTest('HTTPS Neon SQL API executes queries and returns live database results', async () => {
    require('dotenv').config();
    const NEON_CONNECTION_STRING = process.env.DATABASE_URL;
    const afterAt = (NEON_CONNECTION_STRING || '').split('@')[1] || '';
    const host = afterAt.split('/')[0];
    const NEON_SQL_URL = host ? `https://${host}/sql` : '';

    const res = await fetch(NEON_SQL_URL, {
      method: 'POST',
      headers: { 'Neon-Connection-String': NEON_CONNECTION_STRING },
      body: JSON.stringify({ query: 'SELECT count(*) as total_stores FROM unimall_stores', params: [] })
    });
    assert(res.ok, `Neon SQL HTTP returned status ${res.status}`);
    const data = await res.json();
    assert(data.rows && data.rows.length > 0, 'Expected non-empty rows from Neon SQL');
    assert(parseInt(data.rows[0].total_stores, 10) >= 1, 'Expected at least 1 store in database');
  });

  await runTest('Python psycopg2 backend connection connects directly to Neon Lakebase Postgres', () => {
    const pythonCode = `
from backend.db import get_connection, is_postgres, query_one
assert is_postgres(), "is_postgres() must be True"
res = query_one("SELECT count(*) as count FROM unimall_stores")
assert res and 'count' in res, "Expected count result from Neon"
print("OK:", res['count'])
`;
    const res = spawnSync('python3', ['-c', pythonCode], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, `Python connection failed: ${res.stderr || res.stdout}`);
    assert(res.stdout.includes('OK:'));
  });

  console.log('\n--- 3. AUTHENTICATION & INVENTORY INTEGRITY ---');

  await runTest('admin/login.js eliminates partial-hash substring matching and username-as-password bypass', () => {
    const loginJs = fs.readFileSync(path.join(__dirname, 'admin', 'login.js'), 'utf8');
    assert(!loginJs.includes('password_hash.includes(rawPass)'), 'Found insecure password_hash.includes substring matching');
    assert(!loginJs.includes('normPass === rawUser.toLowerCase()'), 'Found insecure username-as-password fallback');
    assert(loginJs.includes('rawPass.length >= 4'), 'Expected minimum length check on password verification');
  });

  await runTest('admin/js/api.js persists inventory patches to Neon PostgreSQL via UniMallDB', () => {
    const apiJs = fs.readFileSync(path.join(__dirname, 'admin', 'js', 'api.js'), 'utf8');
    const invPatchSection = apiJs.substring(apiJs.indexOf('/admin/inventory/'));
    assert(invPatchSection.includes('window.UniMallDB.upsertProduct(catalog[idx])'), 'Inventory patch must call UniMallDB.upsertProduct');
  });

  await runTest('Flask backend handles out-of-stock orders gracefully with 400 Bad Request', () => {
    const pythonCode = `
import os
os.environ['DATABASE_URL'] = ''
from backend.seed import seed_database
seed_database()
from backend.app import app
client = app.test_client()
res = client.post('/api/public/orders', json={'items': [{'productId': 'prod_bakery_01', 'qty': 99999}]})
assert res.status_code == 400, f"Expected 400 for out of stock, got {res.status_code}"
assert 'error' in res.get_json(), "Expected error message in response JSON"
print("OK")
`;
    const res = spawnSync('python3', ['-c', pythonCode], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0, `Overselling test failed: ${res.stderr || res.stdout}`);
    assert(res.stdout.includes('OK'));
  });

  console.log('\n======================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('======================================================\n');

  if (failedTests > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
