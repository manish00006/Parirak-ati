// ============================================
// PariRakṣati — Fake Call Service
// ============================================
const FakeCallService = {
  _ringtoneCtx: null,
  _timerInterval: null,

  callers: {
    mom: { name: 'Mom ❤️', avatar: '👩', phone: '+91 98765 43210' },
    dad: { name: 'Dad 💪', avatar: '👨', phone: '+91 98765 43211' },
    police: { name: 'Police 🚔', avatar: '👮', phone: '100' }
  },

  trigger(callerKey) {
    const caller = this.callers[callerKey];
    if (!caller) return;

    Store.set('fakeCall.active', true);
    Store.set('fakeCall.caller', caller);
    Store.set('fakeCall.answered', false);
    Store.set('fakeCall.timer', 0);

    this._playRingtone();
    Utils.vibrate([500, 300, 500, 300, 500, 300, 500]);

    Router.navigate('fake-call');
  },

  answer() {
    this._stopRingtone();
    Store.set('fakeCall.answered', true);
    Store.set('fakeCall.timer', 0);

    this._timerInterval = setInterval(() => {
      const t = Store.get('fakeCall.timer') + 1;
      Store.set('fakeCall.timer', t);
      const el = document.getElementById('fake-call-duration');
      if (el) el.textContent = Utils.formatDuration(t);
    }, 1000);
  },

  decline() {
    this.end();
  },

  end() {
    this._stopRingtone();
    Store.set('fakeCall.active', false);
    Store.set('fakeCall.answered', false);
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    Router.navigate('home');
  },

  _playRingtone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0.2;

      // Ring pattern
      const now = ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        const start = now + i * 2;
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.setValueAtTime(0, start + 0.4);
        gain.gain.setValueAtTime(0.2, start + 0.5);
        gain.gain.setValueAtTime(0, start + 0.9);
        // silence for rest of 2s
      }

      osc.start();
      this._ringtoneCtx = { ctx, osc, gain };
    } catch(e) {
      console.warn('[FakeCall] Ringtone failed:', e);
    }
  },

  _stopRingtone() {
    if (this._ringtoneCtx) {
      try {
        this._ringtoneCtx.osc.stop();
        this._ringtoneCtx.ctx.close();
      } catch(e) {}
      this._ringtoneCtx = null;
    }
  }
};
