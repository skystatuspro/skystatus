// src/types.ts
// Central type definitions for SkyStatus Pro

// ============================================================================
// STATUS TYPES
// ============================================================================

// Base XP-determined status levels
// Note: In Flying Blue, Ultimate is technically Platinum + 900 UXP, but for UI purposes
// we allow selecting "Ultimate" as a starting status to simplify the user experience
export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';

// View states for the app
export type ViewState = 'xp' | 'miles' | 'analytics' | 'calculator' | 'faq' | 'redemption' | 'mileagerun' | 'profile';

// ============================================================================
// FLIGHT RECORDS
// ============================================================================

export interface FlightRecord {
  id: string;
  date: string;           // YYYY-MM-DD format
  route: string;          // e.g., "AMS-CDG"
  airline: string;        // e.g., "KL", "AF", "DL"
  flightNumber?: string;  // e.g., "KL1234", "AF5678"
  cabin: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  ticketPrice?: number;
  earnedMiles?: number;
  earnedXP?: number;
  safXp?: number;         // SAF (Sustainable Aviation Fuel) XP
  uxp?: number;           // Ultimate XP - only KLM/AF flights generate UXP
  // Import tracking
  importSource?: 'pdf' | 'manual';  // How was this flight added
  importedAt?: string;              // ISO timestamp of when it was imported
}

// ============================================================================
// PDF BASELINE (Source of Truth from PDF Header)
// ============================================================================

/**
 * Stores the official Flying Blue balances from the most recent PDF import.
 * These values are the "source of truth" - they come directly from Flying Blue
 * and should be displayed as-is. Manual additions are calculated as delta on top.
 */
export interface PdfBaseline {
  // Official balances from PDF header
  xp: number;                        // XP balance at time of PDF export
  uxp: number;                       // UXP balance at time of PDF export
  miles: number;                     // Miles balance at time of PDF export
  status: StatusLevel;               // Official status level
  
  // PDF metadata
  pdfExportDate: string;             // Date the PDF was exported (from newest transaction or header)
  importedAt: string;                // When we imported this PDF
  
  // Qualification cycle (detected or user-provided)
  cycleStartMonth?: string;          // YYYY-MM - Official cycle start month
  cycleStartDate?: string;           // YYYY-MM-DD - Exact date status was reached
  rolloverXP?: number;               // XP carried over from previous cycle
}

// ============================================================================
// MILES RECORDS
// ============================================================================

export interface MilesRecord {
  id: string;
  month: string;          // YYYY-MM format
  miles_subscription: number;
  miles_amex: number;
  miles_flight: number;
  miles_other: number;
  miles_debit: number;
  cost_subscription: number;
  cost_amex: number;
  cost_flight: number;
  cost_other: number;
  // Correction to align calculated miles with PDF header balance
  // Positive = PDF shows more miles, Negative = PDF shows fewer
  miles_correction?: number;
}

// ============================================================================
// XP RECORDS (Legacy format)
// ============================================================================

export interface XPRecord {
  month: string;          // YYYY-MM format
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  misc: number;
  saf: number;
  amex_xp: number;
  status_correction: number;
}

// ============================================================================
// REDEMPTION RECORDS
// ============================================================================

export interface RedemptionRecord {
  id: string;
  month: string;
  miles_redeemed: number;
  description: string;
  category: 'flight' | 'upgrade' | 'product' | 'transfer' | 'other';
  estimated_value?: number;
}

// ============================================================================
// MANUAL LEDGER (User-entered monthly adjustments)
// ============================================================================

export interface ManualMonthXP {
  amexXp?: number;
  bonusSafXp?: number;
  miscXp?: number;
  correctionXp?: number;
}

export type ManualLedger = Record<string, ManualMonthXP>;

export type ManualField = 'amexXp' | 'bonusSafXp' | 'miscXp' | 'correctionXp';

// ============================================================================
// APP STATE
// ============================================================================

export interface AppState {
  flights: FlightRecord[];
  milesData: MilesRecord[];
  xpData: XPRecord[];
  redemptions: RedemptionRecord[];
  manualLedger: ManualLedger;
  baseRollover: number;
}

// ============================================================================
// QUALIFICATION SETTINGS
// ============================================================================

export interface QualificationSettings {
  cycleStartMonth: string;
  cycleStartDate?: string;    // Full date (YYYY-MM-DD) for precise cycle start
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;     // UXP carried over from previous cycle
  ultimateCycleType?: 'qualification' | 'calendar'; // Legacy Ultimate members may use calendar year
}
