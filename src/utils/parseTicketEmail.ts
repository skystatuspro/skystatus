// src/utils/parseTicketEmail.ts
// Parser for KLM/Air France e-ticket confirmation emails
// Extracts flight details, pricing, and booking information from pasted email text

import { CabinClass } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedTicketFlight {
  date: string;           // YYYY-MM-DD
  route: string;          // e.g., "AMS-JFK"
  origin: string;         // IATA code
  destination: string;    // IATA code
  flightNumber: string;   // e.g., "KL1775"
  airline: string;        // KL or AF
  cabin: CabinClass;
  bookingClass: string;   // e.g., "X", "J", "O"
  departureTime: string;  // HH:MM
  arrivalTime: string;    // HH:MM
}

export interface ParsedTicket {
  bookingCode: string;          // PNR/confirmation code
  ticketNumber?: string;
  passengerName: string;
  flights: ParsedTicketFlight[];
  isAward: boolean;             // Award ticket (miles redemption)
  pricing: {
    ticketPrice: number;        // Base fare (0 for awards)
    safContribution: number;    // SAF bijdrage
    totalPrice: number;         // Total paid
    revenueBase: number;        // Base for miles calculation (ticket + YR surcharge)
  };
  rawText: string;              // Original input for debugging
}

export interface TicketParseResult {
  success: boolean;
  ticket?: ParsedTicket;
  error?: string;
  warnings: string[];
}

// ============================================================================
// BOOKING CLASS MAPPINGS
// ============================================================================

// Maps booking class to cabin - Flying Blue / AF-KLM specific
const BOOKING_CLASS_TO_CABIN: Record<string, CabinClass> = {
  // First / La Première
  'F': 'First',
  'P': 'First',
  
  // Business
  'J': 'Business',
  'C': 'Business',
  'D': 'Business',
  'I': 'Business',
  'Z': 'Business',
  'O': 'Business',
  
  // Premium Economy
  'W': 'Premium Economy',
  'S': 'Premium Economy',
  'A': 'Premium Economy',
  
  // Economy (default for everything else)
  'Y': 'Economy',
  'B': 'Economy',
  'M': 'Economy',
  'U': 'Economy',
  'K': 'Economy',
  'H': 'Economy',
  'L': 'Economy',
  'Q': 'Economy',
  'T': 'Economy',
  'E': 'Economy',
  'N': 'Economy',
  'R': 'Economy',
  'G': 'Economy',
  'V': 'Economy',
  'X': 'Economy',  // Also used for awards
};

// ============================================================================
// DUTCH MONTH NAMES
// ============================================================================

const DUTCH_MONTHS: Record<string, string> = {
  'januari': '01',
  'februari': '02',
  'maart': '03',
  'april': '04',
  'mei': '05',
  'juni': '06',
  'juli': '07',
  'augustus': '08',
  'september': '09',
  'oktober': '10',
  'november': '11',
  'december': '12',
};

const ENGLISH_MONTHS: Record<string, string> = {
  'january': '01',
  'february': '02',
  'march': '03',
  'april': '04',
  'may': '05',
  'june': '06',
  'july': '07',
  'august': '08',
  'september': '09',
  'october': '10',
  'november': '11',
  'december': '12',
  // Short versions
  'jan': '01',
  'feb': '02',
  'mar': '03',
  'apr': '04',
  'jun': '06',
  'jul': '07',
  'aug': '08',
  'sep': '09',
  'oct': '10',
  'nov': '11',
  'dec': '12',
};

const ALL_MONTHS = { ...DUTCH_MONTHS, ...ENGLISH_MONTHS };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse a Dutch/English date string to YYYY-MM-DD
 * Handles formats like:
 * - "vrijdag 27 februari 2026 - 09:45"
 * - "27 feb 2026, 09:45"
 */
function parseDate(dateStr: string): { date: string; time: string } | null {
  // Try Dutch format: "vrijdag 27 februari 2026 - 09:45"
  const dutchMatch = dateStr.match(
    /(\d{1,2})\s+(\w+)\s+(\d{4})\s*[-–]\s*(\d{2}:\d{2})/i
  );
  
  if (dutchMatch) {
    const [, day, monthName, year, time] = dutchMatch;
    const month = ALL_MONTHS[monthName.toLowerCase()];
    if (month) {
      return {
        date: `${year}-${month}-${day.padStart(2, '0')}`,
        time,
      };
    }
  }
  
  // Try short format: "27 feb 2026, 09:45"
  const shortMatch = dateStr.match(
    /(\d{1,2})\s+(\w{3,})\s+(\d{4})[,\s]+(\d{2}:\d{2})/i
  );
  
  if (shortMatch) {
    const [, day, monthName, year, time] = shortMatch;
    const month = ALL_MONTHS[monthName.toLowerCase()];
    if (month) {
      return {
        date: `${year}-${month}-${day.padStart(2, '0')}`,
        time,
      };
    }
  }
  
  return null;
}

/**
 * Extract IATA code from airport description
 * e.g., "Amsterdam, Schiphol Airport, AMS" -> "AMS"
 */
function extractIATACode(text: string): string | null {
  // Look for 3-letter code at end or standalone
  const match = text.match(/\b([A-Z]{3})\b\s*$/);
  return match ? match[1] : null;
}

/**
 * Determine cabin class from booking class letter
 */
function getCabinFromBookingClass(bookingClass: string): CabinClass {
  return BOOKING_CLASS_TO_CABIN[bookingClass.toUpperCase()] || 'Economy';
}

/**
 * Detect if this is an award ticket
 */
function detectAwardTicket(text: string): boolean {
  const awardIndicators = [
    /REWARD\s*TICKET/i,
    /Betaalmethode:.*\bBP\b/i,           // BP = Blue Points
    /Betaalmethode:.*\bER\d+/i,          // ER = Euro Redemption
    /Ticketvoorwaarden:.*REWARD/i,
    /miles\s*redemption/i,
  ];
  
  return awardIndicators.some(pattern => pattern.test(text));
}

/**
 * Extract price from text (handles EUR format)
 */
function extractPrice(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (match) {
    // Handle both "123.45" and "123,45" formats
    const priceStr = match[1].replace(',', '.');
    const price = parseFloat(priceStr);
    return isNaN(price) ? 0 : price;
  }
  return 0;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a KLM/Air France e-ticket email
 */
export function parseTicketEmail(emailText: string): TicketParseResult {
  const warnings: string[] = [];
  const text = emailText.trim();
  
  if (!text) {
    return { success: false, error: 'No text provided', warnings };
  }
  
  // Check if this looks like a KLM/AF ticket
  if (!/(KLM|Air France|KL\d{3,4}|AF\d{3,4})/i.test(text)) {
    return { 
      success: false, 
      error: 'This doesn\'t appear to be a KLM or Air France ticket', 
      warnings 
    };
  }
  
  // Extract booking code
  const bookingCodeMatch = text.match(/Boekingscode:\s*([A-Z0-9]{6})/i) ||
                           text.match(/Bevestigingsnummer\s*([A-Z0-9]{6})/i) ||
                           text.match(/PNR:\s*([A-Z0-9]{6})/i);
  const bookingCode = bookingCodeMatch ? bookingCodeMatch[1] : '';
  
  if (!bookingCode) {
    warnings.push('Could not find booking code');
  }
  
  // Extract ticket number
  const ticketNumberMatch = text.match(/Ticketnummer:\s*(\d{13})/i);
  const ticketNumber = ticketNumberMatch ? ticketNumberMatch[1] : undefined;
  
  // Extract passenger name
  const passengerMatch = text.match(/Naam passagier:\s*(.+?)(?:\n|Frequent)/i) ||
                         text.match(/Naam van passagier\s*(.+?)(?:\n|Stoel)/i);
  const passengerName = passengerMatch ? passengerMatch[1].trim() : 'Unknown';
  
  // Detect award ticket
  const isAward = detectAwardTicket(text);
  
  // Extract pricing
  // Note: For revenue tickets, we need the total price for miles calculation
  // Ticketprijs may be empty or just show a label without value
  const ticketPriceMatch = text.match(/Ticketprijs\s+EUR\s+([\d.,]+)/i);
  const ticketPrice = ticketPriceMatch ? parseFloat(ticketPriceMatch[1].replace(',', '.')) : 0;
  
  const safContribution = extractPrice(text, /SAF.*?EUR\s+([\d.,]+)/i);
  const totalPrice = extractPrice(text, /Totaalprijs.*?EUR\s+([\d.,]+)/i);
  
  // For miles calculation, we need the fare basis (not taxes)
  // If ticketPrice is 0 but we have totalPrice and it's not an award, estimate ticket portion
  // KLM/AF miles are calculated on: ticket price + carrier surcharges (YR/YQ)
  // We can extract the YR surcharge separately
  const yrSurcharge = extractPrice(text, /(?:YR|Internationale toeslag).*?EUR\s+([\d.,]+)/i);
  
  // Revenue base for miles = ticket price + YR surcharge (if available)
  // If ticketPrice is 0 for a non-award, use totalPrice minus typical taxes as estimate
  let revenueBase = ticketPrice;
  if (revenueBase === 0 && !isAward && totalPrice > 0) {
    // Fallback: use total price (user can adjust if needed)
    revenueBase = totalPrice;
  }
  if (yrSurcharge > 0 && ticketPrice > 0) {
    revenueBase = ticketPrice + yrSurcharge;
  }
  
  // ========================================================================
  // FLIGHT EXTRACTION
  // ========================================================================
  
  const flights: ParsedTicketFlight[] = [];
  
  // Pattern to match flight blocks in KLM emails
  // Looking for patterns like:
  // "vrijdag 27 februari 2026 - 09:45\nAmsterdam, Schiphol Airport, AMS\n\nKL1775 | Uitgevoerd door"
  
  const flightBlockPattern = /(\w+dag\s+\d{1,2}\s+\w+\s+\d{4}\s*[-–]\s*\d{2}:\d{2})\s*\n([^,]+,\s*[^,]+,\s*([A-Z]{3}))\s*\n\n?((?:KL|AF)\d{3,4})\s*\|[^\n]*\n([^|]+)\|\s*Boekingsklasse:\s*([A-Z])[^\n]*\n(?:Stoel:[^\n]*\n)?(?:\n)?(\w+dag\s+\d{1,2}\s+\w+\s+\d{4}\s*[-–]\s*\d{2}:\d{2})\s*\n([^,]+,\s*[^,]+,\s*([A-Z]{3}))/gi;
  
  let match;
  while ((match = flightBlockPattern.exec(text)) !== null) {
    const [
      ,
      departureDateStr,
      departureAirportFull,
      departureCode,
      flightNumber,
      cabinText,
      bookingClass,
      arrivalDateStr,
      arrivalAirportFull,
      arrivalCode,
    ] = match;
    
    const departure = parseDate(departureDateStr);
    const arrival = parseDate(arrivalDateStr);
    
    if (departure && arrival && departureCode && arrivalCode) {
      const airline = flightNumber.substring(0, 2).toUpperCase();
      const cabin = getCabinFromBookingClass(bookingClass);
      
      flights.push({
        date: departure.date,
        route: `${departureCode}-${arrivalCode}`,
        origin: departureCode,
        destination: arrivalCode,
        flightNumber: flightNumber.toUpperCase(),
        airline: airline === 'KL' ? 'KL' : 'AF',
        cabin,
        bookingClass: bookingClass.toUpperCase(),
        departureTime: departure.time,
        arrivalTime: arrival.time,
      });
    }
  }
  
  // If regex didn't catch flights, try alternative simpler pattern
  if (flights.length === 0) {
    // Try to find flight info from Gmail header format
    // "Van Amsterdam naar Berlijn – KL 1775\n27 feb 2026, 09:45–11:05"
    const gmailPattern = /Van\s+([A-Za-z]+)\s+naar\s+([A-Za-z]+)\s*[–-]\s*((?:KL|AF)\s*\d{3,4})\s*\n(\d{1,2}\s+\w{3}\s+\d{4})[,\s]+(\d{2}:\d{2})[–-](\d{2}:\d{2})/gi;
    
    while ((match = gmailPattern.exec(text)) !== null) {
      const [, fromCity, toCity, flightNum, dateStr, depTime, arrTime] = match;
      const parsed = parseDate(`${dateStr}, ${depTime}`);
      
      if (parsed) {
        // We need to map city names to IATA codes - this is approximate
        const cityToIATA: Record<string, string> = {
          'amsterdam': 'AMS',
          'berlijn': 'BER',
          'berlin': 'BER',
          'parijs': 'CDG',
          'paris': 'CDG',
          'toronto': 'YYZ',
          'new york': 'JFK',
          'londen': 'LHR',
          'london': 'LHR',
        };
        
        const origin = cityToIATA[fromCity.toLowerCase()] || fromCity.substring(0, 3).toUpperCase();
        const dest = cityToIATA[toCity.toLowerCase()] || toCity.substring(0, 3).toUpperCase();
        const cleanFlightNum = flightNum.replace(/\s+/g, '');
        const airline = cleanFlightNum.substring(0, 2);
        
        flights.push({
          date: parsed.date,
          route: `${origin}-${dest}`,
          origin,
          destination: dest,
          flightNumber: cleanFlightNum,
          airline,
          cabin: 'Economy', // Default, will be updated if booking class found
          bookingClass: 'Y',
          departureTime: depTime,
          arrivalTime: arrTime,
        });
      }
    }
  }
  
  // Try yet another pattern for the detailed flight blocks
  if (flights.length === 0) {
    // More flexible pattern that handles various formats
    const segments = text.split(/Vlucht naar/i);
    
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      
      // Extract date/time and airports
      const dateMatch = segment.match(/(\w+dag)?\s*(\d{1,2})\s+(\w+)\s+(\d{4})\s*[-–]\s*(\d{2}:\d{2})/i);
      const flightMatch = segment.match(/((?:KL|AF)\d{3,4})/i);
      const classMatch = segment.match(/Boekingsklasse:\s*([A-Z])/i);
      const airportMatches = [...segment.matchAll(/([A-Z]{3})\s*$/gm)];
      
      if (dateMatch && flightMatch && airportMatches.length >= 2) {
        const [, , day, monthName, year, time] = dateMatch;
        const month = ALL_MONTHS[monthName.toLowerCase()];
        
        if (month) {
          const date = `${year}-${month}-${day.padStart(2, '0')}`;
          const origin = airportMatches[0][1];
          const dest = airportMatches[1][1];
          const flightNumber = flightMatch[1].toUpperCase();
          const bookingClass = classMatch ? classMatch[1].toUpperCase() : 'Y';
          const airline = flightNumber.substring(0, 2);
          
          // Find arrival time (second time in segment)
          const allTimes = [...segment.matchAll(/(\d{2}:\d{2})/g)];
          const arrivalTime = allTimes.length >= 2 ? allTimes[1][1] : time;
          
          flights.push({
            date,
            route: `${origin}-${dest}`,
            origin,
            destination: dest,
            flightNumber,
            airline,
            cabin: getCabinFromBookingClass(bookingClass),
            bookingClass,
            departureTime: time,
            arrivalTime,
          });
        }
      }
    }
  }
  
  if (flights.length === 0) {
    return {
      success: false,
      error: 'Could not extract any flights from the ticket. Please check the format.',
      warnings,
    };
  }
  
  // Sort flights by date
  flights.sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));
  
  return {
    success: true,
    ticket: {
      bookingCode,
      ticketNumber,
      passengerName,
      flights,
      isAward,
      pricing: {
        ticketPrice: isAward ? 0 : ticketPrice,
        safContribution,
        totalPrice: isAward ? safContribution : totalPrice,
        revenueBase: isAward ? 0 : revenueBase,
      },
      rawText: text,
    },
    warnings,
  };
}

/**
 * Convert parsed ticket to flight intake payloads
 */
export function ticketToFlightPayloads(
  ticket: ParsedTicket,
  currentStatus: string = 'Explorer'
): {
  date: string;
  route: string;
  airline: string;
  cabin: CabinClass;
  ticketPrice: number;
  flightNumber: string;
  safXp: number;
  isAward: boolean;
  earnedMiles: number;
}[] {
  const { flights, pricing, isAward } = ticket;
  
  // Distribute revenue base across flights based on segment count
  // For simplicity, we divide equally (could improve with distance weighting)
  const revenuePerFlight = flights.length > 0 
    ? pricing.revenueBase / flights.length 
    : 0;
  
  // SAF contribution goes to first flight only
  const safPerFlight = pricing.safContribution;
  
  // Status multiplier for miles calculation
  const statusMultipliers: Record<string, number> = {
    'Explorer': 4,
    'Silver': 6,
    'Gold': 7,
    'Platinum': 8,
    'Ultimate': 8,
  };
  const multiplier = statusMultipliers[currentStatus] || 4;
  
  return flights.map((flight, index) => {
    // Only KL and AF earn revenue-based miles
    const isRevenueAirline = ['KL', 'AF'].includes(flight.airline);
    
    // Calculate miles: revenue × status multiplier (only for KL/AF revenue tickets)
    let earnedMiles = 0;
    if (!isAward && isRevenueAirline && revenuePerFlight > 0) {
      earnedMiles = Math.round(revenuePerFlight * multiplier);
    }
    
    return {
      date: flight.date,
      route: flight.route,
      airline: flight.airline,
      cabin: flight.cabin,
      ticketPrice: isAward ? 0 : revenuePerFlight,
      flightNumber: flight.flightNumber,
      safXp: index === 0 ? Math.round(safPerFlight) : 0, // SAF on first segment
      isAward,
      earnedMiles,
    };
  });
}
