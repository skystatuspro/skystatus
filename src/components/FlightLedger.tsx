import React, { useState } from 'react';
import { FlightRecord, XPRecord } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { calculateMultiYearStats } from '../utils/xp-logic';
import { 
  Trash2, 
  Plane, 
  AlertCircle, 
  ArrowRightLeft,
  CheckCircle2,
  Clock
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

// --- Main Component ---

export const FlightLedger: React.FC<FlightLedgerProps> = ({ 
  flights, 
  onChange,
  xpData = [], 
  currentRollover = 0
}) => {
  const sortedFlights = [...flights].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const [simulatedId, setSimulatedId] = useState<string | null>(null);

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
    onChange(flights.filter(f => f !== flightToDelete));
  };

  // Stats
  const scheduledCount = sortedFlights.filter(f => getFlightStatus(f.date) === 'scheduled').length;
  const completedCount = sortedFlights.filter(f => getFlightStatus(f.date) === 'completed').length;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-slate-400" />
            <h3 className="font-bold text-slate-800">Flight Ledger</h3>
          </div>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                {completedCount} flown
              </span>
            )}
            {scheduledCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {scheduledCount} scheduled
              </span>
            )}
          </div>
        </div>
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
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedFlights.map((f) => {
              const canShift = isShiftCandidate(f.date);
              const simulation = canShift && simulatedId === f.id ? getShiftImpact(f) : null;
              
              const status = getFlightStatus(f.date);
              const isScheduled = status === 'scheduled';

              return (
                <React.Fragment key={f.id ?? `${f.date}-${f.route}`}>
                  <tr className={`transition-colors group ${isScheduled ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                    
                    {/* Status Column - Compacter */}
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
                    
                    {/* Airline Logo - Compacter */}
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
                          onClick={() => handleDelete(f)}
                          className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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
  );
};
