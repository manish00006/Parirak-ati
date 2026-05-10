// ============================================
// PariRakṣati — Lightweight State Store
// ============================================
const Store = {
  _state: {
    currentScreen: 'splash',
    theme: localStorage.getItem('pr-theme') || 'light',
    isLoggedIn: localStorage.getItem('pr-logged-in') === 'true',
    accountType: localStorage.getItem('pr-account-type') || null,
    userName: localStorage.getItem('pr-user-name') || 'Shidu',
    childProfile: {
      name: 'Shidu',
      avatar: '👧',
      age: 8,
      status: 'safe', // safe, alert, emergency
      battery: 78,
      gpsActive: true,
      internetActive: true
    },
    guardians: (() => {
      let g = JSON.parse(localStorage.getItem('pr-guardians') || 'null');
      // If old default is found, wipe it out so Ashlesha & Manish become default
      if (g && g.length > 0 && g[0].name === 'Aarti Panchwate') {
        g = null; 
      }
      return g || [
        { id: 1, name: 'Ashlesha Panchwate', relation: 'Mother', phone: '+91 96532 07169', avatar: '👩', isPrimary: true },
        { id: 2, name: 'Manish Panchwate', relation: 'Father', phone: '+91 70214 17839', avatar: '👨', isPrimary: true },
        { id: 3, name: 'Sunita Deshpande', relation: 'Grandmother', phone: '+91 98765 43212', avatar: '👵', isPrimary: false },
        { id: 4, name: 'Delhi Public School', relation: 'School', phone: '+91 11 2345 6789', avatar: '🏫', isPrimary: false }
      ];
    })(),
    safetyZones: JSON.parse(localStorage.getItem('pr-zones') || 'null') || [
      { id: 1, name: 'Home', icon: '🏠', lat: 19.0760, lng: 72.8777, radius: 100, entryAlert: true, exitAlert: true, color: '#16A34A' },
      { id: 2, name: 'School', icon: '🏫', lat: 19.0820, lng: 72.8850, radius: 200, entryAlert: true, exitAlert: true, color: '#2563EB' },
      { id: 3, name: 'Tuition', icon: '📚', lat: 19.0790, lng: 72.8800, radius: 50, entryAlert: false, exitAlert: true, color: '#7C3AED' },
      { id: 4, name: 'Playground', icon: '🎪', lat: 19.0740, lng: 72.8760, radius: 150, entryAlert: true, exitAlert: true, color: '#F59E0B' }
    ],
    settings: JSON.parse(localStorage.getItem('pr-settings') || 'null') || {
      voiceDetection: true,
      shakeDetection: true,
      powerButtonSOS: true,
      autoRecording: true,
      darkMode: false,
      locationTracking: true,
      lowPowerMode: false,
      trackingFrequency: 'normal' // low, normal, high
    },
    emergency: {
      active: false,
      startTime: null,
      recording: false,
      location: null
    },
    tracking: {
      currentLat: 19.0760,
      currentLng: 72.8777,
      speed: 0,
      heading: 0,
      lastUpdate: null,
      routeHistory: []
    },
    fakeCall: {
      active: false,
      caller: null,
      answered: false,
      timer: 0
    }
  },

  _listeners: [],

  get(key) {
    if (key) {
      const keys = key.split('.');
      let val = this._state;
      for (const k of keys) { val = val?.[k]; }
      return val;
    }
    return this._state;
  },

  set(key, value) {
    const keys = key.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._notify(key, value);
    this._persist(key);
  },

  _notify(key, value) {
    this._listeners.forEach(fn => fn(key, value));
  },

  on(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },

  _persist(key) {
    if (key.startsWith('settings')) {
      localStorage.setItem('pr-settings', JSON.stringify(this._state.settings));
    } else if (key.startsWith('guardians')) {
      localStorage.setItem('pr-guardians', JSON.stringify(this._state.guardians));
    } else if (key.startsWith('safetyZones')) {
      localStorage.setItem('pr-zones', JSON.stringify(this._state.safetyZones));
    } else if (key === 'theme') {
      localStorage.setItem('pr-theme', this._state.theme);
    } else if (key === 'isLoggedIn') {
      localStorage.setItem('pr-logged-in', this._state.isLoggedIn);
    } else if (key === 'accountType') {
      localStorage.setItem('pr-account-type', this._state.accountType);
    } else if (key === 'userName') {
      localStorage.setItem('pr-user-name', this._state.userName);
    }
  }
};
