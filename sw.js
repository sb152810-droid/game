/* =========================================================================
   NEON ARCADE — Service Worker
   Стратегія: Cache First, falling back to Network
   ========================================================================= */

const CACHE_NAME = 'neon-arcade-v1';
const CACHE_VERSION = 1;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

/* -------------------------------------------------------------------------
   INSTALL — кешуємо всі базові ресурси
   ------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Precache failed:', err);
      })
  );
});

/* -------------------------------------------------------------------------
   ACTIVATE — видаляємо старі кеші, беремо контроль над клієнтами
   ------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

/* -------------------------------------------------------------------------
   FETCH — Cache First, fallback to Network
   ------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              })
              .catch(() => {});

            return networkResponse;
          })
          .catch(() => {
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
  );
});

/* -------------------------------------------------------------------------
   MESSAGE — оновлення за запитом
   ------------------------------------------------------------------------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
