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
 * Flight Extractor
 * 
 * Extracts flight information from tokenized PDF lines.
 * Handles multiple airlines, partner flights, and various date formats.
 * 
 * @module core/flight-extractor
 */

import type { ParsedFlight, SupportedLanguage, CabinClass } from '../types';
import type { TokenizedLine } from './tokenizer';
import { parseDate } from '../utils/date-parser';
import { looksLikeNewTransaction } from './tokenizer';

/**
 * Supported airline codes with names
 */
export const AIRLINE_CODES: Record<string, string> = {
  // Air France - KLM Group
  'AF': 'Air France',
  'KL': 'KLM',
  'HV': 'Transavia',
  'TO': 'Transavia France',
  
  // SkyTeam Partners
  'DL': 'Delta',
  'KE': 'Korean Air',
  'MU': 'China Eastern',
  'SU': 'Aeroflot',
  'AM': 'Aeromexico',
  'AR': 'Aerolíneas Argentinas',
  'CI': 'China Airlines',
  'CZ': 'China Southern',
  'GA': 'Garuda Indonesia',
  'KQ': 'Kenya Airways',
  'ME': 'Middle East Airlines',
  'OK': 'Czech Airlines',
  'RO': 'TAROM',
  'SV': 'Saudia',
  'UX': 'Air Europa',
  'VN': 'Vietnam Airlines',
  'VS': 'Virgin Atlantic',
  'WS': 'WestJet',
  'SK': 'SAS',
  
  // Other partners
  'G3': 'GOL',
  'MH': 'Malaysia Airlines',
  'XN': 'Xpressair',
};

/**
 * Trip header patterns in different languages
 */
const TRIP_PATTERNS: Record<SupportedLanguage, RegExp> = {
  en: /My\s+trip\s+to/i,
  nl: /Mijn\s+reis\s+naar/i,
  fr: /Mon\s+voyage/i,
  de: /Meine\s+Reise/i,
  es: /Mi\s+viaje/i,
  pt: /Minha\s+viagem/i,
  it: /Mio\s+viaggio/i,
};

/**
 * Revenue flight patterns (paid with money)
 */
const REVENUE_PATTERNS = /bestede|spent|dépensés|ausgegeben|gastado|gasto|speso/i;

/**
 * SAF (Sustainable Aviation Fuel) patterns
 */
const SAF_PATTERN = /Sustainable\s+Aviation\s+Fuel/i;

/**
 * Flight date prefix patterns
 */
const DATE_PREFIX_PATTERN = /^(?:op|on|le|am)\s+(.+)/i;

/**
 * Extract miles, XP, UXP from text
 */
function extractNumbers(text: string): { miles: number; xp: number; uxp: number } {
  let miles = 0, xp = 0, uxp = 0;
  
  // Match miles (can be negative)
  const milesMatch = text.match(/(-?\d[\d\s.,]*)\s*Miles/i);
  if (milesMatch) {
    miles = parseInt(milesMatch[1].replace(/[\s.,]/g, ''), 10);
  }
  
  // Match UXP first (to avoid capturing it as XP)
  const uxpMatch = text.match(/(\d+)\s*UXP/i);
  if (uxpMatch) {
    uxp = parseInt(uxpMatch[1], 10);
  }
  
  // Match XP (but not UXP)
  const xpMatch = text.match(/(\d+)\s*XP(?!\s*U)/i);
  if (xpMatch) {
    xp = parseInt(xpMatch[1], 10);
  } else {
    // Fallback: try to find XP before UXP
    const xpFallback = text.match(/(\d+)\s*XP/i);
    if (xpFallback) {
      xp = parseInt(xpFallback[1], 10);
    }
  }
  
  return { miles, xp, uxp };
}

/**
 * Generate unique ID for a flight
 */
function generateFlightId(date: string, route: string, flightNumber: string): string {
  return `flight-${date}-${route}-${flightNumber}-${Date.now()}`;
}

/**
 * Extract flights from raw text lines
 * 
 * @param lines - Raw text lines from the PDF
 * @param language - Detected PDF language
 * @returns Array of parsed flights
 */
export function extractFlights(
  lines: string[],
  language: SupportedLanguage
): ParsedFlight[] {
  const flights: ParsedFlight[] = [];
  const tripPattern = TRIP_PATTERNS[language] || TRIP_PATTERNS.en;
  
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Try to extract date from line
    let transDate: string | null = null;
    let content: string = '';
    
    // Try progressively longer prefixes to find a valid date
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
    
    if (transDate && content && tripPattern.test(content)) {
      // Found a trip - extract segments
      const tripFlights = extractTripSegments(lines, i, transDate, language);
      flights.push(...tripFlights);
      
      // Skip ahead past the trip
      i = findNextTransaction(lines, i + 1);
      continue;
    }
    
    i++;
  }
  
  // Sort flights by date (newest first)
  flights.sort((a, b) => b.date.localeCompare(a.date));
  
  return flights;
}

/**
 * Extract flight segments from a trip
 */
function extractTripSegments(
  lines: string[],
  startIndex: number,
  tripDate: string,
  language: SupportedLanguage
): ParsedFlight[] {
  const segments: ParsedFlight[] = [];
  let tripSafXp = 0;
  let tripSafMiles = 0;
  
  let j = startIndex + 1;
  
  while (j < lines.length) {
    const subline = lines[j];
    
    // SAF entry
    if (SAF_PATTERN.test(subline)) {
      const { miles, xp } = extractNumbers(subline);
      tripSafXp += xp;
      tripSafMiles += miles;
      j++;
      continue;
    }
    
    // New transaction = end of trip
    if (looksLikeNewTransaction(subline) && 
        !/Sustainable|gespaarde|reisafstand|^op\s|^on\s|^le\s/i.test(subline)) {
      // Check if it's a new trip or other transaction type
      const anyTripPattern = /Mijn\s+reis|My\s+trip|Mon\s+voyage|Meine\s+Reise|Mi\s+viaje|Minha\s+viagem|Mio\s+viaggio/i;
      if (anyTripPattern.test(subline) || /Hotel|Subscribe|Winkelen|Shopping|Miles\s+(earn|overdragen)/i.test(subline)) {
        break;
      }
    }
    
    // Flight segment pattern 1: "AMS - BER KL1775"
    const segMatch = subline.match(/^([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z]{2}\d{2,5})\s+(.+)$/);
    if (segMatch) {
      const segment = parseFlightSegment(segMatch, lines, j, tripDate, true);
      if (segment) {
        segments.push(segment);
      }
      j++;
      continue;
    }
    
    // Flight segment pattern 2: "KEF – AMS TRANSAVIA HOLLAND" (partner without flight number)
    const partnerMatch = subline.match(/^([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z][A-Za-z\s]+?)(?:\s*[-–])?\s*(?:gespaarde|earned|Miles|acquis|gesammelt)/i);
    if (partnerMatch) {
      const segment = parsePartnerSegment(partnerMatch, lines, j, tripDate);
      if (segment) {
        segments.push(segment);
      }
      j++;
      continue;
    }
    
    j++;
  }
  
  // Distribute SAF to first segment
  if (segments.length > 0 && (tripSafXp > 0 || tripSafMiles > 0)) {
    segments[0].safXP = tripSafXp;
  }
  
  return segments;
}

/**
 * Parse a standard flight segment
 */
function parseFlightSegment(
  match: RegExpMatchArray,
  lines: string[],
  index: number,
  defaultDate: string,
  isRevenueFlight: boolean
): ParsedFlight | null {
  const [, origin, dest, flightNum, rest] = match;
  
  // Extract numbers from this line
  let { miles, xp, uxp } = extractNumbers(rest);
  
  // If no miles found, look ahead
  if (miles === 0) {
    for (let k = index + 1; k < Math.min(index + 5, lines.length); k++) {
      const lookAhead = lines[k];
      // Stop if we hit a new segment or transaction
      if (/^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/.test(lookAhead) || 
          (looksLikeNewTransaction(lookAhead) && !/^op\s|^on\s|Sustainable/i.test(lookAhead))) {
        break;
      }
      const extracted = extractNumbers(lookAhead);
      if (extracted.miles > 0 || extracted.xp > 0) {
        miles = extracted.miles;
        xp = extracted.xp;
        uxp = extracted.uxp;
        break;
      }
    }
  }
  
  const airlineCode = flightNum.substring(0, 2);
  const isRevenue = REVENUE_PATTERNS.test(rest);
  
  // Look for actual flight date
  let flightDate = defaultDate;
  for (let k = index + 1; k < Math.min(index + 5, lines.length); k++) {
    const line = lines[k];
    const opMatch = line.match(DATE_PREFIX_PATTERN);
    if (opMatch) {
      const parsed = parseDate(opMatch[1]);
      if (parsed) {
        flightDate = parsed.full;
        break;
      }
    }
  }
  
  return {
    id: generateFlightId(flightDate, `${origin}-${dest}`, flightNum),
    date: flightDate,
    flightNumber: flightNum,
    route: `${origin}-${dest}`,
    airline: airlineCode,
    isPartnerFlight: isPartnerFlight(airlineCode),
    earnedXP: xp,
    earnedMiles: miles,
    safXP: 0,
    uxp: uxp,
    status: 'new',
  };
}

/**
 * Parse a partner flight segment (without flight number)
 */
function parsePartnerSegment(
  match: RegExpMatchArray,
  lines: string[],
  index: number,
  defaultDate: string
): ParsedFlight | null {
  const [, origin, dest, airlineName] = match;
  
  // Generate a pseudo flight number from airline name
  const airlineClean = airlineName.trim().toUpperCase();
  let airline = 'XX';
  if (airlineClean.includes('TRANSAVIA')) airline = 'HV';
  else if (airlineClean.includes('DELTA')) airline = 'DL';
  else if (airlineClean.includes('SAS')) airline = 'SK';
  else if (airlineClean.includes('KOREAN')) airline = 'KE';
  else airline = airlineClean.substring(0, 2);
  
  const pseudoFlightNum = `${airline}0000`;
  
  // Extract numbers
  let { miles, xp, uxp } = extractNumbers(lines[index]);
  if (miles === 0) {
    for (let k = index + 1; k < Math.min(index + 5, lines.length); k++) {
      const lookAhead = lines[k];
      if (/^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/.test(lookAhead)) break;
      const extracted = extractNumbers(lookAhead);
      if (extracted.miles > 0 || extracted.xp > 0) {
        miles = extracted.miles;
        xp = extracted.xp;
        uxp = extracted.uxp;
        break;
      }
    }
  }
  
  // Look for flight date
  let flightDate = defaultDate;
  for (let k = index + 1; k < Math.min(index + 5, lines.length); k++) {
    const line = lines[k];
    const opMatch = line.match(DATE_PREFIX_PATTERN);
    if (opMatch) {
      const parsed = parseDate(opMatch[1]);
      if (parsed) {
        flightDate = parsed.full;
        break;
      }
    }
  }
  
  return {
    id: generateFlightId(flightDate, `${origin}-${dest}`, pseudoFlightNum),
    date: flightDate,
    flightNumber: pseudoFlightNum,
    route: `${origin}-${dest}`,
    airline: airline,
    isPartnerFlight: true,
    earnedXP: xp,
    earnedMiles: miles,
    safXP: 0,
    uxp: uxp,
    status: 'new',
  };
}

/**
 * Find the next transaction start in lines
 */
function findNextTransaction(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i++) {
    if (looksLikeNewTransaction(lines[i])) {
      return i;
    }
  }
  return lines.length;
}

/**
 * Parse a flight number from text
 * Returns airline code and flight number separately
 */
export function parseFlightNumber(text: string): { airline: string; number: string } | null {
  const match = text.match(/([A-Z]{2})\s*(\d{2,5})/i);
  if (match) {
    return { airline: match[1].toUpperCase(), number: match[2] };
  }
  return null;
}

/**
 * Parse a route from text
 * Returns origin and destination IATA codes
 */
export function parseRoute(text: string): { origin: string; destination: string } | null {
  const match = text.match(/([A-Z]{3})\s*[-–>]\s*([A-Z]{3})/i);
  if (match) {
    return { origin: match[1].toUpperCase(), destination: match[2].toUpperCase() };
  }
  return null;
}

/**
 * Determine if a flight is a partner flight (non AF/KL group)
 */
export function isPartnerFlight(airlineCode: string): boolean {
  return !['AF', 'KL', 'HV', 'TO'].includes(airlineCode.toUpperCase());
}

/**
 * Get airline name from code
 */
export function getAirlineName(code: string): string {
  return AIRLINE_CODES[code.toUpperCase()] || code;
}
