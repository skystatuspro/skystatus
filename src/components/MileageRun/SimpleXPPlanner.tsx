// src/components/MileageRun/SimpleXPPlanner.tsx
// Simplified XP Planner for Simple Mode

import React, { useState, useMemo } from 'react';
import {
  Route,
  Plane,
  Calculator,
  ChevronRight,
  Gauge,
  RefreshCw,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
} from 'lucide-react';

import { CabinClass } from '../../types';
import { AIRPORTS, calculateXPForRoute } from '../../utils/airports';
import { calculateQualificationCycles } from '../../utils/xp-logic';
import { normalizeQualificationSettings, getDisplayStatus } from '../../utils/ultimate-bridge';
import { getStatusTheme, findActiveCycle } from '../Dashboard/helpers';
import { formatNumber } from '../../utils/format';
import { useViewMode } from '../../hooks/useViewMode';

import { MileageRunProps, StatusLevel } from './types';
import { POPULAR_ROUTES } from './constants';

// Simplified status thresholds
const STATUS_THRESHOLDS: Record<StatusLevel, number> = {
  Explorer: 0,
  Silver: 100,
  Gold: 180,
  Platinum: 300,
  Ultimate: 900, // UXP based
};

const getNextStatus = (current: StatusLevel): StatusLevel | null => {
  const order: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
};

const getTargetXP = (status: StatusLevel): number => {
  switch (status) {
    case 'Explorer': return 100;
    case 'Silver': return 180;
    case 'Gold': return 300;
    case 'Platinum': return 300; // Requalify
    case 'Ultimate': return 300; // Requalify (UXP separate)
    default: return 300;
  }
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
  const [hasCalculated, setHasCalculated] = useState(false);
  const [calculatedXP, setCalculatedXP] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);

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
  const projectedXP = activeCycle?.projectedXP ?? actualXP;
  const cycleIsUltimate = activeCycle?.isUltimate ?? false;
  const rawStatus: StatusLevel = (activeCycle?.actualStatus as StatusLevel) ?? 'Explorer';
  const currentStatus: StatusLevel = demoStatus ?? getDisplayStatus(rawStatus, cycleIsUltimate);
  const isUltimate = currentStatus === 'Ultimate';

  // Theme based on status
  const theme = getStatusTheme(currentStatus, isUltimate);
  const targetXP = getTargetXP(currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const xpNeeded = Math.max(0, targetXP - actualXP);
  const progressPercent = Math.min(100, Math.round((actualXP / targetXP) * 100));

  // Calculate XP for route
  const handleCalculate = () => {
    setRouteError(null);
    
    // Parse route
    const codes = route.toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter(c => c.length === 3);
    
    if (codes.length < 2) {
      setRouteError('Enter at least 2 airport codes (e.g., AMS-NRT)');
      return;
    }

    // Check for unknown airports
    const unknowns = codes.filter(code => !AIRPORTS[code]);
    if (unknowns.length > 0) {
      setRouteError(`Unknown airport${unknowns.length > 1 ? 's' : ''}: ${unknowns.join(', ')}`);
      return;
    }

    // Calculate XP for each segment
    let totalXP = 0;
    for (let i = 0; i < codes.length - 1; i++) {
      const { xp } = calculateXPForRoute(codes[i], codes[i + 1], cabin);
      totalXP += xp;
    }

    // Add return if selected
    if (isReturn) {
      const returnCodes = [...codes].reverse();
      for (let i = 0; i < returnCodes.length - 1; i++) {
        const { xp } = calculateXPForRoute(returnCodes[i], returnCodes[i + 1], cabin);
        totalXP += xp;
      }
    }

    setCalculatedXP(totalXP);
    setHasCalculated(true);
  };

  // Quick route selection
  const handleQuickRoute = (routeCode: string) => {
    setRoute(routeCode);
    setHasCalculated(false);
    setRouteError(null);
  };

  // After calculation metrics
  const newTotalXP = actualXP + calculatedXP;
  const wouldReachTarget = newTotalXP >= targetXP;
  const newProgressPercent = Math.min(100, Math.round((newTotalXP / targetXP) * 100));
  const xpStillNeeded = Math.max(0, targetXP - newTotalXP);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">XP Planner</h2>
          <p className="text-slate-500 text-sm">Calculate XP for your next flight</p>
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

      {/* Current Status Card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 ${
        isUltimate 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
          : 'bg-white border border-slate-100 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme.iconBg} border`}>
              {theme.icon}
            </div>
            <div>
              <p className={`text-sm font-medium ${isUltimate ? 'text-slate-300' : 'text-slate-500'}`}>
                Current Status
              </p>
              <h3 className={`text-xl font-bold ${isUltimate ? 'text-white' : 'text-slate-900'}`}>
                {currentStatus}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${theme.accentColor}`}>
              {actualXP} <span className={`text-sm font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-400'}`}>/ {targetXP} XP</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`relative w-full h-3 rounded-full overflow-hidden ${
          isUltimate ? 'bg-slate-700' : 'bg-slate-100'
        }`}>
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} rounded-full transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {xpNeeded > 0 ? (
          <p className={`mt-3 text-sm ${isUltimate ? 'text-slate-300' : 'text-slate-500'}`}>
            <Target size={14} className="inline mr-1" />
            {xpNeeded} XP to {nextStatus || 'requalify'}
          </p>
        ) : (
          <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={14} />
            Target reached!
          </p>
        )}
      </div>

      {/* XP Calculator Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Calculator size={18} className="text-indigo-500" />
            Quick XP Calculator
          </h3>
        </div>

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
                onChange={(e) => {
                  setRoute(e.target.value.toUpperCase());
                  setHasCalculated(false);
                  setRouteError(null);
                }}
                placeholder="AMS-NRT or AMS CDG JFK"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {routeError && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {routeError}
              </p>
            )}
          </div>

          {/* Cabin + Return */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Cabin Class
              </label>
              <select
                value={cabin}
                onChange={(e) => {
                  setCabin(e.target.value as CabinClass);
                  setHasCalculated(false);
                }}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="Economy">Economy</option>
                <option value="PremiumEconomy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First">First / La Première</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Trip Type
              </label>
              <button
                onClick={() => {
                  setIsReturn(!isReturn);
                  setHasCalculated(false);
                }}
                className={`w-full px-3 py-3 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  isReturn 
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <RefreshCw size={16} className={isReturn ? 'text-indigo-500' : 'text-slate-400'} />
                {isReturn ? 'Return Trip' : 'One Way'}
              </button>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={!route.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            <Calculator size={18} />
            Calculate XP
          </button>
        </div>

        {/* Result */}
        {hasCalculated && (
          <div className="px-5 pb-5">
            <div className={`rounded-2xl p-5 ${
              wouldReachTarget 
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">This flight earns</p>
                  <p className={`text-3xl font-black ${wouldReachTarget ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    +{calculatedXP} <span className="text-lg font-bold">XP</span>
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${wouldReachTarget ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                  {wouldReachTarget ? (
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  ) : (
                    <TrendingUp size={24} className="text-indigo-600" />
                  )}
                </div>
              </div>

              {/* New progress preview */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">After this flight</span>
                  <span className="font-bold text-slate-700">{newTotalXP} / {targetXP} XP</span>
                </div>
                <div className="relative w-full h-2.5 rounded-full bg-white/60 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      wouldReachTarget ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${newProgressPercent}%` }}
                  />
                  {/* Show where you are now */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {wouldReachTarget ? (
                <p className="mt-3 text-sm font-medium text-emerald-700 flex items-center gap-1">
                  <Sparkles size={14} />
                  You'll reach {nextStatus || 'your target'}!
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {xpStillNeeded} XP still needed for {nextStatus || 'target'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Popular Routes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Route size={18} className="text-amber-500" />
            Popular Routes from AMS
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {POPULAR_ROUTES.map((r) => (
              <button
                key={r.code}
                onClick={() => handleQuickRoute(r.code)}
                className={`px-4 py-3 rounded-xl border text-left transition-all hover:shadow-sm ${
                  route === r.code
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg mr-2">{r.icon}</span>
                <span className="text-sm font-medium text-slate-700">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Switch to Full View */}
      <div className="text-center pt-4">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Need cost analysis or detailed segments? Switch to Full View →
        </button>
      </div>
    </div>
  );
};
