// src/modules/ai-pdf-parser/types.ts
// Type definitions for AI-powered PDF parsing
// CLEAN VERSION - pdfHeader for preview only, no pdfBaseline

import type { FlightRecord, MilesRecord, StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';

// ============================================================================
// AI RAW RESPONSE TYPES
// ============================================================================

export interface AIRawResponse {
  header: {
    memberName: string | null;
    memberNumber: string | null;
    currentStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';
    totalMiles: number;
    totalXp: number;
    totalUxp: number;
    exportDate: string;
  };
  flights: AIRawFlight[];
  milesActivities: AIRawMilesActivity[];
  statusEvents: AIRawStatusEvent[];
}

export interface AIRawFlight {
  postingDate: string;
  tripTitle: string;
  route: string;
  flightNumber: string;
  airline: string;
  flightDate: string;
  miles: number;
  xp: number;
  uxp: number;
  safMiles: number;
  safXp: number;
  cabin: 'Economy' | 'Premium Economy' | 'Business' | 'First' | 'Unknown';
  isRevenue: boolean;
}

export interface AIRawMilesActivity {
  date: string;
  type: 'subscription' | 'amex' | 'amex_bonus' | 'hotel' | 'shopping' | 'partner' | 
        'car_rental' | 'transfer_in' | 'transfer_out' | 'donation' | 'adjustment' | 
        'redemption' | 'expiry' | 'promo' | 'other';
  description: string;
  miles: number;
  xp: number;
}

export interface AIRawStatusEvent {
  date: string;
  type: 'xp_reset' | 'xp_surplus' | 'status_reached' | 'uxp_reset' | 'uxp_surplus';
  description: string;
  xpChange: number;
  uxpChange: number;
  statusReached: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate' | null;
}

// ============================================================================
// PDF HEADER (for preview only - NOT stored)
// ============================================================================

export interface PdfHeader {
  xp: number;
  uxp: number;
  miles: number;
  status: StatusLevel;
  exportDate: string;
  memberName?: string;
  memberNumber?: string;
}

// ============================================================================
// PARSED RESULT
// ============================================================================

export interface AIParsedResult {
  flights: FlightRecord[];
  milesRecords: MilesRecord[];
  pdfHeader: PdfHeader;  // For preview only
  qualificationSettings: QualificationSettings | null;
  bonusXpByMonth: Record<string, number>;
  rawResponse: AIRawResponse;
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
  apiKey?: string;  // Deprecated - uses server-side key
  model?: string;
  timeout?: number;
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
