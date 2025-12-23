// src/hooks/useUserData.ts
// Custom hook that manages all user data state, persistence, and handlers
// 
// ARCHITECTURE: Clean pattern - XP/Miles Engines are the single source of truth
// No pdfBaseline bypass - all data flows through the engines

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
  startingUXP?: number;     // UXP carried over from previous cycle
  ultimateCycleType?: 'qualification' | 'calendar'; // 'calendar' for legacy Ultimate members
  cycleStartDate?: string;  // Full date (YYYY-MM-DD) for precise cycle start
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
  
  // Current status (computed by XP Engine)
  currentStatus: StatusLevel;
  
  // UI state
  currentMonth: string;
  homeAirport: string | null;
  milesBalance: number;
  currentUXP: number;
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
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel },
    bonusXpByMonth?: Record<string, number>
  ) => void;
  handleUndoImport: () => boolean;
  
  // JSON Import/Export
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
  
  // Onboarding
  handleOnboardingComplete: (data: {
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
    isReturningUser?: boolean;
  }) => Promise<void>;
  handleRerunOnboarding: () => void;
  handleEmailConsentChange: (consent: boolean) => Promise<void>;
  
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
  onboardingCompleted: boolean;
  emailConsent: boolean;
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

  // Current month (UI state)
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
  const [onboardingCompleted, setOnboardingCompletedInternal] = useState<boolean>(true);
  const [emailConsent, setEmailConsentInternal] = useState<boolean>(false);
  const [milesBalance, setMilesBalanceInternal] = useState<number>(0);
  const [currentUXP, setCurrentUXPInternal] = useState<number>(0);

  // Loading/saving state
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
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

  // -------------------------------------------------------------------------
  // COMPUTED DATA (XP/Miles Engines are source of truth)
  // -------------------------------------------------------------------------

  const { miles: milesData, xp: xpData } = useMemo(
    () => rebuildLedgersFromFlights(baseMilesData, baseXpData, flights),
    [baseMilesData, baseXpData, flights]
  );

  // Current status - calculated from XP Engine (no bypass!)
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

      // Determine if this is an existing user
      const hasExistingData = data.flights.length > 0 || data.milesData.length > 0 || data.redemptions.length > 0;

      if (data.profile) {
        setTargetCPMInternal(data.profile.targetCPM || 0.012);
        setXpRolloverInternal(data.profile.xpRollover || 0);
        setCurrencyInternal((data.profile.currency || 'EUR') as CurrencyCode);
        setHomeAirportInternal(data.profile.homeAirport || null);
        setMilesBalanceInternal(data.profile.milesBalance || 0);
        setCurrentUXPInternal(data.profile.currentUXP || 0);
        setEmailConsentInternal(data.profile.emailConsent ?? false);
        
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
        setOnboardingCompletedInternal(false);
      }

      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
      setHasAttemptedLoad(true);
    } catch (error) {
      console.error('Error loading user data:', error);
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
          qualification_start_date: qualificationSettings?.cycleStartDate,
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

  // Auto-save on debounced data change
  useEffect(() => {
    if (user && !isDemoMode && debouncedDataVersion > 0 && hasInitiallyLoaded.current) {
      saveUserData();
    }
  }, [debouncedDataVersion, user, isDemoMode, saveUserData]);

  // Refresh backup state after import or undo
  useEffect(() => {
    setBackupState({
      canUndo: hasBackup(),
      info: getBackupInfo(),
    });
  }, [flights]); // Refresh when flights change (after import/undo)

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

  /**
   * Handle PDF import - clean pattern following v2.2 architecture
   * 
   * Data flows: PDF → flights[] + milesRecords[] → XP/Miles Engines → Dashboard
   * NO pdfBaseline bypass - engines are the single source of truth
   */
  const handlePdfImport = useCallback((
    importedFlights: FlightRecord[],
    importedMiles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel },
    bonusXpByMonth?: Record<string, number>
  ) => {
    // Mark as loaded for new users
    if (user) {
      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
      setHasAttemptedLoad(true);
    }

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
      console.log('[handlePdfImport] Backup created');
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
      console.log(`[handlePdfImport] Merged flights: ${prevFlights.length} existing + ${newFlights.length} new`);
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
      console.log(`[handlePdfImport] Merged miles: ${prevMiles.length} existing, ${importedMiles.length} from PDF`);
      return merged;
    });

    // Handle XP correction (goes into manualLedger.correctionXp)
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
      console.log(`[handlePdfImport] XP correction: ${xpCorrection.correctionXp} in ${xpCorrection.month}`);
    }

    // Handle bonus XP from non-flight activities (goes into manualLedger.miscXp)
    if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
      setManualLedgerInternal((prev) => {
        const updated = { ...prev };
        for (const [month, xp] of Object.entries(bonusXpByMonth)) {
          const existing = updated[month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
          updated[month] = {
            ...existing,
            miscXp: (existing.miscXp || 0) + xp,
          };
        }
        return updated;
      });
      console.log(`[handlePdfImport] Bonus XP added to ${Object.keys(bonusXpByMonth).length} months`);
    }

    // Handle cycle settings
    if (cycleSettings) {
      setQualificationSettingsInternal({
        cycleStartMonth: cycleSettings.cycleStartMonth,
        cycleStartDate: cycleSettings.cycleStartDate,
        startingStatus: cycleSettings.startingStatus,
        startingXP: 0,
      });
      console.log(`[handlePdfImport] Cycle settings: ${cycleSettings.startingStatus} from ${cycleSettings.cycleStartMonth}`);
    }

    markDataChanged();
    console.log('[handlePdfImport] Import complete');
  }, [user, markDataChanged, flights, baseMilesData, qualificationSettings, manualLedger, xpRollover, currency, targetCPM]);

  // -------------------------------------------------------------------------
  // UNDO IMPORT
  // -------------------------------------------------------------------------

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
    
    if (typeof backup.xpRollover === 'number') {
      setXpRolloverInternal(backup.xpRollover);
    }
    if (backup.currency) {
      setCurrencyInternal(backup.currency as CurrencyCode);
    }
    if (typeof backup.targetCPM === 'number') {
      setTargetCPMInternal(backup.targetCPM);
    }

    clearBackup();
    markDataChanged();
    console.log('[handleUndoImport] Data restored from backup');
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
    // Local/demo mode: just update state directly
    if (!user || isDemoMode || isLocalMode) {
      if (importData.flights) setFlightsInternal(importData.flights);
      if (importData.baseMilesData) setBaseMilesDataInternal(importData.baseMilesData);
      if (importData.baseXpData) setBaseXpDataInternal(importData.baseXpData);
      if (importData.redemptions) setRedemptionsInternal(importData.redemptions);
      if (importData.manualLedger) setManualLedgerInternal(importData.manualLedger);
      if (importData.qualificationSettings) setQualificationSettingsInternal(importData.qualificationSettings);
      if (typeof importData.xpRollover === 'number') setXpRolloverInternal(importData.xpRollover);
      if (importData.homeAirport !== undefined) setHomeAirportInternal(importData.homeAirport);
      if (importData.currency) setCurrencyInternal(importData.currency);
      if (typeof importData.targetCPM === 'number') setTargetCPMInternal(importData.targetCPM);
      return true;
    }

    setIsSaving(true);
    hasInitiallyLoaded.current = true;
    loadedForUserId.current = user.id;
    setHasAttemptedLoad(true);

    try {
      // Prepare XP ledger for database format
      const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
      if (importData.manualLedger) {
        Object.entries(importData.manualLedger).forEach(([month, entry]) => {
          xpLedgerToSave[month] = {
            month,
            amexXp: entry.amexXp || 0,
            bonusSafXp: entry.bonusSafXp || 0,
            miscXp: entry.miscXp || 0,
            correctionXp: entry.correctionXp || 0,
          };
        });
      }

      // Write ALL data to database in parallel
      const savePromises: Promise<boolean>[] = [];

      if (importData.flights) {
        savePromises.push(replaceAllFlights(user.id, importData.flights));
      }
      if (importData.baseMilesData) {
        savePromises.push(saveMilesRecords(user.id, importData.baseMilesData));
      }
      if (importData.redemptions) {
        savePromises.push(saveRedemptions(user.id, importData.redemptions));
      }
      if (importData.manualLedger && Object.keys(xpLedgerToSave).length > 0) {
        savePromises.push(saveXPLedger(user.id, xpLedgerToSave));
      }

      // Profile updates
      const profileUpdates: Record<string, unknown> = {};
      if (importData.qualificationSettings) {
        profileUpdates.qualification_start_month = importData.qualificationSettings.cycleStartMonth || null;
        profileUpdates.qualification_start_date = importData.qualificationSettings.cycleStartDate || null;
        profileUpdates.starting_status = importData.qualificationSettings.startingStatus || null;
        profileUpdates.starting_xp = importData.qualificationSettings.startingXP ?? 0;
        profileUpdates.starting_uxp = importData.qualificationSettings.startingUXP ?? 0;
        profileUpdates.ultimate_cycle_type = importData.qualificationSettings.ultimateCycleType || null;
      }
      if (typeof importData.xpRollover === 'number') {
        profileUpdates.xp_rollover = importData.xpRollover;
      }
      if (importData.homeAirport !== undefined) {
        profileUpdates.home_airport = importData.homeAirport;
      }
      if (importData.currency) {
        profileUpdates.currency = importData.currency;
      }
      if (typeof importData.targetCPM === 'number') {
        profileUpdates.target_cpm = importData.targetCPM;
      }
      if (Object.keys(profileUpdates).length > 0) {
        savePromises.push(updateProfile(user.id, profileUpdates));
      }

      const results = await Promise.all(savePromises);
      const allSucceeded = results.every(r => r);

      if (!allSucceeded) {
        console.error('JSON import: some saves failed');
        return false;
      }

      // Reload from database
      const freshData = await fetchAllUserData(user.id);

      setFlightsInternal(freshData.flights);
      setBaseMilesDataInternal(freshData.milesData);
      setRedemptionsInternal(freshData.redemptions);

      const loadedLedger: ManualLedger = {};
      Object.entries(freshData.xpLedger).forEach(([month, entry]) => {
        loadedLedger[month] = {
          amexXp: entry.amexXp,
          bonusSafXp: entry.bonusSafXp,
          miscXp: entry.miscXp,
          correctionXp: entry.correctionXp,
        };
      });
      setManualLedgerInternal(loadedLedger);

      if (freshData.profile) {
        setTargetCPMInternal(freshData.profile.targetCPM || 0.012);
        setXpRolloverInternal(freshData.profile.xpRollover || 0);
        setCurrencyInternal((freshData.profile.currency || 'EUR') as CurrencyCode);
        setHomeAirportInternal(freshData.profile.homeAirport || null);

        if (freshData.profile.qualificationStartMonth) {
          setQualificationSettingsInternal({
            cycleStartMonth: freshData.profile.qualificationStartMonth,
            cycleStartDate: freshData.profile.qualificationStartDate || undefined,
            startingStatus: (freshData.profile.startingStatus || 'Explorer') as StatusLevel,
            startingXP: freshData.profile.startingXP ?? 0,
            ultimateCycleType: freshData.profile.ultimateCycleType || 'qualification',
          });
        }
      }

      console.log('[handleJsonImport] Import complete, data reloaded from database');
      return true;
    } catch (error) {
      console.error('JSON import error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
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
    setDemoStatus('Platinum');
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
    isReturningUser?: boolean;
  }) => {
    setCurrencyInternal(data.currency);
    setHomeAirportInternal(data.homeAirport);
    setTargetCPMInternal(data.targetCPM);
    setEmailConsentInternal(data.emailConsent);
    setOnboardingCompletedInternal(true);

    if (!data.isReturningUser) {
      setXpRolloverInternal(data.rolloverXP);
      setMilesBalanceInternal(data.milesBalance);
      setCurrentUXPInternal(data.currentUXP);

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

    if (user && !isDemoMode) {
      try {
        const profileUpdates: Record<string, unknown> = {
          currency: data.currency,
          home_airport: data.homeAirport,
          target_cpm: data.targetCPM,
          email_consent: data.emailConsent,
          onboarding_completed: true,
        };

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
