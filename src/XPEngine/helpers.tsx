// src/components/XPEngine/helpers.ts
// Shared utilities and small components for XPEngine

import React from 'react';
import { StatusLevel, ManualField } from '../../types';
import { Zap, Clock, Plane, Star, Compass, CheckCircle2 } from 'lucide-react';

export const noSpinnerClass =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export interface StatusTheme {
  blob1: string;
  blob2: string;
  accentText: string;
  subText: string;
  iconBg: string;
  gaugeStart: string;
  gaugeEnd: string;
  icon: React.ReactNode;
  badge: string;
}

export const getStatusTheme = (status: StatusLevel): StatusTheme => {
  switch (status) {
    case 'Platinum':
      return {
        blob1: 'bg-blue-100/60',
        blob2: 'bg-indigo-100/60',
        accentText: 'text-blue-900',
        subText: 'text-blue-600',
        iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
        gaugeStart: '#3b82f6',
        gaugeEnd: '#6366f1',
        icon: <Plane size={20} strokeWidth={2.5} />,
        badge: 'bg-slate-800 text-white border-slate-700',
      };
    case 'Gold':
      return {
        blob1: 'bg-amber-100/60',
        blob2: 'bg-yellow-100/60',
        accentText: 'text-amber-900',
        subText: 'text-amber-600',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
        gaugeStart: '#f59e0b',
        gaugeEnd: '#eab308',
        icon: <Star size={20} strokeWidth={2.5} />,
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'Silver':
      return {
        blob1: 'bg-slate-100/60',
        blob2: 'bg-gray-100/60',
        accentText: 'text-slate-700',
        subText: 'text-slate-500',
        iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
        gaugeStart: '#64748b',
        gaugeEnd: '#94a3b8',
        icon: <CheckCircle2 size={20} strokeWidth={2.5} />,
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    default:
      return {
        blob1: 'bg-emerald-100/60',
        blob2: 'bg-teal-100/60',
        accentText: 'text-emerald-800',
        subText: 'text-emerald-600',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        gaugeStart: '#10b981',
        gaugeEnd: '#14b8a6',
        icon: <Compass size={20} strokeWidth={2.5} />,
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
  }
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });

export const getNextStatusFromCurrent = (status: StatusLevel): StatusLevel | null => {
  switch (status) {
    case 'Explorer':
      return 'Silver';
    case 'Silver':
      return 'Gold';
    case 'Gold':
      return 'Platinum';
    default:
      return null;
  }
};

// StatusPill component
interface StatusPillProps {
  label: string;
  theme: StatusTheme;
  variant?: 'default' | 'levelup' | 'projected';
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  theme,
  variant = 'default',
}) => (
  <span
    className={`inline-flex items-center justify-center h-5 px-2 rounded text-[9px] font-bold tracking-wider uppercase border shadow-sm ${
      variant === 'levelup'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : variant === 'projected'
        ? 'bg-blue-100 text-blue-700 border-blue-200 opacity-70'
        : theme.badge
    } opacity-90`}
  >
    {variant === 'levelup' && <Zap size={10} className="mr-1" />}
    {variant === 'projected' && <Clock size={10} className="mr-1" />}
    {label}
  </span>
);

// InputCell component for editable cells
interface InputCellProps {
  val: number;
  field: ManualField;
  month: string;
  onChange: (month: string, field: ManualField, value: number) => void;
  className?: string;
}

export const InputCell: React.FC<InputCellProps> = ({
  val,
  field,
  month,
  onChange,
  className = '',
}) => (
  <div className="relative group w-full h-full">
    <input
      type="number"
      value={val === 0 ? '' : val}
      placeholder="-"
      onFocus={(e) => e.target.select()}
      onChange={(e) =>
        onChange(
          month,
          field,
          e.target.value === '' ? 0 : Number(e.target.value)
        )
      }
      className={`
        w-full bg-transparent text-right py-2 px-2 
        font-mono text-xs transition-all duration-200
        focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:text-blue-700 rounded-md
        placeholder:text-slate-200 hover:bg-slate-50
        ${val !== 0 ? 'text-slate-700 font-bold' : 'text-slate-400'}
        ${noSpinnerClass}
        ${className}
      `}
      inputMode="numeric"
    />
  </div>
);
