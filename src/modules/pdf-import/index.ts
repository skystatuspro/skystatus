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

/**
 * SkyStatus Pro - PDF Import Module v2.0
 * 
 * This module provides complete PDF import functionality for Flying Blue
 * transaction history PDFs. It handles:
 * 
 * - Multi-language PDF parsing (EN, NL, FR, DE, ES, PT, IT)
 * - Flight extraction with partner airline support
 * - Miles extraction from all sources
 * - XP and UXP calculation
 * - Status and cycle detection
 * - Conflict detection and resolution
 * - Rollover XP calculation
 * 
 * USAGE:
 * ```typescript
 * import { parsePdf, detectConflicts, type PdfImportResult } from '@/modules/pdf-import';
 * 
 * const result = await parsePdf(pdfFile, options);
 * if (result.success) {
 *   const conflicts = detectConflicts(result, existingData);
 *   // ... handle conflicts and import
 * }
 * ```
 * 
 * IMPORTANT: This module is PROTECTED. See README.md before making changes.
 */

// =============================================================================
// VERSION
// =============================================================================

export const PDF_IMPORT_VERSION = '2.1.1';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enums & Constants
export type {
  StatusLevel,
  CurrencyCode,
  SupportedLanguage,
  CabinClass,
  ConflictResolution,
  SnapshotTrigger,
} from './types';

// Input Types
export type {
  PdfImportOptions,
} from './types';

// Parsed Data Types
export type {
  ParsedFlight,
  ParsedMiles,
  MilesSources,
  MilesChanges,
} from './types';

// Status & Cycle Types
export type {
  RequalificationEvent,
  DetectedStatus,
} from './types';

// Conflict Types
export type {
  ImportConflict,
} from './types';

// Summary Types
export type {
  FlightSummary,
  MilesSummary,
  XPSummary,
  UXPSummary,
  DateRange,
  ImportSummary,
} from './types';

// Metadata Types
export type {
  PdfMetadata,
} from './types';

// Result Types
export type {
  PdfImportResult,
} from './types';

// Resolved Import Types
export type {
  QualificationSettingsUpdate,
  OfficialBalances,
  ImportMeta,
  ResolvedImportData,
} from './types';

// Snapshot Types
export type {
  SnapshotSummary,
  SnapshotData,
  Snapshot,
} from './types';

// External Types (re-exports)
export type {
  FlightRecord,
  MilesRecord,
  QualificationSettings,
  ManualLedger,
  Redemption,
} from './types';

// =============================================================================
// CORE FUNCTIONS (to be implemented in Phase 2)
// =============================================================================

// Placeholder exports - will be replaced with actual implementations
// This ensures the API is stable from the start

/**
 * Parse a Flying Blue PDF file
 * @param file - The PDF file to parse
 * @param options - Import options including existing data
 * @returns Parsed result with flights, miles, status, and conflicts
 */
export { parsePdf, parsePdfText } from './core/parser';

/**
 * Detect conflicts between parsed data and existing data
 * @param parsed - The parsed PDF result
 * @param existingFlights - Existing flight records
 * @param existingMiles - Existing miles records
 * @returns Array of detected conflicts
 */
export { detectConflicts, resolveImport } from './core/conflict-detector';

/**
 * Calculate rollover XP from previous cycle
 * @param flights - All flights
 * @param requalificationDate - Date of the requalification
 * @param previousStatus - Status before requalification
 * @returns Calculated rollover XP
 */
export { calculateRolloverXP } from './calculators/rollover';

// Additional exports for advanced usage
export { extractFlights } from './core/flight-extractor';
export { extractMiles } from './core/miles-extractor';
export { extractXP } from './core/xp-extractor';
export { 
  detectStatus,
  detectStatusExtended,
  detectLevelChanges,
  detectBonusXPEvents,
  detectFirstFlightDate,
  buildJourneyTimeline,
  findRequalifications,
  STATUS_THRESHOLDS,
} from './core/status-detector';
export type {
  LevelChangeEvent,
  BonusXPEvent,
  BonusXPSource,
  ExtendedDetectedStatus,
  JourneyMilestone,
} from './core/status-detector';
export { extractBalances } from './core/balance-extractor';
export { tokenize, detectLanguage } from './core/tokenizer';

// Backup service for undo functionality
export {
  createBackup,
  restoreBackup,
  hasBackup,
  getBackupInfo,
  clearBackup,
  getBackupAge,
} from './services/backup-service';
export type { ImportBackup } from './services/backup-service';

// Legacy adapter for backward compatibility
export {
  parseFlyingBlueTextCompat,
  toFlightRecordsCompat,
  toMilesRecordsCompat,
  extractBonusXpCompat,
} from './adapters/legacy-adapter';
export type {
  LegacyParseResult,
  LegacyParsedFlight,
  LegacyParsedMilesMonth,
  LegacyRequalificationEvent,
} from './adapters/legacy-adapter';
