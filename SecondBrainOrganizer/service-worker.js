// SecondBrainV2 service worker v1
const CACHE = 'secondbrainv2-cache-v1';
const ASSETS = [
  '/',               // root
  '/index.html',
  '/style.css',
  '/js/script.js',
  '/js/utils.js',
  '/js/db.js',
  '/js/crypto.js',
  '/js/tasks.js',
  '/js/bills.js',
  '/js/vault.js',
  '/js/focus.js',
  '/js/settings.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first with network update
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(netRes => {
        const copy = netRes.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return netRes;
      }).catch(() => cached || caches.match('/index.html'));
      return cached || fetchPromise;
    })
  );
});
