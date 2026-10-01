/**
 * UniMall Store Admin — Merged Products & Stock Controller (admin/js/products.js)
 * Single unified view combining product catalog + inventory management.
 * All data sourced from Neon PostgreSQL via API endpoints.
 */

'use strict';

let currentProducts = [];
let currentInventory = [];
let productFilterState = 'all';
let productSearchQuery = '';
let availableCategories = [];

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'products') {
    loadProductsAndStock(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-products') {
    loadProductsAndStock(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();

  // Search input
  const searchInput = document.getElementById('product-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        productSearchQuery = e.target.value.trim().toLowerCase();
        renderMergedTable();
      }, 250);
    });
  }

  // Stock filter pills
  document.querySelectorAll('.stock-filter-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stock-filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      productFilterState = btn.getAttribute('data-filter');
      renderMergedTable();
    });
  });

  // Open Add Product Modal buttons
  const btnAdd = document.getElementById('btn-open-add-product');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => openProductModal());
  }

  // Form submit for Add / Edit product
  const form = document.getElementById('product-modal-form');
  if (form) {
    form.addEventListener('submit', handleProductFormSubmit);
  }
});

async function loadCategories() {
  try {
    const data = await apiRequest('/categories');
    availableCategories = data.categories || [];

    const select = document.getElementById('pm-category');
    if (select) {
      select.innerHTML = availableCategories.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join('');
    }
  } catch (err) {
    console.warn('Failed to load categories:', err);
  }
}

/**
 * Load both products and inventory data, merge them by product_id
 */
async function loadProductsAndStock(storeId) {
  if (!storeId) return;

  const tbody = document.getElementById('products-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6">Loading products & stock...</td></tr>';
  }

  try {
    // Fetch products and inventory in parallel
    const [productsData, inventoryData] = await Promise.all([
      apiRequest(`/admin/stores/${storeId}/products?status=all`).catch(() => ({ products: [] })),
      apiRequest(`/admin/stores/${storeId}/inventory`).catch(() => ({ inventory: [] }))
    ]);

    currentProducts = productsData.products || [];
    currentInventory = inventoryData.inventory || [];

    // Update stock health chips
    updateStockHealthChips();

    // Render merged table
    renderMergedTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6" style="color: var(--danger);">Failed to load products: ${err.message}</td></tr>`;
    }
  }
}

function updateStockHealthChips() {
  // Calculate from merged data
  let outCount = 0;
  let lowCount = 0;

  currentProducts.forEach(p => {
    const inv = currentInventory.find(i => i.product_id === p.id);
    const stock = inv ? inv.quantity : (p.stock || 0);
    const threshold = inv ? inv.low_stock_threshold : (p.low_stock_threshold || 5);

    if (stock === 0) outCount++;
    else if (stock <= threshold) lowCount++;
  });

  const chipOut = document.getElementById('inv-chip-out');
  const chipLow = document.getElementById('inv-chip-low');
  if (chipOut) chipOut.textContent = `${outCount} Out of Stock`;
  if (chipLow) chipLow.textContent = `${lowCount} Low Stock`;

  // Also update sidebar counter
  const navCounter = document.getElementById('counter-low-stock');
  if (navCounter) {
    navCounter.textContent = outCount + lowCount;
  }
}

function renderMergedTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  // Merge products with inventory data
  let merged = currentProducts.map(p => {
    const inv = currentInventory.find(i => i.product_id === p.id) || {};
    const stock = inv.quantity !== undefined ? inv.quantity : (p.stock || 0);
    const threshold = inv.low_stock_threshold || p.low_stock_threshold || 5;
    const unit = inv.unit || p.unit || 'items';

    let availability = 'in_stock';
    if (p.is_active === 0) availability = 'inactive';
    else if (stock === 0) availability = 'out_of_stock';
    else if (stock <= threshold) availability = 'low_stock';

    return {
      ...p,
      stock,
      low_stock_threshold: threshold,
      unit,
      availability,
      product_id: p.id
    };
  });

  // Apply filter
  if (productFilterState !== 'all') {
    merged = merged.filter(p => p.availability === productFilterState);
  }

  // Apply search
  if (productSearchQuery) {
    merged = merged.filter(p =>
      (p.name || '').toLowerCase().includes(productSearchQuery) ||
      (p.sku || '').toLowerCase().includes(productSearchQuery) ||
      (p.category_name || '').toLowerCase().includes(productSearchQuery)
    );
  }

  if (merged.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6" style="color: var(--text-muted);">No products match your criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = merged.map(p => {
    const availLabel = {
      'in_stock': 'In Stock',
      'low_stock': 'Low Stock',
      'out_of_stock': 'Out of Stock',
      'inactive': 'Inactive'
    }[p.availability] || p.availability;

    const imgThumb = p.image_url
      ? `<img src="${escapeHtml(p.image_url)}" alt="" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0;" />`
      : `<div style="width: 36px; height: 36px; border-radius: 6px; background: var(--surface-alt); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">📦</div>`;

    return `
      <tr style="${p.is_active === 0 ? 'opacity: 0.6;' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${imgThumb}
            <div>
              <div style="font-weight: 600;">${escapeHtml(p.name)}</div>
              ${p.unit ? `<div style="font-size: 11.5px; color: var(--text-muted);">per ${escapeHtml(p.unit)}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span style="font-size: 12.5px; color: var(--text-muted);">${escapeHtml(p.category_name || p.category_id || '—')}</span></td>
        <td><code style="font-size: 11.5px; background: var(--surface-alt); padding: 2px 4px; border-radius: 4px;">${escapeHtml(p.sku || '—')}</code></td>
        <td>
          <button type="button" class="btn-price-quick" onclick="quickEditPrice('${p.id}', '${escapeHtml(p.name)}', ${p.price})"
                  title="Click to quickly update price"
                  style="background: transparent; border: 1px dashed var(--border); border-radius: 4px; padding: 2px 6px; font-weight: 700; color: var(--text-main); font-size: 13px; cursor: pointer;">
            ₹${Number(p.price).toFixed(2)} ✎
          </button>
        </td>
        <td>
          <strong id="qty-val-${p.id}" style="font-size: 15px; ${p.stock === 0 ? 'color: var(--danger);' : ''}">
            ${p.stock}
          </strong>
          <span style="font-size: 12px; color: var(--text-muted);"> ${p.unit || 'items'}</span>
        </td>
        <td>
          <div class="stepper-wrap">
            <button type="button" class="btn-step" onclick="adjustStockStep('${p.id}', -1)" title="Decrease stock">-</button>
            <span class="step-value" id="step-display-${p.id}">${p.stock}</span>
            <button type="button" class="btn-step" onclick="adjustStockStep('${p.id}', 1)" title="Increase stock">+</button>
          </div>
          <button type="button" class="btn-action secondary" onclick="promptSetQuantity('${p.id}', '${escapeHtml(p.name)}', ${p.stock})"
                  style="height: 28px; font-size: 11px; padding: 0 6px; margin-left: 6px;">
            Set
          </button>
        </td>
        <td>
          <input type="number" min="1" value="${p.low_stock_threshold}"
                 onchange="updateLowStockThreshold('${p.id}', this.value)"
                 style="width: 60px; height: 28px; padding: 2px 6px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12.5px;" />
        </td>
        <td><span class="pill-avail ${p.availability}" id="avail-pill-${p.id}">${availLabel}</span></td>
        <td>
          <input type="checkbox" class="ios-switch" ${p.is_active === 1 ? 'checked' : ''}
                 onchange="toggleProductActive('${p.id}', this.checked)" title="Toggle Active/Inactive" />
        </td>
        <td>
          <button type="button" class="btn-action secondary" onclick="openEditProductModal('${p.id}')" style="height: 28px; font-size: 11.5px; padding: 0 8px;">
            Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openProductModal(prod = null) {
  const modal = document.getElementById('modal-product-form');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-modal-form');

  if (!modal || !form) return;

  form.reset();

  if (prod) {
    title.textContent = 'Edit Product';
    document.getElementById('pm-product-id').value = prod.id;
    document.getElementById('pm-name').value = prod.name;
    document.getElementById('pm-price').value = prod.price;
    document.getElementById('pm-stock').value = prod.stock;
    document.getElementById('pm-category').value = prod.category_id || 'food';
    document.getElementById('pm-threshold').value = prod.low_stock_threshold || 5;
    document.getElementById('pm-sku').value = prod.sku || '';
    document.getElementById('pm-unit').value = prod.unit || 'item';
    document.getElementById('pm-image').value = prod.image_url || '';
    document.getElementById('pm-desc').value = prod.description || '';
  } else {
    title.textContent = 'Add New Product';
    document.getElementById('pm-product-id').value = '';
    document.getElementById('pm-stock').value = '20';
    document.getElementById('pm-threshold').value = '5';
    document.getElementById('pm-unit').value = 'item';
  }

  modal.classList.remove('hidden');
}
window.openProductModal = openProductModal;

function openEditProductModal(productId) {
  // Search in merged currentProducts which now has stock/threshold from inventory
  const prod = currentProducts.find(p => p.id === productId);
  if (prod) {
    // Enrich with inventory data
    const inv = currentInventory.find(i => i.product_id === productId) || {};
    const enriched = {
      ...prod,
      stock: inv.quantity !== undefined ? inv.quantity : (prod.stock || 0),
      low_stock_threshold: inv.low_stock_threshold || prod.low_stock_threshold || 5,
      unit: inv.unit || prod.unit || 'item'
    };
    openProductModal(enriched);
  }
}
window.openEditProductModal = openEditProductModal;

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const prodId = document.getElementById('pm-product-id').value;
  const isEditing = Boolean(prodId);

  const payload = {
    name: document.getElementById('pm-name').value.trim(),
    price: parseFloat(document.getElementById('pm-price').value),
    stock: parseInt(document.getElementById('pm-stock').value, 10),
    category_id: document.getElementById('pm-category').value,
    low_stock_threshold: parseInt(document.getElementById('pm-threshold').value, 10),
    sku: document.getElementById('pm-sku').value.trim(),
    unit: document.getElementById('pm-unit').value.trim() || 'item',
    image_url: document.getElementById('pm-image').value.trim(),
    description: document.getElementById('pm-desc').value.trim()
  };

  const btnSave = document.getElementById('btn-save-product');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';
  }

  try {
    if (isEditing) {
      await apiRequest(`/admin/products/${prodId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      // Also update inventory if stock changed
      await apiRequest(`/admin/inventory/${prodId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity: payload.stock,
          low_stock_threshold: payload.low_stock_threshold
        })
      });
      showToast(`Product "${payload.name}" updated.`, 'success');
    } else {
      await apiRequest(`/admin/stores/${activeStoreId}/products`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(`Product "${payload.name}" created.`, 'success');
    }

    const modal = document.getElementById('modal-product-form');
    if (modal) modal.classList.add('hidden');

    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch {
    // Handled
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = 'Save Product';
    }
  }
}

async function toggleProductActive(productId, isActive) {
  try {
    await apiRequest(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive ? 1 : 0 })
    });
    showToast(isActive ? 'Product activated for students' : 'Product deactivated (hidden from students)', 'success');
    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch {
    if (activeStoreId) loadProductsAndStock(activeStoreId);
  }
}
window.toggleProductActive = toggleProductActive;

async function quickEditPrice(productId, productName, currentPrice) {
  const input = prompt(`Update price for "${productName}" (current: ₹${currentPrice}):`, currentPrice);
  if (input === null) return;
  const newPrice = parseFloat(input);
  if (isNaN(newPrice) || newPrice < 0) {
    showToast('Invalid price entered.', 'error');
    return;
  }

  try {
    await apiRequest(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ price: newPrice })
    });
    showToast(`Price for "${productName}" updated to ₹${newPrice}`, 'success');
    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch (err) {
    showToast('Failed to update price.', 'error');
  }
}
window.quickEditPrice = quickEditPrice;

/**
 * ────────────────────────────────────────────────────────────────
 * STOCK MANAGEMENT (Merged from inventory.js)
 * ────────────────────────────────────────────────────────────────
 */
const debounceStockTimers = {};

function adjustStockStep(productId, delta) {
  // Find in both products and inventory
  const prod = currentProducts.find(p => p.id === productId);
  const inv = currentInventory.find(i => i.product_id === productId);
  
  const currentQty = inv ? inv.quantity : (prod ? prod.stock : 0);
  const threshold = inv ? inv.low_stock_threshold : (prod ? prod.low_stock_threshold : 5);
  const newQty = Math.max(0, currentQty + delta);

  // Update in-memory
  if (inv) inv.quantity = newQty;
  if (prod) prod.stock = newQty;

  // Immediate optimistic UI update
  const displayVal = document.getElementById(`step-display-${productId}`);
  const qtyVal = document.getElementById(`qty-val-${productId}`);
  const pill = document.getElementById(`avail-pill-${productId}`);

  if (displayVal) displayVal.textContent = newQty;
  if (qtyVal) {
    qtyVal.textContent = newQty;
    qtyVal.style.color = newQty === 0 ? 'var(--danger)' : '';
  }

  if (pill) {
    const isOut = newQty === 0;
    const isLow = !isOut && newQty <= threshold;
    pill.className = `pill-avail ${isOut ? 'out_of_stock' : (isLow ? 'low_stock' : 'in_stock')}`;
    pill.textContent = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');
  }

  // Update health chips
  updateStockHealthChips();

  // Debounced API mutation
  clearTimeout(debounceStockTimers[productId]);
  debounceStockTimers[productId] = setTimeout(async () => {
    try {
      await apiRequest(`/admin/inventory/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty })
      });
    } catch {
      // Revert if failed
      if (activeStoreId) loadProductsAndStock(activeStoreId);
    }
  }, 350);
}
window.adjustStockStep = adjustStockStep;

async function promptSetQuantity(productId, name, currentQty) {
  const input = prompt(`Enter new stock quantity for "${name}":`, currentQty);
  if (input === null) return;

  const newQty = parseInt(input, 10);
  if (isNaN(newQty) || newQty < 0) {
    showToast('Invalid quantity.', 'error');
    return;
  }

  try {
    const res = await apiRequest(`/admin/inventory/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQty })
    });
    showToast(res.message || `Stock set to ${newQty}.`, 'success');
    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch {
    // Handled
  }
}
window.promptSetQuantity = promptSetQuantity;

function quickRestock(productId, name, currentQty) {
  // Navigate to products view and prompt
  window.switchView('products');
  setTimeout(() => {
    promptSetQuantity(productId, name, currentQty);
  }, 150);
}
window.quickRestock = quickRestock;

async function updateLowStockThreshold(productId, threshold) {
  const t = parseInt(threshold, 10);
  if (isNaN(t) || t < 1) return;

  try {
    await apiRequest(`/admin/inventory/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ low_stock_threshold: t })
    });
    showToast('Threshold updated.', 'success');
    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch {
    // Handled
  }
}
window.updateLowStockThreshold = updateLowStockThreshold;

// Make loadProductsAndStock accessible globally (for inventory.js backward compat)
window.loadProductsAndStock = loadProductsAndStock;
