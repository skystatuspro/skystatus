// src/components/XPEngine/index.tsx
// Main XPEngine component - manages state and composes subcomponents

import React, { useState, useMemo, useEffect } from 'react';
import {
  XPRecord,
  FlightRecord,
  ManualLedger,
  ManualMonthXP,
  ManualField,
  StatusLevel,
} from '../../types';
import {
  calculateQualificationCycles,
  XPLedgerRow,
  QualificationCycleStats,
} from '../../utils/xp-logic';
import {
  ChevronRight,
  ChevronLeft,
  Zap,
  Clock,
  TrendingUp,
  RotateCcw,
  Lightbulb,
  Settings2,
} from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { FAQModal } from '../FAQModal';

// Subcomponents
import { getStatusTheme, getNextStatusFromCurrent, formatDate, noSpinnerClass } from './helpers';
import { CycleSetupForm, CycleSetupFormValues } from './CycleSetupForm';
import { StatusCard } from './StatusCard';
import { ProgressionChart } from './ProgressionChart';
import { LedgerTable } from './LedgerTable';

interface QualificationSettingsType {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
}

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
  qualificationSettings: QualificationSettingsType | null;
  onUpdateQualificationSettings: (settings: QualificationSettingsType | null) => void;
}

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
  qualificationSettings,
  onUpdateQualificationSettings,
}) => {
  // Calculate cycles
  const { cycles } = useMemo(
    () =>
      calculateQualificationCycles(
        _legacyData,
        rollover,
        flights,
        manualLedger,
        qualificationSettings
      ),
    [_legacyData, rollover, flights, manualLedger, qualificationSettings]
  );

  // Find active cycle
  const findActiveCycleIndex = (cycleList: QualificationCycleStats[]): number => {
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < cycleList.length; i++) {
      const cycle = cycleList[i];
      if (today >= cycle.startDate && today <= cycle.endDate) {
        return i;
      }
    }

    for (let i = 0; i < cycleList.length; i++) {
      const cycle = cycleList[i];
      if (cycle.endDate >= today) {
        return i;
      }
    }

    return cycleList.length - 1;
  };

  // State
  const [selectedIndex, setSelectedIndex] = useState(() =>
    cycles.length > 0 ? findActiveCycleIndex(cycles) : 0
  );
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCycleSetup, setShowCycleSetup] = useState(false);

  const shouldShowCycleSetup = !qualificationSettings || showCycleSetup;

  // Update selection on invalid index
  useEffect(() => {
    if (cycles.length === 0) {
      setSelectedIndex(0);
      return;
    }

    if (selectedIndex >= cycles.length) {
      setSelectedIndex(findActiveCycleIndex(cycles));
    }
  }, [cycles.length]);

  if (cycles.length === 0) {
    return null;
  }

  // Safe index
  const safeSelectedIndex =
    selectedIndex < cycles.length ? selectedIndex : Math.max(0, cycles.length - 1);
  const currentCycle: QualificationCycleStats = cycles[safeSelectedIndex];

  // ACTUAL status and XP
  const actualStatus: StatusLevel = currentCycle.actualStatus ?? currentCycle.startStatus;
  const actualXP: number = currentCycle.actualXP ?? 0;
  const actualXPToNext: number = currentCycle.actualXPToNext ?? 0;

  // PROJECTED status and XP
  const projectedStatus: StatusLevel = currentCycle.projectedStatus ?? currentCycle.endStatus;
  const projectedXPToNext: number = currentCycle.projectedXPToNext ?? 0;

  // Calculate projected cumulative XP
  const projectedCumulativeXP = useMemo(() => {
    const totalMonthXP = currentCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return currentCycle.rolloverIn + totalMonthXP;
  }, [currentCycle]);

  const projectedXP = projectedCumulativeXP;

  // Check differences
  const hasProjectedUpgrade = projectedStatus !== actualStatus;
  const hasProjectedXPDifference = projectedCumulativeXP !== actualXP;

  // Theme
  const theme = getStatusTheme(actualStatus);
  const nextStatus = getNextStatusFromCurrent(actualStatus);

  // Cycle info
  const isLevelUpCycle = currentCycle.endedByLevelUp ?? false;
  const levelUpIsActual = currentCycle.levelUpIsActual ?? false;
  const isChained = selectedIndex > 0;

  // Cycle XP calculations
  const projectedCycleXP = useMemo(
    () =>
      currentCycle.ledger.reduce((sum: number, row: XPLedgerRow) => {
        const monthTotal = row.monthTotal ?? row.xpMonth ?? 0;
        return sum + monthTotal;
      }, 0),
    [currentCycle]
  );

  const actualCycleXP = useMemo(
    () =>
      currentCycle.ledger.reduce((sum: number, row: XPLedgerRow) => {
        return sum + (row.actualXP ?? 0);
      }, 0),
    [currentCycle]
  );

  // Progress calculations
  const nextStatusThreshold = useMemo(() => {
    if (actualStatus === 'Explorer') return 100;
    if (actualStatus === 'Silver') return 180;
    if (actualStatus === 'Gold') return 300;
    return 300;
  }, [actualStatus]);

  const actualProgress = Math.min(100, (actualXP / nextStatusThreshold) * 100);
  const projectedProgress = Math.min(100, (projectedXP / nextStatusThreshold) * 100);

  // Handlers
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

  const handleManualCellChange = (month: string, field: ManualField, value: number) => {
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

      const isLevelUpMonth = isLevelUpCycle && currentCycle.levelUpMonth === row.month;

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">XP Engine</h2>
          <p className="text-slate-500 mt-1 font-medium">Manage your qualification cycle</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Edit cycle settings button */}
          <button
            onClick={() => setShowCycleSetup(!showCycleSetup)}
            className={`p-2 rounded-lg transition-all ${
              showCycleSetup
                ? 'bg-amber-100 text-amber-600'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
            }`}
            title={showCycleSetup ? 'Close cycle settings' : 'Edit cycle settings'}
          >
            <Settings2 size={20} />
          </button>

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
      </div>

      {/* Cycle Setup */}
      {shouldShowCycleSetup && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600 flex-shrink-0">
              <Lightbulb size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                {qualificationSettings ? 'Edit your cycle settings' : 'Set up your Flying Blue cycle'}
              </h3>
              <p className="text-slate-600 text-sm mb-5">
                {qualificationSettings
                  ? 'Update your qualification year settings below.'
                  : 'To accurately track your XP, tell us when your qualification year started, what status you had, and your current XP balance.'}{' '}
                Find this info at{' '}
                <a
                  href="https://www.flyingblue.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline font-medium"
                >
                  flyingblue.com
                </a>
                .
              </p>

              <CycleSetupForm
                initialValues={qualificationSettings}
                onSave={(settings) => {
                  onUpdateQualificationSettings(settings);
                  setShowCycleSetup(false);
                }}
                onCancel={qualificationSettings ? () => setShowCycleSetup(false) : undefined}
                onShowFaq={() => setShowFaqModal(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Card */}
        <StatusCard
          actualStatus={actualStatus}
          actualXP={actualXP}
          actualXPToNext={actualXPToNext}
          projectedStatus={projectedStatus}
          projectedXP={projectedXP}
          projectedXPToNext={projectedXPToNext}
          nextStatus={nextStatus}
          nextStatusThreshold={nextStatusThreshold}
          currentCycle={currentCycle}
          theme={theme}
          isLevelUpCycle={isLevelUpCycle}
          levelUpIsActual={levelUpIsActual}
          hasProjectedUpgrade={hasProjectedUpgrade}
          hasProjectedXPDifference={hasProjectedXPDifference}
          actualProgress={actualProgress}
          projectedProgress={projectedProgress}
        />

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
                        onChange={(e) => handleManualRolloverChange(Number(e.target.value))}
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

            {/* Cycle performance card */}
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
                    <span className="text-4xl font-black text-slate-800">{actualCycleXP}</span>
                    <span className="text-sm font-bold text-slate-400">XP actual</span>
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
                {projectedCycleXP > actualCycleXP && (
                  <div
                    className="absolute h-full bg-amber-200 rounded-full"
                    style={{
                      width: `${Math.min(100, (projectedCycleXP / 300) * 100)}%`,
                    }}
                  />
                )}
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
          <ProgressionChart chartData={chartData} avgNeeded={avgNeeded} />
        </div>
      </div>

      {/* Ledger table */}
      <LedgerTable
        currentCycle={currentCycle}
        enhancedLedger={enhancedLedger}
        flights={flights}
        manualLedger={manualLedger}
        theme={theme}
        isLevelUpCycle={isLevelUpCycle}
        levelUpIsActual={levelUpIsActual}
        isChained={isChained}
        onManualCellChange={handleManualCellChange}
      />

      {/* FAQ Modal */}
      <FAQModal isOpen={showFaqModal} onClose={() => setShowFaqModal(false)} />
    </div>
  );
};
