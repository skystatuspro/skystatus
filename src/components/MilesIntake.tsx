import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Calendar, 
  CreditCard, 
  RefreshCcw, 
  ShoppingBag, 
  Coins, 
  Tag 
} from 'lucide-react';
import { MilesRecord, ActivityTransaction, FlightRecord } from '../types';
import { generateId } from '../utils/format';
import { useCurrency } from '../lib/CurrencyContext';
import { Tooltip } from './Tooltip';
import { SharedLedger } from './SharedLedger';
import { TransactionLedger } from './TransactionLedger';
import { useViewMode } from '../hooks/useViewMode';
import { useAnalytics } from '../hooks/useAnalytics';
import { SimpleMilesIntake } from './SimpleMilesIntake';

interface MilesIntakeProps {
  milesData: MilesRecord[];
  onUpdate: (data: MilesRecord[]) => void;
  onAddTransaction?: (input: {
    date: string;
    type: 'subscription' | 'amex' | 'other';
    miles: number;
    cost?: number;
    description?: string;
  }) => Promise<boolean>;
  useNewTransactions?: boolean;
  currentMonth?: string;
  // TransactionLedger props (for new system users)
  activityTransactions?: ActivityTransaction[];
  flights?: FlightRecord[];
  onUpdateTransactionCost?: (transactionId: string, cost: number | null) => Promise<boolean>;
}

type MileSource = 'subscription' | 'amex' | 'other';

const sourceOptions: { id: MileSource; label: string; icon: any }[] = [
  { id: 'subscription', label: 'Subscription', icon: RefreshCcw },
  { id: 'amex', label: 'Amex / Bank', icon: CreditCard },
  { id: 'other', label: 'Other / Bonus', icon: ShoppingBag },
];

const InputGroup = ({ label, icon: Icon, children, rightElement, tooltip }: any) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      {tooltip && <Tooltip text={tooltip} />}
    </div>
    <div className="relative group">
      {children}
      {rightElement && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2.5 ' +
  'text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all duration-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white hover:border-slate-300 ' +
  '[color-scheme:light] ' + noSpinnerClass;

export const MilesIntake: React.FC<MilesIntakeProps> = ({ 
  milesData, 
  onUpdate, 
  onAddTransaction,
  useNewTransactions,
  currentMonth,
  activityTransactions,
  flights,
  onUpdateTransactionCost,
}) => {
  const { isSimpleMode } = useViewMode();
  const { trackMiles } = useAnalytics();
  const { symbol: currencySymbol } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    source: 'amex' as MileSource,
    amount: 0,
    cost: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Simple Mode: render simplified miles intake wizard
  if (isSimpleMode) {
    return (
      <SimpleMilesIntake
        milesData={milesData}
        onUpdate={onUpdate}
        onAddTransaction={onAddTransaction}
        useNewTransactions={useNewTransactions}
      />
    );
  }

  const canSubmit = form.date && form.amount > 0 && form.cost >= 0;

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    // Use new transaction system if available
    if (onAddTransaction && useNewTransactions) {
      console.log('[MilesIntake] Using new transaction system');
      const success = await onAddTransaction({
        date: form.date,
        type: form.source,
        miles: Number(form.amount),
        cost: Number(form.cost) || undefined,
        description: `Manual ${form.source} entry`,
      });

      if (success) {
        trackMiles(form.source);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
        setForm({
          date: today,
          source: 'amex',
          amount: 0,
          cost: 0,
        });
      }
      setSubmitting(false);
      return;
    }

    // Legacy system: update MilesRecord array
    console.log('[MilesIntake] Using legacy system');
    const targetMonth = form.date.slice(0, 7);
    const existingIndex = milesData.findIndex(r => r.month === targetMonth);
    let newData = [...milesData];

    if (existingIndex >= 0) {
      const record = { ...newData[existingIndex] };
      switch (form.source) {
        case 'subscription':
          record.miles_subscription += Number(form.amount);
          record.cost_subscription += Number(form.cost);
          break;
        case 'amex':
          record.miles_amex += Number(form.amount);
          record.cost_amex += Number(form.cost);
          break;
        case 'other':
          record.miles_other += Number(form.amount);
          record.cost_other += Number(form.cost);
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

      switch (form.source) {
        case 'subscription':
          newRecord.miles_subscription = Number(form.amount);
          newRecord.cost_subscription = Number(form.cost);
          break;
        case 'amex':
          newRecord.miles_amex = Number(form.amount);
          newRecord.cost_amex = Number(form.cost);
          break;
        case 'other':
          newRecord.miles_other = Number(form.amount);
          newRecord.cost_other = Number(form.cost);
          break;
      }
      newData.push(newRecord);
    }

    onUpdate(newData);
    
    // Track miles added
    trackMiles(form.source);
    
    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
    
    // Reset form
    setForm({
      date: today,
      source: 'amex',
      amount: 0,
      cost: 0,
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Intake Form */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200/50">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Wallet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Add Miles
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Record non-flight accumulation (Amex, Subs, etc.)
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Engine Active
          </div>
        </div>

        {/* Main Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4">
                <InputGroup label="Transaction Date" icon={Calendar}>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => handleChange('date', e.target.value)}
                    className={`${inputBase} cursor-pointer`}
                  />
                </InputGroup>
              </div>

              <div className="md:col-span-8">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard size={12} /> Source Bucket
                  </label>
                  <Tooltip text="Categorize your miles to track Acquisition Cost per source correctly." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {sourceOptions.map((opt) => {
                    const isActive = form.source === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChange('source', opt.id)}
                        className={`
                          flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 text-xs font-bold
                          ${isActive 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                        `}
                      >
                        <Icon size={14} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Miles Earned" icon={Coins} rightElement="Miles" tooltip="The amount of miles credited to your account.">
                <input 
                  type="number"
                  className={`${inputBase} text-right font-bold text-indigo-600 pr-16`}
                  placeholder="0"
                  value={form.amount || ''}
                  onChange={e => handleChange('amount', Number(e.target.value))}
                />
              </InputGroup>

              <InputGroup label="Total Cost" icon={Tag} rightElement={currencySymbol} tooltip="What did you pay for these miles? (e.g. monthly fee, surcharges).">
                <input 
                  type="number"
                  className={`${inputBase} text-right pr-12`}
                  placeholder="0.00"
                  step="0.01"
                  value={form.cost || ''}
                  onChange={e => handleChange('cost', Number(e.target.value))}
                />
              </InputGroup>
            </div>

            {/* Computed Info */}
            {form.amount > 0 && form.cost > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 border-dashed">
                <span>Acquisition CPM:</span>
                <span className="font-bold text-slate-800">{currencySymbol}{(form.cost / form.amount).toFixed(5)}</span>
                <span>/ mile</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 relative">
              {/* Success Toast */}
              {showSuccess && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                  ✓ Miles added to ledger!
                </div>
              )}
              
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`
                  w-full py-4 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-200
                  ${canSubmit 
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}
                `}
              >
                {submitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Plus size={18} strokeWidth={3} />
                    <span>Add Transaction to Ledger</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-4">
                Updates specific source buckets in the Miles Engine ledger.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Ledger - Show TransactionLedger for new system, SharedLedger for legacy */}
      {useNewTransactions && activityTransactions && onUpdateTransactionCost ? (
        <TransactionLedger
          transactions={activityTransactions}
          flights={flights}
          onUpdateCost={onUpdateTransactionCost}
          title="Miles Ledger"
          showMissingCostFilter={true}
        />
      ) : (
        <SharedLedger
          data={milesData}
          onUpdate={onUpdate}
          currentMonth={currentMonth}
          variant="compact"
          showQuickStats={false}
          title="Miles Ledger"
          subtitle="Overview of accumulated miles and costs per month."
        />
      )}
    </div>
  );
};
