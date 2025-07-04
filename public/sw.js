self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
});

self.addEventListener('fetch', (event) => {
  // A basic fetch handler is required for the app to be installable.
  // This is a "network-first" strategy.
  event.respondWith(
    fetch(event.request).catch(() => {
      // Optionally, you can return a fallback page here for offline support.
      // For now, we'll just let the fetch fail.
    })
  );
});
