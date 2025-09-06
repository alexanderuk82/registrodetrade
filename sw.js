// Service Worker para Trading Journal PWA
// Versión 1.0.0

const CACHE_NAME = 'trading-journal-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/variables.css',
  '/styles/base.css',
  '/styles/components.css',
  '/styles/layout.css',
  '/styles/pages.css',
  '/styles/mobile-chart.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/trades.js',
  '/js/charts.js',
  '/js/analytics.js',
  '/js/settings.js',
  '/js/navigation.js',
  '/js/storage.js',
  '/js/utils.js'
];

// Instalar Service Worker y cachear recursos
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar Service Worker y limpiar caches antiguos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activado');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpiando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Interceptar requests - Estrategia: Cache First, Network Fallback
self.addEventListener('fetch', event => {
  // Ignorar requests que no son GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // No está en cache, intentar red
        return fetch(event.request)
          .then(response => {
            // No cachear respuestas no válidas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            // Agregar al cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Sin conexión y no está en cache
            // Retornar página offline si es una navegación
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background Sync para sincronizar trades cuando vuelve la conexión
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trades') {
    console.log('Service Worker: Sincronizando trades...');
    event.waitUntil(syncTrades());
  }
});

// Push Notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Trading Journal',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Dashboard',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Trading Journal PRO', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Abrir dashboard
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Función para sincronizar trades
async function syncTrades() {
  // Aquí conectarías con tu API/Supabase
  try {
    // Obtener trades pendientes de IndexedDB
    // Enviar a servidor
    // Marcar como sincronizados
    console.log('Trades sincronizados exitosamente');
  } catch (error) {
    console.error('Error sincronizando trades:', error);
    // Re-intentar más tarde
    throw error;
  }
}
