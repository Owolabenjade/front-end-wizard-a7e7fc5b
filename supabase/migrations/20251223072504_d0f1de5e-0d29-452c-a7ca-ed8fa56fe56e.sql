-- Create enum for signal types
CREATE TYPE public.signal_type AS ENUM ('ema_bounce', 'macd_cross', 'rsi_reversal', 'bollinger_breakout');

-- Create enum for signal direction
CREATE TYPE public.signal_direction AS ENUM ('long', 'short');

-- Create enum for signal status
CREATE TYPE public.signal_status AS ENUM ('active', 'triggered', 'expired', 'cancelled');

-- Create trade_signals table to store detected signals
CREATE TABLE public.trade_signals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy signal_type NOT NULL,
    direction signal_direction NOT NULL,
    status signal_status NOT NULL DEFAULT 'active',
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    entry_price DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8) NOT NULL,
    take_profit DECIMAL(20, 8) NOT NULL,
    risk_reward DECIMAL(5, 2) NOT NULL,
    reason TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '1h',
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    triggered_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    close_price DECIMAL(20, 8),
    pnl_percent DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bot_settings table to store configuration
CREATE TABLE public.bot_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tables (public read for dashboard, no write from client)
ALTER TABLE public.trade_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard viewing
CREATE POLICY "Allow public read access to signals"
ON public.trade_signals
FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to settings"
ON public.bot_settings
FOR SELECT
USING (true);

-- Insert default bot settings
INSERT INTO public.bot_settings (setting_key, setting_value, description) VALUES
('ema_periods', '{"ema8": 8, "ema13": 13, "ema21": 21, "ema50": 50, "ema200": 200}', 'EMA period configurations'),
('rsi_settings', '{"period": 14, "overbought": 70, "oversold": 30}', 'RSI indicator settings'),
('macd_settings', '{"fast": 12, "slow": 26, "signal": 9}', 'MACD indicator settings'),
('bollinger_settings', '{"period": 20, "stdDev": 2}', 'Bollinger Bands settings'),
('risk_settings', '{"stopLossPercent": 2, "takeProfitPercent": 4, "minRiskReward": 2}', 'Risk management settings'),
('enabled_strategies', '{"ema_bounce": true, "macd_cross": true, "rsi_reversal": true, "bollinger_breakout": true}', 'Which strategies are enabled');

-- Create index for faster queries
CREATE INDEX idx_trade_signals_detected_at ON public.trade_signals(detected_at DESC);
CREATE INDEX idx_trade_signals_status ON public.trade_signals(status);