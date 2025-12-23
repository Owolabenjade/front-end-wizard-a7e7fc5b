-- Add policy for public updates to bot_settings (for demo purposes)
-- In production, this should require authentication
CREATE POLICY "Allow public update to settings"
ON public.bot_settings
FOR UPDATE
USING (true)
WITH CHECK (true);