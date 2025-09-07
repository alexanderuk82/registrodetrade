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
        
        // Get main signals (Order Flow, Indicator TV)
        document.querySelectorAll('input[name="signals"]:checked').forEach(checkbox => {
            signals.push(checkbox.value);
        });
        
        // Get selected custom indicators
        document.querySelectorAll('input[name="customIndicators"]:checked').forEach(checkbox => {
            const settings = app.modules.storage?.getSettings();
            const customIndicators = settings?.customIndicators || [];
            const indicator = customIndicators.find(ind => ind.id === checkbox.value);
            if (indicator) {
                signals.push(`custom:${indicator.name}`);
            }
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
    
    // Initialize custom signals
    initCustomSignals() {
        const customCheckbox = document.getElementById('customSignal');
        const modal = document.getElementById('customIndicatorModal');
        const modalInput = document.getElementById('modalIndicatorName');
        const closeModal = document.getElementById('closeModal');
        const cancelModal = document.getElementById('cancelModal');
        const confirmAdd = document.getElementById('confirmAddIndicator');
        const modalBackdrop = modal?.querySelector('.modal-backdrop');
        
        if (customCheckbox && modal) {
            // Show modal when custom checkbox is checked
            customCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.openModal();
                    // Uncheck the checkbox after opening modal
                    customCheckbox.checked = false;
                }
            });
        }
        
        // Close modal handlers
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelModal) {
            cancelModal.addEventListener('click', () => this.closeModal());
        }
        
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => this.closeModal());
        }
        
        // Confirm add indicator
        if (confirmAdd) {
            confirmAdd.addEventListener('click', () => {
                const name = modalInput?.value.trim();
                if (name) {
                    this.addCustomIndicator(name);
                    this.closeModal();
                } else {
                    app.modules.utils?.showToast('Por favor ingresa un nombre para el indicador', 'warning');
                    modalInput?.focus();
                }
            });
        }
        
        // Handle Enter key in modal input
        if (modalInput) {
            modalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAdd?.click();
                }
            });
            
            // Handle Escape key
            modalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModal();
                }
            });
        }
        
        // Load saved custom indicators
        this.loadCustomIndicators();
    }
    
    // Open modal
    openModal() {
        const modal = document.getElementById('customIndicatorModal');
        const modalInput = document.getElementById('modalIndicatorName');
        
        if (modal) {
            modal.classList.add('active');
            
            // Clear and focus input
            if (modalInput) {
                modalInput.value = '';
                setTimeout(() => modalInput.focus(), 100);
            }
            
            // Update Lucide icons in modal
            lucide.createIcons();
        }
    }
    
    // Close modal
    closeModal() {
        const modal = document.getElementById('customIndicatorModal');
        const modalInput = document.getElementById('modalIndicatorName');
        
        if (modal) {
            modal.classList.remove('active');
            
            // Clear input
            if (modalInput) {
                modalInput.value = '';
            }
        }
    }
    
    // Add custom indicator
    addCustomIndicator(name) {
        if (!app.modules.storage) return;
        
        const settings = app.modules.storage.getSettings();
        const customIndicators = settings.customIndicators || [];
        
        // Check if already exists
        if (customIndicators.some(ind => ind.name === name)) {
            app.modules.utils?.showToast('Este indicador ya existe', 'warning');
            return;
        }
        
        // Add new indicator
        customIndicators.push({
            id: `custom_${Date.now()}`,
            name: name,
            createdAt: new Date().toISOString()
        });
        
        // Save to storage
        app.modules.storage.updateSettings({
            ...settings,
            customIndicators
        });
        
        // Update UI
        this.loadCustomIndicators();
        app.modules.utils?.showToast('Indicador personalizado agregado', 'success');
    }
    
    // Load custom indicators
    loadCustomIndicators() {
        const container = document.getElementById('savedCustomIndicators');
        if (!container || !app.modules.storage) return;
        
        const settings = app.modules.storage.getSettings();
        const customIndicators = settings.customIndicators || [];
        
        if (customIndicators.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';        
        
        customIndicators.forEach(indicator => {
            const item = document.createElement('div');
            item.className = 'saved-indicator-item';
            item.innerHTML = `
                <input type="checkbox" name="customIndicators" value="${indicator.id}" id="${indicator.id}">
                <label for="${indicator.id}">${indicator.name}</label>
                <button type="button" class="delete-indicator" data-id="${indicator.id}" title="Eliminar">
                    <i data-lucide="x"></i>
                </button>
            `;
            container.appendChild(item);
        });
        
        // Add delete event listeners
        container.querySelectorAll('.delete-indicator').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteCustomIndicator(btn.dataset.id);
            });
        });
        
        // Update icons
        lucide.createIcons();
    }
    
    // Delete custom indicator
    deleteCustomIndicator(id) {
        if (!app.modules.storage) return;
        
        if (confirm('¿Estás seguro de eliminar este indicador personalizado?')) {
            const settings = app.modules.storage.getSettings();
            const customIndicators = settings.customIndicators || [];
            
            // Remove indicator
            const filtered = customIndicators.filter(ind => ind.id !== id);
            
            // Save to storage
            app.modules.storage.updateSettings({
                ...settings,
                customIndicators: filtered
            });
            
            // Update UI
            this.loadCustomIndicators();
            app.modules.utils?.showToast('Indicador eliminado', 'success');
        }
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
        
        // Export CSV button
        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCSV();
            });
        }
        
        // Print button
        const printBtn = document.getElementById('printReport');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printReport();
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
    
    // Export filtered trades to CSV
    exportToCSV() {
        if (this.filteredTrades.length === 0) {
            app.modules.utils?.showToast('No hay trades para exportar', 'warning');
            return;
        }
        
        // Prepare CSV headers
        const headers = ['Fecha', 'Hora Entrada', 'Hora Salida', 'Par/Activo', 'Dirección', 
                        'Precio Entrada', 'Precio Salida', 'Stop Loss', 'Take Profit', 
                        'Volumen', 'P&L', 'Señales', 'Razón Entrada', 'Lecciones'];
        
        // Prepare CSV rows
        const rows = this.filteredTrades.map(trade => {
            const signals = trade.signals ? trade.signals.join('; ') : '';
            return [
                trade.date || '',
                trade.entryTime || '',
                trade.exitTime || '',
                trade.symbol || '',
                trade.direction ? trade.direction.toUpperCase() : '',
                trade.entryPrice || '0',
                trade.exitPrice || '0',
                trade.stopLoss || '0',
                trade.takeProfit || '0',
                trade.volume || '0',
                trade.pnl || '0',
                signals,
                trade.entryReason || '',
                trade.lessons || ''
            ];
        });
        
        // Convert to CSV string
        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            const escapedRow = row.map(field => {
                // Escape fields that contain commas or quotes
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return '"' + stringField.replace(/"/g, '""') + '"';
                }
                return stringField;
            });
            csvContent += escapedRow.join(',') + '\n';
        });
        
        // Add summary at the end
        csvContent += '\n\n';
        csvContent += 'RESUMEN,\n';
        csvContent += `Total Trades,${this.filteredTrades.length}\n`;
        
        let totalPnL = 0;
        let wins = 0;
        let losses = 0;
        
        this.filteredTrades.forEach(trade => {
            totalPnL += trade.pnl || 0;
            if (trade.pnl > 0) wins++;
            else if (trade.pnl < 0) losses++;
        });
        
        const winRate = this.filteredTrades.length > 0 
            ? ((wins / this.filteredTrades.length) * 100).toFixed(1)
            : '0.0';
        
        csvContent += `P&L Total,£${totalPnL.toFixed(2)}\n`;
        csvContent += `Win Rate,${winRate}%\n`;
        csvContent += `Wins/Losses,${wins}/${losses}\n`;
        
        // Get filter name for filename
        const filterName = this.currentFilter === 'custom' 
            ? `custom_${document.getElementById('historyStartDate')?.value}_${document.getElementById('historyEndDate')?.value}`
            : this.currentFilter;
        
        // Create download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `trades_${filterName}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        app.modules.utils?.showToast('Reporte CSV exportado exitosamente', 'success');
    }
    
    // Print filtered trades report
    printReport() {
        if (this.filteredTrades.length === 0) {
            app.modules.utils?.showToast('No hay trades para imprimir', 'warning');
            return;
        }
        
        // Calculate stats
        let totalPnL = 0;
        let wins = 0;
        let losses = 0;
        
        this.filteredTrades.forEach(trade => {
            totalPnL += trade.pnl || 0;
            if (trade.pnl > 0) wins++;
            else if (trade.pnl < 0) losses++;
        });
        
        const winRate = this.filteredTrades.length > 0 
            ? ((wins / this.filteredTrades.length) * 100).toFixed(1)
            : '0.0';
        
        // Get filter description
        let filterDesc = 'Todos los trades';
        switch(this.currentFilter) {
            case 'daily': filterDesc = 'Trades de Hoy'; break;
            case 'weekly': filterDesc = 'Trades de la Semana'; break;
            case 'monthly': filterDesc = 'Trades del Mes'; break;
            case 'custom': 
                const start = document.getElementById('historyStartDate')?.value;
                const end = document.getElementById('historyEndDate')?.value;
                if (start && end) {
                    filterDesc = `Trades desde ${start} hasta ${end}`;
                }
                break;
        }
        
        // Create print window
        const printWindow = window.open('', '_blank');
        
        // Generate HTML for print
        const printHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Trading - ${filterDesc}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4ade80;
        }
        
        .header h1 {
            color: #1a1a1a;
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 14px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4ade80;
        }
        
        .stat-card h3 {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .stat-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
        }
        
        .stat-card .value.positive {
            color: #16a34a;
        }
        
        .stat-card .value.negative {
            color: #dc2626;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
        }
        
        thead {
            background: #1a1a1a;
            color: white;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #e5e5e5;
        }
        
        th {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            font-size: 14px;
        }
        
        tbody tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tbody tr:hover {
            background: #f0f0f0;
        }
        
        .positive {
            color: #16a34a;
            font-weight: 600;
        }
        
        .negative {
            color: #dc2626;
            font-weight: 600;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-long {
            background: #dcfce7;
            color: #16a34a;
        }
        
        .badge-short {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e5e5;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        @media print {
            body {
                padding: 10px;
            }
            
            .header {
                margin-bottom: 20px;
            }
            
            .stats-grid {
                page-break-inside: avoid;
            }
            
            table {
                page-break-inside: auto;
            }
            
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trading Journal - Reporte de Trades</h1>
        <p>${filterDesc}</p>
        <p>Generado el ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3>Total Trades</h3>
            <div class="value">${this.filteredTrades.length}</div>
        </div>
        <div class="stat-card">
            <h3>P&L Total</h3>
            <div class="value ${totalPnL >= 0 ? 'positive' : 'negative'}">
                £${totalPnL.toFixed(2)}
            </div>
        </div>
        <div class="stat-card">
            <h3>Win Rate</h3>
            <div class="value">${winRate}%</div>
        </div>
        <div class="stat-card">
            <h3>Wins / Losses</h3>
            <div class="value">${wins} / ${losses}</div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Par</th>
                <th>Dirección</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Volumen</th>
                <th>P&L</th>
                <th>%</th>
            </tr>
        </thead>
        <tbody>
            ${this.filteredTrades.map(trade => {
                const percentage = trade.entryPrice && trade.volume 
                    ? ((trade.pnl / (trade.entryPrice * trade.volume)) * 100).toFixed(2)
                    : '0.00';
                return `
                <tr>
                    <td>${this.formatDate(trade.date)}</td>
                    <td><strong>${trade.symbol || '-'}</strong></td>
                    <td>
                        <span class="badge badge-${trade.direction === 'long' ? 'long' : 'short'}">
                            ${trade.direction ? trade.direction.toUpperCase() : '-'}
                        </span>
                    </td>
                    <td>${trade.entryPrice?.toFixed(5) || '0'}</td>
                    <td>${trade.exitPrice?.toFixed(5) || '-'}</td>
                    <td>${trade.volume || '0'}</td>
                    <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                        £${trade.pnl?.toFixed(2) || '0.00'}
                    </td>
                    <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                        ${percentage}%
                    </td>
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>Trading Journal Professional &copy; ${new Date().getFullYear()}</p>
        <p>Este reporte es confidencial y para uso personal</p>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
        `;
        
        // Write HTML to print window
        printWindow.document.write(printHTML);
        printWindow.document.close();
    }
}