// src/modules/local-text-parser/header-parser.ts
// Extract header information from Flying Blue PDF text
// Includes: member name, number, status, miles, XP, UXP, export date

import type { ParsedHeader, DetectedLanguage } from './types';
import {
  HEADER_PATTERN_NL,
  HEADER_PATTERN_EN,
  HEADER_PATTERN_FR,
  FB_NUMBER_PATTERN,
  MEMBER_NAME_PATTERN,
  STATUS_PATTERN,
  PAGE_INFO_PATTERN,
  LANGUAGE_INDICATORS,
  ALL_MONTHS,
} from './patterns';

/**
 * Detect the language of the PDF content
 */
export function detectLanguage(text: string): DetectedLanguage {
  const scores: Record<DetectedLanguage, number> = { nl: 0, en: 0, fr: 0, de: 0 };
  
  for (const [lang, patterns] of Object.entries(LANGUAGE_INDICATORS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[lang as DetectedLanguage] += 1;
      }
    }
  }
  
  // Find highest scoring language
  let maxLang: DetectedLanguage = 'nl';
  let maxScore = 0;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxLang = lang as DetectedLanguage;
    }
  }
  
  return maxLang;
}

/**
 * Parse a Dutch/English/French date string to ISO format
 * Examples: "10 dec 2025", "9 nov 2025", "11 december 2025"
 */
export function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  const trimmed = dateStr.trim();
  const lower = trimmed.toLowerCase();
  
  // Already ISO format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
    return lower;
  }
  
  // Try to match "DD month YYYY" format (Dutch: "9 dec 2025")
  const matchNL = lower.match(/^(\d{1,2})\s+([a-zéûä]+)\s+(\d{4})$/i);
  if (matchNL) {
    const day = matchNL[1].padStart(2, '0');
    const monthName = matchNL[2].toLowerCase();
    const year = matchNL[3];
    
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try to match "Month DD, YYYY" format (English: "Dec 9, 2025")
  const matchEN = lower.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (matchEN) {
    const monthName = matchEN[1].toLowerCase();
    const day = matchEN[2].padStart(2, '0');
    const year = matchEN[3];
    
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try DD/MM/YYYY format
  const slashMatch = lower.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  console.warn('[HeaderParser] Could not parse date:', dateStr);
  return '';
}

/**
 * Extract the main header totals from PDF text
 */
function extractHeaderTotals(text: string): { miles: number; xp: number; uxp: number } | null {
  // Try Dutch pattern first (most common)
  let match = text.match(HEADER_PATTERN_NL);
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
      uxp: parseInt(match[3], 10) || 0,
    };
  }
  
  // Try English pattern
  match = text.match(HEADER_PATTERN_EN);
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
      uxp: parseInt(match[3], 10) || 0,
    };
  }
  
  // Try French pattern
  match = text.match(HEADER_PATTERN_FR);
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
      uxp: parseInt(match[3], 10) || 0,
    };
  }
  
  return null;
}

/**
 * Extract Flying Blue member number
 */
function extractMemberNumber(text: string): string | null {
  const match = text.match(FB_NUMBER_PATTERN);
  return match ? match[1] : null;
}

/**
 * Extract member name (uppercase name in header area)
 */
function extractMemberName(text: string): string | null {
  // Look in the first ~500 chars for the name
  const headerArea = text.slice(0, 500);
  
  // Find lines that are all uppercase and look like names
  const lines = headerArea.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip if too short or too long
    if (trimmed.length < 3 || trimmed.length > 50) continue;
    
    // Skip if contains numbers or special chars (except space and hyphen)
    if (/[0-9@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]/.test(trimmed)) continue;
    
    // Check if it's all uppercase letters, spaces, and hyphens
    if (/^[A-Z][A-Z\s-]+[A-Z]$/.test(trimmed)) {
      // Exclude status levels and common headers
      if (/^(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)$/i.test(trimmed)) continue;
      if (/^(FLYING|BLUE|MILES|ACTIVITY|PAGE|PAGINA)$/i.test(trimmed)) continue;
      
      return trimmed;
    }
  }
  
  return null;
}

/**
 * Extract status level
 */
function extractStatus(text: string): 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate' {
  const match = text.match(STATUS_PATTERN);
  if (match) {
    const status = match[1].toLowerCase();
    switch (status) {
      case 'explorer': return 'Explorer';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      case 'platinum': return 'Platinum';
      case 'ultimate': return 'Ultimate';
    }
  }
  return 'Explorer';  // Default
}

/**
 * Extract export/PDF generation date
 */
function extractExportDate(text: string): string {
  // Look for page info pattern which contains the date
  const match = text.match(PAGE_INFO_PATTERN);
  if (match) {
    const dateStr = match[1];
    const isoDate = parseDateToISO(dateStr);
    if (isoDate) return isoDate;
  }
  
  // Fallback: look for any date in the first part of the text
  const headerArea = text.slice(0, 1000);
  const dateMatch = headerArea.match(/(\d{1,2})\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|oct|nov|dec|januari|februari|maart|april|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})/i);
  
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthName = dateMatch[2].toLowerCase();
    const year = dateMatch[3];
    const month = ALL_MONTHS[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Last resort: use today's date
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse the complete header from PDF text
 */
export function parseHeader(text: string): ParsedHeader {
  const language = detectLanguage(text);
  const totals = extractHeaderTotals(text);
  
  return {
    memberName: extractMemberName(text),
    memberNumber: extractMemberNumber(text),
    currentStatus: extractStatus(text),
    totalMiles: totals?.miles ?? 0,
    totalXp: totals?.xp ?? 0,
    totalUxp: totals?.uxp ?? 0,
    exportDate: extractExportDate(text),
    language,
  };
}

/**
 * Debug helper: log all extracted header info
 */
export function debugHeader(text: string): void {
  const header = parseHeader(text);
  console.log('[HeaderParser] Extracted header:', {
    memberName: header.memberName,
    memberNumber: header.memberNumber,
    status: header.currentStatus,
    miles: header.totalMiles,
    xp: header.totalXp,
    uxp: header.totalUxp,
    exportDate: header.exportDate,
    language: header.language,
  });
}
