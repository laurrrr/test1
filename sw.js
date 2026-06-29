/* WiFiMap service worker — app-shell caching for offline use. */
const CACHE = 'wifimap-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './css/app.css',
  './js/tailwind-config.js',
  './js/state.js',
  './js/storage.js',
  './js/views.js',
  './js/wifi.js',
  './js/plans.js',
  './js/builder.js',
  './js/mapping.js',
  './js/speedtest.js',
  './js/pins.js',
  './js/certificate.js',
  './js/checkout.js',
  './js/admin.js',
  './js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first with network fallback; runtime-cache successful GETs
// (including CDN assets like Tailwind & Lucide) so the app works offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Never intercept or cache speed-test traffic — cached responses would
  // produce wildly wrong measurements.
  if (event.request.url.includes('speed.cloudflare.com')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
