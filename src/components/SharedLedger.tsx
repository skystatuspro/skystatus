import React, { useState, useMemo } from 'react';
import { MilesRecord } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { 
  Trash2, 
  Filter, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface SharedLedgerProps {
  data: MilesRecord[];
  onUpdate: (data: MilesRecord[]) => void;
  currentMonth?: string; // Voor highlighting en sectie-splits
  variant?: 'compact' | 'full'; // compact = Add Miles, full = Miles Engine
  showQuickStats?: boolean;
  showAddButton?: boolean;
  onAddMonth?: () => void;
  title?: string;
  subtitle?: string;
}

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// --- Ledger Row Data Type ---
interface LedgerRowData extends MilesRecord {
  totalEarned: number;
  net: number;
  runningBalance: number;
  prevBalance: number;
  totalCost: number;
}

// --- Section Header Component ---
const SectionHeader = ({ 
  title, 
  count, 
  totalMiles, 
  isExpanded, 
  onToggle,
  variant = 'default'
}: { 
  title: string; 
  count: number; 
  totalMiles: number;
  isExpanded: boolean; 
  onToggle: () => void;
  variant?: 'default' | 'projected' | 'past';
}) => {
  const bgColor = variant === 'projected' ? 'bg-indigo-50/50 hover:bg-indigo-50' : 
                  variant === 'past' ? 'bg-slate-50/50 hover:bg-slate-100/50' : 
                  'bg-slate-50 hover:bg-slate-100';
  
  return (
    <tr 
      className={`${bgColor} cursor-pointer transition-colors`}
      onClick={onToggle}
    >
      <td colSpan={8} className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            <span className="text-[11px] font-bold text-slate-600">{title}</span>
            <span className="text-[10px] text-slate-400">({count} months)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-medium ${totalMiles >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {totalMiles >= 0 ? '+' : ''}{formatNumber(totalMiles)} miles
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
};

// --- Ledger Row Component ---
const LedgerRow = ({ 
  row, 
  isProjected, 
  isCurrent, 
  isEditing,
  editForm,
  setEditForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  showBalance,
  compact
}: {
  row: LedgerRowData;
  isProjected: boolean;
  isCurrent: boolean;
  isEditing: boolean;
  editForm: Partial<MilesRecord>;
  setEditForm: (form: Partial<MilesRecord>) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  showBalance: boolean;
  compact: boolean;
}) => {
  const delta = row.net;
  const deltaPercent = row.prevBalance && row.prevBalance > 0 ? ((delta / row.prevBalance) * 100) : 0;
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50/50">
        <td className="px-3 py-2">
          <input type="month" className={`w-full p-1.5 border rounded-lg text-[11px] ${noSpinnerClass}`} value={editForm.month} onChange={e => setEditForm({...editForm, month: e.target.value})} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className={`w-full p-1.5 border rounded-lg text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_subscription} onChange={e => setEditForm({...editForm, miles_subscription: Number(e.target.value)})} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className={`w-full p-1.5 border rounded-lg text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_amex} onChange={e => setEditForm({...editForm, miles_amex: Number(e.target.value)})} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className={`w-full p-1.5 border rounded-lg text-[11px] text-right bg-slate-50 text-slate-400 ${noSpinnerClass}`} value={editForm.miles_flight} disabled title="Edit via Flight Engine" />
        </td>
        <td className="px-3 py-2">
          <input type="number" className={`w-full p-1.5 border rounded-lg text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_other} onChange={e => setEditForm({...editForm, miles_other: Number(e.target.value)})} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className={`w-full p-1.5 border border-red-200 rounded-lg text-[11px] text-right text-red-600 font-bold ${noSpinnerClass}`} value={editForm.miles_debit} onChange={e => setEditForm({...editForm, miles_debit: Number(e.target.value)})} />
        </td>
        {showBalance && <td className="px-3 py-2" />}
        <td className="px-3 py-2 text-center">
          <div className="flex justify-center gap-1">
            <button onClick={onSaveEdit} className="px-2 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold hover:bg-emerald-600"><Save size={12} /></button>
            <button onClick={onCancelEdit} className="px-2 py-1 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold hover:bg-slate-300"><X size={12} /></button>
          </div>
        </td>
      </tr>
    );
  }

  const rowPadding = compact ? 'py-2' : 'py-2.5';

  return (
    <tr className={`group hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-gradient-to-r from-blue-50/80 to-transparent' : ''}`}>
      <td className={`px-3 ${rowPadding}`}>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[11px] ${isProjected ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>{row.month}</span>
          {isCurrent && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-bold uppercase rounded">Current</span>}
          {isProjected && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[8px] font-bold uppercase rounded">Proj</span>}
        </div>
      </td>
      <td className={`px-3 ${rowPadding} text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-indigo-600/80'}`}>
        {row.miles_subscription > 0 ? formatNumber(row.miles_subscription) : <span className="text-slate-300">-</span>}
      </td>
      <td className={`px-3 ${rowPadding} text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-blue-600/80'}`}>
        {row.miles_amex > 0 ? formatNumber(row.miles_amex) : <span className="text-slate-300">-</span>}
      </td>
      <td className={`px-3 ${rowPadding} text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-slate-600'}`}>
        {row.miles_flight > 0 ? formatNumber(row.miles_flight) : <span className="text-slate-300">-</span>}
      </td>
      <td className={`px-3 ${rowPadding} text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-slate-600'}`}>
        {row.miles_other > 0 ? formatNumber(row.miles_other) : <span className="text-slate-300">-</span>}
      </td>
      <td className={`px-3 ${rowPadding} text-right font-mono text-[11px]`}>
        {row.miles_debit > 0 ? (
          <span className="text-red-500 font-medium">-{formatNumber(row.miles_debit)}</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      {showBalance && (
        <td className={`px-3 ${rowPadding}`}>
          <div className="flex items-center justify-end gap-2">
            <span className={`font-mono font-bold text-[11px] ${isProjected ? 'text-blue-400' : 'text-blue-600'}`}>
              {formatNumber(row.runningBalance)}
            </span>
            {delta !== 0 && !isProjected && deltaPercent > 0 && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${delta > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                +{deltaPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </td>
      )}
      <td className={`px-3 ${rowPadding} text-center`}>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
          <button onClick={onStartEdit} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-blue-600 transition-colors"><Filter size={12} /></button>
          <button onClick={onDelete} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
        </div>
      </td>
    </tr>
  );
};

// --- Main Shared Ledger Component ---
export const SharedLedger: React.FC<SharedLedgerProps> = ({
  data,
  onUpdate,
  currentMonth,
  variant = 'full',
  showQuickStats = true,
  showAddButton = false,
  onAddMonth,
  title = 'Transaction Ledger',
  subtitle = 'Detailed record of all accumulation and redemption.'
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MilesRecord>>({});
  const [showEarlierMonths, setShowEarlierMonths] = useState(false);
  const [showProjectedMonths, setShowProjectedMonths] = useState(false);

  const isCompact = variant === 'compact';
  const showBalance = variant === 'full';
  
  // Use current month or default to today
  const effectiveCurrentMonth = currentMonth || new Date().toISOString().slice(0, 7);

  // Process ledger data with running balance
  const ledgerData = useMemo(() => {
    let runningBalance = 0;
    let prevBalance = 0;
    
    const allRows = data
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r): LedgerRowData => {
        const totalEarned = r.miles_subscription + r.miles_amex + r.miles_flight + r.miles_other;
        const totalCost = r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other;
        const net = totalEarned - r.miles_debit;
        prevBalance = runningBalance;
        runningBalance += net;
        
        return {
          ...r,
          totalEarned,
          totalCost,
          net,
          runningBalance,
          prevBalance,
        };
      });

    // Split by current month
    const currentMonthNum = parseInt(effectiveCurrentMonth.slice(5, 7));
    const currentYear = effectiveCurrentMonth.slice(0, 4);
    
    const currentRow = allRows.find(r => r.month === effectiveCurrentMonth);
    
    // Recent: 2 months before current
    const recentMonths = allRows.filter(r => {
      if (r.month >= effectiveCurrentMonth) return false;
      const rowYear = r.month.slice(0, 4);
      const rowMonthNum = parseInt(r.month.slice(5, 7));
      if (rowYear === currentYear) {
        return currentMonthNum - rowMonthNum <= 2 && currentMonthNum - rowMonthNum > 0;
      }
      // Handle year boundary
      if (rowYear === String(parseInt(currentYear) - 1) && currentMonthNum <= 2) {
        const monthsBack = currentMonthNum + (12 - rowMonthNum);
        return monthsBack <= 2;
      }
      return false;
    }).slice(-2);
    
    // Earlier: everything before recent (actual)
    const earlierMonths = allRows.filter(r => {
      if (r.month >= effectiveCurrentMonth) return false;
      return !recentMonths.includes(r);
    });
    
    // Projected: everything after current
    const projectedMonths = allRows.filter(r => r.month > effectiveCurrentMonth);
    
    // Totals for collapsed sections
    const earlierTotal = earlierMonths.reduce((sum, r) => sum + r.net, 0);
    const projectedTotal = projectedMonths.reduce((sum, r) => sum + r.net, 0);

    return {
      currentRow,
      recentMonths,
      earlierMonths,
      projectedMonths,
      earlierTotal,
      projectedTotal,
      allRows,
    };
  }, [data, effectiveCurrentMonth]);

  // Quick stats
  const quickStats = useMemo(() => {
    const actualMonths = data.filter(r => r.month <= effectiveCurrentMonth);
    const monthlyEarnings = actualMonths.map(r => 
      r.miles_subscription + r.miles_amex + r.miles_flight + r.miles_other - r.miles_debit
    );
    
    const avgMonthly = monthlyEarnings.length > 0 ? 
      monthlyEarnings.reduce((a, b) => a + b, 0) / monthlyEarnings.length : 0;
    const bestMonth = Math.max(...monthlyEarnings, 0);
    const positiveStreak = [...monthlyEarnings].reverse().findIndex(e => e <= 0);
    
    return {
      avgMonthly,
      bestMonth,
      positiveStreak: positiveStreak === -1 ? monthlyEarnings.length : positiveStreak,
    };
  }, [data, effectiveCurrentMonth]);

  // Edit handlers
  const handleDelete = (id: string) => {
    if (window.confirm('Delete this month record?')) {
      onUpdate(data.filter((r) => r.id !== id));
    }
  };
  
  const startEdit = (record: MilesRecord) => { 
    setEditingId(record.id); 
    setEditForm({ ...record }); 
  };
  
  const cancelEdit = () => { 
    setEditingId(null); 
    setEditForm({}); 
  };
  
  const saveEdit = () => { 
    onUpdate(data.map((r) => r.id === editingId ? ({ ...r, ...editForm } as MilesRecord) : r)); 
    setEditingId(null); 
  };

  // For compact variant, show simple list (no collapsing)
  if (isCompact) {
    const sortedData = [...ledgerData.allRows].sort((a, b) => b.month.localeCompare(a.month));
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
          <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
            <Filter size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-wider border-b border-slate-100 sticky top-0">
              <tr>
                <th className="px-3 py-2.5 w-28">Month</th>
                <th className="px-3 py-2.5 text-right text-indigo-600/80">Sub</th>
                <th className="px-3 py-2.5 text-right text-blue-600/80">Amex</th>
                <th className="px-3 py-2.5 text-right">Flights</th>
                <th className="px-3 py-2.5 text-right">Other</th>
                <th className="px-3 py-2.5 text-right text-red-400">Debit</th>
                <th className="px-3 py-2.5 text-right">Cost</th>
                <th className="px-3 py-2.5 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedData.map((row) => {
                const isEditing = editingId === row.id;
                const isCurrent = row.month === effectiveCurrentMonth;
                const isProjected = row.month > effectiveCurrentMonth;

                if (isEditing) {
                  return (
                    <tr key={row.id} className="bg-blue-50/50">
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700">{row.month}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className={`w-full p-1 border rounded text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_subscription} onChange={e => setEditForm({...editForm, miles_subscription: Number(e.target.value)})} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className={`w-full p-1 border rounded text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_amex} onChange={e => setEditForm({...editForm, miles_amex: Number(e.target.value)})} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className={`w-full p-1 border rounded text-[11px] text-right bg-slate-50 text-slate-400 ${noSpinnerClass}`} value={editForm.miles_flight} disabled />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className={`w-full p-1 border rounded text-[11px] text-right ${noSpinnerClass}`} value={editForm.miles_other} onChange={e => setEditForm({...editForm, miles_other: Number(e.target.value)})} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className={`w-full p-1 border border-red-200 rounded text-[11px] text-right text-red-600 ${noSpinnerClass}`} value={editForm.miles_debit} onChange={e => setEditForm({...editForm, miles_debit: Number(e.target.value)})} />
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-400 text-right">Auto</td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={12} /></button>
                          <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.id} className={`group hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[11px] ${isProjected ? 'text-slate-400' : 'font-medium text-slate-700'}`}>{row.month}</span>
                        {isCurrent && <span className="px-1 py-0.5 bg-blue-500 text-white text-[7px] font-bold uppercase rounded">Now</span>}
                        {isProjected && <span className="px-1 py-0.5 bg-slate-200 text-slate-500 text-[7px] font-bold uppercase rounded">Proj</span>}
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-indigo-600/80'}`}>
                      {row.miles_subscription > 0 ? formatNumber(row.miles_subscription) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-blue-600/80'}`}>
                      {row.miles_amex > 0 ? formatNumber(row.miles_amex) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                      {row.miles_flight > 0 ? formatNumber(row.miles_flight) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-[11px] ${isProjected ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                      {row.miles_other > 0 ? formatNumber(row.miles_other) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px]">
                      {row.miles_debit > 0 ? (
                        <span className="text-red-500 font-medium">-{formatNumber(row.miles_debit)}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[10px] text-slate-500">
                      {formatCurrency(row.totalCost)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                        <button onClick={() => startEdit(row)} className="p-1 hover:bg-white rounded text-slate-400 hover:text-blue-600"><Filter size={11} /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-white rounded text-slate-400 hover:text-red-600"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Full variant with collapsible sections
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            {title}
            <Tooltip text="Detailed record of accumulated (inflow) and spent (outflow) miles per month." />
          </h3>
          {showQuickStats && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-400">
                Avg: <span className="font-bold text-slate-600">{formatNumber(Math.round(quickStats.avgMonthly))}/mo</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Best: <span className="font-bold text-emerald-600">{formatNumber(quickStats.bestMonth)}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Streak: <span className="font-bold text-blue-600">{quickStats.positiveStreak} mo</span>
              </span>
            </div>
          )}
          {!showQuickStats && subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {showAddButton && onAddMonth && (
          <button onClick={onAddMonth} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-800 transition-colors shadow-sm">
            <Plus size={12} /> Add Month
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-3 py-2.5 w-32">Month</th>
              <th className="px-3 py-2.5 text-right">Sub</th>
              <th className="px-3 py-2.5 text-right">Amex</th>
              <th className="px-3 py-2.5 text-right">Flights</th>
              <th className="px-3 py-2.5 text-right">Other</th>
              <th className="px-3 py-2.5 text-right text-red-400">Debit</th>
              {showBalance && <th className="px-3 py-2.5 text-right text-blue-500">Balance</th>}
              <th className="px-3 py-2.5 w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {/* Earlier months (collapsed by default) */}
            {ledgerData.earlierMonths.length > 0 && (
              <>
                <SectionHeader
                  title={`Earlier in ${ledgerData.earlierMonths[0]?.month.slice(0, 4) || ''}`}
                  count={ledgerData.earlierMonths.length}
                  totalMiles={ledgerData.earlierTotal}
                  isExpanded={showEarlierMonths}
                  onToggle={() => setShowEarlierMonths(!showEarlierMonths)}
                  variant="past"
                />
                {showEarlierMonths && ledgerData.earlierMonths.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    isProjected={false}
                    isCurrent={false}
                    isEditing={editingId === row.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={() => startEdit(row)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onDelete={() => handleDelete(row.id)}
                    showBalance={showBalance}
                    compact={isCompact}
                  />
                ))}
              </>
            )}

            {/* Recent months (always visible) */}
            {ledgerData.recentMonths.map((row) => (
              <LedgerRow
                key={row.id}
                row={row}
                isProjected={false}
                isCurrent={false}
                isEditing={editingId === row.id}
                editForm={editForm}
                setEditForm={setEditForm}
                onStartEdit={() => startEdit(row)}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={() => handleDelete(row.id)}
                showBalance={showBalance}
                compact={isCompact}
              />
            ))}

            {/* Current month (always visible, highlighted) */}
            {ledgerData.currentRow && (
              <LedgerRow
                key={ledgerData.currentRow.id}
                row={ledgerData.currentRow}
                isProjected={false}
                isCurrent={true}
                isEditing={editingId === ledgerData.currentRow.id}
                editForm={editForm}
                setEditForm={setEditForm}
                onStartEdit={() => startEdit(ledgerData.currentRow!)}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={() => handleDelete(ledgerData.currentRow!.id)}
                showBalance={showBalance}
                compact={isCompact}
              />
            )}

            {/* Projected months (collapsed by default) */}
            {ledgerData.projectedMonths.length > 0 && (
              <>
                <SectionHeader
                  title="Projected"
                  count={ledgerData.projectedMonths.length}
                  totalMiles={ledgerData.projectedTotal}
                  isExpanded={showProjectedMonths}
                  onToggle={() => setShowProjectedMonths(!showProjectedMonths)}
                  variant="projected"
                />
                {showProjectedMonths && ledgerData.projectedMonths.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    isProjected={true}
                    isCurrent={false}
                    isEditing={editingId === row.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={() => startEdit(row)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onDelete={() => handleDelete(row.id)}
                    showBalance={showBalance}
                    compact={isCompact}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
