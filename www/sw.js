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

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Scal AI', body: 'New notification' };
    const options = {
        body: data.body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
