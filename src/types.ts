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
  date: string;              // YYYY-MM-DD format
  description: string;
  award_miles: number;       // Miles used for this redemption
  surcharges: number;        // Taxes/fees paid in cash
  cash_price_estimate?: number;  // Estimated cash value of what was redeemed
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
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;     // UXP carried over from previous cycle
  ultimateCycleType?: 'qualification' | 'calendar'; // Legacy Ultimate members may use calendar year
  cycleStartDate?: string;  // Full date (YYYY-MM-DD) for precise cycle start
}
