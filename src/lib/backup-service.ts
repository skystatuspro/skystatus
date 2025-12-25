/**
 * Backup Service - Simple localStorage backup before imports
 * Updated Dec 2025: Support for new transaction-based system + legacy
 */

import type { ActivityTransaction, FlightRecord, MilesRecord, ManualLedger } from '../types';
import type { QualificationSettings } from '../types/qualification';

const BACKUP_KEY = 'skystatus_import_backup';
const BACKUP_TIMESTAMP_KEY = 'skystatus_import_backup_timestamp';

export interface ImportBackup {
  // Core data
  flights: FlightRecord[];
  qualificationSettings: QualificationSettings | null;
  xpRollover: number;
  currency: string;
  targetCPM: number;
  
  // New transaction system
  activityTransactions?: ActivityTransaction[];
  useNewTransactions?: boolean;
  
  // Legacy data (for backwards compatible restore)
  milesRecords?: MilesRecord[];
  manualLedger?: ManualLedger;
  
  // Metadata
  timestamp: string;
  source: string;
}

export function createBackup(
  currentData: {
    flights: FlightRecord[];
    qualificationSettings: QualificationSettings | null;
    xpRollover: number;
    currency: string;
    targetCPM: number;
    // New system
    activityTransactions?: ActivityTransaction[];
    useNewTransactions?: boolean;
    // Legacy
    milesRecords?: MilesRecord[];
    manualLedger?: ManualLedger;
  },
  source: string
): void {
  const backup: ImportBackup = {
    ...currentData,
    timestamp: new Date().toISOString(),
    source,
  };
  
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, backup.timestamp);
    console.log('[BackupService] Backup created:', {
      timestamp: backup.timestamp,
      source: backup.source,
      flights: backup.flights?.length ?? 0,
      activityTransactions: backup.activityTransactions?.length ?? 0,
      useNewTransactions: backup.useNewTransactions,
    });
  } catch (e) {
    console.error('[BackupService] Failed to create backup:', e);
    throw new Error('Could not create backup before import');
  }
}

export function hasBackup(): boolean {
  return localStorage.getItem(BACKUP_KEY) !== null;
}

export function getBackupInfo(): { timestamp: string; source: string } | null {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    if (!data) return null;
    const backup = JSON.parse(data) as ImportBackup;
    return { timestamp: backup.timestamp, source: backup.source };
  } catch {
    return null;
  }
}

export function restoreBackup(): ImportBackup | null {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    if (!data) return null;
    const backup = JSON.parse(data) as ImportBackup;
    console.log('[BackupService] Restoring backup from:', backup.timestamp, {
      useNewTransactions: backup.useNewTransactions,
      hasActivityTransactions: !!backup.activityTransactions?.length,
      hasLegacyData: !!backup.milesRecords?.length || !!backup.manualLedger,
    });
    return backup;
  } catch (e) {
    console.error('[BackupService] Failed to restore backup:', e);
    return null;
  }
}

export function clearBackup(): void {
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(BACKUP_TIMESTAMP_KEY);
  console.log('[BackupService] Backup cleared');
}

export function getBackupAge(): string | null {
  const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  if (!timestamp) return null;
  
  const backupDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - backupDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Check if backup is from new transaction system
 */
export function isNewSystemBackup(backup: ImportBackup): boolean {
  return backup.useNewTransactions === true && 
         Array.isArray(backup.activityTransactions) && 
         backup.activityTransactions.length > 0;
}

/**
 * Check if backup has legacy data
 */
export function hasLegacyData(backup: ImportBackup): boolean {
  return (Array.isArray(backup.milesRecords) && backup.milesRecords.length > 0) ||
         (backup.manualLedger && Object.keys(backup.manualLedger).length > 0);
}
