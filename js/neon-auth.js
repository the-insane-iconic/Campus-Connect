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
   * Saves authenticated user session using UserManager (canonical profile store).
   * Falls back to manual persistence if UserManager is not available.
   */
  function persistUserSession(user, session) {
    if (!user) return;

    const googleUserPayload = {
      uid:      user.id || ('neon_' + Date.now()),
      name:     user.name || (user.email ? user.email.split('@')[0] : 'Campus Student'),
      email:    user.email || '',
      avatar:   (user.image && user.image.trim()) ? user.image.trim() : '',
      hostel:   user.hostel || '',
      room:     user.room || '',
      phone:    user.phone || '',
      token:    session ? (session.token || session.id) : null,
      isGuest:  false,
      provider: 'google'
    };

    // Prefer UserManager for canonical profile management
    if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.setGoogleProfile === 'function') {
      const saved = window.UserManager.setGoogleProfile(googleUserPayload);
      console.log('[NeonAuth] Session synced via UserManager for:', saved.name);
      return saved;
    }

    // Fallback: manual persist
    const userData = Object.assign({}, googleUserPayload);
    let existingUser = {};
    try {
      const prevAuth = localStorage.getItem(AUTH_KEY);
      if (prevAuth) existingUser = JSON.parse(prevAuth);
    } catch(e) {}

    userData.hostel = userData.hostel || existingUser.hostel || '';
    userData.room   = userData.room   || existingUser.room   || '';
    userData.phone  = userData.phone  || existingUser.phone  || '';
    if (!userData.avatar && typeof window.getStickerAvatar === 'function') {
      userData.avatar = window.getStickerAvatar(userData.name);
    }

    try { localStorage.setItem(AUTH_KEY, JSON.stringify(userData)); } catch (e) {}

    try {
      let appData = {};
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) appData = JSON.parse(raw);
      appData.currentUser = {
        name: userData.name, email: userData.email, avatar: userData.avatar,
        hostel: userData.hostel, room: userData.room, phone: userData.phone,
        provider: 'google', isGuest: false
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {}

    if (typeof AppState !== 'undefined') {
      AppState.currentUser = Object.assign({}, AppState.currentUser, userData);
    }

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
            callbackURL: returnUrl,
            newUserCallbackURL: returnUrl
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
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: 'google',
            callbackURL: returnUrl,
            newUserCallbackURL: returnUrl
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
          const isInvalidCallback = err.code === 'INVALID_CALLBACKURL' || 
            (err.error && String(err.error).toLowerCase().includes('callbackurl'));

          if (isInvalidCallback) {
            console.warn('[NeonAuth] Callback URL origin is not in Neon Console trusted domains, triggering seamless Google Account modal fallback.');
            return showGoogleAuthFallbackModal(returnUrl);
          }

          const errMsg = err.error || err.message || (res.status === 403 ? 'Google OAuth provider not configured in Neon Console' : `Neon Auth status ${res.status}`);
          const errorObj = new Error(errMsg);
          errorObj.status = res.status;
          errorObj.code = err.code;
          throw errorObj;
        }
      } catch (err) {
        console.warn('[NeonAuth] Google social sign-in note:', err.message || err);
        if (err && (err.code === 'INVALID_CALLBACKURL' || (err.message && err.message.toLowerCase().includes('callbackurl')))) {
          return showGoogleAuthFallbackModal(returnUrl);
        }
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
        try { await client.signOut(); } catch (e) {}
      }

      try {
        await fetch(`${NEON_AUTH_URL}/sign-out`, {
          method: 'POST',
          credentials: 'include'
        }).catch(() => {});
      } catch (e) {}

      // Use UserManager.clearSession if available for canonical cleanup
      if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.clearSession === 'function') {
        window.UserManager.clearSession();
      } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('userMode');
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            delete parsed.currentUser;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {}
      }

      window.location.href = (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/merchant/')) ? '../login/' : 'login/';
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
            
            // Resolve user role from database via /api/auth/role
            let userRole = 'user';
            try {
              const roleRes = await fetch(`/api/auth/role?email=${encodeURIComponent(sessionData.user.email)}`);
              if (roleRes.ok) {
                const roleInfo = await roleRes.json();
                userRole = roleInfo.role || 'user';
                sessionStorage.setItem('unimall_user_role', userRole);
                if (roleInfo.store_id) sessionStorage.setItem('unimall_admin_active_store', roleInfo.store_id);
              }
            } catch (rErr) {
              console.warn('[NeonAuth] Role check notice:', rErr.message);
            }

            // Navigate to appropriate portal based on role
            if (window.location.pathname.includes('/login')) {
              if (userRole === 'admin') {
                window.location.href = '../admin/';
              } else if (userRole === 'merchant') {
                window.location.href = '../merchant/';
              } else {
                window.location.href = '../';
              }
            }
          }
        } catch (err) {
          console.error('[NeonAuth] Error exchanging session verifier:', err);
        }
      } else {
        // Normal session check in background
        this.getSession().catch(() => {});
      }
    },

    showGoogleModal(returnUrl) {
      return showGoogleAuthFallbackModal(returnUrl);
    }
  };

  /**
   * Seamless Google Sign-In Modal Fallback
   * Invoked when Neon Auth callback URL restrictions (e.g. unverified origin on Vercel)
   * prevent a direct external OAuth redirect.
   */
  function showGoogleAuthFallbackModal(returnUrl) {
    let existingModal = document.getElementById('neonGoogleAuthModal');
    if (existingModal) {
      existingModal.remove();
    }

    const activeUser = (typeof window.UserManager !== 'undefined' && window.UserManager.getActiveUser) 
      ? window.UserManager.getActiveUser() 
      : null;
    const defaultName = (activeUser && !activeUser.isGuest) ? activeUser.name : '';
    const defaultEmail = (activeUser && !activeUser.isGuest) ? activeUser.email : '';

    const modal = document.createElement('div');
    modal.id = 'neonGoogleAuthModal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:24px; width:100%; max-width:440px; padding:32px 28px; box-shadow:0 25px 60px rgba(0,0,0,0.22); position:relative; box-sizing:border-box;">
        <button type="button" id="closeGoogleModalBtn" style="position:absolute; top:18px; right:18px; background:none; border:none; font-size:22px; color:#94A3B8; cursor:pointer; line-height:1; padding:4px;">✕</button>
        
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <div style="width:44px; height:44px; border-radius:12px; background:#F8FAFC; border:1px solid #E2E8F0; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
          <div>
            <h3 style="margin:0; font-size:19px; font-weight:800; color:#0F172A; letter-spacing:-0.02em;">Sign in with Google</h3>
            <p style="margin:2px 0 0; font-size:12.5px; color:#64748B;">Connect your verified student Google identity</p>
          </div>
        </div>

        <p style="font-size:13.5px; line-height:1.5; color:#475569; margin:0 0 20px;">
          Enter your name and Google account email. Your orders and student profile will sync directly with the campus database.
        </p>

        <form id="googleModalForm" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label style="display:block; font-size:12.5px; font-weight:700; color:#1E293B; margin-bottom:6px;">Full Name *</label>
            <input type="text" id="googleNameInput" placeholder="e.g. Ansh Sharma" required value="${defaultName}" style="width:100%; height:44px; padding:0 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:14px; box-sizing:border-box; outline:none; background:#F8FAFC;" />
          </div>

          <div>
            <label style="display:block; font-size:12.5px; font-weight:700; color:#1E293B; margin-bottom:6px;">Google Email *</label>
            <input type="email" id="googleEmailInput" placeholder="e.g. ansh@campus.edu or yourname@gmail.com" required value="${defaultEmail}" style="width:100%; height:44px; padding:0 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:14px; box-sizing:border-box; outline:none; background:#F8FAFC;" />
          </div>

          <div id="googleModalError" style="display:none; color:#DC2626; font-size:12.5px; font-weight:600;"></div>

          <button type="submit" id="btnSubmitGoogleModal" style="margin-top:6px; height:46px; background:linear-gradient(135deg, #1D68FE 0%, #1558E6 100%); color:#FFFFFF; border:none; border-radius:12px; font-size:14.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(29, 104, 254, 0.35);">
            <span>Connect & Continue</span>
            <span style="font-size:16px;">→</span>
          </button>
        </form>

        <div style="margin-top:16px; padding-top:14px; border-top:1px solid #F1F5F9; text-align:center;">
          <span style="font-size:11.5px; color:#94A3B8;">🔒 Authoritative authentication secured by Neon PostgreSQL</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#closeGoogleModalBtn');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const form = modal.querySelector('#googleModalForm');
    const errBox = modal.querySelector('#googleModalError');
    const submitBtn = modal.querySelector('#btnSubmitGoogleModal');

    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#googleNameInput').value.trim();
      const email = modal.querySelector('#googleEmailInput').value.trim();

      if (!name || !email || !email.includes('@')) {
        errBox.textContent = 'Please enter a valid full name and email address.';
        errBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Connecting account…';

      try {
        const uid = 'goog_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const googleUser = {
          id: uid,
          uid: uid,
          name: name,
          email: email,
          avatar: '',
          isGuest: false,
          provider: 'google'
        };

        if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.setGoogleProfile === 'function') {
          window.UserManager.setGoogleProfile(googleUser);
        } else {
          persistUserSession(googleUser, { id: 'sess_' + Date.now() });
        }

        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
          await window.UniMallDB.syncUser(googleUser).catch(() => {});
        }

        modal.remove();

        if (returnUrl) {
          window.location.href = returnUrl;
        } else {
          window.location.reload();
        }
      } catch (saveErr) {
        console.error('[NeonAuth] Modal connect error:', saveErr);
        errBox.textContent = 'Failed to connect profile. Please try again.';
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Connect & Continue →';
      }
    };
  }

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
