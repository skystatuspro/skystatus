// src/components/Dashboard/RiskMonitor.tsx
// Risk monitor sidebar component for status tracking

import React from 'react';
import {
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingDown,
  Plane,
  Sparkles,
} from 'lucide-react';
import { StatusLevel } from './helpers';

interface RiskMonitorProps {
  actualStatus: StatusLevel;
  projectedStatus: StatusLevel;
  actualXP: number;
  projectedTotalXP: number;
  targetXP: number;
  rolloverOut: number;
  hasProjectedUpgrade: boolean;
  cycleStartDate: string;
  cycleEndDate: string;
}

const ROLLOVER_CAP = 300;
const PLATINUM_XP = 300;

export const RiskMonitor: React.FC<RiskMonitorProps> = ({
  actualStatus,
  projectedStatus,
  actualXP,
  projectedTotalXP,
  targetXP,
  rolloverOut,
  hasProjectedUpgrade,
  cycleStartDate,
  cycleEndDate,
}) => {
  // Cycle timing calculations
  const today = new Date();
  const endDate = new Date(cycleEndDate);
  const startDate = new Date(cycleStartDate);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = totalDays - daysLeft;
  const cycleProgress = Math.min(100, (daysElapsed / totalDays) * 100);

  // Status security calculations
  const xpNeededForStatus = Math.max(0, targetXP - actualXP);
  const statusSecuredActual = actualXP >= targetXP;
  const statusSecuredProjected = projectedTotalXP >= targetXP;
  
  // Buffer is how much EXTRA you have above the threshold
  const actualBuffer = statusSecuredActual ? actualXP - targetXP : 0;
  const projectedBuffer = statusSecuredProjected ? projectedTotalXP - targetXP : 0;

  // Rollover calculations - only applies to Platinum
  const actualRollover = actualStatus === 'Platinum' 
    ? Math.min(ROLLOVER_CAP, Math.max(0, actualXP - PLATINUM_XP))
    : 0;
  
  const projectedRollover = projectedStatus === 'Platinum'
    ? Math.min(ROLLOVER_CAP, Math.max(0, projectedTotalXP - PLATINUM_XP))
    : 0;
  
  const potentialRollover = projectedStatus === 'Platinum' && actualStatus !== 'Platinum'
    ? Math.min(ROLLOVER_CAP, Math.max(0, projectedTotalXP - PLATINUM_XP))
    : null;
  
  // Waste calculations
  const actualWaste = actualStatus === 'Platinum' 
    ? Math.max(0, actualXP - PLATINUM_XP - ROLLOVER_CAP)
    : 0;
  const projectedWaste = projectedStatus === 'Platinum'
    ? Math.max(0, projectedTotalXP - PLATINUM_XP - ROLLOVER_CAP)
    : 0;
  
  // Overall health assessment
  type HealthStatus = 'optimal' | 'good' | 'warning' | 'critical';
  
  const getOverallHealth = (): { status: HealthStatus; label: string } => {
    if (!statusSecuredActual && !statusSecuredProjected) {
      return { status: 'critical', label: 'Action needed' };
    }
    if (!statusSecuredActual && statusSecuredProjected) {
      return { status: 'good', label: 'On track' };
    }
    if (projectedWaste > 100) {
      return { status: 'warning', label: 'Optimize timing' };
    }
    if (projectedWaste > 0) {
      return { status: 'good', label: 'Minor waste' };
    }
    if (statusSecuredActual && projectedRollover >= ROLLOVER_CAP) {
      return { status: 'optimal', label: 'Maximized' };
    }
    return { status: 'optimal', label: 'Healthy' };
  };

  const health = getOverallHealth();

  const healthStyles: Record<HealthStatus, string> = {
    optimal: 'text-emerald-600 bg-emerald-50',
    good: 'text-blue-600 bg-blue-50',
    warning: 'text-amber-600 bg-amber-50',
    critical: 'text-red-600 bg-red-50',
  };

  const formatShortDate = (date: Date) => 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Generate actionable tip
  const getTip = (): { icon: React.ReactNode; text: string; subtext?: string } | null => {
    if (!statusSecuredActual && !statusSecuredProjected) {
      return {
        icon: <AlertTriangle size={16} />,
        text: `Book ${xpNeededForStatus} XP worth of flights`,
        subtext: `${daysLeft} days left to secure your ${actualStatus} status`,
      };
    }
    
    if (!statusSecuredActual && statusSecuredProjected) {
      const scheduledXP = projectedTotalXP - actualXP;
      return {
        icon: <Plane size={16} />,
        text: 'Stay on track with scheduled flights',
        subtext: `${scheduledXP} XP from upcoming trips will secure requalification`,
      };
    }
    
    if (projectedWaste > 50) {
      return {
        icon: <TrendingDown size={16} />,
        text: `${projectedWaste} XP will be lost to cap`,
        subtext: 'Consider postponing flights to next cycle if possible',
      };
    }
    
    if (statusSecuredActual && projectedRollover >= ROLLOVER_CAP && projectedWaste === 0) {
      return {
        icon: <CheckCircle2 size={16} />,
        text: 'Perfect! Maximum rollover locked in',
        subtext: 'Additional XP this cycle would be wasted',
      };
    }
    
    if (statusSecuredActual && projectedRollover < ROLLOVER_CAP) {
      const potential = ROLLOVER_CAP - projectedRollover;
      return {
        icon: <Sparkles size={16} />,
        text: `Room for ${potential} more rollover XP`,
        subtext: 'Extra flights this cycle carry over to next year',
      };
    }
    
    return null;
  };

  const tip = getTip();

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
      {/* Header with cycle info */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-slate-400" />
          Risk Monitor
        </h3>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${healthStyles[health.status]}`}>
          {health.label}
        </span>
      </div>

      {/* Cycle timeline */}
      <div className="mb-5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
          <span className="font-medium">{formatShortDate(startDate)}</span>
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Calendar size={10} />
            {daysLeft} days left
          </span>
          <span className="font-medium">{formatShortDate(endDate)}</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full transition-all duration-500"
            style={{ width: `${cycleProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Security */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Requalification Status
            </span>
            {statusSecuredActual ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 size={12} />
                Secured
              </span>
            ) : statusSecuredProjected ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                <Clock size={12} />
                On track
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <AlertTriangle size={12} />
                Action needed
              </span>
            )}
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-slate-800">
                {actualStatus}
              </div>
              {hasProjectedUpgrade && (
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  → {projectedStatus} projected
                </div>
              )}
            </div>
            
            <div className="text-right">
              {statusSecuredActual ? (
                <div>
                  <div className="text-lg font-bold text-emerald-600">+{actualBuffer}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">XP buffer</div>
                </div>
              ) : statusSecuredProjected ? (
                <div>
                  <div className="text-lg font-bold text-blue-600">+{projectedBuffer}</div>
                  <div className="text-[10px] text-blue-400 uppercase font-medium flex items-center gap-0.5 justify-end">
                    <Clock size={9} />
                    projected buffer
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold text-amber-600">{xpNeededForStatus}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">XP needed</div>
                </div>
              )}
            </div>
          </div>

          {/* Mini progress to target */}
          <div className="mt-3 pt-3 border-t border-slate-200/50">
            <div className="flex justify-between text-[9px] text-slate-400 mb-1">
              <span>Progress to {targetXP} XP</span>
              <span>{actualXP} / {targetXP}</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="relative h-full">
                {projectedTotalXP > actualXP && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-300 rounded-full"
                    style={{ width: `${Math.min(100, (projectedTotalXP / targetXP) * 100)}%` }}
                  />
                )}
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full ${statusSecuredActual ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  style={{ width: `${Math.min(100, (actualXP / targetXP) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rollover Forecast */}
        {(actualStatus === 'Platinum' || projectedStatus === 'Platinum') && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rollover Forecast
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Cap: {ROLLOVER_CAP} XP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-xl p-3 border border-white">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Actual</div>
                <div className="text-xl font-black text-slate-800">{actualRollover}</div>
                <div className="text-[10px] text-slate-500">
                  {actualRollover === 0 && actualStatus === 'Platinum' 
                    ? ((potentialRollover ?? projectedRollover) > 0 
                        ? 'On track via scheduled'
                        : `Need ${PLATINUM_XP - actualXP + 1}+ more XP`)
                    : 'XP → next cycle'}
                </div>
              </div>
              
              <div className="bg-white/60 rounded-xl p-3 border border-white">
                <div className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1 mb-1">
                  <Clock size={10} />
                  Projected
                </div>
                <div className="text-xl font-black text-slate-800">
                  {potentialRollover !== null ? potentialRollover : projectedRollover}
                </div>
                <div className="text-[10px] text-slate-500">XP → next cycle</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-blue-300 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((potentialRollover ?? projectedRollover) / ROLLOVER_CAP) * 100)}%` }}
                />
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (actualRollover / ROLLOVER_CAP) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-slate-400">0</span>
                <span className="text-[9px] text-slate-400">{ROLLOVER_CAP} XP max</span>
              </div>
            </div>
          </div>
        )}

        {/* Waste Indicator */}
        {(actualWaste > 0 || projectedWaste > 0) && (
          <div className={`p-4 rounded-2xl border ${
            actualWaste > 0 
              ? 'bg-red-50 border-red-100' 
              : 'bg-amber-50 border-amber-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                XP Waste
              </span>
              <AlertTriangle size={14} className={actualWaste > 0 ? 'text-red-500' : 'text-amber-500'} />
            </div>

            <div className="flex items-end justify-between">
              <div className="flex gap-4">
                {actualWaste > 0 && (
                  <div>
                    <div className="text-xl font-black text-red-600">-{actualWaste}</div>
                    <div className="text-[10px] text-red-600/70 uppercase font-medium">Already lost</div>
                  </div>
                )}
                {projectedWaste > 0 && projectedWaste !== actualWaste && (
                  <div>
                    <div className="text-xl font-black text-amber-600">-{projectedWaste}</div>
                    <div className="text-[10px] text-amber-600/70 uppercase font-medium flex items-center gap-0.5">
                      <Clock size={9} />
                      Projected
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-[10px] text-slate-500 text-right max-w-[140px]">
                XP above {ROLLOVER_CAP} cannot roll over after requalification
              </div>
            </div>
          </div>
        )}

        {/* No waste indicator */}
        {actualWaste === 0 && projectedWaste === 0 && statusSecuredActual && (
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800">No XP waste</div>
                <div className="text-[10px] text-emerald-600/70">All earned XP is being utilized efficiently</div>
              </div>
            </div>
          </div>
        )}

        {/* Actionable Tip */}
        {tip && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-100 text-violet-600 shrink-0">
                {tip.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-violet-900">{tip.text}</div>
                {tip.subtext && (
                  <div className="text-[11px] text-violet-600/70 mt-0.5">{tip.subtext}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
