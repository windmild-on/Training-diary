const CACHE_NAME = 'weight-tracker-v5-20261028';
const CACHE_PREFIX = 'weight-tracker-';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/icon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Page request failed');
    const cache = await caches.open(CACHE_NAME);
    await cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
    throw error;
  } finally { clearTimeout(timeout); }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(navigationResponse(event.request));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
