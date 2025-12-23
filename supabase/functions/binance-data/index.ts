import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorData {
  candles: Candle[];
  ema8: number[];
  ema13: number[];
  ema21: number[];
  ema50: number[];
  ema200: number[];
  rsi14: number[];
  macd: { macd: number; signal: number; histogram: number }[];
  bollingerBands: { upper: number; middle: number; lower: number }[];
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first EMA value
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  for (let i = period; i < gains.length + 1; i++) {
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return rsi;
}

// Calculate MACD
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number }[] {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) {
      macdLine[i] = ema12[i] - ema26[i];
    }
  }
  
  const signalLine = calculateEMA(macdLine.filter(v => v !== undefined), 9);
  
  const result: { macd: number; signal: number; histogram: number }[] = [];
  let signalIndex = 0;
  
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== undefined) {
      const signal = signalLine[signalIndex] || 0;
      result[i] = {
        macd: macdLine[i],
        signal: signal,
        histogram: macdLine[i] - signal,
      };
      signalIndex++;
    }
  }
  
  return result;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number }[] {
  const bands: { upper: number; middle: number; lower: number }[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    bands[i] = {
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std,
    };
  }
  
  return bands;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const interval = url.searchParams.get("interval") || "1h";
    const limit = parseInt(url.searchParams.get("limit") || "200");
    
    console.log(`Fetching Binance data: interval=${interval}, limit=${limit}`);

    // Fetch klines data from Binance
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
    const klinesResponse = await fetch(klinesUrl);
    
    if (!klinesResponse.ok) {
      throw new Error(`Binance API error: ${klinesResponse.status}`);
    }
    
    const klinesData = await klinesResponse.json();
    
    // Fetch 24h ticker data
    const tickerUrl = "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT";
    const tickerResponse = await fetch(tickerUrl);
    const tickerData = await tickerResponse.json();
    
    // Parse candles
    const candles: Candle[] = klinesData.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
    
    const closePrices = candles.map(c => c.close);
    
    // Calculate all indicators
    const result: IndicatorData = {
      candles,
      ema8: calculateEMA(closePrices, 8),
      ema13: calculateEMA(closePrices, 13),
      ema21: calculateEMA(closePrices, 21),
      ema50: calculateEMA(closePrices, 50),
      ema200: calculateEMA(closePrices, 200),
      rsi14: calculateRSI(closePrices, 14),
      macd: calculateMACD(closePrices),
      bollingerBands: calculateBollingerBands(closePrices, 20, 2),
      currentPrice: parseFloat(tickerData.lastPrice),
      priceChange24h: parseFloat(tickerData.priceChange),
      priceChangePercent24h: parseFloat(tickerData.priceChangePercent),
      high24h: parseFloat(tickerData.highPrice),
      low24h: parseFloat(tickerData.lowPrice),
      volume24h: parseFloat(tickerData.volume),
    };
    
    console.log(`Successfully processed ${candles.length} candles with indicators`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching Binance data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
