/* ============================================================================
   public/sw.js — the room's static shell.

   Deliberately narrow, because a stale cache is worse than no cache:

     · only same-origin static assets (build output, artwork, fonts, icons)
     · never HTML, never an RSC payload, never /api — those always go to the
       network, so the app can not get stuck on an old board
     · hashed build files are served from cache and refreshed in the
       background; artwork is immutable and simply kept

   Registered only in production, a moment after first paint.
   ==========================================================================*/

const CACHE = 'heatt-static-v1';
const MAX_ENTRIES = 90;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  const isBuild = url.pathname.startsWith('/_next/static/');
  const isArt = url.pathname.startsWith('/art/');
  const isAsset = /\.(woff2?|ttf|otf|css|js|mjs|svg|png|jpe?g|webp|avif|ico)$/.test(url.pathname);
  if (!isBuild && !isArt && !isAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: isBuild || isArt });
      if (hit) {
        /* hashed build files can change under the same URL after a deploy */
        if (isBuild) {
          fetch(req)
            .then((res) => {
              if (res && res.ok) return cache.put(req, res.clone()).then(() => trim(cache));
              return undefined;
            })
            .catch(() => undefined);
        }
        return hit;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
          await cache.put(req, res.clone());
          await trim(cache);
        }
        return res;
      } catch (err) {
        /* offline and not cached: let the page decide what to do */
        throw err;
      }
    })()
  );
});
