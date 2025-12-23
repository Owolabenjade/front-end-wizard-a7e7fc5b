import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketData, TimeInterval } from "@/types/trading";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceChartProps {
  data: MarketData | undefined;
  isLoading: boolean;
  interval: TimeInterval;
  onIntervalChange: (interval: TimeInterval) => void;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema8?: number;
  ema13?: number;
  ema21?: number;
  ema50?: number;
  ema200?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  isGreen: boolean;
}

const intervals: { value: TimeInterval; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
];

export function PriceChart({ data, isLoading, interval, onIntervalChange }: PriceChartProps) {
  const [showEMAs, setShowEMAs] = useState(true);
  const [showBB, setShowBB] = useState(true);

  const chartData = useMemo(() => {
    if (!data) return [];

    return data.candles.map((candle, i): ChartDataPoint => {
      const date = new Date(candle.time);
      const timeStr = interval === "1d" 
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      return {
        time: timeStr,
        timestamp: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        ema8: data.ema8[i],
        ema13: data.ema13[i],
        ema21: data.ema21[i],
        ema50: data.ema50[i],
        ema200: data.ema200[i],
        bbUpper: data.bollingerBands[i]?.upper,
        bbMiddle: data.bollingerBands[i]?.middle,
        bbLower: data.bollingerBands[i]?.lower,
        isGreen: candle.close >= candle.open,
      };
    });
  }, [data, interval]);

  const priceRange = useMemo(() => {
    if (!chartData.length) return { min: 0, max: 0 };
    const prices = chartData.flatMap(d => [d.high, d.low, d.bbUpper, d.bbLower].filter(Boolean) as number[]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [chartData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ChartDataPoint;
    const isGreen = d.close >= d.open;

    return (
      <div className="rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        <p className="text-xs text-muted-foreground mb-2">{d.time}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-mono">{formatPrice(d.open)}</span>
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono text-bullish">{formatPrice(d.high)}</span>
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono text-bearish">{formatPrice(d.low)}</span>
          <span className="text-muted-foreground">Close:</span>
          <span className={`font-mono font-medium ${isGreen ? "text-bullish" : "text-bearish"}`}>
            {formatPrice(d.close)}
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const lastCandle = chartData[chartData.length - 1];
  const prevCandle = chartData[chartData.length - 2];
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const isUp = priceChange >= 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base sm:text-lg">Price Chart</CardTitle>
            {lastCandle && (
              <Badge variant="outline" className={isUp ? "border-bullish/50 text-bullish" : "border-bearish/50 text-bearish"}>
                {isUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {isUp ? "+" : ""}{priceChange.toFixed(2)}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Interval buttons */}
            <div className="flex rounded-md border border-border">
              {intervals.map((int) => (
                <Button
                  key={int.value}
                  variant={interval === int.value ? "secondary" : "ghost"}
                  size="sm"
                  className="min-h-[44px] min-w-[44px] px-3 sm:px-4 text-xs sm:text-sm touch-manipulation"
                  onClick={() => onIntervalChange(int.value)}
                >
                  {int.label}
                </Button>
              ))}
            </div>
            
            {/* Indicator toggles */}
            <Button
              variant={showEMAs ? "secondary" : "ghost"}
              size="sm"
              className="min-h-[44px] min-w-[44px] px-3 sm:px-4 text-xs sm:text-sm touch-manipulation"
              onClick={() => setShowEMAs(!showEMAs)}
            >
              EMAs
            </Button>
            <Button
              variant={showBB ? "secondary" : "ghost"}
              size="sm"
              className="min-h-[44px] min-w-[44px] px-3 sm:px-4 text-xs sm:text-sm touch-manipulation"
              onClick={() => setShowBB(!showBB)}
            >
              BB
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-[300px] sm:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[priceRange.min, priceRange.max]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={formatPrice}
                orientation="right"
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Bollinger Bands */}
              {showBB && (
                <>
                  <Area
                    dataKey="bbUpper"
                    stroke="none"
                    fill="hsl(var(--chart-bb-upper))"
                    fillOpacity={0.05}
                  />
                  <Line
                    dataKey="bbUpper"
                    stroke="hsl(var(--chart-bb-upper))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    dataKey="bbMiddle"
                    stroke="hsl(var(--chart-bb-middle))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    dataKey="bbLower"
                    stroke="hsl(var(--chart-bb-lower))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              )}

              {/* Candlesticks as bars with high-low range */}
              <Bar
                dataKey="close"
                fill="hsl(var(--bullish))"
                radius={[2, 2, 0, 0]}
                barSize={8}
                shape={(props: any) => {
                  const { x, y, width, payload } = props;
                  const isGreen = payload.close >= payload.open;
                  const color = isGreen ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)";
                  const bodyTop = Math.min(payload.open, payload.close);
                  const bodyBottom = Math.max(payload.open, payload.close);
                  const yScale = (priceRange.max - priceRange.min) / 380;
                  
                  const highY = (priceRange.max - payload.high) / yScale + 10;
                  const lowY = (priceRange.max - payload.low) / yScale + 10;
                  const openY = (priceRange.max - payload.open) / yScale + 10;
                  const closeY = (priceRange.max - payload.close) / yScale + 10;
                  
                  const wickX = x + width / 2;
                  const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
                  const bodyY = Math.min(openY, closeY);

                  return (
                    <g>
                      {/* Wick */}
                      <line
                        x1={wickX}
                        y1={highY}
                        x2={wickX}
                        y2={lowY}
                        stroke={color}
                        strokeWidth={1}
                      />
                      {/* Body */}
                      <rect
                        x={x}
                        y={bodyY}
                        width={width}
                        height={bodyHeight}
                        fill={color}
                        rx={1}
                      />
                    </g>
                  );
                }}
              />

              {/* EMAs */}
              {showEMAs && (
                <>
                  <Line dataKey="ema8" stroke="hsl(var(--chart-ema-8))" strokeWidth={1.5} dot={false} />
                  <Line dataKey="ema21" stroke="hsl(var(--chart-ema-21))" strokeWidth={1.5} dot={false} />
                  <Line dataKey="ema50" stroke="hsl(var(--chart-ema-50))" strokeWidth={1.5} dot={false} />
                  <Line dataKey="ema200" stroke="hsl(var(--chart-ema-200))" strokeWidth={2} dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          {showEMAs && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-ema-8))" }} />
                <span className="text-muted-foreground">EMA 8</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-ema-21))" }} />
                <span className="text-muted-foreground">EMA 21</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-ema-50))" }} />
                <span className="text-muted-foreground">EMA 50</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-ema-200))" }} />
                <span className="text-muted-foreground">EMA 200</span>
              </div>
            </>
          )}
          {showBB && (
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded border border-dashed" style={{ borderColor: "hsl(var(--chart-bb-upper))" }} />
              <span className="text-muted-foreground">Bollinger Bands</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
