// ==== js/analytics.js ====
class AnalyticsManager {
  constructor() {
    this.stats = {}
  }

  update() {
    if (!app.modules.storage) return

    const trades = app.modules.storage.getAllTrades()
    const stats = this.calculateAdvancedStats(trades)

    // Update UI
    this.updateElement("profitFactor", stats.profitFactor.toFixed(2))
    this.updateElement("sharpeRatio", stats.sharpeRatio.toFixed(2))
    this.updateElement("maxDrawdown", stats.maxDrawdown.toFixed(2) + "%")
    this.updateElement("expectancy", "$" + stats.expectancy.toFixed(2))

    this.updateSignalPerformance(trades)
  }

  calculateAdvancedStats(trades) {
    let profits = 0
    let losses = 0

    trades.forEach(trade => {
      if (trade.pnl > 0) profits += trade.pnl
      else losses += Math.abs(trade.pnl)
    })

    return {
      profitFactor: losses > 0 ? profits / losses : profits,
      sharpeRatio: 0, // Simplified
      maxDrawdown: 0, // Simplified
      expectancy: trades.length > 0 ? (profits - losses) / trades.length : 0
    }
  }

  updateSignalPerformance(trades) {
    const container = document.getElementById("signalPerformance")
    if (!container) return

    const signalStats = {}
    trades.forEach(trade => {
      if (trade.signals) {
        trade.signals.forEach(signal => {
          if (!signalStats[signal]) {
            signalStats[signal] = {count: 0, profit: 0}
          }
          signalStats[signal].count++
          signalStats[signal].profit += trade.pnl
        })
      }
    })

    container.innerHTML = Object.entries(signalStats)
      .map(
        ([signal, stats]) => `
            <div class="stat-card">
                <div class="stat-label">${signal}</div>
                <div class="stat-value ${stats.profit >= 0
                  ? "positive"
                  : "negative"}">
                    $${stats.profit.toFixed(2)}
                </div>
                <div class="stat-change">${stats.count} trades</div>
            </div>
        `
      )
      .join("")
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) element.textContent = value
  }
}
