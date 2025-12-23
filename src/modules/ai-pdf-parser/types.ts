// src/modules/ai-pdf-parser/types.ts
// Type definitions for AI-powered PDF parsing

import type { FlightRecord, MilesRecord, StatusLevel, PdfBaseline } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';

// ============================================================================
// AI RAW RESPONSE TYPES (from OpenAI structured output)
// ============================================================================

/**
 * Raw response structure from OpenAI API
 * This matches the JSON schema we send to the model
 */
export interface AIRawResponse {
  header: {
    memberName: string | null;
    memberNumber: string | null;
    currentStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';
    totalMiles: number;
    totalXp: number;
    totalUxp: number;
    exportDate: string; // YYYY-MM-DD
  };
  
  flights: AIRawFlight[];
  milesActivities: AIRawMilesActivity[];
  statusEvents: AIRawStatusEvent[];
}

export interface AIRawFlight {
  /** Date when transaction was posted (from line header) */
  postingDate: string; // YYYY-MM-DD
  
  /** Trip title/description, e.g., "Vlucht Amsterdam - Berlijn" */
  tripTitle: string;
  
  /** Route in format "XXX - YYY", e.g., "AMS - BER" */
  route: string;
  
  /** Flight number with airline code, e.g., "KL1234" */
  flightNumber: string;
  
  /** 2-letter airline code, e.g., "KL", "AF", "DL" */
  airline: string;
  
  /** Actual flight date (from "op X datum" pattern) */
  flightDate: string; // YYYY-MM-DD
  
  /** Base miles earned (positive = earned, negative = adjustment) */
  miles: number;
  
  /** XP earned from this flight */
  xp: number;
  
  /** UXP earned (only for KL/AF flights, 0 otherwise) */
  uxp: number;
  
  /** SAF (Sustainable Aviation Fuel) bonus miles */
  safMiles: number;
  
  /** SAF bonus XP */
  safXp: number;
  
  /** Cabin class if detectable */
  cabin: 'Economy' | 'Premium Economy' | 'Business' | 'First' | 'Unknown';
  
  /** Whether this was a revenue (paid) flight vs award */
  isRevenue: boolean;
}

export interface AIRawMilesActivity {
  /** Date of the transaction */
  date: string; // YYYY-MM-DD
  
  /** Category of miles activity */
  type: 
    | 'subscription'      // Subscribe to Miles
    | 'amex'              // American Express spending miles
    | 'amex_bonus'        // AMEX welcome/annual bonus (often includes XP)
    | 'hotel'             // Hotel partners (Accor, etc.)
    | 'shopping'          // Online shopping portals
    | 'partner'           // Other airline partners
    | 'car_rental'        // Car rental partners
    | 'transfer_in'       // Miles transferred in
    | 'transfer_out'      // Miles transferred out
    | 'donation'          // Miles donated (often earns XP bonus)
    | 'adjustment'        // Air France/KLM adjustments
    | 'redemption'        // Miles spent on awards
    | 'expiry'            // Miles expired
    | 'promo'             // Promotional miles
    | 'other';            // Anything else
  
  /** Original description from PDF */
  description: string;
  
  /** Miles amount (positive = earned, negative = spent/deducted) */
  miles: number;
  
  /** XP bonus if any (e.g., donation bonus, AMEX bonus, first flight bonus) */
  xp: number;
}

export interface AIRawStatusEvent {
  /** Date of the event */
  date: string; // YYYY-MM-DD
  
  /** Type of status event */
  type: 
    | 'xp_reset'          // "Aftrek XP-teller" - XP deducted when reaching new status
    | 'xp_surplus'        // "Surplus XP beschikbaar" - Rollover XP to new cycle
    | 'status_reached'    // Explicit status achievement
    | 'uxp_reset'         // UXP counter reset
    | 'uxp_surplus';      // UXP rollover
  
  /** Original description from PDF */
  description: string;
  
  /** XP change (negative for reset, positive for surplus) */
  xpChange: number;
  
  /** UXP change if applicable */
  uxpChange: number;
  
  /** Status level reached, if this event indicates status change */
  statusReached: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate' | null;
}

// ============================================================================
// PARSED RESULT TYPES (converted to app format)
// ============================================================================

/**
 * Final parsed result ready for the app
 * This is what handlePdfImportAI receives
 */
export interface AIParsedResult {
  /** Flight records in app format */
  flights: FlightRecord[];
  
  /** Miles records aggregated by month */
  milesRecords: MilesRecord[];
  
  /** PDF baseline (source of truth) */
  pdfBaseline: PdfBaseline;
  
  /** Qualification settings if cycle info detected */
  qualificationSettings: QualificationSettings | null;
  
  /** Bonus XP by month (for manualLedger.miscXp) */
  bonusXpByMonth: Record<string, number>;
  
  /** Raw response for debugging */
  rawResponse: AIRawResponse;
  
  /** Metadata */
  metadata: {
    parseTimeMs: number;
    model: string;
    tokensUsed: number;
    language: string;
  };
}

// ============================================================================
// API TYPES
// ============================================================================

export interface AIParserOptions {
  /** 
   * OpenAI API key - NO LONGER NEEDED! 
   * The key is stored securely on the server via environment variable.
   * This field is kept for backward compatibility but ignored.
   * @deprecated Use server-side API route instead
   */
  apiKey?: string;
  
  /** Model to use (default: gpt-4o) */
  model?: string;
  
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;
  
  /** Enable debug logging */
  debug?: boolean;
}

export interface AIParserError {
  code: 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'NETWORK_ERROR';
  message: string;
  details?: unknown;
}

export type AIParserResult = 
  | { success: true; data: AIParsedResult }
  | { success: false; error: AIParserError };
