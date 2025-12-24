import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTradeSignals, StoredSignal } from "@/hooks/useTradeSignals";
import { History, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const getConfluenceLabel = (confidence: number) => {
  if (confidence >= 95) return "Full Confluence";
  if (confidence >= 85) return "Strong Confluence";
  return "Confluence";
};

const getConfluenceColor = (confidence: number) => {
  if (confidence >= 95) return "bg-chart-bullish/20 text-chart-bullish border-chart-bullish/50";
  return "bg-primary/20 text-primary border-primary/50";
};

const getStatusIcon = (status: StoredSignal["status"]) => {
  switch (status) {
    case "active":
      return <Clock className="h-3 w-3" />;
    case "triggered":
      return <CheckCircle className="h-3 w-3" />;
    case "expired":
      return <XCircle className="h-3 w-3" />;
    case "cancelled":
      return <AlertCircle className="h-3 w-3" />;
  }
};

const getStatusColor = (status: StoredSignal["status"]) => {
  switch (status) {
    case "active":
      return "bg-primary/20 text-primary border-primary/30";
    case "triggered":
      return "bg-chart-bullish/20 text-chart-bullish border-chart-bullish/30";
    case "expired":
      return "bg-muted text-muted-foreground border-muted";
    case "cancelled":
      return "bg-chart-bearish/20 text-chart-bearish border-chart-bearish/30";
  }
};

export const TradeHistoryPanel = () => {
  const { data: signals, isLoading } = useTradeSignals(20);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Signal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Signal History
          {signals && signals.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {signals.length} signals
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!signals || signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No signal history yet</p>
            <p className="text-sm">Signals will appear here as they are detected</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Strategy</TableHead>
                  <TableHead className="text-xs">Direction</TableHead>
                  <TableHead className="text-xs">Entry</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={signal.id} className="border-border/20">
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(signal.detected_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getConfluenceColor(signal.confidence)}`}>
                        {getConfluenceLabel(signal.confidence)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          signal.direction === "long"
                            ? "bg-chart-bullish/10 text-chart-bullish border-chart-bullish/30"
                            : "bg-chart-bearish/10 text-chart-bearish border-chart-bearish/30"
                        }`}
                      >
                        {signal.direction === "long" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {signal.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      ${signal.entry_price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(signal.status)}`}
                      >
                        {getStatusIcon(signal.status)}
                        <span className="ml-1 capitalize">{signal.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {signal.pnl_percent !== null ? (
                        <span
                          className={`text-xs font-medium ${
                            signal.pnl_percent >= 0
                              ? "text-chart-bullish"
                              : "text-chart-bearish"
                          }`}
                        >
                          {signal.pnl_percent >= 0 ? "+" : ""}
                          {signal.pnl_percent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
