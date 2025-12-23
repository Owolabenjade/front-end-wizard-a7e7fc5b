-- Create table for scan history
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('manual', 'cron')),
  signals_detected INTEGER NOT NULL DEFAULT 0,
  signals_saved INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to scan history" 
ON public.scan_history 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_scan_history_executed_at ON public.scan_history(executed_at DESC);