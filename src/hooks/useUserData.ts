// src/hooks/useUserData.ts
// React Query-based user data management hook
// 
// Architecture: React Query handles all server state synchronization
// - No debounced auto-save - mutations save immediately
// - No stale closures - React Query cache is always fresh
// - Optimistic updates with automatic rollback on error
// - Server is source of truth, not local state
//
// Migrated from useState-based implementation (Dec 2024) to fix
// data synchronization issues (XP oscillation bug)

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/AuthContext';
import {
  useUserDataQuery,
  useSaveFlights,
  useSaveMilesRecords,
  useSaveRedemptions,
  useSaveXPLedger,
  useSaveProfile,
  useDeleteAllData,
  usePdfImportMutation,
  convertToManualLedger,
  convertToXPLedger,
  queryKeys,
  UserDataQueryResult,
} from './queries/useDataQueries';
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

// Type imports
import type { QualificationSettings } from '../types/qualification';
export type { QualificationSettings } from '../types/qualification';

// ============================================================================
// TYPES (same as useUserData for compatibility)
// ============================================================================

export interface UserDataState {
  baseMilesData: MilesRecord[];
  baseXpData: XPRecord[];
  manualLedger: ManualLedger;
  redemptions: RedemptionRecord[];
  flights: FlightRecord[];
  xpRollover: number;
  targetCPM: number;
  currency: CurrencyCode;
  qualificationSettings: QualificationSettings | null;
  milesData: MilesRecord[];
  xpData: XPRecord[];
  currentStatus: StatusLevel;
  currentMonth: string;
  homeAirport: string | null;
  milesBalance: number;
  currentUXP: number;
}

export interface UserDataActions {
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
  handleFlightsUpdate: (flights: FlightRecord[]) => void;
  handleFlightIntakeApply: (payloads: FlightIntakePayload[]) => void;
  handleManualLedgerUpdate: (data: MilesRecord[]) => void;
  handleRedemptionsUpdate: (redemptions: RedemptionRecord[]) => void;
  handleTargetCPMUpdate: (cpm: number) => void;
  handleCurrencyUpdate: (currency: CurrencyCode) => void;
  handleManualXPLedgerUpdate: (ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => void;
  handleXPRolloverUpdate: (rollover: number) => void;
  handleQualificationSettingsUpdate: (settings: QualificationSettings | null) => void;
  handlePdfImport: (
    flights: FlightRecord[],
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
    bonusXpByMonth?: Record<string, number>
  ) => void;
  handleUndoImport: () => boolean;
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
  handleLoadDemo: () => void;
  handleStartEmpty: () => void;
  handleStartOver: () => void;
  handleEnterDemoMode: () => void;
  handleEnterLocalMode: () => void;
  handleExitDemoMode: () => void;
  handleSetDemoStatus: (status: StatusLevel) => void;
  markDataChanged: () => void;
  calculateGlobalCPM: () => number;
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
  }) => void;
  handleRerunOnboarding: () => void;
  handleEmailConsentChange: (consent: boolean) => void;
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
// HOOK IMPLEMENTATION
// ============================================================================

export function useUserData(): UseUserDataReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // REACT QUERY - Data fetching
  // -------------------------------------------------------------------------

  const { data: queryData, isLoading: isQueryLoading } = useUserDataQuery(user?.id);

  // -------------------------------------------------------------------------
  // MUTATIONS - Data saving
  // -------------------------------------------------------------------------

  const saveFlightsMutation = useSaveFlights();
  const saveMilesMutation = useSaveMilesRecords();
  const saveRedemptionsMutation = useSaveRedemptions();
  const saveXPLedgerMutation = useSaveXPLedger();
  const saveProfileMutation = useSaveProfile();
  const deleteAllMutation = useDeleteAllData();
  const pdfImportMutation = usePdfImportMutation();

  const isSaving = 
    saveFlightsMutation.isPending ||
    saveMilesMutation.isPending ||
    saveRedemptionsMutation.isPending ||
    saveXPLedgerMutation.isPending ||
    saveProfileMutation.isPending ||
    pdfImportMutation.isPending;

  // -------------------------------------------------------------------------
  // LOCAL UI STATE (not persisted)
  // -------------------------------------------------------------------------

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [currentMonth, setCurrentMonth] = useState<string>(defaultMonth);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [demoStatus, setDemoStatus] = useState<StatusLevel>('Platinum');
  const [showWelcome, setShowWelcome] = useState(false);

  // Demo mode local state
  const [demoFlights, setDemoFlights] = useState<FlightRecord[]>([]);
  const [demoMilesData, setDemoMilesData] = useState<MilesRecord[]>([]);
  const [demoManualLedger, setDemoManualLedger] = useState<ManualLedger>({});
  const [demoRedemptions, setDemoRedemptions] = useState<RedemptionRecord[]>([]);

  // Local mode state (for anonymous users)
  const [localFlights, setLocalFlights] = useState<FlightRecord[]>([]);
  const [localMilesData, setLocalMilesData] = useState<MilesRecord[]>([]);
  const [localManualLedger, setLocalManualLedger] = useState<ManualLedger>({});
  const [localRedemptions, setLocalRedemptions] = useState<RedemptionRecord[]>([]);

  // -------------------------------------------------------------------------
  // DERIVED DATA - Extract from query result or use defaults/demo data
  // -------------------------------------------------------------------------

  const flights = useMemo(() => {
    if (isDemoMode) return demoFlights;
    if (isLocalMode) return localFlights;
    return queryData?.flights ?? [];
  }, [isDemoMode, isLocalMode, demoFlights, localFlights, queryData?.flights]);

  const baseMilesData = useMemo(() => {
    if (isDemoMode) return demoMilesData;
    if (isLocalMode) return localMilesData;
    return queryData?.milesData ?? [];
  }, [isDemoMode, isLocalMode, demoMilesData, localMilesData, queryData?.milesData]);

  const redemptions = useMemo(() => {
    if (isDemoMode) return demoRedemptions;
    if (isLocalMode) return localRedemptions;
    return queryData?.redemptions ?? [];
  }, [isDemoMode, isLocalMode, demoRedemptions, localRedemptions, queryData?.redemptions]);

  const manualLedger = useMemo(() => {
    if (isDemoMode) return demoManualLedger;
    if (isLocalMode) return localManualLedger;
    return queryData?.xpLedger ? convertToManualLedger(queryData.xpLedger) : {};
  }, [isDemoMode, isLocalMode, demoManualLedger, localManualLedger, queryData?.xpLedger]);

  const profile = queryData?.profile;

  const xpRollover = useMemo(() => {
    if (isDemoMode || isLocalMode) return 0;
    return profile?.startingXP ?? profile?.xpRollover ?? 0;
  }, [isDemoMode, isLocalMode, profile]);

  const targetCPM = profile?.targetCPM ?? 0.012;
  const currency = (profile?.currency ?? 'EUR') as CurrencyCode;
  const homeAirport = profile?.homeAirport ?? null;
  const milesBalance = profile?.milesBalance ?? 0;
  const currentUXP = profile?.currentUXP ?? 0;
  const onboardingCompleted = profile?.onboardingCompleted ?? false;
  const emailConsent = profile?.emailConsent ?? false;

  const qualificationSettings = useMemo((): QualificationSettings | null => {
    if (isDemoMode || isLocalMode) return null;
    if (!profile?.qualificationStartMonth) return null;
    return {
      cycleStartMonth: profile.qualificationStartMonth,
      cycleStartDate: profile.qualificationStartDate,
      startingStatus: (profile.startingStatus || 'Explorer') as StatusLevel,
      startingXP: profile.startingXP ?? profile.xpRollover ?? 0,
      ultimateCycleType: profile.ultimateCycleType || 'qualification',
    };
  }, [isDemoMode, isLocalMode, profile]);

  // -------------------------------------------------------------------------
  // COMPUTED DATA (same logic as useUserData)
  // -------------------------------------------------------------------------

  const baseXpData: XPRecord[] = []; // Legacy, kept for compatibility

  const { miles: milesData, xp: xpData } = useMemo(
    () => rebuildLedgersFromFlights(baseMilesData, baseXpData, flights),
    [baseMilesData, baseXpData, flights]
  );

  const currentStatus = useMemo((): StatusLevel => {
    if (isDemoMode) return demoStatus;
    const stats = calculateMultiYearStats(xpData, xpRollover, flights, manualLedger);
    const currentYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    const cycle = stats[currentYear];
    return (cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer') as StatusLevel;
  }, [isDemoMode, demoStatus, xpData, xpRollover, flights, manualLedger]);

  // -------------------------------------------------------------------------
  // BACKUP STATE
  // -------------------------------------------------------------------------

  const canUndoImport = hasBackup();
  const importBackupInfo = getBackupInfo();

  // -------------------------------------------------------------------------
  // ACTIONS - Setters that trigger saves
  // -------------------------------------------------------------------------

  const setFlights = useCallback((newFlights: FlightRecord[]) => {
    if (isDemoMode) {
      setDemoFlights(newFlights);
    } else if (isLocalMode) {
      setLocalFlights(newFlights);
    } else if (user) {
      saveFlightsMutation.mutate(newFlights);
    }
  }, [isDemoMode, isLocalMode, user, saveFlightsMutation]);

  const setBaseMilesData = useCallback((data: MilesRecord[]) => {
    if (isDemoMode) {
      setDemoMilesData(data);
    } else if (isLocalMode) {
      setLocalMilesData(data);
    } else if (user) {
      saveMilesMutation.mutate(data);
    }
  }, [isDemoMode, isLocalMode, user, saveMilesMutation]);

  const setRedemptions = useCallback((newRedemptions: RedemptionRecord[]) => {
    if (isDemoMode) {
      setDemoRedemptions(newRedemptions);
    } else if (isLocalMode) {
      setLocalRedemptions(newRedemptions);
    } else if (user) {
      saveRedemptionsMutation.mutate(newRedemptions);
    }
  }, [isDemoMode, isLocalMode, user, saveRedemptionsMutation]);

  const setManualLedger = useCallback((ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => {
    const newLedger = typeof ledger === 'function' ? ledger(manualLedger) : ledger;
    
    if (isDemoMode) {
      setDemoManualLedger(newLedger);
    } else if (isLocalMode) {
      setLocalManualLedger(newLedger);
    } else if (user) {
      saveXPLedgerMutation.mutate(convertToXPLedger(newLedger));
    }
  }, [isDemoMode, isLocalMode, user, manualLedger, saveXPLedgerMutation]);

  const setXpRollover = useCallback((rollover: number) => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({ starting_xp: rollover, xp_rollover: rollover });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const setTargetCPM = useCallback((cpm: number) => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({ target_cpm: cpm });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({ currency: newCurrency });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const setQualificationSettings = useCallback((settings: QualificationSettings | null) => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({
      qualification_start_month: settings?.cycleStartMonth ?? null,
      qualification_start_date: settings?.cycleStartDate ?? null,
      starting_status: settings?.startingStatus ?? null,
      starting_xp: settings?.startingXP ?? 0,
      ultimate_cycle_type: settings?.ultimateCycleType ?? null,
    });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const setBaseXpData = useCallback((_data: XPRecord[]) => {
    // Legacy - XP data is now derived from flights
    console.log('[useUserData] setBaseXpData called - this is a no-op (React Query saves immediately)');
  }, []);

  // -------------------------------------------------------------------------
  // HIGH-LEVEL HANDLERS
  // -------------------------------------------------------------------------

  const handleFlightsUpdate = useCallback((newFlights: FlightRecord[]) => {
    setFlights(newFlights);
  }, [setFlights]);

  const handleFlightIntakeApply = useCallback((payloads: FlightIntakePayload[]) => {
    const newRecords = payloads.map(createFlightRecord);
    setFlights([...flights, ...newRecords]);
  }, [flights, setFlights]);

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
  // PDF IMPORT - The critical function that was causing issues
  // -------------------------------------------------------------------------

  const handlePdfImport = useCallback((
    importedFlights: FlightRecord[],
    importedMiles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
    bonusXpByMonth?: Record<string, number>
  ) => {
    console.log('[useUserData] handlePdfImport called', {
      flights: importedFlights.length,
      miles: importedMiles.length,
      xpCorrection,
      cycleSettings,
      bonusXpByMonth,
    });

    // Create backup before modifying data
    try {
      createBackup(
        {
          flights,
          milesRecords: baseMilesData,
          qualificationSettings,
          manualLedger,
          xpRollover,
          currency,
          targetCPM,
        },
        'PDF Import'
      );
    } catch (e) {
      console.error('[handlePdfImport] Failed to create backup:', e);
    }

    // Tag imported flights
    const timestamp = new Date().toISOString();
    const taggedFlights = importedFlights.map(f => ({
      ...f,
      importSource: 'pdf' as const,
      importedAt: f.importedAt || timestamp,
    }));

    // Merge flights (skip duplicates)
    const existingFlightKeys = new Set(flights.map((f) => `${f.date}|${f.route}`));
    const newFlightsToAdd = taggedFlights.filter((f) => !existingFlightKeys.has(`${f.date}|${f.route}`));
    const mergedFlights = [...flights, ...newFlightsToAdd].sort((a, b) => b.date.localeCompare(a.date));

    // Merge miles
    const milesByMonth = new Map(baseMilesData.map(m => [m.month, m]));
    for (const incoming of importedMiles) {
      milesByMonth.set(incoming.month, incoming);
    }
    const mergedMiles = Array.from(milesByMonth.values()).sort((a, b) => b.month.localeCompare(a.month));

    // Build new manual ledger
    const newManualLedger: ManualLedger = { ...manualLedger };
    
    if (xpCorrection && xpCorrection.correctionXp !== 0) {
      const existing = newManualLedger[xpCorrection.month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
      newManualLedger[xpCorrection.month] = {
        ...existing,
        correctionXp: (existing.correctionXp || 0) + xpCorrection.correctionXp,
      };
    }

    if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
      for (const [month, xp] of Object.entries(bonusXpByMonth)) {
        const existing = newManualLedger[month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 };
        newManualLedger[month] = { ...existing, miscXp: (existing.miscXp || 0) + xp };
      }
    }

    // Build profile updates
    const profileUpdates: Record<string, unknown> = {};
    if (cycleSettings) {
      profileUpdates.qualification_start_month = cycleSettings.cycleStartMonth;
      profileUpdates.qualification_start_date = cycleSettings.cycleStartDate || null;
      profileUpdates.starting_status = cycleSettings.startingStatus;
      profileUpdates.starting_xp = cycleSettings.startingXP ?? 0;
    }

    // Handle demo/local mode separately
    if (isDemoMode) {
      setDemoFlights(mergedFlights);
      setDemoMilesData(mergedMiles);
      setDemoManualLedger(newManualLedger);
      return;
    }

    if (isLocalMode) {
      setLocalFlights(mergedFlights);
      setLocalMilesData(mergedMiles);
      setLocalManualLedger(newManualLedger);
      return;
    }

    // For logged-in users: use the combined mutation
    // This saves everything atomically and handles optimistic updates
    pdfImportMutation.mutate({
      flights: mergedFlights,
      milesData: mergedMiles,
      xpLedger: convertToXPLedger(newManualLedger),
      profile: profileUpdates,
    });

  }, [
    flights, baseMilesData, manualLedger, qualificationSettings, xpRollover, currency, targetCPM,
    isDemoMode, isLocalMode, pdfImportMutation
  ]);

  // -------------------------------------------------------------------------
  // UNDO IMPORT
  // -------------------------------------------------------------------------

  const handleUndoImport = useCallback((): boolean => {
    const backup = restoreBackup();
    if (!backup) return false;

    if (isDemoMode) {
      setDemoFlights(backup.flights as FlightRecord[]);
      setDemoMilesData(backup.milesRecords as MilesRecord[]);
      setDemoManualLedger(backup.manualLedger as ManualLedger);
    } else if (isLocalMode) {
      setLocalFlights(backup.flights as FlightRecord[]);
      setLocalMilesData(backup.milesRecords as MilesRecord[]);
      setLocalManualLedger(backup.manualLedger as ManualLedger);
    } else if (user) {
      // Restore via mutations
      pdfImportMutation.mutate({
        flights: backup.flights as FlightRecord[],
        milesData: backup.milesRecords as MilesRecord[],
        xpLedger: convertToXPLedger(backup.manualLedger as ManualLedger),
        profile: {
          qualification_start_month: (backup.qualificationSettings as QualificationSettings | null)?.cycleStartMonth ?? null,
          qualification_start_date: (backup.qualificationSettings as QualificationSettings | null)?.cycleStartDate ?? null,
          starting_status: (backup.qualificationSettings as QualificationSettings | null)?.startingStatus ?? null,
          starting_xp: (backup.qualificationSettings as QualificationSettings | null)?.startingXP ?? 0,
        },
      });
    }

    clearBackup();
    return true;
  }, [isDemoMode, isLocalMode, user, pdfImportMutation]);

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
    try {
      const newFlights = importData.flights ?? flights;
      const newMiles = importData.baseMilesData ?? baseMilesData;
      const newLedger = importData.manualLedger ?? manualLedger;
      
      const profileUpdates: Record<string, unknown> = {};
      if (importData.qualificationSettings) {
        profileUpdates.qualification_start_month = importData.qualificationSettings.cycleStartMonth;
        profileUpdates.qualification_start_date = importData.qualificationSettings.cycleStartDate ?? null;
        profileUpdates.starting_status = importData.qualificationSettings.startingStatus;
        profileUpdates.starting_xp = importData.qualificationSettings.startingXP ?? 0;
      }
      if (typeof importData.xpRollover === 'number') {
        profileUpdates.xp_rollover = importData.xpRollover;
        profileUpdates.starting_xp = importData.xpRollover;
      }
      if (importData.homeAirport !== undefined) profileUpdates.home_airport = importData.homeAirport;
      if (importData.currency) profileUpdates.currency = importData.currency;
      if (typeof importData.targetCPM === 'number') profileUpdates.target_cpm = importData.targetCPM;

      if (isDemoMode || isLocalMode) {
        if (importData.flights) isDemoMode ? setDemoFlights(importData.flights) : setLocalFlights(importData.flights);
        if (importData.baseMilesData) isDemoMode ? setDemoMilesData(importData.baseMilesData) : setLocalMilesData(importData.baseMilesData);
        if (importData.manualLedger) isDemoMode ? setDemoManualLedger(importData.manualLedger) : setLocalManualLedger(importData.manualLedger);
        if (importData.redemptions) isDemoMode ? setDemoRedemptions(importData.redemptions) : setLocalRedemptions(importData.redemptions);
        return true;
      }

      await pdfImportMutation.mutateAsync({
        flights: newFlights,
        milesData: newMiles,
        xpLedger: convertToXPLedger(newLedger),
        profile: profileUpdates,
      });

      if (importData.redemptions) {
        await saveRedemptionsMutation.mutateAsync(importData.redemptions);
      }

      return true;
    } catch (e) {
      console.error('[handleJsonImport] Failed:', e);
      return false;
    }
  }, [flights, baseMilesData, manualLedger, isDemoMode, isLocalMode, pdfImportMutation, saveRedemptionsMutation]);

  // -------------------------------------------------------------------------
  // DEMO/LOCAL MODE HANDLERS
  // -------------------------------------------------------------------------

  const loadDemoDataForStatus = useCallback((status: StatusLevel) => {
    const data = generateDemoDataForStatus(status);
    setDemoFlights(data.flights);
    setDemoMilesData(data.milesData);
    setDemoRedemptions(data.redemptions);
    setDemoManualLedger({});
  }, []);

  const handleLoadDemo = useCallback(() => {
    setIsDemoMode(true);
    setDemoStatus('Platinum');
    loadDemoDataForStatus('Platinum');
  }, [loadDemoDataForStatus]);

  const handleStartEmpty = useCallback(() => {
    setShowWelcome(false);
    // For logged-in users, data starts empty from query
    // For anonymous users, we'd use local mode
  }, []);

  const handleStartOver = useCallback(async () => {
    console.log('[useUserData] handleStartOver');
    
    if (isDemoMode) {
      setDemoFlights([]);
      setDemoMilesData([]);
      setDemoManualLedger({});
      setDemoRedemptions([]);
      setIsDemoMode(false);
      return;
    }

    if (isLocalMode) {
      setLocalFlights([]);
      setLocalMilesData([]);
      setLocalManualLedger({});
      setLocalRedemptions([]);
      setIsLocalMode(false);
      return;
    }

    if (user) {
      try {
        await deleteAllMutation.mutateAsync();
        // Query cache is already cleared by the mutation
        setShowWelcome(true);
      } catch (e) {
        console.error('[handleStartOver] Failed to delete data:', e);
        alert('Failed to clear data from server. Please try again.');
      }
    }
  }, [isDemoMode, isLocalMode, user, deleteAllMutation]);

  const handleEnterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setDemoStatus('Platinum');
    loadDemoDataForStatus('Platinum');
  }, [loadDemoDataForStatus]);

  const handleEnterLocalMode = useCallback(() => {
    setIsLocalMode(true);
    setLocalFlights([]);
    setLocalMilesData([]);
    setLocalManualLedger({});
    setLocalRedemptions([]);
  }, []);

  const handleExitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setIsLocalMode(false);
    // React Query will automatically refetch user data
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
    }
  }, [user?.id, queryClient]);

  const handleSetDemoStatus = useCallback((status: StatusLevel) => {
    setDemoStatus(status);
    loadDemoDataForStatus(status);
  }, [loadDemoDataForStatus]);

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
    if (!user || isDemoMode || isLocalMode) return;

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

      if (data.currentStatus !== 'Explorer' || data.currentXP > 0) {
        const now = new Date();
        const qYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
        profileUpdates.qualification_start_month = `${qYear - 1}-11`;
      }
    }

    try {
      await saveProfileMutation.mutateAsync(profileUpdates);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const handleRerunOnboarding = useCallback(() => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({ onboarding_completed: false });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  const handleEmailConsentChange = useCallback((consent: boolean) => {
    if (!user || isDemoMode || isLocalMode) return;
    saveProfileMutation.mutate({ email_consent: consent });
  }, [user, isDemoMode, isLocalMode, saveProfileMutation]);

  // -------------------------------------------------------------------------
  // UTILITY
  // -------------------------------------------------------------------------

  const markDataChanged = useCallback(() => {
    // No-op in V2 - mutations save immediately
    // Kept for API compatibility
    console.log('[useUserData] markDataChanged called - no-op (React Query saves immediately)');
  }, []);

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

  const forceSave = useCallback(async () => {
    // In V2, all changes are saved immediately
    // This is kept for API compatibility
    console.log('[useUserData] forceSave called - no-op (React Query saves immediately) (changes save immediately)');
  }, []);

  // -------------------------------------------------------------------------
  // RETURN - Same interface as useUserData
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
      canUndoImport,
      importBackupInfo,
      forceSave,
    },
    meta: {
      isLoading: isQueryLoading,
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
