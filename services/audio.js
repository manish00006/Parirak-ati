// ============================================
// PariRakṣati — Audio Recording Service
// ============================================
const AudioService = {
  _mediaRecorder: null,
  _chunks: [],
  _stream: null,

  async start() {
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._mediaRecorder = new MediaRecorder(this._stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      this._chunks = [];

      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this._chunks.push(e.data);
      };

      this._mediaRecorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: 'audio/webm' });
        this._saveRecording(blob);
      };

      this._mediaRecorder.start(5000); // save in 5s chunks
      Store.set('emergency.recording', true);
      console.log('[Audio] Recording started');
    } catch (err) {
      console.error('[Audio] Failed to start:', err);
      Utils.toast('Microphone access denied', 'error');
    }
  },

  stop() {
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    Store.set('emergency.recording', false);
    console.log('[Audio] Recording stopped');
  },

  async _saveRecording(blob) {
    // Save to IndexedDB for offline access
    try {
      const db = await this._openDB();
      const tx = db.transaction('recordings', 'readwrite');
      tx.objectStore('recordings').add({
        timestamp: Date.now(),
        blob: blob,
        location: {
          lat: Store.get('tracking.currentLat'),
          lng: Store.get('tracking.currentLng')
        }
      });
      console.log('[Audio] Recording saved to local DB');
    } catch (err) {
      console.error('[Audio] Failed to save:', err);
    }
  },

  _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('PariRakshatiDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('emergency_queue')) {
          db.createObjectStore('emergency_queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('location_history')) {
          db.createObjectStore('location_history', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
};
