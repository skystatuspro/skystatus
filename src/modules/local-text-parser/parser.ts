// src/modules/local-text-parser/parser.ts
// Main parser function for local text parsing
// Produces AIParsedResult for drop-in compatibility with AI parser

import type { 
  LocalParserOptions, 
  LocalParserResult, 
  AIParsedResult,
  AIRawResponse,
  AIRawFlight,
  AIRawMilesActivity,
  AIRawStatusEvent,
  ClassifiedTransaction,
} from './types';
import type { FlightRecord, ActivityTransaction, MilesRecord } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import type { PdfHeader } from '../ai-pdf-parser/converter';

import { validateInput } from './validator';
import { parseHeader, detectLanguage } from './header-parser';
import { splitAndClassifyTransactions, debugTransactionSummary } from './transaction-splitter';
import { parseFlightTransactions } from './flight-parser';
import { parseActivityTransactions } from './activity-parser';
import { parseStatusEvents, detectQualificationSettingsFromEvents } from './xp-event-parser';
import { normalizeText, needsNormalization } from './text-normalizer';
import {
  convertToFlightRecords,
  convertToActivityTransactionRecords,
  convertToMilesRecords,
  extractBonusXpByMonth,
  createPdfHeaderFromParsed,
  createRawResponse,
  calculateMilesReconciliation,
} from './converter';

/**
 * Parse Flying Blue PDF text locally
 * 
 * @param text - Raw text from copy-paste
 * @param options - Parser options
 * @returns Parsed result or error
 */
export async function localParseText(
  text: string,
  options: LocalParserOptions = {}
): Promise<LocalParserResult> {
  const startTime = performance.now();
  const debug = options.debug ?? false;
  
  if (debug) {
    console.log('[LocalParser] Starting parse');
    console.log('[LocalParser] Text length:', text.length);
  }
  
  try {
    // Step 1: Validate input
    const validation = validateInput(text);
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('. '),
          details: validation,
        },
      };
    }
    
    if (debug && validation.warnings.length > 0) {
      console.log('[LocalParser] Warnings:', validation.warnings);
    }
    
    // Step 1.5: Normalize text if needed (handles PDF extraction line breaks)
    let normalizedText = text;
    if (needsNormalization(text)) {
      if (debug) {
        console.log('[LocalParser] Text needs normalization (PDF extraction format detected)');
      }
      normalizedText = normalizeText(text);
      if (debug) {
        console.log('[LocalParser] Normalized text length:', normalizedText.length);
      }
    }
    
    // Step 2: Parse header
    const header = parseHeader(normalizedText);
    if (debug) {
      console.log('[LocalParser] Header:', header);
    }
    
    // Step 3: Split and classify transactions
    const classifiedTransactions = splitAndClassifyTransactions(normalizedText);
    if (debug) {
      debugTransactionSummary(classifiedTransactions);
    }
    
    if (classifiedTransactions.length === 0) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'No transactions found in the text. Make sure you copied the entire PDF content.',
        },
      };
    }
    
    // Step 4: Parse flight transactions
    const rawFlights = parseFlightTransactions(
      classifiedTransactions.filter(t => 
        t.type === 'FLIGHT_KLM_AF' || 
        t.type === 'FLIGHT_PARTNER' || 
        t.type === 'FLIGHT_TRANSAVIA' ||
        t.type === 'FLIGHT_AWARD'
      )
    );
    if (debug) {
      console.log('[LocalParser] Parsed flights:', rawFlights.length);
    }
    
    // Step 5: Parse activity transactions (non-flight)
    // Note: FLIGHT_AWARD is special - also parse as redemption activity for the negative miles
    const activityBlocks = classifiedTransactions.filter(t => 
      !t.type.startsWith('FLIGHT_') && 
      t.type !== 'XP_ROLLOVER' && 
      t.type !== 'XP_DEDUCTION'
    );
    
    // Also add award bookings as redemption activities (for the total negative miles)
    const awardBlocks = classifiedTransactions.filter(t => t.type === 'FLIGHT_AWARD');
    for (const awardBlock of awardBlocks) {
      // Create a modified block for the redemption activity
      activityBlocks.push({
        ...awardBlock,
        type: 'UPGRADE',  // Treat as redemption
      });
    }
    
    const rawActivities = parseActivityTransactions(activityBlocks);
    if (debug) {
      console.log('[LocalParser] Parsed activities:', rawActivities.length);
    }
    
    // Step 6: Parse XP status events
    const statusEvents = parseStatusEvents(
      classifiedTransactions.filter(t => 
        t.type === 'XP_ROLLOVER' || 
        t.type === 'XP_DEDUCTION'
      )
    );
    if (debug) {
      console.log('[LocalParser] Status events:', statusEvents.length);
    }
    
    // Step 7: Detect qualification settings from XP events
    const qualificationSettings = detectQualificationSettingsFromEvents(
      statusEvents,
      header.currentStatus
    );
    if (debug) {
      console.log('[LocalParser] Qualification settings:', qualificationSettings);
    }
    
    // Step 8: Convert to app types
    const flights = convertToFlightRecords(rawFlights);
    const activityTransactions = convertToActivityTransactionRecords(
      rawActivities,
      header.exportDate
    );
    const milesRecords = convertToMilesRecords(rawActivities, rawFlights);
    const bonusXpByMonth = extractBonusXpByMonth(rawActivities, qualificationSettings);
    const pdfHeader = createPdfHeaderFromParsed(header);
    
    // Step 9: Create raw response (for compatibility)
    const rawResponse = createRawResponse(header, rawFlights, rawActivities, statusEvents);
    
    // Step 10: Calculate miles reconciliation
    const milesReconciliation = calculateMilesReconciliation(
      header.totalMiles,
      rawFlights,
      rawActivities
    );
    
    if (debug && milesReconciliation.needsCorrection) {
      console.log('[LocalParser] Miles reconciliation needed:', {
        headerBalance: milesReconciliation.headerBalance,
        parsedTotal: milesReconciliation.parsedTotal,
        difference: milesReconciliation.difference,
        oldestMonth: milesReconciliation.oldestMonth,
      });
    }
    
    // Calculate parse time
    const parseTimeMs = Math.round(performance.now() - startTime);
    
    // Build result
    const result: AIParsedResult = {
      flights,
      activityTransactions,
      milesRecords,
      pdfHeader,
      qualificationSettings,
      bonusXpByMonth,
      rawResponse,
      milesReconciliation,
      metadata: {
        parseTimeMs,
        model: 'local-text-parser-v1',
        tokensUsed: 0,  // No API calls
        language: header.language,
      },
    };
    
    if (debug) {
      console.log('[LocalParser] Complete:', {
        flights: flights.length,
        activities: activityTransactions.length,
        milesRecords: milesRecords.length,
        parseTimeMs,
      });
    }
    
    return {
      success: true,
      data: result,
    };
    
  } catch (error) {
    console.error('[LocalParser] Error:', error);
    
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred during parsing',
        details: error,
      },
    };
  }
}

/**
 * Quick validation check (for UI feedback)
 */
export { isLikelyFlyingBlueContent } from './validator';

/**
 * Export types for consumers
 */
export type { LocalParserOptions, LocalParserResult };
