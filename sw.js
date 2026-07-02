const CACHE_NAME = 'scal-ai-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/welcome.html',
    '/signin.html',
    '/signup.html',
    '/style.css',
    '/app.js',
    '/foodDatabase.js',
    '/logo.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
