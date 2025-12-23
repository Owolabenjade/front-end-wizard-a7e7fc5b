import { Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard } from "./SignalCard";
import { TradeSignal } from "@/lib/signalDetection";

interface SignalsPanelProps {
  signals: TradeSignal[];
  isLoading: boolean;
}

export function SignalsPanel({ signals, isLoading }: SignalsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const longSignals = signals.filter(s => s.direction === "long");
  const shortSignals = signals.filter(s => s.direction === "short");
  const highConfidenceCount = signals.filter(s => s.confidence === "high").length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-medium">Active Signals</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {signals.length > 0 ? (
              <>
                <Badge variant="outline" className="border-bullish/50 text-bullish gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {longSignals.length}
                </Badge>
                <Badge variant="outline" className="border-bearish/50 text-bearish gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {shortSignals.length}
                </Badge>
                {highConfidenceCount > 0 && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    {highConfidenceCount} high confidence
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                No active signals
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              No trading signals detected
            </p>
            <p className="text-xs text-muted-foreground/70">
              Signals will appear when market conditions match your trading strategies
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
