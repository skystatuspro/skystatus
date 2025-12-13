import React from 'react';
import {
  Route,
  Plane,
  ArrowRight,
  Sparkles,
  Target,
  ChevronRight,
  Award,
  Clock,
  Globe,
  Star,
  Info,
  Crown,
} from 'lucide-react';

import { CabinClass } from '../../types';
import { formatNumber } from '../../utils/format';
import { PLATINUM_THRESHOLD } from '../../constants';
import { Tooltip } from '../Tooltip';
import { EditableSegment, StatusLevel, PopularRoute } from './types';
import { getStatusTheme, getNextThreshold, calculateRouteXP } from './helpers';

// --- KPI Component ---

interface KPIProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badgeText?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'violet' | 'slate';
  tooltip?: string;
}

export const KPI: React.FC<KPIProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  badgeText, 
  badgeColor = 'slate', 
  tooltip 
}) => {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50/40 border-blue-100 hover:border-blue-200',
    amber: 'bg-amber-50/40 border-amber-100 hover:border-amber-200',
    emerald: 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200',
    violet: 'bg-violet-50/40 border-violet-100 hover:border-violet-200',
    slate: 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
  };
  const iconStyles: Record<string, string> = {
    blue: 'text-blue-600 bg-white shadow-sm',
    amber: 'text-amber-600 bg-white shadow-sm',
    emerald: 'text-emerald-600 bg-white shadow-sm',
    violet: 'text-violet-600 bg-white shadow-sm',
    slate: 'text-slate-600 bg-white shadow-sm'
  };

  const styleClass = styles[badgeColor] || styles.slate;
  const iconClass = iconStyles[badgeColor] || iconStyles.slate;

  return (
    <div className={`p-5 rounded-3xl border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 group ${styleClass}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${iconClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {badgeText && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/60 text-slate-500 border border-slate-100/50">
            {badgeText}
          </span>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

// --- Status Projection Card ---

interface StatusProjectionCardProps {
  actualXP: number;
  projectedXP: number;
  actualUXP: number;
  projectedUXP: number;
  runXP: number;
  runUXP: number;
  currentStatus: StatusLevel;
}

type GoalMode = 'upgrade' | 'requalify' | 'ultimate';

export const StatusProjectionCard: React.FC<StatusProjectionCardProps> = ({ 
  actualXP, 
  projectedXP, 
  actualUXP, 
  projectedUXP, 
  runXP, 
  runUXP, 
  currentStatus 
}) => {
  // Determine the goal mode
  const getGoalMode = (): GoalMode => {
    if (currentStatus === 'Platinum') {
      // Platinum with 600+ XP → focus on Ultimate
      if (actualXP >= 600) return 'ultimate';
      // Platinum under 600 → focus on requalification
      return 'requalify';
    }
    // All other statuses → focus on upgrade
    return 'upgrade';
  };
  
  const goalMode = getGoalMode();
  
  // Target based on mode
  const getTarget = () => {
    switch (goalMode) {
      case 'ultimate':
        return { xp: 900, label: 'Ultimate', isUXP: true };
      case 'requalify':
        return { xp: PLATINUM_THRESHOLD, label: 'Platinum', isUXP: false };
      case 'upgrade':
        const next = getNextThreshold(actualXP);
        return { xp: next.xp, label: next.level, isUXP: false };
    }
  };
  
  const target = getTarget();
  const theme = goalMode === 'ultimate' 
    ? { gradient: 'from-violet-600 to-purple-600', accent: 'text-violet-600' }
    : getStatusTheme(goalMode === 'requalify' ? currentStatus : (target.label as StatusLevel));
  
  // Calculate progress based on mode
  const currentValue = goalMode === 'ultimate' ? actualUXP : actualXP;
  const runValue = goalMode === 'ultimate' ? runUXP : runXP;
  const valueAfterRun = currentValue + runValue;
  
  const hasScheduledFlights = projectedXP > actualXP;
  const scheduledXP = projectedXP - actualXP;
  const scheduledUXP = projectedUXP - actualUXP;
  const projectedAfterRun = goalMode === 'ultimate' 
    ? projectedUXP + runUXP 
    : projectedXP + runXP;
  
  const xpNeeded = Math.max(0, target.xp - valueAfterRun);
  const willAchieve = valueAfterRun >= target.xp;
  
  // Header text
  const getHeaderText = () => {
    switch (goalMode) {
      case 'ultimate': return 'Ultimate Goal';
      case 'requalify': return 'Requalification';
      case 'upgrade': return 'Status Upgrade';
    }
  };
  
  // Success message
  const getSuccessMessage = () => {
    switch (goalMode) {
      case 'ultimate': return 'This run gets you to Ultimate!';
      case 'requalify': return 'This run secures your Platinum!';
      case 'upgrade': return `This run upgrades you to ${target.label}!`;
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} p-5 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 opacity-10">
          {goalMode === 'ultimate' ? <Crown size={100} /> : <Award size={100} />}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Plane size={14} className="opacity-80" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {getHeaderText()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">{target.label}</span>
            {willAchieve && runValue > 0 && (
              <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold">
                <Sparkles size={10} />
                {goalMode === 'requalify' ? 'Secured!' : 'Achieved!'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Main Value Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              {goalMode === 'ultimate' ? 'Your UXP' : 'Your XP'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800">{currentValue}</span>
              {runValue > 0 && (
                <>
                  <ArrowRight size={16} className="text-slate-300" />
                  <span className={`text-2xl font-black ${willAchieve ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {valueAfterRun}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    +{runValue}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500 mb-1">Target</div>
            <div className="text-2xl font-black text-slate-800">
              {target.xp}
              {goalMode === 'ultimate' && <span className="text-sm font-bold text-slate-400 ml-1">UXP</span>}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1.5">
            <span className="font-bold text-slate-400 uppercase">
              {willAchieve ? `${target.label} ${goalMode === 'requalify' ? 'Secured' : 'Achieved'}` : `To ${target.label}`}
            </span>
            <span className={`font-bold ${willAchieve ? 'text-emerald-600' : 'text-slate-600'}`}>
              {willAchieve ? 'Complete!' : `${xpNeeded} ${goalMode === 'ultimate' ? 'UXP' : 'XP'} needed`}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
            {/* Current progress */}
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                willAchieve 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                  : `bg-gradient-to-r ${theme.gradient}`
              }`}
              style={{ width: `${Math.min(100, (currentValue / target.xp) * 100)}%` }}
            />
            {/* Run addition */}
            {runValue > 0 && (
              <div 
                className={`absolute inset-y-0 rounded-full transition-all duration-500 ${
                  willAchieve ? 'bg-emerald-300' : 'bg-indigo-300'
                }`}
                style={{ 
                  left: `${Math.min(100, (currentValue / target.xp) * 100)}%`,
                  width: `${Math.min(100 - (currentValue / target.xp) * 100, (runValue / target.xp) * 100)}%`
                }}
              />
            )}
          </div>
        </div>

        {/* Status Message */}
        {runValue > 0 && (
          <div className={`flex items-center gap-3 p-3 rounded-xl ${
            willAchieve 
              ? 'bg-emerald-50 border border-emerald-100' 
              : 'bg-blue-50 border border-blue-100'
          }`}>
            <div className={`p-2 rounded-lg ${willAchieve ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
              {willAchieve ? <Sparkles size={14} /> : <Target size={14} />}
            </div>
            <div className="text-xs">
              {willAchieve ? (
                <span className="font-bold text-emerald-800">{getSuccessMessage()}</span>
              ) : (
                <span className="font-medium text-blue-800">
                  {xpNeeded} more {goalMode === 'ultimate' ? 'UXP' : 'XP'} needed after this run
                  {xpNeeded <= 30 && ' — almost there!'}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Ultimate mode hint */}
        {goalMode === 'ultimate' && runValue > 0 && runUXP < runXP && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            <Info size={14} className="flex-shrink-0" />
            <span>
              <span className="font-semibold">Note:</span> Only KLM & Air France flights earn UXP. 
              This run earns {runXP} XP but only {runUXP} UXP.
            </span>
          </div>
        )}
        
        {/* Scheduled flights info */}
        {hasScheduledFlights && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <Clock size={12} />
            <span>
              <span className="font-semibold text-amber-600">
                +{goalMode === 'ultimate' ? scheduledUXP : scheduledXP} scheduled
              </span>
              {' '}→ {projectedAfterRun} {goalMode === 'ultimate' ? 'UXP' : 'XP'} total
            </span>
          </div>
        )}
        
        {/* Empty state */}
        {runValue === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-2 rounded-lg bg-slate-200 text-slate-500">
              <Route size={14} />
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-700">Enter a route to simulate</div>
              <div className="text-slate-500">
                {target.xp - currentValue} {goalMode === 'ultimate' ? 'UXP' : 'XP'} needed for {target.label}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Quick Route Card ---

interface QuickRouteCardProps {
  route: PopularRoute;
  cabin: CabinClass;
  isReturn: boolean;
  onClick: () => void;
}

export const QuickRouteCard: React.FC<QuickRouteCardProps> = ({ route, cabin, isReturn, onClick }) => {
  const { xp, distance } = calculateRouteXP(route.code, cabin, isReturn);
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all group text-left w-full"
    >
      <div className="text-2xl">{route.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{route.label}</div>
        <div className="text-xs text-slate-400">{formatNumber(distance)} mi</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-black text-indigo-600">+{xp}</div>
        <div className="text-[10px] text-slate-400">XP</div>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
    </button>
  );
};

// --- Run Summary ---

interface RunSummaryProps {
  segments: EditableSegment[];
  totalMiles: number;
  runXP: number;
}

export const RunSummary: React.FC<RunSummaryProps> = ({ segments, totalMiles, runXP }) => {
  if (segments.length === 0) return null;

  const bestSegment = segments.reduce((best, seg) => 
    (seg.xp / Math.max(1, seg.distance)) > (best.xp / Math.max(1, best.distance)) ? seg : best
  , segments[0]);

  const avgXPPerSegment = Math.round(runXP / segments.length);
  const uniqueAirports = new Set(segments.flatMap(s => [s.from, s.to])).size;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-200/50">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase">Run Summary</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-lg font-black text-slate-800">{segments.length}</div>
          <div className="text-[10px] text-slate-400 font-medium">Segments</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-lg font-black text-slate-800">{formatNumber(totalMiles)}</div>
          <div className="text-[10px] text-slate-400 font-medium">Total Miles</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-lg font-black text-slate-800">{uniqueAirports}</div>
          <div className="text-[10px] text-slate-400 font-medium">Airports</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-lg font-black text-indigo-600">{avgXPPerSegment}</div>
          <div className="text-[10px] text-slate-400 font-medium">Avg XP/Seg</div>
        </div>
      </div>
      
      {/* Best Value Segment */}
      <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        <Star size={14} className="text-amber-500" />
        <span className="text-xs text-amber-800">
          <span className="font-bold">Best value:</span> {bestSegment.from}→{bestSegment.to} ({bestSegment.xp} XP, {bestSegment.cabin})
        </span>
      </div>
    </div>
  );
};
