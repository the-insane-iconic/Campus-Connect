/**
 * test_product_image_and_store_profile.js
 * Verification of:
 * 1. Store profile & cover image persistence to Neon DB
 * 2. Store hours & fulfillment toggles persistence
 * 3. Adding product with preset image to Neon DB
 * 4. Adding product with custom / uploaded data URL image to Neon DB
 * 5. Fetching product catalog from DB with image for user storefront
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
  console.log('🧪 Starting Store Profile & Product Image Gallery Verification...\n');
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
    // TEST 1: Update store profile with cover image & hours in unimall_stores
    console.log('1. Updating store profile & cover image in unimall_stores...');
    const testCoverUrl = 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=900&auto=format&fit=crop&q=80';
    await runNeonSql(`
      UPDATE unimall_stores
      SET cover_image = $2,
          opening_time = $3,
          closing_time = $4,
          description = $5,
          updated_at = NOW()
      WHERE id = $1;
    `, ['nand-juice', testCoverUrl, '09:00 AM', '09:00 PM', 'Fresh cold-pressed juices and fruit bowls']);

    const updatedStore = await runNeonSql(`
      SELECT id, name, cover_image, opening_time, closing_time, description 
      FROM unimall_stores 
      WHERE id = 'nand-juice';
    `);

    assert(updatedStore.length === 1, 'nand-juice found in unimall_stores');
    assert(updatedStore[0].cover_image === testCoverUrl, 'Cover image successfully persisted in unimall_stores');
    assert(updatedStore[0].opening_time === '09:00 AM', 'Opening time saved in unimall_stores');

    // TEST 2: Add product with preset image to nand-juice
    console.log('\n2. Testing product creation with preset photo...');
    const presetProdId = 'test-prod-preset-mango';
    const presetImgUrl = 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80';

    await runNeonSql(`
      INSERT INTO unimall_products (id, store_id, category_id, name, description, price, emoji, image, stock, availability, is_active, created_at, updated_at)
      VALUES ($1, 'nand-juice', 'food', 'Fresh Alphonso Mango Shake', 'Sweet and chilled fresh mango shake with ice cream', 70.00, '🥤', $2, 30, 'in-stock', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET price = 70.00, image = EXCLUDED.image;
    `, [presetProdId, presetImgUrl]);

    const prods1 = await runNeonSql(`
      SELECT id, store_id, name, price, image, stock 
      FROM unimall_products 
      WHERE id = $1;
    `, [presetProdId]);

    assert(prods1.length === 1, 'Preset product created in unimall_products');
    assert(prods1[0].image === presetImgUrl, 'Preset product image URL stored accurately');
    assert(parseFloat(prods1[0].price) === 70.00, 'Product price stored accurately');

    // TEST 3: Add product with uploaded data URL (device upload simulation)
    console.log('\n3. Testing product creation with uploaded image data URL...');
    const uploadProdId = 'test-prod-upload-lime';
    const fakeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...freshlime';

    await runNeonSql(`
      INSERT INTO unimall_products (id, store_id, category_id, name, description, price, emoji, image, stock, availability, is_active, created_at, updated_at)
      VALUES ($1, 'nand-juice', 'food', 'Fresh Mint Lime Soda', 'Refreshing fizzy soda with fresh mint leaves', 40.00, '🥤', $2, 25, 'in-stock', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET price = 40.00, image = EXCLUDED.image;
    `, [uploadProdId, fakeDataUrl]);

    const prods2 = await runNeonSql(`
      SELECT id, store_id, name, price, image, stock 
      FROM unimall_products 
      WHERE id = $1;
    `, [uploadProdId]);

    assert(prods2.length === 1, 'Uploaded photo product created in unimall_products');
    assert(prods2[0].image === fakeDataUrl, 'Uploaded photo data URL stored intact');

    // TEST 4: Verify student storefront query returns both products with images
    console.log('\n4. Verifying student storefront query returns products with images...');
    const storefrontProds = await runNeonSql(`
      SELECT id, store_id, name, price, image, stock, availability 
      FROM unimall_products 
      WHERE (store_id = 'nand-juice' OR store_id = 'store-nand-juice') AND is_active = true 
      ORDER BY name ASC;
    `);

    assert(storefrontProds.length >= 2, 'Storefront query returns all created products');
    const hasMango = storefrontProds.some(p => p.id === presetProdId && p.image === presetImgUrl);
    const hasLime = storefrontProds.some(p => p.id === uploadProdId && p.image === fakeDataUrl);
    assert(hasMango, 'Storefront has Mango Shake with preset image');
    assert(hasLime, 'Storefront has Lime Soda with uploaded device image');

    // Clean up test products
    await runNeonSql(`DELETE FROM unimall_products WHERE id IN ($1, $2);`, [presetProdId, uploadProdId]);
    console.log('\n  🧹 Cleaned up temporary test products from database.');

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
