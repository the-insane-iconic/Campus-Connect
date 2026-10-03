/* ═══════════════════════════════════════════════════════════
   UNIMALL — USER PROFILE CONTROLLER (js/profile.js)
   Full working profile system with:
     - Neon PostgreSQL real database persistence
     - Real authenticated user isolation (Google & Student ID)
     - Real live order counts & item request statistics
     - 3-Screen flow: Main Profile, Edit Profile, Settings & More
     - Functional profile photo upload with validation & compression
     - Working preferences, help/support, share app, and logout
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const AUTH_KEY = 'unimall_auth';
  const STORAGE_KEY = 'unimall_v1';

  /* ─── Profile State (Always starts empty; hydrated from auth/DB) ─── */
  const ProfileState = {
    user: {
      id: '',
      uid: '',
      name: '',
      email: '',
      phone: '',
      hostel: '',
      room: '',
      avatar: '',
      avatar_url: '',
      preferences: {
        orderNotifications: true,
        promotionalAlerts: true,
        soundFx: true,
        language: 'en'
      },
      isGuest: false,
      provider: 'guest'
    },
    stats: {
      totalOrders: 0,
      activeOrders: 0,
      itemRequests: 0
    },
    userRequests: [],
    activeSubView: 'main'
  };

  /* ─── Toast Helper ─── */
  function toast(msg, duration = 2500) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, duration);
    } else {
      let t = document.getElementById('um-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'um-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('visible');
      setTimeout(() => t.classList.remove('visible'), duration);
    }
  }

  /* ─── Subview Switcher (Screen 1 Main | Screen 2 Edit | Screen 3 Settings) ─── */
  function setProfileSubView(viewName, focusSection = null) {
    const validViews = ['main', 'edit', 'settings'];
    if (!validViews.includes(viewName)) viewName = 'main';

    ProfileState.activeSubView = viewName;

    // Toggle panels
    const mainEl = document.getElementById('profileViewMain');
    const editEl = document.getElementById('profileViewEdit');
    const settingsEl = document.getElementById('profileViewSettings');

    if (mainEl) {
      mainEl.classList.toggle('active', viewName === 'main');
      mainEl.style.display = viewName === 'main' ? 'block' : 'none';
    }
    if (editEl) {
      editEl.classList.toggle('active', viewName === 'edit');
      editEl.style.display = viewName === 'edit' ? 'block' : 'none';
    }
    if (settingsEl) {
      settingsEl.classList.toggle('active', viewName === 'settings');
      settingsEl.style.display = viewName === 'settings' ? 'block' : 'none';
    }

    // Scroll profile view to top
    const viewContainer = document.getElementById('view-profile');
    if (viewContainer) viewContainer.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });

    // When navigating to Edit Profile, populate input fields
    if (viewName === 'edit') {
      populateEditForm();
      if (focusSection === 'campus') {
        setTimeout(() => {
          document.getElementById('editProfHostel')?.focus();
        }, 120);
      } else if (focusSection === 'personal') {
        setTimeout(() => {
          document.getElementById('editProfFullName')?.focus();
        }, 120);
      }
    }
  }
  window.setProfileSubView = setProfileSubView;

  /* ─── Load User Profile from Auth & Neon PostgreSQL ─── */
  async function loadProfileData() {
    try {
      // 1. Resolve authoritative active user from UserManager
      let active = null;
      if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.getActiveUser === 'function') {
        active = window.UserManager.getActiveUser();
      }

      if (!active) {
        try {
          const authRaw = localStorage.getItem(AUTH_KEY);
          if (authRaw) active = JSON.parse(authRaw);
        } catch (e) {}
      }

      if (!active) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.currentUser && parsed.currentUser.name) active = parsed.currentUser;
          }
        } catch (e) {}
      }

      if (active) {
        ProfileState.user = {
          ...ProfileState.user,
          ...active,
          preferences: active.preferences || ProfileState.user.preferences
        };
      }

      const uid = ProfileState.user.id || ProfileState.user.uid || ProfileState.user.guestId;

      // 2. Fetch latest saved profile fields directly from Neon PostgreSQL
      if (uid && typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getUserProfile === 'function') {
        window.UniMallDB.getUserProfile(uid).then(dbProfile => {
          if (dbProfile) {
            let changed = false;
            if (dbProfile.name && dbProfile.name !== ProfileState.user.name) {
              ProfileState.user.name = dbProfile.name;
              changed = true;
            }
            if (dbProfile.phone && dbProfile.phone !== ProfileState.user.phone) {
              ProfileState.user.phone = dbProfile.phone;
              changed = true;
            }
            if (dbProfile.hostel && dbProfile.hostel !== ProfileState.user.hostel) {
              ProfileState.user.hostel = dbProfile.hostel;
              changed = true;
            }
            if (dbProfile.room && dbProfile.room !== ProfileState.user.room) {
              ProfileState.user.room = dbProfile.room;
              changed = true;
            }
            if (dbProfile.avatar && dbProfile.avatar !== ProfileState.user.avatar) {
              ProfileState.user.avatar = dbProfile.avatar;
              ProfileState.user.avatar_url = dbProfile.avatar;
              changed = true;
            }
            if (dbProfile.preferences && typeof dbProfile.preferences === 'object') {
              ProfileState.user.preferences = { ...ProfileState.user.preferences, ...dbProfile.preferences };
              changed = true;
            }

            if (changed) {
              if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.updateProfile === 'function') {
                window.UserManager.updateProfile(ProfileState.user);
              }
              renderProfileUI();
            }
          }
        }).catch(err => console.warn('[Profile] DB user profile sync error:', err.message));
      }

      // 3. Load Real User Statistics (Total Orders, Active Orders, Item Requests)
      await loadUserStatistics(uid);

      // 4. Initial Render
      renderProfileUI();

    } catch (err) {
      console.error('[Profile] Error loading profile data:', err);
    }
  }

  /* ─── Calculate Real User Statistics from Neon & Local Session ─── */
  async function loadUserStatistics(userId) {
    if (!userId) {
      ProfileState.stats = { totalOrders: 0, activeOrders: 0, itemRequests: 0 };
      return;
    }

    let totalOrders = 0;
    let activeOrders = 0;
    let itemRequests = 0;

    // 1. Calculate from local storage cache strictly scoped to current user
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.orders)) {
          const userOrders = parsed.orders.filter(o => o && (o.user_id === userId || o.userId === userId));
          totalOrders = userOrders.length;
          activeOrders = userOrders.filter(o => ['placed', 'preparing', 'ready', 'confirmed'].includes(o.status)).length;
        }
        if (Array.isArray(parsed.itemRequests)) {
          ProfileState.userRequests = parsed.itemRequests.filter(r => !r.userId || r.userId === userId);
          itemRequests = ProfileState.userRequests.length;
        }
      }
    } catch (e) {}

    ProfileState.stats.totalOrders = totalOrders;
    ProfileState.stats.activeOrders = activeOrders;
    ProfileState.stats.itemRequests = itemRequests;

    // 2. Fetch authoritative database statistics from Neon PostgreSQL
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.getUserStats === 'function') {
      try {
        const dbStats = await window.UniMallDB.getUserStats(userId);
        if (dbStats) {
          // If DB has recorded orders, DB is the source of truth
          if (dbStats.totalOrders >= totalOrders) {
            ProfileState.stats.totalOrders = dbStats.totalOrders;
            ProfileState.stats.activeOrders = dbStats.activeOrders;
          }
          if (dbStats.itemRequests >= itemRequests) {
            ProfileState.stats.itemRequests = dbStats.itemRequests;
          }
        }
      } catch (e) {
        console.warn('[Profile] DB user stats query fallback:', e.message);
      }
    }

    updateStatsUI();
  }

  /* ─── Render Main Profile & Edit Profile UI ─── */
  function renderProfileUI() {
    const u = ProfileState.user;
    if (!u) return;

    // User display name & handle
    const name = u.name || 'Campus Student';
    const numMatch = name.match(/\d+/);
    const uidNum = numMatch ? numMatch[0] : (String(u.id || u.uid || '').replace(/\D/g, '').slice(-4) || '1');
    const handle = `#${uidNum}`;

    // 1. Screen 1: Hero Card Elements
    const nameEl = document.getElementById('profileMainName');
    const handleEl = document.getElementById('profileMainHandle');
    const badgeEl = document.getElementById('profileMainBadge');
    const hostelBadgeEl = document.getElementById('profileMainHostelBadge');
    const hostelTextEl = document.getElementById('profileMainHostelText');

    if (nameEl) nameEl.textContent = name;
    if (handleEl) handleEl.textContent = handle;

    if (badgeEl) {
      if (u.isGuest) {
        badgeEl.className = 'profile-badge-status';
        badgeEl.textContent = 'Guest Account';
      } else {
        badgeEl.className = 'profile-badge-status verified';
        badgeEl.textContent = '✓ Verified Student';
      }
    }

    if (hostelTextEl) {
      if (u.hostel && u.room) {
        hostelTextEl.textContent = `${u.hostel} · ${u.room}`;
      } else if (u.hostel) {
        hostelTextEl.textContent = u.hostel;
      } else {
        hostelTextEl.textContent = 'Campus Resident';
      }
    }

    // Avatar presentation (Initial vs Real Uploaded Photo)
    const initial = name.trim().charAt(0).toUpperCase() || 'U';
    const mainInitialEl = document.getElementById('profileMainInitial');
    const mainPhotoEl = document.getElementById('profileMainPhoto');
    const editInitialEl = document.getElementById('profileEditInitial');
    const editPhotoEl = document.getElementById('profileEditPhoto');

    const photoSrc = u.avatar || u.avatar_url || '';

    if (photoSrc && photoSrc.length > 20) {
      if (mainPhotoEl) {
        mainPhotoEl.src = photoSrc;
        mainPhotoEl.classList.remove('hidden');
      }
      if (mainInitialEl) mainInitialEl.style.display = 'none';

      if (editPhotoEl) {
        editPhotoEl.src = photoSrc;
        editPhotoEl.classList.remove('hidden');
      }
      if (editInitialEl) editInitialEl.style.display = 'none';
    } else {
      if (mainPhotoEl) mainPhotoEl.classList.add('hidden');
      if (mainInitialEl) {
        mainInitialEl.textContent = initial;
        mainInitialEl.style.display = '';
      }

      if (editPhotoEl) editPhotoEl.classList.add('hidden');
      if (editInitialEl) {
        editInitialEl.textContent = initial;
        editInitialEl.style.display = '';
      }
    }

    // Sync Stats Numbers
    updateStatsUI();

    // Sync Preferences Checkboxes in Modal
    const prefs = u.preferences || {};
    const notifCb = document.getElementById('prefOrderNotifs');
    const promoCb = document.getElementById('prefPromoAlerts');
    const soundCb = document.getElementById('prefSoundFx');
    const langSel = document.getElementById('prefLanguage');

    if (notifCb) notifCb.checked = prefs.orderNotifications !== false;
    if (promoCb) promoCb.checked = prefs.promotionalAlerts !== false;
    if (soundCb) soundCb.checked = prefs.soundFx !== false;
    if (langSel && prefs.language) langSel.value = prefs.language;

    // Sync Sidebar Profile (if sidebar exists on desktop)
    syncSidebarProfile(name, initial, photoSrc, u);
  }

  /* ─── Populate Edit Form Fields from Active User ─── */
  function populateEditForm() {
    const u = ProfileState.user;
    if (!u) return;

    const nameInput = document.getElementById('editProfFullName');
    const emailInput = document.getElementById('editProfEmail');
    const phoneInput = document.getElementById('editProfPhone');
    const hostelSelect = document.getElementById('editProfHostel');
    const roomInput = document.getElementById('editProfRoom');

    if (nameInput) nameInput.value = u.name || '';
    if (emailInput) emailInput.value = u.email || '';
    if (phoneInput) {
      const cleanPhone = (u.phone || '').replace(/^\+91\s*/, '').trim();
      phoneInput.value = cleanPhone;
    }
    if (hostelSelect) hostelSelect.value = u.hostel || '';
    if (roomInput) roomInput.value = u.room || '';
  }

  /* ─── Update Quick Stats UI ─── */
  function updateStatsUI() {
    const totalEl = document.getElementById('profileStatTotalOrders');
    const activeEl = document.getElementById('profileStatActiveOrders');
    const reqEl = document.getElementById('profileStatItemRequests');

    if (totalEl) totalEl.textContent = String(ProfileState.stats.totalOrders || 0);
    if (activeEl) activeEl.textContent = String(ProfileState.stats.activeOrders || 0);
    if (reqEl) reqEl.textContent = String(ProfileState.stats.itemRequests || 0);
  }

  /* ─── Sync Sidebar Profile on Desktop ─── */
  function syncSidebarProfile(name, initial, photoSrc, u) {
    try {
      const sbName = document.querySelector('.sidebar-profile-name');
      const sbRole = document.querySelector('.sidebar-profile-role');
      const sbAvatar = document.querySelector('.sidebar-avatar');

      if (sbName) sbName.textContent = name;
      if (sbRole) {
        if (u.hostel && u.room) sbRole.textContent = `${u.hostel} · ${u.room}`;
        else sbRole.textContent = u.email || 'Campus Account';
      }
      if (sbAvatar) {
        if (photoSrc && photoSrc.length > 20) {
          sbAvatar.innerHTML = `<img src="${photoSrc}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
          sbAvatar.innerHTML = `<span style="font-weight:800;font-size:14px;color:#ffffff;line-height:1;">${initial}</span>`;
        }
      }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     PROFILE PHOTO UPLOAD & VALIDATION (SCREEN 2)
     Flow: Select image → validate (type & <=2MB) → compress via
     Canvas → save to DB record → update UI immediately
     ═══════════════════════════════════════════════════════════ */
  function handlePhotoUpload(file) {
    if (!file) return;

    // 1. Validate File Type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast('Please select a valid image (JPG, PNG, or WebP).', 3000);
      return;
    }

    // 2. Validate File Size (Maximum 2MB as specified in reference UI)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > MAX_SIZE) {
      toast('Image must be under 2MB in size.', 3000);
      return;
    }

    const changeBtn = document.getElementById('profileChangePhotoBtn');
    if (changeBtn) {
      changeBtn.disabled = true;
      changeBtn.innerHTML = '<span>Uploading…</span>';
    }

    const reader = new FileReader();
    reader.onerror = () => {
      toast('Failed to read image file. Please try another.', 3000);
      if (changeBtn) {
        changeBtn.disabled = false;
        changeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> <span>Change Photo</span>';
      }
    };

    reader.onload = function (e) {
      const img = new Image();
      img.onerror = () => {
        toast('Invalid image format.', 3000);
        if (changeBtn) {
          changeBtn.disabled = false;
          changeBtn.innerHTML = '<span>Change Photo</span>';
        }
      };

      img.onload = async function () {
        try {
          // Client-side square center-crop and compression to 360x360 at 0.85 quality
          const canvas = document.createElement('canvas');
          const size = 360;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Update state
          ProfileState.user.avatar = dataUrl;
          ProfileState.user.avatar_url = dataUrl;

          // 3. Persist to UserManager and authoritative Neon DB
          if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.updateProfile === 'function') {
            window.UserManager.updateProfile({ avatar: dataUrl, avatar_url: dataUrl });
          }

          if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
            await window.UniMallDB.syncUser(ProfileState.user).catch(() => {});
          }

          renderProfileUI();
          toast('Profile photo updated successfully! ✓');

        } catch (err) {
          console.error('[Profile] Error processing photo:', err);
          toast('Error updating photo. Please try again.');
        } finally {
          if (changeBtn) {
            changeBtn.disabled = false;
            changeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> <span>Change Photo</span>';
          }
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  /* ═══════════════════════════════════════════════════════════
     SAVE PROFILE CHANGES (SCREEN 2)
     Validates name, formats phone, saves to Neon DB & UserManager
     ═══════════════════════════════════════════════════════════ */
  async function saveProfileEditChanges() {
    const nameInput = document.getElementById('editProfFullName');
    const phoneInput = document.getElementById('editProfPhone');
    const hostelSelect = document.getElementById('editProfHostel');
    const roomInput = document.getElementById('editProfRoom');
    const saveBtn = document.getElementById('editProfileSaveBtn');

    const newName = nameInput?.value?.trim();
    if (!newName) {
      toast('Please enter your full name.', 2500);
      nameInput?.focus();
      return;
    }

    let cleanPhone = (phoneInput?.value || '').trim();
    if (cleanPhone && !cleanPhone.startsWith('+')) {
      cleanPhone = '+91 ' + cleanPhone.replace(/^0+/, '');
    }

    const newHostel = hostelSelect?.value?.trim() || '';
    const newRoom = roomInput?.value?.trim() || '';

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Saving Changes…</span>';
    }

    try {
      // 1. Update ProfileState
      ProfileState.user.name = newName;
      ProfileState.user.phone = cleanPhone;
      ProfileState.user.hostel = newHostel;
      ProfileState.user.room = newRoom;

      // 2. Persist to UserManager
      if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.updateProfile === 'function') {
        window.UserManager.updateProfile(ProfileState.user);
      }

      // 3. Persist to authoritative Neon PostgreSQL
      if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
        await window.UniMallDB.syncUser(ProfileState.user);
      }

      renderProfileUI();
      toast('Profile updated successfully! ✓');

      // Seamless return to Screen 1 (My Profile)
      setTimeout(() => {
        setProfileSubView('main');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>Save Changes</span>';
        }
      }, 350);

    } catch (err) {
      console.error('[Profile] Error saving profile:', err);
      toast('Failed to save changes. Please try again.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>Save Changes</span>';
      }
    }
  }
  window.saveProfileEditChanges = saveProfileEditChanges;

  /* ═══════════════════════════════════════════════════════════
     PREFERENCES MODAL LOGIC
     ═══════════════════════════════════════════════════════════ */
  function openProfilePreferencesModal() {
    const modal = document.getElementById('profilePreferencesModal');
    if (modal) modal.classList.add('open');
  }
  window.openProfilePreferencesModal = openProfilePreferencesModal;

  async function saveProfilePreferences() {
    const notifCb = document.getElementById('prefOrderNotifs');
    const promoCb = document.getElementById('prefPromoAlerts');
    const soundCb = document.getElementById('prefSoundFx');
    const langSel = document.getElementById('prefLanguage');

    const prefs = {
      orderNotifications: notifCb ? notifCb.checked : true,
      promotionalAlerts: promoCb ? promoCb.checked : true,
      soundFx: soundCb ? soundCb.checked : true,
      language: langSel ? langSel.value : 'en'
    };

    ProfileState.user.preferences = prefs;

    // Apply sound setting immediately to app
    localStorage.setItem('unimall_sound_enabled', prefs.soundFx ? 'true' : 'false');

    // Persist to UserManager & Neon DB
    if (typeof window.UserManager !== 'undefined' && typeof window.UserManager.updateProfile === 'function') {
      window.UserManager.updateProfile({ preferences: prefs });
    }
    if (typeof window.UniMallDB !== 'undefined' && typeof window.UniMallDB.syncUser === 'function') {
      window.UniMallDB.syncUser(ProfileState.user).catch(() => {});
    }

    closeProfileModals();
    toast('Preferences saved! ✓');
  }
  window.saveProfilePreferences = saveProfilePreferences;

  /* ═══════════════════════════════════════════════════════════
     HELP & ABOUT MODALS
     ═══════════════════════════════════════════════════════════ */
  function openProfileHelpModal() {
    const modal = document.getElementById('profileHelpModal');
    if (modal) modal.classList.add('open');
  }
  window.openProfileHelpModal = openProfileHelpModal;

  function openProfileAboutModal() {
    const modal = document.getElementById('profileAboutModal');
    if (modal) modal.classList.add('open');
  }
  window.openProfileAboutModal = openProfileAboutModal;

  /* ═══════════════════════════════════════════════════════════
     ITEM REQUESTS MODAL
     ═══════════════════════════════════════════════════════════ */
  function openProfileRequestsModal() {
    const modal = document.getElementById('profileRequestsModal');
    const listWrap = document.getElementById('profileRequestsListWrap');
    if (!modal) return;

    if (listWrap) {
      const requests = ProfileState.userRequests || [];
      if (requests.length === 0) {
        listWrap.innerHTML = `
          <div class="req-empty-box">
            <div class="req-empty-icon">🔍</div>
            <div class="req-empty-title">No item requests yet</div>
            <div class="req-empty-sub">Looking for stationery, tech gear, snacks, or textbooks not currently stocked in campus stores? Request it and stores will source it!</div>
          </div>
        `;
      } else {
        listWrap.innerHTML = requests.map(req => {
          const statusClass = (req.status || 'received').toLowerCase();
          const statusLabel = req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : 'Received';
          const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recently';
          return `
            <div class="req-item-card">
              <div class="req-item-header">
                <span class="req-item-title">${req.what || req.product_name || 'Requested Item'}</span>
                <span class="req-status-pill ${statusClass}">${statusLabel}</span>
              </div>
              ${req.description ? `<div class="req-item-desc">${req.description}</div>` : ''}
              <div class="req-item-date">Requested on ${dateStr}</div>
            </div>
          `;
        }).join('');
      }
    }

    modal.classList.add('open');
  }
  window.openProfileRequestsModal = openProfileRequestsModal;

  function closeProfileModals() {
    document.querySelectorAll('.profile-modal-overlay').forEach(m => m.classList.remove('open'));
  }
  window.closeProfileModals = closeProfileModals;

  /* ═══════════════════════════════════════════════════════════
     SHARE APP VIA WEB SHARE API
     ═════════════════════════════════════════════════ */
  function handleProfileShareApp() {
    const shareData = {
      title: 'UniMall — Campus Connect',
      text: 'Order snacks, stationery, and daily essentials from campus stores with zero delivery delay on UniMall!',
      url: window.location.origin
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.origin);
        toast('UniMall link copied to clipboard! 📋');
      } catch (e) {
        toast('Visit ' + window.location.origin);
      }
    }
  }
  window.handleProfileShareApp = handleProfileShareApp;

  /* ═══════════════════════════════════════════════════════════
     LOGOUT CONTROLLER
     ═════════════════════════════════════════════════ */
  function showProfileLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('hidden');
    else handleLogout();
  }
  window.showProfileLogoutModal = showProfileLogoutModal;

  async function handleLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('hidden');

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

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed.currentUser;
          parsed.orders = [];
          parsed.cart = [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}

      if (typeof window.UniMallAuth !== 'undefined' && typeof window.UniMallAuth.signOut === 'function') {
        await window.UniMallAuth.signOut().catch(() => {});
      }
    } catch (err) {
      console.warn('[Profile] Logout error:', err);
    }

    toast('Logged out successfully');
    setTimeout(() => {
      window.location.replace('/login/?logout=true');
    }, 350);
  }
  window.handleLogout = handleLogout;

  /* ─── Initialize Event Listeners ─── */
  function initProfileEvents() {
    // 1. File input for profile photo change
    const photoInput = document.getElementById('profilePhotoInput');
    photoInput?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handlePhotoUpload(file);
      }
      photoInput.value = ''; // Reset for next pick
    });

    // 2. Real-time avatar initial preview while typing in edit screen
    const nameInput = document.getElementById('editProfFullName');
    nameInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const initial = val ? val.charAt(0).toUpperCase() : 'U';
      const editInitialEl = document.getElementById('profileEditInitial');
      const editPhotoEl = document.getElementById('profileEditPhoto');
      if (editInitialEl && (!editPhotoEl || editPhotoEl.classList.contains('hidden'))) {
        editInitialEl.textContent = initial;
      }
    });

    // 3. Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeProfileModals();
    });
  }

  /* ─── Global Hooks & Initialization ─── */
  window.renderProfileView = function () {
    loadProfileData();
    setProfileSubView('main');
  };

  document.addEventListener('DOMContentLoaded', () => {
    initProfileEvents();
    loadProfileData();
  });

  // Re-sync when auth state or user profile changes elsewhere
  window.addEventListener('unimall:auth_state_changed', () => {
    loadProfileData();
  });

  window.addEventListener('unimall:user_changed', () => {
    loadProfileData();
  });

})();
