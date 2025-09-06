// js/dashboard.js - Dashboard Management Module

class DashboardManager {
  constructor() {
    this.elements = {}
    this.stats = {}
    this.chartInstance = null
  }

  init() {
    this.cacheElements()
    // Don't update on init, wait for data to load
  }

  cacheElements() {
    // Cache DOM elements for better performance
    this.elements = {
      // Main stats
      totalBalance: document.getElementById("totalBalance"),
      balanceChange: document.getElementById("balanceChange"),
      totalPnl: document.getElementById("totalPnl"),
      pnlPercentage: document.getElementById("pnlPercentage"),
      winRateText: document.getElementById("winRateText"),
      winRateCircle: document.getElementById("winRateCircle"),
      totalTrades: document.getElementById("totalTrades"),
      tradesDetail: document.getElementById("tradesDetail"),

      // Performance metrics
      bestTrade: document.getElementById("bestTrade"),
      worstTrade: document.getElementById("worstTrade"),
      avgWin: document.getElementById("avgWin"),
      avgLoss: document.getElementById("avgLoss"),

      // Chart
      profitChart: document.getElementById("profitChart")
    }
  }

  update() {
    // Get latest stats from storage
    const storage = app.modules.storage
    if (!storage) return

    this.stats = this.calculateStats(
      storage.getAllTrades(),
      storage.getSettings()
    )

    // Update UI elements
    this.updateMainStats()
    this.updatePerformanceMetrics()
    this.updateWinRateCircle()

    // Verificar Chart.js y usar el método apropiado
    if (typeof Chart !== "undefined" && app.modules.charts) {
      // Chart.js está disponible, usar el módulo de charts avanzado
      try {
        app.modules.charts.updateChart()
      } catch (error) {
        console.error("Error actualizando chart:", error)
        this.updateProfitChart() // Fallback si hay error
      }
    } else {
      // Chart.js no está disponible, usar canvas simple (solo en desarrollo)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.info("Usando gráfico de respaldo (desarrollo)")
      }
      this.updateProfitChart() // Fallback to simple chart
    }

    // Update icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons()
    }
  }

  // ... resto del código sin cambios ...

  updateProfitChart() {
    const canvas = this.elements.profitChart
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const storage = app.modules.storage

    // Verificación adicional
    if (!storage) {
      console.warn("Storage no disponible para gráfico")
      return
    }

    const trades = storage.getAllTrades().slice(-10) // Last 10 trades

    // Set canvas size - responsive
    const rect = canvas.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    canvas.width = rect.width
    canvas.height = isMobile ? Math.min(rect.width * 0.6, 250) : 300

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (trades.length === 0) {
      // Show empty state
      ctx.fillStyle = "#999" // Usar color directo en lugar de variable CSS
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(
        "No hay trades para mostrar",
        canvas.width / 2,
        canvas.height / 2
      )
      return
    }

    // Calculate dimensions - mobile optimized
    const padding = isMobile ? 15 : 20
    const barSpacing = isMobile ? 5 : 10
    const barWidth = (canvas.width - padding * 2) / trades.length - barSpacing
    const maxValue = Math.max(...trades.map(t => Math.abs(t.pnl)), 1)
    const scale = (canvas.height - padding * 2) / maxValue

    // Draw bars
    trades.forEach((trade, index) => {
      const x = padding + index * (barWidth + barSpacing)
      const height = Math.abs(trade.pnl) * scale
      const y = trade.pnl >= 0 ? canvas.height / 2 - height : canvas.height / 2

      // Set color based on P&L
      ctx.fillStyle = trade.pnl >= 0 ? "#10b981" : "#ef4444" // Verde/Rojo directo

      // Draw bar
      ctx.fillRect(x, y, barWidth, height)

      // Draw value on top - skip on mobile if too many trades
      if (!isMobile || trades.length <= 7) {
        ctx.fillStyle = "#333"
        ctx.font = isMobile ? "8px sans-serif" : "10px sans-serif"
        ctx.textAlign = "center"

        const textY = trade.pnl >= 0 ? y - 5 : y + height + 15
        ctx.fillText(
          `£${Math.abs(trade.pnl).toFixed(0)}`,
          x + barWidth / 2,
          textY
        )
      }
    })

    // Draw zero line
    ctx.strokeStyle = "#ddd"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
  }

  // ... resto de los métodos sin cambios ...

  calculateStats(trades, settings) {
    // Código existente sin cambios
    const initialBalance = settings.initialBalance || 10000

    const stats = {
      totalTrades: trades.length,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgWin: 0,
      avgLoss: 0,
      winRate: 0,
      currentBalance: initialBalance,
      balanceChangePercent: 0,
      totalPnLPercent: 0,
      winSum: 0,
      lossSum: 0,
      consecutive: {
        wins: 0,
        losses: 0,
        currentWins: 0,
        currentLosses: 0
      },
      monthlyPnL: {},
      weeklyPnL: {},
      signalPerformance: {}
    }

    // Process each trade
    trades.forEach((trade, index) => {
      stats.totalPnL += trade.pnl
      stats.currentBalance += trade.pnl

      // Win/Loss categorization
      if (trade.pnl > 0) {
        stats.wins++
        stats.winSum += trade.pnl
        stats.currentWins++
        stats.currentLosses = 0

        if (trade.pnl > stats.bestTrade) {
          stats.bestTrade = trade.pnl
        }

        if (stats.currentWins > stats.consecutive.wins) {
          stats.consecutive.wins = stats.currentWins
        }
      } else if (trade.pnl < 0) {
        stats.losses++
        stats.lossSum += Math.abs(trade.pnl)
        stats.currentLosses++
        stats.currentWins = 0

        if (trade.pnl < stats.worstTrade) {
          stats.worstTrade = trade.pnl
        }

        if (stats.currentLosses > stats.consecutive.losses) {
          stats.consecutive.losses = stats.currentLosses
        }
      }

      // Monthly P&L
      const tradeDate = new Date(trade.date)
      const monthKey = `${tradeDate.getFullYear()}-${String(
        tradeDate.getMonth() + 1
      ).padStart(2, "0")}`
      stats.monthlyPnL[monthKey] = (stats.monthlyPnL[monthKey] || 0) + trade.pnl

      // Weekly P&L
      const weekNumber = this.getWeekNumber(tradeDate)
      const weekKey = `${tradeDate.getFullYear()}-W${weekNumber}`
      stats.weeklyPnL[weekKey] = (stats.weeklyPnL[weekKey] || 0) + trade.pnl

      // Signal performance
      if (trade.signals && Array.isArray(trade.signals)) {
        trade.signals.forEach(signal => {
          if (!stats.signalPerformance[signal]) {
            stats.signalPerformance[signal] = {
              count: 0,
              wins: 0,
              losses: 0,
              totalPnL: 0
            }
          }

          stats.signalPerformance[signal].count++
          stats.signalPerformance[signal].totalPnL += trade.pnl

          if (trade.pnl > 0) {
            stats.signalPerformance[signal].wins++
          } else if (trade.pnl < 0) {
            stats.signalPerformance[signal].losses++
          }
        })
      }
    })

    // Calculate averages and percentages
    if (stats.wins > 0) {
      stats.avgWin = stats.winSum / stats.wins
    }

    if (stats.losses > 0) {
      stats.avgLoss = stats.lossSum / stats.losses
    }

    if (stats.totalTrades > 0) {
      stats.winRate = stats.wins / stats.totalTrades * 100
    }

    stats.balanceChangePercent =
      (stats.currentBalance - initialBalance) / initialBalance * 100
    stats.totalPnLPercent = stats.totalPnL / initialBalance * 100

    // Calculate additional metrics
    stats.profitFactor =
      stats.lossSum > 0 ? stats.winSum / stats.lossSum : stats.winSum
    stats.expectancy =
      stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0
    stats.payoffRatio = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : 0

    return stats
  }

  updateMainStats() {
    const {elements, stats} = this

    // Update balance
    if (elements.totalBalance) {
      elements.totalBalance.textContent = this.formatCurrency(
        stats.currentBalance
      )
    }

    // Update balance change
    if (elements.balanceChange) {
      const changeSpan = elements.balanceChange.querySelector("span")
      if (changeSpan) {
        changeSpan.textContent = `${stats.balanceChangePercent >= 0
          ? "+"
          : ""}${stats.balanceChangePercent.toFixed(2)}%`
      }
      elements.balanceChange.className = `stat-change ${stats.balanceChangePercent >=
      0
        ? "positive"
        : "negative"}`
    }

    // Update P&L
    if (elements.totalPnl) {
      elements.totalPnl.textContent = this.formatCurrency(stats.totalPnL)
    }

    // Update P&L percentage
    if (elements.pnlPercentage) {
      const pnlSpan = elements.pnlPercentage.querySelector("span")
      if (pnlSpan) {
        pnlSpan.textContent = `${stats.totalPnLPercent >= 0
          ? "+"
          : ""}${stats.totalPnLPercent.toFixed(2)}%`
      }
      elements.pnlPercentage.className = `stat-change ${stats.totalPnLPercent >=
      0
        ? "positive"
        : "negative"}`
    }

    // Update win rate text
    if (elements.winRateText) {
      elements.winRateText.textContent = `${stats.winRate.toFixed(1)}%`
    }

    // Update total trades
    if (elements.totalTrades) {
      elements.totalTrades.textContent = stats.totalTrades.toString()
    }

    // Update trades detail
    if (elements.tradesDetail) {
      const detailSpan = elements.tradesDetail.querySelector("span")
      if (detailSpan) {
        detailSpan.textContent = `${stats.wins}W / ${stats.losses}L`
      }
    }
  }

  updatePerformanceMetrics() {
    const {elements, stats} = this

    if (elements.bestTrade) {
      elements.bestTrade.textContent = this.formatCurrency(stats.bestTrade)
    }

    if (elements.worstTrade) {
      elements.worstTrade.textContent = this.formatCurrency(stats.worstTrade)
    }

    if (elements.avgWin) {
      elements.avgWin.textContent = this.formatCurrency(stats.avgWin)
    }

    if (elements.avgLoss) {
      elements.avgLoss.textContent = this.formatCurrency(stats.avgLoss)
    }
  }

  updateWinRateCircle() {
    const circle = this.elements.winRateCircle
    if (!circle) return

    const circumference = 2 * Math.PI * 50 // radius = 50
    const offset = circumference - this.stats.winRate / 100 * circumference

    circle.style.strokeDasharray = circumference
    circle.style.strokeDashoffset = circumference

    // Trigger animation
    setTimeout(() => {
      circle.style.transition = "stroke-dashoffset 1s ease-in-out"
      circle.style.strokeDashoffset = offset
    }, 100)
  }

  // Utility methods
  formatCurrency(value) {
    const formatter = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return formatter.format(value)
  }

  formatPercentage(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    )
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }

  // Public methods for external updates
  refresh() {
    this.update()
  }

  showLoadingState() {
    // Show loading indicators
    Object.values(this.elements).forEach(element => {
      if (element && element.textContent) {
        element.style.opacity = "0.5"
      }
    })
  }

  hideLoadingState() {
    // Hide loading indicators
    Object.values(this.elements).forEach(element => {
      if (element && element.style) {
        element.style.opacity = "1"
      }
    })
  }
}
