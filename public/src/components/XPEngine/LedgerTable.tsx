// src/components/XPEngine/LedgerTable.tsx
// XP Ledger table showing monthly breakdown

import React from 'react';
import { FlightRecord, ManualLedger, ManualMonthXP, ManualField } from '../../types';
import { QualificationCycleStats, XPLedgerRow } from '../../utils/xp-logic';
import { Plane, Clock, ArrowUpRight, Zap, Crown } from 'lucide-react';
import { StatusPill, InputCell, StatusTheme } from './helpers';

interface EnhancedLedgerRow {
  row: XPLedgerRow;
  autoCorrection: number;
  isLevelUpMonth: boolean;
}

interface LedgerTableProps {
  currentCycle: QualificationCycleStats;
  enhancedLedger: EnhancedLedgerRow[];
  flights: FlightRecord[];
  manualLedger: ManualLedger;
  theme: StatusTheme;
  isLevelUpCycle: boolean;
  levelUpIsActual: boolean;
  isChained: boolean;
  onManualCellChange: (month: string, field: ManualField, value: number) => void;
  showUXP?: boolean; // Only show for Platinum/Ultimate members
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  currentCycle,
  enhancedLedger,
  flights,
  manualLedger,
  theme,
  isLevelUpCycle,
  levelUpIsActual,
  isChained,
  onManualCellChange,
  showUXP = false,
}) => {
  const ensureManualMonth = (month: string): ManualMonthXP => {
    const base: ManualMonthXP = {
      amexXp: 0,
      bonusSafXp: 0,
      miscXp: 0,
      correctionXp: 0,
    };
    return manualLedger[month] ? { ...base, ...manualLedger[month] } : base;
  };

  return (
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
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                levelUpIsActual
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            >
              {levelUpIsActual ? <Zap size={14} /> : <Clock size={14} />}
              Level-up {levelUpIsActual ? 'achieved' : 'projected'} in{' '}
              {new Date(currentCycle.levelUpMonth + '-01').toLocaleDateString('en-US', {
                month: 'short',
              })}
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
              <th className="px-2 py-4 text-right w-24 text-sky-700">Flights XP</th>
              <th className="px-2 py-4 text-right w-24 text-slate-500">SAF Bonus</th>
              <th className="px-2 py-4 text-right w-24 text-indigo-500">Amex XP</th>
              <th className="px-2 py-4 text-right w-24 text-slate-500">Misc XP</th>
              <th className="px-2 py-4 text-right w-28 text-red-400">Event</th>
              <th className="px-4 py-4 text-right bg-slate-50 border-l border-slate-100 text-slate-700">
                Total
              </th>
              <th className="px-4 py-4 text-right bg-blue-50/30 text-blue-900">Cumul.</th>
              {showUXP && (
                <th className="px-4 py-4 text-right bg-amber-50/30 text-amber-700 border-l border-amber-100/50">
                  <div className="flex items-center justify-end gap-1">
                    <Crown size={10} />
                    UXP
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {enhancedLedger.map(({ row, autoCorrection, isLevelUpMonth }) => {
              const manual = ensureManualMonth(row.month);

              const monthFlights = flights.filter((f) => f.date.slice(0, 7) === row.month);
              const flightXP = monthFlights.reduce((sum, f) => sum + (f.earnedXP ?? 0), 0);
              const flightSafXP = monthFlights.reduce((sum, f) => sum + (f.safXp ?? 0), 0);
              const flightCount = monthFlights.length;

              // Count actual vs scheduled flights
              const today = new Date().toISOString().slice(0, 10);
              const actualFlightCount = monthFlights.filter((f) => f.date < today).length;
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
                        <span
                          className={`font-bold px-2 py-1 rounded-md tabular-nums border ${
                            isFullyFlown
                              ? 'text-sky-700 bg-sky-50/50 border-sky-100/50'
                              : 'text-blue-500 bg-blue-50/50 border-blue-100/50'
                          }`}
                        >
                          {flightXP}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs px-2 py-1">-</span>
                      )}
                    </div>
                  </td>

                  <td className="px-2 py-1 relative">
                    <div className="flex flex-col items-end justify-center h-full">
                      <InputCell
                        val={manual.bonusSafXp}
                        field="bonusSafXp"
                        month={row.month}
                        onChange={onManualCellChange}
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
                      onChange={onManualCellChange}
                      className="text-indigo-600"
                    />
                  </td>

                  <td className="px-2 py-1">
                    <InputCell
                      val={manual.miscXp}
                      field="miscXp"
                      month={row.month}
                      onChange={onManualCellChange}
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
                          {isLevelUpMonth ? 'Level up' : 'Adjustment'}: {autoCorrection} XP
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

                  {showUXP && (
                    <td className="px-4 py-3 text-right tabular-nums border-l border-amber-100/50 bg-amber-50/10">
                      <span className={`font-medium text-sm ${
                        (row.uxp ?? 0) > 0 ? 'text-amber-700' : 'text-slate-300'
                      }`}>
                        {(row.uxp ?? 0) > 0 ? row.uxp : '-'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
