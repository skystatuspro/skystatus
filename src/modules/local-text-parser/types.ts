// src/modules/local-text-parser/types.ts
// Type definitions for local text parsing
// Re-exports AI parser types for compatibility + local-specific types

// Re-export all types from AI parser for compatibility
export type {
  AIRawResponse,
  AIRawFlight,
  AIRawMilesActivity,
  AIRawStatusEvent,
  AIParsedResult,
  AIParserError,
} from '../ai-pdf-parser/types';

export type { PdfHeader } from '../ai-pdf-parser/converter';

// ============================================================================
// LOCAL PARSER SPECIFIC TYPES
// ============================================================================

/**
 * Options for local text parser
 */
export interface LocalParserOptions {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Language hint (auto-detected if not provided) */
  language?: 'nl' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';
  
  /** Strict mode: fail on first error vs. lenient: parse what we can */
  strict?: boolean;
}

/**
 * Result type matching AI parser for drop-in compatibility
 */
export type LocalParserResult = 
  | { success: true; data: import('../ai-pdf-parser/types').AIParsedResult }
  | { success: false; error: import('../ai-pdf-parser/types').AIParserError };

/**
 * Detected language from PDF content
 * Supports: Dutch, English, French, German, Spanish, Italian, Portuguese
 */
export type DetectedLanguage = 'nl' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';

/**
 * Parsed header information from PDF
 */
export interface ParsedHeader {
  memberName: string | null;
  memberNumber: string | null;
  currentStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';
  totalMiles: number;
  totalXp: number;
  totalUxp: number;
  exportDate: string;
  language: DetectedLanguage;
}

/**
 * Raw transaction block before classification
 */
export interface RawTransactionBlock {
  /** Full text of the transaction block */
  text: string;
  
  /** Transaction/posting date (when it appeared in account) */
  postingDate: string;
  
  /** Activity date (when the activity actually occurred) */
  activityDate: string | null;
  
  /** Line number in original text (for debugging) */
  lineNumber: number;
}

/**
 * Transaction type classification
 */
export type TransactionType =
  | 'FLIGHT_KLM_AF'      // KL/AF flights with euro-based earning
  | 'FLIGHT_PARTNER'     // SkyTeam partner flights (distance-based)
  | 'FLIGHT_TRANSAVIA'   // Transavia flights
  | 'FLIGHT_AWARD'       // Award/redemption flights (negative miles)
  | 'UPGRADE'            // Cabin upgrades
  | 'SUBSCRIPTION'       // Subscribe to Miles, Discount Pass
  | 'CREDIT_CARD'        // AMEX spending
  | 'CREDIT_CARD_BONUS'  // AMEX welcome/annual bonus
  | 'TRANSFER_IN'        // Miles transferred in (Family, etc.)
  | 'TRANSFER_OUT'       // Miles transferred out
  | 'HOTEL'              // Hotel partners
  | 'SHOPPING'           // Shopping partners
  | 'CAR_RENTAL'         // Car rental partners
  | 'DONATION'           // Miles donation
  | 'XP_ROLLOVER'        // Surplus XP available
  | 'XP_DEDUCTION'       // XP counter deduction
  | 'ADJUSTMENT'         // Air adjustment, corrections
  | 'PARTNER'            // Other partner earnings
  | 'OTHER';             // Fallback

/**
 * Classified transaction block
 */
export interface ClassifiedTransaction extends RawTransactionBlock {
  type: TransactionType;
  confidence: number;  // 0-1, how confident we are in classification
}

/**
 * Parsed flight segment (within a trip)
 */
export interface ParsedFlightSegment {
  origin: string;           // IATA code
  destination: string;      // IATA code
  flightNumber: string | null;
  airline: string | null;   // 2-letter code
  date: string;             // YYYY-MM-DD
  miles: number;
  xp: number;
  uxp: number;
  safMiles: number;
  safXp: number;
  safUxp: number;
  cabin: 'Economy' | 'Premium Economy' | 'Business' | 'First' | 'Unknown';
  isRevenue: boolean;
}

/**
 * Parsed miles activity (non-flight)
 */
export interface ParsedMilesActivity {
  date: string;
  type: import('../../types').ActivityTransactionType;
  description: string;
  miles: number;
  xp: number;
}

/**
 * Parsed XP status event
 */
export interface ParsedStatusEvent {
  date: string;
  type: 'xp_reset' | 'xp_surplus' | 'status_reached' | 'uxp_reset' | 'uxp_surplus';
  description: string;
  xpChange: number;
  uxpChange: number;
  statusReached: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate' | null;
}

/**
 * Validation result for input text
 */
export interface ValidationResult {
  isValid: boolean;
  isFlyingBlueContent: boolean;
  language: DetectedLanguage | null;
  errors: string[];
  warnings: string[];
}

/**
 * Miles reconciliation - compares header balance with parsed transactions
 */
export interface MilesReconciliation {
  /** Total miles from PDF header */
  headerBalance: number;
  
  /** Sum of all parsed transactions (flights + activities) */
  parsedTotal: number;
  
  /** Difference (headerBalance - parsedTotal) */
  difference: number;
  
  /** Oldest transaction date found in PDF */
  oldestTransactionDate: string;
  
  /** Oldest transaction month (YYYY-MM) for correction booking */
  oldestMonth: string;
  
  /** Whether correction is needed (difference > threshold) */
  needsCorrection: boolean;
  
  /** Suggested correction transaction */
  suggestedCorrection: {
    date: string;
    description: string;
    miles: number;
  } | null;
}
