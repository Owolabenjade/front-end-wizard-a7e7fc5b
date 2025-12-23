import { useMemo } from "react";
import { MarketData } from "@/types/trading";
import { detectSignals, TradeSignal } from "@/lib/signalDetection";

export function useSignalDetection(data: MarketData | undefined) {
  const signals = useMemo(() => {
    if (!data) return [];
    return detectSignals(data);
  }, [data]);

  return {
    signals,
    hasSignals: signals.length > 0,
    longSignals: signals.filter(s => s.direction === "long"),
    shortSignals: signals.filter(s => s.direction === "short"),
    highConfidenceSignals: signals.filter(s => s.confidence === "high"),
  };
}
