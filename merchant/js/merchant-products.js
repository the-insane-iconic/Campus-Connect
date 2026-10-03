/**
 * UniMall Merchant Portal — Product Catalog & Inventory Controller (merchant/js/merchant-products.js)
 * Enables merchants to manage items, pricing, stock availability, and rich descriptions.
 * Fully synchronized with Neon PostgreSQL.
 */

'use strict';

let merchantProducts = [];
let editingProductId = null;
let productSearchTerm = '';
let productStockFilter = 'all';

async function loadMerchantProducts() {
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  const container = document.getElementById('merchant-products-grid');
  if (container) container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 48px;"><div class="spinner"></div><p style="margin-top:12px; color:var(--text-muted);">Loading products from database…</p></div>`;

  try {
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getProducts === 'function') {
      merchantProducts = await window.UniMallDB.getProducts(storeId).catch(() => []);
    } else {
      merchantProducts = [];
    }

    renderMerchantProducts();
    setupProductEventListenersOnce();

  } catch (err) {
    console.error('[Merchant Products] Failed to load catalog:', err);
    if (container) container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#DC2626; padding: 32px;">Failed to load products: ${err.message}</div>`;
  }
}
window.loadMerchantProducts = loadMerchantProducts;

function renderMerchantProducts() {
  const container = document.getElementById('merchant-products-grid');
  const emptyState = document.getElementById('products-empty-state');
  if (!container) return;

  let filtered = merchantProducts.filter(p => {
    if (productStockFilter === 'in_stock' && !p.is_available) return false;
    if (productStockFilter === 'out_of_stock' && p.is_available) return false;
    if (productSearchTerm) {
      const q = productSearchTerm.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q) && !cat.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(p => {
    const isAvail = Boolean(p.is_available);
    const imgUrl = p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';
    const desc = p.description || 'No description provided yet.';
    const price = parseFloat(p.price || 0);

    return `
      <div class="product-card" data-product-id="${p.id}" style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm); display:flex; flex-direction:column;">
        <div style="position:relative; width:100%; height:150px; background:#F1F5F9; overflow:hidden;">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.name)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'" />
          <span style="position:absolute; top:10px; right:10px; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:${isAvail ? '#DCFCE7' : '#FEE2E2'}; color:${isAvail ? '#15803D' : '#B91C1C'};">
            ${isAvail ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        <div style="padding:16px; flex:1; display:flex; flex-direction:column;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:4px;">${escapeHtml(p.category || 'General')}</div>
          <h3 style="font-size:15px; font-weight:700; color:var(--text-main); margin:0 0 6px;">${escapeHtml(p.name)}</h3>
          <p class="merchant-product-desc-preview" title="${escapeHtml(desc)}">${escapeHtml(desc)}</p>
          
          <div style="margin-top:auto; padding-top:14px; border-top:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:16px; font-weight:800; color:var(--text-main);">₹${price.toLocaleString('en-IN')}</div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn-action secondary btn-sm" onclick="openEditProductModal('${p.id}')">Edit</button>
              <button type="button" class="btn-action ${isAvail ? 'warn' : 'success'} btn-sm" onclick="toggleProductStock('${p.id}', ${!isAvail})">
                ${isAvail ? 'Mark Out' : 'Mark In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleProductStock(productId, newStatus) {
  try {
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
      await window.UniMallDB.neonSql(
        `UPDATE unimall_products SET is_available = $1 WHERE id = $2`,
        [newStatus, productId]
      );
    }
    const item = merchantProducts.find(p => p.id === productId);
    if (item) item.is_available = newStatus;
    renderMerchantProducts();
  } catch (err) {
    console.error('[Merchant Products] Failed to toggle stock:', err);
    alert('Error updating stock: ' + err.message);
  }
}
window.toggleProductStock = toggleProductStock;

function openAddProductModal() {
  editingProductId = null;
  const modal = document.getElementById('modal-product-form');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-modal-form');
  if (!modal || !form) return;

  if (title) title.textContent = 'Add New Product';
  form.reset();
  document.getElementById('prod-input-id').value = '';
  modal.classList.remove('hidden');
}
window.openAddProductModal = openAddProductModal;

function openEditProductModal(productId) {
  const product = merchantProducts.find(p => p.id === productId);
  if (!product) return;
  editingProductId = productId;

  const modal = document.getElementById('modal-product-form');
  const title = document.getElementById('product-modal-title');
  if (!modal) return;

  if (title) title.textContent = 'Edit Product & Description';

  document.getElementById('prod-input-id').value = product.id;
  document.getElementById('prod-input-name').value = product.name || '';
  document.getElementById('prod-input-category').value = product.category || 'food';
  document.getElementById('prod-input-price').value = product.price || '';
  document.getElementById('prod-input-desc').value = product.description || '';
  document.getElementById('prod-input-image').value = product.image_url || '';
  document.getElementById('prod-input-avail').checked = Boolean(product.is_available);

  modal.classList.remove('hidden');
}
window.openEditProductModal = openEditProductModal;

function closeProductModal() {
  const modal = document.getElementById('modal-product-form');
  if (modal) modal.classList.add('hidden');
}
window.closeProductModal = closeProductModal;

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  const btn = document.getElementById('btn-save-product');
  if (btn) btn.disabled = true;

  const id = document.getElementById('prod-input-id').value;
  const name = document.getElementById('prod-input-name').value.trim();
  const category = document.getElementById('prod-input-category').value.trim();
  const price = parseFloat(document.getElementById('prod-input-price').value) || 0;
  const description = document.getElementById('prod-input-desc').value.trim();
  const imageUrl = document.getElementById('prod-input-image').value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';
  const isAvailable = document.getElementById('prod-input-avail').checked;

  try {
    if (id) {
      // Update existing product in Neon DB
      await window.UniMallDB.neonSql(`
        UPDATE unimall_products 
        SET name = $1, category = $2, price = $3, description = $4, image_url = $5, is_available = $6
        WHERE id = $7 AND store_id = $8
      `, [name, category, price, description, imageUrl, isAvailable, id, storeId]);

      const idx = merchantProducts.findIndex(p => p.id === id);
      if (idx !== -1) {
        merchantProducts[idx] = { ...merchantProducts[idx], name, category, price, description, image_url: imageUrl, is_available: isAvailable };
      }
    } else {
      // Create new product in Neon DB
      const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      await window.UniMallDB.neonSql(`
        INSERT INTO unimall_products (id, store_id, name, category, price, description, image_url, is_available)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [newId, storeId, name, category, price, description, imageUrl, isAvailable]);

      merchantProducts.unshift({
        id: newId,
        store_id: storeId,
        name,
        category,
        price,
        description,
        image_url: imageUrl,
        is_available: isAvailable
      });
    }

    closeProductModal();
    renderMerchantProducts();

  } catch (err) {
    console.error('[Merchant Products] Failed to save product to Neon DB:', err);
    alert('Failed to save product: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

let prodEventsAttached = false;
function setupProductEventListenersOnce() {
  if (prodEventsAttached) return;
  prodEventsAttached = true;

  const form = document.getElementById('product-modal-form');
  if (form) form.addEventListener('submit', handleProductFormSubmit);

  const searchInp = document.getElementById('products-search-input');
  if (searchInp) {
    searchInp.addEventListener('input', (e) => {
      productSearchTerm = e.target.value.trim();
      renderMerchantProducts();
    });
  }

  const stockFilter = document.getElementById('products-stock-select');
  if (stockFilter) {
    stockFilter.addEventListener('change', (e) => {
      productStockFilter = e.target.value;
      renderMerchantProducts();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
