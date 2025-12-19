// src/components/PdfImportWizard/steps/BalanceStep.tsx
// Step 2: Verify XP, UXP, and Miles balances

import React from 'react';
import { Coins, TrendingUp, Plane, Info } from 'lucide-react';
import { BalanceStepProps } from '../types';
import { validateBalanceStep } from '../helpers/validation';

export const BalanceStep: React.FC<BalanceStepProps> = ({
  wizardState,
  updateState,
  detectedXP,
  detectedUXP,
  detectedMiles,
}) => {
  const validation = validateBalanceStep(wizardState);
  
  const getFieldError = (field: string) => {
    return validation.errors.find(e => e.field === field)?.message;
  };

  const handleChange = (field: 'xpBalance' | 'uxpBalance' | 'milesBalance', value: string) => {
    // Allow empty string for editing, parse as 0
    const numValue = value === '' ? 0 : parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numValue)) {
      updateState({ [field]: numValue });
    }
  };

  const isModified = (field: 'xp' | 'uxp' | 'miles') => {
    switch (field) {
      case 'xp': return wizardState.xpBalance !== detectedXP;
      case 'uxp': return wizardState.uxpBalance !== detectedUXP;
      case 'miles': return wizardState.milesBalance !== detectedMiles;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Coins className="text-emerald-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Verify Your Balances
        </h2>
        <p className="text-slate-500 text-sm">
          These values come from your PDF header. Edit only if incorrect.
        </p>
      </div>

      {/* Balance Inputs */}
      <div className="space-y-4">
        {/* XP Balance */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <TrendingUp size={16} className="text-blue-500" />
            XP Balance
            {isModified('xp') && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Modified
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={wizardState.xpBalance === 0 ? '' : wizardState.xpBalance.toString()}
              onChange={(e) => handleChange('xpBalance', e.target.value)}
              placeholder={detectedXP.toString()}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all ${
                getFieldError('xpBalance')
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              XP
            </span>
          </div>
          {getFieldError('xpBalance') && (
            <p className="text-xs text-red-500">{getFieldError('xpBalance')}</p>
          )}
        </div>

        {/* UXP Balance */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <TrendingUp size={16} className="text-purple-500" />
            UXP Balance
            {isModified('uxp') && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Modified
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={wizardState.uxpBalance === 0 ? '' : wizardState.uxpBalance.toString()}
              onChange={(e) => handleChange('uxpBalance', e.target.value)}
              placeholder={detectedUXP.toString()}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all ${
                getFieldError('uxpBalance')
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              UXP
            </span>
          </div>
          {getFieldError('uxpBalance') && (
            <p className="text-xs text-red-500">{getFieldError('uxpBalance')}</p>
          )}
        </div>

        {/* Miles Balance */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Plane size={16} className="text-emerald-500" />
            Miles Balance
            {isModified('miles') && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Modified
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={wizardState.milesBalance === 0 ? '' : wizardState.milesBalance.toLocaleString('nl-NL')}
              onChange={(e) => handleChange('milesBalance', e.target.value)}
              placeholder={detectedMiles.toLocaleString('nl-NL')}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all ${
                getFieldError('milesBalance')
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              Miles
            </span>
          </div>
          {getFieldError('milesBalance') && (
            <p className="text-xs text-red-500">{getFieldError('milesBalance')}</p>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="flex gap-3 p-4 bg-blue-50 rounded-xl">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          These values are extracted from your PDF header and represent your official 
          Flying Blue balances at the time of export. Only modify if the values don't match 
          what you see on flyingblue.com.
        </p>
      </div>
    </div>
  );
};
