// js/navigation.js - Navigation Manager

class NavigationManager {
  constructor() {
    this.currentPage = "dashboard"
    this.navItems = []
    this.pages = []
  }

  init() {
    this.cacheElements()
    this.setupEventListeners()
    this.navigateTo("dashboard")
  }

  cacheElements() {
    this.navItems = document.querySelectorAll(".nav-item")
    this.pages = document.querySelectorAll(".page")
  }

  setupEventListeners() {
    this.navItems.forEach(item => {
      item.addEventListener("click", e => {
        e.preventDefault()
        const pageId = item.dataset.page
        
        // Special handling for calculator
        if (pageId === 'calculator') {
          // Don't change page, just open modal
          if (window.tradingCalculator) {
            window.tradingCalculator.openModal()
          }
          // Close mobile sidebar if open
          if (app.modules.utils && app.modules.utils.isMobile()) {
            const sidebar = document.getElementById("sidebar")
            if (sidebar) {
              sidebar.classList.remove("active")
            }
          }
          return
        }
        
        if (pageId) {
          this.navigateTo(pageId)
        }
      })
    })

    // Handle browser back/forward
    window.addEventListener("popstate", e => {
      if (e.state && e.state.page) {
        this.navigateTo(e.state.page, false)
      }
    })
  }

  navigateTo(pageId, pushState = true) {
    // Hide all pages
    this.pages.forEach(page => {
      page.classList.remove("active")
    })

    // Show target page
    const targetPage = document.getElementById(pageId)
    if (targetPage) {
      targetPage.classList.add("active")
      this.currentPage = pageId

      // Update nav items
      this.updateNavItems(pageId)

      // Update URL
      if (pushState) {
        window.history.pushState({page: pageId}, "", `#${pageId}`)
      }

      // Close mobile sidebar
      if (app.modules.utils && app.modules.utils.isMobile()) {
        const sidebar = document.getElementById("sidebar")
        if (sidebar) {
          sidebar.classList.remove("active")
        }
      }

      // Trigger page-specific updates
      this.onPageChange(pageId)
    }
  }

  updateNavItems(pageId) {
    this.navItems.forEach(item => {
      if (item.dataset.page === pageId) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })
  }

  onPageChange(pageId) {
    // Update page-specific content
    switch (pageId) {
      case "dashboard":
        if (app.modules.dashboard) {
          app.modules.dashboard.update()
        }
        break
      case "new-trade":
        if (app.modules.trades) {
          app.modules.trades.initCustomSignals()
        }
        break
      case "history":
        if (app.modules.trades) {
          // Initialize filters if not already done
          if (!app.modules.trades.filtersInitialized) {
            app.modules.trades.initHistory()
            app.modules.trades.filtersInitialized = true
          } else {
            app.modules.trades.updateHistory()
          }
        }
        break
      case "analytics":
        if (app.modules.analytics) {
          app.modules.analytics.update()
        }
        break
      case "settings":
        if (app.modules.settings) {
          app.modules.settings.loadSettings()
        }
        break
      case "paper-trading":
        // Dar tiempo para que el DOM se actualice
        setTimeout(() => {
          if (window.PaperTrading) {
            window.PaperTrading.init()
          }
        }, 50)
        break
    }

    // Update Lucide icons
    lucide.createIcons()
  }

  getCurrentPage() {
    return this.currentPage
  }
}
