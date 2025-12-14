// src/utils/format.ts

// ---------------------------------------------
// Supported Currencies
// ---------------------------------------------
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CAD' | 'CHF' | 'AUD' | 'SEK' | 'NOK' | 'DKK' | 'PLN';

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', label: 'Polish Złoty', symbol: 'zł' },
];

export const getCurrencySymbol = (currency: CurrencyCode = 'EUR'): string => {
  return SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '€';
};

// ---------------------------------------------
// Currency + Number formatting
// ---------------------------------------------
export const formatCurrency = (value: number, currency: CurrencyCode = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);
};

// Short format for tight spaces (e.g., "€1,234" instead of "€1,234.00")
export const formatCurrencyShort = (value: number, currency: CurrencyCode = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format small values like CPM (e.g., "€0.0123")
export const formatCurrencyPrecise = (value: number, currency: CurrencyCode = 'EUR', decimals: number = 4) => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${value.toFixed(decimals)}`;
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

// ---------------------------------------------
// Month name formatting ("Jan 2025")
// ---------------------------------------------
export const getMonthName = (dateStr: string) => {
  // Expects YYYY-MM
  const date = new Date(`${dateStr}-01`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

// ---------------------------------------------
// Flying Blue Qualification Year Logic
// ---------------------------------------------

/**
 * Determine qualification year for a given YYYY-MM.
 * Flying Blue cycle runs Nov → Oct.
 *
 * Examples:
 * - "2024-11" → 2025
 * - "2024-12" → 2025
 * - "2025-01" → 2025
 * - "2025-10" → 2025
 */
export const getQualificationYear = (monthStr: string): number => {
  if (!monthStr) return new Date().getFullYear();

  const [yearStr, monthStrNum] = monthStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStrNum);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date().getFullYear();
  }

  // Nov (11) and Dec (12) count toward the NEXT qual year.
  return month >= 11 ? year + 1 : year;
};

/**
 * Return all cycle months for a qualification year.
 * Example for qYear = 2025:
 * [
 *   "2024-11",
 *   "2024-12",
 *   "2025-01",
 *   ...
 *   "2025-10"
 * ]
 */
export const getMonthsForQualificationYear = (qualYear: number): string[] => {
  const months: string[] = [];

  let year = qualYear - 1; // cycle starts in previous year
  let month = 11; // Start in November (11)

  for (let i = 0; i < 12; i++) {
    const mm = month.toString().padStart(2, '0');
    months.push(`${year}-${mm}`);

    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return months;
};

// ---------------------------------------------
// ID Generation (with backward compatibility)
// ---------------------------------------------
export const generateId = () => Math.random().toString(36).substr(2, 9);

// For older code that imports "generatedId"
// Prevents build errors
export const generatedId = generateId;
