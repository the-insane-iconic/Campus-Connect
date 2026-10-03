/* ═══════════════════════════════════════════════════════════
   Campus Connect — USER PROFILE MANAGER (js/user-manager.js)
   Enforces strict two-profile system:
     1. Google Auth profile → name from Google
     2. Guest profile       → "Student N" (N = global sequential counter)
   ═══════════════════════════════════════════════════════════ */

'use strict';

(function () {
  const GUEST_COUNTER_KEY = 'cc_guest_counter';
  const AUTH_KEY          = 'unimall_auth';
  const STORAGE_KEY       = 'unimall_v1';

  function _readCounter() {
    try { return parseInt(localStorage.getItem(GUEST_COUNTER_KEY) || '0', 10) || 0; }
    catch (e) { return 0; }
  }

  function _bumpCounter() {
    const next = _readCounter() + 1;
    try { localStorage.setItem(GUEST_COUNTER_KEY, String(next)); } catch (e) {}
    return next;
  }

  const UserManager = {

    getActiveUser() {
      try {
        const authRaw = localStorage.getItem(AUTH_KEY);
        if (authRaw) {
          const u = JSON.parse(authRaw);
          if (u && u.name) return u;
        }
      } catch (e) {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.currentUser && parsed.currentUser.name) return parsed.currentUser;
        }
      } catch (e) {}
      return null;
    },

    async ensureGuestProfileAsync() {
      // Return existing profile if already active in current session
      const existing = this.getActiveUser();
      if (existing && existing.name) {
        this._persist(existing);
        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
          window.UniMallDB.syncUser(existing).catch(() => {});
        }
        return existing;
      }

      // Query authoritative Neon database for next global sequential student number
      let n = 1;
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getNextGuestNumber === 'function') {
        try {
          n = await window.UniMallDB.getNextGuestNumber();
        } catch (e) {
          n = _bumpCounter();
        }
      } else {
        n = _bumpCounter();
      }

      const guestId = 'usr_guest_' + n;
      const guestUser = {
        id:       guestId,
        uid:      guestId,
        guestId:  guestId,
        name:     'Student ' + n,
        email:    `student${n}@campus.edu`,
        avatar:   '',
        phone:    '',
        hostel:   '',
        room:     '',
        isGuest:  true,
        provider: 'guest'
      };
      this._persist(guestUser);

      // Instantly sync guest profile to authoritative Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
        await window.UniMallDB.syncUser(guestUser).catch(() => {});
      }

      return guestUser;
    },

    ensureGuestProfile() {
      // Return existing profile if already active
      const existing = this.getActiveUser();
      if (existing && existing.name) {
        this._persist(existing);
        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
          window.UniMallDB.syncUser(existing).catch(() => {});
        }
        return existing;
      }

      const n = _bumpCounter();
      const guestId = 'usr_guest_' + n;
      const guestUser = {
        id:       guestId,
        uid:      guestId,
        guestId:  guestId,
        name:     'Student ' + n,
        email:    `student${n}@campus.edu`,
        avatar:   '',
        phone:    '',
        hostel:   '',
        room:     '',
        isGuest:  true,
        provider: 'guest'
      };
      this._persist(guestUser);

      // Instantly sync guest profile to authoritative Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
        window.UniMallDB.syncUser(guestUser).catch(() => {});
      }

      return guestUser;
    },

    setGoogleProfile(googleUser) {
      const name   = googleUser.name || googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'Campus Student');
      const email  = googleUser.email || '';
      const avatar = googleUser.photoURL || googleUser.image || googleUser.avatar || '';

      let existing = {};
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (raw) existing = JSON.parse(raw);
      } catch (e) {}

      const uid = googleUser.uid || googleUser.id || ('google_' + Date.now());
      const userData = {
        id:       uid,
        uid:      uid,
        guestId:  uid,
        name,
        email,
        avatar,
        phone:    googleUser.phone  || existing.phone  || '',
        hostel:   googleUser.hostel || existing.hostel || '',
        room:     googleUser.room   || existing.room   || '',
        isGuest:  false,
        provider: 'google',
        token:    googleUser.token || null
      };

      try { localStorage.setItem(AUTH_KEY, JSON.stringify(userData)); } catch (e) {}
      this._persist(userData);

      // Seamless Guest-to-Google Order Linking: associate previous in-flight orders with verified account
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const appData = JSON.parse(raw);
          if (Array.isArray(appData.orders)) {
            appData.orders.forEach(o => {
              if (o && (!o.user_id || String(o.user_id).startsWith('usr_guest_'))) {
                o.user_id = uid;
                o.userName = name;
              }
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
          }
        }
      } catch (e) {}

      if (typeof AppState !== 'undefined') {
        AppState.currentUser = Object.assign({}, AppState.currentUser, userData);
      }

      // Sync Google profile to Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
        window.UniMallDB.syncUser(userData).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: userData }));
      console.log('[UserManager] Google profile set:', name);
      return userData;
    },

    clearSession() {
      try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
      try { localStorage.removeItem('userMode'); } catch (e) {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed.currentUser;
          // CRITICAL: Clear session orders and cart so next guest profile starts 100% clean and isolated
          parsed.orders = [];
          parsed.cart = [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}

      if (typeof AppState !== 'undefined') {
        AppState.currentUser = { name: '', email: '', avatar: '', phone: '', hostel: '', room: '', isGuest: true, provider: 'guest' };
        AppState.orders = [];
        AppState.cart = [];
      }
      if (typeof OrdersState !== 'undefined') {
        OrdersState.orders = [];
      }

      window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: null }));
    },

    _persist(userData) {
      try {
        const uid = userData.id || userData.uid || userData.guestId;
        let email = userData.email;
        if (userData.isGuest) {
          const numMatch = (userData.name || '').match(/\d+/);
          const num = numMatch ? numMatch[0] : (String(uid).replace(/\D/g, '') || '1');
          if (!email || email.includes('campusconnect.edu') || email.startsWith('usr_guest_') || email === 'student@campus.edu') {
            email = `student${num}@campus.edu`;
          }
        } else if (!email) {
          email = `${uid}@campus.edu`;
        }

        const cleanUser = {
          id:          uid,
          uid:         uid,
          guestId:     uid,
          name:        userData.name,
          email:       email,
          avatar:      userData.avatar || userData.avatar_url || '',
          avatar_url:  userData.avatar_url || userData.avatar || '',
          phone:       userData.phone  || '',
          hostel:      userData.hostel || '',
          room:        userData.room   || '',
          preferences: userData.preferences || { orderNotifications: true, promotionalAlerts: true, language: 'en', soundFx: true },
          isGuest:     Boolean(userData.isGuest),
          provider:    userData.provider || (userData.isGuest ? 'guest' : 'google')
        };

        let appData = {};
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) appData = JSON.parse(raw);
        appData.currentUser = cleanUser;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        localStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));
      } catch (e) {}
    },

    updateProfile(updatedData) {
      if (!updatedData) return null;
      let active = this.getActiveUser() || {};
      const merged = { ...active, ...updatedData };
      this._persist(merged);
      if (typeof AppState !== 'undefined') {
        AppState.currentUser = Object.assign({}, AppState.currentUser, merged);
      }
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
        window.UniMallDB.syncUser(merged).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: merged }));
      return merged;
    },

    boot() {
      const active = this.getActiveUser();
      if (active && active.name) {
        if (typeof AppState !== 'undefined') {
          AppState.currentUser = Object.assign({}, AppState.currentUser, active);
        }
        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
          window.UniMallDB.syncUser(active).catch(() => {});
        }
        return active;
      }
      return null;
    }
  };

  window.UserManager = UserManager;

  // Instant Cross-Tab Sync: keeps all tabs and windows synchronized with zero flicker
  window.addEventListener('storage', function(e) {
    if (e.key === AUTH_KEY || e.key === STORAGE_KEY) {
      const user = UserManager.getActiveUser();
      if (user) {
        if (typeof AppState !== 'undefined') {
          AppState.currentUser = Object.assign({}, AppState.currentUser, user);
        }
        window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: user }));
      }
    }
  });

  // Re-verify on window focus/tab switch so UI never displays outdated state
  window.addEventListener('focus', function() {
    const user = UserManager.getActiveUser();
    if (user && typeof AppState !== 'undefined' && AppState.currentUser?.name !== user.name) {
      AppState.currentUser = Object.assign({}, AppState.currentUser, user);
      window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: user }));
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { UserManager.boot(); });
  } else {
    UserManager.boot();
  }
})();
