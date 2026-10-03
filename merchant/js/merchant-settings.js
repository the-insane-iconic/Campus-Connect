/**
 * UniMall Merchant Portal — Store Settings & Hours Controller (merchant/js/merchant-settings.js)
 * Allows merchants to configure their operational hours, registered campus location, and store profile.
 * Synchronized with Neon PostgreSQL unimall_stores.
 */

'use strict';

async function loadMerchantSettings() {
  const storeId = window.merchantStoreId;
  if (!storeId) return;

  try {
    let store = null;
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getStore === 'function') {
      store = await window.UniMallDB.getStore(storeId);
    }

    if (!store) return;

    // Populate form fields
    const nameInp = document.getElementById('setting-store-name');
    const catInp = document.getElementById('setting-store-category');
    const locInp = document.getElementById('setting-store-location');
    const phoneInp = document.getElementById('setting-store-phone');
    const descInp = document.getElementById('setting-store-desc');
    const openStatusInp = document.getElementById('setting-store-open-status');

    if (nameInp) nameInp.value = store.name || '';
    if (catInp) catInp.value = store.category || '';
    if (locInp) locInp.value = store.location || '';
    if (phoneInp) phoneInp.value = store.phone || '';
    if (descInp) descInp.value = store.description || '';
    if (openStatusInp) openStatusInp.checked = Boolean(store.is_open);

    setupSettingsFormOnce();

  } catch (err) {
    console.error('[Merchant Settings] Error loading settings:', err);
  }
}
window.loadMerchantSettings = loadMerchantSettings;

let settingsFormAttached = false;
function setupSettingsFormOnce() {
  if (settingsFormAttached) return;
  settingsFormAttached = true;

  const form = document.getElementById('merchant-settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const storeId = window.merchantStoreId;
      if (!storeId) return;

      const btn = document.getElementById('btn-save-settings');
      if (btn) btn.disabled = true;

      const name = document.getElementById('setting-store-name').value.trim();
      const category = document.getElementById('setting-store-category').value.trim();
      const location = document.getElementById('setting-store-location').value.trim();
      const phone = document.getElementById('setting-store-phone').value.trim();
      const description = document.getElementById('setting-store-desc').value.trim();
      const isOpen = document.getElementById('setting-store-open-status').checked;

      try {
        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
          await window.UniMallDB.neonSql(`
            UPDATE unimall_stores 
            SET name = $1, category = $2, location = $3, phone = $4, description = $5, is_open = $6
            WHERE id = $7
          `, [name, category, location, phone, description, isOpen, storeId]);
        }

        // Update local session headers
        const tbName = document.getElementById('tb-store-name');
        const tbCat = document.getElementById('tb-store-category');
        const sbName = document.getElementById('sidebar-store-name');
        if (tbName) tbName.textContent = name;
        if (tbCat) tbCat.textContent = category;
        if (sbName) sbName.textContent = name;

        if (typeof window.updateStoreOpenStatusUI === 'function') {
          window.updateStoreOpenStatusUI(isOpen);
        }

        alert('Store profile and campus location updated successfully!');

      } catch (err) {
        console.error('[Merchant Settings] Failed to save settings:', err);
        alert('Failed to update settings: ' + err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}
