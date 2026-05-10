// ============================================
// PariRakṣati — Utility Functions
// ============================================
const Utils = {
  // Show toast notification
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Format phone number
  formatPhone(phone) {
    return phone.replace(/(\+91)\s?(\d{5})\s?(\d{5})/, '$1 $2 $3');
  },

  // Get time string
  timeAgo(date) {
    const secs = Math.floor((Date.now() - new Date(date)) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  },

  // Format duration mm:ss
  formatDuration(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  // Generate unique ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  // Vibrate device
  vibrate(pattern = [200]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },

  // Request permission for notifications
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  },

  // Send local notification
  notify(title, body, tag = 'parirakshati') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/icons/logo.png', tag, badge: 'assets/icons/logo.png' });
    }
  },

  // Get battery status
  async getBattery() {
    try {
      if (navigator.getBattery) {
        const bat = await navigator.getBattery();
        return Math.round(bat.level * 100);
      }
    } catch (e) {}
    return Store.get('childProfile.battery');
  },

  // Check internet status
  isOnline() {
    return navigator.onLine;
  },

  // Debounce
  debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },

  // Get current position
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  },

  // Calculate distance between two coordinates (meters)
  distance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  // SMS fallback (opens SMS app on mobile)
  sendSMS(phone, message) {
    const encoded = encodeURIComponent(message);
    // Use window.location.href instead of window.open to avoid popup blockers in async callbacks
    window.location.href = `sms:${phone}?body=${encoded}`;
  },

  // Make phone call
  makeCall(phone) {
    window.open(`tel:${phone}`, '_blank');
  }
};
