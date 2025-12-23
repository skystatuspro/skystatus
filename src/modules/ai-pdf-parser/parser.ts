// src/modules/ai-pdf-parser/parser.ts
// Frontend AI parser - calls our server-side API (keeps OpenAI key secure)

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
  createPdfBaseline,
  validateConversion,
} from './converter';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TIMEOUT = 120000; // 120 seconds (AI parsing can take time)

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parse Flying Blue PDF text using our server-side AI API
 * 
 * The API key is stored securely on the server - never exposed to frontend
 * 
 * @param pdfText - Extracted text from PDF
 * @param options - Parser options (model, timeout, debug)
 * @returns Parsed result or error
 */
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
    // Call our server-side API (key is stored there securely)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfText,
        model,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'Rate limit exceeded. Please try again in a moment.',
            details: errorBody,
          },
        };
      }
      
      if (response.status === 500 && errorBody.code === 'API_KEY_MISSING') {
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'AI Parser is not configured. Please contact support.',
            details: errorBody,
          },
        };
      }
      
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: errorBody.error || `Server error: ${response.status}`,
          details: errorBody,
        },
      };
    }
    
    // Parse response
    const responseData = await response.json();
    
    if (!responseData.success) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: responseData.error || 'Failed to parse PDF',
          details: responseData,
        },
      };
    }
    
    const rawResponse: AIRawResponse = responseData.data;
    
    if (debug) {
      console.log('[AI Parser] Raw response:', rawResponse);
      console.log('[AI Parser] API metadata:', responseData.metadata);
    }
    
    // Validate raw response structure
    const validationResult = validateRawResponse(rawResponse);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid response structure from AI',
          details: validationResult.errors,
        },
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
    const pdfBaseline = createPdfBaseline(rawResponse, qualificationSettings, model);
    
    // Validate conversion
    const conversionValidation = validateConversion(
      flights,
      milesRecords,
      pdfBaseline,
      bonusXpByMonth
    );
    
    if (debug && conversionValidation.warnings.length > 0) {
      console.log('[AI Parser] Conversion warnings:', conversionValidation.warnings);
    }
    
    // Calculate total parse time (including network)
    const parseTimeMs = Math.round(performance.now() - startTime);
    
    // Detect language from PDF content
    const language = detectLanguage(pdfText);
    
    // Build result
    const result: AIParsedResult = {
      flights,
      milesRecords,
      pdfBaseline,
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
      console.log('[AI Parser] Parse complete:', {
        flights: flights.length,
        milesRecords: milesRecords.length,
        bonusXpMonths: Object.keys(bonusXpByMonth).length,
        parseTimeMs,
        tokensUsed: responseData.metadata?.tokensUsed,
      });
    }
    
    return {
      success: true,
      data: result,
    };
    
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: `Request timed out after ${Math.round(timeout / 1000)} seconds. Try with a smaller PDF.`,
        },
      };
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection and try again.',
        },
      };
    }
    
    // Handle other errors
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
    };
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

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
  
  // Validate header
  if (!r.header || typeof r.header !== 'object') {
    errors.push('Missing or invalid header');
  } else {
    const header = r.header as Record<string, unknown>;
    if (typeof header.totalMiles !== 'number') errors.push('Invalid header.totalMiles');
    if (typeof header.totalXp !== 'number') errors.push('Invalid header.totalXp');
    if (!header.currentStatus) errors.push('Missing header.currentStatus');
    if (!header.exportDate) errors.push('Missing header.exportDate');
  }
  
  // Validate arrays exist
  if (!Array.isArray(r.flights)) errors.push('Missing flights array');
  if (!Array.isArray(r.milesActivities)) errors.push('Missing milesActivities array');
  if (!Array.isArray(r.statusEvents)) errors.push('Missing statusEvents array');
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  
  // Dutch indicators
  if (lower.includes('vlucht') || lower.includes('aftrek') || lower.includes('beschikbaar')) {
    return 'nl';
  }
  
  // French indicators
  if (lower.includes('vol ') || lower.includes('déduction') || lower.includes('excédentaires')) {
    return 'fr';
  }
  
  // German indicators
  if (lower.includes('flug') || lower.includes('abzug') || lower.includes('verfügbar')) {
    return 'de';
  }
  
  // Default to English
  return 'en';
}

// Re-export types for convenience
export type { AIParserOptions, AIParserResult, AIParsedResult } from './types';
