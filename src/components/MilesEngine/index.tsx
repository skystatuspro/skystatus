// src/components/MilesEngine/index.tsx
// Main MilesEngine component - Financial backbone of the loyalty portfolio

import React, { useMemo, useState } from 'react';
import { MilesRecord, RedemptionRecord, ActivityTransaction, FlightRecord } from '../../types';
import { calculateMilesStats } from '../../utils/loyalty-logic';
import { formatNumber, generateId } from '../../utils/format';
import { useCurrency } from '../../lib/CurrencyContext';
import { useViewMode } from '../../hooks/useViewMode';
import { useAcquisitionCPM } from '../../hooks/useAcquisitionCPM';
import {
  Download,
  Upload,
  Wallet,
  Coins,
  PiggyBank,
  Target,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Tooltip } from '../Tooltip';
import { SharedLedger } from '../SharedLedger';
import { TransactionLedger } from '../TransactionLedger';

// Subcomponents
import { noSpinnerClass } from './helpers';
import { CpmSparkline, RoiBar, SourceEfficiencyCard, KPICard } from './components';
import { SimpleMilesEngine } from './SimpleMilesEngine';

interface MilesEngineProps {
  data: MilesRecord[];
  onUpdate: (data: MilesRecord[]) => void;
  currentMonth: string;
  onUpdateCurrentMonth: (month: string) => void;
  targetCPM: number;
  onUpdateTargetCPM: (val: number) => void;
  redemptions: RedemptionRecord[];
  // New transaction system props
  activityTransactions?: ActivityTransaction[];
  useNewTransactions?: boolean;
  onUpdateTransactionCost?: (transactionId: string, cost: number | null) => Promise<boolean>;
  onDeleteTransaction?: (transactionId: string) => Promise<boolean>;
  // Flights for TransactionLedger monthly totals
  flights?: FlightRecord[];
}

export const MilesEngine: React.FC<MilesEngineProps> = ({
  data,
  onUpdate,
  currentMonth,
  onUpdateCurrentMonth,
  targetCPM,
  onUpdateTargetCPM,
  redemptions,
  activityTransactions,
  useNewTransactions,
  onUpdateTransactionCost,
  onDeleteTransaction,
  flights,
}) => {
  const { isSimpleMode } = useViewMode();
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();
  const safeTargetCPM = Number.isFinite(targetCPM) ? targetCPM : 0;

  // Calculate user's personal acquisition CPM
  const acquisitionCPM = useAcquisitionCPM({
    activityTransactions,
    flights,
    legacyMilesData: data,
    useNewTransactions,
  });

  // Local formatting helper
  const formatCPM = (cpm: number) => `${currencySymbol}${cpm.toFixed(4)}`;
  
  // Valuation guide collapsed state - persisted in localStorage
  const [valuationGuideExpanded, setValuationGuideExpanded] = useState(() => {
    const stored = localStorage.getItem('skystatus_valuation_guide_expanded');
    return stored === 'true'; // Default collapsed (false)
  });
  
  const toggleValuationGuide = () => {
    const newValue = !valuationGuideExpanded;
    setValuationGuideExpanded(newValue);
    localStorage.setItem('skystatus_valuation_guide_expanded', String(newValue));
  };

  const stats = useMemo(
    () => calculateMilesStats(data, currentMonth, redemptions, safeTargetCPM, flights),
    [data, currentMonth, redemptions, safeTargetCPM, flights]
  );

  // Value Created calculation - split into realized (redemptions) and unrealized (current portfolio)
  const valueCreated = useMemo(() => {
    // Get the right values based on new vs legacy system
    const totalInvestment = acquisitionCPM.hasData && useNewTransactions 
      ? acquisitionCPM.totalCost 
      : stats.totalCost;
    
    const currentBalance = stats.netCurrent; // Current miles balance after redemptions
    
    // Realized value: sum of all redemption values (cash equivalent)
    const realizedValue = redemptions.reduce((sum, r) => sum + (r.cash_price_estimate || 0), 0);
    
    // Unrealized value: current balance at target CPM
    const unrealizedValue = currentBalance * safeTargetCPM;
    
    // Total portfolio value (realized + unrealized)
    const totalValue = realizedValue + unrealizedValue;
    
    // Total gain = total value - investment
    const totalGain = totalValue - totalInvestment;
    
    // Percentages
    const realizedPercent = totalValue > 0 ? (realizedValue / totalValue) * 100 : 0;
    const unrealizedPercent = totalValue > 0 ? (unrealizedValue / totalValue) * 100 : 0;
    
    console.log('[MilesEngine] valueCreated calculation:', {
      totalInvestment,
      currentBalance,
      realizedValue,
      unrealizedValue,
      totalValue,
      totalGain,
    });
    
    return {
      totalGain,
      realizedValue,
      unrealizedValue,
      totalValue,
      totalInvestment,
      realizedPercent,
      unrealizedPercent,
    };
  }, [acquisitionCPM, useNewTransactions, stats.totalCost, stats.netCurrent, redemptions, safeTargetCPM]);

  const sourcePerformance = useMemo(() => {
    const totals = data.reduce(
      (acc, r) => {
        acc.subscription.miles += r.miles_subscription;
        acc.subscription.cost += r.cost_subscription;
        acc.amex.miles += r.miles_amex;
        acc.amex.cost += r.cost_amex;
        acc.flights.miles += r.miles_flight;
        acc.flights.cost += r.cost_flight;
        acc.other.miles += r.miles_other;
        acc.other.cost += r.cost_other;
        return acc;
      },
      {
        subscription: { miles: 0, cost: 0 },
        amex: { miles: 0, cost: 0 },
        flights: { miles: 0, cost: 0 },
        other: { miles: 0, cost: 0 },
      }
    );

    return [
      { key: 'subscription', label: 'Subscription', ...totals.subscription },
      { key: 'amex', label: 'Amex / Cards', ...totals.amex },
      { key: 'flights', label: 'Flying', ...totals.flights },
      { key: 'other', label: 'Other', ...totals.other },
    ].map((item) => ({
      ...item,
      cpm: item.miles > 0 ? item.cost / item.miles : 0,
    }));
  }, [data]);

  const chartData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    // Pre-calculate actual vs projected flight miles per month
    const flightMilesByMonth = new Map<string, { actual: number; projected: number }>();
    (flights ?? []).forEach((f) => {
      const month = f.date?.slice(0, 7);
      if (!month) return;
      const miles = f.earnedMiles || 0;
      const isFlown = f.date < today; // Flight is in the past = actual
      
      const existing = flightMilesByMonth.get(month) || { actual: 0, projected: 0 };
      if (isFlown) {
        existing.actual += miles;
      } else {
        existing.projected += miles;
      }
      flightMilesByMonth.set(month, existing);
    });
    
    let runningBalance = 0;
    return data
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => {
        // Non-flight miles: use month-based logic (future month = projected)
        const isMonthProjected = r.month > currentMonth;
        const nonFlightEarned = r.miles_subscription + r.miles_amex + r.miles_other;
        
        // Flight miles: use actual flight date logic
        const flightData = flightMilesByMonth.get(r.month) || { actual: 0, projected: 0 };
        
        // Total earned for this month
        const totalEarned = nonFlightEarned + flightData.actual + flightData.projected;
        
        // Split into actual vs projected
        const earnedActual = isMonthProjected ? 0 : (nonFlightEarned + flightData.actual);
        const earnedProjected = (isMonthProjected ? nonFlightEarned : 0) + flightData.projected;
        
        const totalCost =
          r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other;
        const cpm = totalEarned > 0 ? totalCost / totalEarned : 0;
        runningBalance += totalEarned - r.miles_debit;
        return {
          month: r.month,
          isProjected: isMonthProjected,
          earnedActual,
          earnedProjected,
          redeemed: r.miles_debit,
          cpmActual: r.month <= currentMonth ? cpm : null,
          cpmProjected: r.month >= currentMonth ? cpm : null,
          runningBalance,
        };
      });
  }, [data, currentMonth, flights]);

  const handleAddRow = () => {
    const newRecord: MilesRecord = {
      id: generateId(),
      month: new Date().toISOString().slice(0, 7),
      miles_subscription: 0,
      miles_amex: 0,
      miles_flight: 0,
      miles_other: 0,
      miles_debit: 0,
      cost_subscription: 0,
      cost_amex: 0,
      cost_flight: 0,
      cost_other: 0,
    };
    onUpdate([...data, newRecord]);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'miles_ledger.json';
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          if (Array.isArray(json)) onUpdate(json);
        } catch {
          alert('Invalid JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const progressPercent =
    stats.netProjected > 0 ? (stats.netCurrent / stats.netProjected) * 100 : 0;
  const projectedValue = stats.netProjected * targetCPM;
  const chartValue = stats.totalBurnValue > 0 ? stats.totalBurnValue : projectedValue;
  const acquisitionCostEuro = stats.globalCPM / 100;

  // Simple Mode: render simplified miles engine
  if (isSimpleMode) {
    return (
      <SimpleMilesEngine
        data={data}
        onUpdate={onUpdate}
        currentMonth={currentMonth}
        redemptions={redemptions}
        targetCPM={targetCPM}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Miles Engine
          </h2>
          <p className="text-slate-500 mt-0.5 text-sm font-medium">
            Financial backbone of your loyalty portfolio
          </p>
        </div>
        {/* Controls - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex flex-col shadow-sm">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
              Current Ledger
            </label>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => onUpdateCurrentMonth(e.target.value)}
              className="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl px-3 py-2 flex flex-col shadow-sm w-36 group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide flex items-center gap-1">
                <Sparkles size={10} />
                Target CPM
              </label>
              <Tooltip text="How much is a mile worth to you? This affects all value calculations. Scroll down to 'How do you value a mile?' for presets and guidance." />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-indigo-400 font-medium">{currencySymbol}</span>
              <input
                type="number"
                step="0.001"
                value={targetCPM}
                onChange={(e) => onUpdateTargetCPM(parseFloat(e.target.value))}
                className={`text-sm font-bold text-indigo-700 outline-none bg-transparent w-full ${noSpinnerClass}`}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <label className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-all">
              <Upload size={16} />
              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleImport}
              />
            </label>
            <button
              onClick={handleExport}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Card */}
        <div className="lg:col-span-2 bg-white rounded-[1.5rem] p-6 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col justify-between relative group z-0 hover:z-10">
          <div className="absolute inset-0 rounded-[1.5rem] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-100/40 rounded-full blur-[80px] -mr-24 -mt-24 opacity-80" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-50/60 rounded-full blur-[60px] -ml-16 -mb-16 opacity-60" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white shadow-sm rounded-xl text-blue-600 border border-blue-50">
                <Wallet size={20} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-extrabold text-blue-900/60 uppercase tracking-widest">
                Flying Blue Portfolio
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-5xl font-black tracking-tighter text-blue-900">
                {formatNumber(stats.netCurrent)}
              </h3>
              <span className="text-base font-bold text-blue-900/40">Miles</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                <span>Current</span>
                <span>Projected: {formatNumber(stats.netProjected)}</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-md transition-all duration-1000"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="relative z-10 pt-4 mt-3 border-t border-slate-100/50 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                  Projected Value
                </p>
                <Tooltip text="Theoretical value of your projected miles balance, calculated at your Target CPM." />
              </div>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(projectedValue)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-0.5">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                  Total Investment
                </p>
                <Tooltip text="Total cash actually spent on subscriptions, fees and surcharges." />
              </div>
              <p className="text-lg font-bold text-slate-800 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100 inline-block">
                {formatCurrency(stats.totalCost)}
              </p>
            </div>
          </div>
        </div>

        {/* CPM Card */}
        <KPICard
          title="Acquisition Cost"
          value={formatCPM(acquisitionCostEuro)}
          subtitle="Average CPM (All time)"
          icon={Coins}
          color="emerald"
          tooltip="Weighted average cost of every mile you've accumulated. Lower is better."
        >
          <CpmSparkline data={chartData} currentMonth={currentMonth} />
          <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400 mt-1">
            <span>12 Month Trend</span>
            <span
              className={
                stats.cpmProjected < stats.cpmCurrent
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }
            >
              {stats.cpmProjected < stats.cpmCurrent ? '↓ Improving' : 'Stable'}
            </span>
          </div>
        </KPICard>

        {/* Value Created Card */}
        <KPICard
          title="Value Created"
          value={
            <span
              className={
                valueCreated.totalGain >= 0 ? 'text-emerald-600' : 'text-red-500'
              }
            >
              {valueCreated.totalGain >= 0 ? '+' : ''}
              {formatCurrency(valueCreated.totalGain)}
            </span>
          }
          subtitle="total gain"
          icon={PiggyBank}
          color="violet"
          tooltip="Total value created from your miles portfolio. Realized = value from redemptions. Unrealized = current balance at target CPM."
        >
          {/* Realized vs Unrealized breakdown */}
          <div className="space-y-1.5 mt-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-emerald-600 font-semibold">Realized</span>
              <span className="font-bold text-slate-700">{formatCurrency(valueCreated.realizedValue)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-blue-500 font-semibold">Unrealized</span>
              <span className="font-bold text-slate-700">{formatCurrency(valueCreated.unrealizedValue)}</span>
            </div>
            {/* Stacked progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              {valueCreated.realizedPercent > 0 && (
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${valueCreated.realizedPercent}%` }}
                />
              )}
              {valueCreated.unrealizedPercent > 0 && (
                <div 
                  className="h-full bg-blue-400" 
                  style={{ width: `${valueCreated.unrealizedPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400">
              <span>Investment: {formatCurrency(valueCreated.totalInvestment)}</span>
            </div>
          </div>
        </KPICard>
      </div>

      {/* Miles Valuation Settings - Collapsible */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[1.5rem] border border-indigo-100 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-2xl -mr-16 -mt-16" />
        
        {/* Collapsible Header - Always visible */}
        <button
          onClick={toggleValuationGuide}
          className="relative w-full p-5 flex items-center justify-between text-left hover:bg-indigo-100/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white shadow-sm rounded-xl text-indigo-600 border border-indigo-100">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">How do you value a mile?</h3>
              <p className="text-[10px] text-indigo-600 font-medium">
                {valuationGuideExpanded ? 'Click to collapse' : `Current: ${currencySymbol}${targetCPM.toFixed(3)} per mile`}
              </p>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-indigo-400 transition-transform duration-200 ${valuationGuideExpanded ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {/* Expandable Content */}
        {valuationGuideExpanded && (
          <div className="relative px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-indigo-100/50">
              <div className="flex-1">
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Your target CPM (cost per mile) determines how SkyStatus calculates the value of your portfolio. 
                  Set this to the redemption rate you typically aim for when booking award flights.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Quick presets */}
                <div className="hidden sm:flex items-center gap-1">
                  {[
                    { value: 0.008, label: 'Conservative', color: 'text-slate-500' },
                    { value: 0.012, label: 'Average', color: 'text-blue-600' },
                    { value: 0.018, label: 'Aspirational', color: 'text-indigo-600' },
                  ].map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => onUpdateTargetCPM(preset.value)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        Math.abs(targetCPM - preset.value) < 0.001
                          ? 'bg-white shadow-sm border border-indigo-200 text-indigo-700'
                          : 'bg-white/50 hover:bg-white text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {preset.label}
                      <span className="block text-[9px] font-medium opacity-70">{currencySymbol}{preset.value.toFixed(3)}</span>
                    </button>
                  ))}
                  
                  {/* Personal CPM button - only show if user has data */}
                  {acquisitionCPM.hasData && (
                    <button
                      onClick={() => onUpdateTargetCPM(acquisitionCPM.cpm)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center ${
                        Math.abs(targetCPM - acquisitionCPM.cpm) < 0.0001
                          ? 'bg-emerald-50 shadow-sm border border-emerald-300 text-emerald-700'
                          : 'bg-white/50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-transparent hover:border-emerald-200'
                      }`}
                      title={`Based on ${acquisitionCPM.transactionsWithCost} transactions (${acquisitionCPM.coverage.toFixed(0)}% coverage)`}
                    >
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        My CPM
                      </span>
                      <span className="block text-[9px] font-medium opacity-70">{currencySymbol}{acquisitionCPM.cpm.toFixed(4)}</span>
                    </button>
                  )}
                </div>
                
                {/* Custom input */}
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-indigo-100 min-w-[120px]">
                  <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide block mb-1">
                    Target CPM
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-indigo-400 font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={targetCPM}
                      onChange={(e) => onUpdateTargetCPM(parseFloat(e.target.value) || 0.012)}
                      className={`text-lg font-black text-indigo-700 outline-none bg-transparent w-20 ${noSpinnerClass}`}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expandable explanation */}
            <details className="mt-4 group">
              <summary className="text-xs font-medium text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors flex items-center gap-1.5">
                <HelpCircle size={14} />
                What's a good target CPM?
                <ChevronDown size={14} className="transition-transform group-open:rotate-180 ml-auto" />
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-white/70 rounded-lg p-3 border border-slate-200/50 hover:border-slate-300 transition-colors">
                  <div className="font-bold text-slate-700 mb-1">{currencySymbol}0.006 - {currencySymbol}0.010</div>
                  <div className="text-slate-500">Conservative. Easy to achieve on most economy redemptions within Europe.</div>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-blue-200/50 hover:border-blue-300 transition-colors">
                  <div className="font-bold text-blue-700 mb-1">{currencySymbol}0.012 - {currencySymbol}0.015</div>
                  <div className="text-slate-500">Average. Typical for business class on medium-haul or good economy deals on long-haul.</div>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-indigo-200/50 hover:border-indigo-300 transition-colors">
                  <div className="font-bold text-indigo-700 mb-1">{currencySymbol}0.018+</div>
                  <div className="text-slate-500">Aspirational. Achievable on premium cabin long-haul or La Première. Requires strategic booking.</div>
                </div>
                {acquisitionCPM.hasData && (
                  <div className="bg-emerald-50/70 rounded-lg p-3 border border-emerald-200/50 hover:border-emerald-300 transition-colors">
                    <div className="font-bold text-emerald-700 mb-1 flex items-center gap-1">
                      <User size={12} />
                      {currencySymbol}{acquisitionCPM.cpm.toFixed(4)}
                    </div>
                    <div className="text-slate-500">
                      Your personal CPM based on {currencySymbol}{acquisitionCPM.totalCost.toFixed(2)} spent on {formatNumber(acquisitionCPM.totalMilesEarned)} miles.
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Charts & Source Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Monthly Flow Chart */}
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                Monthly Flow
                <Tooltip text="Inflow (Earned) vs Outflow (Burned) of miles per month." />
              </h3>
              <div className="flex gap-3 text-[10px] font-medium">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" /> Earned (Act)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-200 rounded-full" /> Earned (Proj)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full" /> Burned
                </span>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="earnedActual"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="earnedProjected"
                    stackId="a"
                    fill="#bfdbfe"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="redeemed" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CPM Trend Chart */}
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              Cost Efficiency Trend (CPM)
              <Tooltip text="Are your miles getting cheaper or more expensive to acquire over time?" />
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => `${currencySymbol}${v.toFixed(3)}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(val: number) => formatCPM(val)}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpmActual"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0f172a' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="cpmProjected"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#94a3b8' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Source Efficiency */}
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Source Efficiency</h3>
              <Tooltip text="Breakdown of CPM per source. Green = below target. Full bar = 100% efficient." />
            </div>
            <div className="space-y-2">
              {sourcePerformance.map((source) => (
                <SourceEfficiencyCard
                  key={source.key}
                  source={source}
                  targetCPM={safeTargetCPM}
                />
              ))}
            </div>
          </div>

          {/* ROI & Leverage */}
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-slate-800 text-sm">ROI & Leverage</h3>
              <Tooltip text="Efficiency Multiplier. How many Euros of value you get for every Euro spent." />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Portfolio Leverage
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600">
                    {stats.roiMultiplier.toFixed(1)}x
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    multiplier
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  For every{' '}
                  <span className="font-bold text-slate-600">{currencySymbol}1</span> spent, you
                  realize{' '}
                  <span className="font-bold text-slate-600">
                    {currencySymbol}{stats.roiMultiplier.toFixed(2)}
                  </span>{' '}
                  in value.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Total Value Created
                </p>
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(stats.totalBurnValue)}
                </span>
                {stats.redeemedMiles > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    from {formatNumber(stats.redeemedMiles)} redeemed miles
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Ledger - Show new or legacy based on user migration status */}
      {useNewTransactions && activityTransactions && onUpdateTransactionCost ? (
        <TransactionLedger
          transactions={activityTransactions}
          flights={flights}
          onUpdateCost={onUpdateTransactionCost}
          onDeleteTransaction={onDeleteTransaction}
          title="Transaction Ledger"
          showMissingCostFilter={true}
        />
      ) : (
        <SharedLedger
          data={data}
          onUpdate={onUpdate}
          currentMonth={currentMonth}
          variant="full"
          showQuickStats={true}
          showAddButton={true}
          onAddMonth={handleAddRow}
          title="Transaction Ledger"
        />
      )}
    </div>
  );
};
