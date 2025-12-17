// src/components/SimpleFlightLedger.tsx
// Simplified flight ledger for Simple Mode - card-based with edit/delete

import React, { useState, useMemo } from 'react';
import { FlightRecord } from '../types';
import { 
  Trash2, 
  Plane, 
  CheckCircle2,
  Clock,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Leaf,
} from 'lucide-react';

interface SimpleFlightLedgerProps {
  flights: FlightRecord[];
  onChange: (flights: FlightRecord[]) => void;
}

// Group flights by month
interface MonthGroup {
  monthKey: string;
  flights: FlightRecord[];
  totalXP: number;
  scheduledCount: number;
}

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

const groupFlightsByMonth = (flights: FlightRecord[]): MonthGroup[] => {
  const groups = new Map<string, FlightRecord[]>();
  
  flights.forEach(f => {
    const monthKey = f.date.slice(0, 7);
    const existing = groups.get(monthKey) || [];
    groups.set(monthKey, [...existing, f]);
  });

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, monthFlights]) => {
      const sortedFlights = monthFlights.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return {
        monthKey,
        flights: sortedFlights,
        totalXP: sortedFlights.reduce((sum, f) => sum + (f.earnedXP || 0) + (f.safXp || 0), 0),
        scheduledCount: sortedFlights.filter(f => getFlightStatus(f.date) === 'scheduled').length,
      };
    });
};

// Quick Edit Modal - simplified
interface QuickEditModalProps {
  flight: FlightRecord;
  onSave: (updatedFlight: FlightRecord) => void;
  onClose: () => void;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({ flight, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    date: flight.date,
    route: flight.route,
    airline: flight.airline,
    cabin: flight.cabin,
    earnedXP: flight.earnedXP,
    safXp: flight.safXp || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...flight,
      ...formData,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Edit Flight</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Route</label>
              <input
                type="text"
                value={formData.route}
                onChange={e => setFormData(prev => ({ ...prev, route: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Airline</label>
              <input
                type="text"
                value={formData.airline}
                onChange={e => setFormData(prev => ({ ...prev, airline: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cabin</label>
              <select
                value={formData.cabin}
                onChange={e => setFormData(prev => ({ ...prev, cabin: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">XP</label>
              <input
                type="number"
                value={formData.earnedXP}
                onChange={e => setFormData(prev => ({ ...prev, earnedXP: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">SAF XP</label>
              <input
                type="number"
                value={formData.safXp}
                onChange={e => setFormData(prev => ({ ...prev, safXp: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete confirmation
interface DeleteConfirmProps {
  flight: FlightRecord;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ flight, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 className="text-red-500" size={24} />
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-2">Delete Flight?</h3>
      <p className="text-slate-500 text-sm mb-6">
        {flight.route} on {new Date(flight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        <br />
        This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export const SimpleFlightLedger: React.FC<SimpleFlightLedgerProps> = ({
  flights,
  onChange,
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [editingFlight, setEditingFlight] = useState<FlightRecord | null>(null);
  const [deletingFlight, setDeletingFlight] = useState<FlightRecord | null>(null);

  const monthGroups = useMemo(() => groupFlightsByMonth(flights), [flights]);

  // Auto-expand first 2 months
  React.useEffect(() => {
    if (monthGroups.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set(monthGroups.slice(0, 2).map(g => g.monthKey)));
    }
  }, [monthGroups]);

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

  const handleSave = (updatedFlight: FlightRecord) => {
    onChange(flights.map(f => f.id === updatedFlight.id ? updatedFlight : f));
    setEditingFlight(null);
  };

  const handleDelete = () => {
    if (deletingFlight) {
      onChange(flights.filter(f => f.id !== deletingFlight.id));
      setDeletingFlight(null);
    }
  };

  if (flights.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Plane size={18} className="text-blue-500 rotate-45" />
            Flight Ledger
            <span className="text-sm font-normal text-slate-400">
              {flights.length} flight{flights.length !== 1 ? 's' : ''}
            </span>
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {monthGroups.map(group => {
            const isExpanded = expandedMonths.has(group.monthKey);
            
            return (
              <div key={group.monthKey}>
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(group.monthKey)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-400" />
                    )}
                    <span className="font-semibold text-slate-900">
                      {formatMonthYear(group.monthKey)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {group.flights.length} flight{group.flights.length !== 1 ? 's' : ''}
                    </span>
                    {group.scheduledCount > 0 && (
                      <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        {group.scheduledCount} BOOKED
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-blue-600">+{group.totalXP} XP</span>
                </button>

                {/* Flights */}
                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2">
                    {group.flights.map(flight => {
                      const isScheduled = getFlightStatus(flight.date) === 'scheduled';
                      
                      return (
                        <div
                          key={flight.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${
                            isScheduled 
                              ? 'bg-blue-50/50 border-blue-100' 
                              : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isScheduled ? 'bg-blue-100' : 'bg-white'
                            }`}>
                              <Plane size={16} className={`rotate-45 ${
                                isScheduled ? 'text-blue-500' : 'text-slate-400'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{flight.route}</span>
                                {isScheduled && (
                                  <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                                    BOOKED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {new Date(flight.date).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                {' • '}{flight.airline}
                                {' • '}{flight.cabin === 'Premium Economy' ? 'Premium' : flight.cabin}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-bold ${isScheduled ? 'text-blue-500' : 'text-slate-900'}`}>
                                +{flight.earnedXP} XP
                              </p>
                              {(flight.safXp ?? 0) > 0 && (
                                <p className="text-[10px] text-emerald-600 flex items-center justify-end gap-0.5">
                                  <Leaf size={10} />
                                  +{flight.safXp} SAF
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingFlight(flight)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingFlight(flight)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {editingFlight && (
        <QuickEditModal
          flight={editingFlight}
          onSave={handleSave}
          onClose={() => setEditingFlight(null)}
        />
      )}
      {deletingFlight && (
        <DeleteConfirm
          flight={deletingFlight}
          onConfirm={handleDelete}
          onClose={() => setDeletingFlight(null)}
        />
      )}
    </>
  );
};
