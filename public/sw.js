// Service worker: caches the app shell so Home opens instantly and offline.
// Device data (/api/*) is never cached: it always comes live from your server.
const CACHE = 'home-shell-v129';
const SHELL = ['/', '/index.html', '/app.css', '/app.js', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/apple-touch-icon.png', '/icons/logo.webp', '/backgrounds/aura.jpg',
  '/devices/desk.webp', '/devices/column.webp', '/devices/donut.webp', '/devices/table.webp',
  '/devices/ac.webp', '/devices/lantern.webp', '/devices/star.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/version.json')) return;

  // Pages: open the cached shell straight away (no waiting on a slow network),
  // and refresh it in the background for next launch. Updates still arrive via
  // version.json, which installs a new worker with a fresh shell.
  if (req.mode === 'navigate' && url.origin === location.origin && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match('/index.html');
      const network = fetch(req).then((res) => {
        if (res && res.ok && res.headers.get('content-type')?.includes('text/html')) cache.put('/index.html', res.clone());
        return res;
      });
      if (cached) { event.waitUntil(network.catch(() => {})); return cached; }
      return network.catch(() => cached);
    }));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  // App files and fonts: serve from cache, refresh in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
