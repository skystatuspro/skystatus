# PDF Parser + Data Fixes

Comprehensive fixes for PDF parsing, XP calculation, and data handling.

## Critical Fix: XP Rollover Calculation

**Problem:** When reaching a new status, XP earned on the same day was counted entirely in the NEW cycle instead of being split correctly.

**Solution:** 
1. PDF import now **replaces** all data instead of merging
2. Rollover XP is **automatically calculated** by processing flights chronologically
3. The exact XP "left over" after reaching threshold becomes the starting XP

## Other Bug Fixes

### 1. Wrong Flight Dates
Now uses actual flight date instead of posting date.

### 2. Multi-Currency Support  
Works for all currencies (EUR, NOK, SEK, GBP, USD, etc.)

### 3. Flight Costs Not Summed
ticketPrice now aggregates into cost_flight.

### 4. Transavia Partner Flights
Regex matches all languages: gespaarde|earned|Miles|acquis|gesammelt

### 5. Bonus XP Items
"Miles+Points first flight bonus" (0 Miles, 5 XP) now detected.

### 6. JSON Restore Autosave
Always triggers markDataChanged after import.

## Files Included

```
src/
├── App.tsx                    # Updated PDF import handler
├── hooks/
│   └── useUserData.ts         # Replace mode + startingXP
├── utils/
│   ├── parseFlyingBluePdf.ts  # All parsing fixes
│   ├── flight-intake.ts       # Cost aggregation
│   └── xp-logic.ts            # calculateRolloverXP function
└── components/
    ├── SettingsModal.tsx      # JSON restore autosave
    └── PdfImportModal.tsx     # Rollover calculation
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-pdf-date-fix.zip
npm run build
```

## Important: Replace Mode

PDF import now replaces all data instead of merging. This ensures XP calculations are always accurate.
