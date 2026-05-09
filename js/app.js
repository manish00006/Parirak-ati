// ============================================
// PariRakṣati — Main Application
// ============================================
const App = {
  async init() {
    // Apply theme
    const theme = Store.get('settings.darkMode') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[SW]', e));
    }

    // Request permissions
    Utils.requestNotificationPermission();

    // Init router
    Router.init();

    // Show splash then proceed
    Router.navigate('splash');
    setTimeout(() => {
      if (Store.get('isLoggedIn')) {
        Router.navigate('home');
        this._startServices();
      } else {
        Router.navigate('login');
      }
    }, 2000);

    // Setup bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => Router.navigate(item.dataset.screen));
    });

    // Online/offline detection
    window.addEventListener('online', () => Utils.toast('Back online ✅', 'success'));
    window.addEventListener('offline', () => Utils.toast('You are offline 📡', 'error'));

    // Battery updates
    this._updateBattery();

    // Setup screen interactions
    this._setupHome();
    this._setupLogin();
    this._setupEmergency();
    this._setupFakeCall();
    this._setupSettings();
    this._setupGuardians();
    this._setupZones();
    this._setupTracking();
  },

  _startServices() {
    if (Store.get('settings.locationTracking')) LocationService.start();
    if (Store.get('settings.voiceDetection')) VoiceTrigger.start();
    AISafetyMonitor.start();
  },

  async _updateBattery() {
    const level = await Utils.getBattery();
    Store.set('childProfile.battery', level);
    const el = document.getElementById('battery-level');
    if (el) el.textContent = `${level}%`;
    setTimeout(() => this._updateBattery(), 60000);
  },

  // ---- Login Screen ----
  _setupLogin() {
    const typeButtons = document.querySelectorAll('.account-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Store.set('accountType', btn.dataset.type);
      });
    });

    document.getElementById('send-otp-btn')?.addEventListener('click', () => {
      const phone = document.getElementById('phone-input')?.value;
      if (!phone || phone.length < 10) {
        Utils.toast('Enter valid phone number', 'error');
        return;
      }
      document.getElementById('login-phone-step').classList.add('hidden');
      document.getElementById('login-otp-step').classList.remove('hidden');
      Utils.toast('OTP sent to +91 ' + phone, 'success');
      // Auto-focus first OTP box
      document.querySelector('.otp-box')?.focus();
    });

    // OTP auto-advance
    document.querySelectorAll('.otp-box').forEach((box, i, boxes) => {
      box.addEventListener('input', () => {
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
        if (i === boxes.length - 1 && box.value) this._verifyOTP();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
    });

    document.getElementById('verify-otp-btn')?.addEventListener('click', () => this._verifyOTP());
  },

  _verifyOTP() {
    const otp = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
    if (otp.length < 6) { Utils.toast('Enter complete OTP', 'error'); return; }
    Store.set('isLoggedIn', true);
    Utils.toast('Welcome to PariRakṣati! 🛡️', 'success');
    Router.navigate('home');
    this._startServices();
  },

  // ---- Home Screen ----
  _setupHome() {
    // SOS Button
    let sosTimeout = null;
    const sosBtn = document.getElementById('sos-btn');
    const countdown = document.getElementById('sos-countdown');

    sosBtn?.addEventListener('click', () => {
      Utils.vibrate([100]);
      countdown?.classList.remove('hidden');
      let count = 3;
      document.getElementById('countdown-num').textContent = count;

      sosTimeout = setInterval(() => {
        count--;
        document.getElementById('countdown-num').textContent = count;
        Utils.vibrate([200]);
        if (count <= 0) {
          clearInterval(sosTimeout);
          countdown?.classList.add('hidden');
          EmergencyMode.activate();
        }
      }, 1000);
    });

    document.getElementById('cancel-sos')?.addEventListener('click', () => {
      clearInterval(sosTimeout);
      countdown?.classList.add('hidden');
      Utils.toast('SOS cancelled', 'info');
    });

    // Quick actions
    document.getElementById('qa-safe')?.addEventListener('click', () => {
      Store.set('childProfile.status', 'safe');
      Utils.toast('Status updated: I am safe ✅', 'success');
      Utils.notify('Safe Status', `${Store.get('childProfile.name')} marked safe`);
    });
    document.getElementById('qa-track')?.addEventListener('click', () => {
      EmergencyMode.shareLocation();
    });
    document.getElementById('qa-call')?.addEventListener('click', () => {
      const primary = Store.get('guardians').find(g => g.relation === 'Mother');
      if (primary) Utils.makeCall(primary.phone.replace(/\s/g, ''));
    });
    document.getElementById('qa-fake')?.addEventListener('click', () => {
      this._showFakeCallPicker();
    });
    document.getElementById('qa-route')?.addEventListener('click', () => {
      Router.navigate('tracking');
    });

    // Update status display
    this._updateHomeStatus();
  },

  _updateHomeStatus() {
    const status = Store.get('childProfile.status');
    const statusEl = document.getElementById('safety-status');
    if (statusEl) {
      statusEl.className = `status-pill status-pill-${status === 'safe' ? 'safe' : 'danger'}`;
      statusEl.innerHTML = `<span class="badge-dot badge-dot-${status === 'safe' ? 'safe' : 'danger'}"></span> ${status === 'safe' ? 'Safe' : 'Alert'}`;
    }
    const gps = document.getElementById('gps-indicator');
    if (gps) gps.style.background = Store.get('childProfile.gpsActive') ? 'var(--clr-safe)' : 'var(--clr-text-tertiary)';
    const net = document.getElementById('net-indicator');
    if (net) net.style.background = Utils.isOnline() ? 'var(--clr-safe)' : 'var(--clr-text-tertiary)';
  },

  _showFakeCallPicker() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'fake-call-picker';
    overlay.innerHTML = `
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <h3 style="margin-bottom:16px;">Choose Caller</h3>
        <div class="flex-col gap-3">
          <button class="guardian-card" data-caller="mom"><span style="font-size:28px;">👩</span><div class="guardian-info"><div class="guardian-name">Mom</div></div></button>
          <button class="guardian-card" data-caller="dad"><span style="font-size:28px;">👨</span><div class="guardian-info"><div class="guardian-name">Dad</div></div></button>
          <button class="guardian-card" data-caller="police"><span style="font-size:28px;">👮</span><div class="guardian-info"><div class="guardian-name">Police</div></div></button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      const caller = e.target.closest('[data-caller]')?.dataset.caller;
      if (caller) { overlay.remove(); FakeCallService.trigger(caller); }
      else if (e.target === overlay) overlay.remove();
    });
  },

  // ---- Emergency Screen ----
  _setupEmergency() {
    document.getElementById('em-call-police')?.addEventListener('click', () => EmergencyMode.callPolice());
    document.getElementById('em-call-parent')?.addEventListener('click', () => {
      const mom = Store.get('guardians').find(g => g.relation === 'Mother');
      if (mom) Utils.makeCall(mom.phone.replace(/\s/g, ''));
    });
    document.getElementById('em-share-loc')?.addEventListener('click', () => EmergencyMode.shareLocation());
    document.getElementById('em-stop')?.addEventListener('click', () => EmergencyMode.deactivate());
    document.getElementById('em-siren')?.addEventListener('click', function() {
      if (this.dataset.active === 'true') { EmergencyMode.stopSiren(); this.dataset.active = 'false'; this.textContent = '🔊 Siren'; }
      else { EmergencyMode.playSiren(); this.dataset.active = 'true'; this.textContent = '🔇 Stop Siren'; }
    });
  },

  // ---- Fake Call Screen ----
  _setupFakeCall() {
    document.getElementById('fake-accept')?.addEventListener('click', () => FakeCallService.answer());
    document.getElementById('fake-decline')?.addEventListener('click', () => FakeCallService.decline());
    document.getElementById('fake-end')?.addEventListener('click', () => FakeCallService.end());
  },

  // ---- Settings Screen ----
  _setupSettings() {
    const toggleMap = {
      'toggle-voice': 'settings.voiceDetection',
      'toggle-shake': 'settings.shakeDetection',
      'toggle-power-sos': 'settings.powerButtonSOS',
      'toggle-auto-record': 'settings.autoRecording',
      'toggle-dark': 'settings.darkMode',
      'toggle-location': 'settings.locationTracking',
      'toggle-lowpower': 'settings.lowPowerMode'
    };

    Object.entries(toggleMap).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = Store.get(key);
        el.addEventListener('change', () => {
          Store.set(key, el.checked);
          if (key === 'settings.darkMode') {
            document.documentElement.setAttribute('data-theme', el.checked ? 'dark' : 'light');
          }
          if (key === 'settings.voiceDetection') {
            el.checked ? VoiceTrigger.start() : VoiceTrigger.stop();
          }
          if (key === 'settings.locationTracking') {
            el.checked ? LocationService.start() : LocationService.stop();
          }
        });
      }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      Store.set('isLoggedIn', false);
      LocationService.stop();
      VoiceTrigger.stop();
      AISafetyMonitor.stop();
      Router.navigate('login');
      Utils.toast('Logged out', 'info');
    });
  },

  // ---- Guardians Screen ----
  _setupGuardians() {
    document.getElementById('add-guardian-btn')?.addEventListener('click', () => {
      this._showAddGuardianSheet();
    });
  },

  _showAddGuardianSheet(editId = null) {
    const guardians = Store.get('guardians');
    const existing = editId ? guardians.find(g => g.id === editId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <h3 style="margin-bottom:16px;">${existing ? 'Edit Guardian' : 'Add Guardian'}</h3>
        <div class="flex-col gap-4">
          <div class="input-group"><label class="input-label">Name</label><input class="input-field" id="new-g-name" placeholder="Enter name" value="${existing ? existing.name : ''}"></div>
          <div class="input-group"><label class="input-label">Phone</label><input class="input-field" id="new-g-phone" placeholder="+91 98765 43210" type="tel" value="${existing ? existing.phone : ''}"></div>
          <div class="input-group"><label class="input-label">Relationship</label>
            <select class="input-field" id="new-g-relation" style="background:var(--clr-surface);">
              <option ${existing && existing.relation === 'Mother' ? 'selected' : ''}>Mother</option>
              <option ${existing && existing.relation === 'Father' ? 'selected' : ''}>Father</option>
              <option ${existing && existing.relation === 'Relative' ? 'selected' : ''}>Relative</option>
              <option ${existing && existing.relation === 'School' ? 'selected' : ''}>School</option>
              <option ${existing && existing.relation === 'Neighbor' ? 'selected' : ''}>Neighbor</option>
            </select>
          </div>
          <button class="btn btn-primary w-full" id="save-guardian-btn">${existing ? 'Save Changes' : 'Add Guardian'}</button>
          ${existing ? '<button class="btn w-full" id="delete-guardian-btn" style="color:var(--clr-emergency); border: 1px solid var(--clr-emergency);">Delete Guardian</button>' : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    
    document.getElementById('save-guardian-btn').addEventListener('click', () => {
      const name = document.getElementById('new-g-name').value;
      const phone = document.getElementById('new-g-phone').value;
      const relation = document.getElementById('new-g-relation').value;
      if (!name || !phone) { Utils.toast('Fill all fields', 'error'); return; }
      
      const avatars = { Mother: '👩', Father: '👨', Relative: '👤', School: '🏫', Neighbor: '🏘️' };
      let updatedGuardians = Store.get('guardians');
      
      if (existing) {
        updatedGuardians = updatedGuardians.map(g => g.id === editId ? { ...g, name, phone, relation, avatar: avatars[relation] || '👤' } : g);
      } else {
        updatedGuardians.push({ id: Date.now(), name, relation, phone, avatar: avatars[relation] || '👤', isPrimary: false });
      }
      
      Store.set('guardians', updatedGuardians);
      this._renderGuardians();
      overlay.remove();
      Utils.toast(existing ? 'Guardian updated ✅' : 'Guardian added ✅', 'success');
    });

    if (existing) {
      document.getElementById('delete-guardian-btn').addEventListener('click', () => {
        const updatedGuardians = Store.get('guardians').filter(g => g.id !== editId);
        Store.set('guardians', updatedGuardians);
        this._renderGuardians();
        overlay.remove();
        Utils.toast('Guardian deleted 🗑️', 'info');
      });
    }
  },

  _editGuardian(id) {
    this._showAddGuardianSheet(id);
  },

  _renderGuardians() {
    const list = document.getElementById('guardians-list');
    if (!list) return;
    const guardians = Store.get('guardians');
    list.innerHTML = guardians.map(g => `
      <div class="guardian-card fade-in">
        <div class="avatar">${g.avatar}</div>
        <div class="guardian-info">
          <div class="guardian-name">${g.name}</div>
          <div class="guardian-relation">${g.relation}</div>
          <div class="guardian-phone">${g.phone}</div>
        </div>
        <div class="guardian-actions" style="display: flex; gap: 8px;">
          <button class="guardian-edit-btn" onclick="App._editGuardian(${g.id})" style="width: 44px; height: 44px; border-radius: 50%; background: var(--clr-surface-hover); display: flex; align-items: center; justify-content: center; font-size: 20px;">✏️</button>
          <button class="guardian-call-btn" onclick="Utils.makeCall('${g.phone.replace(/\s/g, '')}')">📞</button>
        </div>
      </div>
    `).join('');
  },

  // ---- Safety Zones ----
  _setupZones() {
    document.getElementById('add-zone-btn')?.addEventListener('click', () => {
      this._showAddZoneSheet();
    });
    this._renderZones();
  },

  _showAddZoneSheet(editId = null) {
    const zones = Store.get('safetyZones');
    const existing = editId ? zones.find(z => z.id === editId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <h3 style="margin-bottom:16px;">${existing ? 'Edit Zone' : 'Add Zone'}</h3>
        <div class="flex-col gap-4">
          <div class="input-group"><label class="input-label">Zone Name</label><input class="input-field" id="new-z-name" placeholder="e.g. Grandma's House" value="${existing ? existing.name : ''}"></div>
          <div class="input-group"><label class="input-label">Radius (meters)</label><input class="input-field" id="new-z-radius" type="number" placeholder="100" value="${existing ? existing.radius : '100'}"></div>
          <div class="flex-between">
            <span>Entry Alert</span>
            <label class="toggle"><input type="checkbox" id="new-z-entry" ${!existing || existing.entryAlert ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="flex-between">
            <span>Exit Alert</span>
            <label class="toggle"><input type="checkbox" id="new-z-exit" ${!existing || existing.exitAlert ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <button class="btn btn-primary w-full" id="save-zone-btn">${existing ? 'Save Changes' : 'Add Zone'}</button>
          ${existing ? '<button class="btn w-full" id="delete-zone-btn" style="color:var(--clr-emergency); border: 1px solid var(--clr-emergency);">Delete Zone</button>' : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    
    document.getElementById('save-zone-btn').addEventListener('click', () => {
      const name = document.getElementById('new-z-name').value;
      const radius = parseInt(document.getElementById('new-z-radius').value) || 100;
      const entryAlert = document.getElementById('new-z-entry').checked;
      const exitAlert = document.getElementById('new-z-exit').checked;
      
      if (!name) { Utils.toast('Enter a zone name', 'error'); return; }
      
      let updatedZones = Store.get('safetyZones');
      
      if (existing) {
        updatedZones = updatedZones.map(z => z.id === editId ? { ...z, name, radius, entryAlert, exitAlert } : z);
      } else {
        const icon = '📍';
        const color = '#2563EB'; // default blue
        updatedZones.push({ id: Date.now(), name, radius, lat: 0, lng: 0, icon, color, entryAlert, exitAlert });
      }
      
      Store.set('safetyZones', updatedZones);
      this._renderZones();
      overlay.remove();
      Utils.toast(existing ? 'Zone updated ✅' : 'Zone added ✅', 'success');
    });

    if (existing) {
      document.getElementById('delete-zone-btn').addEventListener('click', () => {
        const updatedZones = Store.get('safetyZones').filter(z => z.id !== editId);
        Store.set('safetyZones', updatedZones);
        this._renderZones();
        overlay.remove();
        Utils.toast('Zone deleted 🗑️', 'info');
      });
    }
  },

  _editZone(id) {
    this._showAddZoneSheet(id);
  },

  _renderZones() {
    const list = document.getElementById('zones-list');
    if (!list) return;
    const zones = Store.get('safetyZones');
    list.innerHTML = zones.map(z => `
      <div class="zone-card fade-in">
        <div class="flex-between">
          <div class="zone-header" style="margin-bottom:0;">
            <div class="zone-icon" style="background:${z.color}20;color:${z.color};">${z.icon}</div>
            <div><div class="zone-name">${z.name}</div><div class="zone-radius text-xs text-secondary">${z.radius}m radius</div></div>
          </div>
          <button class="guardian-edit-btn" onclick="App._editZone(${z.id})" style="width: 36px; height: 36px; border-radius: 50%; background: var(--clr-surface-hover); display: flex; align-items: center; justify-content: center; font-size: 16px;">✏️</button>
        </div>
        <div class="zone-alerts" style="margin-top: 12px;">
          ${z.entryAlert ? '<span class="zone-alert-tag">✅ Entry Alert</span>' : ''}
          ${z.exitAlert ? '<span class="zone-alert-tag">🚪 Exit Alert</span>' : ''}
        </div>
      </div>
    `).join('');
  },

  // ---- Tracking Screen ----
  _setupTracking() {
    document.getElementById('refresh-location')?.addEventListener('click', async () => {
      try {
        const pos = await Utils.getCurrentPosition();
        Store.set('tracking.currentLat', pos.lat);
        Store.set('tracking.currentLng', pos.lng);
        Store.set('tracking.lastUpdate', new Date().toISOString());
        this._updateTrackingUI();
        Utils.toast('Location updated', 'success');
      } catch(e) {
        Utils.toast('Could not get location', 'error');
      }
    });
    this._updateTrackingUI();
  },

  _updateTrackingUI() {
    const lat = Store.get('tracking.currentLat');
    const lng = Store.get('tracking.currentLng');
    const locEl = document.getElementById('current-location-text');
    if (locEl) locEl.textContent = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
    const mapFrame = document.getElementById('map-frame');
    if (mapFrame) {
      mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
