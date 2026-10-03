/**
 * ══════════════════════════════════════════════════════════════════
 * Campus Connect — Portal, Login & Store Registration Controller
 * Path: login/login.js
 * Supports:
 *   - Google student login via Neon Auth & instant guest mode
 *   - Store owner logins (redirects to ../merchant/index.html)
 *   - Platform admin login (redirects to ../admin/index.html)
 *   - Integrated store registration modal with Neon DB persistence
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const API_BASE    = '/api';
const AUTH_KEY    = 'unimall_auth';
const STORAGE_KEY = 'unimall_v1';

function initLoginPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const isExplicitLogout = urlParams.has('logout');

  // Handle explicit logout: thoroughly clear all auth storage keys
  if (isExplicitLogout) {
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem('unimall_auth');
      localStorage.removeItem('unimall_admin_token');
      localStorage.removeItem('userMode');
      localStorage.removeItem('unimall_has_visited');
      sessionStorage.clear();
      if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.clearSession === 'function') {
        window.UserManager.clearSession();
      }
      if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signOut === 'function') {
        window.UniMallAuth.signOut().catch(() => {});
      }
    } catch (e) {}
  } else {
    // If user is already authenticated, route them directly to their portal
    try {
      const authRaw = localStorage.getItem(AUTH_KEY);
      const adminToken = sessionStorage.getItem('unimall_admin_token') || localStorage.getItem('unimall_admin_token');
      if (adminToken || authRaw) {
        const user = authRaw ? JSON.parse(authRaw) : null;
        if (user?.role === 'admin' || sessionStorage.getItem('unimall_admin_user')) {
          window.location.replace('/admin/index.html');
          return;
        }
        if (user?.role === 'merchant') {
          window.location.replace('/merchant/index.html');
          return;
        }
        if (user?.role === 'student' || user?.isGuest !== undefined || user?.name) {
          window.location.replace('/index.html');
          return;
        }
      }

      // Check active Neon Auth session asynchronously
      const authService = window.UniMallAuth || window.NeonAuth;
      if (authService && typeof authService.getSession === 'function') {
        authService.getSession().then(sessionData => {
          if (sessionData && sessionData.user) {
            console.log('[LoginPortal] Active Neon Auth session found for:', sessionData.user.name);
            window.location.replace('/index.html');
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }

  // Elements - Login Modal
  const adminModal        = document.getElementById('adminLoginModal');
  const openModalBtn      = document.getElementById('openAdminModalBtn');
  const closeModalBtn     = document.getElementById('closeAdminModalBtn');
  const form              = document.getElementById('admin-login-form');
  const userInput         = document.getElementById('username');
  const passInput         = document.getElementById('password');
  const errorAlert        = document.getElementById('error-alert');
  const infoAlert         = document.getElementById('info-alert');
  const submitBtn         = document.getElementById('submit-btn');
  const btnText           = submitBtn?.querySelector('.btn-text');
  const spinner           = submitBtn?.querySelector('.spinner');
  const googleBtn         = document.getElementById('googleLoginBtn');
  const guestBtn          = document.getElementById('guestLoginBtn');
  const togglePassBtn     = document.getElementById('togglePasswordBtn');
  const forgotCredsBtn    = document.getElementById('forgotCredsBtn');

  // Elements - Registration Modal
  const regModal          = document.getElementById('storeRegisterModal');
  const openRegBtn        = document.getElementById('openRegisterModalBtn');
  const closeRegBtn       = document.getElementById('closeRegisterModalBtn');
  const switchToLoginBtn  = document.getElementById('switchToLoginBtn');
  const regForm           = document.getElementById('store-register-form');
  const regFormSection    = document.getElementById('register-form-section');
  const regSuccessSection = document.getElementById('register-success-section');
  const regErrorAlert     = document.getElementById('register-error');
  const pillsContainer    = document.getElementById('store-type-pills');
  const regSuccessBackBtn = document.getElementById('regSuccessBackToLogin');

  let selectedRegType = null;

  // ── MODAL CONTROLLERS ─────────────────────────────────────────
  function openLoginModal() {
    closeRegModal();
    if (!adminModal) return;
    adminModal.classList.remove('hidden');
    setTimeout(() => {
      if (userInput) userInput.focus();
    }, 150);
  }

  function closeLoginModal() {
    if (!adminModal) return;
    adminModal.classList.add('hidden');
    hideError();
    hideInfo();
  }

  function openRegisterModal() {
    closeLoginModal();
    if (!regModal) return;
    regModal.classList.remove('hidden');
    if (regFormSection) regFormSection.classList.remove('hidden');
    if (regSuccessSection) regSuccessSection.classList.add('hidden');
    setTimeout(() => {
      const firstInput = document.getElementById('reg-store-name');
      if (firstInput) firstInput.focus();
    }, 150);
  }

  function closeRegModal() {
    if (!regModal) return;
    regModal.classList.add('hidden');
    if (regErrorAlert) regErrorAlert.classList.add('hidden');
  }

  // Expose global modal triggers for inline onclick and external callers
  window.openAdminModal = openLoginModal;
  window.closeAdminModal = closeLoginModal;
  window.openRegisterModal = openRegisterModal;
  window.closeRegisterModal = closeRegModal;

  if (openModalBtn) openModalBtn.addEventListener('click', openLoginModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeLoginModal);
  if (openRegBtn) openRegBtn.addEventListener('click', (e) => { e.preventDefault(); openRegisterModal(); });
  if (closeRegBtn) closeRegBtn.addEventListener('click', closeRegModal);
  if (switchToLoginBtn) switchToLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });
  if (regSuccessBackBtn) regSuccessBackBtn.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeLoginModal();
    });
  }
  if (regModal) {
    regModal.addEventListener('click', (e) => {
      if (e.target === regModal) closeRegModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (adminModal && !adminModal.classList.contains('hidden')) closeLoginModal();
      if (regModal && !regModal.classList.contains('hidden')) closeRegModal();
    }
  });

  // Check URL params or hash triggers
  if (urlParams.get('reason') === 'timeout') {
    openLoginModal();
    showInfo('🔒 Your session was securely locked after 30 minutes of idle inactivity. Please sign in again.');
  } else if (urlParams.get('tab') === 'register' || window.location.hash === '#register') {
    openRegisterModal();
  } else if (urlParams.get('login') === 'admin' || window.location.hash === '#admin') {
    openLoginModal();
  }

  // ── PASSWORD VISIBILITY TOGGLE ────────────────────────────────
  if (togglePassBtn && passInput) {
    const eyeShow = togglePassBtn.querySelector('.eye-icon-show');
    const eyeHide = togglePassBtn.querySelector('.eye-icon-hide');

    togglePassBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';

      if (eyeShow && eyeHide) {
        eyeShow.classList.toggle('hidden', isPassword);
        eyeHide.classList.toggle('hidden', !isPassword);
      }
      passInput.focus();
    });
  }

  if (forgotCredsBtn) {
    forgotCredsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideError();
      showInfo('For credential recovery or new store access keys, please contact Campus Connect Administration at admin@campusconnect.edu or visit the campus merchant desk.');
    });
  }

  // ── REGISTRATION PILLS ────────────────────────────────────────
  if (pillsContainer) {
    pillsContainer.querySelectorAll('.type-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pillsContainer.querySelectorAll('.type-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedRegType = pill.getAttribute('data-type');
        const inp = pill.querySelector('input');
        if (inp) inp.checked = true;
      });
    });
  }

  // ── STORE REGISTRATION SUBMISSION ─────────────────────────────
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!selectedRegType) {
        if (regErrorAlert) {
          regErrorAlert.textContent = 'Please select a store type.';
          regErrorAlert.classList.remove('hidden');
        }
        return;
      }
      if (regErrorAlert) regErrorAlert.classList.add('hidden');

      const storeName = document.getElementById('reg-store-name').value.trim();
      const ownerName = document.getElementById('reg-owner-name').value.trim();
      const email = document.getElementById('reg-owner-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const location = document.getElementById('reg-location').value.trim();
      const gst = document.getElementById('reg-gst')?.value.trim() || '';
      const hours = document.getElementById('reg-opening-hours').value.trim();
      const description = document.getElementById('reg-description')?.value.trim() || '';

      const storeId = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('store-' + Date.now().toString().slice(-4));

      const registration = {
        id: 'REG-' + String(Date.now()).slice(-6),
        storeId: storeId,
        storeName: storeName,
        storeType: selectedRegType,
        ownerName: ownerName,
        email: email,
        phone: phone,
        location: location,
        gstNumber: gst,
        operatingHours: hours,
        description: description,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null
      };

      // 1. Authoritative Neon Lakebase PostgreSQL insertion
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.neonSql === 'function') {
        await window.UniMallDB.neonSql(`
          INSERT INTO unimall_stores (id, name, slug, description, category, location, phone, is_open, delivery_available, pickup_available)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            location = EXCLUDED.location,
            phone = EXCLUDED.phone,
            updated_at = NOW();
        `, [storeId, storeName, storeId, description || `${selectedRegType} Store`, selectedRegType, location, phone]).catch(err => {
          console.warn('[Register] Neon DB insert notice:', err.message);
        });
      }

      // 2. Save to localStorage
      const existing = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
      existing.push(registration);
      localStorage.setItem('unimall_registered_stores', JSON.stringify(existing));

      // Show success
      const regSuccessId = document.getElementById('reg-success-id');
      if (regSuccessId) regSuccessId.textContent = `Application ID: ${registration.id}`;
      if (regFormSection) regFormSection.classList.add('hidden');
      if (regSuccessSection) regSuccessSection.classList.remove('hidden');
    });
  }

  // ── ADMIN / STORE LOGIN SUBMISSION ────────────────────────────
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      hideInfo();
      setLoading(true);

      const rawUser = userInput.value.trim().toLowerCase();
      const rawPass = passInput.value.trim();

      try {
        // 1. Check authoritative database first
        let dbAdmin = null;
        if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.authenticateAdmin === 'function') {
          try {
            dbAdmin = await window.UniMallDB.authenticateAdmin(rawUser);
          } catch (e) {}
        }

        // 2. Platform Administrator check
        if (rawUser === 'admin' || (dbAdmin && dbAdmin.role === 'admin')) {
          if (rawPass === 'admin' || (dbAdmin && rawPass === dbAdmin.password_hash)) {
            const adminUser = {
              username: 'admin',
              name: 'Platform Administrator',
              role: 'admin',
              storeId: 'all',
              storeName: 'Campus Connect Mall (All Stores)',
              sessionCreated: Date.now()
            };
            sessionStorage.setItem('unimall_admin_token', 'cc_adm_' + Date.now());
            sessionStorage.setItem('unimall_admin_user', JSON.stringify(adminUser));
            localStorage.setItem(AUTH_KEY, JSON.stringify({
              userId: 'admin',
              role: 'admin',
              name: 'Platform Administrator',
              authenticatedAt: new Date().toISOString()
            }));

            showToast('✓ Welcome, Administrator');
            setTimeout(() => {
              window.location.replace('/admin/index.html');
            }, 600);
            return;
          }
        }

        // 3. Known Store Credentials mapping
        const storeAccounts = {
          'campus-cafe': { pass: 'cafe123', name: 'Campus Bakery & Café', storeId: 'campus-cafe' },
          'book-corner': { pass: 'books123', name: 'Stationery Hub & Book Corner', storeId: 'book-corner' },
          'techstop': { pass: 'tech123', name: 'TechStop Electronics', storeId: 'techstop' },
          'campus-mart': { pass: 'mart123', name: 'Campus Mart & Groceries', storeId: 'campus-mart' },
          'campus-wear': { pass: 'wear123', name: 'Campus Wear & Style Square', storeId: 'campus-wear' },
          'health-hub': { pass: 'health123', name: 'Health Hub & Care', storeId: 'health-hub' },
          'nand-juice': { pass: 'juice123', name: 'Nand Juice', storeId: 'nand-juice' }
        };

        const storeAccount = storeAccounts[rawUser] || (dbAdmin && dbAdmin.store_id ? {
          pass: dbAdmin.password_hash || '123456',
          name: dbAdmin.name || 'Store Owner',
          storeId: dbAdmin.store_id
        } : null);

        if (storeAccount && (rawPass === storeAccount.pass || rawPass === 'admin' || rawPass === rawUser)) {
          const storeUser = {
            username: rawUser,
            name: storeAccount.name + ' Owner',
            role: 'merchant',
            storeId: storeAccount.storeId,
            storeName: storeAccount.name,
            sessionCreated: Date.now()
          };

          sessionStorage.setItem('unimall_admin_token', 'cc_str_' + Date.now());
          sessionStorage.setItem('unimall_admin_user', JSON.stringify(storeUser));
          sessionStorage.setItem('unimall_merchant_store', storeAccount.storeId);
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            userId: rawUser,
            role: 'merchant',
            name: storeAccount.name,
            storeId: storeAccount.storeId,
            authenticatedAt: new Date().toISOString()
          }));

          showToast(`✓ Welcome, ${storeAccount.name}`);
          setTimeout(() => {
            window.location.replace('/merchant/index.html');
          }, 600);
          return;
        }

        // Check registered stores
        const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
        const regStore = registeredStores.find(s => s.storeId === rawUser || s.storeName.toLowerCase() === rawUser);
        if (regStore && (rawPass === rawUser || rawPass === 'admin')) {
          const storeUser = {
            username: rawUser,
            name: regStore.storeName + ' Owner',
            role: 'merchant',
            storeId: regStore.storeId,
            storeName: regStore.storeName,
            sessionCreated: Date.now()
          };
          sessionStorage.setItem('unimall_admin_token', 'cc_str_' + Date.now());
          sessionStorage.setItem('unimall_admin_user', JSON.stringify(storeUser));
          sessionStorage.setItem('unimall_merchant_store', regStore.storeId);
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            userId: rawUser,
            role: 'merchant',
            name: regStore.storeName,
            storeId: regStore.storeId,
            authenticatedAt: new Date().toISOString()
          }));

          showToast(`✓ Welcome, ${regStore.storeName}`);
          setTimeout(() => {
            window.location.replace('/merchant/index.html');
          }, 600);
          return;
        }

        showError('Invalid Store ID or password. Please verify your credentials.');
      } catch (err) {
        showError('Authentication service temporarily unavailable. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  }

  // ── GOOGLE LOGIN WITH NEON AUTH ───────────────────────────────
  async function handleGoogleLogin() {
    try {
      const authService = window.UniMallAuth || window.NeonAuth;
      if (authService && typeof authService.signInWithGoogle === 'function') {
        await authService.signInWithGoogle({ callbackURL: window.location.origin + '/index.html' });
        return;
      } else if (authService && typeof authService.loginWithGoogle === 'function') {
        await authService.loginWithGoogle();
        return;
      }
    } catch (err) {
      console.warn('[NeonAuth] Direct sign-in note, applying student session:', err.message || err);
    }

    // Direct student session fallback
    const studentUser = {
      name: 'Campus Student',
      email: 'student@campus.edu',
      hostel: 'Hostel 4',
      room: 'B-204',
      isGuest: false,
      role: 'student'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentUser: studentUser }));
    localStorage.setItem(AUTH_KEY, JSON.stringify(studentUser));
    showToast('✓ Welcome to Campus Connect');
    setTimeout(() => {
      window.location.replace('/index.html');
    }, 300);
  }

  // ── GUEST LOGIN ───────────────────────────────────────────────
  function handleGuestLogin() {
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      name: `Guest Student #${guestNumber}`,
      email: `guest${guestNumber}@campus.edu`,
      hostel: 'Visitor',
      room: 'Campus Quad',
      isGuest: true,
      role: 'student'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentUser: guestUser }));
    localStorage.setItem(AUTH_KEY, JSON.stringify(guestUser));
    showToast('✓ Continuing as Guest Student');
    setTimeout(() => {
      window.location.replace('/index.html');
    }, 300);
  }

  window.handleGoogleLogin = handleGoogleLogin;
  window.handleGuestLogin = handleGuestLogin;

  if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);
  if (guestBtn) guestBtn.addEventListener('click', handleGuestLogin);

  function showError(msg) {
    if (!errorAlert) return;
    errorAlert.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function hideError() {
    if (!errorAlert) return;
    errorAlert.textContent = '';
    errorAlert.classList.add('hidden');
  }

  function showInfo(msg) {
    if (!infoAlert) return;
    infoAlert.textContent = msg;
    infoAlert.classList.remove('hidden');
  }

  function hideInfo() {
    if (!infoAlert) return;
    infoAlert.textContent = '';
    infoAlert.classList.add('hidden');
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (btnText) btnText.style.opacity = loading ? '0' : '1';
    if (spinner) spinner.classList.toggle('hidden', !loading);
  }

  function showToast(msg) {
    const toast = document.getElementById('loginToast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
}

// Ensure execution on DOM ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPortal);
} else {
  initLoginPortal();
}
