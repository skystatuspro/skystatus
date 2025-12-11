// src/utils/parseFlyingBluePdf.ts
// Parser for Flying Blue transaction history PDFs

import { FlightRecord, MilesRecord } from '../types';

// Dutch month mapping
const MONTHS_NL: Record<string, string> = {
  'jan': '01', 'feb': '02', 'mrt': '03', 'apr': '04',
  'mei': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'okt': '10', 'nov': '11', 'dec': '12'
};

// English month mapping (Flying Blue PDFs can be in multiple languages)
const MONTHS_EN: Record<string, string> = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

// French month mapping
const MONTHS_FR: Record<string, string> = {
  'jan': '01', 'fév': '02', 'mar': '03', 'avr': '04',
  'mai': '05', 'juin': '06', 'juil': '07', 'aoû': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'déc': '12'
};

const ALL_MONTHS = { ...MONTHS_NL, ...MONTHS_EN, ...MONTHS_FR };

// Airline code to name mapping
const AIRLINE_MAP: Record<string, string> = {
  'KL': 'KLM',
  'AF': 'AF',
  'SK': 'SAS',
  'DL': 'DL',
  'KE': 'KE',
  'VS': 'VS',
  'MU': 'MU',
  'GA': 'GA',
  'SU': 'SU',
  'AR': 'AR',
  'AM': 'AM',
  'CI': 'CI',
  'CZ': 'CZ',
  'ME': 'ME',
  'RO': 'RO',
  'SV': 'SV',
  'UX': 'UX',
  'VN': 'VN',
  'XN': 'XN'
};

export interface ParsedFlight {
  date: string;
  route: string;
  flightNumber: string;
  airline: string;
  earnedMiles: number;
  earnedXP: number;
  uxp: number | null;
  safXp: number;
  safMiles: number;
  isRevenue: boolean;
}

export interface ParsedMilesMonth {
  month: string;
  subscription: number;
  amex: number;
  hotel: number;
  shopping: number;
  partner: number;
  other: number;
  debit: number;
}

export interface ParseResult {
  flights: ParsedFlight[];
  miles: ParsedMilesMonth[];
  memberName: string | null;
  memberNumber: string | null;
  status: string | null;
  totalMiles: number | null;
  totalXP: number | null;
  totalUXP: number | null;
  errors: string[];
}

/**
 * Parse a date string like "30 nov 2025" to "2025-11-30"
 */
function parseDate(dateStr: string): string | null {
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const monthNum = ALL_MONTHS[month.substring(0, 3)];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * Extract miles, XP, UXP from text like "276 Miles 5 XP 5 UXP"
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
 * Main parser function - takes extracted PDF text and returns structured data
 */
export function parseFlyingBlueText(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Extract header info
  let memberName: string | null = null;
  let memberNumber: string | null = null;
  let status: string | null = null;
  let totalMiles: number | null = null;
  let totalXP: number | null = null;
  let totalUXP: number | null = null;
  
  // Look for header info in first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    // Member number pattern: "Flying Blue-nummer: 1234567890"
    const memberMatch = line.match(/Flying Blue[- ]?(?:nummer|number)[:\s]+(\d+)/i);
    if (memberMatch) {
      memberNumber = memberMatch[1];
    }
    
    // Status pattern
    if (/^(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)$/i.test(line)) {
      status = line.toUpperCase();
    }
    
    // Totals pattern: "248928 Miles 183 XP 40 UXP"
    const totalsMatch = line.match(/(\d[\d\s.,]*)\s*Miles\s+(\d+)\s*XP\s+(\d+)\s*UXP/i);
    if (totalsMatch) {
      totalMiles = parseInt(totalsMatch[1].replace(/[\s.,]/g, ''), 10);
      totalXP = parseInt(totalsMatch[2], 10);
      totalUXP = parseInt(totalsMatch[3], 10);
    }
    
    // Name is typically the first line (all caps)
    if (i === 0 && /^[A-Z\s]+$/.test(line) && line.length > 3) {
      memberName = line;
    }
  }
  
  // Parse flights and miles
  const flights: ParsedFlight[] = [];
  const milesData: Map<string, ParsedMilesMonth> = new Map();
  
  const getOrCreateMonth = (month: string): ParsedMilesMonth => {
    if (!milesData.has(month)) {
      milesData.set(month, {
        month,
        subscription: 0,
        amex: 0,
        hotel: 0,
        shopping: 0,
        partner: 0,
        other: 0,
        debit: 0
      });
    }
    return milesData.get(month)!;
  };
  
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Main transaction line with date: "30 nov 2025 Description..."
    const dateMatch = line.match(/^(\d{1,2}\s+\w{3,4}\s+\d{4})\s+(.+)$/);
    
    if (dateMatch) {
      const transDate = parseDate(dateMatch[1]);
      const content = dateMatch[2];
      const month = transDate?.substring(0, 7);
      
      if (!transDate || !month) {
        i++;
        continue;
      }
      
      // === FLIGHT TRIP ===
      // Use regex for more flexible matching (handles non-breaking spaces, etc.)
      const isTripLine = /Mijn\s+reis\s+naar|My\s+trip\s+to|Mon\s+voyage/i.test(content);
      
      if (isTripLine) {
        
        const tripSegments: ParsedFlight[] = [];
        let tripSafXp = 0;
        let tripSafMiles = 0;
        
        // Scan ahead for flight segments and SAF
        let j = i + 1;
        while (j < lines.length) {
          const subline = lines[j];
          
          // SAF entry (can have date prefix, but belongs to this trip)
          if (/Sustainable\s+Aviation\s+Fuel/i.test(subline)) {
            const { miles, xp } = extractNumbers(subline);
            tripSafXp += xp;
            tripSafMiles += miles;
            j++;
            continue;
          }
          
          // New main transaction = end of this trip (but NOT SAF, NOT segment lines, NOT "op" date lines)
          if (/^\d{1,2}\s+\w{3,4}\s+\d{4}\s+/.test(subline) && 
              !/Sustainable|gespaarde|reisafstand|^op\s/i.test(subline)) {
            // Check if this is actually a new trip or other transaction
            if (/Mijn\s+reis|Hotel|Subscribe|AMERICAN|Winkelen|RevPoints|Miles\s+overdragen/i.test(subline)) {
              break;
            }
          }
          
          // Flight segment pattern 1: "AMS - BER KL1775" (standard with flight number)
          // Handle both regular hyphen (-) and en-dash (–)
          const segMatch = subline.match(/^([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z]{2}\d{2,5})\s+(.+)$/);
          if (segMatch) {
            const [, origin, dest, flightNum, rest] = segMatch;
            
            // Try to extract numbers from this line first
            let { miles, xp, uxp } = extractNumbers(rest);
            
            // If no miles found, look ahead in next few lines for "XXX Miles X XP" pattern
            if (miles === 0) {
              for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
                const lookAhead = lines[k];
                // Stop if we hit a new segment or new transaction
                if (/^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/.test(lookAhead) || 
                    /^\d{1,2}\s+\w{3,4}\s+\d{4}\s+(?!op|Sustainable)/.test(lookAhead)) {
                  break;
                }
                // Look for miles/XP pattern
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
            const airline = AIRLINE_MAP[airlineCode] || airlineCode;
            
            const isRevenue = /bestede euro|spent euro|euros dépensés/i.test(rest);
            
            // Look for actual flight date in next lines
            let flightDate = transDate;
            for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
              const opMatch = lines[k].match(/op\s+(\d{1,2}\s+\w{3,4}\s+\d{4})/i);
              if (opMatch) {
                const parsed = parseDate(opMatch[1]);
                if (parsed) flightDate = parsed;
                break;
              }
            }
            
            tripSegments.push({
              date: flightDate,
              route: `${origin}-${dest}`,
              flightNumber: flightNum,
              airline,
              earnedMiles: miles,
              earnedXP: xp,
              uxp: uxp > 0 ? uxp : null,
              safXp: 0,
              safMiles: 0,
              isRevenue
            });
            j++;
            continue;
          }
          
          // Flight segment pattern 2: "KEF – AMS TRANSAVIA HOLLAND" (partner without flight number)
          const partnerMatch = subline.match(/^([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z][A-Za-z\s]+?)(?:\s*[-–])?\s*gespaarde/i);
          if (partnerMatch) {
            const [, origin, dest, airlineName] = partnerMatch;
            
            // Generate a pseudo flight number from airline name
            const airlineClean = airlineName.trim().toUpperCase();
            let airline = airlineClean.includes('TRANSAVIA') ? 'HV' : 
                         airlineClean.includes('DELTA') ? 'DL' : 
                         airlineClean.includes('SAS') ? 'SK' : airlineClean.substring(0, 2);
            const pseudoFlightNum = `${airline}0000`;
            
            // Extract miles from this line or look ahead
            let { miles, xp, uxp } = extractNumbers(subline);
            if (miles === 0) {
              for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
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
            let flightDate = transDate;
            for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
              const opMatch = lines[k].match(/op\s+(\d{1,2}\s+\w{3,4}\s+\d{4})/i);
              if (opMatch) {
                const parsed = parseDate(opMatch[1]);
                if (parsed) flightDate = parsed;
                break;
              }
            }
            
            tripSegments.push({
              date: flightDate,
              route: `${origin}-${dest}`,
              flightNumber: pseudoFlightNum,
              airline: airline,
              earnedMiles: miles,
              earnedXP: xp,
              uxp: uxp > 0 ? uxp : null,
              safXp: 0,
              safMiles: 0,
              isRevenue: false
            });
            j++;
            continue;
          }
          
          j++;
        }
        
        // Distribute SAF to first segment
        if (tripSegments.length > 0 && (tripSafXp > 0 || tripSafMiles > 0)) {
          tripSegments[0].safXp = tripSafXp;
          tripSegments[0].safMiles = tripSafMiles;
        }
        
        flights.push(...tripSegments);
        i = j - 1; // Continue from where we left off
      }
      
      // === SUBSCRIPTION ===
      else if (/Subscribe to Miles|Miles\s*Complete/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).subscription += miles;
        }
      }
      
      // === AMEX ===
      else if (/AMERICAN EXPRESS|AMEX/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).amex += miles;
        }
      }
      
      // === HOTELS ===
      else if (/Hotel|BOOKING\.COM|Accor|ALL-|Marriott/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).hotel += miles;
        }
      }
      
      // === SHOPPING ===
      else if (/Winkelen|Shopping|SHOP|AMAZON/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).shopping += miles;
        }
      }
      
      // === PARTNERS ===
      else if (/RevPoints|REVOLUT|Batavia|Partner/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).partner += miles;
        }
      }
      
      // === REDEMPTIONS / DEBIT ===
      else if (/upgrade|award|overdragen|transfer|Lastminute/i.test(content.toLowerCase())) {
        const { miles } = extractNumbers(content);
        if (miles < 0) {
          getOrCreateMonth(month).debit += Math.abs(miles);
        }
      }
      
      // === SKIP: Flight-related lines (tracked separately in flights) ===
      else if (/Sustainable Aviation Fuel|gespaarde Miles|reisafstand|boekingsklasse/i.test(content)) {
        // Skip - these are part of flight transactions, not separate miles earnings
      }
      
      // === SKIP: Flight segment lines that somehow got a date prefix ===
      else if (/^[A-Z]{3}\s*-\s*[A-Z]{3}/.test(content)) {
        // Skip - flight segment
      }
      
      // === OTHER ===
      else {
        const { miles } = extractNumbers(content);
        if (miles < 0) {
          getOrCreateMonth(month).debit += Math.abs(miles);
        } else if (miles > 0) {
          getOrCreateMonth(month).other += miles;
        }
      }
    }
    
    i++;
  }
  
  // Sort flights by date (newest first)
  flights.sort((a, b) => b.date.localeCompare(a.date));
  
  // Convert miles map to array
  const milesArray = Array.from(milesData.values()).sort((a, b) => a.month.localeCompare(b.month));
  
  return {
    flights,
    miles: milesArray,
    memberName,
    memberNumber,
    status,
    totalMiles,
    totalXP,
    totalUXP,
    errors
  };
}

/**
 * Convert parsed flights to FlightRecord format for SkyStatus
 */
export function toFlightRecords(parsed: ParsedFlight[]): FlightRecord[] {
  return parsed.map(f => ({
    id: `fb-${f.date}-${f.flightNumber}`,
    date: f.date,
    route: f.route,
    airline: f.airline,
    cabin: 'Economy' as const, // Default - user can edit later
    ticketPrice: 0, // Not available in PDF
    earnedMiles: f.earnedMiles + f.safMiles, // Include SAF miles
    earnedXP: f.earnedXP,
    safXp: f.safXp,
    flightNumber: f.flightNumber,
    uxp: f.uxp ?? undefined
  }));
}

/**
 * Convert parsed miles to MilesRecord format for SkyStatus
 */
export function toMilesRecords(parsed: ParsedMilesMonth[]): MilesRecord[] {
  return parsed
    .filter(m => m.subscription > 0 || m.amex > 0 || m.hotel + m.shopping + m.partner + m.other > 0 || m.debit > 0)
    .map(m => ({
      id: `fb-miles-${m.month}`,
      month: m.month,
      miles_subscription: m.subscription,
      miles_amex: m.amex,
      miles_flight: 0, // Tracked separately in flights
      miles_other: m.hotel + m.shopping + m.partner + m.other,
      miles_debit: m.debit,
      cost_subscription: m.subscription > 0 ? 186 : 0, // Default cost
      cost_amex: m.amex > 0 ? 55 : 0, // Default cost
      cost_flight: 0,
      cost_other: 0
    }));
}
