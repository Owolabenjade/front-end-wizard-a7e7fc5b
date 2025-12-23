import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScanHistoryEntry {
  id: string;
  scan_type: "manual" | "cron";
  signals_detected: number;
  signals_saved: number;
  status: "success" | "error";
  error_message: string | null;
  executed_at: string;
}

export function ScanHistoryPanel() {
  const { data: scanHistory, isLoading } = useQuery({
    queryKey: ["scan-history"],
    queryFn: async (): Promise<ScanHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as ScanHistoryEntry[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Scan History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading scan history...
          </div>
        ) : !scanHistory || scanHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No scans recorded yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scanHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  {entry.status === "success" ? (
                    entry.signals_saved > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge
                    variant={entry.scan_type === "manual" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {entry.scan_type === "manual" ? (
                      <><User className="h-3 w-3 mr-1" /> Manual</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" /> Cron</>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3">
                  {entry.status === "success" ? (
                    <span className="text-xs">
                      <span className="text-muted-foreground">Found:</span>{" "}
                      <span className="font-medium">{entry.signals_detected}</span>
                      {entry.signals_saved > 0 && (
                        <span className="text-green-500 ml-1">
                          (+{entry.signals_saved} new)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-destructive">Error</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.executed_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
