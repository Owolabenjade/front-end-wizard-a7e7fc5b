import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignalInput {
  strategy: "ema_bounce" | "macd_cross" | "rsi_reversal" | "bollinger_breakout";
  direction: "long" | "short";
  confidence: "high" | "medium" | "low";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  timeframe: string;
}

// Send Telegram notification
async function sendTelegramNotification(signal: SignalInput, riskReward: number): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.log("Telegram credentials not configured");
    return false;
  }

  const directionEmoji = signal.direction === "long" ? "🟢 LONG" : "🔴 SHORT";
  const confidenceValue = signal.confidence === "high" ? 90 : signal.confidence === "medium" ? 70 : 50;
  const strategyLabels: Record<string, string> = {
    ema_bounce: "EMA Bounce",
    macd_cross: "MACD Cross",
    rsi_reversal: "RSI Reversal",
    bollinger_breakout: "Bollinger Breakout",
  };

  const message = `
📊 *BTC Trade Signal* (Live Detection)

${directionEmoji}

*Strategy:* ${strategyLabels[signal.strategy] || signal.strategy}
*Confidence:* ${confidenceValue}%

💰 *Entry:* $${signal.entryPrice.toLocaleString()}
🛑 *Stop Loss:* $${signal.stopLoss.toLocaleString()}
🎯 *Take Profit:* $${signal.takeProfit.toLocaleString()}
📈 *Risk/Reward:* ${riskReward.toFixed(2)}

⏱️ *Max Hold:* 36 candles (36h)

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal } = await req.json() as { signal: SignalInput };
    
    if (!signal) {
      return new Response(
        JSON.stringify({ success: false, error: "No signal provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received signal: ${signal.strategy} ${signal.direction} at $${signal.entryPrice}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate signals (same strategy, direction, and similar price within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentSignals } = await supabase
      .from("trade_signals")
      .select("id, entry_price")
      .eq("strategy", signal.strategy)
      .eq("direction", signal.direction)
      .gte("detected_at", twoHoursAgo);

    const isDuplicate = recentSignals?.some(
      existing => Math.abs(Number(existing.entry_price) - signal.entryPrice) / signal.entryPrice < 0.005 // Within 0.5%
    );

    if (isDuplicate) {
      console.log("Duplicate signal detected, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate signal, already recorded", duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate risk/reward
    const riskReward = Math.abs(signal.takeProfit - signal.entryPrice) / Math.abs(signal.entryPrice - signal.stopLoss);
    const confidenceValue = signal.confidence === "high" ? 90 : signal.confidence === "medium" ? 70 : 50;

    // Insert signal into database
    const { error: insertError } = await supabase
      .from("trade_signals")
      .insert({
        strategy: signal.strategy,
        direction: signal.direction,
        status: "active",
        confidence: confidenceValue,
        entry_price: signal.entryPrice,
        stop_loss: signal.stopLoss,
        take_profit: signal.takeProfit,
        risk_reward: riskReward,
        reason: signal.reason,
        timeframe: signal.timeframe || "1h",
      });

    if (insertError) {
      console.error("Error inserting signal:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signal saved to database");

    // Send Telegram notification
    const notified = await sendTelegramNotification(signal, riskReward);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Signal saved and notified",
        notified 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in submit-signal:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});