// src/utils/parseFlyingBluePdf.ts
// Parser for Flying Blue transaction history PDFs

import { FlightRecord, MilesRecord } from '../types';

// Comprehensive month mapping for all major languages
// First 3 characters are used for matching
const MONTH_MAP: Record<string, number> = {
  // English
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  // Dutch
  'mrt': 3, 'mei': 5, 'okt': 10,
  // French
  'fév': 2, 'avr': 4, 'mai': 5, 'jui': 6, 'aoû': 8, 'déc': 12,
  // German
  'mär': 3, 'mrz': 3, 'dez': 12,
  // Spanish/Portuguese (excluding duplicates)
  'ene': 1, 'abr': 4, 'ago': 8, 'set': 9, 'dic': 12, 'out': 10,
  // Italian
  'gen': 1, 'mag': 5, 'giu': 6, 'lug': 7, 'ott': 10,
  // Full month names (first 3 chars) - these overlap with abbreviations above
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
};

// Legacy mapping for backward compatibility
const ALL_MONTHS: Record<string, string> = {};
for (const [key, val] of Object.entries(MONTH_MAP)) {
  ALL_MONTHS[key] = String(val).padStart(2, '0');
}

/**
 * Try to find month number from a string
 * Handles full names, abbreviations, multiple languages
 */
function findMonth(str: string): number | null {
  const cleaned = str.toLowerCase().replace(/[^a-zéûôàèùäöüß]/g, '');
  
  // Try exact match first
  if (MONTH_MAP[cleaned]) return MONTH_MAP[cleaned];
  
  // Try first 3 characters
  const prefix = cleaned.substring(0, 3);
  if (MONTH_MAP[prefix]) return MONTH_MAP[prefix];
  
  // Try matching any known month prefix
  for (const [monthKey, monthNum] of Object.entries(MONTH_MAP)) {
    if (cleaned.startsWith(monthKey) || monthKey.startsWith(cleaned)) {
      return monthNum;
    }
  }
  
  return null;
}

/**
 * Check if a string looks like it starts with a date
 * Very permissive - just needs to have date-like components
 */
function looksLikeDate(str: string): boolean {
  const s = str.toLowerCase();
  
  // Must contain at least one number
  if (!/\d/.test(s)) return false;
  
  // Check for common date patterns
  // Has month name?
  const hasMonthWord = Object.keys(MONTH_MAP).some(m => s.includes(m));
  
  // Has numeric separators (/, -, .)?
  const hasDateSeparators = /\d+[/.-]\d+[/.-]\d+/.test(s);
  
  // Has day + month or month + day pattern?
  const hasDayMonth = /\d{1,2}\s+\w{3,}|\w{3,}\s+\d{1,2}/.test(s);
  
  return hasMonthWord || hasDateSeparators || hasDayMonth;
}

/**
 * Check if a line looks like a new transaction (starts with a parseable date)
 * Used to detect transaction boundaries
 */
function looksLikeNewTransaction(line: string): boolean {
  if (!looksLikeDate(line)) return false;
  
  // Try to parse the beginning as a date
  const words = line.split(/\s+/);
  for (let n = 2; n <= Math.min(5, words.length); n++) {
    const potentialDate = words.slice(0, n).join(' ');
    if (parseDate(potentialDate)) {
      return true;
    }
  }
  
  return false;
}

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
  bonusXp: number;  // XP from bonuses like first flight, hotel stays, etc.
}

export interface RequalificationEvent {
  date: string;
  fromStatus: string | null;
  toStatus: string | null;
  xpDeducted: number | null;    // XP cost to reach new status (e.g., -300 for Platinum)
  rolloverXP: number | null;    // Surplus XP carried over to new cycle
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
  // Data range info
  oldestDate: string | null;
  newestDate: string | null;
  // Requalification events detected
  requalifications: RequalificationEvent[];
}

/**
 * Parse a date string to "2025-11-30" format
 * Universal parser that handles virtually any date format:
 * - European text: "30 nov 2025", "30 november 2025"
 * - North American text: "Dec 9, 2025", "December 9 2025"
 * - European numeric: "30-11-2025", "30/11/2025", "30.11.2025"
 * - US numeric: "12/9/2025", "12-9-2025"
 * - ISO: "2025-11-30", "2025/11/30"
 * - Any language month names
 */
function parseDate(dateStr: string): string | null {
  // Clean input: remove commas, normalize whitespace
  const cleaned = dateStr.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  
  // Strategy 1: Pure numeric formats (e.g., "30/11/2025", "2025-11-30", "12.9.2025")
  const numericMatch = cleaned.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (numericMatch) {
    const [, a, b, c] = numericMatch.map(Number);
    
    // ISO format: 2025-11-30 (first number is 4 digits)
    if (a > 1000) {
      year = a;
      month = b;
      day = c;
    }
    // European or US: depends on values
    // If third number is 4 digits, it's the year
    else if (c > 1000) {
      year = c;
      // European (DD/MM/YYYY) vs US (MM/DD/YYYY)
      // Heuristic: if first > 12, it must be day
      if (a > 12) {
        day = a;
        month = b;
      } else if (b > 12) {
        month = a;
        day = b;
      } else {
        // Ambiguous - assume European (DD/MM/YYYY) as that's more common globally
        day = a;
        month = b;
      }
    }
  }
  
  // Strategy 2: Text month formats (e.g., "30 nov 2025", "Dec 9 2025")
  if (!year) {
    const tokens = cleaned.split(/[\s/.-]+/);
    
    // Find all numbers and potential month words
    const numbers: number[] = [];
    let foundMonth: number | null = null;
    
    for (const token of tokens) {
      const num = parseInt(token, 10);
      if (!isNaN(num)) {
        numbers.push(num);
      } else {
        const m = findMonth(token);
        if (m !== null) {
          foundMonth = m;
        }
      }
    }
    
    if (foundMonth !== null) {
      month = foundMonth;
      
      // Separate potential day and year from numbers
      const potentialYear = numbers.find(n => n > 1000 && n < 2100);
      const potentialDays = numbers.filter(n => n >= 1 && n <= 31 && n < 1000);
      
      if (potentialYear) year = potentialYear;
      if (potentialDays.length > 0) day = potentialDays[0];
    }
  }
  
  // Validate and return
  if (day && month && year && day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  // Debug: log first 15 lines to understand PDF structure
  console.log('[Parser] First 15 lines of PDF:', lines.slice(0, 15));
  
  // Debug: Find ALL lines containing status words
  const statusLines = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => /PLATINUM|GOLD|SILVER|EXPLORER|ULTIMATE/i.test(line));
  console.log('[Parser] All lines containing status words:', statusLines);
  
  // PDF.js often extracts the visual header at the END of pages
  // Look for "Flying Blue-nummer:" pattern and get status from nearby line
  let flyingBlueLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/Flying Blue[- ]?(?:nummer|number)/i.test(lines[i])) {
      flyingBlueLineIdx = i;
      const memberMatch = lines[i].match(/Flying Blue[- ]?(?:nummer|number)[:\s]+(\d+)/i);
      if (memberMatch) {
        memberNumber = memberMatch[1];
      }
      // Name is typically one line before
      if (i > 0 && /^[A-Z\s]+$/.test(lines[i-1].trim()) && lines[i-1].trim().length > 3) {
        memberName = lines[i-1].trim();
      }
      // Status is typically one line after
      if (i < lines.length - 1) {
        const nextLine = lines[i+1].trim();
        if (/^(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)$/i.test(nextLine)) {
          status = nextLine.toUpperCase();
          console.log('[Parser] Status found (after Flying Blue-nummer):', status);
        }
      }
      break; // Found it, stop searching
    }
  }
  
  // First pass: look for totals in first 20 lines
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];
    
    // Totals pattern: "248928 Miles 183 XP 40 UXP"
    const totalsMatch = line.match(/(\d[\d\s.,]*)\s*Miles\s+(\d+)\s*XP\s+(\d+)\s*UXP/i);
    if (totalsMatch) {
      totalMiles = parseInt(totalsMatch[1].replace(/[\s.,]/g, ''), 10);
      totalXP = parseInt(totalsMatch[2], 10);
      totalUXP = parseInt(totalsMatch[3], 10);
      console.log('[Parser] Totals found:', { totalMiles, totalXP, totalUXP });
    }
  }
  
  // If status still not found, search ALL lines for standalone status
  for (let i = 0; i < lines.length && !status; i++) {
    const line = lines[i].trim();
    if (/^(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)$/i.test(line)) {
      status = line.toUpperCase();
      console.log('[Parser] Status found (exact standalone match) at line', i, ':', status);
      break;
    }
  }
  
  // Priority 2: Status in a line, but NOT in credit card context
  if (!status) {
    for (let i = 0; i < Math.min(50, lines.length); i++) {
      const line = lines[i];
      
      // Skip lines that are clearly credit card references
      if (/AMERICAN\s+EXPRESS|PLATINUM\s+CARD|CREDIT\s*CARD|AMEX/i.test(line)) {
        continue;
      }
      
      // Skip transaction lines (start with date)
      if (/^\d{1,2}\s+(jan|feb|mrt|mar|apr|mei|may|jun|jul|aug|sep|okt|oct|nov|dec)/i.test(line)) {
        continue;
      }
      
      const statusInLineMatch = line.match(/\b(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\b/i);
      if (statusInLineMatch) {
        status = statusInLineMatch[1].toUpperCase();
        console.log('[Parser] Status found (in-line match) at line', i, ':', status, 'from:', line);
        break;
      }
    }
  }
  
  console.log('[Parser] Header parsing result:', { memberName, memberNumber, status, totalMiles, totalXP, totalUXP });
  
  // Parse flights and miles
  const flights: ParsedFlight[] = [];
  const milesData: Map<string, ParsedMilesMonth> = new Map();
  const requalifications: RequalificationEvent[] = [];
  
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
        debit: 0,
        bonusXp: 0
      });
    }
    return milesData.get(month)!;
  };
  
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Universal date detection: try to find a date at the start of the line
    // Handle cases where date and content are joined without space (e.g., "8 okt 2025Aftrek")
    let transDate: string | null = null;
    let content: string = '';
    
    // IMPROVED: Use regex to extract date even when joined with content
    // Pattern: day month year (with optional content immediately after year)
    const dateContentMatch = line.match(/^(\d{1,2})\s+(jan|feb|mrt|mar|apr|mei|may|jun|jul|aug|sep|okt|oct|nov|dec)\s+(\d{4})(.*)$/i);
    
    if (dateContentMatch) {
      const [, day, monthStr, year, rest] = dateContentMatch;
      const parsed = parseDate(`${day} ${monthStr} ${year}`);
      if (parsed) {
        transDate = parsed;
        // Content is everything after the year (may start without space)
        content = rest.trim();
      }
    }
    
    // Fallback to original logic if the new pattern didn't match
    if (!transDate && looksLikeDate(line)) {
      const words = line.split(/\s+/);
      
      // Try combining first 2, 3, 4, or 5 words as a date
      for (let n = 2; n <= Math.min(5, words.length - 1); n++) {
        const potentialDate = words.slice(0, n).join(' ');
        const parsed = parseDate(potentialDate);
        if (parsed) {
          transDate = parsed;
          content = words.slice(n).join(' ');
          break;
        }
      }
    }
    
    if (transDate && content) {
      const month = transDate.substring(0, 7);
      
      if (!month) {
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
          // Use universal date detection
          if (looksLikeNewTransaction(subline) && 
              !/Sustainable|gespaarde|reisafstand|^op\s|^on\s|^le\s/i.test(subline)) {
            // Check if this is actually a new trip or other transaction type
            if (/Mijn\s+reis|My\s+trip|Mon\s+voyage|Hotel|Subscribe|Winkelen|Shopping|Miles\s+(earn|overdragen)/i.test(subline)) {
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
                    (looksLikeNewTransaction(lookAhead) && !/^op\s|^on\s|Sustainable/i.test(lookAhead))) {
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
            
            // Check if this is a revenue flight (paid with money, not award)
            // Match on "bestede" (NL), "spent" (EN), "dépensés" (FR), "ausgegeben" (DE)
            // Works for all currencies: euros, kroner, dollars, pounds, etc.
            const isRevenue = /bestede|spent|dépensés|ausgegeben/i.test(rest);
            
            // Look for actual flight date in next lines
            // "op" (NL), "on" (EN), "le" (FR), "am" (DE) followed by a date
            // PDF extraction often puts "op" on one line and the date on the next
            let flightDate = transDate;
            let foundFlightDate = false;
            for (let k = j + 1; k < Math.min(j + 8, lines.length); k++) {
              const line = lines[k].trim();
              
              // Pattern 1: "op" alone on a line - date is on NEXT line
              if (/^(?:op|on|le|am)$/i.test(line) && k + 1 < lines.length) {
                const nextLine = lines[k + 1];
                // Next line starts with a date: "29 nov 2025" or "6 jun 2025 ..."
                const dateMatch = nextLine.match(/^\s*(\d{1,2})\s+([a-zA-Zéûôàèùäöüß]+)\s+(\d{4})/i);
                if (dateMatch) {
                  const [, day, month, year] = dateMatch;
                  const parsed = parseDate(`${day} ${month} ${year}`);
                  if (parsed) {
                    flightDate = parsed;
                    foundFlightDate = true;
                    break;
                  }
                }
              }
              
              // Pattern 2: "op 29 nov 2025" all on one line
              const opMatch = line.match(/^(?:op|on|le|am)\s+(.+)/i);
              if (opMatch) {
                const parsed = parseDate(opMatch[1]);
                if (parsed) {
                  flightDate = parsed;
                  foundFlightDate = true;
                  break;
                }
              }
              
              // Pattern 3: Date pattern anywhere in line (fallback)
              const datePattern = line.match(/(?:op|on|le|am)\s+(\d{1,2})\s+([a-zA-Zéûôàèùäöüß]+)\s+(\d{4})/i);
              if (datePattern) {
                const [, day, month, year] = datePattern;
                const parsed = parseDate(`${day} ${month} ${year}`);
                if (parsed) {
                  flightDate = parsed;
                  foundFlightDate = true;
                  break;
                }
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
          // Support multiple languages: gespaarde (NL), earned (EN), acquis (FR), gesammelt (DE)
          const partnerMatch = subline.match(/^([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z][A-Za-z\s]+?)(?:\s*[-–])?\s*(?:gespaarde|earned|Miles|acquis|gesammelt)/i);
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
            // "op" (NL), "on" (EN), "le" (FR), "am" (DE) followed by a date
            // PDF extraction often puts "op" on one line and the date on the next
            let flightDate = transDate;
            let foundFlightDate = false;
            for (let k = j + 1; k < Math.min(j + 8, lines.length); k++) {
              const line = lines[k].trim();
              
              // Pattern 1: "op" alone on a line - date is on NEXT line
              if (/^(?:op|on|le|am)$/i.test(line) && k + 1 < lines.length) {
                const nextLine = lines[k + 1];
                const dateMatch = nextLine.match(/^\s*(\d{1,2})\s+([a-zA-Zéûôàèùäöüß]+)\s+(\d{4})/i);
                if (dateMatch) {
                  const [, day, month, year] = dateMatch;
                  const parsed = parseDate(`${day} ${month} ${year}`);
                  if (parsed) {
                    flightDate = parsed;
                    foundFlightDate = true;
                    break;
                  }
                }
              }
              
              // Pattern 2: "op 29 nov 2025" all on one line
              const opMatch = line.match(/^(?:op|on|le|am)\s+(.+)/i);
              if (opMatch) {
                const parsed = parseDate(opMatch[1]);
                if (parsed) {
                  flightDate = parsed;
                  foundFlightDate = true;
                  break;
                }
              }
              
              // Pattern 3: Date pattern anywhere (fallback)
              const datePattern = line.match(/(?:op|on|le|am)\s+(\d{1,2})\s+([a-zA-Zéûôàèùäöüß]+)\s+(\d{4})/i);
              if (datePattern) {
                const [, day, month, year] = datePattern;
                const parsed = parseDate(`${day} ${month} ${year}`);
                if (parsed) {
                  flightDate = parsed;
                  foundFlightDate = true;
                  break;
                }
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
      
      // === BONUS XP ITEMS ===
      // Items that give XP but 0 Miles (first flight bonus, hotel stay bonuses, etc.)
      // These patterns: "Miles+Points first flight bonus", "ALL- Accor Live Limitless MILES+POINTS"
      else if (/first flight bonus|MILES\+POINTS|bonus.*XP|XP.*bonus/i.test(content)) {
        const { miles, xp } = extractNumbers(content);
        if (xp > 0) {
          getOrCreateMonth(month).bonusXp += xp;
        }
        // Also add any miles if present
        if (miles > 0) {
          getOrCreateMonth(month).other += miles;
        }
      }
      
      // === HOTELS ===
      // Specific hotel brands and booking platforms
      else if (/Hotel|BOOKING\.COM|Accor|ALL-|Marriott|Hilton|IHG|Hyatt|Radisson/i.test(content)) {
        const { miles, xp } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).hotel += miles;
        }
        // Hotel stays can give bonus XP (with or without miles)
        if (xp > 0) {
          getOrCreateMonth(month).bonusXp += xp;
        }
      }
      
      // === SHOPPING ===
      // Shopping platforms and retailers
      else if (/Winkelen|Shopping|SHOP|AMAZON|retail|store/i.test(content)) {
        const { miles } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).shopping += miles;
        }
      }
      
      // === SPECIFIC PARTNERS ===
      // Known partner programs
      else if (/RevPoints|REVOLUT|Batavia/i.test(content)) {
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
      
      // === CREDIT/DEBIT CARDS (universal detection) ===
      // This is AFTER all specific categories - catches any card-related earning
      // We use broad patterns that work regardless of card brand/issuer/country
      // NOTE: Flying Blue co-branded cards (AMEX, etc.) can earn BOTH Miles AND XP!
      else if (
        // Any card network/type mention
        /Mastercard|Visa|Express|Amex|Diners|Discover|Debit|Credit|Betaal/i.test(content) ||
        // Earning/spending patterns (most Flying Blue PDFs describe card earnings this way)
        /Miles\s+(earn|on|from|voor)/i.test(content) ||
        /earn.*Miles/i.test(content) ||
        /(expenses|uitgaven|purchases|aankopen|spending|spend|transactions?)/i.test(content) ||
        // Card-related terms in multiple languages
        /kaart|carte|tarjeta|card|co-?brand/i.test(content)
      ) {
        const { miles, xp } = extractNumbers(content);
        if (miles > 0) {
          getOrCreateMonth(month).amex += miles; // "amex" field stores all credit card miles
        } else if (miles < 0) {
          getOrCreateMonth(month).debit += Math.abs(miles);
        }
        // Flying Blue AMEX and other co-branded cards also earn XP!
        if (xp > 0) {
          getOrCreateMonth(month).bonusXp += xp;
        }
      }
      
      // === AIR ADJUSTMENTS (retroactive XP corrections) ===
      // Flying Blue sometimes applies retroactive XP corrections
      // EN: "Air adjustment", NL: "Luchtvaartcorrectie", FR: "Ajustement aérien"
      // DE: "Flugkorrektur", IT: "Correzione aerea", ES: "Ajuste aéreo", PT: "Ajuste aéreo"
      else if (
        /Air\s*adjustment/i.test(content) ||
        /Luchtvaart\s*correctie/i.test(content) ||
        /Ajustement\s*aérien/i.test(content) ||
        /Flugkorrektur/i.test(content) ||
        /Correzione\s*aerea/i.test(content) ||
        /Ajuste\s*aéreo/i.test(content)
      ) {
        const { xp } = extractNumbers(content);
        if (xp > 0) {
          getOrCreateMonth(month).bonusXp += xp;
        }
      }
      
      // === XP DEDUCTION (Status Level-Up) ===
      // When you reach a new status, Flying Blue deducts the required XP from your counter
      // This is the primary indicator that a new qualification cycle started
      // EN: "XP Counter deduction", NL: "Aftrek XP-teller", FR: "Déduction compteur XP"
      // DE: "XP-Zähler Abzug", IT: "Deduzione contatore XP", ES: "Deducción contador XP"
      else if (
        /Aftrek\s*XP[- ]?teller/i.test(content) ||
        /XP[- ]?(?:Counter|teller|compteur|Zähler|contatore|contador)\s*(?:deduct|offset|aftrek|déduction|abzug|deduzione|deducción)/i.test(content) ||
        /(?:deduct|offset|aftrek|déduction|abzug|deduzione|deducción).*XP[- ]?(?:Counter|teller|compteur|Zähler|contatore|contador)/i.test(content)
      ) {
        // Extract the negative XP value (e.g., -300 for Platinum)
        const xpMatch = content.match(/(-\d+)\s*XP/i);
        const xpDeducted = xpMatch ? Math.abs(parseInt(xpMatch[1], 10)) : null;
        
        console.log('[Parser] XP Deduction detected:', { date: transDate, xpDeducted, content: content.substring(0, 60) });
        
        // Look for status in the same line first
        let statusMatch = content.match(/(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\s*(?:reached|bereikt|atteint|erreicht|raggiunto|alcanzado|atingido)/i);
        
        // If not found, look ahead at next few lines for "reached" pattern
        // The status line often appears on a separate line without a date prefix
        // Example: Line 218: "8 okt 2025Aftrek XP-teller0 Miles-300 XP"
        //          Line 219: "Qualification period ended / Platinum reached0 Miles-300 XP"
        if (!statusMatch) {
          for (let k = i + 1; k < Math.min(i + 4, lines.length); k++) {
            const nextLine = lines[k];
            // Stop if we hit a new dated transaction
            if (looksLikeNewTransaction(nextLine)) break;
            
            statusMatch = nextLine.match(/(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\s*(?:reached|bereikt|atteint|erreicht|raggiunto|alcanzado|atingido)/i);
            if (statusMatch) {
              console.log('[Parser] Status found in look-ahead:', statusMatch[1]);
              break;
            }
          }
        }
        
        const detectedStatus = statusMatch ? statusMatch[1].toUpperCase() : null;
        console.log('[Parser] Final detected status:', detectedStatus);
        
        // Check if we already have a requalification for this date (from Surplus XP line)
        const existing = requalifications.find(r => r.date === transDate);
        if (existing) {
          existing.xpDeducted = xpDeducted;
          if (statusMatch && !existing.toStatus) {
            existing.toStatus = detectedStatus;
          }
          console.log('[Parser] Updated existing requalification:', existing);
        } else {
          const newEntry = {
            date: transDate,
            fromStatus: null,
            toStatus: detectedStatus,
            xpDeducted,
            rolloverXP: null,
          };
          requalifications.push(newEntry);
          console.log('[Parser] Created new requalification:', newEntry);
        }
      }
      
      // === STATUS REACHED (Qualification period ended) ===
      // EN: "Qualification period ended / Silver reached", "Gold reached", "Platinum reached"
      // NL: "Kwalificatieperiode beëindigd / Gold bereikt", etc.
      // This often appears together with or near the XP deduction
      else if (
        /(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\s*(?:reached|bereikt|atteint|erreicht|raggiunto|alcanzado|atingido)/i.test(content) ||
        /(?:Qualification|Kwalificatie).*(?:period|periode).*(?:ended|beëindigd|terminée|beendet|terminato|terminado)/i.test(content)
      ) {
        const statusMatch = content.match(/(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)/i);
        const status = statusMatch ? statusMatch[1].toUpperCase() : null;
        
        // Check if we already have a requalification for this date (from XP deduction line)
        const existing = requalifications.find(r => r.date === transDate);
        if (existing) {
          if (status && !existing.toStatus) {
            existing.toStatus = status;
          }
        } else {
          requalifications.push({
            date: transDate,
            fromStatus: null,
            toStatus: status,
            xpDeducted: null,
            rolloverXP: null,
          });
        }
      }
      
      // === SURPLUS XP (Rollover to new cycle) ===
      // When you level up with more XP than required, the excess is carried over
      // EN: "Surplus XP available", NL: "Surplus XP beschikbaar", FR: "XP excédentaires disponibles"
      // DE: "Überschüssige XP verfügbar", IT: "XP in eccesso disponibili", ES: "XP excedentes disponibles"
      else if (
        /Surplus\s*XP\s*(?:beschikbaar|available|disponibles?|verfügbar|disponibili)/i.test(content) ||
        /XP\s*(?:excédentaires?|überschüssige?|eccesso|excedentes?)\s*(?:disponibles?|verfügbar|disponibili)/i.test(content) ||
        /(?:Excess|Überschuss|Eccesso|Exceso)\s*XP/i.test(content)
      ) {
        const { xp } = extractNumbers(content);
        console.log('[Parser] Surplus XP detected:', { date: transDate, xp, content: content.substring(0, 60) });
        
        // Find the requalification event for this date and add rollover XP
        const existing = requalifications.find(r => r.date === transDate);
        if (existing) {
          existing.rolloverXP = xp;
          console.log('[Parser] Added rollover to existing requalification');
        } else {
          // Create a new event if somehow we see surplus without seeing deduction first
          requalifications.push({
            date: transDate,
            fromStatus: null,
            toStatus: null,
            xpDeducted: null,
            rolloverXP: xp,
          });
          console.log('[Parser] Created new requalification entry with rollover');
        }
      }
      
      // === LEGACY REQUALIFICATION PATTERNS ===
      // Keep older detection patterns as fallback
      // EN: "Requalification", NL: "Herkwalificatie", FR: "Requalification"
      else if (
        /[Rr]e?qualifi(?:cation|catie|cazione|cación|cação|ed|é|ziert|cato|cado)/i.test(content) ||
        /[Hh]erkwalifi/i.test(content) ||
        /[Gg]ekwalificeerd/i.test(content) ||
        /[Ss]tatus.*(?:renewed|verlengd|renouvelé|erneuert|rinnovato|renovado)/i.test(content)
      ) {
        const statusMatch = content.match(/(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)/i);
        const existing = requalifications.find(r => r.date === transDate);
        if (!existing) {
          requalifications.push({
            date: transDate,
            fromStatus: null,
            toStatus: statusMatch ? statusMatch[1].toUpperCase() : null,
            xpDeducted: null,
            rolloverXP: null,
          });
        }
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
  
  // Calculate date range
  const allDates = flights.map(f => f.date).filter(d => d);
  const oldestDate = allDates.length > 0 ? allDates.reduce((a, b) => a < b ? a : b) : null;
  const newestDate = allDates.length > 0 ? allDates.reduce((a, b) => a > b ? a : b) : null;
  
  // Debug: Log all detected requalifications
  console.log('[Parser] All requalifications detected:', requalifications.length);
  requalifications.forEach((r, idx) => {
    console.log(`[Parser] Requalification ${idx + 1}:`, {
      date: r.date,
      toStatus: r.toStatus,
      xpDeducted: r.xpDeducted,
      rolloverXP: r.rolloverXP
    });
  });
  
  // FALLBACK: If header status wasn't found (pdf.js didn't extract the header section),
  // use the most recent requalification status as fallback
  // Note: This may not be 100% accurate if user qualified to a higher status since then
  let finalStatus = status;
  if (!finalStatus && requalifications.length > 0) {
    // Sort by date descending to get most recent
    const sortedReqals = [...requalifications].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const mostRecent = sortedReqals.find(r => r.toStatus);
    if (mostRecent?.toStatus) {
      finalStatus = mostRecent.toStatus.toUpperCase();
      console.log('[Parser] Status fallback: using most recent requalification status:', finalStatus);
    }
  }
  
  // If still no status, default to Explorer
  if (!finalStatus) {
    finalStatus = null; // Will be handled by PdfImportModal as 'Explorer'
    console.log('[Parser] Status: could not determine from PDF');
  }
  
  return {
    flights,
    miles: milesArray,
    memberName,
    memberNumber,
    status: finalStatus,
    totalMiles,
    totalXP,
    totalUXP,
    errors,
    oldestDate,
    newestDate,
    requalifications, // Will be populated by requalification detection
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

/**
 * Extract bonus XP entries for manual ledger
 * Returns a map of month -> bonusXp for items that give XP but 0 miles
 */
export function extractBonusXp(parsed: ParsedMilesMonth[]): Record<string, number> {
  const bonusXpByMonth: Record<string, number> = {};
  for (const m of parsed) {
    if (m.bonusXp > 0) {
      bonusXpByMonth[m.month] = (bonusXpByMonth[m.month] || 0) + m.bonusXp;
    }
  }
  return bonusXpByMonth;
}
