// src/types.ts
// Central type definitions for SkyStatus Pro
// CLEAN VERSION - No pdfBaseline, no miles_correction

// ============================================================================
// STATUS TYPES
// ============================================================================

export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';
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
  importSource?: 'pdf' | 'manual';
  importedAt?: string;
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
}

// ============================================================================
// XP RECORDS
// ============================================================================

export interface XPRecord {
  month: string;
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
  date: string;
  description: string;
  award_miles: number;
  surcharges: number;
  cash_price_estimate?: number;
}

// ============================================================================
// MANUAL LEDGER
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
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;
  ultimateCycleType?: 'qualification' | 'calendar';
  cycleStartDate?: string;
}
