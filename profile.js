/* ═══════════════════════════════════════════════════════════
   UNIMALL — USER PROFILE CONTROLLER (profile.js)
   ═══════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'unimall_v1';
const AUTH_KEY = 'unimall_auth';

/* ─── FIREBASE CONFIG (FOR AUTH SIGN-OUT / UPGRADE) ───────── */
const firebaseConfig = {
  apiKey: "AIzaSyAI1pYMj_ht9YRrVCMKNYNVtmt_mZw-ysI",
  authDomain: "unimall-d484f.firebaseapp.com",
  projectId: "unimall-d484f",
  storageBucket: "unimall-d484f.firebasestorage.app",
  messagingSenderId: "162359291874",
  appId: "1:162359291874:web:fe413c9fa9b823ce06d3bb",
  measurementId: "G-28QZKVB4K1"
};

let firebaseAuth = null;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseAuth = firebase.auth();
  }
} catch (e) {
  console.warn('Firebase init note:', e);
}

/* ─── PROFILE STATE ──────────────────────────────────────── */
const ProfileState = {
  user: {
    name: '',
    email: '',
    phone: '',
    hostel: '',
    room: '',
    avatar: '',
    provider: 'google',
    isGuest: false
  },
  orders: [],
  requests: []
};

/* ─── LOAD DATA ──────────────────────────────────────────── */
function loadProfileData() {
  try {
    // Prefer UserManager for canonical profile (handles Google vs Guest correctly)
    if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.getActiveUser === 'function') {
      const activeUser = window.UserManager.getActiveUser();
      if (activeUser) {
        ProfileState.user = { ...ProfileState.user, ...activeUser };
      }
    } else {
      // Fallback: read from storage keys directly
      const authRaw = localStorage.getItem(AUTH_KEY);
      if (authRaw) {
        const authUser = JSON.parse(authRaw);
        ProfileState.user = { ...ProfileState.user, ...authUser };
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.currentUser) {
          ProfileState.user = { ...ProfileState.user, ...parsed.currentUser };
        }
      }
    }

    // Always load orders & requests from storage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) {
        ProfileState.orders = parsed.orders;
      }
      if (Array.isArray(parsed.itemRequests)) {
        ProfileState.requests = parsed.itemRequests;
      }
    }
  } catch (e) {
    console.error('Error loading profile data:', e);
  }
}

function saveProfileData() {
  try {
    let appData = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    }
    appData.currentUser = { ...ProfileState.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    showToast('Campus details saved successfully');
  } catch (e) {
    console.error('Error saving profile data:', e);
    showToast('Error saving changes');
  }
}

/* ─── RENDER ─────────────────────────────────────────────── */
function renderProfile() {
  const u = ProfileState.user;

  // Hero section
  const userDisplayName = document.getElementById('userDisplayName');
  const userEmailText = document.getElementById('userEmailText');
  const userHostelSub = document.getElementById('userHostelSub');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const avatarImg = document.getElementById('avatarImg');
  const authStatusPill = document.getElementById('authStatusPill');
  const switchGoogleBtn = document.getElementById('switchGoogleBtn');

  if (userDisplayName) userDisplayName.textContent = u.name || 'Campus Student';
  if (userHostelSub) {
    if (u.hostel && u.room) {
      userHostelSub.textContent = `${u.hostel} · ${u.room}`;
    } else if (u.hostel) {
      userHostelSub.textContent = u.hostel;
    } else {
      userHostelSub.textContent = 'Campus Resident';
    }
  }

  // Avatar — display clean initial of the name
  const initial = (u.name && u.name.trim()) ? u.name.trim().charAt(0).toUpperCase() : 'U';
  const avatarInitial = document.getElementById('avatarInitial');
  if (avatarInitial) avatarInitial.textContent = initial;

  // Auth badge & connect button
  if (authStatusPill) {
    if (u.isGuest) {
      authStatusPill.className = 'auth-status-pill guest';
      authStatusPill.innerHTML = 'Guest Account';
      if (switchGoogleBtn) switchGoogleBtn.classList.remove('hidden');
    } else {
      authStatusPill.className = 'auth-status-pill verified';
      authStatusPill.innerHTML = '<span class="auth-icon">✓</span> Google Verified';
      if (switchGoogleBtn) switchGoogleBtn.classList.add('hidden');
    }
  }

  // Stats
  const statTotalOrders = document.getElementById('statTotalOrders');
  const statActiveOrders = document.getElementById('statActiveOrders');
  const statRequests = document.getElementById('statRequests');

  const totalOrders = ProfileState.orders.length;
  const activeOrders = ProfileState.orders.filter(o => o.status === 'placed' || o.status === 'preparing' || o.status === 'ready').length;
  const requestCount = ProfileState.requests.length;

  if (statTotalOrders) statTotalOrders.textContent = totalOrders;
  if (statActiveOrders) statActiveOrders.textContent = activeOrders;
  if (statRequests) statRequests.textContent = requestCount;

  // Form fields
  const profName = document.getElementById('profName');
  const profEmail = document.getElementById('profEmail');
  const profPhone = document.getElementById('profPhone');
  const profHostel = document.getElementById('profHostel');
  const profRoom = document.getElementById('profRoom');

  if (profName) profName.value = u.name || '';
  if (profEmail) profEmail.value = u.email || '';
  if (profPhone) profPhone.value = u.phone || '';
  if (profHostel) profHostel.value = u.hostel || '';
  if (profRoom) profRoom.value = u.room || '';

  // Sync hostel chips state
  document.querySelectorAll('.h-chip').forEach(chip => {
    if (u.hostel && chip.dataset.hostel.toLowerCase() === u.hostel.toLowerCase()) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

/* ─── LOGOUT MODAL CONTROLLER ────────────────────────────── */
function showLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.remove('hidden');
}

function hideLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.add('hidden');
}

async function handleLogout() {
  hideLogoutModal();

  // Use Neon Auth signOut (handles UserManager cleanup internally)
  if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signOut === 'function') {
    try {
      await window.UniMallAuth.signOut();
      return;
    } catch (e) {
      console.warn('[Profile] Neon Auth signOut error:', e);
    }
  }

  // Fallback: use UserManager directly
  if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.clearSession === 'function') {
    window.UserManager.clearSession();
  } else {
    if (typeof firebaseAuth !== 'undefined' && firebaseAuth) {
      try { await firebaseAuth.signOut(); } catch (e) {}
    }
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

  showToast('Logged out successfully');
  setTimeout(() => {
    window.location.href = 'admin/login.html';
  }, 400);
}

/* ─── CONNECT GOOGLE ACCOUNT (FROM GUEST) ────────────────── */
async function handleConnectGoogle() {
  const switchBtn = document.getElementById('switchGoogleBtn');
  if (switchBtn) {
    switchBtn.disabled = true;
    switchBtn.innerHTML = 'Connecting with Google…';
  }
  showToast('Connecting with Google…');

  if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signInWithGoogle === 'function') {
    try {
      await window.UniMallAuth.signInWithGoogle({ callbackURL: window.location.origin + '/profile.html' });
      return;
    } catch (e) {
      console.warn('[Profile] Neon Auth Google connect error:', e);
      showToast(e.message || 'Failed to initiate Google sign-in.', 'error');
      if (switchBtn) {
        switchBtn.disabled = false;
        switchBtn.innerHTML = '<span class="btn-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg></span> Connect Google Account';
      }
    }
  } else {
    showToast('Authentication service is initializing. Please try again.', 'warn');
    if (switchBtn) switchBtn.disabled = false;
  }
}

/* ─── TOAST ──────────────────────────────────────────────── */
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('profileToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

/* ─── CART BADGE SYNC ────────────────────────────────────── */
function syncCartBadge() {
  try {
    let items = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) items = parsed.cart;
    }
    const totalCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.nav-badge, .cart-badge, .sidebar-badge');
    badges.forEach(badge => {
      badge.textContent = totalCount > 9 ? '9+' : String(totalCount);
      badge.style.display = totalCount > 0 ? '' : 'none';
      badge.setAttribute('aria-label', `${totalCount} item${totalCount !== 1 ? 's' : ''} in cart`);
    });
    const cartNav = document.getElementById('nav-cart');
    if (cartNav) cartNav.setAttribute('aria-label', `Cart, ${totalCount} item${totalCount !== 1 ? 's' : ''}`);
  } catch (e) { }
}

function syncSidebarProfile() {
  try {
    const u = ProfileState.user;
    if (!u) return;

    const nameEl = document.querySelector('.sidebar-profile-name');
    const roleEl = document.querySelector('.sidebar-profile-role');
    const avatarEl = document.querySelector('.sidebar-avatar');

    if (nameEl) nameEl.textContent = u.name || 'Campus Student';
    if (roleEl) {
      if (u.hostel && u.room) {
        roleEl.textContent = `${u.hostel} · ${u.room}`;
      } else {
        roleEl.textContent = u.email || 'Campus Account';
      }
    }
    if (avatarEl) {
      const initial = (u.name && u.name.trim()) ? u.name.trim().charAt(0).toUpperCase() : 'U';
      avatarEl.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
      avatarEl.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
      avatarEl.style.display = 'flex';
      avatarEl.style.alignItems = 'center';
      avatarEl.style.justifyContent = 'center';
      avatarEl.style.borderRadius = '50%';
    }
  } catch (e) { }
}

/* ─── EVENT LISTENERS ────────────────────────────────────── */
function initEvents() {
  // Back button
  document.getElementById('backButton')?.addEventListener('click', () => {
    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  // Real-time live avatar initial & name update as user types!
  const profNameInput = document.getElementById('profName');
  profNameInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const initial = val ? val.charAt(0).toUpperCase() : 'U';
    const avatarInitial = document.getElementById('avatarInitial');
    if (avatarInitial) avatarInitial.textContent = initial;

    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) userDisplayName.textContent = val || 'Campus Student';

    const sbName = document.querySelector('.sidebar-profile-name');
    if (sbName && val) sbName.textContent = val;

    const sbAvatar = document.querySelector('.sidebar-avatar');
    if (sbAvatar) {
      sbAvatar.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
    }
  });

  // Quick hostel chips selection
  document.querySelectorAll('.h-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.h-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const hostelInput = document.getElementById('profHostel');
      if (hostelInput) {
        hostelInput.value = chip.dataset.hostel;
        if (window.UniMallSound) window.UniMallSound.play('pop');
      }
    });
  });

  // Save profile form with interactive button state
  document.getElementById('profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const profName = document.getElementById('profName')?.value?.trim();
    const profPhone = document.getElementById('profPhone')?.value?.trim();
    const profHostel = document.getElementById('profHostel')?.value?.trim();
    const profRoom = document.getElementById('profRoom')?.value?.trim();

    const saveBtn = document.getElementById('saveProfileBtn');
    const saveLabel = document.getElementById('saveBtnLabel');

    if (saveBtn && saveLabel) {
      saveLabel.textContent = 'Saving...';
      saveBtn.disabled = true;
    }

    if (profName) ProfileState.user.name = profName;
    if (profPhone !== undefined) ProfileState.user.phone = profPhone;
    if (profHostel) ProfileState.user.hostel = profHostel;
    if (profRoom) ProfileState.user.room = profRoom;

    setTimeout(() => {
      saveProfileData();
      renderProfile();
      syncSidebarProfile();

      if (window.UniMallSound) window.UniMallSound.play('pop');

      if (saveBtn && saveLabel) {
        saveBtn.classList.add('saved');
        saveLabel.textContent = 'Saved ✓';
        setTimeout(() => {
          saveBtn.classList.remove('saved');
          saveLabel.textContent = 'Save Campus Details';
          saveBtn.disabled = false;
        }, 1800);
      }
    }, 250);
  });

  // Logout button triggers beautiful modal
  document.getElementById('logoutBtn')?.addEventListener('click', showLogoutModal);
  document.getElementById('cancelLogoutBtn')?.addEventListener('click', hideLogoutModal);
  document.getElementById('confirmLogoutBtn')?.addEventListener('click', handleLogout);

  // Click outside logout modal to close
  document.getElementById('logoutModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'logoutModal') hideLogoutModal();
  });

  // Connect Google button
  document.getElementById('switchGoogleBtn')?.addEventListener('click', handleConnectGoogle);

  // Helpdesk modal triggers
  const helpdeskModal = document.getElementById('helpdeskModal');
  document.getElementById('campusHelpdeskBtn')?.addEventListener('click', () => {
    if (helpdeskModal) helpdeskModal.classList.remove('hidden');
    if (window.UniMallSound) window.UniMallSound.play('pop');
  });

  document.getElementById('closeHelpdeskBtn')?.addEventListener('click', () => {
    if (helpdeskModal) helpdeskModal.classList.add('hidden');
  });

  document.getElementById('helpdeskGotItBtn')?.addEventListener('click', () => {
    if (helpdeskModal) helpdeskModal.classList.add('hidden');
  });

  helpdeskModal?.addEventListener('click', (e) => {
    if (e.target.id === 'helpdeskModal') helpdeskModal.classList.add('hidden');
  });

  // Sound FX toggle
  const soundToggle = document.getElementById('toggleSoundFX');
  if (soundToggle) {
    soundToggle.checked = localStorage.getItem('unimall_sound_enabled') !== 'false';
    soundToggle.addEventListener('change', (e) => {
      localStorage.setItem('unimall_sound_enabled', e.target.checked ? 'true' : 'false');
      if (e.target.checked && window.UniMallSound) {
        window.UniMallSound.play('pop');
        showToast('Tactile audio enabled');
      } else {
        showToast('Tactile audio silenced');
      }
    });
  }

  // Share profile
  document.getElementById('headerShareBtn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'My UniMall Profile', url: window.location.href }).catch(() => { });
    } else {
      showToast('Profile link ready to share');
    }
  });
}

/* ─── INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();
  initEvents();
  renderProfile();
  syncCartBadge();
  syncSidebarProfile();
});

// Reactively refresh profile when authentication status or user profile updates
window.addEventListener('unimall:auth_state_changed', () => {
  loadProfileData();
  renderProfile();
  syncSidebarProfile();
});

window.addEventListener('unimall:user_changed', () => {
  loadProfileData();
  renderProfile();
  syncSidebarProfile();
});
