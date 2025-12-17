/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  PROTECTED MODULE - DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  This module handles critical PDF import logic. Unauthorized changes      ║
 * ║  can cause DATA LOSS for users.                                          ║
 * ║                                                                           ║
 * ║  BEFORE MAKING ANY CHANGES:                                              ║
 * ║  1. Read README.md in this directory                                     ║
 * ║  2. Run ALL tests: npm run test:pdf-import                               ║
 * ║  3. Update CHANGELOG.md with your changes                                ║
 * ║  4. Update VERSION if needed (semver)                                    ║
 * ║  5. Test with real PDFs in multiple languages                            ║
 * ║                                                                           ║
 * ║  Module Version: 2.0.0                                                   ║
 * ║  Last Modified: 2024-12-17                                               ║
 * ║  Last Author: Claude                                                      ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Conflict Detector
 * 
 * Detects conflicts between parsed PDF data and existing user data.
 * Handles exact matches (auto-skip), fuzzy matches (user choice), and new records.
 * 
 * PRINCIPLES:
 * - Always ADD, never overwrite without confirmation
 * - Exact duplicates are auto-skipped
 * - Fuzzy matches require user resolution
 * - Manual entries are NEVER touched
 * 
 * @module core/conflict-detector
 */

import type { 
  ImportConflict, 
  ParsedFlight, 
  ParsedMiles,
  FlightRecord,
  MilesRecord,
  PdfImportResult,
  ResolvedImportData,
  ConflictResolution
} from '../types';

/**
 * Configuration for conflict detection
 */
export interface ConflictDetectionConfig {
  /** Threshold for fuzzy match confidence (0-1) */
  fuzzyThreshold: number;
  /** Max days difference for date-based fuzzy matching */
  dateToleranceDays: number;
  /** Whether to consider manual entries for matching */
  includeManualEntries: boolean;
}

/**
 * Default conflict detection config
 */
export const DEFAULT_CONFIG: ConflictDetectionConfig = {
  fuzzyThreshold: 0.7,
  dateToleranceDays: 1,
  includeManualEntries: false, // Never touch manual entries by default
};

/**
 * Detect all conflicts between parsed data and existing data
 * 
 * @param parsed - The parsed PDF result
 * @param existingFlights - User's existing flights
 * @param existingMiles - User's existing miles records
 * @param config - Optional configuration
 * @returns Array of detected conflicts
 */
export function detectConflicts(
  parsed: PdfImportResult,
  existingFlights: FlightRecord[],
  existingMiles: MilesRecord[],
  config?: Partial<ConflictDetectionConfig>
): ImportConflict[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const conflicts: ImportConflict[] = [];
  
  // Filter out manual entries if configured
  const flightsToCheck = mergedConfig.includeManualEntries 
    ? existingFlights 
    : existingFlights.filter(f => !f.isManual);
  
  // Check each parsed flight
  for (const flight of parsed.flights) {
    // Skip already-marked duplicates
    if (flight.status === 'duplicate') continue;
    
    // Check for fuzzy matches (exact matches are already handled in parser)
    for (const existing of flightsToCheck) {
      const matchResult = isFuzzyFlightMatch(flight, existing, mergedConfig);
      
      if (matchResult.isMatch && matchResult.confidence >= mergedConfig.fuzzyThreshold) {
        conflicts.push({
          id: generateConflictId('flight', flight.id),
          type: 'flight',
          reason: 'fuzzy_match',
          existing: existing,
          incoming: flight,
          matchReason: matchResult.reason,
          matchConfidence: matchResult.confidence,
        });
        break; // Only one conflict per flight
      }
    }
  }
  
  // Check each parsed miles record
  for (const miles of parsed.miles) {
    const existing = existingMiles.find(e => e.month === miles.month);
    
    if (existing && hasMilesChanges(miles, existing)) {
      conflicts.push({
        id: generateConflictId('miles', miles.month),
        type: 'miles',
        reason: 'different_values',
        existing: existing,
        incoming: miles,
        matchReason: `Month ${miles.month} has different values`,
        matchConfidence: 1.0,
      });
    }
  }
  
  return conflicts;
}

/**
 * Check if a flight is an exact duplicate
 * Match on: date + route (flight numbers can change)
 */
export function isExactFlightMatch(
  parsed: ParsedFlight,
  existing: FlightRecord
): boolean {
  return parsed.date === existing.date && parsed.route === existing.route;
}

/**
 * Check if a flight is a fuzzy match
 * Considers: similar route, date within tolerance, same airline
 */
export function isFuzzyFlightMatch(
  parsed: ParsedFlight,
  existing: FlightRecord,
  config: ConflictDetectionConfig
): { isMatch: boolean; confidence: number; reason: string } {
  let confidence = 0;
  const reasons: string[] = [];
  
  // Check route match
  if (parsed.route === existing.route) {
    confidence += 0.4;
    reasons.push('same route');
  }
  
  // Check date proximity
  const parsedDate = new Date(parsed.date);
  const existingDate = new Date(existing.date);
  const daysDiff = Math.abs(parsedDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff === 0) {
    confidence += 0.3;
    reasons.push('same date');
  } else if (daysDiff <= config.dateToleranceDays) {
    confidence += 0.2;
    reasons.push(`date within ${daysDiff} day(s)`);
  }
  
  // Check airline match
  if (parsed.airline === existing.airline) {
    confidence += 0.2;
    reasons.push('same airline');
  }
  
  // Check flight number similarity
  if (parsed.flightNumber === existing.flightNumber) {
    confidence += 0.1;
    reasons.push('same flight number');
  }
  
  return {
    isMatch: confidence >= config.fuzzyThreshold,
    confidence,
    reason: reasons.join(', '),
  };
}

/**
 * Check if a miles record has changes
 */
export function hasMilesChanges(
  parsed: ParsedMiles,
  existing: MilesRecord
): boolean {
  // Compare key fields
  if (parsed.sources.subscription.miles !== existing.subscriptionMiles) return true;
  if (parsed.sources.creditCard.miles !== existing.amexMiles) return true;
  if (parsed.sources.hotel.miles !== existing.hotelMiles) return true;
  if (parsed.debit !== existing.milesDebit) return true;
  
  return false;
}

/**
 * Resolve conflicts and prepare final import data
 * 
 * @param parsed - The parsed PDF result
 * @param conflicts - Conflicts with user resolutions
 * @returns Final data ready for import
 */
export function resolveImport(
  parsed: PdfImportResult,
  conflicts: ImportConflict[]
): ResolvedImportData {
  // Get flights to add
  const flightsToAdd = getFlightsToAdd(parsed.flights, conflicts);
  
  // Get miles to merge
  const milesToMerge = getMilesToMerge(parsed.miles, [], conflicts);
  
  // Build qualification settings if status detected
  let qualificationSettings = undefined;
  if (parsed.status) {
    qualificationSettings = {
      cycleStartMonth: parsed.status.cycleStartMonth,
      cycleStartDate: parsed.status.cycleStartDate,
      startingStatus: parsed.status.currentStatus,
      startingXP: parsed.status.rolloverXP,
    };
  }
  
  // Extract bonus XP by month
  const bonusXpByMonth: Record<string, number> = {};
  for (const miles of parsed.miles) {
    if (miles.totalXP > 0) {
      bonusXpByMonth[miles.month] = miles.totalXP;
    }
  }
  
  return {
    flightsToAdd,
    milesToMerge,
    qualificationSettings,
    bonusXpByMonth,
    officialBalances: {
      xp: parsed.xp.official,
      uxp: parsed.uxp.official,
      miles: parsed.officialMilesBalance ?? 0,
    },
    importMeta: {
      timestamp: new Date().toISOString(),
      flightsAdded: flightsToAdd.length,
      milesUpdated: milesToMerge.length,
      language: parsed.meta.language,
    },
  };
}

/**
 * Generate a unique ID for a conflict
 */
export function generateConflictId(
  type: 'flight' | 'miles',
  incomingId: string
): string {
  return `conflict-${type}-${incomingId}-${Date.now()}`;
}

/**
 * Get all flights to add based on conflict resolutions
 */
export function getFlightsToAdd(
  parsedFlights: ParsedFlight[],
  conflicts: ImportConflict[]
): FlightRecord[] {
  const flightsToAdd: FlightRecord[] = [];
  const conflictedFlightIds = new Set(
    conflicts
      .filter(c => c.type === 'flight')
      .map(c => (c.incoming as ParsedFlight).id)
  );
  
  for (const flight of parsedFlights) {
    // Skip duplicates
    if (flight.status === 'duplicate') continue;
    
    // Check if this flight has a conflict
    const conflict = conflicts.find(
      c => c.type === 'flight' && (c.incoming as ParsedFlight).id === flight.id
    );
    
    if (conflict) {
      // Handle based on resolution
      if (conflict.resolution === 'use_incoming' || conflict.resolution === 'keep_both') {
        flightsToAdd.push(parsedFlightToRecord(flight));
      }
      // 'keep_existing' means we don't add this flight
    } else {
      // No conflict - add if new
      if (flight.status === 'new') {
        flightsToAdd.push(parsedFlightToRecord(flight));
      }
    }
  }
  
  return flightsToAdd;
}

/**
 * Convert ParsedFlight to FlightRecord
 */
function parsedFlightToRecord(flight: ParsedFlight): FlightRecord {
  return {
    id: flight.id,
    date: flight.date,
    flightNumber: flight.flightNumber,
    route: flight.route,
    airline: flight.airline,
    earnedXP: flight.earnedXP,
    earnedMiles: flight.earnedMiles,
    safXp: flight.safXP,
    ticketPrice: flight.ticketPrice,
    currency: flight.currency,
  };
}

/**
 * Get all miles records to merge based on conflict resolutions
 */
export function getMilesToMerge(
  parsedMiles: ParsedMiles[],
  existingMiles: MilesRecord[],
  conflicts: ImportConflict[]
): MilesRecord[] {
  const result: MilesRecord[] = [];
  
  for (const miles of parsedMiles) {
    // Check if this month has a conflict
    const conflict = conflicts.find(
      c => c.type === 'miles' && (c.incoming as ParsedMiles).month === miles.month
    );
    
    if (conflict) {
      // Handle based on resolution
      if (conflict.resolution === 'use_incoming') {
        result.push(parsedMilesToRecord(miles));
      }
      // 'keep_existing' means we don't update
      // 'keep_both' doesn't make sense for miles (same month)
    } else {
      // No conflict - add if new or has changes
      if (miles.status === 'new') {
        result.push(parsedMilesToRecord(miles));
      }
    }
  }
  
  return result;
}

/**
 * Convert ParsedMiles to MilesRecord
 */
function parsedMilesToRecord(miles: ParsedMiles): MilesRecord {
  return {
    month: miles.month,
    flightMiles: miles.sources.flights.miles,
    subscriptionMiles: miles.sources.subscription.miles,
    amexMiles: miles.sources.creditCard.miles,
    hotelMiles: miles.sources.hotel.miles,
    otherMiles: miles.sources.other.miles + miles.sources.promo.miles + miles.sources.transfer.miles,
    purchasedMiles: miles.sources.purchased.miles,
    transferMiles: miles.sources.transfer.miles,
    milesDebit: miles.debit,
    totalMiles: miles.totalEarned,
  };
}

/**
 * Apply a resolution to a conflict
 */
export function applyResolution(
  conflict: ImportConflict,
  resolution: ConflictResolution
): ImportConflict {
  return { ...conflict, resolution };
}
