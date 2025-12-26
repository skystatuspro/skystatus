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
// ACTIVITY TRANSACTIONS (Non-flight miles and XP)
// New unified system for deduplication - replaces xp_ledger and miles_transactions
// ============================================================================

/**
 * Activity transaction types from Flying Blue PDF
 */
export type ActivityTransactionType =
  | 'subscription'      // Miles Complete, Discount Pass (can have XP)
  | 'amex'              // American Express card spend
  | 'amex_bonus'        // AMEX welcome/annual bonus (has XP)
  | 'hotel'             // Booking.com, Accor ALL (can have XP)
  | 'shopping'          // Amazon, Flying Blue Shop
  | 'partner'           // Currency Alliance, other partners
  | 'transfer_in'       // Family transfer, Revolut, Air Miles
  | 'transfer_out'      // Family transfer out (negative miles)
  | 'redemption'        // Award tickets (negative miles)
  | 'donation'          // Miles donation (negative miles, has XP bonus)
  | 'adjustment'        // Air adjustment, Klantenservice corrections
  | 'car_rental'        // Uber, rental car partners
  | 'expiry'            // Expired miles (negative)
  | 'status_extension'  // Status extension purchase
  | 'other';            // Fallback for unrecognized types

/**
 * Individual activity transaction record.
 * Each transaction has a unique, deterministic ID for deduplication.
 */
export interface ActivityTransaction {
  id: string;                          // Unique ID: tx-{date}-{type}-{miles}-{xp}-{hash}
  date: string;                        // YYYY-MM-DD
  type: ActivityTransactionType;
  description: string;                 // Original description from PDF
  miles: number;                       // Can be negative (redemptions, transfers out)
  xp: number;                          // Usually 0, positive for bonus XP
  source: 'pdf' | 'manual';
  sourceDate?: string;                 // PDF export date (for freshness tracking)
  // Cost tracking (for CPM/ROI calculations)
  cost?: number | null;                // NULL = unknown, 0 = free, >0 = actual cost
  costCurrency?: string;               // Currency code, default 'EUR'
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Aggregated activity data by month.
 * Computed from ActivityTransaction[] for UI display.
 */
export interface MonthlyActivitySummary {
  month: string;                       // YYYY-MM
  
  // Miles by source (positive values)
  miles_subscription: number;
  miles_amex: number;
  miles_hotel: number;
  miles_shopping: number;
  miles_partner: number;
  miles_transfer_in: number;
  miles_adjustment: number;
  miles_other: number;
  
  // Miles outflow (stored as positive for display)
  miles_transfer_out: number;
  miles_redemption: number;
  miles_donation: number;
  miles_expiry: number;
  
  // XP by source
  xp_amex_bonus: number;
  xp_donation: number;
  xp_subscription: number;             // Discount Pass XP
  xp_adjustment: number;
  xp_hotel: number;                    // Accor XP
  xp_other: number;
  
  // Cost by source (for CPM calculations)
  cost_subscription: number;
  cost_amex: number;
  cost_hotel: number;
  cost_other: number;
  
  // Computed totals
  total_miles_earned: number;
  total_miles_spent: number;
  total_xp: number;
  total_cost: number;
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
