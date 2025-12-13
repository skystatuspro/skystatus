import React, { useState, useEffect, useMemo } from 'react';
import {
  Route,
  Plane,
  Coins,
  ArrowRight,
  Repeat,
  MapPin,
  AlertCircle,
  X,
  AlertTriangle,
  Wallet,
  ChevronsUp,
  ChevronsDown,
  Calculator,
  Trophy,
  Sparkles,
  Target,
  ChevronRight,
  Zap,
  TrendingUp,
  Award,
  Clock,
  Globe,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
  Send,
  MessageSquare,
} from 'lucide-react';

import { CabinClass, XPRecord, FlightRecord, ManualXPLedger, QualificationSettings } from '../types';
import {
  AIRPORTS,
  DistanceBand,
  calculateXPForRoute,
} from '../utils/airports';
import { calculateQualificationCycles } from '../utils/xp-logic';
import { findActiveCycle } from './Dashboard/helpers';
import { formatNumber } from '../utils/format';
import { useCurrency } from '../lib/CurrencyContext';
import { submitFeedback } from '../lib/feedbackService';
import { PLATINUM_THRESHOLD, GOLD_THRESHOLD, SILVER_THRESHOLD } from '../constants';
import { Tooltip } from './Tooltip';

// --- Types & Constants ---

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500';

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

interface EditableSegment {
  id: string;
  from: string;
  to: string;
  distance: number;
  band: DistanceBand;
  xp: number;
  cabin: CabinClass;
}

interface MileageRunProps {
  xpData: XPRecord[];
  rollover: number;
  flights: FlightRecord[];
  manualLedger: ManualXPLedger;
  qualificationSettings: QualificationSettings;
}

type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
type RunMode = 'classic' | 'optimizer';

// Popular mileage run routes from AMS
const POPULAR_ROUTES = [
  { code: 'AMS SIN', label: 'Singapore', icon: '🇸🇬' },
  { code: 'AMS JNB', label: 'Johannesburg', icon: '🇿🇦' },
  { code: 'AMS GRU', label: 'São Paulo', icon: '🇧🇷' },
  { code: 'AMS NRT', label: 'Tokyo', icon: '🇯🇵' },
  { code: 'AMS LAX', label: 'Los Angeles', icon: '🇺🇸' },
  { code: 'AMS DXB', label: 'Dubai', icon: '🇦🇪' },
];

// Calculate actual XP for a route
const calculateRouteXP = (routeCode: string, cabin: CabinClass, isReturn: boolean): { xp: number; distance: number } => {
  const codes = routeCode.split(' ');
  if (codes.length < 2) return { xp: 0, distance: 0 };
  
  let totalXP = 0;
  let totalDistance = 0;
  
  // Outbound
  for (let i = 0; i < codes.length - 1; i++) {
    const result = calculateXPForRoute(codes[i], codes[i + 1], cabin);
    totalXP += result.xp;
    totalDistance += result.distance;
  }
  
  // Return
  if (isReturn) {
    for (let i = codes.length - 1; i > 0; i--) {
      const result = calculateXPForRoute(codes[i], codes[i - 1], cabin);
      totalXP += result.xp;
      totalDistance += result.distance;
    }
  }
  
  return { xp: totalXP, distance: totalDistance };
};

// --- Helper Functions ---

const getStatusTheme = (status: StatusLevel) => {
  switch (status) {
    case 'Platinum': 
      return {
        gradient: 'from-blue-600 to-indigo-700',
        lightGradient: 'from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        bg: 'bg-blue-500',
        accent: 'text-blue-600',
      };
    case 'Gold': 
      return {
        gradient: 'from-amber-500 to-orange-600',
        lightGradient: 'from-amber-50 to-orange-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        bg: 'bg-amber-500',
        accent: 'text-amber-600',
      };
    case 'Silver': 
      return {
        gradient: 'from-slate-400 to-slate-600',
        lightGradient: 'from-slate-100 to-slate-200',
        border: 'border-slate-300',
        text: 'text-slate-700',
        bg: 'bg-slate-500',
        accent: 'text-slate-600',
      };
    default: 
      return {
        gradient: 'from-sky-400 to-blue-500',
        lightGradient: 'from-sky-50 to-blue-50',
        border: 'border-sky-200',
        text: 'text-sky-700',
        bg: 'bg-sky-500',
        accent: 'text-sky-600',
      };
  }
};

const getStatusFromXP = (xp: number): StatusLevel => {
  if (xp >= PLATINUM_THRESHOLD) return 'Platinum';
  if (xp >= GOLD_THRESHOLD) return 'Gold';
  if (xp >= SILVER_THRESHOLD) return 'Silver';
  return 'Explorer';
};

const getNextThreshold = (currentXP: number): { level: StatusLevel; xp: number } => {
  if (currentXP >= PLATINUM_THRESHOLD) return { level: 'Platinum', xp: PLATINUM_THRESHOLD };
  if (currentXP >= GOLD_THRESHOLD) return { level: 'Platinum', xp: PLATINUM_THRESHOLD };
  if (currentXP >= SILVER_THRESHOLD) return { level: 'Gold', xp: GOLD_THRESHOLD };
  return { level: 'Silver', xp: SILVER_THRESHOLD };
};

const getDistanceInsight = (miles: number, currentBand: DistanceBand) => {
  if (currentBand === 'Domestic' || currentBand === 'Long 3') return null;
  const limits: Record<string, number> = { Medium: 2000, 'Long 1': 3500, 'Long 2': 5000 };
  const nextLimit = limits[currentBand];
  if (!nextLimit) return null;
  const diff = nextLimit - miles;
  if (diff > 0 && diff <= 150) {
    return { diff, message: `Only ${diff}mi short of next band!` };
  }
  return null;
};

// --- Sub Components ---

const KPI: React.FC<any> = ({ title, value, subtitle, icon: Icon, badgeText, badgeColor = 'slate', tooltip }) => {
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

const StatusProjectionCard: React.FC<{
  actualXP: number;
  projectedXP: number;
  runXP: number;
  actualStatus: StatusLevel;
  projectedStatus: StatusLevel;
  segments: EditableSegment[];
}> = ({ actualXP, projectedXP, runXP, actualStatus, projectedStatus, segments }) => {
  // After run calculations
  const actualAfterRun = actualXP + runXP;
  const projectedAfterRun = projectedXP + runXP;
  const actualStatusAfterRun = getStatusFromXP(actualAfterRun);
  const projectedStatusAfterRun = getStatusFromXP(projectedAfterRun);
  
  const hasScheduledFlights = projectedXP > actualXP;
  const scheduledXP = projectedXP - actualXP;
  
  const projectedTheme = getStatusTheme(projectedStatusAfterRun);
  const actualTheme = getStatusTheme(actualStatusAfterRun);
  
  const isActualUpgrade = actualStatusAfterRun !== actualStatus && runXP > 0;
  const isProjectedUpgrade = projectedStatusAfterRun !== projectedStatus && runXP > 0;
  
  // Next targets
  const actualNextTarget = getNextThreshold(actualAfterRun);
  const projectedNextTarget = getNextThreshold(projectedAfterRun);
  const xpToNextActual = Math.max(0, actualNextTarget.xp - actualAfterRun);
  const xpToNextProjected = Math.max(0, projectedNextTarget.xp - projectedAfterRun);
  
  // Smart tips
  const getTips = () => {
    const tips: { icon: React.ReactNode; text: string; type: 'success' | 'info' | 'tip' }[] = [];
    
    // Upgrade achieved
    if (isActualUpgrade) {
      tips.push({
        icon: <Sparkles size={14} />,
        text: `This run gets you to ${actualStatusAfterRun}!`,
        type: 'success'
      });
    } else if (isProjectedUpgrade && hasScheduledFlights) {
      tips.push({
        icon: <Sparkles size={14} />,
        text: `Combined with scheduled flights, you'll reach ${projectedStatusAfterRun}!`,
        type: 'success'
      });
    }
    
    // Close to next level
    if (!isActualUpgrade && xpToNextActual > 0 && xpToNextActual <= 30) {
      tips.push({
        icon: <Target size={14} />,
        text: `Only ${xpToNextActual} XP away from ${actualNextTarget.level}!`,
        type: 'info'
      });
    }
    
    // Stopover suggestion
    if (runXP > 0 && segments.length >= 2 && segments.length <= 4) {
      const avgXPPerSegment = runXP / segments.length;
      if (avgXPPerSegment < 15) {
        tips.push({
          icon: <MapPin size={14} />,
          text: 'Add a stopover hub (CDG/AMS) for bonus XP on long routes',
          type: 'tip'
        });
      }
    }
    
    // Coverage percentage
    if (runXP > 0 && !isActualUpgrade && xpToNextActual > 0) {
      const xpNeededBefore = getNextThreshold(actualXP).xp - actualXP;
      const coverage = Math.min(100, Math.round((runXP / xpNeededBefore) * 100));
      if (coverage >= 50 && coverage < 100) {
        tips.push({
          icon: <TrendingUp size={14} />,
          text: `This covers ${coverage}% of your path to ${actualNextTarget.level}`,
          type: 'info'
        });
      }
    }
    
    return tips.slice(0, 2); // Max 2 tips
  };
  
  const tips = getTips();

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${projectedTheme.gradient} p-5 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 opacity-10">
          <Award size={100} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Plane size={14} className="opacity-80" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Status Projection</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">{projectedStatusAfterRun}</span>
            {(isActualUpgrade || isProjectedUpgrade) && (
              <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold">
                <Sparkles size={10} />
                Upgrade!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="p-5 space-y-4">
        {/* Actual XP Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-semibold text-slate-600">Actual XP</span>
            <Tooltip text="XP from flights you've already taken" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{actualXP}</span>
            {runXP > 0 && (
              <>
                <ArrowRight size={12} className="text-slate-300" />
                <span className={`text-sm font-black ${isActualUpgrade ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {actualAfterRun}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  +{runXP}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Projected XP Row (only show if different from actual) */}
        {hasScheduledFlights && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-xs font-semibold text-slate-600">Projected XP</span>
              <Tooltip text="Including scheduled/future flights" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">{projectedXP}</span>
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                +{scheduledXP} scheduled
              </span>
              {runXP > 0 && (
                <>
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className={`text-sm font-black ${isProjectedUpgrade ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {projectedAfterRun}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {actualStatusAfterRun !== 'Platinum' && (
          <div className="pt-2">
            <div className="flex justify-between items-center text-[10px] mb-1.5">
              <span className="font-bold text-slate-400 uppercase">To {actualNextTarget.level}</span>
              <span className="font-bold text-slate-600">{xpToNextActual > 0 ? `${xpToNextActual} XP needed` : 'Achieved!'}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
              <div 
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${actualTheme.gradient} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, (actualAfterRun / actualNextTarget.xp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Smart Tips */}
        {tips.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {tips.map((tip, i) => (
              <div 
                key={i}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${
                  tip.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                  tip.type === 'info' ? 'bg-blue-50 text-blue-700' :
                  'bg-amber-50 text-amber-700'
                }`}
              >
                <div className={`p-1 rounded-lg ${
                  tip.type === 'success' ? 'bg-emerald-100' :
                  tip.type === 'info' ? 'bg-blue-100' :
                  'bg-amber-100'
                }`}>
                  {tip.icon}
                </div>
                <span className="font-medium">{tip.text}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {runXP === 0 && tips.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-2 rounded-lg bg-slate-200 text-slate-500">
              <Clock size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">
                {getNextThreshold(actualXP).xp - actualXP} XP needed for {getNextThreshold(actualXP).level}
              </div>
              <div className="text-[10px] text-slate-500">Enter a route to see projection</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuickRouteCard: React.FC<{
  route: typeof POPULAR_ROUTES[0];
  cabin: CabinClass;
  isReturn: boolean;
  onClick: () => void;
}> = ({ route, cabin, isReturn, onClick }) => {
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

const RunSummary: React.FC<{
  segments: EditableSegment[];
  totalMiles: number;
  runXP: number;
}> = ({ segments, totalMiles, runXP }) => {
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

// --- Main Component ---

export const MileageRun: React.FC<MileageRunProps> = ({ 
  xpData, 
  rollover, 
  flights, 
  manualLedger, 
  qualificationSettings 
}) => {
  const { symbol: currencySymbol } = useCurrency();
  const [routeString, setRouteString] = useState('');
  const [defaultCabin, setDefaultCabin] = useState<CabinClass>('Business');
  const [isReturn, setIsReturn] = useState(true);
  
  const [runMode, setRunMode] = useState<RunMode>('classic');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0); 
  const [targetCPX, setTargetCPX] = useState<number>(10);

  const [segments, setSegments] = useState<EditableSegment[]>([]);
  const [unknownAirports, setUnknownAirports] = useState<string[]>([]);
  
  // Disclaimer & Report state
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    route: '',
    calculatedXP: '',
    actualXP: '',
    cabin: 'Economy' as CabinClass,
    notes: '',
  });
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Calculate Status - use same logic as Dashboard/XPEngine
  const { cycles } = useMemo(
    () => calculateQualificationCycles(xpData, rollover, flights, manualLedger, qualificationSettings),
    [xpData, rollover, flights, manualLedger, qualificationSettings]
  );
  
  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);
  const actualXP = activeCycle?.actualXP ?? 0;
  const projectedXP = activeCycle?.projectedXP ?? actualXP;
  const actualStatus = getStatusFromXP(actualXP);
  const projectedStatus = getStatusFromXP(projectedXP);
  
  // For backwards compatibility
  const currentXP = actualXP;
  const currentStatus = actualStatus;
  
  // Route Parsing
  useEffect(() => {
    if (!routeString) { setSegments([]); setUnknownAirports([]); return; }
    const codes = routeString.toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter((c) => c.length === 3);
    if (codes.length < 2) return;

    const unknowns: string[] = [];
    codes.forEach((code) => { if (!AIRPORTS[code] && !unknowns.includes(code)) unknowns.push(code); });

    if (unknowns.length > 0) { setUnknownAirports(unknowns); return; } 
    else { setUnknownAirports([]); }

    const createSeg = (from: string, to: string, idx: number, suffix: string) => {
      const { distance, band, xp } = calculateXPForRoute(from, to, defaultCabin);
      return { id: `${suffix}-${idx}-${from}-${to}`, from, to, distance, band, xp, cabin: defaultCabin };
    };

    const newSegments: EditableSegment[] = [];
    for (let i = 0; i < codes.length - 1; i++) { newSegments.push(createSeg(codes[i], codes[i + 1], i, 'out')); }
    if (isReturn) {
      const returnCodes = [...codes].reverse();
      for (let i = 0; i < returnCodes.length - 1; i++) { newSegments.push(createSeg(returnCodes[i], returnCodes[i + 1], i, 'in')); }
    }
    setSegments(newSegments);
  }, [routeString, isReturn, defaultCabin]);

  const updateSegmentCabin = (id: string, newCabin: CabinClass) => {
    setSegments((prev) => prev.map((seg) => {
      if (seg.id !== id) return seg;
      const { xp } = calculateXPForRoute(seg.from, seg.to, newCabin);
      return { ...seg, cabin: newCabin, xp };
    }));
  };

  const updateAllSegments = (newCabin: CabinClass) => {
    setSegments((prev) => prev.map((seg) => {
      const { xp } = calculateXPForRoute(seg.from, seg.to, newCabin);
      return { ...seg, cabin: newCabin, xp };
    }));
  };

  const removeSegment = (id: string) => { setSegments((prev) => prev.filter((s) => s.id !== id)); };

  const handleQuickRoute = (routeCode: string) => {
    setRouteString(routeCode);
  };

  // --- Metrics Calculation ---

  const runXP = segments.reduce((sum, s) => sum + s.xp, 0);
  const totalMiles = segments.reduce((sum, s) => sum + s.distance, 0);

  const baselineXP = useMemo(() => {
    return segments.reduce((sum, s) => {
      return sum + calculateXPForRoute(s.from, s.to, 'Economy').xp;
    }, 0);
  }, [segments]);

  // Efficiency Logic
  let costPerXP = 0;
  let efficiencyLabel = 'Total Yield';
  let efficiencySub = 'Cost per XP';
  let xpGainDisplay = runXP;
  let efficiencyTooltip = "Average cost for every XP gained in this run.";
  
  if (runMode === 'optimizer') {
    const marginalCost = Math.max(0, totalCost - baseCost);
    const marginalXP = Math.max(0, runXP - baselineXP);
    
    costPerXP = marginalXP > 0 ? marginalCost / marginalXP : 0;
    efficiencyLabel = 'Marginal Yield';
    efficiencySub = 'Cost per EXTRA XP';
    xpGainDisplay = marginalXP;
    efficiencyTooltip = "Cost for every EXTRA XP gained by upgrading from Economy. (Upgrade Cost / Extra XP)";
  } else {
    costPerXP = runXP > 0 && totalCost > 0 ? totalCost / runXP : 0;
  }

  // Verdict Logic
  const getVerdict = (cpx: number) => {
    if (cpx === 0) return { label: '-', color: 'slate' };
    if (cpx <= targetCPX * 0.6) return { label: 'Legendary', color: 'violet' }; 
    if (cpx <= targetCPX * 0.8) return { label: 'Excellent', color: 'emerald' }; 
    if (cpx <= targetCPX) return { label: 'On Target', color: 'blue' }; 
    if (cpx <= targetCPX * 1.5) return { label: 'Pricey', color: 'amber' };
    return { label: 'Expensive', color: 'slate' }; 
  };
  const verdict = getVerdict(costPerXP);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-600 mb-3 gap-1.5 uppercase tracking-wide">
            <Route size={12} />
            <span>Smart Route Builder</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">XP Run Simulator</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Plan your next status run based on your current <span className="text-slate-900 font-bold">{currentXP} XP</span> balance.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Target CPX Config */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex flex-col shadow-sm w-36 group hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-indigo-500">
                Target {currencySymbol}/XP
              </label>
              <Tooltip text="What is the maximum you want to pay for 1 XP? Used to calculate the Verdict." />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-slate-400 font-medium">{currencySymbol}</span>
              <input 
                type="number" 
                step="0.5" 
                value={targetCPX} 
                onChange={(e) => setTargetCPX(Number(e.target.value))} 
                className={`text-sm font-bold text-slate-800 outline-none bg-transparent w-full ${noSpinnerClass}`} 
              />
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner h-fit">
            <button 
              onClick={() => setRunMode('classic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${runMode === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Plane size={14} /> Classic
            </button>
            <button 
              onClick={() => setRunMode('optimizer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${runMode === 'optimizer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calculator size={14} /> Optimizer
            </button>
          </div>
        </div>
      </div>

      {/* XP Calculation Disclaimer Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Info size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                XP calculations are estimates based on distance
              </p>
              <p className="text-xs text-amber-700">
                Some routes may differ from actual Flying Blue values
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              <MessageSquare size={12} />
              Report Issue
            </button>
            <button
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {showDisclaimer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        
        {/* Expandable Details */}
        {showDisclaimer && (
          <div className="px-4 pb-4 pt-2 border-t border-amber-200 bg-amber-50/50">
            <div className="space-y-3 text-xs text-amber-800">
              <div>
                <p className="font-semibold mb-1">How we calculate XP:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Flight distance determines the category (Domestic, Short, Medium, Long 1/2/3)</li>
                  <li>Cabin class and your status determine the XP multiplier</li>
                  <li>This follows the official Flying Blue distance bands</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Why estimates may differ:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>AF/KLM manually override certain routes near category boundaries</li>
                  <li>Example: AMS-PEK is Long 3 (not Long 2) despite the distance</li>
                  <li>These overrides aren't publicly documented</li>
                </ul>
              </div>
              <p className="text-amber-600 italic">
                💡 Tip: Your Dashboard shows actual XP from imported PDFs, which reflects these exceptions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MessageSquare size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Report XP Discrepancy</h3>
                  <p className="text-xs text-slate-500">Help us improve our calculations</p>
                </div>
              </div>
              <button
                onClick={() => { setShowReportModal(false); setReportSent(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {reportSent ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Send size={24} className="text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Thanks for your report!</h4>
                <p className="text-sm text-slate-500 mb-4">
                  We'll investigate this route and update our calculations if needed.
                </p>
                <button
                  onClick={() => { setShowReportModal(false); setReportSent(false); }}
                  className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setReportSending(true);
                  
                  // Send via Supabase feedback table
                  const message = [
                    `Route: ${reportForm.route}`,
                    `Cabin: ${reportForm.cabin}`,
                    `Calculated XP: ${reportForm.calculatedXP}`,
                    `Actual XP: ${reportForm.actualXP}`,
                    `Difference: ${Number(reportForm.actualXP) - Number(reportForm.calculatedXP)} XP`,
                    reportForm.notes ? `Notes: ${reportForm.notes}` : null,
                  ].filter(Boolean).join('\n');
                  
                  const success = await submitFeedback({
                    trigger: 'xp_discrepancy',
                    message,
                    page: 'xp_run_simulator',
                  });
                  
                  setReportSending(false);
                  if (success) {
                    setReportSent(true);
                    setReportForm({ route: '', calculatedXP: '', actualXP: '', cabin: 'Economy', notes: '' });
                  } else {
                    alert('Failed to send report. Please try again.');
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Route (e.g., AMS-PEK or AMS-CDG-JFK)
                  </label>
                  <input
                    type="text"
                    required
                    value={reportForm.route}
                    onChange={(e) => setReportForm({ ...reportForm, route: e.target.value.toUpperCase() })}
                    placeholder="AMS-PEK"
                    className={inputBase}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cabin</label>
                    <select
                      value={reportForm.cabin}
                      onChange={(e) => setReportForm({ ...reportForm, cabin: e.target.value as CabinClass })}
                      className={inputBase}
                    >
                      <option value="Economy">Economy</option>
                      <option value="PremiumEconomy">Premium Eco</option>
                      <option value="Business">Business</option>
                      <option value="First">First</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Calculated</label>
                    <input
                      type="number"
                      required
                      value={reportForm.calculatedXP}
                      onChange={(e) => setReportForm({ ...reportForm, calculatedXP: e.target.value })}
                      placeholder="15"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Actual XP</label>
                    <input
                      type="number"
                      required
                      value={reportForm.actualXP}
                      onChange={(e) => setReportForm({ ...reportForm, actualXP: e.target.value })}
                      placeholder="20"
                      className={inputBase}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Notes (optional)
                  </label>
                  <textarea
                    value={reportForm.notes}
                    onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                    placeholder="Any additional context..."
                    rows={2}
                    className={inputBase}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={reportSending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                >
                  {reportSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Report
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* --- LEFT COLUMN: Status + Input --- */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Status Projection Card */}
          <StatusProjectionCard
            actualXP={actualXP}
            projectedXP={projectedXP}
            runXP={runXP}
            actualStatus={actualStatus}
            projectedStatus={projectedStatus}
            segments={segments}
          />
          
          {/* Input Card */}
          <div className="bg-white p-6 rounded-[2rem] shadow-lg shadow-slate-200/40 border border-slate-100">
            <div className="space-y-5">
              {/* Route Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MapPin size={12} /> Route Chain
                </label>
                <input
                  type="text"
                  className={`${inputBase} uppercase font-mono text-lg tracking-wider border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20`}
                  placeholder="AMS CDG DXB"
                  value={routeString}
                  onChange={(e) => setRouteString(e.target.value)}
                />
                {unknownAirports.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-red-600 text-xs">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>Unknown: <strong>{unknownAirports.join(', ')}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Base Cabin</label>
                  <select 
                    value={defaultCabin} 
                    onChange={(e) => setDefaultCabin(e.target.value as CabinClass)} 
                    className={`${inputBase} text-xs`}
                  >
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Prem. Eco</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Trip Type</label>
                  <button 
                    onClick={() => setIsReturn(!isReturn)} 
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${isReturn ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <span>{isReturn ? 'Return' : 'One-way'}</span>
                    {isReturn && <Repeat size={14} />}
                  </button>
                </div>
              </div>

              {/* Cost Input */}
              <div className={`p-4 rounded-xl border transition-colors ${runMode === 'optimizer' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                {runMode === 'optimizer' ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          Base Cost (Economy)
                        </label>
                        <Tooltip text="The price of the cheapest Economy ticket." />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          className={`${inputBase} ${noSpinnerClass} pl-8`}
                          placeholder="1000"
                          value={baseCost || ''}
                          onChange={(e) => setBaseCost(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-indigo-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-2 bg-indigo-50 text-[10px] text-indigo-400 font-bold uppercase">vs</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Coins size={12} /> Premium Cost
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          className={`${inputBase} ${noSpinnerClass} pl-8 text-lg font-bold text-indigo-900`}
                          placeholder="2500"
                          value={totalCost || ''}
                          onChange={(e) => setTotalCost(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Coins size={12} /> Total Run Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        className={`${inputBase} ${noSpinnerClass} pl-8 text-lg font-bold`}
                        placeholder="0"
                        value={totalCost || ''}
                        onChange={(e) => setTotalCost(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Routes */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">Quick Routes from AMS</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_ROUTES.map((route) => (
                <QuickRouteCard
                  key={route.code}
                  route={route}
                  cabin={defaultCabin}
                  isReturn={isReturn}
                  onClick={() => handleQuickRoute(route.code)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Results & Segments --- */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPI 
              title={efficiencyLabel} 
              value={`+${xpGainDisplay}`} 
              subtitle={runMode === 'optimizer' ? `Baseline: ${baselineXP} XP (Eco)` : `${formatNumber(totalMiles)} miles`}
              icon={Trophy} 
              badgeText={runMode === 'optimizer' ? 'Delta' : 'Total'}
              badgeColor="blue" 
              tooltip="The XP you gain from this run."
            />
            <KPI 
              title="Efficiency" 
              value={costPerXP > 0 ? `${currencySymbol}${costPerXP.toFixed(2)}` : `${currencySymbol}0.00`} 
              subtitle={efficiencySub}
              icon={Wallet} 
              badgeText={verdict.label} 
              badgeColor={verdict.color} 
              tooltip={efficiencyTooltip}
            />
          </div>

          {/* Run Summary */}
          <RunSummary segments={segments} totalMiles={totalMiles} runXP={runXP} />

          {/* Segment List */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Plane size={18} className="text-slate-400" /> Segment Breakdown
                </h3>
                {segments.length > 0 && (
                  <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                    {segments.length} Legs
                  </span>
                )}
              </div>
              
              {segments.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateAllSegments('Economy')} 
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all" 
                    title="Set all to Economy"
                  >
                    <ChevronsDown size={16} />
                  </button>
                  <button 
                    onClick={() => updateAllSegments('Business')} 
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all" 
                    title="Set all to Business"
                  >
                    <ChevronsUp size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 flex-1 max-h-[500px] overflow-y-auto">
              {segments.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <Plane className="opacity-20 mb-4" size={48} />
                  <p className="text-sm font-medium">Enter a route to start calculating</p>
                  <p className="text-xs text-slate-300 mt-1">Or select a quick route below</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {segments.map((segment, idx) => {
                    const cliff = getDistanceInsight(segment.distance, segment.band);

                    return (
                      <div 
                        key={segment.id} 
                        className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-black text-slate-800">{segment.from}</span>
                            <ArrowRight size={14} className="text-slate-300" />
                            <span className="text-lg font-black text-slate-800">{segment.to}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{segment.distance} mi</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{segment.band}</span>
                            
                            {cliff && (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 ml-2 animate-pulse">
                                <AlertTriangle size={10} />
                                {cliff.message}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <select
                            value={segment.cabin}
                            onChange={(e) => updateSegmentCabin(segment.id, e.target.value as CabinClass)}
                            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer outline-none hover:bg-white transition-colors"
                          >
                            <option value="Economy">Economy</option>
                            <option value="Premium Economy">Prem. Eco</option>
                            <option value="Business">Business</option>
                            <option value="First">First</option>
                          </select>

                          <div className="text-right min-w-[60px]">
                            <div className="text-xl font-black text-indigo-600">+{segment.xp}</div>
                            <div className="text-[10px] text-indigo-400/80 font-bold uppercase">XP</div>
                          </div>

                          <button 
                            onClick={() => removeSegment(segment.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
