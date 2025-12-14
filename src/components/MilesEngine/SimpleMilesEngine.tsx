// src/components/MilesEngine/SimpleMilesEngine.tsx
// Simplified Miles Engine for Simple Mode

import React, { useMemo } from 'react';
import { MilesRecord, RedemptionRecord } from '../../types';
import { calculateMilesStats } from '../../utils/loyalty-logic';
import { formatNumber } from '../../utils/format';
import { useCurrency } from '../../lib/CurrencyContext';
import { useViewMode } from '../../hooks/useViewMode';
import {
  Wallet,
  Plane,
  CreditCard,
  Gift,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Gauge,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface SimpleMilesEngineProps {
  data: MilesRecord[];
  currentMonth: string;
  redemptions: RedemptionRecord[];
  targetCPM: number;
}

export const SimpleMilesEngine: React.FC<SimpleMilesEngineProps> = ({
  data,
  currentMonth,
  redemptions,
  targetCPM,
}) => {
  const { setViewMode } = useViewMode();
  const { format: formatCurrency } = useCurrency();

  const stats = useMemo(
    () => calculateMilesStats(data, currentMonth, redemptions, targetCPM),
    [data, currentMonth, redemptions, targetCPM]
  );

  // Get recent months data
  const recentMonths = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.month.localeCompare(a.month));
    return sorted.slice(0, 6).map(record => {
      const total = record.miles_subscription + record.miles_amex + 
                   record.miles_flight + record.miles_other - record.miles_debit;
      return {
        month: record.month,
        total,
        flights: record.miles_flight,
        amex: record.miles_amex,
        subscription: record.miles_subscription,
        other: record.miles_other,
        burned: record.miles_debit,
      };
    }).filter(m => m.total !== 0 || m.burned > 0);
  }, [data]);

  // Recent redemptions
  const recentRedemptions = useMemo(() => {
    return [...redemptions]
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3);
  }, [redemptions]);

  // Calculate estimated value
  const estimatedValue = stats.netCurrent * targetCPM;
  const projectedValue = stats.netProjected * targetCPM;

  // Format month for display
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Miles Balance</h2>
          <p className="text-slate-500 text-sm">Your Flying Blue miles overview</p>
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

      {/* Main Balance Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="text-white" size={20} />
            </div>
            <span className="text-blue-100 text-sm font-medium">Flying Blue Balance</span>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-5xl font-black text-white tracking-tight">
              {formatNumber(stats.netCurrent)}
            </h3>
            <span className="text-xl text-blue-200 font-medium">Miles</span>
          </div>

          {stats.netProjected > stats.netCurrent && (
            <p className="text-blue-200 text-sm flex items-center gap-1">
              <TrendingUp size={14} />
              {formatNumber(stats.netProjected)} projected
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-200 text-xs font-medium mb-1">Estimated Value</p>
              <p className="text-white text-xl font-bold">{formatCurrency(estimatedValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs font-medium mb-1">Projected Value</p>
              <p className="text-white text-xl font-bold">{formatCurrency(projectedValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600" size={16} />
            </div>
            <span className="text-xs font-medium text-slate-500">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.earnedAll || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="text-red-500" size={16} />
            </div>
            <span className="text-xs font-medium text-slate-500">Total Redeemed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.redeemedMiles || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">All time</p>
        </div>
      </div>

      {/* Recent Activity */}
      {recentMonths.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Recent Activity
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {recentMonths.map((month) => (
              <div key={month.month} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {formatMonth(month.month)}
                  </span>
                  <span className={`font-bold ${month.total >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {month.total >= 0 ? '+' : ''}{formatNumber(month.total)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {month.flights > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                      <Plane size={12} className="rotate-45" />
                      {formatNumber(month.flights)} flights
                    </span>
                  )}
                  {month.amex > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                      <CreditCard size={12} />
                      {formatNumber(month.amex)} Amex
                    </span>
                  )}
                  {month.subscription > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                      <Sparkles size={12} />
                      {formatNumber(month.subscription)} subscription
                    </span>
                  )}
                  {month.other > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                      <Gift size={12} />
                      {formatNumber(month.other)} other
                    </span>
                  )}
                  {month.burned > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg">
                      <TrendingDown size={12} />
                      -{formatNumber(month.burned)} redeemed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Redemptions */}
      {recentRedemptions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Gift size={18} className="text-indigo-500" />
              Recent Redemptions
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRedemptions.map((redemption) => (
              <div key={redemption.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{redemption.description}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(redemption.month + '-01').toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-500">-{formatNumber(redemption.miles_redeemed || 0)}</p>
                  {redemption.estimated_value && redemption.estimated_value > 0 && (
                    <p className="text-xs text-slate-400">
                      {formatCurrency(redemption.estimated_value)} value
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentMonths.length === 0 && recentRedemptions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <Wallet size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">No miles activity yet</h3>
          <p className="text-sm text-slate-500">Import your Flying Blue PDF to see your miles</p>
        </div>
      )}

      {/* Switch to Full View */}
      <div className="text-center pt-4">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Need CPM analysis or detailed charts? Switch to Full View →
        </button>
      </div>
    </div>
  );
};
