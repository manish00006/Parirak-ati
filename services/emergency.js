// ============================================
// PariRakṣati — Emergency Mode Controller
// ============================================
const EmergencyMode = {
  _sirenAudio: null,
  _locationInterval: null,

  activate() {
    console.log('[Emergency] ACTIVATED');
    Store.set('emergency.active', true);
    Store.set('emergency.startTime', Date.now());
    Store.set('childProfile.status', 'emergency');

    Utils.vibrate([500, 200, 500, 200, 500]);

    // 1. Start audio recording
    AudioService.start();

    // 2. Continuous location streaming
    this._locationInterval = setInterval(async () => {
      try {
        const pos = await Utils.getCurrentPosition();
        Store.set('tracking.currentLat', pos.lat);
        Store.set('tracking.currentLng', pos.lng);
        Store.set('emergency.location', pos);
      } catch(e) {}
    }, 3000);

    // 3. Send emergency alerts to guardians
    this._alertGuardians();

    // 4. Send notification
    Utils.notify('🚨 EMERGENCY ACTIVATED', `${Store.get('childProfile.name')} activated emergency mode!`);

    // 5. Navigate to emergency screen
    Router.navigate('emergency');
  },

  deactivate() {
    console.log('[Emergency] Deactivated');
    Store.set('emergency.active', false);
    Store.set('childProfile.status', 'safe');

    AudioService.stop();

    if (this._locationInterval) {
      clearInterval(this._locationInterval);
      this._locationInterval = null;
    }

    this.stopSiren();

    Utils.toast('Emergency mode deactivated', 'success');
    Router.navigate('home');
  },

  _alertGuardians() {
    const guardians = Store.get('guardians') || [];
    const childName = Store.get('childProfile.name');
    const lat = Store.get('tracking.currentLat');
    const lng = Store.get('tracking.currentLng');
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const message = `🚨 EMERGENCY! ${childName} needs help! Location: ${mapsLink} Time: ${new Date().toLocaleString('en-IN')}`;

    // Join all primary contacts with commas for group SMS
    const primaryPhones = guardians
      .filter(g => g.isPrimary)
      .map(g => g.phone.replace(/\s/g, ''))
      .join(',');

    if (primaryPhones) {
      Utils.sendSMS(primaryPhones, message);
      Utils.toast('Emergency SMS triggered via your SMS app.', 'error');
    } else {
      Utils.toast('No primary guardians found to send SMS.', 'error');
    }
  },

  playSiren() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      gain.gain.value = 0.3;

      let freq = 440;
      const interval = setInterval(() => {
        freq = freq === 440 ? 880 : 440;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
      }, 500);

      osc.start();
      this._sirenAudio = { ctx, osc, gain, interval };
    } catch(e) {
      console.warn('[Emergency] Siren failed:', e);
    }
  },

  stopSiren() {
    if (this._sirenAudio) {
      try {
        clearInterval(this._sirenAudio.interval);
        this._sirenAudio.osc.stop();
        this._sirenAudio.ctx.close();
      } catch(e) {}
      this._sirenAudio = null;
    }
  },

  callPolice() {
    Utils.makeCall('100');
  },

  shareLocation() {
    const lat = Store.get('tracking.currentLat');
    const lng = Store.get('tracking.currentLng');
    const url = `https://maps.google.com/?q=${lat},${lng}`;

    if (navigator.share) {
      navigator.share({
        title: 'Emergency - My Location',
        text: `🚨 EMERGENCY! I need help! My location:`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        Utils.toast('Location copied to clipboard', 'info');
      });
    }
  }
};
