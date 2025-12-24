import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Award, Zap } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Cell } from "recharts";

interface ConfluenceData {
  type: "Strong" | "Full";
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

const useConfluenceBreakdown = () => {
  return useQuery({
    queryKey: ["confluence-breakdown"],
    queryFn: async (): Promise<ConfluenceData[]> => {
      const { data, error } = await supabase
        .from("trade_signals")
        .select("confidence, pnl_percent, status")
        .gte("confidence", 85);

      if (error) throw error;

      const strong = data?.filter(s => s.confidence === 85) || [];
      const full = data?.filter(s => s.confidence >= 95) || [];

      const calculateStats = (signals: typeof data, type: "Strong" | "Full"): ConfluenceData => {
        const closed = signals?.filter(s => s.pnl_percent !== null) || [];
        const wins = closed.filter(s => Number(s.pnl_percent) > 0);
        const losses = closed.filter(s => Number(s.pnl_percent) <= 0);
        const totalPnl = closed.reduce((sum, s) => sum + (Number(s.pnl_percent) || 0), 0);
        const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;
        const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

        return {
          type,
          total: signals?.length || 0,
          wins: wins.length,
          losses: losses.length,
          winRate,
          avgPnl,
          totalPnl,
        };
      };

      return [
        calculateStats(strong, "Strong"),
        calculateStats(full, "Full"),
      ];
    },
    refetchInterval: 30000,
  });
};

const chartConfig = {
  wins: {
    label: "Wins",
    color: "hsl(var(--chart-bullish))",
  },
  losses: {
    label: "Losses",
    color: "hsl(var(--chart-bearish))",
  },
};

export const ConfluenceChart = () => {
  const { data: breakdown, isLoading } = useConfluenceBreakdown();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Confluence Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown || breakdown.every(b => b.total === 0)) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Confluence Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No confluence data yet</p>
            <p className="text-sm">Stats will appear as signals are tracked</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const barData = breakdown.map(b => ({
    name: b.type,
    wins: b.wins,
    losses: b.losses,
  }));

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Confluence Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Win/Loss Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={barData} layout="vertical" barCategoryGap="20%">
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={50}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="wins" stackId="a" fill="hsl(var(--chart-bullish))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="losses" stackId="a" fill="hsl(var(--chart-bearish))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-3">
          {breakdown.map((b) => {
            const Icon = b.type === "Full" ? Award : Zap;
            const color = b.type === "Full" ? "text-emerald-500" : "text-amber-500";
            const bg = b.type === "Full" ? "bg-emerald-500/10" : "bg-amber-500/10";
            
            return (
              <div key={b.type} className={`rounded-lg border border-border/30 p-3 ${bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className={`text-sm font-medium ${color}`}>
                    {b.type} ({b.type === "Full" ? "4" : "3"} aligned)
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Signals</span>
                    <span className="font-medium">{b.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className={`font-medium ${b.winRate >= 50 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {b.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg P&L</span>
                    <span className={`font-medium ${b.avgPnl >= 0 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {b.avgPnl >= 0 ? "+" : ""}{b.avgPnl.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total P&L</span>
                    <span className={`font-medium ${b.totalPnl >= 0 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {b.totalPnl >= 0 ? "+" : ""}{b.totalPnl.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-chart-bullish" />
            <span className="text-muted-foreground">Wins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-chart-bearish" />
            <span className="text-muted-foreground">Losses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
