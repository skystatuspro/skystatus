/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  Backup Service - Simple localStorage backup before PDF imports           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Provides undo functionality for PDF imports                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const BACKUP_KEY = 'skystatus_import_backup';
const BACKUP_TIMESTAMP_KEY = 'skystatus_import_backup_timestamp';

export interface ImportBackup {
  flights: unknown[];
  milesRecords: unknown[];
  qualificationSettings: unknown;
  manualLedger: unknown;
  timestamp: string;
  source: string; // filename of imported PDF
}

/**
 * Create a backup of current user data before import
 */
export function createBackup(
  currentData: {
    flights: unknown[];
    milesRecords: unknown[];
    qualificationSettings: unknown;
    manualLedger: unknown;
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
    console.log('[BackupService] Backup created:', backup.timestamp);
  } catch (e) {
    console.error('[BackupService] Failed to create backup:', e);
    throw new Error('Could not create backup before import');
  }
}

/**
 * Check if a backup exists
 */
export function hasBackup(): boolean {
  return localStorage.getItem(BACKUP_KEY) !== null;
}

/**
 * Get backup info without loading full data
 */
export function getBackupInfo(): { timestamp: string; source: string } | null {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    if (!data) return null;
    
    const backup = JSON.parse(data) as ImportBackup;
    return {
      timestamp: backup.timestamp,
      source: backup.source,
    };
  } catch {
    return null;
  }
}

/**
 * Restore data from backup
 */
export function restoreBackup(): ImportBackup | null {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    if (!data) return null;
    
    const backup = JSON.parse(data) as ImportBackup;
    console.log('[BackupService] Restoring backup from:', backup.timestamp);
    return backup;
  } catch (e) {
    console.error('[BackupService] Failed to restore backup:', e);
    return null;
  }
}

/**
 * Clear the backup (call after user confirms import is OK)
 */
export function clearBackup(): void {
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(BACKUP_TIMESTAMP_KEY);
  console.log('[BackupService] Backup cleared');
}

/**
 * Get human-readable time since backup
 */
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
