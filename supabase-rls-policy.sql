-- Enable anonymous inserts for guide error reports
-- Run this in your Supabase SQL Editor

-- Option 1: Allow anonymous inserts (recommended for public feedback)
CREATE POLICY "Allow anonymous feedback inserts" ON feedback
FOR INSERT
TO anon
WITH CHECK (true);

-- If you want to be more restrictive, use Option 2 instead:
-- Only allow inserts with specific trigger types
-- CREATE POLICY "Allow guide error reports" ON feedback
-- FOR INSERT
-- TO anon
-- WITH CHECK (trigger = 'guide_error_report');
