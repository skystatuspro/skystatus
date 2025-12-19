-- Migration: Add pdf_baseline column to profiles table
-- This stores the PDF header values (XP, UXP, Miles, Status) as the source of truth

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pdf_baseline JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.pdf_baseline IS 'Stores PDF header values as source of truth: {xp, uxp, miles, status, pdfExportDate, importedAt, cycleStartMonth, cycleStartDate, rolloverXP}';

-- Index for faster queries (optional, only if querying by baseline values)
-- CREATE INDEX IF NOT EXISTS idx_profiles_pdf_baseline ON profiles USING GIN (pdf_baseline);
