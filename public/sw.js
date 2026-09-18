const CACHE = 'heatt-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/auth/')) return
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/css') && !contentType.includes('javascript') && !contentType.includes('manifest')) return response
    const copy = response.clone()
    caches.open(CACHE).then(cache => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match('/index.html'))))
})
