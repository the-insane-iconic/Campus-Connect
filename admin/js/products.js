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
let activeProdImgCat = 'all';

const PRODUCT_IMAGE_PRESETS = [
  // Juice & Drinks
  { id: 'pip-j-mango', category: 'juice', name: 'Fresh Mango Shake', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-orange', category: 'juice', name: 'Fresh Orange Juice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-lime', category: 'juice', name: 'Sweet Lime / Mosambi', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-icedtea', category: 'juice', name: 'Lemon Iced Tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-coldbrew', category: 'juice', name: 'Cold Brew Coffee', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-melon', category: 'juice', name: 'Watermelon Juice', url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-berry', category: 'juice', name: 'Berry Smoothie', url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-j-coconut', category: 'juice', name: 'Coconut Water', url: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&auto=format&fit=crop&q=80' },

  // Food & Meals
  { id: 'pip-f-samosa', category: 'food', name: 'Crispy Samosa (2)', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-sand', category: 'food', name: 'Grilled Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-maggi', category: 'food', name: 'Masala Maggi', url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-burger', category: 'food', name: 'Veggie Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-fries', category: 'food', name: 'Peri Peri Fries', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-chai', category: 'food', name: 'Hot Masala Chai', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-roll', category: 'food', name: 'Paneer Kathi Roll', url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-f-chole', category: 'food', name: 'Chole Bhature Thali', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80' },

  // Bakery & Sweets
  { id: 'pip-b-croiss', category: 'bakery', name: 'Butter Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-b-muffin', category: 'bakery', name: 'Chocolate Muffin', url: 'https://images.unsplash.com/photo-1607958996333-41aef7caef4b?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-b-brownie', category: 'bakery', name: 'Fudge Brownie', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-b-pastry', category: 'bakery', name: 'Forest Pastry', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },

  // Stationery & Books
  { id: 'pip-s-notebook', category: 'stationery', name: 'Spiral Ruled Notebook', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-s-pens', category: 'stationery', name: 'Gel Pens Pack', url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-s-calc', category: 'stationery', name: 'Scientific Calculator', url: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-s-highl', category: 'stationery', name: 'Highlighters Set', url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=80' },

  // Electronics & Gadgets
  { id: 'pip-e-cable', category: 'electronics', name: 'USB-C Fast Cable', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-e-earbuds', category: 'electronics', name: 'Wireless Earbuds', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-e-power', category: 'electronics', name: '10000mAh Power Bank', url: 'https://images.unsplash.com/photo-1609592807664-8390b411d331?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-e-adapter', category: 'electronics', name: 'Dual Fast Charger', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80' },

  // Essentials & Packaged
  { id: 'pip-x-water', category: 'essentials', name: 'Mineral Water (1L)', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-x-chips', category: 'essentials', name: 'Potato Chips Pack', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-x-bar', category: 'essentials', name: 'Protein Energy Bar', url: 'https://images.unsplash.com/photo-1622484214149-68d7168d810a?w=400&auto=format&fit=crop&q=80' },
  { id: 'pip-x-ramen', category: 'essentials', name: 'Instant Cup Noodles', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80' }
];

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
  initProductImagePicker();
  initUnitPills();

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

    // Render low stock alerts and top products today panels (moved from dashboard)
    renderLowStockAlerts();
    renderTopProductsToday(storeId);

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
    const stock = inv ? (inv.quantity !== undefined ? inv.quantity : (p.stock || 0)) : (p.stock || 0);
    const threshold = inv ? (inv.low_stock_threshold || p.low_stock_threshold || 5) : (p.low_stock_threshold || 5);

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

  // Keep low stock panel in sync
  renderLowStockAlerts();
}

/**
 * Render Low Stock Alerts panel in Products & Stock view
 */
function renderLowStockAlerts() {
  const container = document.getElementById('products-low-stock-list');
  const badge = document.getElementById('products-low-stock-badge');
  if (!container) return;

  const lowStockItems = [];
  currentProducts.forEach(p => {
    const inv = currentInventory.find(i => i.product_id === p.id);
    const stock = inv ? (inv.quantity !== undefined ? inv.quantity : (p.stock || 0)) : (p.stock || 0);
    const threshold = inv ? (inv.low_stock_threshold || p.low_stock_threshold || 5) : (p.low_stock_threshold || 5);
    const unit = inv ? (inv.unit || p.unit || 'items') : (p.unit || 'items');

    if (stock <= threshold) {
      lowStockItems.push({
        id: p.id,
        name: p.name,
        stock,
        threshold,
        unit,
        price: p.price
      });
    }
  });

  // Sort lowest stock first
  lowStockItems.sort((a, b) => a.stock - b.stock);

  if (badge) {
    badge.textContent = `${lowStockItems.length} items`;
    badge.className = lowStockItems.length > 0 ? 'badge-status cancelled' : 'badge-status completed';
  }

  if (lowStockItems.length === 0) {
    container.innerHTML = '<div class="empty-state-sm" style="color:var(--success); padding:16px 0;">✅ All inventory items are healthy and in stock!</div>';
    return;
  }

  container.innerHTML = lowStockItems.slice(0, 6).map(item => {
    const isOut = item.stock === 0;
    const stockBadge = isOut
      ? `<span class="badge-status cancelled" style="font-size:11px; font-weight:700;">Out of Stock (0)</span>`
      : `<span class="badge-status cancelled" style="font-size:11px; font-weight:700;">${item.stock} left (≤ ${item.threshold})</span>`;

    const escapedName = safeEscapeHtml(item.name);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); gap:10px;">
        <div style="min-width:0; flex:1;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapedName}
          </div>
          <div style="margin-top:2px;">${stockBadge}</div>
        </div>
        <button type="button" class="btn-action secondary" onclick="window.promptSetQuantity('${item.id}', '${escapedName.replace(/'/g, "\\'")}', ${item.stock})" style="font-size:11.5px; padding:3px 9px; white-space:nowrap;">
          + Restock
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Render Top Products Today panel in Products & Stock view
 */
async function renderTopProductsToday(storeId) {
  const container = document.getElementById('products-top-products-list');
  const badge = document.getElementById('products-top-items-badge');
  if (!container) return;

  try {
    const res = await apiRequest(`/admin/stores/${storeId}/analytics?period=today`).catch(() => ({ top_products: [] }));
    const prods = res.top_products || [];

    if (badge) {
      badge.textContent = prods.length > 0 ? `${prods.length} Sold Today` : 'Live Sales';
    }

    if (prods.length === 0) {
      container.innerHTML = '<div class="empty-state-sm" style="padding:16px 0;">No sales recorded yet today. Live orders will populate top sellers here.</div>';
      return;
    }

    container.innerHTML = prods.slice(0, 6).map((p, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const qtySold = p.units_sold || p.total_units || p.quantity_sold || p.orders_count || 1;
      const sales = Math.round(p.total_sales || p.revenue || 0);

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); gap:10px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
            <span style="font-size:13px; font-weight:700; min-width:18px;">${medal}</span>
            <div style="min-width:0; flex:1;">
              <div style="font-weight:600; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${safeEscapeHtml(p.name)}
              </div>
              <div style="font-size:11px; color:var(--text-muted);">${qtySold} unit(s) sold today</div>
            </div>
          </div>
          <strong style="color:var(--primary); font-size:13.5px; white-space:nowrap;">₹${sales.toLocaleString('en-IN')}</strong>
        </div>
      `;
    }).join('');
  } catch (err) {
    if (container) {
      container.innerHTML = `<div class="empty-state-sm" style="padding:16px 0;">Could not load top products.</div>`;
    }
  }
}

function safeEscapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
      ? `<img src="${escapeHtml(p.image_url)}" alt="" onerror="this.onerror=null; this.outerHTML='<div style=\\\'width:36px;height:36px;border-radius:6px;background:var(--surface-alt);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;\\\'>📦</div>';" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0;" />`
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

/* ─────────────────────────────────────────────────────────
   PRODUCT IMAGE PICKER & GALLERY CONTROLLER
   ───────────────────────────────────────────────────────── */
function initProductImagePicker() {
  renderProductImagePresets();

  // Tab switching (gallery, upload, url)
  const tabGallery = document.getElementById('tab-prod-gallery');
  const tabUpload = document.getElementById('tab-prod-upload');
  const tabUrl = document.getElementById('tab-prod-url');

  const panelGallery = document.getElementById('prod-picker-gallery-panel');
  const panelUpload = document.getElementById('prod-picker-upload-panel');
  const panelUrl = document.getElementById('prod-picker-url-panel');

  const switchTab = (tabName) => {
    [tabGallery, tabUpload, tabUrl].forEach(t => t?.classList.remove('active'));
    if (tabName === 'gallery') tabGallery?.classList.add('active');
    if (tabName === 'upload') tabUpload?.classList.add('active');
    if (tabName === 'url') tabUrl?.classList.add('active');

    if (panelGallery) panelGallery.classList.toggle('hidden', tabName !== 'gallery');
    if (panelUpload) panelUpload.classList.toggle('hidden', tabName !== 'upload');
    if (panelUrl) panelUrl.classList.toggle('hidden', tabName !== 'url');
  };

  tabGallery?.addEventListener('click', () => switchTab('gallery'));
  tabUpload?.addEventListener('click', () => switchTab('upload'));
  tabUrl?.addEventListener('click', () => switchTab('url'));

  document.getElementById('btn-change-prod-img')?.addEventListener('click', () => {
    switchTab('gallery');
    document.getElementById('prod-preset-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Category dropdown change event -> dynamically filter image suggestions
  const catSelect = document.getElementById('pm-category');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      syncImageSuggestionsToCategory(catSelect.value, true);
    });
  }

  // Product name input -> dynamically search & suggest matching photos
  const nameInput = document.getElementById('pm-name');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      suggestImageFromName(e.target.value.trim());
    });
  }

  // Category filter chips
  const catChips = document.querySelectorAll('#prod-cat-filters .cover-filter-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeProdImgCat = chip.dataset.prodCat || 'all';
      renderProductImagePresets();
    });
  });

  // File upload via phone/device
  const fileInput = document.getElementById('prod-file-input');
  const btnBrowse = document.getElementById('btn-browse-prod-file');
  const dropZone = document.getElementById('prod-picker-upload-panel');

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleProductFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleProductFile(e.target.files[0]);
      }
    });
  }

  // Manual image URL input
  const manualInput = document.getElementById('pm-manual-image-url');
  if (manualInput) {
    manualInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      setProductActiveImage(url, 'Custom Image Link', 'External Link');
    });
  }
}

function syncImageSuggestionsToCategory(categoryVal, autoSelectFirst = false, specificPresetCat = null) {
  let targetPresetCat = specificPresetCat;
  if (!targetPresetCat) {
    if (categoryVal === 'stationery') targetPresetCat = 'stationery';
    else if (categoryVal === 'electronics') targetPresetCat = 'electronics';
    else if (categoryVal === 'essentials') targetPresetCat = 'essentials';
    else if (categoryVal === 'bakery') targetPresetCat = 'bakery';
    else if (categoryVal === 'juice') targetPresetCat = 'juice';
    else if (categoryVal === 'food') {
      const activeStore = currentAuthorizedStores.find(s => s.store_id === activeStoreId);
      const storeNameLower = (activeStore ? activeStore.store_name : '').toLowerCase();
      if (storeNameLower.includes('juice') || storeNameLower.includes('shake')) targetPresetCat = 'juice';
      else if (storeNameLower.includes('bakery') || storeNameLower.includes('cafe')) targetPresetCat = 'bakery';
      else targetPresetCat = 'food';
    } else {
      targetPresetCat = 'all';
    }
  }

  activeProdImgCat = targetPresetCat;

  // Sync category filter chips UI
  const catChips = document.querySelectorAll('#prod-cat-filters .cover-filter-chip');
  catChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.prodCat === targetPresetCat);
  });

  // Update hint text
  const hintEl = document.getElementById('pm-category-sync-hint');
  if (hintEl) {
    const labelMap = {
      'food': 'Food & Snacks',
      'juice': 'Juices & Beverages',
      'bakery': 'Bakery & Cafe',
      'stationery': 'Stationery & Books',
      'electronics': 'Electronics & Tech',
      'essentials': 'Daily Essentials',
      'all': 'All Campus Items'
    };
    hintEl.textContent = `Suggestions match ${labelMap[targetPresetCat] || 'chosen Category'}`;
  }

  renderProductImagePresets();

  if (autoSelectFirst) {
    const matching = PRODUCT_IMAGE_PRESETS.filter(p => targetPresetCat === 'all' || p.category === targetPresetCat);
    if (matching.length > 0) {
      setProductActiveImage(matching[0].url, matching[0].name, 'Suggested Photo');
    }
  }
}

let nameSuggestTimer = null;
function suggestImageFromName(term) {
  clearTimeout(nameSuggestTimer);
  nameSuggestTimer = setTimeout(() => {
    if (!term || term.length < 2) {
      const catVal = document.getElementById('pm-category')?.value || 'food';
      syncImageSuggestionsToCategory(catVal, false);
      return;
    }

    const t = term.toLowerCase();
    const matched = PRODUCT_IMAGE_PRESETS.filter(p => {
      const pName = p.name.toLowerCase();
      return pName.includes(t) ||
             p.category.toLowerCase().includes(t) ||
             (t.includes('chai') && p.id.includes('chai')) ||
             (t.includes('tea') && (p.id.includes('tea') || p.id.includes('chai'))) ||
             (t.includes('coffee') && (p.id.includes('coldbrew') || p.id.includes('sand'))) ||
             (t.includes('shake') && p.id.includes('mango')) ||
             (t.includes('juice') && p.category === 'juice') ||
             (t.includes('samosa') && p.id.includes('samosa')) ||
             (t.includes('maggi') && p.id.includes('maggi')) ||
             (t.includes('noodle') && p.id.includes('maggi')) ||
             (t.includes('burger') && p.id.includes('burger')) ||
             (t.includes('notebook') && p.id.includes('notebook')) ||
             (t.includes('pen') && p.id.includes('pen')) ||
             (t.includes('calc') && p.id.includes('calc')) ||
             (t.includes('cable') && p.id.includes('cable')) ||
             (t.includes('charger') && p.id.includes('adapter')) ||
             (t.includes('water') && p.id.includes('water')) ||
             (t.includes('chips') && p.id.includes('chips'));
    });

    if (matched.length > 0) {
      setProductActiveImage(matched[0].url, matched[0].name, 'Suggested Match');
      renderProductImagePresets(matched);
      const hintEl = document.getElementById('pm-category-sync-hint');
      if (hintEl) hintEl.textContent = `Found ${matched.length} matching photos for "${term}"`;
    }
  }, 220);
}

function handleProductFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid photo.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawData = e.target.result;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 480;
      let w = img.width;
      let h = img.height;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round(h * (maxDim / w));
          w = maxDim;
        } else {
          w = Math.round(w * (maxDim / h));
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedData = canvas.toDataURL('image/jpeg', 0.85);

      setProductActiveImage(compressedData, file.name.slice(0, 24) || 'Uploaded Photo', 'Device Photo');
      showToast('Photo uploaded & attached to product!', 'success');
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

function renderProductImagePresets(customList = null) {
  const grid = document.getElementById('prod-preset-grid');
  if (!grid) return;

  const currentVal = (document.getElementById('pm-image')?.value || '').trim();

  const list = customList || PRODUCT_IMAGE_PRESETS.filter(p => {
    if (activeProdImgCat === 'all') return true;
    return p.category === activeProdImgCat;
  });

  grid.innerHTML = list.map(preset => {
    const isSelected = (preset.url === currentVal);
    return `
      <div class="prod-img-item ${isSelected ? 'selected' : ''}"
           data-id="${preset.id}"
           data-url="${preset.url}"
           data-name="${safeEscapeHtml(preset.name)}"
           title="Click to select ${safeEscapeHtml(preset.name)}">
        <img src="${preset.url}" alt="${safeEscapeHtml(preset.name)}" loading="lazy" />
        <div class="prod-img-name-chip">${safeEscapeHtml(preset.name)}</div>
        <div class="prod-img-check">✓</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.prod-img-item').forEach(item => {
    item.addEventListener('click', () => {
      grid.querySelectorAll('.prod-img-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      const url = item.dataset.url;
      const name = item.dataset.name;
      setProductActiveImage(url, name, 'Preset Photo');
    });
  });
}

function setProductActiveImage(url, name = 'Selected Product Photo', tag = 'Preset Photo') {
  const hiddenInput = document.getElementById('pm-image');
  const previewImg = document.getElementById('pm-active-img-preview');
  const nameLabel = document.getElementById('pm-active-img-name');
  const tagLabel = document.getElementById('pm-selected-source-tag');
  const manualInput = document.getElementById('pm-manual-image-url');

  if (hiddenInput) hiddenInput.value = url;
  if (previewImg) {
    previewImg.src = url || 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80';
    previewImg.onerror = () => {
      previewImg.src = 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80';
    };
  }
  if (nameLabel) nameLabel.textContent = name;
  if (tagLabel) tagLabel.textContent = tag;

  if (manualInput && url && !url.startsWith('data:')) {
    manualInput.value = url;
  }
}

/* ─────────────────────────────────────────────────────────
   QUICK UNIT PILLS
   ───────────────────────────────────────────────────────── */
function initUnitPills() {
  const input = document.getElementById('pm-unit');
  const pills = document.querySelectorAll('#unit-pill-group .unit-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (input) input.value = pill.dataset.unit;
    });
  });

  if (input) {
    input.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      pills.forEach(p => p.classList.toggle('active', p.dataset.unit === val));
    });
  }
}

function selectUnitPill(unitVal) {
  const input = document.getElementById('pm-unit');
  const pills = document.querySelectorAll('#unit-pill-group .unit-pill');
  const val = (unitVal || 'item').toLowerCase().trim();

  if (input) input.value = val;
  pills.forEach(p => p.classList.toggle('active', p.dataset.unit === val));
}

/* ─────────────────────────────────────────────────────────
   OPEN MODAL (ADD / EDIT PRODUCT)
   ───────────────────────────────────────────────────────── */
function openProductModal(prod = null) {
  const modal = document.getElementById('modal-product-form');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-modal-form');

  if (!modal || !form) return;

  form.reset();

  // Determine intelligent category & image presets based on store profile
  const activeStore = currentAuthorizedStores.find(s => s.store_id === activeStoreId);
  const storeNameLower = (activeStore ? activeStore.store_name : '').toLowerCase();
  const isJuiceStore = storeNameLower.includes('juice') || storeNameLower.includes('shake') || storeNameLower.includes('beverage');
  const isBakeryStore = storeNameLower.includes('bakery') || storeNameLower.includes('cafe');
  const isStationeryStore = storeNameLower.includes('book') || storeNameLower.includes('stationery');
  const isTechStore = storeNameLower.includes('tech') || storeNameLower.includes('electronic');

  if (prod) {
    title.textContent = 'Edit Product';
    document.getElementById('pm-product-id').value = prod.id;
    document.getElementById('pm-name').value = prod.name;
    document.getElementById('pm-price').value = prod.price;
    document.getElementById('pm-stock').value = prod.stock;
    document.getElementById('pm-category').value = prod.category_id || 'food';
    document.getElementById('pm-threshold').value = prod.low_stock_threshold || 5;
    document.getElementById('pm-sku').value = prod.sku || '';
    document.getElementById('pm-desc').value = prod.description || '';

    selectUnitPill(prod.unit || 'item');

    const prodImg = prod.image_url || prod.image || '';
    const preset = PRODUCT_IMAGE_PRESETS.find(p => p.url === prodImg);
    if (preset) {
      setProductActiveImage(preset.url, preset.name, 'Preset Photo');
    } else if (prodImg) {
      setProductActiveImage(prodImg, prod.name, prodImg.startsWith('data:') ? 'Uploaded Photo' : 'Custom Image');
    } else {
      setProductActiveImage(PRODUCT_IMAGE_PRESETS[0].url, PRODUCT_IMAGE_PRESETS[0].name, 'Preset Photo');
    }
    syncImageSuggestionsToCategory(prod.category_id || 'food', false);
  } else {
    title.textContent = 'Add New Product';
    document.getElementById('pm-product-id').value = '';
    // Clear prefilled values so merchant starts clean with placeholders
    document.getElementById('pm-name').value = '';
    document.getElementById('pm-price').value = '';
    document.getElementById('pm-stock').value = '';
    document.getElementById('pm-threshold').value = '5';
    document.getElementById('pm-desc').value = '';

    // Auto-generate clean SKU
    const prefix = isStationeryStore ? 'STN' : isTechStore ? 'TCH' : isBakeryStore ? 'BAK' : isJuiceStore ? 'JUC' : 'PRD';
    document.getElementById('pm-sku').value = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Set default category & unit based on store type
    let initialCat = 'food';
    let initialPresetCat = 'food';
    if (isStationeryStore) {
      initialCat = 'stationery';
      initialPresetCat = 'stationery';
      selectUnitPill('piece');
    } else if (isTechStore) {
      initialCat = 'electronics';
      initialPresetCat = 'electronics';
      selectUnitPill('piece');
    } else if (isJuiceStore) {
      initialCat = 'food';
      initialPresetCat = 'juice';
      selectUnitPill('glass');
    } else if (isBakeryStore) {
      initialCat = 'food';
      initialPresetCat = 'bakery';
      selectUnitPill('item');
    } else {
      initialCat = 'food';
      initialPresetCat = 'food';
      selectUnitPill('item');
    }

    document.getElementById('pm-category').value = initialCat;
    syncImageSuggestionsToCategory(initialCat, true, initialPresetCat);
  }

  modal.classList.remove('hidden');

  // Focus product name
  setTimeout(() => {
    document.getElementById('pm-name')?.focus();
  }, 100);
}
window.openProductModal = openProductModal;

function openEditProductModal(productId) {
  const prod = currentProducts.find(p => p.id === productId);
  if (prod) {
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

/* ─────────────────────────────────────────────────────────
   HANDLE PRODUCT FORM SUBMIT (PERMANENT DB PERSISTENCE)
   ───────────────────────────────────────────────────────── */
async function handleProductFormSubmit(e) {
  e.preventDefault();
  const prodId = document.getElementById('pm-product-id').value;
  const isEditing = Boolean(prodId);

  const nameVal = document.getElementById('pm-name').value.trim();
  const priceVal = parseFloat(document.getElementById('pm-price').value);

  if (!nameVal) {
    showToast('Please enter a product name.', 'error');
    document.getElementById('pm-name')?.focus();
    return;
  }

  if (isNaN(priceVal) || priceVal <= 0) {
    showToast('Please enter a valid selling price greater than ₹0.', 'error');
    document.getElementById('pm-price')?.focus();
    return;
  }

  const imageVal = (document.getElementById('pm-image')?.value || '').trim() || PRODUCT_IMAGE_PRESETS[0].url;

  const payload = {
    name: nameVal,
    price: priceVal,
    stock: parseInt(document.getElementById('pm-stock').value, 10) || 0,
    category_id: document.getElementById('pm-category').value || 'food',
    low_stock_threshold: parseInt(document.getElementById('pm-threshold').value, 10) || 5,
    sku: document.getElementById('pm-sku').value.trim() || `PRD-${Date.now().toString().slice(-4)}`,
    unit: document.getElementById('pm-unit').value.trim() || 'item',
    image_url: imageVal,
    image: imageVal,
    description: document.getElementById('pm-desc').value.trim()
  };

  const btnSave = document.getElementById('btn-save-product');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = 'Saving to Database...';
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
      showToast(`Product "${payload.name}" updated permanently in database!`, 'success');
    } else {
      await apiRequest(`/admin/stores/${activeStoreId}/products`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(`Product "${payload.name}" created and saved to database!`, 'success');
    }

    const modal = document.getElementById('modal-product-form');
    if (modal) modal.classList.add('hidden');

    if (activeStoreId) loadProductsAndStock(activeStoreId);
  } catch (err) {
    showToast(`Error saving product: ${err.message}`, 'error');
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
