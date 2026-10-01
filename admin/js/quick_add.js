/**
 * UniMall Store Admin — Quick Add & CSV Import Controller (admin/js/quick_add.js)
 * High-velocity product onboarding tool for UniMall founder.
 */

'use strict';

let quickRowIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  const btnQuickAdd = document.getElementById('btn-open-quick-add');
  if (btnQuickAdd) btnQuickAdd.addEventListener('click', openQuickAddModal);

  // Tab switching inside Quick Add modal
  const tabGrid = document.getElementById('tab-quick-grid');
  const tabCsv = document.getElementById('tab-quick-csv');
  const secGrid = document.getElementById('quick-grid-section');
  const secCsv = document.getElementById('quick-csv-section');

  if (tabGrid && tabCsv && secGrid && secCsv) {
    tabGrid.addEventListener('click', () => {
      tabGrid.classList.add('active');
      tabCsv.classList.remove('active');
      secGrid.classList.remove('hidden');
      secCsv.classList.add('hidden');
    });

    tabCsv.addEventListener('click', () => {
      tabCsv.classList.add('active');
      tabGrid.classList.remove('active');
      secCsv.classList.remove('hidden');
      secGrid.classList.add('hidden');
    });
  }

  // Add row button
  const btnAddRow = document.getElementById('btn-add-quick-row');
  if (btnAddRow) btnAddRow.addEventListener('click', () => addQuickRow());

  // Save All Quick Products
  const btnSaveAll = document.getElementById('btn-save-all-quick');
  if (btnSaveAll) btnSaveAll.addEventListener('click', handleSaveAllQuickRows);

  // CSV Import Button
  const btnProcessCsv = document.getElementById('btn-process-csv');
  if (btnProcessCsv) btnProcessCsv.addEventListener('click', handleProcessCsv);

  // CSV File Input Handler
  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const pasteArea = document.getElementById('csv-paste-area');
        if (pasteArea) pasteArea.value = text;
      };
      reader.readAsText(file);
    });
  }
});

function openQuickAddModal() {
  const modal = document.getElementById('modal-quick-add');
  if (!modal) return;

  const tbody = document.getElementById('quick-entry-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    quickRowIndex = 0;
    // Add 4 initial blank rows for speedy entry
    for (let i = 0; i < 4; i++) {
      addQuickRow();
    }
  }

  modal.classList.remove('hidden');
}
window.openQuickAddModal = openQuickAddModal;

function addQuickRow(item = {}) {
  const tbody = document.getElementById('quick-entry-tbody');
  if (!tbody) return;

  quickRowIndex++;
  const rowId = `qr_${quickRowIndex}`;

  const catOptions = (availableCategories || [
    { id: 'food', name: 'Food & Drinks' },
    { id: 'stationery', name: 'Stationery' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'essentials', name: 'Essentials' },
    { id: 'more', name: 'More' }
  ]).map(c => `
    <option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.name}</option>
  `).join('');

  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.innerHTML = `
    <td>
      <input type="text" class="qr-name" placeholder="e.g. Lays Magic Masala" value="${escapeHtml(item.name || '')}" required />
    </td>
    <td style="width: 110px;">
      <input type="number" class="qr-price" min="0" step="0.5" placeholder="20" value="${item.price || ''}" required />
    </td>
    <td style="width: 100px;">
      <input type="number" class="qr-stock" min="0" step="1" placeholder="30" value="${item.stock || '30'}" required />
    </td>
    <td style="width: 140px;">
      <select class="qr-category" style="width: 100%; height: 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12.5px;">
        ${catOptions}
      </select>
    </td>
    <td style="width: 110px;">
      <input type="text" class="qr-sku" placeholder="SKU" value="${escapeHtml(item.sku || '')}" />
    </td>
    <td style="width: 40px; text-align: center;">
      <button type="button" onclick="removeQuickRow('${rowId}')" style="background:none; border:none; color: var(--danger); font-size: 16px; cursor: pointer;" title="Delete row">✕</button>
    </td>
  `;

  tbody.appendChild(tr);

  // Focus the first input of the newly added row
  const firstInput = tr.querySelector('.qr-name');
  if (firstInput && !item.name) firstInput.focus();
}

function removeQuickRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}
window.removeQuickRow = removeQuickRow;

async function handleSaveAllQuickRows() {
  const rows = document.querySelectorAll('#quick-entry-tbody tr');
  const products = [];

  rows.forEach(r => {
    const name = r.querySelector('.qr-name').value.trim();
    const priceStr = r.querySelector('.qr-price').value.trim();
    const stockStr = r.querySelector('.qr-stock').value.trim();
    const category_id = r.querySelector('.qr-category').value;
    const sku = r.querySelector('.qr-sku').value.trim();

    if (name && priceStr) {
      products.push({
        name,
        price: parseFloat(priceStr),
        stock: parseInt(stockStr || '0', 10),
        category_id,
        sku
      });
    }
  });

  if (products.length === 0) {
    showToast('Please enter at least one product with name and price.', 'error');
    return;
  }

  const btnSave = document.getElementById('btn-save-all-quick');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = 'Saving products...';
  }

  try {
    const res = await apiRequest(`/admin/stores/${activeStoreId}/products/bulk`, {
      method: 'POST',
      body: JSON.stringify({ products })
    });

    showToast(res.message || `Successfully added ${res.created_count} products.`, 'success');

    const modal = document.getElementById('modal-quick-add');
    if (modal) modal.classList.add('hidden');

    if (activeStoreId && typeof loadProductsAndStock === 'function') loadProductsAndStock(activeStoreId);
  } catch {
    // Handled
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = 'Save All Products';
    }
  }
}

async function handleProcessCsv() {
  const pasteArea = document.getElementById('csv-paste-area');
  const text = pasteArea ? pasteArea.value.trim() : '';

  if (!text) {
    showToast('Please paste CSV rows or upload a .csv file first.', 'error');
    return;
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const products = [];

  lines.forEach((line) => {
    // Basic CSV parser handling commas
    const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 2) {
      const name = parts[0];
      const price = parseFloat(parts[1]);
      const stock = parts[2] ? parseInt(parts[2], 10) : 20;
      const category_id = parts[3] || 'more';
      const sku = parts[4] || '';

      if (name && !isNaN(price)) {
        products.push({ name, price, stock, category_id, sku });
      }
    }
  });

  if (products.length === 0) {
    showToast('Could not parse any valid product rows from CSV. Format: name, price, stock, category, sku', 'error');
    return;
  }

  const btn = document.getElementById('btn-process-csv');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Importing...';
  }

  try {
    const res = await apiRequest(`/admin/stores/${activeStoreId}/products/bulk`, {
      method: 'POST',
      body: JSON.stringify({ products })
    });

    showToast(res.message || `Imported ${res.created_count} products from CSV!`, 'success');

    const modal = document.getElementById('modal-quick-add');
    if (modal) modal.classList.add('hidden');

    if (activeStoreId && typeof loadProductsAndStock === 'function') loadProductsAndStock(activeStoreId);
  } catch {
    // Handled
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Import CSV Products';
    }
  }
}
