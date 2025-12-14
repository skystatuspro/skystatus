# Simple Mode: XP Planner

The final Simple Mode component - a streamlined XP calculator with real-time feedback.

## What's New

**SimpleXPPlanner** provides:
- Compact status bar with progress
- Real-time XP calculation (no button needed!)
- Cabin class as visual pills with multiplier info
- Return/one-way toggle in results panel
- "After this trip" preview showing new XP total
- Visual feedback when target would be reached

## Bugfixes Included

- Fixed `NaN` error when selecting Premium Economy (was using `'PremiumEconomy'` instead of `'Premium Economy'`)
- Fixed same issue in Full View's report form

## Files

- `src/components/MileageRun/SimpleXPPlanner.tsx` - New simplified component
- `src/components/MileageRun/index.tsx` - Updated with view mode switch

## Installation

```bash
cd skystatus-main
unzip -o skystatus-simple-xpplanner.zip
npm run build
```

## Simple Mode Features

The SimpleXPPlanner focuses on the core use case: "How much XP will this flight earn?"

**Removed from Simple view:**
- Calculate button (now real-time)
- Popular routes section
- Cost/efficiency analysis
- Marginal yield calculations
- Segment-by-segment breakdown
- Report discrepancy form
- Distance band insights

**Kept in Simple view:**
- Route input with validation
- Cabin class selection (as visual pills)
- Return trip toggle
- Real-time XP result with progress preview
- Link to Full View for advanced features

## Component Structure

```
MileageRun/
├── index.tsx          # Wrapper with view mode switch
├── SimpleXPPlanner.tsx # New simple component
├── components.tsx     # Full view components
├── constants.ts       # Shared constants
├── helpers.ts         # Shared helpers
└── types.ts           # Shared types
```

## Design Decisions

**Why show progress preview?**
Users want to know if a flight gets them to their goal. The "After this flight" section answers this immediately.

**Why popular routes?**
Quick access to common mileage runs from AMS. One tap populates the route.

**Why keep cabin selector?**
XP varies significantly by cabin. Business class earns more than Economy.
