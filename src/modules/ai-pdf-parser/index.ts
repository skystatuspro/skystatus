// src/modules/ai-pdf-parser/index.ts
// AI PDF Parser Module for SkyStatus Pro
// v3.0 - Transaction-based deduplication (Dec 2025)
//
// This module provides an AI-powered alternative to the local regex parser.
// It uses OpenAI's GPT-4o to extract transaction data with high accuracy.
//
// KEY FEATURES:
// - Each transaction gets a unique, deterministic ID
// - Re-importing the same PDF skips existing transactions automatically
// - Individual bonus XP activities are preserved, not just monthly totals
//
// Usage:
// ```typescript
// import { aiParseFlyingBlue, convertToActivityTransactions } from './modules/ai-pdf-parser';
//
// const result = await aiParseFlyingBlue(pdfText, { debug: true });
// if (result.success) {
//   const transactions = convertToActivityTransactions(
//     result.data.rawResponse.milesActivities,
//     result.data.pdfHeader.exportDate
//   );
//   // Use transactions for deduplication-aware import
// }
// ```

// Main parser function
export { aiParseFlyingBlue } from './parser';

// Types
export type {
  AIRawResponse,
  AIRawFlight,
  AIRawMilesActivity,
  AIRawStatusEvent,
  AIParsedResult,
  AIParserOptions,
  AIParserResult,
  AIParserError,
} from './types';

// Converter utilities
export {
  // Legacy converters (still used for flights and MilesRecord aggregation)
  convertFlights,
  convertMilesRecords,
  extractBonusXpByMonth,
  detectQualificationSettings,
  createPdfHeader,
  validateConversion,
  parseToISODate,
  extractMonth,
  // NEW: Transaction-based conversion for deduplication
  convertToActivityTransactions,
  createAdjustmentTransaction,
} from './converter';

// Re-export PdfHeader type from converter
export type { PdfHeader } from './converter';
