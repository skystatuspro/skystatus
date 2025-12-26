// src/modules/local-text-parser/transaction-splitter.ts
// Split raw PDF text into individual transaction blocks
// Each block represents one transaction (flight, miles activity, XP event, etc.)

import type { RawTransactionBlock, ClassifiedTransaction, TransactionType } from './types';
import { 
  TRANSACTION_TYPE_PATTERNS, 
  MILES_XP_SINGLE,
  ACTIVITY_DATE_PATTERN,
  PAGE_HEADER_FOOTER_PATTERNS,
  ALL_MONTHS,
} from './patterns';
import { parseDateToISO } from './header-parser';

/**
 * Pattern to match transaction header lines
 * Format NL: "10 dec 2025 Description 367 Miles 0 XP" or "18 nov 2025 -180000 Miles 0 XP"
 * Format EN: "Dec 9, 2025 Description 367 Miles 0 XP"
 * Note: Miles can be negative for redemptions/award bookings
 * Note: Description can be empty for award bookings (just date + miles)
 */
// Dutch format: day month year (e.g., "10 dec 2025")
const TRANSACTION_HEADER_PATTERN_NL = /^(\d{1,2}\s+[a-zéû]+\s+\d{4})\s+(.+?)\s+(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

// English format: Month day, year (e.g., "Dec 9, 2025")
const TRANSACTION_HEADER_PATTERN_EN = /^([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

/**
 * Pattern for transactions without description (award bookings)
 * Format NL: "18 nov 2025 -180000 Miles 0 XP"
 * Format EN: "Nov 18, 2025 -180000 Miles 0 XP"
 */
const TRANSACTION_HEADER_NO_DESC_PATTERN_NL = /^(\d{1,2}\s+[a-zéû]+\s+\d{4})\s+(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;
const TRANSACTION_HEADER_NO_DESC_PATTERN_EN = /^([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?$/i;

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
 * Extract activity date from text (the "op XX XXX XXXX" or "on Month DD, YYYY" pattern)
 */
function extractActivityDate(text: string): string | null {
  // Reset lastIndex for global regex
  ACTIVITY_DATE_PATTERN.lastIndex = 0;
  
  // Try Dutch format first: "op 21 nov 2025"
  const matchNL = ACTIVITY_DATE_PATTERN.exec(text);
  if (matchNL) {
    const day = matchNL[1].padStart(2, '0');
    const monthName = matchNL[2].toLowerCase();
    const year = matchNL[3];
    
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try English format: "on Dec 2, 2025"
  const enPattern = /on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i;
  const matchEN = text.match(enPattern);
  if (matchEN) {
    const monthName = matchEN[1].toLowerCase();
    const day = matchEN[2].padStart(2, '0');
    const year = matchEN[3];
    
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
