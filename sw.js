const CACHE_NAME = 'sichtovnice-v57';

// Soubory k předuložení pro offline režim
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './kalendar_ikona.svg'
];

// 1. Instalace Service Workeru
self.addEventListener('install', (event) => {
  // Vynutí okamžité převzetí kontroly bez čekání na zavření okna
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Aktivace a vyčištění starých verzí cache
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
    }).then(() => self.clients.claim())
  );
});

// 3. Obsluha požadavků (Fetch)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Pro navigaci (načítání HTML stránky) použijeme strategii Network-First
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Uložíme novou verzi do cache pro případ offline použití
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Pokud síť selže (offline), vrátíme verzi z cache
          return caches.match(request);
        })
    );
    return;
  }

  // Pro ostatní statické soubory (obrázky, ikony) zkusíme nejdřív cache, pak síť
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
