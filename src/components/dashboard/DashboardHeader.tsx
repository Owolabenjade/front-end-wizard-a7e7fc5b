import { Activity, RefreshCw, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefetching: boolean;
  lastUpdated: Date | null;
}

export function DashboardHeader({ onRefresh, isRefetching, lastUpdated }: DashboardHeaderProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('signal-scanner');
      
      if (error) throw error;
      
      const result = data as { signalsDetected?: number; signalsSaved?: number; message?: string };
      
      if (result.signalsDetected && result.signalsDetected > 0) {
        toast.success(`Scan complete: ${result.signalsSaved || 0} new signals detected`);
      } else {
        toast.info("Scan complete: No new signals detected");
      }
      
      // Refresh data after scan
      onRefresh();
    } catch (error) {
      console.error('Manual scan error:', error);
      toast.error("Failed to run signal scan");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Bitcoin Swing Trader</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Real-time market analysis & trading signals
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualScan}
          disabled={isScanning}
          className="gap-2"
        >
          <Radar className={`h-4 w-4 ${isScanning ? "animate-pulse" : ""}`} />
          {isScanning ? "Scanning..." : "Run Scan"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </header>
  );
}