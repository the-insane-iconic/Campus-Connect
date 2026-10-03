/**
 * UniMall Store Admin — Inventory Controller (admin/js/inventory.js)
 * NOW MERGED INTO products.js — This file provides backward compatibility.
 * All inventory functionality (stock adjustment, thresholds, search) is now
 * in the unified Products & Stock view (products.js).
 *
 * This stub ensures any existing references to inventory functions continue to work.
 */

'use strict';

// Redirect inventory view events to products view
window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'inventory') {
    // Redirect to merged products view
    if (typeof window.switchView === 'function') {
      window.switchView('products');
    }
  }
});

// Backward compat: if loadInventory is called, delegate to loadProductsAndStock
async function loadInventory(storeId) {
  if (typeof window.loadProductsAndStock === 'function') {
    return window.loadProductsAndStock(storeId);
  }
}
window.loadInventory = loadInventory;

// Ensure adjustStockStep, promptSetQuantity, quickRestock, updateLowStockThreshold
// are available globally (they're defined in products.js now, but if this loads first, provide stubs)
if (typeof window.adjustStockStep !== 'function') {
  window.adjustStockStep = function() {
    console.warn('[Inventory] adjustStockStep called before products.js loaded');
  };
}
if (typeof window.promptSetQuantity !== 'function') {
  window.promptSetQuantity = function() {
    console.warn('[Inventory] promptSetQuantity called before products.js loaded');
  };
}
if (typeof window.quickRestock !== 'function') {
  window.quickRestock = function(productId, name, currentQty) {
    if (typeof window.switchView === 'function') window.switchView('products');
  };
}
if (typeof window.updateLowStockThreshold !== 'function') {
  window.updateLowStockThreshold = function() {
    console.warn('[Inventory] updateLowStockThreshold called before products.js loaded');
  };
}
