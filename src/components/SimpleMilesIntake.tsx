// src/components/SimpleMilesIntake.tsx
// Simplified Miles intake wizard for Simple Mode

import React, { useState, useMemo } from 'react';
import { MilesRecord } from '../types';
import { generateId, formatNumber } from '../utils/format';
import { useCurrency } from '../lib/CurrencyContext';
import { useViewMode } from '../hooks/useViewMode';
import {
  Wallet,
  CreditCard,
  RefreshCcw,
  Gift,
  Calendar,
  Coins,
  Tag,
  ChevronRight,
  ChevronLeft,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface SimpleMilesIntakeProps {
  milesData: MilesRecord[];
  onUpdate: (data: MilesRecord[]) => void;
}

type MileSource = 'subscription' | 'amex' | 'other';

const sourceOptions: { id: MileSource; label: string; description: string; icon: any; color: string }[] = [
  { 
    id: 'subscription', 
    label: 'Subscription', 
    description: 'Flying Blue subscription miles',
    icon: RefreshCcw, 
    color: 'indigo' 
  },
  { 
    id: 'amex', 
    label: 'Credit Card', 
    description: 'Amex, bank rewards, transfers',
    icon: CreditCard, 
    color: 'slate' 
  },
  { 
    id: 'other', 
    label: 'Bonus / Other', 
    description: 'Promotions, gifts, partner offers',
    icon: Gift, 
    color: 'amber' 
  },
];

export const SimpleMilesIntake: React.FC<SimpleMilesIntakeProps> = ({
  milesData,
  onUpdate,
}) => {
  const { setViewMode } = useViewMode();
  const { symbol: currencySymbol } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);

  // Form state
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<MileSource>('amex');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Recent ledger entries
  const recentEntries = useMemo(() => {
    return [...milesData]
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 5)
      .map(record => ({
        month: record.month,
        subscription: record.miles_subscription,
        amex: record.miles_amex,
        other: record.miles_other,
        total: record.miles_subscription + record.miles_amex + record.miles_other,
      }))
      .filter(r => r.total > 0);
  }, [milesData]);

  // Validation
  const step1Valid = source;
  const step2Valid = amount > 0 && date;
  const canSubmit = step1Valid && step2Valid;

  // Calculate CPM
  const cpm = amount > 0 && cost > 0 ? (cost / amount) : 0;

  // Handle submit
  const handleSubmit = () => {
    if (!canSubmit) return;

    const targetMonth = date.slice(0, 7);
    const existingIndex = milesData.findIndex(r => r.month === targetMonth);
    let newData = [...milesData];

    if (existingIndex >= 0) {
      const record = { ...newData[existingIndex] };
      switch (source) {
        case 'subscription':
          record.miles_subscription += Number(amount);
          record.cost_subscription += Number(cost);
          break;
        case 'amex':
          record.miles_amex += Number(amount);
          record.cost_amex += Number(cost);
          break;
        case 'other':
          record.miles_other += Number(amount);
          record.cost_other += Number(cost);
          break;
      }
      newData[existingIndex] = record;
    } else {
      const newRecord: MilesRecord = {
        id: generateId(),
        month: targetMonth,
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

      switch (source) {
        case 'subscription':
          newRecord.miles_subscription = Number(amount);
          newRecord.cost_subscription = Number(cost);
          break;
        case 'amex':
          newRecord.miles_amex = Number(amount);
          newRecord.cost_amex = Number(cost);
          break;
        case 'other':
          newRecord.miles_other = Number(amount);
          newRecord.cost_other = Number(cost);
          break;
      }
      newData.push(newRecord);
    }

    onUpdate(newData);
    setShowSuccess(true);

    // Reset after success
    setTimeout(() => {
      setShowSuccess(false);
      setAmount(0);
      setCost(0);
      setStep(1);
    }, 2000);
  };

  const selectedSource = sourceOptions.find(s => s.id === source)!;

  // Format month for display
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-emerald-50 rounded-3xl p-12 text-center border border-emerald-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Miles Added!</h2>
          <p className="text-emerald-700">
            +{formatNumber(amount)} miles from {selectedSource.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Add Miles</h2>
        <p className="text-slate-500 text-sm">Record miles from subscriptions, cards & bonuses</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step
                  ? 'bg-indigo-600 text-white'
                  : s < step
                  ? 'bg-emerald-100 text-emerald-600 cursor-pointer hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s < step ? <Check size={16} /> : s}
            </button>
            {s < 3 && (
              <div className={`flex-1 h-1 rounded ${s < step ? 'bg-emerald-200' : 'bg-slate-100'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Source Selection */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5">
              <Wallet size={18} className="text-indigo-500" />
              Where did you earn these miles?
            </h3>

            <div className="space-y-3">
              {sourceOptions.map((opt) => {
                const isActive = source === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSource(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${
                      isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500">{opt.description}</p>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              step1Valid
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Continue
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Step 2: Amount & Cost */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Coins size={18} className="text-indigo-500" />
              Transaction details
            </h3>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <Calendar size={14} className="inline mr-1.5" />
                Transaction date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 
                         focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Miles amount */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <Sparkles size={14} className="inline mr-1.5" />
                Miles earned
              </label>
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-mono text-lg font-bold
                         focus:border-indigo-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <Tag size={14} className="inline mr-1.5" />
                Cost (optional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={cost || ''}
                  onChange={(e) => setCost(Number(e.target.value))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-mono
                           focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {currencySymbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Subscription fee, transfer cost, etc.
              </p>
            </div>

            {/* CPM preview */}
            {cpm > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-xs text-slate-500">Acquisition cost</p>
                <p className="text-lg font-bold text-slate-900">
                  {currencySymbol}{cpm.toFixed(4)} <span className="text-sm font-normal text-slate-500">/ mile</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 rounded-xl font-bold border-2 border-slate-200 text-slate-600 
                       hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                step2Valid
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Review
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Summary card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-indigo-200 text-sm font-medium">Miles to add</span>
              <span className="text-3xl font-black">+{formatNumber(amount)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm bg-white/10 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  {React.createElement(selectedSource.icon, { size: 14 })}
                  {selectedSource.label}
                </span>
                <span className="font-medium">{formatMonth(date.slice(0, 7))}</span>
              </div>
              
              {cost > 0 && (
                <div className="flex items-center justify-between text-sm bg-white/10 rounded-lg px-3 py-2">
                  <span>Cost</span>
                  <span className="font-bold">{currencySymbol}{cost.toFixed(2)}</span>
                </div>
              )}

              {cpm > 0 && (
                <div className="flex items-center justify-between text-sm bg-emerald-500/20 rounded-lg px-3 py-2">
                  <span>Acquisition CPM</span>
                  <span className="font-bold">{currencySymbol}{cpm.toFixed(4)}/mi</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-4 rounded-xl font-bold border-2 border-slate-200 text-slate-600 
                       hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                       bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
            >
              <Check size={20} />
              Add Miles
            </button>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && step === 1 && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentEntries.map((entry) => (
              <div key={entry.month} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-600">{formatMonth(entry.month)}</span>
                <span className="font-bold text-emerald-600">+{formatNumber(entry.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Switch to Full View */}
      <div className="text-center mt-8">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Need to edit entries or see detailed ledger? Switch to Full View →
        </button>
      </div>
    </div>
  );
};
