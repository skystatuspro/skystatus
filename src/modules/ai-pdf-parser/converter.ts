// src/modules/ai-pdf-parser/converter.ts
// Converts AI raw response to SkyStatus app types
// CLEAN VERSION - pdfHeader for preview only

import type { FlightRecord, MilesRecord, StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import type { AIRawResponse, AIRawFlight, AIRawMilesActivity, AIRawStatusEvent, PdfHeader } from './types';

// ============================================================================
// FLIGHT CONVERSION
// ============================================================================

export function convertFlights(rawFlights: AIRawFlight[]): FlightRecord[] {
  const now = new Date().toISOString();
  
  return rawFlights.map((f, index) => ({
    id: `ai-flight-${f.flightDate}-${f.route.replace(/\s/g, '')}-${index}`,
    date: f.flightDate,
    route: normalizeRoute(f.route),
    airline: f.airline.toUpperCase(),
    flightNumber: f.flightNumber,
    cabin: f.cabin === 'Unknown' ? 'Economy' : f.cabin,
    ticketPrice: undefined,
    earnedMiles: f.miles + f.safMiles,
    earnedXP: f.xp,
    safXp: f.safXp,
    uxp: f.uxp,
    importSource: 'pdf' as const,
    importedAt: now,
  }));
}

function normalizeRoute(route: string): string {
  return route
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase();
}

// ============================================================================
// MILES RECORD CONVERSION
// ============================================================================

export function convertMilesRecords(
  rawActivities: AIRawMilesActivity[],
  rawFlights: AIRawFlight[]
): MilesRecord[] {
  const monthMap = new Map<string, MilesRecord>();
  
  const getMonth = (date: string): MilesRecord => {
    const month = date.slice(0, 7);
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
  
  for (const flight of rawFlights) {
    const record = getMonth(flight.flightDate);
    const totalFlightMiles = flight.miles + flight.safMiles;
    
    if (totalFlightMiles > 0) {
      record.miles_flight += totalFlightMiles;
    } else if (totalFlightMiles < 0) {
      record.miles_debit += Math.abs(totalFlightMiles);
    }
  }
  
  return Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month));
}

// ============================================================================
// BONUS XP EXTRACTION
// ============================================================================

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

export function detectQualificationSettings(
  statusEvents: AIRawStatusEvent[],
  headerStatus: StatusLevel
): QualificationSettings | null {
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
  const correspondingSurplus = xpSurplusEvents.find(
    e => e.date === latestReset.date
  );
  
  const requalDate = new Date(latestReset.date);
  const cycleStartDate = new Date(requalDate.getFullYear(), requalDate.getMonth() + 1, 1);
  const cycleStartMonth = cycleStartDate.toISOString().slice(0, 7);
  
  let startingStatus: StatusLevel = headerStatus;
  if (latestReset.statusReached) {
    startingStatus = latestReset.statusReached;
  } else {
    const xpDeducted = Math.abs(latestReset.xpChange);
    if (xpDeducted >= 300) startingStatus = 'Platinum';
    else if (xpDeducted >= 180) startingStatus = 'Gold';
    else if (xpDeducted >= 100) startingStatus = 'Silver';
    else startingStatus = 'Explorer';
  }
  
  if (startingStatus === 'Ultimate') {
    startingStatus = 'Platinum';
  }
  
  return {
    cycleStartMonth,
    cycleStartDate: latestReset.date,
    startingStatus,
    startingXP: correspondingSurplus?.xpChange ?? 0,
    startingUXP: undefined,
  };
}

// ============================================================================
// PDF HEADER (for preview only)
// ============================================================================

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

export function validateConversion(
  flights: FlightRecord[],
  milesRecords: MilesRecord[],
  pdfHeader: PdfHeader,
  bonusXpByMonth: Record<string, number>
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  for (const flight of flights) {
    if (!flight.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      warnings.push(`Invalid flight date format: ${flight.date}`);
    }
  }
  
  for (const record of milesRecords) {
    if (!record.month.match(/^\d{4}-\d{2}$/)) {
      warnings.push(`Invalid miles month format: ${record.month}`);
    }
  }
  
  const totalFlightXP = flights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0);
  const totalBonusXP = Object.values(bonusXpByMonth).reduce((sum, xp) => sum + xp, 0);
  const totalCalculatedXP = totalFlightXP + totalBonusXP;
  
  const xpDifference = Math.abs(pdfHeader.xp - totalCalculatedXP);
  if (xpDifference > 500) {
    warnings.push(`XP difference: PDF shows ${pdfHeader.xp}, calculated ${totalCalculatedXP}. This is normal with rollover XP.`);
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
