import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignalStats } from "@/hooks/useTradeSignals";
import { Layers, TrendingUp, TrendingDown, Target, Percent, Zap, Award } from "lucide-react";

export const StatsPanel = () => {
  const { data: stats, isLoading } = useSignalStats();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Confluence Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: "Confluence Signals",
      value: stats.total,
      icon: Layers,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Percent,
      color: stats.winRate >= 50 ? "text-chart-bullish" : "text-chart-bearish",
      bg: stats.winRate >= 50 ? "bg-chart-bullish/10" : "bg-chart-bearish/10",
    },
    {
      label: "Total P&L",
      value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}%`,
      icon: Target,
      color: stats.totalPnl >= 0 ? "text-chart-bullish" : "text-chart-bearish",
      bg: stats.totalPnl >= 0 ? "bg-chart-bullish/10" : "bg-chart-bearish/10",
    },
    {
      label: "Avg P&L/Trade",
      value: `${stats.avgPnl >= 0 ? "+" : ""}${stats.avgPnl.toFixed(2)}%`,
      icon: Zap,
      color: stats.avgPnl >= 0 ? "text-chart-bullish" : "text-chart-bearish",
      bg: stats.avgPnl >= 0 ? "bg-chart-bullish/10" : "bg-chart-bearish/10",
    },
    {
      label: "Strong (3 Aligned)",
      value: stats.strongConfluence,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Full (4 Aligned)",
      value: stats.fullConfluence,
      icon: Award,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Confluence Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border border-border/30 p-3 ${item.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        
        {/* Direction breakdown */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-bullish" />
              <span className="text-muted-foreground">Long</span>
              <span className="font-semibold text-chart-bullish">{stats.longSignals}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-chart-bearish">{stats.shortSignals}</span>
              <span className="text-muted-foreground">Short</span>
              <TrendingDown className="h-4 w-4 text-chart-bearish" />
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden flex">
            <div 
              className="h-full bg-chart-bullish transition-all"
              style={{ 
                width: `${stats.total > 0 ? (stats.longSignals / stats.total) * 100 : 50}%` 
              }}
            />
            <div 
              className="h-full bg-chart-bearish transition-all"
              style={{ 
                width: `${stats.total > 0 ? (stats.shortSignals / stats.total) * 100 : 50}%` 
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
