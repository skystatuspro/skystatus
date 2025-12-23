// src/modules/ai-pdf-parser/index.ts
// AI PDF Parser Module for SkyStatus Pro
// CLEAN VERSION - no pdfBaseline, data flows through engines

export { aiParseFlyingBlue } from './parser';

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

export {
  convertFlights,
  convertMilesRecords,
  extractBonusXpByMonth,
  detectQualificationSettings,
  createPdfHeader,
  validateConversion,
} from './converter';
