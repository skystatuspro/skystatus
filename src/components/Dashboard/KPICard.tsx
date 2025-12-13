// src/components/Dashboard/KPICard.tsx
// KPI card component for Dashboard metrics

import React from 'react';
import { Tooltip } from '../Tooltip';
import { BadgeColor } from './helpers';

interface KPIProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badgeText?: string;
  badgeColor?: BadgeColor;
  tooltip?: string;
}

export const KPICard: React.FC<KPIProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = 'slate',
  tooltip,
}) => {
  const styles: Record<BadgeColor, string> = {
    blue: 'bg-blue-50/40 border-blue-100 hover:border-blue-200',
    amber: 'bg-amber-50/40 border-amber-100 hover:border-amber-200',
    emerald: 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200',
    violet: 'bg-violet-50/40 border-violet-100 hover:border-violet-200',
    slate: 'bg-slate-50/40 border-slate-100 hover:border-slate-200',
  };

  const iconStyles: Record<BadgeColor, string> = {
    blue: 'text-blue-600 bg-white shadow-sm',
    amber: 'text-amber-600 bg-white shadow-sm',
    emerald: 'text-emerald-600 bg-white shadow-sm',
    violet: 'text-violet-600 bg-white shadow-sm',
    slate: 'text-slate-600 bg-white shadow-sm',
  };

  const styleClass = styles[badgeColor] || styles.slate;
  const iconClass = iconStyles[badgeColor] || iconStyles.slate;

  return (
    <div className={`p-5 rounded-3xl border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 group ${styleClass} h-full flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${iconClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {badgeText && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/60 text-slate-500 border border-slate-100/50">
            {badgeText}
          </span>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">
            {title}
          </p>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
