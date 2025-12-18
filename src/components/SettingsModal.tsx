import React, { useRef, useState, lazy, Suspense } from 'react';
import {
  Database,
  X,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  LogOut,
  User,
  AlertTriangle,
  FileText,
  UserX,
  Globe,
  Sparkles,
  Mail,
  Calendar,
  Award,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { CurrencyCode, SUPPORTED_CURRENCIES } from '../utils/format';

// Lazy load PdfImportModal to reduce initial bundle
const PdfImportModal = lazy(() => import('./PdfImportModal'));

const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
      <Loader2 size={24} className="animate-spin text-blue-500" />
      <span className="text-slate-600">Loading...</span>
    </div>
  </div>
);

import {
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  FlightRecord,
  ManualLedger,
  StatusLevel,
} from '../types';
import { QualificationSettings } from '../hooks/useUserData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    baseMilesData: MilesRecord[];
    baseXpData: XPRecord[];
    redemptions: RedemptionRecord[];
    flights: FlightRecord[];
    xpRollover: number;
    currentMonth: string;
    targetCPM: number;
    currency: CurrencyCode;
    manualLedger: ManualLedger;
    qualificationSettings: QualificationSettings | null;
  };
  setters: {
    setBaseMilesData: React.Dispatch<React.SetStateAction<MilesRecord[]>>;
    setBaseXpData: React.Dispatch<React.SetStateAction<XPRecord[]>>;
    setRedemptions: React.Dispatch<React.SetStateAction<RedemptionRecord[]>>;
    setFlights: React.Dispatch<React.SetStateAction<FlightRecord[]>>;
    setXpRollover: React.Dispatch<React.SetStateAction<number>>;
    setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
    setTargetCPM: React.Dispatch<React.SetStateAction<number>>;
    setCurrency: (currency: CurrencyCode) => void;
    setManualLedger: React.Dispatch<React.SetStateAction<ManualLedger>>;
    setQualificationSettings: React.Dispatch<React.SetStateAction<QualificationSettings | null>>;
  };
  onReset: () => void;      
  onLoadDemo: () => void;
  onStartOver?: () => void;
  onRerunOnboarding?: () => void;
  onUndoImport?: () => boolean;
  canUndoImport?: boolean;
  importBackupInfo?: { timestamp: string; source: string } | null;
  emailConsent?: boolean;
  onEmailConsentChange?: (consent: boolean) => void;
  isDemoMode?: boolean;
  isLocalMode?: boolean;
  onExitDemo?: () => void;
  isLoggedIn?: boolean;
  markDataChanged?: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  setters,
  onReset,
  onLoadDemo,
  onStartOver,
  onRerunOnboarding,
  onUndoImport,
  canUndoImport = false,
  importBackupInfo,
  emailConsent = false,
  onEmailConsentChange,
  isDemoMode = false,
  isLocalMode = false,
  onExitDemo,
  isLoggedIn = false,
  markDataChanged,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { signOut, user, deleteAccount } = useAuth();
  const { trackExport, trackImport, trackSettings } = useAnalytics();
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.download = `skystatus-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Track successful export
      trackExport();
    } catch (e) {
      console.error('Export failed', e);
      if (showToast) {
        showToast('Export failed. Please try again.', 'error');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // =======================================================================
      // REPLACE MODE: JSON is the single source of truth for all data
      // User preferences (currency, homeAirport, emailConsent) are NOT touched
      // =======================================================================

      // Track what was imported
      const importedCounts = {
        miles: 0,
        flights: 0,
        redemptions: 0,
        manualLedgerMonths: 0,
      };

      // REPLACE baseMilesData - JSON overwrites all existing miles data
      if (parsed.baseMilesData) {
        setters.setBaseMilesData(parsed.baseMilesData);
        importedCounts.miles = parsed.baseMilesData.length;
      }

      // REPLACE baseXpData - JSON overwrites all existing XP data
      if (parsed.baseXpData) {
        setters.setBaseXpData(parsed.baseXpData);
      }

      // REPLACE flights - JSON overwrites all existing flights
      if (parsed.flights) {
        setters.setFlights(parsed.flights);
        importedCounts.flights = parsed.flights.length;
      }

      // REPLACE redemptions - JSON overwrites all existing redemptions
      if (parsed.redemptions) {
        setters.setRedemptions(parsed.redemptions);
        importedCounts.redemptions = parsed.redemptions.length;
      }

      // REPLACE manualLedger - JSON overwrites all existing manual ledger entries
      if (parsed.manualLedger) {
        setters.setManualLedger(parsed.manualLedger);
        importedCounts.manualLedgerMonths = Object.keys(parsed.manualLedger).length;
      }

      // REPLACE qualificationSettings - JSON is the source of truth
      // This is CRITICAL for correct XP cycle calculation
      if (parsed.qualificationSettings) {
        setters.setQualificationSettings(parsed.qualificationSettings);
      }

      // REPLACE xpRollover if present in JSON
      if (typeof parsed.xpRollover === 'number') {
        setters.setXpRollover(parsed.xpRollover);
      }

      // REPLACE currentMonth if present in JSON
      if (parsed.currentMonth) {
        setters.setCurrentMonth(parsed.currentMonth);
      }

      // NOTE: We intentionally do NOT import user preferences from onboarding:
      // - currency
      // - homeAirport
      // - emailConsent
      // - targetCPM
      // - onboardingCompleted

      // Trigger auto-save to persist all changes to database
      if (markDataChanged) markDataChanged();
      
      // Track the import for analytics
      trackImport(
        importedCounts.flights,
        importedCounts.redemptions,
        importedCounts.miles
      );

      // Build summary message
      const parts = [];
      if (importedCounts.miles > 0) parts.push(`${importedCounts.miles} miles entries`);
      if (importedCounts.flights > 0) parts.push(`${importedCounts.flights} flights`);
      if (importedCounts.redemptions > 0) parts.push(`${importedCounts.redemptions} redemptions`);
      if (importedCounts.manualLedgerMonths > 0) parts.push(`${importedCounts.manualLedgerMonths} manual ledger months`);

      const message = parts.length > 0
        ? `Import completed! Restored: ${parts.join(', ')}. Existing data was replaced.`
        : 'Import completed. Data restored successfully.';
      
      if (showToast) {
        showToast(message, 'success');
      }
      onClose(); // Auto-close modal after successful import
    } catch (e) {
      console.error('Import failed', e);
      if (showToast) {
        showToast('Import failed. Make sure you selected a valid SkyStatus JSON file.', 'error');
      }
      // Don't close on error - let user try again
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler for PDF import
  const handlePdfImport = (
    flights: FlightRecord[], 
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { 
      cycleStartMonth: string; 
      cycleStartDate?: string;
      startingStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
      startingXP?: number;
    },
    bonusXpByMonth?: Record<string, number>
  ) => {
    // Merge flights (by date + route)
    const existingFlightKeys = new Set(data.flights.map(f => `${f.date}-${f.route}`));
    const newFlights = flights.filter(f => !existingFlightKeys.has(`${f.date}-${f.route}`));
    
    if (newFlights.length > 0) {
      setters.setFlights(prev => [...prev, ...newFlights]);
    }

    // Merge miles (by month - updates existing, adds new)
    if (miles.length > 0) {
      const existingMonthIndex = new Map(data.baseMilesData.map((r, i) => [r.month, i]));
      const mergedMiles = [...data.baseMilesData];
      
      for (const incomingRecord of miles) {
        const existingIndex = existingMonthIndex.get(incomingRecord.month);
        if (existingIndex !== undefined) {
          // Update existing month
          mergedMiles[existingIndex] = { 
            ...mergedMiles[existingIndex], 
            ...incomingRecord, 
            id: mergedMiles[existingIndex].id 
          };
        } else {
          // Add new month
          mergedMiles.push(incomingRecord);
        }
      }
      
      setters.setBaseMilesData(mergedMiles);
    }

    // Apply cycle settings (status detection from PDF)
    if (cycleSettings) {
      setters.setQualificationSettings({
        cycleStartMonth: cycleSettings.cycleStartMonth,
        cycleStartDate: cycleSettings.cycleStartDate,
        startingStatus: cycleSettings.startingStatus,
        startingXP: cycleSettings.startingXP ?? 0,
      });
    }

    // Apply bonus XP from PDF (first flight bonus, hotel XP, etc.)
    if (bonusXpByMonth && Object.keys(bonusXpByMonth).length > 0) {
      setters.setManualLedger(prev => {
        const updated = { ...prev };
        for (const [month, xp] of Object.entries(bonusXpByMonth)) {
          updated[month] = { 
            ...(updated[month] || { amexXp: 0, bonusSafXp: 0, miscXp: 0, correctionXp: 0 }),
            miscXp: xp 
          };
        }
        return updated;
      });
    }

    // Trigger auto-save
    if (markDataChanged) markDataChanged();

    // Show success message
    const newMilesCount = miles.filter(m => !data.baseMilesData.some(e => e.month === m.month)).length;
    
    let message = 'Flying Blue import completed!';
    const parts = [];
    if (newFlights.length > 0) parts.push(`${newFlights.length} flights`);
    if (newMilesCount > 0) parts.push(`${newMilesCount} months of miles`);
    if (cycleSettings) parts.push(`cycle: ${cycleSettings.startingStatus}`);
    if (parts.length > 0) message += ` Added: ${parts.join(', ')}`;
    
    if (showToast) {
      showToast(message, 'success');
    }
    
    // Close the PDF import modal (handled by setShowPdfImport(false) in the modal)
    // Also close the settings modal
    onClose();
  };

  const handleReloadDemo = () => {
    onLoadDemo();
    onClose();
  };

  const handleStartOver = () => {
    if (onStartOver) {
      onStartOver();
    } else {
      if (!window.confirm("Are you sure you want to start over? This wipes all data.")) return;
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleExitDemo = () => {
    if (onExitDemo) {
      onExitDemo();
      onClose();
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        if (showToast) {
          showToast('Failed to delete account. Please try again.', 'error');
        }
        console.error('Delete account error:', error);
      } else {
        // Clear local storage as well
        localStorage.clear();
        onClose();
        // Reload the page to reset all state
        window.location.reload();
      }
    } catch (e) {
      if (showToast) {
        showToast('Failed to delete account. Please try again.', 'error');
      }
      console.error('Delete account error:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine header subtitle
  const getHeaderSubtitle = () => {
    if (isLocalMode) return 'Local mode — export to save your data';
    if (isDemoMode) return 'Demo mode — data is temporary';
    return 'Manage your portfolio';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              isLocalMode ? 'bg-amber-50' : 'bg-indigo-50'
            }`}>
              <Database className={isLocalMode ? 'text-amber-500' : 'text-indigo-500'} size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Data Settings
              </h2>
              <p className="text-[11px] text-slate-500">
                {getHeaderSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="px-6 py-5 pb-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Account Section (if logged in) */}
          {isLoggedIn && user && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Account
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                    <User className="text-blue-600" size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {user.email}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Signed in • Auto-save enabled
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Local Mode Banner */}
          {isLocalMode && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 flex-shrink-0">
                  <AlertTriangle className="text-amber-700" size={16} />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-900">
                    Local Mode — Data Not Saved
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Your data will be lost when you close the browser. Use <span className="font-bold">Export JSON</span> below to save your work, or sign in for automatic cloud sync.
                  </p>
                </div>
              </div>
              {onExitDemo && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 px-3 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs font-semibold transition-colors"
                  >
                    Export Now
                  </button>
                  <button
                    onClick={handleExitDemo}
                    className="px-3 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
                  >
                    Sign In Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Demo Mode Banner (only show if NOT local mode) */}
          {isDemoMode && !isLocalMode && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-800">
                    Demo Mode Active
                  </p>
                  <p className="text-[11px] text-indigo-600">
                    Exploring with sample data. {isLoggedIn ? 'Exit to use your account.' : 'Sign in to save your data.'}
                  </p>
                </div>
                {onExitDemo && (
                  <button
                    onClick={handleExitDemo}
                    className="px-3 py-1.5 rounded-xl bg-indigo-200 hover:bg-indigo-300 text-indigo-800 text-xs font-semibold transition-colors"
                  >
                    Exit Demo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Backup & Restore */}
          {/* Flying Blue PDF Import - Primary Import Method */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Import from Flying Blue
            </p>
            <button
              onClick={() => setShowPdfImport(true)}
              className="w-full rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all px-4 py-5 flex items-center gap-4"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-200">
                <FileText className="text-white" size={24} />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">Import Flying Blue PDF</p>
                <p className="text-xs text-slate-500">Upload your transaction history from flyingblue.com</p>
              </div>
            </button>
          </div>

          {/* Preferences */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Preferences
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                    <Globe className="text-slate-600" size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Currency</p>
                    <p className="text-[11px] text-slate-500">For all costs and valuations</p>
                  </div>
                </div>
                <select
                  value={data.currency}
                  onChange={(e) => setters.setCurrency(e.target.value as CurrencyCode)}
                  className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Re-run Setup Wizard - only show for logged-in users */}
              {isLoggedIn && onRerunOnboarding && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
                      <Sparkles className="text-indigo-600" size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Setup Wizard</p>
                      <p className="text-[11px] text-slate-500">Go through initial setup again</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onRerunOnboarding();
                      onClose();
                    }}
                    className="px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Re-run
                  </button>
                </div>
              )}

              {/* Email Updates - only show for logged-in users */}
              {isLoggedIn && onEmailConsentChange && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
                      <Mail className="text-violet-600" size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Email Updates</p>
                      <p className="text-[11px] text-slate-500">Receive product news and tips</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onEmailConsentChange(!emailConsent);
                      showToast?.(
                        emailConsent ? 'Unsubscribed from email updates' : 'Subscribed to email updates',
                        'success'
                      );
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      emailConsent
                        ? 'text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100'
                        : 'text-slate-500 border border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {emailConsent ? 'Subscribed ✓' : 'Subscribe'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Qualification Cycle Settings */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Qualification Cycle
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              {/* Starting Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                    <Award className="text-blue-600" size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Starting Status</p>
                    <p className="text-[11px] text-slate-500">Your status when the cycle began</p>
                  </div>
                </div>
                <select
                  value={data.qualificationSettings?.startingStatus ?? 'Explorer'}
                  onChange={(e) => {
                    const newStatus = e.target.value as StatusLevel;
                    setters.setQualificationSettings((prev) => ({
                      cycleStartMonth: prev?.cycleStartMonth ?? new Date().toISOString().slice(0, 7),
                      cycleStartDate: prev?.cycleStartDate,
                      startingStatus: newStatus,
                      startingXP: prev?.startingXP ?? 0,
                      startingUXP: prev?.startingUXP,
                      ultimateCycleType: prev?.ultimateCycleType,
                    }));
                    markDataChanged?.();
                  }}
                  className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="Explorer">Explorer</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Ultimate">Ultimate</option>
                </select>
              </div>

              {/* Cycle Start Date */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
                    <Calendar className="text-indigo-600" size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Cycle Start Date</p>
                    <p className="text-[11px] text-slate-500">
                      {data.qualificationSettings?.cycleStartDate 
                        ? 'Flights before this date are excluded from XP'
                        : 'Set the exact date you achieved your status'}
                    </p>
                  </div>
                </div>
                <input
                  type="date"
                  value={data.qualificationSettings?.cycleStartDate ?? ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const newMonth = newDate ? newDate.slice(0, 7) : data.qualificationSettings?.cycleStartMonth;
                    setters.setQualificationSettings((prev) => ({
                      cycleStartMonth: newMonth ?? prev?.cycleStartMonth ?? new Date().toISOString().slice(0, 7),
                      cycleStartDate: newDate || undefined,
                      startingStatus: prev?.startingStatus ?? 'Explorer',
                      startingXP: prev?.startingXP ?? 0,
                      startingUXP: prev?.startingUXP,
                      ultimateCycleType: prev?.ultimateCycleType,
                    }));
                    markDataChanged?.();
                  }}
                  className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                />
              </div>

              {/* Info about cycle date */}
              {data.qualificationSettings?.cycleStartDate && (
                <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700">
                  <strong>Note:</strong> Flights before {new Date(data.qualificationSettings.cycleStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} will not count toward your current cycle's XP.
                </div>
              )}
            </div>
          </div>

          {/* Backup & Restore */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Backup &amp; Restore
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className={`w-full rounded-2xl border transition-colors px-4 py-4 flex flex-col items-center justify-center gap-2 ${
                  isLocalMode 
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                  isLocalMode ? 'bg-amber-200' : 'bg-indigo-100'
                }`}>
                  <Download className={isLocalMode ? 'text-amber-700' : 'text-indigo-600'} size={18} />
                </span>
                <span className={`text-xs font-semibold ${isLocalMode ? 'text-amber-800' : 'text-slate-800'}`}>
                  Export JSON
                </span>
              </button>

              <button
                onClick={handleImportClick}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors px-4 py-4 flex flex-col items-center justify-center gap-2"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                  <Upload className="text-emerald-600" size={18} />
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  Import JSON
                </span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Data Actions */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Data Actions
            </p>

            {/* Reload Demo Data - only show in demo mode (not for logged-in users) */}
            {isDemoMode && (
              <button
                onClick={handleReloadDemo}
                className="w-full mb-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors px-4 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                    <RotateCcw className="text-slate-700" size={16} />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800">
                      Reload Demo Data
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Restore the original sample portfolio.
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Undo Last Import - only show if backup exists */}
            {canUndoImport && onUndoImport && (
              <button
                onClick={() => {
                  if (window.confirm('Restore data from before your last PDF import? This will undo the import.')) {
                    const success = onUndoImport();
                    if (success && showToast) {
                      showToast('Import undone - data restored', 'success');
                    } else if (!success && showToast) {
                      showToast('Could not restore backup', 'error');
                    }
                  }
                }}
                className="w-full rounded-2xl border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-colors px-4 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
                    <RotateCcw className="text-amber-600" size={16} />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-amber-700">
                      Undo Last Import
                    </p>
                    <p className="text-[11px] text-amber-500">
                      Restore data from before your last PDF import.
                    </p>
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={handleStartOver}
              className="w-full rounded-2xl border border-red-100 bg-red-50 hover:bg-red-100 transition-colors px-4 py-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-100">
                  <Trash2 className="text-red-600" size={16} />
                </span>
                <div className="text-left">
                  <p className="text-xs font-semibold text-red-700">
                    Start Over
                  </p>
                  <p className="text-[11px] text-red-500">
                    Wipe data and restart application.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Delete Account - only show for logged in users */}
          {isLoggedIn && !isDemoMode && !isLocalMode && (
            <div className="mt-6 pt-6 border-t border-red-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-3">
                Danger Zone
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full rounded-2xl border-2 border-red-200 bg-white hover:bg-red-50 transition-colors px-4 py-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-100">
                      <UserX className="text-red-600" size={16} />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-red-700">
                        Delete Account
                      </p>
                      <p className="text-[11px] text-red-500">
                        Permanently delete your account and all data.
                      </p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-red-100 shrink-0">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">
                        Are you absolutely sure?
                      </p>
                      <p className="text-xs text-red-700 leading-relaxed">
                        This action <span className="font-bold">cannot be undone</span>. This will permanently delete your account and remove all your data from our servers.
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <Download className="text-amber-600 shrink-0 mt-0.5" size={14} />
                      <p className="text-xs text-amber-800">
                        <span className="font-bold">Recommended:</span> Export your data first using the "Export JSON" button above. Once deleted, your data cannot be recovered.
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-red-700 mb-1.5">
                      Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                      className="w-full px-3 py-2 text-sm border-2 border-red-200 rounded-lg focus:border-red-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <UserX size={14} />
                          Delete My Account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PDF Import Modal */}
      {showPdfImport && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PdfImportModal
            isOpen={showPdfImport}
            onClose={() => setShowPdfImport(false)}
            onImport={handlePdfImport}
            existingFlights={data.flights}
            existingMiles={data.baseMilesData}
          />
        </Suspense>
      )}
    </div>
  );
};
