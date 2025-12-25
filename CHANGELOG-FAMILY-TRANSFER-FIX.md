# Flying Blue Family Transfer Fix

**Datum:** 25 december 2025  
**Impact:** Laag risico, geïsoleerde wijziging in parser

---

## Probleem

Inkomende miles transfers van Flying Blue Family leden werden als **debit** geclassificeerd in plaats van **credit**.

**Oorzaak:** De regex `/overdragen|transfer/` matchte op zowel inkomende als uitgaande transfers, maar de code checkte alleen op negatieve miles.

---

## Fix

**Bestand:** `src/utils/parseFlyingBluePdf.ts`  
**Regels:** 701-707

### Voor (oud):
```typescript
// === REDEMPTIONS / DEBIT ===
else if (/upgrade|award|overdragen|transfer|Lastminute/i.test(content.toLowerCase())) {
  const { miles } = extractNumbers(content);
  if (miles < 0) {
    getOrCreateMonth(month).debit += Math.abs(miles);
  }
}
```

### Na (nieuw):
```typescript
// === REDEMPTIONS / DEBIT / TRANSFERS ===
// Flying Blue Family allows members to share miles
// - Outgoing transfer: negative miles = debit
// - Incoming transfer: positive miles = credit (goes to "other")
else if (/upgrade|award|overdragen|transfer|Lastminute/i.test(content.toLowerCase())) {
  const { miles } = extractNumbers(content);
  if (miles < 0) {
    // Outgoing: award booking, upgrade, or outgoing transfer
    getOrCreateMonth(month).debit += Math.abs(miles);
  } else if (miles > 0) {
    // Incoming: Flying Blue Family transfer received
    getOrCreateMonth(month).other += miles;
  }
}
```

---

## Gedrag

| Transactie | Miles waarde | Oude classificatie | Nieuwe classificatie |
|------------|--------------|-------------------|---------------------|
| Award booking | -25.000 | debit ✅ | debit ✅ |
| Upgrade | -15.000 | debit ✅ | debit ✅ |
| Transfer naar familie | -5.000 | debit ✅ | debit ✅ |
| Transfer van familie | +5.000 | (genegeerd) ❌ | other ✅ |

---

## Test

Import een PDF die een inkomende Flying Blue Family transfer bevat. De miles moeten verschijnen in de "other" categorie, niet als debit.

---

## Risico

**Laag** - Dit is een geïsoleerde wijziging in de parser die alleen het classificeren van transfers beïnvloedt. Geen impact op:
- XP berekeningen
- Bestaande data
- Import/merge logica
