/**
 * Paper Trading Module - Sistema de simulación rápida
 */
const PaperTrading = (function() {
    'use strict';

    // Estado del módulo
    let activeTrades = []; // Ahora es un array para múltiples trades
    let paperTrades = [];
    let strategies = [];
    let selectedStrategy = null;
    let tradeTimers = {}; // Timers individuales para cada trade
    let pendingReviewTrade = null; // Trade esperando review antes de guardar
    
    // Configuración por defecto
    const config = {
        defaultSL: 50,  // pips/puntos
        defaultTP: 100, // pips/puntos
        maxTradeDuration: 8 * 60 * 60 * 1000, // 8 horas en ms
        autoCloseWarning: 7.5 * 60 * 60 * 1000, // Advertencia a las 7.5 horas
        instruments: [
            'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY',
            'EURJPY', 'AUDJPY', 'AUDUSD', 'USDCHF',
            'USDCAD', 'GBPCAD', 'EURPLN', 'BTCUSD',
            'ETHUSD', 'US30', 'US500', 'NAS100'
        ],
        customInstruments: [] // Para pares añadidos por el usuario
    };

    /**
     * Inicializar módulo
     */
    function init() {
        try {
            // Cargar datos siempre
            loadPaperTrades();
            loadStrategies();
            loadCustomInstruments();
            
            // Solo configurar eventos y actualizar UI si estamos en la página correcta
            const paperTradingPage = document.getElementById('paper-trading');
            if (paperTradingPage) {
                setupEventListeners();
                
                // Dar tiempo para que el DOM se actualice completamente
                setTimeout(() => {
                    updateStats();
                    renderRecentTrades();
                    renderReviews();
                    updateActiveTradesUI();
                    generateSummaryCharts();
                }, 100);
            }
        } catch (error) {
            console.error('Error inicializando Paper Trading:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Botones BUY/SELL
        document.getElementById('quickBuyBtn')?.addEventListener('click', () => openTrade('buy'));
        document.getElementById('quickSellBtn')?.addEventListener('click', () => openTrade('sell'));
        
        // Botones de cierre
        document.getElementById('closeTPBtn')?.addEventListener('click', () => closeTrade('TP'));
        document.getElementById('closeSLBtn')?.addEventListener('click', () => closeTrade('SL'));
        document.getElementById('closeBEBtn')?.addEventListener('click', () => closeTrade('BE'));
        
        // Selector de instrumento
        document.getElementById('paperInstrument')?.addEventListener('change', (e) => {
            if (e.target.value === '_ADD_NEW_') {
                addNewInstrument();
            }
        });
        
        // Selector de estrategia
        document.getElementById('strategySelect')?.addEventListener('change', (e) => {
            selectedStrategy = e.target.value;
        });
        
        // Botón de nueva estrategia
        document.getElementById('addStrategyBtn')?.addEventListener('click', () => {
            const group = document.getElementById('addStrategyGroup');
            if (group) {
                group.style.display = group.style.display === 'none' ? 'flex' : 'none';
                if (group.style.display === 'flex') {
                    document.getElementById('newStrategyInput')?.focus();
                }
            }
        });
        
        // Confirmar agregar estrategia
        document.getElementById('confirmAddStrategy')?.addEventListener('click', addNewStrategy);
        
        // Enter key en input de estrategia
        document.getElementById('newStrategyInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewStrategy();
            }
        });
        
        // Reset
        document.getElementById('resetPaperBtn')?.addEventListener('click', resetPaperTrading);
    }

    /**
     * Abrir un trade simulado
     */
    function openTrade(direction) {
        const instrument = document.getElementById('paperInstrument')?.value;
        const notes = document.getElementById('paperNotes')?.value;
        
        if (!instrument) {
            showToast('Por favor selecciona un instrumento', 'error');
            return;
        }
        
        // VALIDAR QUE SE HAYA SELECCIONADO UNA ESTRATEGIA
        if (!selectedStrategy || selectedStrategy === '') {
            showToast('⚠️ Por favor selecciona una estrategia', 'error');
            // Hacer focus en el selector de estrategia
            const strategySelect = document.getElementById('strategySelect');
            if (strategySelect) {
                strategySelect.focus();
                strategySelect.style.borderColor = '#ef4444';
                setTimeout(() => {
                    strategySelect.style.borderColor = '';
                }, 3000);
            }
            return;
        }
        
        // Verificar si ya hay un trade activo con el mismo instrumento
        const existingTrade = activeTrades.find(t => t.instrument === instrument);
        if (existingTrade) {
            showToast(`⚠️ Ya tienes un trade activo en ${instrument}`, 'warning');
            return;
        }
        
        // Límite de trades activos (configurable)
        if (activeTrades.length >= 5) {
            showToast('⚠️ Máximo 5 trades activos permitidos', 'warning');
            return;
        }
        
        const newTrade = {
            id: generateId(),
            instrument,
            direction,
            entryTime: new Date().toISOString(),
            entryPrice: getCurrentPrice(instrument),
            strategy: selectedStrategy, // Ahora es obligatorio
            notes,
            status: 'open',
            warningShown: false
        };
        
        // Añadir al array de trades activos
        activeTrades.push(newTrade);
        
        // Iniciar timer individual para este trade
        startTradeTimer(newTrade.id);
        
        // Actualizar UI
        updateActiveTradesUI();
        showToast(`✅ Trade #${activeTrades.length} ${direction.toUpperCase()} abierto en ${instrument}`, 'success');
        
        // Limpiar formulario
        document.getElementById('paperNotes').value = '';
        
        // Guardar
        savePaperTrades();
    }

    /**
     * Cerrar trade simulado específico
     */
    function closeTrade(tradeId, outcome, customPips = null) {
        const tradeIndex = activeTrades.findIndex(t => t.id === tradeId);
        if (tradeIndex === -1) {
            showToast('❌ Trade no encontrado', 'error');
            return;
        }

        const trade = activeTrades[tradeIndex];
        const exitPrice = getCurrentPrice(trade.instrument);

        // Usar pips personalizados si se proporcionan, sino calcular según outcome
        let pips;
        if (customPips !== null && customPips !== undefined) {
            pips = parseFloat(customPips);
        } else {
            pips = calculatePips(trade, exitPrice, outcome);
        }

        const pnl = calculatePnL(trade, pips);

        // Completar información del trade
        trade.exitTime = new Date().toISOString();
        trade.exitPrice = exitPrice;
        trade.outcome = outcome;
        trade.pips = pips;
        trade.pnl = pnl;
        trade.status = 'closed';
        trade.duration = calculateDuration(trade.entryTime, trade.exitTime);
        trade.tradeIndex = tradeIndex; // Guardar índice para después

        // Si es TP o SL, mostrar modal de review antes de guardar
        if (outcome === 'TP' || outcome === 'SL') {
            pendingReviewTrade = trade;
            showTradeReviewModal(trade);
            return; // No continuar hasta que se complete el review
        }

        // Para BE, TIMEOUT, etc. - guardar directamente sin review
        finalizeTrade(trade, tradeIndex);
    }

    /**
     * Finalizar y guardar el trade (después del review o directamente)
     */
    function finalizeTrade(trade, tradeIndex) {
        // Agregar a historial
        paperTrades.push(trade);

        // Eliminar de trades activos
        activeTrades.splice(tradeIndex, 1);

        // Detener timer de este trade
        stopTradeTimer(trade.id);

        // Actualizar UI
        updateActiveTradesUI();
        updateStats();
        renderRecentTrades();
        renderReviews();

        // Mostrar resultado con emojis
        const resultClass = trade.pnl >= 0 ? 'success' : 'error';
        const emoji = trade.pnl >= 0 ? '✅' : '❌';
        const outcomeText = trade.outcome === 'NO_ACTION' ? 'TIMEOUT' : trade.outcome;
        const pipsText = trade.pnl !== 0 ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(0)} pips` : 'Break Even';
        showToast(`${emoji} ${trade.instrument} cerrado: ${outcomeText} | ${pipsText}`, resultClass);

        // Guardar
        savePaperTrades();

        // Actualizar estadísticas de estrategia
        if (trade.strategy) {
            updateStrategyStats(trade.strategy, trade.pnl >= 0, trade.pips);
        }
    }

    /**
     * Mostrar modal de Trade Review
     */
    function showTradeReviewModal(trade) {
        const modal = document.getElementById('tradeReviewModal');
        if (!modal) return;

        // Configurar badge WIN/LOSS
        const badge = document.getElementById('reviewBadge');
        if (badge) {
            const isWin = trade.outcome === 'TP';
            badge.textContent = isWin ? 'WIN' : 'LOSS';
            badge.className = `review-badge ${isWin ? 'win' : 'loss'}`;
        }

        // Resetear todos los botones
        modal.querySelectorAll('.btn-yesno').forEach(btn => btn.classList.remove('selected'));
        modal.querySelectorAll('.btn-emotion').forEach(btn => btn.classList.remove('selected'));

        // Limpiar notas
        const notesInput = document.getElementById('reviewNotes');
        if (notesInput) notesInput.value = '';

        // Setup event listeners para botones Sí/No
        modal.querySelectorAll('.btn-yesno').forEach(btn => {
            btn.onclick = function() {
                const question = this.dataset.question;
                // Deseleccionar otros botones de la misma pregunta
                modal.querySelectorAll(`.btn-yesno[data-question="${question}"]`).forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            };
        });

        // Setup event listeners para emociones
        modal.querySelectorAll('.btn-emotion').forEach(btn => {
            btn.onclick = function() {
                modal.querySelectorAll('.btn-emotion').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            };
        });

        // Botón Saltar
        const skipBtn = document.getElementById('skipReviewBtn');
        if (skipBtn) {
            skipBtn.onclick = function() {
                hideTradeReviewModal();
                if (pendingReviewTrade) {
                    finalizeTrade(pendingReviewTrade, pendingReviewTrade.tradeIndex);
                    pendingReviewTrade = null;
                }
            };
        }

        // Botón Guardar Review
        const saveBtn = document.getElementById('saveReviewBtn');
        if (saveBtn) {
            saveBtn.onclick = function() {
                saveTradeReview();
            };
        }

        // Mostrar modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Actualizar iconos Lucide
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    }

    /**
     * Ocultar modal de Trade Review
     */
    function hideTradeReviewModal() {
        const modal = document.getElementById('tradeReviewModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Guardar review del trade
     */
    function saveTradeReview() {
        if (!pendingReviewTrade) return;

        const modal = document.getElementById('tradeReviewModal');

        // Recopilar respuestas
        const review = {
            timestamp: new Date().toISOString(),
            followedStrategy: getSelectedValue(modal, 'followedStrategy'),
            wasFomo: getSelectedValue(modal, 'wasFomo'),
            wasEmotional: getSelectedValue(modal, 'wasEmotional'),
            correctEntry: getSelectedValue(modal, 'correctEntry'),
            respectedSL: getSelectedValue(modal, 'respectedSL'),
            movedSLTP: getSelectedValue(modal, 'movedSLTP'),
            exitedEarly: getSelectedValue(modal, 'exitedEarly'),
            emotion: getSelectedEmotion(modal),
            notes: document.getElementById('reviewNotes')?.value || ''
        };

        // Agregar review al trade
        pendingReviewTrade.review = review;

        // Cerrar modal y finalizar trade
        hideTradeReviewModal();
        finalizeTrade(pendingReviewTrade, pendingReviewTrade.tradeIndex);
        pendingReviewTrade = null;

        showToast('📝 Review guardado exitosamente', 'success');
    }

    /**
     * Obtener valor seleccionado de botones Sí/No
     */
    function getSelectedValue(modal, question) {
        const selected = modal.querySelector(`.btn-yesno[data-question="${question}"].selected`);
        return selected ? selected.dataset.value : null;
    }

    /**
     * Obtener emoción seleccionada
     */
    function getSelectedEmotion(modal) {
        const selected = modal.querySelector('.btn-emotion.selected');
        return selected ? selected.dataset.emotion : null;
    }

    /**
     * Calcular pips según el resultado
     * TP = Take Profit = SIEMPRE GANANCIA (positivo)
     * SL = Stop Loss = SIEMPRE PÉRDIDA (negativo)
     * BE = Break Even = SIEMPRE NEUTRO (0)
     */
    function calculatePips(trade, exitPrice, outcome) {
        switch(outcome) {
            case 'TP':
                // TP siempre es ganancia, sin importar dirección
                return config.defaultTP; // +100 pips
            case 'SL':
                // SL siempre es pérdida, sin importar dirección
                return -config.defaultSL; // -50 pips
            case 'BE':
                // Break Even siempre es 0
                return 0;
            case 'TIMEOUT':
            case 'NO_ACTION':
                // Si se cierra por timeout, sin ganancia ni pérdida
                return 0;
            default:
                // Cálculo basado en precio real (simulado)
                const multiplier = trade.direction === 'buy' ? 1 : -1;
                const diff = (exitPrice - trade.entryPrice) * multiplier;
                return Math.round(diff * getPipMultiplier(trade.instrument));
        }
    }

    /**
     * Calcular P&L (en pips, no dinero)
     */
    function calculatePnL(trade, pips) {
        // Solo devolvemos pips, no dinero
        return pips;
    }

    /**
     * Obtener precio actual simulado
     */
    function getCurrentPrice(instrument) {
        // Precios base simulados
        const basePrices = {
            'XAUUSD': 2050.00,
            'XAGUSD': 30.50,
            'EURUSD': 1.0850,
            'GBPUSD': 1.2750,
            'USDJPY': 148.50,
            'BTCUSD': 43500.00,
            'ETHUSD': 2250.00,
            'US30': 38500.00,
            'US500': 6000.00,
            'NAS100': 17250.00
        };
        
        const base = basePrices[instrument] || 1.0000;
        // Agregar variación aleatoria pequeña
        const variation = (Math.random() - 0.5) * 0.001 * base;
        return base + variation;
    }

    /**
     * Obtener multiplicador de pips
     */
    function getPipMultiplier(instrument) {
        if (instrument.includes('JPY')) return 100;
        if (instrument.includes('XAU')) return 10;
        if (instrument.includes('BTC') || instrument.includes('ETH')) return 1;
        if (instrument.includes('30') || instrument.includes('100')) return 1;
        return 10000;
    }

    /**
     * Obtener tamaño de pip real por instrumento
     * Usado para convertir porcentaje a pips correctamente
     */
    function getPipSize(instrument) {
        // Pares con JPY (2 decimales)
        if (instrument.includes('JPY')) return 0.01;

        // Metales
        if (instrument.includes('XAU')) return 0.1;    // Oro: 1 pip = 0.10
        if (instrument.includes('XAG')) return 0.01;   // Plata: 1 pip = 0.01
        if (instrument.includes('XTI') || instrument.includes('OIL') || instrument.includes('WTI')) return 0.01; // Petróleo

        // Índices (1 punto = 1 pip)
        if (instrument.includes('US30') || instrument.includes('DOW')) return 1;
        if (instrument.includes('NAS') || instrument.includes('NDX')) return 1;
        if (instrument.includes('US500') || instrument.includes('SPX')) return 0.1;
        if (instrument.includes('GER') || instrument.includes('DAX')) return 0.1;
        if (instrument.includes('UK100') || instrument.includes('FTSE')) return 0.1;

        // Crypto (1 punto = 1 pip)
        if (instrument.includes('BTC')) return 1;
        if (instrument.includes('ETH')) return 0.1;

        // Forex estándar (4 decimales)
        return 0.0001;
    }

    /**
     * Calcular duración del trade
     */
    function calculateDuration(entryTime, exitTime) {
        const diff = new Date(exitTime) - new Date(entryTime);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Actualizar UI de todos los trades activos
     */
    function updateActiveTradesUI() {
        const container = document.getElementById('activeTradeInfo');
        if (!container) return;
        
        if (activeTrades.length === 0) {
            container.innerHTML = `
                <div class="no-active-trade">
                    <i data-lucide="info"></i>
                    <p>No hay trades activos</p>
                    <small>${5 - activeTrades.length} espacios disponibles</small>
                </div>
            `;
        } else {
            const tradesHTML = activeTrades.map(trade => {
                const currentPrice = getCurrentPrice(trade.instrument);
                const floatingPips = calculateFloatingPnL(trade, currentPrice);
                
                return `
                    <div class="active-trade-card ${trade.direction}" data-trade-id="${trade.id}">
                        <div class="trade-header">
                            <span class="trade-instrument">${trade.instrument}</span>
                            <span class="trade-direction ${trade.direction}">
                                ${trade.direction.toUpperCase()}
                            </span>
                            <span class="trade-status active">ACTIVO</span>
                        </div>
                        <div class="trade-details">
                            <div class="detail-item">
                                <span>Entrada:</span>
                                <span>${trade.entryPrice.toFixed(5)}</span>
                            </div>
                            <div class="detail-item">
                                <span>Par:</span>
                                <span>${trade.instrument}</span>
                            </div>
                            <div class="detail-item">
                                <span>Estrategia:</span>
                                <span style="font-size: 0.85rem;">${trade.strategy}</span>
                            </div>
                            <div class="detail-item">
                                <span>Tiempo:</span>
                                <span class="trade-timer" id="timer-${trade.id}">0m</span>
                            </div>
                        </div>
                        <div class="manual-pips-input">
                            <div class="pips-input-group">
                                <input type="number" 
                                       class="pips-input" 
                                       id="pips-${trade.id}" 
                                       placeholder="Pips"
                                       step="0.1">
                                <span class="pips-separator">ó</span>
                                <input type="number" 
                                       class="percent-input" 
                                       id="percent-${trade.id}" 
                                       placeholder="%"
                                       step="0.01"
                                       onchange="PaperTrading.convertPercentToPips('${trade.id}', this.value)">
                                <button class="convert-btn" onclick="PaperTrading.convertPercentToPips('${trade.id}')" title="Convertir % a Pips">
                                    <i data-lucide="refresh-cw"></i>
                                </button>
                            </div>
                            <div class="pips-help-text">
                                Ingresa el resultado en Pips o %
                            </div>
                        </div>
                        <div class="trade-actions-individual">
                            <button class="mini-close-btn tp" onclick="PaperTrading.closeWithCustomPips('${trade.id}', 'TP')" title="Cerrar con Ganancia">
                                ✅ WIN
                            </button>
                            <button class="mini-close-btn sl" onclick="PaperTrading.closeWithCustomPips('${trade.id}', 'SL')" title="Cerrar con Pérdida">
                                ❌ LOSS
                            </button>
                            <button class="mini-close-btn be" onclick="PaperTrading.closeWithCustomPips('${trade.id}', 'BE')" title="Break Even">
                                ➖ BE
                            </button>
                        </div>
                        ${trade.notes ? `
                            <div class="trade-notes">
                                <small>📝 ${trade.notes}</small>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div class="active-trades-container">
                    <div class="active-trades-header">
                        <span>Trades Activos: ${activeTrades.length}/5</span>
                    </div>
                    ${tradesHTML}
                </div>
            `;
        }
        
        // Actualizar iconos
        setTimeout(() => {
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons();
            }
        }, 10);
    }

    /**
     * Calcular pips flotantes
     */
    function calculateFloatingPnL(trade, currentPrice) {
        const multiplier = trade.direction === 'buy' ? 1 : -1;
        const priceDiff = (currentPrice - trade.entryPrice) * multiplier;
        const pips = priceDiff * getPipMultiplier(trade.instrument);
        return pips; // Solo devolvemos pips
    }

    /**
     * Timers individuales para cada trade
     */
    function startTradeTimer(tradeId) {
        // Detener timer existente si existe
        if (tradeTimers[tradeId]) {
            clearInterval(tradeTimers[tradeId]);
        }
        
        tradeTimers[tradeId] = setInterval(() => {
            const trade = activeTrades.find(t => t.id === tradeId);
            if (!trade) {
                stopTradeTimer(tradeId);
                return;
            }
            
            const now = new Date();
            const entryTime = new Date(trade.entryTime);
            const elapsed = now - entryTime;
            
            // Formatear tiempo
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const timerElement = document.getElementById(`timer-${tradeId}`);
            if (timerElement) {
                const timeString = hours > 0 
                    ? `${hours}h ${minutes}m ${seconds}s`
                    : minutes > 0 
                    ? `${minutes}m ${seconds}s`
                    : `${seconds}s`;
                
                timerElement.textContent = timeString;
                
                // Remover clases anteriores
                timerElement.classList.remove('warning', 'danger');
                
                // Advertencia si se acerca a 8 horas
                if (hours >= 7 && minutes >= 45) {
                    timerElement.classList.add('danger');
                    timerElement.title = `⏰ Se cerrará en ${8*60 - (hours*60 + minutes)} minutos`;
                } else if (hours >= 7) {
                    timerElement.classList.add('warning');
                    timerElement.title = 'Acercándose al límite';
                } else {
                    timerElement.title = 'Tiempo transcurrido';
                }
            }
            
            // Advertencia antes del auto-cierre
            if (elapsed >= config.autoCloseWarning && !trade.warningShown) {
                showToast(`⚠️ ${trade.instrument} se cerrará en 30 minutos`, 'warning');
                trade.warningShown = true;
            }
            
            // Auto-cerrar después de 8 horas
            if (elapsed >= config.maxTradeDuration) {
                showToast(`⏰ ${trade.instrument} cerrado automáticamente (8 horas)`, 'warning');
                closeTrade(tradeId, 'NO_ACTION');
            }
            
            // NO actualizar pips flotantes automáticamente
        }, 1000);
    }

    function stopTradeTimer(tradeId) {
        if (tradeTimers[tradeId]) {
            clearInterval(tradeTimers[tradeId]);
            delete tradeTimers[tradeId];
        }
    }
    
    function stopAllTimers() {
        Object.keys(tradeTimers).forEach(tradeId => {
            clearInterval(tradeTimers[tradeId]);
        });
        tradeTimers = {};
    }

    function updateFloatingPipsForTrade(tradeId) {
        const trade = activeTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const currentPrice = getCurrentPrice(trade.instrument);
        const floatingPips = calculateFloatingPnL(trade, currentPrice);
        
        // Actualizar precio actual
        const priceElement = document.querySelector(`[data-trade-id="${tradeId}"] .current-price`);
        if (priceElement) {
            priceElement.textContent = currentPrice.toFixed(5);
        }
        
        // Actualizar pips flotantes
        const pipsElement = document.querySelector(`[data-trade-id="${tradeId}"] .floating-pips`);
        if (pipsElement) {
            pipsElement.className = `floating-pips ${floatingPips >= 0 ? 'positive' : 'negative'}`;
            pipsElement.textContent = `${floatingPips > 0 ? '+' : ''}${floatingPips.toFixed(0)}`;
        }
    }

    /**
     * Habilitar/deshabilitar botones de cierre
     */
    function enableCloseButtons(enable) {
        const buttons = ['closeTPBtn', 'closeSLBtn', 'closeBEBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = !enable;
                btn.classList.toggle('disabled', !enable);
            }
        });
    }

    /**
     * Actualizar estadísticas
     */
    function updateStats() {
        // Verificar si estamos en la página de Paper Trading
        const paperTradingPage = document.getElementById('paper-trading');
        if (!paperTradingPage || !paperTradingPage.classList.contains('active')) {
            return; // No actualizar si no estamos en la página
        }
        
        const closedTrades = paperTrades.filter(t => t.status === 'closed');
        const wins = closedTrades.filter(t => t.pnl >= 0);
        const losses = closedTrades.filter(t => t.pnl < 0);
        
        const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length * 100) : 0;
        
        // Actualizar UI
        updateStatElement('paperTotalTrades', closedTrades.length);
        updateStatElement('paperWins', wins.length);
        updateStatElement('paperLosses', losses.length);
        updateStatElement('paperWinRate', `${winRate.toFixed(1)}%`);
        const totalPips = closedTrades.reduce((sum, t) => sum + (t.pips || 0), 0);
        updateStatElement('paperTotalPnL', `${totalPips > 0 ? '+' : ''}${totalPips.toFixed(0)} pips`, totalPips >= 0);
        
        // Actualizar gráfico de estrategias
        updateStrategyChart();
    }

    /**
     * Actualizar elemento de estadística
     */
    function updateStatElement(id, value, isPositive = null) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            
            if (isPositive !== null) {
                element.classList.toggle('positive', isPositive);
                element.classList.toggle('negative', !isPositive);
            }
        }
    }

    /**
     * Renderizar trades recientes
     */
    function renderRecentTrades() {
        const container = document.getElementById('paperRecentTrades');
        // Solo actualizar si el elemento existe
        if (!container) {
            return;
        }
        
        const recentTrades = paperTrades
            .filter(t => t.status === 'closed')
            .slice(-10)
            .reverse();
        
        if (recentTrades.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <p>No hay trades recientes</p>
                </div>
            `;
        } else {
            const html = recentTrades.map(trade => {
                const outcomeLabel = trade.outcome === 'NO_ACTION' ? 'TIMEOUT' : trade.outcome;
                const outcomeClass = trade.outcome === 'NO_ACTION' ? 'timeout' : '';
                
                return `
                    <div class="recent-trade-item ${trade.pnl >= 0 ? 'win' : 'loss'}">
                        <div class="trade-info">
                            <span class="instrument">${trade.instrument}</span>
                            <span class="direction ${trade.direction}">${trade.direction.toUpperCase()}</span>
                            <span class="outcome ${outcomeClass}">${outcomeLabel}</span>
                        </div>
                        <div class="trade-result">
                            <span class="pnl ${trade.pnl >= 0 ? 'positive' : 'negative'}">
                                ${trade.pips > 0 ? '+' : ''}${(trade.pips || 0).toFixed(0)} pips
                            </span>
                            <span class="time">${formatTime(trade.exitTime)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        }
        
        // Actualizar iconos de forma segura
        setTimeout(() => {
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons();
            }
        }, 10);
    }

    /**
     * Formatear tiempo
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) { // Menos de 1 hora
            return `${Math.floor(diff / 60000)}m atrás`;
        } else if (diff < 86400000) { // Menos de 1 día
            return `${Math.floor(diff / 3600000)}h atrás`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Agregar nueva estrategia
     */
    function addNewStrategy() {
        const input = document.getElementById('newStrategyInput');
        const strategyName = input?.value.trim();
        
        if (!strategyName) {
            showToast('Por favor ingresa un nombre de estrategia', 'error');
            return;
        }
        
        if (strategies.some(s => s.name === strategyName)) {
            showToast('Esta estrategia ya existe', 'warning');
            return;
        }
        
        strategies.push({
            name: strategyName,
            wins: 0,
            losses: 0,
            totalPips: 0
        });
        
        saveStrategies();
        updateStrategySelect();
        input.value = '';
        
        // Ocultar el formulario de agregar
        const group = document.getElementById('addStrategyGroup');
        if (group) {
            group.style.display = 'none';
        }
        
        // Seleccionar la nueva estrategia
        const select = document.getElementById('strategySelect');
        if (select) {
            select.value = strategyName;
            selectedStrategy = strategyName;
        }
        
        showToast(`Estrategia "${strategyName}" agregada`, 'success');
    }

    /**
     * Actualizar selector de estrategias
     */
    function updateStrategySelect() {
        const select = document.getElementById('strategySelect');
        if (!select) return;
        
        select.innerHTML = `
            <option value="">-- Selecciona una estrategia --</option>
            ${strategies.map(s => `
                <option value="${s.name}">${s.name}</option>
            `).join('')}
        `;
    }

    /**
     * Actualizar estadísticas de estrategia
     */
    function updateStrategyStats(strategyName, isWin, pips) {
        const strategy = strategies.find(s => s.name === strategyName);
        if (!strategy) return;
        
        if (isWin) {
            strategy.wins++;
        } else {
            strategy.losses++;
        }
        
        // Actualizar total de pips para la estrategia
        strategy.totalPips = (strategy.totalPips || 0) + (pips || 0);
        
        saveStrategies();
        updateStrategyChart();
    }

    /**
     * Actualizar gráfico de estrategias
     */
    function updateStrategyChart() {
        const container = document.getElementById('strategyPerformance');
        // Solo actualizar si el elemento existe (estamos en la página correcta)
        if (!container) {
            return;
        }
        
        if (strategies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="bar-chart-2"></i>
                    <p>No hay estrategias registradas</p>
                </div>
            `;
        } else {
            // Calcular estadísticas por estrategia
            const strategyStats = strategies.map(s => {
                const trades = paperTrades.filter(t => 
                    t.strategy === s.name && t.status === 'closed'
                );
                const wins = trades.filter(t => t.pnl >= 0).length;
                const losses = trades.filter(t => t.pnl < 0).length;
                const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0);
                const winRate = trades.length > 0 ? (wins / trades.length * 100) : 0;
                
                return {
                    name: s.name,
                    trades: trades.length,
                    wins,
                    losses,
                    winRate,
                    totalPips
                };
            }).filter(s => s.trades > 0);
            
            const html = strategyStats.map(s => `
                <div class="strategy-stat-card">
                    <div class="strategy-header">
                        <h4>${s.name}</h4>
                        <span class="trade-count">${s.trades} trades</span>
                    </div>
                    <div class="strategy-stats">
                        <div class="stat">
                            <span class="label">Win Rate</span>
                            <span class="value">${s.winRate.toFixed(1)}%</span>
                        </div>
                        <div class="stat">
                            <span class="label">W/L</span>
                            <span class="value">${s.wins}/${s.losses}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Pips</span>
                            <span class="value ${s.totalPips >= 0 ? 'positive' : 'negative'}">
                                ${s.totalPips > 0 ? '+' : ''}${s.totalPips.toFixed(0)}
                            </span>
                        </div>
                    </div>
                    <div class="win-rate-bar">
                        <div class="bar-fill" style="width: ${s.winRate}%"></div>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = html;
        }
        
        // Actualizar iconos de forma segura
        setTimeout(() => {
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons();
            }
        }, 10);
    }

    /**
     * Reset paper trading
     */
    function resetPaperTrading() {
        if (!confirm('¿Estás seguro de que quieres resetear todos los datos de paper trading?')) {
            return;
        }
        
        // Detener todos los timers
        stopAllTimers();
        
        // Limpiar datos
        paperTrades = [];
        activeTrades = [];
        
        savePaperTrades();
        updateStats();
        renderRecentTrades();
        updateActiveTradesUI();
        
        showToast('Paper trading reseteado', 'success');
    }

    /**
     * Añadir nuevo instrumento
     */
    function addNewInstrument() {
        const newPair = prompt('Ingresa el símbolo del nuevo par (ej: NZDUSD):');
        
        if (newPair && newPair.trim()) {
            const symbol = newPair.trim().toUpperCase();
            
            // Verificar si ya existe
            const allInstruments = [...config.instruments, ...config.customInstruments];
            if (allInstruments.includes(symbol)) {
                showToast('Este par ya existe', 'warning');
                return;
            }
            
            // Añadir a instrumentos personalizados
            config.customInstruments.push(symbol);
            saveCustomInstruments();
            
            // Actualizar el select
            updateInstrumentSelect();
            
            // Seleccionar el nuevo instrumento
            const select = document.getElementById('paperInstrument');
            if (select) {
                select.value = symbol;
            }
            
            showToast(`Par ${symbol} añadido correctamente`, 'success');
        } else {
            // Volver a la selección anterior
            const select = document.getElementById('paperInstrument');
            if (select) {
                select.value = 'XAUUSD';
            }
        }
    }
    
    /**
     * Actualizar selector de instrumentos
     */
    function updateInstrumentSelect() {
        const select = document.getElementById('paperInstrument');
        if (!select) return;
        
        const allInstruments = [...config.instruments, ...config.customInstruments];
        const currentValue = select.value;
        
        select.innerHTML = allInstruments.map(inst => `
            <option value="${inst}">${inst}</option>
        `).join('') + '<option value="_ADD_NEW_">➕ Añadir Par...</option>';
        
        // Restaurar selección si es posible
        if (allInstruments.includes(currentValue)) {
            select.value = currentValue;
        }
    }
    
    /**
     * Guardar instrumentos personalizados
     */
    function saveCustomInstruments() {
        try {
            localStorage.setItem('customInstruments', JSON.stringify(config.customInstruments));
        } catch (error) {
            console.error('Error guardando instrumentos personalizados:', error);
        }
    }
    
    /**
     * Cargar instrumentos personalizados
     */
    function loadCustomInstruments() {
        try {
            const saved = localStorage.getItem('customInstruments');
            if (saved) {
                config.customInstruments = JSON.parse(saved);
                updateInstrumentSelect();
            }
        } catch (error) {
            console.error('Error cargando instrumentos personalizados:', error);
        }
    }
    
    /**
     * Generar ID único
     */
    function generateId() {
        return 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Mostrar toast notification mejorado
     */
    function showToast(message, type = 'info') {
        // Primero intentar usar el sistema de toast existente
        if (window.app && window.app.modules && window.app.modules.utils) {
            window.app.modules.utils.showToast(message, type);
        } else if (window.showToast && typeof window.showToast === 'function') {
            // Si existe una función global showToast
            window.showToast(message, type);
        } else {
            // Fallback: crear toast simple
            const container = document.getElementById('toastContainer') || createToastContainer();
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i data-lucide="${
                    type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'x-circle' : 
                    type === 'warning' ? 'alert-circle' : 
                    'info'
                }"></i>
                <span>${message}</span>
            `;
            
            container.appendChild(toast);
            
            // Actualizar iconos
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons();
            }
            
            // Animar entrada
            setTimeout(() => toast.classList.add('show'), 10);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
    
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Guardar paper trades
     */
    function savePaperTrades() {
        try {
            localStorage.setItem('paperTrades', JSON.stringify(paperTrades));
            if (activeTrades.length > 0) {
                localStorage.setItem('activePaperTrades', JSON.stringify(activeTrades));
            } else {
                localStorage.removeItem('activePaperTrades');
            }
        } catch (error) {
            console.error('Error guardando paper trades:', error);
        }
    }

    /**
     * Cargar paper trades
     */
    function loadPaperTrades() {
        try {
            const saved = localStorage.getItem('paperTrades');
            if (saved) {
                paperTrades = JSON.parse(saved);
            }
            
            const activeTradesData = localStorage.getItem('activePaperTrades');
            if (activeTradesData) {
                activeTrades = JSON.parse(activeTradesData);
                // Reiniciar timers para trades activos
                activeTrades.forEach(trade => {
                    startTradeTimer(trade.id);
                });
            }
        } catch (error) {
            console.error('Error cargando paper trades:', error);
            paperTrades = [];
            activeTrades = [];
        }
    }

    /**
     * Guardar estrategias
     */
    function saveStrategies() {
        try {
            localStorage.setItem('paperStrategies', JSON.stringify(strategies));
        } catch (error) {
            console.error('Error guardando estrategias:', error);
        }
    }

    /**
     * Cargar estrategias
     */
    function loadStrategies() {
        try {
            const saved = localStorage.getItem('paperStrategies');
            if (saved) {
                strategies = JSON.parse(saved);
            } else {
                // Estrategias por defecto
                strategies = [
                    { name: 'Scalping', wins: 0, losses: 0, totalPips: 0 },
                    { name: 'Swing Trading', wins: 0, losses: 0, totalPips: 0 },
                    { name: 'Day Trading', wins: 0, losses: 0, totalPips: 0 },
                    { name: 'News Trading', wins: 0, losses: 0, totalPips: 0 }
                ];
            }
            updateStrategySelect();
        } catch (error) {
            console.error('Error cargando estrategias:', error);
            strategies = [];
        }
    }

    /**
     * Generar resúmenes con gráficos
     */
    function generateSummaryCharts() {
        const now = new Date();
        const trades = paperTrades.filter(t => t.status === 'closed');
        
        if (trades.length === 0) return;
        
        // Resumen diario
        const todayTrades = trades.filter(t => {
            const tradeDate = new Date(t.exitTime);
            return tradeDate.toDateString() === now.toDateString();
        });
        
        // Resumen semanal
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekTrades = trades.filter(t => new Date(t.exitTime) >= weekAgo);
        
        // Resumen mensual
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthTrades = trades.filter(t => new Date(t.exitTime) >= monthAgo);
        
        // Actualizar UI con resúmenes
        updateSummaryDisplay({
            daily: analyzeTrades(todayTrades),
            weekly: analyzeTrades(weekTrades),
            monthly: analyzeTrades(monthTrades)
        });
    }
    
    /**
     * Analizar trades para resumen
     */
    function analyzeTrades(trades) {
        if (trades.length === 0) {
            return {
                totalTrades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                totalPips: 0,
                avgPips: 0,
                bestTrade: 0,
                worstTrade: 0,
                strategies: {},
                failingStrategies: []
            };
        }
        
        const wins = trades.filter(t => t.pnl >= 0);
        const losses = trades.filter(t => t.pnl < 0);
        const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0);
        
        // Analizar por estrategia
        const strategyAnalysis = {};
        trades.forEach(trade => {
            const strategy = trade.strategy || 'Sin estrategia';
            if (!strategyAnalysis[strategy]) {
                strategyAnalysis[strategy] = {
                    trades: 0,
                    wins: 0,
                    losses: 0,
                    pips: 0
                };
            }
            strategyAnalysis[strategy].trades++;
            if (trade.pnl >= 0) {
                strategyAnalysis[strategy].wins++;
            } else {
                strategyAnalysis[strategy].losses++;
            }
            strategyAnalysis[strategy].pips += trade.pips || 0;
        });
        
        // Identificar estrategia/par que no funciona
        const failingStrategies = Object.entries(strategyAnalysis)
            .filter(([_, data]) => {
                const winRate = data.trades > 0 ? (data.wins / data.trades * 100) : 0;
                return winRate < 30 || data.pips < -50; // Menos de 30% win rate o -50 pips de pérdida
            })
            .map(([name, _]) => name);
        
        return {
            totalTrades: trades.length,
            wins: wins.length,
            losses: losses.length,
            winRate: trades.length > 0 ? (wins.length / trades.length * 100) : 0,
            totalPips,
            avgPips: trades.length > 0 ? totalPips / trades.length : 0,
            bestTrade: Math.max(...trades.map(t => t.pips || 0)),
            worstTrade: Math.min(...trades.map(t => t.pips || 0)),
            strategies: strategyAnalysis,
            failingStrategies
        };
    }
    
    /**
     * Actualizar display de resúmenes
     */
    function updateSummaryDisplay(summaries) {
        // Buscar o crear contenedor de resúmenes
        let container = document.getElementById('tradingSummaries');
        if (!container) {
            // Crear contenedor si no existe
            const statsGrid = document.querySelector('.paper-stats-grid');
            if (statsGrid) {
                container = document.createElement('div');
                container.id = 'tradingSummaries';
                container.className = 'trading-summaries';
                container.innerHTML = `
                    <div class="summary-card daily-summary">
                        <h4><i data-lucide="calendar-days"></i> Hoy</h4>
                        <div class="summary-content" id="dailySummary"></div>
                    </div>
                    <div class="summary-card weekly-summary">
                        <h4><i data-lucide="calendar-range"></i> Esta Semana</h4>
                        <div class="summary-content" id="weeklySummary"></div>
                    </div>
                    <div class="summary-card monthly-summary">
                        <h4><i data-lucide="calendar"></i> Este Mes</h4>
                        <div class="summary-content" id="monthlySummary"></div>
                    </div>
                `;
                statsGrid.after(container);
                
                // Actualizar iconos
                setTimeout(() => {
                    if (window.lucide && window.lucide.createIcons) {
                        window.lucide.createIcons();
                    }
                }, 10);
            }
        }
        
        // Actualizar contenidos
        updateSummaryCard('dailySummary', summaries.daily);
        updateSummaryCard('weeklySummary', summaries.weekly);
        updateSummaryCard('monthlySummary', summaries.monthly);
    }
    
    /**
     * Actualizar tarjeta de resumen individual
     */
    function updateSummaryCard(elementId, data) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (data.totalTrades === 0) {
            element.innerHTML = '<p class="no-data">Sin trades en este período</p>';
            return;
        }
        
        const pnlClass = data.totalPips >= 0 ? 'positive' : 'negative';
        
        element.innerHTML = `
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="label">Trades</span>
                    <span class="value">${data.totalTrades}</span>
                </div>
                <div class="summary-stat">
                    <span class="label">Win Rate</span>
                    <span class="value">${data.winRate.toFixed(1)}%</span>
                </div>
                <div class="summary-stat">
                    <span class="label">Pips</span>
                    <span class="value ${pnlClass}">${data.totalPips > 0 ? '+' : ''}${data.totalPips.toFixed(0)}</span>
                </div>
            </div>
            ${data.failingStrategies.length > 0 ? `
                <div class="warning-box">
                    <i data-lucide="alert-triangle"></i>
                    <span>Estrategias con bajo rendimiento: ${data.failingStrategies.join(', ')}</span>
                </div>
            ` : ''}
            <div class="mini-chart" id="chart_${elementId}"></div>
        `;
        
        // Crear mini gráfico si hay datos
        if (data.totalTrades > 0) {
            setTimeout(() => createMiniChart(`chart_${elementId}`, data), 100);
        }
        
        // Actualizar iconos
        setTimeout(() => {
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons();
            }
        }, 10);
    }
    
    /**
     * Crear mini gráfico
     */
    function createMiniChart(elementId, data) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Crear gráfico simple de barras con CSS
        const maxValue = Math.max(data.wins, data.losses);
        const winHeight = (data.wins / maxValue * 100) || 0;
        const lossHeight = (data.losses / maxValue * 100) || 0;
        
        element.innerHTML = `
            <div class="mini-chart-bars">
                <div class="bar-group">
                    <div class="bar win-bar" style="height: ${winHeight}%"></div>
                    <span class="bar-label">W (${data.wins})</span>
                </div>
                <div class="bar-group">
                    <div class="bar loss-bar" style="height: ${lossHeight}%"></div>
                    <span class="bar-label">L (${data.losses})</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Exportar datos de paper trading
     */
    function exportData() {
        const data = {
            paperTrades,
            strategies,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paper-trading-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Datos exportados correctamente', 'success');
    }

    /**
     * Cerrar trade con pips personalizados
     */
    function closeWithCustomPips(tradeId, outcome) {
        // Obtener el valor de pips ingresado
        const pipsInput = document.getElementById(`pips-${tradeId}`);
        const customPips = pipsInput ? parseFloat(pipsInput.value) : null;
        
        // Si hay pips personalizados, usarlos
        if (customPips !== null && !isNaN(customPips)) {
            // Ajustar el signo según el outcome
            let finalPips = customPips;
            if (outcome === 'SL' && finalPips > 0) {
                finalPips = -Math.abs(finalPips); // Asegurar que SL sea negativo
            } else if (outcome === 'TP' && finalPips < 0) {
                finalPips = Math.abs(finalPips); // Asegurar que TP sea positivo
            } else if (outcome === 'BE') {
                finalPips = 0; // BE siempre es 0
            }
            
            closeTrade(tradeId, outcome, finalPips);
        } else {
            // Si no hay pips personalizados, preguntar
            const trade = activeTrades.find(t => t.id === tradeId);
            if (trade) {
                showToast('⚠️ Por favor ingresa los pips o porcentaje', 'warning');
                
                // Hacer focus en el input de pips
                if (pipsInput) {
                    pipsInput.focus();
                    pipsInput.style.borderColor = '#f59e0b';
                    setTimeout(() => {
                        pipsInput.style.borderColor = '';
                    }, 2000);
                }
            }
        }
    }
    
    /**
     * Convertir porcentaje a pips
     * Fórmula: pips = (precio_entrada * porcentaje / 100) / pip_size
     *
     * Ejemplos:
     * - XAUUSD: entry=2050, -0.94% → (2050 * 0.0094) / 0.1 = 192.7 pips
     * - EURUSD: entry=1.0850, 1% → (1.0850 * 0.01) / 0.0001 = 108.5 pips
     * - NAS100: entry=17250, -0.94% → (17250 * 0.0094) / 1 = 162.15 pips
     */
    function convertPercentToPips(tradeId, percentValue = null) {
        const trade = activeTrades.find(t => t.id === tradeId);
        if (!trade) return;

        // Obtener el input de porcentaje si no se proporciona valor
        const percentInput = document.getElementById(`percent-${tradeId}`);
        const pipsInput = document.getElementById(`pips-${tradeId}`);

        if (!percentInput || !pipsInput) return;

        const percent = percentValue !== null ? parseFloat(percentValue) : parseFloat(percentInput.value);

        if (isNaN(percent)) {
            showToast('⚠️ Ingresa un porcentaje válido', 'warning');
            return;
        }

        // Calcular pips usando pip_size real del instrumento
        const pipSize = getPipSize(trade.instrument);
        const priceMovement = trade.entryPrice * (Math.abs(percent) / 100);
        const pipsRaw = priceMovement / pipSize;

        // Mantener el signo del porcentaje
        const pips = percent >= 0 ? Math.round(pipsRaw) : -Math.round(pipsRaw);

        // Actualizar el input de pips
        pipsInput.value = pips;

        // Feedback visual
        const isPositive = pips >= 0;
        pipsInput.style.backgroundColor = isPositive ? '#10b98120' : '#ef444420';
        setTimeout(() => {
            pipsInput.style.backgroundColor = '';
        }, 800);
        
        // Mostrar toast con detalles del cálculo
        const pipSizeDisplay = pipSize >= 0.01 ? pipSize : pipSize.toFixed(4);
        showToast(`📏 ${percent}% = ${pips} pips (${trade.instrument}, pip=${pipSizeDisplay})`, 'info');
    }

    /**
     * Renderizar historial de reviews
     */
    function renderReviews(filteredTrades = null) {
        const container = document.getElementById('tradeReviewsList');
        const statsContainer = document.getElementById('reviewsStats');
        if (!container) return;

        // Obtener trades con review
        const tradesWithReview = (filteredTrades || paperTrades).filter(t => t.review);

        if (tradesWithReview.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="clipboard-list"></i>
                    <p>No hay reviews registrados</p>
                </div>
            `;
            if (statsContainer) statsContainer.innerHTML = '';
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Calcular estadísticas de reviews
        renderReviewStats(tradesWithReview, statsContainer);

        // Renderizar lista
        container.innerHTML = tradesWithReview
            .sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime))
            .slice(0, 20) // Mostrar últimos 20
            .map(trade => renderReviewItem(trade))
            .join('');

        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Renderizar estadísticas de reviews
     */
    function renderReviewStats(trades, container) {
        if (!container) return;

        const stats = {
            total: trades.length,
            followedStrategy: trades.filter(t => t.review?.followedStrategy === 'yes').length,
            fomo: trades.filter(t => t.review?.wasFomo === 'yes').length,
            emotional: trades.filter(t => t.review?.wasEmotional === 'yes').length,
            movedSLTP: trades.filter(t => t.review?.movedSLTP === 'yes').length
        };

        const followedPct = stats.total > 0 ? Math.round((stats.followedStrategy / stats.total) * 100) : 0;
        const fomoPct = stats.total > 0 ? Math.round((stats.fomo / stats.total) * 100) : 0;
        const emotionalPct = stats.total > 0 ? Math.round((stats.emotional / stats.total) * 100) : 0;

        container.innerHTML = `
            <div class="review-stat">
                <span class="review-stat-value">${stats.total}</span>
                <span class="review-stat-label">Reviews</span>
            </div>
            <div class="review-stat">
                <span class="review-stat-value positive">${followedPct}%</span>
                <span class="review-stat-label">Siguió Estrategia</span>
            </div>
            <div class="review-stat">
                <span class="review-stat-value warning">${fomoPct}%</span>
                <span class="review-stat-label">FOMO</span>
            </div>
            <div class="review-stat">
                <span class="review-stat-value negative">${emotionalPct}%</span>
                <span class="review-stat-label">Emocional</span>
            </div>
        `;
    }

    /**
     * Renderizar item individual de review
     */
    function renderReviewItem(trade) {
        const review = trade.review;
        const isWin = trade.outcome === 'TP';
        const pipsClass = trade.pips >= 0 ? 'positive' : 'negative';
        const pipsDisplay = trade.pips >= 0 ? `+${trade.pips}` : trade.pips;

        const emotionEmojis = {
            confident: '😎',
            neutral: '😐',
            fear: '😰',
            greed: '🤑',
            frustration: '😤',
            revenge: '😡'
        };

        const questionLabels = {
            followedStrategy: 'Siguió estrategia',
            wasFomo: 'FOMO',
            wasEmotional: 'Emocional',
            correctEntry: 'Entry correcto',
            respectedSL: 'Respetó SL',
            movedSLTP: 'Movió SL/TP',
            exitedEarly: 'Salió antes'
        };

        // Generar tags de respuestas
        const answerTags = Object.entries(questionLabels)
            .filter(([key]) => review[key])
            .map(([key, label]) => {
                const value = review[key];
                const isYes = value === 'yes';
                const icon = isYes ? 'check' : 'x';
                return `
                    <span class="review-answer-tag ${isYes ? 'yes' : 'no'}">
                        <i data-lucide="${icon}"></i>
                        ${label}
                    </span>
                `;
            })
            .join('');

        const date = new Date(trade.exitTime).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="review-item">
                <div class="review-item-header">
                    <div class="review-item-info">
                        <span class="review-item-instrument">${trade.instrument}</span>
                        <span class="review-item-badge ${isWin ? 'win' : 'loss'}">${isWin ? 'WIN' : 'LOSS'}</span>
                        <span class="review-item-pips ${pipsClass}">${pipsDisplay} pips</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${review.emotion ? `<span class="review-item-emotion">${emotionEmojis[review.emotion] || ''}</span>` : ''}
                        <span class="review-item-date">${date}</span>
                    </div>
                </div>
                ${answerTags ? `<div class="review-answers">${answerTags}</div>` : ''}
                ${review.notes ? `<div class="review-item-notes">"${review.notes}"</div>` : ''}
            </div>
        `;
    }

    /**
     * Filtrar reviews por outcome y emoción
     */
    function filterReviews() {
        const outcomeFilter = document.getElementById('reviewFilterOutcome')?.value || 'all';
        const emotionFilter = document.getElementById('reviewFilterEmotion')?.value || 'all';

        let filtered = paperTrades.filter(t => t.review);

        if (outcomeFilter !== 'all') {
            filtered = filtered.filter(t => t.outcome === outcomeFilter);
        }

        if (emotionFilter !== 'all') {
            filtered = filtered.filter(t => t.review?.emotion === emotionFilter);
        }

        renderReviews(filtered);
    }

    /**
     * Exportar trades a CSV
     */
    function exportToCSV() {
        if (paperTrades.length === 0) {
            showToast('⚠️ No hay trades para exportar', 'warning');
            return;
        }

        const headers = [
            'ID', 'Fecha Entrada', 'Fecha Salida', 'Instrumento', 'Dirección',
            'Resultado', 'Pips', 'Estrategia', 'Duración',
            'Siguió Estrategia', 'FOMO', 'Emocional', 'Entry Correcto',
            'Respetó SL', 'Movió SL/TP', 'Salió Antes', 'Emoción', 'Notas'
        ];

        const rows = paperTrades.map(trade => {
            const review = trade.review || {};
            return [
                trade.id,
                new Date(trade.entryTime).toLocaleString('es-ES'),
                new Date(trade.exitTime).toLocaleString('es-ES'),
                trade.instrument,
                trade.direction?.toUpperCase(),
                trade.outcome,
                trade.pips,
                trade.strategy || '',
                trade.duration || '',
                review.followedStrategy || '',
                review.wasFomo || '',
                review.wasEmotional || '',
                review.correctEntry || '',
                review.respectedSL || '',
                review.movedSLTP || '',
                review.exitedEarly || '',
                review.emotion || '',
                (review.notes || '').replace(/"/g, '""')
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `paper-trading-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showToast('📊 CSV exportado exitosamente', 'success');
    }

    /**
     * Exportar trades a PDF
     */
    function exportToPDF() {
        if (paperTrades.length === 0) {
            showToast('⚠️ No hay trades para exportar', 'warning');
            return;
        }

        // Calcular estadísticas
        const closedTrades = paperTrades.filter(t => t.status === 'closed');
        const wins = closedTrades.filter(t => t.pips >= 0).length;
        const losses = closedTrades.filter(t => t.pips < 0).length;
        const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : 0;
        const totalPips = closedTrades.reduce((sum, t) => sum + (t.pips || 0), 0);
        const avgPips = closedTrades.length > 0 ? (totalPips / closedTrades.length).toFixed(1) : 0;

        // Estadísticas de reviews
        const tradesWithReview = closedTrades.filter(t => t.review);
        const followedStrategy = tradesWithReview.filter(t => t.review?.followedStrategy === 'yes').length;
        const fomoCount = tradesWithReview.filter(t => t.review?.wasFomo === 'yes').length;
        const emotionalCount = tradesWithReview.filter(t => t.review?.wasEmotional === 'yes').length;

        // Crear contenido HTML para PDF
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Paper Trading Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                    .header h1 { color: #6366f1; font-size: 28px; }
                    .header p { color: #666; margin-top: 5px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px; }
                    .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-box .value { font-size: 24px; font-weight: bold; color: #333; }
                    .stat-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
                    .stat-box.positive .value { color: #10b981; }
                    .stat-box.negative .value { color: #ef4444; }
                    .section { margin-bottom: 25px; }
                    .section h2 { font-size: 16px; color: #6366f1; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    th { background: #f8f9fa; font-weight: 600; color: #374151; }
                    .win { color: #10b981; font-weight: 600; }
                    .loss { color: #ef4444; font-weight: 600; }
                    .review-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                    .review-box { background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; }
                    .review-box .value { font-size: 20px; font-weight: bold; }
                    .review-box .label { font-size: 10px; color: #666; }
                    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Paper Trading Report</h1>
                    <p>Generado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="value">${closedTrades.length}</div>
                        <div class="label">Total Trades</div>
                    </div>
                    <div class="stat-box positive">
                        <div class="value">${wins}</div>
                        <div class="label">Ganados</div>
                    </div>
                    <div class="stat-box negative">
                        <div class="value">${losses}</div>
                        <div class="label">Perdidos</div>
                    </div>
                    <div class="stat-box">
                        <div class="value">${winRate}%</div>
                        <div class="label">Win Rate</div>
                    </div>
                    <div class="stat-box ${totalPips >= 0 ? 'positive' : 'negative'}">
                        <div class="value">${totalPips >= 0 ? '+' : ''}${totalPips}</div>
                        <div class="label">Total Pips</div>
                    </div>
                </div>

                ${tradesWithReview.length > 0 ? `
                <div class="section">
                    <h2>📋 Análisis Psicológico (${tradesWithReview.length} reviews)</h2>
                    <div class="review-section">
                        <div class="review-box">
                            <div class="value" style="color: #10b981;">${tradesWithReview.length > 0 ? Math.round((followedStrategy / tradesWithReview.length) * 100) : 0}%</div>
                            <div class="label">Siguió Estrategia</div>
                        </div>
                        <div class="review-box">
                            <div class="value" style="color: #f59e0b;">${tradesWithReview.length > 0 ? Math.round((fomoCount / tradesWithReview.length) * 100) : 0}%</div>
                            <div class="label">Trades FOMO</div>
                        </div>
                        <div class="review-box">
                            <div class="value" style="color: #ef4444;">${tradesWithReview.length > 0 ? Math.round((emotionalCount / tradesWithReview.length) * 100) : 0}%</div>
                            <div class="label">Emocionales</div>
                        </div>
                        <div class="review-box">
                            <div class="value">${avgPips >= 0 ? '+' : ''}${avgPips}</div>
                            <div class="label">Pips Promedio</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="section">
                    <h2>📈 Historial de Trades</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Instrumento</th>
                                <th>Dirección</th>
                                <th>Resultado</th>
                                <th>Pips</th>
                                <th>Estrategia</th>
                                <th>Emoción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${closedTrades.slice(0, 50).map(trade => {
                                const emotionEmojis = { confident: '😎', neutral: '😐', fear: '😰', greed: '🤑', frustration: '😤', revenge: '😡' };
                                return `
                                <tr>
                                    <td>${new Date(trade.exitTime).toLocaleDateString('es-ES')}</td>
                                    <td><strong>${trade.instrument}</strong></td>
                                    <td>${trade.direction?.toUpperCase()}</td>
                                    <td class="${trade.outcome === 'TP' ? 'win' : 'loss'}">${trade.outcome}</td>
                                    <td class="${trade.pips >= 0 ? 'win' : 'loss'}">${trade.pips >= 0 ? '+' : ''}${trade.pips}</td>
                                    <td>${trade.strategy || '-'}</td>
                                    <td>${trade.review?.emotion ? emotionEmojis[trade.review.emotion] : '-'}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <p>Generado por Trading Journal - Paper Trading Module</p>
                </div>
            </body>
            </html>
        `;

        // Abrir ventana de impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 250);

        showToast('📄 PDF listo para imprimir', 'success');
    }

    // API pública
    return {
        init,
        openTrade,
        closeTrade,
        closeWithCustomPips,
        convertPercentToPips,
        resetPaperTrading,
        exportData,
        exportToCSV,
        exportToPDF,
        filterReviews,
        renderReviews,
        getStats: () => ({
            totalTrades: paperTrades.filter(t => t.status === 'closed').length,
            wins: paperTrades.filter(t => t.status === 'closed' && t.pnl >= 0).length,
            losses: paperTrades.filter(t => t.status === 'closed' && t.pnl < 0).length,
            totalPips: paperTrades.filter(t => t.status === 'closed').reduce((sum, t) => sum + (t.pips || 0), 0)
        })
    };
})();

// Exportar para uso global
window.PaperTrading = PaperTrading;
