-- Migration: Add miles_correction support
-- Date: 2025-12-19
-- Description: Enable miles_correction tracking via existing source column

-- The miles_transactions table already uses a 'source' column to differentiate
-- transaction types (subscription, amex, flight, other, debit).
-- 
-- This migration documents that we're now using 'correction' as a valid source type.
-- No schema change is needed since 'source' is a text column.
--
-- The 'correction' source stores the difference between:
--   - PDF header miles balance (source of truth)
--   - Calculated miles from all existing transactions
--
-- This allows the Miles Engine to display accurate balances that match
-- the official Flying Blue statement.

-- Verify the miles_transactions table structure (informational only)
-- The 'source' column should already exist as text type

COMMENT ON TABLE miles_transactions IS 
'Tracks miles transactions by month and source type.
Valid source values: subscription, amex, flight, other, debit, correction.
The correction source stores PDF import adjustments to align calculated values with official balances.';

-- Optional: Add a check constraint if you want to enforce valid source values
-- (Only uncomment if you want strict validation)
-- ALTER TABLE miles_transactions 
-- ADD CONSTRAINT miles_transactions_source_check 
-- CHECK (source IN ('subscription', 'amex', 'flight', 'other', 'debit', 'correction'));
