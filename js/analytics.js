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
    this.updateElement("expectancy", "£" + stats.expectancy.toFixed(2))
    
    // Add tooltip attributes to stat cards
    this.addTooltipAttributes()

    this.updateSignalPerformance(trades)
    this.updateCalendarPerformance(trades)
  }

  calculateAdvancedStats(trades) {
    if (trades.length === 0) {
      return {
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        expectancy: 0
      }
    }

    let profits = 0
    let losses = 0
    let wins = 0
    let totalWins = 0
    let totalLosses = 0
    
    // Calculate profits, losses and win/loss counts
    trades.forEach(trade => {
      if (trade.pnl > 0) {
        profits += trade.pnl
        wins++
        totalWins += trade.pnl
      } else if (trade.pnl < 0) {
        losses += Math.abs(trade.pnl)
        totalLosses += Math.abs(trade.pnl)
      }
    })

    // Calculate Profit Factor
    const profitFactor = losses > 0 ? profits / losses : profits > 0 ? 999 : 0
    
    // Calculate Sharpe Ratio (simplified version)
    const avgReturn = (profits - losses) / trades.length
    const returns = trades.map(t => t.pnl || 0)
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgReturn, 2)
    }, 0) / (trades.length > 1 ? trades.length - 1 : 1) // Use n-1 for sample std dev
    
    const stdDev = Math.sqrt(variance)
    
    // Calculate Sharpe Ratio (annualized assuming daily trades)
    // For small sample sizes, use simplified calculation
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0
    
    // Calculate Max Drawdown
    let peak = 0
    let maxDrawdown = 0
    let runningTotal = 0
    
    // Sort trades by date to ensure chronological order
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    
    sortedTrades.forEach(trade => {
      runningTotal += trade.pnl || 0
      
      // Update peak if we have a new high
      if (runningTotal > peak) {
        peak = runningTotal
      }
      
      // Calculate drawdown from peak
      if (peak > 0) {
        const currentDrawdown = ((peak - runningTotal) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
      }
    })
    
    // Calculate Expectancy
    // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
    const winRate = trades.length > 0 ? wins / trades.length : 0
    const lossRate = 1 - winRate
    const avgWin = wins > 0 ? totalWins / wins : 0
    const avgLoss = (trades.length - wins) > 0 ? totalLosses / (trades.length - wins) : 0
    const expectancy = (winRate * avgWin) - (lossRate * avgLoss)

    return {
      profitFactor: Math.min(profitFactor, 999), // Cap at 999 for display
      sharpeRatio: isNaN(sharpeRatio) ? 0 : sharpeRatio,
      maxDrawdown: maxDrawdown,
      expectancy: expectancy
    }
  }

  updateSignalPerformance(trades) {
    const container = document.getElementById("signalPerformance")
    if (!container) return

    const signalStats = {}
    trades.forEach(trade => {
      if (trade.signals) {
        trade.signals.forEach(signal => {
          // Format signal name for display
          let displayName = signal
          if (signal.startsWith('custom:')) {
            displayName = signal.replace('custom:', '')
          } else if (signal === 'order-flow') {
            displayName = 'Order Flow'
          } else if (signal === 'indicator-tv') {
            displayName = 'Indicator Trading View'
          }
          
          if (!signalStats[displayName]) {
            signalStats[displayName] = {count: 0, profit: 0}
          }
          signalStats[displayName].count++
          signalStats[displayName].profit += trade.pnl
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
                    £${stats.profit.toFixed(2)}
                </div>
                <div class="stat-change">${stats.count} trades</div>
            </div>
        `
      )
      .join("")
  }

  updateCalendarPerformance(trades) {
    const container = document.getElementById("dayPerformance")
    if (!container) return

    // Get current date
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // Store trades globally for modal access
    this.allTrades = trades
    
    // Create trades map by date
    const tradesByDate = {}
    trades.forEach(trade => {
      if (trade.date) {
        const dateKey = trade.date.split('T')[0] // YYYY-MM-DD format
        if (!tradesByDate[dateKey]) {
          tradesByDate[dateKey] = []
        }
        tradesByDate[dateKey].push(trade)
      }
    })
    
    // Store for modal access
    this.tradesByDate = tradesByDate
    
    // Generate calendar HTML
    container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <button class="calendar-nav" id="prevMonth">
            <i data-lucide="chevron-left"></i>
          </button>
          <h3 class="calendar-title" id="calendarTitle">
            ${this.getMonthName(currentMonth)} ${currentYear}
          </h3>
          <button class="calendar-nav" id="nextMonth">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>
        <div class="calendar-grid" id="calendarGrid">
          <!-- Calendar will be generated here -->
        </div>
      </div>
    `
    
    // Create modal at body level if it doesn't exist
    if (!document.getElementById('dayTradesModal')) {
      const modalHTML = `
        <div id="dayTradesModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modalDayTitle">
          <div class="modal-backdrop" aria-hidden="true"></div>
          <div class="modal-content modal-large" role="document">
            <div class="modal-header">
              <h3 id="modalDayTitle">
                <i data-lucide="calendar"></i>
                Trades del Día
              </h3>
              <button type="button" class="modal-close" id="closeDayModal" aria-label="Cerrar ventana">
                <i data-lucide="x" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body" id="dayTradesContent">
              <!-- Trades will be shown here -->
            </div>
          </div>
        </div>
      `
      document.body.insertAdjacentHTML('beforeend', modalHTML)
    }
    
    // Initialize calendar
    this.currentViewMonth = currentMonth
    this.currentViewYear = currentYear
    this.renderCalendar()
    
    // Setup event listeners
    this.setupCalendarEvents()
    
    // Update icons in calendar and modal
    lucide.createIcons()
  }
  
  renderCalendar() {
    const grid = document.getElementById('calendarGrid')
    const title = document.getElementById('calendarTitle')
    
    if (!grid || !title) return
    
    // Update title
    title.textContent = `${this.getMonthName(this.currentViewMonth)} ${this.currentViewYear}`
    
    // Get first day of month and days in month
    const firstDay = new Date(this.currentViewYear, this.currentViewMonth, 1)
    const lastDay = new Date(this.currentViewYear, this.currentViewMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    // Generate calendar HTML
    let calendarHTML = ''
    
    // Day headers
    const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    dayHeaders.forEach(day => {
      calendarHTML += `<div class="calendar-day-header">${day}</div>`
    })
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarHTML += '<div class="calendar-day empty"></div>'
    }
    
    // Days of the month
    const today = new Date()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.currentViewYear}-${String(this.currentViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayTrades = this.tradesByDate[dateStr] || []
      const tradeCount = dayTrades.length
      
      let totalPnL = 0
      dayTrades.forEach(trade => {
        totalPnL += trade.pnl || 0
      })
      
      const isToday = today.getDate() === day && 
                     today.getMonth() === this.currentViewMonth && 
                     today.getFullYear() === this.currentViewYear
      
      const dayClass = isToday ? 'today' : ''
      const hasTradesClass = tradeCount > 0 ? 'has-trades' : ''
      const pnlClass = totalPnL > 0 ? 'profit' : totalPnL < 0 ? 'loss' : ''
      
      calendarHTML += `
        <div class="calendar-day ${dayClass} ${hasTradesClass} ${pnlClass}" 
             data-date="${dateStr}">
          <span class="day-number">${day}</span>
          ${tradeCount > 0 ? `
            <div class="day-trades-indicator">
              <span class="trade-count">${tradeCount > 9 ? '9+' : tradeCount}</span>
            </div>
            <div class="day-pnl ${pnlClass}">
              £${Math.abs(totalPnL).toFixed(0)}
            </div>
          ` : ''}
        </div>
      `
    }
    
    grid.innerHTML = calendarHTML
    
    // Add click events to days with trades
    grid.querySelectorAll('.calendar-day.has-trades').forEach(day => {
      day.addEventListener('click', () => this.showDayTrades(day.dataset.date))
    })
  }
  
  setupCalendarEvents() {
    // Previous month
    const prevBtn = document.getElementById('prevMonth')
    if (prevBtn) {
      // Remove existing listeners to avoid duplicates
      const newPrevBtn = prevBtn.cloneNode(true)
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn)
      
      newPrevBtn.addEventListener('click', () => {
        this.currentViewMonth--
        if (this.currentViewMonth < 0) {
          this.currentViewMonth = 11
          this.currentViewYear--
        }
        this.renderCalendar()
      })
    }
    
    // Next month
    const nextBtn = document.getElementById('nextMonth')
    if (nextBtn) {
      // Remove existing listeners to avoid duplicates
      const newNextBtn = nextBtn.cloneNode(true)
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn)
      
      newNextBtn.addEventListener('click', () => {
        this.currentViewMonth++
        if (this.currentViewMonth > 11) {
          this.currentViewMonth = 0
          this.currentViewYear++
        }
        this.renderCalendar()
      })
    }
    
    // Setup modal events only once
    this.setupModalEvents()
  }
  
  setupModalEvents() {
    // Check if already setup
    if (this.modalEventsSetup) return
    this.modalEventsSetup = true
    
    // Handle ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal()
      }
    })
    
    // Use event delegation for modal close button
    document.addEventListener('click', (e) => {
      // Close button
      if (e.target.id === 'closeDayModal' || e.target.closest('#closeDayModal')) {
        e.preventDefault()
        this.closeModal()
      }
      
      // Backdrop click
      if (e.target.classList.contains('modal-backdrop') && e.target.closest('#dayTradesModal')) {
        this.closeModal()
      }
    })
  }
  
  closeModal() {
    const modal = document.getElementById('dayTradesModal')
    if (modal && modal.classList.contains('active')) {
      modal.classList.remove('active')
      // Restore body scroll
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }
  
  showDayTrades(dateStr) {
    const modal = document.getElementById('dayTradesModal')
    const title = document.getElementById('modalDayTitle')
    const content = document.getElementById('dayTradesContent')
    
    if (!modal || !title || !content) return
    
    // Prevent body scroll on mobile when modal is open
    if (window.innerWidth <= 640) {
      document.body.classList.add('modal-open')
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    }
    
    const trades = this.tradesByDate[dateStr] || []
    const date = new Date(dateStr + 'T00:00:00')
    const formattedDate = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    // Update modal title
    title.innerHTML = `
      <i data-lucide="calendar"></i>
      ${formattedDate}
    `
    
    // Calculate day stats
    let totalPnL = 0
    let wins = 0
    let losses = 0
    
    trades.forEach(trade => {
      totalPnL += trade.pnl || 0
      if (trade.pnl > 0) wins++
      else if (trade.pnl < 0) losses++
    })
    
    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : 0
    
    // Generate trades HTML
    content.innerHTML = `
      <div class="day-trades-summary">
        <div class="summary-stat">
          <span class="label">Total Trades</span>
          <span class="value">${trades.length}</span>
        </div>
        <div class="summary-stat">
          <span class="label">P&L Total</span>
          <span class="value ${totalPnL >= 0 ? 'positive' : 'negative'}">£${totalPnL.toFixed(2)}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Win Rate</span>
          <span class="value">${winRate}%</span>
        </div>
        <div class="summary-stat">
          <span class="label">W/L</span>
          <span class="value">${wins}/${losses}</span>
        </div>
      </div>
      
      <div class="day-trades-list">
        ${trades.map(trade => `
          <div class="trade-card-modal">
            <div class="trade-card-header">
              <span class="trade-symbol">${trade.symbol}</span>
              <span class="trade-direction ${trade.direction}">
                ${trade.direction?.toUpperCase()}
              </span>
            </div>
            <div class="trade-card-body">
              <div class="trade-detail">
                <span class="label">Entrada</span>
                <span class="value">${trade.entryPrice?.toFixed(5) || '-'}</span>
              </div>
              <div class="trade-detail">
                <span class="label">Salida</span>
                <span class="value">${trade.exitPrice?.toFixed(5) || '-'}</span>
              </div>
              <div class="trade-detail">
                <span class="label">Volumen</span>
                <span class="value">${trade.volume || '-'}</span>
              </div>
              <div class="trade-detail highlight">
                <span class="label">P&L</span>
                <span class="value ${trade.pnl >= 0 ? 'positive' : 'negative'}">
                  £${trade.pnl?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
            ${trade.entryReason || trade.lessons ? `
              <div class="trade-card-notes">
                ${trade.entryReason ? `<p><strong>Razón:</strong> ${trade.entryReason}</p>` : ''}
                ${trade.lessons ? `<p><strong>Lecciones:</strong> ${trade.lessons}</p>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `
    
    // Show modal
    modal.classList.add('active')
    
    // Focus management for accessibility
    const closeBtn = document.getElementById('closeDayModal')
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100)
    }
    
    // Update icons
    lucide.createIcons()
  }
  
  getMonthName(monthIndex) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return months[monthIndex]
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) element.textContent = value
  }
  
  addTooltipAttributes() {
    // Analytics stats
    const profitFactorEl = document.getElementById('profitFactor');
    if (profitFactorEl) {
      const card = profitFactorEl.closest('.stat-card');
      if (card && !card.hasAttribute('data-tooltip')) {
        card.setAttribute('data-tooltip', 'profitFactor');
      }
    }
    
    const sharpeRatioEl = document.getElementById('sharpeRatio');
    if (sharpeRatioEl) {
      const card = sharpeRatioEl.closest('.stat-card');
      if (card && !card.hasAttribute('data-tooltip')) {
        card.setAttribute('data-tooltip', 'sharpeRatio');
      }
    }
    
    const maxDrawdownEl = document.getElementById('maxDrawdown');
    if (maxDrawdownEl) {
      const card = maxDrawdownEl.closest('.stat-card');
      if (card && !card.hasAttribute('data-tooltip')) {
        card.setAttribute('data-tooltip', 'maxDrawdown');
      }
    }
    
    const expectancyEl = document.getElementById('expectancy');
    if (expectancyEl) {
      const card = expectancyEl.closest('.stat-card');
      if (card && !card.hasAttribute('data-tooltip')) {
        card.setAttribute('data-tooltip', 'expectancy');
      }
    }
    
    // Initialize tooltips
    if (window.tooltipManager) {
      window.tooltipManager.attachTooltips();
    }
  }
}
