# XP Berekening Fix - Samenvatting v3

## Datum: 23 december 2025

## Problemen

### Probleem 1: 143 XP vs 183 XP (40 XP verschil)
Na uitloggen en weer inloggen toonde het dashboard 143 XP in plaats van 183 XP. Dit kwam doordat de `cycleStartDate` niet correct werd opgeslagen in de database vóór de logout.

### Probleem 2: Cyclus Oktober-September i.p.v. November-Oktober
De cyclus periode werd getoond als "Oct 1 - Sep 30" in plaats van "Nov 1 - Oct 31".

## Root Cause Analyse

### Flying Blue Mid-Cycle Qualification Logica
Wanneer je mid-maand kwalificeert voor een hogere status:
1. Je krijgt DIRECT de nieuwe status (bijv. Platinum op 8 oktober)
2. Je OFFICIËLE kwalificatiejaar start op de 1e van de VOLGENDE maand (1 november)
3. Maar alle XP verdiend NA je kwalificatiedatum telt al mee voor het nieuwe jaar (9-31 oktober)
4. PLUS je rollover XP (23 XP in jouw geval)

### De "Gap" Periode
Er zit een gap tussen:
- `cycleStartDate = "2025-10-08"` (wanneer vluchten gaan tellen voor nieuwe cyclus)
- `cycleStartMonth = "2025-11"` (officiële start van het kwalificatiejaar)

Vluchten van 9-31 oktober vallen in deze gap en moeten worden meegeteld als "pre-cycle XP".

### Probleem 1 Root Cause
De `qualification_start_date` werd niet direct naar de database geschreven na PDF import. Door de React state update en debounced save, kon een logout/login plaatsvinden voordat de data was opgeslagen.

### Probleem 2 Root Cause
De fallback logica voor `initialCycleStart` gebruikte `firstDataMonth` (oktober) wanneer geen `cycleStartMonth` beschikbaar was.

## Oplossingen

### Fix 1: Directe Database Save (useUserData.ts)
Na PDF import worden de qualification settings direct naar de database geschreven, zonder te wachten op de debounced save:

```typescript
if (cycleSettings) {
  // ...set state...
  
  // IMMEDIATELY save to database
  if (user && !isDemoMode) {
    updateProfile(user.id, {
      qualification_start_month: newSettings.cycleStartMonth,
      qualification_start_date: newSettings.cycleStartDate || null,
      // ...
    });
  }
}
```

### Fix 2: Pre-Cycle XP Berekening (xp-logic.ts)
De XP van vluchten in de gap periode (9-31 oktober) wordt toegevoegd aan de initial rollover:

```typescript
const cycleStartDateMonth = excludeBeforeDate?.slice(0, 7);  // "2025-10"
const officialCycleStartMonth = qualificationSettings?.cycleStartMonth;  // "2025-11"

if (cycleStartDateMonth < officialCycleStartMonth) {
  // Get pre-cycle XP from October and add to rollover
  preCycleXP = monthData.actualFlightXP + monthData.actualFlightSafXP;
}

adjustedInitialRollover = initialRollover + preCycleXP;
```

### Fix 3: Correcte Cyclus Start Maand (xp-logic.ts)
De cyclus start nu altijd in november (of de officiële `cycleStartMonth`), niet in oktober:

```typescript
if (qualificationSettings?.cycleStartMonth) {
  initialCycleStart = qualificationSettings.cycleStartMonth;  // "2025-11"
} else {
  // Fallback to nearest November based on data
}
```

## Gewijzigde Bestanden

1. **`src/modules/ai-pdf-parser/converter.ts`**
   - Documentatie verbeterd
   - Debug logging toegevoegd

2. **`src/utils/xp-logic.ts`**
   - Pre-cycle XP berekening toegevoegd
   - Correcte cyclus start maand logica
   - Uitgebreide debug logging

3. **`src/hooks/useUserData.ts`**
   - Directe database save na PDF import voor qualification settings

## Verwachte Resultaten

Na deze fixes:
- **XP**: 183 (23 rollover + 40 pre-cycle + 120 vanaf november)
- **Cyclus**: November 2025 - Oktober 2026
- **Consistent**: Zelfde waarde na refresh, logout/login, etc.

## Test Instructies

1. Deploy de nieuwe versie
2. Importeer de Flying Blue PDF
3. Check: XP moet 183 zijn
4. Check: Cyclus moet "Nov - Oct" zijn  
5. Logout en weer inloggen
6. Check: XP moet nog steeds 183 zijn
7. Check de console logs voor debug info

