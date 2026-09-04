const CACHE_NAME = 'onlymob-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle all Next.js API & SSR requests
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});
