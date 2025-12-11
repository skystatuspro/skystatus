import React, { useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

import {
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  FlightRecord,
} from '../types';

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
  };
  setters: {
    setBaseMilesData: React.Dispatch<React.SetStateAction<MilesRecord[]>>;
    setBaseXpData: React.Dispatch<React.SetStateAction<XPRecord[]>>;
    setRedemptions: React.Dispatch<React.SetStateAction<RedemptionRecord[]>>;
    setFlights: React.Dispatch<React.SetStateAction<FlightRecord[]>>;
    setXpRollover: React.Dispatch<React.SetStateAction<number>>;
    setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
    setTargetCPM: React.Dispatch<React.SetStateAction<number>>;
  };
  onReset: () => void;      
  onLoadDemo: () => void;
  onStartOver?: () => void;
  isDemoMode?: boolean;
  isLocalMode?: boolean;
  onExitDemo?: () => void;
  isLoggedIn?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  setters,
  onReset,
  onLoadDemo,
  onStartOver,
  isDemoMode = false,
  isLocalMode = false,
  onExitDemo,
  isLoggedIn = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { signOut, user } = useAuth();

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
    } catch (e) {
      console.error('Export failed', e);
      alert('Export failed. Please try again.');
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

      if (parsed.baseMilesData) setters.setBaseMilesData(parsed.baseMilesData);
      if (parsed.baseXpData) setters.setBaseXpData(parsed.baseXpData);
      if (parsed.redemptions) setters.setRedemptions(parsed.redemptions);
      if (parsed.flights) setters.setFlights(parsed.flights);
      if (typeof parsed.xpRollover === 'number')
        setters.setXpRollover(parsed.xpRollover);
      if (typeof parsed.currentMonth === 'string')
        setters.setCurrentMonth(parsed.currentMonth);
      if (typeof parsed.targetCPM === 'number')
        setters.setTargetCPM(parsed.targetCPM);

      alert('Import completed successfully.');
    } catch (e) {
      console.error('Import failed', e);
      alert('Import failed. Make sure you selected a valid SkyStatus JSON file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  // Determine header subtitle
  const getHeaderSubtitle = () => {
    if (isLocalMode) return 'Local mode — export to save your data';
    if (isDemoMode) return 'Demo mode — data is temporary';
    return 'Manage your portfolio';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          
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

            {/* Reload Demo Data - only show if NOT in local mode */}
            {!isLocalMode && (
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
        </div>
      </div>
    </div>
  );
};
