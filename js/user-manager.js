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
          if (u && !u.isGuest && u.name) return u;
        }
      } catch (e) {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.currentUser) return parsed.currentUser;
        }
      } catch (e) {}
      return null;
    },

    async ensureGuestProfileAsync() {
      // Return existing named guest profile if active in current session
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed.currentUser;
          if (u && u.isGuest && u.name && /^Student \d+$/.test(u.name)) {
            const num = u.name.split(' ')[1] || '1';
            const guestId = u.id || u.uid || u.guestId || ('usr_guest_' + num);
            u.id = guestId;
            u.uid = guestId;
            u.guestId = guestId;
            u.email = u.email || `${guestId}@campusconnect.edu`;
            this._persist(u);
            if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
              window.UniMallDB.syncUser(u).catch(() => {});
            }
            return u;
          }
        }
      } catch (e) {}

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
        email:    `student${n}@campusconnect.edu`,
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
      // Return existing named guest profile
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed.currentUser;
          if (u && u.isGuest && u.name && /^Student \d+$/.test(u.name)) {
            const num = u.name.split(' ')[1] || '1';
            const guestId = u.id || u.uid || u.guestId || ('usr_guest_' + num);
            u.id = guestId;
            u.uid = guestId;
            u.guestId = guestId;
            u.email = u.email || `${guestId}@campusconnect.edu`;
            this._persist(u);
            if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
              window.UniMallDB.syncUser(u).catch(() => {});
            }
            return u;
          }
        }
      } catch (e) {}

      const n = _bumpCounter();
      const guestId = 'usr_guest_' + n;
      const guestUser = {
        id:       guestId,
        uid:      guestId,
        guestId:  guestId,
        name:     'Student ' + n,
        email:    `student${n}@campusconnect.edu`,
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
        const cleanUser = {
          id:       uid,
          uid:      uid,
          guestId:  uid,
          name:     userData.name,
          email:    userData.email     || `${uid}@campusconnect.edu`,
          avatar:   userData.avatar    || '',
          phone:    userData.phone     || '',
          hostel:   userData.hostel    || '',
          room:     userData.room      || '',
          isGuest:  Boolean(userData.isGuest),
          provider: userData.provider  || (userData.isGuest ? 'guest' : 'google')
        };

        let appData = {};
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) appData = JSON.parse(raw);
        appData.currentUser = cleanUser;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        localStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));
      } catch (e) {}
    },

    boot() {
      try {
        const authRaw = localStorage.getItem(AUTH_KEY);
        if (authRaw) {
          const u = JSON.parse(authRaw);
          if (u && !u.isGuest && u.name) {
            if (typeof AppState !== 'undefined') {
              AppState.currentUser = Object.assign({}, AppState.currentUser, u);
            }
            if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
              window.UniMallDB.syncUser(u).catch(() => {});
            }
            return u;
          }
        }
      } catch (e) {}

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          let u = parsed.currentUser;
          if (u) {
            // Fix legacy guest names not matching "Student N"
            if (u.isGuest && (!u.name || !/^Student \d+$/.test(u.name))) {
              const n = _bumpCounter();
              u.name = 'Student ' + n;
            }
            const num = (u.name || '').split(' ')[1] || '1';
            const guestId = u.id || u.uid || u.guestId || ('usr_guest_' + num);
            u.id = guestId;
            u.uid = guestId;
            u.guestId = guestId;
            u.email = u.email || `${guestId}@campusconnect.edu`;
            this._persist(u);

            if (typeof AppState !== 'undefined') {
              AppState.currentUser = Object.assign({}, AppState.currentUser, u);
            }
            if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
              window.UniMallDB.syncUser(u).catch(() => {});
            }
            return u;
          }
        }
      } catch (e) {}

      return null;
    }
  };

  window.UserManager = UserManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { UserManager.boot(); });
  } else {
    UserManager.boot();
  }
})();
