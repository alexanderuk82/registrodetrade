// js/config.js - Global Configuration

const CONFIG = {
  app: {
    name: "Trading Journal",
    version: "1.0.0",
    defaultTheme: "dark",
    defaultCurrency: "USD"
  },

  storage: {
    key: "tradingJournal",
    backupLimit: 3
  },

  trading: {
    defaultInitialBalance: 10000,
    timeframes: ["15m", "30m", "1H", "4H", "1D"],

    signals: [
      {value: "order-flow", label: "Order Flow", icon: "activity"},
      {value: "delta-volume", label: "Delta Volume", icon: "bar-chart"},
      {value: "imbalance", label: "Imbalance (FVG)", icon: "layers"},
      {value: "candle-pattern", label: "Patrón Velas", icon: "candle"},
      {value: "rsi", label: "RSI", icon: "trending-up"},
      {value: "ema-cross", label: "Cruce EMAs", icon: "git-merge"},
      {value: "bollinger", label: "Bollinger Bands", icon: "maximize-2"},
      {value: "support-resistance", label: "Soporte/Resistencia", icon: "minus"}
    ],

    pairs: [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "USDCHF",
      "AUDUSD",
      "USDCAD",
      "NZDUSD",
      "XAUUSD"
    ]
  },

  charts: {
    colors: {
      positive: "#4ade80",
      negative: "#f87171",
      neutral: "#9ca3af"
    },

    defaultPeriod: 10, // Last N trades to show
    animationDuration: 1000
  },

  ui: {
    toastDuration: 3000,
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024
  }
}
