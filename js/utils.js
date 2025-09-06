// js/utils.js - Utility Functions

class UtilsManager {
  constructor() {
    this.toastContainer = null
  }

  init() {
    this.toastContainer = document.getElementById("toastContainer")
  }

  // Toast notifications
  showToast(message, type = "info") {
    if (!this.toastContainer) {
      this.createToastContainer()
    }

    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`
    toast.innerHTML = `
            <i data-lucide="${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `

    this.toastContainer.appendChild(toast)

    // Update icons
    lucide.createIcons()

    // Animate in
    setTimeout(() => toast.classList.add("show"), 10)

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => toast.remove(), 300)
    }, CONFIG.ui.toastDuration)
  }

  getToastIcon(type) {
    const icons = {
      success: "check-circle",
      error: "x-circle",
      warning: "alert-triangle",
      info: "info"
    }
    return icons[type] || icons.info
  }

  createToastContainer() {
    this.toastContainer = document.createElement("div")
    this.toastContainer.id = "toastContainer"
    this.toastContainer.className = "toast-container"
    document.body.appendChild(this.toastContainer)
  }

  // Number formatting
  formatCurrency(value, currency = CONFIG.app.defaultCurrency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  formatPercentage(value, decimals = 2) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`
  }

  formatNumber(value, decimals = 2) {
    return value.toFixed(decimals)
  }

  // Date formatting
  formatDate(date) {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  formatDateTime(date) {
    return new Date(date).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  // Validation
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  validateNumber(value) {
    return !isNaN(value) && isFinite(value)
  }

  validateRequired(value) {
    return value !== null && value !== undefined && value !== ""
  }

  // DOM utilities
  createElement(tag, className, innerHTML) {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (innerHTML) element.innerHTML = innerHTML
    return element
  }

  clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  }

  // Debounce function
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Throttle function
  throttle(func, limit) {
    let inThrottle
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // Calculate percentage change
  calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return 0
    return (newValue - oldValue) / Math.abs(oldValue) * 100
  }

  // Generate unique ID
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
  }

  // Get query parameter
  getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(param)
  }

  // Set query parameter
  setQueryParam(param, value) {
    const url = new URL(window.location)
    url.searchParams.set(param, value)
    window.history.pushState({}, "", url)
  }

  // Check if mobile device
  isMobile() {
    return window.innerWidth < CONFIG.ui.mobileBreakpoint
  }

  // Check if tablet device
  isTablet() {
    return (
      window.innerWidth >= CONFIG.ui.mobileBreakpoint &&
      window.innerWidth < CONFIG.ui.tabletBreakpoint
    )
  }

  // Export to CSV
  exportToCSV(data, filename = "export.csv") {
    const csv = this.convertToCSV(data)
    const blob = new Blob([csv], {type: "text/csv"})
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return ""

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(",")

    const csvRows = data.map(row => {
      return headers
        .map(header => {
          const value = row[header]
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value
        })
        .join(",")
    })

    return [csvHeaders, ...csvRows].join("\n")
  }
}
