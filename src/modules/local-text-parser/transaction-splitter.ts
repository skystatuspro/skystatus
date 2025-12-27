// src/modules/local-text-parser/transaction-splitter.ts
// Split raw PDF text into individual transaction blocks
// Each block represents one transaction (flight, miles activity, XP event, etc.)

import type { RawTransactionBlock, ClassifiedTransaction, TransactionType } from './types';
import { 
  TRANSACTION_TYPE_PATTERNS, 
  MILES_XP_SINGLE,
  ACTIVITY_DATE_PATTERN,
  ACTIVITY_DATE_PATTERN_NL,
  ACTIVITY_DATE_PATTERN_EN,
  PAGE_HEADER_FOOTER_PATTERNS,
  ALL_MONTHS,
} from './patterns';
import { parseDateToISO } from './header-parser';

/**
 * Pattern to match transaction header lines
 * Format NL: "10 dec 2025 Description 367 Miles 0 XP" or "18 nov 2025 -180000 Miles 0 XP"
 * Format EN: "Dec 9, 2025 Description 367 Miles 0 XP"
 * Format DE: "10. Dez. 2025 Description 367 Meilen 0 XP"
 * Note: Miles can be negative for redemptions/award bookings
 * Note: Description can be empty for award bookings (just date + miles)
 * Note: German uses "Meilen" instead of "Miles"
 */
// DMY format: day month year (e.g., "10 dec 2025", "10. Dez. 2025")
// Supports: Dutch, French, German, Spanish, Italian, Portuguese
// Month may have trailing dot in German (Dez.)
const TRANSACTION_HEADER_PATTERN_DMY = /^(\d{1,2}\.?\s+[a-zéûäçãõ]+\.?\s+\d{4})\s+(.+?)\s+(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

// MDY format: Month day, year (e.g., "Dec 9, 2025")
// Supports: English (US/Canada)
const TRANSACTION_HEADER_PATTERN_MDY = /^([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

// Legacy aliases for compatibility
const TRANSACTION_HEADER_PATTERN_NL = TRANSACTION_HEADER_PATTERN_DMY;
const TRANSACTION_HEADER_PATTERN_EN = TRANSACTION_HEADER_PATTERN_MDY;

/**
 * Pattern for transactions without description (award bookings)
 * Format DMY: "18 nov 2025 -180000 Miles 0 XP" or "18. Nov. 2025 -180000 Meilen 0 XP"
 * Format MDY: "Nov 18, 2025 -180000 Miles 0 XP"
 */
const TRANSACTION_HEADER_NO_DESC_PATTERN_DMY = /^(\d{1,2}\.?\s+[a-zéûäçãõ]+\.?\s+\d{4})\s+(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;
const TRANSACTION_HEADER_NO_DESC_PATTERN_MDY = /^([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})\s+(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

// Legacy aliases
const TRANSACTION_HEADER_NO_DESC_PATTERN_NL = TRANSACTION_HEADER_NO_DESC_PATTERN_DMY;
const TRANSACTION_HEADER_NO_DESC_PATTERN_EN = TRANSACTION_HEADER_NO_DESC_PATTERN_MDY;

/**
 * Try to match a transaction header line against both NL and EN patterns
 */
function matchTransactionHeader(line: string): RegExpMatchArray | null {
  return line.match(TRANSACTION_HEADER_PATTERN_NL) || line.match(TRANSACTION_HEADER_PATTERN_EN);
}

function matchTransactionHeaderNoDesc(line: string): RegExpMatchArray | null {
  return line.match(TRANSACTION_HEADER_NO_DESC_PATTERN_NL) || line.match(TRANSACTION_HEADER_NO_DESC_PATTERN_EN);
}

/**
 * Check if a line is a page header/footer that should be skipped
 */
function isPageHeaderFooter(line: string): boolean {
  const trimmed = line.trim();
  
  for (const pattern of PAGE_HEADER_FOOTER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Also skip lines that are just a member name (all caps)
  if (/^[A-Z][A-Z\s-]+[A-Z]$/.test(trimmed) && trimmed.length < 50) {
    // But not if it contains common transaction words
    if (!/MILES|XP|FLIGHT|HOTEL|AMAZON|EXPRESS/i.test(trimmed)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a line starts a new transaction
 */
function isTransactionStart(line: string): boolean {
  const trimmed = line.trim();
  
  // Must match pattern: date + description + miles + xp (or date + miles + xp for award bookings)
  return matchTransactionHeader(trimmed) !== null || matchTransactionHeaderNoDesc(trimmed) !== null;
}

/**
 * Extract activity date from text
 * Supports multiple language prefixes:
 * - Dutch: "op 21 nov 2025"
 * - English: "on Nov 21, 2025" or "on 21 Nov 2025"
 * - French: "le 21 nov 2025"
 * - German: "am 21. Nov 2025"
 * - Spanish: "el 21 nov 2025"
 * - Italian: "il 21 nov 2025"
 * - Portuguese: "em 21 nov 2025"
 */
function extractActivityDate(text: string): string | null {
  // Try DMY format first: "op 21 nov 2025" / "le 21 nov 2025" / "am 21. Nov 2025" etc.
  ACTIVITY_DATE_PATTERN_NL.lastIndex = 0;
  const matchDMY = ACTIVITY_DATE_PATTERN_NL.exec(text);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, '0');
    const monthName = matchDMY[2].toLowerCase();
    const year = matchDMY[3];
    
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try MDY format: "on Dec 2, 2025"
  ACTIVITY_DATE_PATTERN_EN.lastIndex = 0;
  const matchMDY = ACTIVITY_DATE_PATTERN_EN.exec(text);
  if (matchMDY) {
    const monthName = matchMDY[1].toLowerCase();
    const day = matchMDY[2].padStart(2, '0');
    const year = matchMDY[3];
    
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

/**
 * Parse a transaction header line
 */
function parseTransactionHeader(line: string): {
  postingDate: string;
  description: string;
  miles: number;
  xp: number;
  uxp: number;
} | null {
  const trimmed = line.trim();
  
  // Try pattern with description first (both NL and EN formats)
  let match = matchTransactionHeader(trimmed);
  if (match) {
    return {
      postingDate: parseDateToISO(match[1]),
      description: match[2].trim(),
      miles: parseInt(match[3], 10) || 0,
      xp: parseInt(match[4], 10) || 0,
      uxp: parseInt(match[5], 10) || 0,
    };
  }
  
  // Try pattern without description (award bookings like "-180000 Miles")
  match = matchTransactionHeaderNoDesc(trimmed);
  if (match) {
    return {
      postingDate: parseDateToISO(match[1]),
      description: '',  // No description for award bookings
      miles: parseInt(match[2], 10) || 0,
      xp: parseInt(match[3], 10) || 0,
      uxp: parseInt(match[4], 10) || 0,
    };
  }
  
  return null;
}

/**
 * Split text into raw transaction blocks
 */
export function splitIntoTransactionBlocks(text: string): RawTransactionBlock[] {
  const blocks: RawTransactionBlock[] = [];
  const lines = text.split('\n');
  
  let currentBlock: string[] = [];
  let currentPostingDate = '';
  let blockStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip page headers/footers
    if (isPageHeaderFooter(line)) continue;
    
    // Check if this starts a new transaction
    if (isTransactionStart(trimmed)) {
      // Save previous block if exists
      if (currentBlock.length > 0 && currentPostingDate) {
        const blockText = currentBlock.join('\n');
        const activityDate = extractActivityDate(blockText);
        
        blocks.push({
          text: blockText,
          postingDate: currentPostingDate,
          activityDate,
          lineNumber: blockStartLine,
        });
      }
      
      // Start new block
      const header = parseTransactionHeader(trimmed);
      currentPostingDate = header?.postingDate || '';
      currentBlock = [trimmed];
      blockStartLine = i + 1;  // 1-indexed for user display
    } else if (currentBlock.length > 0) {
      // Add to current block
      currentBlock.push(trimmed);
    }
  }
  
  // Don't forget the last block
  if (currentBlock.length > 0 && currentPostingDate) {
    const blockText = currentBlock.join('\n');
    const activityDate = extractActivityDate(blockText);
    
    blocks.push({
      text: blockText,
      postingDate: currentPostingDate,
      activityDate,
      lineNumber: blockStartLine,
    });
  }
  
  return blocks;
}

/**
 * Classify a transaction block by type
 */
export function classifyTransaction(block: RawTransactionBlock): ClassifiedTransaction {
  const text = block.text.toLowerCase();
  
  // Sort patterns by priority (highest first)
  const sortedPatterns = [...TRANSACTION_TYPE_PATTERNS].sort((a, b) => b.priority - a.priority);
  
  for (const typePattern of sortedPatterns) {
    for (const pattern of typePattern.patterns) {
      if (pattern.test(block.text)) {
        return {
          ...block,
          type: typePattern.type as TransactionType,
          confidence: 0.9,  // High confidence for pattern match
        };
      }
    }
  }
  
  // Check for flight patterns that might not match specific types
  // (catches edge cases)
  if (/[A-Z]{3}\s*[-–—]\s*[A-Z]{3}/.test(block.text)) {
    return {
      ...block,
      type: 'FLIGHT_PARTNER',  // Default flight type
      confidence: 0.6,
    };
  }
  
  // Default to OTHER
  return {
    ...block,
    type: 'OTHER',
    confidence: 0.3,
  };
}

/**
 * Split and classify all transactions in text
 */
export function splitAndClassifyTransactions(text: string): ClassifiedTransaction[] {
  const blocks = splitIntoTransactionBlocks(text);
  return blocks.map(classifyTransaction);
}

/**
 * Group transactions by type for debugging/analysis
 */
export function groupTransactionsByType(transactions: ClassifiedTransaction[]): Record<TransactionType, ClassifiedTransaction[]> {
  const groups: Record<string, ClassifiedTransaction[]> = {};
  
  for (const tx of transactions) {
    if (!groups[tx.type]) {
      groups[tx.type] = [];
    }
    groups[tx.type].push(tx);
  }
  
  return groups as Record<TransactionType, ClassifiedTransaction[]>;
}

/**
 * Debug helper: print transaction summary
 */
export function debugTransactionSummary(transactions: ClassifiedTransaction[]): void {
  const groups = groupTransactionsByType(transactions);
  
  console.log('[TransactionSplitter] Transaction summary:');
  console.log(`  Total: ${transactions.length}`);
  
  for (const [type, txs] of Object.entries(groups)) {
    console.log(`  ${type}: ${txs.length}`);
  }
}
