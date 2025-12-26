// src/modules/local-text-parser/index.ts
// Local Text Parser Module for SkyStatus Pro
// v1.0 - Initial implementation (Dec 2025)
//
// This module provides a local, privacy-first alternative to the AI parser.
// It parses copy-pasted text from Flying Blue PDFs without any API calls.
//
// KEY FEATURES:
// - 100% client-side parsing, no data sent to servers
// - Same output format as AI parser (AIParsedResult)
// - Same transaction ID generation for deduplication
// - Drop-in replacement for AI parser
//
// Usage:
// ```typescript
// import { localParseText, isLikelyFlyingBlueContent } from './modules/local-text-parser';
//
// // Quick validation for UI feedback
// if (isLikelyFlyingBlueContent(text)) {
//   const result = await localParseText(text, { debug: true });
//   if (result.success) {
//     // Use result.data exactly like AI parser output
//     handlePdfImport(result.data.flights, result.data.activityTransactions, ...);
//   }
// }
// ```

// Main parser function
export { localParseText, isLikelyFlyingBlueContent } from './parser';

// Types
export type {
  LocalParserOptions,
  LocalParserResult,
  ValidationResult,
  ParsedHeader,
  DetectedLanguage,
  TransactionType,
  ClassifiedTransaction,
} from './types';

// Re-export AI parser types for convenience
export type {
  AIRawResponse,
  AIRawFlight,
  AIRawMilesActivity,
  AIRawStatusEvent,
  AIParsedResult,
  AIParserError,
  PdfHeader,
} from './types';

// Validation utilities
export {
  validateInput,
  getValidationErrorMessage,
  getValidationWarningMessage,
} from './validator';

// Header parsing (for debugging/testing)
export { parseHeader, detectLanguage } from './header-parser';

// Transaction utilities (for debugging/testing)
export {
  splitIntoTransactionBlocks,
  splitAndClassifyTransactions,
  groupTransactionsByType,
} from './transaction-splitter';
