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
 * PDF Parser
 * 
 * Converts PDF file to raw text and orchestrates all extractors.
 * This is the entry point for PDF parsing.
 * 
 * @module core/parser
 */

import * as pdfjs from 'pdfjs-dist';
import type { 
  PdfImportResult, 
  PdfImportOptions,
  ParsedFlight,
  ParsedMiles,
  DetectedStatus,
  ImportConflict,
  ImportSummary,
  PdfMetadata,
  SupportedLanguage,
  FlightRecord,
  MilesRecord,
  MilesSources
} from '../types';
import { tokenize, detectLanguage } from './tokenizer';
import { extractFlights } from './flight-extractor';
import { extractMiles } from './miles-extractor';
import { extractXP, type XPExtractionResult } from './xp-extractor';
import { detectStatus } from './status-detector';
import { extractBalances, toOfficialBalances } from './balance-extractor';
import { parseDate } from '../utils/date-parser';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

/**
 * Parse a Flying Blue PDF file
 * 
 * @param file - The PDF file to parse
 * @param options - Import options
 * @returns Parsed result with all extracted data
 */
export async function parsePdf(
  file: File,
  options: PdfImportOptions
): Promise<PdfImportResult> {
  try {
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Extract text from all pages
    let fullText = '';
    const pageCount = pdf.numPages;
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    // Parse the extracted text
    const result = parsePdfText(fullText, options);
    
    // Update metadata with page count
    result.meta.pdfPageCount = pageCount;
    
    return result;
  } catch (error) {
    return createErrorResult(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse raw text from a Flying Blue PDF
 * Used when text is already extracted (e.g., from copy-paste)
 * 
 * @param text - Raw PDF text
 * @param options - Import options
 * @returns Parsed result
 */
export function parsePdfText(
  text: string,
  options: PdfImportOptions
): PdfImportResult {
  const warnings: string[] = [];
  
  try {
    // Detect language first
    const language = detectLanguage(text);
    
    // Split into raw lines for extractors
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Tokenize for status detection
    const tokenized = tokenize(text);
    
    // Extract all data using specialized extractors
    const flights = extractFlights(rawLines, language);
    const miles = extractMiles(rawLines, language);
    const xpResult = extractXP(rawLines, flights, language);
    const status = detectStatus(tokenized.lines, language);
    const balances = extractBalances(tokenized.lines, language);
    
    // Mark duplicates in flights
    markDuplicates(flights, options.existingFlights);
    
    // Mark changes in miles
    markMilesChanges(miles, options.existingMiles);
    
    // Calculate XP breakdown
    const flightXP = flights.reduce((sum, f) => sum + f.earnedXP, 0);
    const safXP = flights.reduce((sum, f) => sum + f.safXP, 0);
    const bonusXP = Object.values(xpResult.bonusXpByMonth).reduce((sum, xp) => sum + xp, 0);
    const officialXP = balances.xp ?? (flightXP + safXP + bonusXP);
    
    // Build summary
    const summary = buildSummary(flights, miles, xpResult, balances);
    
    // Build metadata
    const meta: PdfMetadata = {
      language,
      detectedCurrency: options.userCurrency,
      parseDate: new Date().toISOString(),
      pdfPageCount: 0, // Will be set by parsePdf if from file
      warnings,
    };
    
    return {
      success: true,
      flights,
      miles,
      status,
      xp: {
        official: officialXP,
        fromFlights: flightXP,
        fromSaf: safXP,
        fromBonus: bonusXP,
        discrepancy: officialXP - (flightXP + safXP + bonusXP),
      },
      uxp: {
        detected: balances.uxp !== null,
        official: balances.uxp ?? 0,
        fromFlights: flights.reduce((sum, f) => sum + f.uxp, 0),
      },
      officialMilesBalance: balances.miles,
      conflicts: [], // Will be populated by conflict-detector
      summary,
      meta,
    };
  } catch (error) {
    return createErrorResult(`Failed to parse PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark flights as duplicates if they match existing flights
 */
function markDuplicates(
  flights: ParsedFlight[],
  existingFlights: FlightRecord[]
): void {
  for (const flight of flights) {
    // Check for exact match (same date + route)
    const exactMatch = existingFlights.find(
      e => e.date === flight.date && e.route === flight.route
    );
    
    if (exactMatch) {
      flight.status = 'duplicate';
      flight.matchedExistingId = exactMatch.id;
      flight.matchConfidence = 1.0;
      continue;
    }
    
    // Check for fuzzy match (same route, date within 1 day)
    const fuzzyMatch = existingFlights.find(e => {
      if (e.route !== flight.route) return false;
      const dayDiff = Math.abs(
        new Date(e.date).getTime() - new Date(flight.date).getTime()
      ) / (1000 * 60 * 60 * 24);
      return dayDiff <= 1;
    });
    
    if (fuzzyMatch) {
      flight.status = 'fuzzy_match';
      flight.matchedExistingId = fuzzyMatch.id;
      flight.matchConfidence = 0.8;
      continue;
    }
    
    flight.status = 'new';
  }
}

/**
 * Mark miles records with changes compared to existing data
 */
function markMilesChanges(
  miles: ParsedMiles[],
  existingMiles: MilesRecord[]
): void {
  for (const record of miles) {
    const existing = existingMiles.find(e => e.month === record.month);
    
    if (!existing) {
      record.status = 'new';
      continue;
    }
    
    record.existingRecordId = existing.month;
    
    // Check for differences
    const changes: Array<{ field: keyof MilesSources | 'debit'; oldValue: number; newValue: number }> = [];
    
    if (existing.flightMiles !== record.sources.flights.miles) {
      changes.push({ field: 'flights', oldValue: existing.flightMiles, newValue: record.sources.flights.miles });
    }
    if (existing.subscriptionMiles !== record.sources.subscription.miles) {
      changes.push({ field: 'subscription', oldValue: existing.subscriptionMiles, newValue: record.sources.subscription.miles });
    }
    if (existing.amexMiles !== record.sources.creditCard.miles) {
      changes.push({ field: 'creditCard', oldValue: existing.amexMiles, newValue: record.sources.creditCard.miles });
    }
    if (existing.hotelMiles !== record.sources.hotel.miles) {
      changes.push({ field: 'hotel', oldValue: existing.hotelMiles, newValue: record.sources.hotel.miles });
    }
    if (existing.milesDebit !== record.debit) {
      changes.push({ field: 'debit', oldValue: existing.milesDebit, newValue: record.debit });
    }
    
    if (changes.length > 0) {
      record.status = 'has_changes';
      record.changes = changes;
    } else {
      record.status = 'unchanged';
    }
  }
}

/**
 * Build import summary from extracted data
 */
function buildSummary(
  flights: ParsedFlight[],
  miles: ParsedMiles[],
  xpResult: XPExtractionResult,
  balances: ReturnType<typeof extractBalances>
): ImportSummary {
  const allDates = flights.map(f => f.date).filter(Boolean).sort();
  
  return {
    flights: {
      total: flights.length,
      new: flights.filter(f => f.status === 'new').length,
      duplicates: flights.filter(f => f.status === 'duplicate').length,
      conflicts: flights.filter(f => f.status === 'fuzzy_match').length,
    },
    miles: {
      total: miles.length,
      new: miles.filter(m => m.status === 'new').length,
      updated: miles.filter(m => m.status === 'has_changes').length,
      unchanged: miles.filter(m => m.status === 'unchanged').length,
    },
    xp: {
      total: xpResult.fromFlights + xpResult.fromSaf + xpResult.fromBonus,
      fromFlights: xpResult.fromFlights,
      fromSaf: xpResult.fromSaf,
      fromBonus: xpResult.fromBonus,
      official: balances.xp ?? 0,
    },
    uxp: {
      total: xpResult.totalUXP,
      official: balances.uxp ?? 0,
    },
    dateRange: {
      from: allDates[0] ?? '',
      to: allDates[allDates.length - 1] ?? '',
      months: new Set(flights.map(f => f.date.substring(0, 7))).size,
    },
  };
}

/**
 * Create an error result
 */
function createErrorResult(error: string): PdfImportResult {
  return {
    success: false,
    error,
    flights: [],
    miles: [],
    status: null,
    xp: { official: 0, fromFlights: 0, fromSaf: 0, fromBonus: 0, discrepancy: 0 },
    uxp: { detected: false, official: 0, fromFlights: 0 },
    officialMilesBalance: null,
    conflicts: [],
    summary: {
      flights: { total: 0, new: 0, duplicates: 0, conflicts: 0 },
      miles: { total: 0, new: 0, updated: 0, unchanged: 0 },
      xp: { total: 0, fromFlights: 0, fromSaf: 0, fromBonus: 0, official: 0 },
      uxp: { total: 0, official: 0 },
      dateRange: { from: '', to: '', months: 0 },
    },
    meta: {
      language: 'en',
      detectedCurrency: 'EUR',
      parseDate: new Date().toISOString(),
      pdfPageCount: 0,
      warnings: [error],
    },
  };
}
