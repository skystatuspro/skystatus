// src/hooks/useUserData.ts
// Custom hook that manages all user data state, persistence, and handlers
// CLEAN VERSION - No pdfBaseline bypass, XP/Miles Engines are source of truth

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchAllUserData,
  saveFlights,
  saveMilesRecords,
  saveRedemptions,
  saveXPLedger,
  updateProfile,
  replaceAllFlights,
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
  clearBackup,
  hasBackup,
  getBackupInfo,
} from '../lib/backup-service';

// ============================================================================
// TYPES
// ============================================================================

export interface QualificationSettings {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;
  ultimateCycleType?: 'qualification' | 'calendar';
  cycleStartDate?: string;  // Full date for precise XP filtering
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
  handleQualificationSettingsUpdate: (settings: QualificationSettings | null) => void;
  
  // PDF Import (clean pattern - no bypass)
  handlePdfImport: (
    flights: FlightRecord[],
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
    bonusXpByMonth?: Record<string, number>
  ) => void;
  handleUndoImport: () => boolean;
  
  // JSON Import
  handleJsonImport: (data: {
    flights?: FlightRecord[];
    baseMilesData?: MilesRecord[];
    baseXpData?: XPRecord[];
    redemptions?: RedemptionRecord[];
    manualLedger?: ManualLedger;
    qualificationSettings?: QualificationSettings;
    xpRollover?: number;
    homeAirport?: string | null;
    currency?: CurrencyCode;
    targetCPM?: number;
  }) => Promise<boolean>;
  
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
  
  // Backup
  canUndoImport: boolean;
  importBackupInfo: { timestamp: string; source: string } | null;
  forceSave: () => Promise<void>;
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

  // Mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [demoStatus, setDemoStatus] = useState<StatusLevel>('Platinum');
  const [showWelcome, setShowWelcome] = useState(false);

  // Backup state
  const [backupState, setBackupState] = useState<{
    canUndo: boolean;
    info: { timestamp: string; source: string } | null;
  }>({ canUndo: false, info: null });

  // Refs for tracking load state
  const hasInitiallyLoaded = useRef(false);
  const loadedForUserId = useRef<string | null>(null);
  const isLoadingInProgress = useRef(false); // CRITICAL: Prevents parallel loads

  // Refresh backup state when flights change
  useEffect(() => {
    setBackupState({
      canUndo: hasBackup(),
      info: getBackupInfo(),
    });
  }, [flights]);

  // -------------------------------------------------------------------------
  // COMPUTED DATA
  // -------------------------------------------------------------------------

  const { miles: milesData, xp: xpData } = useMemo(
    () => {
      console.log('[useMemo:rebuildLedgers] Computing with:', {
        baseMilesDataCount: baseMilesData.length,
        baseXpDataCount: baseXpData.length,
        flightsCount: flights.length,
      });
      const result = rebuildLedgersFromFlights(baseMilesData, baseXpData, flights);
      console.log('[useMemo:rebuildLedgers] Result:', {
        milesCount: result.miles.length,
        xpCount: result.xp.length,
      });
      return result;
    },
    [baseMilesData, baseXpData, flights]
  );

  // In demo mode, use the selected demo status directly
  // Otherwise, calculate from XP stats
  const currentStatus = useMemo((): StatusLevel => {
    console.log('[useMemo:currentStatus] Computing with manualLedger:', JSON.stringify(manualLedger));
    if (isDemoMode) {
      return demoStatus;
    }
    const stats = calculateMultiYearStats(xpData, xpRollover, flights, manualLedger);
    const now = new Date();
    const currentQYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    const cycle = stats[currentQYear];
    console.log(`[useMemo:currentStatus] Cycle ${currentQYear}:`, {
      actualXP: cycle?.actualXP,
      actualStatus: cycle?.actualStatus,
    });
    return (cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer') as StatusLevel;
  }, [isDemoMode, demoStatus, xpData, xpRollover, flights, manualLedger]);

  // -------------------------------------------------------------------------
  // DATA PERSISTENCE
  // -------------------------------------------------------------------------

  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    // CRITICAL: Prevent parallel loads - this fixes the race condition
    // where multiple loads can run simultaneously and overwrite each other
    if (isLoadingInProgress.current) {
      console.log('[loadUserData] SKIPPED: Load already in progress');
      return;
    }
    
    // Mark as loading immediately
    isLoadingInProgress.current = true;
    setDataLoading(true);
    
    console.log('[loadUserData] ===== STARTING LOAD =====');
    console.log('[loadUserData] User ID:', user.id);
    console.log('[loadUserData] hasInitiallyLoaded:', hasInitiallyLoaded.current);
    console.log('[loadUserData] loadedForUserId:', loadedForUserId.current);
    
    try {
      const data = await fetchAllUserData(user.id);
      
      // Double-check we're still loading for the same user
      // (user could have changed during the async fetch)
      if (!user || user.id !== loadedForUserId.current && loadedForUserId.current !== null) {
        console.log('[loadUserData] ABORTED: User changed during load');
        return;
      }

      console.log('[loadUserData] RAW DATA FROM DB:', {
        flightsCount: data.flights.length,
        milesDataCount: data.milesData.length,
        xpLedgerKeys: Object.keys(data.xpLedger),
        xpLedgerRaw: JSON.stringify(data.xpLedger),
        profile: data.profile,
      });

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
      
      console.log('[loadUserData] PARSED manualLedger:', JSON.stringify(loadedLedger));

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
            cycleStartDate: data.profile.qualificationStartDate || undefined,
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
      
      console.log('[loadUserData] ===== LOAD COMPLETE =====');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setDataLoading(false);
      isLoadingInProgress.current = false; // Release the lock
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
          qualification_start_date: qualificationSettings?.cycleStartDate || null,
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
  // CRITICAL: Using user?.id instead of user in deps to prevent recreation on every user object change
  // The loadUserData callback has its own guards for parallel loads
  useEffect(() => {
    const shouldLoad = user && !isDemoMode &&
      (!hasInitiallyLoaded.current || loadedForUserId.current !== user.id);

    console.log('[useEffect:load] Checking if should load:', {
      hasUser: !!user,
      userId: user?.id,
      isDemoMode,
      hasInitiallyLoaded: hasInitiallyLoaded.current,
      loadedForUserId: loadedForUserId.current,
    });
    console.log('[useEffect:load] shouldLoad:', shouldLoad ? true : (user ? false : null));

    if (shouldLoad) {
      loadUserData();
    }
  }, [user?.id, isDemoMode, loadUserData]);

  // Auto-save on debounced data change
  // CRITICAL: Only save if data has been loaded first to prevent wiping user data
  useEffect(() => {
    console.log('[useEffect:save] Checking if should save:', {
      hasUser: !!user,
      isDemoMode,
      debouncedDataVersion,
      hasInitiallyLoaded: hasInitiallyLoaded.current,
    });
    
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

  // -------------------------------------------------------------------------
  // PDF IMPORT (Clean Pattern - No Bypass)
  // -------------------------------------------------------------------------

  const handlePdfImport = useCallback((
    importedFlights: FlightRecord[],
    importedMiles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
    bonusXpByMonth?: Record<string, number>
  ) => {
    // Create backup before modifying data
    try {
      createBackup(
        {
          flights: flights,
          milesRecords: baseMilesData,
          qualificationSettings: qualificationSettings,
          manualLedger: manualLedger,
          xpRollover: xpRollover,
          currency: currency,
          targetCPM: targetCPM,
        },
        'PDF Import'
      );
    } catch (e) {
      console.error('[handlePdfImport] Failed to create backup:', e);
    }

    // Tag imported flights
    const now = new Date().toISOString();
    const taggedFlights = importedFlights.map(f => ({
      ...f,
      importSource: 'pdf' as const,
      importedAt: f.importedAt || now,
    }));

    // Merge flights (skip duplicates by date + route)
    setFlightsInternal((prevFlights) => {
      const existingFlightKeys = new Set(prevFlights.map((f) => `${f.date}|${f.route}`));
      const newFlights = taggedFlights.filter((f) => !existingFlightKeys.has(`${f.date}|${f.route}`));
      const merged = [...prevFlights, ...newFlights];
      merged.sort((a, b) => b.date.localeCompare(a.date));
      return merged;
    });

    // Merge miles (PDF data is authoritative for months it contains)
    setBaseMilesDataInternal((prevMiles) => {
      const milesByMonth = new Map(prevMiles.map(m => [m.month, m]));
      for (const incoming of importedMiles) {
        milesByMonth.set(incoming.month, incoming);
      }
      const merged = Array.from(milesByMonth.values());
      merged.sort((a, b) => b.month.localeCompare(a.month));
      return merged;
    });

    // Handle XP correction
    if (xpCorrection && xpCorrection.correctionXp !== 0) {
      setManualLedgerInternal((prev) => {
        const existing = prev[xpCorrection.month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
        return {
          ...prev,
          [xpCorrection.month]: {
            ...existing,
            correctionXp: (existing.correctionXp || 0) + xpCorrection.correctionXp,
          },
        };
      });
    }

    // Handle bonus XP from non-flight activities
    if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
      setManualLedgerInternal((prev) => {
        const updated = { ...prev };
        for (const [month, xp] of Object.entries(bonusXpByMonth)) {
          const existing = updated[month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
          updated[month] = { ...existing, miscXp: (existing.miscXp || 0) + xp };
        }
        return updated;
      });
    }

    // Handle cycle settings
    if (cycleSettings) {
      const newSettings = {
        cycleStartMonth: cycleSettings.cycleStartMonth,
        cycleStartDate: cycleSettings.cycleStartDate,
        startingStatus: cycleSettings.startingStatus,
        startingXP: cycleSettings.startingXP ?? 0,
      };
      setQualificationSettingsInternal(newSettings);
      
      // IMPORTANT: Immediately save qualification settings to database
      // This prevents the race condition where logout/login before debounced save
      // would lose the cycleStartDate
      if (user && !isDemoMode) {
        updateProfile(user.id, {
          qualification_start_month: newSettings.cycleStartMonth,
          qualification_start_date: newSettings.cycleStartDate || null,
          starting_status: newSettings.startingStatus,
          starting_xp: newSettings.startingXP,
        }).catch(err => console.error('[handlePdfImport] Failed to save qualification settings:', err));
      }
    }

    markDataChanged();
  }, [flights, baseMilesData, qualificationSettings, manualLedger, xpRollover, currency, targetCPM, markDataChanged, user, isDemoMode]);

  // -------------------------------------------------------------------------
  // UNDO IMPORT
  // -------------------------------------------------------------------------

  const handleUndoImport = useCallback((): boolean => {
    const backup = restoreBackup();
    if (!backup) return false;

    setFlightsInternal(backup.flights as FlightRecord[]);
    setBaseMilesDataInternal(backup.milesRecords as MilesRecord[]);
    setQualificationSettingsInternal(backup.qualificationSettings as QualificationSettings | null);
    setManualLedgerInternal(backup.manualLedger as ManualLedger);
    setXpRolloverInternal(backup.xpRollover);

    clearBackup();
    markDataChanged();
    return true;
  }, [markDataChanged]);

  // -------------------------------------------------------------------------
  // JSON IMPORT
  // -------------------------------------------------------------------------

  const handleJsonImport = useCallback(async (importData: {
    flights?: FlightRecord[];
    baseMilesData?: MilesRecord[];
    baseXpData?: XPRecord[];
    redemptions?: RedemptionRecord[];
    manualLedger?: ManualLedger;
    qualificationSettings?: QualificationSettings;
    xpRollover?: number;
    homeAirport?: string | null;
    currency?: CurrencyCode;
    targetCPM?: number;
  }): Promise<boolean> => {
    // Update state
    if (importData.flights) setFlightsInternal(importData.flights);
    if (importData.baseMilesData) setBaseMilesDataInternal(importData.baseMilesData);
    if (importData.baseXpData) setBaseXpDataInternal(importData.baseXpData);
    if (importData.redemptions) setRedemptionsInternal(importData.redemptions);
    if (importData.manualLedger) setManualLedgerInternal(importData.manualLedger);
    if (importData.qualificationSettings !== undefined) {
      setQualificationSettingsInternal(importData.qualificationSettings);
    }
    if (typeof importData.xpRollover === 'number') setXpRolloverInternal(importData.xpRollover);
    if (typeof importData.targetCPM === 'number') setTargetCPMInternal(importData.targetCPM);
    if (importData.currency) setCurrencyInternal(importData.currency);

    // Save to database if logged in
    if (user && !isDemoMode && !isLocalMode) {
      try {
        if (importData.flights) await replaceAllFlights(user.id, importData.flights);
        if (importData.baseMilesData) await saveMilesRecords(user.id, importData.baseMilesData);
        if (importData.redemptions) await saveRedemptions(user.id, importData.redemptions);
        if (importData.manualLedger) {
          const xpLedger: Record<string, XPLedgerEntry> = {};
          for (const [month, entry] of Object.entries(importData.manualLedger)) {
            xpLedger[month] = {
              month,
              amexXp: entry.amexXp || 0,
              bonusSafXp: entry.bonusSafXp || 0,
              miscXp: entry.miscXp || 0,
              correctionXp: entry.correctionXp || 0,
            };
          }
          await saveXPLedger(user.id, xpLedger);
        }
        
        const profileUpdates: Record<string, unknown> = {};
        if (importData.qualificationSettings) {
          profileUpdates.qualification_start_month = importData.qualificationSettings.cycleStartMonth;
          profileUpdates.qualification_start_date = importData.qualificationSettings.cycleStartDate || null;
          profileUpdates.starting_status = importData.qualificationSettings.startingStatus;
          profileUpdates.starting_xp = importData.qualificationSettings.startingXP || 0;
          profileUpdates.starting_uxp = importData.qualificationSettings.startingUXP || 0;
        }
        if (typeof importData.xpRollover === 'number') profileUpdates.xp_rollover = importData.xpRollover;
        if (importData.homeAirport !== undefined) profileUpdates.home_airport = importData.homeAirport;
        if (importData.currency) profileUpdates.currency = importData.currency;
        if (typeof importData.targetCPM === 'number') profileUpdates.target_cpm = importData.targetCPM;
        
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(user.id, profileUpdates as Parameters<typeof updateProfile>[1]);
        }
        
        return true;
      } catch (e) {
        console.error('[handleJsonImport] Failed to save:', e);
        return false;
      }
    }
    
    return true;
  }, [user, isDemoMode, isLocalMode]);

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
    setShowWelcome(false);
    markDataChanged();
  }, [markDataChanged]);

  const handleStartOver = useCallback(async () => {
    if (!window.confirm('Are you sure you want to start over? This wipes all data.')) {
      return;
    }

    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
    setQualificationSettingsInternal(null);
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
            qualification_start_date: undefined,
            starting_status: undefined,
            starting_xp: undefined,
            ultimate_cycle_type: undefined,
          }),
        ]);
      } catch (error) {
        console.error('Error clearing user data:', error);
      }
    }

    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;
    setShowWelcome(true);
  }, [user]);

  const handleEnterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setDemoStatus('Platinum'); // Default to Platinum
    loadDemoDataForStatus('Platinum');
  }, [loadDemoDataForStatus]);

  const handleEnterLocalMode = useCallback(() => {
    setIsLocalMode(true);
    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
  }, []);

  const handleExitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setIsLocalMode(false);
    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;

    if (user) {
      loadUserData();
    } else {
      setBaseMilesDataInternal([]);
      setBaseXpDataInternal([]);
      setRedemptionsInternal([]);
      setFlightsInternal([]);
      setXpRolloverInternal(0);
      setManualLedgerInternal({});
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
      handleJsonImport,
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
      canUndoImport: backupState.canUndo,
      importBackupInfo: backupState.info,
      forceSave: saveUserData,
    },
    meta: {
      isLoading: dataLoading,
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
