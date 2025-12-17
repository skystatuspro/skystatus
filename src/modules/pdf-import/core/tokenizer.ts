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
 * Tokenizer
 * 
 * Converts raw PDF text into structured lines for extraction.
 * Handles multi-line transactions, date detection, and section identification.
 * 
 * @module core/tokenizer
 */

import type { SupportedLanguage } from '../types';
import { parseDate, looksLikeDate } from '../utils/date-parser';
import { findMonth, MONTH_MAP } from '../locales/month-patterns';

/**
 * A tokenized line from the PDF
 */
export interface TokenizedLine {
  /** Original line text */
  text: string;
  /** Line number in original PDF */
  lineNumber: number;
  /** Detected line type */
  type: 'transaction' | 'header' | 'summary' | 'status' | 'flight_segment' | 'unknown';
  /** Whether this line starts a new transaction */
  startsTransaction: boolean;
  /** Detected date if present (YYYY-MM-DD) */
  date?: string;
  /** Content after the date */
  content?: string;
}

/**
 * Result of tokenization
 */
export interface TokenizeResult {
  /** All tokenized lines */
  lines: TokenizedLine[];
  /** Detected language */
  language: SupportedLanguage;
  /** Raw sections identified */
  sections: {
    header: TokenizedLine[];
    transactions: TokenizedLine[];
    summary: TokenizedLine[];
  };
}

/**
 * Language detection patterns
 */
const LANGUAGE_PATTERNS: Record<SupportedLanguage, string[]> = {
  en: ['my trip to', 'earned miles', 'miles earned', 'first flight', 'spent', 'transfer'],
  nl: ['mijn reis naar', 'gespaarde miles', 'bestede', 'overdragen', 'eerste vlucht'],
  fr: ['mon voyage', 'miles acquis', 'dépensé', 'premier vol', 'transfert'],
  de: ['meine reise', 'gesammelte meilen', 'ausgegeben', 'erster flug', 'übertragung'],
  es: ['mi viaje', 'millas ganadas', 'gastado', 'primer vuelo', 'transferencia'],
  pt: ['minha viagem', 'milhas ganhas', 'gasto', 'primeiro voo', 'transferência'],
  it: ['mio viaggio', 'miglia guadagnate', 'speso', 'primo volo', 'trasferimento'],
};

/**
 * Tokenize raw PDF text into structured lines
 * 
 * @param text - Raw text from PDF
 * @returns Tokenized result with identified sections
 */
export function tokenize(text: string): TokenizeResult {
  // Split into lines and clean
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Detect language
  const language = detectLanguage(text);
  
  // Process each line
  const lines: TokenizedLine[] = [];
  
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const tokenizedLine = tokenizeLine(line, i + 1);
    lines.push(tokenizedLine);
  }
  
  // Identify sections
  const sections = identifySections(lines);
  
  return {
    lines,
    language,
    sections,
  };
}

/**
 * Tokenize a single line
 */
function tokenizeLine(line: string, lineNumber: number): TokenizedLine {
  const result: TokenizedLine = {
    text: line,
    lineNumber,
    type: 'unknown',
    startsTransaction: false,
  };
  
  // Check for header patterns
  if (isHeaderLine(line)) {
    result.type = 'header';
    return result;
  }
  
  // Check for status patterns
  if (isStatusLine(line)) {
    result.type = 'status';
    return result;
  }
  
  // Check for flight segment (AMS-CDG pattern)
  if (isFlightSegmentLine(line)) {
    result.type = 'flight_segment';
    return result;
  }
  
  // Check for summary patterns
  if (isSummaryLine(line)) {
    result.type = 'summary';
    return result;
  }
  
  // Try to extract date from start of line
  const dateResult = extractDateFromLine(line);
  if (dateResult) {
    result.type = 'transaction';
    result.startsTransaction = true;
    result.date = dateResult.date;
    result.content = dateResult.content;
  }
  
  return result;
}

/**
 * Extract date and content from a line
 */
function extractDateFromLine(line: string): { date: string; content: string } | null {
  if (!looksLikeDate(line)) return null;
  
  const words = line.split(/\s+/);
  
  // Try combining first 2, 3, 4, or 5 words as a date
  for (let n = 2; n <= Math.min(5, words.length - 1); n++) {
    const potentialDate = words.slice(0, n).join(' ');
    const parsed = parseDate(potentialDate);
    if (parsed) {
      return {
        date: parsed.full,
        content: words.slice(n).join(' '),
      };
    }
  }
  
  return null;
}

/**
 * Check if a line is a header line
 */
function isHeaderLine(line: string): boolean {
  // Flying Blue number pattern
  if (/Flying Blue[- ]?(?:nummer|number)[:\s]+\d+/i.test(line)) return true;
  
  // Member name (all caps at start)
  if (/^[A-Z\s]{3,30}$/.test(line) && !/EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE/.test(line)) return true;
  
  return false;
}

/**
 * Check if a line is a status line
 */
function isStatusLine(line: string): boolean {
  return /^(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)$/i.test(line.trim());
}

/**
 * Check if a line is a flight segment line (AMS-CDG pattern)
 */
function isFlightSegmentLine(line: string): boolean {
  // Pattern: AMS - CDG or AMS-CDG followed by flight number or airline
  return /^[A-Z]{3}\s*[-–]\s*[A-Z]{3}/i.test(line);
}

/**
 * Check if a line is a summary line
 */
function isSummaryLine(line: string): boolean {
  // Total pattern: "248928 Miles 183 XP 40 UXP"
  if (/\d[\d\s.,]*\s*Miles\s+\d+\s*XP\s+\d+\s*UXP/i.test(line)) return true;
  
  // Balance patterns
  if (/total|balance|saldo|solde|guthaben/i.test(line) && /miles|xp/i.test(line)) return true;
  
  return false;
}

/**
 * Identify sections in the tokenized lines
 */
function identifySections(lines: TokenizedLine[]): TokenizeResult['sections'] {
  const header: TokenizedLine[] = [];
  const transactions: TokenizedLine[] = [];
  const summary: TokenizedLine[] = [];
  
  let inHeader = true;
  
  for (const line of lines) {
    if (line.type === 'header' || line.type === 'status') {
      if (inHeader) {
        header.push(line);
      } else {
        summary.push(line);
      }
    } else if (line.type === 'summary') {
      summary.push(line);
    } else if (line.type === 'transaction' || line.type === 'flight_segment') {
      inHeader = false;
      transactions.push(line);
    } else if (!inHeader) {
      // Unknown lines after header go to transactions
      transactions.push(line);
    }
  }
  
  return { header, transactions, summary };
}

/**
 * Check if a line looks like it starts a new transaction
 * (Contains a parseable date at the start)
 */
export function looksLikeNewTransaction(line: string): boolean {
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

/**
 * Detect the language of the PDF from text content
 */
export function detectLanguage(text: string): SupportedLanguage {
  const lowerText = text.toLowerCase();
  
  // Count matches for each language
  const scores: Record<SupportedLanguage, number> = {
    en: 0, nl: 0, fr: 0, de: 0, es: 0, pt: 0, it: 0,
  };
  
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        scores[lang as SupportedLanguage] += 1;
      }
    }
  }
  
  // Also check month names (strong language indicator)
  const monthScores: Record<SupportedLanguage, number> = {
    en: 0, nl: 0, fr: 0, de: 0, es: 0, pt: 0, it: 0,
  };
  
  // Dutch-specific months
  if (/\bmrt\b|\bmei\b|\bokt\b/i.test(lowerText)) monthScores.nl += 2;
  
  // French-specific months
  if (/\bfév\b|\bavr\b|\baoû\b|\bdéc\b/i.test(lowerText)) monthScores.fr += 2;
  
  // German-specific months
  if (/\bmär\b|\bmrz\b|\bdez\b/i.test(lowerText)) monthScores.de += 2;
  
  // Spanish-specific months
  if (/\bene\b|\babr\b|\bago\b|\bdic\b/i.test(lowerText)) monthScores.es += 2;
  
  // Italian-specific months
  if (/\bgen\b|\bmag\b|\bgiu\b|\blug\b|\bott\b/i.test(lowerText)) monthScores.it += 2;
  
  // Portuguese-specific months
  if (/\bout\b/i.test(lowerText) && /\bsetembro\b|\bnovembro\b/i.test(lowerText)) monthScores.pt += 2;
  
  // Combine scores
  for (const lang of Object.keys(scores) as SupportedLanguage[]) {
    scores[lang] += monthScores[lang];
  }
  
  // Find highest score
  let bestLang: SupportedLanguage = 'en';
  let bestScore = 0;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang as SupportedLanguage;
    }
  }
  
  return bestLang;
}

/**
 * Get transaction groups (transactions with their continuation lines)
 */
export function getTransactionGroups(lines: TokenizedLine[]): TokenizedLine[][] {
  const groups: TokenizedLine[][] = [];
  let currentGroup: TokenizedLine[] = [];
  
  for (const line of lines) {
    if (line.startsTransaction) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [line];
    } else if (currentGroup.length > 0) {
      currentGroup.push(line);
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}
