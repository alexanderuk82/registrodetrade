class StatsManager {
  calculateStats(trades, settings) {
    const initialBalance = settings.initialBalance || 10000
    let totalPnL = 0
    let wins = 0
    let losses = 0

    trades.forEach(trade => {
      totalPnL += trade.pnl
      if (trade.pnl > 0) wins++
      else if (trade.pnl < 0) losses++
    })

    return {
      totalTrades: trades.length,
      wins,
      losses,
      totalPnL,
      winRate: trades.length > 0 ? wins / trades.length * 100 : 0,
      currentBalance: initialBalance + totalPnL
    }
  }
}
