// js/db.js - IndexedDB Manager para Trading Journal PWA
// Almacenamiento local robusto con sincronización

class IndexedDBManager {
  constructor() {
    this.dbName = 'TradingJournalDB';
    this.version = 1;
    this.db = null;
  }

  // Inicializar base de datos
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB inicializada correctamente');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear tabla de trades
        if (!db.objectStoreNames.contains('trades')) {
          const tradesStore = db.createObjectStore('trades', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Índices para búsquedas eficientes
          tradesStore.createIndex('date', 'date', { unique: false });
          tradesStore.createIndex('symbol', 'symbol', { unique: false });
          tradesStore.createIndex('sync', 'sync', { unique: false });
          tradesStore.createIndex('userId', 'userId', { unique: false });
          tradesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Crear tabla de configuración de usuario
        if (!db.objectStoreNames.contains('userSettings')) {
          const settingsStore = db.createObjectStore('userSettings', { 
            keyPath: 'id' 
          });
          settingsStore.createIndex('userId', 'userId', { unique: true });
        }
        
        // Crear tabla de sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Crear tabla de caché de analytics
        if (!db.objectStoreNames.contains('analyticsCache')) {
          const analyticsStore = db.createObjectStore('analyticsCache', { 
            keyPath: 'id' 
          });
          analyticsStore.createIndex('type', 'type', { unique: false });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        console.log('Estructura de IndexedDB creada/actualizada');
      };
    });
  }

  // ========== TRADES ==========
  
  // Guardar trade
  async saveTrade(trade) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readwrite');
      const store = transaction.objectStore('trades');
      
      // Agregar metadata
      trade.timestamp = Date.now();
      trade.sync = false;
      trade.localId = trade.id || Date.now();
      trade.userId = this.getCurrentUserId();
      
      const request = store.add(trade);
      
      request.onsuccess = () => {
        console.log('Trade guardado localmente:', request.result);
        this.addToSyncQueue('trade', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Error guardando trade:', request.error);
        reject(request.error);
      };
    });
  }
  
  // Actualizar trade
  async updateTrade(trade) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readwrite');
      const store = transaction.objectStore('trades');
      
      trade.timestamp = Date.now();
      trade.sync = false;
      
      const request = store.put(trade);
      
      request.onsuccess = () => {
        this.addToSyncQueue('trade', trade.id);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener todos los trades
  async getAllTrades() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readonly');
      const store = transaction.objectStore('trades');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const trades = request.result.filter(t => t.userId === this.getCurrentUserId());
        resolve(trades);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener trades por fecha
  async getTradesByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readonly');
      const store = transaction.objectStore('trades');
      const index = store.index('date');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const trades = request.result.filter(t => t.userId === this.getCurrentUserId());
        resolve(trades);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener trades no sincronizados
  async getUnsyncedTrades() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readonly');
      const store = transaction.objectStore('trades');
      const index = store.index('sync');
      
      const request = index.getAll(false);
      
      request.onsuccess = () => {
        const trades = request.result.filter(t => t.userId === this.getCurrentUserId());
        resolve(trades);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Marcar trade como sincronizado
  async markTradeAsSynced(tradeId, cloudId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readwrite');
      const store = transaction.objectStore('trades');
      
      const request = store.get(tradeId);
      
      request.onsuccess = () => {
        const trade = request.result;
        if (trade) {
          trade.sync = true;
          trade.cloudId = cloudId;
          trade.lastSync = Date.now();
          
          const updateRequest = store.put(trade);
          updateRequest.onsuccess = () => resolve(trade);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Trade no encontrado'));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Eliminar trade
  async deleteTrade(tradeId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades'], 'readwrite');
      const store = transaction.objectStore('trades');
      
      const request = store.delete(tradeId);
      
      request.onsuccess = () => {
        this.addToSyncQueue('delete', tradeId);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // ========== USER SETTINGS ==========
  
  // Guardar configuración
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userSettings'], 'readwrite');
      const store = transaction.objectStore('userSettings');
      
      settings.id = 'current';
      settings.userId = this.getCurrentUserId();
      settings.timestamp = Date.now();
      
      const request = store.put(settings);
      
      request.onsuccess = () => resolve(settings);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener configuración
  async getSettings() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userSettings'], 'readonly');
      const store = transaction.objectStore('userSettings');
      
      const request = store.get('current');
      
      request.onsuccess = () => {
        const settings = request.result || this.getDefaultSettings();
        resolve(settings);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // ========== SYNC QUEUE ==========
  
  // Agregar a cola de sincronización
  async addToSyncQueue(type, entityId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const syncItem = {
        type: type,
        entityId: entityId,
        status: 'pending',
        timestamp: Date.now(),
        retries: 0,
        userId: this.getCurrentUserId()
      };
      
      const request = store.add(syncItem);
      
      request.onsuccess = () => {
        console.log('Agregado a cola de sincronización:', syncItem);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener items pendientes de sincronización
  async getPendingSyncItems() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        const items = request.result.filter(i => i.userId === this.getCurrentUserId());
        resolve(items);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // Actualizar estado de sincronización
  async updateSyncStatus(syncId, status) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.get(syncId);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          item.lastAttempt = Date.now();
          
          if (status === 'failed') {
            item.retries++;
          }
          
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve(item);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Sync item no encontrado'));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // ========== ANALYTICS CACHE ==========
  
  // Guardar caché de analytics
  async saveAnalyticsCache(type, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyticsCache'], 'readwrite');
      const store = transaction.objectStore('analyticsCache');
      
      const cacheItem = {
        id: `${type}_${this.getCurrentUserId()}`,
        type: type,
        data: data,
        timestamp: Date.now(),
        userId: this.getCurrentUserId()
      };
      
      const request = store.put(cacheItem);
      
      request.onsuccess = () => resolve(cacheItem);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Obtener caché de analytics
  async getAnalyticsCache(type) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyticsCache'], 'readonly');
      const store = transaction.objectStore('analyticsCache');
      
      const request = store.get(`${type}_${this.getCurrentUserId()}`);
      
      request.onsuccess = () => {
        const cache = request.result;
        
        // Verificar si el caché es válido (menos de 1 hora)
        if (cache && (Date.now() - cache.timestamp) < 3600000) {
          resolve(cache.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // ========== UTILITIES ==========
  
  // Obtener ID de usuario actual
  getCurrentUserId() {
    // Por ahora usar localStorage, después será de Supabase
    return localStorage.getItem('userId') || 'local_user';
  }
  
  // Configuración por defecto
  getDefaultSettings() {
    return {
      id: 'current',
      initialBalance: 10000,
      currency: 'GBP',
      theme: 'dark',
      notifications: true,
      autoSync: true,
      language: 'es'
    };
  }
  
  // Limpiar datos antiguos (más de 90 días)
  async cleanOldData() {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trades', 'syncQueue'], 'readwrite');
      
      // Limpiar trades antiguos sincronizados
      const tradesStore = transaction.objectStore('trades');
      const tradesIndex = tradesStore.index('timestamp');
      const tradesRange = IDBKeyRange.upperBound(ninetyDaysAgo);
      
      tradesIndex.openCursor(tradesRange).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sync) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      
      // Limpiar cola de sincronización completada
      const syncStore = transaction.objectStore('syncQueue');
      const syncIndex = syncStore.index('status');
      
      syncIndex.openCursor(IDBKeyRange.only('completed')).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < ninetyDaysAgo) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => {
        console.log('Limpieza de datos antiguos completada');
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  // Exportar todos los datos
  async exportAllData() {
    const trades = await this.getAllTrades();
    const settings = await this.getSettings();
    
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      trades: trades,
      settings: settings
    };
  }
  
  // Importar datos
  async importData(data) {
    const transaction = this.db.transaction(['trades', 'userSettings'], 'readwrite');
    
    // Importar trades
    if (data.trades && Array.isArray(data.trades)) {
      const tradesStore = transaction.objectStore('trades');
      for (const trade of data.trades) {
        trade.sync = false; // Marcar para re-sincronizar
        trade.userId = this.getCurrentUserId();
        await tradesStore.add(trade);
      }
    }
    
    // Importar configuración
    if (data.settings) {
      const settingsStore = transaction.objectStore('userSettings');
      data.settings.id = 'current';
      data.settings.userId = this.getCurrentUserId();
      await settingsStore.put(data.settings);
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  // Obtener estadísticas de almacenamiento
  async getStorageStats() {
    const trades = await this.getAllTrades();
    const pendingSync = await this.getPendingSyncItems();
    
    // Estimar tamaño en bytes
    const estimatedSize = JSON.stringify({trades}).length;
    
    return {
      totalTrades: trades.length,
      unsyncedTrades: trades.filter(t => !t.sync).length,
      pendingSyncItems: pendingSync.length,
      estimatedSize: estimatedSize,
      estimatedSizeMB: (estimatedSize / 1024 / 1024).toFixed(2)
    };
  }
}

// Exportar instancia singleton
const dbManager = new IndexedDBManager();
export default dbManager;
