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

interface Candle {
  time: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
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

// Detect signals
function detectSignals(candles: Candle[], ema21: number[], ema50: number[], ema200: number[], rsi14: number[], macd: { macd: number; signal: number; histogram: number }[], bollingerBands: { upper: number; middle: number; lower: number }[]): SignalResult[] {
  const signals: SignalResult[] = [];
  const lastIndex = candles.length - 1;
  const candle = candles[lastIndex];
  const prevCandle = candles[lastIndex - 1];
  const price = candle.close;
  
  const config = { profitTarget: 0.08, stopLoss: 0.04 };
  
  // EMA Bounce Detection
  if (ema21[lastIndex] && ema50[lastIndex] && ema200[lastIndex]) {
    const touchedEma21 = candle.low <= ema21[lastIndex] * 1.005 && candle.low >= ema21[lastIndex] * 0.995;
    const closedAboveEma21 = price > ema21[lastIndex];
    const priceAboveEma200 = price > ema200[lastIndex];
    const bullishCandle = price > candle.open;
    
    if (touchedEma21 && closedAboveEma21 && priceAboveEma200 && bullishCandle) {
      signals.push({
        strategy: "ema_bounce",
        direction: "long",
        confidence: price > ema50[lastIndex] ? 90 : 70,
        entryPrice: price,
        stopLoss: price * (1 - config.stopLoss),
        takeProfit: price * (1 + config.profitTarget),
        riskReward: config.profitTarget / config.stopLoss,
        reason: `Price bounced off EMA 21 (${ema21[lastIndex].toFixed(0)}) with bullish close. Trend support from EMA 200.`
      });
    }
  }
  
  // MACD Cross Detection
  if (macd[lastIndex] && macd[lastIndex - 1]) {
    const currentMACD = macd[lastIndex];
    const prevMACD = macd[lastIndex - 1];
    
    const bullishCross = prevMACD.macd <= prevMACD.signal && currentMACD.macd > currentMACD.signal;
    if (bullishCross) {
      signals.push({
        strategy: "macd_cross",
        direction: "long",
        confidence: Math.abs(currentMACD.histogram) > Math.abs(prevMACD.histogram) ? 85 : 70,
        entryPrice: price,
        stopLoss: price * (1 - config.stopLoss),
        takeProfit: price * (1 + config.profitTarget),
        riskReward: config.profitTarget / config.stopLoss,
        reason: `MACD line crossed above signal line. Histogram: ${currentMACD.histogram.toFixed(2)}`
      });
    }
    
    const bearishCross = prevMACD.macd >= prevMACD.signal && currentMACD.macd < currentMACD.signal;
    if (bearishCross) {
      signals.push({
        strategy: "macd_cross",
        direction: "short",
        confidence: Math.abs(currentMACD.histogram) > Math.abs(prevMACD.histogram) ? 85 : 70,
        entryPrice: price,
        stopLoss: price * (1 + config.stopLoss),
        takeProfit: price * (1 - config.profitTarget),
        riskReward: config.profitTarget / config.stopLoss,
        reason: `MACD line crossed below signal line. Histogram: ${currentMACD.histogram.toFixed(2)}`
      });
    }
  }
  
  // RSI Reversal Detection
  if (rsi14[lastIndex] && rsi14[lastIndex - 1]) {
    const currentRSI = rsi14[lastIndex];
    const prevRSI = rsi14[lastIndex - 1];
    
    if (prevRSI < 30 && currentRSI > 30) {
      signals.push({
        strategy: "rsi_reversal",
        direction: "long",
        confidence: currentRSI < 35 ? 85 : 70,
        entryPrice: price,
        stopLoss: price * (1 - config.stopLoss),
        takeProfit: price * (1 + config.profitTarget),
        riskReward: config.profitTarget / config.stopLoss,
        reason: `RSI exiting oversold territory. Current: ${currentRSI.toFixed(1)}`
      });
    }
    
    if (prevRSI > 70 && currentRSI < 70) {
      signals.push({
        strategy: "rsi_reversal",
        direction: "short",
        confidence: currentRSI > 65 ? 85 : 70,
        entryPrice: price,
        stopLoss: price * (1 + config.stopLoss),
        takeProfit: price * (1 - config.profitTarget),
        riskReward: config.profitTarget / config.stopLoss,
        reason: `RSI exiting overbought territory. Current: ${currentRSI.toFixed(1)}`
      });
    }
  }
  
  // Bollinger Breakout Detection
  if (bollingerBands[lastIndex] && bollingerBands[lastIndex - 1] && prevCandle) {
    const bb = bollingerBands[lastIndex];
    const prevBB = bollingerBands[lastIndex - 1];
    
    if (price > bb.upper && prevCandle.close <= prevBB.upper) {
      signals.push({
        strategy: "bollinger_breakout",
        direction: "long",
        confidence: 80,
        entryPrice: price,
        stopLoss: bb.middle,
        takeProfit: price * (1 + config.profitTarget),
        riskReward: (price * config.profitTarget) / (price - bb.middle),
        reason: `Price breaking above upper Bollinger Band (${bb.upper.toFixed(0)})`
      });
    }
    
    if (price < bb.lower && prevCandle.close >= prevBB.lower) {
      signals.push({
        strategy: "bollinger_breakout",
        direction: "short",
        confidence: 80,
        entryPrice: price,
        stopLoss: bb.middle,
        takeProfit: price * (1 - config.profitTarget),
        riskReward: (price * config.profitTarget) / (bb.middle - price),
        reason: `Price breaking below lower Bollinger Band (${bb.lower.toFixed(0)})`
      });
    }
  }
  
  return signals;
}

// Send Telegram notification for new signal
async function sendTelegramNotification(signal: SignalResult): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.log("Telegram credentials not configured, skipping notification");
    return false;
  }

  const directionEmoji = signal.direction === "long" ? "🟢 LONG" : "🔴 SHORT";
  const strategyLabels: Record<string, string> = {
    ema_bounce: "EMA Bounce",
    macd_cross: "MACD Cross",
    rsi_reversal: "RSI Reversal",
    bollinger_breakout: "Bollinger Breakout",
  };

  const message = `
📊 *BTC Trade Signal*

${directionEmoji}

*Strategy:* ${strategyLabels[signal.strategy] || signal.strategy}
*Confidence:* ${signal.confidence}%

💰 *Entry:* $${signal.entryPrice.toLocaleString()}
🛑 *Stop Loss:* $${signal.stopLoss.toLocaleString()}
🎯 *Take Profit:* $${signal.takeProfit.toLocaleString()}
📈 *Risk/Reward:* ${signal.riskReward.toFixed(2)}

⏱️ *Max Hold:* ${MAX_HOLDING_PERIOD_CANDLES} candles (${MAX_HOLDING_PERIOD_CANDLES}h)

📝 *Reason:* ${signal.reason}

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
    bollinger_breakout: "Bollinger Breakout",
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

  try {
    console.log("Signal scanner started...");
    
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
    console.log(`Detected ${detectedSignals.length} signals`);
    
    if (detectedSignals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No signals detected", signalsProcessed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${detectedSignals.length} signals`,
        newSignals: newSignalsCount,
        notificationsSent 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in signal-scanner:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
