import { TrendingUp, TrendingDown, Target, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TradeSignal, getStrategyLabel, getStrategyColor, getStrategyIcon } from "@/lib/signalDetection";

interface SignalCardProps {
  signal: TradeSignal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const isLong = signal.direction === "long";
  const directionColor = isLong ? "text-bullish" : "text-bearish";
  const directionBg = isLong ? "bg-bullish/10 border-bullish/20" : "bg-bearish/10 border-bearish/20";
  const strategyColor = getStrategyColor(signal.strategy);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const riskReward = Math.abs(signal.takeProfit - signal.entryPrice) / Math.abs(signal.entryPrice - signal.stopLoss);

  return (
    <Card className={`border ${directionBg} backdrop-blur animate-slide-up`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStrategyIcon(signal.strategy)}</span>
            <CardTitle className="text-sm font-medium">
              {getStrategyLabel(signal.strategy)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${signal.confidence === "high" ? "border-primary/50 text-primary" : "border-muted-foreground/50 text-muted-foreground"}`}
            >
              {signal.confidence}
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
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-secondary/50 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Entry
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium">{formatPrice(signal.entryPrice)}</p>
          </div>
          <div className="rounded-lg bg-bearish/10 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-bearish mb-0.5 sm:mb-1">
              <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              SL
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium text-bearish">{formatPrice(signal.stopLoss)}</p>
          </div>
          <div className="rounded-lg bg-bullish/10 p-1.5 sm:p-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-bullish mb-0.5 sm:mb-1">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              TP
            </div>
            <p className="text-xs sm:text-sm font-mono font-medium text-bullish">{formatPrice(signal.takeProfit)}</p>
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Risk/Reward Ratio</span>
          <span className={`font-mono font-medium ${riskReward >= 2 ? "text-bullish" : riskReward >= 1.5 ? "text-warning" : "text-bearish"}`}>
            1:{riskReward.toFixed(2)}
          </span>
        </div>

        {/* Reason */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {signal.reason}
        </p>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <Clock className="h-3 w-3" />
          Detected at {formatTime(signal.timestamp)}
        </div>
      </CardContent>
    </Card>
  );
}
