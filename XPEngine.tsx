// src/components/XPEngine.tsx
// Versie met ondersteuning voor ACTUAL vs PROJECTED status

import React, { useState, useMemo, useEffect } from 'react';
import {
  XPRecord,
  FlightRecord,
  ManualLedger,
  ManualMonthXP,
  ManualField,
  StatusLevel,
} from '../types';
import {
  calculateQualificationCycles,
  XPLedgerRow,
  QualificationCycleStats,
} from '../utils/xp-logic';
import {
  ChevronRight,
  ChevronLeft,
  Plane,
  CheckCircle2,
  Star,
  Compass,
  ArrowUpRight,
  RotateCcw,
  TrendingUp,
  Zap,
  Clock,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { PLATINUM_THRESHOLD } from '../constants';
import { Tooltip } from './Tooltip';

interface XPEngineProps {
  data: XPRecord[];
  baseData: XPRecord[];
  onUpdate: (data: XPRecord[]) => void;
  rollover: number;
  onUpdateRollover: (val: number) => void;
  flights: FlightRecord[];
  onUpdateFlights: (flights: FlightRecord[]) => void;
  manualLedger: ManualLedger;
  onUpdateManualLedger: React.Dispatch<React.SetStateAction<ManualLedger>>;
}

const noSpinnerClass =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const StatusPill = ({
  label,
  theme,
  variant = 'default',
}: {
  label: string;
  theme: any;
  variant?: 'default' | 'levelup' | 'projected';
}) => (
  <span
    className={`inline-flex items-center justify-center h-5 px-2 rounded text-[9px] font-bold tracking-wider uppercase border shadow-sm ${
      variant === 'levelup'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : variant === 'projected'
        ? 'bg-blue-100 text-blue-700 border-blue-200 opacity-70'
        : theme.badge
    } opacity-90`}
  >
    {variant === 'levelup' && <Zap size={10} className="mr-1" />}
    {variant === 'projected' && <Clock size={10} className="mr-1" />}
    {label}
  </span>
);

const InputCell = ({
  val,
  field,
  month,
  onChange,
  className = '',
}: {
  val: number;
  field: ManualField;
  month: string;
  onChange: (month: string, field: ManualField, value: number) => void;
  className?: string;
}) => (
  <div className="relative group w-full h-full">
    <input
      type="number"
      value={val === 0 ? '' : val}
      placeholder="-"
      onFocus={(e) => e.target.select()}
      onChange={(e) =>
        onChange(
          month,
          field,
          e.target.value === '' ? 0 : Number(e.target.value)
        )
      }
      className={`
        w-full bg-transparent text-right py-2 px-2 
        font-mono text-xs transition-all duration-200
        focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:text-blue-700 rounded-md
        placeholder:text-slate-200 hover:bg-slate-50
        ${val !== 0 ? 'text-slate-700 font-bold' : 'text-slate-400'}
        ${noSpinnerClass}
        ${className}
      `}
      inputMode="numeric"
    />
  </div>
);

const getStatusTheme = (status: StatusLevel) => {
  switch (status) {
    case 'Platinum':
      return {
        blob1: 'bg-blue-100/60',
        blob2: 'bg-indigo-100/60',
        accentText: 'text-blue-900',
        subText: 'text-blue-600',
        iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
        gaugeStart: '#3b82f6',
        gaugeEnd: '#6366f1',
        icon: <Plane size={20} strokeWidth={2.5} />,
        badge: 'bg-slate-800 text-white border-slate-700',
      };
    case 'Gold':
      return {
        blob1: 'bg-amber-100/60',
        blob2: 'bg-orange-100/60',
        accentText: 'text-amber-900',
        subText: 'text-amber-600',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
        gaugeStart: '#f59e0b',
        gaugeEnd: '#f97316',
        icon: <Star size={20} strokeWidth={2.5} />,
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'Silver':
      return {
        blob1: 'bg-slate-200/60',
        blob2: 'bg-gray-200/60',
        accentText: 'text-slate-800',
        subText: 'text-slate-500',
        iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
        gaugeStart: '#94a3b8',
        gaugeEnd: '#64748b',
        icon: <CheckCircle2 size={20} strokeWidth={2.5} />,
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'Explorer':
    default:
      return {
        blob1: 'bg-sky-100/60',
        blob2: 'bg-cyan-100/60',
        accentText: 'text-sky-900',
        subText: 'text-sky-600',
        iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
        gaugeStart: '#38bdf8',
        gaugeEnd: '#0ea5e9',
        icon: <Compass size={20} strokeWidth={2.5} />,
        badge: 'bg-sky-50 text-sky-700 border-sky-100',
      };
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const getNextStatusFromCurrent = (status: StatusLevel): StatusLevel | null => {
  if (status === 'Explorer') return 'Silver';
  if (status === 'Silver') return 'Gold';
  if (status === 'Gold') return 'Platinum';
  return null;
};

export const XPEngine: React.FC<XPEngineProps> = ({
  data: _legacyData,
  baseData: _baseData,
  onUpdate: _onUpdate,
  rollover,
  onUpdateRollover,
  flights,
  onUpdateFlights: _onUpdateFlights,
  manualLedger,
  onUpdateManualLedger,
}) => {
  const { cycles } = useMemo(
    () =>
      calculateQualificationCycles(
        _legacyData,
        rollover,
        flights,
        manualLedger
      ),
    [_legacyData, rollover, flights, manualLedger]
  );

  // Vind de "actieve" cyclus - de cyclus waar vandaag in valt
  const findActiveCycleIndex = (cycleList: QualificationCycleStats[]): number => {
    const today = new Date().toISOString().slice(0, 10);
    
    for (let i = 0; i < cycleList.length; i++) {
      const cycle = cycleList[i];
      // Check of vandaag binnen deze cyclus valt
      if (today >= cycle.startDate && today <= cycle.endDate) {
        return i;
      }
    }
    
    // Als geen cyclus vandaag bevat, kies de laatste cyclus die nog niet is afgesloten
    // OF de eerste cyclus die in de toekomst ligt
    for (let i = 0; i < cycleList.length; i++) {
      const cycle = cycleList[i];
      if (cycle.endDate >= today) {
        return i;
      }
    }
    
    // Fallback: laatste cyclus
    return cycleList.length - 1;
  };

  // Selecteer de actieve cyclus als default, of update wanneer cycles veranderen
  const [selectedIndex, setSelectedIndex] = useState(() =>
    cycles.length > 0 ? findActiveCycleIndex(cycles) : 0
  );

  // Update selectie wanneer cycles veranderen (bijv. na een actual level-up)
  useEffect(() => {
    if (cycles.length === 0) {
      setSelectedIndex(0);
      return;
    }
    
    // Vind de actieve cyclus
    const activeCycleIndex = findActiveCycleIndex(cycles);
    
    // Als de huidige selectie een afgesloten cyclus is (actual level-up),
    // spring naar de actieve cyclus
    const currentCycle = cycles[selectedIndex];
    if (currentCycle && currentCycle.endedByLevelUp && currentCycle.levelUpIsActual) {
      // Deze cyclus is afgesloten door een actual level-up
      // Spring naar de volgende (actieve) cyclus
      setSelectedIndex(activeCycleIndex);
    } else if (selectedIndex >= cycles.length) {
      // Ongeldige index, reset naar actieve cyclus
      setSelectedIndex(activeCycleIndex);
    }
  }, [cycles]);

  if (cycles.length === 0) {
    return null;
  }

  const currentCycle: QualificationCycleStats = cycles[selectedIndex];

  // ACTUAL status en XP (gebaseerd op gevlogen vluchten)
  const actualStatus: StatusLevel = currentCycle.actualStatus ?? currentCycle.startStatus;
  const actualXP: number = currentCycle.actualXP ?? 0;
  const actualXPToNext: number = currentCycle.actualXPToNext ?? 0;

  // PROJECTED status en XP (inclusief geplande vluchten)
  const projectedStatus: StatusLevel = currentCycle.projectedStatus ?? currentCycle.endStatus;
  const projectedXPToNext: number = currentCycle.projectedXPToNext ?? 0;

  // Bereken bruto projected cumulative XP (rollover + alle maand XP, VOOR level-up correcties)
  // Dit is wat we in de gauge willen tonen
  const projectedCumulativeXP = useMemo(() => {
    const lastRow = currentCycle.ledger[currentCycle.ledger.length - 1];
    // De cumulative in de ledger is NA level-up correcties
    // We moeten de bruto XP berekenen: rollover + som van alle maandtotalen
    const totalMonthXP = currentCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return currentCycle.rolloverIn + totalMonthXP;
  }, [currentCycle]);

  // Voor backwards compat
  const projectedXP = projectedCumulativeXP;

  // Check of er een verschil is tussen actual en projected
  const hasProjectedUpgrade = projectedStatus !== actualStatus;
  const hasProjectedXPDifference = projectedCumulativeXP !== actualXP;

  // Theme gebaseerd op ACTUAL status
  const theme = getStatusTheme(actualStatus);
  const projectedTheme = getStatusTheme(projectedStatus);
  const nextStatus = getNextStatusFromCurrent(actualStatus);

  // Cycle info
  const isLevelUpCycle = currentCycle.endedByLevelUp ?? false;
  const levelUpIsActual = currentCycle.levelUpIsActual ?? false;
  const isChained = selectedIndex > 0;

  // Projected cycle XP
  const projectedCycleXP = useMemo(
    () =>
      currentCycle.ledger.reduce((sum: number, row: XPLedgerRow) => {
        const monthTotal = row.monthTotal ?? row.xpMonth ?? 0;
        return sum + monthTotal;
      }, 0),
    [currentCycle]
  );

  // Actual cycle XP (alleen gevlogen)
  const actualCycleXP = useMemo(
    () =>
      currentCycle.ledger.reduce((sum: number, row: XPLedgerRow) => {
        return sum + (row.actualXP ?? 0);
      }, 0),
    [currentCycle]
  );

  // Bereken progress naar de VOLGENDE status (niet altijd Platinum)
  const nextStatusThreshold = useMemo(() => {
    if (actualStatus === 'Explorer') return 100; // naar Silver
    if (actualStatus === 'Silver') return 180; // naar Gold
    if (actualStatus === 'Gold') return 300; // naar Platinum
    return 300; // Platinum: requalificatie
  }, [actualStatus]);

  const actualProgress = Math.min(
    100,
    (actualXP / nextStatusThreshold) * 100
  );

  const projectedProgress = Math.min(
    100,
    (projectedXP / nextStatusThreshold) * 100
  );

  const handleCycleChange = (delta: number) => {
    const next = selectedIndex + delta;
    if (next >= 0 && next < cycles.length) {
      setSelectedIndex(next);
    }
  };

  const handleManualRolloverChange = (val: number) => {
    const clamped = Math.max(0, Math.min(300, val));
    onUpdateRollover(Number.isFinite(clamped) ? clamped : 0);
  };

  const ensureManualMonth = (month: string): ManualMonthXP => {
    const base: ManualMonthXP = {
      amexXp: 0,
      bonusSafXp: 0,
      miscXp: 0,
      correctionXp: 0,
    };
    return manualLedger[month] ? { ...base, ...manualLedger[month] } : base;
  };

  const handleManualCellChange = (
    month: string,
    field: ManualField,
    value: number
  ) => {
    onUpdateManualLedger((prev) => {
      const current = ensureManualMonth(month);
      return {
        ...prev,
        [month]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Enhanced ledger
  const enhancedLedger = useMemo(() => {
    const rows = currentCycle.ledger;
    let prevCumulative = currentCycle.rolloverIn ?? 0;

    return rows.map((row) => {
      const monthTotal = row.monthTotal ?? row.xpMonth ?? 0;
      const diff = row.cumulative - prevCumulative;
      const autoCorrection = diff - monthTotal;
      prevCumulative = row.cumulative;

      const isLevelUpMonth =
        isLevelUpCycle && currentCycle.levelUpMonth === row.month;

      return { row, autoCorrection, isLevelUpMonth };
    });
  }, [currentCycle, isLevelUpCycle]);

  // Chart data
  const chartData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return currentCycle.ledger.map((row) => {
      const isFuture = row.month > currentMonth;
      const monthXP = row.monthTotal ?? row.xpMonth ?? 0;
      const actualMonthXP = row.actualXP ?? 0;
      const projectedMonthXP = row.projectedXP ?? 0;

      return {
        ...row,
        xp: monthXP,
        actualXP: actualMonthXP,
        projectedXP: projectedMonthXP,
        isFuture,
      };
    });
  }, [currentCycle]);

  // Run rate
  const avgNeeded = useMemo(() => {
    const futureMonths = chartData.filter((d) => d.isFuture);
    const futureCount = futureMonths.length;
    if (actualXPToNext > 0 && futureCount > 0) {
      return Math.ceil(actualXPToNext / futureCount);
    }
    return 0;
  }, [chartData, actualXPToNext]);

  // Cycle type label
  const getCycleTypeLabel = () => {
    if (isLevelUpCycle && levelUpIsActual) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wide border border-emerald-100">
          <Zap size={12} />
          Level-up achieved
        </div>
      );
    }
    if (isLevelUpCycle && !levelUpIsActual) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wide border border-blue-100">
          <Clock size={12} />
          Level-up projected
        </div>
      );
    }
    return (
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        Standard cycle
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            XP Engine
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Manage your qualification cycle
          </p>
        </div>

        {/* Cycle selector - hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          <button
            onClick={() => handleCycleChange(-1)}
            disabled={selectedIndex === 0}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-all disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center w-48">
            <span className="text-sm font-bold text-slate-800 tabular-nums">
              {formatDate(currentCycle.startDate)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              to {formatDate(currentCycle.endDate)}
            </span>
            {getCycleTypeLabel()}
          </div>

          <button
            onClick={() => handleCycleChange(1)}
            disabled={selectedIndex === cycles.length - 1}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-all disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Card - Now shows ACTUAL status */}
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
                <h3
                  className={`text-4xl font-black tracking-tight ${theme.accentText}`}
                >
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

                {/* Projected status badge als die verschilt */}
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
              <div
                className={`p-2.5 rounded-2xl border shadow-sm ${theme.iconBg}`}
              >
                {theme.icon}
              </div>
            </div>

            {/* Gauge - Shows ACTUAL XP with projected as faint outer ring */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6">
              <div className="relative w-56 h-56">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
                  <defs>
                    <linearGradient
                      id="xpGaugeGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={theme.gaugeStart} />
                      <stop offset="100%" stopColor={theme.gaugeEnd} />
                    </linearGradient>
                    <linearGradient
                      id="xpGaugeProjected"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
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
                  <span
                    className={`text-6xl font-black tracking-tighter tabular-nums ${theme.accentText}`}
                  >
                    {actualXP}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] mt-2 text-slate-400">
                    Actual XP
                  </span>
                  {/* Projected XP als die verschilt */}
                  {hasProjectedXPDifference && (
                    <div className="flex items-center gap-1 mt-1 text-blue-500">
                      <Clock size={10} />
                      <span className="text-xs font-medium">
                        {projectedXP} projected
                      </span>
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
                      currentCycle.rolloverOut > 0
                        ? theme.accentText
                        : 'text-slate-300'
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

        {/* Right column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Rollover and performance cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[140px]">
            {/* Rollover card */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors relative z-0 hover:z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Rollover (Start)
                    </p>
                    <Tooltip text="XP balance carried over from the previous qualification cycle." />
                  </div>
                  <div className="flex items-baseline gap-2">
                    {isChained ? (
                      <span className="text-4xl font-black text-slate-800">
                        {currentCycle.rolloverIn}
                      </span>
                    ) : (
                      <input
                        type="number"
                        value={rollover}
                        onChange={(e) =>
                          handleManualRolloverChange(Number(e.target.value))
                        }
                        className={`text-4xl font-black text-slate-800 w-24 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 focus:outline-none ${noSpinnerClass}`}
                      />
                    )}
                    <span className="text-sm font-bold text-slate-400">XP</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                  <RotateCcw size={20} />
                </div>
              </div>
              {isChained && (
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit uppercase tracking-wide">
                  Auto chained from previous cycle
                </div>
              )}
            </div>

            {/* Cycle performance card - Now shows actual vs projected */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors relative z-0 hover:z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Cycle Performance
                    </p>
                    <Tooltip text="XP earned this cycle. Actual = flown flights. Projected = including scheduled flights." />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-800">
                      {actualCycleXP}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      XP actual
                    </span>
                  </div>
                  {projectedCycleXP > actualCycleXP && (
                    <div className="flex items-center gap-1 text-blue-500 text-xs mt-1">
                      <Clock size={10} />
                      <span>{projectedCycleXP} XP projected</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500 border border-amber-100">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                {/* Projected bar (faint) */}
                {projectedCycleXP > actualCycleXP && (
                  <div
                    className="absolute h-full bg-amber-200 rounded-full"
                    style={{
                      width: `${Math.min(100, (projectedCycleXP / 300) * 100)}%`,
                    }}
                  />
                )}
                {/* Actual bar (solid) */}
                <div
                  className="absolute h-full bg-amber-400 rounded-full"
                  style={{
                    width: `${Math.min(100, (actualCycleXP / 300) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Progression chart */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ArrowUpRight size={18} className="text-slate-400" />
                Progression
              </h3>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500 text-white border border-blue-600">
                  Actual XP
                </span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-600 border border-blue-200">
                  Scheduled XP
                </span>
                {avgNeeded > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                    Target: ~{avgNeeded}/mo
                  </span>
                )}
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{
                      fontSize: 11,
                      fill: '#94a3b8',
                      fontWeight: 600,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: '#94a3b8',
                      fontWeight: 600,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow:
                        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const actual = payload.find(p => p.dataKey === 'actualXP')?.value ?? 0;
                        const projected = payload.find(p => p.dataKey === 'projectedXP')?.value ?? 0;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                            <p className="font-bold text-slate-800 mb-1">{label}</p>
                            <p className="text-sm text-blue-600">Actual: {actual} XP</p>
                            {Number(projected) > 0 && (
                              <p className="text-sm text-blue-400">Scheduled: {projected} XP</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Stacked bars: actual + projected */}
                  <Bar
                    dataKey="actualXP"
                    stackId="xp"
                    fill="#0ea5e9"
                    radius={[0, 0, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    dataKey="projectedXP"
                    stackId="xp"
                    fill="#0ea5e9"
                    fillOpacity={0.3}
                    stroke="#0ea5e9"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                  {avgNeeded > 0 && (
                    <ReferenceLine
                      y={avgNeeded}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{
                        value: `Avg. needed: ${avgNeeded} XP`,
                        position: 'insideTopRight',
                        fill: '#f59e0b',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="font-bold text-slate-800">XP Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Flights are calculated automatically. Scheduled flights shown with{' '}
              <Clock size={10} className="inline" /> icon.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLevelUpCycle && currentCycle.levelUpMonth && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                levelUpIsActual 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                {levelUpIsActual ? <Zap size={14} /> : <Clock size={14} />}
                Level-up {levelUpIsActual ? 'achieved' : 'projected'} in{' '}
                {new Date(currentCycle.levelUpMonth + '-01').toLocaleDateString(
                  'en-US',
                  { month: 'short' }
                )}
              </div>
            )}
            {isChained && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                <ArrowUpRight size={14} />
                Chained from previous cycle
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 min-w-[140px]">Month</th>
                <th className="px-2 py-4 text-right w-24 text-sky-700">
                  Flights XP
                </th>
                <th className="px-2 py-4 text-right w-24 text-slate-500">
                  SAF Bonus
                </th>
                <th className="px-2 py-4 text-right w-24 text-indigo-500">
                  Amex XP
                </th>
                <th className="px-2 py-4 text-right w-24 text-slate-500">
                  Misc XP
                </th>
                <th className="px-2 py-4 text-right w-28 text-red-400">Event</th>
                <th className="px-4 py-4 text-right bg-slate-50 border-l border-slate-100 text-slate-700">
                  Total
                </th>
                <th className="px-4 py-4 text-right bg-blue-50/30 text-blue-900">
                  Cumul.
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {enhancedLedger.map(({ row, autoCorrection, isLevelUpMonth }) => {
                const manual = ensureManualMonth(row.month);

                const monthFlights = flights.filter(
                  (f) => f.date.slice(0, 7) === row.month
                );
                const flightXP = monthFlights.reduce(
                  (sum, f) => sum + (f.earnedXP ?? 0),
                  0
                );
                const flightSafXP = monthFlights.reduce(
                  (sum, f) => sum + (f.safXp ?? 0),
                  0
                );
                const flightCount = monthFlights.length;
                
                // Count actual vs scheduled flights
                const today = new Date().toISOString().slice(0, 10);
                const actualFlightCount = monthFlights.filter(f => f.date < today).length;
                const scheduledFlightCount = flightCount - actualFlightCount;

                const monthTotal = row.monthTotal ?? row.xpMonth ?? 0;
                const isFullyFlown = row.isFullyFlown ?? false;
                const isFuture = row.isFuture ?? false;

                const hasLevelUpCorrection = autoCorrection !== 0;

                return (
                  <tr
                    key={row.month}
                    className={`group transition-colors border-b border-slate-50 last:border-0 ${
                      isLevelUpMonth && levelUpIsActual
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                        : isLevelUpMonth && !levelUpIsActual
                        ? 'bg-blue-50/30 hover:bg-blue-50/50'
                        : isFuture
                        ? 'opacity-60 bg-slate-50/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-between w-full min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isLevelUpMonth && levelUpIsActual
                                ? 'text-emerald-700'
                                : isLevelUpMonth && !levelUpIsActual
                                ? 'text-blue-700'
                                : isFuture
                                ? 'text-slate-400'
                                : 'text-slate-700'
                            }`}
                          >
                            {row.monthLabel}
                          </span>
                          {/* Flight count badges */}
                          {actualFlightCount > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded text-[9px] font-bold border border-sky-100">
                              <Plane size={8} className="fill-current" />
                              {actualFlightCount}
                            </div>
                          )}
                          {scheduledFlightCount > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[9px] font-bold border border-blue-100">
                              <Clock size={8} />
                              {scheduledFlightCount}
                            </div>
                          )}
                        </div>
                        {isLevelUpMonth && levelUpIsActual && (
                          <StatusPill
                            label={`→ ${currentCycle.endStatus}`}
                            theme={theme}
                            variant="levelup"
                          />
                        )}
                        {isLevelUpMonth && !levelUpIsActual && (
                          <StatusPill
                            label={`→ ${currentCycle.endStatus}`}
                            theme={theme}
                            variant="projected"
                          />
                        )}
                        {!isLevelUpMonth && row.hitPlatinum && (
                          <StatusPill label="PLAT" theme={theme} />
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex justify-end pr-2">
                        {flightXP > 0 ? (
                          <span className={`font-bold px-2 py-1 rounded-md tabular-nums border ${
                            isFullyFlown 
                              ? 'text-sky-700 bg-sky-50/50 border-sky-100/50'
                              : 'text-blue-500 bg-blue-50/50 border-blue-100/50'
                          }`}>
                            {flightXP}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs px-2 py-1">
                            -
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-1 relative">
                      <div className="flex flex-col items-end justify-center h-full">
                        <InputCell
                          val={manual.bonusSafXp}
                          field="bonusSafXp"
                          month={row.month}
                          onChange={handleManualCellChange}
                        />
                        {flightSafXP > 0 && (
                          <div className="absolute bottom-1 right-2 pointer-events-none">
                            <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/50 flex items-center gap-1">
                              Flight: +{flightSafXP}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-1">
                      <InputCell
                        val={manual.amexXp}
                        field="amexXp"
                        month={row.month}
                        onChange={handleManualCellChange}
                        className="text-indigo-600"
                      />
                    </td>

                    <td className="px-2 py-1">
                      <InputCell
                        val={manual.miscXp}
                        field="miscXp"
                        month={row.month}
                        onChange={handleManualCellChange}
                      />
                    </td>

                    <td className="px-2 py-1 text-right align-top">
                      <div className="flex flex-col items-end pr-2 gap-0.5 min-h-[32px]">
                        {hasLevelUpCorrection && (
                          <span
                            className={`text-[10px] font-semibold ${
                              isLevelUpMonth && levelUpIsActual
                                ? 'text-emerald-600'
                                : isLevelUpMonth && !levelUpIsActual
                                ? 'text-blue-600'
                                : 'text-red-500'
                            }`}
                          >
                            {isLevelUpMonth ? 'Level up' : 'Adjustment'}:{' '}
                            {autoCorrection} XP
                          </span>
                        )}
                        {manual.correctionXp !== 0 && (
                          <span className="text-[10px] text-red-400">
                            Manual: {manual.correctionXp > 0 ? '+' : ''}
                            {manual.correctionXp} XP
                          </span>
                        )}
                        {!hasLevelUpCorrection && manual.correctionXp === 0 && (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums border-l border-slate-100 bg-slate-50/30">
                      <span
                        className={`font-bold text-sm ${
                          monthTotal > 0
                            ? 'text-slate-800'
                            : monthTotal < 0
                            ? 'text-red-500'
                            : 'text-slate-300'
                        }`}
                      >
                        {monthTotal !== 0 ? monthTotal : '-'}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-3 text-right tabular-nums font-bold text-sm ${
                        isLevelUpMonth && levelUpIsActual
                          ? 'bg-emerald-50/50 text-emerald-800'
                          : isLevelUpMonth && !levelUpIsActual
                          ? 'bg-blue-50/50 text-blue-800'
                          : 'bg-blue-50/10 text-blue-900/80'
                      }`}
                    >
                      {row.cumulative}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
