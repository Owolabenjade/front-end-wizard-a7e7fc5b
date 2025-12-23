import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoredSignal {
  id: string;
  strategy: "ema_bounce" | "macd_cross" | "rsi_reversal" | "bollinger_breakout";
  direction: "long" | "short";
  status: "active" | "triggered" | "expired" | "cancelled";
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  reason: string;
  timeframe: string;
  detected_at: string;
  triggered_at: string | null;
  closed_at: string | null;
  close_price: number | null;
  pnl_percent: number | null;
}

export const useTradeSignals = (limit = 50) => {
  return useQuery({
    queryKey: ["trade-signals", limit],
    queryFn: async (): Promise<StoredSignal[]> => {
      const { data, error } = await supabase
        .from("trade_signals")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        entry_price: Number(row.entry_price),
        stop_loss: Number(row.stop_loss),
        take_profit: Number(row.take_profit),
        risk_reward: Number(row.risk_reward),
        close_price: row.close_price ? Number(row.close_price) : null,
        pnl_percent: row.pnl_percent ? Number(row.pnl_percent) : null,
      }));
    },
    refetchInterval: 30000,
  });
};

export const useSignalStats = () => {
  return useQuery({
    queryKey: ["signal-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_signals")
        .select("status, pnl_percent, direction");

      if (error) throw error;

      const total = data?.length || 0;
      const triggered = data?.filter(s => s.status === "triggered").length || 0;
      const active = data?.filter(s => s.status === "active").length || 0;
      const expired = data?.filter(s => s.status === "expired").length || 0;
      
      const closedWithPnl = data?.filter(s => s.pnl_percent !== null) || [];
      const totalPnl = closedWithPnl.reduce((sum, s) => sum + (Number(s.pnl_percent) || 0), 0);
      const winningTrades = closedWithPnl.filter(s => Number(s.pnl_percent) > 0).length;
      const winRate = closedWithPnl.length > 0 ? (winningTrades / closedWithPnl.length) * 100 : 0;

      const longSignals = data?.filter(s => s.direction === "long").length || 0;
      const shortSignals = data?.filter(s => s.direction === "short").length || 0;

      return {
        total,
        active,
        triggered,
        expired,
        totalPnl,
        winRate,
        longSignals,
        shortSignals,
      };
    },
  });
};
