/**
 * UniMall Store Admin — Store Profile & Hours Settings (admin/js/store_settings.js)
 * Enhanced with interactive Store Cover Gallery, Device Upload, and Quick Hours Presets.
 */

'use strict';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const STORE_COVER_PRESETS = [
  // Juice & Smoothies
  {
    id: 'cov-juice-1',
    category: 'juice',
    label: 'Fresh Orange & Citrus',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-juice-2',
    category: 'juice',
    label: 'Cold Pressed Juice Bar',
    url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-juice-3',
    category: 'juice',
    label: 'Berry Smoothies & Shakes',
    url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-juice-4',
    category: 'juice',
    label: 'Tropical Fruit Bar',
    url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=900&auto=format&fit=crop&q=80'
  },

  // Bakery & Cafe
  {
    id: 'cov-bakery-1',
    category: 'bakery',
    label: 'Campus Bakery & Cafe',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-bakery-2',
    category: 'bakery',
    label: 'Artisan Pastries & Bread',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-bakery-3',
    category: 'bakery',
    label: 'Espresso & Coffee House',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop&q=80'
  },

  // Food & Canteen
  {
    id: 'cov-food-1',
    category: 'food',
    label: 'Canteen Burgers & Bites',
    url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-food-2',
    category: 'food',
    label: 'Crispy Pizza & Fast Food',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-food-3',
    category: 'food',
    label: 'Street Food & Snacks',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=900&auto=format&fit=crop&q=80'
  },

  // Books & Stationery
  {
    id: 'cov-stat-1',
    category: 'stationery',
    label: 'Stationery Hub & Bookstore',
    url: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-stat-2',
    category: 'stationery',
    label: 'Academic Wing & Supplies',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=900&auto=format&fit=crop&q=80'
  },

  // Tech & Electronics
  {
    id: 'cov-tech-1',
    category: 'electronics',
    label: 'TechStop Electronics',
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-tech-2',
    category: 'electronics',
    label: 'Audio & Device Peripherals',
    url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80'
  },

  // Mart & Groceries
  {
    id: 'cov-mart-1',
    category: 'mart',
    label: 'Campus Mart & Essentials',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=900&auto=format&fit=crop&q=80'
  },
  {
    id: 'cov-mart-2',
    category: 'mart',
    label: 'Late Night Snack Corner',
    url: 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=900&auto=format&fit=crop&q=80'
  }
];

let activeCoverFilter = 'all';

window.addEventListener('unimall:viewChanged', (e) => {
  if (e.detail.viewName === 'store') {
    loadStoreSettings(e.detail.storeId);
  }
});

window.addEventListener('unimall:storeChanged', (e) => {
  const currentActiveView = document.querySelector('.admin-view.active');
  if (currentActiveView && currentActiveView.id === 'view-store') {
    loadStoreSettings(e.detail.storeId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('store-settings-form');
  if (form) {
    form.addEventListener('submit', handleStoreSettingsSubmit);
  }

  initCoverPicker();
  initHoursPresets();

  // Live status toggle button inside Store & Hours settings
  const btnSettingsToggle = document.getElementById('btn-settings-toggle-open');
  if (btnSettingsToggle) {
    btnSettingsToggle.addEventListener('click', () => {
      const topbarToggle = document.getElementById('btn-store-status-toggle');
      if (topbarToggle) topbarToggle.click();
    });
  }

  // React to status changes across the app
  window.addEventListener('unimall:storeStatusChanged', (e) => {
    if (e.detail.storeId === activeStoreId) {
      updateSettingsStatusBanner(e.detail.isOpen);
    }
  });

  // Name and category inputs live update preview banner
  const nameInput = document.getElementById('setting-store-name');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      const el = document.getElementById('preview-cover-store-name');
      if (el) el.textContent = e.target.value.trim() || 'Store Name';
    });
  }

  const catInput = document.getElementById('setting-store-cat');
  if (catInput) {
    catInput.addEventListener('input', (e) => {
      const el = document.getElementById('preview-cover-cat-badge');
      if (el) el.textContent = e.target.value.trim() ? (e.target.value.trim() + ' Store') : 'Storefront Cover';
    });
  }
});

/* ─────────────────────────────────────────────────────────
   COVER IMAGE PICKER & GALLERY CONTROLLER
   ───────────────────────────────────────────────────────── */
function initCoverPicker() {
  renderCoverPresets();

  // Tab switching
  const tabs = document.querySelectorAll('.picker-source-tabs .picker-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      const source = btn.dataset.source;
      const secGallery = document.getElementById('cover-section-gallery');
      const secUpload = document.getElementById('cover-section-upload');
      const secUrl = document.getElementById('cover-section-url');

      if (secGallery) secGallery.classList.toggle('hidden', source !== 'gallery');
      if (secUpload) secUpload.classList.toggle('hidden', source !== 'upload');
      if (secUrl) secUrl.classList.toggle('hidden', source !== 'url');
    });
  });

  // Category filters
  const catBtns = document.querySelectorAll('#cover-cat-filters .cover-filter-chip');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCoverFilter = btn.dataset.coverCat || 'all';
      renderCoverPresets();
    });
  });

  // Device file upload
  const fileInput = document.getElementById('cover-file-input');
  const btnBrowse = document.getElementById('btn-browse-cover');
  const dropZone = document.getElementById('cover-section-upload');

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener('click', () => fileInput.click());
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
      if (e.target !== btnBrowse) fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleCoverFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCoverFile(e.target.files[0]);
      }
    });
  }

  // Manual URL input
  const manualInput = document.getElementById('cover-manual-url');
  if (manualInput) {
    manualInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      setStoreCoverImage(url, 'Custom URL');
    });
  }
}

function handleCoverFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawData = e.target.result;
    // Resize image client-side via canvas to ~960x540 to guarantee fast DB queries and smooth sync
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 960;
      const maxH = 540;
      let w = img.width;
      let h = img.height;

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedData = canvas.toDataURL('image/jpeg', 0.85);

      setStoreCoverImage(compressedData, 'Uploaded Photo');
      showToast('Store cover uploaded from device!', 'success');
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

function renderCoverPresets() {
  const grid = document.getElementById('cover-gallery-grid');
  if (!grid) return;

  const currentVal = (document.getElementById('setting-store-image')?.value || '').trim();

  const filtered = STORE_COVER_PRESETS.filter(p => {
    if (activeCoverFilter === 'all') return true;
    return p.category === activeCoverFilter;
  });

  grid.innerHTML = filtered.map(preset => {
    const isSelected = (preset.url === currentVal);
    return `
      <div class="cover-thumb-card ${isSelected ? 'selected' : ''}" 
           data-id="${preset.id}" 
           data-url="${preset.url}" 
           data-label="${safeEscapeHtml(preset.label)}"
           title="Click to select ${safeEscapeHtml(preset.label)}">
        <img src="${preset.url}" alt="${safeEscapeHtml(preset.label)}" loading="lazy" />
        <div class="cover-thumb-label">${safeEscapeHtml(preset.label)}</div>
        <div class="cover-thumb-check">✓</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.cover-thumb-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.cover-thumb-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const url = card.dataset.url;
      const label = card.dataset.label;
      setStoreCoverImage(url, label);
    });
  });
}

function setStoreCoverImage(url, label = 'Storefront Cover') {
  const hiddenInput = document.getElementById('setting-store-image');
  const previewImg = document.getElementById('store-cover-preview-img');
  const manualInput = document.getElementById('cover-manual-url');

  if (hiddenInput) hiddenInput.value = url;
  if (previewImg) {
    if (url) {
      previewImg.src = url;
      previewImg.onerror = () => {
        previewImg.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80';
      };
    } else {
      previewImg.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80';
    }
  }

  if (manualInput && url && !url.startsWith('data:')) {
    manualInput.value = url;
  }
}

function initHoursPresets() {
  const btnStd = document.getElementById('btn-hours-standard');
  const btnExt = document.getElementById('btn-hours-extended');

  if (btnStd) {
    btnStd.addEventListener('click', () => {
      DAYS_OF_WEEK.forEach(day => {
        const row = document.getElementById(`day-row-${day}`);
        if (row) {
          const chk = row.querySelector('.hr-closed');
          const openIn = row.querySelector('.hr-open');
          const closeIn = row.querySelector('.hr-close');
          if (chk) { chk.checked = false; toggleDayClosed(day, false); }
          if (openIn) openIn.value = '09:00';
          if (closeIn) closeIn.value = '21:00';
        }
      });
      showToast('Applied Standard Hours (9:00 AM – 9:00 PM) to all days.', 'info');
    });
  }

  if (btnExt) {
    btnExt.addEventListener('click', () => {
      DAYS_OF_WEEK.forEach(day => {
        const row = document.getElementById(`day-row-${day}`);
        if (row) {
          const chk = row.querySelector('.hr-closed');
          const openIn = row.querySelector('.hr-open');
          const closeIn = row.querySelector('.hr-close');
          if (chk) { chk.checked = false; toggleDayClosed(day, false); }
          if (openIn) openIn.value = '08:00';
          if (closeIn) closeIn.value = '22:00';
        }
      });
      showToast('Applied Extended Hours (8:00 AM – 10:00 PM) to all days.', 'info');
    });
  }
}

function updateSettingsStatusBanner(isOpen) {
  const heading = document.getElementById('settings-status-heading');
  const indicator = document.getElementById('settings-status-indicator');
  const btn = document.getElementById('btn-settings-toggle-open');
  const card = document.querySelector('.store-live-status-card');

  if (heading && indicator && btn) {
    if (isOpen) {
      heading.textContent = 'Store is Online & Accepting Orders';
      indicator.style.background = '#16A34A';
      btn.textContent = '⏸ Pause Store (Go Offline)';
      btn.className = 'btn-action secondary';
      if (card) card.classList.remove('offline');
    } else {
      heading.textContent = 'Store is Paused & Offline (Not Accepting Orders)';
      indicator.style.background = '#DC2626';
      btn.textContent = '▶ Open Store (Accept Orders)';
      btn.className = 'btn-action primary';
      if (card) card.classList.add('offline');
    }
  }
}

async function loadStoreSettings(storeId) {
  if (!storeId) return;

  try {
    const data = await apiRequest(`/admin/stores/${storeId}`);
    const store = data.store;

    updateSettingsStatusBanner(store.is_open === 1);

    document.getElementById('setting-store-name').value = store.name || '';
    document.getElementById('setting-store-cat').value = store.category || '';
    document.getElementById('setting-store-location').value = store.location || '';
    document.getElementById('setting-store-phone').value = store.phone || '';
    document.getElementById('setting-store-desc').value = store.description || '';

    // Update banner preview badges
    const previewStoreName = document.getElementById('preview-cover-store-name');
    const previewCoverCat = document.getElementById('preview-cover-cat-badge');
    if (previewStoreName) previewStoreName.textContent = store.name || 'Store Name';
    if (previewCoverCat) previewCoverCat.textContent = store.category ? (store.category + ' Store') : 'Storefront Cover';

    // Set cover image
    const coverUrl = store.cover_image || store.image_url || '';
    setStoreCoverImage(coverUrl);
    renderCoverPresets();

    document.getElementById('setting-accepts-delivery').checked = store.accepts_delivery === 1;
    document.getElementById('setting-accepts-pickup').checked = store.accepts_pickup === 1;

    // Render Weekly Hours
    renderHoursEditor(store.hours || {});

  } catch (err) {
    showToast(`Failed to load store settings: ${err.message}`, 'error');
  }
}

function renderHoursEditor(hoursObj) {
  const container = document.getElementById('hours-editor-container');
  if (!container) return;

  const headerHtml = `
    <div class="day-row-header">
      <span>Day</span>
      <span>Opening</span>
      <span>Closing</span>
      <span>Closed?</span>
    </div>
  `;

  const rowsHtml = DAYS_OF_WEEK.map(day => {
    const d = hoursObj[day] || { open: '09:00', close: '21:00', closed: false };
    const isClosed = Boolean(d.closed);

    return `
      <div class="day-row" id="day-row-${day}">
        <div class="day-name">${day}</div>
        <div>
          <input type="time" class="hr-open" value="${d.open || '09:00'}" ${isClosed ? 'disabled' : ''} aria-label="${day} opening time" />
        </div>
        <div>
          <input type="time" class="hr-close" value="${d.close || '21:00'}" ${isClosed ? 'disabled' : ''} aria-label="${day} closing time" />
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <input type="checkbox" class="hr-closed" id="chk-closed-${day}" ${isClosed ? 'checked' : ''}
                 onchange="toggleDayClosed('${day}', this.checked)" />
          <label for="chk-closed-${day}" style="font-size: 11.5px; color: var(--text-muted); cursor: pointer;">Closed</label>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = headerHtml + rowsHtml;
}

function toggleDayClosed(day, isClosed) {
  const row = document.getElementById(`day-row-${day}`);
  if (!row) return;

  const openInput = row.querySelector('.hr-open');
  const closeInput = row.querySelector('.hr-close');

  if (openInput) openInput.disabled = isClosed;
  if (closeInput) closeInput.disabled = isClosed;
}
window.toggleDayClosed = toggleDayClosed;

async function handleStoreSettingsSubmit(e) {
  e.preventDefault();
  if (!activeStoreId) return;

  const hoursJson = {};
  DAYS_OF_WEEK.forEach(day => {
    const row = document.getElementById(`day-row-${day}`);
    if (row) {
      const isClosed = row.querySelector('.hr-closed').checked;
      const openTime = row.querySelector('.hr-open').value;
      const closeTime = row.querySelector('.hr-close').value;
      hoursJson[day] = {
        open: openTime,
        close: closeTime,
        closed: isClosed
      };
    }
  });

  const rawImg = document.getElementById('setting-store-image')?.value || '';

  const payload = {
    name: document.getElementById('setting-store-name').value.trim(),
    category: document.getElementById('setting-store-cat').value.trim(),
    location: document.getElementById('setting-store-location').value.trim(),
    phone: document.getElementById('setting-store-phone').value.trim(),
    description: document.getElementById('setting-store-desc').value.trim(),
    image_url: rawImg.trim(),
    cover_image: rawImg.trim(),
    accepts_delivery: document.getElementById('setting-accepts-delivery').checked ? 1 : 0,
    accepts_pickup: document.getElementById('setting-accepts-pickup').checked ? 1 : 0,
    hours_json: hoursJson
  };

  const btnSave = document.getElementById('btn-save-store');
  const saveButtons = document.querySelectorAll('button[form="store-settings-form"]');
  saveButtons.forEach(b => {
    b.disabled = true;
    b.textContent = 'Saving to Database...';
  });

  try {
    await apiRequest(`/admin/stores/${activeStoreId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    showToast('Store profile & hours saved permanently to database!', 'success');

    // Update active store name in context
    const current = currentAuthorizedStores.find(s => s.store_id === activeStoreId);
    if (current) current.store_name = payload.name;
    updateStoreDisplay();

  } catch (err) {
    showToast(`Error saving store: ${err.message}`, 'error');
  } finally {
    saveButtons.forEach(b => {
      b.disabled = false;
      b.textContent = 'Save Changes';
    });
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
