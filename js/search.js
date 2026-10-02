/* ═══════════════════════════════════════════════════════════
   UniMall · js/search.js
   Search bar wiring. Writes to AppState.ui, triggers renderHome().
   Depends on: state.js, views.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

function initSearch() {
  const input    = document.getElementById('main-search');
  const scanBtn  = document.getElementById('scan-btn');
  const clearBtn = document.getElementById('clear-search-btn');
  if (!input) return;

  const updateClearBtn = () => {
    if (clearBtn) {
      if (input.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
        clearBtn.style.display = 'flex';
      } else {
        clearBtn.classList.add('hidden');
        clearBtn.style.display = 'none';
      }
    }
  };

  let _timer = null;

  input.addEventListener('input', () => {
    updateClearBtn();
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      setState({ ui: { searchQuery: input.value.trim(), selectedCategoryId: null } });
      renderHome();
    }, 240);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      updateClearBtn();
      setState({ ui: { searchQuery: '', selectedCategoryId: null } });
      renderHome();
      input.focus();
    });
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      updateClearBtn();
      setState({ ui: { searchQuery: '', selectedCategoryId: null, activeFilters: [] } });
      renderHome();
      input.blur();
    }
  });

  // Desktop shortcut: / or Ctrl+K focuses search
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // Scan button — stub
  scanBtn?.addEventListener('click', () => {
    showToast('Scan feature coming soon');
  });
}
