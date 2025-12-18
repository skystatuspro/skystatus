// src/components/SimpleFlightIntake.tsx
// Simplified flight intake for Simple Mode - wizard style

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plane, Calendar, MapPin, ChevronRight, ChevronLeft, 
  Check, Repeat, Tag, Leaf, Sparkles, AlertCircle
} from 'lucide-react';
import { FlightIntakePayload, CabinClass } from '../utils/flight-intake';
import { calculateXPForRoute, AIRPORTS } from '../utils/airports';
import { useCurrency } from '../lib/CurrencyContext';
import { getStatusMultiplier, isRevenueAirline } from '../utils/loyalty-logic';
import { useViewMode } from '../hooks/useViewMode';
import { FlightRecord, StatusLevel } from '../types';

// Simplified airline list - most common first
const AIRLINES = [
  { code: 'KLM', name: 'KLM', revenue: true },
  { code: 'AF', name: 'Air France', revenue: true },
  { code: 'HV', name: 'Transavia', revenue: false },
  { code: 'DL', name: 'Delta', revenue: false },
  { code: 'KE', name: 'Korean Air', revenue: false },
  { code: 'AM', name: 'Aeroméxico', revenue: false },
  { code: 'UX', name: 'Air Europa', revenue: false },
  { code: 'SK', name: 'SAS', revenue: false },
  { code: 'VS', name: 'Virgin Atlantic', revenue: false },
  { code: 'VN', name: 'Vietnam Airlines', revenue: false },
  { code: 'GA', name: 'Garuda Indonesia', revenue: false },
  { code: 'CI', name: 'China Airlines', revenue: false },
  { code: 'MU', name: 'China Eastern', revenue: false },
  { code: 'KQ', name: 'Kenya Airways', revenue: false },
  { code: 'ME', name: 'MEA', revenue: false },
  { code: 'SV', name: 'Saudia', revenue: false },
  { code: 'RO', name: 'TAROM', revenue: false },
  { code: 'AR', name: 'Aerolíneas Argentinas', revenue: false },
  { code: 'MF', name: 'XiamenAir', revenue: false },
];

const CABINS: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First'];

interface SimpleFlightIntakeProps {
  onApply: (flights: FlightIntakePayload[]) => void;
  currentStatus: StatusLevel;
  existingFlights?: FlightRecord[];
}

export const SimpleFlightIntake: React.FC<SimpleFlightIntakeProps> = ({
  onApply,
  currentStatus,
  existingFlights = [],
}) => {
  const { setViewMode } = useViewMode();
  const { symbol: currencySymbol } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);

  // Form state
  const [step, setStep] = useState(1);
  const [route, setRoute] = useState('');
  const [isReturn, setIsReturn] = useState(true);
  const [date, setDate] = useState(today);
  const [airline, setAirline] = useState('KLM');
  const [cabin, setCabin] = useState<CabinClass>('Economy');
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [safXp, setSafXp] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Derived state
  const selectedAirline = AIRLINES.find(a => a.code === airline);
  const isRevenue = selectedAirline?.revenue ?? false;

  // Parse route into airport codes
  const routeCodes = useMemo(() => {
    const cleaned = route.toUpperCase().replace(/[^A-Z\s\-]/g, '');
    const codes = cleaned.split(/[\s\-]+/).filter(c => c.length === 3);
    return codes;
  }, [route]);

  // Calculate segments and XP
  const segments = useMemo(() => {
    if (routeCodes.length < 2) return [];
    if (!routeCodes.every(c => AIRPORTS[c])) return [];

    const result = [];
    for (let i = 0; i < routeCodes.length - 1; i++) {
      const from = routeCodes[i];
      const to = routeCodes[i + 1];
      if (from !== to) {
        const { xp, distance, band } = calculateXPForRoute(from, to, cabin);
        result.push({ from, to, xp, distance, band });
      }
    }

    // Add return segments if isReturn
    if (isReturn && result.length > 0) {
      const returnSegs = [...result].reverse().map(seg => ({
        from: seg.to,
        to: seg.from,
        xp: seg.xp,
        distance: seg.distance,
        band: seg.band,
      }));
      return [...result, ...returnSegs];
    }

    return result;
  }, [routeCodes, cabin, isReturn]);

  const totalXP = segments.reduce((sum, s) => sum + s.xp, 0) + safXp;
  
  // Calculate miles for revenue airlines
  const calculatedMiles = useMemo(() => {
    if (!isRevenue || ticketPrice <= 0) return 0;
    const multiplier = getStatusMultiplier(currentStatus);
    return Math.round(ticketPrice * multiplier);
  }, [isRevenue, ticketPrice, currentStatus]);

  // Validation
  const step1Valid = routeCodes.length >= 2 && routeCodes.every(c => AIRPORTS[c]) && date;
  const step2Valid = airline && cabin;
  const canSubmit = step1Valid && step2Valid && segments.length > 0;

  // Check for duplicates
  const hasDuplicate = useMemo(() => {
    if (!step1Valid) return false;
    return segments.some(seg => 
      existingFlights.some(f => 
        f.date === date && f.route === `${seg.from}-${seg.to}`
      )
    );
  }, [segments, date, existingFlights, step1Valid]);

  // Handle submit
  const handleSubmit = () => {
    if (!canSubmit) return;

    // UXP is ONLY earned by Platinum/Ultimate members on KLM and Air France flights
    // SAF XP also counts towards UXP for KL/AF
    const uxpAirlines = ['KL', 'KLM', 'AF'];
    const isUxpEligible = uxpAirlines.includes(airline.toUpperCase())
      && (currentStatus === 'Platinum' || currentStatus === 'Ultimate');

    const flights: FlightIntakePayload[] = segments.map((seg, idx) => ({
      date,
      route: `${seg.from}-${seg.to}`,
      airline,
      cabin,
      ticketPrice: segments.length > 1 
        ? ticketPrice / segments.length 
        : ticketPrice,
      earnedMiles: segments.length > 1
        ? Math.round(calculatedMiles / segments.length)
        : calculatedMiles,
      earnedXP: seg.xp,
      safXp: idx === 0 ? safXp : 0, // SAF only on first segment
      flightNumber: '',
      // UXP = XP + SAF XP for KL/AF flights, ONLY for Platinum/Ultimate members
      uxp: isUxpEligible ? seg.xp + (idx === 0 ? safXp : 0) : 0,
    }));

    onApply(flights);
    setShowSuccess(true);
    
    // Reset after success
    setTimeout(() => {
      setShowSuccess(false);
      setRoute('');
      setTicketPrice(0);
      setSafXp(0);
      setStep(1);
    }, 2000);
  };

  // Route validation feedback
  const routeError = useMemo(() => {
    if (!route) return null;
    const codes = routeCodes;
    if (codes.length < 2) return 'Enter at least 2 airports (e.g. AMS JFK)';
    const invalid = codes.find(c => !AIRPORTS[c]);
    if (invalid) return `Unknown airport: ${invalid}`;
    return null;
  }, [route, routeCodes]);

  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-emerald-50 rounded-3xl p-12 text-center border border-emerald-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Flight Added!</h2>
          <p className="text-emerald-700">
            +{totalXP} XP • {segments.length} segment{segments.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Add Flight</h2>
        <p className="text-slate-500 text-sm">Quick add your Flying Blue flight</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step
                  ? 'bg-blue-600 text-white'
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

      {/* Step 1: Route & Date */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" />
              Where are you flying?
            </h3>

            {/* Route input */}
            <div>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value.toUpperCase())}
                placeholder="AMS JFK or AMS CDG JFK"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-lg font-mono font-bold 
                         focus:border-blue-500 focus:outline-none transition-colors
                         placeholder:text-slate-300 placeholder:font-normal"
                autoFocus
              />
              {routeError ? (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {routeError}
                </p>
              ) : routeCodes.length >= 2 && (
                <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                  <Check size={14} />
                  {routeCodes.join(' → ')}
                </p>
              )}
            </div>

            {/* Return toggle */}
            <button
              onClick={() => setIsReturn(!isReturn)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                isReturn
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Repeat size={18} className={isReturn ? 'text-blue-500' : 'text-slate-400'} />
                <span className={`font-medium ${isReturn ? 'text-blue-700' : 'text-slate-600'}`}>
                  Return flight
                </span>
              </span>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                isReturn ? 'bg-blue-500' : 'bg-slate-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isReturn ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <Calendar size={14} className="inline mr-1.5" />
                Flight date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 
                         focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              step1Valid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Continue
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Step 2: Airline & Details */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Plane size={18} className="text-blue-500 rotate-45" />
              Flight details
            </h3>

            {/* Airline selector */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Airline
              </label>
              <select
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white
                         focus:border-blue-500 focus:outline-none transition-colors font-medium"
              >
                {AIRLINES.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Cabin selector */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Cabin class
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CABINS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCabin(c)}
                    className={`px-4 py-2.5 rounded-xl border-2 font-medium transition-all ${
                      cabin === c
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Revenue fields - only for KLM/AF */}
            {isRevenue && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <Sparkles size={12} />
                  KLM/Air France earns miles based on ticket price
                </p>

                {/* Ticket price */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    <Tag size={14} className="inline mr-1.5" />
                    Ticket price
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={ticketPrice || ''}
                      onChange={(e) => setTicketPrice(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-mono
                               focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {currencySymbol}
                    </span>
                  </div>
                  {calculatedMiles > 0 && (
                    <p className="mt-1.5 text-sm text-blue-600">
                      ≈ {calculatedMiles.toLocaleString()} miles ({currentStatus} bonus)
                    </p>
                  )}
                </div>

                {/* SAF XP */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    <Leaf size={14} className="inline mr-1.5 text-emerald-500" />
                    SAF XP (optional)
                  </label>
                  <input
                    type="number"
                    value={safXp || ''}
                    onChange={(e) => setSafXp(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-mono
                             focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
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
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
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
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-200 text-sm font-medium">Total XP</span>
              <span className="text-3xl font-black">+{totalXP}</span>
            </div>
            
            <div className="space-y-2">
              {segments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-white/10 rounded-lg px-3 py-2">
                  <span className="font-mono">{seg.from} → {seg.to}</span>
                  <span className="font-bold">+{seg.xp} XP</span>
                </div>
              ))}
              {safXp > 0 && (
                <div className="flex items-center justify-between text-sm bg-emerald-500/20 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-1">
                    <Leaf size={14} />
                    SAF Bonus
                  </span>
                  <span className="font-bold">+{safXp} XP</span>
                </div>
              )}
            </div>
          </div>

          {/* Flight details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Date</span>
                <p className="font-semibold text-slate-900">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Airline</span>
                <p className="font-semibold text-slate-900">{selectedAirline?.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Cabin</span>
                <p className="font-semibold text-slate-900">{cabin}</p>
              </div>
              {isRevenue && ticketPrice > 0 && (
                <div>
                  <span className="text-slate-500">Miles earned</span>
                  <p className="font-semibold text-slate-900">≈{calculatedMiles.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Duplicate warning */}
          {hasDuplicate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-amber-800">Possible duplicate</p>
                <p className="text-sm text-amber-700">A similar flight already exists on this date.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
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
              disabled={!canSubmit}
              className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check size={20} />
              Add {segments.length} Flight{segments.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Switch to full view link */}
      <div className="text-center mt-8">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Need more options? Switch to Full View →
        </button>
      </div>
    </div>
  );
};
