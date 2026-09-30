/**
 * UniMall Store Admin — Products Controller (admin/js/products.js)
 */

'use strict';

let currentProducts = [];
let productFilterState = 'all';
let productSearchQuery = '';
let availableCategories = [];

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'products') {
    loadProducts(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-products') {
    loadProducts(e.detail.storeId);
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
        productSearchQuery = e.target.value.trim();
        if (activeStoreId) loadProducts(activeStoreId);
      }, 250);
    });
  }

  // Stock filter pills
  document.querySelectorAll('.stock-filter-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stock-filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      productFilterState = btn.getAttribute('data-filter');
      if (activeStoreId) loadProducts(activeStoreId);
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

async function loadProducts(storeId) {
  if (!storeId) return;

  const tbody = document.getElementById('products-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6">Loading catalog...</td></tr>';
  }

  try {
    let url = `/admin/stores/${storeId}/products?status=${productFilterState}`;
    if (productSearchQuery) {
      url += `&search=${encodeURIComponent(productSearchQuery)}`;
    }

    const data = await apiRequest(url);
    currentProducts = data.products || [];
    renderProductsTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6" style="color: var(--danger);">Failed to load products: ${err.message}</td></tr>`;
    }
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (currentProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6" style="color: var(--text-muted);">No products match your criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = currentProducts.map(p => {
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
          <span style="font-weight: 700; ${p.stock === 0 ? 'color: var(--danger);' : ''}">${p.stock}</span>
        </td>
        <td><span class="pill-avail ${p.availability}">${availLabel}</span></td>
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
  const prod = currentProducts.find(p => p.id === productId);
  if (prod) openProductModal(prod);
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

    if (activeStoreId) loadProducts(activeStoreId);
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
    if (activeStoreId) loadProducts(activeStoreId);
  } catch {
    if (activeStoreId) loadProducts(activeStoreId);
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
    if (activeStoreId) loadProducts(activeStoreId);
  } catch (err) {
    showToast('Failed to update price.', 'error');
  }
}
window.quickEditPrice = quickEditPrice;
