
const CACHE_NAME = 'hxm-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './js/lib/three.min.js',
    './js/lib/GLTFLoader.js',
    './src/main.js',
    './src/core/Game.js',
    './src/core/GameState.js',
    './src/rendering/SceneManager.js',
    './src/rendering/Terrain.js',
    './src/assets/AssetManager.js',
    './src/systems/InputManager.js',
    './src/systems/Player.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
