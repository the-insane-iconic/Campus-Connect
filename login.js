/* ═══════════════════════════════════════════════════════════
   UNIMALL — AUTHENTICATION (login.js)
   Powered by Neon Auth (Google OAuth)
   ═══════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'unimall_v1';
const AUTH_KEY = 'unimall_auth';

/* ─── GOOGLE SIGN-IN VIA NEON AUTH ────────────────────────── */
async function handleGoogleLogin() {
  const googleBtn = document.getElementById('googleLoginBtn');
  const googleText = document.getElementById('googleBtnText');

  if (googleBtn && googleText) {
    googleBtn.disabled = true;
    googleText.textContent = 'Redirecting to Google...';
  }

  try {
    if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signInWithGoogle === 'function') {
      const callbackURL = window.location.origin + '/index.html';
      console.log('[Login] Initiating Google authentication with Neon Auth. Callback:', callbackURL);
      await window.UniMallAuth.signInWithGoogle({ callbackURL });
      return;
    } else {
      throw new Error('Neon Auth service is initializing. Please try again.');
    }
  } catch (err) {
    console.error('[Login] Google authentication failed:', err);
    showToast(err.message || 'Authentication failed. Please try again.', true);
    if (googleBtn && googleText) {
      googleBtn.disabled = false;
      googleText.textContent = 'Continue with Google';
    }
  }
}

/* ─── TOAST NOTIFICATION ─────────────────────────────────── */
let toastTimeout = null;
function showToast(message, isError = false) {
  const toast = document.getElementById('loginToast');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) {
    iconEl.textContent = isError ? '✕' : '✓';
    iconEl.classList.toggle('error', isError);
  }

  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);
});
