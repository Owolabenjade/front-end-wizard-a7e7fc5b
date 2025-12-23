import { MarketData, Candle } from "@/types/trading";

export interface BacktestTrade {
  id: string;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  direction: "long" | "short";
  strategy: string;
  pnlPercent: number;
  pnlAmount: number;
  exitReason: "take_profit" | "stop_loss" | "timeout";
}

export interface BacktestResult {
  trades: BacktestTrade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnlPercent: number;
  averagePnlPercent: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  finalBalance: number;
}

export interface BacktestConfig {
  initialBalance: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  enabledStrategies: {
    ema_bounce: boolean;
    macd_cross: boolean;
    rsi_reversal: boolean;
    bollinger_breakout: boolean;
  };
  rsiOversold: number;
  rsiOverbought: number;
  maxHoldingPeriod: number; // in candles
}

const DEFAULT_CONFIG: BacktestConfig = {
  initialBalance: 10000,
  stopLossPercent: 2,
  takeProfitPercent: 4,
  enabledStrategies: {
    ema_bounce: true,
    macd_cross: true,
    rsi_reversal: true,
    bollinger_breakout: true,
  },
  rsiOversold: 30,
  rsiOverbought: 70,
  maxHoldingPeriod: 24, // 24 candles
};

function detectSignalAtIndex(
  data: MarketData,
  index: number,
  config: BacktestConfig
): { strategy: string; direction: "long" | "short" } | null {
  if (index < 3) return null;

  const candle = data.candles[index];
  const prevCandle = data.candles[index - 1];
  const price = candle.close;

  // EMA Bounce Detection
  if (config.enabledStrategies.ema_bounce) {
    const ema21 = data.ema21[index];
    const ema50 = data.ema50[index];
    const ema200 = data.ema200[index];

    if (ema21 && ema50 && ema200) {
      const touchedEma21 = candle.low <= ema21 * 1.005 && candle.low >= ema21 * 0.995;
      const closedAboveEma21 = price > ema21;
      const priceAboveEma200 = price > ema200;
      const bullishCandle = price > candle.open;

      if (touchedEma21 && closedAboveEma21 && priceAboveEma200 && bullishCandle) {
        return { strategy: "ema_bounce", direction: "long" };
      }

      const priceBelowEma200 = price < ema200;
      const touchedEma21Resist = candle.high >= ema21 * 0.995 && candle.high <= ema21 * 1.005;
      const closedBelowEma21 = price < ema21;
      const bearishCandle = price < candle.open;

      if (touchedEma21Resist && closedBelowEma21 && priceBelowEma200 && bearishCandle) {
        return { strategy: "ema_bounce", direction: "short" };
      }
    }
  }

  // MACD Cross Detection
  if (config.enabledStrategies.macd_cross) {
    const currentMACD = data.macd[index];
    const prevMACD = data.macd[index - 1];

    if (currentMACD && prevMACD) {
      const bullishCross = prevMACD.macd <= prevMACD.signal && currentMACD.macd > currentMACD.signal;
      if (bullishCross) {
        return { strategy: "macd_cross", direction: "long" };
      }

      const bearishCross = prevMACD.macd >= prevMACD.signal && currentMACD.macd < currentMACD.signal;
      if (bearishCross) {
        return { strategy: "macd_cross", direction: "short" };
      }
    }
  }

  // RSI Reversal Detection
  if (config.enabledStrategies.rsi_reversal) {
    const currentRSI = data.rsi14[index];
    const prevRSI = data.rsi14[index - 1];

    if (currentRSI && prevRSI) {
      const exitingOversold = currentRSI > config.rsiOversold && prevRSI <= config.rsiOversold;
      if (exitingOversold) {
        return { strategy: "rsi_reversal", direction: "long" };
      }

      const exitingOverbought = currentRSI < config.rsiOverbought && prevRSI >= config.rsiOverbought;
      if (exitingOverbought) {
        return { strategy: "rsi_reversal", direction: "short" };
      }
    }
  }

  // Bollinger Breakout Detection
  if (config.enabledStrategies.bollinger_breakout) {
    const bb = data.bollingerBands[index];
    const prevBB = data.bollingerBands[index - 1];

    if (bb && prevBB) {
      const brokeUpperBand = price > bb.upper && prevCandle.close <= prevBB.upper;
      if (brokeUpperBand) {
        return { strategy: "bollinger_breakout", direction: "long" };
      }

      const brokeLowerBand = price < bb.lower && prevCandle.close >= prevBB.lower;
      if (brokeLowerBand) {
        return { strategy: "bollinger_breakout", direction: "short" };
      }
    }
  }

  return null;
}

function simulateTrade(
  data: MarketData,
  entryIndex: number,
  direction: "long" | "short",
  strategy: string,
  config: BacktestConfig
): BacktestTrade | null {
  const entryCandle = data.candles[entryIndex];
  const entryPrice = entryCandle.close;
  const stopLoss = direction === "long"
    ? entryPrice * (1 - config.stopLossPercent / 100)
    : entryPrice * (1 + config.stopLossPercent / 100);
  const takeProfit = direction === "long"
    ? entryPrice * (1 + config.takeProfitPercent / 100)
    : entryPrice * (1 - config.takeProfitPercent / 100);

  // Simulate candle by candle
  for (let i = entryIndex + 1; i < data.candles.length; i++) {
    const candle = data.candles[i];
    const holdingPeriod = i - entryIndex;

    // Check stop loss hit
    if (direction === "long" && candle.low <= stopLoss) {
      const pnlPercent = ((stopLoss - entryPrice) / entryPrice) * 100;
      return {
        id: `trade_${entryIndex}`,
        entryTime: new Date(entryCandle.time),
        exitTime: new Date(candle.time),
        entryPrice,
        exitPrice: stopLoss,
        direction,
        strategy,
        pnlPercent,
        pnlAmount: (config.initialBalance * pnlPercent) / 100,
        exitReason: "stop_loss",
      };
    }

    if (direction === "short" && candle.high >= stopLoss) {
      const pnlPercent = ((entryPrice - stopLoss) / entryPrice) * 100;
      return {
        id: `trade_${entryIndex}`,
        entryTime: new Date(entryCandle.time),
        exitTime: new Date(candle.time),
        entryPrice,
        exitPrice: stopLoss,
        direction,
        strategy,
        pnlPercent,
        pnlAmount: (config.initialBalance * pnlPercent) / 100,
        exitReason: "stop_loss",
      };
    }

    // Check take profit hit
    if (direction === "long" && candle.high >= takeProfit) {
      const pnlPercent = ((takeProfit - entryPrice) / entryPrice) * 100;
      return {
        id: `trade_${entryIndex}`,
        entryTime: new Date(entryCandle.time),
        exitTime: new Date(candle.time),
        entryPrice,
        exitPrice: takeProfit,
        direction,
        strategy,
        pnlPercent,
        pnlAmount: (config.initialBalance * pnlPercent) / 100,
        exitReason: "take_profit",
      };
    }

    if (direction === "short" && candle.low <= takeProfit) {
      const pnlPercent = ((entryPrice - takeProfit) / entryPrice) * 100;
      return {
        id: `trade_${entryIndex}`,
        entryTime: new Date(entryCandle.time),
        exitTime: new Date(candle.time),
        entryPrice,
        exitPrice: takeProfit,
        direction,
        strategy,
        pnlPercent,
        pnlAmount: (config.initialBalance * pnlPercent) / 100,
        exitReason: "take_profit",
      };
    }

    // Check timeout
    if (holdingPeriod >= config.maxHoldingPeriod) {
      const exitPrice = candle.close;
      const pnlPercent = direction === "long"
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;
      return {
        id: `trade_${entryIndex}`,
        entryTime: new Date(entryCandle.time),
        exitTime: new Date(candle.time),
        entryPrice,
        exitPrice,
        direction,
        strategy,
        pnlPercent,
        pnlAmount: (config.initialBalance * pnlPercent) / 100,
        exitReason: "timeout",
      };
    }
  }

  return null;
}

export function runBacktest(
  data: MarketData,
  config: BacktestConfig = DEFAULT_CONFIG
): BacktestResult {
  const trades: BacktestTrade[] = [];
  let currentIndex = 50; // Start after enough data for indicators
  let balance = config.initialBalance;
  let peak = balance;
  let maxDrawdown = 0;
  const returns: number[] = [];

  while (currentIndex < data.candles.length - config.maxHoldingPeriod) {
    const signal = detectSignalAtIndex(data, currentIndex, config);

    if (signal) {
      const trade = simulateTrade(data, currentIndex, signal.direction, signal.strategy, config);

      if (trade) {
        trades.push(trade);
        balance += trade.pnlAmount;
        returns.push(trade.pnlPercent);

        // Track drawdown
        if (balance > peak) {
          peak = balance;
        }
        const drawdown = ((peak - balance) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        // Move to after trade exit
        const exitIndex = data.candles.findIndex(
          (c) => c.time >= trade.exitTime.getTime()
        );
        if (exitIndex > currentIndex) {
          currentIndex = exitIndex;
        }
      }
    }

    currentIndex++;
  }

  const winningTrades = trades.filter((t) => t.pnlPercent > 0);
  const losingTrades = trades.filter((t) => t.pnlPercent <= 0);
  const totalPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0));

  // Calculate Sharpe Ratio (simplified)
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 0
    ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    : 0;
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    trades,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    totalPnlPercent,
    averagePnlPercent: trades.length > 0 ? totalPnlPercent / trades.length : 0,
    maxDrawdown,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    sharpeRatio,
    startDate: data.candles.length > 0 ? new Date(data.candles[0].time) : new Date(),
    endDate: data.candles.length > 0 ? new Date(data.candles[data.candles.length - 1].time) : new Date(),
    initialBalance: config.initialBalance,
    finalBalance: balance,
  };
}

export { DEFAULT_CONFIG as defaultBacktestConfig };
