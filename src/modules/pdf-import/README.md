# PDF Import Module v2.0

> ⚠️ **PROTECTED MODULE** - Do not modify without authorization

## Overview

This module handles all PDF import functionality for SkyStatus Pro. It parses Flying Blue transaction history PDFs and extracts:

- Flights with XP, Miles, and SAF bonus
- Miles from all sources (flights, credit cards, hotels, etc.)
- Status level and cycle information
- Requalification events
- Official balances (XP, UXP, Miles)

## Why This Module is Protected

The PDF import is the primary way users get their data into SkyStatus Pro. Bugs in this module can cause:

1. **Data loss** - User data could be overwritten or deleted
2. **Incorrect XP calculations** - Users see wrong status progression
3. **Missing flights** - Important flights not imported
4. **Trust issues** - Users lose confidence in the app

Previous issues have included:
- Parameter chain broken (parameters lost between components)
- Rollover XP not calculated correctly
- Bonus XP not detected
- Race conditions with new user data loading

## Before Making Changes

1. **Read this entire README**
2. **Run all tests**: `npm run test:pdf-import`
3. **Test with real PDFs** in all 7 supported languages
4. **Update CHANGELOG.md** with your changes
5. **Update VERSION** following semver

## Directory Structure

```
src/modules/pdf-import/
├── index.ts              # Public API - ONLY IMPORT FROM HERE
├── types.ts              # All type definitions
├── VERSION               # Current version (semver)
├── README.md             # This file
├── CHANGELOG.md          # Change history
│
├── core/                 # Core parsing logic
│   ├── parser.ts         # PDF → Raw Text
│   ├── tokenizer.ts      # Raw Text → Structured Lines
│   ├── flight-extractor.ts
│   ├── miles-extractor.ts
│   ├── xp-extractor.ts
│   ├── status-detector.ts
│   ├── balance-extractor.ts
│   └── conflict-detector.ts
│
├── calculators/
│   └── rollover.ts       # Rollover XP calculation
│
├── locales/              # Multi-language support
│   ├── month-patterns.ts
│   ├── currency-patterns.ts
│   ├── transaction-patterns.ts
│   └── status-patterns.ts
│
├── utils/
│   ├── date-parser.ts
│   ├── number-parser.ts
│   └── validators.ts
│
└── __tests__/            # Unit tests
```

## Usage

```typescript
import { 
  parsePdf, 
  detectConflicts,
  resolveImport,
  type PdfImportResult,
  type ResolvedImportData 
} from '@/modules/pdf-import';

// Parse PDF
const result = await parsePdf(file, {
  existingFlights: [],
  existingMiles: [],
  userCurrency: 'EUR'
});

if (!result.success) {
  console.error(result.error);
  return;
}

// Detect conflicts
const conflicts = detectConflicts(
  result,
  existingFlights,
  existingMiles
);

// Let user resolve conflicts...
// conflicts.forEach(c => c.resolution = 'keep_existing' | 'use_incoming' | 'keep_both')

// Get final import data
const importData = resolveImport(result, conflicts);

// Pass to useUserData
await processPdfImport(importData);
```

## Supported Languages

| Code | Language   | Status |
|------|------------|--------|
| EN   | English    | ✅ Full |
| NL   | Dutch      | ✅ Full |
| FR   | French     | ✅ Full |
| DE   | German     | ✅ Full |
| ES   | Spanish    | ✅ Full |
| PT   | Portuguese | ✅ Full |
| IT   | Italian    | ✅ Full |

## Supported Currencies

EUR, USD, GBP, CAD, CHF, AUD, SEK, NOK, DKK, PLN

## Key Principles

### 1. Always Add, Never Overwrite
- New flights are **added** to existing data
- Exact duplicates are **auto-skipped**
- Fuzzy matches require **user confirmation**
- Manual entries are **never touched**

### 2. Official Balances are Truth
The XP and Miles balances shown in the PDF are the **source of truth**. If our calculations differ, we store a correction rather than ignore the official number.

### 3. Snapshot Before Import
Before any import, a snapshot is created. Users can always undo the last import with one click.

### 4. Type Safety
All data flows through strictly typed interfaces. The `types.ts` file is the contract - don't break it.

## Common Issues & Solutions

### "XP doesn't match PDF"
The PDF shows official XP. If flights alone don't add up, there's bonus XP (first flight, hotels, promos). Check `bonusXpByMonth` in the result.

### "Flights not importing"
Check if they're being flagged as duplicates. The match is on `date + route`, not flight number (flight numbers can change).

### "Wrong cycle start date"
Look for requalification events in the PDF. The most recent one determines the current cycle.

### "Rollover XP not calculated"
Rollover XP comes from flights **before** the requalification date. Make sure `requalificationDate` is correctly detected.

## Testing

```bash
# Run all PDF import tests
npm run test:pdf-import

# Run specific test file
npm test -- flight-extractor.test.ts

# Run with coverage
npm run test:pdf-import -- --coverage
```

### Test PDFs
Store test PDFs in `__tests__/fixtures/`. Include:
- One PDF per supported language
- PDFs with requalifications
- PDFs with partner flights
- PDFs with various bonus XP types

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for full history.

## Contact

For questions about this module, check with the maintainer before making changes.
