import React, { useState, useEffect, useRef } from 'react';
import { Plane, Plus, Calendar, MapPin, Tag, Award, Leaf, ArrowRight, Split, Layers, Zap, Repeat, TrendingUp, CheckCircle2, ChevronDown, AlertTriangle, Clock, Star } from 'lucide-react';
import { FlightIntakePayload, CabinClass } from '../utils/flight-intake';
import { calculateXPForRoute, AIRPORTS, DistanceBand } from '../utils/airports';
import { useCurrency } from '../lib/CurrencyContext';
import { getStatusMultiplier, isRevenueAirline } from '../utils/loyalty-logic';
import { Tooltip } from './Tooltip';
import { FlightRecord } from '../types';
import { useViewMode } from '../hooks/useViewMode';
import { useAnalytics } from '../hooks/useAnalytics';
import { SimpleFlightIntake } from './SimpleFlightIntake';

// ============================================
// SKYTEAM AIRLINES DATA
// ============================================

interface AirlineInfo {
  code: string;
  name: string;
  region: string;
  revenueBasedMiles: boolean;
  xpEligible: boolean;
  note?: string;
}

const SKYTEAM_AIRLINES: AirlineInfo[] = [
  // Primary - Flying Blue airlines (revenue-based miles)
  { code: 'KLM', name: 'KLM Royal Dutch Airlines', region: 'Europe', revenueBasedMiles: true, xpEligible: true },
  { code: 'AF', name: 'Air France', region: 'Europe', revenueBasedMiles: true, xpEligible: true },
  
  // Flying Blue family
  { code: 'HV', name: 'Transavia', region: 'Europe', revenueBasedMiles: false, xpEligible: true, note: 'XP only on Plus/Max fares' },
  { code: 'SB', name: 'Aircalin', region: 'Pacific', revenueBasedMiles: false, xpEligible: true, note: 'Limited routes' },
  { code: 'XK', name: 'Air Corsica', region: 'Europe', revenueBasedMiles: false, xpEligible: true, note: 'Paris-Corsica routes' },
  
  // SkyTeam partners (alphabetical)
  { code: 'AR', name: 'Aerolíneas Argentinas', region: 'South America', revenueBasedMiles: false, xpEligible: true },
  { code: 'AM', name: 'Aeroméxico', region: 'North America', revenueBasedMiles: false, xpEligible: true },
  { code: 'UX', name: 'Air Europa', region: 'Europe', revenueBasedMiles: false, xpEligible: true },
  { code: 'CI', name: 'China Airlines', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
  { code: 'MU', name: 'China Eastern', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
  { code: 'DL', name: 'Delta Air Lines', region: 'North America', revenueBasedMiles: false, xpEligible: true },
  { code: 'GA', name: 'Garuda Indonesia', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
  { code: 'KQ', name: 'Kenya Airways', region: 'Africa', revenueBasedMiles: false, xpEligible: true },
  { code: 'KE', name: 'Korean Air', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
  { code: 'ME', name: 'Middle East Airlines', region: 'Middle East', revenueBasedMiles: false, xpEligible: true },
  { code: 'SK', name: 'SAS Scandinavian', region: 'Europe', revenueBasedMiles: false, xpEligible: true },
  { code: 'SV', name: 'Saudia', region: 'Middle East', revenueBasedMiles: false, xpEligible: true },
  { code: 'RO', name: 'TAROM', region: 'Europe', revenueBasedMiles: false, xpEligible: true },
  { code: 'VN', name: 'Vietnam Airlines', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
  { code: 'VS', name: 'Virgin Atlantic', region: 'Europe', revenueBasedMiles: false, xpEligible: true },
  { code: 'MF', name: 'XiamenAir', region: 'Asia', revenueBasedMiles: false, xpEligible: true },
];

// Get airline by code (supports both "KLM" and "KL" style codes)
const getAirlineByCode = (code: string): AirlineInfo | undefined => {
  const upperCode = code.toUpperCase();
  return SKYTEAM_AIRLINES.find(a => 
    a.code === upperCode || 
    a.code.startsWith(upperCode) ||
    upperCode.startsWith(a.code.substring(0, 2))
  );
};

// ============================================
// COMPONENT
// ============================================

interface FlightIntakeProps {
  onApply: (flights: FlightIntakePayload[]) => void;
  currentStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | 'Ultimate';
  existingFlights?: FlightRecord[]; // For duplicate detection
}

const cabinOptions: CabinClass[] = [
  'Economy',
  'Premium Economy',
  'Business',
  'First',
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
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2.5 ' +
  'text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all duration-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white hover:border-slate-300 ' +
  '[color-scheme:light] ' + 
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

interface DetectedSegment {
    from: string;
    to: string;
    distance: number;
    xp: number;
    band: DistanceBand;
    allocatedPrice: number;
    allocatedMiles: number;
    cabin: CabinClass;
}

export const FlightIntake: React.FC<FlightIntakeProps> = ({ 
  onApply, 
  currentStatus,
  existingFlights = []
}) => {
  const { isSimpleMode } = useViewMode();
  const { trackFlight } = useAnalytics();
  const today = new Date().toISOString().slice(0, 10);
  const routeInputRef = useRef<HTMLInputElement>(null);
  const airlineDropdownRef = useRef<HTMLDivElement>(null);
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();

  const [form, setForm] = useState({
    date: today,
    route: '',
    airline: '',
    cabin: 'Economy' as CabinClass,
    ticketPrice: 0,
    earnedMiles: 0,
    safXp: 0,
    flightNumber: '',
  });

  const [isReturn, setIsReturn] = useState(false);
  const [segments, setSegments] = useState<DetectedSegment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revenueInfo, setRevenueInfo] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedCount, setLastAddedCount] = useState(0);
  
  // Airline dropdown state
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false);
  const [airlineFilter, setAirlineFilter] = useState('');
  const [recentAirlines, setRecentAirlines] = useState<string[]>([]);

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Load recent airlines from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentAirlines');
    if (stored) {
      try {
        setRecentAirlines(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (airlineDropdownRef.current && !airlineDropdownRef.current.contains(e.target as Node)) {
        setShowAirlineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus op route veld bij mount
  useEffect(() => {
    const timer = setTimeout(() => {
      routeInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Duplicate detection
  useEffect(() => {
    if (segments.length === 0 || !form.date) {
      setDuplicateWarning(null);
      return;
    }

    const potentialDuplicates = segments.filter(seg => {
      const route = `${seg.from}-${seg.to}`;
      return existingFlights.some(f => 
        f.date === form.date && f.route === route
      );
    });

    if (potentialDuplicates.length > 0) {
      const routes = potentialDuplicates.map(s => `${s.from}-${s.to}`).join(', ');
      setDuplicateWarning(`${routes} on ${form.date} already exists`);
    } else {
      setDuplicateWarning(null);
    }
  }, [segments, form.date, existingFlights]);

  // --- INTELLIGENCE ENGINE ---
  useEffect(() => {
    // 1. Parse route
    let codes = form.route
      .toUpperCase()
      .replace(/[^A-Z]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((c) => c.length === 3);

    // Auto-Mirror logic voor Round Trips
    if (isReturn && codes.length >= 2) {
        const forward = form.route.toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter(c => c.length === 3);
        if (forward.length >= 2) {
             const backward = [...forward].reverse();
             codes = [...forward, ...backward.slice(1)]; 
        }
    }

    // Revenue Based Miles Logic
    let calculatedMiles = 0;
    let calcInfo = null;

    if (form.ticketPrice > 0 && form.airline && isRevenueAirline(form.airline)) {
        const multiplier = getStatusMultiplier(currentStatus);
        calculatedMiles = Math.round(form.ticketPrice * multiplier);
        calcInfo = `${currentStatus} Bonus (${multiplier}x)`;
    }

    if (calculatedMiles > 0) {
        setForm(prev => ({ ...prev, earnedMiles: calculatedMiles }));
        setRevenueInfo(calcInfo);
    } else {
        setRevenueInfo(null);
    }

    // Segment Logic
    if (codes.length < 2) {
        setSegments([]);
        return;
    }

    if (!codes.every(c => AIRPORTS[c])) return;

    const rawSegments = [];
    let totalDist = 0;

    for (let i = 0; i < codes.length - 1; i++) {
        const from = codes[i];
        const to = codes[i + 1];
        if (from !== to) {
            const { xp, distance, band } = calculateXPForRoute(from, to, form.cabin);
            rawSegments.push({ from, to, distance, xp, band });
            totalDist += distance;
        }
    }

    const calculatedSegments: DetectedSegment[] = rawSegments.map(seg => {
        const weight = totalDist > 0 ? seg.distance / totalDist : 0;
        // Use calculatedMiles directly (not form.earnedMiles which may be stale due to async setState)
        const milesForCalc = calculatedMiles > 0 ? calculatedMiles : form.earnedMiles;
        return {
            ...seg,
            allocatedPrice: form.ticketPrice * weight,
            allocatedMiles: milesForCalc > 0 ? Math.round(milesForCalc * weight) : Math.round(seg.distance),
            cabin: form.cabin
        };
    });

    setSegments(calculatedSegments);

  }, [form.route, form.cabin, form.ticketPrice, form.airline, currentStatus, isReturn]); 

  // Simple Mode: render simplified flight intake wizard
  if (isSimpleMode) {
    return (
      <SimpleFlightIntake
        onApply={onApply}
        currentStatus={currentStatus}
        existingFlights={existingFlights}
      />
    );
  }

  const totalXP = segments.reduce((acc, s) => acc + s.xp, 0);
  const isMultiSegment = segments.length > 1;
  const canSubmit = segments.length > 0 && form.date && form.airline;

  // Instant Yield Calculation
  const cpx = totalXP > 0 && form.ticketPrice > 0 ? form.ticketPrice / totalXP : 0;
  const getYieldLabel = (val: number) => {
      if (val === 0) return null;
      if (val < 10) return { label: 'Legendary', color: 'text-purple-600 bg-purple-50 border-purple-100' };
      if (val < 20) return { label: 'Good Deal', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
      return { label: 'Standard', color: 'text-slate-500 bg-slate-50 border-slate-100' };
  };
  const yieldBadge = getYieldLabel(cpx);

  // Update cabin for a specific segment and recalculate XP
  const updateSegmentCabin = (index: number, newCabin: CabinClass) => {
    setSegments(prev => prev.map((seg, i) => {
      if (i !== index) return seg;
      const { xp, band } = calculateXPForRoute(seg.from, seg.to, newCabin);
      return { ...seg, cabin: newCabin, xp, band };
    }));
  };

  // Airline selection
  const selectAirline = (code: string) => {
    setForm(prev => ({ ...prev, airline: code }));
    setAirlineFilter('');
    setShowAirlineDropdown(false);

    // Update recent airlines
    const updated = [code, ...recentAirlines.filter(a => a !== code)].slice(0, 5);
    setRecentAirlines(updated);
    localStorage.setItem('recentAirlines', JSON.stringify(updated));
  };

  // Filter airlines for dropdown
  const getFilteredAirlines = () => {
    const filter = airlineFilter.toUpperCase();
    if (!filter) return SKYTEAM_AIRLINES;
    return SKYTEAM_AIRLINES.filter(a => 
      a.code.includes(filter) || 
      a.name.toUpperCase().includes(filter)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    // UXP is ONLY earned by Platinum/Ultimate members on KLM and Air France flights
    // SAF XP also counts towards UXP for KL/AF
    const uxpAirlines = ['KL', 'KLM', 'AF'];
    const isUxpEligible = uxpAirlines.includes(form.airline.toUpperCase()) 
      && (currentStatus === 'Platinum' || currentStatus === 'Ultimate');

    const payloads: FlightIntakePayload[] = segments.map((seg, index) => ({
        date: form.date,
        route: `${seg.from}-${seg.to}`,
        airline: form.airline,
        cabin: seg.cabin,
        ticketPrice: seg.allocatedPrice,
        earnedMiles: form.earnedMiles > 0 ? seg.allocatedMiles : 0, 
        earnedXP: seg.xp,
        safXp: index === 0 ? form.safXp : 0,
        // flightNumber only for single-segment flights (multi-segment has multiple flight numbers)
        flightNumber: segments.length === 1 ? form.flightNumber : undefined,
        // UXP = XP + SAF XP for KL/AF flights, ONLY for Platinum/Ultimate members
        uxp: isUxpEligible ? seg.xp + (index === 0 ? form.safXp : 0) : 0,
    }));

    // Track each flight added
    const isAfKlm = ['AF', 'KLM', 'KL'].includes(form.airline.toUpperCase());
    payloads.forEach(p => {
      trackFlight(p.cabin, isAfKlm);
    });

    onApply(payloads);

    // Success feedback
    setLastAddedCount(payloads.length);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);

    setForm(prev => ({ ...prev, route: '', ticketPrice: 0, earnedMiles: 0, safXp: 0, flightNumber: '' }));
    // Keep airline for quick successive entries
    setSegments([]);
    setSubmitting(false);
    setDuplicateWarning(null);

    // Re-focus op route veld
    setTimeout(() => routeInputRef.current?.focus(), 100);
  };

  const handleChange = (key: string, value: any) => {
      setForm(prev => ({ ...prev, [key]: value }));
  };

  const selectedAirlineInfo = getAirlineByCode(form.airline);

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden mb-8 transition-all hover:shadow-2xl hover:shadow-slate-200/50 relative">
      
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">
              {lastAddedCount === 1 ? 'Flight added!' : `${lastAddedCount} flights added!`}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-8 pt-8 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
            <Plane size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              New Flight Entry
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Add a single flight or a multi-leg journey
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2">
          {/* Status Badge - shows which status is used for revenue miles calculation */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            currentStatus === 'Platinum' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            currentStatus === 'Gold' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            currentStatus === 'Silver' ? 'bg-slate-100 border-slate-300 text-slate-600' :
            'bg-sky-50 border-sky-200 text-sky-700'
          }`}>
            <Award size={12} />
            {currentStatus} ({getStatusMultiplier(currentStatus)}x miles)
          </div>
          
          {isMultiSegment ? (
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider animate-in fade-in">
                <Layers size={14} />
                Multi-Segment Detected
             </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Engine Ready
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Row 1: Date & Route */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-2">
              <InputGroup label="Date" icon={Calendar} tooltip="Date of the first flight segment.">
                <input
                  type="date"
                  value={form.date}
                  onChange={e => handleChange('date', e.target.value)}
                  className={`${inputBase} cursor-pointer`}
                />
              </InputGroup>
            </div>

            <div className="md:col-span-4">
              <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        <MapPin size={12} /> Route Chain
                    </label>
                    <Tooltip text="Enter airport codes separated by spaces (e.g. AMS JFK). For multi-city, add more codes (AMS CDG BKK)." />
                  </div>
                  {/* Round Trip Toggle */}
                  <button 
                    type="button"
                    onClick={() => setIsReturn(!isReturn)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-all ${isReturn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                  >
                    <Repeat size={10} /> Round Trip
                  </button>
              </div>
              <div className="relative group">
                  <input
                    ref={routeInputRef}
                    type="text"
                    placeholder="AMS JFK"
                    value={form.route}
                    onChange={e => handleChange('route', e.target.value.toUpperCase())}
                    className={`${inputBase} uppercase tracking-wider font-bold text-slate-700 pl-9`}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {isMultiSegment ? <Split size={14} /> : <ArrowRight size={14} />}
                  </div>
              </div>
            </div>

            {/* Airline Dropdown */}
            <div className="md:col-span-4" ref={airlineDropdownRef}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Plane size={12} /> Airline
                </label>
                <Tooltip text="Select operating airline. KLM/AF earn revenue-based miles. All SkyTeam partners earn XP." />
              </div>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAirlineDropdown(!showAirlineDropdown)}
                  className={`${inputBase} text-left flex items-center justify-between cursor-pointer ${form.airline ? 'font-bold text-slate-700' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {form.airline ? (
                      <>
                        <span className="uppercase">{form.airline}</span>
                        {selectedAirlineInfo && (
                          <span className="text-slate-400 font-normal text-xs truncate">
                            {selectedAirlineInfo.name}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">Select airline...</span>
                    )}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${showAirlineDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Revenue badge */}
                {selectedAirlineInfo?.revenueBasedMiles && (
                  <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-bold rounded-full uppercase">
                    Revenue
                  </div>
                )}

                {/* Dropdown */}
                {showAirlineDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100">
                      <input
                        type="text"
                        placeholder="Search airlines..."
                        value={airlineFilter}
                        onChange={e => setAirlineFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                    </div>

                    {/* Recent Airlines */}
                    {recentAirlines.length > 0 && !airlineFilter && (
                      <div className="p-2 border-b border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                          <Clock size={10} /> Recent
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recentAirlines.map(code => {
                            const info = getAirlineByCode(code);
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => selectAirline(code)}
                                className="px-2 py-1 text-xs font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Airline List */}
                    <div className="max-h-64 overflow-y-auto">
                      {getFilteredAirlines().map((airline, idx) => {
                        const isPrimary = airline.code === 'KLM' || airline.code === 'AF';
                        const isFirstPartner = idx === 2 && !airlineFilter; // After KLM, AF
                        const isFirstSkyTeam = idx === 5 && !airlineFilter; // After Flying Blue family

                        return (
                          <React.Fragment key={airline.code}>
                            {isFirstPartner && (
                              <div className="px-4 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Flying Blue Family
                              </div>
                            )}
                            {isFirstSkyTeam && (
                              <div className="px-4 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                SkyTeam Partners
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => selectAirline(airline.code)}
                              className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-blue-50 transition-colors text-left ${
                                isPrimary ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700 w-10">{airline.code}</span>
                                <div>
                                  <div className="text-sm text-slate-600">{airline.name}</div>
                                  <div className="text-[10px] text-slate-400">{airline.region}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {airline.revenueBasedMiles && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">
                                    Revenue Miles
                                  </span>
                                )}
                                {airline.note && (
                                  <span className="text-[9px] text-amber-600 max-w-[80px] text-right">
                                    {airline.note}
                                  </span>
                                )}
                                {isPrimary && (
                                  <Star size={12} className="text-amber-400 fill-amber-400" />
                                )}
                              </div>
                            </button>
                          </React.Fragment>
                        );
                      })}

                      {getFilteredAirlines().length === 0 && (
                        <div className="px-4 py-6 text-center text-slate-400 text-sm">
                          No airlines found
                        </div>
                      )}
                    </div>

                    {/* Manual entry hint */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <p className="text-[10px] text-slate-400 text-center">
                        Can't find your airline? Type the code manually above.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flight Number */}
            <div className="md:col-span-2">
              <InputGroup label="Flight #" icon={Plane} tooltip="Flight number (e.g. KL1775). Optional but useful for tracking.">
                <input
                  type="text"
                  placeholder="KL1775"
                  value={form.flightNumber}
                  onChange={e => handleChange('flightNumber', e.target.value.toUpperCase())}
                  className={`${inputBase} uppercase tracking-wider font-mono text-slate-600`}
                  maxLength={10}
                />
              </InputGroup>
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 animate-in fade-in slide-in-from-top-1">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Possible duplicate</p>
                <p className="text-xs text-amber-600">{duplicateWarning}</p>
              </div>
            </div>
          )}

          <div className="h-px bg-slate-100" />

          {/* Row 2: Cabin Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              Cabin Class
              <Tooltip text="Affects XP calculation (Economy=Low, Business=High)." />
            </label>
            <div className="flex p-1 rounded-xl bg-slate-50 border border-slate-100">
              {cabinOptions.map((cabin) => {
                const isActive = form.cabin === cabin;
                return (
                  <button
                    key={cabin}
                    type="button"
                    onClick={() => handleChange('cabin', cabin)}
                    className={`
                      flex-1 relative text-xs font-semibold py-2.5 px-2 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                    `}
                  >
                    {cabin}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Metrics (Total) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Price met Yield Indicator */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Tag size={12} /> Total Price
                        </label>
                        <Tooltip text="Total ticket price in Euro. Used to calculate revenue-based miles." />
                    </div>
                    {/* Instant Yield Feedback */}
                    {yieldBadge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${yieldBadge.color} flex items-center gap-1 animate-in fade-in`}>
                            <TrendingUp size={8} /> {formatCurrency(cpx)}/XP
                        </span>
                    )}
                </div>
                <div className="relative group">
                    <input
                        type="number"
                        placeholder="0"
                        value={form.ticketPrice || ''}
                        onChange={e => handleChange('ticketPrice', Number(e.target.value))}
                        className={`${inputBase} font-mono`}
                        step="0.01"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">{currencySymbol}</div>
                </div>
            </div>

            <InputGroup label="Total Miles" icon={ArrowRight} rightElement="Miles" tooltip="Estimated miles earned. Auto-calculated for revenue tickets (AF/KLM) based on your status.">
              <div className="relative group">
                <input
                    type="number"
                    placeholder="0"
                    value={form.earnedMiles || ''}
                    onChange={e => handleChange('earnedMiles', Number(e.target.value))}
                    className={`${inputBase} font-mono text-blue-600 font-bold bg-blue-50/30 border-blue-100 focus:border-blue-400`}
                />
                {revenueInfo && (
                    <div className="absolute -bottom-5 right-0 text-[9px] text-blue-500 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                        <Zap size={8} fill="currentColor" /> {revenueInfo}
                    </div>
                )}
              </div>
            </InputGroup>

            {/* Calculated XP - PROMINENTER */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Award size={12} /> Calculated XP
                </label>
                <Tooltip text="Total XP for this trip. Auto-calculated based on distance bands (Domestic/Medium/Long) and cabin." />
              </div>
              <div className={`
                w-full rounded-xl border-2 px-3 py-2.5 font-mono font-black text-lg flex items-center justify-between
                transition-all duration-300
                ${totalXP > 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                  : 'bg-slate-50/30 border-slate-200 text-slate-400'}
              `}>
                <span>{totalXP > 0 ? `+${totalXP}` : '0'}</span>
                <span className="text-xs font-medium text-slate-400">XP</span>
              </div>
            </div>

            <InputGroup label="SAF XP" icon={Leaf} rightElement="XP" tooltip="Sustainable Aviation Fuel bonus XP. Enter manually if purchased.">
              <input
                type="number"
                placeholder="0"
                value={form.safXp || ''}
                onChange={e => handleChange('safXp', Number(e.target.value))}
                className={`${inputBase} font-mono`}
              />
            </InputGroup>
          </div>

          {/* Preview Section - ALTIJD TONEN */}
          <div className={`rounded-xl border transition-all duration-300 ${
            segments.length > 0 
              ? 'bg-slate-50 border-slate-100 p-4' 
              : 'bg-slate-50/50 border-dashed border-slate-200 p-4'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {isMultiSegment ? 'Multi-Segment Split' : 'Flight Preview'}
              </h4>
              {segments.length > 0 ? (
                <span className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-400">
                  {isMultiSegment ? 'Cost allocated by distance' : 'Direct Flight'}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  Enter route to preview
                </span>
              )}
            </div>
            
            {segments.length > 0 ? (
              <div className="space-y-2">
                {segments.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-700 w-24">{seg.from} <span className="text-slate-300">→</span> {seg.to}</div>
                      <div className="text-slate-400 font-mono">{Math.round(seg.distance)}mi</div>
                      <div className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">{seg.band}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Per-segment cabin selector */}
                      {isMultiSegment && (
                        <select
                          value={seg.cabin}
                          onChange={(e) => updateSegmentCabin(idx, e.target.value as CabinClass)}
                          className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {cabinOptions.map(cabin => (
                            <option key={cabin} value={cabin}>{cabin}</option>
                          ))}
                        </select>
                      )}
                      <div className="font-mono text-slate-500">{formatCurrency(seg.allocatedPrice)}</div>
                      <div className="font-bold text-emerald-600 w-12 text-right">+{seg.xp} XP</div>
                    </div>
                  </div>
                ))}
                {isMultiSegment && (
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <Layers size={12} />
                    Tip: Adjust cabin per segment if aircraft types differ (e.g. no Premium Economy on short-haul feeders)
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <div className="text-center">
                  <Plane size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Enter a valid route (e.g. AMS JFK)</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`
                w-full py-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all duration-200
                ${canSubmit 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}
              `}
            >
              {submitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  {isMultiSegment ? <Split size={18} /> : <Plus size={18} strokeWidth={3} />}
                  <span>{isMultiSegment ? `Add ${segments.length} Flights to Ledger` : 'Confirm & Add Flight'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
