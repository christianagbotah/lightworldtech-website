const CACHE_NAME = 'lightworld-public-shell-v1';
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/logo.png'];

const NETWORK_ONLY_PREFIXES = [
  '/api/',
  '/admin',
  '/client',
  '/invoice',
  '/payments',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('lightworld-public-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

function networkOnly(url) {
  return NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || networkOnly(url)) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || Response.error();
    }),
  );
});
