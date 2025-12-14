// src/components/XPEngine/SimpleXPEngine.tsx
// Simplified XP Engine for Simple Mode - shows status and flight list

import React, { useMemo } from 'react';
import {
  XPRecord,
  FlightRecord,
  ManualLedger,
  StatusLevel,
} from '../../types';
import {
  calculateQualificationCycles,
  QualificationCycleStats,
} from '../../utils/xp-logic';
import { normalizeQualificationSettings, getDisplayStatus } from '../../utils/ultimate-bridge';
import { useViewMode } from '../../hooks/useViewMode';
import {
  Plane,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Gauge,
  Crown,
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { getStatusTheme } from './helpers';

interface QualificationSettingsType {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
}

interface SimpleXPEngineProps {
  data: XPRecord[];
  rollover: number;
  flights: FlightRecord[];
  manualLedger: ManualLedger;
  qualificationSettings: QualificationSettingsType | null;
  demoStatus?: StatusLevel;
}

// Helper to get target XP for a status
const getTargetXP = (status: StatusLevel): number => {
  switch (status) {
    case 'Explorer': return 100;
    case 'Silver': return 180;
    case 'Gold': return 300;
    case 'Platinum': return 300;
    case 'Ultimate': return 300;
    default: return 100;
  }
};

// Helper to get next status
const getNextStatus = (status: StatusLevel): StatusLevel | null => {
  switch (status) {
    case 'Explorer': return 'Silver';
    case 'Silver': return 'Gold';
    case 'Gold': return 'Platinum';
    case 'Platinum': return 'Ultimate';
    default: return null;
  }
};

// Helper to find active cycle
const findActiveCycle = (cycles: QualificationCycleStats[]): QualificationCycleStats | null => {
  if (cycles.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  for (const cycle of cycles) {
    if (today >= cycle.startDate && today <= cycle.endDate) {
      return cycle;
    }
  }
  for (const cycle of cycles) {
    if (cycle.endDate >= today) {
      return cycle;
    }
  }
  return cycles[cycles.length - 1];
};

export const SimpleXPEngine: React.FC<SimpleXPEngineProps> = ({
  data,
  rollover,
  flights,
  manualLedger,
  qualificationSettings,
  demoStatus,
}) => {
  const { setViewMode } = useViewMode();

  // Normalize and calculate
  const normalizedSettings = useMemo(
    () => normalizeQualificationSettings(qualificationSettings),
    [qualificationSettings]
  );

  const { cycles } = useMemo(
    () => calculateQualificationCycles(data, rollover, flights, manualLedger, normalizedSettings),
    [data, rollover, flights, manualLedger, normalizedSettings]
  );

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);

  if (!activeCycle) {
    return (
      <div className="text-center py-12 text-slate-500">
        No qualification data available. Import your Flying Blue PDF to get started.
      </div>
    );
  }

  // Extract status info
  const cycleIsUltimate = activeCycle.isUltimate ?? false;
  const rawActualStatus = (activeCycle.actualStatus as StatusLevel) ?? 'Explorer';
  const actualStatus = demoStatus ?? getDisplayStatus(rawActualStatus, cycleIsUltimate);
  const isUltimate = demoStatus === 'Ultimate' || cycleIsUltimate;

  const actualXP = activeCycle.actualXP ?? 0;
  const targetXP = getTargetXP(actualStatus);
  const theme = getStatusTheme(actualStatus, isUltimate);
  const nextStatus = getNextStatus(actualStatus);

  // Calculate projected XP
  const projectedXP = useMemo(() => {
    const totalMonthXP = activeCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return activeCycle.rolloverIn + totalMonthXP;
  }, [activeCycle]);

  const hasProjectedXP = projectedXP > actualXP;
  const progressPercent = Math.min(100, Math.round((actualXP / targetXP) * 100));
  const xpRemaining = Math.max(0, targetXP - actualXP);

  // Months remaining
  const cycleEndDate = new Date(activeCycle.endDate);
  const today = new Date();
  const monthsRemaining = Math.max(0,
    (cycleEndDate.getFullYear() - today.getFullYear()) * 12 +
    (cycleEndDate.getMonth() - today.getMonth())
  );

  const isQualified = actualXP >= targetXP;
  const onTrack = isQualified || (progressPercent >= 50 && monthsRemaining >= 6) || (progressPercent >= 75);

  // Format dates
  const cycleEndFormatted = cycleEndDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Get recent flights (all flights, sorted by date desc, limit 8)
  const recentFlights = useMemo(() => {
    return [...flights]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [flights]);

  // Get monthly XP from ledger (recent months with XP)
  const monthlyXP = useMemo(() => {
    return activeCycle.ledger
      .filter(row => (row.xpMonth ?? 0) > 0)
      .slice(-6) // Last 6 months with activity
      .map(row => ({
        month: row.month,
        xp: row.xpMonth ?? 0,
        flights: row.flightsCount ?? 0,
      }));
  }, [activeCycle]);

  // Status icon helper
  const getStatusIcon = () => {
    switch (actualStatus) {
      case 'Ultimate': return <Crown className="text-amber-400" size={28} />;
      case 'Platinum': return <Plane className="text-blue-500 rotate-45" size={28} />;
      case 'Gold': return <Plane className="text-amber-500 rotate-45" size={28} />;
      case 'Silver': return <Plane className="text-slate-400 rotate-45" size={28} />;
      default: return <Plane className="text-emerald-500 rotate-45" size={28} />;
    }
  };

  // Calculate XP per month needed
  const xpPerMonthNeeded = monthsRemaining > 0 ? Math.ceil(xpRemaining / monthsRemaining) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Status Progress</h2>
          <p className="text-slate-500 text-sm">Your qualification cycle overview</p>
        </div>
        <button
          onClick={() => setViewMode('full')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Gauge size={16} />
          Full details
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Main Status Card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl border ${
        isUltimate 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-100'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.meshGradient}`} />
        
        <div className="relative z-10">
          {/* Status Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isUltimate ? 'bg-slate-700' : 'bg-white/80'} shadow-sm`}>
                {getStatusIcon()}
              </div>
              <div>
                <h3 className={`text-3xl font-black ${theme.accentColor}`}>
                  {actualStatus}
                </h3>
                <p className={`text-sm font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                  Valid until {cycleEndFormatted}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              isUltimate ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              <Calendar size={12} />
              {monthsRemaining} months left
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className={`text-sm font-semibold ${isUltimate ? 'text-slate-300' : 'text-slate-600'}`}>
                Your progress
              </span>
              <div className="text-right">
                <span className={`text-sm font-bold ${theme.accentColor}`}>
                  {actualXP} / {targetXP} XP
                </span>
                {hasProjectedXP && (
                  <span className={`text-xs ml-1.5 ${isUltimate ? 'text-slate-400' : 'text-blue-500'}`}>
                    ({projectedXP} projected)
                  </span>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className={`relative w-full h-4 rounded-full overflow-hidden ${
              isUltimate ? 'bg-slate-700' : 'bg-slate-100'
            }`}>
              {hasProjectedXP && (
                <div
                  className={`absolute inset-y-0 left-0 ${isUltimate ? 'bg-slate-600' : 'bg-blue-200'} rounded-full transition-all duration-1000`}
                  style={{ width: `${Math.min(100, (projectedXP / targetXP) * 100)}%` }}
                />
              )}
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} rounded-full transition-all duration-1000`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* Progress Label */}
            <div className="mt-3">
              {isQualified ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">
                    You've secured {actualStatus} for next year!
                  </span>
                </div>
              ) : onTrack ? (
                <div className={`flex items-center gap-2 ${isUltimate ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">
                    On track — {xpRemaining} XP to go
                  </span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 ${isUltimate ? 'text-amber-400' : 'text-amber-600'}`}>
                  <AlertCircle size={18} />
                  <span className="font-semibold">
                    {xpRemaining} XP needed to requalify
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* XP Breakdown Summary */}
          <div className={`grid grid-cols-3 gap-4 p-4 rounded-xl ${
            isUltimate ? 'bg-slate-700/50' : 'bg-slate-50'
          }`}>
            <div className="text-center">
              <p className={`text-2xl font-bold ${theme.accentColor}`}>
                {activeCycle.rolloverIn}
              </p>
              <p className={`text-xs font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                Rollover XP
              </p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${theme.accentColor}`}>
                {actualXP - activeCycle.rolloverIn}
              </p>
              <p className={`text-xs font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                Earned this cycle
              </p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${theme.accentColor}`}>
                {Math.min(300, activeCycle.rolloverOut ?? 0)}
              </p>
              <p className={`text-xs font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                Next rollover
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Card - What to do next */}
      {!isQualified && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <Target className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">
                {xpPerMonthNeeded > 0 
                  ? `Earn ~${xpPerMonthNeeded} XP per month to requalify`
                  : 'Plan your next flights'}
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                {nextStatus 
                  ? `Reach ${targetXP} XP to keep ${actualStatus}, or ${getTargetXP(nextStatus)} XP to upgrade to ${nextStatus}.`
                  : `You need ${xpRemaining} more XP in ${monthsRemaining} months.`}
              </p>
              <button
                onClick={() => {
                  setViewMode('full');
                  // Navigate happens via menu
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Use XP Planner to find flights
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Activity */}
      {monthlyXP.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Monthly Activity
            </h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {monthlyXP.map((month, index) => (
                <div 
                  key={month.month} 
                  className="text-center p-3 bg-slate-50 rounded-xl"
                >
                  <p className="text-xs text-slate-500 font-medium mb-1">
                    {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-slate-900">+{month.xp}</p>
                  <p className="text-[10px] text-slate-400">XP</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Flights */}
      {recentFlights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                Recent Flights
              </h3>
              <span className="text-xs text-slate-400">{recentFlights.length} of {flights.length} flights</span>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {recentFlights.map((flight, index) => (
              <div key={flight.id || index} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    flight.status === 'booked' ? 'bg-blue-50' : 'bg-slate-100'
                  }`}>
                    <Plane size={16} className={`rotate-45 ${
                      flight.status === 'booked' ? 'text-blue-500' : 'text-slate-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {flight.route}
                      {flight.status === 'booked' && (
                        <span className="ml-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">BOOKED</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(flight.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {flight.airline && ` • ${flight.airline}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">+{flight.xp || 0} XP</p>
                  {flight.class && (
                    <p className="text-xs text-slate-400">{flight.class}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no flights */}
      {recentFlights.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <Plane size={40} className="text-slate-300 mx-auto mb-3 rotate-45" />
          <h3 className="font-bold text-slate-900 mb-1">No flights yet</h3>
          <p className="text-sm text-slate-500 mb-4">Import your Flying Blue PDF or add flights manually</p>
        </div>
      )}

      {/* Switch to Full View */}
      <div className="text-center pt-4">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Need to edit flights or see the full ledger? Switch to Full View →
        </button>
      </div>
    </div>
  );
};
