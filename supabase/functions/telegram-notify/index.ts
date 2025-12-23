import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramRequest {
  type: "signal" | "test" | "status";
  signal?: {
    strategy: string;
    direction: "long" | "short";
    confidence: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: number;
    reason: string;
    timeframe: string;
  };
  message?: string;
}

const formatSignalMessage = (signal: TelegramRequest["signal"]): string => {
  if (!signal) return "";
  
  const directionEmoji = signal.direction === "long" ? "🟢 LONG" : "🔴 SHORT";
  const strategyLabels: Record<string, string> = {
    ema_bounce: "EMA Bounce",
    macd_cross: "MACD Cross",
    rsi_reversal: "RSI Reversal",
    bollinger_breakout: "Bollinger Breakout",
  };

  return `
📊 *BTC Trade Signal*

${directionEmoji}

*Strategy:* ${strategyLabels[signal.strategy] || signal.strategy}
*Confidence:* ${signal.confidence}%
*Timeframe:* ${signal.timeframe}

💰 *Entry:* $${signal.entryPrice.toLocaleString()}
🛑 *Stop Loss:* $${signal.stopLoss.toLocaleString()}
🎯 *Take Profit:* $${signal.takeProfit.toLocaleString()}
📈 *Risk/Reward:* ${signal.riskReward.toFixed(2)}

📝 *Reason:* ${signal.reason}

⏰ ${new Date().toUTCString()}
`.trim();
};

const sendTelegramMessage = async (message: string): Promise<{ success: boolean; error?: string }> => {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.error("Telegram credentials not configured");
    return { success: false, error: "Telegram credentials not configured" };
  }

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
    console.log("Telegram API response:", result);

    if (!result.ok) {
      return { success: false, error: result.description || "Failed to send message" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return { success: false, error: String(error) };
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, signal, message }: TelegramRequest = await req.json();
    console.log("Received request:", { type, signal, message });

    let telegramMessage: string;

    switch (type) {
      case "signal":
        if (!signal) {
          return new Response(
            JSON.stringify({ success: false, error: "Signal data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        telegramMessage = formatSignalMessage(signal);
        break;

      case "test":
        telegramMessage = `🤖 *BTC Trading Bot*\n\n✅ Connection test successful!\n\nYour bot is ready to receive trade signals.\n\n⏰ ${new Date().toUTCString()}`;
        break;

      case "status":
        telegramMessage = message || "📊 Bot status update";
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid request type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await sendTelegramMessage(telegramMessage);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in telegram-notify function:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
