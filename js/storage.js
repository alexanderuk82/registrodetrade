// js/storage.js - Storage Management Module

class StorageManager {
  constructor() {
    this.storageKey = "tradingJournal"
    this.data = {
      trades: [],
      settings: {
        initialBalance: 10000,
        currency: "USD",
        theme: "dark"
      },
      metadata: {
        version: "1.0.0",
        lastModified: null,
        createdAt: null
      }
    }
  }

  async init() {
    try {
      const savedData = this.load()
      if (savedData) {
        this.data = {...this.data, ...savedData}
      } else {
        this.data.metadata.createdAt = new Date().toISOString()
        this.save()
      }
      return true
    } catch (error) {
      console.error("Storage initialization failed:", error)
      return false
    }
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Failed to load data:", error)
      return null
    }
  }

  save() {
    try {
      this.data.metadata.lastModified = new Date().toISOString()
      localStorage.setItem(this.storageKey, JSON.stringify(this.data))
      return true
    } catch (error) {
      console.error("Failed to save data:", error)
      if (error.name === "QuotaExceededError") {
        this.handleStorageQuotaExceeded()
      }
      return false
    }
  }

  // Trades Management
  addTrade(trade) {
    const newTrade = {
      ...trade,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.data.trades.push(newTrade)
    this.save()
    return newTrade
  }

  updateTrade(id, updates) {
    const index = this.data.trades.findIndex(t => t.id === id)
    if (index !== -1) {
      this.data.trades[index] = {
        ...this.data.trades[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      const saved = this.save()
      return saved ? this.data.trades[index] : false
    }
    return false
  }

  deleteTrade(id) {
    const index = this.data.trades.findIndex(t => t.id === id)
    if (index !== -1) {
      const deleted = this.data.trades.splice(index, 1)[0]
      this.save()
      return deleted
    }
    return null
  }

  getTrade(id) {
    return this.data.trades.find(t => t.id === id) || null
  }

  getAllTrades() {
    return [...this.data.trades]
  }

  getTradesByDateRange(startDate, endDate) {
    return this.data.trades.filter(trade => {
      const tradeDate = new Date(trade.date)
      return tradeDate >= startDate && tradeDate <= endDate
    })
  }

  getTradesBySymbol(symbol) {
    return this.data.trades.filter(
      trade => trade.symbol.toLowerCase() === symbol.toLowerCase()
    )
  }

  // Settings Management
  updateSettings(settings) {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    }
    this.save()
    return this.data.settings
  }

  getSettings() {
    return {...this.data.settings}
  }

  // Export/Import
  exportData() {
    const exportData = {
      ...this.data,
      exportDate: new Date().toISOString(),
      exportVersion: "1.0.0"
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trading-journal-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return true
  }

  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = e => {
        try {
          const importedData = JSON.parse(e.target.result)

          // Validate imported data
          if (this.validateImportedData(importedData)) {
            // Backup current data
            this.createBackup()

            // Import new data
            this.data = {
              ...this.data,
              trades: importedData.trades || [],
              settings: importedData.settings || this.data.settings
            }

            this.save()
            resolve(true)
          } else {
            reject(new Error("Invalid data format"))
          }
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  validateImportedData(data) {
    // Basic validation
    if (!data || typeof data !== "object") return false
    if (!Array.isArray(data.trades)) return false

    // Validate each trade has required fields
    return data.trades.every(
      trade =>
        trade.hasOwnProperty("symbol") &&
        trade.hasOwnProperty("date") &&
        trade.hasOwnProperty("pnl")
    )
  }

  // Backup Management
  createBackup() {
    const backupKey = `${this.storageKey}_backup_${Date.now()}`
    localStorage.setItem(backupKey, JSON.stringify(this.data))

    // Keep only last 3 backups
    this.cleanOldBackups()
  }

  cleanOldBackups() {
    const backupPattern = new RegExp(`^${this.storageKey}_backup_`)
    const backups = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (backupPattern.test(key)) {
        backups.push(key)
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => {
      const timestampA = parseInt(a.split("_").pop())
      const timestampB = parseInt(b.split("_").pop())
      return timestampB - timestampA
    })

    // Remove old backups (keep only 3)
    backups.slice(3).forEach(key => localStorage.removeItem(key))
  }

  restoreBackup(backupKey) {
    const backupData = localStorage.getItem(backupKey)
    if (backupData) {
      this.data = JSON.parse(backupData)
      this.save()
      return true
    }
    return false
  }

  // Utility Methods
  clearAllData() {
    const confirmed = confirm(
      "¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer."
    )

    if (confirmed) {
      this.createBackup() // Create backup before clearing
      this.data = {
        trades: [],
        settings: this.data.settings, // Keep settings
        metadata: {
          ...this.data.metadata,
          lastModified: new Date().toISOString()
        }
      }
      this.save()
      return true
    }
    return false
  }

  generateId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  handleStorageQuotaExceeded() {
    console.warn("Storage quota exceeded. Attempting to clean up...")

    // Remove old backups
    this.cleanOldBackups()

    // Try to save again
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data))
    } catch (error) {
      alert(
        "No hay suficiente espacio de almacenamiento. Por favor, exporta tus datos y limpia el almacenamiento."
      )
    }
  }

  // Statistics helpers
  getTradeStats() {
    const trades = this.data.trades
    const initialBalance = this.data.settings.initialBalance

    let totalPnL = 0
    let wins = 0
    let losses = 0
    let bestTrade = 0
    let worstTrade = 0

    trades.forEach(trade => {
      totalPnL += trade.pnl

      if (trade.pnl > 0) {
        wins++
        if (trade.pnl > bestTrade) bestTrade = trade.pnl
      } else {
        losses++
        if (trade.pnl < worstTrade) worstTrade = trade.pnl
      }
    })

    const winRate = trades.length > 0 ? wins / trades.length * 100 : 0
    const currentBalance = initialBalance + totalPnL
    const roi = (currentBalance - initialBalance) / initialBalance * 100

    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate,
      totalPnL,
      bestTrade,
      worstTrade,
      currentBalance,
      roi,
      initialBalance
    }
  }
}
