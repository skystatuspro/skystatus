// src/components/PdfImportWizard/steps/ConfirmStep.tsx
// Step 5: Final confirmation and summary before import

import React from 'react';
import { Rocket, Award, TrendingUp, Calendar, Plane, Coins } from 'lucide-react';
import { ConfirmStepProps } from '../types';
import { StatusLevel } from '../../../types';

const STATUS_COLORS: Record<StatusLevel, string> = {
  Explorer: 'text-slate-600',
  Silver: 'text-slate-500',
  Gold: 'text-amber-600',
  Platinum: 'text-slate-700',
  Ultimate: 'text-slate-900',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCycleMonth = (value: string): string => {
  if (!value) return 'Not set';
  const [year, month] = value.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${MONTHS[monthIdx]} ${year}`;
};

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  wizardState,
  newFlightsCount,
  milesMonthsCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Rocket className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Ready to Import!
        </h2>
        <p className="text-slate-500">
          Review your settings and confirm.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
        {/* Status */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Award size={16} />
            Status
          </div>
          <span className={`font-bold ${STATUS_COLORS[wizardState.status]}`}>
            {wizardState.status}
          </span>
        </div>

        {/* XP Balance */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp size={16} />
            XP Balance
          </div>
          <span className="font-bold text-slate-800">
            {wizardState.xpBalance.toLocaleString()} XP
          </span>
        </div>

        {/* UXP Balance */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp size={16} />
            UXP Balance
          </div>
          <span className="font-bold text-slate-800">
            {wizardState.uxpBalance.toLocaleString()} UXP
          </span>
        </div>

        {/* Miles */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Coins size={16} />
            Miles Balance
          </div>
          <span className="font-bold text-slate-800">
            {wizardState.milesBalance.toLocaleString()}
          </span>
        </div>

        {/* Cycle Start */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Calendar size={16} />
            Cycle Start
          </div>
          <span className="font-bold text-slate-800">
            {formatCycleMonth(wizardState.cycleStartMonth)}
          </span>
        </div>

        {/* Surplus XP */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp size={16} />
            Surplus XP
          </div>
          <span className="font-bold text-slate-800">
            {wizardState.surplusXP} XP
          </span>
        </div>

        {/* Divider */}
        <div className="py-2" />

        {/* Flights */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Plane size={16} />
            Flights to Import
          </div>
          <span className="font-bold text-blue-600">
            {newFlightsCount} new
          </span>
        </div>

        {/* Miles Data */}
        <div className="flex justify-between items-center py-2.5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Coins size={16} />
            Miles Data
          </div>
          <span className="font-bold text-emerald-600">
            {milesMonthsCount} months
          </span>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-xs text-blue-700">
          Your data will be saved and you can always adjust settings later in your profile. 
          The PDF header values (XP, UXP, Miles, Status) will be used as your baseline.
        </p>
      </div>
    </div>
  );
};
