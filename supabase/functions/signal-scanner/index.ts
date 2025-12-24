import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded optimal max holding period: 36 candles (36 hours on 1h timeframe)
// This prevents capital from being locked in stagnant trades
const MAX_HOLDING_PERIOD_CANDLES = 36;
const CANDLE_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Optimized strategy parameters
const EMA_BOUNCE_TOLERANCE = 0.015; // 1.5% tolerance (was 0.5%)
const RSI_OVERSOLD = 25; // BTC-optimized (was 30)
const RSI_OVERBOUGHT = 75; // BTC-optimized (was 70)
const VOLUME_MULTIPLIER = 1.5; // Volume must be 1.5x average for confirmation
const VOLUME_PERIOD = 20; // Look back 20 candles for average volume

interface Candle {
  time: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

interface StrategySignal {
  strategy: "ema_bounce" | "macd_cross" | "rsi_reversal" | "bollinger_breakout";
  direction: "long" | "short";
  reason: string;
}

interface SignalResult {
  strategy: "ema_bounce" | "macd_cross" | "rsi_reversal" | "bollinger_breakout";
  direction: "long" | "short";
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  reason: string;
  confluenceLevel: "strong" | "confluence";
  alignedStrategies: string[];
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
    
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
  }
  
  return rsi;
}

// Calculate MACD
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number }[] {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) {
      macdLine[i] = ema12[i] - ema26[i];
    }
  }
  
  const signalLine = calculateEMA(macdLine.filter(v => v !== undefined), 9);
  const result: { macd: number; signal: number; histogram: number }[] = [];
  
  let signalIndex = 0;
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== undefined) {
      const signal = signalLine[signalIndex] || 0;
      result[i] = {
        macd: macdLine[i],
        signal: signal,
        histogram: macdLine[i] - signal
      };
      signalIndex++;
    }
  }
  
  return result;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number }[] {
  const bands: { upper: number; middle: number; lower: number }[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    bands[i] = {
      upper: mean + (stdDev * std),
      middle: mean,
      lower: mean - (stdDev * std)
    };
  }
  
  return bands;
}

// Calculate average volume for the last N periods
function calculateAverageVolume(candles: Candle[], endIndex: number, period: number = VOLUME_PERIOD): number {
  const startIndex = Math.max(0, endIndex - period);
  const volumeSlice = candles.slice(startIndex, endIndex);
  if (volumeSlice.length === 0) return 0;
  return volumeSlice.reduce((sum, c) => sum + c.volume, 0) / volumeSlice.length;
}

// Check if current volume is significant (above average)
function hasVolumeConfirmation(candles: Candle[], index: number): { confirmed: boolean; ratio: number } {
  const avgVolume = calculateAverageVolume(candles, index, VOLUME_PERIOD);
  const currentVolume = candles[index].volume;
  const ratio = avgVolume > 0 ? currentVolume / avgVolume : 0;
  return {
    confirmed: ratio >= VOLUME_MULTIPLIER,
    ratio
  };
}

// Detect individual strategy signals (for confluence check)
function detectIndividualStrategies(
  candles: Candle[], 
  ema21: number[], 
  ema50: number[], 
  ema200: number[], 
  rsi14: number[], 
  macd: { macd: number; signal: number; histogram: number }[], 
  bollingerBands: { upper: number; middle: number; lower: number }[]
): StrategySignal[] {
  const signals: StrategySignal[] = [];
  const lastIndex = candles.length - 1;
  const candle = candles[lastIndex];
  const prevCandle = candles[lastIndex - 1];
  const price = candle.close;
  
  // Volume confirmation check
  const volumeCheck = hasVolumeConfirmation(candles, lastIndex);
  if (!volumeCheck.confirmed) {
    console.log(`📉 Volume too low (${volumeCheck.ratio.toFixed(2)}x avg) - need ${VOLUME_MULTIPLIER}x for confirmation`);
    return signals; // No signals without volume confirmation
  }
  console.log(`📈 Volume confirmed (${volumeCheck.ratio.toFixed(2)}x avg)`);
  
  // EMA Bounce Detection (with increased tolerance: 1.5%)
  if (ema21[lastIndex] && ema50[lastIndex] && ema200[lastIndex]) {
    const emaTolerance = EMA_BOUNCE_TOLERANCE;
    const touchedEma21 = candle.low <= ema21[lastIndex] * (1 + emaTolerance) && candle.low >= ema21[lastIndex] * (1 - emaTolerance);
    const closedAboveEma21 = price > ema21[lastIndex];
    const priceAboveEma200 = price > ema200[lastIndex];
    const bullishCandle = price > candle.open;
    
    if (touchedEma21 && closedAboveEma21 && priceAboveEma200 && bullishCandle) {
      signals.push({
        strategy: "ema_bounce",
        direction: "long",
        reason: `Price bounced off EMA 21 (${ema21[lastIndex].toFixed(0)}) with bullish close. Trend support from EMA 200. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
    
    // Short: touched EMA from below and closed below with bearish confirmation
    const touchedEma21Short = candle.high >= ema21[lastIndex] * (1 - emaTolerance) && candle.high <= ema21[lastIndex] * (1 + emaTolerance);
    const closedBelowEma21 = price < ema21[lastIndex];
    const priceBelowEma200 = price < ema200[lastIndex];
    const bearishCandle = price < candle.open;
    
    if (touchedEma21Short && closedBelowEma21 && priceBelowEma200 && bearishCandle) {
      signals.push({
        strategy: "ema_bounce",
        direction: "short",
        reason: `Price rejected from EMA 21 (${ema21[lastIndex].toFixed(0)}) with bearish close. Downtrend from EMA 200. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
  }
  
  // MACD Cross Detection (with EMA 200 trend filter)
  if (macd[lastIndex] && macd[lastIndex - 1] && ema200[lastIndex]) {
    const currentMACD = macd[lastIndex];
    const prevMACD = macd[lastIndex - 1];
    
    // Only allow long MACD signals when price is above EMA 200 (bullish trend)
    const inBullishTrend = price > ema200[lastIndex];
    // Only allow short MACD signals when price is below EMA 200 (bearish trend)
    const inBearishTrend = price < ema200[lastIndex];
    
    const bullishCross = prevMACD.macd <= prevMACD.signal && currentMACD.macd > currentMACD.signal;
    if (bullishCross && inBullishTrend) {
      signals.push({
        strategy: "macd_cross",
        direction: "long",
        reason: `MACD bullish cross confirmed by EMA 200 uptrend. Histogram: ${currentMACD.histogram.toFixed(2)}. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    } else if (bullishCross && !inBullishTrend) {
      console.log(`🚫 MACD bullish cross rejected - price below EMA 200 (counter-trend)`);
    }
    
    const bearishCross = prevMACD.macd >= prevMACD.signal && currentMACD.macd < currentMACD.signal;
    if (bearishCross && inBearishTrend) {
      signals.push({
        strategy: "macd_cross",
        direction: "short",
        reason: `MACD bearish cross confirmed by EMA 200 downtrend. Histogram: ${currentMACD.histogram.toFixed(2)}. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    } else if (bearishCross && !inBearishTrend) {
      console.log(`🚫 MACD bearish cross rejected - price above EMA 200 (counter-trend)`);
    }
  }
  
  // RSI Reversal Detection (BTC-optimized thresholds: 25/75)
  if (rsi14[lastIndex] && rsi14[lastIndex - 1]) {
    const currentRSI = rsi14[lastIndex];
    const prevRSI = rsi14[lastIndex - 1];
    
    if (prevRSI < RSI_OVERSOLD && currentRSI > RSI_OVERSOLD) {
      signals.push({
        strategy: "rsi_reversal",
        direction: "long",
        reason: `RSI exiting deep oversold (< ${RSI_OVERSOLD}). Current: ${currentRSI.toFixed(1)}. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
    
    if (prevRSI > RSI_OVERBOUGHT && currentRSI < RSI_OVERBOUGHT) {
      signals.push({
        strategy: "rsi_reversal",
        direction: "short",
        reason: `RSI exiting deep overbought (> ${RSI_OVERBOUGHT}). Current: ${currentRSI.toFixed(1)}. Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
  }
  
  // Bollinger Bands - MEAN REVERSION (flipped logic)
  // Price at upper band = overextended = SHORT opportunity (expect reversion to mean)
  // Price at lower band = oversold = LONG opportunity (expect reversion to mean)
  if (bollingerBands[lastIndex] && bollingerBands[lastIndex - 1] && prevCandle) {
    const bb = bollingerBands[lastIndex];
    const prevBB = bollingerBands[lastIndex - 1];
    
    // Price touching/crossing LOWER band = LONG (mean reversion up)
    if (price < bb.lower && prevCandle.close >= prevBB.lower) {
      signals.push({
        strategy: "bollinger_breakout",
        direction: "long",
        reason: `Price at lower Bollinger Band ($${bb.lower.toFixed(0)}) - mean reversion expected. Target: middle band ($${bb.middle.toFixed(0)}). Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
    
    // Price touching/crossing UPPER band = SHORT (mean reversion down)
    if (price > bb.upper && prevCandle.close <= prevBB.upper) {
      signals.push({
        strategy: "bollinger_breakout",
        direction: "short",
        reason: `Price at upper Bollinger Band ($${bb.upper.toFixed(0)}) - mean reversion expected. Target: middle band ($${bb.middle.toFixed(0)}). Vol: ${volumeCheck.ratio.toFixed(1)}x avg.`
      });
    }
  }
  
  console.log(`Individual signals detected: ${signals.map(s => `${s.strategy}(${s.direction})`).join(", ") || "none"}`);
  
  return signals;
}

// Detect confluence signals (only when 3+ strategies align)
function detectSignals(candles: Candle[], ema21: number[], ema50: number[], ema200: number[], rsi14: number[], macd: { macd: number; signal: number; histogram: number }[], bollingerBands: { upper: number; middle: number; lower: number }[]): SignalResult[] {
  const individualSignals = detectIndividualStrategies(candles, ema21, ema50, ema200, rsi14, macd, bollingerBands);
  
  if (individualSignals.length < 3) {
    console.log(`Only ${individualSignals.length} strategy signal(s) detected - need 3+ for confluence`);
    return [];
  }
  
  // Group signals by direction
  const longSignals = individualSignals.filter(s => s.direction === "long");
  const shortSignals = individualSignals.filter(s => s.direction === "short");
  
  const results: SignalResult[] = [];
  const lastIndex = candles.length - 1;
  const price = candles[lastIndex].close;
  const config = { profitTarget: 0.08, stopLoss: 0.04 };
  
  const strategyLabels: Record<string, string> = {
    ema_bounce: "EMA Bounce",
    macd_cross: "MACD Cross",
    rsi_reversal: "RSI Reversal",
    bollinger_breakout: "BB Mean Reversion", // Updated label
  };
  
  // Check for long confluence (3+ strategies agree on long)
  if (longSignals.length >= 3) {
    const alignedStrategies = longSignals.map(s => strategyLabels[s.strategy]);
    const confluenceLevel = longSignals.length === 4 ? "confluence" : "strong";
    const confidence = longSignals.length === 4 ? 95 : 85;
    
    const combinedReasons = longSignals.map(s => `• ${strategyLabels[s.strategy]}: ${s.reason}`).join("\n");
    
    results.push({
      strategy: longSignals[0].strategy, // Primary strategy (first detected)
      direction: "long",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 - config.stopLoss),
      takeProfit: price * (1 + config.profitTarget),
      riskReward: config.profitTarget / config.stopLoss,
      reason: `🔥 ${confluenceLevel.toUpperCase()} CONFLUENCE (${longSignals.length}/4 strategies aligned LONG)\n${combinedReasons}`,
      confluenceLevel,
      alignedStrategies,
    });
    
    console.log(`✅ LONG confluence detected: ${longSignals.length} strategies aligned - ${alignedStrategies.join(", ")}`);
  }
  
  // Check for short confluence (3+ strategies agree on short)
  if (shortSignals.length >= 3) {
    const alignedStrategies = shortSignals.map(s => strategyLabels[s.strategy]);
    const confluenceLevel = shortSignals.length === 4 ? "confluence" : "strong";
    const confidence = shortSignals.length === 4 ? 95 : 85;
    
    const combinedReasons = shortSignals.map(s => `• ${strategyLabels[s.strategy]}: ${s.reason}`).join("\n");
    
    results.push({
      strategy: shortSignals[0].strategy, // Primary strategy (first detected)
      direction: "short",
      confidence,
      entryPrice: price,
      stopLoss: price * (1 + config.stopLoss),
      takeProfit: price * (1 - config.profitTarget),
      riskReward: config.profitTarget / config.stopLoss,
      reason: `🔥 ${confluenceLevel.toUpperCase()} CONFLUENCE (${shortSignals.length}/4 strategies aligned SHORT)\n${combinedReasons}`,
      confluenceLevel,
      alignedStrategies,
    });
    
    console.log(`✅ SHORT confluence detected: ${shortSignals.length} strategies aligned - ${alignedStrategies.join(", ")}`);
  }
  
  return results;
}

// Send Telegram notification for new confluence signal
async function sendTelegramNotification(signal: SignalResult): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.log("Telegram credentials not configured, skipping notification");
    return false;
  }

  const directionEmoji = signal.direction === "long" ? "🟢 LONG" : "🔴 SHORT";
  const confluenceEmoji = signal.confluenceLevel === "confluence" ? "🔥🔥🔥🔥" : "🔥🔥🔥";
  const confluenceText = signal.confluenceLevel === "confluence" ? "FULL CONFLUENCE (4/4)" : "STRONG CONFLUENCE (3/4)";

  const message = `
${confluenceEmoji} *${confluenceText}*

📊 *BTC Trade Signal*

${directionEmoji}

*Aligned Strategies:* ${signal.alignedStrategies.join(", ")}
*Confidence:* ${signal.confidence}%

💰 *Entry:* $${signal.entryPrice.toLocaleString()}
🛑 *Stop Loss:* $${signal.stopLoss.toLocaleString()}
🎯 *Take Profit:* $${signal.takeProfit.toLocaleString()}
📈 *Risk/Reward:* ${signal.riskReward.toFixed(2)}

⏱️ *Max Hold:* ${MAX_HOLDING_PERIOD_CANDLES} candles (${MAX_HOLDING_PERIOD_CANDLES}h)

📝 *Analysis:*
${signal.reason}

⏰ ${new Date().toUTCString()}
`.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await response.json();
    console.log("Telegram notification sent:", result.ok);
    return result.ok;
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return false;
  }
}


// Send Telegram notification for expired trade
async function sendExpiredTradeNotification(
  direction: string,
  entryPrice: number,
  currentPrice: number,
  pnlPercent: number
): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    return false;
  }

  const isProfit = pnlPercent > 0;
  const pnlEmoji = isProfit ? "✅" : pnlPercent === 0 ? "⚪" : "❌";
  const statusText = isProfit ? "PROFIT" : pnlPercent === 0 ? "BREAKEVEN" : "LOSS";
  const directionEmoji = direction === "long" ? "🟢" : "🔴";

  const message = `
⏱️ *TRADE EXPIRED - EXIT NOW*

${pnlEmoji} *${statusText}*

${directionEmoji} ${direction.toUpperCase()} position timed out after ${MAX_HOLDING_PERIOD_CANDLES} candles.

💰 *Entry:* $${entryPrice.toLocaleString()}
📍 *Current:* $${currentPrice.toLocaleString()}
${isProfit ? "📈" : "📉"} *P&L:* ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%

⚠️ *Action Required:* Close this position manually.

⏰ ${new Date().toUTCString()}
`.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await response.json();
    console.log("Expired trade notification sent:", result.ok);
    return result.ok;
  } catch (error) {
    console.error("Error sending expired trade notification:", error);
    return false;
  }
}

// Send Telegram notification for TP/SL hit
async function sendTPSLHitNotification(
  hitType: "take_profit" | "stop_loss",
  direction: string,
  entryPrice: number,
  hitPrice: number,
  pnlPercent: number,
  strategy: string
): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    return false;
  }

  const isTP = hitType === "take_profit";
  const hitEmoji = isTP ? "🎯" : "🛑";
  const statusEmoji = isTP ? "✅" : "❌";
  const statusText = isTP ? "TAKE PROFIT HIT" : "STOP LOSS HIT";
  const directionEmoji = direction === "long" ? "🟢" : "🔴";
  
  const strategyLabels: Record<string, string> = {
    ema_bounce: "EMA Bounce",
    macd_cross: "MACD Cross",
    rsi_reversal: "RSI Reversal",
    bollinger_breakout: "BB Mean Reversion",
  };

  const message = `
${hitEmoji} *${statusText}*

${statusEmoji} Trade ${isTP ? "WON" : "LOST"}!

${directionEmoji} *Direction:* ${direction.toUpperCase()}
📊 *Strategy:* ${strategyLabels[strategy] || strategy}

💰 *Entry:* $${entryPrice.toLocaleString()}
${hitEmoji} *Exit:* $${hitPrice.toLocaleString()}
${isTP ? "📈" : "📉"} *P&L:* ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%

${isTP ? "🎉 Congratulations!" : "📝 Review the setup for lessons."}

⏰ ${new Date().toUTCString()}
`.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await response.json();
    console.log(`${hitType} notification sent:`, result.ok);
    return result.ok;
  } catch (error) {
    console.error(`Error sending ${hitType} notification:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client early for logging and auth
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Determine scan type from request body or default to cron
  let scanType = "cron";
  let requestBody: { scanType?: string } = {};
  try {
    requestBody = await req.json().catch(() => ({}));
    if (requestBody.scanType === "manual") {
      scanType = "manual";
    }
  } catch {
    // Default to cron if no body
  }

  // For manual scans, require authentication
  if (scanType === "manual") {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.log("Manual scan rejected: No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - authentication required for manual scans" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user token using a client with anon key
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Manual scan rejected: Invalid token", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Manual scan authorized for user: ${user.email}`);
  }

  try {
    console.log(`Signal scanner started (${scanType})...`);
    console.log(`Strategy params: EMA tolerance=${EMA_BOUNCE_TOLERANCE*100}%, RSI=${RSI_OVERSOLD}/${RSI_OVERBOUGHT}, Vol=${VOLUME_MULTIPLIER}x`);
    
    // Fetch market data from Binance
    const interval = "1h";
    const limit = 100;
    const klineUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
    
    const klineResponse = await fetch(klineUrl);
    const klineData = await klineResponse.json();
    
    const candles: Candle[] = klineData.map((k: (string | number)[]) => ({
      time: Number(k[0]),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));
    
    const closePrices = candles.map(c => c.close);
    
    // Calculate indicators
    const ema21 = calculateEMA(closePrices, 21);
    const ema50 = calculateEMA(closePrices, 50);
    const ema200 = calculateEMA(closePrices, 200);
    const rsi14 = calculateRSI(closePrices, 14);
    const macd = calculateMACD(closePrices);
    const bollingerBands = calculateBollingerBands(closePrices, 20, 2);
    
    // Detect signals
    const detectedSignals = detectSignals(candles, ema21, ema50, ema200, rsi14, macd, bollingerBands);
    console.log(`Detected ${detectedSignals.length} confluence signals`);
    
    if (detectedSignals.length === 0) {
      // Log scan with no signals
      await supabase.from("scan_history").insert({
        scan_type: scanType,
        signals_detected: 0,
        signals_saved: 0,
        status: "success",
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No signals detected", 
          signalsDetected: 0,
          signalsSaved: 0,
          scanType 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get current candle data for TP/SL checking
    const currentCandle = candles[candles.length - 1];
    const currentHigh = currentCandle.high;
    const currentLow = currentCandle.low;
    const currentClose = currentCandle.close;
    
    // Check for TP/SL hits on active signals
    const { data: activeSignals, error: activeError } = await supabase
      .from("trade_signals")
      .select("id, entry_price, stop_loss, take_profit, direction, strategy")
      .eq("status", "active");
    
    if (activeSignals && activeSignals.length > 0) {
      console.log(`Checking ${activeSignals.length} active signals for TP/SL hits...`);
      
      for (const signal of activeSignals) {
        const entryPrice = Number(signal.entry_price);
        const stopLoss = Number(signal.stop_loss);
        const takeProfit = Number(signal.take_profit);
        const isLong = signal.direction === "long";
        
        let hitType: "take_profit" | "stop_loss" | null = null;
        let exitPrice = currentClose;
        
        if (isLong) {
          // Long position: TP hit if high >= TP, SL hit if low <= SL
          if (currentHigh >= takeProfit) {
            hitType = "take_profit";
            exitPrice = takeProfit;
          } else if (currentLow <= stopLoss) {
            hitType = "stop_loss";
            exitPrice = stopLoss;
          }
        } else {
          // Short position: TP hit if low <= TP, SL hit if high >= SL
          if (currentLow <= takeProfit) {
            hitType = "take_profit";
            exitPrice = takeProfit;
          } else if (currentHigh >= stopLoss) {
            hitType = "stop_loss";
            exitPrice = stopLoss;
          }
        }
        
        if (hitType) {
          const pnlPercent = isLong
            ? ((exitPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - exitPrice) / entryPrice) * 100;
          
          await supabase
            .from("trade_signals")
            .update({
              status: "triggered",
              triggered_at: new Date().toISOString(),
              closed_at: new Date().toISOString(),
              close_price: exitPrice,
              pnl_percent: pnlPercent,
            })
            .eq("id", signal.id);
          
          // Send TP/SL hit notification
          await sendTPSLHitNotification(
            hitType,
            signal.direction,
            entryPrice,
            exitPrice,
            pnlPercent,
            signal.strategy
          );
          
          console.log(`Signal ${signal.id} ${hitType} hit at $${exitPrice}. P&L: ${pnlPercent.toFixed(2)}%`);
        }
      }
    }
    
    // Expire stale signals that exceeded max holding period (36 candles)
    const maxHoldingMs = MAX_HOLDING_PERIOD_CANDLES * CANDLE_DURATION_MS;
    const expirationCutoff = new Date(Date.now() - maxHoldingMs).toISOString();
    
    const { data: expiredSignals, error: expireQueryError } = await supabase
      .from("trade_signals")
      .select("id, entry_price, direction")
      .eq("status", "active")
      .lt("detected_at", expirationCutoff);
    
    if (expiredSignals && expiredSignals.length > 0) {
      for (const expiredSignal of expiredSignals) {
        const entryPrice = Number(expiredSignal.entry_price);
        const pnlPercent = expiredSignal.direction === "long"
          ? ((currentClose - entryPrice) / entryPrice) * 100
          : ((entryPrice - currentClose) / entryPrice) * 100;
        
        await supabase
          .from("trade_signals")
          .update({
            status: "expired",
            closed_at: new Date().toISOString(),
            close_price: currentClose,
            pnl_percent: pnlPercent,
          })
          .eq("id", expiredSignal.id);
        
        // Send Telegram notification for expired trade
        await sendExpiredTradeNotification(
          expiredSignal.direction,
          entryPrice,
          currentClose,
          pnlPercent
        );
        
        console.log(`Expired signal ${expiredSignal.id} after ${MAX_HOLDING_PERIOD_CANDLES} candles. P&L: ${pnlPercent.toFixed(2)}%`);
      }
      
      console.log(`Expired ${expiredSignals.length} stale signals (max holding: ${MAX_HOLDING_PERIOD_CANDLES} candles)`);
    }
    
    // Check for recent signals to avoid duplicates (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSignals } = await supabase
      .from("trade_signals")
      .select("strategy, direction, entry_price")
      .gte("detected_at", oneHourAgo);
    
    let newSignalsCount = 0;
    let notificationsSent = 0;
    
    for (const signal of detectedSignals) {
      // Check if similar signal already exists
      const isDuplicate = recentSignals?.some(
        existing => 
          existing.strategy === signal.strategy && 
          existing.direction === signal.direction &&
          Math.abs(Number(existing.entry_price) - signal.entryPrice) / signal.entryPrice < 0.01 // Within 1% price
      );
      
      if (isDuplicate) {
        console.log(`Skipping duplicate signal: ${signal.strategy} ${signal.direction}`);
        continue;
      }
      
      // Insert new signal into database
      const { error: insertError } = await supabase
        .from("trade_signals")
        .insert({
          strategy: signal.strategy,
          direction: signal.direction,
          status: "active",
          confidence: signal.confidence,
          entry_price: signal.entryPrice,
          stop_loss: signal.stopLoss,
          take_profit: signal.takeProfit,
          risk_reward: signal.riskReward,
          reason: signal.reason,
          timeframe: interval,
        });
      
      if (insertError) {
        console.error("Error inserting signal:", insertError);
        continue;
      }
      
      newSignalsCount++;
      console.log(`New signal saved: ${signal.strategy} ${signal.direction}`);
      
      // Send Telegram notification
      const notified = await sendTelegramNotification(signal);
      if (notified) {
        notificationsSent++;
      }
    }
    
    console.log(`Scan complete: ${newSignalsCount} new signals, ${notificationsSent} notifications sent`);
    
    // Log successful scan
    await supabase.from("scan_history").insert({
      scan_type: scanType,
      signals_detected: detectedSignals.length,
      signals_saved: newSignalsCount,
      status: "success",
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${detectedSignals.length} signals`,
        signalsDetected: detectedSignals.length,
        signalsSaved: newSignalsCount,
        notificationsSent,
        scanType
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in signal-scanner:", error);
    
    // Log failed scan
    await supabase.from("scan_history").insert({
      scan_type: scanType,
      signals_detected: 0,
      signals_saved: 0,
      status: "error",
      error_message: String(error),
    });
    
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
