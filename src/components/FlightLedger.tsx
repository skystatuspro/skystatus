import React, { useState, useMemo } from 'react';
import { FlightRecord, XPRecord } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { calculateMultiYearStats } from '../utils/xp-logic';
import { 
  Trash2, 
  Plane, 
  AlertCircle, 
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Calendar
} from 'lucide-react';

interface FlightLedgerProps {
  flights: FlightRecord[];
  onChange: (flights: FlightRecord[]) => void;
  xpData?: XPRecord[];
  currentRollover?: number;
}

// --- Helpers ---

const isShiftCandidate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getMonth() === 9; // 9 = Oktober
};

const getFlightStatus = (dateStr: string) => {
    const flightDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    flightDate.setHours(0,0,0,0);
    return flightDate >= today ? 'scheduled' : 'completed';
};

const formatMonthYear = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Group flights by month
interface MonthGroup {
  monthKey: string;
  flights: FlightRecord[];
  totalXP: number;
  totalSafXP: number;
  totalMiles: number;
  flownCount: number;
  scheduledCount: number;
}

const groupFlightsByMonth = (flights: FlightRecord[]): MonthGroup[] => {
  const groups = new Map<string, FlightRecord[]>();
  
  flights.forEach(f => {
    const monthKey = f.date.slice(0, 7); // YYYY-MM
    const existing = groups.get(monthKey) || [];
    groups.set(monthKey, [...existing, f]);
  });

  // Convert to array and sort by month (newest first)
  const result: MonthGroup[] = Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, monthFlights]) => {
      const sortedFlights = monthFlights.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return {
        monthKey,
        flights: sortedFlights,
        totalXP: sortedFlights.reduce((sum, f) => sum + (f.earnedXP || 0), 0),
        totalSafXP: sortedFlights.reduce((sum, f) => sum + (f.safXp || 0), 0),
        totalMiles: sortedFlights.reduce((sum, f) => sum + (f.earnedMiles || 0), 0),
        flownCount: sortedFlights.filter(f => getFlightStatus(f.date) === 'completed').length,
        scheduledCount: sortedFlights.filter(f => getFlightStatus(f.date) === 'scheduled').length,
      };
    });

  return result;
};

// Airline Logo Component
const AirlineLogo = ({ name }: { name: string }) => {
    const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
    let domain = '';
    
    if (cleanName.includes('KLM')) domain = 'klm.com';
    else if (cleanName.includes('AIRFRANCE') || cleanName.includes('AF')) domain = 'airfrance.com';
    else if (cleanName.includes('DELTA') || cleanName.includes('DL')) domain = 'delta.com';
    else if (cleanName.includes('TRANSAVIA') || cleanName.includes('HV')) domain = 'transavia.com';
    else if (cleanName.includes('VIRGIN') || cleanName.includes('VS')) domain = 'virginatlantic.com';
    else if (cleanName.includes('KOREAN') || cleanName.includes('KE')) domain = 'koreanair.com';
    else if (cleanName.includes('TAROM')) domain = 'tarom.ro';
    else if (cleanName.includes('KENYA')) domain = 'kenya-airways.com';
    else if (cleanName.includes('ITA')) domain = 'itaspa.com';
    else if (cleanName.includes('SAS') || cleanName.includes('SK')) domain = 'flysas.com';
    
    if (domain) {
        return (
            <div className="flex items-center gap-1.5">
                <img 
                    src={`https://logo.clearbit.com/${domain}?size=40`} 
                    alt={name} 
                    className="w-4 h-4 object-contain rounded-full bg-white shadow-sm border border-slate-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[11px] font-bold text-slate-600">{name}</span>
            </div>
        );
    }
    return <span className="text-[11px] font-bold text-slate-600">{name}</span>;
};

// --- Edit Modal Component ---

interface EditFlightModalProps {
  flight: FlightRecord;
  onSave: (updatedFlight: FlightRecord) => void;
  onClose: () => void;
}

const EditFlightModal: React.FC<EditFlightModalProps> = ({ flight, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    date: flight.date,
    origin: flight.route.split('-')[0],
    destination: flight.route.split('-')[1],
    airline: flight.airline,
    cabin: flight.cabin,
    ticketPrice: flight.ticketPrice,
    earnedMiles: flight.earnedMiles,
    earnedXP: flight.earnedXP,
    safXp: flight.safXp,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...flight,
      date: formData.date,
      route: `${formData.origin.toUpperCase()}-${formData.destination.toUpperCase()}`,
      airline: formData.airline,
      cabin: formData.cabin,
      ticketPrice: formData.ticketPrice,
      earnedMiles: formData.earnedMiles,
      earnedXP: formData.earnedXP,
      safXp: formData.safXp,
    });
  };

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Pencil size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Edit Flight</h2>
              <p className="text-xs text-slate-500">{flight.route} • {flight.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Origin</label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                maxLength={3}
                placeholder="AMS"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                maxLength={3}
                placeholder="JFK"
                required
              />
            </div>
          </div>

          {/* Airline & Cabin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Airline</label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value.toUpperCase() })}
                className={`${inputClass} uppercase`}
                placeholder="KLM"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Cabin</label>
              <select
                value={formData.cabin}
                onChange={(e) => setFormData({ ...formData, cabin: e.target.value as FlightRecord['cabin'] })}
                className={inputClass}
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className={labelClass}>Ticket Price (€)</label>
            <input
              type="number"
              value={formData.ticketPrice}
              onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          {/* Miles & XP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Miles Earned</label>
              <input
                type="number"
                value={formData.earnedMiles}
                onChange={(e) => setFormData({ ...formData, earnedMiles: parseInt(e.target.value) || 0 })}
                className={inputClass}
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>XP Earned</label>
              <input
                type="number"
                value={formData.earnedXP}
                onChange={(e) => setFormData({ ...formData, earnedXP: parseInt(e.target.value) || 0 })}
                className={inputClass}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          {/* SAF XP */}
          <div>
            <label className={labelClass}>
              SAF XP Bonus
              <span className="ml-2 font-normal normal-case text-slate-400">
                (Sustainable Aviation Fuel)
              </span>
            </label>
            <input
              type="number"
              value={formData.safXp}
              onChange={(e) => setFormData({ ...formData, safXp: parseInt(e.target.value) || 0 })}
              className={inputClass}
              min="0"
              placeholder="0"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Month Header Component ---

interface MonthHeaderProps {
  group: MonthGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

const MonthHeader: React.FC<MonthHeaderProps> = ({ group, isExpanded, onToggle }) => {
  const hasScheduled = group.scheduledCount > 0;
  const hasFlown = group.flownCount > 0;
  
  return (
    <tr 
      className="bg-slate-100/80 cursor-pointer hover:bg-slate-100 transition-colors border-y border-slate-200"
      onClick={onToggle}
    >
      <td colSpan={10} className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-400" />
              ) : (
                <ChevronRight size={16} className="text-slate-400" />
              )}
              <Calendar size={14} className="text-slate-400" />
              <span className="font-bold text-slate-700">{formatMonthYear(group.monthKey)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {hasFlown && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {group.flownCount} flown
                </span>
              )}
              {hasScheduled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {group.scheduledCount} scheduled
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 mr-1">XP:</span>
              <span className="font-bold text-blue-600">+{group.totalXP}</span>
              {group.totalSafXP > 0 && (
                <span className="ml-1 text-emerald-600">(+{group.totalSafXP} SAF)</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 mr-1">Miles:</span>
              <span className="font-bold text-slate-600">{formatNumber(group.totalMiles)}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

// --- Main Component ---

export const FlightLedger: React.FC<FlightLedgerProps> = ({ 
  flights, 
  onChange,
  xpData = [], 
  currentRollover = 0
}) => {
  const monthGroups = useMemo(() => groupFlightsByMonth(flights), [flights]);
  
  // Track expanded months - default all expanded
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => 
    new Set(monthGroups.map(g => g.monthKey))
  );

  const [simulatedId, setSimulatedId] = useState<string | null>(null);
  const [editingFlight, setEditingFlight] = useState<FlightRecord | null>(null);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMonths(new Set(monthGroups.map(g => g.monthKey)));
  };

  const collapseAll = () => {
    setExpandedMonths(new Set());
  };

  const getShiftImpact = (flight: FlightRecord) => {
    const currentStats = calculateMultiYearStats(xpData, currentRollover);
    const flightDate = new Date(flight.date);
    const qYear = flightDate.getMonth() >= 10 ? flightDate.getFullYear() + 1 : flightDate.getFullYear();
    const yearStat = currentStats[qYear];
    
    if (!yearStat) return null;

    const cap = 600; // Platinum (300) + Rollover Cap (300)
    const currentTotal = yearStat.totalXP;
    const waste = Math.max(0, currentTotal - cap);

    if (waste > 0) {
       const xpSaved = Math.min(flight.earnedXP, waste);
       return {
         isBeneficial: true,
         savedXP: xpSaved,
         message: `Moving to Nov saves ${xpSaved} XP from waste cap.`
       };
    }

    return {
      isBeneficial: false,
      savedXP: 0,
      message: 'No waste detected. Moving hurts rollover.'
    };
  };

  const handleDelete = (flightToDelete: FlightRecord) => {
    onChange(flights.filter(f => f.id !== flightToDelete.id));
  };

  const handleEdit = (flight: FlightRecord) => {
    setEditingFlight(flight);
  };

  const handleSaveEdit = (updatedFlight: FlightRecord) => {
    onChange(flights.map(f => f.id === updatedFlight.id ? updatedFlight : f));
    setEditingFlight(null);
  };

  // Stats
  const totalScheduled = flights.filter(f => getFlightStatus(f.date) === 'scheduled').length;
  const totalCompleted = flights.filter(f => getFlightStatus(f.date) === 'completed').length;

  return (
    <>
      {/* Edit Modal */}
      {editingFlight && (
        <EditFlightModal
          flight={editingFlight}
          onSave={handleSaveEdit}
          onClose={() => setEditingFlight(null)}
        />
      )}

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Plane size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-800">Flight Ledger</h3>
            </div>
            <div className="flex items-center gap-2">
              {totalCompleted > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {totalCompleted} flown
                </span>
              )}
              {totalScheduled > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {totalScheduled} scheduled
                </span>
              )}
            </div>
          </div>
          
          {/* Expand/Collapse buttons */}
          {monthGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-[10px] font-semibold px-2 py-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Expand all
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={collapseAll}
                className="text-[10px] font-semibold px-2 py-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-24">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Airline</th>
                <th className="px-4 py-3">Cabin</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Miles</th>
                <th className="px-4 py-3 text-right">XP</th>
                <th className="px-4 py-3 text-right">SAF</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthGroups.map((group) => {
                const isExpanded = expandedMonths.has(group.monthKey);
                
                return (
                  <React.Fragment key={group.monthKey}>
                    {/* Month Header */}
                    <MonthHeader 
                      group={group} 
                      isExpanded={isExpanded} 
                      onToggle={() => toggleMonth(group.monthKey)} 
                    />
                    
                    {/* Flights in this month */}
                    {isExpanded && group.flights.map((f) => {
                      const canShift = isShiftCandidate(f.date);
                      const simulation = canShift && simulatedId === f.id ? getShiftImpact(f) : null;
                      
                      const status = getFlightStatus(f.date);
                      const isScheduled = status === 'scheduled';

                      return (
                        <React.Fragment key={f.id ?? `${f.date}-${f.route}`}>
                          <tr className={`transition-colors group ${isScheduled ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                            
                            {/* Status Column */}
                            <td className="px-4 py-2.5">
                              {isScheduled ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase border border-blue-100">
                                  <Clock size={10} /> Sched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase border border-emerald-100">
                                  <CheckCircle2 size={10} /> Flown
                                </span>
                              )}
                            </td>

                            <td className={`px-4 py-2.5 font-mono text-[11px] ${isScheduled ? 'text-slate-400' : 'text-slate-600'}`}>
                              {f.date}
                            </td>
                            <td className={`px-4 py-2.5 font-bold text-xs ${isScheduled ? 'text-slate-500' : 'text-slate-800'}`}>
                              {f.route}
                            </td>
                            
                            {/* Airline Logo */}
                            <td className="px-4 py-2.5">
                              <AirlineLogo name={f.airline} />
                            </td>

                            <td className="px-4 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isScheduled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                {f.cabin === 'Premium Economy' ? 'Prem' : f.cabin === 'Business' ? 'Biz' : f.cabin === 'First' ? '1st' : 'Eco'}
                              </span>
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono text-[11px] ${isScheduled ? 'text-slate-400' : 'text-slate-600'}`}>
                              {formatCurrency(f.ticketPrice)}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono text-[11px] ${isScheduled ? 'text-slate-400' : 'text-slate-600'}`}>
                              {formatNumber(f.earnedMiles)}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-bold text-xs ${isScheduled ? 'text-blue-400' : 'text-blue-600'}`}>
                              +{f.earnedXP}
                            </td>
                            <td className={`px-4 py-2.5 text-right text-[11px] font-bold ${f.safXp > 0 ? (isScheduled ? 'text-emerald-400' : 'text-emerald-600') : 'text-slate-300'}`}>
                              {f.safXp > 0 ? `+${f.safXp}` : '-'}
                            </td>
                            
                            {/* Actions */}
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canShift && (
                                  <button
                                    onClick={() =>
                                      setSimulatedId(
                                        simulatedId === f.id ? null : f.id ?? ''
                                      )
                                    }
                                    className={`p-1 rounded-lg transition-colors ${
                                      simulatedId === f.id
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                    title="Analyze Shift to November"
                                  >
                                    <ArrowRightLeft size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(f)}
                                  className="p-1 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Edit flight"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(f)}
                                  className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Delete flight"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {simulation && (
                            <tr>
                              <td colSpan={10} className="px-4 py-0">
                                <div className="mb-2 bg-indigo-50/50 rounded-lg border border-indigo-100 p-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`p-1.5 rounded-lg ${
                                        simulation.isBeneficial
                                          ? 'bg-emerald-100 text-emerald-600'
                                          : 'bg-amber-100 text-amber-600'
                                      }`}
                                    >
                                      {simulation.isBeneficial ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <AlertCircle size={14} />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                        Shift Analysis (Oct ➔ Nov)
                                      </p>
                                      <p className="text-[11px] text-slate-600">
                                        {simulation.message}
                                      </p>
                                    </div>
                                  </div>
                                  {simulation.isBeneficial && (
                                    <div className="text-right">
                                      <span className="block text-lg font-black text-emerald-600">
                                        +{simulation.savedXP} XP
                                      </span>
                                      <span className="text-[9px] font-bold text-emerald-500 uppercase">
                                        Rollover Gain
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {flights.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                    <Plane size={28} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No flights recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
