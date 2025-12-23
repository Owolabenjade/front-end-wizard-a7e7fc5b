import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TradeSignal } from "@/lib/signalDetection";

interface TelegramResponse {
  success: boolean;
  error?: string;
}

export const useTelegramNotify = () => {
  return useMutation({
    mutationFn: async (signal: TradeSignal): Promise<TelegramResponse> => {
      const { data, error } = await supabase.functions.invoke("telegram-notify", {
        body: {
          type: "signal",
          signal: {
            strategy: signal.strategy,
            direction: signal.direction,
            confidence: signal.confidence === "high" ? 90 : signal.confidence === "medium" ? 70 : 50,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            riskReward: (signal.takeProfit - signal.entryPrice) / (signal.entryPrice - signal.stopLoss),
            reason: signal.reason,
            timeframe: "1h",
          },
        },
      });

      if (error) throw error;
      return data as TelegramResponse;
    },
  });
};

export const useTelegramTest = () => {
  return useMutation({
    mutationFn: async (): Promise<TelegramResponse> => {
      const { data, error } = await supabase.functions.invoke("telegram-notify", {
        body: { type: "test" },
      });

      if (error) throw error;
      return data as TelegramResponse;
    },
  });
};
