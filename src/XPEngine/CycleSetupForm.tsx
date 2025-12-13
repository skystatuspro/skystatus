// src/components/XPEngine/CycleSetupForm.tsx
// Form for setting up the Flying Blue qualification cycle

import React, { useState } from 'react';
import { StatusLevel } from '../../types';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import { noSpinnerClass } from './helpers';

export interface CycleSetupFormValues {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
}

interface CycleSetupFormProps {
  initialValues?: CycleSetupFormValues | null;
  onSave: (settings: CycleSetupFormValues) => void;
  onCancel?: () => void;
  onShowFaq: () => void;
}

export const CycleSetupForm: React.FC<CycleSetupFormProps> = ({
  initialValues,
  onSave,
  onCancel,
  onShowFaq,
}) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [cycleStartMonth, setCycleStartMonth] = useState(
    initialValues?.cycleStartMonth || defaultMonth
  );
  const [startingStatus, setStartingStatus] = useState<StatusLevel>(
    initialValues?.startingStatus || 'Explorer'
  );
  const [startingXP, setStartingXP] = useState(initialValues?.startingXP || 0);

  const handleSave = () => {
    onSave({
      cycleStartMonth,
      startingStatus,
      startingXP: Math.max(0, Math.min(300, startingXP)),
    });
  };

  const isEditMode = !!initialValues;

  return (
    <>
      {/* Setup Form */}
      <div className="grid gap-4 md:grid-cols-3 mb-5">
        {/* Cycle Start Month */}
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Cycle Start Month
          </label>
          <input
            type="month"
            value={cycleStartMonth}
            onChange={(e) => setCycleStartMonth(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            When did your current status period begin?
          </p>
        </div>

        {/* Starting Status */}
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Status at Start
          </label>
          <select
            value={startingStatus}
            onChange={(e) => setStartingStatus(e.target.value as StatusLevel)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="Explorer">Explorer</option>
            <option value="Silver">Silver (100 XP)</option>
            <option value="Gold">Gold (180 XP)</option>
            <option value="Platinum">Platinum (300 XP)</option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1.5">
            What status did you have when this cycle started?
          </p>
        </div>

        {/* Starting XP (Rollover) */}
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Starting XP (Rollover)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="300"
              value={startingXP === 0 ? '' : startingXP}
              placeholder="0"
              onChange={(e) =>
                setStartingXP(e.target.value === '' ? 0 : Number(e.target.value))
              }
              className={`flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${noSpinnerClass}`}
            />
            <span className="text-slate-500 font-medium">XP</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Your XP balance at cycle start (max 300)
          </p>
        </div>
      </div>

      {/* Save button and help */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-amber-200/50">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <HelpCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Tip:</strong> Your cycle start date is when your current status began.
            Check your status expiry date on Flying Blue and count back 12 months.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowFaq}
            className="inline-flex items-center gap-2 px-4 py-2 text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors whitespace-nowrap"
          >
            <HelpCircle size={16} />
            Need help?
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-700 font-medium text-sm transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors whitespace-nowrap shadow-sm"
          >
            <CheckCircle2 size={16} />
            {isEditMode ? 'Save Changes' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </>
  );
};
