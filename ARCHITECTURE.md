```markdown
# SkyStatus Architecture

Technical documentation for developers working on SkyStatus.

**Version:** 2.3.0

## Project Structure

src/
├── components/               # React components
│   ├── Dashboard/            # Command Center (modular)
│   │   ├── index.tsx         # Main Dashboard component
│   │   ├── SimpleDashboard.tsx # Simplified mobile-friendly dashboard
│   │   ├── helpers.tsx       # Status themes, helpers, types
│   │   ├── KPICard.tsx       # KPI card component
│   │   └── RiskMonitor.tsx   # Risk analysis sidebar
│   │
│   ├── XPEngine/             # XP Qualification (modular)
│   │   ├── index.tsx         # Main XPEngine component
│   │   ├── SimpleXPEngine.tsx # Simplified XP view for mobile
│   │   ├── helpers.tsx       # Themes, formatters, StatusPill, InputCell
│   │   ├── CycleSetupForm.tsx # Qualification settings form
│   │   ├── StatusCard.tsx    # Status gauge card
│   │   ├── ProgressionChart.tsx # Monthly XP bar chart
│   │   └── LedgerTable.tsx   # XP ledger with editable cells
│   │
│   ├── MileageRun/           # XP Run Simulator (modular)
│   │   ├── index.tsx         # Main MileageRun component
│   │   ├── SimpleXPPlanner.tsx # Mobile-optimized XP planner
│   │   ├── components.tsx    # StatusProjectionCard, RouteCard, etc.
│   │   ├── helpers.ts        # Route calculations, status themes
│   │   ├── types.ts          # Component-specific types
│   │   └── constants.ts      # Distance bands, thresholds
│   │
│   ├── MilesEngine/          # Miles tracking (modular)
│   │   ├── index.tsx         # Main MilesEngine component
│   │   ├── SimpleMilesEngine.tsx # Simplified miles view
│   │   ├── helpers.tsx       # formatCPM, utilities
│   │   └── components.tsx    # KPICard, charts, SourceEfficiencyCard
│   │
│   ├── Profile/              # User profile (modular)
│   │   ├── index.tsx         # Main Profile component
│   │   ├── components.tsx    # Profile cards
│   │   ├── helpers.ts        # Profile utilities
│   │   └── types.ts          # Profile types
│   │
│   ├── OnboardingFlow.tsx    # 6-step new user wizard
│   ├── Analytics.tsx         # Analytics dashboard
│   ├── FlightIntake.tsx      # Add flight form (Full mode)
│   ├── SimpleFlightIntake.tsx # Add flight form (Simple mode)
│   ├── FlightLedger.tsx      # Flight list/management (Full mode)
│   ├── SimpleFlightLedger.tsx # Flight list (Simple mode)
│   ├── MilesIntake.tsx       # Miles entry (Full mode)
│   ├── SimpleMilesIntake.tsx # Miles entry (Simple mode)
│   ├── RedemptionCalc.tsx    # Redemption analyzer
│   ├── PdfImportModal.tsx    # Flying Blue PDF import
│   ├── SettingsModal.tsx     # Data settings & preferences
│   ├── SharedLedger.tsx      # Reusable ledger table
│   ├── DemoBar.tsx           # Demo mode status selector
│   ├── Layout.tsx            # Main app layout with sidebar
│   ├── LandingPage.tsx       # Public landing page
│   ├── LoginPage.tsx         # Authentication page
│   ├── FeedbackCard.tsx      # In-app feedback collection
│   ├── PostImportFeedback.tsx # Post-PDF import feedback
│   ├── BugReportModal.tsx    # Bug reporting modal
│   ├── FAQModal.tsx          # Help documentation
│   ├── FAQPage.tsx           # Full FAQ page
│   ├── Toast.tsx             # Toast notifications
│   ├── Tooltip.tsx           # Info tooltips
│   └── ...
│
├── hooks/
│   ├── useUserData.ts        # Central state management hook
│   └── useViewMode.ts        # Simple/Full mode toggle with mobile detection
│
├── lib/
│   ├── supabase.ts           # Supabase client initialization
│   ├── AuthContext.tsx       # Authentication context provider
│   ├── CurrencyContext.tsx   # Multi-currency context provider
│   ├── DemoContext.tsx       # Demo mode state management
│   ├── ViewModeContext.tsx   # View mode context (legacy)
│   ├── CookieContext.tsx     # Cookie consent management
│   ├── dataService.ts        # Cloud data operations (Supabase)
│   ├── demoDataGenerator.ts  # Dynamic demo data generation
│   └── feedbackService.ts    # Feedback collection logic
│
├── utils/
│   ├── xp-logic.ts           # XP calculations, cycle processing (CORE)
│   ├── ultimate-bridge.ts    # Ultimate status UI↔Logic bridge
│   ├── loyalty-logic.ts      # Miles calculations, CPM
│   ├── parseFlyingBluePdf.ts # Multi-language PDF parsing
│   ├── flight-intake.ts      # Flight intake utilities, cost aggregation
│   ├── airports.ts           # Airport database (500+ airports)
│   ├── format.ts             # Number/currency formatters + SUPPORTED_CURRENCIES
│   └── valuation.ts          # Redemption value analysis
│
├── types.ts                  # TypeScript interfaces
├── constants.ts              # App constants (thresholds, etc.)
├── demoData.ts               # Demo mode sample data
└── App.tsx                   # Root component, routing
```

## Data Flow

### State Management

All user data flows through the `useUserData` hook (`src/hooks/useUserData.ts`):

```
┌─────────────────────────────────────────────────────────────┐
│                      useUserData Hook                        │
├─────────────────────────────────────────────────────────────┤
│  Core State:                                                 │
│  - flights, milesData, xpData, redemptions                  │
│  - qualificationSettings, manualLedger                      │
│  - currentMonth, targetCPM, xpRollover                      │
│                                                              │
│  User Preferences:                                           │
│  - currency, homeAirport                                    │
│  - onboardingCompleted, emailConsent                        │
│                                                              │
│  Auth State:                                                 │
│  - user, session, isDemo, isLocalMode                       │
├─────────────────────────────────────────────────────────────┤
│  Persistence:                                                │
│  - Authenticated → Supabase (lib/dataService.ts)            │
│  - Local Mode → localStorage                                │
│  - Demo Mode → in-memory only                               │
├─────────────────────────────────────────────────────────────┤
│  Auto-save:                                                  │
│  - 2-second debounce on data changes                        │
│  - Upsert-based for safety (no delete-then-insert)          │
└─────────────────────────────────────────────────────────────┘
```

### View Mode System

The app supports two view modes managed by `useViewMode` hook:

```typescript
// src/hooks/useViewMode.ts
export function useViewMode() {
  return {
    viewMode,           // 'simple' | 'full'
    isSimpleMode,       // boolean shorthand
    isMobile,           // window.innerWidth < 768
    setViewMode,        // (mode) => void
    toggleViewMode,     // () => void
  };
}

// Mobile devices (< 768px) default to Simple mode
// Desktop devices default to Full mode
// User preference is persisted in localStorage
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

| Mode | Storage | Trigger | Data Persistence |
|------|---------|---------|------------------|
| **Authenticated** | Supabase | User logged in | Cloud sync |
| **Local Mode** | localStorage | "Continue without account" | Browser only |
| **Demo Mode** | Memory only | "Try Demo" button | None |

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

### XP Rollover Calculation

When a user reaches a status threshold, XP is split between cycles:

```typescript
// src/utils/xp-logic.ts
export const calculateRolloverXP = (
  flights: FlightRecord[],
  requalificationDate: string,
  previousStatus: StatusLevel,
  startingXP: number = 0
): number => {
  // Get threshold for next status
  const threshold = getThresholdForStatus(getNextStatus(previousStatus));
  
  // Sum all XP from flights up to and including requalification date
  const totalXP = flights
    .filter(f => f.date <= requalificationDate)
    .reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), startingXP);
  
  // Rollover = everything above the threshold
  return Math.max(0, totalXP - threshold);
};
```

**Example:**
- User earns 200 XP by August 6th
- Gold threshold is 180 XP
- Rollover = 200 - 180 = 20 XP starts the new cycle

### PDF Import Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PDF Import Process                        │
├─────────────────────────────────────────────────────────────┤
│  1. User uploads Flying Blue PDF                            │
│                      ↓                                       │
│  2. PDF.js extracts text                                    │
│                      ↓                                       │
│  3. parseFlyingBluePdf() processes:                         │
│     - Flights (date, route, XP, miles, UXP)                 │
│     - Miles transactions (subscription, AMEX, etc.)         │
│     - Bonus XP items (first flight, hotel stays)            │
│     - Requalification events                                 │
│                      ↓                                       │
│  4. Calculate rollover XP from requalification date         │
│                      ↓                                       │
│  5. REPLACE MODE: All existing data replaced (not merged)   │
│                      ↓                                       │
│  6. Auto-set qualification settings from requalification    │
└─────────────────────────────────────────────────────────────┘
```

**Supported Languages:** EN, NL, FR, DE, ES, PT, IT

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
5. **Bonus XP** - First flight bonus, hotel stays (auto-detected from PDF)

### UXP Sources (Ultimate XP)

UXP is a subset of XP, earned only from:
1. **KLM operated flights** - Same calculation as XP
2. **Air France operated flights** - Same calculation as XP
3. **SAF purchases** - SAF XP also counts as UXP

Partner flights (Delta, Kenya Airways, etc.) earn XP but NOT UXP.

### Ultimate Status Bridge

The core XP logic treats Ultimate as "Platinum + 900 UXP". A bridge layer handles UI translation:

```
─────────────────────────────────────────────────────────────────────
User selects:          normalizeSettings()         Receives:
"Ultimate"        →    startingStatus: 'Platinum'  →  statusOrder works
                       startingUXP: 900+              isUltimate = true

Core returns:          getDisplayStatus()          UI shows:
actualStatus: 'Platinum' →  if isUltimate          →  "Ultimate"
isUltimate: true            return 'Ultimate'
```

**Key functions (src/utils/ultimate-bridge.ts):**
- `normalizeQualificationSettings()` - Translates Ultimate → Platinum + UXP for core logic
- `getDisplayStatus()` - Combines actualStatus + isUltimate flag for display
- `getDisplayProjectedStatus()` - Same for projected status with edge case handling

**Why not modify xp-logic.ts?**
- Core logic is thoroughly tested and correct
- Ultimate IS Platinum + UXP (not a separate level in the XP ladder)
- Matches Flying Blue's actual status model
- Allows future rule changes without touching core calculations

## Database Schema (Supabase)

```sql
-- Profiles table (per user preferences)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  target_cpm NUMERIC,
  qualification_start_month VARCHAR(7),
  qualification_start_date DATE,           -- Full date for precise XP filtering
  home_airport VARCHAR(3),
  xp_rollover INTEGER,
  starting_status VARCHAR(20),
  starting_xp INTEGER DEFAULT 0,
  ultimate_cycle_type VARCHAR(20) DEFAULT 'qualification',
  currency VARCHAR(3) DEFAULT 'EUR',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  email_consent BOOLEAN DEFAULT FALSE,
  miles_balance INTEGER DEFAULT 0,
  current_uxp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Flights table
flights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  origin VARCHAR(3),
  destination VARCHAR(3),
  airline VARCHAR(10),
  cabin_class VARCHAR(20),
  ticket_price NUMERIC,
  miles_earned INTEGER,
  xp_earned INTEGER,
  saf_xp INTEGER DEFAULT 0,
  uxp INTEGER DEFAULT 0,
  is_scheduled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Miles transactions
miles_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  month VARCHAR(7),          -- YYYY-MM format
  miles_subscription INTEGER DEFAULT 0,
  miles_amex INTEGER DEFAULT 0,
  miles_other INTEGER DEFAULT 0,
  miles_debit INTEGER DEFAULT 0,
  cost_subscription NUMERIC DEFAULT 0,
  cost_amex NUMERIC DEFAULT 0,
  cost_other NUMERIC DEFAULT 0,
  cost_flight NUMERIC DEFAULT 0
)

-- XP ledger (manual entries)
xp_ledger (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  month VARCHAR(7),
  amex_xp INTEGER DEFAULT 0,
  bonus_saf_xp INTEGER DEFAULT 0,
  misc_xp INTEGER DEFAULT 0,
  correction_xp INTEGER DEFAULT 0
)

-- Redemptions
redemptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  date DATE,
  description TEXT,
  miles_used INTEGER,
  cash_value NUMERIC,
  category VARCHAR(50)
)

-- Feedback
feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  trigger TEXT NOT NULL,      -- 'post_import', '7_days', '5_sessions', etc.
  rating TEXT,                -- 'easy', 'okay', 'confusing'
  message TEXT,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Component Patterns

### Simple vs Full Mode Components

Many features have two versions:
- `ComponentName.tsx` - Full mode (detailed, power users)
- `SimpleComponentName.tsx` - Simple mode (clean, mobile-friendly)

```typescript
// Usage pattern
const { isSimpleMode } = useViewMode();

return isSimpleMode ? (
  <SimpleDashboard {...props} />
) : (
  <Dashboard {...props} />
);
```

### Modular Components

Large features are split into folders:
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
- `Toast` - Notification system
- `FAQModal` - Help documentation modal
- `OnboardingFlow` - Multi-step wizard with conditional steps

### Context Providers

```tsx
// App.tsx structure
<AuthProvider>
  <CookieConsentProvider>
    <CurrencyProvider currency={state.currency}>
      <App />
    </CurrencyProvider>
  </CookieConsentProvider>
</AuthProvider>
```

- **AuthContext** - User authentication state, sign in/out
- **CurrencyContext** - Currency formatting throughout app
- **CookieContext** - GDPR cookie consent

## Feedback System

The app collects feedback through multiple triggers:

```typescript
// src/lib/feedbackService.ts
type FeedbackTrigger = 
  | 'post_import'     // After PDF import
  | '7_days'          // 7 days since first import
  | '5_sessions'      // 5+ app sessions
  | 'manual'          // User-initiated
  | 'bug_report'      // Bug report form
  | 'xp_discrepancy'; // XP mismatch detected
```

## Data Safety

### Upsert-Based Saving

Database operations use upsert to prevent data loss:

```typescript
// lib/dataService.ts
export async function saveFlights(userId: string, flights: FlightRecord[]) {
  // 1. Upsert all flights (safe - updates existing, inserts new)
  await supabase.from('flights').upsert(records, { onConflict: 'id' });
  
  // 2. Delete removed flights (only after upsert succeeds)
  await supabase.from('flights')
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', currentIds);
}
```

### PDF Import Replace Mode

PDF imports use replace mode to ensure accuracy:
- All existing flights replaced with PDF flights
- Manual XP corrections cleared
- Bonus XP from PDF preserved
- Prevents merge conflicts and duplicate entries

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
const { flights, handleFlightsUpdate } = useUserData();

// Update flights
handleFlightsUpdate(newFlights);
```

### Adding New Features

1. Add types to `types.ts`
2. Add state to `useUserData` hook if needed
3. Create component in `src/components/`
4. Consider Simple/Full mode variants
5. Add route in `App.tsx`

## Performance Considerations

- Heavy calculations (XP, miles) are memoized with `useMemo`
- Demo data is lazy-loaded from `demoData.ts`
- PDF parsing runs in a web worker via PDF.js
- Charts use Recharts with ResponsiveContainer
- 2-second debounce on auto-save prevents excessive API calls

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
1. Update airline maps in `parseFlyingBluePdf.ts`
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

### Adding Simple mode variant
1. Create `SimpleComponentName.tsx` alongside `ComponentName.tsx`
2. Use `useViewMode()` hook to detect mode
3. Render appropriate component based on `isSimpleMode`
```
