/* ═══════════════════════════════════════════════════════════
   UniMall · js/storage.js
   Thin localStorage wrapper. All persistence goes through here
   so switching to a real backend only requires changing this file.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'unimall_v1';

const Storage = {
  /** Load persisted state slices. Returns plain object or {}. */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[storage] Failed to parse saved state — starting fresh.');
      return {};
    }
  },

  /** Persist only the mutable slices we care about. */
  save(state) {
    try {
      const existing = this.load();
      const toSave = {
        ...existing,
        cart:         state.cart !== undefined ? state.cart : (existing.cart || []),
        orders:       (Array.isArray(state.orders) && state.orders.length > 0) ? state.orders : (existing.orders || []),
        currentUser:  state.currentUser || existing.currentUser,
        itemRequests: state.itemRequests !== undefined ? state.itemRequests : (existing.itemRequests || []),
        notifications: state.notifications !== undefined ? state.notifications : (existing.notifications || []),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[storage] Failed to save state:', e);
    }
  },

  /** Wipe everything (e.g. on logout). */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
