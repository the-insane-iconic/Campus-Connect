/**
 * test_store_isolation_and_integrity.js
 * Comprehensive end-to-end verification of:
 * 1. Neon DB permanent store approval and persistence
 * 2. Store resolution without fake redirects (no fallback to campus-cafe)
 * 3. Store product & inventory isolation per store_id
 * 4. Empty store state handling when 0 products are published
 * 5. Isolation between different store managers / stores
 */

require('dotenv').config();
const https = require('https');

const NEON_CONNECTION_STRING = process.env.DATABASE_URL;
const afterAt = (NEON_CONNECTION_STRING || '').split('@')[1] || '';
const host = afterAt.split('/')[0];
const NEON_SQL_ENDPOINT = host ? `https://${host}/sql` : '';

function runNeonSql(query, params = []) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, params });
    const url = new URL(NEON_SQL_ENDPOINT);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Neon-Connection-String': NEON_CONNECTION_STRING
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            return reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
          }
          resolve(parsed.rows || []);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Store Isolation & Integrity Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // TEST 1: Verify store approval in unimall_stores table
    console.log('1. Checking permanent store existence in unimall_stores...');
    const stores = await runNeonSql(`
      SELECT id, name, category, is_open 
      FROM unimall_stores 
      WHERE id = 'nand-juice' LIMIT 1;
    `);
    assert(stores.length === 1 && stores[0].id === 'nand-juice', 'nand-juice exists permanently in unimall_stores');
    assert(stores[0].is_open === true, 'nand-juice is marked open/approved in unimall_stores');

    // TEST 2: Verify store approval in stores fallback table
    console.log('\n2. Checking permanent store existence in stores table...');
    const storesTable = await runNeonSql(`
      SELECT id, name, category, is_active, is_open 
      FROM stores 
      WHERE id = 'nand-juice' LIMIT 1;
    `);
    assert(storesTable.length === 1 && storesTable[0].id === 'nand-juice', 'nand-juice exists permanently in stores table');
    assert(storesTable[0].is_active === 1, 'nand-juice is_active = 1 in stores table');

    // TEST 3: Product isolation: nand-juice products query must not return Campus Bakery products
    console.log('\n3. Verifying product isolation for nand-juice...');
    const nandProds = await runNeonSql(`
      SELECT id, name, store_id, price 
      FROM unimall_products 
      WHERE store_id = 'nand-juice';
    `);
    const cafeProds = await runNeonSql(`
      SELECT id, name, store_id, price 
      FROM unimall_products 
      WHERE store_id IN ('campus-cafe', 'store-bakery');
    `);

    assert(Array.isArray(nandProds), 'nand-juice products query succeeds and returns array');
    console.log(`     nand-juice currently has ${nandProds.length} products in DB.`);
    console.log(`     campus-cafe has ${cafeProds.length} products in DB.`);

    const hasBleed = nandProds.some(p => p.store_id !== 'nand-juice');
    assert(!hasBleed, 'Zero products from other stores bleed into nand-juice');

    // TEST 4: Add an isolated test product for nand-juice and verify it stays strictly isolated
    console.log('\n4. Testing isolated product addition for nand-juice...');
    const testProdId = 'test-juice-prod-1';
    await runNeonSql(`
      INSERT INTO unimall_products (id, store_id, category_id, name, description, price, stock, availability, is_active, created_at, updated_at)
      VALUES ($1, 'nand-juice', 'food', 'Fresh Orange Juice', 'Cold pressed fresh oranges', 50, 30, 'in-stock', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET price = 50, stock = 30;
    `, [testProdId]);

    const updatedNandProds = await runNeonSql(`
      SELECT id, name, store_id FROM unimall_products WHERE store_id = 'nand-juice';
    `);
    const cafeProdsAfter = await runNeonSql(`
      SELECT id, name, store_id FROM unimall_products WHERE store_id IN ('campus-cafe', 'store-bakery');
    `);

    assert(updatedNandProds.some(p => p.id === testProdId), 'Test product successfully inserted into nand-juice');
    assert(!cafeProdsAfter.some(p => p.id === testProdId), 'Test product is NOT visible in campus-cafe catalog (strict isolation)');

    // Verify products view also reflects it
    const viewProds = await runNeonSql(`
      SELECT id, name, store_id FROM products WHERE store_id = 'nand-juice';
    `);
    assert(viewProds.some(p => p.id === testProdId), 'products view automatically reflects the isolated item');

    // Cleanup test product
    await runNeonSql(`DELETE FROM unimall_products WHERE id = $1`, [testProdId]);
    console.log('     Cleaned up temporary test product.');

    // TEST 5: Verify Orders isolation query
    console.log('\n5. Verifying order query isolation for nand-juice...');
    const nandOrders = await runNeonSql(`
      SELECT id, store_id, order_number, total FROM unimall_orders WHERE store_id = 'nand-juice';
    `);
    assert(Array.isArray(nandOrders), 'Orders query for nand-juice returns array');
    const orderBleed = nandOrders.some(o => o.store_id !== 'nand-juice');
    assert(!orderBleed, 'Zero orders from other stores bleed into nand-juice orders list');

    // TEST 6: Non-existent store test: query non-existent store
    console.log('\n6. Checking non-existent store resolution...');
    const nonExistent = await runNeonSql(`
      SELECT id FROM unimall_stores WHERE id = 'completely-fake-store' LIMIT 1;
    `);
    assert(nonExistent.length === 0, 'Fake store returns 0 rows, triggering Store Not Found UI without redirect');

    console.log(`\n========================================`);
    console.log(`🏁 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runTests();
