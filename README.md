# Mobile-First Simple Mode + Bug Fixes

Makes Simple Mode the default for mobile users and fixes several bugs.

## Bug Fixes

### 1. WelcomeModal Disabled
The "Welcome Aboard / Load Demo Data / Start Fresh" modal was showing when clicking "Explore Demo" on the landing page. This modal is now disabled - the landing page and demo mode selector handle everything.

### 2. Mobile Logout Button Fixed
The logout button in the mobile sidebar wasn't responding because the DemoBar overlay had a higher z-index (z-60+) than the sidebar (z-50). Fixed by increasing sidebar z-index to z-[80] when open.

## Mobile-First Changes

### 1. Mobile Default (useViewMode.ts)
- Mobile devices (< 768px) now default to Simple Mode
- Desktop users still get Full Mode by default
- User preference is saved in localStorage and persists

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
├── App.tsx                       # WelcomeModal disabled
├── hooks/
│   └── useViewMode.ts            # Mobile-first default logic
└── components/
    ├── Layout.tsx                # Higher z-index for mobile sidebar
    ├── MileageRun/
    │   ├── index.tsx             # View mode switch wrapper
    │   └── SimpleXPPlanner.tsx   # Responsive cabin grid
    └── XPEngine/
        └── SimpleXPEngine.tsx    # Responsive XP breakdown
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-mobile-simple-mode.zip
npm run build
```

## Z-Index Changes

| Component | Before | After |
|-----------|--------|-------|
| Mobile Sidebar | z-50 | z-[80] |
| Mobile Overlay | z-40 | z-[79] |
| DemoBar | z-[60] | z-[60] (unchanged) |

This ensures the sidebar is always on top when open on mobile.
