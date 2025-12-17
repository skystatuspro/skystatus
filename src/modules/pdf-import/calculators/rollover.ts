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
 * Rollover XP Calculator
 * 
 * Calculates rollover XP when a user requalifies for their status.
 * When you reach a status threshold, excess XP rolls over to the new cycle.
 * 
 * FLYING BLUE ROLLOVER RULES:
 * - XP earned BEFORE requalification date that exceeds the threshold rolls over
 * - Max rollover depends on status level
 * - Rollover only applies to flight XP, not bonus XP
 * 
 * @module calculators/rollover
 */

import type { StatusLevel, FlightRecord, RequalificationEvent } from '../types';
import { STATUS_THRESHOLDS } from '../core/status-detector';

/**
 * Maximum rollover XP by status level
 * Based on Flying Blue program rules
 */
export const MAX_ROLLOVER: Record<StatusLevel, number> = {
  Explorer: 0,    // No rollover to Explorer
  Silver: 50,     // Max 50 XP rolls to Silver cycle
  Gold: 80,       // Max 80 XP rolls to Gold cycle
  Platinum: 100,  // Max 100 XP rolls to Platinum cycle
  Ultimate: 0,    // Ultimate is lifetime, no rollover concept
};

/**
 * Calculate rollover XP from flights before requalification
 * 
 * @param flights - All user flights
 * @param requalificationDate - Date of the requalification (YYYY-MM-DD)
 * @param targetStatus - The status being requalified to
 * @returns Calculated rollover XP (capped at max for status)
 */
export function calculateRolloverXP(
  flights: FlightRecord[],
  requalificationDate: string,
  targetStatus: StatusLevel
): number {
  // Get the XP threshold for the target status
  const threshold = STATUS_THRESHOLDS[targetStatus];
  const maxRollover = MAX_ROLLOVER[targetStatus];
  
  if (maxRollover === 0) {
    return 0; // No rollover for this status
  }
  
  // Sum XP from flights BEFORE the requalification date
  const xpBeforeRequalification = flights
    .filter(f => f.date < requalificationDate)
    .reduce((sum, f) => sum + f.earnedXP + f.safXp, 0);
  
  // Calculate excess XP
  const excessXP = Math.max(0, xpBeforeRequalification - threshold);
  
  // Cap at maximum rollover for this status
  return Math.min(excessXP, maxRollover);
}

/**
 * Calculate rollover XP from a requalification event
 * Uses the XP at requalification if available
 */
export function calculateRolloverFromEvent(
  event: RequalificationEvent,
  flights: FlightRecord[]
): number {
  // If we have the exact XP at requalification, use it
  if (event.xpAtRequalification !== undefined) {
    const threshold = STATUS_THRESHOLDS[event.toStatus];
    const maxRollover = MAX_ROLLOVER[event.toStatus];
    const excess = Math.max(0, event.xpAtRequalification - threshold);
    return Math.min(excess, maxRollover);
  }
  
  // Otherwise, calculate from flights
  return calculateRolloverXP(flights, event.date, event.toStatus);
}

/**
 * Get the previous status (for rollover calculation context)
 */
export function getPreviousStatus(status: StatusLevel): StatusLevel {
  const order: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const index = order.indexOf(status);
  return index > 0 ? order[index - 1] : 'Explorer';
}

/**
 * Calculate how much XP would roll over if user requalifies at given XP
 */
export function simulateRollover(
  currentXP: number,
  targetStatus: StatusLevel
): number {
  const threshold = STATUS_THRESHOLDS[targetStatus];
  const maxRollover = MAX_ROLLOVER[targetStatus];
  const excess = Math.max(0, currentXP - threshold);
  return Math.min(excess, maxRollover);
}

/**
 * Validate that rollover calculation matches official PDF balance
 * Returns discrepancy if any
 */
export function validateRollover(
  calculatedRollover: number,
  officialStartingXP: number
): { matches: boolean; discrepancy: number } {
  const discrepancy = officialStartingXP - calculatedRollover;
  return {
    matches: discrepancy === 0,
    discrepancy,
  };
}
