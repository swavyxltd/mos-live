// Minimal service worker - no custom caching
const CACHE_NAME = 'madrasah-os-v1';

// Install event - minimal setup
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches if needed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - just pass through, no caching
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  // No custom caching logic
});

