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

    ensureGuestProfile() {
      // Return existing named guest profile
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed.currentUser;
          if (u && u.isGuest && u.name && /^Student \d+$/.test(u.name)) {
            return u;
          }
        }
      } catch (e) {}

      const n = _bumpCounter();
      const guestUser = {
        name:     'Student ' + n,
        email:    '',
        avatar:   '',
        phone:    '',
        hostel:   '',
        room:     '',
        isGuest:  true,
        provider: 'guest',
        guestId:  'guest_' + n + '_' + Date.now()
      };
      this._persist(guestUser);
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

      const userData = {
        uid:      googleUser.uid || googleUser.id || ('google_' + Date.now()),
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

      if (typeof AppState !== 'undefined') {
        AppState.currentUser = Object.assign({}, AppState.currentUser, userData);
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}

      if (typeof AppState !== 'undefined') {
        AppState.currentUser = { name: '', email: '', avatar: '', phone: '', hostel: '', room: '', isGuest: true, provider: 'guest' };
      }
    },

    _persist(userData) {
      try {
        let appData = {};
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) appData = JSON.parse(raw);
        appData.currentUser = {
          name:     userData.name,
          email:    userData.email     || '',
          avatar:   userData.avatar    || '',
          phone:    userData.phone     || '',
          hostel:   userData.hostel    || '',
          room:     userData.room      || '',
          isGuest:  userData.isGuest,
          provider: userData.provider  || (userData.isGuest ? 'guest' : 'google'),
          guestId:  userData.guestId   || undefined
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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
              this._persist(u);
            }
            if (typeof AppState !== 'undefined') {
              AppState.currentUser = Object.assign({}, AppState.currentUser, u);
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
