import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoredSignal } from "@/hooks/useTradeSignals";

interface TelegramResponse {
  success: boolean;
  error?: string;
}

export const useTelegramNotify = () => {
  return useMutation({
    mutationFn: async (signal: StoredSignal): Promise<TelegramResponse> => {
      const { data, error } = await supabase.functions.invoke("telegram-notify", {
        body: {
          type: "signal",
          signal: {
            strategy: signal.strategy,
            direction: signal.direction,
            confidence: signal.confidence,
            entryPrice: signal.entry_price,
            stopLoss: signal.stop_loss,
            takeProfit: signal.take_profit,
            riskReward: signal.risk_reward,
            reason: signal.reason,
            timeframe: signal.timeframe,
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