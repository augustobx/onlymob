// /taurizano/pwa/service-worker.js
const CACHE = 'tenant-pwa-v1';
const ASSETS = [
  'login.html',
  'manifest.json',
  // si tienes CSS o JS locales, añádelos aquí:
  // 'styles.css',
  // 'app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
  );
});

// En fetch, dejamos pasar las navegaciones (mode="navigate") al network
// y sólo cacheamos/buscamos en cache las demás peticiones GET.
self.addEventListener('fetch', event => {
  const req = event.request;

  // no interceptamos peticiones de navegación a páginas (document)
  if (req.mode === 'navigate') {
    // simplemente hacemos la petición normal
    event.respondWith(fetch(req).catch(() =>
      caches.match('login.html')  // fallback offline si querés
    ));
    return;
  }

  // para el resto de assets (CSS, JS, JSON, imágenes…)
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req);
    })
  );
});
