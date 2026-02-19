
const CACHE_NAME = 'xisobot-pro-v1';
const DYNAMIC_CACHE = 'xisobot-pro-dynamic-v1';

// Assets to cache immediately on install
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './index.js',
  './store.js',
  './firebase.js',
  './utils.js',
  './views.js',
  './ui.js',
  './search.js',
  './calendar.js',
  './dashboard.js',
  './tasks-page.js',
  './components/skeletons.js',
  './hooks/useAuth.js',
  './hooks/useFirestore.js',
  './manifest.json'
];

// Domains to cache (CDN libraries, Fonts)
const EXTERNAL_ASSETS = [
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'gstatic.com' // Firebase scripts often load from here
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORE FIRESTORE API (Let Firebase SDK handle DB persistence)
  if (url.href.includes('firestore.googleapis.com') || 
      url.href.includes('googleapis.com/auth')) {
    return; // Network only (default browser behavior)
  }

  // 2. CACHE FIRST: External Assets (Fonts, CDNs)
  if (EXTERNAL_ASSETS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. STALE-WHILE-REVALIDATE: App Shell (Local files)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});
