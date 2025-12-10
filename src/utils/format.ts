// src/utils/format.ts

// ---------------------------------------------
// Currency + Number formatting
// ---------------------------------------------
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
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
