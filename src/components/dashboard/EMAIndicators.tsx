import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketData } from "@/types/trading";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EMAIndicatorsProps {
  data: MarketData | undefined;
  isLoading: boolean;
}

interface EMACardProps {
  label: string;
  value: number | undefined;
  currentPrice: number | undefined;
  color: string;
}

function EMACard({ label, value, currentPrice, color }: EMACardProps) {
  if (value === undefined || currentPrice === undefined) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    );
  }

  const diff = currentPrice - value;
  const diffPercent = (diff / value) * 100;
  const isAbove = diff > 0;
  const isNear = Math.abs(diffPercent) < 0.5;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{formatPrice(value)}</span>
        <div className={`flex items-center gap-1 text-xs ${
          isNear ? "text-muted-foreground" : isAbove ? "text-bullish" : "text-bearish"
        }`}>
          {isNear ? (
            <Minus className="h-3 w-3" />
          ) : isAbove ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{isAbove ? "+" : ""}{diffPercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export function EMAIndicators({ data, isLoading }: EMAIndicatorsProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const currentPrice = data?.currentPrice;
  const lastIndex = data ? data.candles.length - 1 : 0;

  const emas = [
    { label: "EMA 8", value: data?.ema8[lastIndex], color: "hsl(38, 92%, 50%)" },
    { label: "EMA 13", value: data?.ema13[lastIndex], color: "hsl(280, 65%, 60%)" },
    { label: "EMA 21", value: data?.ema21[lastIndex], color: "hsl(190, 80%, 50%)" },
    { label: "EMA 50", value: data?.ema50[lastIndex], color: "hsl(340, 75%, 55%)" },
    { label: "EMA 200", value: data?.ema200[lastIndex], color: "hsl(142, 76%, 45%)" },
  ];

  // Determine trend based on EMA alignment
  const getTrendStatus = () => {
    if (!data) return { trend: "Unknown", color: "text-muted-foreground" };
    
    const ema8 = data.ema8[lastIndex];
    const ema21 = data.ema21[lastIndex];
    const ema50 = data.ema50[lastIndex];
    const ema200 = data.ema200[lastIndex];

    if (!ema8 || !ema21 || !ema50 || !ema200) {
      return { trend: "Loading...", color: "text-muted-foreground" };
    }

    // Strong uptrend: Price > EMA8 > EMA21 > EMA50 > EMA200
    if (currentPrice && currentPrice > ema8 && ema8 > ema21 && ema21 > ema50) {
      return { trend: "Strong Uptrend", color: "text-bullish" };
    }
    
    // Uptrend: Price above EMAs
    if (currentPrice && currentPrice > ema21 && currentPrice > ema50) {
      return { trend: "Uptrend", color: "text-bullish" };
    }
    
    // Strong downtrend: Price < EMA8 < EMA21 < EMA50 < EMA200
    if (currentPrice && currentPrice < ema8 && ema8 < ema21 && ema21 < ema50) {
      return { trend: "Strong Downtrend", color: "text-bearish" };
    }
    
    // Downtrend: Price below EMAs
    if (currentPrice && currentPrice < ema21 && currentPrice < ema50) {
      return { trend: "Downtrend", color: "text-bearish" };
    }
    
    return { trend: "Consolidation", color: "text-warning" };
  };

  const trendStatus = getTrendStatus();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">EMA Levels</CardTitle>
          <span className={`text-xs font-medium ${trendStatus.color}`}>
            {trendStatus.trend}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {emas.map((ema) => (
          <EMACard
            key={ema.label}
            label={ema.label}
            value={ema.value}
            currentPrice={currentPrice}
            color={ema.color}
          />
        ))}
      </CardContent>
    </Card>
  );
}
