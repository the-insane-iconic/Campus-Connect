/**
 * UniMall Store Admin — Login Controller (admin/login.js)
 * Supports:
 *   - Admin login: username "admin", password "admin"
 *   - Store login: username = store name (case-insensitive), password = store name
 */

'use strict';

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const errorAlert = document.getElementById('error-alert');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  // Check if already authenticated
  const existingToken = sessionStorage.getItem('unimall_admin_token');
  if (existingToken) {
    verifyExistingSession(existingToken);
  }

  // ── STORE DATABASE (maps lowercase store names to store IDs & data) ──
  const STORE_ACCOUNTS = {
    'campus café':    { storeId: 'campus-cafe',  storeName: 'Campus Café',    ownerName: 'Store Manager',  icon: '☕' },
    'campus cafe':    { storeId: 'campus-cafe',  storeName: 'Campus Café',    ownerName: 'Store Manager',  icon: '☕' },
    'book corner':    { storeId: 'book-corner',  storeName: 'Book Corner',    ownerName: 'Store Manager',  icon: '📚' },
    'techstop':       { storeId: 'techstop',     storeName: 'TechStop',       ownerName: 'Store Manager',  icon: '💻' },
    'campus mart':    { storeId: 'campus-mart',  storeName: 'Campus Mart',    ownerName: 'Store Manager',  icon: '🛒' },
    'campus wear':    { storeId: 'campus-wear',  storeName: 'Campus Wear',    ownerName: 'Store Manager',  icon: '👕' },
    'health hub':     { storeId: 'health-hub',   storeName: 'Health Hub',     ownerName: 'Store Manager',  icon: '💊' },
  };

  // Handle login form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    setLoading(true);

    const username = userInput.value.trim().toLowerCase();
    const password = passInput.value.trim().toLowerCase();

    // ── 1. ADMIN LOGIN (username: admin, password: admin) ──
    if (username === 'admin' && password === 'admin') {
      const sessionData = {
        token: 'unimall_admin_' + Date.now(),
        user: {
          id: 'admin_founder',
          name: 'UniMall Admin',
          email: 'admin@unimall.edu',
          role: 'platform_admin'
        },
        stores: [
          { store_id: 'campus-cafe', store_name: 'Campus Café', membership_role: 'admin' },
          { store_id: 'book-corner', store_name: 'Book Corner', membership_role: 'admin' },
          { store_id: 'techstop', store_name: 'TechStop', membership_role: 'admin' },
          { store_id: 'campus-mart', store_name: 'Campus Mart', membership_role: 'admin' },
          { store_id: 'campus-wear', store_name: 'Campus Wear', membership_role: 'admin' },
          { store_id: 'health-hub', store_name: 'Health Hub', membership_role: 'admin' }
        ]
      };
      saveAdminSession(sessionData);
      window.location.href = 'index.html';
      return;
    }

    // ── 2. STORE OWNER LOGIN (username: store name, password: store name) ──
    const storeAccount = STORE_ACCOUNTS[username];
    if (storeAccount && password === username) {
      const sessionData = {
        token: 'unimall_store_' + Date.now(),
        user: {
          id: 'store_' + storeAccount.storeId,
          name: storeAccount.ownerName,
          email: `${storeAccount.storeId}@unimall.app`,
          role: 'store_owner'
        },
        stores: [
          { store_id: storeAccount.storeId, store_name: storeAccount.storeName, membership_role: 'owner' }
        ]
      };
      saveAdminSession(sessionData);
      window.location.href = 'index.html';
      return;
    }

    // ── 3. Check for dynamically registered stores (from localStorage) ──
    const registeredStores = JSON.parse(localStorage.getItem('unimall_registered_stores') || '[]');
    const regStore = registeredStores.find(s => 
      s.storeName.toLowerCase() === username && s.storeName.toLowerCase() === password && s.status === 'approved'
    );
    if (regStore) {
      const sessionData = {
        token: 'unimall_reg_' + Date.now(),
        user: {
          id: 'store_' + regStore.storeId,
          name: regStore.ownerName || 'Store Manager',
          email: regStore.email || `${regStore.storeId}@unimall.app`,
          role: 'store_owner'
        },
        stores: [
          { store_id: regStore.storeId, store_name: regStore.storeName, membership_role: 'owner' }
        ]
      };
      saveAdminSession(sessionData);
      window.location.href = 'index.html';
      return;
    }

    // ── 4. Try backend API fallback ──
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userInput.value.trim(), password: passInput.value })
      });
      if (res.ok) {
        const data = await res.json();
        saveAdminSession(data);
        window.location.href = 'index.html';
        return;
      }
    } catch (err) {
      // Backend offline — expected on static deployment
    }

    showError('Invalid credentials. For stores, use the store name as both username and password. For admin, use admin / admin.');
    setLoading(false);
  });

  // ── QUICK DEMO LOGIN BUTTONS ──
  document.querySelectorAll('.btn-demo').forEach((btn) => {
    btn.addEventListener('click', () => {
      userInput.value = btn.getAttribute('data-user');
      passInput.value = btn.getAttribute('data-pass');
      form.dispatchEvent(new Event('submit'));
    });
  });

  function showError(msg) {
    errorAlert.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function hideError() {
    errorAlert.textContent = '';
    errorAlert.classList.add('hidden');
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.textContent = 'Signing in...';
      spinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Sign In to Dashboard';
      spinner.classList.add('hidden');
    }
  }

  function saveAdminSession(data) {
    sessionStorage.setItem('unimall_admin_token', data.token);
    sessionStorage.setItem('unimall_admin_user', JSON.stringify(data.user));
    sessionStorage.setItem('unimall_admin_stores', JSON.stringify(data.stores));
    if (data.stores && data.stores.length > 0) {
      sessionStorage.setItem('unimall_admin_active_store', data.stores[0].store_id);
    }
  }

  async function verifyExistingSession(token) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.href = 'index.html';
      }
    } catch {
      // Don't clear session for static deployments — the session data is still valid in sessionStorage
      const user = sessionStorage.getItem('unimall_admin_user');
      if (user) {
        window.location.href = 'index.html';
      }
    }
  }
});
