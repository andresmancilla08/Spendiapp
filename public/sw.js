const CACHE = 'spendia-shell-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});
