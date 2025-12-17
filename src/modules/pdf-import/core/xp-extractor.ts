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
 * XP Extractor
 * 
 * Extracts XP information from tokenized PDF lines.
 * Handles all XP sources: flights, SAF bonus, credit cards, hotels, promos.
 * Also tracks UXP (Ultimate XP) for Ultimate status progression.
 * 
 * @module core/xp-extractor
 */

import type { SupportedLanguage, ParsedFlight } from '../types';
import { parseDate } from '../utils/date-parser';

/**
 * XP source types
 */
export type XPSourceType = 
  | 'flight'
  | 'saf'
  | 'creditCard'
  | 'hotel'
  | 'firstFlight'
  | 'promo'
  | 'other';

/**
 * Individual XP entry extracted from PDF
 */
export interface ExtractedXP {
  /** Month in YYYY-MM format */
  month: string;
  /** Date if specific (YYYY-MM-DD) */
  date?: string;
  /** Source of this XP */
  source: XPSourceType;
  /** XP amount */
  amount: number;
  /** UXP amount (for Ultimate tracking) */
  uxpAmount: number;
  /** Description from PDF */
  description: string;
}

/**
 * Result of XP extraction
 */
export interface XPExtractionResult {
  /** All extracted XP entries */
  entries: ExtractedXP[];
  /** Total XP from flights */
  fromFlights: number;
  /** Total XP from SAF bonus */
  fromSaf: number;
  /** Total XP from bonuses (first flight, hotel, etc.) */
  fromBonus: number;
  /** Total UXP detected */
  totalUXP: number;
  /** Bonus XP grouped by month */
  bonusXpByMonth: Record<string, number>;
}

/**
 * Patterns for detecting XP sources
 */
export const XP_SOURCE_PATTERNS: Record<XPSourceType, RegExp> = {
  flight: /gespaarde\s+xp|earned\s+xp|vlucht\s+xp|flight\s+xp/i,
  saf: /Sustainable\s+Aviation\s+Fuel|SAF|duurzaam/i,
  creditCard: /credit\s*card|creditcard|amex|american\s+express|mastercard|visa|kaart|carte/i,
  hotel: /hotel|accor|ALL-|booking\.com|marriott|hilton|accommodation/i,
  firstFlight: /first\s+flight|eerste\s+vlucht|premier\s+vol|welcome|bienvenue|welkom/i,
  promo: /promo|promotion|bonus|offer|offre|aanbieding|campaign/i,
  other: /.*/,
};

/**
 * UXP detection patterns
 */
const UXP_PATTERN = /(\d+)\s*UXP/i;

/**
 * Extract XP and UXP from text
 */
function extractXPNumbers(text: string): { xp: number; uxp: number } {
  let xp = 0, uxp = 0;
  
  // Match UXP first
  const uxpMatch = text.match(UXP_PATTERN);
  if (uxpMatch) {
    uxp = parseInt(uxpMatch[1], 10);
  }
  
  // Match XP (but not UXP)
  const xpMatch = text.match(/(\d+)\s*XP(?!\s*U)/i);
  if (xpMatch) {
    xp = parseInt(xpMatch[1], 10);
  } else {
    // Fallback
    const fallback = text.match(/(\d+)\s*XP/i);
    if (fallback) {
      xp = parseInt(fallback[1], 10);
    }
  }
  
  return { xp, uxp };
}

/**
 * Extract XP data from raw text lines and flights
 * 
 * @param lines - Raw text lines from PDF
 * @param flights - Already extracted flights (for XP totals)
 * @param language - Detected PDF language
 * @returns XP extraction result with totals and breakdown
 */
export function extractXP(
  lines: string[],
  flights: ParsedFlight[],
  language: SupportedLanguage
): XPExtractionResult {
  const entries: ExtractedXP[] = [];
  const bonusXpByMonth: Record<string, number> = {};
  
  let fromFlights = 0;
  let fromSaf = 0;
  let fromBonus = 0;
  let totalUXP = 0;
  
  // Calculate XP from flights
  for (const flight of flights) {
    fromFlights += flight.earnedXP;
    fromSaf += flight.safXP;
    totalUXP += flight.uxp;
    
    entries.push({
      month: flight.date.substring(0, 7),
      date: flight.date,
      source: 'flight',
      amount: flight.earnedXP,
      uxpAmount: flight.uxp,
      description: `Flight ${flight.flightNumber} ${flight.route}`,
    });
    
    if (flight.safXP > 0) {
      entries.push({
        month: flight.date.substring(0, 7),
        date: flight.date,
        source: 'saf',
        amount: flight.safXP,
        uxpAmount: 0,
        description: `SAF bonus for ${flight.flightNumber}`,
      });
    }
  }
  
  // Scan lines for bonus XP (non-flight XP)
  for (const line of lines) {
    // Skip lines that are clearly flight-related
    if (/^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/.test(line)) continue;
    if (/Mijn\s+reis|My\s+trip|Mon\s+voyage/i.test(line)) continue;
    
    // Extract date if present
    let transDate: string | null = null;
    let content = line;
    
    const words = line.split(/\s+/);
    for (let n = 2; n <= Math.min(5, words.length - 1); n++) {
      const potentialDate = words.slice(0, n).join(' ');
      const parsed = parseDate(potentialDate);
      if (parsed) {
        transDate = parsed.full;
        content = words.slice(n).join(' ');
        break;
      }
    }
    
    // Check for XP in this line
    const { xp, uxp } = extractXPNumbers(content);
    
    if (xp > 0) {
      const source = detectXPSource(content, language);
      
      // Skip flight XP (already counted)
      if (source === 'flight') continue;
      
      const month = transDate ? transDate.substring(0, 7) : 'unknown';
      
      entries.push({
        month,
        date: transDate || undefined,
        source,
        amount: xp,
        uxpAmount: uxp,
        description: content.substring(0, 100),
      });
      
      // Track bonus XP by month
      if (month !== 'unknown') {
        bonusXpByMonth[month] = (bonusXpByMonth[month] || 0) + xp;
      }
      
      fromBonus += xp;
      totalUXP += uxp;
    }
  }
  
  return {
    entries,
    fromFlights,
    fromSaf,
    fromBonus,
    totalUXP,
    bonusXpByMonth,
  };
}

/**
 * Detect the source of an XP transaction
 */
export function detectXPSource(
  description: string,
  _language: SupportedLanguage
): XPSourceType {
  // Check patterns in order of specificity
  if (XP_SOURCE_PATTERNS.saf.test(description)) return 'saf';
  if (XP_SOURCE_PATTERNS.firstFlight.test(description)) return 'firstFlight';
  if (XP_SOURCE_PATTERNS.hotel.test(description)) return 'hotel';
  if (XP_SOURCE_PATTERNS.creditCard.test(description)) return 'creditCard';
  if (XP_SOURCE_PATTERNS.promo.test(description)) return 'promo';
  if (XP_SOURCE_PATTERNS.flight.test(description)) return 'flight';
  
  return 'other';
}

/**
 * Check if a line mentions UXP
 */
export function hasUXP(line: string): boolean {
  return UXP_PATTERN.test(line);
}

/**
 * Parse XP amount from text
 */
export function parseXPAmount(text: string): number | null {
  const { xp } = extractXPNumbers(text);
  return xp > 0 ? xp : null;
}

/**
 * Calculate total XP from entries
 */
export function calculateTotalXP(entries: ExtractedXP[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Group XP entries by source
 */
export function groupXPBySource(entries: ExtractedXP[]): Record<XPSourceType, number> {
  const result: Record<XPSourceType, number> = {
    flight: 0,
    saf: 0,
    creditCard: 0,
    hotel: 0,
    firstFlight: 0,
    promo: 0,
    other: 0,
  };
  
  for (const entry of entries) {
    result[entry.source] += entry.amount;
  }
  
  return result;
}

/**
 * Group XP entries by month
 */
export function groupXPByMonth(entries: ExtractedXP[]): Record<string, number> {
  const result: Record<string, number> = {};
  
  for (const entry of entries) {
    result[entry.month] = (result[entry.month] || 0) + entry.amount;
  }
  
  return result;
}
