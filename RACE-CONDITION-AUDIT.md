# Race Condition Audit - SkyStatus Pro

## Gevonden en Gefixte Race Conditions

### 1. ✅ GEFIXED: Data Loading Race Condition
**Locatie:** `useUserData.ts` - `loadUserData()`
**Probleem:** Meerdere parallelle load requests overschreven elkaar
**Fix:** `isLoadingInProgress` ref die parallelle loads blokkeert

### 2. ✅ GEFIXED: Data Wipe Race Condition  
**Locatie:** `useUserData.ts` - `handleStartOver()`
**Probleem:** Lokale state gereset → load triggerde → haalde oude data op voordat wipe klaar was
**Fix:** Database wipe EERST awaiten, dan pas lokale state resetten met `hasInitiallyLoaded = true`

### 3. ✅ GEFIXED: Rollover Display Mismatch
**Locatie:** `useUserData.ts` - regel 348
**Probleem:** UI las uit `xp_rollover` (0), XP Engine gebruikte `starting_xp` (23)
**Fix:** Beide nu uit `startingXP ?? xpRollover`

---

## Potentiële Race Conditions (Te Reviewen)

### 4. ⚠️ RISICO: handleJsonImport - Partial State Update
**Locatie:** `useUserData.ts:706-776`
**Probleem:** Als database save faalt halverwege, is lokale state WEL geüpdatet maar database NIET
**Impact:** Medium - UI toont data die niet in database staat
**Suggestie:** 
- Optie A: Alle saves in één transactie (complex)
- Optie B: Bij failure lokale state terugdraaien
- Optie C: Bij failure user waarschuwen en forceer reload

### 5. ⚠️ RISICO: handleExitDemoMode
**Locatie:** `useUserData.ts:888-904`
**Status:** Waarschijnlijk OK - roept direct `loadUserData()` aan na flag reset
**Maar:** Als user snel klikt tijdens demo mode exit, kan er een race ontstaan

### 6. ⚠️ RISICO: handleOnboardingComplete
**Locatie:** `useUserData.ts:910-974`
**Probleem:** Lokale state wordt eerst gezet, dan pas database update
**Impact:** Low - onboarding is eenmalig en bij failure krijgt user error
**Suggestie:** Zelfde patroon als handleStartOver: database EERST

### 7. ⚠️ RISICO: Auto-save useEffect
**Locatie:** `useUserData.ts:431-436`
**Code:**
```typescript
useEffect(() => {
  if (user && !isDemoMode && debouncedDataVersion > 0 && hasInitiallyLoaded.current) {
    saveUserData();
  }
}, [debouncedDataVersion, user, isDemoMode, saveUserData]);
```
**Probleem:** Als `saveUserData` nog bezig is en de effect opnieuw triggert, kunnen saves overlappen
**Impact:** Medium - data corruption mogelijk bij snelle opeenvolgende wijzigingen
**Suggestie:** `isSaving` check toevoegen: `if (!isSaving && user && ...)`

### 8. ⚠️ RISICO: handlePdfImport
**Locatie:** `useUserData.ts` (zoek naar handlePdfImport)
**Te checken:** Zelfde patroon als handleJsonImport?

---

## Aanbevolen Verbeteringen

### Patroon 1: Database-First voor Destructieve Acties
```typescript
// GOED
const handleDestructiveAction = async () => {
  try {
    await databaseOperation(); // EERST database
    updateLocalState();         // DAN lokale state
  } catch (e) {
    showError("Failed");
    return; // Stop, geen lokale state wijziging
  }
};

// FOUT
const handleDestructiveAction = async () => {
  updateLocalState();           // ❌ State al gewijzigd
  await databaseOperation();    // Als dit faalt, is state inconsistent
};
```

### Patroon 2: Loading Lock voor Async Operations
```typescript
const isOperationInProgress = useRef(false);

const asyncOperation = async () => {
  if (isOperationInProgress.current) return;
  isOperationInProgress.current = true;
  try {
    // ... operation
  } finally {
    isOperationInProgress.current = false;
  }
};
```

### Patroon 3: Save Guard
```typescript
useEffect(() => {
  if (isSaving) return; // ← Voorkom overlappende saves
  if (shouldSave) {
    saveUserData();
  }
}, [shouldSave, isSaving]);
```

---

## Test Scenario's

### Race Condition Tests
1. **Rapid Refresh Test:** Refresh pagina 10x snel achter elkaar → data moet consistent blijven
2. **Wipe During Load:** Start "Wipe Data" terwijl pagina nog aan het laden is
3. **Double Click Test:** Dubbelklik op elke save/delete knop → geen duplicates/errors
4. **Tab Switch Test:** Open 2 tabs, wijzig data in beide → geen corruptie
5. **Network Slow Test:** Throttle netwerk naar "Slow 3G", doe normale operaties

---

## Prioriteit

| # | Issue | Impact | Effort | Prioriteit |
|---|-------|--------|--------|------------|
| 7 | Auto-save overlap | Medium | Low | **HIGH** |
| 4 | handleJsonImport partial | Medium | Medium | Medium |
| 6 | handleOnboardingComplete | Low | Low | Low |
| 5 | handleExitDemoMode | Low | Low | Low |
