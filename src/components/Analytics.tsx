import React, { useMemo, useState } from 'react';
import { XPRecord, RedemptionRecord, MilesRecord } from '../types';
import { calculateMultiYearStats } from '../utils/xp-logic';
import { formatCurrency, formatNumber } from '../utils/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Award,
  BarChart3,
  PieChart as PieIcon,
  Zap,
  Target,
  Wallet,
  Coins,
  Plane,
  CreditCard,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PLATINUM_THRESHOLD } from '../constants';
import { Tooltip } from './Tooltip';

interface AnalyticsProps {
  xpData: XPRecord[];
  rollover: number;
  redemptions: RedemptionRecord[];
  milesData: MilesRecord[];
  currentMonth: string;
  targetCPM: number;
}

const ROLLOVER_CAP = PLATINUM_THRESHOLD + 300;

// --- Formatting Helpers ---
const formatCPM = (cpm: number): string => {
  if (cpm === 0) return '€0.0000';
  return `€${cpm.toFixed(4)}`;
};

// --- KPI Card Component ---
const AnalyticsKPI = ({ title, value, subtext, icon: Icon, colorClass, tooltip, trend }: any) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full group hover:shadow-md transition-all relative z-0 hover:z-10">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className={`p-2 rounded-xl ${colorClass.bg} ${colorClass.text} group-hover:scale-110 transition-transform`}>
        <Icon size={18} />
      </div>
    </div>
    <div>
      <div className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        {value}
        {trend && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {subtext && <div className="text-xs font-medium text-slate-500 mt-1">{subtext}</div>}
    </div>
  </div>
);

// --- Section Tab Component ---
const SectionTab = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
      active 
        ? 'bg-slate-900 text-white shadow-lg' 
        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

// --- Insight Card Component ---
const InsightCard = ({ icon: Icon, title, description, color = 'blue' }: any) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
  };
  
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex items-start gap-3`}>
      <div className="p-2 rounded-xl bg-white/60">
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800">{title}</div>
        <div className="text-xs text-slate-600 mt-0.5">{description}</div>
      </div>
    </div>
  );
};

export const Analytics: React.FC<AnalyticsProps> = ({
  xpData,
  rollover,
  redemptions,
  milesData,
  currentMonth,
  targetCPM,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'miles' | 'xp' | 'redemptions'>('overview');

  // ============================================
  // MILES ANALYTICS CALCULATIONS
  // ============================================
  
  const milesAnalytics = useMemo(() => {
    if (milesData.length === 0) return null;
    
    const sorted = [...milesData].sort((a, b) => a.month.localeCompare(b.month));
    
    // Running balance over time
    let runningBalance = 0;
    const balanceHistory = sorted.map(r => {
      const earned = r.miles_subscription + r.miles_amex + r.miles_flight + r.miles_other;
      const burned = r.miles_debit;
      runningBalance += earned - burned;
      const cost = r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other;
      const cpm = earned > 0 ? cost / earned : 0;
      
      return {
        month: r.month,
        earned,
        burned,
        net: earned - burned,
        balance: runningBalance,
        cpm,
        subscription: r.miles_subscription,
        amex: r.miles_amex,
        flight: r.miles_flight,
        other: r.miles_other,
      };
    });
    
    // Source totals
    const sourceTotals = sorted.reduce((acc, r) => {
      acc.subscription += r.miles_subscription;
      acc.amex += r.miles_amex;
      acc.flight += r.miles_flight;
      acc.other += r.miles_other;
      acc.costSubscription += r.cost_subscription;
      acc.costAmex += r.cost_amex;
      acc.costFlight += r.cost_flight;
      acc.costOther += r.cost_other;
      acc.totalBurned += r.miles_debit;
      return acc;
    }, {
      subscription: 0, amex: 0, flight: 0, other: 0,
      costSubscription: 0, costAmex: 0, costFlight: 0, costOther: 0,
      totalBurned: 0
    });
    
    const totalEarned = sourceTotals.subscription + sourceTotals.amex + sourceTotals.flight + sourceTotals.other;
    const totalCost = sourceTotals.costSubscription + sourceTotals.costAmex + sourceTotals.costFlight + sourceTotals.costOther;
    const avgCPM = totalEarned > 0 ? totalCost / totalEarned : 0;
    
    // Source breakdown for pie chart
    const sourceBreakdown = [
      { name: 'Subscription', value: sourceTotals.subscription, cost: sourceTotals.costSubscription, fill: '#6366f1' },
      { name: 'Amex/Cards', value: sourceTotals.amex, cost: sourceTotals.costAmex, fill: '#3b82f6' },
      { name: 'Flying', value: sourceTotals.flight, cost: sourceTotals.costFlight, fill: '#10b981' },
      { name: 'Other', value: sourceTotals.other, cost: sourceTotals.costOther, fill: '#f59e0b' },
    ].filter(s => s.value > 0);
    
    // Source CPM comparison
    const sourceCPM = [
      { name: 'Subscription', cpm: sourceTotals.subscription > 0 ? sourceTotals.costSubscription / sourceTotals.subscription : 0, miles: sourceTotals.subscription },
      { name: 'Amex/Cards', cpm: sourceTotals.amex > 0 ? sourceTotals.costAmex / sourceTotals.amex : 0, miles: sourceTotals.amex },
      { name: 'Flying', cpm: sourceTotals.flight > 0 ? sourceTotals.costFlight / sourceTotals.flight : 0, miles: sourceTotals.flight },
      { name: 'Other', cpm: sourceTotals.other > 0 ? sourceTotals.costOther / sourceTotals.other : 0, miles: sourceTotals.other },
    ].filter(s => s.miles > 0).sort((a, b) => a.cpm - b.cpm);
    
    // Growth calculation
    const actualMonths = balanceHistory.filter(h => h.month <= currentMonth);
    const firstBalance = actualMonths[0]?.balance || 0;
    const lastBalance = actualMonths[actualMonths.length - 1]?.balance || 0;
    const growthRate = firstBalance > 0 ? ((lastBalance - firstBalance) / firstBalance) * 100 : 0;
    
    // Monthly average
    const avgMonthlyEarn = actualMonths.length > 0 
      ? actualMonths.reduce((sum, m) => sum + m.earned, 0) / actualMonths.length 
      : 0;
    const avgMonthlyBurn = actualMonths.length > 0 
      ? actualMonths.reduce((sum, m) => sum + m.burned, 0) / actualMonths.length 
      : 0;
    
    // Burn rate / runway
    const currentBalance = lastBalance;
    const monthsRunway = avgMonthlyBurn > 0 ? Math.round(currentBalance / avgMonthlyBurn) : Infinity;
    
    // Best source (lowest CPM with miles)
    const bestSource = sourceCPM.length > 0 ? sourceCPM[0] : null;
    
    // Month over month trend
    const recentMonths = actualMonths.slice(-3);
    const momTrend = recentMonths.length >= 2 
      ? ((recentMonths[recentMonths.length - 1].earned - recentMonths[0].earned) / Math.max(1, recentMonths[0].earned)) * 100
      : 0;

    return {
      balanceHistory,
      sourceBreakdown,
      sourceCPM,
      totalEarned,
      totalCost,
      totalBurned: sourceTotals.totalBurned,
      avgCPM,
      currentBalance,
      growthRate,
      avgMonthlyEarn,
      avgMonthlyBurn,
      monthsRunway,
      bestSource,
      momTrend,
    };
  }, [milesData, currentMonth]);

  // ============================================
  // XP ANALYTICS CALCULATIONS
  // ============================================
  
  const multiYearStats = useMemo(
    () => calculateMultiYearStats(xpData, rollover),
    [xpData, rollover]
  );

  const years = Object.keys(multiYearStats).map(Number).sort((a, b) => a - b);

  let totalXPEarnedLifetime = 0;
  let totalXPWastedLifetime = 0;

  const xpChartData = years.map((year) => {
    const stat: any = multiYearStats[year];
    const earned = stat.totalXP - stat.rolloverIn;
    const waste = Math.max(0, stat.totalXP - ROLLOVER_CAP);
    
    totalXPEarnedLifetime += earned;
    totalXPWastedLifetime += waste;

    return {
      year,
      totalXP: stat.totalXP,
      rolloverIn: stat.rolloverIn,
      earned: earned,
      rolloverOut: stat.rolloverOut,
      waste: waste,
      utilized: stat.totalXP - waste 
    };
  });

  const efficiencyRate = totalXPEarnedLifetime > 0 
    ? ((totalXPEarnedLifetime - totalXPWastedLifetime) / totalXPEarnedLifetime) * 100 
    : 100;

  // ============================================
  // REDEMPTION ANALYTICS
  // ============================================
  
  const redemptionAnalytics = useMemo(() => {
    if (redemptions.length === 0) return null;
    
    const processed = redemptions.map((r) => {
      const netValue = r.cash_price_estimate - r.surcharges;
      const cpm = r.award_miles > 0 ? (netValue / r.award_miles) : 0;
      return { ...r, cpm, value: netValue };
    });
    
    const totalValue = processed.reduce((acc, r) => acc + r.value, 0);
    const totalMilesUsed = processed.reduce((acc, r) => acc + r.award_miles, 0);
    const avgCPM = totalMilesUsed > 0 ? totalValue / totalMilesUsed : 0;
    
    const bestRedemption = processed.reduce((best, r) => r.cpm > (best?.cpm || 0) ? r : best, processed[0]);
    const worstRedemption = processed.reduce((worst, r) => r.cpm < (worst?.cpm || Infinity) ? r : worst, processed[0]);
    
    return {
      processed,
      totalValue,
      totalMilesUsed,
      avgCPM,
      bestRedemption,
      worstRedemption,
      count: processed.length,
    };
  }, [redemptions]);

  // Efficiency Pie Data
  const efficiencyData = [
    { name: 'Utilized', value: totalXPEarnedLifetime - totalXPWastedLifetime, fill: '#3b82f6' },
    { name: 'Wasted (Cap)', value: totalXPWastedLifetime, fill: '#cbd5e1' },
  ];

  // ============================================
  // GENERATED INSIGHTS
  // ============================================
  
  const insights = useMemo(() => {
    const list: { icon: any; title: string; description: string; color: string }[] = [];
    
    if (milesAnalytics) {
      // Best source insight
      if (milesAnalytics.bestSource && milesAnalytics.bestSource.cpm === 0) {
        list.push({
          icon: Sparkles,
          title: `${milesAnalytics.bestSource.name} is your best source`,
          description: `Free miles! ${formatNumber(milesAnalytics.bestSource.miles)} miles at €0.0000 CPM`,
          color: 'emerald',
        });
      } else if (milesAnalytics.bestSource) {
        list.push({
          icon: Coins,
          title: `${milesAnalytics.bestSource.name} is most efficient`,
          description: `Lowest CPM at ${formatCPM(milesAnalytics.bestSource.cpm)} per mile`,
          color: 'blue',
        });
      }
      
      // Growth insight
      if (milesAnalytics.growthRate > 50) {
        list.push({
          icon: TrendingUp,
          title: `Portfolio grew ${milesAnalytics.growthRate.toFixed(0)}%`,
          description: 'Strong accumulation momentum across tracked months',
          color: 'emerald',
        });
      }
      
      // Runway insight
      if (milesAnalytics.monthsRunway < 12 && milesAnalytics.monthsRunway > 0) {
        list.push({
          icon: AlertTriangle,
          title: `${milesAnalytics.monthsRunway} months runway`,
          description: 'At current burn rate, consider slowing redemptions',
          color: 'amber',
        });
      } else if (milesAnalytics.monthsRunway >= 24) {
        list.push({
          icon: Wallet,
          title: 'Healthy runway',
          description: `${milesAnalytics.monthsRunway === Infinity ? 'Unlimited' : milesAnalytics.monthsRunway + '+ months'} at current burn rate`,
          color: 'blue',
        });
      }
    }
    
    // XP efficiency insight
    if (efficiencyRate < 80) {
      list.push({
        icon: AlertTriangle,
        title: `${(100 - efficiencyRate).toFixed(0)}% XP wasted`,
        description: `${totalXPWastedLifetime} XP lost to rollover caps - consider timing flights`,
        color: 'amber',
      });
    } else if (efficiencyRate >= 95) {
      list.push({
        icon: CheckCircle2,
        title: 'Excellent XP management',
        description: 'Near-perfect utilization of earned XP',
        color: 'emerald',
      });
    }
    
    // Redemption insight
    if (redemptionAnalytics && redemptionAnalytics.avgCPM > targetCPM) {
      list.push({
        icon: Target,
        title: 'Redemptions beat target',
        description: `Avg ${formatCPM(redemptionAnalytics.avgCPM)} vs ${formatCPM(targetCPM)} target`,
        color: 'emerald',
      });
    }
    
    return list.slice(0, 4); // Max 4 insights
  }, [milesAnalytics, efficiencyRate, totalXPWastedLifetime, redemptionAnalytics, targetCPM]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Analytics Center
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              Deep dive into your loyalty efficiency and value creation.
            </p>
          </div>
          
          {/* Section Tabs */}
          <div className="flex gap-2 flex-wrap">
            <SectionTab 
              active={activeSection === 'overview'} 
              onClick={() => setActiveSection('overview')} 
              icon={BarChart3} 
              label="Overview" 
            />
            <SectionTab 
              active={activeSection === 'miles'} 
              onClick={() => setActiveSection('miles')} 
              icon={Wallet} 
              label="Miles" 
            />
            <SectionTab 
              active={activeSection === 'xp'} 
              onClick={() => setActiveSection('xp')} 
              icon={Zap} 
              label="XP" 
            />
            <SectionTab 
              active={activeSection === 'redemptions'} 
              onClick={() => setActiveSection('redemptions')} 
              icon={Award} 
              label="Redemptions" 
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* OVERVIEW SECTION */}
      {/* ============================================ */}
      {activeSection === 'overview' && (
        <>
          {/* Top Level KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsKPI 
              title="Portfolio Value"
              value={formatCurrency((milesAnalytics?.currentBalance || 0) * targetCPM)}
              subtext={`${formatNumber(milesAnalytics?.currentBalance || 0)} miles @ target CPM`}
              icon={Wallet}
              colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
              tooltip="Current miles balance valued at your target redemption rate."
            />
            <AnalyticsKPI 
              title="Lifetime Value Created"
              value={formatCurrency(redemptionAnalytics?.totalValue || 0)}
              subtext={`${redemptionAnalytics?.count || 0} redemptions`}
              icon={Award}
              colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
              tooltip="Sum of (Cash Price - Taxes) for all redemptions."
            />
            <AnalyticsKPI 
              title="XP Efficiency"
              value={`${efficiencyRate.toFixed(0)}%`}
              subtext={efficiencyRate >= 90 ? "Well optimized" : `${totalXPWastedLifetime} XP wasted`}
              icon={efficiencyRate >= 90 ? CheckCircle2 : AlertTriangle}
              colorClass={efficiencyRate >= 90 ? { bg: 'bg-emerald-50', text: 'text-emerald-600' } : { bg: 'bg-amber-50', text: 'text-amber-600' }}
              tooltip="Percentage of earned XP actually used (not lost to caps)."
            />
            <AnalyticsKPI 
              title="Acquisition Cost"
              value={formatCPM(milesAnalytics?.avgCPM || 0)}
              subtext="Weighted average CPM"
              icon={Coins}
              colorClass={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
              tooltip="Average cost per mile across all sources."
            />
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={20} className="text-amber-500" />
                <h3 className="font-bold text-slate-800">Key Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, i) => (
                  <InsightCard key={i} {...insight} />
                ))}
              </div>
            </div>
          )}

          {/* Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Miles Balance Trend */}
            {milesAnalytics && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Wallet size={18} className="text-slate-400" />
                  Miles Balance Trend
                  <Tooltip text="Your miles portfolio value over time." />
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={milesAnalytics.balanceHistory}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value: number) => [formatNumber(value), 'Balance']}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fill="url(#balanceGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Source Diversification */}
            {milesAnalytics && milesAnalytics.sourceBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <PieIcon size={18} className="text-slate-400" />
                  Source Diversification
                  <Tooltip text="Where your miles come from." />
                </h3>
                <div className="h-[250px] flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={milesAnalytics.sourceBreakdown}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {milesAnalytics.sourceBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                          formatter={(value: number) => [formatNumber(value), 'Miles']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2">
                    {milesAnalytics.sourceBreakdown.map((source, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }} />
                          <span className="text-xs font-medium text-slate-600">{source.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {((source.value / milesAnalytics.totalEarned) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* MILES SECTION */}
      {/* ============================================ */}
      {activeSection === 'miles' && milesAnalytics && (
        <>
          {/* Miles KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsKPI 
              title="Current Balance"
              value={formatNumber(milesAnalytics.currentBalance)}
              subtext={`Worth ${formatCurrency(milesAnalytics.currentBalance * targetCPM)}`}
              icon={Wallet}
              colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
              trend={milesAnalytics.momTrend > 0 ? Math.round(milesAnalytics.momTrend) : undefined}
            />
            <AnalyticsKPI 
              title="Avg Monthly Earn"
              value={formatNumber(Math.round(milesAnalytics.avgMonthlyEarn))}
              subtext="Miles per month"
              icon={TrendingUp}
              colorClass={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
            />
            <AnalyticsKPI 
              title="Total Invested"
              value={formatCurrency(milesAnalytics.totalCost)}
              subtext={`For ${formatNumber(milesAnalytics.totalEarned)} miles`}
              icon={CreditCard}
              colorClass={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
            />
            <AnalyticsKPI 
              title="Burn Runway"
              value={milesAnalytics.monthsRunway === Infinity ? '∞' : `${milesAnalytics.monthsRunway} mo`}
              subtext={`Avg burn: ${formatNumber(Math.round(milesAnalytics.avgMonthlyBurn))}/mo`}
              icon={RefreshCw}
              colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
            />
          </div>

          {/* Miles Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Earn vs Burn */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-400" />
                Earn vs Burn
                <Tooltip text="Monthly miles inflow (earned) vs outflow (burned)." />
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={milesAnalytics.balanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                    />
                    <Bar dataKey="earned" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Earned" />
                    <Bar dataKey="burned" fill="#f87171" radius={[4, 4, 0, 0]} name="Burned" />
                    <Line type="monotone" dataKey="balance" stroke="#0f172a" strokeWidth={2} dot={false} name="Balance" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source CPM Comparison */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Coins size={18} className="text-slate-400" />
                Source Efficiency
                <Tooltip text="CPM comparison by source. Lower is better." />
              </h3>
              <div className="space-y-3">
                {milesAnalytics.sourceCPM.map((source, i) => {
                  const maxCPM = Math.max(...milesAnalytics.sourceCPM.map(s => s.cpm), targetCPM);
                  const width = maxCPM > 0 ? (source.cpm / maxCPM) * 100 : 0;
                  const isBest = i === 0;
                  const isAboveTarget = source.cpm > targetCPM;
                  
                  return (
                    <div key={source.name} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">{source.name}</span>
                        <span className={`text-xs font-bold ${isBest ? 'text-emerald-600' : isAboveTarget ? 'text-amber-600' : 'text-slate-700'}`}>
                          {formatCPM(source.cpm)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            source.cpm === 0 ? 'bg-emerald-500' : isBest ? 'bg-emerald-500' : isAboveTarget ? 'bg-amber-400' : 'bg-blue-500'
                          }`}
                          style={{ width: source.cpm === 0 ? '5%' : `${Math.max(5, width)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatNumber(source.miles)} miles
                        {source.cpm === 0 && ' • Free!'}
                      </div>
                    </div>
                  );
                })}
                
                {/* Target line indicator */}
                <div className="pt-2 border-t border-slate-100 mt-3">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Target CPM</span>
                    <span className="font-bold text-slate-600">{formatCPM(targetCPM)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CPM Trend */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingDown size={18} className="text-slate-400" />
              CPM Trend Over Time
              <Tooltip text="Are your miles getting cheaper? Downward trend is good." />
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={milesAnalytics.balanceHistory.filter(h => h.cpm > 0)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v.toFixed(3)}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                    formatter={(value: number) => [formatCPM(value), 'CPM']}
                  />
                  <ReferenceLine y={targetCPM} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="cpm" stroke="#0f172a" strokeWidth={2} dot={{ r: 3, fill: '#0f172a' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* XP SECTION */}
      {/* ============================================ */}
      {activeSection === 'xp' && (
        <>
          {/* XP KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsKPI 
              title="Total XP Generated"
              value={totalXPEarnedLifetime}
              subtext="Cumulative earned XP"
              icon={Zap}
              colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
            />
            <AnalyticsKPI 
              title="XP Efficiency"
              value={`${efficiencyRate.toFixed(1)}%`}
              subtext={totalXPWastedLifetime > 0 ? `${totalXPWastedLifetime} XP lost` : 'No waste!'}
              icon={efficiencyRate >= 90 ? CheckCircle2 : AlertTriangle}
              colorClass={efficiencyRate >= 90 ? { bg: 'bg-emerald-50', text: 'text-emerald-600' } : { bg: 'bg-amber-50', text: 'text-amber-600' }}
            />
            <AnalyticsKPI 
              title="Years Tracked"
              value={years.length}
              subtext={`${years[0] || '-'} - ${years[years.length - 1] || '-'}`}
              icon={BarChart3}
              colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
            />
            <AnalyticsKPI 
              title="Avg XP / Year"
              value={years.length > 0 ? Math.round(totalXPEarnedLifetime / years.length) : 0}
              subtext="Average annual earnings"
              icon={Target}
              colorClass={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
            />
          </div>

          {/* XP Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* XP Source History */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={18} className="text-slate-400" />
                  XP Source History
                  <Tooltip text="Year-over-year XP breakdown. Light = rollover, Dark = new earnings." />
                </h3>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div> Earned
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-2.5 h-2.5 bg-sky-200 rounded-sm"></div> Rollover
                  </span>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={xpChartData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <ReferenceLine y={PLATINUM_THRESHOLD} stroke="#0f172a" strokeDasharray="3 3" strokeOpacity={0.2} />
                    <Bar dataKey="rolloverIn" stackId="a" fill="#bae6fd" radius={[0, 0, 4, 4]} name="Rollover In" />
                    <Bar dataKey="earned" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name="XP Earned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Efficiency Donut */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-slate-400" />
                Efficiency Cap
                <Tooltip text="Grey = XP lost to the 300 rollover cap." />
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center relative h-[200px]">
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-black text-slate-800">{efficiencyRate.toFixed(0)}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Efficiency</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={efficiencyData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {efficiencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4">
                {totalXPWastedLifetime > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <AlertTriangle className="text-orange-500 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-orange-800 uppercase">Warning</p>
                      <p className="text-[11px] text-orange-600/80 leading-tight">
                        {totalXPWastedLifetime} XP lost due to cap
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 uppercase">Optimized</p>
                      <p className="text-[11px] text-emerald-600/80 leading-tight">
                        No XP waste detected
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* REDEMPTIONS SECTION */}
      {/* ============================================ */}
      {activeSection === 'redemptions' && (
        <>
          {/* Redemption KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsKPI 
              title="Total Value Created"
              value={formatCurrency(redemptionAnalytics?.totalValue || 0)}
              subtext={`${redemptionAnalytics?.count || 0} redemptions`}
              icon={Award}
              colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
            />
            <AnalyticsKPI 
              title="Miles Redeemed"
              value={formatNumber(redemptionAnalytics?.totalMilesUsed || 0)}
              subtext="Total lifetime burns"
              icon={Plane}
              colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
            />
            <AnalyticsKPI 
              title="Avg Redemption CPM"
              value={formatCPM(redemptionAnalytics?.avgCPM || 0)}
              subtext={`Target: ${formatCPM(targetCPM)}`}
              icon={Target}
              colorClass={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
            />
            <AnalyticsKPI 
              title="Best Redemption"
              value={formatCPM(redemptionAnalytics?.bestRedemption?.cpm || 0)}
              subtext={redemptionAnalytics?.bestRedemption?.description || '-'}
              icon={Sparkles}
              colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
            />
          </div>

          {/* Redemption Scatter Plot */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  Redemption Value Map
                  <Tooltip text="Scatter plot of all redemptions. Higher CPM = better value." />
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Visualizing the quality of your burns
                </p>
              </div>
              <div className="flex gap-4 text-xs font-medium bg-slate-50 p-2 rounded-xl mt-2 md:mt-0">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Exceptional
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Good
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Poor
                </span>
              </div>
            </div>

            <div className="h-[400px]">
              {redemptionAnalytics && redemptionAnalytics.processed.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      dataKey="award_miles"
                      name="Miles"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                      label={{ value: 'Cost (Miles)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="cpm"
                      name="CPM"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(v) => `€${v.toFixed(3)}`}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Value (€/mile)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
                    />
                    <ZAxis type="number" dataKey="value" range={[100, 500]} />
                    <ReferenceLine y={targetCPM} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data: any = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 shadow-xl rounded-xl text-xs border border-slate-700/50">
                              <p className="font-bold text-sm mb-2">{data.description}</p>
                              <div className="space-y-1 text-slate-300">
                                <p>Cost: <span className="text-white font-mono">{formatNumber(data.award_miles)}</span> miles</p>
                                <p>Value: <span className="text-white font-mono">{formatCurrency(data.value)}</span></p>
                                <p>CPM: <span className="text-emerald-400 font-mono font-bold">{formatCPM(data.cpm)}</span></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Redemptions" data={redemptionAnalytics.processed}>
                      {redemptionAnalytics.processed.map((entry, index) => {
                        let color = '#ef4444';
                        if (entry.cpm > 0.02) color = '#10b981';
                        else if (entry.cpm > 0.01) color = '#3b82f6';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Plane size={48} className="mx-auto mb-2 opacity-30" />
                    <p>No redemptions logged yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
