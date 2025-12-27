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
//
// Updated Dec 2025: Transaction-based deduplication for PDF imports

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
  useInsertManualTransactionMutation,
  useUpsertManualXPEntry,
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
  ActivityTransaction,
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
import { convertToActivityTransactions, createAdjustmentTransaction } from '../modules/ai-pdf-parser/converter';

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
  // New transaction system
  activityTransactions: ActivityTransaction[];
  useNewTransactions: boolean;
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
  /** New: Handle single cell change in XP ledger - for new transaction system */
  handleManualXPCellChange: (month: string, field: 'amexXp' | 'miscXp', value: number) => void;
  handleXPRolloverUpdate: (rollover: number) => void;
  handleQualificationSettingsUpdate: (settings: QualificationSettings | null) => void;
  handlePdfImport: (
    flights: FlightRecord[],
    transactions: ActivityTransaction[],  // Changed from MilesRecord[]
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
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
    // New transaction system
    activityTransactions?: ActivityTransaction[];
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
  const insertManualTransactionMutation = useInsertManualTransactionMutation();
  const upsertManualXPMutation = useUpsertManualXPEntry();

  const isSaving = 
    saveFlightsMutation.isPending ||
    saveMilesMutation.isPending ||
    saveRedemptionsMutation.isPending ||
    saveXPLedgerMutation.isPending ||
    saveProfileMutation.isPending ||
    pdfImportMutation.isPending ||
    insertManualTransactionMutation.isPending ||
    upsertManualXPMutation.isPending;

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

  /**
   * Add a single manual transaction.
   * For users on the new transaction system (useNewTransactions = true),
   * this writes directly to activity_transactions.
   * For legacy users, it falls back to the old MilesRecord system.
   */
  const handleAddManualTransaction = useCallback(async (input: {
    date: string;
    type: 'subscription' | 'amex' | 'other';
    miles: number;
    cost?: number;
    description?: string;
  }): Promise<boolean> => {
    const useNewTransactions = queryData?.profile?.useNewTransactions ?? false;
    
    console.log('[handleAddManualTransaction] Adding transaction:', {
      ...input,
      useNewTransactions,
    });

    if (isDemoMode || isLocalMode) {
      // Demo/local mode: use legacy approach with local state
      const targetMonth = input.date.slice(0, 7);
      const existingData = isDemoMode ? demoMilesData : localMilesData;
      const existingIndex = existingData.findIndex(r => r.month === targetMonth);
      let newData = [...existingData];

      if (existingIndex >= 0) {
        const record = { ...newData[existingIndex] };
        switch (input.type) {
          case 'subscription':
            record.miles_subscription += input.miles;
            record.cost_subscription += input.cost ?? 0;
            break;
          case 'amex':
            record.miles_amex += input.miles;
            record.cost_amex += input.cost ?? 0;
            break;
          case 'other':
            record.miles_other += input.miles;
            record.cost_other += input.cost ?? 0;
            break;
        }
        newData[existingIndex] = record;
      } else {
        const { generateId } = await import('../utils/format');
        const newRecord: MilesRecord = {
          id: generateId(),
          month: targetMonth,
          miles_subscription: input.type === 'subscription' ? input.miles : 0,
          miles_amex: input.type === 'amex' ? input.miles : 0,
          miles_flight: 0,
          miles_other: input.type === 'other' ? input.miles : 0,
          miles_debit: 0,
          cost_subscription: input.type === 'subscription' ? (input.cost ?? 0) : 0,
          cost_amex: input.type === 'amex' ? (input.cost ?? 0) : 0,
          cost_flight: 0,
          cost_other: input.type === 'other' ? (input.cost ?? 0) : 0,
        };
        newData.push(newRecord);
      }

      if (isDemoMode) {
        setDemoMilesData(newData);
      } else {
        setLocalMilesData(newData);
      }
      return true;
    }

    if (!user) {
      console.error('[handleAddManualTransaction] No user');
      return false;
    }

    if (useNewTransactions) {
      // NEW SYSTEM: Insert into activity_transactions
      try {
        await insertManualTransactionMutation.mutateAsync({
          date: input.date,
          type: input.type,
          miles: input.miles,
          cost: input.cost,
          description: input.description,
        });
        return true;
      } catch (error) {
        console.error('[handleAddManualTransaction] Error inserting transaction:', error);
        return false;
      }
    } else {
      // LEGACY SYSTEM: Update MilesRecord array
      const targetMonth = input.date.slice(0, 7);
      const existingData = baseMilesData;
      const existingIndex = existingData.findIndex(r => r.month === targetMonth);
      let newData = [...existingData];

      if (existingIndex >= 0) {
        const record = { ...newData[existingIndex] };
        switch (input.type) {
          case 'subscription':
            record.miles_subscription += input.miles;
            record.cost_subscription += input.cost ?? 0;
            break;
          case 'amex':
            record.miles_amex += input.miles;
            record.cost_amex += input.cost ?? 0;
            break;
          case 'other':
            record.miles_other += input.miles;
            record.cost_other += input.cost ?? 0;
            break;
        }
        newData[existingIndex] = record;
      } else {
        const { generateId } = await import('../utils/format');
        const newRecord: MilesRecord = {
          id: generateId(),
          month: targetMonth,
          miles_subscription: input.type === 'subscription' ? input.miles : 0,
          miles_amex: input.type === 'amex' ? input.miles : 0,
          miles_flight: 0,
          miles_other: input.type === 'other' ? input.miles : 0,
          miles_debit: 0,
          cost_subscription: input.type === 'subscription' ? (input.cost ?? 0) : 0,
          cost_amex: input.type === 'amex' ? (input.cost ?? 0) : 0,
          cost_flight: 0,
          cost_other: input.type === 'other' ? (input.cost ?? 0) : 0,
        };
        newData.push(newRecord);
      }

      setBaseMilesData(newData);
      return true;
    }
  }, [
    queryData?.profile?.useNewTransactions, 
    isDemoMode, 
    isLocalMode, 
    user, 
    baseMilesData, 
    demoMilesData, 
    localMilesData,
    setBaseMilesData,
    insertManualTransactionMutation,
  ]);

  /**
   * Update the cost of an existing transaction.
   * Used for inline cost editing in TransactionLedger.
   */
  const handleUpdateTransactionCost = useCallback(async (
    transactionId: string,
    cost: number | null
  ): Promise<boolean> => {
    if (isDemoMode || isLocalMode) {
      console.log('[handleUpdateTransactionCost] Demo/local mode - cost updates not persisted');
      return false;
    }

    if (!user) {
      console.error('[handleUpdateTransactionCost] No user');
      return false;
    }

    console.log('[handleUpdateTransactionCost] Updating:', { transactionId, cost });

    try {
      const { updateTransactionCost } = await import('../lib/dataService');
      const success = await updateTransactionCost(user.id, transactionId, cost);
      
      if (success) {
        // Invalidate the query to refetch fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
      
      return success;
    } catch (error) {
      console.error('[handleUpdateTransactionCost] Error:', error);
      return false;
    }
  }, [isDemoMode, isLocalMode, user, queryClient]);

  /**
   * Delete an activity transaction.
   * Used for removing duplicates or erroneous entries.
   */
  const handleDeleteTransaction = useCallback(async (
    transactionId: string
  ): Promise<boolean> => {
    if (isDemoMode || isLocalMode) {
      console.log('[handleDeleteTransaction] Demo/local mode - deletes not persisted');
      return false;
    }

    if (!user) {
      console.error('[handleDeleteTransaction] No user');
      return false;
    }

    console.log('[handleDeleteTransaction] Deleting:', transactionId);

    try {
      const { deleteActivityTransactions } = await import('../lib/dataService');
      const success = await deleteActivityTransactions(user.id, [transactionId]);
      
      if (success) {
        // Invalidate the query to refetch fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
      
      return success;
    } catch (error) {
      console.error('[handleDeleteTransaction] Error:', error);
      return false;
    }
  }, [isDemoMode, isLocalMode, user, queryClient]);

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

  /**
   * Handle a single cell change in the XP ledger.
   * For users on the new transaction system, this writes directly to activity_transactions.
   * For legacy users, it falls back to the old xp_ledger system.
   * 
   * The source is determined automatically:
   * - Past/current months → 'manual' (actual XP)
   * - Future months → 'scheduled' (projected XP)
   */
  const handleManualXPCellChange = useCallback((
    month: string,
    field: 'amexXp' | 'miscXp',
    value: number
  ) => {
    const useNewTransactions = queryData?.profile?.useNewTransactions ?? false;
    
    console.log('[handleManualXPCellChange]', { month, field, value, useNewTransactions });
    
    if (isDemoMode || isLocalMode) {
      // Demo/local mode: update local state
      const setter = isDemoMode ? setDemoManualLedger : setLocalManualLedger;
      setter(prev => ({
        ...prev,
        [month]: {
          ...prev[month],
          amexXp: prev[month]?.amexXp || 0,
          bonusSafXp: prev[month]?.bonusSafXp || 0,
          miscXp: prev[month]?.miscXp || 0,
          correctionXp: prev[month]?.correctionXp || 0,
          [field]: value,
        },
      }));
      return;
    }
    
    if (!user) return;
    
    if (useNewTransactions) {
      // NEW SYSTEM: Write single entry to activity_transactions
      upsertManualXPMutation.mutate({ month, field, value });
    } else {
      // LEGACY SYSTEM: Update entire xp_ledger
      setManualLedger(prev => ({
        ...prev,
        [month]: {
          ...prev[month],
          amexXp: prev[month]?.amexXp || 0,
          bonusSafXp: prev[month]?.bonusSafXp || 0,
          miscXp: prev[month]?.miscXp || 0,
          correctionXp: prev[month]?.correctionXp || 0,
          [field]: value,
        },
      }));
    }
  }, [isDemoMode, isLocalMode, user, queryData?.profile?.useNewTransactions, upsertManualXPMutation, setManualLedger]);

  const handleXPRolloverUpdate = useCallback((newRollover: number) => {
    setXpRollover(newRollover);
  }, [setXpRollover]);

  const handleQualificationSettingsUpdate = useCallback((settings: QualificationSettings | null) => {
    setQualificationSettings(settings);
  }, [setQualificationSettings]);

  // -------------------------------------------------------------------------
  // PDF IMPORT - Transaction-based deduplication (Dec 2025 update)
  // 
  // Key changes:
  // 1. Accepts ActivityTransaction[] instead of MilesRecord[]
  // 2. Uses upsert with ON CONFLICT DO NOTHING for automatic deduplication
  // 3. Sets use_new_transactions=true to migrate user to new system
  // -------------------------------------------------------------------------

  const handlePdfImport = useCallback((
    importedFlights: FlightRecord[],
    importedTransactions: ActivityTransaction[],  // NEW: Individual transactions
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; cycleStartDate?: string; startingStatus: StatusLevel; startingXP?: number },
  ) => {
    console.log('[useUserData] handlePdfImport called (new transaction system)', {
      flights: importedFlights.length,
      transactions: importedTransactions.length,
      xpCorrection,
      cycleSettings,
    });

    // Get current activity transactions from query data
    const currentTransactions = queryData?.activityTransactions ?? [];

    // Create backup before modifying data
    try {
      createBackup(
        {
          flights,
          activityTransactions: currentTransactions,
          qualificationSettings,
          xpRollover,
          currency,
          targetCPM,
          useNewTransactions: queryData?.profile?.useNewTransactions ?? false,
          // Legacy data for backwards compatible restore
          milesRecords: baseMilesData,
          manualLedger,
        },
        'PDF Import'
      );
    } catch (e) {
      console.error('[handlePdfImport] Failed to create backup:', e);
    }

    // Tag imported flights with source info
    const timestamp = new Date().toISOString();
    const taggedFlights = importedFlights.map(f => ({
      ...f,
      importSource: 'pdf' as const,
      importedAt: f.importedAt || timestamp,
    }));

    // Merge flights (skip duplicates based on date|route)
    const existingFlightKeys = new Set(flights.map((f) => `${f.date}|${f.route}`));
    const newFlightsToAdd = taggedFlights.filter((f) => !existingFlightKeys.has(`${f.date}|${f.route}`));
    const mergedFlights = [...flights, ...newFlightsToAdd].sort((a, b) => b.date.localeCompare(a.date));

    // Activity transactions: NO client-side merging needed!
    // The server-side upsert with ON CONFLICT DO NOTHING handles deduplication.
    // We send ALL transactions, the server skips existing ones automatically.
    let allTransactions = [...importedTransactions];

    // Add manual XP correction if provided
    if (xpCorrection && xpCorrection.correctionXp !== 0) {
      const correctionTx = createAdjustmentTransaction(
        xpCorrection.month + '-01',  // First of month
        0,  // No miles
        xpCorrection.correctionXp,
        xpCorrection.reason || 'XP correction from PDF import'
      );
      allTransactions.push(correctionTx);
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
      // For demo mode, we still need to show something
      // Aggregate transactions into old format for display
      setDemoFlights(mergedFlights);
      // Demo mode doesn't support new transaction system fully
      // Just update flights for now
      return;
    }

    if (isLocalMode) {
      setLocalFlights(mergedFlights);
      // Local mode doesn't support new transaction system fully
      return;
    }

    // For logged-in users: use the combined mutation with new transaction system
    // This saves everything atomically and handles optimistic updates
    // The mutation will:
    // 1. Save flights
    // 2. Upsert transactions (ON CONFLICT DO NOTHING)
    // 3. Set use_new_transactions = true (migrate user)
    // 4. Update profile settings
    pdfImportMutation.mutate({
      flights: mergedFlights,
      activityTransactions: allTransactions,
      profile: profileUpdates,
    });

  }, [
    flights, baseMilesData, manualLedger, qualificationSettings, xpRollover, currency, targetCPM,
    isDemoMode, isLocalMode, pdfImportMutation, queryData?.activityTransactions, queryData?.profile?.useNewTransactions
  ]);

  // -------------------------------------------------------------------------
  // UNDO IMPORT - Supports both new and legacy backup formats
  // -------------------------------------------------------------------------

  const handleUndoImport = useCallback((): boolean => {
    const backup = restoreBackup();
    if (!backup) {
      console.log('[handleUndoImport] No backup found');
      return false;
    }

    console.log('[handleUndoImport] Restoring backup:', {
      timestamp: backup.timestamp,
      useNewTransactions: backup.useNewTransactions,
      hasActivityTransactions: backup.activityTransactions?.length ?? 0,
      hasLegacyData: !!(backup.milesRecords?.length || backup.manualLedger),
    });

    if (isDemoMode) {
      setDemoFlights(backup.flights as FlightRecord[]);
      if (backup.milesRecords) {
        setDemoMilesData(backup.milesRecords as MilesRecord[]);
      }
      if (backup.manualLedger) {
        setDemoManualLedger(backup.manualLedger as ManualLedger);
      }
      clearBackup();
      return true;
    }
    
    if (isLocalMode) {
      setLocalFlights(backup.flights as FlightRecord[]);
      if (backup.milesRecords) {
        setLocalMilesData(backup.milesRecords as MilesRecord[]);
      }
      if (backup.manualLedger) {
        setLocalManualLedger(backup.manualLedger as ManualLedger);
      }
      clearBackup();
      return true;
    }
    
    if (user) {
      // Determine restore strategy based on backup type
      const isNewSystemBackup = backup.useNewTransactions === true && 
                                 Array.isArray(backup.activityTransactions);
      
      if (isNewSystemBackup) {
        // NEW SYSTEM: Restore activity transactions
        console.log('[handleUndoImport] Restoring new system backup');
        pdfImportMutation.mutate({
          flights: backup.flights,
          activityTransactions: backup.activityTransactions || [],
          profile: {
            qualification_start_month: backup.qualificationSettings?.cycleStartMonth ?? null,
            qualification_start_date: backup.qualificationSettings?.cycleStartDate ?? null,
            starting_status: backup.qualificationSettings?.startingStatus ?? null,
            starting_xp: backup.qualificationSettings?.startingXP ?? 0,
            use_new_transactions: true,  // Keep on new system
          },
        });
      } else {
        // LEGACY: Restore old format AND reset to legacy mode
        console.log('[handleUndoImport] Restoring legacy backup, resetting to legacy mode');
        
        // We need to use the old mutation format here
        // But pdfImportMutation now expects new format...
        // For now, we'll restore flights and set profile, then user needs to re-import
        
        // Save flights directly
        saveFlightsMutation.mutate(backup.flights);
        
        // Save legacy XP ledger if present
        if (backup.manualLedger) {
          saveXPLedgerMutation.mutate(convertToXPLedger(backup.manualLedger));
        }
        
        // Save legacy miles if present
        if (backup.milesRecords) {
          saveMilesMutation.mutate(backup.milesRecords as MilesRecord[]);
        }
        
        // Reset to legacy mode
        saveProfileMutation.mutate({
          qualification_start_month: backup.qualificationSettings?.cycleStartMonth ?? null,
          qualification_start_date: backup.qualificationSettings?.cycleStartDate ?? null,
          starting_status: backup.qualificationSettings?.startingStatus ?? null,
          starting_xp: backup.qualificationSettings?.startingXP ?? 0,
          use_new_transactions: false,  // Reset to legacy mode
        });
      }
    }

    clearBackup();
    return true;
  }, [isDemoMode, isLocalMode, user, pdfImportMutation, saveFlightsMutation, saveXPLedgerMutation, saveMilesMutation, saveProfileMutation]);

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
    // New transaction system
    activityTransactions?: ActivityTransaction[];
  }): Promise<boolean> => {
    try {
      // Detect if this is a new format import (has activityTransactions)
      const hasNewTransactions = Array.isArray(importData.activityTransactions) && 
                                  importData.activityTransactions.length > 0;
      
      console.log('[handleJsonImport] Format:', hasNewTransactions ? 'new (transactions)' : 'legacy');
      
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

      // If we have activityTransactions, use the new import path
      if (hasNewTransactions) {
        console.log('[handleJsonImport] Using new transaction system with', importData.activityTransactions!.length, 'transactions');
        
        // Set flag to use new transactions
        profileUpdates.use_new_transactions = true;
        
        await pdfImportMutation.mutateAsync({
          flights: newFlights,
          activityTransactions: importData.activityTransactions,
          profile: profileUpdates,
        });
      } else {
        // Legacy import path
        console.log('[handleJsonImport] Using legacy import path');
        
        await pdfImportMutation.mutateAsync({
          flights: newFlights,
          milesData: newMiles,
          xpLedger: convertToXPLedger(newLedger),
          profile: profileUpdates,
        });
      }

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
      // New transaction system
      activityTransactions: queryData?.activityTransactions ?? [],
      useNewTransactions: queryData?.profile?.useNewTransactions ?? false,
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
      handleAddManualTransaction,
      handleUpdateTransactionCost,
      handleDeleteTransaction,
      handleRedemptionsUpdate,
      handleTargetCPMUpdate,
      handleCurrencyUpdate,
      handleManualXPLedgerUpdate,
      handleManualXPCellChange,
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
