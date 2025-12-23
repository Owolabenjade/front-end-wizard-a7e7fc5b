import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  BarChart3,
  History,
  Settings,
  Loader2
} from "lucide-react";
import { useBacktest } from "@/hooks/useBacktest";
import { MarketData } from "@/types/trading";
import { BacktestTrade } from "@/lib/backtesting";
import { format } from "date-fns";

interface BacktestPanelProps {
  data: MarketData | undefined;
  isLoading: boolean;
}

export function BacktestPanel({ data, isLoading }: BacktestPanelProps) {
  const { result, isRunning, config, executeBacktest, updateConfig } = useBacktest();
  const [activeTab, setActiveTab] = useState("results");

  const handleRunBacktest = () => {
    if (data) {
      executeBacktest(data);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Strategy Backtester
          </div>
          <Button
            onClick={handleRunBacktest}
            disabled={isRunning || isLoading || !data}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="results" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Results
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {result ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/30 p-3">
                    <p className="text-xs text-muted-foreground">Total P&L</p>
                    <p className={`text-lg font-bold font-mono ${result.totalPnlPercent >= 0 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {formatPercent(result.totalPnlPercent)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(result.finalBalance - result.initialBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/30 p-3">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className={`text-lg font-bold font-mono ${result.winRate >= 50 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {result.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.winningTrades}W / {result.losingTrades}L
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/30 p-3">
                    <p className="text-xs text-muted-foreground">Profit Factor</p>
                    <p className={`text-lg font-bold font-mono ${result.profitFactor >= 1 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {result.profitFactor === Infinity ? "∞" : result.profitFactor.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/30 p-3">
                    <p className="text-xs text-muted-foreground">Max Drawdown</p>
                    <p className="text-lg font-bold font-mono text-chart-bearish">
                      -{result.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="rounded-lg border border-border/30 p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-mono">{result.totalTrades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg P&L per Trade</span>
                    <span className={`font-mono ${result.averagePnlPercent >= 0 ? "text-chart-bullish" : "text-chart-bearish"}`}>
                      {formatPercent(result.averagePnlPercent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-mono">{result.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Final Balance</span>
                    <span className="font-mono">{formatCurrency(result.finalBalance)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Run a backtest to see results</p>
                <p className="text-xs mt-1">Uses {data?.candles.length || 0} candles of historical data</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trades" className="space-y-2">
            {result && result.trades.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {result.trades.slice(0, 50).map((trade, index) => (
                  <TradeRow key={trade.id} trade={trade} index={index + 1} />
                ))}
                {result.trades.length > 50 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Showing first 50 of {result.trades.length} trades
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No trades to display</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Initial Balance ($)</Label>
                <Input
                  type="number"
                  value={config.initialBalance}
                  onChange={(e) => updateConfig({ initialBalance: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Holding (candles)</Label>
                <Input
                  type="number"
                  value={config.maxHoldingPeriod}
                  disabled
                  className="h-8 text-sm bg-muted cursor-not-allowed"
                  title="Fixed at 36 candles for optimal performance"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Stop Loss %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.stopLossPercent}
                  onChange={(e) => updateConfig({ stopLossPercent: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Take Profit %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.takeProfitPercent}
                  onChange={(e) => updateConfig({ takeProfitPercent: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium">Enabled Strategies</Label>
              <div className="space-y-2">
                {Object.entries(config.enabledStrategies).map(([strategy, enabled]) => (
                  <div key={strategy} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{strategy.replace("_", " ")}</span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          enabledStrategies: { ...config.enabledStrategies, [strategy]: checked },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TradeRow({ trade, index }: { trade: BacktestTrade; index: number }) {
  const isWin = trade.pnlPercent > 0;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-muted/20">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-6">#{index}</span>
        <Badge
          variant="outline"
          className={`text-xs ${
            trade.direction === "long"
              ? "bg-chart-bullish/10 text-chart-bullish border-chart-bullish/30"
              : "bg-chart-bearish/10 text-chart-bearish border-chart-bearish/30"
          }`}
        >
          {trade.direction === "long" ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {trade.direction}
        </Badge>
        <span className="text-xs text-muted-foreground capitalize">
          {trade.strategy.replace("_", " ")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${
            trade.exitReason === "take_profit"
              ? "bg-chart-bullish/10 text-chart-bullish"
              : trade.exitReason === "stop_loss"
              ? "bg-chart-bearish/10 text-chart-bearish"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {trade.exitReason === "take_profit" ? (
            <Target className="h-3 w-3 mr-1" />
          ) : trade.exitReason === "stop_loss" ? (
            <AlertTriangle className="h-3 w-3 mr-1" />
          ) : null}
          {trade.exitReason.replace("_", " ")}
        </Badge>
        <span
          className={`text-sm font-mono font-medium ${
            isWin ? "text-chart-bullish" : "text-chart-bearish"
          }`}
        >
          {isWin ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
