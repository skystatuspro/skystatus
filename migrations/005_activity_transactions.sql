-- Migration: Activity Transactions Table
-- Date: 2025-12-25
-- Description: New unified table for all non-flight transactions (miles and XP)
--              with unique IDs for proper deduplication on re-import.
--
-- This table replaces the aggregated approach in:
--   - xp_ledger (for bonus XP like AMEX, donations, adjustments)
--   - miles_transactions (for non-flight miles)
--
-- Key features:
--   - Each transaction gets a unique, deterministic ID
--   - Re-importing the same PDF skips existing transactions (ON CONFLICT DO NOTHING)
--   - New transactions from updated PDFs are automatically added
--   - Supports both PDF imports and manual entries
--
-- Migration strategy: Hybrid
--   - Old tables remain for backwards compatibility
--   - use_new_transactions flag in profiles determines which system to use
--   - Users migrate automatically on first PDF import after deploy

-- ============================================================================
-- 1. CREATE ACTIVITY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_transactions (
  -- Composite primary key: user_id + id
  -- id is a deterministic hash based on date, type, amount, and description
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction data
  date DATE NOT NULL,
  type TEXT NOT NULL,           -- Transaction type (see comment below)
  description TEXT,             -- Original description from PDF
  
  -- Values - at least one should be non-zero
  -- Using NOT NULL DEFAULT 0 to avoid NULL arithmetic issues
  miles INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'pdf',  -- 'pdf' or 'manual'
  source_date DATE,                     -- PDF export date for freshness tracking
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Primary key
  PRIMARY KEY (user_id, id)
);

-- Document valid transaction types
COMMENT ON TABLE activity_transactions IS 
'Stores all non-flight transactions (miles and XP) with unique IDs for deduplication.

Valid type values:
  - subscription: Miles Complete, Discount Pass (can have XP)
  - amex: American Express card spend
  - amex_bonus: AMEX welcome/annual bonus (has XP)
  - hotel: Booking.com, Accor ALL (can have XP)
  - shopping: Amazon, Flying Blue Shop
  - partner: Currency Alliance, other partners
  - transfer_in: Family transfer, Revolut, Air Miles
  - transfer_out: Family transfer out (negative miles)
  - redemption: Award tickets (negative miles)
  - donation: Miles donation (negative miles, has XP bonus)
  - adjustment: Air adjustment, Klantenservice corrections
  - car_rental: Uber, rental car partners
  - expiry: Expired miles (negative)
  - other: Fallback for unrecognized types

The id field is a deterministic hash: tx-{date}-{type}-{miles}-{xp}-{hash(description)}
This ensures re-importing the same PDF produces the same IDs.';

COMMENT ON COLUMN activity_transactions.miles IS 'Miles amount. Positive for earned, negative for spent/redeemed.';
COMMENT ON COLUMN activity_transactions.xp IS 'XP amount. Usually 0, positive for bonus XP activities.';
COMMENT ON COLUMN activity_transactions.source IS 'Origin of transaction: pdf (imported) or manual (user entered).';
COMMENT ON COLUMN activity_transactions.source_date IS 'Export date of the PDF this transaction came from.';

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast aggregation by month (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_activity_tx_user_date 
  ON activity_transactions (user_id, date);

-- Filter by transaction type
CREATE INDEX IF NOT EXISTS idx_activity_tx_user_type 
  ON activity_transactions (user_id, type);

-- Filter by source (for bulk operations like "delete all PDF imports")
CREATE INDEX IF NOT EXISTS idx_activity_tx_user_source 
  ON activity_transactions (user_id, source);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE activity_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own transactions
CREATE POLICY "Users can view own activity_transactions"
  ON activity_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity_transactions"
  ON activity_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity_transactions"
  ON activity_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity_transactions"
  ON activity_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_activity_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activity_transactions_updated_at ON activity_transactions;

CREATE TRIGGER activity_transactions_updated_at
  BEFORE UPDATE ON activity_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_transactions_updated_at();

-- ============================================================================
-- 5. MIGRATION FLAG IN PROFILES
-- ============================================================================

-- Add column to track which users have migrated to new system
-- FALSE = use legacy tables (xp_ledger, miles_transactions)
-- TRUE = use activity_transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'use_new_transactions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN use_new_transactions BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

COMMENT ON COLUMN profiles.use_new_transactions IS 
'Migration flag for transaction-based deduplication.
FALSE (default): Read from legacy xp_ledger and miles_transactions tables.
TRUE: Read from new activity_transactions table.
Automatically set to TRUE on first PDF import after this migration.';

-- ============================================================================
-- 6. VERIFICATION QUERY (run manually to verify)
-- ============================================================================

-- After running this migration, verify with:
-- 
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'activity_transactions'
-- ORDER BY ordinal_position;
--
-- And check RLS:
-- SELECT * FROM pg_policies WHERE tablename = 'activity_transactions';
