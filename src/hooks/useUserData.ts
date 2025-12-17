// src/hooks/useUserData.ts
// Custom hook that manages all user data state, persistence, and handlers

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchAllUserData,
  saveFlights,
  saveMilesRecords,
  saveRedemptions,
  saveXPLedger,
  updateProfile,
  XPLedgerEntry,
} from '../lib/dataService';
import {
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  FlightRecord,
  ManualLedger,
  StatusLevel,
} from '../types';
import {
  INITIAL_MILES_DATA,
  INITIAL_XP_DATA,
  INITIAL_REDEMPTIONS,
  INITIAL_FLIGHTS,
  INITIAL_MANUAL_LEDGER,
} from '../demoData';
import { generateDemoDataForStatus } from '../lib/demoDataGenerator';
import {
  rebuildLedgersFromFlights,
  FlightIntakePayload,
  createFlightRecord,
} from '../utils/flight-intake';
import { calculateMultiYearStats } from '../utils/xp-logic';
import { CurrencyCode } from '../utils/format';
import {
  createBackup,
  restoreBackup,
  hasBackup,
  getBackupInfo,
  clearBackup,
  getBackupAge,
} from '../modules/pdf-import/services/backup-service';

// ============================================================================
// TYPES
// ============================================================================

export interface QualificationSettings {
  cycleStartMonth: string;
  cycleStartDate?: string;  // Full date (YYYY-MM-DD) for precise cycle start
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;     // UXP carried over from previous cycle
  ultimateCycleType?: 'qualification' | 'calendar'; // 'calendar' for legacy Ultimate members
}

export interface UserDataState {
  // Base data (stored in DB)
  baseMilesData: MilesRecord[];
  baseXpData: XPRecord[];
  manualLedger: ManualLedger;
  redemptions: RedemptionRecord[];
  flights: FlightRecord[];
  xpRollover: number;
  targetCPM: number;
  currency: CurrencyCode;
  qualificationSettings: QualificationSettings | null;
  
  // Computed data (derived from base + flights)
  milesData: MilesRecord[];
  xpData: XPRecord[];
  
  // Current status (computed)
  currentStatus: StatusLevel;
  
  // UI state
  currentMonth: string;
}

export interface UserDataActions {
  // Data setters (with auto-save)
  setFlights: (flights: FlightRecord[]) => void;
  setBaseMilesData: (data: MilesRecord[]) => void;
  setBaseXpData: (data: XPRecord[]) => void;
  setRedemptions: (redemptions: RedemptionRecord[]) => void;
  setManualLedger: (ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => void;
  setXpRollover: (rollover: number) => void;
  setTargetCPM: (cpm: number) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setQualificationSettings: (settings: QualificationSettings | null) => void;
  setCurrentMonth: (month: string) => void;
  
  // High-level handlers
  handleFlightsUpdate: (flights: FlightRecord[]) => void;
  handleFlightIntakeApply: (payloads: FlightIntakePayload[]) => void;
  handleManualLedgerUpdate: (data: MilesRecord[]) => void;
  handleRedemptionsUpdate: (redemptions: RedemptionRecord[]) => void;
  handleTargetCPMUpdate: (cpm: number) => void;
  handleCurrencyUpdate: (currency: CurrencyCode) => void;
  handleManualXPLedgerUpdate: (ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => void;
  handleXPRolloverUpdate: (rollover: number) => void;
  handlePdfImport: (
    flights: FlightRecord[],
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { 
      cycleStartMonth: string; 
      cycleStartDate?: string;
      startingStatus: StatusLevel;
      startingXP?: number;
    },
    bonusXpByMonth?: Record<string, number>,
    sourceFileName?: string
  ) => void;
  handleUndoImport: () => boolean;
  canUndoImport: boolean;
  importBackupInfo: { timestamp: string; source: string } | null;
  handleQualificationSettingsUpdate: (settings: QualificationSettings | null) => void;
  
  // Demo/Local mode
  handleLoadDemo: () => void;
  handleStartEmpty: () => void;
  handleStartOver: () => void;
  handleEnterDemoMode: () => void;
  handleEnterLocalMode: () => void;
  handleExitDemoMode: () => void;
  handleSetDemoStatus: (status: StatusLevel) => void;
  
  // Utility
  markDataChanged: () => void;
  calculateGlobalCPM: () => number;
}

export interface UserDataMeta {
  isLoading: boolean;
  isSaving: boolean;
  isDemoMode: boolean;
  isLocalMode: boolean;
  demoStatus: StatusLevel;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
}

export interface UseUserDataReturn {
  state: UserDataState;
  actions: UserDataActions;
  meta: UserDataMeta;
}

// ============================================================================
// HELPERS
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserData(): UseUserDataReturn {
  const { user } = useAuth();

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  // Current month (UI state, but closely tied to data)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [currentMonth, setCurrentMonth] = useState<string>(defaultMonth);

  // Base data state
  const [baseMilesData, setBaseMilesDataInternal] = useState<MilesRecord[]>([]);
  const [baseXpData, setBaseXpDataInternal] = useState<XPRecord[]>([]);
  const [manualLedger, setManualLedgerInternal] = useState<ManualLedger>({});
  const [redemptions, setRedemptionsInternal] = useState<RedemptionRecord[]>([]);
  const [flights, setFlightsInternal] = useState<FlightRecord[]>([]);
  const [xpRollover, setXpRolloverInternal] = useState<number>(0);
  const [targetCPM, setTargetCPMInternal] = useState<number>(0.012);
  const [currency, setCurrencyInternal] = useState<CurrencyCode>('EUR');
  const [qualificationSettings, setQualificationSettingsInternal] = useState<QualificationSettings | null>(null);
  const [homeAirport, setHomeAirportInternal] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompletedInternal] = useState<boolean>(true); // Default true to prevent flash
  const [emailConsent, setEmailConsentInternal] = useState<boolean>(false);
  const [milesBalance, setMilesBalanceInternal] = useState<number>(0);
  const [currentUXP, setCurrentUXPInternal] = useState<number>(0);

  // Loading/saving state
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const debouncedDataVersion = useDebounce(dataVersion, 2000);
  
  // Track if we've attempted to load data (prevents flash of empty state)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [demoStatus, setDemoStatus] = useState<StatusLevel>('Platinum');
  const [showWelcome, setShowWelcome] = useState(false);

  // Refs for tracking load state
  const hasInitiallyLoaded = useRef(false);
  const loadedForUserId = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // COMPUTED DATA
  // -------------------------------------------------------------------------

  const { miles: milesData, xp: xpData } = useMemo(
    () => rebuildLedgersFromFlights(baseMilesData, baseXpData, flights),
    [baseMilesData, baseXpData, flights]
  );

  // In demo mode, use the selected demo status directly
  // Otherwise, calculate from XP stats
  const currentStatus = useMemo((): StatusLevel => {
    if (isDemoMode) {
      return demoStatus;
    }
    const stats = calculateMultiYearStats(xpData, xpRollover, flights, manualLedger);
    const now = new Date();
    const currentQYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    const cycle = stats[currentQYear];
    return (cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer') as StatusLevel;
  }, [isDemoMode, demoStatus, xpData, xpRollover, flights, manualLedger]);

  // -------------------------------------------------------------------------
  // DATA PERSISTENCE
  // -------------------------------------------------------------------------

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    try {
      const data = await fetchAllUserData(user.id);

      // For logged-in users, we never show the WelcomeModal (that's for anonymous users)
      // Load all data regardless of whether flights exist
      setFlightsInternal(data.flights);
      setBaseMilesDataInternal(data.milesData);
      setRedemptionsInternal(data.redemptions);

      // Load XP Ledger
      const loadedLedger: ManualLedger = {};
      Object.entries(data.xpLedger).forEach(([month, entry]) => {
        loadedLedger[month] = {
          amexXp: entry.amexXp,
          bonusSafXp: entry.bonusSafXp,
          miscXp: entry.miscXp,
          correctionXp: entry.correctionXp,
        };
      });
      setManualLedgerInternal(loadedLedger);

      // Determine if this is an existing user (has any data)
      const hasExistingData = data.flights.length > 0 || data.milesData.length > 0 || data.redemptions.length > 0;

      if (data.profile) {
        setTargetCPMInternal(data.profile.targetCPM || 0.012);
        setXpRolloverInternal(data.profile.xpRollover || 0);
        setCurrencyInternal((data.profile.currency || 'EUR') as CurrencyCode);
        setHomeAirportInternal(data.profile.homeAirport || null);
        setMilesBalanceInternal(data.profile.milesBalance || 0);
        setCurrentUXPInternal(data.profile.currentUXP || 0);
        setEmailConsentInternal(data.profile.emailConsent ?? false);
        
        // CRITICAL: For existing users without the new column, default to TRUE (they've already been using the app)
        // Only new users (no data AND onboarding_completed explicitly false) should see onboarding
        const onboardingStatus = data.profile.onboardingCompleted ?? hasExistingData;
        setOnboardingCompletedInternal(onboardingStatus);

        if (data.profile.qualificationStartMonth) {
          setQualificationSettingsInternal({
            cycleStartMonth: data.profile.qualificationStartMonth,
            cycleStartDate: data.profile.qualificationStartDate || undefined,  // Full date for precise XP filtering
            startingStatus: (data.profile.startingStatus || 'Explorer') as StatusLevel,
            startingXP: data.profile.startingXP ?? data.profile.xpRollover ?? 0,
            ultimateCycleType: data.profile.ultimateCycleType || 'qualification',
          });
        }
      } else {
        // No profile at all - new user, show onboarding
        setOnboardingCompletedInternal(false);
      }

      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
      setHasAttemptedLoad(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      setHasAttemptedLoad(true); // Still mark as attempted even on error
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  const saveUserData = useCallback(async () => {
    if (!user || isDemoMode) return;

    setIsSaving(true);
    try {
      const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
      Object.entries(manualLedger).forEach(([month, entry]) => {
        xpLedgerToSave[month] = {
          month,
          amexXp: entry.amexXp || 0,
          bonusSafXp: entry.bonusSafXp || 0,
          miscXp: entry.miscXp || 0,
          correctionXp: entry.correctionXp || 0,
        };
      });

      await Promise.all([
        saveFlights(user.id, flights),
        saveMilesRecords(user.id, baseMilesData),
        saveRedemptions(user.id, redemptions),
        saveXPLedger(user.id, xpLedgerToSave),
        updateProfile(user.id, {
          target_cpm: targetCPM,
          xp_rollover: xpRollover,
          currency: currency,
          qualification_start_month: qualificationSettings?.cycleStartMonth,
          qualification_start_date: qualificationSettings?.cycleStartDate,  // Full date for precise XP filtering
          starting_status: qualificationSettings?.startingStatus,
          starting_xp: qualificationSettings?.startingXP,
          ultimate_cycle_type: qualificationSettings?.ultimateCycleType,
        }),
      ]);
    } catch (error) {
      console.error('Error saving user data:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, isDemoMode, flights, baseMilesData, redemptions, manualLedger, targetCPM, xpRollover, currency, qualificationSettings]);

  // Load on auth change
  useEffect(() => {
    const shouldLoad = user && !isDemoMode &&
      (!hasInitiallyLoaded.current || loadedForUserId.current !== user.id);

    if (shouldLoad) {
      loadUserData();
    }
  }, [user, isDemoMode, loadUserData]);

  // CRITICAL: Reset state when user logs out or changes
  // This prevents stale data from mixing with new user data
  useEffect(() => {
    if (!user && !isDemoMode && !isLocalMode) {
      // User logged out - clear all state
      setBaseMilesDataInternal([]);
      setBaseXpDataInternal([]);
      setRedemptionsInternal([]);
      setFlightsInternal([]);
      setXpRolloverInternal(0);
      setManualLedgerInternal({});
      setQualificationSettingsInternal(null);
      setHomeAirportInternal(null);
      setMilesBalanceInternal(0);
      setCurrentUXPInternal(0);
      setTargetCPMInternal(0.012);
      hasInitiallyLoaded.current = false;
      loadedForUserId.current = null;
      setHasAttemptedLoad(false);
      setShowWelcome(true);
    }
  }, [user, isDemoMode, isLocalMode]);

  // Auto-save on debounced data change
  // CRITICAL: Only save if data has been loaded first to prevent wiping user data
  useEffect(() => {
    if (user && !isDemoMode && debouncedDataVersion > 0 && hasInitiallyLoaded.current) {
      saveUserData();
    }
  }, [debouncedDataVersion, user, isDemoMode, saveUserData]);

  // -------------------------------------------------------------------------
  // MARK DATA CHANGED (triggers auto-save)
  // -------------------------------------------------------------------------

  const markDataChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  // -------------------------------------------------------------------------
  // SETTERS (wrapped with markDataChanged)
  // -------------------------------------------------------------------------

  const setFlights = useCallback((newFlights: FlightRecord[]) => {
    setFlightsInternal(newFlights);
    markDataChanged();
  }, [markDataChanged]);

  const setBaseMilesData = useCallback((data: MilesRecord[]) => {
    setBaseMilesDataInternal(data);
    markDataChanged();
  }, [markDataChanged]);

  const setBaseXpData = useCallback((data: XPRecord[]) => {
    setBaseXpDataInternal(data);
    markDataChanged();
  }, [markDataChanged]);

  const setRedemptions = useCallback((newRedemptions: RedemptionRecord[]) => {
    setRedemptionsInternal(newRedemptions);
    markDataChanged();
  }, [markDataChanged]);

  const setManualLedger = useCallback((ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => {
    if (typeof ledger === 'function') {
      setManualLedgerInternal((prev) => ledger(prev));
    } else {
      setManualLedgerInternal(ledger);
    }
    markDataChanged();
  }, [markDataChanged]);

  const setXpRollover = useCallback((rollover: number) => {
    setXpRolloverInternal(rollover);
    markDataChanged();
  }, [markDataChanged]);

  const setTargetCPM = useCallback((cpm: number) => {
    setTargetCPMInternal(cpm);
    markDataChanged();
  }, [markDataChanged]);

  const setQualificationSettings = useCallback((settings: QualificationSettings | null) => {
    setQualificationSettingsInternal(settings);
    if (settings) {
      setXpRolloverInternal(settings.startingXP);
    }
    markDataChanged();
  }, [markDataChanged]);

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyInternal(newCurrency);
    markDataChanged();
  }, [markDataChanged]);

  // -------------------------------------------------------------------------
  // HIGH-LEVEL HANDLERS
  // -------------------------------------------------------------------------

  const handleFlightsUpdate = useCallback((nextFlights: FlightRecord[]) => {
    setFlights(nextFlights);
  }, [setFlights]);

  const handleFlightIntakeApply = useCallback((payloads: FlightIntakePayload[]) => {
    const newRecords = payloads.map(createFlightRecord);
    setFlightsInternal((prev) => [...prev, ...newRecords]);
    markDataChanged();
  }, [markDataChanged]);

  const handleManualLedgerUpdate = useCallback((newData: MilesRecord[]) => {
    const sanitizedData = newData.map((record) => ({
      ...record,
      miles_flight: 0,
      cost_flight: 0,
    }));
    setBaseMilesData(sanitizedData);
  }, [setBaseMilesData]);

  const handleRedemptionsUpdate = useCallback((newRedemptions: RedemptionRecord[]) => {
    setRedemptions(newRedemptions);
  }, [setRedemptions]);

  const handleTargetCPMUpdate = useCallback((newTargetCPM: number) => {
    setTargetCPM(newTargetCPM);
  }, [setTargetCPM]);

  const handleCurrencyUpdate = useCallback((newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
  }, [setCurrency]);

  const handleManualXPLedgerUpdate = useCallback((ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => {
    setManualLedger(ledger);
  }, [setManualLedger]);

  const handleXPRolloverUpdate = useCallback((newRollover: number) => {
    setXpRollover(newRollover);
  }, [setXpRollover]);

  const handleQualificationSettingsUpdate = useCallback((settings: QualificationSettings | null) => {
    setQualificationSettings(settings);
  }, [setQualificationSettings]);

  const handlePdfImport = useCallback((
    importedFlights: FlightRecord[],
    importedMiles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
    bonusXpByMonth?: Record<string, number>,
    sourceFileName?: string
  ) => {
    // CRITICAL: Mark as loaded so autosave works for new users
    // Without this, importing PDF before loadUserData completes would not save
    if (user) {
      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
      setHasAttemptedLoad(true);
    }

    // CREATE BACKUP before modifying data (for undo functionality)
    try {
      createBackup(
        {
          flights: flights,
          milesRecords: baseMilesData,
          qualificationSettings: qualificationSettings,
          manualLedger: manualLedger,
        },
        sourceFileName || 'PDF Import'
      );
      console.log('[handlePdfImport] Backup created before import');
    } catch (e) {
      console.error('[handlePdfImport] Failed to create backup:', e);
      // Continue anyway - backup failure shouldn't block import
    }

    // =========================================================================
    // MERGE MODE: Add new data while preserving existing data
    // =========================================================================
    
    // 1. MERGE FLIGHTS: Add new flights, keep existing ones
    // Match duplicates by date + route (same logic as PdfImportModal)
    const existingFlightKeys = new Set(
      flights.map(f => `${f.date}|${f.route}`)
    );
    
    const newFlights = importedFlights.filter(f => {
      const key = `${f.date}|${f.route}`;
      return !existingFlightKeys.has(key);
    });
    
    // Combine: existing flights + new flights from PDF
    const mergedFlights = [...flights, ...newFlights];
    // Sort by date descending (newest first)
    mergedFlights.sort((a, b) => b.date.localeCompare(a.date));
    setFlightsInternal(mergedFlights);
    
    console.log(`[handlePdfImport] Merged flights: ${flights.length} existing + ${newFlights.length} new = ${mergedFlights.length} total`);

    // 2. MERGE MILES: Update existing months, add new months
    const existingMilesByMonth = new Map(
      baseMilesData.map(m => [m.month, m])
    );
    
    for (const importedMonth of importedMiles) {
      // Always use PDF data for months it contains (more accurate)
      existingMilesByMonth.set(importedMonth.month, importedMonth);
    }
    
    const mergedMiles = Array.from(existingMilesByMonth.values());
    // Sort by month descending
    mergedMiles.sort((a, b) => b.month.localeCompare(a.month));
    setBaseMilesDataInternal(mergedMiles);
    
    console.log(`[handlePdfImport] Merged miles: ${baseMilesData.length} existing months, ${importedMiles.length} from PDF = ${mergedMiles.length} total`);

    // 3. MERGE MANUAL LEDGER: Add bonus XP from PDF, preserve existing entries
    if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
      const mergedLedger = { ...manualLedger };
      for (const [month, xp] of Object.entries(bonusXpByMonth)) {
        if (mergedLedger[month]) {
          // Month exists - add to miscXp
          mergedLedger[month] = {
            ...mergedLedger[month],
            miscXp: (mergedLedger[month].miscXp || 0) + xp,
          };
        } else {
          // New month
          mergedLedger[month] = { amexXp: 0, bonusSafXp: 0, miscXp: xp, correctionXp: 0 };
        }
      }
      setManualLedgerInternal(mergedLedger);
    }
    // If no bonus XP, keep existing ledger unchanged

    // 4. QUALIFICATION SETTINGS: NEVER overwrite existing settings
    // The user's current settings are the source of truth - they know their cycle better than the PDF
    // Only set settings if user has NONE (first time import)
    if (cycleSettings) {
      if (!qualificationSettings) {
        // No existing settings - use PDF settings (first time setup)
        const pdfOfficialStatus = (cycleSettings as { pdfHeaderStatus?: StatusLevel }).pdfHeaderStatus;
        setQualificationSettingsInternal({
          cycleStartMonth: cycleSettings.cycleStartMonth,
          cycleStartDate: cycleSettings.cycleStartDate,
          // Prefer PDF header status over detected requalification status
          startingStatus: pdfOfficialStatus || cycleSettings.startingStatus,
          startingXP: cycleSettings.startingXP ?? 0,
        });
        console.log('[handlePdfImport] Set qualification settings from PDF (no existing settings)');
      } else {
        // User already has settings - DO NOT CHANGE THEM
        // Their existing cycle/status is correct, PDF import should only add flights
        console.log('[handlePdfImport] User has existing qualification settings - keeping unchanged');
        console.log(`  Existing: ${qualificationSettings.startingStatus} from ${qualificationSettings.cycleStartMonth}`);
      }
    }

    markDataChanged();
  }, [user, markDataChanged, flights, baseMilesData, qualificationSettings, manualLedger]);

  // UNDO IMPORT: Restore data from backup
  const handleUndoImport = useCallback(() => {
    const backup = restoreBackup();
    if (!backup) {
      console.warn('[handleUndoImport] No backup found');
      return false;
    }

    // Restore all data from backup
    setFlightsInternal(backup.flights as FlightRecord[]);
    setBaseMilesDataInternal(backup.milesRecords as MilesRecord[]);
    setQualificationSettingsInternal(backup.qualificationSettings as QualificationSettings | null);
    setManualLedgerInternal(backup.manualLedger as ManualLedger);

    // Clear the backup after successful restore
    clearBackup();
    
    markDataChanged();
    console.log('[handleUndoImport] Data restored from backup');
    return true;
  }, [markDataChanged]);

  // Backup state - refreshed when data changes
  const [backupState, setBackupState] = useState<{
    canUndo: boolean;
    info: { timestamp: string; source: string } | null;
  }>({ canUndo: false, info: null });

  // Refresh backup state after import or undo
  useEffect(() => {
    setBackupState({
      canUndo: hasBackup(),
      info: getBackupInfo(),
    });
  }, [flights]); // Refresh when flights change (after import/undo)

  const canUndoImport = backupState.canUndo;
  const importBackupInfo = backupState.info;

  // -------------------------------------------------------------------------
  // DEMO / LOCAL MODE HANDLERS
  // -------------------------------------------------------------------------

  const loadDemoDataForStatus = useCallback((status: StatusLevel) => {
    const demoData = generateDemoDataForStatus(status);
    setBaseMilesDataInternal(demoData.milesData);
    setBaseXpDataInternal(demoData.xpData);
    setRedemptionsInternal(demoData.redemptions);
    setFlightsInternal(demoData.flights);
    setXpRolloverInternal(demoData.xpRollover);
    setManualLedgerInternal(demoData.manualLedger);
    setQualificationSettingsInternal(demoData.qualificationSettings);
    setDemoStatus(status);
  }, []);

  const handleLoadDemo = useCallback(() => {
    // Use the current demo status (default Platinum)
    loadDemoDataForStatus(demoStatus);
    setIsDemoMode(true);
    setShowWelcome(false);
  }, [demoStatus, loadDemoDataForStatus]);

  const handleSetDemoStatus = useCallback((status: StatusLevel) => {
    if (!isDemoMode) return;
    setDemoStatus(status);
    loadDemoDataForStatus(status);
  }, [isDemoMode, loadDemoDataForStatus]);

  const handleStartEmpty = useCallback(() => {
    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
    setQualificationSettingsInternal(null);
    setShowWelcome(false);
    markDataChanged();
  }, [markDataChanged]);

  const handleStartOver = useCallback(async () => {
    if (!window.confirm('Are you sure you want to start over? This wipes all data.')) {
      return;
    }

    // Reset ALL data state
    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
    setQualificationSettingsInternal(null);
    setHomeAirportInternal(null);
    setMilesBalanceInternal(0);
    setCurrentUXPInternal(0);
    setTargetCPMInternal(0.012); // Reset to default
    setIsDemoMode(false);
    setIsLocalMode(false);

    // Explicitly save empty data to database when user confirms wipe
    if (user) {
      try {
        await Promise.all([
          saveFlights(user.id, []),
          saveMilesRecords(user.id, []),
          saveRedemptions(user.id, []),
          saveXPLedger(user.id, {}),
          updateProfile(user.id, {
            xp_rollover: 0,
            qualification_start_month: undefined,
            starting_status: undefined,
            starting_xp: undefined,
            ultimate_cycle_type: undefined,
            home_airport: undefined,
            miles_balance: 0,
            current_uxp: 0,
            target_cpm: 0.012,
          }),
        ]);
      } catch (error) {
        console.error('Error clearing user data:', error);
      }
    }

    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;
    setHasAttemptedLoad(true); // Data is "loaded" (empty)
    setShowWelcome(true);
  }, [user]);

  const handleEnterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setDemoStatus('Platinum'); // Default to Platinum
    setHasAttemptedLoad(true); // No server load needed for demo
    loadDemoDataForStatus('Platinum');
  }, [loadDemoDataForStatus]);

  const handleEnterLocalMode = useCallback(() => {
    setIsLocalMode(true);
    setHasAttemptedLoad(true); // No server load needed for local mode
    // Reset ALL data state for clean local mode start
    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
    setQualificationSettingsInternal(null);
    setHomeAirportInternal(null);
    setMilesBalanceInternal(0);
    setCurrentUXPInternal(0);
  }, []);

  const handleExitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setIsLocalMode(false);
    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;
    setHasAttemptedLoad(false);

    if (user) {
      loadUserData();
    } else {
      // Reset ALL state when exiting demo without user
      setBaseMilesDataInternal([]);
      setBaseXpDataInternal([]);
      setRedemptionsInternal([]);
      setFlightsInternal([]);
      setXpRolloverInternal(0);
      setManualLedgerInternal({});
      setQualificationSettingsInternal(null);
      setHomeAirportInternal(null);
      setMilesBalanceInternal(0);
      setCurrentUXPInternal(0);
      setTargetCPMInternal(0.012);
    }
  }, [user, loadUserData]);

  // -------------------------------------------------------------------------
  // ONBOARDING HANDLERS
  // -------------------------------------------------------------------------

  const handleOnboardingComplete = useCallback(async (data: {
    currency: CurrencyCode;
    homeAirport: string | null;
    currentStatus: StatusLevel;
    currentXP: number;
    currentUXP: number;
    rolloverXP: number;
    milesBalance: number;
    ultimateCycleType: 'qualification' | 'calendar';
    targetCPM: number;
    emailConsent: boolean;
    isReturningUser?: boolean;  // If true, don't overwrite qualification settings
  }) => {
    // Update local state - these are always safe to update
    setCurrencyInternal(data.currency);
    setHomeAirportInternal(data.homeAirport);
    setTargetCPMInternal(data.targetCPM);
    setEmailConsentInternal(data.emailConsent);
    setOnboardingCompletedInternal(true);

    // Only update these for NEW users (not returning users who already have flight data)
    // For returning users, XP is calculated from flights, not from manual entry
    if (!data.isReturningUser) {
      setXpRolloverInternal(data.rolloverXP);
      setMilesBalanceInternal(data.milesBalance);
      setCurrentUXPInternal(data.currentUXP);

      // Set qualification settings only for new users
      if (data.currentStatus !== 'Explorer' || data.currentXP > 0) {
        const now = new Date();
        const qYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
        const cycleStartMonth = `${qYear - 1}-11`;
        
        setQualificationSettingsInternal({
          cycleStartMonth,
          startingStatus: data.currentStatus,
          startingXP: data.currentXP,
          ultimateCycleType: data.ultimateCycleType,
        });
      }
    }

    // Save to database if logged in
    if (user && !isDemoMode) {
      try {
        // For returning users, only save preference-type settings
        const profileUpdates: Record<string, unknown> = {
          currency: data.currency,
          home_airport: data.homeAirport,
          target_cpm: data.targetCPM,
          email_consent: data.emailConsent,
          onboarding_completed: true,
        };

        // Only save XP/status data for new users
        if (!data.isReturningUser) {
          profileUpdates.xp_rollover = data.rolloverXP;
          profileUpdates.miles_balance = data.milesBalance;
          profileUpdates.current_uxp = data.currentUXP;
          profileUpdates.starting_status = data.currentStatus;
          profileUpdates.starting_xp = data.currentXP;
          profileUpdates.ultimate_cycle_type = data.ultimateCycleType;
        }

        await updateProfile(user.id, profileUpdates);
      } catch (error) {
        console.error('Error saving onboarding data:', error);
      }
    }
  }, [user, isDemoMode]);

  const handleRerunOnboarding = useCallback(() => {
    setOnboardingCompletedInternal(false);
  }, []);

  const handleEmailConsentChange = useCallback(async (consent: boolean) => {
    setEmailConsentInternal(consent);
    
    // Save to database if logged in
    if (user && !isDemoMode) {
      try {
        await updateProfile(user.id, {
          email_consent: consent,
        });
      } catch (error) {
        console.error('Error updating email consent:', error);
      }
    }
  }, [user, isDemoMode]);

  // -------------------------------------------------------------------------
  // UTILITY
  // -------------------------------------------------------------------------

  const calculateGlobalCPM = useCallback(() => {
    const earned = milesData.reduce(
      (acc, r) => acc + r.miles_subscription + r.miles_amex + r.miles_flight + r.miles_other,
      0
    );
    const cost = milesData.reduce(
      (acc, r) => acc + r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other,
      0
    );
    return earned > 0 ? (cost / earned) * 100 : 0;
  }, [milesData]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    state: {
      baseMilesData,
      baseXpData,
      manualLedger,
      redemptions,
      flights,
      xpRollover,
      targetCPM,
      currency,
      qualificationSettings,
      milesData,
      xpData,
      currentStatus,
      currentMonth,
      homeAirport,
      milesBalance,
      currentUXP,
    },
    actions: {
      setFlights,
      setBaseMilesData,
      setBaseXpData,
      setRedemptions,
      setManualLedger,
      setXpRollover,
      setTargetCPM,
      setCurrency,
      setQualificationSettings,
      setCurrentMonth,
      handleFlightsUpdate,
      handleFlightIntakeApply,
      handleManualLedgerUpdate,
      handleRedemptionsUpdate,
      handleTargetCPMUpdate,
      handleCurrencyUpdate,
      handleManualXPLedgerUpdate,
      handleXPRolloverUpdate,
      handlePdfImport,
      handleUndoImport,
      canUndoImport,
      importBackupInfo,
      handleQualificationSettingsUpdate,
      handleLoadDemo,
      handleStartEmpty,
      handleStartOver,
      handleEnterDemoMode,
      handleEnterLocalMode,
      handleExitDemoMode,
      handleSetDemoStatus,
      markDataChanged,
      calculateGlobalCPM,
      handleOnboardingComplete,
      handleRerunOnboarding,
      handleEmailConsentChange,
    },
    meta: {
      // Show loading if actively loading OR if we have a user but haven't attempted load yet
      isLoading: dataLoading || (!!user && !isDemoMode && !isLocalMode && !hasAttemptedLoad),
      isSaving,
      isDemoMode,
      isLocalMode,
      demoStatus,
      showWelcome,
      setShowWelcome,
      onboardingCompleted,
      emailConsent,
    },
  };
}
