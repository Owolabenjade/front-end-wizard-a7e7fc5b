import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotSettings, useUpdateBotSettings, BotSettings } from "@/hooks/useBotSettings";
import { Settings, Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const EditableSettingsPanel = () => {
  const { data: settings, isLoading } = useBotSettings();
  const updateMutation = useUpdateBotSettings();
  
  const [localSettings, setLocalSettings] = useState<BotSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  useEffect(() => {
    if (settings && localSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(localSettings));
    }
  }, [settings, localSettings]);

  const handleReset = () => {
    if (settings) {
      setLocalSettings({ ...settings });
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings || !settings) return;

    try {
      // Update each changed setting
      const updates: Promise<void>[] = [];
      
      if (JSON.stringify(settings.rsi_settings) !== JSON.stringify(localSettings.rsi_settings)) {
        updates.push(updateMutation.mutateAsync({ key: "rsi_settings", value: localSettings.rsi_settings }));
      }
      if (JSON.stringify(settings.risk_settings) !== JSON.stringify(localSettings.risk_settings)) {
        updates.push(updateMutation.mutateAsync({ key: "risk_settings", value: localSettings.risk_settings }));
      }
      if (JSON.stringify(settings.macd_settings) !== JSON.stringify(localSettings.macd_settings)) {
        updates.push(updateMutation.mutateAsync({ key: "macd_settings", value: localSettings.macd_settings }));
      }
      if (JSON.stringify(settings.bollinger_settings) !== JSON.stringify(localSettings.bollinger_settings)) {
        updates.push(updateMutation.mutateAsync({ key: "bollinger_settings", value: localSettings.bollinger_settings }));
      }
      if (JSON.stringify(settings.enabled_strategies) !== JSON.stringify(localSettings.enabled_strategies)) {
        updates.push(updateMutation.mutateAsync({ key: "enabled_strategies", value: localSettings.enabled_strategies }));
      }

      await Promise.all(updates);
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    }
  };

  if (isLoading || !localSettings) {
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

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Bot Configuration
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="h-8"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RSI Settings */}
        <div className="rounded-lg border border-border/30 p-3 space-y-3">
          <span className="font-medium text-sm">RSI Settings</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Input
                type="number"
                value={localSettings.rsi_settings.period}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  rsi_settings: { ...localSettings.rsi_settings, period: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Overbought</Label>
              <Input
                type="number"
                value={localSettings.rsi_settings.overbought}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  rsi_settings: { ...localSettings.rsi_settings, overbought: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Oversold</Label>
              <Input
                type="number"
                value={localSettings.rsi_settings.oversold}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  rsi_settings: { ...localSettings.rsi_settings, oversold: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Risk Settings */}
        <div className="rounded-lg border border-border/30 p-3 space-y-3">
          <span className="font-medium text-sm">Risk Management</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Stop Loss %</Label>
              <Input
                type="number"
                step="0.1"
                value={localSettings.risk_settings.stopLossPercent}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  risk_settings: { ...localSettings.risk_settings, stopLossPercent: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Take Profit %</Label>
              <Input
                type="number"
                step="0.1"
                value={localSettings.risk_settings.takeProfitPercent}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  risk_settings: { ...localSettings.risk_settings, takeProfitPercent: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Min R:R</Label>
              <Input
                type="number"
                step="0.1"
                value={localSettings.risk_settings.minRiskReward}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  risk_settings: { ...localSettings.risk_settings, minRiskReward: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* MACD Settings */}
        <div className="rounded-lg border border-border/30 p-3 space-y-3">
          <span className="font-medium text-sm">MACD Settings</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Fast</Label>
              <Input
                type="number"
                value={localSettings.macd_settings.fast}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  macd_settings: { ...localSettings.macd_settings, fast: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Slow</Label>
              <Input
                type="number"
                value={localSettings.macd_settings.slow}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  macd_settings: { ...localSettings.macd_settings, slow: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Signal</Label>
              <Input
                type="number"
                value={localSettings.macd_settings.signal}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  macd_settings: { ...localSettings.macd_settings, signal: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bollinger Settings */}
        <div className="rounded-lg border border-border/30 p-3 space-y-3">
          <span className="font-medium text-sm">Bollinger Bands</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Input
                type="number"
                value={localSettings.bollinger_settings.period}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  bollinger_settings: { ...localSettings.bollinger_settings, period: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Std Dev</Label>
              <Input
                type="number"
                step="0.1"
                value={localSettings.bollinger_settings.stdDev}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  bollinger_settings: { ...localSettings.bollinger_settings, stdDev: Number(e.target.value) }
                })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Enabled Strategies */}
        <div className="rounded-lg border border-border/30 p-3 space-y-3">
          <span className="font-medium text-sm">Enabled Strategies</span>
          <div className="space-y-2">
            {Object.entries(localSettings.enabled_strategies).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm capitalize">
                  {key.replace("_", " ")}
                </Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    enabled_strategies: { ...localSettings.enabled_strategies, [key]: checked }
                  })}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
