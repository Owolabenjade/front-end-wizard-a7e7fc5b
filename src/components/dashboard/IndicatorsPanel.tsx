import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketData, TimeInterval } from "@/types/trading";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface IndicatorsPanelProps {
  data: MarketData | undefined;
  isLoading: boolean;
  interval: TimeInterval;
}

export function IndicatorsPanel({ data, isLoading, interval }: IndicatorsPanelProps) {
  const rsiData = useMemo(() => {
    if (!data) return [];
    return data.candles.map((candle, i) => {
      const date = new Date(candle.time);
      const timeStr = interval === "1d"
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return {
        time: timeStr,
        rsi: data.rsi14[i],
      };
    }).filter(d => d.rsi !== undefined);
  }, [data, interval]);

  const macdData = useMemo(() => {
    if (!data) return [];
    return data.candles.map((candle, i) => {
      const date = new Date(candle.time);
      const timeStr = interval === "1d"
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const macdVal = data.macd[i];
      return {
        time: timeStr,
        macd: macdVal?.macd,
        signal: macdVal?.signal,
        histogram: macdVal?.histogram,
      };
    }).filter(d => d.macd !== undefined);
  }, [data, interval]);

  const currentRSI = rsiData[rsiData.length - 1]?.rsi;
  const currentMACD = macdData[macdData.length - 1];

  const getRSIStatus = (rsi: number | undefined) => {
    if (rsi === undefined) return { label: "N/A", color: "default" as const };
    if (rsi >= 70) return { label: "Overbought", color: "destructive" as const };
    if (rsi <= 30) return { label: "Oversold", color: "default" as const };
    return { label: "Neutral", color: "secondary" as const };
  };

  const getMACDStatus = (macd: typeof currentMACD) => {
    if (!macd) return { label: "N/A", color: "default" as const };
    if (macd.histogram > 0 && macd.macd > macd.signal) {
      return { label: "Bullish", color: "default" as const };
    }
    if (macd.histogram < 0 && macd.macd < macd.signal) {
      return { label: "Bearish", color: "destructive" as const };
    }
    return { label: "Neutral", color: "secondary" as const };
  };

  const rsiStatus = getRSIStatus(currentRSI);
  const macdStatus = getMACDStatus(currentMACD);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[150px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[150px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 animate-slide-up">
      {/* RSI Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">RSI (14)</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold">
                {currentRSI?.toFixed(1) ?? "—"}
              </span>
              <Badge 
                variant={rsiStatus.color}
                className={
                  rsiStatus.label === "Oversold" 
                    ? "bg-bullish/20 text-bullish border-bullish/30" 
                    : rsiStatus.label === "Overbought"
                    ? "bg-bearish/20 text-bearish border-bearish/30"
                    : ""
                }
              >
                {rsiStatus.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rsiData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  interval="preserveEnd"
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  ticks={[30, 50, 70]}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [value.toFixed(2), "RSI"]}
                />
                <ReferenceLine y={70} stroke="hsl(var(--bearish))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={30} stroke="hsl(var(--bullish))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
                <Line 
                  dataKey="rsi" 
                  stroke="hsl(var(--chart-rsi))" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* MACD Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">MACD (12, 26, 9)</CardTitle>
            <Badge 
              variant={macdStatus.color}
              className={
                macdStatus.label === "Bullish" 
                  ? "bg-bullish/20 text-bullish border-bullish/30" 
                  : macdStatus.label === "Bearish"
                  ? "bg-bearish/20 text-bearish border-bearish/30"
                  : ""
              }
            >
              {macdStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macdData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  interval="preserveEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  width={50}
                  tickFormatter={(v) => v.toFixed(0)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number, name: string) => [
                    value.toFixed(2), 
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
                <Bar dataKey="histogram" radius={[2, 2, 0, 0]} barSize={4}>
                  {macdData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.histogram >= 0 ? "hsl(var(--bullish))" : "hsl(var(--bearish))"} 
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <Line dataKey="macd" stroke="hsl(var(--chart-macd))" strokeWidth={1.5} dot={false} />
                <Line dataKey="signal" stroke="hsl(var(--chart-signal))" strokeWidth={1.5} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-macd))" }} />
              <span className="text-muted-foreground">MACD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: "hsl(var(--chart-signal))" }} />
              <span className="text-muted-foreground">Signal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-4 rounded" style={{ backgroundColor: "hsl(var(--bullish))", opacity: 0.7 }} />
              <span className="text-muted-foreground">Histogram</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
