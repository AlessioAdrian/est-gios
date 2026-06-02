const CACHE_NAME = 'estagio-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js'
];

// Instalação do Service Worker e Cache dos arquivos estáticos
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Estratégia de Cache: Tenta a rede, se falhar (offline), usa o cache
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});