/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  PROTECTED MODULE - DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  This module handles critical PDF import logic. Unauthorized changes      ║
 * ║  can cause DATA LOSS for users.                                          ║
 * ║                                                                           ║
 * ║  BEFORE MAKING ANY CHANGES:                                              ║
 * ║  1. Read README.md in this directory                                     ║
 * ║  2. Run ALL tests: npm run test:pdf-import                               ║
 * ║  3. Update CHANGELOG.md with your changes                                ║
 * ║  4. Update VERSION if needed (semver)                                    ║
 * ║  5. Test with real PDFs in multiple languages                            ║
 * ║                                                                           ║
 * ║  Module Version: 2.0.0                                                   ║
 * ║  Last Modified: 2024-12-17                                               ║
 * ║  Last Author: Claude                                                      ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';

export type CurrencyCode = 
  | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'CHF' 
  | 'AUD' | 'SEK' | 'NOK' | 'DKK' | 'PLN';

export type SupportedLanguage = 'en' | 'nl' | 'fr' | 'de' | 'es' | 'pt' | 'it';

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type ConflictResolution = 'keep_existing' | 'use_incoming' | 'keep_both';

export type SnapshotTrigger = 'pdf_import' | 'manual' | 'auto' | 'restore';

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Options passed to the PDF parser
 */
export interface PdfImportOptions {
  /** Existing flights to check for duplicates */
  existingFlights: FlightRecord[];
  /** Existing miles records to check for updates */
  existingMiles: MilesRecord[];
  /** User's preferred currency (fallback) */
  userCurrency: CurrencyCode;
}

// =============================================================================
// PARSED DATA TYPES
// =============================================================================

/**
 * A flight parsed from the PDF
 */
export interface ParsedFlight {
  /** Unique identifier for this parsed flight */
  id: string;
  /** Flight date in YYYY-MM-DD format */
  date: string;
  /** Flight number (e.g., "KL1234", "AF5678") */
  flightNumber: string;
  /** Route in IATA format (e.g., "AMS-CDG") */
  route: string;
  /** Marketing airline code */
  airline: string;
  /** Operating airline code (if different) */
  operatingAirline?: string;
  /** Whether this is a partner flight (non AF/KL) */
  isPartnerFlight: boolean;
  
  /** XP earned from this flight */
  earnedXP: number;
  /** Miles earned from this flight */
  earnedMiles: number;
  /** SAF (Sustainable Aviation Fuel) bonus XP */
  safXP: number;
  /** Ultimate XP earned (for Ultimate status tracking) */
  uxp: number;
  
  /** Ticket price in original currency */
  ticketPrice?: number;
  /** Currency of the ticket price */
  currency?: CurrencyCode;
  /** Cabin class if detected */
  cabinClass?: CabinClass;
  
  /** Status after conflict detection */
  status: 'new' | 'duplicate' | 'fuzzy_match';
  /** ID of matched existing flight (if fuzzy match) */
  matchedExistingId?: string;
  /** Confidence score for fuzzy match (0-1) */
  matchConfidence?: number;
}

/**
 * Miles sources breakdown for a month
 */
export interface MilesSources {
  flights: { miles: number; xp: number };
  subscription: { miles: number; xp: number };
  creditCard: { miles: number; xp: number };
  hotel: { miles: number; xp: number };
  transfer: { miles: number; xp: number };
  promo: { miles: number; xp: number };
  purchased: { miles: number; xp: number };
  other: { miles: number; xp: number };
}

/**
 * Changes detected in a miles record
 */
export interface MilesChanges {
  field: keyof MilesSources | 'debit';
  oldValue: number;
  newValue: number;
}

/**
 * Miles data parsed from the PDF for a specific month
 */
export interface ParsedMiles {
  /** Month in YYYY-MM format */
  month: string;
  
  /** Breakdown by source */
  sources: MilesSources;
  
  /** Miles spent/used */
  debit: number;
  /** Total miles earned this month */
  totalEarned: number;
  /** Total XP earned this month */
  totalXP: number;
  
  /** Status after conflict detection */
  status: 'new' | 'unchanged' | 'has_changes';
  /** ID of existing record if updating */
  existingRecordId?: string;
  /** List of changes if updating */
  changes?: MilesChanges[];
}

// =============================================================================
// STATUS & CYCLE TYPES
// =============================================================================

/**
 * A requalification event (status level-up)
 */
export interface RequalificationEvent {
  /** Date of requalification in YYYY-MM-DD format */
  date: string;
  /** Status before requalification */
  fromStatus: StatusLevel;
  /** Status after requalification */
  toStatus: StatusLevel;
  /** XP at moment of requalification */
  xpAtRequalification?: number;
}

/**
 * Status and cycle information detected from PDF
 */
export interface DetectedStatus {
  /** Current status level */
  currentStatus: StatusLevel;
  /** Current XP balance (official from PDF) */
  currentXP: number;
  /** Current Ultimate XP balance */
  currentUXP: number;
  /** Current Miles balance (official from PDF) */
  currentMiles: number;
  
  /** Cycle start month in YYYY-MM format */
  cycleStartMonth: string;
  /** Exact cycle start date if detected (YYYY-MM-DD) */
  cycleStartDate?: string;
  /** Rollover XP from previous cycle */
  rolloverXP: number;
  
  /** All detected requalification events */
  requalifications: RequalificationEvent[];
}

// =============================================================================
// CONFLICT TYPES
// =============================================================================

/**
 * A conflict detected during import
 */
export interface ImportConflict {
  /** Unique identifier for this conflict */
  id: string;
  /** Type of conflict */
  type: 'flight' | 'miles';
  /** Reason for the conflict */
  reason: 'fuzzy_match' | 'different_values';
  
  /** The existing record */
  existing: FlightRecord | MilesRecord;
  /** The incoming parsed record */
  incoming: ParsedFlight | ParsedMiles;
  
  /** Human-readable reason for the match */
  matchReason?: string;
  /** Confidence score (0-1) */
  matchConfidence: number;
  
  /** User's resolution choice */
  resolution?: ConflictResolution;
}

// =============================================================================
// SUMMARY TYPES
// =============================================================================

/**
 * Summary of parsed flights
 */
export interface FlightSummary {
  /** Total flights in PDF */
  total: number;
  /** New flights to add */
  new: number;
  /** Exact duplicates (auto-skipped) */
  duplicates: number;
  /** Fuzzy matches requiring resolution */
  conflicts: number;
}

/**
 * Summary of parsed miles
 */
export interface MilesSummary {
  /** Total months in PDF */
  total: number;
  /** New months to add */
  new: number;
  /** Months with updates */
  updated: number;
  /** Months unchanged */
  unchanged: number;
}

/**
 * Summary of XP breakdown
 */
export interface XPSummary {
  /** Total XP calculated from data */
  total: number;
  /** XP from flights */
  fromFlights: number;
  /** XP from SAF bonus */
  fromSaf: number;
  /** XP from bonuses (first flight, hotel, etc.) */
  fromBonus: number;
  /** Official XP from PDF (source of truth) */
  official: number;
}

/**
 * Summary of UXP (Ultimate XP)
 */
export interface UXPSummary {
  /** Total UXP calculated */
  total: number;
  /** Official UXP from PDF */
  official: number;
}

/**
 * Date range of the import
 */
export interface DateRange {
  /** Oldest date in YYYY-MM-DD format */
  from: string;
  /** Newest date in YYYY-MM-DD format */
  to: string;
  /** Number of months spanned */
  months: number;
}

/**
 * Complete import summary
 */
export interface ImportSummary {
  flights: FlightSummary;
  miles: MilesSummary;
  xp: XPSummary;
  uxp: UXPSummary;
  dateRange: DateRange;
}

// =============================================================================
// METADATA TYPES
// =============================================================================

/**
 * Metadata about the parsed PDF
 */
export interface PdfMetadata {
  /** Detected language of the PDF */
  language: SupportedLanguage;
  /** Detected currency */
  detectedCurrency: CurrencyCode;
  /** When the PDF was parsed */
  parseDate: string;
  /** Number of pages in the PDF */
  pdfPageCount: number;
  /** Any warnings during parsing */
  warnings: string[];
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Complete result from parsing a PDF
 */
export interface PdfImportResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  
  /** Parsed flights */
  flights: ParsedFlight[];
  /** Parsed miles data */
  miles: ParsedMiles[];
  /** Detected status information */
  status: DetectedStatus | null;
  
  /** XP breakdown */
  xp: {
    /** Official XP from PDF - THIS IS THE SOURCE OF TRUTH */
    official: number;
    /** XP calculated from flights */
    fromFlights: number;
    /** XP from SAF bonus */
    fromSaf: number;
    /** XP from other bonuses */
    fromBonus: number;
    /** Discrepancy between official and calculated */
    discrepancy: number;
  };
  
  /** UXP (Ultimate XP) information */
  uxp: {
    /** Whether UXP was detected in PDF */
    detected: boolean;
    /** Official UXP from PDF */
    official: number;
    /** UXP calculated from flights */
    fromFlights: number;
  };
  
  /** Official Miles balance from PDF (source of truth) */
  officialMilesBalance: number | null;
  
  /** Detected conflicts requiring resolution */
  conflicts: ImportConflict[];
  
  /** Summary statistics */
  summary: ImportSummary;
  
  /** PDF metadata */
  meta: PdfMetadata;
}

// =============================================================================
// RESOLVED IMPORT DATA
// =============================================================================

/**
 * Qualification/cycle settings to apply
 */
export interface QualificationSettingsUpdate {
  /** Cycle start month in YYYY-MM format */
  cycleStartMonth: string;
  /** Exact cycle start date (YYYY-MM-DD) */
  cycleStartDate?: string;
  /** Starting status for the cycle */
  startingStatus: StatusLevel;
  /** Starting XP (rollover from previous cycle) */
  startingXP: number;
}

/**
 * Official balances from PDF
 */
export interface OfficialBalances {
  /** Official XP balance */
  xp: number;
  /** Official Ultimate XP balance */
  uxp: number;
  /** Official Miles balance */
  miles: number;
}

/**
 * Import metadata for tracking
 */
export interface ImportMeta {
  /** When the import occurred */
  timestamp: string;
  /** Number of flights added */
  flightsAdded: number;
  /** Number of miles months updated */
  milesUpdated: number;
  /** Language of the imported PDF */
  language: SupportedLanguage;
}

/**
 * Final resolved import data ready for processing
 * This is what gets passed to useUserData.processPdfImport()
 */
export interface ResolvedImportData {
  /** New flights to add (after conflict resolution) */
  flightsToAdd: FlightRecord[];
  /** Miles records to merge/update */
  milesToMerge: MilesRecord[];
  
  /** Qualification settings to apply */
  qualificationSettings?: QualificationSettingsUpdate;
  
  /** Bonus XP by month (first flight, hotel XP, etc.) */
  bonusXpByMonth: Record<string, number>;
  
  /** Official balances from PDF */
  officialBalances: OfficialBalances;
  
  /** Import metadata */
  importMeta: ImportMeta;
}

// =============================================================================
// SNAPSHOT TYPES
// =============================================================================

/**
 * Summary of a snapshot for display
 */
export interface SnapshotSummary {
  /** Number of flights */
  flightCount: number;
  /** Number of miles records */
  milesRecordCount: number;
  /** Total XP */
  totalXP: number;
  /** Total Miles */
  totalMiles: number;
  /** Status at snapshot time */
  status: StatusLevel;
}

/**
 * Data stored in a snapshot
 */
export interface SnapshotData {
  flights: FlightRecord[];
  milesData: MilesRecord[];
  qualificationSettings: QualificationSettings | null;
  manualLedger: ManualLedger;
  xpRollover: number;
  redemptions: Redemption[];
}

/**
 * A complete snapshot for undo/restore
 */
export interface Snapshot {
  /** Unique identifier */
  id: string;
  /** User who owns this snapshot */
  userId: string;
  /** When the snapshot was created */
  createdAt: string;
  
  /** What triggered this snapshot */
  trigger: SnapshotTrigger;
  /** Optional description */
  description?: string;
  
  /** Summary for display */
  summary: SnapshotSummary;
  
  /** The actual data */
  data: SnapshotData;
}

// =============================================================================
// EXTERNAL TYPES (re-exported for convenience)
// =============================================================================

/**
 * Flight record as stored in the app
 * (matches existing type in src/types.ts)
 */
export interface FlightRecord {
  id: string;
  date: string;
  flightNumber: string;
  route: string;
  airline: string;
  earnedXP: number;
  earnedMiles: number;
  ticketPrice?: number;
  currency?: string;
  safXp: number;
  isManual?: boolean;
}

/**
 * Miles record as stored in the app
 * (matches existing type in src/types.ts)
 */
export interface MilesRecord {
  month: string;
  flightMiles: number;
  subscriptionMiles: number;
  amexMiles: number;
  hotelMiles: number;
  otherMiles: number;
  purchasedMiles: number;
  transferMiles: number;
  milesDebit: number;
  totalMiles: number;
}

/**
 * Qualification settings as stored in the app
 */
export interface QualificationSettings {
  cycleStartMonth: string;
  cycleStartDate?: string;
  startingStatus: StatusLevel;
  startingXP: number;
}

/**
 * Manual ledger entries
 */
export interface ManualLedger {
  [month: string]: {
    amexXp?: number;
    bonusSafXp?: number;
    miscXp?: number;
    correctionXp?: number;
  };
}

/**
 * Redemption record
 */
export interface Redemption {
  id: string;
  date: string;
  description: string;
  miles: number;
  cashValue?: number;
  currency?: string;
}
