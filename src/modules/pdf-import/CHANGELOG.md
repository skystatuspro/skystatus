# Changelog

All notable changes to the PDF Import Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-12-17

### Fixed
- **Cycle Start Month Calculation**: Now correctly calculates the first of the next month
  - PDF "beginnend op" dates are often the level-up day itself (incorrect)
  - Flying Blue rule: qualify in month X → cycle starts 1st of month X+1
  - Example: Level up March 31 → cycle starts April 1 (2025-04)
- `LevelChangeEvent.cycleStartMonth` is now the CALCULATED correct month
- `LevelChangeEvent.cycleStartDate` keeps the raw PDF date (for reference)

### Changed
- Added `calculateCycleStartMonth()` helper function
- Added `calculateCycleEndMonth()` helper function
- `detectStatusExtended()` now uses calculated cycle months

## [2.1.0] - 2025-12-17

### Added
- **Journey Detection**: Extract complete status progression history from PDF
  - `detectLevelChanges()`: Find Silver/Gold/Platinum/Ultimate achievements with dates
  - `detectBonusXPEvents()`: Extract non-flight XP sources:
    - AMEX Welcome bonus (60 XP)
    - AMEX Annual bonus (15 XP)
    - Miles donation XP rewards
    - First flight bonus (5 XP)
    - Discount Pass subscriptions
    - Air adjustments (retroactive corrections)
    - Hotel bonus XP (Accor status benefits)
  - `detectFirstFlightDate()`: Find first flight from "Miles+Points first flight bonus"
  - `buildJourneyTimeline()`: Build milestone timeline for Profile page
  - `detectStatusExtended()`: All-in-one extended status detection
- New exported types:
  - `LevelChangeEvent`: Status achievement with date, XP deducted, rollover
  - `BonusXPEvent`: Non-flight XP with source and amount
  - `BonusXPSource`: Enum of bonus XP types
  - `JourneyMilestone`: Status milestone for timeline display
  - `ExtendedDetectedStatus`: Full status info including journey
- Export `STATUS_THRESHOLDS` constant for status level requirements

### Changed
- Status detector now tracks rollover XP from "Surplus XP beschikbaar" events
- Improved cycle boundary detection with explicit start/end dates from PDF
- Extended status detection extracts cycle dates from "kwalificatieperiode eindigend/beginnend op" patterns

### Fixed
- Rollover XP now correctly parsed from PDF instead of being calculated

## [2.0.0] - 2024-12-17

### Added
- Complete module restructure with protected status
- Comprehensive type definitions in `types.ts`
- Public API in `index.ts`
- Module documentation in `README.md`
- Directory structure for all submodules:
  - `core/` - Parser and extractors
  - `calculators/` - XP calculations
  - `locales/` - Multi-language support
  - `utils/` - Helper functions
  - `__tests__/` - Test files

### Changed
- Module is now isolated in `src/modules/pdf-import/`
- All files require WARNING header
- Strict typing for all data flows

### Fixed
- Parameter chain issue (cycleSettings, bonusXpByMonth now properly typed)
- Type definitions include all required fields

### Security
- Module marked as PROTECTED
- Changes require following documented process

## [1.0.0] - Previous

### Note
Version 1.0 was the original `parseFlyingBluePdf.ts` file in `src/utils/`.
It had issues with:
- Parameter chain broken between components
- Missing bonusXpByMonth parameter
- Incomplete cycleSettings (missing cycleStartDate, startingXP)
- No conflict detection
- No undo/snapshot support
- 1028 lines in single modal file

---

## Upgrade Guide

### From 1.x to 2.0

The v2.0 module is a complete rewrite. Migration steps:

1. Import from `@/modules/pdf-import` instead of `@/utils/parseFlyingBluePdf`
2. Use new `PdfImportResult` type
3. Handle conflicts using `detectConflicts()` 
4. Use `resolveImport()` to prepare final data
5. Update `useUserData.handlePdfImport` to accept `ResolvedImportData`

```typescript
// OLD (v1.x)
import { parseFlyingBlueText } from '@/utils/parseFlyingBluePdf';
const result = parseFlyingBlueText(text);

// NEW (v2.0)
import { parsePdf, detectConflicts, resolveImport } from '@/modules/pdf-import';
const result = await parsePdf(file, options);
const conflicts = detectConflicts(result, existingFlights, existingMiles);
const importData = resolveImport(result, conflicts);
```
