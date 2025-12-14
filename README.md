# PDF Flight Date Parser Fix + Multi-Currency Support

Fixes incorrect flight dates and adds support for all currencies when importing Flying Blue PDF statements.

## Bug 1: Wrong Flight Dates

The PDF parser was using the wrong date for flights. For example:

```
30 nov 2025    Mijn reis naar Berlijn
               AMS - BER KL1775 gespaarde Miles op basis
               van bestede euro's
               op 29 nov 2025    ← This is the actual flight date
```

The parser was incorrectly using "30 nov 2025" (posting date) instead of "29 nov 2025" (flight date).

### Root Cause

The regex `/(?:op|on|le|am)\s+(.+)/i` was matching "op basis van" instead of "op 29 nov 2025" because:
1. It matched anywhere in the string, not just at the start of a line
2. "op basis van bestede euro's" appears before "op 29 nov 2025"

### The Fix

1. **Primary fix:** Changed regex to `^(?:op|on|le|am)\s+(.+)` with the `^` anchor to match only at the start of a line

2. **Fallback:** Added a secondary pattern that specifically looks for "op [day] [month] [year]" pattern anywhere in the text

## Bug 2: Only Euro Currency Supported

The `isRevenue` check only worked for euros:
```typescript
// OLD - only euros:
const isRevenue = /bestede euro|spent euro|euros dépensés/i.test(rest);
```

This didn't work for users paying in other currencies (kroner, dollars, pounds, etc.).

### The Fix

Match on the spending verb only, not the currency:
```typescript
// NEW - all currencies:
const isRevenue = /bestede|spent|dépensés|ausgegeben/i.test(rest);
```

Now works for:
- Euros (EUR)
- Kroner (NOK, SEK, DKK)
- Pounds (GBP)
- Dollars (USD, CAD, AUD)
- Swiss Francs (CHF)
- Any other currency

## Bug 3: Flight Costs Not Summed

Flight ticket prices were not being included in the total cost calculation. Users would enter ticket prices on flights, but the dashboard would show incorrect (lower) totals.

**Root cause:** In `rebuildLedgersFromFlights`, the `ticketPrice` from flights was never aggregated into `cost_flight`:

```typescript
// OLD - cost_flight always 0:
cost_subscription: 0, cost_amex: 0, cost_flight: 0, cost_other: 0,

// NEW - aggregates ticketPrice:
cost_flight: (existingMiles.cost_flight || 0) + flightCost,
```

## Files Changed

```
src/utils/parseFlyingBluePdf.ts   # Date extraction + multi-currency
src/utils/flight-intake.ts        # Cost aggregation fix
```

## Installation

```bash
cd skystatus-main
unzip -o skystatus-pdf-date-fix.zip
npm run build
```

## Testing

After applying this fix, re-import a Flying Blue PDF and verify:
1. Flight dates match the "op [date]" shown in the PDF
2. Flights are correctly assigned to their actual flight dates, not posting dates

## Languages Supported

The fix works for all supported languages:
- Dutch: "op 29 nov 2025"
- English: "on 29 Nov 2025"  
- French: "le 29 nov 2025"
- German: "am 29. Nov 2025"
