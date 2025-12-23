import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarketData } from "@/types/trading";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRealtimePrice } from "@/hooks/useRealtimePrice";
import { useEffect, useState } from "react";

interface PriceTickerProps {
  data: MarketData | undefined;
  isLoading: boolean;
}

export function PriceTicker({ data, isLoading }: PriceTickerProps) {
  const { data: realtimeData, isConnected } = useRealtimePrice();
  const [flashClass, setFlashClass] = useState("");
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  // Flash effect on price change
  useEffect(() => {
    const currentPrice = realtimeData?.price ?? data?.currentPrice;
    if (prevPrice !== null && currentPrice !== undefined && currentPrice !== prevPrice) {
      setFlashClass(currentPrice > prevPrice ? "animate-flash-green" : "animate-flash-red");
      const timeout = setTimeout(() => setFlashClass(""), 300);
      return () => clearTimeout(timeout);
    }
    if (currentPrice !== undefined) {
      setPrevPrice(currentPrice);
    }
  }, [realtimeData?.price, data?.currentPrice, prevPrice]);

  if (isLoading && !realtimeData) {
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

  // Use realtime data if available, fallback to polling data
  const currentPrice = realtimeData?.price ?? data?.currentPrice ?? 0;
  const priceChange = realtimeData?.priceChange ?? data?.priceChange24h ?? 0;
  const priceChangePercent = realtimeData?.priceChangePercent ?? data?.priceChangePercent24h ?? 0;
  const high24h = realtimeData?.high24h ?? data?.high24h ?? 0;
  const low24h = realtimeData?.low24h ?? data?.low24h ?? 0;
  const volume24h = realtimeData?.volume24h ?? data?.volume24h ?? 0;

  const isPositive = priceChangePercent >= 0;
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
                <span className={`text-2xl font-bold font-mono tracking-tight transition-colors ${flashClass}`}>
                  {formatPrice(currentPrice)}
                </span>
                <div className={`flex items-center gap-1 ${priceColor}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isPositive ? "+" : ""}
                    {priceChangePercent.toFixed(2)}%
                  </span>
                </div>
                <div 
                  className={`p-1 rounded ${isConnected ? "text-chart-bullish" : "text-muted-foreground"}`}
                  title={isConnected ? "Live connection" : "Polling mode"}
                >
                  {isConnected ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
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
              {formatPrice(priceChange)}
            </p>
          </div>

          {/* 24h High */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">24h High</p>
            <p className="text-sm font-mono font-medium text-bullish">
              {formatPrice(high24h)}
            </p>
          </div>

          {/* 24h Low */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">24h Low</p>
            <p className="text-sm font-mono font-medium text-bearish">
              {formatPrice(low24h)}
            </p>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">24h Volume</p>
              <p className="text-sm font-mono font-medium">
                {formatVolume(volume24h)} BTC
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
