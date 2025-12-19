# SkyStatus PDF Baseline Bug - Volledige Analyse

## Samenvatting

Na grondig onderzoek van de codebase heb ik **twee potentiële oorzaken** gevonden voor waarom de UI verkeerde XP waarden toont na PDF import.

---

## Root Cause #1: Cyclus Mismatch (Hoofd Verdachte)

### Het Probleem

In `xp-logic.ts` wordt de baseline override toegepast op `cycles[cycles.length - 1]` (de **laatste** cyclus):

```typescript
// Regel 1472 in xp-logic.ts
const activeCycle = cycles[cycles.length - 1]; // MISLEIDENDE NAAM!
activeCycle.actualXP = pdfBaseline.xp + deltaXP;
```

Maar in alle UI componenten (Dashboard, SimpleDashboard, XPEngine, etc.) wordt `findActiveCycle(cycles)` gebruikt, die zoekt naar de cyclus waar **vandaag** in valt:

```typescript
// Regel 160-164 in helpers.tsx
for (const cycle of cycles) {
  if (today >= cycle.startDate && today <= cycle.endDate) {
    return cycle;  // Kan een ANDERE cyclus zijn dan de laatste!
  }
}
```

### Wanneer Dit Misgaat

Als er meerdere cycli worden gegenereerd (bijvoorbeeld door een level-up), kan de actieve cyclus **niet** de laatste zijn:

```
Voorbeeld:
- Cyclus 0: Nov 2024 - Oct 2025 (level-up op 7 okt 2025)
- Cyclus 1: Nov 2025 - Oct 2026

Als vandaag 15 oktober 2025 is:
- findActiveCycle() → Cyclus 0 (vandaag valt in deze periode)
- cycles[cycles.length - 1] → Cyclus 1 (baseline wordt hier toegepast!)

Resultaat: UI toont berekende XP uit Cyclus 0, baseline is op Cyclus 1 toegepast.
```

### Bewijs uit Console Logs

De opdracht vermeldt:
> "Er zijn MEERDERE aanroepen van `calculateQualificationCycles`. Sommige tonen PDF baseline applied, andere alleen PDF baseline check ZONDER PDF baseline applied erna."

Dit suggereert dat sommige renders de baseline niet toepassen, wat kan betekenen dat `cycles.length === 0` bij sommige aanroepen.

---

## Root Cause #2: calculateMultiYearStats Zonder Baseline

### Het Probleem

De functie `calculateMultiYearStats` in `xp-logic.ts` roept `calculateQualificationCycles` aan **zonder** de `pdfBaseline` parameter:

```typescript
// Regel 1532-1537 in xp-logic.ts
export const calculateMultiYearStats = (...) => {
  const { cycles } = calculateQualificationCycles(
    data,
    baseRollover,
    flights,
    manualLedger
    // GEEN qualificationSettings!
    // GEEN pdfBaseline!
  );
  ...
};
```

### Waar Dit Wordt Gebruikt

```
- useUserData.ts:261      → Berekent currentStatus
- Analytics.tsx:274       → Analytics weergave  
- FlightLedger.tsx:465    → Flight ledger XP display
```

Hoewel `currentStatus` niet direct de XP waarde bepaalt die op het Dashboard wordt getoond, kan dit inconsistenties veroorzaken.

---

## Data Flow Analyse

### Correcte Flow (Zoals Bedoeld)

```
1. PdfImportModal → parseert PDF → extraheert header (XP: 183)
2. handlePdfImport() → slaat pdfBaseline op in state
3. App.tsx → geeft state.pdfBaseline door aan Dashboard
4. Dashboard → roept calculateQualificationCycles(... pdfBaseline) aan
5. calculateQualificationCycles → past baseline override toe
6. UI → toont activeCycle.actualXP
```

### Waar Het Misgaat

```
Stap 5: Baseline wordt toegepast op cycles[cycles.length - 1]
Stap 6: UI haalt actualXP van findActiveCycle(cycles)

Als deze twee niet dezelfde cyclus zijn → MISMATCH!
```

---

## Verificatie

### Console Logs Die We Zouden Moeten Zien

Als het probleem in Root Cause #1 zit, zouden we moeten loggen:

```javascript
console.log('[XP Engine] Cycle count:', cycles.length);
console.log('[XP Engine] Baseline applied to cycle index:', cycles.length - 1);
```

En in de componenten:

```javascript
console.log('[Dashboard] Active cycle index:', cycles.indexOf(activeCycle));
```

Als deze indices niet overeenkomen, is dat het bewijs.

---

## Plan van Aanpak

### Fix voor Root Cause #1

**Optie A: Pas baseline toe op ALLE cycli waar de PDF exportdatum in valt**

```typescript
// In calculateQualificationCycles, vervang regel 1471-1511:
if (pdfBaseline && cycles.length > 0) {
  // Vind de cyclus waar de PDF exportdatum in valt
  const targetCycle = cycles.find(c => 
    pdfBaseline.pdfExportDate >= c.startDate && 
    pdfBaseline.pdfExportDate <= c.endDate
  ) || cycles[cycles.length - 1];
  
  // Pas baseline toe op deze cyclus
  targetCycle.actualXP = pdfBaseline.xp + deltaXP;
  // etc...
}
```

**Optie B: Gebruik dezelfde logica als findActiveCycle in de baseline override**

```typescript
// Hergebruik de findActiveCycle logica
const activeCycleIndex = findActiveCycleIndex(cycles);
const targetCycle = cycles[activeCycleIndex];
// Pas baseline toe op targetCycle
```

### Fix voor Root Cause #2

Update `calculateMultiYearStats` om `pdfBaseline` te accepteren en door te geven:

```typescript
export const calculateMultiYearStats = (
  data: XPRecord[],
  baseRollover: number,
  flights?: FlightRecord[],
  manualLedger?: ManualLedger,
  qualificationSettings?: QualificationSettings | null,  // TOEVOEGEN
  pdfBaseline?: PdfBaseline | null                       // TOEVOEGEN
): Record<number, QualYearStats> => {
  const { cycles } = calculateQualificationCycles(
    data,
    baseRollover,
    flights,
    manualLedger,
    qualificationSettings,  // TOEVOEGEN
    pdfBaseline             // TOEVOEGEN
  );
  // ...
};
```

---

## Risico Analyse

### Root Cause #1 Fix

**Risico: Laag tot Gemiddeld**
- De fix is geïsoleerd tot de baseline override sectie
- Heeft geen invloed op de cyclus generatie logica
- Test: Import een PDF en controleer of de juiste cyclus de baseline krijgt

### Root Cause #2 Fix

**Risico: Laag**
- Backwards compatible (nieuwe optionele parameters)
- Beïnvloedt alleen de plaatsen waar `calculateMultiYearStats` wordt aangeroepen
- Test: Controleer dat currentStatus en analytics correct zijn na PDF import

---

## Aanbevolen Volgorde van Acties

1. **Voeg debug logging toe** om te bevestigen welke cyclus de baseline krijgt vs. welke de UI toont

2. **Fix Root Cause #1 eerst** - dit is waarschijnlijk de hoofdoorzaak van de 275 vs 183 discrepantie

3. **Fix Root Cause #2 daarna** - voor consistentie in het hele systeem

4. **Test grondig** met verschillende scenario's:
   - Verse import zonder bestaande data
   - Import met bestaande handmatige flights
   - Import na een level-up event
   - Import met verschillende cycleStartMonth configuraties

---

## Conclusie

De meest waarschijnlijke oorzaak is dat de baseline wordt toegepast op de **verkeerde cyclus**. De variabele `activeCycle` op regel 1472 is misleidend benaamd - het is gewoon de laatste cyclus, niet de actieve cyclus die `findActiveCycle` zou teruggeven.

De fix vereist het vinden van de juiste cyclus (gebaseerd op de PDF export datum of de huidige datum) en daar de baseline op toe te passen.
