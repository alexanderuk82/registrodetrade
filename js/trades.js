// js/trades.js - Trades Manager FIXED

class TradesManager {
    constructor() {
        this.currentTrade = {};
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredTrades = [];
        this.sortOrder = 'desc'; // 'asc' or 'desc'
        this.sortBy = 'date'; // 'date', 'pnl', 'symbol'
    }
    
    saveTrade() {
        // Get all form values
        const formData = {
            id: this.generateId(),
            date: document.getElementById('tradeDate')?.value || new Date().toISOString().split('T')[0],
            entryTime: document.getElementById('entryTime')?.value || '',
            exitTime: document.getElementById('exitTime')?.value || '',
            symbol: document.getElementById('symbol')?.value || '',
            timeframe: document.getElementById('timeframe')?.value || '15m',
            direction: document.getElementById('direction')?.value || 'long',
            entryPrice: parseFloat(document.getElementById('entryPrice')?.value) || 0,
            stopLoss: parseFloat(document.getElementById('stopLoss')?.value) || 0,
            takeProfit: parseFloat(document.getElementById('takeProfit')?.value) || 0,
            exitPrice: parseFloat(document.getElementById('exitPrice')?.value) || 0,
            volume: parseFloat(document.getElementById('volume')?.value) || 0,
            pnl: parseFloat(document.getElementById('pnl')?.value) || 0,
            entryReason: document.getElementById('entryReason')?.value || '',
            lessons: document.getElementById('lessons')?.value || '',
            signals: this.getSelectedSignals(),
            createdAt: new Date().toISOString()
        };
        
        // Validate required fields
        if (!formData.symbol || !formData.date) {
            if (app.modules.utils) {
                app.modules.utils.showToast('Por favor completa los campos requeridos', 'error');
            }
            return false;
        }
        
        // Save to storage
        if (app.modules.storage) {
            const savedTrade = app.modules.storage.addTrade(formData);
            
            if (savedTrade) {
                // Show success message
                if (app.modules.utils) {
                    app.modules.utils.showToast('Trade guardado exitosamente', 'success');
                }
                
                // Reset form
                this.resetForm();
                
                // Update dashboard
                if (app.modules.dashboard) {
                    app.modules.dashboard.update();
                }
                
                // Navigate to dashboard
                if (app.modules.navigation) {
                    app.modules.navigation.navigateTo('dashboard');
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    getSelectedSignals() {
        const signals = [];
        document.querySelectorAll('input[name="signals"]:checked').forEach(checkbox => {
            signals.push(checkbox.value);
        });
        return signals;
    }
    
    resetForm() {
        const form = document.getElementById('tradeForm');
        if (form) {
            form.reset();
            // Set default date to today
            const dateInput = document.getElementById('tradeDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }
    
    // Initialize history page with filters
    initHistory() {
        this.setupHistoryFilters();
        this.updateHistory();
    }
    
    // Setup filter event listeners
    setupHistoryFilters() {
        // Filter buttons
        document.querySelectorAll('.history-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.closest('.history-filter-btn').dataset.filter;
                this.setHistoryFilter(filter);
            });
        });
        
        // Custom date range
        const applyCustom = document.getElementById('applyHistoryCustomRange');
        if (applyCustom) {
            applyCustom.addEventListener('click', () => {
                this.applyCustomDateRange();
            });
        }
        
        // Items per page
        const itemsSelect = document.getElementById('itemsPerPage');
        if (itemsSelect) {
            itemsSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.updateHistory();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('tradeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTrades(e.target.value);
            });
            
            // Handle Enter key in search
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchTrades(e.target.value);
                }
            });
        }
        
        // Search button
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const searchInput = document.getElementById('tradeSearch');
                if (searchInput) {
                    this.searchTrades(searchInput.value);
                }
            });
        }
    }
    
    // Set filter
    setHistoryFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Update active button
        document.querySelectorAll('.history-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Show/hide custom date range
        const customRange = document.getElementById('historyCustomDateRange');
        if (customRange) {
            customRange.style.display = filter === 'custom' ? 'flex' : 'none';
        }
        
        if (filter !== 'custom') {
            this.updateHistory();
        }
    }
    
    // Apply custom date range
    applyCustomDateRange() {
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;
        
        if (startDate && endDate) {
            this.updateHistory();
        } else {
            if (app.modules.utils) {
                app.modules.utils.showToast('Selecciona ambas fechas', 'warning');
            }
        }
    }
    
    // Search trades
    searchTrades(query) {
        this.searchQuery = query.toLowerCase();
        this.currentPage = 1;
        this.updateHistory();
    }
    
    // Filter trades based on current filter
    filterTrades(trades) {
        let filtered = [...trades];
        const now = new Date();
        
        // Apply date filter
        switch (this.currentFilter) {
            case 'daily':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                filtered = filtered.filter(t => new Date(t.date) >= today);
                break;
                
            case 'weekly':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(t => new Date(t.date) >= weekAgo);
                break;
                
            case 'monthly':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(t => new Date(t.date) >= monthAgo);
                break;
                
            case 'custom':
                const startDate = document.getElementById('historyStartDate')?.value;
                const endDate = document.getElementById('historyEndDate')?.value;
                if (startDate && endDate) {
                    filtered = filtered.filter(t => {
                        const tradeDate = new Date(t.date);
                        return tradeDate >= new Date(startDate) && tradeDate <= new Date(endDate);
                    });
                }
                break;
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(t => 
                t.symbol?.toLowerCase().includes(this.searchQuery) ||
                t.direction?.toLowerCase().includes(this.searchQuery) ||
                t.pnl?.toString().includes(this.searchQuery)
            );
        }
        
        return filtered;
    }
    
    // Update history with pagination
    updateHistory() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody || !app.modules.storage) return;
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Get all trades
        const allTrades = app.modules.storage.getAllTrades();
        
        if (allTrades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
                        No hay trades registrados
                    </td>
                </tr>
            `;
            this.updatePaginationInfo(0, 0, 0);
            return;
        }
        
        // Filter trades
        this.filteredTrades = this.filterTrades(allTrades);
        
        // Sort trades
        this.filteredTrades.sort((a, b) => {
            let compareValue = 0;
            switch (this.sortBy) {
                case 'date':
                    compareValue = new Date(b.date) - new Date(a.date);
                    break;
                case 'pnl':
                    compareValue = b.pnl - a.pnl;
                    break;
                case 'symbol':
                    compareValue = (a.symbol || '').localeCompare(b.symbol || '');
                    break;
            }
            return this.sortOrder === 'desc' ? compareValue : -compareValue;
        });
        
        // Calculate pagination
        const totalItems = this.filteredTrades.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);
        
        // Get trades for current page
        const pageTrades = this.filteredTrades.slice(startIndex, endIndex);
        
        if (pageTrades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
                        No hay trades que coincidan con el filtro
                    </td>
                </tr>
            `;
            this.updatePaginationInfo(0, 0, 0);
            return;
        }
        
        // Add trades to table
        pageTrades.forEach(trade => {
            const row = this.createTradeRow(trade);
            tbody.appendChild(row);
        });
        
        // Update pagination
        this.updatePaginationInfo(startIndex + 1, endIndex, totalItems);
        this.updatePaginationButtons(totalPages);
        
        // Update stats
        this.updateFilterStats();
        
        // Update icons
        lucide.createIcons();
    }
    
    // Create trade row
    createTradeRow(trade) {
        const row = document.createElement('tr');
        const pnlPercent = app.modules.storage?.getSettings().initialBalance 
            ? ((trade.pnl / app.modules.storage.getSettings().initialBalance) * 100).toFixed(2)
            : '0.00';
        
        row.innerHTML = `
            <td>${this.formatDate(trade.date)}</td>
            <td><strong>${trade.symbol || '-'}</strong></td>
            <td>
                <span class="badge ${trade.direction === 'long' ? 'badge-success' : 'badge-danger'}">
                    ${trade.direction?.toUpperCase() || '-'}
                </span>
            </td>
            <td>${trade.entryPrice?.toFixed(5) || '0'}</td>
            <td>${trade.exitPrice?.toFixed(5) || '-'}</td>
            <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                <strong>£${trade.pnl?.toFixed(2) || '0.00'}</strong>
            </td>
            <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                ${pnlPercent}%
            </td>
            <td>
                <button class="icon-button" onclick="app.modules.trades.viewTrade('${trade.id}')" title="Ver detalles">
                    <i data-lucide="eye"></i>
                </button>
                <button class="icon-button" onclick="app.modules.trades.deleteTrade('${trade.id}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        return row;
    }
    
    // Update pagination info
    updatePaginationInfo(start, end, total) {
        const info = document.getElementById('paginationInfo');
        if (info) {
            if (total === 0) {
                info.textContent = 'No hay resultados';
            } else {
                info.textContent = `Mostrando ${start} - ${end} de ${total} trades`;
            }
        }
    }
    
    // Update pagination buttons
    updatePaginationButtons(totalPages) {
        const container = document.getElementById('paginationButtons');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
        container.appendChild(prevBtn);
        
        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            container.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
        nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
        container.appendChild(nextBtn);
        
        // Update icons
        lucide.createIcons();
    }
    
    // Go to page
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredTrades.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.updateHistory();
        }
    }
    
    // Update filter stats
    updateFilterStats() {
        const statsContainer = document.getElementById('historyStats');
        if (!statsContainer) return;
        
        let totalPnL = 0;
        let wins = 0;
        let losses = 0;
        
        this.filteredTrades.forEach(trade => {
            totalPnL += trade.pnl;
            if (trade.pnl > 0) wins++;
            else if (trade.pnl < 0) losses++;
        });
        
        const winRate = this.filteredTrades.length > 0 
            ? ((wins / this.filteredTrades.length) * 100).toFixed(1)
            : '0.0';
        
        statsContainer.innerHTML = `
            <div class="history-stat">
                <span class="label">Total Trades</span>
                <span class="value">${this.filteredTrades.length}</span>
            </div>
            <div class="history-stat">
                <span class="label">P&L Total</span>
                <span class="value ${totalPnL >= 0 ? 'positive' : 'negative'}">£${totalPnL.toFixed(2)}</span>
            </div>
            <div class="history-stat">
                <span class="label">Win Rate</span>
                <span class="value">${winRate}%</span>
            </div>
            <div class="history-stat">
                <span class="label">W/L</span>
                <span class="value">${wins}/${losses}</span>
            </div>
        `;
    }
    
    viewTrade(id) {
        const trade = app.modules.storage?.getTrade(id);
        if (trade) {
            // Show trade details (you can implement a modal here)
            console.log('Trade details:', trade);
            if (app.modules.utils) {
                app.modules.utils.showToast(`Trade ${trade.symbol}: $${trade.pnl}`, 'info');
            }
        }
    }
    
    deleteTrade(id) {
        if (confirm('¿Estás seguro de eliminar este trade?')) {
            if (app.modules.storage?.deleteTrade(id)) {
                this.updateHistory();
                if (app.modules.dashboard) {
                    app.modules.dashboard.update();
                }
                if (app.modules.utils) {
                    app.modules.utils.showToast('Trade eliminado', 'success');
                }
            }
        }
    }
    
    // Sort trades
    sortTrades(by) {
        if (this.sortBy === by) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = by;
            this.sortOrder = 'desc';
        }
        this.updateHistory();
    }
    
    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    generateId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}