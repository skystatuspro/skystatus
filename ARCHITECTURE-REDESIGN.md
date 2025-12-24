# SkyStatus Pro - Architectuur Herontwerp

## Executive Summary

Na grondige analyse van de codebase is het probleem niet één specifieke bug, maar een **fundamenteel architectuurprobleem**: de huidige state management is gebaseerd op een patroon dat inherent race conditions creëert. Dit document beschrijft het probleem en presenteert een concreet herontwerpplan.

---

## Deel 1: Root Cause Analysis

### Het Kernprobleem

De `useUserData` hook probeert drie dingen tegelijk te doen die fundamenteel conflicteren:

1. **Local-first state management** - React state als primaire bron
2. **Optimistic UI updates** - State wijzigt direct, save volgt later
3. **Debounced persistence** - Saves zijn vertraagd en gebatcht

Dit patroon werkt alleen als:
- Er nooit overlappende operaties zijn
- State updates atomisch zijn
- De save functie altijd de "huidige" state vastlegt

**Geen van deze voorwaarden is gegarandeerd in React.**

### Waarom 143 ↔ 183 XP Oscilleert

De oscillatie is het symptoom van deze sequentie:

```
T0: Page loads
T1: loadUserData() fetches from DB → manualLedger = {oct: {correctionXp: 40}}
T2: React state updates (async batching)
T3: useMemo recalculates → 183 XP ✓
T4: Something triggers markDataChanged()
T5: Debounced save starts with STALE CLOSURE → manualLedger = {} (empty!)
T6: saveXPLedger({}) → Wipes xp_ledger in DB
T7: Page refresh → loads empty manualLedger → 143 XP ✗
```

### Bewijs uit de Code

#### Probleem 1: Stale Closure in saveUserData

```typescript
// useUserData.ts:388-425
const saveUserData = useCallback(async () => {
  // Deze functie "captured" de state waarden op het moment dat 
  // de callback werd gecreëerd, niet wanneer deze wordt uitgevoerd
  const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
  Object.entries(manualLedger).forEach(([month, entry]) => { // ← STALE!
    // ...
  });
  await saveXPLedger(user.id, xpLedgerToSave);
}, [user, isDemoMode, flights, baseMilesData, redemptions, manualLedger, ...]);
```

Wanneer `saveUserData` in de dependency array van de auto-save effect staat, wordt bij elke state change een NIEUWE callback gemaakt. Maar de debounce timer van 2000ms gebruikt mogelijk de OUDE callback.

#### Probleem 2: Multiple State Updates zijn Niet Atomisch

```typescript
// useUserData.ts:650-673 - handlePdfImport
if (xpCorrection && xpCorrection.correctionXp !== 0) {
  setManualLedgerInternal((prev) => {  // Update 1
    // ...
  });
}

if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
  setManualLedgerInternal((prev) => {  // Update 2
    // ...
  });
}

markDataChanged();  // Triggers save, maar state updates zijn nog niet "geflusht"
```

React batcht state updates, maar de `saveUserData` die 2 seconden later runt kan:
- De oude state hebben (voor updates)
- De eerste update hebben maar niet de tweede
- Alle updates hebben (correct)

#### Probleem 3: saveXPLedger Wist Alles Voordat Insert

```typescript
// dataService.ts:585-624
export async function saveXPLedger(userId: string, ledger: Record<string, XPLedgerEntry>): Promise<boolean> {
  // DELETE ALL FIRST
  const { error: deleteError } = await supabase
    .from('xp_ledger')
    .delete()
    .eq('user_id', userId);
  
  // THEN INSERT
  // Als ledger leeg is door stale closure → alles gewist, niets ingevoegd
  const entries = Object.entries(ledger).filter(...).map(...);
  if (entries.length === 0) return true; // ← Silent failure!
  
  await supabase.from('xp_ledger').insert(entries);
}
```

---

## Deel 2: Architectuur Opties

### Optie A: Server State als Single Source of Truth (Aanbevolen)

**Concept**: Gebruik React Query / TanStack Query om server state te beheren. Local state is alleen voor UI, niet voor data.

```
┌─────────────────────────────────────────────────────────────┐
│                        React Query                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  useQuery   │    │ useMutation │    │   Cache     │     │
│  │  (fetch)    │───▶│   (save)    │───▶│ (optimistic)│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │ (source of truth)│
                    └─────────────────┘
```

**Voordelen**:
- Geen stale closures - query cache is altijd actueel
- Built-in optimistic updates met rollback
- Automatische deduplicatie van requests
- Background refetching
- Bewezen patroon voor dit type probleem

**Nadelen**:
- Significante refactor nodig
- Leercurve voor team

### Optie B: Event Sourcing Light

**Concept**: Sla wijzigingen op als events, rebuild state bij laden.

```typescript
interface DataEvent {
  id: string;
  type: 'FLIGHT_ADDED' | 'XP_CORRECTION' | 'SETTINGS_CHANGED' | 'PDF_IMPORTED';
  payload: unknown;
  timestamp: string;
}

// Save: append event
async function handlePdfImport(data) {
  await supabase.from('events').insert({
    type: 'PDF_IMPORTED',
    payload: { flights, corrections, settings },
    timestamp: new Date().toISOString()
  });
}

// Load: replay events
async function loadState(userId) {
  const events = await supabase.from('events').select('*').order('timestamp');
  return events.reduce(applyEvent, initialState);
}
```

**Voordelen**:
- Nooit data verlies - alleen appends
- Complete audit trail
- Makkelijk undo/redo

**Nadelen**:
- Performance bij veel events
- Complexere queries
- Database schema wijziging

### Optie C: Explicit State Machine

**Concept**: Vervang de impliciete state guards door een expliciete state machine.

```typescript
type DataState = 
  | { status: 'IDLE' }
  | { status: 'LOADING'; userId: string }
  | { status: 'LOADED'; data: UserData; userId: string }
  | { status: 'SAVING'; data: UserData; userId: string }
  | { status: 'ERROR'; error: Error };

function dataReducer(state: DataState, action: Action): DataState {
  switch (state.status) {
    case 'IDLE':
      if (action.type === 'LOAD') return { status: 'LOADING', userId: action.userId };
      return state;
    case 'LOADING':
      if (action.type === 'LOAD_SUCCESS') return { status: 'LOADED', data: action.data, userId: state.userId };
      if (action.type === 'LOAD_ERROR') return { status: 'ERROR', error: action.error };
      return state; // Ignore other actions while loading
    case 'LOADED':
      if (action.type === 'SAVE') return { status: 'SAVING', data: action.data, userId: state.userId };
      if (action.type === 'UPDATE') return { ...state, data: applyUpdate(state.data, action) };
      return state;
    // etc.
  }
}
```

**Voordelen**:
- Onmogelijke state combinaties zijn letterlijk onmogelijk
- Expliciet welke acties wanneer toegestaan zijn
- Makkelijk te testen en debuggen

**Nadelen**:
- Veel boilerplate
- Async handling is complexer

### Optie D: Simpele Fix - Remove Debounce, Add Explicit Save

**Concept**: Geen auto-save meer. Gebruiker moet expliciet opslaan.

```typescript
// Alleen local state updates, geen auto-save
const handlePdfImport = (data) => {
  setFlightsInternal([...flights, ...data.flights]);
  setManualLedgerInternal({...manualLedger, ...data.corrections});
  setHasUnsavedChanges(true);
};

// Expliciete save button
const handleSave = async () => {
  await saveAllUserData(userId, {
    flights,
    manualLedger,
    // etc.
  });
  setHasUnsavedChanges(false);
};
```

**Voordelen**:
- Simpelste fix
- Geen timing issues meer
- Geen data verlies door race conditions

**Nadelen**:
- Slechtere UX (gebruiker kan vergeten op te slaan)
- "Unsaved changes" prompt nodig
- Niet modern

---

## Deel 3: Aanbevolen Aanpak

### Fase 1: Immediate Fix (1-2 uur) - Stop de Bloeding

**Doel**: Voorkom dat lege data naar de database wordt geschreven.

```typescript
// dataService.ts - Voeg safety check toe aan saveXPLedger
export async function saveXPLedger(userId: string, ledger: Record<string, XPLedgerEntry>): Promise<boolean> {
  // SAFETY: Never delete if we're about to save nothing
  const entries = Object.entries(ledger)
    .filter(([_, entry]) => 
      entry.amexXp !== 0 || entry.bonusSafXp !== 0 || entry.miscXp !== 0 || entry.correctionXp !== 0
    );

  // If nothing to save, DON'T DELETE existing data
  // This prevents stale closure bugs from wiping the database
  if (entries.length === 0) {
    console.warn('[saveXPLedger] Called with empty ledger - skipping to preserve existing data');
    return true;
  }

  // Now safe to delete and insert
  await supabase.from('xp_ledger').delete().eq('user_id', userId);
  await supabase.from('xp_ledger').insert(entries.map(...));
  return true;
}
```

**Zelfde patroon voor alle save functies die delete-then-insert doen.**

### Fase 2: Korte Termijn Fix (4-8 uur) - Stabiliseer State Management

**Doel**: Elimineer stale closures en timing issues.

#### 2.1 Vervang debounced auto-save door immediate save na mutatie

```typescript
// NIEUW: Direct save na elke mutatie
const saveXPLedgerImmediate = useCallback(async (ledger: ManualLedger) => {
  if (!user || isDemoMode) return;
  
  const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
  Object.entries(ledger).forEach(([month, entry]) => {
    xpLedgerToSave[month] = {
      month,
      amexXp: entry.amexXp || 0,
      bonusSafXp: entry.bonusSafXp || 0,
      miscXp: entry.miscXp || 0,
      correctionXp: entry.correctionXp || 0,
    };
  });
  
  await saveXPLedger(user.id, xpLedgerToSave);
}, [user, isDemoMode]);

// In handlePdfImport - pass de actuele waarde door, niet via closure
const handlePdfImport = useCallback((...) => {
  let newLedger = { ...manualLedger };
  
  if (xpCorrection && xpCorrection.correctionXp !== 0) {
    const existing = newLedger[xpCorrection.month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
    newLedger[xpCorrection.month] = {
      ...existing,
      correctionXp: (existing.correctionXp || 0) + xpCorrection.correctionXp,
    };
  }
  
  // Update state
  setManualLedgerInternal(newLedger);
  
  // IMMEDIATE SAVE met de juiste waarde
  await saveXPLedgerImmediate(newLedger);
  
}, [...]);
```

#### 2.2 Voeg save queue toe met deduplicatie

```typescript
// Save queue om overlappende saves te voorkomen
const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

const enqueueSave = useCallback(async (saveFn: () => Promise<void>) => {
  saveQueueRef.current = saveQueueRef.current.then(saveFn).catch(console.error);
  return saveQueueRef.current;
}, []);
```

### Fase 3: Medium Termijn (1-2 weken) - React Query Migratie

**Doel**: Vervang de hele useUserData hook door React Query hooks.

```typescript
// hooks/useUserDataQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useFlights(userId: string | undefined) {
  return useQuery({
    queryKey: ['flights', userId],
    queryFn: () => fetchFlights(userId!),
    enabled: !!userId,
  });
}

export function useUpdateFlights() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, flights }: { userId: string; flights: FlightRecord[] }) =>
      saveFlights(userId, flights),
    onMutate: async ({ userId, flights }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['flights', userId] });
      const previous = queryClient.getQueryData(['flights', userId]);
      queryClient.setQueryData(['flights', userId], flights);
      return { previous };
    },
    onError: (err, { userId }, context) => {
      // Rollback on error
      queryClient.setQueryData(['flights', userId], context?.previous);
    },
    onSettled: ({ userId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['flights', userId] });
    },
  });
}

export function useXPLedger(userId: string | undefined) {
  return useQuery({
    queryKey: ['xpLedger', userId],
    queryFn: () => fetchXPLedger(userId!),
    enabled: !!userId,
  });
}

// etc. voor elke data type
```

```typescript
// hooks/useUserData.ts - Simplified coordinator
export function useUserData(): UseUserDataReturn {
  const { user } = useAuth();
  const userId = user?.id;
  
  // All data comes from React Query
  const { data: flights = [], isLoading: flightsLoading } = useFlights(userId);
  const { data: xpLedger = {}, isLoading: ledgerLoading } = useXPLedger(userId);
  const { data: profile } = useProfile(userId);
  // etc.
  
  // All mutations go through React Query
  const updateFlights = useUpdateFlights();
  const updateXPLedger = useUpdateXPLedger();
  
  // Derived state (computed from query data)
  const manualLedger = useMemo(() => convertXPLedger(xpLedger), [xpLedger]);
  const currentStatus = useMemo(() => calculateStatus(...), [...]);
  
  // Handlers use mutations
  const handlePdfImport = useCallback((...) => {
    updateFlights.mutate({ userId, flights: newFlights });
    updateXPLedger.mutate({ userId, ledger: newLedger });
  }, [userId, updateFlights, updateXPLedger]);
  
  return {
    state: { flights, manualLedger, currentStatus, ... },
    actions: { handlePdfImport, ... },
    meta: { isLoading: flightsLoading || ledgerLoading, ... },
  };
}
```

---

## Deel 4: Implementation Roadmap

### Week 1: Foundation

| Dag | Taak | Output |
|-----|------|--------|
| 1 | Implement Fase 1 safety checks | Geen data verlies meer |
| 2 | Add comprehensive logging | Debug visibility |
| 3 | Write tests voor race conditions | Reproducible test cases |
| 4-5 | Implement Fase 2 immediate saves | Stable MVP |

### Week 2-3: React Query Migration

| Taak | Geschatte Tijd |
|------|----------------|
| Setup React Query provider | 2 uur |
| Migrate flights queries | 4 uur |
| Migrate XP ledger queries | 4 uur |
| Migrate profile queries | 4 uur |
| Migrate miles queries | 4 uur |
| Update components to use new hooks | 8 uur |
| Testing & bug fixes | 8 uur |

### Week 4: Polish

| Taak | Geschatte Tijd |
|------|----------------|
| Remove old useUserData code | 4 uur |
| Add optimistic updates everywhere | 8 uur |
| Add error boundaries & retry logic | 4 uur |
| Performance testing | 4 uur |
| Documentation | 4 uur |

---

## Deel 5: Quick Wins (Implementeer Vandaag)

### Quick Win 1: Safety Check in saveXPLedger

```typescript
// dataService.ts regel 585
export async function saveXPLedger(userId: string, ledger: Record<string, XPLedgerEntry>): Promise<boolean> {
  const entries = Object.entries(ledger)
    .filter(([_, entry]) => 
      entry.amexXp !== 0 || entry.bonusSafXp !== 0 || entry.miscXp !== 0 || entry.correctionXp !== 0
    );

  // ✅ NIEUW: Preserveer bestaande data als we niets hebben om te saven
  if (entries.length === 0) {
    console.log('[saveXPLedger] No entries to save, preserving existing data');
    return true;
  }

  const { error: deleteError } = await supabase
    .from('xp_ledger')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting XP ledger:', deleteError);
    return false;
  }

  const { error: insertError } = await supabase
    .from('xp_ledger')
    .insert(entries.map(([month, entry]) => ({
      user_id: userId,
      month,
      amex_xp: entry.amexXp,
      bonus_saf_xp: entry.bonusSafXp,
      misc_xp: entry.miscXp,
      correction_xp: entry.correctionXp,
    })));

  if (insertError) {
    console.error('Error saving XP ledger:', insertError);
    return false;
  }
  return true;
}
```

### Quick Win 2: Logging voor Debug

```typescript
// useUserData.ts - Voeg dit toe aan het begin van de hook
const instanceId = useRef(crypto.randomUUID().slice(0, 8));

const log = useCallback((action: string, data?: unknown) => {
  console.log(`[useUserData:${instanceId.current}] ${action}`, data ? JSON.stringify(data, null, 2) : '');
}, []);

// Gebruik in kritieke functies
const loadUserData = useCallback(async () => {
  log('LOAD_START', { userId: user?.id });
  // ...
  log('LOAD_COMPLETE', { manualLedgerKeys: Object.keys(loadedLedger) });
}, [user, log]);

const saveUserData = useCallback(async () => {
  log('SAVE_START', { manualLedgerKeys: Object.keys(manualLedger) });
  // ...
  log('SAVE_COMPLETE');
}, [..., log]);
```

### Quick Win 3: Immediate Save na PDF Import

```typescript
// useUserData.ts handlePdfImport - Vervang de huidige immediate save logica
// (rond regel 698-754)

// Build the complete new ledger BEFORE state update
const newManualLedger = { ...manualLedger };

if (xpCorrection && xpCorrection.correctionXp !== 0) {
  const existing = newManualLedger[xpCorrection.month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
  newManualLedger[xpCorrection.month] = {
    ...existing,
    correctionXp: (existing.correctionXp || 0) + xpCorrection.correctionXp,
  };
}

if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
  for (const [month, xp] of Object.entries(bonusXpByMonth)) {
    const existing = newManualLedger[month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
    newManualLedger[month] = { ...existing, miscXp: (existing.miscXp || 0) + xp };
  }
}

// Update state with the complete new value
setManualLedgerInternal(newManualLedger);

// Save immediately with the SAME value we just set
if (user && !isDemoMode) {
  const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
  Object.entries(newManualLedger).forEach(([month, entry]) => {
    xpLedgerToSave[month] = {
      month,
      amexXp: entry.amexXp || 0,
      bonusSafXp: entry.bonusSafXp || 0,
      miscXp: entry.miscXp || 0,
      correctionXp: entry.correctionXp || 0,
    };
  });
  
  console.log('[handlePdfImport] Immediate save with ledger:', xpLedgerToSave);
  await saveXPLedger(user.id, xpLedgerToSave);
}
```

---

## Conclusie

Het 143 ↔ 183 XP probleem is geen bug maar een architectuurfout. De huidige code heeft race conditions ingebakken door het gebruik van debounced auto-save met React closures.

**Aanbevolen pad**:
1. **Vandaag**: Implementeer Quick Wins om data verlies te stoppen
2. **Deze week**: Stabiliseer met immediate saves (Fase 2)
3. **Komende weken**: Migreer naar React Query (Fase 3)

De React Query migratie is de enige duurzame oplossing. Het is een bewezen patroon voor precies dit type probleem en elimineert hele categorieën bugs.

---

*Document versie: 1.0*  
*Datum: 24 december 2024*  
*Auteur: Claude Code Assistant*
