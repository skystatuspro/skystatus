// src/modules/local-text-parser/xp-event-parser.ts
// Parse XP status events (rollover, deduction) for qualification cycle detection

import type { ClassifiedTransaction, ParsedStatusEvent } from './types';
import type { AIRawStatusEvent } from '../ai-pdf-parser/types';
import type { StatusLevel } from '../../types';
import type { QualificationSettings } from '../../hooks/useUserData';
import { MILES_XP_SINGLE, QUALIFICATION_DATE_PATTERN, ALL_MONTHS } from './patterns';
import { parseDateToISO } from './header-parser';

/**
 * Status level XP thresholds
 */
const STATUS_XP_THRESHOLDS: Record<number, StatusLevel> = {
  300: 'Platinum',
  180: 'Gold',
  100: 'Silver',
  0: 'Explorer',
};

/**
 * Determine status from XP deduction amount
 */
function statusFromXpDeduction(xpDeducted: number): StatusLevel {
  const absXp = Math.abs(xpDeducted);
  
  if (absXp >= 300) return 'Platinum';
  if (absXp >= 180) return 'Gold';
  if (absXp >= 100) return 'Silver';
  return 'Explorer';
}

/**
 * Extract qualification period dates from text
 * Pattern: "kwalificatieperiode eindigend op 07/10/2025"
 */
function extractQualificationDates(text: string): { endDate: string; startDate: string } | null {
  // Dutch pattern
  const nlEndMatch = text.match(/kwalificatieperiode\s+eindigend\s+op\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const nlStartMatch = text.match(/kwalificatieperiode\s+beginnend\s+op\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  
  // English pattern
  const enEndMatch = text.match(/qualification\s+period\s+ending\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const enStartMatch = text.match(/qualification\s+period\s+starting\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  
  const endMatch = nlEndMatch || enEndMatch;
  const startMatch = nlStartMatch || enStartMatch;
  
  if (endMatch) {
    const endDate = `${endMatch[3]}-${endMatch[2]}-${endMatch[1]}`;  // DD/MM/YYYY -> YYYY-MM-DD
    
    if (startMatch) {
      const startDate = `${startMatch[3]}-${startMatch[2]}-${startMatch[1]}`;
      return { endDate, startDate };
    }
    
    // Calculate start date (day after end date)
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    const startDate = end.toISOString().slice(0, 10);
    
    return { endDate, startDate };
  }
  
  return null;
}

/**
 * Extract XP change from status event block
 */
function extractXpChange(block: ClassifiedTransaction): { xpChange: number; uxpChange: number } {
  const firstLine = block.text.split('\n')[0];
  const match = firstLine.match(MILES_XP_SINGLE);
  
  if (match) {
    return {
      xpChange: parseInt(match[2], 10) || 0,
      uxpChange: parseInt(match[3], 10) || 0,
    };
  }
  
  return { xpChange: 0, uxpChange: 0 };
}

/**
 * Extract status reached from text
 */
function extractStatusReached(text: string): StatusLevel | null {
  // Look for patterns like "Platinum reached" or "Gold bereikt"
  const patterns = [
    /(Explorer|Silver|Gold|Platinum|Ultimate)\s+reached/i,
    /(Explorer|Silver|Gold|Platinum|Ultimate)\s+bereikt/i,
    /(Explorer|Silver|Gold|Platinum|Ultimate)\s+atteint/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const status = match[1].toLowerCase();
      switch (status) {
        case 'explorer': return 'Explorer';
        case 'silver': return 'Silver';
        case 'gold': return 'Gold';
        case 'platinum': return 'Platinum';
        case 'ultimate': return 'Ultimate';
      }
    }
  }
  
  return null;
}

/**
 * Parse a single XP status event
 */
function parseStatusEventBlock(block: ClassifiedTransaction): AIRawStatusEvent {
  const { xpChange, uxpChange } = extractXpChange(block);
  const qualDates = extractQualificationDates(block.text);
  const statusReached = extractStatusReached(block.text);
  
  // Determine event type
  let type: AIRawStatusEvent['type'];
  
  if (block.type === 'XP_ROLLOVER') {
    type = 'xp_surplus';
  } else if (block.type === 'XP_DEDUCTION') {
    type = 'xp_reset';
  } else if (xpChange < 0) {
    type = 'xp_reset';
  } else if (xpChange > 0 && /surplus|rollover|meegenomen/i.test(block.text)) {
    type = 'xp_surplus';
  } else {
    type = 'xp_reset';
  }
  
  // Get description
  const firstLine = block.text.split('\n')[0];
  const description = firstLine
    .replace(/^\d{1,2}\s+[a-z]+\s+\d{4}\s+/i, '')
    .replace(/\s*(-?\d+)\s*Miles.*$/i, '')
    .trim();
  
  return {
    date: block.activityDate || block.postingDate,
    type,
    description,
    xpChange,
    uxpChange,
    statusReached: statusReached || (type === 'xp_reset' ? statusFromXpDeduction(xpChange) : null),
  };
}

/**
 * Parse all XP status events
 */
export function parseStatusEvents(
  xpEventBlocks: ClassifiedTransaction[]
): AIRawStatusEvent[] {
  return xpEventBlocks.map(parseStatusEventBlock);
}

/**
 * Detect qualification settings from status events
 * This matches the logic in ai-pdf-parser/converter.ts
 */
export function detectQualificationSettingsFromEvents(
  statusEvents: AIRawStatusEvent[],
  headerStatus: StatusLevel
): QualificationSettings | null {
  // Find the most recent XP reset (indicates start of new cycle)
  const resets = statusEvents
    .filter(e => e.type === 'xp_reset')
    .sort((a, b) => b.date.localeCompare(a.date));  // Newest first
  
  if (resets.length === 0) {
    return null;
  }
  
  const latestReset = resets[0];
  
  // Find corresponding surplus (rollover XP)
  const correspondingSurplus = statusEvents.find(
    e => e.type === 'xp_surplus' && e.date === latestReset.date
  );
  
  // Calculate cycle start month (month after the reset)
  const resetDate = new Date(latestReset.date);
  const cycleStartMonth = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
  const cycleStartMonthStr = cycleStartMonth.toISOString().slice(0, 7);  // YYYY-MM
  
  // Determine starting status
  let startingStatus: StatusLevel = headerStatus;
  
  if (latestReset.statusReached) {
    startingStatus = latestReset.statusReached;
  } else {
    // Infer from XP deducted
    startingStatus = statusFromXpDeduction(latestReset.xpChange);
  }
  
  // Ultimate is tracked differently, map to Platinum for qualification
  if (startingStatus === 'Ultimate') {
    startingStatus = 'Platinum';
  }
  
  return {
    cycleStartMonth: cycleStartMonthStr,
    cycleStartDate: latestReset.date,
    startingStatus,
    startingXP: correspondingSurplus?.xpChange ?? 0,
    startingUXP: correspondingSurplus?.uxpChange,
  };
}

/**
 * Debug helper
 */
export function debugStatusEvents(blocks: ClassifiedTransaction[]): void {
  console.log('[XPEventParser] Found blocks:', blocks.length);
  
  for (const block of blocks) {
    console.log('[XPEventParser] Block:', {
      type: block.type,
      date: block.postingDate,
      text: block.text.slice(0, 100),
    });
    
    const event = parseStatusEventBlock(block);
    console.log('[XPEventParser] Parsed event:', event);
  }
}
