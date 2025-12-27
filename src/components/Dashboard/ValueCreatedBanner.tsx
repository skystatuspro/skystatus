// src/components/Dashboard/ValueCreatedBanner.tsx
// Shows total value created from miles portfolio - realized + unrealized

import React from 'react';
import { TrendingUp, Trophy } from 'lucide-react';
import { Tooltip } from '../Tooltip';

interface ValueCreatedBannerProps {
  totalGain: number;
  realizedValue: number;
  unrealizedValue: number;
  totalInvestment: number;
  formatCurrency: (value: number) => string;
  /** Optional: compact mode for SimpleDashboard */
  compact?: boolean;
}

export const ValueCreatedBanner: React.FC<ValueCreatedBannerProps> = ({
  totalGain,
  realizedValue,
  unrealizedValue,
  totalInvestment,
  formatCurrency,
  compact = false,
}) => {
  const totalValue = realizedValue + unrealizedValue;
  const realizedPercent = totalValue > 0 ? (realizedValue / totalValue) * 100 : 0;
  const unrealizedPercent = totalValue > 0 ? (unrealizedValue / totalValue) * 100 : 0;
  const isPositive = totalGain >= 0;

  if (compact) {
    // Compact version for SimpleDashboard
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-100">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Value Created</p>
              <p className={`text-xl font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{formatCurrency(totalGain)}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px]">
            <div className="text-emerald-600 font-semibold">Realized: {formatCurrency(realizedValue)}</div>
            <div className="text-blue-500 font-semibold">Unrealized: {formatCurrency(unrealizedValue)}</div>
          </div>
        </div>
      </div>
    );
  }

  // Full version for Dashboard - styled to match KPICard
  return (
    <div className="bg-emerald-50/40 border border-emerald-100 hover:border-emerald-200 rounded-3xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
      {/* Header row - matches KPICard layout */}
      <div className="flex justify-between items-start mb-3">
        <div className="p-3 rounded-2xl bg-white shadow-sm">
          <Trophy size={20} strokeWidth={2.5} className="text-emerald-600" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/60 text-slate-500 border border-slate-100/50">
          Portfolio
        </span>
      </div>
      
      {/* Title and main value - matches KPICard */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">
            Value Created
          </p>
          <Tooltip text="Total value from your miles portfolio. Realized = value from redemptions already made. Unrealized = current balance valued at your target CPM." />
        </div>
        <h3 className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{formatCurrency(totalGain)}
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Investment: {formatCurrency(totalInvestment)}
        </p>
      </div>
      
      {/* Realized vs Unrealized breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Realized</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatCurrency(realizedValue)}</span>
          <p className="text-xs text-slate-400 mt-0.5">From redemptions</p>
        </div>
        <div className="bg-white/60 rounded-xl p-3 border border-blue-100/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Unrealized</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatCurrency(unrealizedValue)}</span>
          <p className="text-xs text-slate-400 mt-0.5">Current @ target CPM</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden flex shadow-inner">
        {realizedPercent > 0 && (
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" 
            style={{ width: `${realizedPercent}%` }}
          />
        )}
        {unrealizedPercent > 0 && (
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-blue-300 transition-all duration-500" 
            style={{ width: `${unrealizedPercent}%` }}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-end items-center mt-2 gap-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Realized
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span className="w-2 h-2 bg-blue-400 rounded-full" /> Unrealized
        </span>
      </div>
    </div>
  );
};
