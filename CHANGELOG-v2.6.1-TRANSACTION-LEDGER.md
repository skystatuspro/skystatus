# SkyStatus Pro v2.6.1 - TransactionLedger Improvements

**Date:** 26 December 2025  
**Type:** Enhancement & Bug Fix

---

## Summary

This update improves the TransactionLedger component with flight totals integration, better visual alignment, and UX improvements.

---

## Changes

### 1. Flight Totals Integration

**Problem:** The TransactionLedger was showing "-" in the Flights column because flight data comes from a separate `flights` table, not from `activity_transactions`.

**Solution:** 
- Added optional `flights?: FlightRecord[]` prop to TransactionLedger
- Monthly stats now include aggregated flight miles from the flights array
- Flight miles display with a plane icon in sky-blue color
- Expanded month view shows "X flight miles (see Flight Ledger)" hint

**Files changed:**
- `src/components/TransactionLedger.tsx` - Added flights prop and calculation
- `src/components/MilesEngine/index.tsx` - Added flights prop, passes to TransactionLedger
- `src/App.tsx` - Passes flights to MilesEngine

### 2. TransactionLedger on Add Miles Page

**Problem:** The Add Miles page was still showing the legacy SharedLedger even for migrated users.

**Solution:**
- Added conditional rendering in MilesIntake
- New users see TransactionLedger with cost editing
- Legacy users continue to see SharedLedger

**Files changed:**
- `src/components/MilesIntake.tsx` - Added conditional ledger, new props
- `src/App.tsx` - Passes TransactionLedger props to MilesIntake

### 3. Visual & UX Improvements

**Column Alignment:**
- Fixed width columns with `shrink-0` class
- Consistent spacing using gap utilities
- Grid layout for stats columns

**"+ cost" Button:**
- Simplified design: text only with Plus icon
- Less visually overwhelming
- Added tooltips: "Click to add acquisition cost"

**Cost Edit Mode:**
- Placeholder: "Empty = remove" for clarity
- Added keyboard shortcuts in tooltips (Enter/Esc)

**Flight Column:**
- Sky-blue color (`text-sky-600`) with plane icon
- Visual distinction from other mile sources

**Date Format:**
- Changed from `MM-DD` to `MM/DD` for better readability

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/TransactionLedger.tsx` | Complete refactor with flights support |
| `src/components/MilesEngine/index.tsx` | Added FlightRecord import, flights prop |
| `src/components/MilesIntake.tsx` | Added conditional TransactionLedger |
| `src/App.tsx` | Pass flights to MilesEngine and MilesIntake |

---

## Backwards Compatibility

The implementation is fully backwards compatible:

| User Type | `useNewTransactions` | Ledger Shown | Data Source |
|-----------|---------------------|--------------|-------------|
| Never imported PDF | `false` | SharedLedger | `miles_transactions` |
| Imported old JSON | `false` | SharedLedger | `miles_transactions` |
| Imported PDF (v2.6+) | `true` | TransactionLedger | `activity_transactions` |

No migration needed - the flag automatically determines which UI to show.

---

## Testing Checklist

- [ ] Miles Engine page shows flight totals per month
- [ ] Add Miles page shows TransactionLedger for migrated users
- [ ] Add Miles page shows SharedLedger for legacy users
- [ ] Cost editing works on both pages
- [ ] "missing costs" filter works correctly
- [ ] Flight miles appear in sky-blue with plane icon
- [ ] Column alignment is consistent

---

## Design Decision: Separation of Concerns

We chose **Option C** from the analysis:
- Flights remain in their own `FlightLedger` for detailed view
- TransactionLedger shows only monthly **totals** for flights
- This matches how the legacy SharedLedger worked
- Avoids complexity of pseudo-converting flights to transactions

---

## Next Steps (Optional)

1. **Cost Templates** - Auto-suggest EUR 19 for subscription, EUR 0 for family transfer
2. **Bulk Cost Editor** - Separate page for heavy users (1000+ transactions)
3. **Mobile Optimization** - Test TransactionLedger on smaller screens

---

*Generated: 26 December 2025*
