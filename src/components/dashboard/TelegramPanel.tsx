import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTelegramTest } from "@/hooks/useTelegram";
import { Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const TelegramPanel = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const testMutation = useTelegramTest();

  const handleTestConnection = async () => {
    try {
      const result = await testMutation.mutateAsync();
      if (result.success) {
        setIsConnected(true);
        toast.success("Telegram connected! Check your chat for a test message.");
      } else {
        setIsConnected(false);
        toast.error(`Failed: ${result.error}`);
      }
    } catch (error) {
      setIsConnected(false);
      toast.error("Failed to connect to Telegram");
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-[#0088cc]" />
          Telegram Alerts
          {isConnected !== null && (
            <Badge
              variant="outline"
              className={`ml-auto ${
                isConnected
                  ? "bg-chart-bullish/20 text-chart-bullish border-chart-bullish/30"
                  : "bg-chart-bearish/20 text-chart-bearish border-chart-bearish/30"
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receive trade signals directly in your Telegram chat. Configure your
          bot token and chat ID in the settings.
        </p>

        <div className="rounded-lg border border-border/30 p-3 space-y-2">
          <h4 className="text-sm font-medium">How to set up:</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a bot via @BotFather on Telegram</li>
            <li>Get your bot token from BotFather</li>
            <li>Start a chat with your bot</li>
            <li>Get your chat ID from @userinfobot</li>
            <li>Add both to your environment secrets</li>
          </ol>
        </div>

        <Button
          onClick={handleTestConnection}
          disabled={testMutation.isPending}
          className="w-full"
          variant="outline"
        >
          {testMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
