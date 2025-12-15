// src/utils/ultimate-bridge.ts
// Bridge layer between UI (where users select 'Ultimate') and core logic (which expects 'Platinum' + UXP)

import { StatusLevel, QualificationSettings } from '../types';

// Platinum threshold for reference
const PLATINUM_THRESHOLD = 300;

/**
 * Normalizes qualification settings for the core XP logic.
 * 
 * When user selects 'Ultimate' in the UI:
 * - startingStatus becomes 'Platinum' (for correct XP calculations)
 * - startingUXP is ensured to be at least 900 (to trigger isUltimate=true)
 * 
 * This allows users to select "Ultimate" in settings while the core logic
 * receives the data it expects (Platinum + sufficient UXP).
 */
export function normalizeQualificationSettings(
  settings: QualificationSettings | null
): QualificationSettings | null {
  if (!settings) return null;
  
  if (settings.startingStatus === 'Ultimate') {
    return {
      ...settings,
      startingStatus: 'Platinum',
      // Ensure UXP is at least 900 to trigger isUltimate in core logic
      startingUXP: Math.max(settings.startingUXP ?? 0, 900),
    };
  }
  
  return settings;
}

/**
 * Determines the display status based on cycle data.
 * Combines actualStatus with isUltimate flag to show correct UI status.
 * 
 * Core logic returns: { actualStatus: 'Platinum', isUltimate: true }
 * This function returns: 'Ultimate' for display
 */
export function getDisplayStatus(
  actualStatus: StatusLevel,
  isUltimate: boolean
): StatusLevel {
  if (isUltimate && actualStatus === 'Platinum') {
    return 'Ultimate';
  }
  return actualStatus;
}

/**
 * Determines the display status for projected status.
 * 
 * This is more complex because:
 * 1. If projectedUltimate is true and projectedStatus is Platinum → Ultimate
 * 2. If user is already Ultimate (isUltimate=true) and projected XP >= 300 → Ultimate
 *    (They will maintain Ultimate if they maintain Platinum)
 * 
 * The second case handles the scenario where the core logic might return
 * a lower status due to calculation issues with 'Ultimate' as input.
 */
export function getDisplayProjectedStatus(
  projectedStatus: StatusLevel,
  projectedUltimate: boolean,
  isCurrentlyUltimate: boolean = false,
  projectedXP: number = 0
): StatusLevel {
  // Case 1: Core logic correctly identified projected Ultimate
  if (projectedUltimate && projectedStatus === 'Platinum') {
    return 'Ultimate';
  }
  
  // Case 2: User is currently Ultimate and will maintain Platinum-level XP
  // They should project as Ultimate (maintaining status)
  if (isCurrentlyUltimate && projectedXP >= PLATINUM_THRESHOLD) {
    return 'Ultimate';
  }
  
  // Case 3: User is currently Ultimate but projected status seems wrong
  // If they have enough XP for Platinum, show Platinum (soft landing from Ultimate)
  if (isCurrentlyUltimate && projectedXP >= PLATINUM_THRESHOLD && 
      (projectedStatus === 'Explorer' || projectedStatus === 'Silver' || projectedStatus === 'Gold')) {
    return 'Platinum';
  }
  
  return projectedStatus;
}

/**
 * Checks if a status represents Ultimate level for UI purposes.
 * Handles both direct 'Ultimate' status and 'Platinum' + isUltimate flag.
 */
export function isUltimateLevel(
  status: StatusLevel, 
  isUltimate: boolean
): boolean {
  return status === 'Ultimate' || (status === 'Platinum' && isUltimate);
}

/**
 * Gets the effective XP status (without Ultimate layer) for calculations.
 * Ultimate → Platinum, all others stay the same.
 */
export function getEffectiveXPStatus(status: StatusLevel): StatusLevel {
  return status === 'Ultimate' ? 'Platinum' : status;
}
