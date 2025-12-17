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
 * Month Patterns
 * 
 * Multi-language month name mappings for date parsing.
 * Supports all 7 languages: EN, NL, FR, DE, ES, PT, IT
 * 
 * @module locales/month-patterns
 */

/**
 * Month number (1-12) mapping from various abbreviations and names
 * Keys are lowercase, first 3 characters typically sufficient
 */
export const MONTH_MAP: Record<string, number> = {
  // English
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12,
  
  // Dutch (Nederlands)
  'januari': 1,
  'februari': 2,
  'mrt': 3, 'maart': 3,
  'mei': 5,
  'juni': 6,
  'juli': 7,
  'augustus': 8,
  'okt': 10, 'oktober': 10,
  
  // French (Français)
  'janvier': 1,
  'fév': 2, 'fevrier': 2, 'février': 2,
  'mars': 3,
  'avr': 4, 'avril': 4,
  'mai': 5,
  'jui': 6, 'juin': 6,
  'juillet': 7,
  'aoû': 8, 'aout': 8, 'août': 8,
  'septembre': 9,
  'octobre': 10,
  'novembre': 11,
  'déc': 12, 'decembre': 12, 'décembre': 12,
  
  // German (Deutsch)
  'januar': 1,
  'mär': 3, 'mrz': 3, 'maerz': 3, 'märz': 3,
  'dez': 12, 'dezember': 12,
  
  // Spanish (Español)
  'ene': 1, 'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abr': 4, 'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'ago': 8, 'agosto': 8,
  'set': 9, 'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'dic': 12, 'diciembre': 12,
  
  // Portuguese (Português)
  'janeiro': 1,
  'fevereiro': 2,
  'março': 3,
  'maio': 5,
  'junho': 6,
  'julho': 7,
  'setembro': 9,
  'out': 10, 'outubro': 10,
  'novembro': 11,
  'dezembro': 12,
  
  // Italian (Italiano)
  'gen': 1, 'gennaio': 1,
  'febbraio': 2,
  'mag': 5, 'maggio': 5,
  'giu': 6, 'giugno': 6,
  'lug': 7, 'luglio': 7,
  'ott': 10, 'ottobre': 10,
  'dicembre': 12,
};

/**
 * Find month number from a string
 * Handles full names, abbreviations, and accented characters
 * 
 * @param str - String containing month name
 * @returns Month number (1-12) or null if not found
 */
export function findMonth(str: string): number | null {
  // Clean the string: lowercase, remove non-letter characters except accents
  const cleaned = str.toLowerCase().replace(/[^a-zéûôàèùäöüßçñ]/g, '');
  
  // Try exact match first
  if (MONTH_MAP[cleaned]) {
    return MONTH_MAP[cleaned];
  }
  
  // Try first 3 characters
  const prefix3 = cleaned.substring(0, 3);
  if (MONTH_MAP[prefix3]) {
    return MONTH_MAP[prefix3];
  }
  
  // Try first 4 characters (for "sept", "août", etc.)
  const prefix4 = cleaned.substring(0, 4);
  if (MONTH_MAP[prefix4]) {
    return MONTH_MAP[prefix4];
  }
  
  // Try matching any known month that starts with this string
  for (const [monthKey, monthNum] of Object.entries(MONTH_MAP)) {
    if (cleaned.startsWith(monthKey) || monthKey.startsWith(cleaned)) {
      return monthNum;
    }
  }
  
  return null;
}

/**
 * Get month name in a specific language
 */
export const MONTH_NAMES: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 
       'July', 'August', 'September', 'October', 'November', 'December'],
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
       'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
       'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
};

/**
 * Get localized month name
 */
export function getMonthName(month: number, language: string = 'en'): string {
  const names = MONTH_NAMES[language] || MONTH_NAMES.en;
  return names[month - 1] || '';
}

/**
 * Check if a string looks like it contains a month name
 */
export function containsMonth(str: string): boolean {
  return findMonth(str) !== null;
}
