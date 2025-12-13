// src/components/OnboardingFlow.tsx
// Multi-step onboarding wizard for new users

import React, { useState, useMemo, useRef } from 'react';
import {
  Plane,
  Globe,
  FileText,
  Upload,
  Target,
  Mail,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Search,
  Star,
  AlertCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { AIRPORTS } from '../utils/airports';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../utils/format';
import { StatusLevel } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingData {
  currency: CurrencyCode;
  homeAirport: string | null;
  // From PDF or manual
  currentStatus: StatusLevel;
  currentXP: number;
  currentUXP: number;
  rolloverXP: number;
  milesBalance: number;
  ultimateCycleType: 'qualification' | 'calendar';
  // Valuation
  targetCPM: number;
  // Email
  emailConsent: boolean;
  // Tracking
  pdfImported: boolean;
  pdfFlightsCount: number;
}

interface OnboardingFlowProps {
  userEmail: string;
  onComplete: (data: OnboardingData) => void;
  onPdfImport: () => void;
  pdfImportResult?: {
    flightsCount: number;
    xpDetected: number;
    statusDetected: StatusLevel | null;
    milesBalance: number;
  } | null;
  onSkip?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_OPTIONS: { value: StatusLevel; label: string; xpRequired: number }[] = [
  { value: 'Explorer', label: 'Explorer', xpRequired: 0 },
  { value: 'Silver', label: 'Silver', xpRequired: 100 },
  { value: 'Gold', label: 'Gold', xpRequired: 180 },
  { value: 'Platinum', label: 'Platinum', xpRequired: 300 },
  { value: 'Ultimate', label: 'Ultimate', xpRequired: 400 },
];

const CPM_PRESETS = [
  { value: 0.008, label: 'Conservative', description: 'Easy economy redemptions' },
  { value: 0.012, label: 'Average', description: 'Typical good deals' },
  { value: 0.018, label: 'Aspirational', description: 'Premium cabin long-haul' },
];

// Priority airports (Flying Blue hubs)
const PRIORITY_AIRPORTS = ['AMS', 'CDG'];

// ============================================================================
// AIRPORT SELECTOR COMPONENT
// ============================================================================

const AirportSelector: React.FC<{
  value: string | null;
  onChange: (code: string | null) => void;
  currencySymbol: string;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const airportList = useMemo(() => {
    const allAirports = Object.entries(AIRPORTS).map(([code, info]) => ({
      code,
      name: info.name,
      country: info.country,
      isPriority: PRIORITY_AIRPORTS.includes(code),
    }));

    // Filter by search
    const filtered = search
      ? allAirports.filter(
          (a) =>
            a.code.toLowerCase().includes(search.toLowerCase()) ||
            a.name.toLowerCase().includes(search.toLowerCase())
        )
      : allAirports;

    // Sort: priority first, then alphabetically
    return filtered.sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return a.code.localeCompare(b.code);
    });
  }, [search]);

  const selectedAirport = value ? AIRPORTS[value] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left flex items-center justify-between hover:border-slate-300 transition-colors"
      >
        {value && selectedAirport ? (
          <span className="font-medium text-slate-800">
            {value} - {selectedAirport.name}
          </span>
        ) : (
          <span className="text-slate-400">Select your home airport (optional)</span>
        )}
        <ChevronRight
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search airports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                No home airport
              </button>
              {airportList.slice(0, 100).map((airport) => (
                <button
                  key={airport.code}
                  type="button"
                  onClick={() => {
                    onChange(airport.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    value === airport.code ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {airport.isPriority && <Star size={12} className="text-amber-500 fill-amber-500" />}
                  <span className="font-mono font-medium">{airport.code}</span>
                  <span className="text-slate-500 truncate">{airport.name}</span>
                </button>
              ))}
              {airportList.length > 100 && (
                <div className="px-4 py-2 text-xs text-slate-400 text-center">
                  Type to search more airports...
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userEmail,
  onComplete,
  onPdfImport,
  pdfImportResult,
  onSkip,
}) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [skippedPdf, setSkippedPdf] = useState(false);

  // Form data
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [homeAirport, setHomeAirport] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusLevel>('Explorer');
  const [currentXP, setCurrentXP] = useState<number>(0);
  const [currentUXP, setCurrentUXP] = useState<number>(0);
  const [rolloverXP, setRolloverXP] = useState<number>(0);
  const [milesBalance, setMilesBalance] = useState<number>(0);
  const [ultimateCycleType, setUltimateCycleType] = useState<'qualification' | 'calendar'>('qualification');
  const [targetCPM, setTargetCPM] = useState<number>(0.012);
  const [emailConsent, setEmailConsent] = useState<boolean>(false);

  // Get currency symbol
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '€';

  // Determine if we need to show status step
  const pdfComplete = pdfImportResult && pdfImportResult.statusDetected;
  const showStatusStep = skippedPdf || !pdfComplete;

  // Apply PDF data when available
  React.useEffect(() => {
    if (pdfImportResult) {
      if (pdfImportResult.statusDetected) {
        setCurrentStatus(pdfImportResult.statusDetected);
      }
      if (pdfImportResult.xpDetected > 0) {
        setCurrentXP(pdfImportResult.xpDetected);
      }
      if (pdfImportResult.milesBalance > 0) {
        setMilesBalance(pdfImportResult.milesBalance);
      }
    }
  }, [pdfImportResult]);

  // Steps configuration
  const steps = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'import', title: 'Import' },
    ...(showStatusStep ? [{ id: 'status', title: 'Status' }] : []),
    { id: 'valuation', title: 'Valuation' },
    { id: 'email', title: 'Updates' },
    { id: 'done', title: 'Done' },
  ];

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Navigation
  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipPdf = () => {
    setSkippedPdf(true);
    goNext();
  };

  const handleComplete = () => {
    onComplete({
      currency,
      homeAirport,
      currentStatus,
      currentXP,
      currentUXP,
      rolloverXP,
      milesBalance,
      ultimateCycleType,
      targetCPM,
      emailConsent,
      pdfImported: !!pdfImportResult,
      pdfFlightsCount: pdfImportResult?.flightsCount || 0,
    });
  };

  // Input styling helper
  const noSpinnerClass =
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  // =========================================================================
  // RENDER STEPS
  // =========================================================================

  const renderStep = () => {
    const stepId = steps[currentStep]?.id;

    switch (stepId) {
      // ---------------------------------------------------------------------
      // STEP: WELCOME
      // ---------------------------------------------------------------------
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Plane className="text-white transform -rotate-45" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                Welcome to SkyStatus Pro!
              </h2>
              <p className="text-slate-500">
                Let's personalize your experience in a few quick steps.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <Globe size={14} className="inline mr-2" />
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Used for all costs and valuations
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <Plane size={14} className="inline mr-2" />
                  Home Airport
                </label>
                <AirportSelector
                  value={homeAirport}
                  onChange={setHomeAirport}
                  currencySymbol={currencySymbol}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Useful for mileage run suggestions (optional)
                </p>
              </div>
            </div>
          </div>
        );

      // ---------------------------------------------------------------------
      // STEP: IMPORT PDF
      // ---------------------------------------------------------------------
      case 'import':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="text-blue-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Import Your Flying Blue Data
              </h2>
              <p className="text-slate-500 text-sm">
                The fastest way to get started — upload your activity statement and
                we'll import everything automatically.
              </p>
            </div>

            {!pdfImportResult ? (
              <button
                onClick={onPdfImport}
                className="w-full p-6 border-2 border-dashed border-blue-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
              >
                <Upload
                  size={40}
                  className="text-blue-300 group-hover:text-blue-500 mx-auto mb-3 transition-colors"
                />
                <p className="font-bold text-slate-700">Upload PDF</p>
                <p className="text-xs text-slate-400 mt-1">
                  From flyingblue.com → My Account → Activity overview
                </p>
              </button>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">Import Successful!</p>
                    <p className="text-xs text-emerald-600">Your data has been imported</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-emerald-600 text-xs font-medium">Flights</p>
                    <p className="font-bold text-emerald-800">{pdfImportResult.flightsCount}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-emerald-600 text-xs font-medium">XP Detected</p>
                    <p className="font-bold text-emerald-800">{pdfImportResult.xpDetected.toLocaleString()}</p>
                  </div>
                  {pdfImportResult.statusDetected && (
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-emerald-600 text-xs font-medium">Status</p>
                      <p className="font-bold text-emerald-800">{pdfImportResult.statusDetected}</p>
                    </div>
                  )}
                  {pdfImportResult.milesBalance > 0 && (
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-emerald-600 text-xs font-medium">Miles Balance</p>
                      <p className="font-bold text-emerald-800">{pdfImportResult.milesBalance.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleSkipPdf}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip for now, I'll do this later
              </button>
            </div>
          </div>
        );

      // ---------------------------------------------------------------------
      // STEP: STATUS (only if PDF skipped or incomplete)
      // ---------------------------------------------------------------------
      case 'status':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="text-indigo-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Your Flying Blue Status
              </h2>
              <p className="text-slate-500 text-sm">
                Tell us where you're at so we can track your progress.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Current Status
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setCurrentStatus(status.value)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        currentStatus === status.value
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <p className="font-bold text-xs">{status.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {currentStatus === 'Ultimate' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-amber-800 mb-3">
                    <AlertCircle size={14} className="inline mr-2" />
                    Ultimate Cycle Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                      <input
                        type="radio"
                        name="ultimateCycle"
                        value="qualification"
                        checked={ultimateCycleType === 'qualification'}
                        onChange={() => setUltimateCycleType('qualification')}
                        className="w-4 h-4 text-amber-600"
                      />
                      <div>
                        <p className="font-medium text-slate-800">Standard</p>
                        <p className="text-xs text-slate-500">Follows qualification year (Nov-Oct)</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                      <input
                        type="radio"
                        name="ultimateCycle"
                        value="calendar"
                        checked={ultimateCycleType === 'calendar'}
                        onChange={() => setUltimateCycleType('calendar')}
                        className="w-4 h-4 text-amber-600"
                      />
                      <div>
                        <p className="font-medium text-slate-800">Legacy</p>
                        <p className="text-xs text-slate-500">Calendar year (Jan-Dec)</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    XP this qualification year
                  </label>
                  <input
                    type="number"
                    value={currentXP || ''}
                    onChange={(e) => setCurrentXP(Number(e.target.value))}
                    placeholder="0"
                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none ${noSpinnerClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Rollover XP
                    <span className="font-normal text-slate-400 ml-1">(if known)</span>
                  </label>
                  <input
                    type="number"
                    value={rolloverXP || ''}
                    onChange={(e) => setRolloverXP(Number(e.target.value))}
                    placeholder="0"
                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none ${noSpinnerClass}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Current miles balance
                  </label>
                  <input
                    type="number"
                    value={milesBalance || ''}
                    onChange={(e) => setMilesBalance(Number(e.target.value))}
                    placeholder="0"
                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none ${noSpinnerClass}`}
                  />
                </div>
                {(currentStatus === 'Platinum' || currentStatus === 'Ultimate') && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      UXP
                      <span className="font-normal text-slate-400 ml-1">(Ultimate XP)</span>
                    </label>
                    <input
                      type="number"
                      value={currentUXP || ''}
                      onChange={(e) => setCurrentUXP(Number(e.target.value))}
                      placeholder="0"
                      className={`w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none ${noSpinnerClass}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      // ---------------------------------------------------------------------
      // STEP: MILE VALUATION
      // ---------------------------------------------------------------------
      case 'valuation':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-emerald-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                How Do You Value Your Miles?
              </h2>
              <p className="text-slate-500 text-sm">
                This affects portfolio calculations and ROI metrics.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CPM_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTargetCPM(preset.value)}
                  className={`p-4 rounded-xl text-center transition-all ${
                    Math.abs(targetCPM - preset.value) < 0.001
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <p className="font-bold">{preset.label}</p>
                  <p
                    className={`text-lg font-black ${
                      Math.abs(targetCPM - preset.value) < 0.001 ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {currencySymbol}{preset.value.toFixed(3)}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      Math.abs(targetCPM - preset.value) < 0.001
                        ? 'text-emerald-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Or set a custom value
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={targetCPM}
                    onChange={(e) => setTargetCPM(parseFloat(e.target.value) || 0.012)}
                    className={`flex-1 p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 outline-none ${noSpinnerClass}`}
                  />
                  <span className="text-slate-400 text-sm">per mile</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-700">
                <Sparkles size={12} className="inline mr-1" />
                <strong>Tip:</strong> This is the redemption value you aim for when booking award
                flights. Conservative ({currencySymbol}0.008) is easy to achieve, while aspirational (
                {currencySymbol}0.018+) requires strategic booking.
              </p>
            </div>
          </div>
        );

      // ---------------------------------------------------------------------
      // STEP: EMAIL CONSENT
      // ---------------------------------------------------------------------
      case 'email':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="text-violet-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Stay in the Loop</h2>
              <p className="text-slate-500 text-sm">Get occasional updates about new features.</p>
            </div>

            <label className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <p className="font-medium text-slate-800">Yes, send me occasional product updates</p>
                <p className="text-xs text-slate-500 mt-1">
                  New features, tips & tricks. No spam, unsubscribe anytime.
                </p>
              </div>
            </label>

            <div className="bg-slate-100 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                We'll only use your email (<strong>{userEmail}</strong>) for SkyStatus updates.
                See our{' '}
                <a href="#/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        );

      // ---------------------------------------------------------------------
      // STEP: DONE
      // ---------------------------------------------------------------------
      case 'done':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Rocket className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">You're All Set!</h2>
              <p className="text-slate-500">Here's your setup summary</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Currency</span>
                <span className="font-bold text-slate-800">
                  {currencySymbol} {currency}
                </span>
              </div>
              {homeAirport && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Home Airport</span>
                  <span className="font-bold text-slate-800">
                    {homeAirport} - {AIRPORTS[homeAirport]?.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Status</span>
                <span className="font-bold text-slate-800">
                  {currentStatus}
                  {currentXP > 0 && ` (${currentXP.toLocaleString()} XP)`}
                </span>
              </div>
              {milesBalance > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Miles Balance</span>
                  <span className="font-bold text-slate-800">{milesBalance.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Mile Valuation</span>
                <span className="font-bold text-slate-800">
                  {currencySymbol}{targetCPM.toFixed(3)} per mile
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Email Updates</span>
                <span className="font-bold text-slate-800">
                  {emailConsent ? '✓ Subscribed' : 'Not subscribed'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with progress */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane className="text-blue-600 transform -rotate-45" size={20} />
              <span className="font-bold text-slate-800">SkyStatus Pro</span>
            </div>
            {onSkip && currentStep < totalSteps - 1 && (
              <button
                onClick={onSkip}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-600'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

        {/* Footer with navigation */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                currentStep === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            {steps[currentStep]?.id === 'done' ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Start Exploring
                <Rocket size={18} />
              </button>
            ) : steps[currentStep]?.id === 'import' && pdfImportResult ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
