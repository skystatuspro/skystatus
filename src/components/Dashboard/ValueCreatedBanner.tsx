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

  // Full version for Dashboard
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-[1.5rem] border border-emerald-100 p-5 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/40 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-100/40 rounded-full blur-2xl -ml-16 -mb-16" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-emerald-100">
              <Trophy size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">Value Created</h3>
                <Tooltip text="Total value from your miles portfolio. Realized = value from redemptions already made. Unrealized = current balance valued at your target CPM." />
              </div>
              <p className="text-[10px] text-emerald-600 font-medium">Portfolio performance</p>
            </div>
          </div>
          
          {/* Big number */}
          <div className="text-right">
            <p className={`text-3xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{formatCurrency(totalGain)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">total gain</p>
          </div>
        </div>
        
        {/* Realized vs Unrealized breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Realized</span>
              <span className="text-xs font-bold text-slate-700">{formatCurrency(realizedValue)}</span>
            </div>
            <p className="text-[9px] text-slate-500">From redemptions</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 border border-blue-100/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Unrealized</span>
              <span className="text-xs font-bold text-slate-700">{formatCurrency(unrealizedValue)}</span>
            </div>
            <p className="text-[9px] text-slate-500">Current portfolio @ target CPM</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden flex shadow-inner">
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
        
        {/* Footer */}
        <div className="flex justify-between items-center mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
          <span>Investment: {formatCurrency(totalInvestment)}</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Realized
            <span className="w-2 h-2 bg-blue-400 rounded-full" /> Unrealized
          </span>
        </div>
      </div>
    </div>
  );
};
