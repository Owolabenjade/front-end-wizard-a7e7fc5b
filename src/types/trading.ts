export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MACDValue {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBand {
  upper: number;
  middle: number;
  lower: number;
}

export interface MarketData {
  candles: Candle[];
  ema8: number[];
  ema13: number[];
  ema21: number[];
  ema50: number[];
  ema200: number[];
  rsi14: number[];
  macd: MACDValue[];
  bollingerBands: BollingerBand[];
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export type TimeInterval = "1h" | "4h" | "1d";
