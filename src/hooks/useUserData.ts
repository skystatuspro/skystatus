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
import {
  rebuildLedgersFromFlights,
  FlightIntakePayload,
  createFlightRecord,
} from '../utils/flight-intake';
import { calculateMultiYearStats } from '../utils/xp-logic';

// ============================================================================
// TYPES
// ============================================================================

export interface QualificationSettings {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
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
  setQualificationSettings: (settings: QualificationSettings | null) => void;
  setCurrentMonth: (month: string) => void;
  
  // High-level handlers
  handleFlightsUpdate: (flights: FlightRecord[]) => void;
  handleFlightIntakeApply: (payloads: FlightIntakePayload[]) => void;
  handleManualLedgerUpdate: (data: MilesRecord[]) => void;
  handleRedemptionsUpdate: (redemptions: RedemptionRecord[]) => void;
  handleTargetCPMUpdate: (cpm: number) => void;
  handleManualXPLedgerUpdate: (ledger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => void;
  handleXPRolloverUpdate: (rollover: number) => void;
  handlePdfImport: (
    flights: FlightRecord[],
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { cycleStartMonth: string; startingStatus: StatusLevel }
  ) => void;
  handleQualificationSettingsUpdate: (settings: QualificationSettings | null) => void;
  
  // Demo/Local mode
  handleLoadDemo: () => void;
  handleStartEmpty: () => void;
  handleStartOver: () => void;
  handleEnterDemoMode: () => void;
  handleEnterLocalMode: () => void;
  handleExitDemoMode: () => void;
  
  // Utility
  markDataChanged: () => void;
  calculateGlobalCPM: () => number;
}

export interface UserDataMeta {
  isLoading: boolean;
  isSaving: boolean;
  isDemoMode: boolean;
  isLocalMode: boolean;
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
  const [qualificationSettings, setQualificationSettingsInternal] = useState<QualificationSettings | null>(null);

  // Loading/saving state
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const debouncedDataVersion = useDebounce(dataVersion, 2000);

  // Mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
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

  const currentStatus = useMemo((): StatusLevel => {
    const stats = calculateMultiYearStats(xpData, xpRollover, flights, manualLedger);
    const now = new Date();
    const currentQYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    const cycle = stats[currentQYear];
    return (cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer') as StatusLevel;
  }, [xpData, xpRollover, flights, manualLedger]);

  // -------------------------------------------------------------------------
  // DATA PERSISTENCE
  // -------------------------------------------------------------------------

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    try {
      const data = await fetchAllUserData(user.id);

      if (data.flights.length === 0 && data.milesData.length === 0 && data.redemptions.length === 0) {
        setShowWelcome(true);
      } else {
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

        if (data.profile) {
          setTargetCPMInternal(data.profile.targetCPM);
          setXpRolloverInternal(data.profile.xpRollover || 0);

          if (data.profile.qualificationStartMonth) {
            setQualificationSettingsInternal({
              cycleStartMonth: data.profile.qualificationStartMonth,
              startingStatus: (data.profile.startingStatus || 'Explorer') as StatusLevel,
              startingXP: data.profile.xpRollover || 0,
            });
          }
        }
      }

      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
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
          qualification_start_month: qualificationSettings?.cycleStartMonth,
          starting_status: qualificationSettings?.startingStatus,
        }),
      ]);
    } catch (error) {
      console.error('Error saving user data:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, isDemoMode, flights, baseMilesData, redemptions, manualLedger, targetCPM, xpRollover, qualificationSettings]);

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
    if (user && !isDemoMode && debouncedDataVersion > 0) {
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
    cycleSettings?: { cycleStartMonth: string; startingStatus: StatusLevel }
  ) => {
    // Merge flights (skip duplicates)
    setFlightsInternal((prevFlights) => {
      const existingFlightKeys = new Set(prevFlights.map((f) => `${f.date}-${f.route}`));
      const newFlights = importedFlights.filter((f) => !existingFlightKeys.has(`${f.date}-${f.route}`));
      return [...prevFlights, ...newFlights];
    });

    // Merge miles
    setBaseMilesDataInternal((prevMiles) => {
      const updatedMiles = [...prevMiles];
      for (const incoming of importedMiles) {
        const existingIndex = updatedMiles.findIndex((m) => m.month === incoming.month);
        if (existingIndex >= 0) {
          updatedMiles[existingIndex] = incoming;
        } else {
          updatedMiles.push(incoming);
        }
      }
      return updatedMiles;
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

    // Handle cycle settings
    if (cycleSettings) {
      setQualificationSettingsInternal({
        cycleStartMonth: cycleSettings.cycleStartMonth,
        startingStatus: cycleSettings.startingStatus,
        startingXP: 0,
      });
    }

    markDataChanged();
  }, [markDataChanged]);

  // -------------------------------------------------------------------------
  // DEMO / LOCAL MODE HANDLERS
  // -------------------------------------------------------------------------

  const handleLoadDemo = useCallback(() => {
    setBaseMilesDataInternal(INITIAL_MILES_DATA);
    setBaseXpDataInternal(INITIAL_XP_DATA);
    setRedemptionsInternal(INITIAL_REDEMPTIONS);
    setFlightsInternal(INITIAL_FLIGHTS);
    setXpRolloverInternal(103);
    setManualLedgerInternal(INITIAL_MANUAL_LEDGER);
    setIsDemoMode(true);
    setShowWelcome(false);
  }, []);

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

  const handleStartOver = useCallback(() => {
    if (!window.confirm('Are you sure you want to start over? This wipes all data.')) {
      return;
    }

    setBaseMilesDataInternal([]);
    setBaseXpDataInternal([]);
    setRedemptionsInternal([]);
    setFlightsInternal([]);
    setXpRolloverInternal(0);
    setManualLedgerInternal({});
    setIsDemoMode(false);
    setIsLocalMode(false);

    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;

    if (user) {
      markDataChanged();
    }

    setShowWelcome(true);
  }, [user, markDataChanged]);

  const handleEnterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    handleLoadDemo();
  }, [handleLoadDemo]);

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
      qualificationSettings,
      milesData,
      xpData,
      currentStatus,
      currentMonth,
    },
    actions: {
      setFlights,
      setBaseMilesData,
      setBaseXpData,
      setRedemptions,
      setManualLedger,
      setXpRollover,
      setTargetCPM,
      setQualificationSettings,
      setCurrentMonth,
      handleFlightsUpdate,
      handleFlightIntakeApply,
      handleManualLedgerUpdate,
      handleRedemptionsUpdate,
      handleTargetCPMUpdate,
      handleManualXPLedgerUpdate,
      handleXPRolloverUpdate,
      handlePdfImport,
      handleQualificationSettingsUpdate,
      handleLoadDemo,
      handleStartEmpty,
      handleStartOver,
      handleEnterDemoMode,
      handleEnterLocalMode,
      handleExitDemoMode,
      markDataChanged,
      calculateGlobalCPM,
    },
    meta: {
      isLoading: dataLoading,
      isSaving,
      isDemoMode,
      isLocalMode,
      showWelcome,
      setShowWelcome,
    },
  };
}
