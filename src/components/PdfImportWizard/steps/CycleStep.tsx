// src/components/PdfImportWizard/steps/CycleStep.tsx
// Step 3: Set up qualification cycle (REQUIRED - no skip allowed)

import React, { useState } from 'react';
import { Calendar, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { CycleStepProps } from '../types';
import { validateCycleStep } from '../helpers/validation';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to current + 1
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export const CycleStep: React.FC<CycleStepProps> = ({
  wizardState,
  updateState,
  suggestedCycleStart,
  suggestedSurplusXP,
}) => {
  const [showCycleHelp, setShowCycleHelp] = useState(false);
  const [showSurplusHelp, setShowSurplusHelp] = useState(false);
  
  const validation = validateCycleStep(wizardState);
  const getFieldError = (field: string) => {
    return validation.errors.find(e => e.field === field)?.message;
  };

  // Parse current value or use empty
  const parseMonth = (value: string) => {
    if (!value) return { year: currentYear, month: 1 };
    const [yearStr, monthStr] = value.split('-');
    return {
      year: parseInt(yearStr, 10) || currentYear,
      month: parseInt(monthStr, 10) || 1,
    };
  };

  const { year: selectedYear, month: selectedMonth } = parseMonth(wizardState.cycleStartMonth);
  const hasValue = wizardState.cycleStartMonth && wizardState.cycleStartMonth.length > 0;

  const handleMonthChange = (month: number) => {
    const newValue = `${selectedYear}-${month.toString().padStart(2, '0')}`;
    updateState({ cycleStartMonth: newValue });
  };

  const handleYearChange = (year: number) => {
    const newValue = `${year}-${selectedMonth.toString().padStart(2, '0')}`;
    updateState({ cycleStartMonth: newValue });
  };

  const handleSurplusChange = (value: string) => {
    const numValue = value === '' ? 0 : parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numValue)) {
      updateState({ surplusXP: Math.min(numValue, 300) });
    }
  };

  // Check if we have a suggestion
  const hasSuggestion = suggestedCycleStart && suggestedCycleStart.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="text-amber-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Set Your Qualification Cycle
        </h2>
        <p className="text-slate-500 text-sm">
          This information is required for accurate calculations.
        </p>
      </div>

      {/* Required Warning */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            This step is required
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Without your qualification cycle start date, we cannot calculate your progress correctly.
          </p>
        </div>
      </div>

      {/* Cycle Start Month */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            When did your current qualification year start?
          </label>
          <button
            type="button"
            onClick={() => setShowCycleHelp(!showCycleHelp)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Suggestion badge */}
        {hasSuggestion && !hasValue && (
          <button
            type="button"
            onClick={() => updateState({ cycleStartMonth: suggestedCycleStart! })}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors"
          >
            <p className="text-xs text-blue-600 font-medium mb-1">We detected a requalification:</p>
            <p className="text-sm text-blue-800 font-bold">
              Click to use {MONTHS[parseInt(suggestedCycleStart!.split('-')[1], 10) - 1]} {suggestedCycleStart!.split('-')[0]}
            </p>
          </button>
        )}

        {/* Month/Year Selectors */}
        <div className="flex gap-3">
          <div className="flex-1">
            <select
              value={hasValue ? selectedMonth : ''}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 appearance-none cursor-pointer ${
                getFieldError('cycleStartMonth')
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            >
              <option value="" disabled>Month...</option>
              {MONTHS.map((month, idx) => (
                <option key={month} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <select
              value={hasValue ? selectedYear : ''}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 appearance-none cursor-pointer ${
                getFieldError('cycleStartMonth')
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            >
              <option value="" disabled>Year...</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {getFieldError('cycleStartMonth') && (
          <p className="text-xs text-red-500">{getFieldError('cycleStartMonth')}</p>
        )}

        {/* Help content */}
        {showCycleHelp && (
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-3">
            <p className="font-medium text-slate-700">Where to find this:</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>
                  <strong>Flying Blue Website:</strong> Log in → My Account → Status
                  <br />
                  <span className="text-xs text-slate-500">Look for "Qualification period" or "Kwalificatieperiode"</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>
                  <strong>Your PDF Statement:</strong> Search for "qualification period beginning" or "kwalificatieperiode beginnend op"
                </span>
              </li>
            </ul>
            <a 
              href="https://www.flyingblue.com/en/account/membership" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
            >
              Open Flying Blue Account <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Surplus XP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Surplus XP from previous cycle
          </label>
          <button
            type="button"
            onClick={() => setShowSurplusHelp(!showSurplusHelp)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Suggestion */}
        {suggestedSurplusXP !== null && suggestedSurplusXP > 0 && wizardState.surplusXP === 0 && (
          <button
            type="button"
            onClick={() => updateState({ surplusXP: suggestedSurplusXP })}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors"
          >
            <p className="text-xs text-blue-600 font-medium mb-1">We detected surplus XP:</p>
            <p className="text-sm text-blue-800 font-bold">
              Click to use {suggestedSurplusXP} XP
            </p>
          </button>
        )}

        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={wizardState.surplusXP === 0 ? '' : wizardState.surplusXP.toString()}
            onChange={(e) => handleSurplusChange(e.target.value)}
            placeholder="0"
            className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all ${
              getFieldError('surplusXP')
                ? 'border-red-300 focus:ring-red-200'
                : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            XP (max 300)
          </span>
        </div>

        {getFieldError('surplusXP') && (
          <p className="text-xs text-red-500">{getFieldError('surplusXP')}</p>
        )}

        {/* Help content */}
        {showSurplusHelp && (
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-700">What is Surplus XP?</p>
            <p>
              When you requalify, up to 300 XP above your qualification threshold 
              carries over to your new cycle. Look for "Surplus XP" or "Surplus XP beschikbaar" 
              in your PDF statement.
            </p>
            <p className="text-xs text-slate-500">
              If you can't find it, enter 0. You can always adjust this later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
