-- Add deny policies for write operations on trade_signals
-- Edge Functions use service role which bypasses RLS, so they can still write

-- Deny all INSERT operations from clients
CREATE POLICY "Prevent direct INSERT on trade_signals"
ON trade_signals FOR INSERT
WITH CHECK (false);

-- Deny all UPDATE operations from clients
CREATE POLICY "Prevent direct UPDATE on trade_signals"
ON trade_signals FOR UPDATE
USING (false)
WITH CHECK (false);

-- Deny all DELETE operations from clients
CREATE POLICY "Prevent direct DELETE on trade_signals"
ON trade_signals FOR DELETE
USING (false);