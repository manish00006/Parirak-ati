// ============================================
// PariRakṣati — Location Service
// ============================================
const LocationService = {
  _watchId: null,
  _interval: null,

  start() {
    if (!navigator.geolocation) {
      console.warn('[Location] Geolocation not supported');
      return;
    }

    // Watch position
    this._watchId = navigator.geolocation.watchPosition(
      pos => this._onPosition(pos),
      err => console.warn('[Location] Error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Adaptive polling based on settings
    const freq = Store.get('settings.lowPowerMode') ? 30000 : 
                 Store.get('settings.trackingFrequency') === 'high' ? 5000 : 10000;
    this._interval = setInterval(() => this._poll(), freq);
  },

  stop() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  },

  _onPosition(pos) {
    const { latitude, longitude, speed, heading } = pos.coords;
    Store.set('tracking.currentLat', latitude);
    Store.set('tracking.currentLng', longitude);
    Store.set('tracking.speed', speed || 0);
    Store.set('tracking.heading', heading || 0);
    Store.set('tracking.lastUpdate', new Date().toISOString());

    // Add to route history
    const history = Store.get('tracking.routeHistory') || [];
    history.push({ lat: latitude, lng: longitude, time: Date.now() });
    if (history.length > 500) history.shift(); // keep last 500 points
    Store.set('tracking.routeHistory', history);

    // Check geofences
    this._checkGeofences(latitude, longitude);
  },

  _poll() {
    Utils.getCurrentPosition()
      .then(pos => {
        Store.set('tracking.currentLat', pos.lat);
        Store.set('tracking.currentLng', pos.lng);
      })
      .catch(() => {});
  },

  _checkGeofences(lat, lng) {
    const zones = Store.get('safetyZones') || [];
    zones.forEach(zone => {
      const dist = Utils.distance(lat, lng, zone.lat, zone.lng);
      const inside = dist <= zone.radius;
      const prevState = zone._inside;

      if (inside && !prevState && zone.entryAlert) {
        Utils.notify('Safe Arrival', `${Store.get('childProfile.name')} arrived at ${zone.name}`);
        Utils.toast(`Arrived at ${zone.name}`, 'success');
      } else if (!inside && prevState && zone.exitAlert) {
        Utils.notify('Zone Alert', `${Store.get('childProfile.name')} left ${zone.name}`);
        Utils.toast(`Left ${zone.name}`, 'error');
      }
      zone._inside = inside;
    });
  },

  getFormattedLocation() {
    const lat = Store.get('tracking.currentLat');
    const lng = Store.get('tracking.currentLng');
    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  }
};
