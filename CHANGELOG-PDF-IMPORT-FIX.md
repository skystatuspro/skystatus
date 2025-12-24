# PDF Import Fix v2.1

## Samenvatting
Deze fix lost drie kritieke problemen op met de PDF import functionaliteit:

1. **XP Duplicatie** - miscXp en correctionXp werden opgeteld bij herimport
2. **Miles Duplicatie** - Flight miles werden dubbel geteld  
3. **Race Condition** - Data ging verloren bij snelle F5 na import

---

## Gewijzigde Bestanden

### 1. `src/hooks/useUserData.ts`

**Fixes:**

#### Fix 1: miscXp vervangt nu in plaats van optellen (regel ~540)
```typescript
// OUD (BUG):
updated[month] = { ...existing, miscXp: (existing.miscXp || 0) + xp };

// NIEUW (FIX):
updated[month] = { ...existing, miscXp: xp };
```

#### Fix 2: correctionXp vervangt nu in plaats van optellen (regel ~520)
```typescript
// OUD (BUG):
correctionXp: (existing.correctionXp || 0) + xpCorrection.correctionXp,

// NIEUW (FIX):
correctionXp: xpCorrection.correctionXp,
```

#### Fix 3: miles_flight wordt op 0 gezet bij import (regel ~505)
```typescript
// NIEUW: Clear miles_flight to prevent duplication
milesByMonth.set(incoming.month, {
  ...incoming,
  miles_flight: 0,
  cost_flight: 0,
});
```

#### Fix 4: Directe database save na import (regel ~560-580)
```typescript
// NIEUW: Immediate save to prevent race condition
if (user && !isDemoMode) {
  await Promise.all([
    saveFlights(user.id, mergedFlights),
    saveMilesRecords(user.id, mergedMiles),
    saveXPLedger(user.id, xpLedgerToSave),
    updateProfile(user.id, { ... }),
  ]);
}
```

---

### 2. `src/modules/ai-pdf-parser/converter.ts`

**Fix:** Flight miles worden niet meer opgeteld in `convertMilesRecords()`

```typescript
// OUD (BUG): Flight miles werden hier opgeteld
for (const flight of rawFlights) {
  record.miles_flight += totalFlightMiles;  // DUBBEL!
}

// NIEUW (FIX): Alleen month record aanmaken, geen miles optellen
for (const flight of rawFlights) {
  getMonth(flight.flightDate);  // Ensure record exists, but don't add miles
}
```

**Reden:** De `rebuildLedgersFromFlights()` functie in `flight-intake.ts` berekent `miles_flight` al vanuit de flights array. Als we het ook hier doen, wordt het dubbel geteld.

---

## Dataflow Na Fix

```
PDF Import
    │
    ▼
convertMilesRecords()
    │ miles_flight = 0 (niet berekend)
    ▼
handlePdfImport()
    │ miles_flight = 0 (expliciet gereset)
    │ miscXp = PDF waarde (vervangen, niet optellen)
    │ correctionXp = PDF waarde (vervangen, niet optellen)
    │
    ▼
baseMilesData (opgeslagen in DB)
    │ miles_flight = 0
    ▼
rebuildLedgersFromFlights()
    │ miles_flight = sum(flights.earnedMiles)  ← ENIGE plek waar dit berekend wordt
    ▼
milesData (voor UI)
    │ miles_flight = correcte waarde
```

---

## Test Procedure

### Test 1: XP Duplicatie
1. Importeer een PDF
2. Noteer de miscXp/correctionXp waarden
3. Importeer dezelfde PDF opnieuw
4. **Verwacht:** Waarden blijven GELIJK (niet verdubbeld)

### Test 2: Miles Duplicatie
1. Exporteer JSON backup
2. Noteer miles_flight waarden
3. Importeer dezelfde PDF
4. Exporteer opnieuw
5. **Verwacht:** miles_flight blijft GELIJK

### Test 3: Race Condition
1. Importeer PDF
2. Wacht op "Imported Successfully!"
3. Druk DIRECT F5
4. **Verwacht:** Data is correct (niet weg/incorrect)

---

## Rollback
Als er problemen zijn, herstel de originele bestanden vanuit git:
```bash
git checkout HEAD -- src/hooks/useUserData.ts
git checkout HEAD -- src/modules/ai-pdf-parser/converter.ts
```
