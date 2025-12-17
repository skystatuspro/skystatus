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
 * Validators
 * 
 * Data validation utilities for PDF import.
 * Ensures parsed data meets expected constraints.
 * 
 * @module utils/validators
 */

import type { 
  ParsedFlight, 
  ParsedMiles, 
  FlightRecord, 
  MilesRecord,
  StatusLevel 
} from '../types';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create a successful validation result
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Create a failed validation result
 */
export function invalidResult(errors: string[]): ValidationResult {
  return { valid: false, errors, warnings: [] };
}

// =============================================================================
// FLIGHT VALIDATORS
// =============================================================================

/**
 * Validate a parsed flight
 */
export function validateParsedFlight(flight: ParsedFlight): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!flight.date) errors.push('Missing date');
  if (!flight.flightNumber) errors.push('Missing flight number');
  if (!flight.route) errors.push('Missing route');
  
  // Date format (YYYY-MM-DD)
  if (flight.date && !/^\d{4}-\d{2}-\d{2}$/.test(flight.date)) {
    errors.push(`Invalid date format: ${flight.date}`);
  }
  
  // Date range (reasonable Flying Blue dates: 2000-2100)
  if (flight.date) {
    const year = parseInt(flight.date.substring(0, 4));
    if (year < 2000 || year > 2100) {
      errors.push(`Date out of range: ${flight.date}`);
    }
  }
  
  // Flight number format
  if (flight.flightNumber && !/^[A-Z]{2}\d+$/i.test(flight.flightNumber.replace(/\s/g, ''))) {
    warnings.push(`Unusual flight number format: ${flight.flightNumber}`);
  }
  
  // Route format (XXX-XXX)
  if (flight.route && !/^[A-Z]{3}-[A-Z]{3}$/i.test(flight.route)) {
    warnings.push(`Unusual route format: ${flight.route}`);
  }
  
  // XP should be non-negative
  if (flight.earnedXP < 0) errors.push('Negative XP');
  if (flight.earnedMiles < 0) errors.push('Negative Miles');
  if (flight.safXP < 0) errors.push('Negative SAF XP');
  
  // XP should be reasonable (max ~100 per flight)
  if (flight.earnedXP > 100) {
    warnings.push(`Unusually high XP: ${flight.earnedXP}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a flight record (for storage)
 */
export function validateFlightRecord(flight: FlightRecord): ValidationResult {
  const errors: string[] = [];
  
  if (!flight.id) errors.push('Missing ID');
  if (!flight.date) errors.push('Missing date');
  if (!flight.flightNumber) errors.push('Missing flight number');
  if (!flight.route) errors.push('Missing route');
  if (!flight.airline) errors.push('Missing airline');
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

// =============================================================================
// MILES VALIDATORS
// =============================================================================

/**
 * Validate parsed miles data
 */
export function validateParsedMiles(miles: ParsedMiles): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Month format (YYYY-MM)
  if (!miles.month) {
    errors.push('Missing month');
  } else if (!/^\d{4}-\d{2}$/.test(miles.month)) {
    errors.push(`Invalid month format: ${miles.month}`);
  }
  
  // Non-negative values
  if (miles.totalEarned < 0) errors.push('Negative total earned');
  if (miles.debit < 0) warnings.push('Negative debit (unusual but possible)');
  
  // Total should match sum of sources
  const sourceTotal = Object.values(miles.sources).reduce((sum, s) => sum + s.miles, 0);
  if (Math.abs(sourceTotal - miles.totalEarned) > 1) { // Allow 1 mile rounding
    warnings.push(`Source total (${sourceTotal}) doesn't match totalEarned (${miles.totalEarned})`);
  }
  
  // Reasonable miles amounts
  if (miles.totalEarned > 1000000) {
    warnings.push(`Unusually high miles earned: ${miles.totalEarned}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a miles record (for storage)
 */
export function validateMilesRecord(miles: MilesRecord): ValidationResult {
  const errors: string[] = [];
  
  if (!miles.month) errors.push('Missing month');
  if (!/^\d{4}-\d{2}$/.test(miles.month)) {
    errors.push(`Invalid month format: ${miles.month}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

// =============================================================================
// STATUS VALIDATORS
// =============================================================================

/**
 * Valid status levels
 */
const VALID_STATUSES: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];

/**
 * Validate a status level
 */
export function validateStatus(status: string): status is StatusLevel {
  return VALID_STATUSES.includes(status as StatusLevel);
}

/**
 * Validate XP for a given status
 */
export function validateXPForStatus(xp: number, status: StatusLevel): ValidationResult {
  const thresholds: Record<StatusLevel, { min: number; max: number }> = {
    Explorer: { min: 0, max: 99 },
    Silver: { min: 100, max: 179 },
    Gold: { min: 180, max: 299 },
    Platinum: { min: 300, max: 399 },
    Ultimate: { min: 400, max: 999 }, // Technically no max
  };
  
  const { min, max } = thresholds[status];
  const warnings: string[] = [];
  
  if (xp < min) {
    warnings.push(`XP (${xp}) is below minimum for ${status} (${min})`);
  }
  
  if (status !== 'Ultimate' && xp > max) {
    warnings.push(`XP (${xp}) is above threshold for next status`);
  }
  
  return {
    valid: true, // Don't fail on warnings
    errors: [],
    warnings,
  };
}

// =============================================================================
// GENERAL VALIDATORS
// =============================================================================

/**
 * Validate a date string format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Validate a month string format (YYYY-MM)
 */
export function isValidMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  
  const [year, m] = month.split('-').map(Number);
  return year >= 2000 && year <= 2100 && m >= 1 && m <= 12;
}

/**
 * Validate an IATA airport code
 */
export function isValidAirportCode(code: string): boolean {
  return /^[A-Z]{3}$/i.test(code);
}

/**
 * Validate a route format (XXX-XXX)
 */
export function isValidRoute(route: string): boolean {
  return /^[A-Z]{3}-[A-Z]{3}$/i.test(route);
}

/**
 * Validate a flight number
 */
export function isValidFlightNumber(flightNumber: string): boolean {
  // Airlines use 2 letter codes, followed by 1-4 digit number
  return /^[A-Z]{2}\s?\d{1,4}$/i.test(flightNumber);
}
