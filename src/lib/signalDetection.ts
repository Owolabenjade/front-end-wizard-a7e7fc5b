import { MarketData } from "@/types/trading";

export interface TradeSignal {
  id: string;
  strategy: "ema_bounce" | "macd_cross" | "rsi_reversal" | "bollinger_breakout";
  direction: "long" | "short";
  confidence: "high" | "medium" | "low";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  reason: string;
}

interface SignalConfig {
  profitTarget: number; // Default 8%
  stopLoss: number; // Default 4%
}

const DEFAULT_CONFIG: SignalConfig = {
  profitTarget: 0.08,
  stopLoss: 0.04,
};

/**
 * Detect EMA Bounce signal
 * Long: Price bounces off EMA 21 or 50 with confirmation
 * Short: Price rejected at EMA 21 or 50
 */
function detectEMABounce(data: MarketData, config: SignalConfig): TradeSignal | null {
  const lastIndex = data.candles.length - 1;
  const candle = data.candles[lastIndex];
  const prevCandle = data.candles[lastIndex - 1];
  
  const ema21 = data.ema21[lastIndex];
  const ema50 = data.ema50[lastIndex];
  const ema200 = data.ema200[lastIndex];
  
  if (!ema21 || !ema50 || !ema200) return null;

  const price = candle.close;
  const prevPrice = prevCandle.close;
  
  // Check for EMA 21 bounce (long)
  const touchedEma21 = candle.low <= ema21 * 1.005 && candle.low >= ema21 * 0.995;
  const closedAboveEma21 = price > ema21;
  const priceAboveEma200 = price > ema200; // Trend filter
  const bullishCandle = price > candle.open;
  
  if (touchedEma21 && closedAboveEma21 && priceAboveEma200 && bullishCandle) {
    return {
      id: `ema_bounce_${Date.now()}`,
      strategy: "ema_bounce",
      direction: "long",
      confidence: price > ema50 ? "high" : "medium",
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: price * (1 + config.profitTarget),
      timestamp: new Date(),
      reason: `Price bounced off EMA 21 (${ema21.toFixed(0)}) with bullish close above. Trend support from EMA 200.`,
    };
  }

  // Check for EMA 50 bounce (long)
  const touchedEma50 = candle.low <= ema50 * 1.005 && candle.low >= ema50 * 0.995;
  const closedAboveEma50 = price > ema50;
  
  if (touchedEma50 && closedAboveEma50 && priceAboveEma200 && bullishCandle) {
    return {
      id: `ema_bounce_${Date.now()}`,
      strategy: "ema_bounce",
      direction: "long",
      confidence: "high",
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: price * (1 + config.profitTarget),
      timestamp: new Date(),
      reason: `Price bounced off EMA 50 (${ema50.toFixed(0)}) with bullish confirmation. Strong support level.`,
    };
  }

  // Check for EMA rejection (short)
  const priceBelowEma200 = price < ema200;
  const touchedEma21Resist = candle.high >= ema21 * 0.995 && candle.high <= ema21 * 1.005;
  const closedBelowEma21 = price < ema21;
  const bearishCandle = price < candle.open;
  
  if (touchedEma21Resist && closedBelowEma21 && priceBelowEma200 && bearishCandle) {
    return {
      id: `ema_bounce_${Date.now()}`,
      strategy: "ema_bounce",
      direction: "short",
      confidence: price < ema50 ? "high" : "medium",
      entryPrice: price,
      stopLoss: price * (1 + config.stopLoss),
      takeProfit: price * (1 - config.profitTarget),
      timestamp: new Date(),
      reason: `Price rejected at EMA 21 resistance with bearish close. Downtrend confirmed by EMA 200.`,
    };
  }

  return null;
}

/**
 * Detect MACD Cross signal
 * Long: MACD crosses above signal line
 * Short: MACD crosses below signal line
 */
function detectMACDCross(data: MarketData, config: SignalConfig): TradeSignal | null {
  const lastIndex = data.candles.length - 1;
  const price = data.candles[lastIndex].close;
  
  const currentMACD = data.macd[lastIndex];
  const prevMACD = data.macd[lastIndex - 1];
  const prevPrevMACD = data.macd[lastIndex - 2];
  
  if (!currentMACD || !prevMACD || !prevPrevMACD) return null;

  // Bullish cross: MACD crosses above signal
  const bullishCross = prevMACD.macd <= prevMACD.signal && currentMACD.macd > currentMACD.signal;
  // Confirm with histogram turning positive
  const histogramTurningPositive = currentMACD.histogram > 0 && prevMACD.histogram <= 0;
  
  if (bullishCross || histogramTurningPositive) {
    const confidence = Math.abs(currentMACD.histogram) > Math.abs(prevMACD.histogram) ? "high" : "medium";
    return {
      id: `macd_cross_${Date.now()}`,
      strategy: "macd_cross",
      direction: "long",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: price * (1 + config.profitTarget),
      timestamp: new Date(),
      reason: `MACD line crossed above signal line. Histogram: ${currentMACD.histogram.toFixed(2)} (bullish momentum).`,
    };
  }

  // Bearish cross: MACD crosses below signal
  const bearishCross = prevMACD.macd >= prevMACD.signal && currentMACD.macd < currentMACD.signal;
  const histogramTurningNegative = currentMACD.histogram < 0 && prevMACD.histogram >= 0;
  
  if (bearishCross || histogramTurningNegative) {
    const confidence = Math.abs(currentMACD.histogram) > Math.abs(prevMACD.histogram) ? "high" : "medium";
    return {
      id: `macd_cross_${Date.now()}`,
      strategy: "macd_cross",
      direction: "short",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 + config.stopLoss),
      takeProfit: price * (1 - config.profitTarget),
      timestamp: new Date(),
      reason: `MACD line crossed below signal line. Histogram: ${currentMACD.histogram.toFixed(2)} (bearish momentum).`,
    };
  }

  return null;
}

/**
 * Detect RSI Reversal signal
 * Long: RSI exits oversold (<30) territory
 * Short: RSI exits overbought (>70) territory
 */
function detectRSIReversal(data: MarketData, config: SignalConfig): TradeSignal | null {
  const lastIndex = data.candles.length - 1;
  const price = data.candles[lastIndex].close;
  
  const currentRSI = data.rsi14[lastIndex];
  const prevRSI = data.rsi14[lastIndex - 1];
  const prevPrevRSI = data.rsi14[lastIndex - 2];
  
  if (!currentRSI || !prevRSI || !prevPrevRSI) return null;

  // Bullish reversal: RSI was oversold and now recovering
  const wasOversold = prevRSI < 30 || prevPrevRSI < 30;
  const exitingOversold = currentRSI > 30 && prevRSI <= 30;
  const rsiRising = currentRSI > prevRSI;
  
  if (wasOversold && (exitingOversold || (currentRSI < 40 && rsiRising))) {
    const confidence = currentRSI < 35 ? "high" : "medium";
    return {
      id: `rsi_reversal_${Date.now()}`,
      strategy: "rsi_reversal",
      direction: "long",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: price * (1 + config.profitTarget),
      timestamp: new Date(),
      reason: `RSI exiting oversold territory. Current: ${currentRSI.toFixed(1)}, Previous: ${prevRSI.toFixed(1)}. Potential reversal.`,
    };
  }

  // Bearish reversal: RSI was overbought and now declining
  const wasOverbought = prevRSI > 70 || prevPrevRSI > 70;
  const exitingOverbought = currentRSI < 70 && prevRSI >= 70;
  const rsiFalling = currentRSI < prevRSI;
  
  if (wasOverbought && (exitingOverbought || (currentRSI > 60 && rsiFalling))) {
    const confidence = currentRSI > 65 ? "high" : "medium";
    return {
      id: `rsi_reversal_${Date.now()}`,
      strategy: "rsi_reversal",
      direction: "short",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 + config.stopLoss),
      takeProfit: price * (1 - config.profitTarget),
      timestamp: new Date(),
      reason: `RSI exiting overbought territory. Current: ${currentRSI.toFixed(1)}, Previous: ${prevRSI.toFixed(1)}. Potential reversal.`,
    };
  }

  return null;
}

/**
 * Detect Bollinger Breakout signal
 * Long: Price breaks above upper band with volume
 * Short: Price breaks below lower band
 */
function detectBollingerBreakout(data: MarketData, config: SignalConfig): TradeSignal | null {
  const lastIndex = data.candles.length - 1;
  const candle = data.candles[lastIndex];
  const prevCandle = data.candles[lastIndex - 1];
  const price = candle.close;
  
  const bb = data.bollingerBands[lastIndex];
  const prevBB = data.bollingerBands[lastIndex - 1];
  
  if (!bb || !prevBB) return null;

  // Calculate average volume for comparison
  const recentVolumes = data.candles.slice(-20).map(c => c.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const highVolume = candle.volume > avgVolume * 1.2;

  // Bullish breakout: Close above upper band
  const brokeUpperBand = price > bb.upper && prevCandle.close <= prevBB.upper;
  const nearUpperBand = price > bb.middle && price >= bb.upper * 0.995;
  
  if (brokeUpperBand || (nearUpperBand && highVolume)) {
    const confidence = highVolume ? "high" : "medium";
    return {
      id: `bollinger_breakout_${Date.now()}`,
      strategy: "bollinger_breakout",
      direction: "long",
      confidence,
      entryPrice: price,
      stopLoss: bb.middle, // Middle band as stop
      takeProfit: price * (1 + config.profitTarget),
      timestamp: new Date(),
      reason: `Price breaking above upper Bollinger Band (${bb.upper.toFixed(0)}). ${highVolume ? "High volume confirms breakout." : "Monitor for volume confirmation."}`,
    };
  }

  // Bearish breakout: Close below lower band
  const brokeLowerBand = price < bb.lower && prevCandle.close >= prevBB.lower;
  const nearLowerBand = price < bb.middle && price <= bb.lower * 1.005;
  
  if (brokeLowerBand || (nearLowerBand && highVolume)) {
    const confidence = highVolume ? "high" : "medium";
    return {
      id: `bollinger_breakout_${Date.now()}`,
      strategy: "bollinger_breakout",
      direction: "short",
      confidence,
      entryPrice: price,
      stopLoss: bb.middle, // Middle band as stop
      takeProfit: price * (1 - config.profitTarget),
      timestamp: new Date(),
      reason: `Price breaking below lower Bollinger Band (${bb.lower.toFixed(0)}). ${highVolume ? "High volume confirms breakdown." : "Monitor for continuation."}`,
    };
  }

  // Mean reversion: Price at lower band in uptrend
  const atLowerBand = price <= bb.lower * 1.01;
  const ema200 = data.ema200[lastIndex];
  const inUptrend = ema200 && price > ema200;
  
  if (atLowerBand && inUptrend) {
    return {
      id: `bollinger_breakout_${Date.now()}`,
      strategy: "bollinger_breakout",
      direction: "long",
      confidence: "medium",
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: bb.middle, // Target middle band
      timestamp: new Date(),
      reason: `Price touching lower Bollinger Band in uptrend. Mean reversion opportunity to middle band (${bb.middle.toFixed(0)}).`,
    };
  }

  return null;
}

/**
 * Detect all trading signals from market data
 */
export function detectSignals(data: MarketData, config: SignalConfig = DEFAULT_CONFIG): TradeSignal[] {
  const signals: TradeSignal[] = [];

  const emaBounce = detectEMABounce(data, config);
  if (emaBounce) signals.push(emaBounce);

  const macdCross = detectMACDCross(data, config);
  if (macdCross) signals.push(macdCross);

  const rsiReversal = detectRSIReversal(data, config);
  if (rsiReversal) signals.push(rsiReversal);

  const bollingerBreakout = detectBollingerBreakout(data, config);
  if (bollingerBreakout) signals.push(bollingerBreakout);

  return signals;
}

export function getStrategyColor(strategy: TradeSignal["strategy"]): string {
  switch (strategy) {
    case "ema_bounce":
      return "hsl(142, 76%, 45%)"; // Green
    case "macd_cross":
      return "hsl(217, 91%, 60%)"; // Blue
    case "rsi_reversal":
      return "hsl(38, 92%, 50%)"; // Orange/Gold
    case "bollinger_breakout":
      return "hsl(280, 65%, 60%)"; // Purple
  }
}

export function getStrategyLabel(strategy: TradeSignal["strategy"]): string {
  switch (strategy) {
    case "ema_bounce":
      return "EMA Bounce";
    case "macd_cross":
      return "MACD Cross";
    case "rsi_reversal":
      return "RSI Reversal";
    case "bollinger_breakout":
      return "Bollinger Breakout";
  }
}

export function getStrategyIcon(strategy: TradeSignal["strategy"]): string {
  switch (strategy) {
    case "ema_bounce":
      return "🟢";
    case "macd_cross":
      return "🔵";
    case "rsi_reversal":
      return "🟡";
    case "bollinger_breakout":
      return "🟣";
  }
}
