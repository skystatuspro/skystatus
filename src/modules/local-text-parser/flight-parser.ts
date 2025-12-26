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
 * Parse flight segments from a single transaction block
 */
function parseFlightSegments(block: ClassifiedTransaction): ParsedFlightSegment[] {
  const segments: ParsedFlightSegment[] = [];
  const lines = block.text.split('\n');
  
  // Track SAF bonus to apply to the right segment
  let pendingSaf: { miles: number; xp: number; uxp: number } | null = null;
  let lastSegmentIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for SAF bonus line
    const safBonus = extractSafBonus(line);
    if (safBonus) {
      pendingSaf = safBonus;
      // SAF applies to the previous segment
      if (lastSegmentIndex >= 0 && segments[lastSegmentIndex]) {
        segments[lastSegmentIndex].safMiles = safBonus.miles;
        segments[lastSegmentIndex].safXp = safBonus.xp;
        segments[lastSegmentIndex].safUxp = safBonus.uxp;
      }
      continue;
    }
    
    // Check for regular flight segment
    FLIGHT_SEGMENT_PATTERN.lastIndex = 0;
    let match = FLIGHT_SEGMENT_PATTERN.exec(line);
    
    if (match) {
      const origin = match[1].toUpperCase();
      const destination = match[2].toUpperCase();
      const flightNumber = match[3].toUpperCase();
      const airline = extractAirlineCode(flightNumber);
      
      // Extract miles/XP from this line or next lines
      const { miles, xp, uxp } = extractMilesXp(line);
      
      // Get activity date (from this line or nearby)
      let flightDate = parseActivityDate(line);
      
      // If no date on this line, check the next line
      if (!flightDate && i + 1 < lines.length) {
        flightDate = parseActivityDate(lines[i + 1]);
      }
      
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
        isRevenue: miles > 0,  // Negative miles = award flight
      });
      
      lastSegmentIndex = segments.length - 1;
      continue;
    }
    
    // Check for Transavia segment (different format)
    TRANSAVIA_SEGMENT_PATTERN.lastIndex = 0;
    match = TRANSAVIA_SEGMENT_PATTERN.exec(line);
    
    if (match) {
      const origin = match[1].toUpperCase();
      const destination = match[2].toUpperCase();
      
      const { miles, xp, uxp } = extractMilesXp(line);
      
      let flightDate = parseActivityDate(line);
      if (!flightDate && i + 1 < lines.length) {
        flightDate = parseActivityDate(lines[i + 1]);
      }
      if (!flightDate) {
        flightDate = block.activityDate || block.postingDate;
      }
      
      segments.push({
        origin,
        destination,
        flightNumber: null,  // Transavia doesn't show flight number in this format
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
    flightNumber: segment.flightNumber || `${segment.airline}0000`,
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
