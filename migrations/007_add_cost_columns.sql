-- Migration: Add Cost Columns to Activity Transactions
-- Date: 2025-12-26
-- Description: Adds cost tracking columns to existing activity_transactions table
--
-- This is safe to run multiple times (uses IF NOT EXISTS pattern)

-- ============================================================================
-- 1. ADD COST COLUMNS TO EXISTING TABLE
-- ============================================================================

-- Add cost column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_transactions' AND column_name = 'cost'
  ) THEN
    ALTER TABLE activity_transactions ADD COLUMN cost DECIMAL(10,2) DEFAULT NULL;
    COMMENT ON COLUMN activity_transactions.cost IS 'Cost in cost_currency. NULL = unknown, 0 = free, >0 = actual cost.';
  END IF;
END $$;

-- Add cost_currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_transactions' AND column_name = 'cost_currency'
  ) THEN
    ALTER TABLE activity_transactions ADD COLUMN cost_currency TEXT DEFAULT 'EUR';
    COMMENT ON COLUMN activity_transactions.cost_currency IS 'Currency code for cost (default EUR).';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD INDEX FOR COST QUERIES (if not exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_tx_user_cost_null
  ON activity_transactions (user_id) 
  WHERE cost IS NULL;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Run this after the migration to verify:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activity_transactions'
ORDER BY ordinal_position;
