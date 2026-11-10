const VERSION = 'php-studio-v1.0.0';
const ASSETS = ['./','./index.php','./assets/style.css','./assets/app.js','./vendor/jszip.min.js','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => { event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(fetch(event.request).then(response => {if(response.ok){ const copy=response.clone(); caches.open(VERSION).then(cache=>cache.put(event.request,copy)); }return response;}).catch(()=>caches.match(event.request).then(result=>result||caches.match('./index.php'))));});
