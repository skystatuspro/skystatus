// src/modules/local-text-parser/converter.ts
// Convert parsed data to AIParsedResult format
// Ensures drop-in compatibility with AI parser output

import type { 
  ParsedHeader, 
  AIRawResponse, 
  AIRawFlight, 
  AIRawMilesActivity, 
  AIRawStatusEvent,
  PdfHeader,
} from './types';
import type { FlightRecord, ActivityTransaction, MilesRecord, ActivityTransactionType, StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import { generateTransactionId } from '../../utils/transaction-id';

// ============================================================================
// FLIGHT CONVERSION
// ============================================================================

/**
 * Normalize route format to "XXX-YYY"
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * Convert AIRawFlight array to FlightRecord array
 */
export function convertToFlightRecords(rawFlights: AIRawFlight[]): FlightRecord[] {
  const now = new Date().toISOString();
  
  return rawFlights.map((f, index) => {
    const totalMiles = f.miles + f.safMiles;
    const totalXp = f.xp;
    const totalSafXp = f.safXp;
    
    return {
      id: `local-flight-${f.flightDate}-${normalizeRoute(f.route)}-${index}-${crypto.randomUUID().slice(0, 8)}`,
      date: f.flightDate,
      route: normalizeRoute(f.route),
      airline: f.airline.toUpperCase(),
      flightNumber: f.flightNumber,
      cabin: f.cabin === 'Unknown' ? 'Economy' : f.cabin,
      ticketPrice: undefined,
      earnedMiles: totalMiles,
      earnedXP: totalXp,
      safXp: totalSafXp,
      uxp: f.uxp,
      importSource: 'pdf' as const,
      importedAt: now,
    };
  });
}

// ============================================================================
// ACTIVITY TRANSACTION CONVERSION
// ============================================================================

/**
 * Map AI parser activity type to ActivityTransactionType
 */
function mapToActivityType(aiType: string): ActivityTransactionType {
  const typeMap: Record<string, ActivityTransactionType> = {
    'subscription': 'subscription',
    'amex': 'amex',
    'amex_bonus': 'amex_bonus',
    'hotel': 'hotel',
    'shopping': 'shopping',
    'partner': 'partner',
    'transfer_in': 'transfer_in',
    'transfer_out': 'transfer_out',
    'redemption': 'redemption',
    'donation': 'donation',
    'adjustment': 'adjustment',
    'car_rental': 'car_rental',
    'expiry': 'expiry',
    'promo': 'other',
    'other': 'other',
  };
  
  return typeMap[aiType.toLowerCase()] || 'other';
}

/**
 * Convert AIRawMilesActivity array to ActivityTransaction array
 * Each transaction gets a unique, deterministic ID for deduplication
 */
export function convertToActivityTransactionRecords(
  rawActivities: AIRawMilesActivity[],
  pdfExportDate: string
): ActivityTransaction[] {
  const transactions: ActivityTransaction[] = [];
  const seenIds = new Map<string, number>();
  
  for (const activity of rawActivities) {
    let type = mapToActivityType(activity.type);
    const miles = activity.miles;
    const xp = activity.xp;
    
    // Skip zero-value transactions
    if (miles === 0 && xp === 0) {
      continue;
    }
    
    // Skip surplus XP (rollover) - handled via qualification settings
    if (activity.description.toLowerCase().includes('surplus xp') ||
        activity.description.toLowerCase().includes('surplus-xp')) {
      console.log('[Converter] Skipping Surplus XP (rollover):', activity.description.slice(0, 50));
      continue;
    }
    
    // Fix: transfer_out with positive miles is actually transfer_in
    if (type === 'transfer_out' && miles > 0) {
      type = 'transfer_in';
    }
    
    // Generate deterministic ID
    const baseId = generateTransactionId(activity.date, type, miles, xp, activity.description);
    
    // Handle duplicates
    const existingCount = seenIds.get(baseId) || 0;
    seenIds.set(baseId, existingCount + 1);
    
    const id = existingCount > 0
      ? generateTransactionId(activity.date, type, miles, xp, activity.description, existingCount)
      : baseId;
    
    transactions.push({
      id,
      date: activity.date,
      type,
      description: activity.description,
      miles,
      xp,
      source: 'pdf',
      sourceDate: pdfExportDate,
    });
  }
  
  // Sort by date descending
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  
  return transactions;
}

// ============================================================================
// MILES RECORD CONVERSION (Legacy format)
// ============================================================================

/**
 * Extract month from date string
 */
function extractMonth(date: string): string {
  return date.slice(0, 7);  // YYYY-MM
}

/**
 * Convert to legacy MilesRecord format (aggregated by month)
 */
export function convertToMilesRecords(
  rawActivities: AIRawMilesActivity[],
  rawFlights: AIRawFlight[]
): MilesRecord[] {
  const monthMap = new Map<string, MilesRecord>();
  
  const getMonth = (date: string): MilesRecord => {
    const month = extractMonth(date);
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        id: `local-miles-${month}`,
        month,
        miles_subscription: 0,
        miles_amex: 0,
        miles_flight: 0,
        miles_other: 0,
        miles_debit: 0,
        cost_subscription: 0,
        cost_amex: 0,
        cost_flight: 0,
        cost_other: 0,
      });
    }
    return monthMap.get(month)!;
  };
  
  // Process activities
  for (const activity of rawActivities) {
    const record = getMonth(activity.date);
    const miles = activity.miles;
    
    if (miles < 0) {
      record.miles_debit += Math.abs(miles);
      continue;
    }
    
    switch (activity.type) {
      case 'subscription':
        record.miles_subscription += miles;
        break;
      case 'amex':
      case 'amex_bonus':
        record.miles_amex += miles;
        break;
      case 'redemption':
      case 'expiry':
      case 'transfer_out':
        record.miles_debit += Math.abs(miles);
        break;
      default:
        record.miles_other += miles;
        break;
    }
  }
  
  // Process flights
  for (const flight of rawFlights) {
    const record = getMonth(flight.flightDate);
    const totalMiles = flight.miles + flight.safMiles;
    
    if (totalMiles > 0) {
      record.miles_flight += totalMiles;
    } else if (totalMiles < 0) {
      record.miles_debit += Math.abs(totalMiles);
    }
  }
  
  return Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month));
}

// ============================================================================
// BONUS XP EXTRACTION
// ============================================================================

/**
 * Extract bonus XP by month from non-flight activities
 */
export function extractBonusXpByMonth(
  rawActivities: AIRawMilesActivity[],
  qualificationSettings: QualificationSettings | null
): Record<string, number> {
  const bonusXpByMonth: Record<string, number> = {};
  
  for (const activity of rawActivities) {
    // Only count activities with positive XP
    if (activity.xp <= 0) continue;
    
    // Skip surplus XP (rollover)
    if (activity.description.toLowerCase().includes('surplus xp')) continue;
    
    // If we have qualification settings, skip XP before the cycle started
    if (qualificationSettings) {
      const cycleStartMonth = qualificationSettings.cycleStartMonth;
      const activityMonth = extractMonth(activity.date);
      if (activityMonth < cycleStartMonth) continue;
    }
    
    const month = extractMonth(activity.date);
    bonusXpByMonth[month] = (bonusXpByMonth[month] || 0) + activity.xp;
  }
  
  return bonusXpByMonth;
}

// ============================================================================
// PDF HEADER CREATION
// ============================================================================

/**
 * Create PdfHeader from parsed header
 */
export function createPdfHeaderFromParsed(header: ParsedHeader): PdfHeader {
  let status: StatusLevel = header.currentStatus;
  
  // Ultimate maps to Platinum for display purposes
  if (status === 'Ultimate') {
    status = 'Platinum';
  }
  
  return {
    xp: header.totalXp,
    uxp: header.totalUxp,
    miles: header.totalMiles,
    status,
    exportDate: header.exportDate,
    memberName: header.memberName,
    memberNumber: header.memberNumber,
  };
}

// ============================================================================
// MILES RECONCILIATION
// ============================================================================

/** Threshold for considering a difference significant (in miles) */
const RECONCILIATION_THRESHOLD = 100;

/**
 * Calculate miles reconciliation - compare header balance with parsed transactions
 * This detects "missing" historical miles from before the statement period
 */
export function calculateMilesReconciliation(
  headerBalance: number,
  flights: AIRawFlight[],
  activities: AIRawMilesActivity[]
): {
  headerBalance: number;
  parsedTotal: number;
  difference: number;
  oldestTransactionDate: string;
  oldestMonth: string;
  needsCorrection: boolean;
  suggestedCorrection: {
    date: string;
    description: string;
    miles: number;
  } | null;
} {
  // Calculate total from flights
  const flightMiles = flights.reduce((sum, f) => sum + f.miles + f.safMiles, 0);
  
  // Calculate total from activities (including negative for redemptions)
  const activityMiles = activities.reduce((sum, a) => sum + a.miles, 0);
  
  const parsedTotal = flightMiles + activityMiles;
  const difference = headerBalance - parsedTotal;
  
  // Find oldest transaction date
  const allDates: string[] = [
    ...flights.map(f => f.flightDate),
    ...activities.map(a => a.date),
  ].filter(d => d && d.length === 10); // Valid YYYY-MM-DD dates
  
  allDates.sort((a, b) => a.localeCompare(b));
  
  const oldestTransactionDate = allDates[0] || new Date().toISOString().slice(0, 10);
  const oldestMonth = oldestTransactionDate.slice(0, 7);
  
  // Determine if correction is needed
  const needsCorrection = difference > RECONCILIATION_THRESHOLD;
  
  // Create suggested correction if needed
  const suggestedCorrection = needsCorrection ? {
    date: `${oldestMonth}-01`, // First day of oldest month
    description: `Historical balance (pre-${oldestMonth})`,
    miles: difference,
  } : null;
  
  return {
    headerBalance,
    parsedTotal,
    difference,
    oldestTransactionDate,
    oldestMonth,
    needsCorrection,
    suggestedCorrection,
  };
}

// ============================================================================
// RAW RESPONSE CREATION
// ============================================================================

/**
 * Create AIRawResponse for compatibility
 */
export function createRawResponse(
  header: ParsedHeader,
  flights: AIRawFlight[],
  activities: AIRawMilesActivity[],
  statusEvents: AIRawStatusEvent[]
): AIRawResponse {
  return {
    header: {
      memberName: header.memberName,
      memberNumber: header.memberNumber,
      currentStatus: header.currentStatus,
      totalMiles: header.totalMiles,
      totalXp: header.totalXp,
      totalUxp: header.totalUxp,
      exportDate: header.exportDate,
    },
    flights,
    milesActivities: activities,
    statusEvents,
  };
}
