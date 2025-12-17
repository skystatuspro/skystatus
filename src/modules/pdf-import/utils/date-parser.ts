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
 * Date Parser
 * 
 * Multi-format date parsing for Flying Blue PDFs.
 * Handles various date formats across all 7 supported languages.
 * 
 * Universal parser that handles virtually any date format:
 * - European text: "30 nov 2025", "30 november 2025"
 * - North American text: "Dec 9, 2025", "December 9 2025"
 * - European numeric: "30-11-2025", "30/11/2025", "30.11.2025"
 * - US numeric: "12/9/2025", "12-9-2025"
 * - ISO: "2025-11-30", "2025/11/30"
 * - Any language month names
 * 
 * @module utils/date-parser
 */

import { findMonth, MONTH_MAP } from '../locales/month-patterns';

/**
 * Parsed date result
 */
export interface ParsedDate {
  /** Full date in YYYY-MM-DD format */
  full: string;
  /** Year */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Day (1-31) */
  day: number;
  /** Month in YYYY-MM format */
  monthKey: string;
}

/**
 * Parse a date string into a standardized format
 * 
 * @param dateStr - Text containing a date
 * @returns Parsed date or null if parsing fails
 */
export function parseDate(dateStr: string): ParsedDate | null {
  if (!dateStr) return null;
  
  // Clean input: remove commas, normalize whitespace
  const cleaned = dateStr.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  
  // Strategy 1: Pure numeric formats (e.g., "30/11/2025", "2025-11-30", "12.9.2025")
  const numericMatch = cleaned.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (numericMatch) {
    const [, a, b, c] = numericMatch.map(x => parseInt(x, 10)) as [string, number, number, number];
    
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
    const full = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    return { full, year, month, day, monthKey };
  }
  
  return null;
}

/**
 * Check if a string looks like it starts with a date
 * Very permissive - just needs to have date-like components
 */
export function looksLikeDate(str: string): boolean {
  if (!str) return false;
  
  const s = str.toLowerCase();
  
  // Must contain at least one digit
  if (!/\d/.test(s)) return false;
  
  // Check for common date patterns
  // Has month name?
  const monthWords = Object.keys(MONTH_MAP);
  const hasMonthWord = monthWords.some(m => s.includes(m));
  
  // Has numeric separators (/, -, .)?
  const hasDateSeparators = /\d+[/.-]\d+[/.-]\d+/.test(s);
  
  // Has day + month or month + day pattern?
  const hasDayMonth = /\d{1,2}\s+\w{3,}|\w{3,}\s+\d{1,2}/.test(s);
  
  return hasMonthWord || hasDateSeparators || hasDayMonth;
}

/**
 * Extract month key (YYYY-MM) from a date string
 */
export function extractMonthKey(dateStr: string): string | null {
  const parsed = parseDate(dateStr);
  return parsed ? parsed.monthKey : null;
}

/**
 * Compare two dates (for sorting)
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is within a range of another date
 */
export function isWithinDays(date1: string, date2: string, days: number): boolean {
  return daysBetween(date1, date2) <= days;
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a date for display
 */
export function formatDate(date: string, locale: string = 'en'): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return date;
  }
}

/**
 * Get the month before a given month
 */
export function getPreviousMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Get the month after a given month
 */
export function getNextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
