import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TradeSignal } from "@/lib/signalDetection";
import { toast } from "sonner";

interface SubmitSignalResponse {
  success: boolean;
  message?: string;
  duplicate?: boolean;
  notified?: boolean;
  error?: string;
}

export function useAutoSubmitSignals(signals: TradeSignal[]) {
  // Track which signals we've already submitted to avoid duplicates
  const submittedSignals = useRef<Set<string>>(new Set());

  const createSignalKey = useCallback((signal: TradeSignal) => {
    // Create a unique key based on strategy, direction, and price (rounded)
    return `${signal.strategy}-${signal.direction}-${Math.round(signal.entryPrice)}`;
  }, []);

  const submitSignal = useCallback(async (signal: TradeSignal): Promise<SubmitSignalResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke("submit-signal", {
        body: {
          signal: {
            strategy: signal.strategy,
            direction: signal.direction,
            confidence: signal.confidence,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            reason: signal.reason,
            timeframe: "1h",
          },
        },
      });

      if (error) throw error;
      return data as SubmitSignalResponse;
    } catch (error) {
      console.error("Error submitting signal:", error);
      return { success: false, error: String(error) };
    }
  }, []);

  useEffect(() => {
    // Process each signal
    signals.forEach(async (signal) => {
      const signalKey = createSignalKey(signal);

      // Skip if already submitted in this session
      if (submittedSignals.current.has(signalKey)) {
        return;
      }

      // Mark as submitted immediately to prevent duplicate calls
      submittedSignals.current.add(signalKey);

      // Submit to backend
      const result = await submitSignal(signal);

      if (result.success && !result.duplicate) {
        console.log(`Signal submitted: ${signal.strategy} ${signal.direction}`);
        toast.success(`New ${signal.direction.toUpperCase()} signal detected & saved!`, {
          description: `${signal.strategy.replace("_", " ")} at $${signal.entryPrice.toLocaleString()}`,
        });
      } else if (result.duplicate) {
        console.log(`Signal already exists: ${signal.strategy} ${signal.direction}`);
      } else if (!result.success) {
        console.error("Failed to submit signal:", result.error);
        // Remove from submitted set so it can be retried
        submittedSignals.current.delete(signalKey);
      }
    });
  }, [signals, createSignalKey, submitSignal]);

  // Clean up old signal keys periodically (every 2 hours worth of signals)
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (submittedSignals.current.size > 50) {
        // Keep only the last 20 signal keys
        const keys = Array.from(submittedSignals.current);
        submittedSignals.current = new Set(keys.slice(-20));
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);
}
