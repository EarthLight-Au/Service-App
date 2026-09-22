/* EarthLight Audit — offline service worker.
   Caches the app shell on install so the tool works with zero signal,
   then serves cache-first and refreshes the cache in the background
   whenever there IS a connection. Bump CACHE_NAME when you change
   index.html so devices pick up the update next time they're online. */

const CACHE_NAME = 'earthlight-audit-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.7.1/lib/msal-browser.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        SHELL.map(function (url) {
          return cache.add(url).catch(function () {
            /* one CDN asset failing to pre-cache shouldn't block install */
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return cached; });
      // Offline (or slow): serve cache instantly if we have it, else wait on network.
      return cached || network;
    })
  );
});
