# Mobile-First Simple Mode + Bug Fixes

Makes Simple Mode the default for mobile users and fixes several bugs including a critical XP calculation issue.

## Critical Fix: XP Rollover Calculation

**Problem:** When reaching a new status (e.g., Silver→Gold), XP earned on the same day as the level-up was incorrectly counted entirely in the NEW cycle instead of being split correctly.

**Solution:** 
1. PDF import now **replaces** all data instead of merging (eliminates conflicts)
2. Rollover XP is **automatically calculated** by processing flights chronologically
3. The exact amount of XP "left over" after reaching a threshold becomes the starting XP for the new cycle

**Example:** If you earned 170 XP on August 6th and reached the Gold threshold (180 XP) partway through, the system now correctly calculates that only the excess XP (e.g., 70 XP) belongs to the new Gold cycle.

## Other Bug Fixes

### 1. WelcomeModal Disabled
The "Welcome Aboard" modal no longer shows when clicking "Explore Demo".

### 2. Mobile Logout Button Fixed
Increased sidebar z-index to z-[80] so it's above the DemoBar overlay.

### 3. PDF Flight Date Parser Fixed
Now uses actual flight date instead of posting date. Supports all languages and currencies.

### 4. Flight Costs Not Aggregated
ticketPrice now properly aggregates into cost_flight.

### 5. Transavia Partner Flights Not Parsed
Regex now matches "gespaarde|earned|Miles|acquis|gesammelt" for all languages.

### 6. Bonus XP Items Not Parsed
Items like "Miles+Points first flight bonus" (0 Miles, 5 XP) now detected and stored as miscXp.

### 7. JSON Restore Doesn't Trigger Autosave
Now always triggers markDataChanged after JSON import.

## Mobile-First Changes

- Mobile devices (< 768px) default to Simple Mode
- Desktop users get Full Mode by default  
- Preference saved in localStorage

## Files Included

```
src/
├── App.tsx                         # PDF import with rollover display
├── hooks/
│   ├── useViewMode.ts              # Mobile-first default logic
│   └── useUserData.ts              # Replace mode + startingXP
├── utils/
│   ├── parseFlyingBluePdf.ts       # All parsing fixes
│   ├── flight-intake.ts            # Cost aggregation
│   └── xp-logic.ts                 # calculateRolloverXP function
└── components/
    ├── Layout.tsx                  # Mobile sidebar z-index
    ├── SettingsModal.tsx           # JSON restore autosave
    ├── PdfImportModal.tsx          # Rollover calculation
    ├── MileageRun/
    │   ├── index.tsx
    │   └── SimpleXPPlanner.tsx
    └── XPEngine/
        └── SimpleXPEngine.tsx
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-mobile-simple-mode.zip
npm run build
```

## Important: Replace Mode

PDF import now uses **replace mode**:
- All existing flights/miles replaced with PDF data
- Manual XP corrections cleared (no longer needed)
- Bonus XP from PDF preserved

This ensures XP calculations are always accurate.
