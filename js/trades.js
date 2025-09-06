// js/trades.js - Trades Manager FIXED

class TradesManager {
    constructor() {
        this.currentTrade = {};
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
    
    updateHistory() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody || !app.modules.storage) return;
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Get all trades
        const trades = app.modules.storage.getAllTrades();
        
        if (trades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
                        No hay trades registrados
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort trades by date (newest first)
        trades.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add each trade to table
        trades.forEach(trade => {
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
                    <strong>$${trade.pnl?.toFixed(2) || '0.00'}</strong>
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
            tbody.appendChild(row);
        });
        
        // Update icons
        lucide.createIcons();
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