/* Lap Time Tambang service worker: keeps the app usable with no signal.
   Change CACHE when any app file changes so phones pick up the new version. */
const CACHE = 'laptime-v2.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const FONT_CACHE = 'laptime-fonts';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache-first, so the typeface also works offline after the first visit.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; })))
        .catch(() => new Response('', { status: 504 }))
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // App files: answer from cache immediately (works with no signal), refresh the cache in the background.
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(c => c.match(key).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok) c.put(key, res.clone()); return res; }).catch(() => null);
      return hit || net.then(r => r || c.match('./index.html'));
    }))
  );
});
