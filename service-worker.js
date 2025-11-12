/* =====================================================
   SecondBrainV2 — Service Worker (GitHub Pages Build)
   ===================================================== */

const CACHE_NAME = 'secondbrainv2-cache-v3'; // bump version if you update assets
const APP_ASSETS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/icon-72.png',
  'icons/icon-96.png',
  'icons/icon-128.png',
  'icons/icon-144.png',
  'icons/icon-152.png',
  'icons/icon-192.png',
  'icons/icon-384.png',
  'icons/icon-512.png'
];

// ---- INSTALL EVENT ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE EVENT ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
      )
    )
  );
  self.clients.claim();
});

// ---- FETCH EVENT ----
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached file if found, otherwise fetch and cache it
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          // Clone and store in cache for next time
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          return networkResponse;
        })
        .catch(() => cachedResponse); // fallback to cache if offline

      return cachedResponse || fetchPromise;
    })
  );
});

