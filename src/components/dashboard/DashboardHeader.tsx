import { Activity, RefreshCw, Radar, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefetching: boolean;
  lastUpdated: Date | null;
}

interface ScanResult {
  success: boolean;
  signalsDetected: number;
  signalsSaved: number;
  error?: string;
}

export function DashboardHeader({ onRefresh, isRefetching, lastUpdated }: DashboardHeaderProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const handleManualScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('signal-scanner', {
        body: { scanType: 'manual' }
      });
      
      if (error) throw error;
      
      const result: ScanResult = {
        success: true,
        signalsDetected: data.signalsDetected || 0,
        signalsSaved: data.signalsSaved || 0,
      };
      
      setScanResult(result);
      setShowResultDialog(true);
      
      // Also show toast for quick feedback
      if (result.signalsSaved > 0) {
        toast.success(`${result.signalsSaved} new signal(s) detected!`, {
          description: "Check the Active Signals panel for details.",
        });
      } else if (result.signalsDetected > 0) {
        toast.info("Signals detected but already exist", {
          description: `${result.signalsDetected} signal(s) found, but they were duplicates.`,
        });
      } else {
        toast.info("No signals detected", {
          description: "Market conditions don't match any strategy criteria right now.",
        });
      }
      
      // Refresh data after scan
      onRefresh();
    } catch (error) {
      console.error('Manual scan error:', error);
      const result: ScanResult = {
        success: false,
        signalsDetected: 0,
        signalsSaved: 0,
        error: String(error),
      };
      setScanResult(result);
      setShowResultDialog(true);
      toast.error("Scan failed", {
        description: "Check the result dialog for details.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
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

        <div className="flex items-center gap-2 sm:gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualScan}
            disabled={isScanning}
            className="gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-4 touch-manipulation"
          >
            <Radar className={`h-4 w-4 sm:h-5 sm:w-5 ${isScanning ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">{isScanning ? "Scanning..." : "Run Scan"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefetching}
            className="gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-4 touch-manipulation"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scanResult?.success ? (
                scanResult.signalsSaved > 0 ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Signal Found!
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    No New Signals
                  </>
                )
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Scan Failed
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {scanResult?.success ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{scanResult.signalsDetected}</div>
                    <div className="text-xs text-muted-foreground">Detected</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{scanResult.signalsSaved}</div>
                    <div className="text-xs text-muted-foreground">New Saved</div>
                  </div>
                </div>
                
                {scanResult.signalsSaved > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    🎉 New trading signal(s) have been saved and you should receive a Telegram notification shortly.
                  </p>
                ) : scanResult.signalsDetected > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Signals were detected but they already exist in your history (duplicates within the last hour are skipped).
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Current market conditions don't match any of the strategy criteria (EMA Bounce, MACD Cross, RSI Reversal, or Bollinger Breakout).
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  An error occurred while scanning for signals.
                </p>
                {scanResult?.error && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {scanResult.error}
                  </pre>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
