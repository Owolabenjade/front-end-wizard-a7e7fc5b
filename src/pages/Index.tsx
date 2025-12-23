import { useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useSignalDetection } from "@/hooks/useSignalDetection";
import { TimeInterval } from "@/types/trading";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { IndicatorsPanel } from "@/components/dashboard/IndicatorsPanel";
import { EMAIndicators } from "@/components/dashboard/EMAIndicators";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { TradeHistoryPanel } from "@/components/dashboard/TradeHistoryPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { TelegramPanel } from "@/components/dashboard/TelegramPanel";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const Index = () => {
  const [interval, setInterval] = useState<TimeInterval>("1h");
  const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useMarketData(interval);
  const { signals } = useSignalDetection(data);

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshing market data...");
  };

  const handleIntervalChange = (newInterval: TimeInterval) => {
    setInterval(newInterval);
  };

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
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardHeader 
          onRefresh={handleRefresh} 
          isRefetching={isRefetching} 
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        />

        {/* Price Ticker */}
        <PriceTicker data={data} isLoading={isLoading} />

        {/* Trade Signals */}
        <SignalsPanel signals={signals} isLoading={isLoading} />

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

        {/* Stats & History Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TradeHistoryPanel />
          </div>
          <div className="space-y-6">
            <StatsPanel />
            <TelegramPanel />
            <SettingsPanel />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
