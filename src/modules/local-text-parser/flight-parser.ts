// src/modules/local-text-parser/flight-parser.ts
// Parse flight transactions from classified blocks
// CRITICAL: Flights must be 100% accurate for XP/UXP calculations

import type { ClassifiedTransaction, ParsedFlightSegment } from './types';
import type { AIRawFlight } from '../ai-pdf-parser/types';
import {
  FLIGHT_SEGMENT_PATTERN,
  TRANSAVIA_SEGMENT_PATTERN,
  SAF_PATTERN,
  MILES_XP_SINGLE,
  ACTIVITY_DATE_PATTERN,
  ALL_MONTHS,
} from './patterns';
import { parseDateToISO } from './header-parser';

/**
 * Airlines that generate UXP (Ultimate XP)
 * Only KLM and Air France flights count toward Ultimate status
 */
const UXP_AIRLINES = ['KL', 'AF'];

/**
 * Airline code to name mapping (for common codes)
 */
const AIRLINE_CODES: Record<string, string> = {
  'KL': 'KLM',
  'AF': 'Air France',
  'DL': 'Delta',
  'SK': 'SAS',
  'KE': 'Korean Air',
  'MU': 'China Eastern',
  'SU': 'Aeroflot',
  'AM': 'Aeromexico',
  'UX': 'Air Europa',
  'CI': 'China Airlines',
  'CZ': 'China Southern',
  'GA': 'Garuda Indonesia',
  'MF': 'Xiamen Airlines',
  'OK': 'Czech Airlines',
  'RO': 'TAROM',
  'VN': 'Vietnam Airlines',
  'VS': 'Virgin Atlantic',
  'HV': 'Transavia',
  'TO': 'Transavia France',
};

/**
 * Extract airline code from flight number
 */
function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z]{2})/);
  return match ? match[1] : 'XX';
}

/**
 * Check if airline generates UXP
 */
function generatesUxp(airlineCode: string): boolean {
  return UXP_AIRLINES.includes(airlineCode.toUpperCase());
}

/**
 * Parse date from "op XX XXX XXXX" pattern
 */
function parseActivityDate(text: string): string | null {
  ACTIVITY_DATE_PATTERN.lastIndex = 0;
  const match = ACTIVITY_DATE_PATTERN.exec(text);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    const year = match[3];
    const month = ALL_MONTHS[monthName];
    
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

/**
 * Extract miles, XP, UXP from a text segment
 */
function extractMilesXp(text: string): { miles: number; xp: number; uxp: number } {
  const match = text.match(MILES_XP_SINGLE);
  
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
      uxp: parseInt(match[3], 10) || 0,
    };
  }
  
  return { miles: 0, xp: 0, uxp: 0 };
}

/**
 * Extract SAF (Sustainable Aviation Fuel) bonus from text
 */
function extractSafBonus(text: string): { miles: number; xp: number; uxp: number } | null {
  SAF_PATTERN.lastIndex = 0;
  const match = SAF_PATTERN.exec(text);
  
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
      uxp: parseInt(match[3], 10) || 0,
    };
  }
  
  return null;
}

/**
 * Look ahead for miles/XP values in following lines
 * The PDF often has flight info on one line and miles/XP on the next
 */
function findMilesXpInContext(lines: string[], startIndex: number, maxLook: number = 3): { miles: number; xp: number; uxp: number } {
  // First check the current line
  const currentResult = extractMilesXp(lines[startIndex]);
  if (currentResult.miles !== 0 || currentResult.xp !== 0) {
    return currentResult;
  }
  
  // Look ahead in following lines (skip SAF lines)
  for (let i = startIndex + 1; i < Math.min(lines.length, startIndex + maxLook + 1); i++) {
    const line = lines[i];
    
    // Skip SAF lines - they'll be handled separately
    if (/Sustainable\s+Aviation\s+Fuel/i.test(line)) {
      continue;
    }
    
    // Skip if this line starts a new flight segment
    if (/[A-Z]{3}\s*[-–—]\s*[A-Z]{3}\s+[A-Z]{2}\d/.test(line)) {
      break;
    }
    
    // Skip if this is another activity date line
    if (/^op\s+\d/i.test(line.trim())) {
      continue;
    }
    
    const result = extractMilesXp(line);
    if (result.miles !== 0 || result.xp !== 0) {
      return result;
    }
  }
  
  return { miles: 0, xp: 0, uxp: 0 };
}

/**
 * Find activity date in context (current line + following lines)
 */
function findActivityDateInContext(lines: string[], startIndex: number, maxLook: number = 3): string | null {
  // Check current line first
  let date = parseActivityDate(lines[startIndex]);
  if (date) return date;
  
  // Look ahead
  for (let i = startIndex + 1; i < Math.min(lines.length, startIndex + maxLook + 1); i++) {
    // Stop if we hit a new flight segment
    if (/[A-Z]{3}\s*[-–—]\s*[A-Z]{3}\s+[A-Z]{2}\d/.test(lines[i])) {
      break;
    }
    
    date = parseActivityDate(lines[i]);
    if (date) return date;
  }
  
  return null;
}

/**
 * Parse flight segments from a single transaction block
 */
function parseFlightSegments(block: ClassifiedTransaction): ParsedFlightSegment[] {
  const segments: ParsedFlightSegment[] = [];
  const lines = block.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Track which lines we've processed as SAF
  const safProcessed = new Set<number>();
  
  // First pass: identify all SAF lines
  for (let i = 0; i < lines.length; i++) {
    if (/Sustainable\s+Aviation\s+Fuel/i.test(lines[i])) {
      safProcessed.add(i);
    }
  }
  
  let lastSegmentIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip already processed SAF lines
    if (safProcessed.has(i)) {
      // Apply SAF to previous segment
      const safBonus = extractSafBonus(line);
      if (safBonus && lastSegmentIndex >= 0 && segments[lastSegmentIndex]) {
        // Add to existing SAF values (there can be multiple SAF lines)
        segments[lastSegmentIndex].safMiles += safBonus.miles;
        segments[lastSegmentIndex].safXp += safBonus.xp;
        segments[lastSegmentIndex].safUxp += safBonus.uxp;
      }
      continue;
    }
    
    // Check for regular flight segment: "AMS - BER KL1775"
    FLIGHT_SEGMENT_PATTERN.lastIndex = 0;
    let match = FLIGHT_SEGMENT_PATTERN.exec(line);
    
    if (match) {
      const origin = match[1].toUpperCase();
      const destination = match[2].toUpperCase();
      const flightNumber = match[3].toUpperCase();
      const airline = extractAirlineCode(flightNumber);
      
      // Look ahead for miles/XP (often on next line)
      const { miles, xp, uxp } = findMilesXpInContext(lines, i);
      
      // Get activity date from context
      let flightDate = findActivityDateInContext(lines, i);
      
      // Fallback to posting date
      if (!flightDate) {
        flightDate = block.activityDate || block.postingDate;
      }
      
      // Determine if UXP should be included
      const hasUxp = generatesUxp(airline);
      
      segments.push({
        origin,
        destination,
        flightNumber,
        airline,
        date: flightDate,
        miles,
        xp,
        uxp: hasUxp ? uxp : 0,
        safMiles: 0,
        safXp: 0,
        safUxp: 0,
        cabin: 'Unknown',
        isRevenue: miles >= 0,  // Negative miles = award flight
      });
      
      lastSegmentIndex = segments.length - 1;
      continue;
    }
    
    // Check for Transavia segment: "KEF – AMS TRANSAVIA HOLLAND"
    TRANSAVIA_SEGMENT_PATTERN.lastIndex = 0;
    match = TRANSAVIA_SEGMENT_PATTERN.exec(line);
    
    if (match) {
      const origin = match[1].toUpperCase();
      const destination = match[2].toUpperCase();
      
      // Look ahead for miles/XP
      const { miles, xp, uxp } = findMilesXpInContext(lines, i);
      
      let flightDate = findActivityDateInContext(lines, i);
      if (!flightDate) {
        flightDate = block.activityDate || block.postingDate;
      }
      
      segments.push({
        origin,
        destination,
        flightNumber: '',  // CRITICAL: Transavia must have empty string, not null or HV0000
        airline: 'HV',  // Transavia Holland
        date: flightDate,
        miles,
        xp,
        uxp: 0,  // Transavia doesn't generate UXP
        safMiles: 0,
        safXp: 0,
        safUxp: 0,
        cabin: 'Economy',
        isRevenue: true,
      });
      
      lastSegmentIndex = segments.length - 1;
    }
  }
  
  return segments;
}

/**
 * Convert ParsedFlightSegment to AIRawFlight format
 */
function segmentToRawFlight(
  segment: ParsedFlightSegment,
  tripTitle: string,
  postingDate: string
): AIRawFlight {
  return {
    postingDate,
    tripTitle,
    route: `${segment.origin} - ${segment.destination}`,
    // CRITICAL: Transavia (HV) must have empty flightNumber, not HV0000
    flightNumber: segment.flightNumber ?? (segment.airline === 'HV' ? '' : `${segment.airline}0000`),
    airline: segment.airline || 'XX',
    flightDate: segment.date,
    miles: segment.miles,
    xp: segment.xp,
    uxp: segment.uxp,
    safMiles: segment.safMiles,
    safXp: segment.safXp,
    cabin: segment.cabin,
    isRevenue: segment.isRevenue,
  };
}

/**
 * Extract trip title from transaction block
 */
function extractTripTitle(text: string): string {
  // Dutch: "Mijn reis naar Berlin"
  const nlMatch = text.match(/Mijn\s+reis\s+naar\s+([^\d]+?)(?:\s+\d|\s*$)/i);
  if (nlMatch) return `Mijn reis naar ${nlMatch[1].trim()}`;
  
  // English: "My trip to Berlin"
  const enMatch = text.match(/My\s+trip\s+to\s+([^\d]+?)(?:\s+\d|\s*$)/i);
  if (enMatch) return `My trip to ${enMatch[1].trim()}`;
  
  // French: "Mon voyage à Berlin"
  const frMatch = text.match(/Mon\s+voyage\s+[àa]\s+([^\d]+?)(?:\s+\d|\s*$)/i);
  if (frMatch) return `Mon voyage à ${frMatch[1].trim()}`;
  
  // Fallback: use first line
  const firstLine = text.split('\n')[0];
  const dateMatch = firstLine.match(/^\d{1,2}\s+[a-z]+\s+\d{4}\s+(.+?)\s+\d+\s*Miles/i);
  if (dateMatch) return dateMatch[1].trim();
  
  return 'Flight';
}

/**
 * Parse all flight transactions and return AIRawFlight array
 */
export function parseFlightTransactions(flightBlocks: ClassifiedTransaction[]): AIRawFlight[] {
  const flights: AIRawFlight[] = [];
  
  for (const block of flightBlocks) {
    const segments = parseFlightSegments(block);
    const tripTitle = extractTripTitle(block.text);
    
    // Check if this is an award/redemption flight
    const isAward = block.type === 'FLIGHT_AWARD' || block.text.includes('-') && /^-\d+\s*Miles/m.test(block.text);
    
    for (const segment of segments) {
      // For award flights, ensure isRevenue is false
      if (isAward) {
        segment.isRevenue = false;
      }
      
      flights.push(segmentToRawFlight(segment, tripTitle, block.postingDate));
    }
  }
  
  return flights;
}

/**
 * Debug helper: log flight parsing details
 */
export function debugFlightParsing(block: ClassifiedTransaction): void {
  console.log('[FlightParser] Block type:', block.type);
  console.log('[FlightParser] Block text:', block.text.slice(0, 200));
  
  const segments = parseFlightSegments(block);
  console.log('[FlightParser] Segments found:', segments.length);
  
  for (const seg of segments) {
    console.log('[FlightParser] Segment:', {
      route: `${seg.origin}-${seg.destination}`,
      flight: seg.flightNumber,
      airline: seg.airline,
      date: seg.date,
      miles: seg.miles,
      xp: seg.xp,
      uxp: seg.uxp,
      saf: { miles: seg.safMiles, xp: seg.safXp },
    });
  }
}
