// src/hooks/useAcquisitionCPM.ts
// Central hook for calculating user's personal acquisition cost per mile
// Used by MilesEngine, RedemptionCalc, OnboardingFlow, etc.

import { useMemo } from 'react';
import { ActivityTransaction, FlightRecord, MilesRecord } from '../types';

export interface AcquisitionCPMResult {
  /** Cost per mile in user's currency (e.g., 0.0020 for €0.0020) */
  cpm: number;
  /** Total cost of all miles acquired */
  totalCost: number;
  /** Total miles earned (positive transactions only) */
  totalMilesEarned: number;
  /** Whether there's enough data to calculate CPM */
  hasData: boolean;
  /** Percentage of transactions that have cost data (0-100) */
  coverage: number;
  /** Number of transactions with cost data */
  transactionsWithCost: number;
  /** Total number of transactions */
  totalTransactions: number;
}

interface UseAcquisitionCPMOptions {
  /** Activity transactions from the new system */
  activityTransactions?: ActivityTransaction[];
  /** Flight records (for flight miles/costs if tracked) */
  flights?: FlightRecord[];
  /** Legacy miles records (fallback for non-migrated users) */
  legacyMilesData?: MilesRecord[];
  /** Whether user is on the new transaction system */
  useNewTransactions?: boolean;
}

/**
 * Calculate the user's personal acquisition CPM based on their transaction history.
 * 
 * This hook provides a single source of truth for acquisition cost calculations,
 * used across MilesEngine, RedemptionCalc, and other components.
 * 
 * @example
 * const { cpm, hasData, coverage } = useAcquisitionCPM({
 *   activityTransactions,
 *   flights,
 *   useNewTransactions: true
 * });
 * 
 * if (hasData) {
 *   console.log(`Your acquisition CPM: €${cpm.toFixed(4)}`);
 * }
 */
export function useAcquisitionCPM({
  activityTransactions = [],
  flights = [],
  legacyMilesData = [],
  useNewTransactions = false,
}: UseAcquisitionCPMOptions): AcquisitionCPMResult {
  return useMemo(() => {
    // New transaction system
    if (useNewTransactions && activityTransactions.length > 0) {
      return calculateFromActivityTransactions(activityTransactions, flights);
    }
    
    // Legacy system fallback
    if (legacyMilesData.length > 0) {
      return calculateFromLegacyData(legacyMilesData);
    }
    
    // No data available
    return {
      cpm: 0,
      totalCost: 0,
      totalMilesEarned: 0,
      hasData: false,
      coverage: 0,
      transactionsWithCost: 0,
      totalTransactions: 0,
    };
  }, [activityTransactions, flights, legacyMilesData, useNewTransactions]);
}

/**
 * Calculate CPM from activity transactions (new system)
 */
function calculateFromActivityTransactions(
  transactions: ActivityTransaction[],
  flights: FlightRecord[]
): AcquisitionCPMResult {
  // Filter to only earning transactions (positive miles)
  const earningTransactions = transactions.filter(tx => tx.miles > 0);
  
  // Calculate transaction stats
  let totalCost = 0;
  let totalMilesFromTransactions = 0;
  let transactionsWithCost = 0;
  
  earningTransactions.forEach(tx => {
    totalMilesFromTransactions += tx.miles;
    
    if (tx.cost !== null && tx.cost !== undefined) {
      totalCost += tx.cost;
      transactionsWithCost++;
    }
  });
  
  // Add flight miles (typically free, but could have ticket cost tracked)
  const flightMiles = flights.reduce((sum, f) => sum + (f.earnedMiles || 0), 0);
  const flightCost = flights.reduce((sum, f) => sum + (f.ticketPrice || 0), 0);
  
  // Note: We don't count flight ticket price as "cost of miles" by default
  // because the ticket price is for the flight itself, not just the miles
  // Users who want to include this can track it separately
  
  const totalMilesEarned = totalMilesFromTransactions + flightMiles;
  const totalTransactions = earningTransactions.length;
  
  // Calculate coverage (only for non-flight transactions, as flights are typically free miles)
  const coverage = totalTransactions > 0 
    ? (transactionsWithCost / totalTransactions) * 100 
    : 0;
  
  // Calculate CPM
  const cpm = totalMilesEarned > 0 ? totalCost / totalMilesEarned : 0;
  
  // We have data if there's at least some cost tracked
  const hasData = totalCost > 0 && totalMilesEarned > 0;
  
  return {
    cpm,
    totalCost,
    totalMilesEarned,
    hasData,
    coverage,
    transactionsWithCost,
    totalTransactions,
  };
}

/**
 * Calculate CPM from legacy miles records (old system)
 */
function calculateFromLegacyData(milesData: MilesRecord[]): AcquisitionCPMResult {
  let totalCost = 0;
  let totalMilesEarned = 0;
  
  milesData.forEach(record => {
    // Sum all earning sources
    const earned = 
      record.miles_subscription +
      record.miles_amex +
      record.miles_flight +
      record.miles_other;
    
    // Sum all costs
    const cost = 
      record.cost_subscription +
      record.cost_amex +
      record.cost_flight +
      record.cost_other;
    
    totalMilesEarned += earned;
    totalCost += cost;
  });
  
  const cpm = totalMilesEarned > 0 ? totalCost / totalMilesEarned : 0;
  const hasData = totalCost > 0 && totalMilesEarned > 0;
  
  return {
    cpm,
    totalCost,
    totalMilesEarned,
    hasData,
    coverage: 100, // Legacy system assumes all data has cost
    transactionsWithCost: milesData.length,
    totalTransactions: milesData.length,
  };
}

export default useAcquisitionCPM;
