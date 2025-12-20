// Minimal service worker for PWA installation
// No custom caching - just registration for PWA functionality

const CACHE_NAME = 'madrasah-os-v1'

// Install event - minimal setup
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches if needed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
})

// Fetch event - just pass through, no caching
self.addEventListener('fetch', (event) => {
  // No custom caching - just pass through to network
  event.respondWith(fetch(event.request))
})

