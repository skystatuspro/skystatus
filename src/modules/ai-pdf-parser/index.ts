// src/modules/ai-pdf-parser/index.ts
// AI PDF Parser Module for SkyStatus Pro
//
// This module provides an AI-powered alternative to the local regex parser.
// It uses OpenAI's GPT-4o to extract transaction data with high accuracy.
//
// KEY DIFFERENCE FROM LOCAL PARSER:
// - AI parser output is trusted 100% - no corrections needed
// - Data goes directly to the data layer without workarounds
// - bonusXP is properly extracted and stored in manualLedger
//
// Usage:
// ```typescript
// import { aiParseFlyingBlue } from './modules/ai-pdf-parser';
//
// const result = await aiParseFlyingBlue(pdfText, { apiKey: 'sk-...' });
// if (result.success) {
//   // Use result.data.flights, result.data.milesRecords, etc.
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

// Converter utilities (for advanced usage)
export {
  convertFlights,
  convertMilesRecords,
  extractBonusXpByMonth,
  detectQualificationSettings,
  createPdfBaseline,
  validateConversion,
} from './converter';
