// src/modules/ai-pdf-parser/converter.ts
// Converts AI raw response to SkyStatus app types
// v2.3 - Added robust date parsing for multiple formats

import type { FlightRecord, MilesRecord, StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import type { AIRawResponse, AIRawFlight, AIRawMilesActivity, AIRawStatusEvent } from './types';

// ============================================================================
// DATE PARSING UTILITIES
// ============================================================================

/**
 * Dutch month names to number mapping
 */
const DUTCH_MONTHS: Record<string, string> = {
  'jan': '01', 'januari': '01',
  'feb': '02', 'februari': '02',
  'mrt': '03', 'maart': '03',
  'apr': '04', 'april': '04',
  'mei': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'aug': '08', 'augustus': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'okt': '10', 'oct': '10', 'oktober': '10', 'october': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12',
};

/**
 * English month names to number mapping
 */
const ENGLISH_MONTHS: Record<string, string> = {
  'jan': '01', 'january': '01',
  'feb': '02', 'february': '02',
  'mar': '03', 'march': '03',
  'apr': '04', 'april': '04',
  'may': '05',
  'jun': '06', 'june': '06',
  'jul': '07', 'july': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'oct': '10', 'october': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12',
};

/**
 * Parse various date formats to ISO YYYY-MM-DD
 * Supports:
 * - ISO format: "2025-11-09"
 * - Dutch format: "9 nov 2025", "09 november 2025"
 * - English format: "Nov 9, 2025", "9 November 2025"
 * - Compact: "09-11-2025", "09/11/2025"
 */
export function parseToISODate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    console.warn('[Converter] Invalid date input:', dateStr);
    return '1970-01-01'; // Fallback to prevent crash
  }

  const trimmed = dateStr.trim();

  // Already ISO format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try Dutch/English text format: "9 nov 2025" or "09 november 2025"
  const textMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthName = textMatch[2].toLowerCase();
    const year = textMatch[3];
    
    const month = DUTCH_MONTHS[monthName] || ENGLISH_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try English format: "Nov 9, 2025" or "November 9, 2025"
  const englishMatch = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (englishMatch) {
    const monthName = englishMatch[1].toLowerCase();
    const day = englishMatch[2].padStart(2, '0');
    const year = englishMatch[3];
    
    const month = ENGLISH_MONTHS[monthName] || DUTCH_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try MM-DD-YYYY or MM/DD/YYYY (US format)
  const mdyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (mdyMatch) {
    // Assume DMY for European context
    const day = mdyMatch[1].padStart(2, '0');
    const month = mdyMatch[2].padStart(2, '0');
    const year = mdyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Last resort: try JavaScript Date parsing
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {
    // Ignore parsing errors
  }

  console.warn('[Converter] Could not parse date:', dateStr);
  return '1970-01-01'; // Fallback
}

/**
 * Extract month from date string (YYYY-MM)
 */
export function extractMonth(dateStr: string): string {
  const isoDate = parseToISODate(dateStr);
  return isoDate.slice(0, 7);
}

// ============================================================================
// FLIGHT CONVERSION
// ============================================================================

/**
 * Convert AI parsed flights to FlightRecord format
 */
export function convertFlights(rawFlights: AIRawFlight[]): FlightRecord[] {
  const now = new Date().toISOString();
  
  return rawFlights.map((f, index) => {
    const flightDate = parseToISODate(f.flightDate);
    
    return {
      id: `ai-flight-${flightDate}-${f.route.replace(/\s/g, '')}-${index}`,
      date: flightDate,
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
    };
  });
}

/**
 * Normalize route format to "XXX-YYY"
 */
function normalizeRoute(route: string): string {
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
  
  const getMonth = (date: string): MilesRecord => {
    const month = extractMonth(date);
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
  
  // Process flight miles
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

/**
 * Extract bonus XP by month from non-flight activities
 */
export function extractBonusXpByMonth(
  rawActivities: AIRawMilesActivity[]
): Record<string, number> {
  const bonusXp: Record<string, number> = {};
  
  for (const activity of rawActivities) {
    if (activity.xp > 0) {
      const month = extractMonth(activity.date);
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
  const xpResetEvents = statusEvents
    .filter(e => e.type === 'xp_reset')
    .map(e => ({ ...e, date: parseToISODate(e.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const xpSurplusEvents = statusEvents
    .filter(e => e.type === 'xp_surplus')
    .map(e => ({ ...e, date: parseToISODate(e.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  
  if (xpResetEvents.length === 0) {
    return null;
  }
  
  const latestReset = xpResetEvents[0];
  
  const correspondingSurplus = xpSurplusEvents.find(
    e => e.date === latestReset.date
  );
  
  const requalDate = new Date(latestReset.date);
  if (isNaN(requalDate.getTime())) {
    console.warn('[Converter] Invalid requalification date:', latestReset.date);
    return null;
  }
  
  // Calculate the NEXT month after qualification date
  // Flying Blue rule: official cycle starts on 1st of the NEXT month
  const requalYear = requalDate.getFullYear();
  const requalMonth = requalDate.getMonth(); // 0-indexed (Oct = 9)
  
  // Calculate next month (handle December -> January rollover)
  let nextYear = requalYear;
  let nextMonth = requalMonth + 1; // +1 to get next month
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  nextMonth++; // Convert from 0-indexed to 1-indexed for string
  
  const cycleStartMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  
  console.log('[Converter] Cycle start calculation:', {
    qualificationDate: latestReset.date,
    requalYear,
    requalMonth: requalMonth + 1, // Show 1-indexed for readability
    cycleStartMonth,
  });
  
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
// PDF HEADER CREATION (Preview only, not stored)
// ============================================================================

export interface PdfHeader {
  xp: number;
  uxp: number;
  miles: number;
  status: StatusLevel;
  exportDate: string;
  memberName: string | null;
  memberNumber: string | null;
}

/**
 * Create PdfHeader from AI response (for preview display only)
 */
export function createPdfHeader(
  rawResponse: AIRawResponse
): PdfHeader {
  let status: StatusLevel = rawResponse.header.currentStatus;
  if (status === 'Ultimate') {
    status = 'Platinum';
  }
  
  return {
    xp: rawResponse.header.totalXp,
    uxp: rawResponse.header.totalUxp,
    miles: rawResponse.header.totalMiles,
    status,
    exportDate: parseToISODate(rawResponse.header.exportDate),
    memberName: rawResponse.header.memberName,
    memberNumber: rawResponse.header.memberNumber,
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
    // Check for fallback dates
    if (flight.date === '1970-01-01') {
      warnings.push(`Flight has fallback date (parsing failed): ${flight.route}`);
    }
  }
  
  // Check miles records have valid months
  for (const record of milesRecords) {
    if (!record.month.match(/^\d{4}-\d{2}$/)) {
      warnings.push(`Invalid miles month format: ${record.month}`);
    }
  }
  
  // Check totals
  const totalFlightXP = flights.reduce((sum, f) => sum + (f.earnedXP ?? 0) + (f.safXp ?? 0), 0);
  const totalBonusXP = Object.values(bonusXpByMonth).reduce((sum, xp) => sum + xp, 0);
  const totalCalculatedXP = totalFlightXP + totalBonusXP;
  
  const xpDifference = Math.abs(pdfHeader.xp - totalCalculatedXP);
  if (xpDifference > 500) {
    warnings.push(`Large XP discrepancy: PDF shows ${pdfHeader.xp}, calculated ${totalCalculatedXP}`);
  }
  
  return {
    isValid: warnings.filter(w => !w.includes('fallback')).length === 0,
    warnings,
  };
}
