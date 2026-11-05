# Prototyp: sw.js

```javascript
const CACHE_NAME = 'latex-pwa-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```
