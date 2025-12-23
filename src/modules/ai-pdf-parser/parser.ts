// src/modules/ai-pdf-parser/parser.ts
// Frontend AI parser - calls server-side API
// CLEAN VERSION - pdfHeader for preview only

import type { 
  AIRawResponse, 
  AIParsedResult, 
  AIParserOptions, 
  AIParserResult,
} from './types';
import {
  convertFlights,
  convertMilesRecords,
  extractBonusXpByMonth,
  detectQualificationSettings,
  createPdfHeader,
  validateConversion,
} from './converter';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TIMEOUT = 120000;

export async function aiParseFlyingBlue(
  pdfText: string,
  options: AIParserOptions = {}
): Promise<AIParserResult> {
  const startTime = performance.now();
  const model = options.model ?? DEFAULT_MODEL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const debug = options.debug ?? false;
  
  if (debug) {
    console.log('[AI Parser] Starting parse with model:', model);
    console.log('[AI Parser] PDF text length:', pdfText.length);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfText, model }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 429) {
        return {
          success: false,
          error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Please try again.', details: errorBody },
        };
      }
      
      if (response.status === 500 && errorBody.code === 'API_KEY_MISSING') {
        return {
          success: false,
          error: { code: 'API_ERROR', message: 'AI Parser not configured.', details: errorBody },
        };
      }
      
      return {
        success: false,
        error: { code: 'API_ERROR', message: errorBody.error || `Server error: ${response.status}`, details: errorBody },
      };
    }
    
    const responseData = await response.json();
    
    if (!responseData.success) {
      return {
        success: false,
        error: { code: 'PARSE_ERROR', message: responseData.error || 'Failed to parse PDF', details: responseData },
      };
    }
    
    const rawResponse: AIRawResponse = responseData.data;
    
    if (debug) {
      console.log('[AI Parser] Raw response:', rawResponse);
    }
    
    const validationResult = validateRawResponse(rawResponse);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid response structure', details: validationResult.errors },
      };
    }
    
    // Convert to app types
    const flights = convertFlights(rawResponse.flights);
    const milesRecords = convertMilesRecords(rawResponse.milesActivities, rawResponse.flights);
    const bonusXpByMonth = extractBonusXpByMonth(rawResponse.milesActivities);
    const qualificationSettings = detectQualificationSettings(
      rawResponse.statusEvents,
      rawResponse.header.currentStatus
    );
    const pdfHeader = createPdfHeader(rawResponse);
    
    const conversionValidation = validateConversion(flights, milesRecords, pdfHeader, bonusXpByMonth);
    
    if (debug && conversionValidation.warnings.length > 0) {
      console.log('[AI Parser] Warnings:', conversionValidation.warnings);
    }
    
    const parseTimeMs = Math.round(performance.now() - startTime);
    const language = detectLanguage(pdfText);
    
    const result: AIParsedResult = {
      flights,
      milesRecords,
      pdfHeader,
      qualificationSettings,
      bonusXpByMonth,
      rawResponse,
      metadata: {
        parseTimeMs,
        model,
        tokensUsed: responseData.metadata?.tokensUsed ?? 0,
        language,
      },
    };
    
    if (debug) {
      console.log('[AI Parser] Complete:', {
        flights: flights.length,
        milesRecords: milesRecords.length,
        parseTimeMs,
      });
    }
    
    return { success: true, data: result };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: `Timeout after ${Math.round(timeout / 1000)}s` },
      };
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network error. Check connection.' },
      };
    }
    
    return {
      success: false,
      error: { code: 'API_ERROR', message: error instanceof Error ? error.message : 'Unknown error', details: error },
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateRawResponse(response: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!response || typeof response !== 'object') {
    return { isValid: false, errors: ['Response is not an object'] };
  }
  
  const r = response as Record<string, unknown>;
  
  if (!r.header || typeof r.header !== 'object') {
    errors.push('Missing or invalid header');
  } else {
    const header = r.header as Record<string, unknown>;
    if (typeof header.totalMiles !== 'number') errors.push('Invalid header.totalMiles');
    if (typeof header.totalXp !== 'number') errors.push('Invalid header.totalXp');
    if (!header.currentStatus) errors.push('Missing header.currentStatus');
    if (!header.exportDate) errors.push('Missing header.exportDate');
  }
  
  if (!Array.isArray(r.flights)) errors.push('Missing flights array');
  if (!Array.isArray(r.milesActivities)) errors.push('Missing milesActivities array');
  if (!Array.isArray(r.statusEvents)) errors.push('Missing statusEvents array');
  
  return { isValid: errors.length === 0, errors };
}

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('vlucht') || lower.includes('aftrek')) return 'nl';
  if (lower.includes('vol ') || lower.includes('déduction')) return 'fr';
  if (lower.includes('flug') || lower.includes('abzug')) return 'de';
  return 'en';
}

export type { AIParserOptions, AIParserResult, AIParsedResult } from './types';
