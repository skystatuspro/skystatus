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
 * Number Parser
 * 
 * Parse numbers from various formats used in different locales.
 * Handles European (1.234,56) and US (1,234.56) formats.
 * 
 * @module utils/number-parser
 */

/**
 * Number format type
 */
export type NumberFormat = 'european' | 'us' | 'unknown';

/**
 * Detect the number format used in text
 * 
 * European: 1.234,56 (period = thousands, comma = decimal)
 * US: 1,234.56 (comma = thousands, period = decimal)
 */
export function detectNumberFormat(text: string): NumberFormat {
  // Look for patterns that definitively identify the format
  
  // European: has period followed by 3 digits, then comma
  if (/\d\.\d{3},\d/.test(text)) {
    return 'european';
  }
  
  // US: has comma followed by 3 digits, then period
  if (/\d,\d{3}\.\d/.test(text)) {
    return 'us';
  }
  
  // Just comma with 2 decimals is likely European
  if (/\d+,\d{2}$/.test(text) && !/\d+\.\d{2}$/.test(text)) {
    return 'european';
  }
  
  // Just period with 2 decimals is likely US
  if (/\d+\.\d{2}$/.test(text) && !/\d+,\d{2}$/.test(text)) {
    return 'us';
  }
  
  return 'unknown';
}

/**
 * Parse a number from text, handling various formats
 * 
 * @param text - Text containing a number
 * @param hint - Optional format hint
 * @returns Parsed number or null
 */
export function parseNumber(text: string, hint?: NumberFormat): number | null {
  if (!text) return null;
  
  // Remove any non-numeric characters except . , - +
  let cleaned = text.replace(/[^\d.,\-+]/g, '').trim();
  
  if (!cleaned) return null;
  
  // Handle negative numbers
  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/^[+-]/, '');
  
  // Detect format if no hint
  const format = hint || detectNumberFormat(cleaned);
  
  // Apply format-specific parsing
  if (format === 'european') {
    // 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (format === 'us') {
    // 1,234.56 -> 1234.56
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Unknown format - try to guess
    // If there's only one separator, figure out if it's decimal or thousands
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    
    if (dotCount === 1 && commaCount === 0) {
      // Single dot - check if it looks like a decimal
      if (/\.\d{1,2}$/.test(cleaned)) {
        // Likely decimal (e.g., 1234.56)
        // Keep as is
      } else if (/\.\d{3}$/.test(cleaned)) {
        // Likely thousands separator (e.g., 1.234)
        cleaned = cleaned.replace('.', '');
      }
    } else if (commaCount === 1 && dotCount === 0) {
      // Single comma - check if it looks like a decimal
      if (/,\d{1,2}$/.test(cleaned)) {
        // Likely decimal (e.g., 1234,56)
        cleaned = cleaned.replace(',', '.');
      } else if (/,\d{3}$/.test(cleaned)) {
        // Likely thousands separator (e.g., 1,234)
        cleaned = cleaned.replace(',', '');
      }
    } else {
      // Multiple separators - guess based on position
      // Last separator is probably decimal if followed by 1-2 digits
      const lastDot = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');
      
      if (lastDot > lastComma && /\.\d{1,2}$/.test(cleaned)) {
        // Period is decimal
        cleaned = cleaned.replace(/,/g, '');
      } else if (lastComma > lastDot && /,\d{1,2}$/.test(cleaned)) {
        // Comma is decimal
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Just remove all separators
        cleaned = cleaned.replace(/[.,]/g, '');
      }
    }
  }
  
  const result = parseFloat(cleaned);
  
  if (isNaN(result)) return null;
  
  return isNegative ? -result : result;
}

/**
 * Parse an integer from text
 */
export function parseInteger(text: string): number | null {
  const num = parseNumber(text);
  return num !== null ? Math.round(num) : null;
}

/**
 * Parse XP value from text
 * XP is always a whole number
 */
export function parseXP(text: string): number | null {
  // Remove "XP" text and parse as integer
  const cleaned = text.replace(/xp/gi, '').trim();
  return parseInteger(cleaned);
}

/**
 * Parse Miles value from text
 * Miles is always a whole number
 */
export function parseMiles(text: string): number | null {
  // Remove "Miles" text and parse as integer
  const cleaned = text.replace(/miles?/gi, '').trim();
  return parseInteger(cleaned);
}

/**
 * Format a number for display
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Check if a string contains a number
 */
export function containsNumber(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Extract all numbers from a string
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/[\d.,]+/g) || [];
  return matches
    .map(m => parseNumber(m))
    .filter((n): n is number => n !== null);
}
