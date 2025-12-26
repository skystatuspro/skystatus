// src/components/TransactionLedger.tsx
// Transaction-based ledger with month drill-down and inline cost editing
// Replaces SharedLedger for users on the new transaction system
// v2.6.1 - Added flight totals, improved alignment, UX improvements

import React, { useState, useMemo, useCallback } from 'react';
import { ActivityTransaction, FlightRecord } from '../types';
import { formatNumber } from '../utils/format';
import { useCurrency } from '../lib/CurrencyContext';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Wallet,
  Plane,
  Plus,
  Pencil,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

// ============================================================================
// TYPES
// ============================================================================

interface TransactionLedgerProps {
  transactions: ActivityTransaction[];
  flights?: FlightRecord[];  // Optional: for flight totals per month
  onUpdateCost: (transactionId: string, cost: number | null) => Promise<boolean>;
  title?: string;
  showMissingCostFilter?: boolean;
}

interface MonthGroup {
  month: string; // YYYY-MM
  transactions: ActivityTransaction[];
  stats: MonthStats;
}

interface MonthStats {
  subscription: number;
  amex: number;
  flights: number;
  other: number;
  debit: number;
  totalCost: number;
  missingCostCount: number;
  transactionCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  subscription: 'bg-indigo-100 text-indigo-700',
  amex: 'bg-slate-200 text-slate-700',
  amex_bonus: 'bg-slate-200 text-slate-700',
  hotel: 'bg-amber-100 text-amber-700',
  shopping: 'bg-pink-100 text-pink-700',
  partner: 'bg-purple-100 text-purple-700',
  transfer_in: 'bg-green-100 text-green-700',
  transfer_out: 'bg-orange-100 text-orange-700',
  redemption: 'bg-red-100 text-red-700',
  donation: 'bg-rose-100 text-rose-700',
  adjustment: 'bg-cyan-100 text-cyan-700',
  car_rental: 'bg-teal-100 text-teal-700',
  expiry: 'bg-gray-100 text-gray-700',
  status_extension: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-600',
};

const TYPE_LABELS: Record<string, string> = {
  subscription: 'SUB',
  amex: 'CARD',
  amex_bonus: 'CARD',
  hotel: 'HOTEL',
  shopping: 'SHOP',
  partner: 'PARTNER',
  transfer_in: 'IN',
  transfer_out: 'OUT',
  redemption: 'REDEEM',
  donation: 'DONATE',
  adjustment: 'ADJ',
  car_rental: 'CAR',
  expiry: 'EXPIRE',
  status_extension: 'STATUS',
  other: 'OTHER',
};

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupTransactionsByMonth(
  transactions: ActivityTransaction[],
  flights: FlightRecord[] = []
): MonthGroup[] {
  // Group transactions by month
  const groups: Record<string, ActivityTransaction[]> = {};
  
  transactions.forEach(tx => {
    const month = tx.date.slice(0, 7); // YYYY-MM
    if (!groups[month]) groups[month] = [];
    groups[month].push(tx);
  });

  // Also create groups for months that only have flights
  flights.forEach(f => {
    const month = f.date.slice(0, 7);
    if (!groups[month]) groups[month] = [];
  });

  // Group flights by month for stats calculation
  const flightsByMonth: Record<string, FlightRecord[]> = {};
  flights.forEach(f => {
    const month = f.date.slice(0, 7);
    if (!flightsByMonth[month]) flightsByMonth[month] = [];
    flightsByMonth[month].push(f);
  });

  return Object.entries(groups)
    .map(([month, txs]) => ({
      month,
      transactions: txs.sort((a, b) => b.date.localeCompare(a.date)), // Newest first within month
      stats: calculateMonthStats(txs, flightsByMonth[month] || []),
    }))
    .sort((a, b) => b.month.localeCompare(a.month)); // Newest months first
}

function calculateMonthStats(
  transactions: ActivityTransaction[],
  flights: FlightRecord[] = []
): MonthStats {
  const stats: MonthStats = {
    subscription: 0,
    amex: 0,
    flights: 0,
    other: 0,
    debit: 0,
    totalCost: 0,
    missingCostCount: 0,
    transactionCount: transactions.length,
  };

  // Calculate flight miles from FlightRecord[]
  stats.flights = flights.reduce((sum, f) => sum + (f.earnedMiles || 0), 0);

  // Calculate transaction stats
  transactions.forEach(tx => {
    const miles = tx.miles;
    
    // Categorize miles
    if (miles < 0) {
      stats.debit += miles;
    } else {
      switch (tx.type) {
        case 'subscription':
          stats.subscription += miles;
          break;
        case 'amex':
        case 'amex_bonus':
          stats.amex += miles;
          break;
        default:
          stats.other += miles;
      }
    }

    // Track costs
    if (tx.cost !== null && tx.cost !== undefined) {
      stats.totalCost += tx.cost;
    } else {
      stats.missingCostCount++;
    }
  });

  return stats;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDate(dateStr: string): string {
  return dateStr.slice(5).replace('-', '/'); // Returns MM/DD
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TransactionRowProps {
  transaction: ActivityTransaction;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onMarkFree: () => void;
  currencySymbol: string;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onMarkFree,
  currencySymbol,
}) => {
  const typeColor = TYPE_COLORS[transaction.type] || TYPE_COLORS.other;
  const typeLabel = TYPE_LABELS[transaction.type] || 'OTHER';
  const hasCost = transaction.cost !== null && transaction.cost !== undefined;

  return (
    <div className="px-4 py-2.5 flex items-center gap-2 bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
      {/* Date */}
      <div className="w-16 text-xs text-slate-400 font-mono shrink-0">
        {formatDate(transaction.date)}
      </div>

      {/* Type Badge */}
      <div className={`w-16 shrink-0`}>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0 text-sm text-slate-600 truncate" title={transaction.description}>
        {transaction.description}
      </div>

      {/* Miles */}
      <div className={`w-24 text-right font-mono text-sm shrink-0 ${transaction.miles < 0 ? 'text-red-500' : 'text-slate-700'}`}>
        {transaction.miles < 0 ? '' : '+'}{formatNumber(transaction.miles)}
      </div>

      {/* Cost - Editable */}
      <div className="w-32 shrink-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className={`w-16 px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${noSpinnerClass}`}
              placeholder="Empty = remove"
              step="0.01"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <button
              onClick={onSaveEdit}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save (Enter)"
            >
              <Check size={14} />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
              title="Cancel (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        ) : hasCost ? (
          <button
            onClick={onStartEdit}
            className="w-full text-right px-2 py-1 rounded text-xs font-mono text-slate-600 hover:bg-slate-100 transition-all group flex items-center justify-end gap-1"
            title="Click to edit cost"
          >
            <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            <span>{currencySymbol}{transaction.cost!.toFixed(2)}</span>
          </button>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onStartEdit}
              className="px-2 py-1 rounded text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center gap-1"
              title="Enter custom cost"
            >
              <Plus size={12} className="opacity-60" />
              <span>cost</span>
            </button>
            <button
              onClick={onMarkFree}
              className="px-2 py-1 rounded text-xs font-mono text-emerald-600 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-all"
              title="Mark as free (no cost)"
            >
              {currencySymbol}0
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface MonthSectionProps {
  group: MonthGroup;
  isExpanded: boolean;
  onToggle: () => void;
  editingId: string | null;
  editValue: string;
  onStartEdit: (id: string, currentCost: number | null) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onMarkFree: (id: string) => void;
  currencySymbol: string;
  isCurrentMonth: boolean;
}

const MonthSection: React.FC<MonthSectionProps> = ({
  group,
  isExpanded,
  onToggle,
  editingId,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onMarkFree,
  currencySymbol,
  isCurrentMonth,
}) => {
  const { stats } = group;

  // Helper to format stat value
  const formatStat = (value: number, isNegative = false) => {
    if (value === 0) return <span className="text-slate-300">-</span>;
    return (
      <span className={`font-mono text-sm ${isNegative ? 'text-red-500' : 'text-slate-700'}`}>
        {formatNumber(value)}
      </span>
    );
  };

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      {/* Month Header Row */}
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${
          isCurrentMonth ? 'bg-blue-50/50' : ''
        }`}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 shrink-0">
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </div>

        {/* Month Name */}
        <div className="w-24 shrink-0 flex items-center gap-2">
          <span className="font-semibold text-slate-800">{formatMonth(group.month)}</span>
          {isCurrentMonth && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded">NOW</span>
          )}
        </div>

        {/* Stats Grid - Fixed widths for alignment */}
        <div className="flex-1 grid grid-cols-5 gap-4">
          <div className="text-right">{formatStat(stats.subscription)}</div>
          <div className="text-right">{formatStat(stats.amex)}</div>
          <div className="text-right">
            {stats.flights > 0 ? (
              <span className="font-mono text-sm text-sky-600 flex items-center justify-end gap-1">
                <Plane size={12} className="opacity-60" />
                {formatNumber(stats.flights)}
              </span>
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </div>
          <div className="text-right">{formatStat(stats.other)}</div>
          <div className="text-right">{formatStat(stats.debit, true)}</div>
        </div>

        {/* Cost */}
        <div className="w-20 text-right shrink-0">
          {stats.totalCost > 0 ? (
            <span className="font-mono text-sm text-emerald-600">
              {currencySymbol}{stats.totalCost.toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </div>

        {/* Missing Cost Badge */}
        <div className="w-16 text-right shrink-0">
          {stats.missingCostCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              <AlertCircle size={10} />
              {stats.missingCostCount}
            </span>
          )}
        </div>
      </button>

      {/* Expanded Transaction List */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-200 flex items-center justify-between">
            <span>{group.transactions.length} Transaction{group.transactions.length !== 1 ? 's' : ''}</span>
            {stats.flights > 0 && (
              <span className="text-sky-500 flex items-center gap-1">
                <Plane size={10} />
                {formatNumber(stats.flights)} flight miles (see Flight Ledger)
              </span>
            )}
          </div>
          {group.transactions.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {group.transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  isEditing={editingId === tx.id}
                  editValue={editValue}
                  onStartEdit={() => onStartEdit(tx.id, tx.cost ?? null)}
                  onSaveEdit={() => onSaveEdit(tx.id)}
                  onCancelEdit={onCancelEdit}
                  onEditValueChange={onEditValueChange}
                  onMarkFree={() => onMarkFree(tx.id)}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              <Plane size={20} className="mx-auto mb-2 opacity-40" />
              Only flight miles this month
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  flights = [],
  onUpdateCost,
  title = 'Transaction Ledger',
  showMissingCostFilter = true,
}) => {
  const { symbol: currencySymbol } = useCurrency();
  
  // State
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [filterMissingCost, setFilterMissingCost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Current month for highlighting
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Group transactions by month (including flight totals)
  const monthGroups = useMemo(() => {
    let filtered = transactions;
    
    if (filterMissingCost) {
      filtered = transactions.filter(tx => tx.cost === null || tx.cost === undefined);
    }
    
    return groupTransactionsByMonth(filtered, flights);
  }, [transactions, flights, filterMissingCost]);

  // Total missing cost count
  const totalMissingCost = useMemo(() => {
    return transactions.filter(tx => tx.cost === null || tx.cost === undefined).length;
  }, [transactions]);

  // Total cost
  const totalCost = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + (tx.cost || 0), 0);
  }, [transactions]);

  // Handlers
  const toggleMonth = useCallback((month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((id: string, currentCost: number | null) => {
    setEditingId(id);
    setEditValue(currentCost?.toString() || '');
  }, []);

  const handleSaveEdit = useCallback(async (id: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    const cost = editValue === '' ? null : parseFloat(editValue);
    
    try {
      const success = await onUpdateCost(id, cost);
      if (success) {
        setEditingId(null);
        setEditValue('');
      }
    } finally {
      setIsSaving(false);
    }
  }, [editValue, onUpdateCost, isSaving]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleMarkFree = useCallback(async (id: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onUpdateCost(id, 0);
    } finally {
      setIsSaving(false);
    }
  }, [onUpdateCost, isSaving]);

  // Auto-expand months with missing costs when filter is active
  React.useEffect(() => {
    if (filterMissingCost) {
      const monthsWithMissing = monthGroups
        .filter(g => g.stats.missingCostCount > 0)
        .map(g => g.month);
      setExpandedMonths(new Set(monthsWithMissing));
    }
  }, [filterMissingCost, monthGroups]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl">
              <Wallet size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{title}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{transactions.length} transactions</span>
                <span>•</span>
                <span>Total cost: {currencySymbol}{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Missing Cost Filter Button */}
          {showMissingCostFilter && totalMissingCost > 0 && (
            <button
              onClick={() => setFilterMissingCost(!filterMissingCost)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filterMissingCost
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertCircle size={16} />
              {totalMissingCost} missing cost{totalMissingCost !== 1 ? 's' : ''}
              {filterMissingCost && <X size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        <div className="w-5 shrink-0"></div>
        <div className="w-24 shrink-0">Month</div>
        <div className="flex-1 grid grid-cols-5 gap-4 text-right">
          <span>Sub</span>
          <span>Card</span>
          <span className="text-sky-500 flex items-center justify-end gap-1">
            <Plane size={10} />
            Flights
          </span>
          <span>Other</span>
          <span className="text-red-400">Debit</span>
        </div>
        <div className="w-20 text-right shrink-0 text-emerald-500">Cost</div>
        <div className="w-16 text-right shrink-0">
          <Tooltip text="Number of transactions without cost data" />
        </div>
      </div>

      {/* Month Sections */}
      <div className="max-h-[600px] overflow-y-auto">
        {monthGroups.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400">
            {filterMissingCost
              ? 'All transactions have costs assigned! 🎉'
              : 'No transactions found'}
          </div>
        ) : (
          monthGroups.map((group) => (
            <MonthSection
              key={group.month}
              group={group}
              isExpanded={expandedMonths.has(group.month)}
              onToggle={() => toggleMonth(group.month)}
              editingId={editingId}
              editValue={editValue}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditValueChange={setEditValue}
              onMarkFree={handleMarkFree}
              currencySymbol={currencySymbol}
              isCurrentMonth={group.month === currentMonth}
            />
          ))
        )}
      </div>

      {/* Footer with totals when filtered */}
      {filterMissingCost && monthGroups.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 text-sm text-amber-700">
          Showing {monthGroups.reduce((sum, g) => sum + g.transactions.length, 0)} transactions without cost across {monthGroups.length} months
        </div>
      )}
    </div>
  );
};

export default TransactionLedger;
