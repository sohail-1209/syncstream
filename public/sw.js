self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('fetch', (event) => {
  // A simple network-first strategy.
  event.respondWith(
    fetch(event.request).catch(() => {
      console.log('Fetch failed; user is likely offline.');
    })
  );
});
