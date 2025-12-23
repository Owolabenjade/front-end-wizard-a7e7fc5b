import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignalStats } from "@/hooks/useTradeSignals";
import { BarChart3, TrendingUp, TrendingDown, Target, Percent, Activity } from "lucide-react";

export const StatsPanel = () => {
  const { data: stats, isLoading } = useSignalStats();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Stats
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
      label: "Total Signals",
      value: stats.total,
      icon: Activity,
      color: "text-primary",
    },
    {
      label: "Active",
      value: stats.active,
      icon: Target,
      color: "text-primary",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Percent,
      color: stats.winRate >= 50 ? "text-chart-bullish" : "text-chart-bearish",
    },
    {
      label: "Total P&L",
      value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}%`,
      icon: BarChart3,
      color: stats.totalPnl >= 0 ? "text-chart-bullish" : "text-chart-bearish",
    },
    {
      label: "Long Signals",
      value: stats.longSignals,
      icon: TrendingUp,
      color: "text-chart-bullish",
    },
    {
      label: "Short Signals",
      value: stats.shortSignals,
      icon: TrendingDown,
      color: "text-chart-bearish",
    },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/30 p-3"
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
      </CardContent>
    </Card>
  );
};
