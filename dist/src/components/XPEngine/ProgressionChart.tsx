// src/components/XPEngine/ProgressionChart.tsx
// Bar chart showing monthly XP progression

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { XPLedgerRow } from '../../utils/xp-logic';

interface ChartDataPoint extends XPLedgerRow {
  xp: number;
  actualXP: number;
  projectedXP: number;
  isFuture: boolean;
}

interface ProgressionChartProps {
  chartData: ChartDataPoint[];
  avgNeeded: number;
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  chartData,
  avgNeeded,
}) => {
  return (
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
                  const actual = payload.find((p) => p.dataKey === 'actualXP')?.value ?? 0;
                  const projected = payload.find((p) => p.dataKey === 'projectedXP')?.value ?? 0;
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
  );
};
