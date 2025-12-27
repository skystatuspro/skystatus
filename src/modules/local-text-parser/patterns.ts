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
  'fév': '02', 'févr': '02', 'fevr': '02', 'février': '02', 'fevrier': '02',
  'mar': '03', 'mars': '03',
  'avr': '04', 'avril': '04',
  'mai': '05',
  'jun': '06', 'juin': '06',
  'jul': '07', 'juil': '07', 'juillet': '07',
  'aoû': '08', 'aout': '08', 'août': '08',
  'sep': '09', 'sept': '09', 'septembre': '09',
  'oct': '10', 'octobre': '10',
  'nov': '11', 'novembre': '11',
  'déc': '12', 'dec': '12', 'décembre': '12', 'decembre': '12',
};

/**
 * German month names to number mapping
 * Note: German uses "Mär" or "März", and may have dots after abbreviations (e.g., "Dez.")
 * The dot is stripped before lookup, so we include both with and without
 */
export const GERMAN_MONTHS: Record<string, string> = {
  'jan': '01', 'januar': '01',
  'feb': '02', 'februar': '02',
  'mär': '03', 'mar': '03', 'märz': '03', 'marz': '03', 'mrz': '03',
  'apr': '04', 'april': '04',
  'mai': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'okt': '10', 'oktober': '10',
  'nov': '11', 'november': '11',
  'dez': '12', 'dezember': '12',
};

/**
 * Spanish month names to number mapping
 */
export const SPANISH_MONTHS: Record<string, string> = {
  'ene': '01', 'enero': '01',
  'feb': '02', 'febrero': '02',
  'mar': '03', 'marzo': '03',
  'abr': '04', 'abril': '04',
  'may': '05', 'mayo': '05',
  'jun': '06', 'junio': '06',
  'jul': '07', 'julio': '07',
  'ago': '08', 'agosto': '08',
  'sep': '09', 'sept': '09', 'septiembre': '09',
  'oct': '10', 'octubre': '10',
  'nov': '11', 'noviembre': '11',
  'dic': '12', 'diciembre': '12',
};

/**
 * Italian month names to number mapping
 */
export const ITALIAN_MONTHS: Record<string, string> = {
  'gen': '01', 'gennaio': '01',
  'feb': '02', 'febbraio': '02',
  'mar': '03', 'marzo': '03',
  'apr': '04', 'aprile': '04',
  'mag': '05', 'maggio': '05',
  'giu': '06', 'giugno': '06',
  'lug': '07', 'luglio': '07',
  'ago': '08', 'agosto': '08',
  'set': '09', 'settembre': '09',
  'ott': '10', 'ottobre': '10',
  'nov': '11', 'novembre': '11',
  'dic': '12', 'dicembre': '12',
};

/**
 * Portuguese month names to number mapping
 */
export const PORTUGUESE_MONTHS: Record<string, string> = {
  'jan': '01', 'janeiro': '01',
  'fev': '02', 'fevereiro': '02',
  'mar': '03', 'março': '03', 'marco': '03',
  'abr': '04', 'abril': '04',
  'mai': '05', 'maio': '05',
  'jun': '06', 'junho': '06',
  'jul': '07', 'julho': '07',
  'ago': '08', 'agosto': '08',
  'set': '09', 'setembro': '09',
  'out': '10', 'outubro': '10',
  'nov': '11', 'novembro': '11',
  'dez': '12', 'dezembro': '12',
};

/**
 * Combined month mapping for all supported languages
 * Supports: Dutch, English, French, German, Spanish, Italian, Portuguese
 */
export const ALL_MONTHS: Record<string, string> = {
  ...DUTCH_MONTHS,
  ...ENGLISH_MONTHS,
  ...FRENCH_MONTHS,
  ...GERMAN_MONTHS,
  ...SPANISH_MONTHS,
  ...ITALIAN_MONTHS,
  ...PORTUGUESE_MONTHS,
};

/**
 * Date pattern: "10 dec 2025" or "9 nov 2025" or "10. Dez 2025" (day month year)
 * Supports all languages: Dutch, English, French, German, Spanish, Italian, Portuguese
 * German may use a dot after the day: "10. Dez 2025"
 */
export const DATE_DMY_PATTERN = /(\d{1,2})\.?\s+(jan|feb|mrt|maart|apr|mei|jun|jul|aug|sep|sept|okt|oct|nov|dec|januari|februari|april|juni|juli|augustus|september|oktober|november|december|january|february|march|mar|may|june|july|august|october|janv|janvier|fév|févr|fevr|février|fevrier|mars|avr|avril|juin|juil|juillet|aoû|aout|août|septembre|octobre|novembre|déc|décembre|decembre|mär|märz|marz|mrz|januar|februar|april|juni|juli|august|oktober|dez|dezember|ene|enero|febrero|marzo|abr|abril|mayo|junio|julio|ago|agosto|septiembre|octubre|noviembre|dic|diciembre|gen|gennaio|febbraio|aprile|mag|maggio|giu|giugno|lug|luglio|set|settembre|ott|ottobre|dicembre|fev|fevereiro|março|marco|maio|junho|julho|setembro|out|outubro|novembro|dezembro)\s+(\d{4})/gi;

/**
 * Activity date pattern: "op 29 nov 2025" (Dutch) or "on 29 Nov 2025" (English)
 * Supports multiple languages:
 * - Dutch: "op 6 sep 2025"
 * - English: "on Sep 6, 2025" 
 * - French: "le 6 sep 2025"
 * - German: "am 6. Sep. 2025" (with dots after day and month)
 * - Spanish: "el 6 sep 2025"
 * - Italian: "il 6 set 2025"
 * - Portuguese: "em 6 set 2025"
 */
// Activity date pattern - supports both:
// DMY: "op 6 sep 2025" / "le 6 sep 2025" / "am 6. Sep. 2025" / "el 6 sep 2025" / "il 6 set 2025" / "em 6 set 2025"
// MDY: "on Sep 6, 2025" (English)
export const ACTIVITY_DATE_PATTERN_NL = /(?:op|on|le|am|el|il|em)\s+(\d{1,2})\.?\s+([a-zéûäçãõ]+)\.?\s+(\d{4})/gi;
export const ACTIVITY_DATE_PATTERN_EN = /(?:op|on|le|am|el|il|em)\s+([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/gi;
// Combined pattern for detection (looser match)
export const ACTIVITY_DATE_PATTERN = /(?:op|on|le|am|el|il|em)\s+(?:\d{1,2}\.?\s+[a-zéûäçãõ]+\.?|[A-Za-z]+\.?\s+\d{1,2},?)\s+\d{4}/gi;

/**
 * Activity date prefixes by language
 */
export const ACTIVITY_DATE_PREFIXES = ['op', 'on', 'le', 'am', 'el', 'il', 'em'];

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
 * Header with totals (German): "Aktivitätsverlauf 248928 Meilen 183 XP 40 UXP"
 * Note: German uses "Meilen" instead of "Miles"
 */
export const HEADER_PATTERN_DE = /Aktivit[äa]tsverlauf\s+(\d+)\s*(?:Miles|Meilen)\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Header with totals (Spanish): "Historial de actividad 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_ES = /Historial\s+de\s+actividad\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Header with totals (Italian): "Cronologia attività 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_IT = /Cronologia\s+attivit[àa]\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Header with totals (Portuguese): "Histórico de atividade 248928 Miles 183 XP 40 UXP"
 */
export const HEADER_PATTERN_PT = /Hist[óo]rico\s+de\s+atividade\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/i;

/**
 * Flying Blue member number: "Flying Blue-nummer: 4629294326"
 * Supports: nummer (NL), number (EN), numéro (FR), Nummer (DE), número (ES/PT), numero (IT)
 */
export const FB_NUMBER_PATTERN = /Flying\s*Blue[-\s](?:nummer|number|numéro|Nummer|número|numero)\s*:?\s*(\d+)/i;

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
 * Supports: Pagina (NL), Page (EN/FR), Seite (DE), Página (ES/PT), Pagina (IT)
 */
export const PAGE_INFO_PATTERN = /(\d{1,2}\.?\s+[a-zéûäçãõ]+\s+\d{4})\s*[•·]\s*(?:Pagina|Page|Seite|Página)\s+\d+\/\d+/i;

// ============================================================================
// MILES AND XP PATTERNS
// ============================================================================

/**
 * Miles and XP extraction: "367 Miles 0 XP" or "1312 Miles 16 XP 16 UXP" or "-45000 Miles 0 XP"
 * German uses "Meilen" instead of "Miles"
 */
export const MILES_XP_PATTERN = /(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?/gi;

/**
 * Single miles/xp extraction (non-global for single match)
 */
export const MILES_XP_SINGLE = /(-?\d+)\s*(?:Miles|Meilen)\s+(-?\d+)\s*XP(?:\s+(-?\d+)\s*UXP)?/i;

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

/**
 * Trip header (French): "Mon voyage à Berlin"
 */
export const TRIP_HEADER_FR = /Mon\s+voyage\s+[àa]\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

/**
 * Trip header (German): "Meine Reise nach Berlin"
 */
export const TRIP_HEADER_DE = /Meine\s+Reise\s+nach\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

/**
 * Trip header (Spanish): "Mi viaje a Berlín"
 */
export const TRIP_HEADER_ES = /Mi\s+viaje\s+a\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

/**
 * Trip header (Italian): "Il mio viaggio a Berlino"
 */
export const TRIP_HEADER_IT = /Il\s+mio\s+viaggio\s+a\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

/**
 * Trip header (Portuguese): "A minha viagem a Berlim"
 */
export const TRIP_HEADER_PT = /[AO]\s+minh[ao]\s+viagem\s+a\s+(.+?)(?:\s+\d+\s*Miles|\s*$)/i;

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
      // Dutch: "gespaarde Miles op basis van bestede euro's"
      /gespaarde\s+Miles\s+op\s+basis\s+van\s+bestede\s+euro/i,
      // English: "Miles earned based on € spent" or "Miles earned based on euros spent"
      /Miles\s+earned\s+based\s+on\s+[€£$]?\s*(?:euro'?s?\s+)?spent/i,
      // French: "Miles gagnés sur la base des € dépensés" or "Miles gagnés sur la base des euros dépensés"
      /Miles\s+gagnés\s+sur\s+la\s+base\s+des?\s+[€£$]?\s*(?:euros?\s+)?dépensés/i,
      // German: "Meilen auf Basis der ausgegebenen €"
      /Meilen\s+auf\s+Basis\s+der\s+ausgegebenen\s+[€£$]/i,
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
      // Dutch
      /Winkelen\s*[-–]/i,
      // English
      /Shopping\s*[-–]/i,
      // French
      /Achats\s*[-–]/i,
      // German
      /Einkaufen\s*[-–]/i,
      /Einkäufe\s*[-–]/i,
      // Spanish/Portuguese
      /Compras\s*[-–]/i,
      // Italian
      /Acquisti\s*[-–]/i,
      // Universal patterns
      /AMAZON/i,
      /FLYING\s+BLUE\s+SHOP/i,
    ],
    priority: 55,
  },
  {
    type: 'CAR_RENTAL',
    patterns: [
      // Dutch
      /Autoverhuur/i,
      // English
      /Car\s+rental/i,
      // French
      /Location\s+de\s+voiture/i,
      // German
      /Autovermietung/i,
      /Mietwagen/i,
      // Spanish
      /Alquiler\s+de\s+(?:coche|auto)/i,
      // Italian
      /Noleggio\s+auto/i,
      // Portuguese
      /Aluguel\s+de\s+(?:carro|auto)/i,
      // Universal brand patterns
      /HERTZ/i,
      /AVIS/i,
      /EUROPCAR/i,
      /SIXT/i,
    ],
    priority: 54,
  },
  {
    type: 'TAXI_RIDE',
    patterns: [
      // Dutch
      /Auto\s*&\s*Taxi/i,
      // English
      /Car\s*&\s*Taxi/i,
      // French
      /Voiture\s*&\s*Taxi/i,
      // German
      /Auto\s*&\s*Taxi/i,
      // Spanish
      /Coche\s*&\s*Taxi/i,
      /Auto\s*&\s*Taxi/i,
      // Italian
      /Auto\s*&\s*Taxi/i,
      // Portuguese
      /Carro\s*&\s*Táxi/i,
      // Universal brand patterns
      /UBER/i,
      /LYFT/i,
      /BOLT/i,
      /Your\s+ride\s+with/i,
    ],
    priority: 53,
  },
  
  // XP EVENTS
  {
    type: 'XP_ROLLOVER',
    patterns: [
      // Dutch
      /Surplus\s+XP\s+beschikbaar/i,
      /meegenomen\s+naar\s+de\s+nieuwe\s+kwalificatieperiode/i,
      // English
      /Surplus\s+XP\s+available/i,
      /carried\s+over\s+to\s+(?:the\s+)?new\s+qualification\s+period/i,
      // French
      /Surplus\s+de\s+XP\s+disponible/i,  // "Surplus de XP disponible sur le compteur de XP"
      /XP\s+excédentaires/i,
      /reportés?\s+sur\s+la\s+nouvelle\s+période/i,
      /conservés?\s+pour\s+la\s+nouvelle\s+période/i,  // "conservés pour la nouvelle période de qualification"
      // German
      /Überschüssige\s+XP\s+verfügbar/i,
      /in\s+den\s+neuen\s+Qualifikationszeitraum\s+übertragen/i,
      // Spanish
      /XP\s+excedentes?\s+disponibles?/i,
      /transferidos?\s+al\s+nuevo\s+período/i,
      // Italian
      /XP\s+in\s+eccesso\s+disponibil/i,
      /trasferit[oi]\s+al\s+nuovo\s+periodo/i,
      // Portuguese
      /XP\s+excedentes?\s+disponíve/i,
      /transferidos?\s+para\s+o\s+novo\s+período/i,
    ],
    priority: 50,
  },
  {
    type: 'XP_DEDUCTION',
    patterns: [
      // Dutch
      /Aftrek\s+XP-?\s*teller/i,  // Matches "Aftrek XP-teller" and "Aftrek XP- teller" (with space)
      /Reset\s+XP-?\s*teller/i,   // Matches "Reset XP-teller" and "Reset XP- teller"
      // English
      /XP\s+counter\s+(?:deduction|reset|adjustment)/i,
      /Qualification\s+period\s+ended/i,
      /(?:Explorer|Silver|Gold|Platinum|Ultimate)\s+reached/i,
      // French
      /Déduction\s+du\s+compteur\s+XP/i,
      /Réinitialisation\s+du\s+compteur\s+XP/i,
      /Période\s+de\s+qualification\s+terminée/i,
      // German
      /Abzug\s+vom\s+XP-?\s*Zähler/i,
      /XP-?\s*Zähler\s+zurückgesetzt/i,
      /Qualifikationszeitraum\s+beendet/i,
      // Spanish
      /Deducción\s+del\s+contador\s+de?\s+XP/i,
      /Restablecimiento\s+del\s+contador/i,
      /Período\s+de\s+calificación\s+finalizado/i,
      // Italian
      /Deduzione\s+dal\s+contatore\s+XP/i,
      /Azzeramento\s+del\s+contatore/i,
      /Periodo\s+di\s+qualifica\s+terminato/i,
      // Portuguese
      /Dedução\s+do\s+contador\s+de?\s+XP/i,
      /Reinicialização\s+do\s+contador/i,
      /Período\s+de\s+qualificação\s+terminado/i,
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
    /Seite\s+\d/i,
  ],
  es: [
    /Historial\s+de\s+actividad/i,
    /Mi\s+viaje\s+a/i,
    /Miles\s+ganadas/i,
    /Deducción/i,
    /disponible/i,
    /Compras/i,
    /Página\s+\d/i,
  ],
  it: [
    /Cronologia\s+attività/i,
    /Il\s+mio\s+viaggio/i,
    /Miles\s+guadagnate/i,
    /Deduzione/i,
    /disponibile/i,
    /Acquisti/i,
    /Pagina\s+\d/i,
  ],
  pt: [
    /Histórico\s+de\s+atividade/i,
    /[AO]\s+minh[ao]\s+viagem/i,
    /Miles\s+ganhas/i,
    /Dedução/i,
    /disponível/i,
    /Compras/i,
    /Página\s+\d/i,
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
  /(?:Miles|Meilen)\s+\d+\s*XP/i,
  // Dutch
  /Activiteiten(?:geschiedenis|overzicht)/i,
  // English
  /Activity\s+(?:history|overview)/i,
  // French
  /Historique\s+des\s+activit[ée]s/i,
  // German
  /Aktivit[äa]tsverlauf/i,
  // Spanish
  /Historial\s+de\s+actividad/i,
  // Italian
  /Cronologia\s+attivit[àa]/i,
  // Portuguese
  /Hist[óo]rico\s+de\s+atividade/i,
  // Flight pattern: AMS-BER KL1234
  /[A-Z]{3}\s*[-–]\s*[A-Z]{3}\s+[A-Z]{2}\d{2,4}/i,
];

/**
 * Patterns that indicate page headers/footers (to be filtered out)
 * Supports: Pagina (NL), Page (EN/FR), Seite (DE), Página (ES/PT), Pagina (IT)
 */
export const PAGE_HEADER_FOOTER_PATTERNS = [
  /^\s*(?:Pagina|Page|Seite|Página)\s+\d+\/\d+\s*$/im,
  /^\s*\d{1,2}\.?\s+[a-zéûäçãõ]+\s+\d{4}\s*[•·]\s*(?:Pagina|Page|Seite|Página)/im,
  /^\s*Flying\s*Blue[-\s](?:nummer|number|numéro|Nummer|número|numero)/im,
  /^\s*(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\s*$/im,
];
