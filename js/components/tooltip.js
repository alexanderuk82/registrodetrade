// js/components/tooltip.js - Tooltip Component Mobile-First

class TooltipManager {
    constructor() {
        this.tooltips = new Map();
        this.currentTooltip = null;
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    init() {
        // Create tooltip container if doesn't exist
        if (!document.getElementById('tooltip-container')) {
            const container = document.createElement('div');
            container.id = 'tooltip-container';
            container.className = 'tooltip-container';
            document.body.appendChild(container);
        }

        // Listen for window resize to update mobile status
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.hideTooltip();
        });

        // Hide tooltip on scroll (mobile)
        if (this.isMobile) {
            window.addEventListener('scroll', () => this.hideTooltip(), { passive: true });
        }

        // Hide on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideTooltip();
        });
    }

    // Tooltip definitions for all metrics
    getTooltipContent(metric) {
        const tooltips = {
            // Dashboard Stats
            totalTrades: {
                title: "Total de Trades",
                description: "Número total de operaciones registradas en tu journal.",
                interpretation: "Mayor cantidad = más experiencia trading",
                icon: "📊"
            },
            totalPnL: {
                title: "P&L Total",
                description: "Ganancia o pérdida total de todas tus operaciones.",
                interpretation: "Positivo = ganancias | Negativo = pérdidas",
                icon: "💰"
            },
            winRate: {
                title: "Win Rate",
                description: "Porcentaje de trades ganadores vs total de trades.",
                interpretation: "Objetivo ideal: >50% | Excelente: >60%",
                icon: "🎯"
            },
            avgWin: {
                title: "Ganancia Promedio",
                description: "Promedio de ganancias en trades positivos.",
                interpretation: "Debe ser mayor que pérdida promedio",
                icon: "📈"
            },
            avgLoss: {
                title: "Pérdida Promedio",
                description: "Promedio de pérdidas en trades negativos.",
                interpretation: "Mantener menor que ganancia promedio",
                icon: "📉"
            },
            bestTrade: {
                title: "Mejor Trade",
                description: "Tu operación más rentable hasta ahora.",
                interpretation: "Referencia de tu potencial máximo",
                icon: "🏆"
            },

            // Analytics Advanced Stats
            profitFactor: {
                title: "Profit Factor",
                description: "Ratio entre ganancias totales y pérdidas totales.",
                interpretation: "PF > 1.5 = Bueno | PF > 2.0 = Excelente | PF < 1 = Pérdidas",
                formula: "Ganancias Totales ÷ Pérdidas Totales",
                icon: "⚖️"
            },
            sharpeRatio: {
                title: "Sharpe Ratio",
                description: "Mide el retorno ajustado al riesgo de tu estrategia.",
                interpretation: "SR > 1 = Bueno | SR > 2 = Muy bueno | SR > 3 = Excelente",
                formula: "Retorno Promedio ÷ Desviación Estándar",
                icon: "📐"
            },
            maxDrawdown: {
                title: "Máximo Drawdown",
                description: "Mayor caída porcentual desde un pico de capital.",
                interpretation: "< 10% = Excelente | < 20% = Aceptable | > 30% = Riesgoso",
                formula: "((Peak - Valle) ÷ Peak) × 100",
                icon: "⛰️"
            },
            expectancy: {
                title: "Expectancy (Esperanza)",
                description: "Ganancia promedio esperada por trade.",
                interpretation: "Positivo = Sistema rentable | Negativo = Sistema perdedor",
                formula: "(Win% × Avg Win) - (Loss% × Avg Loss)",
                icon: "🎲"
            },

            // Risk Management
            riskReward: {
                title: "Risk/Reward Ratio",
                description: "Relación entre riesgo asumido y ganancia potencial.",
                interpretation: "Mínimo 1:2 | Ideal 1:3 o mayor",
                icon: "⚡"
            },
            
            // Position Sizing
            positionSize: {
                title: "Tamaño de Posición",
                description: "Cantidad de lotes/contratos según tu gestión de riesgo.",
                interpretation: "Nunca arriesgar más del 1-2% por trade",
                icon: "📏"
            },

            // Trading Sessions
            londonSession: {
                title: "Sesión Londres",
                description: "Horario de mayor liquidez para pares EUR/GBP.",
                interpretation: "8:00-17:00 GMT | Alta volatilidad",
                icon: "🇬🇧"
            },
            newYorkSession: {
                title: "Sesión Nueva York", 
                description: "Horario de mayor liquidez para pares USD.",
                interpretation: "13:00-22:00 GMT | Máxima liquidez con Londres",
                icon: "🇺🇸"
            },
            tokyoSession: {
                title: "Sesión Tokio",
                description: "Horario de trading asiático, pares JPY/AUD.",
                interpretation: "00:00-09:00 GMT | Menor volatilidad",
                icon: "🇯🇵"
            },

            // Calendar Performance
            dailyPerformance: {
                title: "Rendimiento Diario",
                description: "Visualización de tus resultados día a día.",
                interpretation: "Verde = Ganancias | Rojo = Pérdidas | Gris = Sin trades",
                icon: "📅"
            },

            // Signal Performance
            orderFlow: {
                title: "Order Flow",
                description: "Análisis del flujo de órdenes institucionales.",
                interpretation: "Identifica acumulación/distribución del smart money",
                icon: "🌊"
            },
            indicatorTV: {
                title: "Indicadores TradingView",
                description: "Señales basadas en indicadores técnicos.",
                interpretation: "Confirmación técnica de entrada/salida",
                icon: "📺"
            }
        };

        return tooltips[metric] || {
            title: "Información",
            description: "Métrica de trading",
            interpretation: "Analiza esta métrica para mejorar",
            icon: "ℹ️"
        };
    }

    createTooltipElement(content, targetElement) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-popup';
        
        // Mobile: Full width bottom sheet
        // Desktop: Floating tooltip
        const tooltipHTML = `
            <div class="tooltip-content">
                <div class="tooltip-header">
                    <span class="tooltip-icon">${content.icon}</span>
                    <h4 class="tooltip-title">${content.title}</h4>
                    <button class="tooltip-close" aria-label="Cerrar">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="tooltip-body">
                    <p class="tooltip-description">${content.description}</p>
                    ${content.formula ? `
                        <div class="tooltip-formula">
                            <span class="formula-label">Fórmula:</span>
                            <code>${content.formula}</code>
                        </div>
                    ` : ''}
                    <div class="tooltip-interpretation">
                        <span class="interpretation-label">Interpretación:</span>
                        <p>${content.interpretation}</p>
                    </div>
                </div>
            </div>
        `;

        tooltip.innerHTML = tooltipHTML;
        
        // Position calculation
        this.positionTooltip(tooltip, targetElement);
        
        return tooltip;
    }

    positionTooltip(tooltip, target) {
        if (this.isMobile) {
            // Mobile: Fixed bottom sheet
            tooltip.classList.add('tooltip-mobile');
            return;
        }

        // Desktop: Smart positioning
        const rect = target.getBoundingClientRect();
        const tooltipRect = { width: 320, height: 200 }; // Estimated size
        
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Check boundaries
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal adjustment
        if (left < 10) {
            left = 10;
            tooltip.classList.add('tooltip-left-aligned');
        } else if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
            tooltip.classList.add('tooltip-right-aligned');
        }
        
        // Vertical adjustment - show above if no space below
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = rect.top - tooltipRect.height - 10;
            tooltip.classList.add('tooltip-top');
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    showTooltip(metric, targetElement) {
        // Hide current tooltip if exists
        this.hideTooltip();
        
        const content = this.getTooltipContent(metric);
        const tooltip = this.createTooltipElement(content, targetElement);
        
        // Add to container
        const container = document.getElementById('tooltip-container');
        container.appendChild(tooltip);
        
        // Store reference
        this.currentTooltip = tooltip;
        
        // Add active class for animation
        requestAnimationFrame(() => {
            tooltip.classList.add('active');
            if (this.isMobile) {
                document.body.classList.add('tooltip-open');
            }
        });
        
        // Setup close handlers
        const closeBtn = tooltip.querySelector('.tooltip-close');
        closeBtn?.addEventListener('click', () => this.hideTooltip());
        
        // Click outside to close (desktop)
        if (!this.isMobile) {
            setTimeout(() => {
                document.addEventListener('click', this.handleOutsideClick);
            }, 100);
        }
        
        // Click backdrop to close (mobile)
        if (this.isMobile) {
            tooltip.addEventListener('click', (e) => {
                if (e.target === tooltip) {
                    this.hideTooltip();
                }
            });
        }
        
        // Update icons
        lucide.createIcons();
    }

    handleOutsideClick = (e) => {
        if (this.currentTooltip && !this.currentTooltip.contains(e.target) && 
            !e.target.closest('[data-tooltip]')) {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.classList.remove('active');
            document.body.classList.remove('tooltip-open');
            
            // Remove after animation
            setTimeout(() => {
                this.currentTooltip?.remove();
                this.currentTooltip = null;
            }, 300);
            
            // Remove outside click listener
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    // Add tooltip triggers to elements
    attachTooltips() {
        // Find all elements with data-tooltip attribute
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            // Skip if already attached
            if (element.hasAttribute('data-tooltip-attached')) return;
            
            // Create info icon
            const infoIcon = document.createElement('button');
            infoIcon.className = 'tooltip-trigger';
            infoIcon.innerHTML = '<i data-lucide="info"></i>';
            infoIcon.setAttribute('aria-label', 'Más información');
            
            // Position info icon
            element.style.position = 'relative';
            element.appendChild(infoIcon);
            
            // Add event listeners
            infoIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const metric = element.getAttribute('data-tooltip');
                this.showTooltip(metric, element);
            });
            
            // Mark as attached
            element.setAttribute('data-tooltip-attached', 'true');
        });
        
        // Update Lucide icons
        lucide.createIcons();
    }

    // Initialize on specific containers
    initContainer(container) {
        if (!container) return;
        
        // Wait for DOM updates
        setTimeout(() => {
            this.attachTooltips();
        }, 100);
    }
}

// Initialize tooltip manager
if (typeof window !== 'undefined') {
    window.tooltipManager = new TooltipManager();
}
