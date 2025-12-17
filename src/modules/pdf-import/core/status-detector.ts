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
 * Status Detector
 * 
 * Detects Flying Blue status level and cycle information from PDF.
 * Identifies requalification events and calculates cycle boundaries.
 * 
 * @module core/status-detector
 */

import type { 
  StatusLevel, 
  DetectedStatus, 
  RequalificationEvent,
  SupportedLanguage 
} from '../types';
import type { TokenizedLine } from './tokenizer';

/**
 * Status level XP thresholds
 */
export const STATUS_THRESHOLDS = {
  Explorer: 0,
  Silver: 100,
  Gold: 180,
  Platinum: 300,
  Ultimate: 400, // Lifetime status, different qualification rules
} as const;

/**
 * Status names in different languages
 */
export const STATUS_PATTERNS: Record<SupportedLanguage, Record<StatusLevel, string[]>> = {
  en: {
    Explorer: ['explorer'],
    Silver: ['silver'],
    Gold: ['gold'],
    Platinum: ['platinum'],
    Ultimate: ['ultimate'],
  },
  nl: {
    Explorer: ['explorer', 'ontdekker'],
    Silver: ['silver', 'zilver'],
    Gold: ['gold', 'goud'],
    Platinum: ['platinum', 'platina'],
    Ultimate: ['ultimate'],
  },
  fr: {
    Explorer: ['explorer', 'explorateur'],
    Silver: ['silver', 'argent'],
    Gold: ['gold', 'or'],
    Platinum: ['platinum', 'platine'],
    Ultimate: ['ultimate'],
  },
  de: {
    Explorer: ['explorer', 'entdecker'],
    Silver: ['silver', 'silber'],
    Gold: ['gold'],
    Platinum: ['platinum', 'platin'],
    Ultimate: ['ultimate'],
  },
  es: {
    Explorer: ['explorer', 'explorador'],
    Silver: ['silver', 'plata'],
    Gold: ['gold', 'oro'],
    Platinum: ['platinum', 'platino'],
    Ultimate: ['ultimate'],
  },
  pt: {
    Explorer: ['explorer', 'explorador'],
    Silver: ['silver', 'prata'],
    Gold: ['gold', 'ouro'],
    Platinum: ['platinum', 'platina'],
    Ultimate: ['ultimate'],
  },
  it: {
    Explorer: ['explorer', 'esploratore'],
    Silver: ['silver', 'argento'],
    Gold: ['gold', 'oro'],
    Platinum: ['platinum', 'platino'],
    Ultimate: ['ultimate'],
  },
};

/**
 * Requalification patterns in different languages
 */
export const REQUALIFICATION_PATTERNS: Record<SupportedLanguage, string[]> = {
  en: ['requalification', 'requalified', 'renewed', 'status renewed'],
  nl: ['hernieuwing', 'hernieuwd', 'herkwalificatie', 'status hernieuwd'],
  fr: ['requalification', 'requalifié', 'renouvelé', 'statut renouvelé'],
  de: ['requalifizierung', 'requalifiziert', 'erneuert', 'status erneuert'],
  es: ['recalificación', 'recalificado', 'renovado', 'estado renovado'],
  pt: ['requalificação', 'requalificado', 'renovado', 'status renovado'],
  it: ['riqualificazione', 'riqualificato', 'rinnovato', 'stato rinnovato'],
};

/**
 * Level change event - when user reaches a new status
 */
export interface LevelChangeEvent {
  date: string;              // ISO date when level was reached (YYYY-MM-DD)
  newStatus: StatusLevel;    // Status that was achieved
  xpDeducted: number;        // XP reset amount (negative)
  rolloverXP: number;        // Surplus XP carried forward
  cycleEndDate: string;      // Previous cycle end date (from PDF, may be off by 1 day)
  cycleStartDate: string;    // Raw start date from PDF (may be the level-up day itself)
  cycleStartMonth: string;   // CALCULATED: First of next month (YYYY-MM) - this is the correct one!
}

/**
 * Bonus XP event - non-flight XP
 */
export interface BonusXPEvent {
  date: string;
  source: BonusXPSource;
  description: string;
  xp: number;
}

/**
 * Bonus XP sources
 */
export type BonusXPSource = 
  | 'amexWelcome'     // American Express Welcome bonus
  | 'amexAnnual'      // American Express Annual bonus  
  | 'donation'        // Miles donation XP reward
  | 'firstFlight'     // Miles+Points first flight bonus
  | 'hotel'           // Hotel bonus XP (e.g., Accor)
  | 'discountPass'    // Discount Pass subscription
  | 'airAdjustment'   // Retroactive XP correction
  | 'other';          // Unknown source

/**
 * Extended status detection result
 */
export interface ExtendedDetectedStatus extends DetectedStatus {
  levelChanges: LevelChangeEvent[];
  bonusXPEvents: BonusXPEvent[];
  firstFlightDate: string | null;
  journey: JourneyMilestone[];
}

/**
 * Journey milestone for timeline display
 */
export interface JourneyMilestone {
  status: StatusLevel;
  date: string | null;
  achieved: boolean;
}

/**
 * Detect status and cycle information from tokenized lines
 * 
 * @param lines - All tokenized lines
 * @param language - Detected PDF language
 * @returns Detected status information or null
 */
export function detectStatus(
  lines: TokenizedLine[],
  language: SupportedLanguage
): DetectedStatus | null {
  let currentStatus: StatusLevel | null = null;
  let currentXP = 0;
  let currentUXP = 0;
  let currentMiles = 0;
  let cycleStartMonth = '';
  let cycleStartDate: string | undefined;
  let rolloverXP = 0;
  
  const requalifications = findRequalifications(lines, language);
  
  // Find current status from header or status lines
  for (const line of lines) {
    // Check for status in header
    if (line.type === 'status') {
      const status = parseStatusLevel(line.text, language);
      if (status) {
        currentStatus = status;
      }
    }
    
    // Check for XP/Miles totals: "248928 Miles 183 XP 40 UXP"
    const totalsMatch = line.text.match(/(\d[\d\s.,]*)\s*Miles\s+(\d+)\s*XP\s+(\d+)\s*UXP/i);
    if (totalsMatch) {
      currentMiles = parseInt(totalsMatch[1].replace(/[\s.,]/g, ''), 10);
      currentXP = parseInt(totalsMatch[2], 10);
      currentUXP = parseInt(totalsMatch[3], 10);
    }
    
    // Alternative: XP and Miles on separate lines
    const xpOnlyMatch = line.text.match(/(\d+)\s*XP(?:\s|$)/i);
    if (xpOnlyMatch && currentXP === 0) {
      currentXP = parseInt(xpOnlyMatch[1], 10);
    }
    
    const milesOnlyMatch = line.text.match(/(\d[\d\s.,]*)\s*Miles(?:\s|$)/i);
    if (milesOnlyMatch && currentMiles === 0) {
      currentMiles = parseInt(milesOnlyMatch[1].replace(/[\s.,]/g, ''), 10);
    }
  }
  
  // Determine cycle start from most recent requalification
  if (requalifications.length > 0) {
    const mostRecent = requalifications[requalifications.length - 1];
    cycleStartDate = mostRecent.date;
    cycleStartMonth = mostRecent.date.substring(0, 7);
    
    // Rollover XP would need to be calculated from flights
    // For now, we leave it at 0 - the calculator will handle it
  }
  
  if (!currentStatus) {
    return null;
  }
  
  return {
    currentStatus,
    currentXP,
    currentUXP,
    currentMiles,
    cycleStartMonth,
    cycleStartDate,
    rolloverXP,
    requalifications,
  };
}

/**
 * Find all requalification events in the PDF
 */
export function findRequalifications(
  lines: TokenizedLine[],
  language: SupportedLanguage
): RequalificationEvent[] {
  const requalifications: RequalificationEvent[] = [];
  const patterns = REQUALIFICATION_PATTERNS[language] || REQUALIFICATION_PATTERNS.en;
  
  // Also check with universal patterns
  const universalPatterns = [
    /XP.?(?:Counter|teller|compteur|Zähler|contatore|contador).?(?:offset|reset|compensat)/i,
    /[Rr]e?qualifi(?:cation|catie|cazione|cación|cação|ed|é|ziert|cato|cado)/i,
    /[Hh]erkwalifi/i,
    /[Gg]ekwalificeerd/i,
    /[Qq]ualifi(?:é|ziert|cato|cado)/i,
    /[Ss]tatus.*(?:renewed|verlengd|renouvelé|erneuert|rinnovato|renovado)/i,
  ];
  
  for (const line of lines) {
    const text = line.text.toLowerCase();
    
    // Check language-specific patterns
    let isRequalification = patterns.some(p => text.includes(p.toLowerCase()));
    
    // Check universal patterns
    if (!isRequalification) {
      isRequalification = universalPatterns.some(p => p.test(line.text));
    }
    
    if (isRequalification && line.date) {
      // Try to extract status level
      const statusMatch = line.text.match(/(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)/i);
      
      requalifications.push({
        date: line.date,
        fromStatus: 'Explorer', // Could potentially parse "from X to Y" patterns
        toStatus: statusMatch ? statusMatch[1] as StatusLevel : 'Explorer',
      });
    }
  }
  
  // Sort by date
  requalifications.sort((a, b) => a.date.localeCompare(b.date));
  
  return requalifications;
}

/**
 * Parse a status level from text
 */
export function parseStatusLevel(
  text: string,
  language: SupportedLanguage
): StatusLevel | null {
  const lowerText = text.toLowerCase();
  const patterns = STATUS_PATTERNS[language] || STATUS_PATTERNS.en;
  
  for (const [status, names] of Object.entries(patterns)) {
    for (const name of names) {
      if (lowerText.includes(name.toLowerCase())) {
        return status as StatusLevel;
      }
    }
  }
  
  // Try direct match
  if (/explorer/i.test(text)) return 'Explorer';
  if (/silver/i.test(text)) return 'Silver';
  if (/gold/i.test(text)) return 'Gold';
  if (/platinum/i.test(text)) return 'Platinum';
  if (/ultimate/i.test(text)) return 'Ultimate';
  
  return null;
}

/**
 * Get the previous status level
 */
export function getPreviousStatus(status: StatusLevel): StatusLevel {
  const order: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const index = order.indexOf(status);
  return index > 0 ? order[index - 1] : 'Explorer';
}

/**
 * Get the next status level
 */
export function getNextStatus(status: StatusLevel): StatusLevel | null {
  const order: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const index = order.indexOf(status);
  return index < order.length - 1 ? order[index + 1] : null;
}

/**
 * Get XP required to reach a status
 */
export function getXPForStatus(status: StatusLevel): number {
  return STATUS_THRESHOLDS[status];
}

/**
 * Detect level changes from PDF
 * Looks for "Aftrek XP-teller" patterns with status reached
 */
export function detectLevelChanges(
  lines: TokenizedLine[],
  language: SupportedLanguage
): LevelChangeEvent[] {
  const levelChanges: LevelChangeEvent[] = [];
  
  // Patterns for level change detection
  const aftrekPattern = /Aftrek\s+XP[.-]?teller|XP[.-]?Counter\s+(?:offset|deduction|reset)/i;
  const statusReachedPattern = /(Silver|Gold|Platinum|Ultimate)\s+reached|(Zilver|Goud|Platina)\s+bereikt|(Argent|Or|Platine)\s+atteint/i;
  const surplusPattern = /Surplus\s+XP\s+beschikbaar|Surplus\s+XP\s+available|XP\s+excédentaire/i;
  const cycleEndPattern = /(?:eindigend|ending|se\s+terminant)\s+op\s+(\d{2}\/\d{2}\/\d{4})/i;
  const cycleStartPattern = /(?:beginnend|starting|commençant)\s+op\s+(\d{2}\/\d{2}\/\d{4})/i;
  
  let currentDate = '';
  let pendingSurplus = 0;
  let pendingCycleEnd = '';
  let pendingCycleStart = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.text;
    
    // Track current date
    if (line.date) {
      currentDate = line.date;
    }
    
    // Look for Surplus XP line (comes before Aftrek)
    if (surplusPattern.test(text)) {
      const xpMatch = text.match(/(\d+)\s*XP/);
      pendingSurplus = xpMatch ? parseInt(xpMatch[1], 10) : 0;
      
      // Extract cycle dates from surrounding text
      const cycleEndMatch = text.match(cycleEndPattern);
      if (cycleEndMatch) {
        pendingCycleEnd = parseDutchDate(cycleEndMatch[1]);
      }
      const cycleStartMatch = text.match(cycleStartPattern);
      if (cycleStartMatch) {
        pendingCycleStart = parseDutchDate(cycleStartMatch[1]);
      }
      
      // Check next few lines for cycle dates
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].text;
        const endMatch = nextLine.match(cycleEndPattern);
        const startMatch = nextLine.match(cycleStartPattern);
        if (endMatch && !pendingCycleEnd) {
          pendingCycleEnd = parseDutchDate(endMatch[1]);
        }
        if (startMatch && !pendingCycleStart) {
          pendingCycleStart = parseDutchDate(startMatch[1]);
        }
      }
    }
    
    // Look for Aftrek XP-teller with status reached
    if (aftrekPattern.test(text)) {
      const statusMatch = text.match(statusReachedPattern);
      const xpMatch = text.match(/(-?\d+)\s*XP/);
      
      if (statusMatch && xpMatch) {
        const xpDeducted = parseInt(xpMatch[1], 10);
        const newStatus = parseStatusFromMatch(statusMatch[0]);
        const levelUpDate = currentDate || pendingCycleStart;
        
        if (newStatus && newStatus !== 'Explorer' && levelUpDate) {
          // Calculate the CORRECT cycle start month (1st of next month)
          // Flying Blue rule: qualify in month X → new cycle starts month X+1
          const correctCycleStartMonth = calculateCycleStartMonth(levelUpDate);
          
          levelChanges.push({
            date: levelUpDate,
            newStatus,
            xpDeducted,
            rolloverXP: pendingSurplus,
            cycleEndDate: pendingCycleEnd,
            cycleStartDate: pendingCycleStart || currentDate, // Raw PDF date (may be wrong)
            cycleStartMonth: correctCycleStartMonth,          // Calculated correct month
          });
        }
        
        // Reset pending values
        pendingSurplus = 0;
        pendingCycleEnd = '';
        pendingCycleStart = '';
      }
    }
  }
  
  // Sort by date
  levelChanges.sort((a, b) => a.date.localeCompare(b.date));
  
  return levelChanges;
}

/**
 * Detect bonus XP events (non-flight XP)
 */
export function detectBonusXPEvents(
  lines: TokenizedLine[],
  language: SupportedLanguage
): BonusXPEvent[] {
  const bonusEvents: BonusXPEvent[] = [];
  
  const patterns: Array<{ pattern: RegExp; source: BonusXPSource }> = [
    { pattern: /American\s+Express.*Welcome\s+bonus/i, source: 'amexWelcome' },
    { pattern: /American\s+Express.*Annual\s+bonus/i, source: 'amexAnnual' },
    { pattern: /Miles\s+donation.*XP[.-]?beloning|donation.*XP\s+reward/i, source: 'donation' },
    { pattern: /Miles\+Points\s+first\s+flight\s+bonus|eerste\s+vlucht\s+bonus/i, source: 'firstFlight' },
    { pattern: /Discount\s+Pass/i, source: 'discountPass' },
    { pattern: /Air\s+adjustment/i, source: 'airAdjustment' },
  ];
  
  let currentDate = '';
  
  for (const line of lines) {
    if (line.date) {
      currentDate = line.date;
    }
    
    const text = line.text;
    
    // Check for XP in the line (only interested in lines with XP > 0)
    const xpMatch = text.match(/(\d+)\s*XP/);
    if (!xpMatch || parseInt(xpMatch[1], 10) === 0) continue;
    
    const xp = parseInt(xpMatch[1], 10);
    
    // Check each pattern
    for (const { pattern, source } of patterns) {
      if (pattern.test(text)) {
        bonusEvents.push({
          date: currentDate,
          source,
          description: text.substring(0, 100).trim(),
          xp,
        });
        break;
      }
    }
    
    // Special case: Hotel bonus XP (Accor gives 5 XP for Gold/Platinum)
    if (/Hotel.*ALL.*Accor|Accor.*MILES\+POINTS/i.test(text) && xp > 0) {
      // Check it's not already captured
      const alreadyCaptured = bonusEvents.some(
        e => e.date === currentDate && e.description.includes('Accor')
      );
      if (!alreadyCaptured) {
        bonusEvents.push({
          date: currentDate,
          source: 'hotel',
          description: text.substring(0, 100).trim(),
          xp,
        });
      }
    }
  }
  
  // Sort by date
  bonusEvents.sort((a, b) => a.date.localeCompare(b.date));
  
  return bonusEvents;
}

/**
 * Detect first flight date from PDF
 */
export function detectFirstFlightDate(
  lines: TokenizedLine[],
  bonusEvents: BonusXPEvent[]
): string | null {
  // First, check if there's a first flight bonus event
  const firstFlightBonus = bonusEvents.find(e => e.source === 'firstFlight');
  if (firstFlightBonus) {
    return firstFlightBonus.date;
  }
  
  // Otherwise, find the earliest flight
  let earliestFlightDate: string | null = null;
  
  for (const line of lines) {
    if (line.date && /Mijn\s+reis\s+naar|My\s+trip\s+to|Mon\s+voyage/i.test(line.text)) {
      if (!earliestFlightDate || line.date < earliestFlightDate) {
        earliestFlightDate = line.date;
      }
    }
  }
  
  return earliestFlightDate;
}

/**
 * Build journey timeline from level changes
 */
export function buildJourneyTimeline(
  levelChanges: LevelChangeEvent[],
  currentStatus: StatusLevel,
  firstFlightDate: string | null
): JourneyMilestone[] {
  const statusOrder: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  // Create map of achieved statuses
  const achievedDates = new Map<StatusLevel, string>();
  for (const lc of levelChanges) {
    achievedDates.set(lc.newStatus, lc.date);
  }
  
  // Build journey
  const journey: JourneyMilestone[] = statusOrder.map((status, index) => {
    let date: string | null = null;
    let achieved = false;
    
    if (status === 'Explorer') {
      // Explorer is always achieved (starting status)
      date = firstFlightDate;
      achieved = true;
    } else if (achievedDates.has(status)) {
      date = achievedDates.get(status) || null;
      achieved = true;
    } else if (index <= currentIndex) {
      // Status was achieved but no explicit event found
      achieved = true;
    }
    
    return { status, date, achieved };
  });
  
  return journey;
}

/**
 * Extended status detection with journey, level changes, and bonus XP
 */
export function detectStatusExtended(
  lines: TokenizedLine[],
  language: SupportedLanguage
): ExtendedDetectedStatus | null {
  // Get basic status detection
  const basicStatus = detectStatus(lines, language);
  if (!basicStatus) return null;
  
  // Detect level changes
  const levelChanges = detectLevelChanges(lines, language);
  
  // Detect bonus XP events
  const bonusXPEvents = detectBonusXPEvents(lines, language);
  
  // Detect first flight
  const firstFlightDate = detectFirstFlightDate(lines, bonusXPEvents);
  
  // Build journey timeline
  const journey = buildJourneyTimeline(
    levelChanges,
    basicStatus.currentStatus,
    firstFlightDate
  );
  
  // Update cycle information from level changes
  if (levelChanges.length > 0) {
    const mostRecent = levelChanges[levelChanges.length - 1];
    basicStatus.cycleStartDate = mostRecent.date; // The actual level-up date
    basicStatus.cycleStartMonth = mostRecent.cycleStartMonth; // The CALCULATED correct month (1st of next month)
    basicStatus.rolloverXP = mostRecent.rolloverXP;
  }
  
  return {
    ...basicStatus,
    levelChanges,
    bonusXPEvents,
    firstFlightDate,
    journey,
  };
}

/**
 * Parse Dutch date format DD/MM/YYYY to ISO YYYY-MM-DD
 */
function parseDutchDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Calculate the correct cycle start month from a level-up date.
 * Flying Blue rule: If you qualify in month X, your new cycle starts on the 1st of month X+1.
 * 
 * Example: Level up on March 31, 2025 → Cycle starts April 1, 2025 (2025-04)
 * Example: Level up on December 15, 2025 → Cycle starts January 1, 2026 (2026-01)
 */
function calculateCycleStartMonth(levelUpDate: string): string {
  // levelUpDate is in YYYY-MM-DD format
  const [year, month] = levelUpDate.split('-').map(Number);
  
  // First of next month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Calculate the cycle end month (11 months after start = 12 month cycle)
 */
function calculateCycleEndMonth(cycleStartMonth: string): string {
  const [year, month] = cycleStartMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + 11, 1); // 11 months later
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parse status from matched text
 */
function parseStatusFromMatch(text: string): StatusLevel | null {
  const lower = text.toLowerCase();
  if (lower.includes('silver') || lower.includes('zilver') || lower.includes('argent')) return 'Silver';
  if (lower.includes('gold') || lower.includes('goud') || lower.includes('or')) return 'Gold';
  if (lower.includes('platinum') || lower.includes('platina') || lower.includes('platine')) return 'Platinum';
  if (lower.includes('ultimate')) return 'Ultimate';
  return null;
}
