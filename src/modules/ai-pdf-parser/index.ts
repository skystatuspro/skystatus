// src/modules/ai-pdf-parser/index.ts
// AI PDF Parser Module for SkyStatus Pro
//
// This module provides an AI-powered PDF parser using OpenAI's GPT-4o.
// It extracts transaction data with high accuracy and converts it to
// the standard FlightRecord[] and MilesRecord[] format.
//
// KEY ARCHITECTURE:
// - AI parser extracts data from PDF text
// - Output is converted to standard app types (FlightRecord, MilesRecord)
// - Data flows through the XP Engine and Miles Engine (single source of truth)
// - No bypass or "baseline" - engines calculate everything
//
// Usage:
// ```typescript
// import { aiParseFlyingBlue } from './modules/ai-pdf-parser';
//
// const result = await aiParseFlyingBlue(pdfText);
// if (result.success) {
//   // Use result.data.flights, result.data.milesRecords, etc.
//   handlePdfImport(result.data.flights, result.data.milesRecords, ...);
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
  PdfHeader,
} from './types';

// Converter utilities (for advanced usage)
export {
  convertFlights,
  convertMilesRecords,
  extractBonusXpByMonth,
  detectQualificationSettings,
  createPdfHeader,
  validateConversion,
} from './converter';
