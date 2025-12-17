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
 * Miles Extractor
 * 
 * Extracts miles information from tokenized PDF lines.
 * Handles all miles sources: flights, credit cards, hotels, subscriptions, etc.
 * 
 * @module core/miles-extractor
 */

import type { ParsedMiles, MilesSources, SupportedLanguage } from '../types';
import { parseDate } from '../utils/date-parser';
import { looksLikeNewTransaction } from './tokenizer';

/**
 * Miles source type (internal categorization)
 */
export type MilesSourceType = 
  | 'flights'
  | 'subscription'
  | 'creditCard'
  | 'hotel'
  | 'transfer'
  | 'promo'
  | 'purchased'
  | 'shopping'
  | 'partner'
  | 'debit'
  | 'other';

/**
 * Miles source patterns for detection
 */
export const MILES_SOURCE_PATTERNS: Record<MilesSourceType, RegExp[]> = {
  flights: [
    /Mijn\s+reis|My\s+trip|Mon\s+voyage|Meine\s+Reise|Mi\s+viaje|Minha\s+viagem|Mio\s+viaggio/i,
    /gespaarde\s+miles|earned\s+miles|miles\s+acquis|gesammelte\s+meilen/i,
  ],
  subscription: [
    /Subscribe\s+to\s+Miles|Miles\s*Complete/i,
    /Flying\s+Blue\+|FB\+/i,
    /abonnement|subscription/i,
  ],
  creditCard: [
    /Mastercard|Visa|Express|Amex|Diners|Discover|Credit|Debit|Betaal/i,
    /kaart|carte|tarjeta|card|co-?brand/i,
    /Miles\s+(?:earn|on|from|voor)/i,
    /expenses|uitgaven|purchases|aankopen|spending|spend|transactions?/i,
  ],
  hotel: [
    /Hotel|BOOKING\.COM|Accor|ALL-|Marriott|Hilton|IHG|Hyatt|Radisson/i,
    /accommodation|hébergement|alojamiento/i,
  ],
  transfer: [
    /transfer|overdragen|transfert|übertragung|trasferimento/i,
    /points\s+transfer|partner\s+transfer/i,
  ],
  promo: [
    /promo|promotion|bonus|offer|offre|aanbieding/i,
    /welcome|bienvenue|welkom/i,
    /campaign|campagne|actie/i,
  ],
  purchased: [
    /purchase|bought|buy|achat|kauf|compra|acquisto/i,
    /gekocht|acheté|purchased\s+miles/i,
  ],
  shopping: [
    /Winkelen|Shopping|SHOP|AMAZON|retail|store/i,
  ],
  partner: [
    /RevPoints|REVOLUT|Batavia/i,
    /partner\s+miles/i,
  ],
  debit: [
    /upgrade|award|Lastminute/i,
    /bestede|spent|dépensé|ausgegeben|gastado|gasto|speso/i,
  ],
  other: [],
};

/**
 * Extract miles and XP from text
 */
function extractNumbers(text: string): { miles: number; xp: number } {
  let miles = 0, xp = 0;
  
  // Match miles (can be negative)
  const milesMatch = text.match(/(-?\d[\d\s.,]*)\s*Miles/i);
  if (milesMatch) {
    miles = parseInt(milesMatch[1].replace(/[\s.,]/g, ''), 10);
  }
  
  // Match XP
  const xpMatch = text.match(/(\d+)\s*XP/i);
  if (xpMatch) {
    xp = parseInt(xpMatch[1], 10);
  }
  
  return { miles, xp };
}

/**
 * Generate unique ID for miles record
 */
function generateMilesId(month: string): string {
  return `miles-${month}-${Date.now()}`;
}

/**
 * Internal structure for accumulating miles data
 */
interface MilesAccumulator {
  subscription: number;
  amex: number;
  hotel: number;
  shopping: number;
  partner: number;
  other: number;
  debit: number;
  bonusXp: number;
}

/**
 * Extract miles data from raw text lines
 * 
 * @param lines - Raw text lines from the PDF
 * @param language - Detected PDF language
 * @returns Array of parsed miles records (one per month)
 */
export function extractMiles(
  lines: string[],
  language: SupportedLanguage
): ParsedMiles[] {
  const milesData: Map<string, MilesAccumulator> = new Map();
  
  const getOrCreateMonth = (month: string): MilesAccumulator => {
    if (!milesData.has(month)) {
      milesData.set(month, {
        subscription: 0,
        amex: 0,
        hotel: 0,
        shopping: 0,
        partner: 0,
        other: 0,
        debit: 0,
        bonusXp: 0,
      });
    }
    return milesData.get(month)!;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Try to extract date from line
    let transDate: string | null = null;
    let content: string = '';
    
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
    
    if (!transDate || !content) continue;
    
    const month = transDate.substring(0, 7);
    
    // Skip flight transactions (handled by flight extractor)
    if (/Mijn\s+reis|My\s+trip|Mon\s+voyage|Sustainable|reisafstand|boekingsklasse/i.test(content)) {
      continue;
    }
    
    // Skip flight segment lines
    if (/^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/.test(content)) {
      continue;
    }
    
    const { miles, xp } = extractNumbers(content);
    const source = detectMilesSource(content, language);
    const monthData = getOrCreateMonth(month);
    
    // Categorize the miles
    switch (source) {
      case 'subscription':
        if (miles > 0) monthData.subscription += miles;
        break;
        
      case 'creditCard':
        if (miles > 0) monthData.amex += miles;
        else if (miles < 0) monthData.debit += Math.abs(miles);
        if (xp > 0) monthData.bonusXp += xp;
        break;
        
      case 'hotel':
        if (miles > 0) monthData.hotel += miles;
        if (xp > 0) monthData.bonusXp += xp;
        break;
        
      case 'shopping':
        if (miles > 0) monthData.shopping += miles;
        break;
        
      case 'partner':
        if (miles > 0) monthData.partner += miles;
        break;
        
      case 'promo':
        if (miles > 0) monthData.other += miles;
        if (xp > 0) monthData.bonusXp += xp;
        break;
        
      case 'debit':
        if (miles < 0) monthData.debit += Math.abs(miles);
        break;
        
      default:
        if (miles < 0) {
          monthData.debit += Math.abs(miles);
        } else if (miles > 0) {
          monthData.other += miles;
        }
        if (xp > 0 && /first\s+flight|MILES\+POINTS|bonus.*XP|XP.*bonus/i.test(content)) {
          monthData.bonusXp += xp;
        }
    }
  }
  
  // Convert to ParsedMiles array
  const result: ParsedMiles[] = [];
  
  for (const [month, data] of milesData.entries()) {
    const totalEarned = data.subscription + data.amex + data.hotel + 
                        data.shopping + data.partner + data.other;
    
    result.push({
      month,
      sources: {
        flights: { miles: 0, xp: 0 }, // Handled by flight extractor
        subscription: { miles: data.subscription, xp: 0 },
        creditCard: { miles: data.amex, xp: 0 },
        hotel: { miles: data.hotel, xp: 0 },
        transfer: { miles: 0, xp: 0 },
        promo: { miles: 0, xp: 0 },
        purchased: { miles: 0, xp: 0 },
        other: { miles: data.other + data.shopping + data.partner, xp: 0 },
      },
      debit: data.debit,
      totalEarned,
      totalXP: data.bonusXp,
      status: 'new',
    });
  }
  
  // Sort by month
  result.sort((a, b) => a.month.localeCompare(b.month));
  
  return result;
}

/**
 * Detect the source of a miles transaction from its description
 */
export function detectMilesSource(
  description: string,
  _language: SupportedLanguage
): MilesSourceType {
  const text = description.toLowerCase();
  
  // Check patterns in order of specificity
  for (const [source, patterns] of Object.entries(MILES_SOURCE_PATTERNS) as [MilesSourceType, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return source;
      }
    }
  }
  
  return 'other';
}

/**
 * Create empty miles sources object
 */
export function createEmptyMilesSources(): MilesSources {
  return {
    flights: { miles: 0, xp: 0 },
    subscription: { miles: 0, xp: 0 },
    creditCard: { miles: 0, xp: 0 },
    hotel: { miles: 0, xp: 0 },
    transfer: { miles: 0, xp: 0 },
    promo: { miles: 0, xp: 0 },
    purchased: { miles: 0, xp: 0 },
    other: { miles: 0, xp: 0 },
  };
}

/**
 * Parse a miles amount from text (handles different number formats)
 */
export function parseMilesAmount(text: string): number | null {
  const match = text.match(/(-?\d[\d\s.,]*)/);
  if (match) {
    const cleaned = match[1].replace(/[\s.,]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Merge flight miles into miles data
 * Called after flight extraction to add flight miles to the monthly totals
 */
export function mergeFlightMiles(
  milesData: ParsedMiles[],
  flights: Array<{ date: string; earnedMiles: number; earnedXP: number }>
): ParsedMiles[] {
  const milesMap = new Map(milesData.map(m => [m.month, m]));
  
  for (const flight of flights) {
    const month = flight.date.substring(0, 7);
    
    if (!milesMap.has(month)) {
      milesMap.set(month, {
        month,
        sources: createEmptyMilesSources(),
        debit: 0,
        totalEarned: 0,
        totalXP: 0,
        status: 'new',
      });
    }
    
    const monthData = milesMap.get(month)!;
    monthData.sources.flights.miles += flight.earnedMiles;
    monthData.sources.flights.xp += flight.earnedXP;
    monthData.totalEarned += flight.earnedMiles;
    monthData.totalXP += flight.earnedXP;
  }
  
  return Array.from(milesMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}
