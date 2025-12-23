# XP Berekening Fix - Samenvatting

## Datum: 23 december 2025

## Probleem
Het SkyStatus Pro dashboard toonde **223 XP** in plaats van de correcte **183 XP**. Dit kwam doordat vluchten van vóór de herqualificatiedatum (8 oktober 2025) werden meegeteld, OF vluchten NA de herqualificatiedatum maar VOOR de officiële cyclus start niet werden meegeteld.

## Root Cause Analyse

### Flying Blue Mid-Cycle Qualification Logica
Wanneer je mid-maand kwalificeert voor een hogere status:
1. Je krijgt DIRECT de nieuwe status (bijv. Platinum op 8 oktober)
2. Je OFFICIËLE kwalificatiejaar start op de 1e van de VOLGENDE maand (1 november)
3. Maar alle XP verdiend NA je kwalificatiedatum telt al mee voor het nieuwe jaar (9-31 oktober)
4. PLUS je rollover XP (23 XP in jouw geval)

### Het Probleem
De originele code had:
- `cycleStartMonth = "2025-11"` (correct, officiële cyclus start)
- `cycleStartDate = "2025-10-08"` (correct, kwalificatiedatum)

Maar de XP Engine:
1. Filterde maanden VOOR `cycleStartMonth` ("2025-10" werd niet meegenomen)
2. Terwijl vluchten werden gefilterd op `cycleStartDate` (8 oktober)
3. Resultaat: vluchten van 9-31 oktober werden uit de vluchten gefilterd (correct), maar de maand oktober werd niet verwerkt in de cyclus (fout)

### De Gap
Er zat een "gap" tussen:
- `cycleStartDate` = "2025-10-08" (wanneer vluchten gaan tellen)
- `cycleStartMonth` = "2025-11" (wanneer cyclus officieel begint)

Vluchten van 9-31 oktober vielen in deze gap en werden niet meegeteld.

## Oplossing

### Fix 1: Data Start Month (xp-logic.ts)
De maand data filtering moet starten bij de maand van `cycleStartDate`, niet `cycleStartMonth`:

```typescript
// Get the month from cycleStartDate for data inclusion
const dataStartMonth = excludeBeforeDate?.slice(0, 7);  // e.g., "2025-10"
const excludeBeforeMonth = dataStartMonth;  // Include October in data
```

### Fix 2: Pre-Cycle XP (xp-logic.ts)
XP van vluchten tussen `cycleStartDate` en `cycleStartMonth` wordt toegevoegd aan de rollover:

```typescript
let preCycleXP = 0;
if (dataStartMonth < cycleStartMonth) {
  // Get XP from the gap period (e.g., Oct 9-31)
  const preCycleMonthData = dataByMonth.get(dataStartMonth);
  if (preCycleMonthData) {
    preCycleXP = preCycleMonthData.actualFlightXP + preCycleMonthData.actualFlightSafXP;
  }
}
const adjustedInitialRollover = initialRollover + preCycleXP;
```

### Fix 3: Uitgebreide Debug Logging
Toegevoegd gedetailleerde logging om precies te zien wat er gebeurt.

## Verwachte Correcte Berekening

| Component | XP |
|-----------|-----|
| Rollover (startingXP) | 23 |
| Pre-cycle vluchten (9-31 okt) | ? |
| Vluchten vanaf 1 nov 2025 | ? |
| **Totaal** | **183** |

## Gewijzigde Bestanden

1. **`src/modules/ai-pdf-parser/converter.ts`**
   - Documentatie verbeterd
   - Debug logging toegevoegd

2. **`src/utils/xp-logic.ts`**
   - `dataStartMonth` berekening toegevoegd
   - `excludeBeforeMonth` nu gebaseerd op `cycleStartDate` maand
   - Pre-cycle XP berekening toegevoegd
   - `adjustedInitialRollover` gebruikt in plaats van `initialRollover`
   - Uitgebreide debug logging

## Test Instructies

1. Deploy de nieuwe versie
2. Open de browser console (F12)
3. Importeer je Flying Blue PDF via de AI Parser
4. Check de console voor:
   ```
   [XP Engine] ============================================
   [XP Engine] Qualification settings received: { cycleStartMonth: "2025-11", cycleStartDate: "2025-10-08", ... }
   [XP Engine] Month filtering: { dataStartMonth: "2025-10", excludeBeforeMonth: "2025-10" }
   [XP Engine] Pre-cycle XP: { month: "2025-10", preCycleXP: XX }
   [XP Engine] ============================================
   ```
5. Verifieer dat de XP op het dashboard **183** is

## Bestaande Gebruikers

Voor bestaande gebruikers die de PDF al hebben geïmporteerd met de oude code:
- Ze moeten hun PDF **opnieuw importeren** om de correcte instellingen te krijgen

