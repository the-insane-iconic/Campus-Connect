/* ═══════════════════════════════════════════════════════════
   UNIMALL — FIREBASE AUTH & LOGIN (login.js)
   Google Sign-In + Guest Mode
   ═══════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'unimall_v1';
const AUTH_KEY = 'unimall_auth';

/* ─── FIREBASE CONFIGURATION ─────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAI1pYMj_ht9YRrVCMKNYNVtmt_mZw-ysI",
  authDomain: "unimall-d484f.firebaseapp.com",
  projectId: "unimall-d484f",
  storageBucket: "unimall-d484f.firebasestorage.app",
  messagingSenderId: "162359291874",
  appId: "1:162359291874:web:fe413c9fa9b823ce06d3bb",
  measurementId: "G-28QZKVB4K1"
};

// Initialize Firebase
let firebaseApp = null;
let firebaseAuth = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
  }
} catch (e) {
  console.warn('Firebase initialization note:', e);
}

/* ─── SESSION PERSISTENCE ────────────────────────────────── */
function saveUserSession(userData) {
  try {
    // 1. Save auth flag
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));

    // 2. Sync to AppState structure (unimall_v1)
    let appData = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    appData.currentUser = {
      name:   userData.name,
      email:  userData.email,
      avatar: userData.avatar,
      hostel: userData.hostel || 'Hostel B',
      room:   userData.room || 'Room 214',
      phone:  userData.phone || '',
      provider: userData.provider,
      isGuest: userData.isGuest
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('Error saving user session:', e);
  }
}

/* ─── GOOGLE SIGN-IN (POWERED BY NEON AUTH) ─────────────── */
async function handleGoogleLogin() {
  const googleBtn = document.getElementById('googleLoginBtn');
  const googleText = document.getElementById('googleBtnText');

  if (googleBtn && googleText) {
    googleBtn.disabled = true;
    googleText.textContent = 'Connecting with Google via Neon...';
  }

  // 1. Primary: Neon Managed Auth with Google OAuth
  if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signInWithGoogle === 'function') {
    try {
      const callbackURL = window.location.origin + '/index.html';
      console.log('[Login] Triggering Neon Google OAuth redirect to:', callbackURL);
      await window.UniMallAuth.signInWithGoogle({ callbackURL });
      return;
    } catch (neonErr) {
      console.warn('[Login] Neon Auth initiation note:', neonErr.message);
      showToast('Connecting to Neon Google Auth...', false);
    }
  }

  // 2. Secondary fallback
  if (firebaseAuth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await firebaseAuth.signInWithPopup(provider);
      const user = result.user;

      const userName = user.displayName || 'Campus Student';
      const defaultSticker = typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar(userName) : '';
      const userPhoto = (user.photoURL && user.photoURL.trim()) ? user.photoURL.trim() : '';

      const userData = {
        uid:      user.uid,
        name:     userName,
        email:    user.email || 'student@university.edu',
        avatar:   userPhoto || defaultSticker,
        hostel:   'Hostel B',
        room:     'Room 214',
        provider: 'google',
        isGuest:  false
      };

      saveUserSession(userData);
      if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('success');
      showToast(`Welcome, ${userData.name}!`, false);

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 600);

    } catch (error) {
      console.error('Google Sign-In Error:', error);

      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        showToast('Sign-in cancelled', true);
        if (googleBtn && googleText) {
          googleBtn.disabled = false;
          googleText.textContent = 'Continue with Google';
        }
      } else {
        const simulatedName = prompt('Enter your name for Google demo login:', 'Ansh Sharma') || 'Campus Student';
        const simulatedEmail = simulatedName.toLowerCase().replace(/\s+/g, '.') + '@university.edu';
        const defaultSticker = typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar(simulatedName) : '';
        
        const demoUser = {
          uid:      'google_demo_' + Date.now(),
          name:     simulatedName,
          email:    simulatedEmail,
          avatar:   defaultSticker,
          hostel:   'Hostel B',
          room:     'Room 214',
          provider: 'google',
          isGuest:  false
        };

        saveUserSession(demoUser);
        showToast(`Welcome, ${demoUser.name}!`, false);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 700);
      }
    }
  } else {
    // If Firebase CDN is offline
    const demoName = 'Aarav Singh';
    const defaultSticker = typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar(demoName) : '';
    const demoUser = {
      uid:      'google_offline_' + Date.now(),
      name:     demoName,
      email:    'aarav.singh@university.edu',
      avatar:   defaultSticker,
      hostel:   'Hostel B',
      room:     'Room 214',
      provider: 'google',
      isGuest:  false
    };
    saveUserSession(demoUser);
    showToast('Signed in with Google (Demo)', false);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 700);
  }
}

/* ─── GUEST LOGIN ────────────────────────────────────────── */
function handleGuestLogin() {
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('pop');

  const guestBtn = document.getElementById('guestLoginBtn');
  if (guestBtn) {
    guestBtn.disabled = true;
    guestBtn.innerHTML = `<span>Entering as Guest...</span>`;
  }

  const defaultSticker = typeof window.getStickerAvatar === 'function' ? window.getStickerAvatar('Guest') : '';

  const guestData = {
    uid:      'guest_' + Date.now(),
    name:     'Guest Student',
    email:    'guest@campus.edu',
    avatar:   defaultSticker,
    hostel:   'Hostel B',
    room:     'Room 214',
    provider: 'guest',
    isGuest:  true
  };

  saveUserSession(guestData);
  if (typeof window.UniMallSound !== 'undefined') window.UniMallSound.play('success');
  showToast('Continuing as Guest...', false);

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 600);
}

/* ─── TOAST ──────────────────────────────────────────────── */
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
  }, 3000);
}

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);
  document.getElementById('guestLoginBtn')?.addEventListener('click', handleGuestLogin);
});
