// src/components/OnboardingFlow.tsx
// Multi-step onboarding wizard for new users

import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  Loader2,
  Clipboard,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { AIRPORTS } from '../utils/airports';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../utils/format';
import { StatusLevel, ActivityTransaction } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { localParseText, isLikelyFlyingBlueContent, type AIParsedResult } from '../modules/local-text-parser';

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
  isReturningUser: boolean;
}

interface OnboardingFlowProps {
  userEmail: string;
  onComplete: (data: OnboardingData) => void;
  // New: callback for when PDF is parsed and imported
  onPdfParsed?: (result: AIParsedResult, includeHistoricalBalance: boolean) => void;
  // Legacy: external PDF import (deprecated)
  onPdfImport?: () => void;
  pdfImportResult?: {
    flightsCount: number;
    xpDetected: number;
    statusDetected: StatusLevel | null;
    milesBalance: number;
  } | null;
  onSkip?: () => void;
  isReturningUser?: boolean;
  // Existing data to prefill
  existingData?: {
    currency?: CurrencyCode;
    homeAirport?: string | null;
    currentStatus?: StatusLevel;
    currentXP?: number;
    currentUXP?: number;
    rolloverXP?: number;
    milesBalance?: number;
    ultimateCycleType?: 'qualification' | 'calendar';
    targetCPM?: number;
    emailConsent?: boolean;
  };
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
  onPdfParsed,
  onPdfImport,
  pdfImportResult,
  onSkip,
  isReturningUser = false,
  existingData,
}) => {
  // Analytics
  const { trackOnboarding, trackOnboardingStepComplete } = useAnalytics();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [skippedPdf, setSkippedPdf] = useState(false);

  // Inline parser state
  const [pasteText, setPasteText] = useState('');
  const [parseState, setParseState] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [parseResult, setParseResult] = useState<AIParsedResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [includeHistoricalBalance, setIncludeHistoricalBalance] = useState(true);

  // Form data - prefilled with existing data if available
  const [currency, setCurrency] = useState<CurrencyCode>(existingData?.currency || 'EUR');
  const [homeAirport, setHomeAirport] = useState<string | null>(existingData?.homeAirport || null);
  const [currentStatus, setCurrentStatus] = useState<StatusLevel>(existingData?.currentStatus || 'Explorer');
  const [currentXP, setCurrentXP] = useState<number>(existingData?.currentXP || 0);
  const [currentUXP, setCurrentUXP] = useState<number>(existingData?.currentUXP || 0);
  const [rolloverXP, setRolloverXP] = useState<number>(existingData?.rolloverXP || 0);
  const [milesBalance, setMilesBalance] = useState<number>(existingData?.milesBalance || 0);
  const [ultimateCycleType, setUltimateCycleType] = useState<'qualification' | 'calendar'>(existingData?.ultimateCycleType || 'qualification');
  const [targetCPM, setTargetCPM] = useState<number>(existingData?.targetCPM || 0.012);
  const [emailConsent, setEmailConsent] = useState<boolean>(existingData?.emailConsent || false);

  // Check if paste text is valid Flying Blue content
  const isValidPasteContent = pasteText.length > 100 && isLikelyFlyingBlueContent(pasteText);

  // Get currency symbol
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '€';

  // Determine if we need to show status step
  const pdfComplete = (pdfImportResult && pdfImportResult.statusDetected) || (parseResult && parseResult.pdfHeader.status);
  const showStatusStep = skippedPdf || !pdfComplete;

  // Handle inline parse
  const handleParse = useCallback(async () => {
    if (!isValidPasteContent) return;
    
    setParseState('parsing');
    setParseError(null);
    
    try {
      const result = await localParseText(pasteText, { debug: false });
      
      if (result.success) {
        setParseResult(result.data);
        setParseState('success');
        
        // Auto-apply detected values
        if (result.data.pdfHeader.status) {
          setCurrentStatus(result.data.pdfHeader.status);
        }
        if (result.data.pdfHeader.xp > 0) {
          setCurrentXP(result.data.pdfHeader.xp);
        }
        if (result.data.pdfHeader.uxp > 0) {
          setCurrentUXP(result.data.pdfHeader.uxp);
        }
        if (result.data.pdfHeader.miles > 0) {
          setMilesBalance(result.data.pdfHeader.miles);
        }
        if (result.data.qualificationSettings?.startingXP) {
          setRolloverXP(result.data.qualificationSettings.startingXP);
        }
        
        // Call onPdfParsed if provided
        if (onPdfParsed) {
          onPdfParsed(result.data, includeHistoricalBalance);
        }
      } else {
        setParseError(result.error.message);
        setParseState('error');
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Unknown error');
      setParseState('error');
    }
  }, [pasteText, isValidPasteContent, onPdfParsed, includeHistoricalBalance]);

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setPasteText(clipboardText);
    } catch {
      // Clipboard API might not be available
    }
  };

  // Apply PDF data when available (legacy support)
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
      // Track step completion
      const completedStep = steps[currentStep];
      if (completedStep) {
        trackOnboardingStepComplete(currentStep + 1, completedStep.id);
      }
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
    // Track onboarding completion
    trackOnboarding(!!pdfImportResult, (pdfImportResult?.flightsCount || 0) > 0);
    
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
      isReturningUser,
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
                {isReturningUser ? 'Welcome Back!' : 'Welcome to SkyStatus Pro!'}
              </h2>
              <p className="text-slate-500">
                {isReturningUser 
                  ? "Let's update your preferences."
                  : "Let's personalize your experience in a few quick steps."}
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
        // Show success state if we have parsed data or legacy import result
        const hasImportedData = parseState === 'success' || pdfImportResult;
        const importedFlightsCount = parseResult?.flights.length || pdfImportResult?.flightsCount || 0;
        const importedXP = parseResult?.pdfHeader.xp || pdfImportResult?.xpDetected || 0;
        const importedStatus = parseResult?.pdfHeader.status || pdfImportResult?.statusDetected;
        const importedMiles = parseResult?.pdfHeader.miles || pdfImportResult?.milesBalance || 0;
        
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Import Your Flying Blue Data
              </h2>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600">
                <Shield size={12} />
                <span>100% Private - Data stays on your device</span>
              </div>
            </div>

            {!hasImportedData ? (
              <>
                {parseState === 'idle' || parseState === 'error' ? (
                  <div className="space-y-3">
                    {/* Instructions */}
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                      <ol className="space-y-1.5">
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                          <span>
                            Go to{' '}
                            <a 
                              href="https://www.flyingblue.com/en/account/activity" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              flyingblue.com → Activity
                            </a>
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                          <span>Click <strong>"More"</strong> until all loaded, then <strong>"Download"</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                          <span>Open PDF, select all (Ctrl+A), copy (Ctrl+C), paste below</span>
                        </li>
                      </ol>
                    </div>

                    {/* Paste area */}
                    <div className="relative">
                      <textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="Paste your Flying Blue PDF content here..."
                        className={`w-full h-32 p-3 border-2 rounded-xl resize-none font-mono text-xs transition-colors focus:outline-none relative z-10 ${
                          pasteText && !isValidPasteContent
                            ? 'border-amber-300 bg-amber-50'
                            : isValidPasteContent
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 focus:border-blue-400 bg-white'
                        }`}
                      />
                      
                      {/* Paste hint - non-blocking */}
                      {!pasteText && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none z-0">
                          <Clipboard size={24} className="text-slate-300" />
                          <span className="text-xs text-slate-400">Paste here (Ctrl+V)</span>
                        </div>
                      )}
                    </div>

                    {/* Error message */}
                    {parseState === 'error' && parseError && (
                      <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg">
                        <AlertCircle size={14} />
                        <span>{parseError}</span>
                      </div>
                    )}

                    {/* Parse button */}
                    {isValidPasteContent && (
                      <button
                        onClick={handleParse}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-700 transition-all"
                      >
                        Import Data
                      </button>
                    )}
                  </div>
                ) : parseState === 'parsing' ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
                    <p className="text-slate-600 text-sm font-medium">Analyzing your data...</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Import Successful!</p>
                    <p className="text-xs text-emerald-600">Your data has been imported</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-emerald-600 text-xs font-medium">Flights</p>
                    <p className="font-bold text-emerald-800">{importedFlightsCount}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-emerald-600 text-xs font-medium">XP</p>
                    <p className="font-bold text-emerald-800">{importedXP.toLocaleString()}</p>
                  </div>
                  {importedStatus && (
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-emerald-600 text-xs font-medium">Status</p>
                      <p className="font-bold text-emerald-800">{importedStatus}</p>
                    </div>
                  )}
                  {importedMiles > 0 && (
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-emerald-600 text-xs font-medium">Miles</p>
                      <p className="font-bold text-emerald-800">{importedMiles.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                {/* Historical balance notice */}
                {parseResult?.milesReconciliation?.needsCorrection && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={includeHistoricalBalance}
                        onChange={(e) => setIncludeHistoricalBalance(e.target.checked)}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-emerald-700">
                        Include +{parseResult.milesReconciliation.difference.toLocaleString()} historical miles
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
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
                <a href="/privacy" className="text-blue-600 hover:underline">
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
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {isReturningUser ? 'Settings Updated!' : "You're All Set!"}
              </h2>
              <p className="text-slate-500">
                {isReturningUser ? 'Your new preferences' : "Here's your setup summary"}
              </p>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
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

        {/* Content - min-h-0 needed for flex overflow to work */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">{renderStep()}</div>

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

            {/* Skip button - shown on steps 2-5 (not welcome or done) */}
            {steps[currentStep]?.id !== 'welcome' && steps[currentStep]?.id !== 'done' && (
              <button
                onClick={steps[currentStep]?.id === 'import' ? handleSkipPdf : goNext}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip
              </button>
            )}

            {steps[currentStep]?.id === 'done' ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                {isReturningUser ? 'Save & Close' : 'Start Exploring'}
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
