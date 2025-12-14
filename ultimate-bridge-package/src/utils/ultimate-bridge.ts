// src/utils/ultimate-bridge.ts
// Bridge layer between UI (where users select 'Ultimate') and core logic (which expects 'Platinum' + UXP)

import { StatusLevel, QualificationSettings } from '../types';

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
 * Similar to getDisplayStatus but for projections.
 */
export function getDisplayProjectedStatus(
  projectedStatus: StatusLevel,
  projectedUltimate: boolean
): StatusLevel {
  if (projectedUltimate && projectedStatus === 'Platinum') {
    return 'Ultimate';
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
