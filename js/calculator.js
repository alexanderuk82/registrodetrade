// js/calculator.js - Trading Calculator Module

class TradingCalculator {
    constructor() {
        this.riskMode = 'percent'; // 'percent' or 'amount'
        this.accountSettings = {
            accountType: 'raw-spread',
            currency: 'GBP',
            leverage: 500,
            balance: 10000
        };
        
        // Pip values for major pairs (simplified)
        this.pipValues = {
            // Forex pairs
            'EURUSD': { pipSize: 0.0001, contractSize: 100000 },
            'GBPUSD': { pipSize: 0.0001, contractSize: 100000 },
            'USDJPY': { pipSize: 0.01, contractSize: 100000 },
            'EURJPY': { pipSize: 0.01, contractSize: 100000 },
            'GBPJPY': { pipSize: 0.01, contractSize: 100000 },
            'EURGBP': { pipSize: 0.0001, contractSize: 100000 },
            'AUDUSD': { pipSize: 0.0001, contractSize: 100000 },
            'NZDUSD': { pipSize: 0.0001, contractSize: 100000 },
            'USDCAD': { pipSize: 0.0001, contractSize: 100000 },
            'USDCHF': { pipSize: 0.0001, contractSize: 100000 },
            
            // Indices
            'US30': { pipSize: 1, contractSize: 1 },
            'US500': { pipSize: 0.1, contractSize: 1 },
            'NAS100': { pipSize: 1, contractSize: 1 },
            'UK100': { pipSize: 1, contractSize: 1 },
            'GER40': { pipSize: 1, contractSize: 1 },
            
            // Commodities
            'XAUUSD': { pipSize: 0.01, contractSize: 100 }, // Gold
            'XAGUSD': { pipSize: 0.001, contractSize: 5000 }, // Silver
            'XTIUSD': { pipSize: 0.01, contractSize: 100 }, // Oil
            
            // Crypto (simplified)
            'BTCUSD': { pipSize: 1, contractSize: 1 },
            'ETHUSD': { pipSize: 0.01, contractSize: 1 }
        };
        
        this.currentCalculation = {
            symbol: 'EURUSD',
            orderType: 'buy',
            entryPrice: 0,
            stopLoss: 0,
            takeProfit: 0,
            lotSize: 0.01,
            riskAmount: 0,
            riskPercent: 1
        };
    }
    
    init() {
        this.createCalculatorModal();
        this.setupEventListeners();
        this.loadAccountSettings();
    }
    
    createCalculatorModal() {
        // Check if modal already exists
        if (document.getElementById('calculatorModal')) return;
        
        const modalHTML = `
            <div id="calculatorModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="calcModalTitle">
                <div class="modal-backdrop" aria-hidden="true"></div>
                <div class="modal-content modal-large" role="document">
                    <div class="modal-header">
                        <h3 id="calcModalTitle">
                            <i data-lucide="calculator"></i>
                            Calculadora de Trading
                        </h3>
                        <button type="button" class="modal-close" id="closeCalculator" aria-label="Cerrar">
                            <i data-lucide="x" aria-hidden="true"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body calculator-body">
                        <!-- Account Settings -->
                        <div class="calc-section">
                            <h4 class="calc-section-title">Configuración de Cuenta</h4>
                            <div class="calc-grid">
                                <div class="calc-field">
                                    <label for="calcAccountType">Tipo de Cuenta</label>
                                    <select id="calcAccountType">
                                        <option value="raw-spread">Raw Spread</option>
                                        <option value="standard">Standard</option>
                                        <option value="zero">Zero</option>
                                    </select>
                                </div>
                                <div class="calc-field">
                                    <label for="calcCurrency">Moneda</label>
                                    <select id="calcCurrency">
                                        <option value="GBP">GBP (£)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                                <div class="calc-field">
                                    <label for="calcLeverage">Apalancamiento</label>
                                    <select id="calcLeverage">
                                        <option value="50">1:50</option>
                                        <option value="100">1:100</option>
                                        <option value="200">1:200</option>
                                        <option value="500" selected>1:500</option>
                                        <option value="1000">1:1000</option>
                                    </select>
                                </div>
                                <div class="calc-field">
                                    <label for="calcBalance">Balance</label>
                                    <input type="number" id="calcBalance" value="10000" step="100">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Trade Parameters -->
                        <div class="calc-section">
                            <h4 class="calc-section-title">Parámetros del Trade</h4>
                            <div class="calc-grid">
                                <div class="calc-field">
                                    <label for="calcSymbol">Símbolo</label>
                                    <select id="calcSymbol">
                                        <optgroup label="Forex Major">
                                            <option value="EURUSD">EUR/USD</option>
                                            <option value="GBPUSD">GBP/USD</option>
                                            <option value="USDJPY">USD/JPY</option>
                                            <option value="EURJPY">EUR/JPY</option>
                                            <option value="GBPJPY">GBP/JPY</option>
                                            <option value="EURGBP">EUR/GBP</option>
                                            <option value="AUDUSD">AUD/USD</option>
                                            <option value="NZDUSD">NZD/USD</option>
                                            <option value="USDCAD">USD/CAD</option>
                                            <option value="USDCHF">USD/CHF</option>
                                        </optgroup>
                                        <optgroup label="Índices">
                                            <option value="US30">US30 (Dow Jones)</option>
                                            <option value="US500">US500 (S&P)</option>
                                            <option value="NAS100">NAS100 (Nasdaq)</option>
                                            <option value="UK100">UK100 (FTSE)</option>
                                            <option value="GER40">GER40 (DAX)</option>
                                        </optgroup>
                                        <optgroup label="Commodities">
                                            <option value="XAUUSD">XAU/USD (Oro)</option>
                                            <option value="XAGUSD">XAG/USD (Plata)</option>
                                            <option value="XTIUSD">XTI/USD (Petróleo)</option>
                                        </optgroup>
                                        <optgroup label="Crypto">
                                            <option value="BTCUSD">BTC/USD</option>
                                            <option value="ETHUSD">ETH/USD</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div class="calc-field">
                                    <label for="calcOrderType">Tipo de Orden</label>
                                    <div class="order-type-toggle">
                                        <button type="button" class="order-btn buy active" data-type="buy">
                                            BUY
                                        </button>
                                        <button type="button" class="order-btn sell" data-type="sell">
                                            SELL
                                        </button>
                                    </div>
                                </div>
                                <div class="calc-field">
                                    <label for="calcEntry">Precio Entrada</label>
                                    <input type="number" id="calcEntry" step="0.00001" placeholder="0.00000">
                                </div>
                                <div class="calc-field">
                                    <label for="calcStopLoss">Stop Loss</label>
                                    <input type="number" id="calcStopLoss" step="0.00001" placeholder="0.00000">
                                </div>
                                <div class="calc-field">
                                    <label for="calcTakeProfit">Take Profit</label>
                                    <input type="number" id="calcTakeProfit" step="0.00001" placeholder="0.00000">
                                </div>
                                <div class="calc-field">
                                    <label for="calcLotSize">Tamaño Lote</label>
                                    <input type="number" id="calcLotSize" value="0.01" step="0.01" min="0.01">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Risk Management -->
                        <div class="calc-section">
                            <h4 class="calc-section-title">Gestión de Riesgo</h4>
                            <div class="risk-mode-indicator" id="riskModeIndicator">
                                <span class="mode-label">Modo:</span>
                                <span class="mode-value">Porcentaje</span>
                            </div>
                            <div class="calc-grid">
                                <div class="calc-field">
                                    <label for="calcRiskPercent">Riesgo %</label>
                                    <input type="number" id="calcRiskPercent" value="1" step="0.1" min="0.1" max="10">
                                    <small class="field-hint">% del balance</small>
                                </div>
                                <div class="calc-field">
                                    <label for="calcRiskAmount">Riesgo £</label>
                                    <input type="number" id="calcRiskAmount" value="100" step="0.01" placeholder="Ej: 20">
                                    <small class="field-hint">Monto fijo a arriesgar</small>
                                </div>
                                <div class="calc-field full-width">
                                    <label>Tamaño de Lote Recomendado</label>
                                    <div class="recommended-lot">
                                        <span id="recommendedLot">0.00</span>
                                        <button type="button" class="btn-use-lot" id="useRecommendedLot" title="Usar este tamaño">
                                            <i data-lucide="check-circle"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Results -->
                        <div class="calc-section results-section">
                            <h4 class="calc-section-title">
                                <i data-lucide="bar-chart-2"></i>
                                Resultados del Cálculo
                            </h4>
                            <div class="calc-results">
                                <div class="result-card">
                                    <span class="result-label">Pips a SL</span>
                                    <span class="result-value" id="resultPipsSL">0</span>
                                </div>
                                <div class="result-card">
                                    <span class="result-label">Pips a TP</span>
                                    <span class="result-value" id="resultPipsTP">0</span>
                                </div>
                                <div class="result-card">
                                    <span class="result-label">Risk/Reward</span>
                                    <span class="result-value" id="resultRR">1:0</span>
                                </div>
                                <div class="result-card">
                                    <span class="result-label">Valor por Pip</span>
                                    <span class="result-value" id="resultPipValue">£0.00</span>
                                </div>
                                <div class="result-card negative">
                                    <span class="result-label">Pérdida Potencial</span>
                                    <span class="result-value" id="resultLoss">£0.00</span>
                                </div>
                                <div class="result-card positive">
                                    <span class="result-label">Ganancia Potencial</span>
                                    <span class="result-value" id="resultProfit">£0.00</span>
                                </div>
                                <div class="result-card">
                                    <span class="result-label">Margen Requerido</span>
                                    <span class="result-value" id="resultMargin">£0.00</span>
                                </div>
                                <div class="result-card">
                                    <span class="result-label">Valor del Trade</span>
                                    <span class="result-value" id="resultTradeValue">£0.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="calc-actions">
                            <button type="button" class="btn btn-secondary" id="resetCalculator">
                                <i data-lucide="refresh-cw"></i>
                                Resetear
                            </button>
                            <button type="button" class="btn btn-primary" id="saveToTrade">
                                <i data-lucide="save"></i>
                                Usar en Nuevo Trade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    setupEventListeners() {
        // Modal controls
        const closeBtn = document.getElementById('closeCalculator');
        const backdrop = document.querySelector('#calculatorModal .modal-backdrop');
        const resetBtn = document.getElementById('resetCalculator');
        const saveBtn = document.getElementById('saveToTrade');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeModal());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetCalculator());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToNewTrade());
        }
        
        // Order type buttons
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.order-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCalculation.orderType = e.target.dataset.type;
                this.calculate();
            });
        });
        
        // Input listeners
        const inputs = ['calcSymbol', 'calcEntry', 'calcStopLoss', 'calcTakeProfit', 
                       'calcLotSize', 'calcLeverage', 'calcBalance'];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.calculate());
            }
        });
        
        // Special handling for risk inputs
        const riskPercentInput = document.getElementById('calcRiskPercent');
        const riskAmountInput = document.getElementById('calcRiskAmount');
        
        if (riskPercentInput) {
            riskPercentInput.addEventListener('input', () => {
                this.riskMode = 'percent';
                this.updateRiskModeIndicator();
                this.calculate();
            });
            
            riskPercentInput.addEventListener('focus', () => {
                this.riskMode = 'percent';
                this.updateRiskModeIndicator();
                // Add visual indicator for browsers without :has() support
                riskPercentInput.parentElement.classList.add('risk-active');
                riskAmountInput.parentElement.classList.remove('risk-active');
            });
            
            riskPercentInput.addEventListener('blur', () => {
                riskPercentInput.parentElement.classList.remove('risk-active');
            });
        }
        
        if (riskAmountInput) {
            riskAmountInput.addEventListener('input', () => {
                this.riskMode = 'amount';
                this.updateRiskModeIndicator();
                this.calculate();
            });
            
            riskAmountInput.addEventListener('focus', () => {
                this.riskMode = 'amount';
                this.updateRiskModeIndicator();
                // Add visual indicator for browsers without :has() support
                riskAmountInput.parentElement.classList.add('risk-active');
                riskPercentInput.parentElement.classList.remove('risk-active');
            });
            
            riskAmountInput.addEventListener('blur', () => {
                riskAmountInput.parentElement.classList.remove('risk-active');
            });
        }
        
        // Use recommended lot button
        const useRecommendedBtn = document.getElementById('useRecommendedLot');
        if (useRecommendedBtn) {
            useRecommendedBtn.addEventListener('click', () => {
                const recommendedLot = document.getElementById('recommendedLot')?.textContent;
                if (recommendedLot && recommendedLot !== '0.00') {
                    document.getElementById('calcLotSize').value = recommendedLot;
                    this.calculate();
                    app.modules.utils?.showToast('Tamaño de lote actualizado', 'success');
                }
            });
        }
    }
    
    openModal() {
        const modal = document.getElementById('calculatorModal');
        if (modal) {
            modal.classList.add('active');
            // Initialize risk mode indicator
            this.updateRiskModeIndicator();
            // Load current prices if available
            this.loadCurrentPrices();
            // Initial calculation
            this.calculate();
            // Update icons
            lucide.createIcons();
        }
    }
    
    closeModal() {
        const modal = document.getElementById('calculatorModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    calculate() {
        // Get input values
        const symbol = document.getElementById('calcSymbol').value;
        const entry = parseFloat(document.getElementById('calcEntry').value) || 0;
        const stopLoss = parseFloat(document.getElementById('calcStopLoss').value) || 0;
        const takeProfit = parseFloat(document.getElementById('calcTakeProfit').value) || 0;
        const lotSize = parseFloat(document.getElementById('calcLotSize').value) || 0.01;
        let riskPercent = parseFloat(document.getElementById('calcRiskPercent').value) || 1;
        let riskAmount = parseFloat(document.getElementById('calcRiskAmount').value) || 0;
        const leverage = parseFloat(document.getElementById('calcLeverage').value) || 500;
        const balance = parseFloat(document.getElementById('calcBalance').value) || 10000;
        const orderType = document.querySelector('.order-btn.active').dataset.type;
        
        if (!entry || !stopLoss || !this.pipValues[symbol]) {
            this.clearResults();
            return;
        }
        
        // Get pip info for symbol
        const pipInfo = this.pipValues[symbol];
        const pipSize = pipInfo.pipSize;
        const contractSize = pipInfo.contractSize;
        
        // Calculate pips
        let pipsSL = 0;
        let pipsTP = 0;
        
        if (orderType === 'buy') {
            pipsSL = (entry - stopLoss) / pipSize;
            pipsTP = takeProfit ? (takeProfit - entry) / pipSize : 0;
        } else {
            pipsSL = (stopLoss - entry) / pipSize;
            pipsTP = takeProfit ? (entry - takeProfit) / pipSize : 0;
        }
        
        // Calculate pip value (simplified - assuming GBP account)
        let pipValue = (pipSize * contractSize * lotSize);
        
        // For pairs not ending in account currency, we need conversion (simplified)
        if (symbol.includes('JPY')) {
            pipValue = pipValue / 100; // Simplified conversion
        }
        if (symbol.startsWith('EUR') || symbol.startsWith('GBP')) {
            pipValue = pipValue * 1.2; // Simplified conversion rate
        }
        
        // Calculate potential loss and profit
        const potentialLoss = Math.abs(pipsSL * pipValue);
        const potentialProfit = Math.abs(pipsTP * pipValue);
        
        // Calculate Risk/Reward ratio
        const rrRatio = pipsSL > 0 ? (pipsTP / pipsSL).toFixed(2) : 0;
        
        // Calculate margin required
        const tradeValue = entry * contractSize * lotSize;
        const marginRequired = tradeValue / leverage;
        
        // Handle risk mode (percent vs amount)
        if (this.riskMode === 'amount') {
            // User entered fixed amount, calculate percentage
            riskPercent = (riskAmount / balance) * 100;
            document.getElementById('calcRiskPercent').value = riskPercent.toFixed(2);
        } else {
            // User entered percentage, calculate amount
            riskAmount = (balance * riskPercent) / 100;
            document.getElementById('calcRiskAmount').value = riskAmount.toFixed(2);
        }
        
        // Calculate recommended lot size based on risk
        let recommendedLotSize = 0;
        if (pipsSL > 0) {
            // Calculate pip value for 1 standard lot
            let pipValuePerStandardLot = pipSize * contractSize;
            
            // For pairs not ending in account currency, apply conversion
            if (symbol.includes('JPY')) {
                pipValuePerStandardLot = pipValuePerStandardLot / 100;
            }
            if (symbol.startsWith('EUR') || symbol.startsWith('GBP')) {
                pipValuePerStandardLot = pipValuePerStandardLot * 1.2;
            }
            
            // Calculate recommended lot size
            recommendedLotSize = riskAmount / (pipsSL * pipValuePerStandardLot);
            
            // Round to 2 decimals and ensure minimum lot size
            recommendedLotSize = Math.max(0.01, parseFloat(recommendedLotSize.toFixed(2)));
        }
        
        // Update results
        document.getElementById('resultPipsSL').textContent = Math.abs(pipsSL).toFixed(1);
        document.getElementById('resultPipsTP').textContent = Math.abs(pipsTP).toFixed(1);
        document.getElementById('resultRR').textContent = `1:${rrRatio}`;
        document.getElementById('resultPipValue').textContent = `£${pipValue.toFixed(2)}`;
        document.getElementById('resultLoss').textContent = `-£${potentialLoss.toFixed(2)}`;
        document.getElementById('resultProfit').textContent = `+£${potentialProfit.toFixed(2)}`;
        document.getElementById('resultMargin').textContent = `£${marginRequired.toFixed(2)}`;
        document.getElementById('resultTradeValue').textContent = `£${tradeValue.toFixed(2)}`;
        
        // Update recommended lot size
        const recommendedLotEl = document.getElementById('recommendedLot');
        if (recommendedLotEl) {
            recommendedLotEl.textContent = recommendedLotSize.toFixed(2);
            
            // Add visual indicator if current lot size differs from recommended
            const currentLot = parseFloat(document.getElementById('calcLotSize').value) || 0.01;
            if (Math.abs(currentLot - recommendedLotSize) > 0.01) {
                recommendedLotEl.parentElement.classList.add('highlight');
            } else {
                recommendedLotEl.parentElement.classList.remove('highlight');
            }
        }
        
        // Add RR color coding
        const rrElement = document.getElementById('resultRR');
        rrElement.classList.remove('good-rr', 'bad-rr');
        if (rrRatio >= 2) {
            rrElement.classList.add('good-rr');
        } else if (rrRatio < 1) {
            rrElement.classList.add('bad-rr');
        }
    }
    
    clearResults() {
        document.getElementById('resultPipsSL').textContent = '0';
        document.getElementById('resultPipsTP').textContent = '0';
        document.getElementById('resultRR').textContent = '1:0';
        document.getElementById('resultPipValue').textContent = '£0.00';
        document.getElementById('resultLoss').textContent = '£0.00';
        document.getElementById('resultProfit').textContent = '£0.00';
        document.getElementById('resultMargin').textContent = '£0.00';
        document.getElementById('resultTradeValue').textContent = '£0.00';
        const recommendedLotEl = document.getElementById('recommendedLot');
        if (recommendedLotEl) {
            recommendedLotEl.textContent = '0.00';
        }
    }
    
    resetCalculator() {
        document.getElementById('calcEntry').value = '';
        document.getElementById('calcStopLoss').value = '';
        document.getElementById('calcTakeProfit').value = '';
        document.getElementById('calcLotSize').value = '0.01';
        document.getElementById('calcRiskPercent').value = '1';
        document.getElementById('calcRiskAmount').value = '100';
        this.riskMode = 'percent';
        this.updateRiskModeIndicator();
        this.clearResults();
        
        // Remove any active classes
        document.querySelectorAll('.calc-field.risk-active').forEach(field => {
            field.classList.remove('risk-active');
        });
    }
    
    saveToNewTrade() {
        // Get calculated values
        const symbol = document.getElementById('calcSymbol').value;
        const entry = document.getElementById('calcEntry').value;
        const stopLoss = document.getElementById('calcStopLoss').value;
        const takeProfit = document.getElementById('calcTakeProfit').value;
        const lotSize = document.getElementById('calcLotSize').value;
        const orderType = document.querySelector('.order-btn.active').dataset.type;
        
        // Close calculator
        this.closeModal();
        
        // Navigate to new trade
        if (app.modules.navigation) {
            app.modules.navigation.navigateTo('new-trade');
        }
        
        // Pre-fill form after a short delay
        setTimeout(() => {
            const symbolInput = document.getElementById('symbol');
            const entryInput = document.getElementById('entryPrice');
            const slInput = document.getElementById('stopLoss');
            const tpInput = document.getElementById('takeProfit');
            const volumeInput = document.getElementById('volume');
            const directionInput = document.getElementById('direction');
            
            if (symbolInput) symbolInput.value = symbol;
            if (entryInput) entryInput.value = entry;
            if (slInput) slInput.value = stopLoss;
            if (tpInput) tpInput.value = takeProfit;
            if (volumeInput) volumeInput.value = lotSize;
            if (directionInput) directionInput.value = orderType === 'buy' ? 'long' : 'short';
            
            // Show success message
            if (app.modules.utils) {
                app.modules.utils.showToast('Valores transferidos al nuevo trade', 'success');
            }
        }, 300);
    }
    
    loadCurrentPrices() {
        // This would normally fetch real-time prices
        // For now, we'll use example prices
        const examplePrices = {
            'EURUSD': 1.0856,
            'GBPUSD': 1.2743,
            'USDJPY': 157.23,
            'XAUUSD': 2586.98,
            'BTCUSD': 98543.00,
            'US500': 6034.5
        };
        
        const symbol = document.getElementById('calcSymbol').value;
        if (examplePrices[symbol] && !document.getElementById('calcEntry').value) {
            document.getElementById('calcEntry').value = examplePrices[symbol];
        }
    }
    
    loadAccountSettings() {
        // Load from storage if available
        const settings = app.modules.storage?.getSettings();
        if (settings) {
            this.accountSettings.balance = settings.initialBalance || 10000;
            document.getElementById('calcBalance').value = this.accountSettings.balance;
        }
    }
    
    updateRiskModeIndicator() {
        const indicator = document.getElementById('riskModeIndicator');
        if (indicator) {
            const modeValue = indicator.querySelector('.mode-value');
            if (modeValue) {
                if (this.riskMode === 'amount') {
                    modeValue.textContent = 'Monto Fijo £';
                    indicator.classList.add('amount-mode');
                } else {
                    modeValue.textContent = 'Porcentaje %';
                    indicator.classList.remove('amount-mode');
                }
            }
        }
    }
}

// Initialize calculator
if (typeof window !== 'undefined') {
    window.tradingCalculator = new TradingCalculator();
}
