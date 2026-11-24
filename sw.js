/* Service worker: keeps the app usable offline. Data is not here: it lives in IndexedDB. */
const VERSION = 'lam-202611241152';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-maskable-512-v2.png', './apple-touch-icon-v2.png'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    for (const u of CDN) { try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); } catch (err) {} }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // page: network first so updates arrive, cache when offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith((async () => { try { const r = await fetch(req, { cache: 'no-cache' }); const c = await caches.open(VERSION); c.put('./index.html', r.clone()); return r; } catch (err) { return (await caches.match('./index.html')) || (await caches.match('./')); } })());
    return;
  }
  // everything else (icons, Excel library, fonts): cache first, then network and keep a copy
  e.respondWith((async () => {
    const hit = await caches.match(req); if (hit) return hit;
    try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) { const c = await caches.open(VERSION); c.put(req, r.clone()); } return r; } catch (err) { return new Response('', { status: 504 }); }
  })());
});
