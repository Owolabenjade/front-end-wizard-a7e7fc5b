import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotSettings } from "@/hooks/useBotSettings";
import { Settings, TrendingUp, Activity, BarChart3, Target } from "lucide-react";

export const SettingsPanel = () => {
  const { data: settings, isLoading } = useBotSettings();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Bot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" />
          Bot Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* EMA Settings */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-chart-ema8" />
            <span className="font-medium text-sm">EMA Periods</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(settings.ema_periods).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key.toUpperCase()}: {value}
              </Badge>
            ))}
          </div>
        </div>

        {/* RSI Settings */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-chart-rsi" />
            <span className="font-medium text-sm">RSI Settings</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Period: {settings.rsi_settings.period}
            </Badge>
            <Badge variant="outline" className="text-xs text-chart-bearish">
              Overbought: {settings.rsi_settings.overbought}
            </Badge>
            <Badge variant="outline" className="text-xs text-chart-bullish">
              Oversold: {settings.rsi_settings.oversold}
            </Badge>
          </div>
        </div>

        {/* MACD Settings */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-chart-macd" />
            <span className="font-medium text-sm">MACD Settings</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Fast: {settings.macd_settings.fast}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Slow: {settings.macd_settings.slow}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Signal: {settings.macd_settings.signal}
            </Badge>
          </div>
        </div>

        {/* Bollinger Settings */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-chart-bb" />
            <span className="font-medium text-sm">Bollinger Bands</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Period: {settings.bollinger_settings.period}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Std Dev: {settings.bollinger_settings.stdDev}
            </Badge>
          </div>
        </div>

        {/* Risk Settings */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Risk Management</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs text-chart-bearish">
              SL: {settings.risk_settings.stopLossPercent}%
            </Badge>
            <Badge variant="outline" className="text-xs text-chart-bullish">
              TP: {settings.risk_settings.takeProfitPercent}%
            </Badge>
            <Badge variant="outline" className="text-xs">
              Min R:R: {settings.risk_settings.minRiskReward}
            </Badge>
          </div>
        </div>

        {/* Enabled Strategies */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Enabled Strategies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(settings.enabled_strategies).map(([key, enabled]) => (
              <Badge
                key={key}
                variant={enabled ? "default" : "secondary"}
                className={`text-xs ${enabled ? "bg-chart-bullish/20 text-chart-bullish border-chart-bullish/30" : "opacity-50"}`}
              >
                {key.replace("_", " ").toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
