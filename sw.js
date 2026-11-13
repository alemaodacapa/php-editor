const VERSION = 'php-studio-runtime-v5';
const ASSETS = ['./', './assets/style.css?v=5', './assets/app.js?v=5', './assets/preview.js?v=5', './vendor/jszip.min.js?v=1', './assets/storage.js?v=5', './assets/editor.bundle.js?v=5'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('php-studio-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
    event.respondWith(fetch(event.request).then(response => {
        if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(VERSION).then(cache => cache.put(event.request, copy)));
        }
        return response;
    }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return await caches.match('./') || Response.error();
        return Response.error();
    }));
});
