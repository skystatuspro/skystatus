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
 * Currency Patterns
 * 
 * Currency detection and formatting for PDF parsing.
 * Supports 10 currencies commonly used in Flying Blue regions.
 * 
 * @module locales/currency-patterns
 */

import type { CurrencyCode } from '../types';

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  patterns: string[]; // Patterns to detect this currency in text
}

/**
 * Supported currencies with their configurations
 */
export const CURRENCIES: CurrencyConfig[] = [
  {
    code: 'EUR',
    symbol: '€',
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    patterns: ['€', 'eur', 'euro', 'euros'],
  },
  {
    code: 'USD',
    symbol: '$',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    patterns: ['$', 'usd', 'dollar', 'dollars', 'us$'],
  },
  {
    code: 'GBP',
    symbol: '£',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    patterns: ['£', 'gbp', 'pound', 'pounds', 'sterling'],
  },
  {
    code: 'CAD',
    symbol: 'C$',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    patterns: ['c$', 'cad', 'can$', 'canadian dollar'],
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    symbolPosition: 'after',
    decimalSeparator: '.',
    thousandsSeparator: "'",
    patterns: ['chf', 'sfr', 'swiss franc', 'francs suisses'],
  },
  {
    code: 'AUD',
    symbol: 'A$',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    patterns: ['a$', 'aud', 'au$', 'australian dollar'],
  },
  {
    code: 'SEK',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    patterns: ['sek', 'kr', 'swedish krona', 'svenska kronor'],
  },
  {
    code: 'NOK',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    patterns: ['nok', 'norwegian krone', 'norske kroner'],
  },
  {
    code: 'DKK',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    patterns: ['dkk', 'danish krone', 'danske kroner'],
  },
  {
    code: 'PLN',
    symbol: 'zł',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    patterns: ['pln', 'zł', 'zloty', 'złoty', 'złotych'],
  },
];

/**
 * Map of currency codes to configs for quick lookup
 */
export const CURRENCY_MAP: Record<CurrencyCode, CurrencyConfig> = 
  Object.fromEntries(CURRENCIES.map(c => [c.code, c])) as Record<CurrencyCode, CurrencyConfig>;

/**
 * Detect currency from text
 * 
 * @param text - Text to search for currency indicators
 * @returns Detected currency code or null
 */
export function detectCurrency(text: string): CurrencyCode | null {
  const lowerText = text.toLowerCase();
  
  // Check each currency's patterns
  for (const currency of CURRENCIES) {
    for (const pattern of currency.patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return currency.code;
      }
    }
  }
  
  // Check for symbol patterns more carefully
  if (text.includes('€')) return 'EUR';
  if (text.includes('£')) return 'GBP';
  if (text.includes('zł')) return 'PLN';
  
  // $ is ambiguous, could be USD, CAD, AUD
  // Default to USD if just $ is found
  if (/\$\d/.test(text) && !text.toLowerCase().includes('c$') && !text.toLowerCase().includes('a$')) {
    return 'USD';
  }
  
  return null;
}

/**
 * Parse a currency amount from text
 * Handles different decimal and thousands separators
 * 
 * @param text - Text containing amount
 * @param currency - Optional currency for format hints
 * @returns Parsed number or null
 */
export function parseCurrencyAmount(text: string, currency?: CurrencyCode): number | null {
  // Remove currency symbols and text
  let cleaned = text.replace(/[€$£]/g, '')
    .replace(/\s*(eur|usd|gbp|cad|chf|aud|sek|nok|dkk|pln|kr|zł)\s*/gi, '')
    .trim();
  
  // If we know the currency, use its separators
  if (currency) {
    const config = CURRENCY_MAP[currency];
    if (config) {
      // Replace thousands separator with nothing
      if (config.thousandsSeparator) {
        cleaned = cleaned.split(config.thousandsSeparator).join('');
      }
      // Replace decimal separator with .
      if (config.decimalSeparator === ',') {
        cleaned = cleaned.replace(',', '.');
      }
    }
  } else {
    // Try to auto-detect format
    // "1.234,56" = European (1234.56)
    // "1,234.56" = US (1234.56)
    if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(cleaned)) {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(cleaned)) {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    } else if (/^\d+,\d{2}$/.test(cleaned)) {
      // Simple European: 1234,56
      cleaned = cleaned.replace(',', '.');
    }
    // Otherwise assume it's already in a parseable format
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format an amount in a specific currency
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const config = CURRENCY_MAP[currency];
  if (!config) return `${amount}`;
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (config.symbolPosition === 'before') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted} ${config.symbol}`;
  }
}

/**
 * Get currency config by code
 */
export function getCurrencyConfig(code: CurrencyCode): CurrencyConfig | undefined {
  return CURRENCY_MAP[code];
}

/**
 * Check if a string contains any currency indicator
 */
export function containsCurrency(text: string): boolean {
  return detectCurrency(text) !== null;
}
