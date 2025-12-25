// src/utils/transaction-id.ts
// Generate unique, deterministic IDs for activity transactions
//
// The ID format ensures:
// 1. Same transaction always produces same ID (deterministic)
// 2. Different transactions produce different IDs (unique)
// 3. IDs are human-readable for debugging
//
// Format: tx-{YYYY-MM-DD}-{type}-{miles}-{xp}-{hash}
// Example: tx-2025-11-17-amex-10811-0-a3f2b1c4

/**
 * Generate a deterministic transaction ID based on its properties.
 * 
 * @param date - Transaction date in YYYY-MM-DD format
 * @param type - Transaction type (amex, subscription, hotel, etc.)
 * @param miles - Miles value (can be negative for redemptions)
 * @param xp - XP value (usually 0, sometimes positive for bonuses)
 * @param description - Original description for additional uniqueness
 * @returns Deterministic transaction ID
 * 
 * @example
 * generateTransactionId('2025-11-17', 'amex', 10811, 0, 'AMERICAN EXPRESS PLATINUM')
 * // Returns: 'tx-2025-11-17-amex-10811-0-a3f2b1c4'
 */
export function generateTransactionId(
  date: string,
  type: string,
  miles: number,
  xp: number,
  description: string
): string {
  // Sanitize type: lowercase, replace non-alphanumeric with underscore, limit length
  const sanitizedType = type
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')  // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .slice(0, 20) || 'unknown';
  
  // Create hash from description for uniqueness
  // This handles edge cases where same date/type/miles/xp but different source
  const hash = simpleHash(description).slice(0, 8);
  
  // Ensure date is in correct format
  const normalizedDate = normalizeDate(date);
  
  return `tx-${normalizedDate}-${sanitizedType}-${miles}-${xp}-${hash}`;
}

/**
 * Simple hash function for creating short, deterministic hashes.
 * Not cryptographically secure, but sufficient for ID uniqueness.
 * 
 * @param str - String to hash
 * @returns Hexadecimal hash string
 */
function simpleHash(str: string): string {
  // Normalize: lowercase, collapse whitespace, trim
  const normalized = (str || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // Simple djb2-like hash
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
  }
  
  // Convert to hex, ensure positive, pad to 8 chars
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Normalize date to YYYY-MM-DD format.
 * Handles common variations.
 */
function normalizeDate(date: string): string {
  // Already correct format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Try to parse and format
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {
    // Ignore parsing errors
  }
  
  // Fallback: return as-is (will create unique but possibly odd ID)
  console.warn('[generateTransactionId] Could not normalize date:', date);
  return date.replace(/[^0-9-]/g, '').slice(0, 10) || '0000-00-00';
}

/**
 * Parse a transaction ID back to its components.
 * Useful for debugging and testing.
 * 
 * @param id - Transaction ID to parse
 * @returns Parsed components or null if invalid
 */
export function parseTransactionId(id: string): {
  date: string;
  type: string;
  miles: number;
  xp: number;
  hash: string;
} | null {
  const match = id.match(
    /^tx-(\d{4}-\d{2}-\d{2})-([a-z0-9_]+)-(-?\d+)-(-?\d+)-([a-f0-9]+)$/
  );
  
  if (!match) return null;
  
  return {
    date: match[1],
    type: match[2],
    miles: parseInt(match[3], 10),
    xp: parseInt(match[4], 10),
    hash: match[5],
  };
}

/**
 * Check if a string is a valid transaction ID.
 * 
 * @param id - String to validate
 * @returns True if valid transaction ID format
 */
export function isValidTransactionId(id: string): boolean {
  return /^tx-\d{4}-\d{2}-\d{2}-[a-z0-9_]+-(-?\d+)-(-?\d+)-[a-f0-9]+$/.test(id);
}

/**
 * Check if an ID is a legacy ID (from old system).
 * Legacy IDs don't follow the tx-... pattern.
 */
export function isLegacyTransactionId(id: string): boolean {
  return !id.startsWith('tx-');
}

/**
 * Generate a manual transaction ID.
 * For user-created transactions that don't come from PDF.
 * Includes a random component to ensure uniqueness.
 */
export function generateManualTransactionId(
  date: string,
  type: string,
  miles: number,
  xp: number
): string {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const sanitizedType = type.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
  const normalizedDate = normalizeDate(date);
  
  return `tx-${normalizedDate}-${sanitizedType}-${miles}-${xp}-m${randomSuffix.slice(0, 7)}`;
}
