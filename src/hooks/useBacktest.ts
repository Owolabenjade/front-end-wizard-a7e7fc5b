import { useState, useCallback } from "react";
import { runBacktest, BacktestResult, BacktestConfig, defaultBacktestConfig } from "@/lib/backtesting";
import { MarketData } from "@/types/trading";

export function useBacktest() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<BacktestConfig>(defaultBacktestConfig);

  const executeBacktest = useCallback((data: MarketData) => {
    setIsRunning(true);
    
    // Run in next tick to allow UI to update
    setTimeout(() => {
      try {
        const backtestResult = runBacktest(data, config);
        setResult(backtestResult);
      } catch (error) {
        console.error("Backtest error:", error);
      } finally {
        setIsRunning(false);
      }
    }, 100);
  }, [config]);

  const updateConfig = useCallback((updates: Partial<BacktestConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultBacktestConfig);
  }, []);

  return {
    result,
    isRunning,
    config,
    executeBacktest,
    updateConfig,
    resetConfig,
  };
}
