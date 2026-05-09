// ============================================
// PariRakṣati — Voice Trigger Service
// ============================================
const VoiceTrigger = {
  _recognition: null,
  _active: false,
  _safetyTimeout: null,

  // Emergency keywords in multiple languages
  KEYWORDS: {
    en: ['help', 'save me', 'danger', 'emergency', 'please help'],
    hi: ['bachao', 'madad', 'mummy', 'khatara', 'bacha lo'],
    mr: ['vaachva', 'madad', 'aai', 'dhoka']
  },

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech Recognition not supported');
      return false;
    }

    this._recognition = new SpeechRecognition();
    this._recognition.continuous = true;
    this._recognition.interimResults = true;
    this._recognition.lang = 'en-IN'; // Indian English, also catches Hindi

    this._recognition.onresult = (e) => this._onResult(e);
    this._recognition.onerror = (e) => {
      console.warn('[Voice] Error:', e.error);
      if (this._active && e.error !== 'no-speech') {
        setTimeout(() => this.start(), 1000);
      }
    };
    this._recognition.onend = () => {
      if (this._active) {
        setTimeout(() => {
          try { this._recognition.start(); } catch(e) {}
        }, 500);
      }
    };

    return true;
  },

  start() {
    if (!this._recognition) {
      if (!this.init()) return;
    }
    this._active = true;
    try {
      this._recognition.start();
      console.log('[Voice] Listening started');
    } catch (e) {
      console.warn('[Voice] Already running');
    }
  },

  stop() {
    this._active = false;
    if (this._recognition) {
      this._recognition.stop();
    }
    if (this._safetyTimeout) {
      clearTimeout(this._safetyTimeout);
    }
    console.log('[Voice] Listening stopped');
  },

  _onResult(event) {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript.toLowerCase().trim())
      .join(' ');

    // Check all language keywords
    const allKeywords = [
      ...this.KEYWORDS.en,
      ...this.KEYWORDS.hi,
      ...this.KEYWORDS.mr
    ];

    const detected = allKeywords.find(kw => transcript.includes(kw));
    if (detected) {
      console.log('[Voice] Keyword detected:', detected);
      this._triggerSafetyCheck(detected);
    }
  },

  _triggerSafetyCheck(keyword) {
    // Show safety confirmation
    Utils.vibrate([300, 100, 300]);
    this._showSafetyDialog(keyword);
  },

  _showSafetyDialog(keyword) {
    // Create safety check overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'voice-safety-check';
    overlay.innerHTML = `
      <div class="bottom-sheet" style="text-align:center;">
        <div class="sheet-handle"></div>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3>Voice Alert Detected</h3>
        <p class="text-secondary" style="margin:12px 0;">We heard "<strong>${keyword}</strong>"</p>
        <h2 style="margin:16px 0;">Are you safe?</h2>
        <div style="display:flex;gap:12px;margin-top:24px;">
          <button class="btn btn-safe btn-lg w-full" id="voice-safe-btn">
            ✅ I'm Safe
          </button>
          <button class="btn btn-emergency btn-lg w-full" id="voice-emergency-btn">
            🚨 Need Help
          </button>
        </div>
        <p class="text-xs text-secondary" style="margin-top:12px;">
          Auto-activating emergency in <span id="voice-countdown">10</span>s...
        </p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Countdown auto-emergency
    let countdown = 10;
    const countdownEl = document.getElementById('voice-countdown');
    this._safetyTimeout = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(this._safetyTimeout);
        overlay.remove();
        // Activate emergency mode
        if (typeof EmergencyMode !== 'undefined') {
          EmergencyMode.activate();
        }
      }
    }, 1000);

    // Safe button
    document.getElementById('voice-safe-btn').onclick = () => {
      clearInterval(this._safetyTimeout);
      overlay.remove();
      Utils.toast('Glad you\'re safe! 💚', 'success');
    };

    // Emergency button
    document.getElementById('voice-emergency-btn').onclick = () => {
      clearInterval(this._safetyTimeout);
      overlay.remove();
      if (typeof EmergencyMode !== 'undefined') {
        EmergencyMode.activate();
      }
    };
  }
};
