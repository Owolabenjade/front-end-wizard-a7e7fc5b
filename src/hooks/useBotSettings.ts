import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BotSettings {
  ema_periods: {
    ema8: number;
    ema13: number;
    ema21: number;
    ema50: number;
    ema200: number;
  };
  rsi_settings: {
    period: number;
    overbought: number;
    oversold: number;
  };
  macd_settings: {
    fast: number;
    slow: number;
    signal: number;
  };
  bollinger_settings: {
    period: number;
    stdDev: number;
  };
  risk_settings: {
    stopLossPercent: number;
    takeProfitPercent: number;
    minRiskReward: number;
  };
  enabled_strategies: {
    ema_bounce: boolean;
    macd_cross: boolean;
    rsi_reversal: boolean;
    bollinger_breakout: boolean;
  };
}

interface SettingRow {
  setting_key: string;
  setting_value: Record<string, unknown>;
}

export const useBotSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bot-settings"],
    queryFn: async (): Promise<BotSettings> => {
      const { data, error } = await supabase
        .from("bot_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsMap: Record<string, unknown> = {};
      (data as SettingRow[]).forEach((row) => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      return {
        ema_periods: settingsMap.ema_periods as BotSettings["ema_periods"],
        rsi_settings: settingsMap.rsi_settings as BotSettings["rsi_settings"],
        macd_settings: settingsMap.macd_settings as BotSettings["macd_settings"],
        bollinger_settings: settingsMap.bollinger_settings as BotSettings["bollinger_settings"],
        risk_settings: settingsMap.risk_settings as BotSettings["risk_settings"],
        enabled_strategies: settingsMap.enabled_strategies as BotSettings["enabled_strategies"],
      };
    },
  });

  return query;
};
