// src/modules/local-text-parser/activity-parser.ts
// Parse non-flight activity transactions

import type { ClassifiedTransaction, TransactionType } from './types';
import type { AIRawMilesActivity } from '../ai-pdf-parser/types';
import { MILES_XP_SINGLE, ACTIVITY_DATE_PATTERN, ALL_MONTHS } from './patterns';
import { parseDateToISO } from './header-parser';

/**
 * Map internal transaction type to AI parser activity type
 */
function mapTransactionTypeToActivityType(
  type: TransactionType
): AIRawMilesActivity['type'] {
  const typeMap: Record<TransactionType, AIRawMilesActivity['type']> = {
    'FLIGHT_KLM_AF': 'other',      // Flights are handled separately
    'FLIGHT_PARTNER': 'other',
    'FLIGHT_TRANSAVIA': 'other',
    'FLIGHT_AWARD': 'redemption',
    'UPGRADE': 'redemption',
    'SUBSCRIPTION': 'subscription',
    'CREDIT_CARD': 'amex',
    'CREDIT_CARD_BONUS': 'amex_bonus',
    'TRANSFER_IN': 'transfer_in',
    'TRANSFER_OUT': 'transfer_out',
    'HOTEL': 'hotel',
    'SHOPPING': 'shopping',
    'CAR_RENTAL': 'car_rental',
    'DONATION': 'donation',
    'XP_ROLLOVER': 'other',        // Handled separately
    'XP_DEDUCTION': 'other',       // Handled separately
    'ADJUSTMENT': 'adjustment',
    'PARTNER': 'partner',
    'OTHER': 'other',
  };
  
  return typeMap[type] || 'other';
}

/**
 * Extract description from transaction block
 */
function extractDescription(block: ClassifiedTransaction): string {
  const firstLine = block.text.split('\n')[0];
  
  // Special case: award bookings without description (just date + negative miles)
  // Pattern: "18 nov 2025 -180000 Miles 0 XP"
  if (/^\d{1,2}\s+[a-z]+\s+\d{4}\s+-\d+\s*Miles/i.test(firstLine)) {
    // Try to extract destination from the content
    const routeMatch = block.text.match(/([A-Z]{3})\s*[-–]\s*([A-Z]{3})/);
    if (routeMatch) {
      return `Award booking to ${routeMatch[2]}`;
    }
    return 'Award booking';
  }
  
  // Remove date and miles/XP from first line to get description
  // DMY Pattern: "10 dec 2025 AMERICAN EXPRESS PLATINUM CARD 10811 Miles 0 XP"
  // DMY Pattern with dot: "10. Dez. 2025 AMERICAN EXPRESS PLATINUM CARD 10811 Meilen 0 XP"
  // MDY Pattern: "Dec 10, 2025 AMERICAN EXPRESS PLATINUM CARD 10811 Miles 0 XP"
  
  // Try DMY format first (most common)
  const matchDMY = firstLine.match(/^\d{1,2}\.?\s+[a-zéûäçãõ]+\.?\s+\d{4}\s+(.+?)\s+(-?\d+)\s*(?:Miles|Meilen)/i);
  if (matchDMY) {
    return matchDMY[1].trim();
  }
  
  // Try MDY format (English)
  const matchMDY = firstLine.match(/^[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}\s+(.+?)\s+(-?\d+)\s*(?:Miles|Meilen)/i);
  if (matchMDY) {
    return matchMDY[1].trim();
  }
  
  // Fallback: return first line cleaned up (handles both date formats)
  return firstLine
    .replace(/^\d{1,2}\.?\s+[a-zéûäçãõ]+\.?\s+\d{4}\s+/i, '')  // Remove DMY date
    .replace(/^[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}\s+/i, '')       // Remove MDY date
    .replace(/\s*(-?\d+)\s*(?:Miles|Meilen).*$/i, '')           // Remove miles suffix
    .trim();
}

/**
 * Extract miles and XP from first line of block
 */
function extractMilesXpFromBlock(block: ClassifiedTransaction): { miles: number; xp: number } {
  const firstLine = block.text.split('\n')[0];
  const match = firstLine.match(MILES_XP_SINGLE);
  
  if (match) {
    return {
      miles: parseInt(match[1], 10) || 0,
      xp: parseInt(match[2], 10) || 0,
    };
  }
  
  return { miles: 0, xp: 0 };
}

/**
 * Get the activity date from block
 * 
 * IMPORTANT: For redemptions (award bookings, lastminute upgrades), 
 * we use the POSTING DATE because the miles are deducted immediately
 * when the booking is made, not when the flight takes place.
 */
function getActivityDate(block: ClassifiedTransaction): string {
  // For redemptions: use posting date (miles deducted at booking, not at flight)
  // This includes: award bookings, lastminute-upgrades, etc.
  if (block.type === 'FLIGHT_AWARD' || block.type === 'UPGRADE') {
    return block.postingDate;
  }
  
  // Prefer activity date over posting date for earnings
  if (block.activityDate) {
    return block.activityDate;
  }
  
  // Look for "op XX XXX XXXX" in the full text
  ACTIVITY_DATE_PATTERN.lastIndex = 0;
  const match = ACTIVITY_DATE_PATTERN.exec(block.text);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    const year = match[3];
    const month = ALL_MONTHS[monthName];
    
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Fallback to posting date
  return block.postingDate;
}

/**
 * Detect if this is an AMEX AF-KLM spend vs regular AMEX spend
 */
function isAmexAfKlmSpend(text: string): boolean {
  return /AF-KLM\s+SPEND/i.test(text) || /AF[-\s]KLM/i.test(text);
}

/**
 * Detect if this is a welcome/annual bonus
 */
function isWelcomeBonus(text: string): boolean {
  return /Welcome\s*bonus/i.test(text) || /Annual\s*bonus/i.test(text);
}

/**
 * Parse a single activity transaction
 */
function parseActivityBlock(block: ClassifiedTransaction): AIRawMilesActivity {
  const description = extractDescription(block);
  const { miles, xp } = extractMilesXpFromBlock(block);
  const date = getActivityDate(block);
  let type = mapTransactionTypeToActivityType(block.type);
  
  // Refine AMEX type
  if (type === 'amex') {
    if (isWelcomeBonus(block.text)) {
      type = 'amex_bonus';
    }
  }
  
  // Handle transfers: positive miles with "overdragen" is transfer_in
  // (the PDF owner receives miles from family member)
  if (type === 'transfer_in' && miles < 0) {
    type = 'transfer_out';
  } else if (type === 'transfer_out' && miles > 0) {
    type = 'transfer_in';
  }
  
  return {
    date,
    type,
    description,
    miles,
    xp,
  };
}

/**
 * Parse all non-flight activity transactions
 */
export function parseActivityTransactions(
  activityBlocks: ClassifiedTransaction[]
): AIRawMilesActivity[] {
  const activities: AIRawMilesActivity[] = [];
  
  for (const block of activityBlocks) {
    // Skip upgrade transactions (they're handled like redemptions but we might want to track them separately)
    if (block.type === 'UPGRADE') {
      // Parse as redemption
      const activity = parseActivityBlock(block);
      activity.type = 'redemption';
      activities.push(activity);
      continue;
    }
    
    // Skip if no miles and no XP
    const { miles, xp } = extractMilesXpFromBlock(block);
    if (miles === 0 && xp === 0) {
      continue;
    }
    
    activities.push(parseActivityBlock(block));
  }
  
  return activities;
}

/**
 * Parse donation transactions (they often have both negative miles AND bonus XP)
 * Returns two activities: the donation (negative miles) and the XP bonus
 */
export function parseDonationTransaction(block: ClassifiedTransaction): AIRawMilesActivity[] {
  const activities: AIRawMilesActivity[] = [];
  const lines = block.text.split('\n');
  
  for (const line of lines) {
    const match = line.match(MILES_XP_SINGLE);
    if (!match) continue;
    
    const miles = parseInt(match[1], 10) || 0;
    const xp = parseInt(match[2], 10) || 0;
    
    // Donation with negative miles
    if (miles < 0) {
      activities.push({
        date: getActivityDate(block),
        type: 'donation',
        description: extractDescription(block),
        miles,
        xp: 0,  // XP bonus is separate
      });
    }
    
    // XP bonus for donation (0 miles, positive XP)
    if (miles === 0 && xp > 0) {
      activities.push({
        date: getActivityDate(block),
        type: 'donation',
        description: 'XP reward for Miles donation',
        miles: 0,
        xp,
      });
    }
  }
  
  // If we didn't find separate lines, parse as single transaction
  if (activities.length === 0) {
    activities.push(parseActivityBlock(block));
  }
  
  return activities;
}

/**
 * Debug helper
 */
export function debugActivityParsing(block: ClassifiedTransaction): void {
  console.log('[ActivityParser] Block type:', block.type);
  console.log('[ActivityParser] Description:', extractDescription(block));
  
  const activity = parseActivityBlock(block);
  console.log('[ActivityParser] Parsed:', activity);
}
