// src/modules/local-text-parser/text-normalizer.ts
// Normalize text extracted from PDF to handle different line break patterns
// The PDF text extraction can produce text where each element is on a separate line

/**
 * Pattern to match transaction start dates
 * Format: "10 dec 2025" or "1 jan 2024"
 */
const DATE_ONLY_PATTERN = /^\d{1,2}\s+[a-zéû]{3,4}\s+\d{4}$/i;

/**
 * Pattern to match Miles values
 * Format: "367 Miles" or "-47000 Miles"
 */
const MILES_ONLY_PATTERN = /^-?\d+\s+Miles$/i;

/**
 * Pattern to match XP values
 * Format: "0 XP" or "-300 XP" or "20 XP"
 */
const XP_ONLY_PATTERN = /^-?\d+\s+XP$/i;

/**
 * Pattern to match UXP values
 * Format: "40 UXP" or "5 UXP"
 */
const UXP_ONLY_PATTERN = /^-?\d+\s+UXP$/i;

/**
 * Pattern to match activity date lines
 * Format: "op 21 nov 2025"
 */
const ACTIVITY_DATE_PATTERN = /^op\s+\d{1,2}\s+[a-zéû]{3,4}\s+\d{4}$/i;

/**
 * Pattern to match page header/footer
 */
const PAGE_HEADER_PATTERNS = [
  /^DEGRAAF\s+REMCO$/i,
  /^Flying Blue-nummer:/i,
  /^PLATINUM$/i,
  /^GOLD$/i,
  /^SILVER$/i,
  /^EXPLORER$/i,
  /^ULTIMATE$/i,
  /Pagina\s+\d+\/\d+/i,
];

/**
 * Check if a line is a page header/footer that should be skipped
 */
function isPageHeaderOrFooter(line: string): boolean {
  return PAGE_HEADER_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Normalize PDF text that may have been extracted with one element per line
 * 
 * Input format (from PDF extraction):
 * ```
 * 10 dec 2025
 * Hotel - BOOKING.COM WITH KLM
 * 367 Miles
 * 0 XP
 * BOOKING.COM WITH KLM
 * 367 Miles
 * 0 XP
 * op 21 nov 2025
 * ```
 * 
 * Output format (normalized for parser):
 * ```
 * 10 dec 2025 Hotel - BOOKING.COM WITH KLM 367 Miles 0 XP
 * BOOKING.COM WITH KLM 367 Miles 0 XP
 * op 21 nov 2025
 * ```
 */
export function normalizeText(text: string): string {
  const lines = text.split('\n');
  const normalizedLines: string[] = [];
  let buffer = '';
  let lastWasActivityDate = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Skip page headers/footers
    if (isPageHeaderOrFooter(line)) {
      continue;
    }
    
    // Check if this is a standalone date (transaction start)
    if (DATE_ONLY_PATTERN.test(line)) {
      // Save previous buffer if any
      if (buffer) {
        normalizedLines.push(buffer);
      }
      buffer = line;
      lastWasActivityDate = false;
      continue;
    }
    
    // Check if this is Miles/XP/UXP value
    if (MILES_ONLY_PATTERN.test(line) || XP_ONLY_PATTERN.test(line) || UXP_ONLY_PATTERN.test(line)) {
      // Append to current line
      if (buffer) {
        buffer += ' ' + line;
      } else {
        // Standalone value line (like SAF values) - add as new line
        buffer = line;
      }
      continue;
    }
    
    // Check if this is an activity date line
    if (ACTIVITY_DATE_PATTERN.test(line)) {
      // Activity date ends a block
      if (buffer) {
        normalizedLines.push(buffer);
      }
      normalizedLines.push(line);
      buffer = '';
      lastWasActivityDate = true;
      continue;
    }
    
    // Regular content line
    if (buffer) {
      // If buffer already has Miles/XP, start a new line (this is detail text)
      if (/\d+\s+(Miles|XP|UXP)/i.test(buffer) && !/^(Sustainable|Upgrade|gespaarde|Miles|XP|UXP|op\s)/i.test(line)) {
        // Check if this looks like a continuation (SAF, segment detail, etc.)
        if (/^(Sustainable|AMS|BER|CDG|MNL|OSL|ARN|CPH|KEF|BKK|YYZ|MAN|KRK|TRN|ZWE|ALC)/i.test(line) ||
            /^[A-Z]{3}\s*[-–—]\s*[A-Z]{3}/i.test(line) ||
            /^Upgrade\s/i.test(line) ||
            /^Extra\s+info/i.test(line) ||
            /^Aanvullende/i.test(line) ||
            /^Buy,\s+Gift/i.test(line) ||
            /^AMERICAN\s+EXPRESS/i.test(line) ||
            /^BOOKING\.COM/i.test(line) ||
            /^ALL-\s+Accor/i.test(line) ||
            /^CURRENCY/i.test(line) ||
            /^FLYING\s+BLUE/i.test(line) ||
            /^AIR\s+MILES/i.test(line) ||
            /^UBER/i.test(line) ||
            /^AMAZON/i.test(line) ||
            /^DISCOUNT\s+PASS/i.test(line) ||
            /^Reforestation/i.test(line) ||
            /^Chargeable/i.test(line) ||
            /^Miles\+Points/i.test(line) ||
            /^Qualification/i.test(line) ||
            /^Aantal\s+behaalde/i.test(line)) {
          // Continue current transaction block on new line
          normalizedLines.push(buffer);
          buffer = line;
        } else {
          // Append to current line
          buffer += ' ' + line;
        }
      } else {
        // Append to buffer (building header line)
        buffer += ' ' + line;
      }
    } else {
      // Start new buffer
      buffer = line;
    }
  }
  
  // Don't forget the last buffer
  if (buffer) {
    normalizedLines.push(buffer);
  }
  
  return normalizedLines.join('\n');
}

/**
 * Check if text looks like it needs normalization
 * (has many short lines that are just dates, miles, or XP values)
 */
export function needsNormalization(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim());
  
  // If less than 20 lines, probably already normalized
  if (lines.length < 20) {
    return false;
  }
  
  // Count how many lines are just dates, miles, or XP
  let shortPatternCount = 0;
  
  for (const line of lines.slice(0, 100)) {
    const trimmed = line.trim();
    if (DATE_ONLY_PATTERN.test(trimmed) ||
        MILES_ONLY_PATTERN.test(trimmed) ||
        XP_ONLY_PATTERN.test(trimmed) ||
        UXP_ONLY_PATTERN.test(trimmed)) {
      shortPatternCount++;
    }
  }
  
  // If more than 30% are short patterns, needs normalization
  return shortPatternCount > 30;
}
