/* Ash Face Attendance - Redirect v4 service worker: offline shell only. Firebase calls are never cached. */
const VERSION = 'r5';
const SHELL = `shell-${VERSION}`;
const APP_SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL)
    .then(c => Promise.allSettled(APP_SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/(firebaseio\.com|firebasestorage|googleapis\.com|gstatic\.com)/.test(url.host)) return;
  if (req.mode === 'navigate') {                                   /* network first, offline fallback */
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put('/', c)); return r; })
      .catch(() => caches.match('/')));
    return;
  }
  if (url.origin === location.origin) {                            /* stale-while-revalidate */
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(SHELL).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
