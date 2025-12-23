import { useState, useEffect, useCallback, useRef } from "react";

export interface RealtimePrice {
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: Date;
}

export const useRealtimePrice = () => {
  const [data, setData] = useState<RealtimePrice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Binance WebSocket for 24hr ticker
      const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to Binance");
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const ticker = JSON.parse(event.data);
          
          setData({
            price: parseFloat(ticker.c), // Current price
            priceChange: parseFloat(ticker.p), // Price change
            priceChangePercent: parseFloat(ticker.P), // Price change percent
            high24h: parseFloat(ticker.h), // High price
            low24h: parseFloat(ticker.l), // Low price
            volume24h: parseFloat(ticker.v), // Volume
            lastUpdate: new Date(),
          });
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError("Max reconnection attempts reached");
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to create WebSocket connection");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    reconnect: connect,
  };
};
