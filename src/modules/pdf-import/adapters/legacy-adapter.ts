/**
 * Legacy Adapter
 * 
 * Provides compatibility with the old parseFlyingBluePdf.ts interface.
 * This allows gradual migration without breaking existing code.
 * 
 * Usage in PdfImportModal.tsx:
 *   import { parseFlyingBlueTextCompat } from '../modules/pdf-import/adapters/legacy-adapter';
 *   const result = parseFlyingBlueTextCompat(text);
 */

import { tokenize, detectLanguage } from '../core/tokenizer';
import { extractFlights } from '../core/flight-extractor';
import { extractMiles } from '../core/miles-extractor';
import { extractXP } from '../core/xp-extractor';
import { detectStatus, findRequalifications } from '../core/status-detector';
import { extractBalances } from '../core/balance-extractor';
import type { FlightRecord, MilesRecord, StatusLevel } from '../types';

// =============================================================================
// LEGACY TYPES (matching old parseFlyingBluePdf.ts)
// =============================================================================

export interface LegacyParsedFlight {
  date: string;
  flightNumber: string;
  route: string;
  earnedMiles: number;
  earnedXP: number;
  safXp?: number;
  airline: string;
  cabinClass?: string;
  price?: number;
  currency?: string;
}

export interface LegacyParsedMilesMonth {
  month: string;
  earned: number;
  spent: number;
  expired: number;
  balance: number;
  breakdown: {
    flights: number;
    shopping: number;
    creditCard: number;
    partner: number;
    promo: number;
    other: number;
    miscXp?: number;
  };
}

export interface LegacyRequalificationEvent {
  date: string;
  oldStatus?: StatusLevel;
  newStatus?: StatusLevel;
}

export interface LegacyParseResult {
  flights: LegacyParsedFlight[];
  miles: LegacyParsedMilesMonth[];
  memberName: string | null;
  memberNumber: string | null;
  status: string | null;
  totalMiles: number | null;
  totalXP: number | null;
  totalUXP: number | null;
  errors: string[];
  oldestDate: string | null;
  newestDate: string | null;
  requalifications: LegacyRequalificationEvent[];
}

// =============================================================================
// ADAPTER FUNCTIONS
// =============================================================================

/**
 * Parse Flying Blue PDF text using the new module but return legacy format.
 * Drop-in replacement for parseFlyingBlueText from parseFlyingBluePdf.ts
 */
export function parseFlyingBlueTextCompat(text: string): LegacyParseResult {
  const errors: string[] = [];
  
  try {
    // Detect language
    const language = detectLanguage(text);
    
    // Tokenize
    const lines = tokenize(text, language);
    
    // Extract data using new extractors
    const flights = extractFlights(lines, language);
    const miles = extractMiles(lines, language);
    const xpResult = extractXP(lines, language);
    const status = detectStatus(lines, language);
    const balances = extractBalances(lines, language);
    const requalifications = findRequalifications(lines, language);
    
    // Convert flights to legacy format
    const legacyFlights: LegacyParsedFlight[] = flights.map(f => ({
      date: f.date,
      flightNumber: f.flightNumber,
      route: f.route,
      earnedMiles: f.earnedMiles,
      earnedXP: f.earnedXP,
      safXp: f.safXp,
      airline: f.airline,
      cabinClass: f.cabinClass,
      price: f.price,
      currency: f.currency,
    }));
    
    // Convert miles to legacy format
    const legacyMiles: LegacyParsedMilesMonth[] = miles.map(m => ({
      month: m.month,
      earned: m.sources.flightMiles + m.sources.bonusMiles + m.sources.partnerMiles + 
              m.sources.cardMiles + m.sources.promoMiles,
      spent: m.spent,
      expired: m.expired,
      balance: m.balance,
      breakdown: {
        flights: m.sources.flightMiles,
        shopping: m.sources.partnerMiles,
        creditCard: m.sources.cardMiles,
        partner: m.sources.partnerMiles,
        promo: m.sources.promoMiles,
        other: m.sources.bonusMiles,
        miscXp: 0, // Will be calculated from XP result
      },
    }));
    
    // Merge XP into miles breakdown if available
    if (xpResult) {
      for (const xpMonth of xpResult.byMonth) {
        const milesMonth = legacyMiles.find(m => m.month === xpMonth.month);
        if (milesMonth) {
          milesMonth.breakdown.miscXp = xpMonth.bonus;
        }
      }
    }
    
    // Convert requalifications
    const legacyRequalifications: LegacyRequalificationEvent[] = requalifications.map(r => ({
      date: r.date,
      newStatus: r.newStatus,
    }));
    
    // Calculate date range
    const allDates = legacyFlights.map(f => f.date).filter(d => d);
    const sortedDates = allDates.sort();
    
    return {
      flights: legacyFlights,
      miles: legacyMiles,
      memberName: balances.memberName || null,
      memberNumber: balances.memberNumber || null,
      status: status?.currentStatus || null,
      totalMiles: balances.miles ?? null,
      totalXP: status?.currentXP ?? balances.xp ?? null,
      totalUXP: status?.currentUXP ?? balances.uxp ?? null,
      errors,
      oldestDate: sortedDates.length > 0 ? sortedDates[0] : null,
      newestDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null,
      requalifications: legacyRequalifications,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
    errors.push(errorMessage);
    
    return {
      flights: [],
      miles: [],
      memberName: null,
      memberNumber: null,
      status: null,
      totalMiles: null,
      totalXP: null,
      totalUXP: null,
      errors,
      oldestDate: null,
      newestDate: null,
      requalifications: [],
    };
  }
}

/**
 * Convert legacy parsed flights to FlightRecord format.
 * Drop-in replacement for toFlightRecords from parseFlyingBluePdf.ts
 */
export function toFlightRecordsCompat(flights: LegacyParsedFlight[]): FlightRecord[] {
  return flights.map((flight, index) => ({
    id: `pdf-${flight.date}-${flight.flightNumber}-${index}`,
    date: flight.date,
    flightNumber: flight.flightNumber,
    route: flight.route,
    airline: flight.airline,
    earnedMiles: flight.earnedMiles,
    earnedXP: flight.earnedXP,
    safXp: flight.safXp || 0,
    cabinClass: (flight.cabinClass as 'economy' | 'premium_economy' | 'business' | 'first') || 'economy',
    price: flight.price,
    currency: flight.currency,
    source: 'pdf' as const,
  }));
}

/**
 * Convert legacy parsed miles to MilesRecord format.
 * Drop-in replacement for toMilesRecords from parseFlyingBluePdf.ts
 */
export function toMilesRecordsCompat(miles: LegacyParsedMilesMonth[]): MilesRecord[] {
  return miles.map(m => ({
    month: m.month,
    earned: m.earned,
    spent: m.spent,
    expired: m.expired,
    balance: m.balance,
    breakdown: m.breakdown,
  }));
}

/**
 * Extract bonus XP by month from miles data.
 * Drop-in replacement for extractBonusXp from parseFlyingBluePdf.ts
 */
export function extractBonusXpCompat(miles: LegacyParsedMilesMonth[]): Record<string, number> {
  const bonusXpByMonth: Record<string, number> = {};
  
  for (const m of miles) {
    if (m.breakdown.miscXp && m.breakdown.miscXp > 0) {
      bonusXpByMonth[m.month] = m.breakdown.miscXp;
    }
  }
  
  return bonusXpByMonth;
}
