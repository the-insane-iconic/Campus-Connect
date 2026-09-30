/* ═══════════════════════════════════════════════════════════
   UNIMALL — NEON MANAGED AUTHENTICATION (js/neon-auth.js)
   Powered by Neon Auth (Managed Better Auth & Google OAuth)
   ═══════════════════════════════════════════════════════════ */

'use strict';

(function() {
  const NEON_AUTH_URL = 'https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
  const NEON_JWKS_URL = 'https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json';
  const AUTH_KEY = 'unimall_auth';
  const STORAGE_KEY = 'unimall_v1';

  // Expose global endpoints in UNIMALL_CONFIG if present
  if (typeof window.UNIMALL_CONFIG !== 'undefined') {
    window.UNIMALL_CONFIG.NEON_AUTH_URL = NEON_AUTH_URL;
    window.UNIMALL_CONFIG.NEON_AUTH_JWKS_URL = NEON_JWKS_URL;
  }

  // Get SDK client if bundle loaded
  function getClient() {
    if (typeof window.NeonAuthSDK !== 'undefined' && window.NeonAuthSDK.authClient) {
      return window.NeonAuthSDK.authClient;
    }
    return null;
  }

  /**
   * Saves authenticated user session into UniMall local storage & AppState
   */
  function persistUserSession(user, session) {
    if (!user) return;
    const name = user.name || (user.email ? user.email.split('@')[0] : 'Campus Student');
    const email = user.email || 'student@university.edu';
    const avatar = (user.image && user.image.trim()) 
      ? user.image.trim() 
      : (typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar(name) : '');

    const userData = {
      uid: user.id || ('neon_user_' + Date.now()),
      name: name,
      email: email,
      avatar: avatar,
      hostel: user.hostel || 'Hostel B',
      room: user.room || 'Room 214',
      phone: user.phone || '',
      provider: 'google',
      isGuest: false,
      token: session ? (session.token || session.id) : null
    };

    // 1. Save auth flag
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
    } catch (e) {}

    // 2. Sync to unimall_v1
    try {
      let appData = {};
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) appData = JSON.parse(raw);
      appData.currentUser = {
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
        hostel: userData.hostel,
        room: userData.room,
        phone: userData.phone,
        provider: userData.provider,
        isGuest: userData.isGuest
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {}

    // 3. Sync to in-memory AppState
    if (typeof AppState !== 'undefined') {
      AppState.currentUser = {
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
        hostel: userData.hostel,
        room: userData.room,
        phone: userData.phone
      };
    }

    // 4. Dispatch event for live UI update
    window.dispatchEvent(new CustomEvent('unimall:auth_state_changed', { detail: userData }));
    console.log('[NeonAuth] Session synced for:', userData.name);
    return userData;
  }

  const UniMallAuth = {
    AUTH_URL: NEON_AUTH_URL,
    JWKS_URL: NEON_JWKS_URL,

    /**
     * Google Sign-In via Neon Auth
     */
    async signInWithGoogle(options = {}) {
      const returnUrl = options.callbackURL || (window.location.origin + '/index.html');
      const client = getClient();

      console.log('[NeonAuth] Initiating Google Sign-In via Neon Auth...', returnUrl);

      // Strategy 1: Use official @neondatabase/auth client if bundled
      if (client && client.signIn && typeof client.signIn.social === 'function') {
        try {
          const res = await client.signIn.social({
            provider: 'google',
            callbackURL: returnUrl
          });
          if (res && res.data && res.data.url) {
            window.location.href = res.data.url;
            return;
          }
        } catch (sdkErr) {
          console.warn('[NeonAuth] SDK signIn.social note, falling back to direct endpoint:', sdkErr.message);
        }
      }

      // Strategy 2: Direct Neon Auth /sign-in/social endpoint
      try {
        const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            provider: 'google',
            callbackURL: returnUrl
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            console.log('[NeonAuth] Redirecting to Google OAuth init URL:', data.url);
            window.location.href = data.url;
            return;
          }
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Neon Auth status ${res.status}`);
        }
      } catch (err) {
        console.error('[NeonAuth] Direct Google sign-in request failed:', err);
        throw err;
      }
    },

    /**
     * Get active session from Neon Auth or local cache
     */
    async getSession() {
      const client = getClient();
      if (client && typeof client.getSession === 'function') {
        try {
          const res = await client.getSession();
          if (res && res.data && res.data.session) {
            persistUserSession(res.data.user, res.data.session);
            return res.data;
          }
        } catch (e) {
          console.warn('[NeonAuth] client.getSession note:', e.message);
        }
      }

      // Direct REST fallback
      try {
        const verifier = new URLSearchParams(window.location.search).get('neon_auth_session_verifier');
        const fetchUrl = verifier 
          ? `${NEON_AUTH_URL}/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`
          : `${NEON_AUTH_URL}/get-session`;

        const res = await fetch(fetchUrl, {
          method: 'GET',
          headers: { 'Origin': window.location.origin },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.session && data.user) {
            persistUserSession(data.user, data.session);
            return data;
          }
        }
      } catch (e) {}

      // Fallback to local storage cached user
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (raw) return { user: JSON.parse(raw) };
      } catch (e) {}

      return null;
    },

    /**
     * Sign out current user
     */
    async signOut() {
      console.log('[NeonAuth] Signing out user...');
      const client = getClient();
      if (client && typeof client.signOut === 'function') {
        try {
          await client.signOut();
        } catch (e) {}
      }

      try {
        await fetch(`${NEON_AUTH_URL}/sign-out`, {
          method: 'POST',
          headers: { 'Origin': window.location.origin },
          credentials: 'include'
        }).catch(() => {});
      } catch (e) {}

      localStorage.removeItem(AUTH_KEY);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed.currentUser;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}

      window.location.href = 'login.html';
    },

    /**
     * Initializes session check on page load:
     * - Inspects URL for 'neon_auth_session_verifier' from Google OAuth redirect
     * - Exchanges verifier for session and user
     * - Cleans up URL parameters
     */
    async init() {
      const urlParams = new URLSearchParams(window.location.search);
      const verifier = urlParams.get('neon_auth_session_verifier');

      if (verifier) {
        console.log('[NeonAuth] Detected OAuth session verifier in URL, exchanging for session...');
        try {
          const sessionData = await this.getSession();
          if (sessionData && sessionData.user) {
            console.log('[NeonAuth] Successfully authenticated with Google via Neon Auth:', sessionData.user.name);
            // Clean up URL parameters cleanly
            urlParams.delete('neon_auth_session_verifier');
            urlParams.delete('neon_popup');
            urlParams.delete('neon_popup_callback');
            const cleanUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // If on login.html, navigate to index.html
            if (window.location.pathname.endsWith('login.html')) {
              window.location.href = 'index.html';
            }
          }
        } catch (err) {
          console.error('[NeonAuth] Error exchanging session verifier:', err);
        }
      } else {
        // Normal session check in background
        this.getSession().catch(() => {});
      }
    }
  };

  window.UniMallAuth = UniMallAuth;

  // Auto-run on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => UniMallAuth.init());
    } else {
      UniMallAuth.init();
    }
  }
})();
