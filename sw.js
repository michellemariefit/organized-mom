// Offline cache: pages are kept after the first visit. Bump VERSION when files change so phones refresh.
const VERSION = 'om-v2';
const CORE = ['./', './start.html', './day.html', './week.html', './plan.html', './todos.html', './meals.html', './routines.html', './tonight.html', './print.html', './install.html', './om.css', './om.js', './manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => fetch(u, { cache: 'no-cache' }).then(r => c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (/\.(json|html|css|js)$/.test(u.pathname) || u.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })));
  }
});
