// src/components/XPEngine/StatusCard.tsx
// Main status card with the circular gauge

import React from 'react';
import { StatusLevel } from '../../types';
import { QualificationCycleStats } from '../../utils/xp-logic';
import { CheckCircle2, Clock, Target } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { StatusTheme } from './helpers';

interface StatusCardProps {
  actualStatus: StatusLevel;
  actualXP: number;
  actualXPToNext: number;
  projectedStatus: StatusLevel;
  projectedXP: number;
  projectedXPToNext: number;
  nextStatus: StatusLevel | null;
  nextStatusThreshold: number;
  currentCycle: QualificationCycleStats;
  theme: StatusTheme;
  isLevelUpCycle: boolean;
  levelUpIsActual: boolean;
  hasProjectedUpgrade: boolean;
  hasProjectedXPDifference: boolean;
  actualProgress: number;
  projectedProgress: number;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  actualStatus,
  actualXP,
  actualXPToNext,
  projectedStatus,
  projectedXP,
  projectedXPToNext,
  nextStatus,
  currentCycle,
  theme,
  isLevelUpCycle,
  levelUpIsActual,
  hasProjectedUpgrade,
  hasProjectedXPDifference,
  actualProgress,
  projectedProgress,
}) => {
  return (
    <div className="lg:col-span-4 h-full">
      <div className="relative h-full bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between overflow-visible group z-0 hover:z-10">
        <div
          className={`absolute top-0 right-0 w-[300px] h-[300px] ${theme.blob1} rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none opacity-80`}
        />
        <div
          className={`absolute bottom-0 left-0 w-[250px] h-[250px] ${theme.blob2} rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none opacity-60`}
        />

        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-extrabold tracking-[0.2em] uppercase text-slate-400">
                Current Status
              </span>
              <Tooltip text="Your actual status based on flown flights only. Scheduled flights are shown as projections." />
            </div>
            <h3 className={`text-4xl font-black tracking-tight ${theme.accentText}`}>
              {actualStatus}
            </h3>

            {/* Status explanation */}
            <p className="text-xs text-slate-400 mt-1">
              {isLevelUpCycle && levelUpIsActual ? (
                <span>
                  Started as {currentCycle.startStatus}.
                  <span className="text-emerald-600 font-medium">
                    {' '}Leveled up to {actualStatus}!
                  </span>
                </span>
              ) : (
                <span>Started as {currentCycle.startStatus} in this cycle.</span>
              )}
            </p>

            {/* Projected status badge if different */}
            {hasProjectedUpgrade && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                  <Target size={12} className="text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                    Projected: {projectedStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-2xl border shadow-sm ${theme.iconBg}`}>
            {theme.icon}
          </div>
        </div>

        {/* Gauge - Shows ACTUAL XP with projected as faint outer ring */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6">
          <div className="relative w-56 h-56">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
              <defs>
                <linearGradient id="xpGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={theme.gaugeStart} />
                  <stop offset="100%" stopColor={theme.gaugeEnd} />
                </linearGradient>
                <linearGradient id="xpGaugeProjected" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={theme.gaugeStart} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={theme.gaugeEnd} stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Background */}
              <circle
                cx="112"
                cy="112"
                r="100"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Projected XP (faint) */}
              {hasProjectedXPDifference && (
                <circle
                  cx="112"
                  cy="112"
                  r="100"
                  fill="none"
                  stroke="url(#xpGaugeProjected)"
                  strokeWidth="12"
                  strokeDasharray={628}
                  strokeDashoffset={628 - (628 * projectedProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              )}
              {/* Actual XP (solid) */}
              <circle
                cx="112"
                cy="112"
                r="100"
                fill="none"
                stroke="url(#xpGaugeGradient)"
                strokeWidth="12"
                strokeDasharray={628}
                strokeDashoffset={628 - (628 * actualProgress) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-black tracking-tighter tabular-nums ${theme.accentText}`}>
                {actualXP}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] mt-2 text-slate-400">
                Actual XP
              </span>
              {/* Projected XP if different */}
              {hasProjectedXPDifference && (
                <div className="flex items-center gap-1 mt-1 text-blue-500">
                  <Clock size={10} />
                  <span className="text-xs font-medium">{projectedXP} projected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom status info */}
        <div className="relative z-10 pt-6 border-t border-slate-100">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                Target Status
              </p>
              {actualStatus === 'Platinum' && actualXPToNext === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                  <CheckCircle2 size={20} />
                  <span>Secured</span>
                </div>
              ) : actualStatus === 'Platinum' && actualXPToNext > 0 ? (
                <div>
                  <div className={`text-lg font-bold ${theme.accentText}`}>
                    {actualXPToNext}{' '}
                    <span className={`text-sm font-medium ${theme.subText}`}>
                      XP to requalify
                    </span>
                  </div>
                  {projectedXPToNext === 0 && (
                    <div className="flex items-center gap-1 text-blue-500 text-xs mt-0.5">
                      <Clock size={10} />
                      <span>Secured with scheduled flights</span>
                    </div>
                  )}
                </div>
              ) : actualXPToNext === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                  <CheckCircle2 size={20} />
                  <span>Secured</span>
                </div>
              ) : (
                <div>
                  <div className={`text-lg font-bold ${theme.accentText}`}>
                    {actualXPToNext}{' '}
                    <span className={`text-sm font-medium ${theme.subText}`}>
                      XP to {nextStatus}
                    </span>
                  </div>
                  {projectedXPToNext === 0 && hasProjectedUpgrade && (
                    <div className="flex items-center gap-1 text-blue-500 text-xs mt-0.5">
                      <Clock size={10} />
                      <span>{projectedStatus} projected</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Next Rollover
                </p>
                <Tooltip text="Projected XP carried over to the next qualification cycle. Based on scheduled flights." />
              </div>
              <p
                className={`text-xl font-black ${
                  currentCycle.rolloverOut > 0 ? theme.accentText : 'text-slate-300'
                }`}
              >
                {currentCycle.rolloverOut}{' '}
                <span className="text-sm font-bold text-slate-400">XP</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
