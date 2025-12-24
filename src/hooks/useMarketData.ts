import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketData, TimeInterval } from "@/types/trading";

export function useMarketData(interval: TimeInterval = "1h", limit: number = 200) {
  return useQuery({
    queryKey: ["market-data", interval, limit],
    queryFn: async (): Promise<MarketData> => {
      // Get the current session to pass the user's access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Authentication required to fetch market data");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-data?interval=${interval}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to fetch market data");
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}