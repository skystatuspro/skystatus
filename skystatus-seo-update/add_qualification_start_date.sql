-- Migration: Add qualification_start_date column to profiles table
-- Purpose: Store the exact date of status upgrade for precise XP filtering
-- 
-- Problem: When a user upgrades mid-month (e.g., 6 Aug 2025), flights before
-- that date should NOT count toward the new cycle's XP. Previously only the
-- month was stored, causing flights from 1-5 Aug to be incorrectly included.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS qualification_start_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.qualification_start_date IS 
  'Exact date of status upgrade (YYYY-MM-DD). Used to filter flights - only flights ON or AFTER this date count toward the current qualification cycle XP.';
