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
 * Balance Extractor
 * 
 * Extracts official XP, UXP, and Miles balances from the PDF.
 * These balances are the SOURCE OF TRUTH - our calculations should match them.
 * 
 * @module core/balance-extractor
 */

import type { SupportedLanguage, OfficialBalances } from '../types';
import type { TokenizedLine } from './tokenizer';

/**
 * Balance type identifiers
 */
export type BalanceType = 'xp' | 'uxp' | 'miles';

/**
 * Patterns for finding balances in different languages
 */
export const BALANCE_PATTERNS: Record<SupportedLanguage, Record<BalanceType, string[]>> = {
  en: {
    xp: ['xp balance', 'total xp', 'current xp', 'experience points'],
    uxp: ['uxp balance', 'ultimate xp', 'u-xp'],
    miles: ['miles balance', 'total miles', 'available miles', 'miles available'],
  },
  nl: {
    xp: ['xp saldo', 'totaal xp', 'huidige xp', 'ervaringspunten'],
    uxp: ['uxp saldo', 'ultimate xp'],
    miles: ['miles saldo', 'totaal miles', 'beschikbare miles'],
  },
  fr: {
    xp: ['solde xp', 'total xp', 'xp actuel', 'points expérience'],
    uxp: ['solde uxp', 'ultimate xp'],
    miles: ['solde miles', 'total miles', 'miles disponibles'],
  },
  de: {
    xp: ['xp guthaben', 'gesamt xp', 'aktuell xp', 'erfahrungspunkte'],
    uxp: ['uxp guthaben', 'ultimate xp'],
    miles: ['meilen guthaben', 'gesamt meilen', 'verfügbare meilen'],
  },
  es: {
    xp: ['saldo xp', 'total xp', 'xp actual', 'puntos experiencia'],
    uxp: ['saldo uxp', 'ultimate xp'],
    miles: ['saldo millas', 'total millas', 'millas disponibles'],
  },
  pt: {
    xp: ['saldo xp', 'total xp', 'xp atual', 'pontos experiência'],
    uxp: ['saldo uxp', 'ultimate xp'],
    miles: ['saldo milhas', 'total milhas', 'milhas disponíveis'],
  },
  it: {
    xp: ['saldo xp', 'totale xp', 'xp attuale', 'punti esperienza'],
    uxp: ['saldo uxp', 'ultimate xp'],
    miles: ['saldo miglia', 'totale miglia', 'miglia disponibili'],
  },
};

/**
 * Result of balance extraction
 */
export interface BalanceExtractionResult {
  /** Official XP balance (null if not found) */
  xp: number | null;
  /** Official UXP balance (null if not found) */
  uxp: number | null;
  /** Official Miles balance (null if not found) */
  miles: number | null;
  /** Confidence score (0-1) based on pattern matching */
  confidence: number;
  /** Lines where balances were found */
  sourceLines: {
    xp?: TokenizedLine;
    uxp?: TokenizedLine;
    miles?: TokenizedLine;
  };
}

/**
 * Extract official balances from tokenized lines
 * 
 * IMPORTANT: These balances are the SOURCE OF TRUTH.
 * If our calculated values differ, we store the discrepancy.
 * 
 * @param lines - All tokenized lines
 * @param language - Detected PDF language
 * @returns Extracted balances with confidence scores
 */
export function extractBalances(
  lines: TokenizedLine[],
  language: SupportedLanguage
): BalanceExtractionResult {
  let xp: number | null = null;
  let uxp: number | null = null;
  let miles: number | null = null;
  let confidence = 0;
  const sourceLines: BalanceExtractionResult['sourceLines'] = {};
  
  // First, look for the combined header format: "248928 Miles 183 XP 40 UXP"
  for (const line of lines) {
    const combinedMatch = line.text.match(/(\d[\d\s.,]*)\s*Miles\s+(\d+)\s*XP\s+(\d+)\s*UXP/i);
    if (combinedMatch) {
      miles = parseInt(combinedMatch[1].replace(/[\s.,]/g, ''), 10);
      xp = parseInt(combinedMatch[2], 10);
      uxp = parseInt(combinedMatch[3], 10);
      sourceLines.xp = line;
      sourceLines.uxp = line;
      sourceLines.miles = line;
      confidence = 1.0; // High confidence - standard Flying Blue format
      break;
    }
  }
  
  // If not found, look for individual balances
  if (xp === null || miles === null) {
    const patterns = BALANCE_PATTERNS[language] || BALANCE_PATTERNS.en;
    
    for (const line of lines) {
      const text = line.text.toLowerCase();
      
      // Look for XP
      if (xp === null) {
        for (const pattern of patterns.xp) {
          if (text.includes(pattern)) {
            const amount = parseBalanceAmount(line.text);
            if (amount !== null && amount < 1000) { // XP should be < 1000
              xp = amount;
              sourceLines.xp = line;
              confidence += 0.3;
              break;
            }
          }
        }
        // Also try direct XP match
        const xpMatch = line.text.match(/(\d+)\s*XP(?!\s*U)/i);
        if (xpMatch && xp === null) {
          const val = parseInt(xpMatch[1], 10);
          if (val < 1000) {
            xp = val;
            sourceLines.xp = line;
            confidence += 0.2;
          }
        }
      }
      
      // Look for UXP
      if (uxp === null) {
        for (const pattern of patterns.uxp) {
          if (text.includes(pattern)) {
            const amount = parseBalanceAmount(line.text);
            if (amount !== null && amount < 1000) {
              uxp = amount;
              sourceLines.uxp = line;
              confidence += 0.2;
              break;
            }
          }
        }
        // Direct UXP match
        const uxpMatch = line.text.match(/(\d+)\s*UXP/i);
        if (uxpMatch && uxp === null) {
          uxp = parseInt(uxpMatch[1], 10);
          sourceLines.uxp = line;
          confidence += 0.2;
        }
      }
      
      // Look for Miles
      if (miles === null) {
        for (const pattern of patterns.miles) {
          if (text.includes(pattern)) {
            const amount = parseBalanceAmount(line.text);
            if (amount !== null && amount < 10000000) { // Miles should be < 10M
              miles = amount;
              sourceLines.miles = line;
              confidence += 0.3;
              break;
            }
          }
        }
        // Direct Miles match (for large numbers)
        const milesMatch = line.text.match(/(\d[\d\s.,]*)\s*Miles/i);
        if (milesMatch && miles === null) {
          const val = parseInt(milesMatch[1].replace(/[\s.,]/g, ''), 10);
          if (val > 100 && val < 10000000) { // Reasonable miles range
            miles = val;
            sourceLines.miles = line;
            confidence += 0.2;
          }
        }
      }
    }
  }
  
  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    xp,
    uxp,
    miles,
    confidence,
    sourceLines,
  };
}

/**
 * Convert extraction result to OfficialBalances type
 */
export function toOfficialBalances(result: BalanceExtractionResult): OfficialBalances {
  return {
    xp: result.xp ?? 0,
    uxp: result.uxp ?? 0,
    miles: result.miles ?? 0,
  };
}

/**
 * Find a specific balance type in text
 */
export function findBalance(
  text: string,
  balanceType: BalanceType,
  language: SupportedLanguage
): number | null {
  const patterns = BALANCE_PATTERNS[language] || BALANCE_PATTERNS.en;
  const relevantPatterns = patterns[balanceType];
  const lowerText = text.toLowerCase();
  
  for (const pattern of relevantPatterns) {
    if (lowerText.includes(pattern)) {
      return parseBalanceAmount(text);
    }
  }
  
  return null;
}

/**
 * Parse a balance amount from text
 * Handles various number formats and separators
 */
export function parseBalanceAmount(text: string): number | null {
  // Try to find a number in the text
  // Handle: "1,234", "1.234", "1234", "1 234"
  
  // First, look for numbers near keywords
  const patterns = [
    /(\d[\d\s.,]*)\s*(?:Miles|XP|UXP)/i,
    /(?:Miles|XP|UXP)[:\s]+(\d[\d\s.,]*)/i,
    /(\d[\d\s.,]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean the number
      const cleaned = match[1].replace(/[\s.,]/g, '');
      const num = parseInt(cleaned, 10);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  
  return null;
}
