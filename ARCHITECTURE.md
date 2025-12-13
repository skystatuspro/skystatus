# SkyStatus Architecture

Technical documentation for developers working on SkyStatus.

## Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard/        # Command Center (modular)
│   │   ├── index.tsx     # Main Dashboard component
│   │   ├── helpers.tsx   # Status themes, helpers, types
│   │   ├── KPICard.tsx   # KPI card component
│   │   └── RiskMonitor.tsx # Risk analysis sidebar
│   │
│   ├── XPEngine/         # XP Qualification (modular)
│   │   ├── index.tsx     # Main XPEngine component
│   │   ├── helpers.tsx   # Themes, formatters, StatusPill, InputCell
│   │   ├── CycleSetupForm.tsx # Qualification settings form
│   │   ├── StatusCard.tsx # Status gauge card
│   │   ├── ProgressionChart.tsx # Monthly XP bar chart
│   │   └── LedgerTable.tsx # XP ledger with editable cells
│   │
│   ├── MilesEngine/      # Miles tracking (modular)
│   │   ├── index.tsx     # Main MilesEngine component
│   │   ├── helpers.tsx   # formatCPM, utilities
│   │   └── components.tsx # KPICard, charts, SourceEfficiencyCard
│   │
│   ├── Analytics.tsx     # Analytics dashboard
│   ├── FlightIntake.tsx  # Add flight form
│   ├── FlightLedger.tsx  # Flight list/management
│   ├── RedemptionCalc.tsx # Redemption analyzer
│   ├── MileageRun.tsx    # XP run simulator
│   ├── PdfImportModal.tsx # Flying Blue PDF import
│   ├── SharedLedger.tsx  # Reusable ledger table
│   └── ...
│
├── hooks/
│   └── useUserData.ts    # Central state management hook
│
├── lib/
│   ├── supabase.ts       # Supabase client initialization
│   ├── dataService.ts    # Cloud data operations
│   └── feedbackService.ts # Feedback card logic
│
├── utils/
│   ├── xp-logic.ts       # XP calculations, cycle processing
│   ├── loyalty-logic.ts  # Miles calculations, CPM
│   ├── flight-xp.ts      # Flight XP calculation rules
│   ├── parseFlyingBluePdf.ts # PDF parsing logic
│   ├── airports.ts       # Airport database (1200+ airports)
│   ├── format.ts         # Number/currency formatters
│   ├── valuation.ts      # Redemption value analysis
│   └── dataService.ts    # localStorage operations
│
├── types.ts              # TypeScript interfaces
├── constants.ts          # App constants (thresholds, etc.)
├── demoData.ts           # Demo mode sample data
└── App.tsx               # Root component, routing
```

## Data Flow

### State Management

All user data flows through the `useUserData` hook (`src/hooks/useUserData.ts`):

```
┌─────────────────────────────────────────────────────────┐
│                    useUserData Hook                      │
├─────────────────────────────────────────────────────────┤
│  State:                                                  │
│  - flights, milesData, xpData, redemptions              │
│  - qualificationSettings, manualLedger                  │
│  - currentMonth, targetCPM, xpRollover                  │
│  - authState (user, session, isDemo, isLocalMode)       │
├─────────────────────────────────────────────────────────┤
│  Persistence:                                            │
│  - Authenticated → Supabase (lib/dataService.ts)        │
│  - Local Mode → localStorage (utils/dataService.ts)     │
│  - Demo Mode → in-memory only                           │
└─────────────────────────────────────────────────────────┘
```

### Authentication Modes

| Mode | Storage | Trigger |
|------|---------|---------|
| **Authenticated** | Supabase | User logged in |
| **Local Mode** | localStorage | "Continue without account" |
| **Demo Mode** | Memory only | "Try Demo" button |

### XP Calculation Flow

```
Flights + ManualLedger + QualificationSettings
            ↓
    calculateQualificationCycles()
            ↓
    ┌───────────────────┐
    │ QualificationCycle │ (one per 12-month period)
    ├───────────────────┤
    │ - startDate       │
    │ - endDate         │
    │ - ledger[]        │ (monthly breakdown)
    │ - actualXP        │ (flown only)
    │ - projectedXP     │ (including scheduled)
    │ - actualStatus    │
    │ - projectedStatus │
    │ - rolloverIn/Out  │
    │ - isLevelUpCycle  │
    └───────────────────┘
```

**Level-up cycles**: When a user earns enough XP mid-cycle to level up, the cycle splits and a new cycle begins from that month.

### Miles Calculation Flow

```
MilesData[] + Redemptions[]
            ↓
    calculateMilesStats()
            ↓
    ┌───────────────────┐
    │ MilesStats        │
    ├───────────────────┤
    │ - netCurrent      │ (actual balance)
    │ - netProjected    │ (including future)
    │ - totalCost       │ (all acquisitions)
    │ - globalCPM       │ (weighted average)
    │ - roiMultiplier   │
    │ - savingsCurrent  │
    └───────────────────┘
```

## Key Business Logic

### Flying Blue Status Thresholds

```typescript
// constants.ts
SILVER_THRESHOLD = 100   // XP needed for Silver
GOLD_THRESHOLD = 180     // XP needed for Gold  
PLATINUM_THRESHOLD = 300 // XP needed for Platinum
MAX_ROLLOVER = 300       // Maximum XP that rolls over
```

### XP Sources

1. **Flights** - Calculated from cabin, fare class, distance, status
2. **AMEX XP** - Manual entry (credit card spending)
3. **SAF Bonus** - Sustainable Aviation Fuel bonus
4. **Misc XP** - Promotions, corrections, other sources

### Cycle Detection

The system automatically detects qualification cycles:
- Standard cycle: 12 months from user's status start date
- Level-up cycle: Ends early when user achieves next status level
- Chained cycles: New cycle starts immediately after level-up

## Component Patterns

### Modular Components (Dashboard, XPEngine, MilesEngine)

These large features are split into folders:
- `index.tsx` - Main component, state, layout
- `helpers.tsx` - Shared utilities, types, small components
- Feature-specific files for major sub-components

Import via folder (index.tsx exports):
```typescript
import { Dashboard } from './components/Dashboard';
import { XPEngine } from './components/XPEngine';
```

### Shared Components

- `SharedLedger` - Reusable data table with editing
- `Tooltip` - Info tooltips throughout the app
- `FAQModal` - Help documentation modal

## Database Schema (Supabase)

```sql
-- User data stored as JSON blob per user
user_data (
  user_id: uuid (primary key, references auth.users)
  data: jsonb (contains all app state)
  updated_at: timestamp
)
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Development Guidelines

### Naming Conventions

- Components: PascalCase (`StatusCard.tsx`)
- Hooks: camelCase with `use` prefix (`useUserData.ts`)
- Utils: camelCase (`xp-logic.ts`)
- Types: PascalCase interfaces (`FlightRecord`, `AppState`)

### State Updates

Always use the setter functions from `useUserData`:
```typescript
const { flights, setFlights, updateFlight } = useUserData();

// Add flight
setFlights([...flights, newFlight]);

// Update specific flight
updateFlight(flightId, updatedData);
```

### Adding New Features

1. Add types to `types.ts`
2. Add state to `useUserData` hook if needed
3. Create component in `src/components/`
4. Add route in `App.tsx`

## Performance Considerations

- Heavy calculations (XP, miles) are memoized with `useMemo`
- Demo data is lazy-loaded from `demoData.ts`
- PDF parsing runs in a web worker via PDF.js
- Charts use Recharts with ResponsiveContainer

## Testing Locally

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Common Tasks

### Adding a new XP source
1. Update `ManualLedger` type in `types.ts`
2. Add column to `LedgerTable.tsx`
3. Include in XP calculations in `xp-logic.ts`

### Modifying status thresholds
1. Update `constants.ts`
2. Check `xp-logic.ts` for hardcoded values
3. Update `helpers.tsx` theme mappings

### Adding new flight airlines
1. Update `flight-xp.ts` with earning rules
2. Add to airline dropdown in `FlightIntake.tsx`
