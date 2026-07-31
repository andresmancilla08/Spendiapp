// Shell offline mínimo. v2: el shell cacheado se REFRESCA en cada navegación
// con red. Con v1 se cacheaba '/' solo en el install y no se tocaba nunca más,
// así que una PWA instalada antes de un cambio de <head> podía seguir
// arrancando con el head viejo para siempre (p.ej. la barra de estado blanca de
// iOS: status-bar-style default cacheado tras el fix a black-translucent).
const CACHE = 'spendia-shell-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Red OK → se sirve fresco y se actualiza el shell offline.
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match('/'))
  );
});
