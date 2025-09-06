// js/app.js - Main Application Entry Point

class TradingJournalApp {
    constructor() {
        this.modules = {};
        this.isInitialized = false;
    }

    async init() {
        try {
            // Initialize Lucide icons
            lucide.createIcons();

            // Initialize modules
            this.modules.storage = new StorageManager();
            this.modules.navigation = new NavigationManager();
            this.modules.dashboard = new DashboardManager();
            this.modules.trades = new TradesManager();
            this.modules.analytics = new AnalyticsManager();
            this.modules.settings = new SettingsManager();
            this.modules.charts = new ChartsManager();
            this.modules.utils = new UtilsManager();

            // Load saved data FIRST
            await this.modules.storage.init();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize navigation
            this.modules.navigation.init();

            // Initialize dashboard
            this.modules.dashboard.init();
            
            // Initialize charts manager
            this.modules.charts.init();
            
            // Now update dashboard with loaded data
            setTimeout(() => {
                this.modules.dashboard.update();
                // Ensure charts are updated after dashboard
                if (this.modules.charts && typeof Chart !== 'undefined') {
                    this.modules.charts.updateChart();
                }
            }, 100);

            this.isInitialized = true;
            console.log('Trading Journal App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.modules.utils?.showToast('Error al inicializar la aplicación', 'error');
        }
    }

    setupEventListeners() {
        // Trade form submission
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.modules.trades.saveTrade();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.classList.remove(currentTheme);
        html.classList.add(newTheme);
        
        localStorage.setItem('theme', newTheme);
        this.modules.utils?.showToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'success');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    handleResize() {
        // Close sidebar on desktop view
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
        }

        // Redraw charts if needed
        if (this.modules.charts) {
            this.modules.charts.handleResize();
        }
    }

    // Public API methods
    showPage(pageId) {
        if (this.modules.navigation) {
            this.modules.navigation.navigateTo(pageId);
        }
    }

    resetForm() {
        if (this.modules.trades) {
            this.modules.trades.resetForm();
        }
    }
}

// Global app instance
const app = new TradingJournalApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.add(savedTheme);
    
    // Initialize app
    app.init();
});