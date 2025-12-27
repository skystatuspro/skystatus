// src/modules/local-text-parser/text-normalizer.ts
// Normalize text extracted from PDF to handle different line break patterns
// The PDF text extraction can produce text where each element is on a separate line

/**
 * Pattern to match transaction start dates
 * DMY Format: "10 dec 2025" or "1 jan 2024" or "10. Dez. 2025" (German with dots)
 * MDY Format: "Dec 10, 2025" (English)
 */
const DATE_DMY_PATTERN = /^\d{1,2}\.?\s+[a-zéûäçãõ]{3,12}\.?\s+\d{4}$/i;
const DATE_MDY_PATTERN = /^[a-z]{3,12}\.?\s+\d{1,2},?\s+\d{4}$/i;
const DATE_ONLY_PATTERN = DATE_DMY_PATTERN;  // Legacy alias

function isDateLine(line: string): boolean {
  return DATE_DMY_PATTERN.test(line) || DATE_MDY_PATTERN.test(line);
}

/**
 * Pattern to match Miles values
 * Format: "367 Miles" or "-47000 Miles" or "367 Meilen" (German)
 */
const MILES_ONLY_PATTERN = /^-?\d+\s+(?:Miles|Meilen)$/i;

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
 * Supports all 7 languages:
 * - Dutch: "op 21 nov 2025"
 * - English: "on Sep 6, 2025" or "on 6 Sep 2025"
 * - French: "le 21 nov 2025"
 * - German: "am 21. Nov. 2025" (with dots after day and month)
 * - Spanish: "el 21 nov 2025"
 * - Italian: "il 21 nov 2025"
 * - Portuguese: "em 21 nov 2025"
 */
const ACTIVITY_DATE_PATTERN_DMY = /^(?:op|on|le|am|el|il|em)\s+\d{1,2}\.?\s+[a-zéûäçãõ]{3,12}\.?\s+\d{4}$/i;
const ACTIVITY_DATE_PATTERN_MDY = /^(?:op|on|le|am|el|il|em)\s+[A-Za-z]{3,12}\.?\s+\d{1,2},?\s+\d{4}$/i;

// Legacy aliases
const ACTIVITY_DATE_PATTERN_NL = ACTIVITY_DATE_PATTERN_DMY;
const ACTIVITY_DATE_PATTERN_EN = ACTIVITY_DATE_PATTERN_MDY;

function isActivityDateLine(line: string): boolean {
  return ACTIVITY_DATE_PATTERN_DMY.test(line) || ACTIVITY_DATE_PATTERN_MDY.test(line);
}

/**
 * Pattern to match page header/footer
 * Supports: Pagina (NL), Page (EN/FR), Seite (DE), Página (ES/PT)
 */
const PAGE_HEADER_PATTERNS = [
  /^[A-Z][A-Z\s-]+[A-Z]$/,  // Member names (e.g., "DEGRAAF REMCO", "BUKOWSKI BRIAN")
  /^Flying Blue[-\s](?:nummer|number|numéro|Nummer|número|numero)\s*:/i,  // "Flying Blue-nummer:" etc.
  /^(?:Numéro|Número|Numero)\s+Flying Blue\s*:/i,  // French/Spanish/Italian/Portuguese: "Numéro Flying Blue :"
  /^PLATINUM$/i,
  /^GOLD$/i,
  /^SILVER$/i,
  /^EXPLORER$/i,
  /^ULTIMATE$/i,
  /(?:Pagina|Page|Seite|Página)\s+\d+\/\d+/i,
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
/**
 * Pre-process text to join known broken line patterns
 * This handles the hybrid format where descriptions are split across lines
 */
function joinBrokenLines(text: string): string {
  let result = text;
  
  // Join "AMERICAN EXPRESS PLATINUM\nCARD" → "AMERICAN EXPRESS PLATINUM CARD"
  result = result.replace(/AMERICAN EXPRESS PLATINUM\s*\n\s*CARD\b/gi, 'AMERICAN EXPRESS PLATINUM CARD');
  result = result.replace(/AMERICAN EXPRESS SILVER\s*\n\s*CARD\b/gi, 'AMERICAN EXPRESS SILVER CARD');
  
  // Join "CARD\nAF-KLM SPEND" → "CARD AF-KLM SPEND"
  result = result.replace(/\bCARD\s*\n\s*AF-KLM SPEND/gi, 'CARD AF-KLM SPEND');
  
  // Join "Accor Live Limitless\nMILES+POINTS" → "Accor Live Limitless MILES+POINTS"
  result = result.replace(/Accor Live Limitless\s*\n\s*MILES\+POINTS/gi, 'Accor Live Limitless MILES+POINTS');
  
  // Join "gespaarde Miles op basis\nvan bestede euro's" → single line
  result = result.replace(/gespaarde Miles op basis\s*\n\s*van bestede euro's/gi, "gespaarde Miles op basis van bestede euro's");
  result = result.replace(/gespaarde Miles, op basis\s*\n\s*van reisafstand/gi, 'gespaarde Miles, op basis van reisafstand');
  
  // Join "Discount Pass\nCaribbean Guyana Reun" → single line
  result = result.replace(/Discount Pass\s*\n\s*Caribbean Guyana Reun/gi, 'Discount Pass Caribbean Guyana Reun');
  
  // Join "with Uber\nNetherlands" → single line
  result = result.replace(/with Uber\s*\n\s*Netherlands/gi, 'with Uber Netherlands');
  
  // Join "AMEX PLATINUM CARD\nBONUS" → single line
  result = result.replace(/AMEX PLATINUM CARD\s*\n\s*BONUS/gi, 'AMEX PLATINUM CARD BONUS');
  
  // ==========================================
  // XP SURPLUS / ROLLOVER LINE BREAK FIXES
  // ==========================================
  // Join "Surplus XP available on the XP\ncounter" → single line (English)
  result = result.replace(/Surplus XP available on the XP\s*\n\s*counter/gi, 'Surplus XP available on the XP counter');
  
  // Join "Surplus XP beschikbaar op XP-\nteller" → single line (Dutch)
  result = result.replace(/Surplus XP beschikbaar op XP-?\s*\n\s*teller/gi, 'Surplus XP beschikbaar op XP-teller');
  
  // Join "Surplus de XP disponible sur le\ncompteur de XP" → single line (French)
  result = result.replace(/Surplus de XP disponible sur le\s*\n\s*compteur de XP/gi, 'Surplus de XP disponible sur le compteur de XP');
  
  // Join "Überschüssige XP verfügbar auf dem\nXP-Zähler" → single line (German)
  result = result.replace(/Überschüssige XP verfügbar auf dem\s*\n\s*XP-Zähler/gi, 'Überschüssige XP verfügbar auf dem XP-Zähler');
  
  // Join "XP counter\noffset" → single line (English deduction)
  result = result.replace(/XP counter\s*\n\s*offset/gi, 'XP counter offset');
  
  // Join "Aftrek XP-\nteller" → single line (Dutch deduction)
  result = result.replace(/Aftrek XP-?\s*\n\s*teller/gi, 'Aftrek XP-teller');
  
  // Join "Déduction du compteur\nde XP" → single line (French deduction)
  result = result.replace(/Déduction du compteur\s*\n\s*de XP/gi, 'Déduction du compteur de XP');
  
  // CRITICAL: Ensure line break BEFORE "XP gained" / "XP obtenus" / "Aantal behaalde XP" detail text
  // After joining "XP\ncounter", we need to make sure the detail text stays on its own line
  // Insert newline before XP rollover detail patterns if they're preceded by Miles/XP values
  result = result.replace(/(\d+\s+XP)\s*\n?\s*(XP\s+gained\s+in\s+previous)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s*\n?\s*(XP\s+obtenus?\s+lors)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s*\n?\s*(Aantal\s+behaalde\s+XP)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s*\n?\s*(XP\s+verdient\s+in)/gi, '$1\n$2');
  
  // ==========================================
  // END XP FIXES
  // ==========================================
  
  // Join lines where a number + Miles/XP is on its own line after description
  // e.g., "Hotel - BOOKING.COM WITH KLM\n367 Miles 0 XP" → joined
  // This is tricky - we need to be careful not to join too much
  // For now, handle specific cases where description ends with known partners
  result = result.replace(/(BOOKING\.COM WITH KLM)\s*\n\s*(\d+\s+Miles)/gi, '$1 $2');
  result = result.replace(/(ALL- Accor Live Limitless MILES\+POINTS)\s*\n\s*(\d+\s+Miles)/gi, '$1 $2');
  result = result.replace(/(AMERICAN EXPRESS)\s*\n\s*(\d+\s+Miles)/gi, '$1 $2');
  
  return result;
}

export function normalizeText(text: string): string {
  // First, join known broken line patterns
  const preprocessed = joinBrokenLines(text);
  
  const lines = preprocessed.split('\n');
  const normalizedLines: string[] = [];
  let buffer = '';
  let lastWasActivityDate = false;
  
  // Pattern for a complete transaction line (date + description + Miles + XP)
  // DMY formats (Dutch, French, German, Spanish, Italian, Portuguese):
  // "17 dec 2025 Subscribe to Miles Complete EUR 17000 Miles 0 XP"
  // "10. Dez. 2025 Description 367 Meilen 0 XP" (German with dots and Meilen)
  // MDY format (English):
  // "Dec 9, 2025 Brim AFKL Mastercard - Miles earn on expenses 73 Miles 0 XP"
  const COMPLETE_TRANSACTION_LINE_DMY = /^\d{1,2}\.?\s+[a-zéûäçãõ]{3,12}\.?\s+\d{4}\s+.+\d+\s+(?:Miles|Meilen)\s+-?\d+\s+XP/i;
  const COMPLETE_TRANSACTION_LINE_MDY = /^[A-Za-z]{3,12}\.?\s+\d{1,2},?\s+\d{4}\s+.+\d+\s+(?:Miles|Meilen)\s+-?\d+\s+XP/i;
  
  // Legacy aliases
  const COMPLETE_TRANSACTION_LINE_NL = COMPLETE_TRANSACTION_LINE_DMY;
  const COMPLETE_TRANSACTION_LINE_EN = COMPLETE_TRANSACTION_LINE_MDY;
  
  // Pattern for header line (all languages)
  // Dutch: "Activiteitengeschiedenis", English: "Activity history", French: "Historique des activités"
  // German: "Aktivitätsverlauf", Spanish: "Historial de actividad", Italian: "Cronologia attività"
  // Portuguese: "Histórico de atividade"
  // NOTE: French uses "Historique des activités" (plural with "des"), NOT "Historique d'activité"
  const HEADER_LINE = /^(Activiteitengeschiedenis|Activity\s+history|Historique\s+(?:des\s+activit[ée]s|d['']activit[ée])|Aktivit[äa]tsverlauf|Historial\s+de\s+actividad|Cronologia\s+attivit[àa]|Hist[óo]rico\s+de\s+atividade)\s+/i;
  
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
    
    // Check if this is a header line - keep it separate
    if (HEADER_LINE.test(line)) {
      if (buffer) {
        normalizedLines.push(buffer);
      }
      normalizedLines.push(line);
      buffer = '';
      continue;
    }
    
    // Check if this is a complete transaction line - keep it as-is
    if (COMPLETE_TRANSACTION_LINE_DMY.test(line) || COMPLETE_TRANSACTION_LINE_MDY.test(line)) {
      if (buffer) {
        normalizedLines.push(buffer);
      }
      normalizedLines.push(line);
      buffer = '';
      continue;
    }
    
    // Check if this is a standalone date (transaction start)
    // Supports both DMY (European) and MDY (North American) formats
    if (isDateLine(line)) {
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
    if (isActivityDateLine(line)) {
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
            /^Aantal\s+behaalde/i.test(line) ||
            // XP rollover detail text patterns - these should be on their own line
            /^XP\s+gained\s+in\s+previous/i.test(line) ||
            /^XP\s+obtenus?\s+lors/i.test(line) ||
            /^XP\s+verdient\s+in/i.test(line) ||
            /^XP\s+ganados?\s+en/i.test(line) ||
            /^XP\s+guadagnati?\s+nel/i.test(line) ||
            /^XP\s+ganhos?\s+no/i.test(line)) {
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
  
  let result = normalizedLines.join('\n');
  
  // POST-PROCESSING: Ensure XP rollover detail text is on its own line
  // This must happen AFTER all other normalization because the main loop may have joined these
  result = result.replace(/(\d+\s+XP)\s+(XP\s+gained\s+in\s+previous)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(XP\s+obtenus?\s+lors)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(Aantal\s+behaalde\s+XP)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(XP\s+verdient\s+in)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(XP\s+ganados?\s+en)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(XP\s+guadagnati?\s+nel)/gi, '$1\n$2');
  result = result.replace(/(\d+\s+XP)\s+(XP\s+ganhos?\s+no)/gi, '$1\n$2');
  
  return result;
}

/**
 * Patterns that indicate broken lines from PDF copy-paste
 * These are common continuations that should be joined to previous line
 */
const BROKEN_LINE_PATTERNS = [
  /^CARD$/i,                          // After "AMERICAN EXPRESS PLATINUM"
  /^CARD\s+AF-KLM\s+SPEND$/i,         // After "AMERICAN EXPRESS PLATINUM"
  /^MILES\+POINTS$/i,                 // After "ALL- Accor Live Limitless"
  /^BONUS$/i,                         // After "FLYING BLUE AMEX PLATINUM CARD"
  /^van\s+bestede\s+euro/i,           // After "gespaarde Miles op basis"
  /^van\s+reisafstand/i,              // After "gespaarde Miles, op basis"
  /^Caribbean\s+Guyana/i,             // After "Subscription - Discount Pass"
  /^Netherlands$/i,                   // After "Your ride with Uber"
];

/**
 * Check if text looks like it needs normalization
 * Detects both:
 * 1. Pure PDF extraction format (each element on separate line)
 * 2. Hybrid browser copy-paste format (some lines broken mid-description)
 */
export function needsNormalization(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim());
  
  // If less than 20 lines, probably already normalized
  if (lines.length < 20) {
    return false;
  }
  
  // Count how many lines are just dates, miles, or XP
  let shortPatternCount = 0;
  let brokenLineCount = 0;
  
  for (const line of lines.slice(0, 200)) {
    const trimmed = line.trim();
    
    // Check for pure extraction format patterns
    if (DATE_ONLY_PATTERN.test(trimmed) ||
        MILES_ONLY_PATTERN.test(trimmed) ||
        XP_ONLY_PATTERN.test(trimmed) ||
        UXP_ONLY_PATTERN.test(trimmed)) {
      shortPatternCount++;
    }
    
    // Check for hybrid format patterns (broken descriptions)
    if (BROKEN_LINE_PATTERNS.some(p => p.test(trimmed))) {
      brokenLineCount++;
    }
  }
  
  // Needs normalization if:
  // 1. More than 30% are short patterns (pure extraction format), OR
  // 2. More than 3 broken line patterns found (hybrid format)
  return shortPatternCount > 30 || brokenLineCount > 3;
}
