// src/utils/xp-logic.ts
// Versie met DYNAMISCHE kwalificatiejaren conform Flying Blue regels
// Inclusief onderscheid tussen ACTUAL (gevlogen) en PROJECTED (gepland)

import {
  XPRecord,
  FlightRecord,
  ManualLedger,
  ManualMonthXP,
  StatusLevel,
} from '../types';
import {
  PLATINUM_THRESHOLD,
  GOLD_THRESHOLD,
  SILVER_THRESHOLD,
  ULTIMATE_UXP_THRESHOLD,
  UXP_YEARLY_CAP,
  UXP_ROLLOVER_MAX,
  UXP_ELIGIBLE_AIRLINES,
} from '../constants';

// ============================================================================
// CONSTANTEN EN HELPERS
// ============================================================================

const statusOrder: Record<StatusLevel, number> = {
  Explorer: 0,
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

/** Drempel om NAAR een bepaalde status te gaan */
const getThresholdForStatus = (status: StatusLevel): number => {
  switch (status) {
    case 'Silver':
      return SILVER_THRESHOLD; // 100
    case 'Gold':
      return GOLD_THRESHOLD; // 180
    case 'Platinum':
      return PLATINUM_THRESHOLD; // 300
    default:
      return 0;
  }
};

/**
 * Calculate the rollover XP when a status threshold was reached.
 * This processes flights chronologically to determine exactly how much XP
 * was "left over" after reaching a threshold.
 * 
 * Since we exclude all flights on/before the requalification date from the new cycle,
 * the rollover must include ALL XP earned on that date that exceeds the threshold.
 * 
 * @param flights All flights to consider
 * @param requalificationDate The date when the new status was achieved (YYYY-MM-DD)
 * @param previousStatus The status BEFORE requalification (e.g., 'Silver' if upgrading to 'Gold')
 * @param startingXP XP balance at the start of the cycle (usually 0)
 * @returns The rollover XP that should start the new cycle
 */
export const calculateRolloverXP = (
  flights: FlightRecord[],
  requalificationDate: string,
  previousStatus: StatusLevel,
  startingXP: number = 0
): number => {
  // Get the threshold that was reached
  const nextStatus = getNextStatus(previousStatus);
  if (!nextStatus) return 0; // Platinum can't level up further
  
  const threshold = getThresholdForStatus(nextStatus);
  
  // Sort flights by date and include all flights up to and including requalification date
  const sortedFlights = [...flights]
    .filter(f => f.date <= requalificationDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate total XP from all these flights
  let totalXP = startingXP;
  
  for (const flight of sortedFlights) {
    const flightXP = (flight.earnedXP ?? 0) + (flight.safXp ?? 0);
    totalXP += flightXP;
  }
  
  // The rollover is everything above the threshold
  // If threshold wasn't reached, return 0
  return Math.max(0, totalXP - threshold);
};

/**
 * Determine the previous status based on the new status after requalification.
 */
export const getPreviousStatus = (newStatus: StatusLevel): StatusLevel => {
  switch (newStatus) {
    case 'Silver': return 'Explorer';
    case 'Gold': return 'Silver';
    case 'Platinum': return 'Gold';
    default: return 'Explorer';
  }
};

/** Volgende status na de huidige */
const getNextStatus = (status: StatusLevel): StatusLevel | null => {
  switch (status) {
    case 'Explorer':
      return 'Silver';
    case 'Silver':
      return 'Gold';
    case 'Gold':
      return 'Platinum';
    default:
      return null;
  }
};

/** Drempel om naar de VOLGENDE status te gaan */
const getNextThreshold = (status: StatusLevel): number | null => {
  const next = getNextStatus(status);
  return next ? getThresholdForStatus(next) : null;
};

/** Soft landing: maximaal 1 niveau dalen vanaf de START status van de cyclus */
const applySoftLanding = (
  cycleStartStatus: StatusLevel,
  achievedStatus: StatusLevel
): StatusLevel => {
  const startIdx = statusOrder[cycleStartStatus];
  const achIdx = statusOrder[achievedStatus];

  if (achIdx >= startIdx) return achievedStatus;

  if (cycleStartStatus === 'Platinum') return 'Gold';
  if (cycleStartStatus === 'Gold') return 'Silver';
  if (cycleStartStatus === 'Silver') return 'Explorer';
  return 'Explorer';
};

/** Status op basis van bruto XP (zonder level-up aftrek) */
const getStatusFromXP = (xp: number): StatusLevel => {
  if (xp >= PLATINUM_THRESHOLD) return 'Platinum';
  if (xp >= GOLD_THRESHOLD) return 'Gold';
  if (xp >= SILVER_THRESHOLD) return 'Silver';
  return 'Explorer';
};

// ============================================================================
// UXP (ULTIMATE XP) HELPERS
// ============================================================================

/** Check if an airline generates UXP (only KLM/AF flights) */
export const isUXPEligible = (airline: string): boolean => {
  const normalizedAirline = airline.toUpperCase().replace(/\s+/g, '');
  return UXP_ELIGIBLE_AIRLINES.some(code => 
    normalizedAirline === code || normalizedAirline.startsWith(code)
  );
};

/** Calculate UXP from a single flight (only KLM/AF flights generate UXP) */
export const getFlightUXP = (flight: FlightRecord): number => {
  if (!isUXPEligible(flight.airline)) return 0;
  // UXP = base XP + SAF XP for KLM/AF flights
  return (flight.earnedXP || 0) + (flight.safXp || 0);
};

/** Check if Ultimate status is achieved (Platinum + 900 UXP) */
export const isUltimateStatus = (status: StatusLevel, uxp: number): boolean => {
  return status === 'Platinum' && uxp >= ULTIMATE_UXP_THRESHOLD;
};

/** Apply yearly UXP cap (1800 max) */
export const getEffectiveUXP = (rawUXP: number): number => {
  return Math.min(rawUXP, UXP_YEARLY_CAP);
};

/** Calculate UXP rollover to next year (max 900) */
export const calculateUXPRollover = (totalUXP: number): number => {
  // Only UXP above 900 (Ultimate threshold) can roll over, up to 900 max
  const excessUXP = Math.max(0, totalUXP - ULTIMATE_UXP_THRESHOLD);
  return Math.min(excessUXP, UXP_ROLLOVER_MAX);
};

// ============================================================================
// DATUM HELPERS
// ============================================================================

/** Parse YYYY-MM naar Date object (eerste dag van de maand) */
const parseMonth = (month: string): Date => new Date(month + '-01');

/** Formatteer Date naar YYYY-MM */
const formatMonth = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/** Eerste dag van de volgende maand */
const getFirstOfNextMonth = (month: string): string => {
  const d = parseMonth(month);
  d.setMonth(d.getMonth() + 1);
  return formatMonth(d);
};

/** Laatste dag van een specifieke maand */
const getLastDayOfMonth = (month: string): string => {
  const d = parseMonth(month);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
};

/** Laatste dag van de maand, 12 maanden later minus 1 dag */
const getCycleEndDate = (startMonth: string): string => {
  const start = parseMonth(startMonth);
  start.setMonth(start.getMonth() + 12);
  start.setDate(0);
  return start.toISOString().slice(0, 10);
};

/** Eerste dag van een maand als ISO string */
const getMonthStartISO = (month: string): string => `${month}-01`;

/** Genereer alle maanden van startMonth t/m endMonth (beide YYYY-MM) */
const getMonthRange = (startMonth: string, endMonth: string): string[] => {
  const months: string[] = [];
  let current = parseMonth(startMonth);
  const end = parseMonth(endMonth);

  while (current <= end) {
    months.push(formatMonth(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

/** Huidige maand als YYYY-MM */
const getCurrentMonth = (): string => formatMonth(new Date());

/** Huidige datum als YYYY-MM-DD */
const getTodayISO = (): string => new Date().toISOString().slice(0, 10);

/** Check of een datum in het verleden ligt (gevlogen) */
const isFlown = (dateStr: string): boolean => {
  const today = getTodayISO();
  return dateStr < today;
};

/** Check of een maand volledig in het verleden ligt */
const isMonthFullyPast = (month: string): boolean => {
  const lastDay = getLastDayOfMonth(month);
  return isFlown(lastDay);
};

// ============================================================================
// TYPES
// ============================================================================

export interface XPLedgerRow {
  month: string;
  monthLabel: string;
  fullLabel: string;

  // Legacy velden
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  misc: number;
  saf: number;
  amex_xp: number;
  status_correction: number;

  // Flight aggregates
  flightXP: number;
  flightSafXP: number;
  flightCount: number;

  // Maandtotalen
  xpMonth: number;
  monthTotal: number;

  cumulative: number;
  deltaP: number;
  hitPlatinum: boolean;

  // NIEUW: Actual vs Projected split
  isFullyFlown: boolean; // Hele maand is verleden
  isFuture: boolean; // Hele maand is toekomst
  actualXP: number; // XP van gevlogen vluchten in deze maand
  projectedXP: number; // XP van geplande vluchten in deze maand
  actualCumulative: number; // Cumulatief XP alleen van gevlogen vluchten

  // UXP fields (Ultimate XP from KLM/AF flights only)
  uxp: number;                    // UXP earned this month
  cumulativeUXP: number;          // Cumulative UXP in this cycle (projected)
  actualUXP: number;              // UXP from flown flights this month
  projectedUXP: number;           // UXP from scheduled flights this month
  actualCumulativeUXP: number;    // Cumulative UXP from flown flights only
}

export interface QualificationCycleStats {
  cycleIndex: number;
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  startStatus: StatusLevel;
  endStatus: StatusLevel;
  achievedStatus: StatusLevel;

  rolloverIn: number;
  rolloverOut: number;
  totalXP: number;
  ledger: XPLedgerRow[];

  // Level-up info
  endedByLevelUp: boolean;
  levelUpMonth?: string;

  // NIEUW: Is de level-up ACTUAL (gevlogen) of PROJECTED (gepland)?
  levelUpIsActual: boolean;

  // Today snapshot - ACTUAL (gebaseerd op gevlogen vluchten)
  currentMonth: string | null;
  actualStatus: StatusLevel; // Je ECHTE status nu (alleen gevlogen)
  actualXP: number; // Je ECHTE XP nu (alleen gevlogen)
  actualXPToNext: number; // Hoeveel je ECHT nog nodig hebt

  // PROJECTED (inclusief geplande vluchten)
  projectedStatus: StatusLevel; // Status als alle plannen doorgaan
  projectedXP: number; // XP als alle plannen doorgaan
  projectedXPToNext: number; // Hoeveel je nog nodig hebt na plannen

  // Legacy aliases (voor backwards compatibility)
  currentStatus: StatusLevel; // = actualStatus
  currentXP: number; // = actualXP
  currentXPToNext: number; // = actualXPToNext

  // UXP (Ultimate XP) tracking - only shown to Platinum/Ultimate members
  uxpRolloverIn: number;          // UXP carried over from previous cycle
  totalUXP: number;               // Total UXP in this cycle (projected, capped at 1800)
  actualUXP: number;              // Actual UXP from flown flights
  projectedUXP: number;           // Projected UXP including scheduled flights
  uxpRolloverOut: number;         // UXP to roll over to next cycle (max 900)
  isUltimate: boolean;            // Current Ultimate status (actual)
  projectedUltimate: boolean;     // Projected Ultimate status
}

export interface MultiCycleStats {
  cycles: QualificationCycleStats[];
}

export type QualYearStats = QualificationCycleStats;

interface FlightMonthAggregate {
  flightXP: number;
  flightSafXP: number;
  flightCount: number;
  actualFlightXP: number; // Alleen gevlogen
  actualFlightSafXP: number;
  actualFlightCount: number;
  projectedFlightXP: number; // Alleen gepland
  projectedFlightSafXP: number;
  projectedFlightCount: number;
  // UXP tracking (only KLM/AF flights)
  flightUXP: number;            // Total UXP this month
  actualFlightUXP: number;      // UXP from flown flights
  projectedFlightUXP: number;   // UXP from scheduled flights
}

interface MonthData {
  month: string;
  flightXP: number;
  flightSafXP: number;
  flightCount: number;
  amexXp: number;
  bonusSafXp: number;
  miscXp: number;
  correctionXp: number;
  // NIEUW: Split actual vs projected
  actualFlightXP: number;
  actualFlightSafXP: number;
  projectedFlightXP: number;
  projectedFlightSafXP: number;
  isFullyPast: boolean;
  // UXP tracking (only KLM/AF flights)
  flightUXP: number;            // Total UXP this month
  actualFlightUXP: number;      // UXP from flown flights
  projectedFlightUXP: number;   // UXP from scheduled flights
}

// ============================================================================
// DATA AGGREGATIE
// ============================================================================

const aggregateFlightsByMonth = (
  flights: FlightRecord[],
  excludeBeforeDate?: string  // Exclude flights on or before this date (YYYY-MM-DD)
): Map<string, FlightMonthAggregate> => {
  const map = new Map<string, FlightMonthAggregate>();
  const today = getTodayISO();
  
  let filteredCount = 0;
  let includedCount = 0;

  for (const flight of flights) {
    const monthKey = flight.date.slice(0, 7);
    
    // Skip ALL flights on or before the cycle start date
    // These flights belong to the PREVIOUS cycle and their XP is in startingXP (rollover)
    if (excludeBeforeDate && flight.date <= excludeBeforeDate) {
      filteredCount++;
      continue;
    }
    includedCount++;
    
    const flightIsFlown = flight.date < today;

    const prev = map.get(monthKey) ?? {
      flightXP: 0,
      flightSafXP: 0,
      flightCount: 0,
      actualFlightXP: 0,
      actualFlightSafXP: 0,
      actualFlightCount: 0,
      projectedFlightXP: 0,
      projectedFlightSafXP: 0,
      projectedFlightCount: 0,
      flightUXP: 0,
      actualFlightUXP: 0,
      projectedFlightUXP: 0,
    };

    const xp = flight.earnedXP ?? 0;
    const safXp = flight.safXp ?? 0;
    const uxp = getFlightUXP(flight);

    map.set(monthKey, {
      flightXP: prev.flightXP + xp,
      flightSafXP: prev.flightSafXP + safXp,
      flightCount: prev.flightCount + 1,
      actualFlightXP: prev.actualFlightXP + (flightIsFlown ? xp : 0),
      actualFlightSafXP: prev.actualFlightSafXP + (flightIsFlown ? safXp : 0),
      actualFlightCount: prev.actualFlightCount + (flightIsFlown ? 1 : 0),
      projectedFlightXP: prev.projectedFlightXP + (flightIsFlown ? 0 : xp),
      projectedFlightSafXP:
        prev.projectedFlightSafXP + (flightIsFlown ? 0 : safXp),
      projectedFlightCount: prev.projectedFlightCount + (flightIsFlown ? 0 : 1),
      flightUXP: prev.flightUXP + uxp,
      actualFlightUXP: prev.actualFlightUXP + (flightIsFlown ? uxp : 0),
      projectedFlightUXP: prev.projectedFlightUXP + (flightIsFlown ? 0 : uxp),
    });
  }

  console.log(`[XP Engine] Flight filtering: ${filteredCount} excluded (before cutoff), ${includedCount} included`);
  return map;
};

const buildMonthDataList = (
  flights: FlightRecord[],
  manualLedger: ManualLedger,
  legacyData: XPRecord[],
  excludeBeforeDate?: string,  // Exclude ALL flights on or before this date (YYYY-MM-DD)
  excludeBeforeMonth?: string  // Exclude ALL manual/legacy data from months before this (YYYY-MM)
): MonthData[] => {
  const flightAgg = aggregateFlightsByMonth(flights, excludeBeforeDate);
  const monthKeys = new Set<string>();

  flightAgg.forEach((_, k) => monthKeys.add(k));
  
  // Filter manualLedger months based on cycleStartMonth
  // Only include months >= excludeBeforeMonth (if specified)
  Object.keys(manualLedger || {}).forEach((k) => {
    if (!excludeBeforeMonth || k >= excludeBeforeMonth) {
      monthKeys.add(k);
    }
  });
  
  // Filter legacy data months the same way
  legacyData.forEach((r) => {
    if (!excludeBeforeMonth || r.month >= excludeBeforeMonth) {
      monthKeys.add(r.month);
    }
  });
  
  // Log filtering info
  if (excludeBeforeMonth) {
    const filteredManualMonths = Object.keys(manualLedger || {}).filter(k => k < excludeBeforeMonth);
    const filteredLegacyMonths = legacyData.filter(r => r.month < excludeBeforeMonth).map(r => r.month);
    if (filteredManualMonths.length > 0 || filteredLegacyMonths.length > 0) {
      console.log(`[XP Engine] Filtered out months before ${excludeBeforeMonth}:`, {
        manualLedgerMonths: filteredManualMonths,
        legacyMonths: filteredLegacyMonths,
      });
    }
  }

  const sortedMonths = Array.from(monthKeys).sort();

  return sortedMonths.map((month) => {
    const agg = flightAgg.get(month) ?? {
      flightXP: 0,
      flightSafXP: 0,
      flightCount: 0,
      actualFlightXP: 0,
      actualFlightSafXP: 0,
      actualFlightCount: 0,
      projectedFlightXP: 0,
      projectedFlightSafXP: 0,
      projectedFlightCount: 0,
      flightUXP: 0,
      actualFlightUXP: 0,
      projectedFlightUXP: 0,
    };
    const manual: ManualMonthXP = manualLedger[month] ?? {
      amexXp: 0,
      bonusSafXp: 0,
      miscXp: 0,
      correctionXp: 0,
    };
    const legacy = legacyData.find((r) => r.month === month);

    const hasNewData =
      agg.flightXP > 0 ||
      agg.flightSafXP > 0 ||
      manual.amexXp ||
      manual.bonusSafXp ||
      manual.miscXp ||
      manual.correctionXp;

    const isFullyPast = isMonthFullyPast(month);

    if (legacy && !hasNewData) {
      const legacyFlightXP = legacy.f1 + legacy.f2 + legacy.f3 + legacy.f4;
      return {
        month,
        flightXP: legacyFlightXP,
        flightSafXP: legacy.saf,
        flightCount: 0,
        amexXp: legacy.amex_xp,
        bonusSafXp: 0,
        miscXp: legacy.misc,
        correctionXp: legacy.status_correction,
        // Legacy data is altijd "actual" (verleden)
        actualFlightXP: legacyFlightXP,
        actualFlightSafXP: legacy.saf,
        projectedFlightXP: 0,
        projectedFlightSafXP: 0,
        isFullyPast: true,
        // Legacy data has no UXP tracking (predates Ultimate)
        flightUXP: 0,
        actualFlightUXP: 0,
        projectedFlightUXP: 0,
      };
    }

    return {
      month,
      flightXP: agg.flightXP,
      flightSafXP: agg.flightSafXP,
      flightCount: agg.flightCount,
      amexXp: manual.amexXp ?? 0,
      bonusSafXp: manual.bonusSafXp ?? 0,
      miscXp: manual.miscXp ?? 0,
      correctionXp: manual.correctionXp ?? 0,
      actualFlightXP: agg.actualFlightXP,
      actualFlightSafXP: agg.actualFlightSafXP,
      projectedFlightXP: agg.projectedFlightXP,
      projectedFlightSafXP: agg.projectedFlightSafXP,
      isFullyPast,
      // UXP tracking from flight aggregates
      flightUXP: agg.flightUXP,
      actualFlightUXP: agg.actualFlightUXP,
      projectedFlightUXP: agg.projectedFlightUXP,
    };
  });
};

// ============================================================================
// CORE LOGIC: DYNAMISCHE KWALIFICATIECYCLI MET ACTUAL/PROJECTED SPLIT
// ============================================================================

interface CycleProcessingState {
  status: StatusLevel;
  balance: number;
  cycleStartMonth: string;
  // NIEUW: Actual tracking
  actualStatus: StatusLevel;
  actualBalance: number;
  actualLevelUpOccurred: boolean;
  actualLevelUpMonth: string | null;
}

interface ProcessedMonth {
  monthData: MonthData;
  xpEarned: number;
  balanceAfter: number;
  statusAfter: StatusLevel;
  levelUpOccurred: boolean;
  levelUpCorrection: number;
  // NIEUW: Actual split
  actualXPEarned: number;
  actualBalanceAfter: number;
  actualStatusAfter: StatusLevel;
  actualLevelUpOccurred: boolean;
  actualLevelUpCorrection: number;
}

const processMonth = (
  monthData: MonthData,
  state: CycleProcessingState
): { processed: ProcessedMonth; newState: CycleProcessingState } => {
  // TOTAAL XP (actual + projected)
  const xpEarned =
    monthData.flightXP +
    monthData.flightSafXP +
    monthData.bonusSafXp +
    monthData.amexXp +
    monthData.miscXp +
    monthData.correctionXp;

  // ACTUAL XP (alleen gevlogen vluchten + manual entries in verleden maanden)
  const isFullyPast = monthData.isFullyPast;
  const actualXPEarned = isFullyPast
    ? xpEarned // Hele maand is verleden, alles is actual
    : monthData.actualFlightXP + monthData.actualFlightSafXP; // Alleen gevlogen vluchten

  // Process TOTAL (projected) balance en status
  let balance = state.balance + xpEarned;
  let status = state.status;
  let levelUpCorrection = 0;
  let levelUpOccurred = false;

  let checking = true;
  while (checking) {
    checking = false;
    const nextStatus = getNextStatus(status);
    if (nextStatus) {
      const threshold = getThresholdForStatus(nextStatus);
      if (balance >= threshold) {
        balance -= threshold;
        levelUpCorrection -= threshold;
        status = nextStatus;
        levelUpOccurred = true;
        checking = true;
      }
    }
  }

  // Process ACTUAL balance en status
  let actualBalance = state.actualBalance + actualXPEarned;
  let actualStatus = state.actualStatus;
  let actualLevelUpCorrection = 0;
  let actualLevelUpOccurred = false;

  checking = true;
  while (checking) {
    checking = false;
    const nextStatus = getNextStatus(actualStatus);
    if (nextStatus) {
      const threshold = getThresholdForStatus(nextStatus);
      if (actualBalance >= threshold) {
        actualBalance -= threshold;
        actualLevelUpCorrection -= threshold;
        actualStatus = nextStatus;
        actualLevelUpOccurred = true;
        checking = true;
      }
    }
  }

  const processed: ProcessedMonth = {
    monthData,
    xpEarned,
    balanceAfter: balance,
    statusAfter: status,
    levelUpOccurred,
    levelUpCorrection,
    actualXPEarned,
    actualBalanceAfter: actualBalance,
    actualStatusAfter: actualStatus,
    actualLevelUpOccurred,
    actualLevelUpCorrection,
  };

  const newState: CycleProcessingState = {
    status,
    balance,
    cycleStartMonth: state.cycleStartMonth,
    actualStatus,
    actualBalance,
    actualLevelUpOccurred:
      state.actualLevelUpOccurred || actualLevelUpOccurred,
    actualLevelUpMonth: actualLevelUpOccurred
      ? monthData.month
      : state.actualLevelUpMonth,
  };

  return { processed, newState };
};

const buildLedgerRow = (
  processed: ProcessedMonth,
  cumulative: number,
  actualCumulative: number,
  cumulativeUXP: number,
  actualCumulativeUXP: number
): XPLedgerRow => {
  const { monthData, xpEarned, levelUpCorrection, actualXPEarned } = processed;
  const date = parseMonth(monthData.month);
  const currentMonth = getCurrentMonth();

  const isFullyFlown = monthData.isFullyPast;
  const isFuture = monthData.month > currentMonth;

  // UXP for this month
  const monthUXP = monthData.flightUXP;
  const monthActualUXP = monthData.actualFlightUXP;
  const monthProjectedUXP = monthData.projectedFlightUXP;

  return {
    month: monthData.month,
    monthLabel: date.toLocaleDateString('en-US', { month: 'short' }),
    fullLabel: date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),

    f1: monthData.flightXP,
    f2: 0,
    f3: 0,
    f4: 0,
    misc: monthData.miscXp,
    saf: monthData.flightSafXP + monthData.bonusSafXp,
    amex_xp: monthData.amexXp,
    status_correction: monthData.correctionXp + levelUpCorrection,

    flightXP: monthData.flightXP,
    flightSafXP: monthData.flightSafXP,
    flightCount: monthData.flightCount,

    xpMonth: xpEarned,
    monthTotal: xpEarned,

    cumulative,
    deltaP: cumulative - PLATINUM_THRESHOLD,
    hitPlatinum: cumulative >= PLATINUM_THRESHOLD,

    // NIEUW
    isFullyFlown,
    isFuture,
    actualXP: actualXPEarned,
    projectedXP: xpEarned - actualXPEarned,
    actualCumulative,

    // UXP fields
    uxp: monthUXP,
    cumulativeUXP,
    actualUXP: monthActualUXP,
    projectedUXP: monthProjectedUXP,
    actualCumulativeUXP,
  };
};

const getNaturalEndMonth = (startMonth: string): string => {
  const start = parseMonth(startMonth);
  start.setMonth(start.getMonth() + 11);
  return formatMonth(start);
};

interface FinalizeCycleParams {
  cycleIndex: number;
  startMonth: string;
  ledger: XPLedgerRow[];
  startStatus: StatusLevel;
  endStatus: StatusLevel;
  rolloverIn: number;
  endedByLevelUp: boolean;
  levelUpMonth?: string;
  levelUpIsActual: boolean;
  currentMonth: string;
  finalBalance: number;
  actualStatus: StatusLevel;
  actualBalance: number;
  uxpRolloverIn: number;
}

const finalizeCycle = (params: FinalizeCycleParams): QualificationCycleStats => {
  const {
    cycleIndex,
    startMonth,
    ledger,
    startStatus,
    endStatus,
    rolloverIn,
    endedByLevelUp,
    levelUpMonth,
    levelUpIsActual,
    currentMonth,
    finalBalance,
    actualStatus,
    actualBalance,
    uxpRolloverIn,
  } = params;

  const grossXP =
    rolloverIn + ledger.reduce((sum, row) => sum + row.xpMonth, 0);

  const achievedStatus = getStatusFromXP(grossXP);

  const effectiveEndStatus = endedByLevelUp
    ? endStatus
    : applySoftLanding(startStatus, achievedStatus);

  let rolloverOut = 0;
  if (endedByLevelUp) {
    rolloverOut = clamp(finalBalance, 0, PLATINUM_THRESHOLD);
  } else if (effectiveEndStatus === 'Platinum') {
    rolloverOut = clamp(finalBalance, 0, PLATINUM_THRESHOLD);
  }

  const endMonth =
    ledger.length > 0 ? ledger[ledger.length - 1].month : startMonth;

  const startDate = getMonthStartISO(startMonth);

  let endDate: string;
  if (endedByLevelUp && levelUpMonth && levelUpIsActual) {
    // Level-up door GEVLOGEN vluchten: cyclus is echt afgesloten op de level-up maand
    endDate = getLastDayOfMonth(levelUpMonth);
  } else {
    // Normale cyclus OF projected level-up: toon het natuurlijke einde (12 maanden)
    endDate = getCycleEndDate(startMonth);
  }

  // ACTUAL snapshot (gebaseerd op gevlogen vluchten)
  let actualXP = actualBalance;
  let effectiveCurrentMonth: string | null = null;

  for (const row of ledger) {
    if (row.month <= currentMonth) {
      effectiveCurrentMonth = row.month;
      actualXP = row.actualCumulative;
    }
  }

  // De ACTUAL status is de status gebaseerd op gevlogen vluchten
  const currentActualStatus = actualStatus;

  // PROJECTED status (inclusief geplande vluchten)
  const projectedStatus = endedByLevelUp ? endStatus : effectiveEndStatus;
  const projectedXP = finalBalance;

  // XP nodig berekeningen
  let actualXPToNext = 0;
  let projectedXPToNext = 0;

  if (currentActualStatus === 'Platinum') {
    actualXPToNext = Math.max(0, PLATINUM_THRESHOLD - actualXP);
  } else {
    const nextThreshold = getNextThreshold(currentActualStatus);
    if (nextThreshold != null) {
      actualXPToNext = Math.max(0, nextThreshold - actualXP);
    }
  }

  if (projectedStatus === 'Platinum') {
    projectedXPToNext = Math.max(0, PLATINUM_THRESHOLD - projectedXP);
  } else {
    const nextThreshold = getNextThreshold(projectedStatus);
    if (nextThreshold != null) {
      projectedXPToNext = Math.max(0, nextThreshold - projectedXP);
    }
  }

  // UXP calculations
  // Sum UXP from ledger (includes rollover from first row's cumulative)
  const totalUXPFromFlights = ledger.reduce((sum, row) => sum + row.uxp, 0);
  const rawTotalUXP = uxpRolloverIn + totalUXPFromFlights;
  const totalUXP = getEffectiveUXP(rawTotalUXP); // Apply 1800 cap

  // Actual UXP = UXP from flown flights only
  const actualUXPFromFlights = ledger.reduce((sum, row) => sum + row.actualUXP, 0);
  const rawActualUXP = uxpRolloverIn + actualUXPFromFlights;
  const cycleActualUXP = getEffectiveUXP(rawActualUXP);

  // Projected UXP = total including scheduled flights
  const projectedUXP = totalUXP;

  // UXP rollover to next cycle (max 900, only excess above threshold)
  const uxpRolloverOut = calculateUXPRollover(totalUXP);

  // Ultimate status checks
  const isUltimate = isUltimateStatus(currentActualStatus, cycleActualUXP);
  const projectedUltimate = isUltimateStatus(projectedStatus, projectedUXP);

  return {
    cycleIndex,
    startDate,
    endDate,
    startMonth,
    endMonth,
    startStatus,
    endStatus: effectiveEndStatus,
    achievedStatus,
    rolloverIn,
    rolloverOut,
    totalXP: finalBalance,
    ledger,
    endedByLevelUp,
    levelUpMonth,
    levelUpIsActual,
    currentMonth: effectiveCurrentMonth,

    // ACTUAL
    actualStatus: currentActualStatus,
    actualXP,
    actualXPToNext,

    // PROJECTED
    projectedStatus,
    projectedXP,
    projectedXPToNext,

    // Legacy aliases
    currentStatus: currentActualStatus,
    currentXP: actualXP,
    currentXPToNext: actualXPToNext,

    // UXP fields
    uxpRolloverIn,
    totalUXP,
    actualUXP: cycleActualUXP,
    projectedUXP,
    uxpRolloverOut,
    isUltimate,
    projectedUltimate,
  };
};

const buildEmptyCycle = (
  cycleIndex: number,
  startMonth: string,
  startStatus: StatusLevel,
  rolloverIn: number,
  currentMonth: string,
  uxpRolloverIn: number = 0
): QualificationCycleStats => {
  const endMonth = getNaturalEndMonth(startMonth);
  const months = getMonthRange(startMonth, endMonth);

  const ledger: XPLedgerRow[] = months.map((month) => {
    const date = parseMonth(month);
    const isFuture = month > currentMonth;
    const isFullyFlown = isMonthFullyPast(month);

    return {
      month,
      monthLabel: date.toLocaleDateString('en-US', { month: 'short' }),
      fullLabel: date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      f1: 0,
      f2: 0,
      f3: 0,
      f4: 0,
      misc: 0,
      saf: 0,
      amex_xp: 0,
      status_correction: 0,
      flightXP: 0,
      flightSafXP: 0,
      flightCount: 0,
      xpMonth: 0,
      monthTotal: 0,
      cumulative: rolloverIn,
      deltaP: rolloverIn - PLATINUM_THRESHOLD,
      hitPlatinum: rolloverIn >= PLATINUM_THRESHOLD,
      isFullyFlown,
      isFuture,
      actualXP: 0,
      projectedXP: 0,
      actualCumulative: rolloverIn,
      // UXP fields
      uxp: 0,
      cumulativeUXP: uxpRolloverIn,
      actualUXP: 0,
      projectedUXP: 0,
      actualCumulativeUXP: uxpRolloverIn,
    };
  });

  const nextThreshold = getNextThreshold(startStatus);
  const xpToNext = nextThreshold
    ? Math.max(0, nextThreshold - rolloverIn)
    : 0;

  const isCurrentInCycle =
    currentMonth >= startMonth && currentMonth <= endMonth;

  // UXP calculations for empty cycle
  const isUltimate = isUltimateStatus(startStatus, uxpRolloverIn);

  return {
    cycleIndex,
    startDate: getMonthStartISO(startMonth),
    endDate: getCycleEndDate(startMonth),
    startMonth,
    endMonth,
    startStatus,
    endStatus: startStatus,
    achievedStatus: startStatus,
    rolloverIn,
    rolloverOut:
      startStatus === 'Platinum'
        ? clamp(rolloverIn, 0, PLATINUM_THRESHOLD)
        : 0,
    totalXP: rolloverIn,
    ledger,
    endedByLevelUp: false,
    levelUpIsActual: false,
    currentMonth: isCurrentInCycle ? currentMonth : null,

    actualStatus: startStatus,
    actualXP: rolloverIn,
    actualXPToNext: xpToNext,

    projectedStatus: startStatus,
    projectedXP: rolloverIn,
    projectedXPToNext: xpToNext,

    currentStatus: startStatus,
    currentXP: rolloverIn,
    currentXPToNext: xpToNext,

    // UXP fields
    uxpRolloverIn,
    totalUXP: uxpRolloverIn,
    actualUXP: uxpRolloverIn,
    projectedUXP: uxpRolloverIn,
    uxpRolloverOut: calculateUXPRollover(uxpRolloverIn),
    isUltimate,
    projectedUltimate: isUltimate,
  };
};

// ============================================================================
// CALENDAR YEAR UXP CALCULATION (for legacy Ultimate members)
// ============================================================================

/**
 * Calculate UXP based on calendar year (Jan-Dec) instead of qualification cycle.
 * Used for legacy Ultimate members who are still on the old calendar year system.
 */
const calculateCalendarYearUXP = (
  flights: FlightRecord[],
  year: number
): { actualUXP: number; projectedUXP: number; totalUXP: number } => {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let actualUXP = 0;
  let projectedUXP = 0;

  for (const flight of flights) {
    // Only count flights within the calendar year
    if (flight.date < yearStart || flight.date > yearEnd) continue;

    const uxp = getFlightUXP(flight);
    if (uxp === 0) continue;

    const isFlown = flight.date < today;
    if (isFlown) {
      actualUXP += uxp;
    } else {
      projectedUXP += uxp;
    }
  }

  // Cap at 1800 (max possible in a year)
  const totalUXP = Math.min(1800, actualUXP + projectedUXP);
  actualUXP = Math.min(1800, actualUXP);

  return { actualUXP, projectedUXP, totalUXP };
};

/**
 * Apply calendar year UXP calculation to cycles.
 * Overrides the cycle-based UXP with calendar year UXP for the active cycle.
 */
const applyCalendarYearUXPToCycles = (
  cycles: QualificationCycleStats[],
  flights: FlightRecord[]
): QualificationCycleStats[] => {
  const currentYear = new Date().getFullYear();

  return cycles.map((cycle) => {
    // Find which calendar year this cycle overlaps with
    // For the active cycle, calculate calendar year UXP
    const cycleEndYear = parseInt(cycle.endDate.slice(0, 4));
    const cycleStartYear = parseInt(cycle.startDate.slice(0, 4));
    
    // Determine which calendar year to use for UXP calculation
    // Use the year where most of the cycle falls, or current year if active
    const today = new Date().toISOString().slice(0, 10);
    const isActiveCycle = today >= cycle.startDate && today <= cycle.endDate;
    
    const uxpYear = isActiveCycle ? currentYear : cycleEndYear;
    const { actualUXP, projectedUXP, totalUXP } = calculateCalendarYearUXP(flights, uxpYear);

    // Recalculate Ultimate status based on calendar year UXP
    const isUltimate = isUltimateStatus(cycle.actualStatus, actualUXP);
    const projectedUltimate = isUltimateStatus(cycle.projectedStatus, totalUXP);
    const uxpRolloverOut = calculateUXPRollover(totalUXP);

    return {
      ...cycle,
      actualUXP,
      projectedUXP,
      totalUXP,
      uxpRolloverOut,
      isUltimate,
      projectedUltimate,
      // Note: uxpRolloverIn stays 0 for calendar year mode (fresh start each Jan 1)
      uxpRolloverIn: 0,
    };
  });
};

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const calculateQualificationCycles = (
  legacyData: XPRecord[],
  baseRollover: number,
  flights?: FlightRecord[],
  manualLedger?: ManualLedger,
  qualificationSettings?: { 
    cycleStartMonth: string;
    cycleStartDate?: string;  // Full date (YYYY-MM-DD) for precise filtering
    startingStatus: StatusLevel; 
    startingXP: number;
    ultimateCycleType?: 'qualification' | 'calendar';
  } | null
): MultiCycleStats => {
  // cycleStartDate = the date you QUALIFIED (e.g., 2025-10-07)
  // Flights AFTER this date count towards the NEW cycle
  // Flights ON or BEFORE this date belong to the OLD cycle
  //
  // Example: Qualified on Oct 7, 2025
  //   - Oct 7 flight → OLD cycle (this was the qualifying flight)
  //   - Oct 8 flight → NEW cycle (counts!)
  //   - Official cycle: Nov 1, 2025 - Oct 31, 2026
  //
  // IMPORTANT: We ONLY filter if we have the exact qualification date (cycleStartDate)
  // If only cycleStartMonth is set, we cannot safely filter because we don't know
  // when the user qualified. They should re-import their PDF to get the exact date.
  
  const excludeBeforeDate = qualificationSettings?.cycleStartDate;
  
  // Debug logging - ENHANCED for debugging XP calculation issues
  console.log('[XP Engine] ============================================');
  console.log('[XP Engine] Qualification settings received:', {
    cycleStartMonth: qualificationSettings?.cycleStartMonth,
    cycleStartDate: qualificationSettings?.cycleStartDate,
    startingStatus: qualificationSettings?.startingStatus,
    startingXP: qualificationSettings?.startingXP,
    ultimateCycleType: qualificationSettings?.ultimateCycleType,
  });
  console.log('[XP Engine] Computed excludeBeforeDate:', excludeBeforeDate);
  console.log('[XP Engine] Total flights to process:', flights?.length ?? 0);
  
  // Log flights that would be filtered
  if (flights && excludeBeforeDate) {
    const filteredFlights = flights.filter(f => f.date <= excludeBeforeDate);
    const includedFlights = flights.filter(f => f.date > excludeBeforeDate);
    console.log('[XP Engine] Flights that will be EXCLUDED (on or before', excludeBeforeDate + '):', 
      filteredFlights.length, 'flights totaling', 
      filteredFlights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0), 'XP');
    console.log('[XP Engine] Flights that will be INCLUDED (after', excludeBeforeDate + '):', 
      includedFlights.length, 'flights totaling', 
      includedFlights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0), 'XP');
  } else if (flights && !excludeBeforeDate) {
    console.log('[XP Engine] WARNING: No excludeBeforeDate set - ALL', flights.length, 'flights will be included!');
    console.log('[XP Engine] Total flight XP without filtering:', 
      flights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0), 'XP');
  }
  console.log('[XP Engine] ============================================');
  
  // IMPORTANT: Flying Blue mid-cycle qualification logic:
  // - cycleStartMonth is the OFFICIAL cycle start (e.g., "2025-11")
  // - cycleStartDate is when you QUALIFIED (e.g., "2025-10-08")
  // - Flights AFTER cycleStartDate count toward the new cycle, even if before cycleStartMonth
  //
  // So if you qualified on Oct 8, 2025:
  // - Official cycle: Nov 2025 - Oct 2026
  // - But flights Oct 9-31 should count!
  //
  // We need to:
  // 1. Filter flights by cycleStartDate (exclude ON or BEFORE)
  // 2. Include months starting from the month of cycleStartDate (not cycleStartMonth)
  //
  // Example: cycleStartDate = "2025-10-08"
  // - excludeBeforeDate = "2025-10-08" (flights Oct 8 and earlier excluded)
  // - dataStartMonth = "2025-10" (include Oct in month data so Oct 9-31 flights count)
  
  // Get the month from cycleStartDate for data inclusion
  const dataStartMonth = excludeBeforeDate?.slice(0, 7);  // e.g., "2025-10"
  
  // For month filtering, use the month of cycleStartDate (not cycleStartMonth)
  // This ensures flights between cycleStartDate and cycleStartMonth are included
  const excludeBeforeMonth = dataStartMonth;
  
  console.log('[XP Engine] Month filtering:', {
    cycleStartMonth: qualificationSettings?.cycleStartMonth,
    cycleStartDate: qualificationSettings?.cycleStartDate,
    dataStartMonth,
    excludeBeforeMonth,
  });
  
  const monthDataList = buildMonthDataList(
    flights ?? [],
    manualLedger ?? {},
    legacyData,
    excludeBeforeDate,
    excludeBeforeMonth
  );

  const currentMonth = getCurrentMonth();

  // Use qualification settings if provided, otherwise fall back to legacy behavior
  const initialStatus: StatusLevel = qualificationSettings?.startingStatus ?? 
    (baseRollover > 0 ? 'Platinum' : 'Explorer');
  const initialRollover = clamp(
    qualificationSettings?.startingXP ?? baseRollover, 
    0, 
    PLATINUM_THRESHOLD
  );

  // Determine cycle start: use settings if provided
  const now = new Date();
  const defaultStartMonth =
    now.getMonth() >= 10
      ? `${now.getFullYear()}-11`
      : `${now.getFullYear() - 1}-11`;

  // Geen data: maak één lege cyclus
  if (monthDataList.length === 0) {
    const cycleStart = qualificationSettings?.cycleStartMonth ?? defaultStartMonth;

    const cycle = buildEmptyCycle(
      0,
      cycleStart,
      initialStatus,
      initialRollover,
      currentMonth,
      0 // uxpRolloverIn = 0 for empty cycle
    );

    return { cycles: [cycle] };
  }

  const cycles: QualificationCycleStats[] = [];
  let cycleIndex = 0;

  // Map voor snelle lookup van maanddata
  const dataByMonth = new Map<string, MonthData>();
  monthDataList.forEach((md) => dataByMonth.set(md.month, md));

  const firstDataMonth = monthDataList[0].month;
  const lastDataMonth = monthDataList[monthDataList.length - 1].month;

  // Bepaal "jouw" Flying Blue november voor het huidige jaar
  const currentYearNov =
    now.getMonth() >= 10
      ? `${now.getFullYear()}-11`
      : `${now.getFullYear() - 1}-11`;

  // Start de allereerste cyclus:
  // If qualification settings provided, use that
  // Otherwise: or bij eerste data (als dat vóór die november ligt),
  // of bij de november rond het huidige jaar.
  const initialCycleStart = qualificationSettings?.cycleStartMonth ??
    (firstDataMonth < currentYearNov ? firstDataMonth : currentYearNov);

  // IMPORTANT: Handle "pre-cycle" XP for mid-month qualification
  // When you qualify on Oct 8 and cycle starts Nov 1, flights Oct 9-31 should count
  // These are in a month BEFORE cycleStartMonth but AFTER cycleStartDate
  // We add this XP to the initialRollover so it's included in the cycle
  let preCycleXP = 0;
  let preCycleUXP = 0;
  if (dataStartMonth && qualificationSettings?.cycleStartMonth && dataStartMonth < qualificationSettings.cycleStartMonth) {
    // There's a gap between the qualification date month and the cycle start month
    // Get XP from that period and add it to rollover
    const preCycleMonthData = dataByMonth.get(dataStartMonth);
    if (preCycleMonthData) {
      preCycleXP = preCycleMonthData.actualFlightXP + preCycleMonthData.actualFlightSafXP;
      preCycleUXP = preCycleMonthData.actualFlightUXP;
      console.log('[XP Engine] Pre-cycle XP (between cycleStartDate and cycleStartMonth):', {
        month: dataStartMonth,
        preCycleXP,
        preCycleUXP,
        flightXP: preCycleMonthData.flightXP,
        flightSafXP: preCycleMonthData.flightSafXP,
      });
    }
  }

  const adjustedInitialRollover = clamp(initialRollover + preCycleXP, 0, PLATINUM_THRESHOLD);

  // Tot waar moet je überhaupt cycli bouwen?
  // Altijd tot minimaal de laatste maand met data of de huidige maand.
  // PLUS: voeg 12 maanden toe zodat er altijd minstens één toekomstige cyclus is.
  const baseMaxMonth =
    lastDataMonth > currentMonth ? lastDataMonth : currentMonth;
  
  // Bereken de maand 12 maanden na de baseMaxMonth om de volgende cyclus te dekken
  const [baseYear, baseMonthNum] = baseMaxMonth.split('-').map(Number);
  const futureDate = new Date(baseYear, baseMonthNum - 1 + 12, 1);
  const futureMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
  
  const maxRelevantMonth = futureMonth;

  let state: CycleProcessingState = {
    status: initialStatus,
    balance: adjustedInitialRollover,
    cycleStartMonth: initialCycleStart,
    actualStatus: initialStatus,
    actualBalance: adjustedInitialRollover,
    actualLevelUpOccurred: false,
    actualLevelUpMonth: null,
  };

  let cycleStartMonth = initialCycleStart;
  let cycleStartStatus: StatusLevel = state.status;
  let rolloverIn = adjustedInitialRollover;
  let uxpRolloverIn = preCycleUXP; // Include pre-cycle UXP in rollover

  // Bouw cycli door totdat de start van een volgende cyclus
  // voorbij de relevante horizon ligt.
  while (cycleStartMonth <= maxRelevantMonth) {
    const naturalEndMonth = getNaturalEndMonth(cycleStartMonth);
    const months = getMonthRange(cycleStartMonth, naturalEndMonth);

    const ledger: XPLedgerRow[] = [];

    // Track cumulative UXP for this cycle
    let cumulativeUXP = uxpRolloverIn;
    let actualCumulativeUXP = uxpRolloverIn;

    // Track projected level-up in deze cyclus (label)
    let cycleProjectedLevelUpOccurred = false;
    let cycleProjectedLevelUpMonth: string | undefined = undefined;
    let cycleProjectedEndStatus: StatusLevel = state.status;

    // Track ACTUAL level-up (echte cyclus-split)
    let cycleEndedByActualLevelUp = false;
    let cycleActualLevelUpMonth: string | undefined = undefined;

    for (const month of months) {
      const prevStatus = state.status;
      const prevActualStatus = state.actualStatus;

      // Haal data voor deze maand, of maak lege data
      const monthData: MonthData =
        dataByMonth.get(month) ?? {
          month,
          flightXP: 0,
          flightSafXP: 0,
          flightCount: 0,
          amexXp: 0,
          bonusSafXp: 0,
          miscXp: 0,
          correctionXp: 0,
          actualFlightXP: 0,
          actualFlightSafXP: 0,
          projectedFlightXP: 0,
          projectedFlightSafXP: 0,
          isFullyPast: isMonthFullyPast(month),
          flightUXP: 0,
          actualFlightUXP: 0,
          projectedFlightUXP: 0,
        };

      const { processed, newState } = processMonth(monthData, state);

      // Update cumulative UXP for this month
      cumulativeUXP += monthData.flightUXP;
      actualCumulativeUXP += monthData.actualFlightUXP;

      const ledgerRow = buildLedgerRow(
        processed,
        newState.balance,
        newState.actualBalance,
        cumulativeUXP,
        actualCumulativeUXP
      );
      ledger.push(ledgerRow);

      // Projected level-up: voor label / eindstatus van deze cyclus
      if (
        processed.levelUpOccurred &&
        statusOrder[processed.statusAfter] > statusOrder[prevStatus]
      ) {
        if (!cycleProjectedLevelUpOccurred) {
          cycleProjectedLevelUpOccurred = true;
          cycleProjectedLevelUpMonth = month;
        }
        cycleProjectedEndStatus = processed.statusAfter;
      }

      // ACTUAL level-up: échte cyclus-split
      const wasActualLevelUp =
        processed.actualLevelUpOccurred &&
        statusOrder[processed.actualStatusAfter] > statusOrder[prevActualStatus];

      state = newState;

      if (wasActualLevelUp) {
        cycleEndedByActualLevelUp = true;
        cycleActualLevelUpMonth = month;
        break;
      }
    }

    // Finaliseer de cyclus (actueel of projected einde)
    const cycle = finalizeCycle({
      cycleIndex,
      startMonth: cycleStartMonth,
      ledger,
      startStatus: cycleStartStatus,
      endStatus: cycleEndedByActualLevelUp
        ? state.actualStatus
        : cycleProjectedLevelUpOccurred
        ? cycleProjectedEndStatus
        : state.status,
      rolloverIn,
      endedByLevelUp: cycleEndedByActualLevelUp || cycleProjectedLevelUpOccurred,
      levelUpMonth: cycleEndedByActualLevelUp
        ? cycleActualLevelUpMonth
        : cycleProjectedLevelUpMonth,
      levelUpIsActual: cycleEndedByActualLevelUp,
      currentMonth,
      finalBalance: state.balance,
      actualStatus: state.actualStatus,
      actualBalance: state.actualBalance,
      uxpRolloverIn,
    });

    cycles.push(cycle);
    cycleIndex++;

    // Bepaal de start van de volgende cyclus
    if (cycleEndedByActualLevelUp) {
      // ACTUAL level-up: nieuwe kwalificatieperiode start in de maand erna
      if (!cycleActualLevelUpMonth) {
        break;
      }
      cycleStartMonth = getFirstOfNextMonth(cycleActualLevelUpMonth);
      cycleStartStatus = state.actualStatus;
      rolloverIn = state.actualBalance;
      uxpRolloverIn = cycle.uxpRolloverOut;
    } else {
      // Geen ACTUAL level-up: volgende cyclus start na het natuurlijke einde
      const endMonth = getNaturalEndMonth(cycleStartMonth);
      cycleStartMonth = getFirstOfNextMonth(endMonth);
      cycleStartStatus = cycle.endStatus;
      rolloverIn = cycle.rolloverOut;
      uxpRolloverIn = cycle.uxpRolloverOut;
    }

    // Stop als we voorbij de horizon zijn
    if (cycleStartMonth > maxRelevantMonth) {
      break;
    }
  }

  // Apply calendar year UXP calculation if needed
  if (qualificationSettings?.ultimateCycleType === 'calendar') {
    const adjustedCycles = applyCalendarYearUXPToCycles(cycles, flights ?? []);
    return { cycles: adjustedCycles };
  }

  return { cycles };
};

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

export const calculateMultiYearStats = (
  data: XPRecord[],
  baseRollover: number,
  flights?: FlightRecord[],
  manualLedger?: ManualLedger
): Record<number, QualYearStats> => {
  const { cycles } = calculateQualificationCycles(
    data,
    baseRollover,
    flights,
    manualLedger
  );

  const result: Record<number, QualYearStats> = {};

  cycles.forEach((cycle) => {
    const endYear = new Date(cycle.endDate).getFullYear();
    result[endYear] = cycle;
  });

  return result;
};
