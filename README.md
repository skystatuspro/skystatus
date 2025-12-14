# Filip's XP Calculation Bug Fix

## Problem

When a user upgrades status mid-month (e.g., from Silver to Gold on **6 August 2025**), 
the XP calculation was incorrectly including flights from the **entire month** 
(1 August onwards) instead of only flights **on or after the upgrade date**.

### Example (Filip's case):
- Status upgrade: Silver → Gold on **6 August 2025**
- Flights 1-6 August: 65 XP (should NOT count for Gold cycle)
- Flights 7 August onwards: counted correctly
- Rollover XP: 3 XP

**Before fix:** 223 XP (included the 65 XP before upgrade)
**After fix:** 223 - 65 + 3 = 161 XP (correct)

## Root Cause

The system stored `cycleStartMonth` (e.g., "2025-08") but not the exact date.
All flights in that month were included, even those before the actual upgrade.

## Solution

Added `cycleStartDate` (full date: "2025-08-06") to filter flights precisely.

## Files Changed

1. **src/types.ts** - Added `cycleStartDate?: string` to QualificationSettings
2. **src/hooks/useUserData.ts** - Load/save cycleStartDate, pass to import
3. **src/utils/xp-logic.ts** - Filter flights by exact date in aggregateFlightsByMonth
4. **src/lib/dataService.ts** - Add qualification_start_date to profile save/load
5. **src/components/PdfImportModal.tsx** - Extract full date from requalification events

## Database Migration

Run this SQL in Supabase:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS qualification_start_date DATE;
```

## Installation

```bash
cd skystatus-main

# Unzip (preserves directory structure)
unzip -o skystatus-filip-xp-fix.zip

# Build
npm run build
```

## Database Migration (IMPORTANT!)

Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS qualification_start_date DATE;
```

## For Existing Users

Users who already imported their PDF will need to either:
1. Re-import their PDF (the system will now correctly extract the full date)
2. Or manually set their cycle start date in Profile settings

## Testing

1. Clear data
2. Log out
3. Log in
4. Import PDF with mid-month status upgrade
5. Check XP - should now be correct on first try
