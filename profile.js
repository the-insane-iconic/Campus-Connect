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
  if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signOut === 'function') {
    try {
      await window.UniMallAuth.signOut();
      return;
    } catch (e) {
      console.warn('[Profile] Neon Auth signOut error:', e);
    }
  }
  if (typeof firebaseAuth !== 'undefined' && firebaseAuth) {
    try {
      await firebaseAuth.signOut();
    } catch (e) { }
  }
  localStorage.removeItem(AUTH_KEY);
  showToast('Logged out successfully');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

/* ─── CONNECT GOOGLE ACCOUNT (FROM GUEST) ────────────────── */
async function handleConnectGoogle() {
  if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signInWithGoogle === 'function') {
    try {
      await window.UniMallAuth.signInWithGoogle({ callbackURL: window.location.href });
      return;
    } catch (e) {
      console.warn('[Profile] Neon Auth Google connect note:', e);
    }
  }

  if (typeof firebaseAuth !== 'undefined' && firebaseAuth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebaseAuth.signInWithPopup(provider);
      const user = result.user;
      ProfileState.user.name = user.displayName || ProfileState.user.name;
      ProfileState.user.email = user.email || ProfileState.user.email;
      ProfileState.user.avatar = user.photoURL || '';
      ProfileState.user.isGuest = false;
      ProfileState.user.provider = 'google';

      localStorage.setItem(AUTH_KEY, JSON.stringify({
        uid: user.uid,
        name: ProfileState.user.name,
        email: ProfileState.user.email,
        avatar: ProfileState.user.avatar,
        isGuest: false
      }));

      saveProfileData();
      renderProfile();
      showToast(`Connected Google account for ${ProfileState.user.name}!`);
    } catch (e) {
      console.warn('Google Connect error:', e);
    }
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
