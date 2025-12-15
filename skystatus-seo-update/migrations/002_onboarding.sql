-- SkyStatus Pro - Onboarding Feature Migration
-- Run this in your Supabase SQL Editor

-- Add onboarding and profile fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS miles_balance INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_uxp INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding wizard';
COMMENT ON COLUMN profiles.email_consent IS 'Whether user opted in for email updates';
COMMENT ON COLUMN profiles.miles_balance IS 'Current Flying Blue miles balance (manual entry or from PDF)';
COMMENT ON COLUMN profiles.current_uxp IS 'Current Ultimate XP (for Platinum/Ultimate members)';

-- Note: home_airport and currency columns should already exist from previous migrations
-- If they don't exist, uncomment the following:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_airport TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
