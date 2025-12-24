import { TrendingUp, TrendingDown, Target, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoredSignal } from "@/hooks/useTradeSignals";
import { format } from "date-fns";

interface ActiveSignalCardProps {
  signal: StoredSignal;
}

const strategyLabels: Record<StoredSignal["strategy"], string> = {
  ema_bounce: "EMA Bounce",
  macd_cross: "MACD Cross",
  rsi_reversal: "RSI Reversal",
  bollinger_breakout: "BB Breakout",
};

const strategyIcons: Record<StoredSignal["strategy"], string> = {
  ema_bounce: "📈",
  macd_cross: "📊",
  rsi_reversal: "🔄",
  bollinger_breakout: "💥",
};

export function ActiveSignalCard({ signal }: ActiveSignalCardProps) {
  const isLong = signal.direction === "long";
  const directionBg = isLong ? "bg-bullish/10 border-bullish/20" : "bg-bearish/10 border-bearish/20";
  
  // Detect confluence from reason text
  const isConfluence = signal.reason.includes("CONFLUENCE");
  const isFullConfluence = signal.reason.includes("4/4");
  const isStrongConfluence = signal.reason.includes("3/4");
  
  // Map confidence number to label
  const confidenceLabel = signal.confidence >= 80 ? "high" : signal.confidence >= 60 ? "medium" : "low";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className={`border ${directionBg} backdrop-blur animate-slide-up ${isConfluence ? "ring-2 ring-primary/50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          {/* Confluence Badge */}
          {isConfluence && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="default" 
                className={`${isFullConfluence ? "bg-primary text-primary-foreground" : "bg-primary/80 text-primary-foreground"}`}
              >
                {isFullConfluence ? "🔥🔥🔥🔥 FULL CONFLUENCE" : "🔥🔥🔥 STRONG CONFLUENCE"}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{strategyIcons[signal.strategy]}</span>
              <CardTitle className="text-sm font-medium">
                {isConfluence ? `${isFullConfluence ? "4" : "3"} Strategies Aligned` : strategyLabels[signal.strategy]}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${confidenceLabel === "high" ? "border-primary/50 text-primary" : "border-muted-foreground/50 text-muted-foreground"}`}
              >
                {signal.confidence}%
              </Badge>
              <Badge 
                variant="outline" 
                className={`${isLong ? "border-bullish/50 text-bullish" : "border-bearish/50 text-bearish"}`}
              >
                {isLong ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {signal.direction.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-secondary/50 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Entry
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium">{formatPrice(signal.entry_price)}</p>
          </div>
          <div className="rounded-lg bg-bearish/10 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-bearish mb-0.5 sm:mb-1">
              <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              SL
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium text-bearish">{formatPrice(signal.stop_loss)}</p>
          </div>
          <div className="rounded-lg bg-bullish/10 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-bullish mb-0.5 sm:mb-1">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              TP
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium text-bullish">{formatPrice(signal.take_profit)}</p>
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Risk/Reward Ratio</span>
          <span className={`font-mono font-medium ${signal.risk_reward >= 2 ? "text-bullish" : signal.risk_reward >= 1.5 ? "text-warning" : "text-bearish"}`}>
            1:{signal.risk_reward.toFixed(2)}
          </span>
        </div>

        {/* Reason - render with line breaks for confluence signals */}
        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
          {signal.reason}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <Clock className="h-3 w-3" />
          Detected {format(new Date(signal.detected_at), "MMM d, HH:mm")}
        </div>
      </CardContent>
    </Card>
  );
}