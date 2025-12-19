// src/components/Dashboard/SimpleDashboard.tsx
// Simplified dashboard view for casual users

import React, { useMemo, useState, lazy, Suspense } from 'react';
import { FlightRecord, MilesRecord, ManualLedger, XPRecord, RedemptionRecord, ViewState, PdfBaseline } from '../../types';
import { QualificationSettings } from '../../hooks/useUserData';
import { formatNumber } from '../../utils/format';
import { useCurrency } from '../../lib/CurrencyContext';
import { useViewMode } from '../../hooks/useViewMode';
import { calculateMilesStats } from '../../utils/loyalty-logic';
import { calculateQualificationCycles } from '../../utils/xp-logic';
import { normalizeQualificationSettings, getDisplayStatus } from '../../utils/ultimate-bridge';
import {
  Plane,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Upload,
  PlusCircle,
  ChevronRight,
  Gauge,
  Crown,
  Target,
  Loader2,
} from 'lucide-react';
import { StatusLevel, getStatusTheme, getTargetXP, findActiveCycle } from './helpers';

// Lazy load PdfImportModal to reduce initial bundle
const PdfImportModal = lazy(() => import('../PdfImportModal'));

const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
      <Loader2 size={24} className="animate-spin text-blue-500" />
      <span className="text-slate-600">Loading...</span>
    </div>
  </div>
);

interface SimpleDashboardState {
  milesData: { month: string; totalMiles: number }[];
  xpData: XPRecord[];
  redemptions: RedemptionRecord[];
  xpRollover: number;
  currentMonth: string;
  flights: FlightRecord[];
  targetCPM: number;
  manualLedger: ManualLedger;
  qualificationSettings?: QualificationSettings | null;
  pdfBaseline?: PdfBaseline | null;
}

interface SimpleDashboardProps {
  state: SimpleDashboardState;
  navigateTo: (view: ViewState) => void;
  onPdfImport?: (
    flights: FlightRecord[], 
    miles: MilesRecord[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { 
      cycleStartMonth: string; 
      cycleStartDate?: string;
      startingStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
      startingXP?: number;
    },
    bonusXpByMonth?: Record<string, number>
  ) => void;
  demoStatus?: StatusLevel;
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  state,
  navigateTo,
  onPdfImport,
  demoStatus,
}) => {
  const { format: formatCurrency } = useCurrency();
  const { setViewMode } = useViewMode();
  const [showPdfImport, setShowPdfImport] = useState(false);

  // Calculate miles stats
  const milesStats = useMemo(
    () => calculateMilesStats(
      state.milesData,
      state.currentMonth,
      state.redemptions,
      state.targetCPM
    ),
    [state.milesData, state.currentMonth, state.redemptions, state.targetCPM]
  );

  // Normalize qualification settings
  const normalizedSettings = useMemo(
    () => normalizeQualificationSettings(state.qualificationSettings ?? null),
    [state.qualificationSettings]
  );

  // Calculate qualification cycles
  const { cycles } = useMemo(
    () => calculateQualificationCycles(
      state.xpData,
      state.xpRollover,
      state.flights,
      state.manualLedger,
      normalizedSettings,
      state.pdfBaseline
    ),
    [state.xpData, state.xpRollover, state.flights, state.manualLedger, normalizedSettings, state.pdfBaseline]
  );

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);

  // Extract status info
  const cycleIsUltimate = activeCycle?.isUltimate ?? false;
  const rawActualStatus = (activeCycle?.actualStatus as StatusLevel) ?? 'Explorer';
  const actualStatus = demoStatus ?? getDisplayStatus(rawActualStatus, cycleIsUltimate);
  const isUltimate = demoStatus === 'Ultimate' || cycleIsUltimate;
  
  const actualXP = activeCycle?.actualXP ?? 0;
  const targetXP = getTargetXP(actualStatus);
  const theme = getStatusTheme(actualStatus, isUltimate);
  
  // Calculate projected XP (rollover + all month XP including booked flights)
  const projectedXP = useMemo(() => {
    if (!activeCycle) return actualXP;
    const totalMonthXP = activeCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return activeCycle.rolloverIn + totalMonthXP;
  }, [activeCycle, actualXP]);
  
  const hasProjectedXP = projectedXP > actualXP;
  
  // Calculate progress
  const progressPercent = Math.min(100, Math.round((actualXP / targetXP) * 100));
  const xpRemaining = Math.max(0, targetXP - actualXP);
  
  // Determine if on track (simple heuristic: >50% of target with >6 months remaining, or already qualified)
  const cycleEndDate = activeCycle?.endDate ? new Date(activeCycle.endDate) : new Date();
  const today = new Date();
  const monthsRemaining = Math.max(0, 
    (cycleEndDate.getFullYear() - today.getFullYear()) * 12 + 
    (cycleEndDate.getMonth() - today.getMonth())
  );
  
  const isQualified = actualXP >= targetXP;
  const onTrack = isQualified || (progressPercent >= 50 && monthsRemaining >= 6) || (progressPercent >= 75);
  
  // Format cycle end date
  const cycleEndFormatted = cycleEndDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Estimated miles value
  const milesValue = milesStats.netCurrent * state.targetCPM;

  // Status emoji/icon helper
  const getStatusIcon = () => {
    switch (actualStatus) {
      case 'Ultimate': return <Crown className="text-amber-400" size={28} />;
      case 'Platinum': return <Plane className="text-blue-500 rotate-45" size={28} />;
      case 'Gold': return <Plane className="text-amber-500 rotate-45" size={28} />;
      case 'Silver': return <Plane className="text-slate-400 rotate-45" size={28} />;
      default: return <Plane className="text-emerald-500 rotate-45" size={28} />;
    }
  };

  // Empty state for new users
  if (state.flights.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-brand-500 to-blue-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Plane className="rotate-45" size={28} />
            </div>
            <h2 className="text-2xl font-bold">Welcome to SkyStatus</h2>
          </div>
          
          <p className="text-white/80 text-lg mb-6">
            Track your Flying Blue status and see how close you are to your next level.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowPdfImport(true)}
              className="flex items-center justify-center gap-2 bg-white text-brand-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Upload size={20} />
              Import PDF
            </button>
            <button
              onClick={() => navigateTo('addFlight')}
              className="flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl font-bold border border-white/30 hover:bg-white/30 transition-all"
            >
              <PlusCircle size={20} />
              Add Flight
            </button>
          </div>
        </div>

        {/* PDF Import Modal */}
        {onPdfImport && showPdfImport && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <PdfImportModal
              isOpen={showPdfImport}
              onClose={() => setShowPdfImport(false)}
              onImport={onPdfImport}
              existingFlights={state.flights}
              existingMiles={state.milesData}
            />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Your Status</h2>
        <button
          onClick={() => setViewMode('full')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Gauge size={16} />
          Full analytics
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Main Status Card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl border ${
        isUltimate 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-100'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.meshGradient}`} />
        
        <div className="relative z-10">
          {/* Status Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isUltimate ? 'bg-slate-700' : 'bg-white/80'} shadow-sm`}>
                {getStatusIcon()}
              </div>
              <div>
                <h3 className={`text-3xl font-black ${theme.accentColor}`}>
                  {actualStatus}
                </h3>
                <p className={`text-sm font-medium ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                  Valid until {cycleEndFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className={`text-sm font-semibold ${isUltimate ? 'text-slate-300' : 'text-slate-600'}`}>
                Your progress
              </span>
              <div className="text-right">
                <span className={`text-sm font-bold ${theme.accentColor}`}>
                  {actualXP} / {targetXP} XP
                </span>
                {hasProjectedXP && (
                  <span className={`text-xs ml-1.5 ${isUltimate ? 'text-slate-400' : 'text-blue-500'}`}>
                    ({projectedXP} projected)
                  </span>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className={`relative w-full h-4 rounded-full overflow-hidden ${
              isUltimate ? 'bg-slate-700' : 'bg-slate-100'
            }`}>
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} rounded-full transition-all duration-1000`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* Progress Label */}
            <div className="mt-3">
              {isQualified ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">
                    You've secured {actualStatus} for next year!
                  </span>
                </div>
              ) : onTrack ? (
                <div className={`flex items-center gap-2 ${isUltimate ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">
                    On track — {xpRemaining} XP to go
                    <span className={`font-normal ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}> • {monthsRemaining} months left</span>
                  </span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 ${isUltimate ? 'text-amber-400' : 'text-amber-600'}`}>
                  <AlertCircle size={18} />
                  <span className="font-semibold">
                    {xpRemaining} XP needed
                    <span className={`font-normal ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}> • {monthsRemaining} months left</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action */}
          <button
            onClick={() => navigateTo('mileageRun')}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              isUltimate
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target size={18} />
            Plan flights to reach your goal
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Miles Card - Clickable */}
      <button
        onClick={() => navigateTo('miles')}
        className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:border-slate-200 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <Wallet className="text-blue-600" size={22} />
            </div>
            <h3 className="font-bold text-slate-900">Your Miles</h3>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-black text-slate-900">
              {formatNumber(milesStats.netCurrent)}
            </p>
            <p className="text-sm text-slate-500 font-medium">Miles balance</p>
          </div>
          <div>
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrency(milesValue)}
            </p>
            <p className="text-sm text-slate-500 font-medium">Estimated value</p>
          </div>
        </div>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPdfImport(true)}
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-semibold transition-all"
        >
          <Upload size={18} />
          Import PDF
        </button>
        <button
          onClick={() => navigateTo('addFlight')}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-xl font-semibold transition-all"
        >
          <PlusCircle size={18} />
          Add Flight
        </button>
      </div>

      {/* Switch to Full View hint */}
      <div className="text-center pt-4">
        <button
          onClick={() => setViewMode('full')}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Want more details? Switch to Full View →
        </button>
      </div>

      {/* PDF Import Modal */}
      {onPdfImport && showPdfImport && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PdfImportModal
            isOpen={showPdfImport}
            onClose={() => setShowPdfImport(false)}
            onImport={onPdfImport}
            existingFlights={state.flights}
            existingMiles={state.milesData}
          />
        </Suspense>
      )}
    </div>
  );
};
