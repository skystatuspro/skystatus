import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Plus, 
  Trash2, 
  MapPin, 
  ArrowRight, 
  TrendingUp, 
  Target, 
  Trophy,
  Euro,
  Award,
  Plane,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Wallet,
  Zap,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { RedemptionRecord } from '../types';
import { calculateBurnStats } from '../utils/loyalty-logic';
import { formatCurrency, formatNumber, generateId } from '../utils/format';
import { getValuationStatus } from '../utils/valuation';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Tooltip } from './Tooltip'; 

interface RedemptionCalcProps {
  redemptions: RedemptionRecord[];
  onUpdate: (data: RedemptionRecord[]) => void;
  baselineCpm: number; 
  targetCpm: number;
}

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

type SortField = 'date' | 'award_miles' | 'cpm' | 'value';
type SortDirection = 'asc' | 'desc';
type VerdictFilter = 'all' | 'profitable' | 'loss';

// --- Helper Components ---

const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue', tooltip, highlight = false }: any) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  const css = colors[color] || colors.slate;

  return (
    <div className={`bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all z-0 hover:z-10 relative ${highlight ? 'ring-2 ring-indigo-100' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
            {tooltip && <Tooltip text={tooltip} />}
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl ${css}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`text-xs font-medium ${subtitle?.includes('+') ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{subtitle}</p>
    </div>
  );
};

const StatBadge = ({ icon: Icon, label, value, color = 'slate' }: any) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${colors[color]}`}>
      <Icon size={12} />
      <span className="text-slate-500">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
};

export const RedemptionCalc: React.FC<RedemptionCalcProps> = ({ redemptions, onUpdate, baselineCpm, targetCpm }) => {
  const [form, setForm] = useState<Partial<RedemptionRecord>>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    award_miles: 0,
    cash_price_estimate: 0,
    surcharges: 0,
  });

  // Sorting & Filtering state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RedemptionRecord>>({});

  // Calculate stats using the logic engine
  const stats = useMemo(() => 
    calculateBurnStats(redemptions, targetCpm, baselineCpm, 0), 
    [redemptions, baselineCpm, targetCpm]
  );

  const baselineEuro = baselineCpm / 100;
  const avgRedemptionEuro = stats.lifetime.avgBurnCpm / 100;
  const performanceDelta = avgRedemptionEuro - baselineEuro;

  // Enhanced stats calculations
  const enhancedStats = useMemo(() => {
    if (stats.processed.length === 0) {
      return {
        totalValue: 0,
        totalMilesUsed: 0,
        totalSurcharges: 0,
        roiMultiplier: 0,
        bestRedemption: null,
        worstRedemption: null,
        profitableCount: 0,
        lossCount: 0,
        valueOverTime: [],
      };
    }

    const totalValue = stats.processed.reduce((sum, r) => sum + r.value, 0);
    const totalMilesUsed = stats.processed.reduce((sum, r) => sum + r.award_miles, 0);
    const totalSurcharges = stats.processed.reduce((sum, r) => sum + r.surcharges, 0);
    const theoreticalCost = totalMilesUsed * baselineEuro;
    const roiMultiplier = theoreticalCost > 0 ? totalValue / theoreticalCost : 0;

    const sorted = [...stats.processed].sort((a, b) => b.cpm - a.cpm);
    const bestRedemption = sorted[0];
    const worstRedemption = sorted[sorted.length - 1];

    const profitableCount = stats.processed.filter(r => (r.cpm / 100) >= baselineEuro).length;
    const lossCount = stats.processed.length - profitableCount;

    // Value over time for sparkline
    const valueOverTime = [...stats.processed]
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce((acc: { date: string; cumValue: number }[], r) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].cumValue : 0;
        acc.push({ date: r.date, cumValue: prev + r.value });
        return acc;
      }, []);

    return {
      totalValue,
      totalMilesUsed,
      totalSurcharges,
      roiMultiplier,
      bestRedemption,
      worstRedemption,
      profitableCount,
      lossCount,
      valueOverTime,
    };
  }, [stats.processed, baselineEuro]);

  // Sorted and filtered data
  const displayData = useMemo(() => {
    let data = [...stats.processed];

    // Filter
    if (verdictFilter === 'profitable') {
      data = data.filter(r => (r.cpm / 100) >= baselineEuro);
    } else if (verdictFilter === 'loss') {
      data = data.filter(r => (r.cpm / 100) < baselineEuro);
    }

    // Sort
    data.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'date':
          return sortDirection === 'desc' 
            ? b.date.localeCompare(a.date) 
            : a.date.localeCompare(b.date);
        case 'award_miles':
          aVal = a.award_miles;
          bVal = b.award_miles;
          break;
        case 'cpm':
          aVal = a.cpm;
          bVal = b.cpm;
          break;
        case 'value':
          aVal = a.value;
          bVal = b.value;
          break;
        default:
          return 0;
      }
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [stats.processed, sortField, sortDirection, verdictFilter, baselineEuro]);

  // Add Handler
  const handleAdd = () => {
    if (!form.description || !form.award_miles) return;
    
    const newRecord: RedemptionRecord = {
      id: generateId(),
      date: form.date || new Date().toISOString().slice(0, 10),
      description: form.description,
      award_miles: Number(form.award_miles),
      cash_price_estimate: Number(form.cash_price_estimate),
      surcharges: Number(form.surcharges),
      override_cpm: undefined
    };

    onUpdate([newRecord, ...redemptions]);
    setForm({ date: new Date().toISOString().slice(0, 10), description: '', award_miles: 0, cash_price_estimate: 0, surcharges: 0 });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Edit handlers
  const startEdit = (record: RedemptionRecord) => {
    setEditingId(record.id);
    setEditForm({
      date: record.date,
      description: record.description,
      award_miles: record.award_miles,
      cash_price_estimate: record.cash_price_estimate,
      surcharges: record.surcharges,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    onUpdate(redemptions.map(r => 
      r.id === editingId 
        ? { 
            ...r, 
            date: editForm.date || r.date,
            description: editForm.description || r.description,
            award_miles: Number(editForm.award_miles) || r.award_miles,
            cash_price_estimate: Number(editForm.cash_price_estimate) || 0,
            surcharges: Number(editForm.surcharges) || 0,
          } 
        : r
    ));
    setEditingId(null);
    setEditForm({});
  };

  // Preview Logic for Form
  const previewStats = useMemo(() => {
    const miles = Number(form.award_miles) || 0;
    const cash = Number(form.cash_price_estimate) || 0;
    const fees = Number(form.surcharges) || 0;
    
    if (miles <= 0) return null;
    
    const netValue = cash - fees;
    const euroPerMile = netValue / miles; 
    const valuation = getValuationStatus(euroPerMile, targetCpm, baselineEuro);
    
    return { euroPerMile, valuation, netValue };
  }, [form, baselineEuro, targetCpm]);

  // Recent routes for suggestions
  const recentRoutes = useMemo(() => {
    return [...new Set(redemptions.map(r => r.description))].slice(0, 3);
  }, [redemptions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header with Quick Stats */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-wide border border-orange-100 flex items-center gap-1.5">
                <Flame size={12} fill="currentColor" /> Burn Optimizer
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Redemption Analyzer</h2>
            <p className="text-slate-500 font-medium mt-1">Track value of spent miles vs your acquisition cost.</p>
          </div>
          
          {/* Quick Stats */}
          {stats.processed.length > 0 && (
            <div className="flex flex-wrap gap-2 items-start">
              <StatBadge icon={Plane} label="Redemptions" value={stats.processed.length} color="indigo" />
              <StatBadge 
                icon={Trophy} 
                label="Best" 
                value={enhancedStats.bestRedemption ? `€${(enhancedStats.bestRedemption.cpm / 100).toFixed(4)}` : '-'} 
                color="emerald" 
              />
              <StatBadge 
                icon={TrendingUp} 
                label="ROI" 
                value={`${enhancedStats.roiMultiplier.toFixed(1)}x`} 
                color={enhancedStats.roiMultiplier >= 1 ? 'emerald' : 'amber'} 
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid - Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Value Created"
          value={formatCurrency(enhancedStats.totalValue)}
          subtitle={`${formatNumber(enhancedStats.totalMilesUsed)} miles redeemed`}
          icon={Award}
          color="indigo"
          tooltip="Sum of (Cash Price - Surcharges) for all redemptions."
          highlight={true}
        />
        <MetricCard 
          title="Baseline (CPM)"
          value={`€${baselineEuro.toFixed(4)}`}
          subtitle="Your acquisition cost"
          icon={Target}
          color="slate"
          tooltip="Your average cost per mile from Miles Engine. Redemptions below this lose money."
        />
        <MetricCard 
          title="Avg. Redemption"
          value={`€${avgRedemptionEuro.toFixed(4)}`}
          subtitle={`${performanceDelta >= 0 ? '+' : ''}€${performanceDelta.toFixed(4)} vs baseline`}
          icon={TrendingUp}
          color={performanceDelta >= 0 ? 'emerald' : 'amber'}
          tooltip="Average value realized per mile across all redemptions."
        />
        <MetricCard 
          title="ROI Multiplier"
          value={`${enhancedStats.roiMultiplier.toFixed(1)}x`}
          subtitle={enhancedStats.roiMultiplier >= 1 ? 'Profitable overall' : 'Below break-even'}
          icon={Zap}
          color={enhancedStats.roiMultiplier >= 1 ? 'emerald' : 'amber'}
          tooltip="Total Value / (Miles × Baseline CPM). Above 1x = profit."
        />
      </div>

      {/* Performance Range Card */}
      {stats.processed.length > 0 && (
        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-800">Performance Range</h3>
              <Tooltip text="The spread between your best and worst redemptions." />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Profitable ({enhancedStats.profitableCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-slate-500">Loss ({enhancedStats.lossCount})</span>
              </div>
            </div>
          </div>
          
          {/* Visual Range Bar */}
          <div className="relative h-12 bg-slate-100 rounded-xl overflow-hidden">
            {/* Baseline marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
              style={{ 
                left: `${Math.min(95, Math.max(5, (baselineEuro / ((enhancedStats.bestRedemption?.cpm || 1) / 100)) * 100))}%` 
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 whitespace-nowrap">
                Baseline
              </div>
            </div>
            
            {/* Redemption dots */}
            {stats.processed.map((r, i) => {
              const maxCpm = (enhancedStats.bestRedemption?.cpm || 1) / 100;
              const position = Math.min(95, Math.max(5, ((r.cpm / 100) / maxCpm) * 100));
              const isProfitable = (r.cpm / 100) >= baselineEuro;
              
              return (
                <div
                  key={r.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform ${
                    isProfitable ? 'bg-emerald-500' : 'bg-red-400'
                  }`}
                  style={{ left: `${position}%` }}
                  title={`${r.description}: €${(r.cpm / 100).toFixed(4)}`}
                />
              );
            })}
          </div>
          
          <div className="flex justify-between mt-3">
            <div>
              <div className="text-[10px] font-bold text-red-500 uppercase">Worst</div>
              <div className="text-lg font-black text-slate-800">
                €{((enhancedStats.worstRedemption?.cpm || 0) / 100).toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {enhancedStats.worstRedemption?.description || '-'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-emerald-500 uppercase">Best</div>
              <div className="text-lg font-black text-slate-800">
                €{((enhancedStats.bestRedemption?.cpm || 0) / 100).toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {enhancedStats.bestRedemption?.description || '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
        {/* Left: Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 sticky top-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Plus size={16} className="text-slate-400" />
                  New Redemption
                </h3>
              </div>

              {/* Date Field */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Calendar size={10} /> Date
                </label>
                <input 
                  type="date" 
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                />
              </div>
              
              {/* Description with suggestions */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. AMS-JFK Business Class"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                />
                {/* Quick suggestions */}
                {recentRoutes.length > 0 && !form.description && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recentRoutes.map((route, i) => (
                      <button
                        key={i}
                        onClick={() => setForm({...form, description: route})}
                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                      >
                        {route}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <MapPin size={10}/> Miles Used
                  </label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={form.award_miles || ''} 
                    onChange={e => setForm({...form, award_miles: Number(e.target.value)})} 
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all ${noSpinnerClass}`} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Euro size={10}/> Surcharges
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={form.surcharges || ''} 
                      onChange={e => setForm({...form, surcharges: Number(e.target.value)})} 
                      className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all pr-8 ${noSpinnerClass}`} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Target size={10}/> Cash Price Equivalent
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={form.cash_price_estimate || ''} 
                    onChange={e => setForm({...form, cash_price_estimate: Number(e.target.value)})} 
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all pr-8 ${noSpinnerClass}`} 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">What would this ticket cost in cash?</p>
              </div>

              {/* Live Preview Panel */}
              {previewStats && (
                <div className={`rounded-xl p-4 border transition-all duration-300 ${
                  previewStats.valuation.label === 'Legendary' ? 'bg-violet-50 border-violet-200' :
                  previewStats.valuation.label === 'Excellent' ? 'bg-emerald-50 border-emerald-200' :
                  previewStats.valuation.label === 'Good' ? 'bg-blue-50 border-blue-200' :
                  previewStats.valuation.label === 'Fair' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Projected Value</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">
                          €{previewStats.euroPerMile.toFixed(4)}
                        </span>
                        <span className="text-xs text-slate-500">per mile</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${previewStats.valuation.color}`}>
                        {previewStats.valuation.icon && <previewStats.valuation.icon size={12} />} 
                        {previewStats.valuation.label}
                      </div>
                    </div>
                  </div>
                  
                  {/* Comparison to baseline */}
                  <div className="mt-3 pt-3 border-t border-slate-200/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">vs Baseline ({`€${baselineEuro.toFixed(4)}`})</span>
                      <span className={`font-bold ${previewStats.euroPerMile >= baselineEuro ? 'text-emerald-600' : 'text-red-500'}`}>
                        {previewStats.euroPerMile >= baselineEuro ? '+' : ''}
                        {((previewStats.euroPerMile - baselineEuro) / baselineEuro * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleAdd}
                disabled={!form.description || !form.award_miles}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Add Redemption
              </button>
            </div>
          </div>

          {/* Value Over Time Sparkline */}
          {enhancedStats.valueOverTime.length > 1 && (
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-indigo-500" />
                <h3 className="font-bold text-slate-800 text-sm">Cumulative Value</h3>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enhancedStats.valueOverTime}>
                    <defs>
                      <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="cumValue" 
                      stroke="#6366f1" 
                      strokeWidth={2} 
                      fill="url(#valueGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{enhancedStats.valueOverTime[0]?.date}</span>
                <span className="font-bold text-indigo-600">{formatCurrency(enhancedStats.totalValue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Visualization & List */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Value Map Chart */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  Value Map
                  <Tooltip text="Scatter plot of all redemptions. Dots above the dashed line are profitable." />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Higher dots = better value per mile</p>
              </div>
              <div className="flex gap-3 text-[10px] font-medium">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Above baseline
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Below baseline
                </span>
              </div>
            </div>
            
            <div className="h-72 w-full">
              {stats.processed.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      type="number" 
                      dataKey="award_miles" 
                      name="Miles" 
                      tick={{fontSize: 10, fill: '#94a3b8'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="value" 
                      name="Value" 
                      tick={{fontSize: 10, fill: '#94a3b8'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `€${v}`}
                    />
                    <RechartsTooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs">
                              <p className="font-bold mb-1">{data.description}</p>
                              <p>Miles: {formatNumber(data.award_miles)}</p>
                              <p>Value: {formatCurrency(data.value)}</p>
                              <p className="text-emerald-400 font-bold">€{(data.cpm / 100).toFixed(4)}/mi</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Break-even line */}
                    <ReferenceLine 
                      segment={[{ x: 0, y: 0 }, { x: Math.max(...stats.processed.map(r => r.award_miles)) * 1.1, y: Math.max(...stats.processed.map(r => r.award_miles)) * 1.1 * baselineEuro }]} 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5" 
                      strokeWidth={2}
                    />
                    {/* Target line */}
                    <ReferenceLine 
                      segment={[{ x: 0, y: 0 }, { x: Math.max(...stats.processed.map(r => r.award_miles)) * 1.1, y: Math.max(...stats.processed.map(r => r.award_miles)) * 1.1 * targetCpm }]} 
                      stroke="#f59e0b" 
                      strokeDasharray="3 3" 
                      strokeOpacity={0.5}
                    />
                    <Scatter name="Redemptions" data={stats.processed}>
                      {stats.processed.map((entry, index) => {
                        const isProfitable = (entry.cpm / 100) >= baselineEuro;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isProfitable ? '#10b981' : '#f87171'} 
                            r={8}
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Plane size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Add redemptions to see the value map</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Redemption List */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Wallet size={18} className="text-slate-400" />
                Redemption Log
                {stats.processed.length > 0 && (
                  <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {displayData.length} of {stats.processed.length}
                  </span>
                )}
              </h3>
              
              {/* Filter & Sort Controls */}
              {stats.processed.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={verdictFilter}
                    onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All</option>
                    <option value="profitable">Profitable</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Description</th>
                    <th 
                      className="px-5 py-3 text-right cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('award_miles')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Miles
                        {sortField === 'award_miles' && <ArrowUpDown size={10} />}
                      </span>
                    </th>
                    <th 
                      className="px-5 py-3 text-right cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('value')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Value
                        {sortField === 'value' && <ArrowUpDown size={10} />}
                      </span>
                    </th>
                    <th 
                      className="px-5 py-3 text-right cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('cpm')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        CPM
                        {sortField === 'cpm' && <ArrowUpDown size={10} />}
                      </span>
                    </th>
                    <th className="px-5 py-3">Verdict</th>
                    <th className="px-5 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayData.map((r) => {
                    const euroCpm = r.cpm / 100;
                    const delta = euroCpm - baselineEuro;
                    const valuation = getValuationStatus(euroCpm, targetCpm, baselineEuro);
                    const deltaPercent = baselineEuro > 0 ? (delta / baselineEuro) * 100 : 0;
                    const isEditing = editingId === r.id;
                    
                    // Find original record for editing
                    const originalRecord = redemptions.find(x => x.id === r.id);

                    if (isEditing && originalRecord) {
                      return (
                        <tr key={r.id} className="bg-blue-50/50">
                          <td className="px-5 py-3">
                            <input
                              type="text"
                              value={editForm.description || ''}
                              onChange={e => setEditForm({...editForm, description: e.target.value})}
                              className={`w-full p-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${noSpinnerClass}`}
                              placeholder="Description"
                            />
                            <input
                              type="date"
                              value={editForm.date || ''}
                              onChange={e => setEditForm({...editForm, date: e.target.value})}
                              className={`w-full mt-1 p-1 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${noSpinnerClass}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={editForm.award_miles || ''}
                              onChange={e => setEditForm({...editForm, award_miles: Number(e.target.value)})}
                              className={`w-full p-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${noSpinnerClass}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={editForm.cash_price_estimate || ''}
                              onChange={e => setEditForm({...editForm, cash_price_estimate: Number(e.target.value)})}
                              className={`w-full p-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${noSpinnerClass}`}
                              placeholder="Cash value"
                              step="0.01"
                            />
                            <input
                              type="number"
                              value={editForm.surcharges || ''}
                              onChange={e => setEditForm({...editForm, surcharges: Number(e.target.value)})}
                              className={`w-full mt-1 p-1 border border-slate-200 rounded text-[10px] text-right focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${noSpinnerClass}`}
                              placeholder="Surcharges"
                              step="0.01"
                            />
                          </td>
                          <td className="px-5 py-3 text-center text-slate-400 text-xs">—</td>
                          <td className="px-5 py-3 text-center text-slate-400 text-xs">—</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={saveEdit}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                              >
                                <Save size={12} />
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-800">{r.description}</div>
                          <div className="text-[10px] text-slate-400">{r.date}</div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-600 text-xs">
                          {formatNumber(r.award_miles)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-600 text-xs">
                          {formatCurrency(r.value)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="font-bold text-slate-900">€{euroCpm.toFixed(4)}</div>
                          <div className={`text-[10px] font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {delta >= 0 ? '+' : ''}{deltaPercent.toFixed(0)}%
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${valuation.color}`}>
                            {valuation.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => originalRecord && startEdit(originalRecord)}
                              className="p-1 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit redemption"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => onUpdate(redemptions.filter((x) => x.id !== r.id))} 
                              className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete redemption"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-xs">
                        {stats.processed.length === 0 ? 'No redemptions recorded yet.' : 'No redemptions match this filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                
                {/* Totals Row */}
                {displayData.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr className="font-bold text-slate-700">
                      <td className="px-5 py-3 text-xs uppercase tracking-wider">Total</td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {formatNumber(displayData.reduce((sum, r) => sum + r.award_miles, 0))}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {formatCurrency(displayData.reduce((sum, r) => sum + r.value, 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        €{(displayData.reduce((sum, r) => sum + r.value, 0) / Math.max(1, displayData.reduce((sum, r) => sum + r.award_miles, 0))).toFixed(4)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
