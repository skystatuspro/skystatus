import React, { useRef } from 'react';
import {
  Database,
  X,
  Download,
  Upload,
  RotateCcw,
  Trash2,
} from 'lucide-react';

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
  // onStartOver prop is niet meer nodig, we doen het direct hier
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  setters,
  onReset,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // DE PRODUCTIE-READY HARDE RESET
  const handleStartOver = () => {
    if (!window.confirm("Are you sure you want to start over? This wipes all data.")) return;

    // 1. Alles wissen
    localStorage.clear();

    // 2. Harde reload (Werkt in productie, faalt soms in AI preview)
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Database className="text-indigo-500" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Data Settings
              </h2>
              <p className="text-[11px] text-slate-500">
                Manage your local portfolio on this device.
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
          {/* Backup & Restore */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Backup &amp; Restore
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors px-4 py-4 flex flex-col items-center justify-center gap-2"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                  <Download className="text-indigo-600" size={18} />
                </span>
                <span className="text-xs font-semibold text-slate-800">
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