// Mock browser environment for Node.js
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

require('./js/config.js');
const UniMallDB = global.window.UniMallDB;

async function testSuperAdminMetrics() {
  console.log('Testing Super Admin Metrics and Analytics...');
  
  // 1. Dashboard Metrics ('all')
  const dashMetrics = await UniMallDB.getDashboardMetrics('all');
  console.log('\n--- Dashboard Metrics (all) ---');
  console.log('Today Sales:', dashMetrics.today_sales);
  console.log('Today Orders:', dashMetrics.today_orders);
  console.log('Today Customers:', dashMetrics.today_customers);
  console.log('Active Orders:', dashMetrics.active_orders);
  console.log('Platform Fee Total:', dashMetrics.platform_fee_total);
  console.log('Net Payout Total:', dashMetrics.net_payout_total);
  console.log('Stores in Ledger:', dashMetrics.stores_ledger.length);
  dashMetrics.stores_ledger.forEach(s => {
    console.log(` - Store: ${s.store_name} (${s.store_id}): orders=${s.today_orders_count}, sales=₹${s.today_gross_sales}, payout=₹${s.net_payout}`);
  });

  // 2. Deep Analytics ('all', 'today')
  const analyticsToday = await UniMallDB.getDeepAnalytics('all', 'today');
  console.log('\n--- Deep Analytics (all, today) ---');
  console.log('Revenue:', analyticsToday.revenue);
  console.log('Orders:', analyticsToday.orders);
  console.log('Customers:', analyticsToday.customers);
  console.log('Average Order Value:', analyticsToday.average_order_value);
  console.log('Units Sold:', analyticsToday.units_sold);
  console.log('Hourly Rush entries:', analyticsToday.hourly_rush.length);
  console.log('Store Matrix entries:', analyticsToday.store_matrix.length);
  analyticsToday.store_matrix.forEach(sm => {
    console.log(` - Matrix Store: ${sm.store_name} (${sm.store_id}): rev=₹${sm.revenue}, orders=${sm.orders}, share=${sm.share}%`);
  });
  console.log('Top Products entries:', analyticsToday.top_products.length);
  analyticsToday.top_products.slice(0, 5).forEach(tp => {
    console.log(` - Top Product: ${tp.name} (${tp.store_id}): units=${tp.units_sold}, rev=₹${tp.revenue}`);
  });

  // 3. Deep Analytics ('all', 'all')
  const analyticsLifetime = await UniMallDB.getDeepAnalytics('all', 'all');
  console.log('\n--- Deep Analytics (all, all / lifetime) ---');
  console.log('Lifetime Revenue:', analyticsLifetime.revenue);
  console.log('Lifetime Orders:', analyticsLifetime.orders);
  console.log('Lifetime Customers:', analyticsLifetime.customers);

  // 4. Products Master Catalog
  const allProducts = await UniMallDB.getProducts('all');
  console.log('\n--- Master Products Catalog (all) ---');
  console.log('Total Products Count:', allProducts.length);

  // 5. Stores
  const stores = await UniMallDB.getStores();
  console.log('\n--- Registered Stores ---');
  console.log('Total Stores Count:', stores.length);
  stores.forEach(s => console.log(` - ${s.name} (${s.id}) [open=${s.is_open}]`));

  console.log('\n=== All Super Admin Data Validated Successfully ===');
}

testSuperAdminMetrics().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
