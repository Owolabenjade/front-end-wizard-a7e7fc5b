import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarketData } from "@/types/trading";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceTickerProps {
  data: MarketData | undefined;
  isLoading: boolean;
}

export function PriceTicker({ data, isLoading }: PriceTickerProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-8">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isPositive = data.priceChangePercent24h >= 0;
  const priceColor = isPositive ? "text-bullish" : "text-bearish";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(2)}B`;
    }
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    }
    return `${(volume / 1000).toFixed(2)}K`;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur animate-slide-up">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-8">
          {/* Main Price */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xl font-bold text-accent">₿</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight">
                  {formatPrice(data.currentPrice)}
                </span>
                <div className={`flex items-center gap-1 ${priceColor}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isPositive ? "+" : ""}
                    {data.priceChangePercent24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">BTC/USDT</p>
            </div>
          </div>

          {/* 24h Change */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">24h Change</p>
            <p className={`text-sm font-mono font-medium ${priceColor}`}>
              {isPositive ? "+" : ""}
              {formatPrice(data.priceChange24h)}
            </p>
          </div>

          {/* 24h High */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">24h High</p>
            <p className="text-sm font-mono font-medium text-bullish">
              {formatPrice(data.high24h)}
            </p>
          </div>

          {/* 24h Low */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">24h Low</p>
            <p className="text-sm font-mono font-medium text-bearish">
              {formatPrice(data.low24h)}
            </p>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">24h Volume</p>
              <p className="text-sm font-mono font-medium">
                {formatVolume(data.volume24h)} BTC
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
