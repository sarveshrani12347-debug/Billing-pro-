// Minimal Service Worker to enable Chrome PWA install button for shop owners
const CACHE_NAME = 'vyapar-ledger-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Safe fallback if some assets are dynamic or fail during packaging
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Bypass API requests and external/cross-origin resources
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return; // Let the browser handle standard network requests naturally
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If found in cache, return cached version. Otherwise, fetch from network.
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).catch((err) => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || new Response('Offline: Portal unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        // Propagate fetch error for subresources (like JS/CSS/JSON) so browser handles them as normal network failures,
        // preventing parsing of invalid placeholder payloads which trigger "Script error." / SyntaxErrs.
        throw err;
      });
    })
  );
});
