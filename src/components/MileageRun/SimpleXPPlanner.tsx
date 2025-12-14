// src/components/MileageRun/SimpleXPPlanner.tsx
// Simplified XP Planner for Simple Mode - Real-time calculation

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ChevronRight,
  Gauge,
  RefreshCw,
  Sparkles,
  Target,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Plane,
} from 'lucide-react';

import { CabinClass } from '../../types';
import { AIRPORTS, calculateXPForRoute } from '../../utils/airports';
import { calculateQualificationCycles } from '../../utils/xp-logic';
import { normalizeQualificationSettings, getDisplayStatus } from '../../utils/ultimate-bridge';
import { getStatusTheme, findActiveCycle } from '../Dashboard/helpers';
import { useViewMode } from '../../hooks/useViewMode';

import { MileageRunProps, StatusLevel } from './types';

const getNextStatus = (current: StatusLevel): StatusLevel | null => {
  const order: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const idx = order.indexOf(current);
  // Platinum and Ultimate don't have a "next" status via XP - they requalify
  if (current === 'Platinum' || current === 'Ultimate') return null;
  return idx < order.length - 1 ? order[idx + 1] : null;
};

const getTargetXP = (status: StatusLevel): number => {
  switch (status) {
    case 'Explorer': return 100;
    case 'Silver': return 180;
    case 'Gold': return 300;
    case 'Platinum': return 300;
    case 'Ultimate': return 300;
    default: return 300;
  }
};

// Cabin class display info
const CABIN_INFO: Record<CabinClass, { label: string; multiplier: string; color: string }> = {
  'Economy': { label: 'Economy', multiplier: '1×', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Premium Economy': { label: 'Premium', multiplier: '1.5×', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Business': { label: 'Business', multiplier: '2×', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'First': { label: 'First', multiplier: '3×', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const SimpleXPPlanner: React.FC<MileageRunProps> = ({
  xpData,
  rollover,
  flights,
  manualLedger,
  qualificationSettings,
  demoStatus,
}) => {
  const { setViewMode } = useViewMode();
  
  // Form state
  const [route, setRoute] = useState('');
  const [cabin, setCabin] = useState<CabinClass>('Economy');
  const [isReturn, setIsReturn] = useState(true);

  // Normalize qualification settings
  const normalizedSettings = useMemo(
    () => normalizeQualificationSettings(qualificationSettings),
    [qualificationSettings]
  );

  // Calculate current status
  const { cycles } = useMemo(
    () => calculateQualificationCycles(xpData, rollover, flights, manualLedger, normalizedSettings),
    [xpData, rollover, flights, manualLedger, normalizedSettings]
  );

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);
  const actualXP = activeCycle?.actualXP ?? 0;
  const cycleIsUltimate = activeCycle?.isUltimate ?? false;
  const rawStatus: StatusLevel = (activeCycle?.actualStatus as StatusLevel) ?? 'Explorer';
  const currentStatus: StatusLevel = demoStatus ?? getDisplayStatus(rawStatus, cycleIsUltimate);
  const isUltimate = currentStatus === 'Ultimate';

  // Theme and targets
  const theme = getStatusTheme(currentStatus, isUltimate);
  const targetXP = getTargetXP(currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const xpNeeded = Math.max(0, targetXP - actualXP);
  const progressPercent = Math.min(100, Math.round((actualXP / targetXP) * 100));

  // Real-time XP calculation
  const calculation = useMemo(() => {
    // Parse route
    const codes = route.toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter(c => c.length === 3);
    
    if (codes.length < 2) {
      return { valid: false, xp: 0, error: null, segments: 0 };
    }

    // Check for unknown airports
    const unknowns = codes.filter(code => !AIRPORTS[code]);
    if (unknowns.length > 0) {
      return { valid: false, xp: 0, error: `Unknown: ${unknowns.join(', ')}`, segments: 0 };
    }

    // Calculate XP for each segment
    let totalXP = 0;
    let segmentCount = 0;
    
    for (let i = 0; i < codes.length - 1; i++) {
      const { xp } = calculateXPForRoute(codes[i], codes[i + 1], cabin);
      totalXP += xp;
      segmentCount++;
    }

    // Add return if selected
    if (isReturn) {
      const returnCodes = [...codes].reverse();
      for (let i = 0; i < returnCodes.length - 1; i++) {
        const { xp } = calculateXPForRoute(returnCodes[i], returnCodes[i + 1], cabin);
        totalXP += xp;
        segmentCount++;
      }
    }

    return { valid: true, xp: totalXP, error: null, segments: segmentCount };
  }, [route, cabin, isReturn]);

  // After calculation metrics
  const newTotalXP = actualXP + calculation.xp;
  const wouldReachTarget = newTotalXP >= targetXP;
  const newProgressPercent = Math.min(100, Math.round((newTotalXP / targetXP) * 100));
  const xpStillNeeded = Math.max(0, targetXP - newTotalXP);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">XP Planner</h2>
          <p className="text-slate-500 text-sm">See how flights impact your status</p>
        </div>
        <button
          onClick={() => setViewMode('full')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Gauge size={16} />
          Full view
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Compact Status Bar */}
      <div className={`rounded-2xl p-4 ${
        isUltimate 
          ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white'
          : 'bg-white border border-slate-100 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isUltimate ? 'text-white' : 'text-slate-900'}`}>
              {currentStatus}
            </span>
            {xpNeeded > 0 && (
              <span className={`text-xs ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                • {xpNeeded} XP to {nextStatus || 'requalify'}
              </span>
            )}
          </div>
          <span className={`text-sm font-bold ${theme.accentColor}`}>
            {actualXP} / {targetXP}
          </span>
        </div>
        <div className={`relative w-full h-2 rounded-full overflow-hidden ${
          isUltimate ? 'bg-slate-700' : 'bg-slate-100'
        }`}>
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} rounded-full transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Route Input Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          {/* Route Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Route
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value.toUpperCase())}
                placeholder="AMS-NRT or AMS CDG BKK"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                  calculation.error 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {calculation.error && (
              <p className="mt-1.5 text-xs text-red-500">{calculation.error}</p>
            )}
          </div>

          {/* Cabin Class Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Cabin Class
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(CABIN_INFO) as CabinClass[]).map((c) => {
                const info = CABIN_INFO[c];
                const isSelected = cabin === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCabin(c)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected 
                        ? info.color + ' border-2'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>{info.label}</div>
                    <div className={`text-[10px] font-normal ${isSelected ? '' : 'text-slate-400'}`}>
                      {info.multiplier} XP
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Panel - Always visible when route is entered */}
        {route.trim().length >= 5 && (
          <div className={`px-5 pb-5 pt-2 border-t border-slate-100`}>
            {calculation.valid ? (
              <div className={`rounded-2xl p-5 ${
                wouldReachTarget 
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100'
                  : 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200'
              }`}>
                {/* Trip type toggle + XP result */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => setIsReturn(!isReturn)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isReturn 
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <RefreshCw size={12} className={isReturn ? 'text-indigo-500' : 'text-slate-400'} />
                        {isReturn ? 'Return' : 'One way'}
                      </button>
                      <span className="text-xs text-slate-400">
                        {calculation.segments} segment{calculation.segments !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className={`text-3xl font-black ${wouldReachTarget ? 'text-emerald-600' : 'text-slate-800'}`}>
                      +{calculation.xp} <span className="text-lg font-bold">XP</span>
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${wouldReachTarget ? 'bg-emerald-100' : 'bg-white'}`}>
                    {wouldReachTarget ? (
                      <CheckCircle2 size={22} className="text-emerald-600" />
                    ) : (
                      <TrendingUp size={22} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Progress preview */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">After this trip</span>
                    <span className="font-bold text-slate-700">{newTotalXP} / {targetXP} XP</span>
                  </div>
                  <div className="relative w-full h-2.5 rounded-full bg-white/80 overflow-hidden">
                    {/* Current position marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-300 z-10"
                      style={{ left: `${progressPercent}%` }}
                    />
                    {/* New progress */}
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                        wouldReachTarget ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${newProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Status message */}
                {wouldReachTarget ? (
                  <p className="mt-3 text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    You'll reach {nextStatus || 'your target'}!
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {xpStillNeeded} XP still needed for {nextStatus || 'target'}
                  </p>
                )}
              </div>
            ) : !calculation.error && (
              <div className="text-center py-6 text-slate-400">
                <Plane size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Enter a valid route to see XP</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tip */}
      <p className="text-xs text-slate-400 text-center">
        Tip: Business class earns 2× the XP of Economy
      </p>
    </div>
  );
};

