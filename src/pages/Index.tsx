import { useState, useCallback } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { TimeInterval } from "@/types/trading";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { IndicatorsPanel } from "@/components/dashboard/IndicatorsPanel";
import { EMAIndicators } from "@/components/dashboard/EMAIndicators";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import { EditableSettingsPanel } from "@/components/dashboard/EditableSettingsPanel";
import { TradeHistoryPanel } from "@/components/dashboard/TradeHistoryPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { BacktestPanel } from "@/components/dashboard/BacktestPanel";
import { ScanHistoryPanel } from "@/components/dashboard/ScanHistoryPanel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [interval, setInterval] = useState<TimeInterval>("1h");
  const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useMarketData(interval);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success("Refreshing market data...");
  }, [refetch]);

  const handleIntervalChange = useCallback((newInterval: TimeInterval) => {
    setInterval(newInterval);
  }, []);

  const handleScan = useCallback(async () => {
    try {
      await supabase.functions.invoke('signal-scanner', {
        body: { scanType: 'manual' }
      });
    } catch (error) {
      console.error('Keyboard scan error:', error);
    }
  }, []);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onRefresh: handleRefresh,
    onIntervalChange: handleIntervalChange,
    onScan: handleScan,
  });

  // Show skeleton during initial load
  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <DashboardHeader 
            onRefresh={handleRefresh} 
            isRefetching={isRefetching} 
            lastUpdated={null}
          />
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Failed to load market data
              </p>
              <button
                onClick={handleRefresh}
                className="text-primary hover:underline min-h-[44px] min-w-[44px] px-4"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <DashboardHeader 
          onRefresh={handleRefresh} 
          isRefetching={isRefetching} 
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        />

        {/* Price Ticker */}
        <PriceTicker data={data} isLoading={isLoading} />

        {/* Trade Signals - fetches from database */}
        <SignalsPanel />

        {/* Main Chart */}
        <PriceChart 
          data={data} 
          isLoading={isLoading} 
          interval={interval}
          onIntervalChange={handleIntervalChange}
        />

        {/* Indicators Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IndicatorsPanel data={data} isLoading={isLoading} interval={interval} />
          </div>
          <div>
            <EMAIndicators data={data} isLoading={isLoading} />
          </div>
        </div>

        {/* Backtest & History Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BacktestPanel data={data} isLoading={isLoading} />
          <TradeHistoryPanel />
        </div>

        {/* Stats, Settings & Scan History Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <StatsPanel />
          </div>
          <div>
            <ScanHistoryPanel />
          </div>
          <div>
            <EditableSettingsPanel />
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">?</kbd> for keyboard shortcuts
        </div>
      </div>
    </div>
  );
};

export default Index;
