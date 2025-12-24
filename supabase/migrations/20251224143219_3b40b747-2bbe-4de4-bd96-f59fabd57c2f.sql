-- Drop existing public access policies
DROP POLICY IF EXISTS "Allow public read access to signals" ON trade_signals;
DROP POLICY IF EXISTS "Allow public read access to settings" ON bot_settings;
DROP POLICY IF EXISTS "Allow public read access to scan history" ON scan_history;
DROP POLICY IF EXISTS "Allow public update to settings" ON bot_settings;

-- Create authenticated-only read policies
CREATE POLICY "Authenticated users can read signals"
ON trade_signals FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read settings"
ON bot_settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read scan history"
ON scan_history FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to update settings
CREATE POLICY "Authenticated users can update settings"
ON bot_settings FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');