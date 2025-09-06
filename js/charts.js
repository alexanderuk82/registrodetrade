// js/charts.js - Enhanced Charts Manager with Chart.js

class ChartsManager {
    constructor() {
        this.chart = null;
        this.currentFilter = 'all';
        this.currentView = 'bar';
        this.trades = [];
        this.chartColors = {
            profit: '#4ade80',
            loss: '#f87171',
            neutral: '#9ca3af',
            grid: 'rgba(156, 163, 175, 0.1)',
            text: '#e2e8f0'
        };
    }

    init() {
        this.setupEventListeners();
        this.updateChartColors();
        
        // Add resize listener for responsive charts
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.chart) {
                    this.updateChart();
                }
            }, 250);
        });
        
        // Wait for Chart.js to be available
        this.waitForChartJS();
    }
    
    waitForChartJS(attempts = 0) {
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js loaded successfully');
            // Initial chart update if we have data
            if (app.modules.storage && app.modules.storage.getAllTrades().length > 0) {
                this.updateChart();
            }
        } else if (attempts < 10) {
            // Retry after 100ms, max 10 attempts (1 second total)
            setTimeout(() => {
                this.waitForChartJS(attempts + 1);
            }, 100);
        } else {
            console.warn('Chart.js failed to load after 1 second');
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.filter-btn');
                if (target) {
                    this.setFilter(target.dataset.filter);
                    // Auto-scroll to show active button on mobile
                    if (window.innerWidth <= 768) {
                        this.scrollToActiveButton(target);
                    }
                }
            });
        });

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.view-btn');
                if (target) {
                    this.setView(target.dataset.view);
                }
            });
        });
        
        // Custom range apply button
        const applyBtn = document.getElementById('applyCustomRange');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyCustomRange();
            });
        }

        // Theme change listener
        const observer = new MutationObserver(() => {
            this.updateChartColors();
            if (this.chart) {
                this.updateChart();
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    updateChartColors() {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            this.chartColors = {
                profit: '#4ade80',
                loss: '#ef4444',
                neutral: '#6b7280',
                grid: 'rgba(156, 163, 175, 0.1)',
                text: '#e2e8f0',
                background: 'rgba(0, 0, 0, 0.5)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
            };
        } else {
            this.chartColors = {
                profit: '#10b981',
                loss: '#ef4444',
                neutral: '#9ca3af',
                grid: 'rgba(156, 163, 175, 0.2)',
                text: '#1f2937',
                background: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(0, 0, 0, 0.1)'
            };
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Show/hide custom date range
        const customRange = document.getElementById('customDateRange');
        if (customRange) {
            customRange.style.display = filter === 'custom' ? 'flex' : 'none';
        }

        if (filter !== 'custom') {
            this.updateChart();
        }
    }

    setView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.updateChart();
    }

    applyCustomRange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (startDate && endDate) {
            this.updateChart(new Date(startDate), new Date(endDate));
        }
    }

    updateChart(startDate = null, endDate = null) {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available yet');
            return;
        }
        
        if (!app.modules.storage) return;

        // Get trades from storage
        this.trades = app.modules.storage.getAllTrades();
        
        if (this.trades.length === 0) {
            this.showEmptyState();
            return;
        }

        // Filter trades based on selected filter
        const filteredData = this.filterTrades(this.trades, startDate, endDate);
        
        // Prepare chart data
        const chartData = this.prepareChartData(filteredData);
        
        // Create or update chart
        this.renderChart(chartData);
        
        // Update stats
        this.updateChartStats(filteredData);
    }

    filterTrades(trades, startDate, endDate) {
        const now = new Date();
        let filtered = [...trades];

        // Sort by date
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        switch (this.currentFilter) {
            case 'daily':
                // Last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filtered = filtered.filter(t => new Date(t.date) >= thirtyDaysAgo);
                break;
                
            case 'weekly':
                // Last 12 weeks
                const twelveWeeksAgo = new Date();
                twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
                filtered = filtered.filter(t => new Date(t.date) >= twelveWeeksAgo);
                break;
                
            case 'monthly':
                // Last 12 months
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                filtered = filtered.filter(t => new Date(t.date) >= twelveMonthsAgo);
                break;
                
            case 'custom':
                if (startDate && endDate) {
                    filtered = filtered.filter(t => {
                        const tradeDate = new Date(t.date);
                        return tradeDate >= startDate && tradeDate <= endDate;
                    });
                }
                break;
                
            case 'all':
            default:
                // Show last 50 trades max for performance
                filtered = filtered.slice(-50);
                break;
        }

        return filtered;
    }

    prepareChartData(trades) {
        if (this.currentFilter === 'monthly') {
            return this.aggregateMonthlyData(trades);
        } else if (this.currentFilter === 'weekly') {
            return this.aggregateWeeklyData(trades);
        } else {
            return this.prepareIndividualTrades(trades);
        }
    }

    prepareIndividualTrades(trades) {
        const labels = [];
        const data = [];
        const backgroundColor = [];
        const borderColor = [];

        trades.forEach(trade => {
            const date = new Date(trade.date);
            labels.push(date.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short' 
            }));
            data.push(trade.pnl);
            
            const isProfit = trade.pnl >= 0;
            backgroundColor.push(isProfit ? 
                this.chartColors.profit + '80' : 
                this.chartColors.loss + '80'
            );
            borderColor.push(isProfit ? 
                this.chartColors.profit : 
                this.chartColors.loss
            );
        });

        return { labels, data, backgroundColor, borderColor };
    }

    aggregateWeeklyData(trades) {
        const weeklyData = {};
        
        trades.forEach(trade => {
            const date = new Date(trade.date);
            const weekKey = this.getWeekKey(date);
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    profit: 0,
                    loss: 0,
                    total: 0,
                    count: 0
                };
            }
            
            weeklyData[weekKey].total += trade.pnl;
            weeklyData[weekKey].count++;
            
            if (trade.pnl > 0) {
                weeklyData[weekKey].profit += trade.pnl;
            } else {
                weeklyData[weekKey].loss += Math.abs(trade.pnl);
            }
        });

        const labels = Object.keys(weeklyData);
        const data = labels.map(key => weeklyData[key].total);
        const backgroundColor = data.map(value => 
            value >= 0 ? this.chartColors.profit + '80' : this.chartColors.loss + '80'
        );
        const borderColor = data.map(value => 
            value >= 0 ? this.chartColors.profit : this.chartColors.loss
        );

        return { labels, data, backgroundColor, borderColor };
    }

    aggregateMonthlyData(trades) {
        const monthlyData = {};
        
        trades.forEach(trade => {
            const date = new Date(trade.date);
            const monthKey = date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'short' 
            });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    profit: 0,
                    loss: 0,
                    total: 0,
                    count: 0
                };
            }
            
            monthlyData[monthKey].total += trade.pnl;
            monthlyData[monthKey].count++;
            
            if (trade.pnl > 0) {
                monthlyData[monthKey].profit += trade.pnl;
            } else {
                monthlyData[monthKey].loss += Math.abs(trade.pnl);
            }
        });

        const labels = Object.keys(monthlyData);
        const data = labels.map(key => monthlyData[key].total);
        const backgroundColor = data.map(value => 
            value >= 0 ? this.chartColors.profit + '80' : this.chartColors.loss + '80'
        );
        const borderColor = data.map(value => 
            value >= 0 ? this.chartColors.profit : this.chartColors.loss
        );

        return { labels, data, backgroundColor, borderColor };
    }

    renderChart(chartData) {
        const canvas = document.getElementById('profitChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Configurar canvas para responsive
        const container = canvas.parentElement;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Chart configuration
        const config = {
            type: this.currentView,
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'P&L',
                    data: chartData.data,
                    backgroundColor: chartData.backgroundColor,
                    borderColor: chartData.borderColor,
                    borderWidth: 2,
                    borderRadius: this.currentView === 'bar' ? 6 : 0,
                    tension: this.currentView === 'line' ? 0.4 : 0,
                    fill: this.currentView === 'line' ? {
                        target: 'origin',
                        above: this.chartColors.profit + '20',
                        below: this.chartColors.loss + '20'
                    } : false,
                    pointRadius: this.currentView === 'line' ? 4 : 0,
                    pointHoverRadius: this.currentView === 'line' ? 6 : 0,
                    pointBackgroundColor: this.chartColors.profit,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: window.innerWidth < 768 ? 1.5 : 2.5,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: this.chartColors.background,
                        titleColor: this.chartColors.text,
                        bodyColor: this.chartColors.text,
                        borderColor: this.chartColors.borderColor,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const prefix = value >= 0 ? '+' : '';
                                return `P&L: ${prefix}£${value.toFixed(2)}`;
                            },
                            afterLabel: (context) => {
                                if (this.currentFilter === 'weekly' || this.currentFilter === 'monthly') {
                                    const trades = this.trades.filter(t => {
                                        const date = new Date(t.date);
                                        if (this.currentFilter === 'weekly') {
                                            return this.getWeekKey(date) === context.label;
                                        } else {
                                            return date.toLocaleDateString('es-ES', { 
                                                year: 'numeric', 
                                                month: 'short' 
                                            }) === context.label;
                                        }
                                    });
                                    return `Trades: ${trades.length}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.chartColors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.chartColors.text,
                            font: {
                                size: window.innerWidth < 768 ? 9 : 11
                            },
                            maxRotation: window.innerWidth < 768 ? 90 : 45,
                            minRotation: window.innerWidth < 768 ? 45 : 0,
                            autoSkip: true,
                            maxTicksLimit: window.innerWidth < 768 ? 8 : 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.chartColors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.chartColors.text,
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '£' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        };

        // Create new chart
        this.chart = new Chart(ctx, config);
    }

    updateChartStats(trades) {
        let totalProfit = 0;
        let totalLoss = 0;
        
        trades.forEach(trade => {
            if (trade.pnl > 0) {
                totalProfit += trade.pnl;
            } else {
                totalLoss += Math.abs(trade.pnl);
            }
        });

        const average = trades.length > 0 ? 
            (totalProfit - totalLoss) / trades.length : 0;

        // Update stats
        this.updateStatElement('chartTotalProfit', totalProfit, true);
        this.updateStatElement('chartTotalLoss', totalLoss, false);
        this.updateStatElement('chartAverage', average, average >= 0);
    }

    updateStatElement(id, value, isPositive = null) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = `£${Math.abs(value).toFixed(2)}`;
            if (isPositive !== null) {
                element.className = `value ${isPositive ? 'positive' : 'negative'}`;
            }
        }
    }

    showEmptyState() {
        const canvas = document.getElementById('profitChart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = window.innerWidth < 768 ? 200 : 300;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = this.chartColors.text || '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No hay trades para mostrar', canvas.width / 2, canvas.height / 2);
    }

    getWeekKey(date) {
        const weekNumber = this.getWeekNumber(date);
        const year = date.getFullYear();
        return `Sem ${weekNumber}, ${year}`;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    handleResize() {
        if (this.chart) {
            this.chart.resize();
        }
    }
    
    scrollToActiveButton(button) {
        const container = button.parentElement;
        if (container && container.classList.contains('chart-filter-buttons')) {
            const buttonRect = button.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollLeft = button.offsetLeft - (containerRect.width / 2) + (buttonRect.width / 2);
            
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    }
}