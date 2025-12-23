// src/modules/ai-pdf-parser/converter.ts
// Converts AI raw response to SkyStatus app types

import type { FlightRecord, MilesRecord, StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import type { AIRawResponse, AIRawFlight, AIRawMilesActivity, AIRawStatusEvent, PdfHeader } from './types';

// ============================================================================
// FLIGHT CONVERSION
// ============================================================================

/**
 * Convert AI parsed flights to FlightRecord format
 */
export function convertFlights(rawFlights: AIRawFlight[]): FlightRecord[] {
  const now = new Date().toISOString();
  
  return rawFlights.map((f, index) => ({
    id: `ai-flight-${f.flightDate}-${f.route.replace(/\s/g, '')}-${index}`,
    date: f.flightDate, // Use actual flight date, not posting date
    route: normalizeRoute(f.route),
    airline: f.airline.toUpperCase(),
    flightNumber: f.flightNumber,
    cabin: f.cabin === 'Unknown' ? 'Economy' : f.cabin,
    ticketPrice: undefined, // Not available from PDF
    earnedMiles: f.miles + f.safMiles,
    earnedXP: f.xp,
    safXp: f.safXp,
    uxp: f.uxp,
    importSource: 'pdf' as const,
    importedAt: now,
  }));
}

/**
 * Normalize route format to "XXX-YYY"
 */
function normalizeRoute(route: string): string {
  // Remove extra spaces, normalize dashes
  return route
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase();
}

// ============================================================================
// MILES RECORD CONVERSION
// ============================================================================

/**
 * Convert AI parsed miles activities to MilesRecord format
 * Aggregates by month
 */
export function convertMilesRecords(
  rawActivities: AIRawMilesActivity[],
  rawFlights: AIRawFlight[]
): MilesRecord[] {
  const monthMap = new Map<string, MilesRecord>();
  
  // Helper to get or create month record
  const getMonth = (date: string): MilesRecord => {
    const month = date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        id: `ai-miles-${month}`,
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
  
  // Process miles activities
  for (const activity of rawActivities) {
    const record = getMonth(activity.date);
    const miles = activity.miles;
    
    // Negative miles go to debit
    if (miles < 0) {
      record.miles_debit += Math.abs(miles);
      continue;
    }
    
    // Positive miles go to appropriate category
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
        // hotel, shopping, partner, car_rental, transfer_in, donation, adjustment, promo, other
        record.miles_other += miles;
        break;
    }
  }
  
  // Process flight miles
  for (const flight of rawFlights) {
    const record = getMonth(flight.flightDate);
    const totalFlightMiles = flight.miles + flight.safMiles;
    
    if (totalFlightMiles > 0) {
      record.miles_flight += totalFlightMiles;
    } else if (totalFlightMiles < 0) {
      // Negative flight miles (adjustments) go to debit
      record.miles_debit += Math.abs(totalFlightMiles);
    }
  }
  
  // Convert to sorted array
  return Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month));
}

// ============================================================================
// BONUS XP EXTRACTION
// ============================================================================

/**
 * Extract bonus XP by month from non-flight activities
 * This goes into manualLedger.miscXp
 */
export function extractBonusXpByMonth(
  rawActivities: AIRawMilesActivity[]
): Record<string, number> {
  const bonusXp: Record<string, number> = {};
  
  for (const activity of rawActivities) {
    if (activity.xp > 0) {
      const month = activity.date.slice(0, 7);
      bonusXp[month] = (bonusXp[month] ?? 0) + activity.xp;
    }
  }
  
  return bonusXp;
}

// ============================================================================
// QUALIFICATION SETTINGS DETECTION
// ============================================================================

/**
 * Detect qualification cycle from status events
 */
export function detectQualificationSettings(
  statusEvents: AIRawStatusEvent[],
  headerStatus: StatusLevel
): QualificationSettings | null {
  // Find the most recent XP reset (indicates new cycle started)
  const xpResetEvents = statusEvents
    .filter(e => e.type === 'xp_reset')
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const xpSurplusEvents = statusEvents
    .filter(e => e.type === 'xp_surplus')
    .sort((a, b) => b.date.localeCompare(a.date));
  
  if (xpResetEvents.length === 0) {
    return null;
  }
  
  const latestReset = xpResetEvents[0];
  
  // Find corresponding surplus event (usually same date)
  const correspondingSurplus = xpSurplusEvents.find(
    e => e.date === latestReset.date
  );
  
  // Calculate cycle start month (1st of month AFTER requalification)
  const requalDate = new Date(latestReset.date);
  const cycleStartDate = new Date(requalDate.getFullYear(), requalDate.getMonth() + 1, 1);
  const cycleStartMonth = cycleStartDate.toISOString().slice(0, 7);
  
  // Determine status from reset event or fallback to header
  let startingStatus: StatusLevel = headerStatus;
  if (latestReset.statusReached) {
    startingStatus = latestReset.statusReached;
  } else {
    // Infer from XP deducted
    const xpDeducted = Math.abs(latestReset.xpChange);
    if (xpDeducted >= 300) startingStatus = 'Platinum';
    else if (xpDeducted >= 180) startingStatus = 'Gold';
    else if (xpDeducted >= 100) startingStatus = 'Silver';
    else startingStatus = 'Explorer';
  }
  
  // Map Ultimate to Platinum for qualification settings
  // (Ultimate is tracked separately via UXP)
  if (startingStatus === 'Ultimate') {
    startingStatus = 'Platinum';
  }
  
  return {
    cycleStartMonth,
    cycleStartDate: latestReset.date, // For precise flight filtering
    startingStatus,
    startingXP: correspondingSurplus?.xpChange ?? 0,
    startingUXP: undefined, // Could be extracted from uxp_surplus events
  };
}

// ============================================================================
// PDF HEADER CREATION (for preview/validation only)
// ============================================================================

/**
 * Create PdfHeader from AI response for preview display.
 * This is NOT stored or used as source of truth - only for UI preview.
 */
export function createPdfHeader(rawResponse: AIRawResponse): PdfHeader {
  return {
    xp: rawResponse.header.totalXp,
    uxp: rawResponse.header.totalUxp,
    miles: rawResponse.header.totalMiles,
    status: rawResponse.header.currentStatus,
    exportDate: rawResponse.header.exportDate,
    memberName: rawResponse.header.memberName ?? undefined,
    memberNumber: rawResponse.header.memberNumber ?? undefined,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate the converted data for consistency
 */
export function validateConversion(
  flights: FlightRecord[],
  milesRecords: MilesRecord[],
  pdfHeader: PdfHeader,
  bonusXpByMonth: Record<string, number>
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check flight dates are valid
  for (const flight of flights) {
    if (!flight.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      warnings.push(`Invalid flight date format: ${flight.date}`);
    }
  }
  
  // Check miles records have valid months
  for (const record of milesRecords) {
    if (!record.month.match(/^\d{4}-\d{2}$/)) {
      warnings.push(`Invalid miles month format: ${record.month}`);
    }
  }
  
  // Check totals make rough sense (informational only)
  const totalFlightXP = flights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0);
  const totalBonusXP = Object.values(bonusXpByMonth).reduce((sum, xp) => sum + xp, 0);
  const totalCalculatedXP = totalFlightXP + totalBonusXP;
  
  // Allow for rollover XP difference - this is just informational
  const xpDifference = Math.abs(pdfHeader.xp - totalCalculatedXP);
  if (xpDifference > 500) { // Allow significant variance due to rollovers
    warnings.push(`XP difference detected: PDF header shows ${pdfHeader.xp}, calculated ${totalCalculatedXP}. This is normal if there's rollover XP from a previous cycle.`);
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
