// src/modules/local-text-parser/patterns.ts
// Regex patterns for parsing Flying Blue PDF text
// Organized by category with multi-language support

// ============================================================================
// DATE PATTERNS
// ============================================================================

/**
 * Dutch month names to number mapping
 */
export const DUTCH_MONTHS: Record<string, string> = {
  'jan': '01', 'januari': '01',
  'feb': '02', 'februari': '02',
  'mrt': '03', 'maart': '03',
  'apr': '04', 'april': '04',
  'mei': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'aug': '08', 'augustus': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'okt': '10', 'oct': '10', 'oktober': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12',
};

/**
 * English month names to number mapping
 */
export const ENGLISH_MONTHS: Record<string, string> = {
  'jan': '01', 'january': '01',
  'feb': '02', 'february': '02',
  'mar': '03', 'march': '03',
  'apr': '04', 'april': '04',
  'may': '05',
  'jun': '06', 'june': '06',
  'jul': '07', 'july': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'oct': '10', 'october': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12',
};

/**
 * French month names to number mapping
 */
export const FRENCH_MONTHS: Record<string, string> = {
  'jan': '01', 'janv': '01', 'janvier': '01',
  'fév': '02', 'fevr': '02', 'février': '02',
  'mar': '03', 'mars': '03',
  'avr': '04', 'avril': '04',
  'mai': '05',
  'jun': '06', 'juin': '06',
  'jul': '07', 'juil': '07', 'juillet': '07',
  'aoû': '08', 'aout': '08', 'août': '08',
  'sep': '09', 'sept': '09', 'septembre': '09',
  'oct': '10', 'octobre': '10',
  'nov': '11', 'novembre': '11',
  'déc': '12', 'dec': '12', 'décembre': '12',
};

/**
 * Combined month mapping for all languages
 */
export const ALL_MONTHS: Record<string, string> = {
  ...DUTCH_MONTHS,
  ...ENGLISH_MONTHS,
  ...FRENCH_MONTHS,
};

/**
 * Date pattern: "10 dec 2025" or "9 nov 2025" (day month year)
 */
export const DATE_DMY_PATTERN = /(\d{1,2})\s+(jan|feb|mrt|maart|apr|mei|jun|jul|aug|sep|sept|okt|oct|nov|dec|januari|februari|april|juni|juli|augustus|september|oktober|november|december|january|february|march|may|june|july|august|october)\s+(\d{4})/gi;

/**
 * Activity date pattern: "op 29 nov 2025" (Dutch) or "on 29 Nov 2025" (English)
 */
// Activity date pattern - supports both:
// Dutch: "op 6 sep 2025" (day month year)
// English: "on Sep 6, 2025" (month day, year)
export const ACTIVITY_DATE_PATTERN_NL = /(?:op|on)\s+(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/gi;
export const ACTIVITY_DATE_PATTERN_EN = /(?:op|on)\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/gi;
// Combined pattern for detection (looser match)
export const ACTIVITY_DATE_PATTERN = /(?:op|on)\s+(?:\d{1,2}\s+[a-zéû]+|[A-Za-z]+\s+\d{1,2},?)\s+\d{4}/gi;

/**
 * Qualification period date: "07/10/2025" (DD/MM/YYYY)
 */
export const QUALIFICATION_DATE_PATTERN = /(\d{2})\/(\d{2})\/(\d{4})/g;

// ============================================================================
// HEADER PATTERNS
// ============================================================================

/**
 * Header with totals (Dutch): "Activiteitengeschiedenis 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_NL = /Activiteiten(?:geschiedenis|overzicht)\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Header with totals (English): "Activity history 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_EN = /Activity\s+(?:history|overview)\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Header with totals (French): "Historique d'activité 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_FR = /Historique\s+d['']activit[ée]\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Flying Blue member number: "Flying Blue-nummer: 4629294326"
 */
export const FB_NUMBER_PATTERN = /Flying\s*Blue[-\s](?:nummer|number|numéro)\s*:?\s*(\d+)/i;

/**
 * Member name (uppercase, typically "LASTNAME FIRSTNAME")
 */
export const MEMBER_NAME_PATTERN = /^([A-Z][A-Z\s-]+[A-Z])\s*$/m;

/**
 * Status level
 */
export const STATUS_PATTERN = /\b(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\b/i;

/**
 * Page info pattern: "11 dec 2025 • Pagina 1/18" or "11 Dec 2025 • Page 1/18"
 */
export const PAGE_INFO_PATTERN = /(\d{1,2}\s+[a-zéû]+\s+\d{4})\s*[•·]\s*(?:Pagina|Page)\s+\d+\/\d+/i;

// ============================================================================
// MILES AND XP PATTERNS
// ============================================================================

/**
 * Miles and XP extraction: "367 Miles 0 XP" or "1312 Miles 16 XP 16 UXP" or "-45000 Miles 0 XP"
 */
export const MILES_XP_PATTERN = /(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?/gi;

/**
 * Single miles/xp extraction (non-global for single match)
 */
export const MILES_XP_SINGLE = /(-?\d+)\s*Miles\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?/i;

// ============================================================================
// FLIGHT PATTERNS
// ============================================================================

/**
 * Flight segment: "AMS - BER KL1775" or "CDG - MNL AF0224" or "AMS - OSL SK0822"
 * Captures: origin, destination, flight number
 */
export const FLIGHT_SEGMENT_PATTERN = /([A-Z]{3})\s*[-–—]\s*([A-Z]{3})\s+([A-Z]{2}\d{2,4})/gi;

/**
 * Transavia flight segment: "KEF – AMS TRANSAVIA HOLLAND"
 */
export const TRANSAVIA_SEGMENT_PATTERN = /([A-Z]{3})\s*[-–—]\s*([A-Z]{3})\s+TRANSAVIA\s*(?:HOLLAND)?/gi;

/**
 * Award/redemption route: "AMS - YYZ, REMCO Degraaf"
 * Has passenger name after the route
 */
export const AWARD_ROUTE_PATTERN = /([A-Z]{3})\s*[-–—]\s*([A-Z]{3})(?:\s*[-–—]\s*[A-Z]{3})?,\s*[A-Z][a-z]+\s+[A-Z][a-z]+/gi;

/**
 * SAF bonus line: "Sustainable Aviation Fuel 176 Miles 3 XP 3 UXP"
 */
export const SAF_PATTERN = /Sustainable\s+Aviation\s+Fuel\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/gi;

/**
 * Trip header (Dutch): "Mijn reis naar Berlijn"
 */
export const TRIP_HEADER_NL = /Mijn\s+reis\s+naar\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

/**
 * Trip header (English): "My trip to Berlin"
 */
export const TRIP_HEADER_EN = /My\s+trip\s+to\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

// ============================================================================
// TRANSACTION TYPE PATTERNS
// ============================================================================

export interface TransactionTypePattern {
  type: string;
  patterns: RegExp[];
  priority: number;  // Higher = check first
}

/**
 * Patterns for classifying transaction types
 * Ordered by priority (higher = check first)
 */
export const TRANSACTION_TYPE_PATTERNS: TransactionTypePattern[] = [
  // FLIGHTS (highest priority)
  {
    type: 'FLIGHT_KLM_AF',
    patterns: [
      /gespaarde\s+Miles\s+op\s+basis\s+van\s+bestede\s+euro/i,
      /earned\s+Miles\s+based\s+on\s+euros?\s+spent/i,
      /Miles\s+earned\s+based\s+on\s+[€£$]?\s*spent/i,  // English: "Miles earned based on € spent"
      /Miles\s+gagnés\s+sur\s+la\s+base\s+des\s+euros\s+dépensés/i,
    ],
    priority: 100,
  },
  {
    type: 'FLIGHT_PARTNER',
    patterns: [
      /gespaarde\s+Miles,?\s*op\s+basis\s+van\s+reisafstand/i,
      /earned\s+Miles,?\s*based\s+on\s+travel\s+distance/i,
      /Miles\s+earned\s+based\s+on\s+distance\s*[&,]\s*booking\s+class/i,  // English: "Miles earned based on distance & booking class"
      /Miles\s+gagnés,?\s*sur\s+la\s+base\s+de\s+la\s+distance/i,
      /op\s+basis\s+van\s+reisafstand\s+en\s+boekingsklasse/i,
    ],
    priority: 95,
  },
  {
    type: 'FLIGHT_TRANSAVIA',
    patterns: [
      /TRANSAVIA/i,
    ],
    priority: 90,
  },
  {
    type: 'FLIGHT_AWARD',
    patterns: [
      // Award booking header: negative miles in header line
      /^\d{1,2}\s+[a-z]+\s+\d{4}\s+-\d+\s*Miles/im,
      // Negative miles with passenger name pattern
      /^-\d+\s*Miles\s+0\s*XP/m,
      // Award routes with passenger names
      /[A-Z]{3}\s*[-–]\s*[A-Z]{3}.*,\s*[A-Z][a-z]+\s+[A-Z][a-z]+/,
    ],
    priority: 85,
  },
  
  // UPGRADES
  {
    type: 'UPGRADE',
    patterns: [
      /Last\s*-?\s*minute\s*-?\s*upgrade/i,  // Matches "Lastminute-upgrade", "Last minute upgrade", "Last-minute-upgrade"
      /Upgrade\s+Economy\s+to/i,
      /Upgrade\s+Business\s+to/i,
      /Upgrade\s+Premium\s+Economy\s+to/i,
    ],
    priority: 80,
  },
  
  // SUBSCRIPTION & CARDS
  {
    type: 'SUBSCRIPTION',
    patterns: [
      /Subscribe\s+to\s+Miles/i,
      /Miles\s+Complete/i,
      /Discount\s+Pass/i,
      /Buy,?\s+Gift,?\s+Transfer,?\s+Subscribe/i,
    ],
    priority: 75,
  },
  {
    type: 'CREDIT_CARD_BONUS',
    patterns: [
      /AMERICAN\s+EXPRESS.*Welcome\s*bonus/i,
      /AMEX.*Welcome\s*bonus/i,
      /Platinum\s+Welcome\s*bonus/i,
      /Silver\s+Annual\s*bonus/i,
      /Platinum\s+Annual\s*bonus/i,
      /Gold\s+Annual\s*bonus/i,
      /FLYING\s+BLUE\s+AMEX.*BONUS/i,
    ],
    priority: 72,
  },
  {
    type: 'CREDIT_CARD',
    patterns: [
      /AMERICAN\s+EXPRESS/i,
      /AMEX\s/i,
      /AF-KLM\s+SPEND/i,
      /Brim\s+AFKL\s+Mastercard/i,  // Canadian credit card
      /BRIM\s/i,  // BRIM detail lines
    ],
    priority: 70,
  },
  
  // TRANSFERS
  {
    type: 'TRANSFER_IN',
    patterns: [
      /Miles\s+overdragen.*Flying\s+Blue\s+Family/i,
      /Miles\s+van\s+[A-Z]/i,  // "Miles van CHRISTY"
      /Transfer\s+Miles.*from/i,
      /Flying\s+Blue\s+Family/i,
    ],
    priority: 65,
  },
  {
    type: 'TRANSFER_OUT',
    patterns: [
      /Miles\s+naar\s+[A-Z]/i,  // "Miles naar CHRISTY"
      /Transfer\s+Miles.*to\s+[A-Z]/i,
    ],
    priority: 64,
  },
  
  // PARTNERS
  {
    type: 'HOTEL',
    patterns: [
      /Hotel\s*[-–]/i,
      /BOOKING\.COM/i,
      /Accor\s+Live\s+Limitless/i,
      /ALL-\s/i,
      /MILES\+POINTS/i,
    ],
    priority: 60,
  },
  {
    type: 'SHOPPING',
    patterns: [
      /Winkelen\s*[-–]/i,
      /Shopping\s*[-–]/i,
      /AMAZON/i,
      /FLYING\s+BLUE\s+SHOP/i,
    ],
    priority: 55,
  },
  {
    type: 'CAR_RENTAL',
    patterns: [
      /Autoverhuur/i,
      /Car\s+rental/i,
      /HERTZ/i,
      /AVIS/i,
      /EUROPCAR/i,
      /SIXT/i,
    ],
    priority: 54,
  },
  
  // XP EVENTS
  {
    type: 'XP_ROLLOVER',
    patterns: [
      /Surplus\s+XP\s+beschikbaar/i,
      /Surplus\s+XP\s+available/i,
      /XP\s+excédentaires/i,
      /meegenomen\s+naar\s+de\s+nieuwe\s+kwalificatieperiode/i,
    ],
    priority: 50,
  },
  {
    type: 'XP_DEDUCTION',
    patterns: [
      /Aftrek\s+XP-?\s*teller/i,  // Matches "Aftrek XP-teller" and "Aftrek XP- teller" (with space)
      /Reset\s+XP-?\s*teller/i,   // Matches "Reset XP-teller" and "Reset XP- teller"
      /XP\s+counter\s+(?:deduction|reset|adjustment)/i,
      /Déduction\s+du\s+compteur\s+XP/i,
      /Qualification\s+period\s+ended/i,
      /(?:Explorer|Silver|Gold|Platinum|Ultimate)\s+reached/i,
    ],
    priority: 50,
  },
  
  // DONATION
  {
    type: 'DONATION',
    patterns: [
      /Miles\s+donation/i,
      /donatie/i,
      /AIR\s+CARES/i,
      /RODE\s+KRUIS/i,
      /RED\s+CROSS/i,
    ],
    priority: 45,
  },
  
  // ADJUSTMENTS
  {
    type: 'ADJUSTMENT',
    patterns: [
      /Air\s+adjustment/i,
      /Klantenservice/i,
      /Customer\s+service/i,
      /correctie/i,
      /correction/i,
    ],
    priority: 40,
  },
  
  // OTHER PARTNERS
  {
    type: 'PARTNER',
    patterns: [
      /CURRENCY\s+ALLIANCE/i,
      /Batavia\s+Miles/i,
      /e-?\s*rewards?\s+Miles/i,
      /Kolet\s+eSIM/i,
      /Air\s+Miles\s+to\s+Flying\s+Blue/i,
      /RevPoints\s+to\s+Miles/i,
      /REVOLUT/i,
      /partner/i,
    ],
    priority: 30,
  },
  
  // TRANSPORTATION (Uber, etc)
  {
    type: 'OTHER',
    patterns: [
      /Auto\s*&\s*Taxi/i,
      /Your\s+ride\s+with\s+Uber/i,
      /UBER/i,
    ],
    priority: 25,
  },
];

// ============================================================================
// LANGUAGE DETECTION PATTERNS
// ============================================================================

export const LANGUAGE_INDICATORS = {
  nl: [
    /Activiteitengeschiedenis/i,
    /Mijn\s+reis\s+naar/i,
    /gespaarde\s+Miles/i,
    /Aftrek\s+XP-teller/i,
    /beschikbaar/i,
    /Winkelen/i,
    /overdragen/i,
    /Pagina/i,
  ],
  en: [
    /Activity\s+history/i,
    /My\s+trip\s+to/i,
    /earned\s+Miles/i,
    /XP\s+counter\s+deduction/i,
    /available/i,
    /Shopping/i,
    /transfer/i,
    /Page\s+\d/i,
  ],
  fr: [
    /Historique\s+d'activité/i,
    /Mon\s+voyage/i,
    /Miles\s+gagnés/i,
    /Déduction/i,
    /disponible/i,
    /Achats/i,
    /transférer/i,
  ],
  de: [
    /Aktivitätsverlauf/i,
    /Meine\s+Reise/i,
    /gesammelte\s+Miles/i,
    /Abzug/i,
    /verfügbar/i,
    /Einkaufen/i,
  ],
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

/**
 * Pattern to detect if text is Flying Blue content
 */
export const FLYING_BLUE_CONTENT_INDICATORS = [
  /Flying\s*Blue/i,
  /Miles\s+\d+\s*XP/i,
  /Activiteiten(?:geschiedenis|overzicht)/i,
  /Activity\s+(?:history|overview)/i,
  /[A-Z]{3}\s*[-–]\s*[A-Z]{3}\s+[A-Z]{2}\d{2,4}/i,  // Flight pattern
];

/**
 * Patterns that indicate page headers/footers (to be filtered out)
 */
export const PAGE_HEADER_FOOTER_PATTERNS = [
  /^\s*(?:Pagina|Page)\s+\d+\/\d+\s*$/im,
  /^\s*\d{1,2}\s+[a-z]+\s+\d{4}\s*[•·]\s*(?:Pagina|Page)/im,
  /^\s*Flying\s*Blue[-\s](?:nummer|number)/im,
  /^\s*(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\s*$/im,
];
