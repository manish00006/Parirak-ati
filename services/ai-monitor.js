// ============================================
// PariRakṣati — AI Safety Monitor (Lightweight)
// ============================================
const AISafetyMonitor = {
  _interval: null,
  _lastMovement: Date.now(),
  _lastAlertTime: 0,

  // Configuration
  config: {
    maxStopDuration: 10 * 60 * 1000,    // 10 min unexpected stop
    safeHoursStart: 6,                    // 6 AM
    safeHoursEnd: 21,                     // 9 PM
    maxSpeedKmh: 60,                      // Above this = vehicle (potential danger)
    routeDeviationThreshold: 300,         // 300 meters from expected route
    alertCooldown: 5 * 60 * 1000          // 5 min between alerts
  },

  start() {
    this._interval = setInterval(() => this._analyze(), 15000); // Every 15s
    console.log('[AI Monitor] Started');
  },

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    console.log('[AI Monitor] Stopped');
  },

  _analyze() {
    const speed = Store.get('tracking.speed') || 0;
    const lat = Store.get('tracking.currentLat');
    const lng = Store.get('tracking.currentLng');

    this._checkUnexpectedStop(speed);
    this._checkUnsafeHours();
    this._checkSpeedAnomaly(speed);
    this._checkRouteDeviation(lat, lng);
  },

  _checkUnexpectedStop(speed) {
    if (speed > 0.5) {
      this._lastMovement = Date.now();
      return;
    }
    const stopDuration = Date.now() - this._lastMovement;
    if (stopDuration > this.config.maxStopDuration) {
      // Check if in a safe zone
      const lat = Store.get('tracking.currentLat');
      const lng = Store.get('tracking.currentLng');
      const zones = Store.get('safetyZones') || [];
      const inSafeZone = zones.some(z => Utils.distance(lat, lng, z.lat, z.lng) <= z.radius);

      if (!inSafeZone) {
        this._alert('Unexpected Stop', `${Store.get('childProfile.name')} has been stationary for ${Math.round(stopDuration / 60000)} minutes outside safe zones.`, 'warning');
      }
    }
  },

  _checkUnsafeHours() {
    const hour = new Date().getHours();
    if (hour < this.config.safeHoursStart || hour >= this.config.safeHoursEnd) {
      const speed = Store.get('tracking.speed') || 0;
      if (speed > 1) {
        this._alert('Late Travel', `${Store.get('childProfile.name')} is moving outside safe hours.`, 'warning');
      }
    }
  },

  _checkSpeedAnomaly(speed) {
    const speedKmh = speed * 3.6;
    if (speedKmh > this.config.maxSpeedKmh) {
      this._alert('Speed Alert', `${Store.get('childProfile.name')} is traveling at ${Math.round(speedKmh)} km/h. Possible vehicle.`, 'danger');
    }
  },

  _checkRouteDeviation(lat, lng) {
    const zones = Store.get('safetyZones') || [];
    if (zones.length < 2) return;

    // Simple check: distance from nearest safe zone
    const minDist = Math.min(...zones.map(z => Utils.distance(lat, lng, z.lat, z.lng)));
    if (minDist > this.config.routeDeviationThreshold) {
      this._alert('Route Deviation', `${Store.get('childProfile.name')} is ${Math.round(minDist)}m away from any known location.`, 'warning');
    }
  },

  _alert(title, message, severity) {
    // Cooldown to avoid spam
    if (Date.now() - this._lastAlertTime < this.config.alertCooldown) return;
    this._lastAlertTime = Date.now();

    Utils.notify(`⚠️ ${title}`, message);
    Utils.toast(message, severity === 'danger' ? 'error' : 'info');

    // Log alert
    console.log(`[AI Monitor] ${severity.toUpperCase()}: ${title} - ${message}`);
  }
};
