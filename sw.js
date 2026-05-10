// ============================================
// PariRakṣati — Service Worker (Offline Support)
// ============================================
const CACHE_NAME = 'pariraksati-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/js/app.js',
  '/js/router.js',
  '/js/store.js',
  '/js/utils.js',
  '/assets/icons/logo.png',
  '/manifest.json'
];

// Install — cache all core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first strategy for speed
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background sync for emergency alerts
self.addEventListener('sync', (e) => {
  if (e.tag === 'emergency-sync') {
    e.waitUntil(syncEmergencyData());
  }
});

async function syncEmergencyData() {
  try {
    const db = await openDB();
    const tx = db.transaction('emergency_queue', 'readonly');
    const store = tx.objectStore('emergency_queue');
    const items = await store.getAll();
    // Send queued emergency alerts when back online
    for (const item of items) {
      // Future: send to backend
      console.log('[SW] Syncing emergency data:', item);
    }
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PariRakshatiDB', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
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
