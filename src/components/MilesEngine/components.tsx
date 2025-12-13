// src/components/MilesEngine/components.tsx
// Reusable components for MilesEngine

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { formatCurrency, formatNumber } from '../../utils/format';
import { formatCPM } from './helpers';

// CpmSparkline - Mini chart showing CPM trend
interface CpmSparklineProps {
  data: any[];
  currentMonth: string;
}

export const CpmSparkline: React.FC<CpmSparklineProps> = ({ data, currentMonth }) => {
  const recentData = data.filter((d) => d.month <= currentMonth).slice(-12);
  const isTrendingDown =
    recentData.length > 1 &&
    recentData[recentData.length - 1].cpmActual < recentData[0].cpmActual;
  const color = isTrendingDown ? '#10b981' : '#3b82f6';

  return (
    <div className="h-16 w-full mt-4 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={recentData}>
          <defs>
            <linearGradient id="colorCpm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="cpmActual"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCpm)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// RoiBar - Horizontal bar comparing cost vs value
interface RoiBarProps {
  cost: number;
  value: number;
}

export const RoiBar: React.FC<RoiBarProps> = ({ cost, value }) => {
  const maxValue = Math.max(cost, value) * 1.1;
  const data = [
    { name: 'Cost', amount: cost, fill: '#94a3b8' },
    { name: 'Value', amount: value, fill: '#6366f1' },
  ];

  return (
    <div className="h-20 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          barSize={10}
          margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, maxValue]} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
            width={40}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
            formatter={(val: number) => formatCurrency(val)}
          />
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            background={{ fill: '#f1f5f9', radius: [0, 4, 4, 0] }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// SourceEfficiencyCard - Card showing efficiency per source
interface SourceEfficiencyCardProps {
  source: {
    key: string;
    label: string;
    miles: number;
    cost: number;
    cpm: number;
  };
  targetCPM: number;
}

export const SourceEfficiencyCard: React.FC<SourceEfficiencyCardProps> = ({
  source,
  targetCPM,
}) => {
  const isFree = source.cpm === 0 && source.miles > 0;
  const isEfficient = source.cpm > 0 && source.cpm <= targetCPM;
  const isAcceptable = source.cpm > targetCPM && source.cpm <= targetCPM * 1.5;

  const efficiencyScore =
    source.cpm > 0 ? (targetCPM / source.cpm) * 100 : isFree ? 200 : 0;
  const displayPercent = Math.min(100, efficiencyScore);

  const barColor = isFree
    ? 'bg-emerald-500'
    : isEfficient
    ? 'bg-emerald-500'
    : isAcceptable
    ? 'bg-amber-500'
    : 'bg-red-400';
  const textColor = isFree
    ? 'text-emerald-600'
    : isEfficient
    ? 'text-emerald-600'
    : isAcceptable
    ? 'text-amber-600'
    : 'text-red-500';

  return (
    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {source.label}
        </div>
        <div className={`font-mono font-bold text-xs ${textColor}`}>
          {formatCPM(source.cpm)}
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-slate-800 text-sm">
          {formatNumber(source.miles)}
        </div>
        <div className="text-[10px] text-slate-400">miles</div>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        {isFree ? (
          <span className="text-[9px] text-emerald-600 font-semibold">
            Free acquisition ✓
          </span>
        ) : isEfficient ? (
          <span className="text-[9px] text-emerald-600 font-medium">
            Below target ✓
          </span>
        ) : (
          <span className="text-[9px] text-slate-400">
            {Math.round(efficiencyScore)}% efficiency
          </span>
        )}
      </div>
    </div>
  );
};

// KPICard - Generic KPI card with optional children
interface KPICardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ComponentType<{ size?: number }>;
  trend?: 'up' | 'stable';
  trendLabel?: string;
  color?: 'blue' | 'emerald' | 'violet' | 'amber';
  tooltip?: string;
  children?: React.ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  tooltip,
  children,
}) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  const css = colors[color] || colors.blue;

  return (
    <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm relative group z-0 hover:z-10">
      <div className="flex justify-between items-start mb-3">
        <div
          className={`p-2.5 rounded-xl ${css} transition-transform group-hover:scale-110 duration-300`}
        >
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-slate-500">
            {trend === 'up' ? (
              <TrendingUp size={10} className="text-emerald-500" />
            ) : (
              <RefreshCw size={10} className="text-blue-500" />
            )}
            {trendLabel}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {title}
          </h4>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight mb-0.5">
          {value}
        </div>
        <p className="text-[11px] font-medium text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
};
