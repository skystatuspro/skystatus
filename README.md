# Mobile-First Simple Mode

Makes Simple Mode the default for mobile users and improves mobile responsiveness.

## What's Changed

### 1. Mobile Default (useViewMode.ts)
- Mobile devices (< 768px) now default to Simple Mode
- Desktop users still get Full Mode by default
- User preference is saved in localStorage and persists
- Users can always switch between modes via the toggle

### 2. SimpleXPPlanner Mobile Improvements
- Cabin class buttons: 2 columns on mobile, 4 on desktop
- Fixed NaN bug with Premium Economy
- Fixed "to Ultimate" text (now says "to requalify" for Platinum)

### 3. SimpleXPEngine Mobile Improvements
- XP breakdown grid: smaller gap and text on mobile
- Better readability on small screens

## Files Included

```
src/
├── hooks/
│   └── useViewMode.ts          # Mobile-first default logic
└── components/
    ├── MileageRun/
    │   ├── index.tsx           # View mode switch wrapper
    │   └── SimpleXPPlanner.tsx # Responsive cabin grid
    └── XPEngine/
        └── SimpleXPEngine.tsx  # Responsive XP breakdown
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-mobile-simple-mode.zip
npm run build
```

## How Mobile Detection Works

```typescript
const MOBILE_BREAKPOINT = 768; // Same as Tailwind's md breakpoint

function isMobileDevice(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getDefaultMode(): ViewMode {
  return isMobileDevice() ? 'simple' : 'full';
}
```

## Behavior

| Device | First Visit | After Preference Set |
|--------|-------------|---------------------|
| Mobile (< 768px) | Simple Mode | User's choice |
| Desktop (≥ 768px) | Full Mode | User's choice |

Once a user clicks "Full View" or "Simple" toggle, their preference is saved and used on future visits regardless of device type.

## Responsive Changes Summary

| Component | Mobile | Desktop |
|-----------|--------|---------|
| XP Planner cabin buttons | 2×2 grid | 4×1 row |
| XP Engine breakdown | Smaller text/gap | Normal text/gap |
| All Simple components | Single column focus | Wider layouts |
