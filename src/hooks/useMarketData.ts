import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketData, TimeInterval } from "@/types/trading";

export function useMarketData(interval: TimeInterval = "1h", limit: number = 200) {
  return useQuery({
    queryKey: ["market-data", interval, limit],
    queryFn: async (): Promise<MarketData> => {
      const { data, error } = await supabase.functions.invoke("binance-data", {
        body: null,
        headers: {},
      });

      // Use query params via URL construction since invoke doesn't support query params directly
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-data?interval=${interval}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch market data");
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}
