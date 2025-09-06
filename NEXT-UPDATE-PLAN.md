# 📱 NEXT UPDATE: Trading Journal PRO - PWA Edition

## 🎯 OBJETIVO PRINCIPAL
Convertir Trading Journal en una **Progressive Web App (PWA)** con:
- ✅ Funciona SIN internet (offline-first)
- ✅ Se instala como app móvil
- ✅ Sistema de usuarios
- ✅ Sincronización cuando hay internet
- ✅ Notificaciones push
- ✅ Base de datos local + cloud

---

## 📋 FASE 1: PWA BÁSICA (Offline App)

### 1.1 Crear Service Worker
```javascript
// sw.js - Service Worker para funcionar offline
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
  '/js/utils.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activar y limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Interceptar requests - Offline First
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

### 1.2 Manifest.json (Para instalación como App)
```json
// manifest.json
{
  "name": "Trading Journal PRO",
  "short_name": "TradingPRO",
  "description": "Professional Trading Journal with GBP support",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4ade80",
  "background_color": "#1a1a1a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 1.3 Actualizar HTML
```html
<!-- Agregar en <head> de index.html -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#4ade80">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">

<!-- Para iOS -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="TradingPRO">

<!-- Registrar Service Worker -->
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  });
}
</script>
```

---

## 📋 FASE 2: BASE DE DATOS DUAL (Local + Cloud)

### 2.1 IndexedDB para Offline
```javascript
// db.js - Base de datos local con IndexedDB
class LocalDB {
  constructor() {
    this.dbName = 'TradingJournalDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Tabla de trades
        if (!db.objectStoreNames.contains('trades')) {
          const tradesStore = db.createObjectStore('trades', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          tradesStore.createIndex('date', 'date', { unique: false });
          tradesStore.createIndex('sync', 'sync', { unique: false });
        }
        
        // Tabla de usuarios
        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'id' });
        }
        
        // Tabla de sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
      };
    });
  }
  
  // Guardar trade localmente
  async saveTrade(trade) {
    const transaction = this.db.transaction(['trades'], 'readwrite');
    const store = transaction.objectStore('trades');
    trade.sync = false; // Marcar como no sincronizado
    trade.timestamp = Date.now();
    return store.add(trade);
  }
  
  // Obtener todos los trades
  async getAllTrades() {
    const transaction = this.db.transaction(['trades'], 'readonly');
    const store = transaction.objectStore('trades');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener trades no sincronizados
  async getUnsyncedTrades() {
    const transaction = this.db.transaction(['trades'], 'readonly');
    const store = transaction.objectStore('trades');
    const index = store.index('sync');
    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 2.2 Supabase para Cloud
```javascript
// supabase-config.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// auth.js - Sistema de autenticación
class AuthManager {
  constructor() {
    this.user = null;
    this.session = null;
  }
  
  async signUp(email, password) {
    try {
      const { user, session, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
      this.user = user;
      this.session = session;
      
      // Guardar en IndexedDB para offline
      await this.saveUserLocally(user);
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async signIn(email, password) {
    try {
      const { user, session, error } = await supabase.auth.signIn({
        email,
        password
      });
      
      if (error) throw error;
      
      this.user = user;
      this.session = session;
      
      // Guardar sesión localmente
      await this.saveUserLocally(user);
      
      // Sincronizar datos
      await this.syncData();
      
      return { success: true, user };
    } catch (error) {
      // Si no hay internet, intentar login offline
      if (!navigator.onLine) {
        return await this.offlineLogin(email, password);
      }
      return { success: false, error: error.message };
    }
  }
  
  async offlineLogin(email, password) {
    // Verificar credenciales guardadas localmente
    const localDB = new LocalDB();
    await localDB.init();
    
    const transaction = localDB.db.transaction(['user'], 'readonly');
    const store = transaction.objectStore('user');
    
    return new Promise((resolve) => {
      const request = store.get('current');
      request.onsuccess = () => {
        const userData = request.result;
        if (userData && userData.email === email) {
          // Verificar password hash (simplificado)
          this.user = userData;
          resolve({ success: true, user: userData, offline: true });
        } else {
          resolve({ 
            success: false, 
            error: 'No se puede verificar offline. Conecte a internet.' 
          });
        }
      };
    });
  }
  
  async saveUserLocally(user) {
    const localDB = new LocalDB();
    await localDB.init();
    
    const transaction = localDB.db.transaction(['user'], 'readwrite');
    const store = transaction.objectStore('user');
    
    return store.put({
      id: 'current',
      email: user.email,
      userId: user.id,
      lastSync: Date.now()
    });
  }
}
```

### 2.3 Sistema de Sincronización
```javascript
// sync.js - Sincronización inteligente
class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }
  
  async init() {
    // Sincronizar cuando vuelve la conexión
    window.addEventListener('online', () => {
      console.log('Conexión restaurada. Sincronizando...');
      this.syncNow();
    });
    
    window.addEventListener('offline', () => {
      console.log('Sin conexión. Modo offline activado.');
    });
    
    // Sincronización periódica cada 5 minutos
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      }
    }, 5 * 60 * 1000);
    
    // Background Sync API (si está disponible)
    if ('sync' in self.registration) {
      self.registration.sync.register('sync-trades');
    }
  }
  
  async syncNow() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    
    try {
      const localDB = new LocalDB();
      await localDB.init();
      
      // 1. Subir trades no sincronizados
      const unsyncedTrades = await localDB.getUnsyncedTrades();
      
      for (const trade of unsyncedTrades) {
        const { data, error } = await supabase
          .from('trades')
          .insert([{
            user_id: supabase.auth.user().id,
            date: trade.date,
            symbol: trade.symbol,
            direction: trade.direction,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            volume: trade.volume,
            pnl: trade.pnl,
            signals: trade.signals,
            notes: trade.notes,
            local_id: trade.id
          }]);
        
        if (!error) {
          // Marcar como sincronizado
          trade.sync = true;
          trade.cloud_id = data[0].id;
          await localDB.updateTrade(trade);
        }
      }
      
      // 2. Descargar trades nuevos del servidor
      const { data: cloudTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', supabase.auth.user().id)
        .order('created_at', { ascending: false });
      
      // Merge con datos locales
      await this.mergeCloudData(cloudTrades);
      
      console.log('Sincronización completada');
      this.showSyncNotification('✅ Datos sincronizados');
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      this.showSyncNotification('❌ Error sincronizando');
    } finally {
      this.isSyncing = false;
    }
  }
  
  async mergeCloudData(cloudTrades) {
    const localDB = new LocalDB();
    await localDB.init();
    
    const localTrades = await localDB.getAllTrades();
    const localIds = new Set(localTrades.map(t => t.cloud_id));
    
    // Agregar trades del cloud que no están localmente
    for (const cloudTrade of cloudTrades) {
      if (!localIds.has(cloudTrade.id)) {
        await localDB.saveTrade({
          ...cloudTrade,
          cloud_id: cloudTrade.id,
          sync: true
        });
      }
    }
  }
  
  showSyncNotification(message) {
    // Mostrar notificación nativa si está permitido
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Trading Journal PRO', {
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      });
    }
    
    // También mostrar en UI
    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}
```

---

## 📋 FASE 3: UI MEJORADA PARA PWA

### 3.1 Pantalla de Login/Register
```html
<!-- login.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Journal PRO - Login</title>
    <link rel="manifest" href="/manifest.json">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .logo p {
            color: #666;
            font-size: 14px;
        }
        
        .offline-badge {
            display: none;
            background: #ff9800;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            text-align: center;
            margin-bottom: 20px;
            font-size: 12px;
        }
        
        .offline .offline-badge {
            display: block;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn-primary {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
        }
        
        .btn-primary:active {
            transform: translateY(0);
        }
        
        .divider {
            text-align: center;
            margin: 30px 0;
            position: relative;
        }
        
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #e0e0e0;
        }
        
        .divider span {
            background: white;
            padding: 0 15px;
            position: relative;
            color: #999;
            font-size: 14px;
        }
        
        .social-login {
            display: flex;
            gap: 10px;
        }
        
        .btn-social {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-social:hover {
            border-color: #667eea;
            background: #f5f5f5;
        }
        
        .switch-form {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        
        .switch-form a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        
        .success-message {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>📊 Trading PRO</h1>
            <p>Professional Trading Journal</p>
        </div>
        
        <div class="offline-badge">
            ⚡ Modo Offline Activo
        </div>
        
        <div class="error-message" id="errorMsg"></div>
        <div class="success-message" id="successMsg"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" required>
            </div>
            
            <button type="submit" class="btn-primary">
                Iniciar Sesión
            </button>
        </form>
        
        <div class="divider">
            <span>O continuar con</span>
        </div>
        
        <div class="social-login">
            <button class="btn-social" onclick="loginWithGoogle()">
                <img src="/icons/google.svg" width="20" height="20">
                Google
            </button>
            <button class="btn-social" onclick="loginWithGitHub()">
                <img src="/icons/github.svg" width="20" height="20">
                GitHub
            </button>
        </div>
        
        <div class="switch-form">
            ¿No tienes cuenta? <a href="/register.html">Regístrate aquí</a>
        </div>
    </div>
    
    <script>
        // Detectar modo offline
        if (!navigator.onLine) {
            document.body.classList.add('offline');
        }
        
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
        });
        
        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
        });
        
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const auth = new AuthManager();
            const result = await auth.signIn(email, password);
            
            if (result.success) {
                if (result.offline) {
                    showSuccess('Sesión iniciada en modo offline');
                } else {
                    showSuccess('¡Bienvenido de vuelta!');
                }
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                showError(result.error);
            }
        });
        
        function showError(message) {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 5000);
        }
        
        function showSuccess(message) {
            const successMsg = document.getElementById('successMsg');
            successMsg.textContent = message;
            successMsg.style.display = 'block';
        }
        
        async function loginWithGoogle() {
            const { user, session, error } = await supabase.auth.signIn({
                provider: 'google'
            });
            
            if (error) {
                showError(error.message);
            } else {
                window.location.href = '/';
            }
        }
        
        async function loginWithGitHub() {
            const { user, session, error } = await supabase.auth.signIn({
                provider: 'github'
            });
            
            if (error) {
                showError(error.message);
            } else {
                window.location.href = '/';
            }
        }
    </script>
</body>
</html>
```

### 3.2 Botón de Instalación PWA
```javascript
// install-pwa.js
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
  }
  
  init() {
    // Capturar evento de instalación
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
    
    // Detectar si ya está instalado
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada exitosamente');
      this.hideInstallButton();
      this.showInstalledBadge();
    });
    
    // Verificar si está en modo standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App ejecutándose como PWA');
      document.body.classList.add('pwa-mode');
    }
  }
  
  showInstallButton() {
    // Crear botón de instalación
    const button = document.createElement('button');
    button.className = 'install-pwa-button';
    button.innerHTML = `
      <i data-lucide="download"></i>
      <span>Instalar App</span>
    `;
    
    button.addEventListener('click', () => this.installPWA());
    
    document.body.appendChild(button);
    this.installButton = button;
    
    // Animar entrada
    setTimeout(() => {
      button.classList.add('show');
    }, 100);
  }
  
  async installPWA() {
    if (!this.deferredPrompt) return;
    
    // Mostrar prompt de instalación
    this.deferredPrompt.prompt();
    
    // Esperar respuesta del usuario
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar PWA');
      this.trackInstallation();
    } else {
      console.log('Usuario rechazó instalar PWA');
    }
    
    this.deferredPrompt = null;
  }
  
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.classList.remove('show');
      setTimeout(() => {
        this.installButton.remove();
      }, 300);
    }
  }
  
  showInstalledBadge() {
    const badge = document.createElement('div');
    badge.className = 'pwa-installed-badge';
    badge.innerHTML = `
      <i data-lucide="check-circle"></i>
      <span>App Instalada</span>
    `;
    
    document.body.appendChild(badge);
    
    setTimeout(() => {
      badge.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      badge.classList.remove('show');
      setTimeout(() => badge.remove(), 300);
    }, 3000);
  }
  
  trackInstallation() {
    // Analytics o registro
    localStorage.setItem('pwa_installed', 'true');
    localStorage.setItem('pwa_install_date', new Date().toISOString());
  }
}
```

### 3.3 Estilos para PWA
```css
/* pwa-styles.css */
.install-pwa-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
  transform: translateY(100px);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 9999;
}

.install-pwa-button.show {
  transform: translateY(0);
}

.install-pwa-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
}

.pwa-installed-badge {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4caf50;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  transform: translateX(400px);
  transition: transform 0.3s ease;
  z-index: 9999;
}

.pwa-installed-badge.show {
  transform: translateX(0);
}

/* Modo PWA standalone */
.pwa-mode .header {
  padding-top: env(safe-area-inset-top);
}

.pwa-mode .bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Splash Screen para PWA */
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  transition: opacity 0.3s ease;
}

.splash-screen.hide {
  opacity: 0;
  pointer-events: none;
}

.splash-logo {
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  margin-bottom: 20px;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.splash-title {
  color: white;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.splash-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

/* Indicador de sincronización */
.sync-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4caf50;
  z-index: 9999;
  transition: all 0.3s;
}

.sync-indicator.syncing {
  background: #ff9800;
  animation: pulse 1s ease infinite;
}

.sync-indicator.offline {
  background: #f44336;
}

.sync-indicator.error {
  background: #f44336;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Toast notifications */
.sync-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 14px;
  z-index: 9999;
  animation: slideUp 0.3s ease forwards;
}

@keyframes slideUp {
  to {
    transform: translateX(-50%) translateY(0);
  }
}
```

---

## 📋 FASE 4: ESTRUCTURA DE ARCHIVOS FINAL

```
trading-journal-pwa/
├── index.html
├── login.html
├── register.html
├── manifest.json
├── sw.js                    # Service Worker
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── css/
│   ├── styles.css
│   ├── pwa-styles.css
│   └── mobile.css
├── js/
│   ├── app.js
│   ├── auth.js              # Nuevo: Autenticación
│   ├── db.js                # Nuevo: IndexedDB
│   ├── sync.js              # Nuevo: Sincronización
│   ├── supabase-config.js   # Nuevo: Config Supabase
│   ├── install-pwa.js       # Nuevo: Instalador PWA
│   ├── dashboard.js
│   ├── trades.js
│   ├── charts.js
│   ├── analytics.js
│   ├── settings.js
│   ├── navigation.js
│   ├── storage.js
│   └── utils.js
└── assets/
    └── splash/
        └── splash-screen.png
```

---

## 📋 FASE 5: CONFIGURACIÓN SUPABASE

### 5.1 Crear Tablas en Supabase
```sql
-- Tabla de usuarios (automática con Auth)

-- Tabla de trades
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) CHECK (direction IN ('long', 'short')),
  entry_price DECIMAL(10, 5),
  exit_price DECIMAL(10, 5),
  volume DECIMAL(10, 4),
  pnl DECIMAL(10, 2) NOT NULL,
  signals TEXT[],
  notes TEXT,
  local_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_date ON trades(date);
CREATE INDEX idx_trades_symbol ON trades(symbol);

-- Row Level Security (RLS)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propios trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Tabla de configuraciones de usuario
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  initial_balance DECIMAL(10, 2) DEFAULT 10000,
  currency VARCHAR(3) DEFAULT 'GBP',
  theme VARCHAR(10) DEFAULT 'dark',
  notifications BOOLEAN DEFAULT true,
  auto_sync BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para configuraciones
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
```

### 5.2 Variables de Entorno Netlify
```bash
# En Netlify Dashboard > Site Settings > Environment Variables

VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 FASE 6: TESTING Y DEPLOYMENT

### 6.1 Testing Checklist
```markdown
## PWA Testing

### Instalación
- [ ] Aparece prompt de instalación en Chrome/Edge
- [ ] Se instala correctamente en móvil
- [ ] Se instala correctamente en desktop
- [ ] Icono aparece en home screen
- [ ] Splash screen se muestra al abrir

### Offline
- [ ] App carga sin internet
- [ ] Puede agregar trades offline
- [ ] Datos se guardan en IndexedDB
- [ ] UI muestra indicador offline
- [ ] Login offline funciona (si ya autenticado)

### Sincronización
- [ ] Datos se sincronizan al volver online
- [ ] No hay duplicados tras sincronizar
- [ ] Conflictos se resuelven correctamente
- [ ] Notificaciones de sync funcionan

### Performance
- [ ] Lighthouse score > 90
- [ ] First load < 3 segundos
- [ ] Subsequent loads < 1 segundo
- [ ] Smooth scrolling en móvil
- [ ] No jank en animaciones
```

### 6.2 Comandos de Deployment
```bash
# 1. Build local
npm run build

# 2. Test PWA localmente
npx serve -s dist

# 3. Test con ngrok para móvil
ngrok http 3000

# 4. Commit y push
git add .
git commit -m "feat: PWA con sistema de usuarios"
git push

# 5. Netlify auto-deploy
# Verificar en: https://app.netlify.com/sites/trading-journal-gbp/deploys
```

---

## 📋 FASE 7: MONETIZACIÓN (OPCIONAL)

### 7.1 Planes de Suscripción
```javascript
// Stripe Integration
const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '100 trades/mes',
      'Datos 30 días',
      'Sin backup cloud'
    ]
  },
  pro: {
    name: 'PRO',
    price: 9.99, // £9.99/mes
    features: [
      'Trades ilimitados',
      'Historial completo',
      'Backup automático',
      'Análisis avanzado',
      'API access'
    ]
  },
  team: {
    name: 'Team',
    price: 29.99, // £29.99/mes
    features: [
      'Todo de PRO',
      '5 usuarios',
      'Compartir estrategias',
      'Dashboard equipo',
      'Soporte prioritario'
    ]
  }
}
```

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Generar iconos PWA (usando sharp-cli)
npx sharp-cli resize 512 512 --input logo.png --output icons/icon-512x512.png
npx sharp-cli resize 192 192 --input logo.png --output icons/icon-192x192.png
npx sharp-cli resize 144 144 --input logo.png --output icons/icon-144x144.png
npx sharp-cli resize 96 96 --input logo.png --output icons/icon-96x96.png
npx sharp-cli resize 72 72 --input logo.png --output icons/icon-72x72.png

# Crear proyecto Supabase
npx supabase init
npx supabase start
npx supabase db push

# Test Service Worker
chrome://inspect/#service-workers

# Test PWA
chrome://flags/#enable-desktop-pwas
```

---

## 📅 TIMELINE ESTIMADO

| Fase | Tiempo | Estado |
|------|--------|--------|
| PWA Básica | 2-3 días | ⏳ Pendiente |
| IndexedDB | 1-2 días | ⏳ Pendiente |
| Supabase Setup | 1 día | ⏳ Pendiente |
| Auth System | 2-3 días | ⏳ Pendiente |
| Sync System | 2-3 días | ⏳ Pendiente |
| Testing | 2 días | ⏳ Pendiente |
| Deployment | 1 día | ⏳ Pendiente |
| **TOTAL** | **~2 semanas** | |

---

## 💡 BENEFICIOS FINALES

### Para el Usuario:
- ✅ Funciona sin internet
- ✅ Se instala como app nativa
- ✅ Sincronización automática
- ✅ Acceso desde cualquier dispositivo
- ✅ Notificaciones push
- ✅ Backup automático
- ✅ Login social (Google/GitHub)
- ✅ Datos seguros y privados

### Para Ti (Desarrollador):
- ✅ Una sola codebase para todo
- ✅ Updates automáticos
- ✅ Analytics integrado
- ✅ Posibilidad de monetizar
- ✅ Escalable
- ✅ Moderno y profesional

---

## 🎯 PRÓXIMO PASO INMEDIATO

1. **Crear cuenta en Supabase** (gratis)
   - Ve a: https://supabase.com
   - Crea proyecto nuevo
   - Copia las API keys

2. **Implementar Service Worker**
   - Copia el código de sw.js
   - Agrégalo a tu proyecto
   - Registra en index.html

3. **Crear manifest.json**
   - Copia el código
   - Genera iconos
   - Agrega al proyecto

4. **Test local**
   - Abre en Chrome
   - Verifica instalación
   - Test offline

---

**¿Listo para empezar? Puedo ayudarte paso a paso con cada fase.** 🚀
