const CACHE_NAME = 'latex-pwa-__COMMIT_SHA__';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/lint-worker.js',
  './js/tex-worker.js',
  './js/engine/packs/packs-index.json'
];

// Große Engine-, Paket- und PDF.js-Dateien liegen in einem eigenen, versionierten Cache.
const ASSET_CACHE = 'latex-assets-v3';
const LARGE_ASSET = /\/js\/(engine|pdfjs)\//;

function isOAuthCallback(url) {
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin &&
    (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`) &&
    ['code', 'state', 'error', 'error_description', 'error_uri'].some((key) => url.searchParams.has(key));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {
      console.warn('Service Worker Cache konnte nicht initialisiert werden.');
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) =>
          (key.startsWith('latex-pwa-') && key !== CACHE_NAME) ||
          (key.startsWith('latex-assets-') && key !== ASSET_CACHE)
        ).map((key) => caches.delete(key))
      )),
      caches.open(CACHE_NAME).then(async (cache) => {
        const requests = await cache.keys();
        await Promise.all(requests.filter((request) => isOAuthCallback(new URL(request.url))).map((request) => cache.delete(request)));
      })
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' && isOAuthCallback(requestUrl)) {
    event.respondWith(caches.match('./index.html').then((cachedIndex) => cachedIndex || fetch(event.request)));
    return;
  }

  if (requestUrl.pathname === new URL('./js/engine/packs/packs-index.json', self.registration.scope).pathname) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }

  if (LARGE_ASSET.test(requestUrl.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html').then((cachedIndex) => cachedIndex || Response.error());
          }
          return caches.match('./manifest.json').then((cachedManifest) => cachedManifest || Response.error());
        });
    })
  );
});
