# PDF Parser + Data Fixes

Comprehensive fixes for PDF parsing and data handling issues.

## Bug Fixes

### 1. Wrong Flight Dates
Flight dates from PDF imports were using the posting date instead of actual flight date.

**Fix:** Added `^` anchor to regex and fallback pattern for date extraction.

### 2. Multi-Currency Support  
The `isRevenue` check only worked for euros.

**Fix:** Now matches "bestede|spent|dépensés|ausgegeben" for all currencies.

### 3. Flight Costs Not Summed
Ticket prices weren't being aggregated in total cost calculations.

**Fix:** Now properly adds `ticketPrice` to `cost_flight` in ledger rebuild.

### 4. Transavia Partner Flights
Partner flights like "AMS – PDL TRANSAVIA HOLLAND" weren't recognized from English PDFs.

**Fix:** Regex now matches "gespaarde|earned|Miles|acquis|gesammelt".

### 5. Bonus XP Items
Items like "Miles+Points first flight bonus" (0 Miles, 5 XP) were ignored.

**Fix:** Added detection for bonus XP items, stored in manual ledger as `miscXp`.

### 6. JSON Restore Autosave
After clearing data and restoring from JSON, changes weren't saved.

**Fix:** Always triggers `markDataChanged` after JSON import.

## Files Included

```
src/
├── App.tsx                    # Updated PDF import handler
├── hooks/
│   └── useUserData.ts         # BonusXP handling in PDF import
├── utils/
│   ├── parseFlyingBluePdf.ts  # All parsing fixes
│   └── flight-intake.ts       # Cost aggregation fix
└── components/
    ├── SettingsModal.tsx      # JSON restore autosave
    └── PdfImportModal.tsx     # Extract and pass bonus XP
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-pdf-date-fix.zip
npm run build
```

## Testing

After applying this fix, re-import a Flying Blue PDF and verify:
1. Flight dates match the "op [date]" shown in the PDF
2. Flights are correctly assigned to their actual flight dates, not posting dates

## Languages Supported

The fix works for all supported languages:
- Dutch: "op 29 nov 2025"
- English: "on 29 Nov 2025"  
- French: "le 29 nov 2025"
- German: "am 29. Nov 2025"
