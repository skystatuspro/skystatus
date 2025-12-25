# SkyStatus React Query Migration - VOLTOOID

## Datum: 25 december 2024

## Samenvatting

De migratie van useState-based state management naar React Query is succesvol afgerond. Het oorspronkelijke probleem (XP oscillatie 143↔183) is opgelost.

---

## Wat was het probleem?

De oude `useUserData` hook had race conditions door:
1. **Stale closures** - debounced save captured oude state
2. **Complex ref management** - `hasInitiallyLoaded`, `isSaving`, etc. waren moeilijk te synchroniseren
3. **Dual state** - React state en Supabase vochten om "source of truth" te zijn

## De oplossing: React Query

React Query neemt server state management over:
- **Geen debounce** - mutations saven direct
- **Centrale cache** - geen stale closures mogelijk
- **Optimistic updates** - UI update direct, rollback bij error
- **Server = source of truth** - geen ambiguïteit

---

## Gewijzigde bestanden

### Nieuw toegevoegd
| Bestand | Doel |
|---------|------|
| `src/hooks/queries/useDataQueries.ts` | React Query hooks voor alle data operaties |
| `src/types/qualification.ts` | QualificationSettings type (geëxtraheerd) |

### Aangepast
| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useUserData.ts` | Volledig herschreven met React Query |
| `src/App.tsx` | Import path aangepast |
| `src/main.tsx` | QueryClientProvider toegevoegd |

### Verwijderd
| Bestand | Reden |
|---------|-------|
| `src/hooks/useUserData.ts` (oude versie) | Vervangen door React Query implementatie |

---

## Architectuur na migratie

```
┌─────────────────────────────────────────────────────────────┐
│                        Components                           │
│  (Dashboard, XPEngine, FlightLedger, etc.)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ useUserData()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   useUserData.ts                            │
│  - Combineert alle queries                                  │
│  - Biedt dezelfde interface als voorheen                    │
│  - Handelt demo/local mode af                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ React Query hooks
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              useDataQueries.ts                              │
│  - useUserDataQuery (fetch all)                             │
│  - useSaveFlights, useSaveMilesRecords, etc. (mutations)    │
│  - usePdfImportMutation (batch save)                        │
│  - Optimistic updates + rollback                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ dataService functies
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   dataService.ts                            │
│  - fetchAllUserData()                                       │
│  - saveFlights(), saveMilesRecords(), etc.                  │
│  - Supabase CRUD operaties (ONGEWIJZIGD)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Supabase │
                    └──────────┘
```

---

## Wat NIET is veranderd

- `xp-logic.ts` - Pure XP berekeningen
- `loyalty-logic.ts` - Miles/status berekeningen  
- `flight-intake.ts` - Flight transformaties
- `dataService.ts` - Supabase calls
- Alle UI components (alleen hook aanroep veranderd)

---

## Geteste scenario's ✓

- [x] Inloggen/uitloggen (weergave stabiel)
- [x] Account wipen → nieuwe import
- [x] PDF herimport
- [x] Undo import
- [x] Page refresh (geen oscillatie meer)

---

## Code reductie

| Metric | Voor | Na | Verschil |
|--------|------|-----|----------|
| hooks/ folder | 98K | 54K | -45% |
| useUserData.ts | 1223 regels | 890 regels | -27% |
| Complexiteit | Hoog (refs, debounce) | Laag (declaratief) | ↓↓ |

---

## Volgende stappen (optioneel)

1. **React Query DevTools** toevoegen voor debugging:
   ```bash
   npm install @tanstack/react-query-devtools
   ```

2. **staleTime tuning** - momenteel 5 minuten, kan aangepast worden

3. **Error boundaries** - betere error handling voor failed mutations

---

## Rollback procedure

Mocht er onverhoopt iets misgaan, de oude implementatie staat in:
`SKYSTATUS_STABLE_V7.zip`

Maar gezien de uitgebreide tests zou dit niet nodig moeten zijn.
