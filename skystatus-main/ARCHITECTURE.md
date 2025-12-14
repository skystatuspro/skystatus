# SkyStatus Architecture

Technical documentation for developers working on SkyStatus.

**Version:** 2.2.0

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
│   ├── MileageRun/       # XP Run Simulator (modular) ← v2.2
│   │   ├── index.tsx     # Main MileageRun component
│   │   ├── components.tsx # StatusProjectionCard, RouteCard, etc.
│   │   ├── helpers.ts    # Route calculations, status themes
│   │   ├── types.ts      # Component-specific types
│   │   └── constants.ts  # Distance bands, thresholds
│   │
│   ├── MilesEngine/      # Miles tracking (modular)
│   │   ├── index.tsx     # Main MilesEngine component
│   │   ├── helpers.tsx   # formatCPM, utilities
│   │   └── components.tsx # KPICard, charts, SourceEfficiencyCard
│   │
│   ├── Profile/          # User profile (modular)
│   │   ├── index.tsx     # Main Profile component
│   │   ├── components.tsx # Profile cards
│   │   ├── helpers.ts    # Profile utilities
│   │   └── types.ts      # Profile types
│   │
│   ├── OnboardingFlow.tsx # 6-step new user wizard
│   ├── Analytics.tsx     # Analytics dashboard
│   ├── FlightIntake.tsx  # Add flight form
│   ├── FlightLedger.tsx  # Flight list/management
│   ├── RedemptionCalc.tsx # Redemption analyzer
│   ├── PdfImportModal.tsx # Flying Blue PDF import
│   ├── SettingsModal.tsx # Data settings & preferences
│   ├── SharedLedger.tsx  # Reusable ledger table
│   ├── DemoBar.tsx       # Demo mode status selector
│   └── ...
│
├── hooks/
│   └── useUserData.ts    # Central state management hook
│
├── lib/
│   ├── supabase.ts       # Supabase client initialization
│   ├── AuthContext.tsx   # Authentication context provider
│   ├── CurrencyContext.tsx # Multi-currency context provider
│   ├── DemoContext.tsx   # Demo mode state management
│   ├── dataService.ts    # Cloud data operations
│   ├── demoDataGenerator.ts # Dynamic demo data generation
│   └── feedbackService.ts # Feedback card logic
│
├── utils/
│   ├── xp-logic.ts       # XP calculations, cycle processing (CORE - DO NOT MODIFY)
│   ├── ultimate-bridge.ts # Ultimate status UI↔Logic bridge ← v2.2
│   ├── loyalty-logic.ts  # Miles calculations, CPM
│   ├── parseFlyingBluePdf.ts # PDF parsing logic
│   ├── airports.ts       # Airport database (500+ airports)
│   ├── format.ts         # Number/currency formatters + SUPPORTED_CURRENCIES
│   ├── valuation.ts      # Redemption value analysis
│   └── flight-intake.ts  # Flight intake utilities
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
│  - currentMonth, targetCPM, xpRollover, uxpRollover    │
│  - currency, homeAirport                                │
│  - onboardingCompleted, emailConsent                    │
│  - authState (user, session, isDemo, isLocalMode)       │
├─────────────────────────────────────────────────────────┤
│  Persistence:                                            │
│  - Authenticated → Supabase (lib/dataService.ts)        │
│  - Local Mode → localStorage (utils/dataService.ts)     │
│  - Demo Mode → in-memory only                           │
└─────────────────────────────────────────────────────────┘
```

### Currency System

Currency is managed via `CurrencyContext` (`src/lib/CurrencyContext.tsx`):

```typescript
// Supported currencies (src/utils/format.ts)
SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', label: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', label: 'Polish Zloty' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

// Usage in components
const { format, symbol, formatPrecise } = useCurrency();
format(1234.56);        // "€1,235" or "$1,235"
formatPrecise(0.012);   // "€0.012" or "$0.012"
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
    │ - actualUXP       │ (KLM/AF flights only)
    │ - projectedUXP    │ (including scheduled)
    │ - actualStatus    │
    │ - projectedStatus │
    │ - isUltimate      │ (900+ UXP achieved)
    │ - rolloverIn/Out  │ (XP rollover, max 300)
    │ - uxpRolloverIn/Out │ (UXP rollover, max 900)
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

// Ultimate (requires Platinum status)
ULTIMATE_UXP_THRESHOLD = 900  // UXP needed for Ultimate
MAX_UXP_ROLLOVER = 900        // Maximum UXP that rolls over
ULTIMATE_TOTAL_CAP = 1800     // 900 requalification + 900 rollover
```

### XP vs UXP

- **XP** - Earned from all SkyTeam flights, determines status level (Silver/Gold/Platinum)
- **UXP** - Earned only from KLM/Air France operated flights, determines Ultimate eligibility
- Every UXP counts as XP, but not every XP is UXP

### XP Sources

1. **Flights** - Calculated from cabin, fare class, distance, status
2. **AMEX XP** - Manual entry (credit card spending)
3. **SAF Bonus** - Sustainable Aviation Fuel bonus
4. **Misc XP** - Promotions, corrections, other sources

### UXP Sources (Ultimate XP)

UXP is a subset of XP, earned only from:
1. **KLM operated flights** - Same calculation as XP
2. **Air France operated flights** - Same calculation as XP
3. **SAF purchases** - SAF XP also counts as UXP

Partner flights (Delta, Kenya Airways, etc.) earn XP but NOT UXP.

### Cycle Detection

The system automatically detects qualification cycles:
- Standard cycle: 12 months from user's status start date
- Level-up cycle: Ends early when user achieves next status level
- Chained cycles: New cycle starts immediately after level-up

### Ultimate Cycle Type

Ultimate members can choose between two cycle tracking modes:
- **Qualification cycle** (default): UXP tracks alongside your status qualification year
- **Calendar year** (legacy): For members who earned Ultimate before 2024, UXP may still be calculated per calendar year

### Ultimate Bridge Pattern (v2.2)

The Ultimate status presents a unique challenge: users want to select "Ultimate" in the UI, but the core XP logic (`xp-logic.ts`) expects `startingStatus: 'Platinum'` + `UXP ≥ 900` to trigger the `isUltimate` flag.

**Solution:** A bridge layer (`src/utils/ultimate-bridge.ts`) translates between UI and logic:

```
UI Layer                    Bridge                      Core Logic
─────────────────────────────────────────────────────────────────────
User selects:          normalizeSettings()         Receives:
"Ultimate"        →    startingStatus: 'Platinum'  →  statusOrder works
                       startingUXP: 900+              isUltimate = true

Core returns:          getDisplayStatus()          UI shows:
actualStatus: 'Platinum' →  if isUltimate          →  "Ultimate"
isUltimate: true            return 'Ultimate'
```

**Key functions:**
- `normalizeQualificationSettings()` - Translates Ultimate → Platinum + UXP for core logic
- `getDisplayStatus()` - Combines actualStatus + isUltimate flag for display
- `getDisplayProjectedStatus()` - Same for projected status with edge case handling

**Why not modify xp-logic.ts?**
- Core logic is thoroughly tested and correct
- Ultimate IS Platinum + UXP (not a separate level in the XP ladder)
- Matches Flying Blue's actual status model
- Allows future rule changes without touching core calculations

**Files using the bridge:**
- `Dashboard/index.tsx`
- `XPEngine/index.tsx`
- `MileageRun/index.tsx`

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
- `OnboardingFlow` - Multi-step wizard with conditional steps

### Context Providers

The app uses two main context providers:

```tsx
// App.tsx structure
<AuthProvider>
  <CurrencyProvider currency={state.currency}>
    <App />
  </CurrencyProvider>
</AuthProvider>
```

- **AuthContext** - User authentication state, sign in/out
- **CurrencyContext** - Currency formatting throughout app

## Database Schema (Supabase)

```sql
-- Profiles table (per user preferences)
profiles (
  id: uuid (primary key, references auth.users)
  target_cpm: numeric
  qualification_start_month: varchar
  home_airport: varchar(3)
  xp_rollover: integer
  starting_status: varchar
  starting_xp: integer
  ultimate_cycle_type: varchar ('qualification' | 'calendar')
  currency: varchar(3) default 'EUR'
  onboarding_completed: boolean default false
  email_consent: boolean default false
  miles_balance: integer default 0
  current_uxp: integer default 0
  created_at: timestamp
  updated_at: timestamp
)

-- Flights table
flights (
  id: uuid (primary key)
  user_id: uuid (references auth.users)
  date: date
  origin: varchar(3)
  destination: varchar(3)
  airline: varchar
  cabin: varchar
  status_at_flight: varchar
  xp: integer
  uxp: integer
  miles: integer
  cost: numeric
  ...
)

-- Miles transactions, redemptions, xp_ledger tables follow similar pattern
```

## Onboarding Flow

The `OnboardingFlow` component (`src/components/OnboardingFlow.tsx`) guides new users through setup:

```
┌──────────────────────────────────────────────────────────┐
│                    Onboarding Wizard                      │
├──────────────────────────────────────────────────────────┤
│  Step 1: Welcome                                          │
│  - Currency selection (10 options)                        │
│  - Home airport (searchable, 500+ airports)              │
├──────────────────────────────────────────────────────────┤
│  Step 2: Import (skippable)                               │
│  - PDF upload from Flying Blue                           │
│  - Shows import summary if successful                    │
├──────────────────────────────────────────────────────────┤
│  Step 3: Status (conditional - if PDF skipped)           │
│  - Current status selector                               │
│  - XP, UXP, rollover inputs                              │
│  - Ultimate cycle type toggle                            │
├──────────────────────────────────────────────────────────┤
│  Step 4: Valuation (skippable)                           │
│  - CPM presets (Conservative/Average/Aspirational)       │
│  - Custom CPM input                                      │
├──────────────────────────────────────────────────────────┤
│  Step 5: Email (skippable)                               │
│  - Email consent checkbox                                │
│  - Privacy messaging                                     │
├──────────────────────────────────────────────────────────┤
│  Step 6: Done                                             │
│  - Settings summary                                       │
│  - "Start Exploring" button                              │
└──────────────────────────────────────────────────────────┘

Returning users (isReturningUser=true):
- See "Welcome Back!" instead of "Welcome to SkyStatus Pro!"
- All fields prefilled with existing data
- XP/status settings NOT overwritten (calculated from flights)
- Only preferences saved (currency, home airport, CPM, email)
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

### Adding a new currency
1. Add to `SUPPORTED_CURRENCIES` array in `src/utils/format.ts`
2. Include code, symbol, and label
3. Currency will automatically appear in settings and onboarding

### Modifying onboarding steps
1. Edit `OnboardingFlow.tsx`
2. Update step array and `renderStep()` switch cases
3. Add/remove from `steps` array for progress dots
4. Handle new data in `handleComplete()`

### Adding new profile fields
1. Add column to Supabase `profiles` table
2. Update `UserData` type in `lib/dataService.ts`
3. Add state variable in `useUserData.ts`
4. Include in `fetchAllUserData()` and `saveAllUserData()`
5. Add to onboarding if user-facing
