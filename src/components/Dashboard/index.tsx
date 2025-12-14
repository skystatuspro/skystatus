// src/components/Dashboard/index.tsx
// Main Dashboard component - Command Center

import React, { useMemo, useState, useEffect } from 'react';
import { FlightRecord, MilesRecord, ManualLedger, XPRecord, RedemptionRecord } from '../../types';
import { QualificationSettings } from '../../hooks/useUserData';
import { formatNumber } from '../../utils/format';
import { useCurrency } from '../../lib/CurrencyContext';
import { useViewMode } from '../../hooks/useViewMode';
import { calculateMilesStats } from '../../utils/loyalty-logic';
import { calculateQualificationCycles } from '../../utils/xp-logic';
import { getValuationStatus } from '../../utils/valuation';
import { normalizeQualificationSettings, getDisplayStatus, getDisplayProjectedStatus } from '../../utils/ultimate-bridge';
import {
  Award,
  Wallet,
  Plane,
  CheckCircle2,
  History,
  Sparkles,
  Target,
  Calendar,
  ChevronRight,
  Clock,
  Upload,
  FileText,
  PlusCircle,
  HelpCircle,
  Crown,
  TrendingUp,
} from 'lucide-react';
import { Tooltip } from '../Tooltip';
import PdfImportModal from '../PdfImportModal';
import { FAQModal } from '../FAQModal';
import { FeedbackCard } from '../FeedbackCard';
import { shouldShowDashboardFeedback, incrementSessionCount } from '../../lib/feedbackService';

// Subcomponents
import { StatusLevel, getStatusTheme, getTargetXP, getProgressLabel, findActiveCycle, calculateUltimateChance } from './helpers';
import { KPICard } from './KPICard';
import { RiskMonitor } from './RiskMonitor';
import { SimpleDashboard } from './SimpleDashboard';

interface DashboardState {
  milesData: { month: string; totalMiles: number }[];
  xpData: XPRecord[];
  redemptions: RedemptionRecord[];
  xpRollover: number;
  currentMonth: string;
  flights: FlightRecord[];
  targetCPM: number;
  manualLedger: ManualLedger;
  qualificationSettings?: QualificationSettings | null;
}

interface DashboardProps {
  state: DashboardState;
  navigateTo: (view: any) => void;
  onUpdateCurrentMonth: (month: string) => void;
  onPdfImport?: (flights: FlightRecord[], miles: MilesRecord[]) => void;
  demoStatus?: StatusLevel; // Override status in demo mode
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  navigateTo,
  onUpdateCurrentMonth,
  onPdfImport,
  demoStatus,
}) => {
  const { format: formatCurrency, symbol: currencySymbol, formatPrecise } = useCurrency();
  const { isSimpleMode } = useViewMode();
  const [showPdfImport, setShowPdfImport] = useState(false);
  // Skip welcome screen if user already has flights (returning user)
  const [skipWelcome, setSkipWelcome] = useState(state.flights.length > 0);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);

  // Simple Mode: render simplified dashboard
  if (isSimpleMode) {
    return (
      <SimpleDashboard
        state={state}
        navigateTo={navigateTo}
        onPdfImport={onPdfImport}
        demoStatus={demoStatus}
      />
    );
  }

  // Auto-skip welcome when flights are loaded (handles async data loading)
  useEffect(() => {
    if (state.flights.length > 0 && !skipWelcome) {
      setSkipWelcome(true);
    }
  }, [state.flights.length, skipWelcome]);

  // Check for feedback eligibility on mount
  useEffect(() => {
    incrementSessionCount();
    setShowFeedbackCard(shouldShowDashboardFeedback());
  }, []);

  const milesStats = useMemo(
    () =>
      calculateMilesStats(
        state.milesData,
        state.currentMonth,
        state.redemptions,
        state.targetCPM
      ),
    [state.milesData, state.currentMonth, state.redemptions, state.targetCPM]
  );

  // Normalize qualification settings for core logic (Ultimate → Platinum + UXP)
  const normalizedSettings = useMemo(
    () => normalizeQualificationSettings(state.qualificationSettings ?? null),
    [state.qualificationSettings]
  );

  const { cycles } = useMemo(
    () =>
      calculateQualificationCycles(
        state.xpData,
        state.xpRollover,
        state.flights,
        state.manualLedger,
        normalizedSettings
      ),
    [state.xpData, state.xpRollover, state.flights, state.manualLedger, normalizedSettings]
  );

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);

  // Ultimate status data from cycle
  // In demo mode, determine Ultimate from demoStatus
  const cycleIsUltimate: boolean = activeCycle?.isUltimate ?? false;
  const cycleProjectedUltimate: boolean = activeCycle?.projectedUltimate ?? false;
  const isUltimate: boolean = demoStatus === 'Ultimate' || cycleIsUltimate;
  const projectedUltimate: boolean = demoStatus === 'Ultimate' || cycleProjectedUltimate;

  // Extract data from active cycle
  // Use bridge functions to get correct display status
  // For demo mode: use demoStatus directly
  // For real users: combine actualStatus with isUltimate flag
  const rawActualStatus: StatusLevel = (activeCycle?.actualStatus as StatusLevel) ?? 'Explorer';
  const rawProjectedStatus: StatusLevel = (activeCycle?.projectedStatus as StatusLevel) ?? rawActualStatus;
  
  const actualStatus: StatusLevel = demoStatus ?? getDisplayStatus(rawActualStatus, cycleIsUltimate);
  const projectedStatus: StatusLevel = demoStatus ?? getDisplayProjectedStatus(rawProjectedStatus, cycleProjectedUltimate);
  
  const actualXP: number = activeCycle?.actualXP ?? 0;
  const rolloverIn: number = activeCycle?.rolloverIn ?? 0;
  const rolloverOut: number = activeCycle?.rolloverOut ?? 0;

  // UXP data
  const actualUXP: number = activeCycle?.actualUXP ?? 0;
  const projectedUXP: number = activeCycle?.projectedUXP ?? 0;
  
  // Show Ultimate progress bar only for:
  // - Ultimate status (always)
  // - Platinum with >= 600 XP (secured requalification, chasing Ultimate)
  // Silver/Gold should focus on XP progress toward next status
  const showUltimateProgress = isUltimate || (actualStatus === 'Platinum' && actualXP >= 600);

  // Calculate months remaining in cycle
  const monthsRemaining = useMemo(() => {
    if (!activeCycle) return 12;
    const endDate = new Date(activeCycle.endDate);
    const today = new Date();
    const months = (endDate.getFullYear() - today.getFullYear()) * 12 + (endDate.getMonth() - today.getMonth());
    return Math.max(0, months);
  }, [activeCycle]);

  // Ultimate chance calculation
  const ultimateChance = useMemo(() => {
    if (!showUltimateProgress) return null;
    return calculateUltimateChance(actualUXP, projectedUXP, monthsRemaining);
  }, [showUltimateProgress, actualUXP, projectedUXP, monthsRemaining]);

  const projectedTotalXP = useMemo(() => {
    if (!activeCycle) return 0;
    const totalMonthXP = activeCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return activeCycle.rolloverIn + totalMonthXP;
  }, [activeCycle]);

  const hasProjectedUpgrade = projectedStatus !== actualStatus;

  const cycleYear = activeCycle
    ? new Date(activeCycle.endDate).getFullYear()
    : new Date().getFullYear();

  const theme = getStatusTheme(actualStatus, isUltimate);
  const targetXP = getTargetXP(actualStatus);
  const baselineEarnCpmEuro = milesStats.globalCPM / 100;

  const sortedRedemptions = useMemo(
    () =>
      [...state.redemptions].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [state.redemptions]
  );

  const actualProgress = Math.min(100, (actualXP / targetXP) * 100);
  const projectedProgress = Math.min(100, (projectedTotalXP / targetXP) * 100);

  const hasNoFlights = state.flights.length === 0;

  // Welcome screen for new users
  if ((hasNoFlights || showPdfImport) && onPdfImport && !skipWelcome) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Welcome to SkyStatus
            </h2>
            <p className="text-slate-500 mt-[2px] font-medium">
              Track your Flying Blue status and optimize your loyalty strategy
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-blue-600 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Plane size={200} className="text-white rotate-45" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Sparkles className="text-white" size={28} />
              </div>
              <span className="text-white/80 font-semibold text-sm uppercase tracking-wider">
                Get Started
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
              Import your Flying Blue history
            </h3>

            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Download your transaction history PDF from Flying Blue and import it here.
              We'll automatically extract all your flights, miles, and XP data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowPdfImport(true)}
                className="flex items-center justify-center gap-3 bg-white text-brand-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Upload size={22} />
                Import PDF
              </button>

              <button
                onClick={() => navigateTo('addFlight')}
                className="flex items-center justify-center gap-3 bg-white/20 text-white px-8 py-4 rounded-2xl font-bold text-lg backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all"
              >
                <PlusCircle size={22} />
                Add manually
              </button>
            </div>

            <button
              onClick={() => setShowFaqModal(true)}
              className="mt-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
            >
              <HelpCircle size={16} />
              Need help? Read the FAQ
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200">
          <h4 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
            <FileText size={20} className="text-brand-500" />
            How to download your Flying Blue PDF
          </h4>
          <ol className="space-y-3 text-slate-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Log in to <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold hover:underline">flyingblue.com</a></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Go to <strong>My Account</strong> → <strong>Activity overview</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <span className="text-amber-700 font-semibold">⚠️ Important:</span> Click the <strong>"More"</strong> button repeatedly until <em>all</em> your activities are visible on screen. Flying Blue only downloads what's currently displayed!
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Scroll back up and click <strong>"Download"</strong> to save the PDF</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Note:</strong> If you don't click "More" to load all activities first, your PDF will only contain recent transactions and your flight history will be incomplete.
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setSkipWelcome(true)}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now — view empty dashboard →
          </button>
        </div>

        {onPdfImport && (
          <PdfImportModal
            isOpen={showPdfImport}
            onClose={() => setShowPdfImport(false)}
            onImport={(flights, miles) => {
              onPdfImport(flights, miles);
            }}
            existingFlights={state.flights}
            existingMiles={state.milesData}
          />
        )}

        <FAQModal isOpen={showFaqModal} onClose={() => setShowFaqModal(false)} />
      </div>
    );
  }

  const commandCenterContent = (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Command Center
          </h2>
          <p className="text-slate-500 mt-[2px] font-medium">
            Loyalty status overview for{' '}
            <span className="font-bold text-brand-600">CY {cycleYear}</span>
          </p>
        </div>

        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Calendar size={12} />
            Current ledger
            <Tooltip text="Choose the month that matches your Flying Blue activity statement. This controls which XP and miles data is displayed." />
          </span>
          <input
            type="month"
            value={state.currentMonth}
            onChange={(e) => onUpdateCurrentMonth(e.target.value)}
            className="font-mono text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer transition-all hover:border-slate-300"
          />
        </div>
      </div>

      {showFeedbackCard && (
        <FeedbackCard onDismiss={() => setShowFeedbackCard(false)} />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Status Card */}
          <div className={`relative overflow-hidden rounded-[2.5rem] pl-10 pr-8 py-8 shadow-xl border ${
            isUltimate 
              ? 'border-slate-600 bg-slate-800' 
              : 'border-slate-100 bg-white'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.meshGradient}`} />
            <div className="absolute top-1 right-0 p-12 opacity-10">
              {isUltimate ? (
                <Crown size={180} className="text-slate-400" />
              ) : (
                <Award size={180} className={theme.iconColor} />
              )}
            </div>

            <div className="relative z-10 flex flex-col justify-between">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className={`${isUltimate ? 'text-slate-400' : theme.iconColor} rotate-45`} size={22} />
                    <span className={`text-xs font-extrabold tracking-widest uppercase ${isUltimate ? 'text-slate-400' : 'text-slate-400'}`}>
                      SkyTeam Alliance
                    </span>
                  </div>

                  <h3 className={`text-4xl font-black tracking-tight flex items-center gap-3 ${theme.accentColor}`}>
                    {isUltimate ? 'Ultimate' : actualStatus}
                    {isUltimate ? (
                      <Crown size={32} className="text-slate-300" />
                    ) : actualStatus === 'Platinum' ? (
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    ) : null}
                  </h3>

                  {hasProjectedUpgrade && !isUltimate && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Clock size={12} className="text-blue-500" />
                      <span className="text-xs font-bold text-blue-600">
                        Projected: {projectedStatus}
                      </span>
                    </div>
                  )}
                  
                  {/* Projected Ultimate badge */}
                  {projectedUltimate && !isUltimate && actualStatus === 'Platinum' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Crown size={12} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-600">
                        Projected: Ultimate
                      </span>
                    </div>
                  )}
                </div>

                <div className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm border ${
                  isUltimate 
                    ? 'text-slate-300 bg-slate-800/60 border-slate-600' 
                    : 'text-slate-400/80 bg-white/60 border-white/40'
                }`}>
                  {cycleYear} cycle
                </div>
              </div>

              {/* Progress Section */}
              <div className="mb-8">
                <div className={`flex justify-between text-xs font-bold uppercase tracking-widest mb-2.5 ${isUltimate ? 'text-slate-400' : 'text-slate-400'}`}>
                  <span className="flex items-center gap-1">
                    {getProgressLabel(actualStatus, actualStatus === 'Platinum')}
                    <Tooltip text="Actual XP earned from flown flights vs. the XP required to maintain or achieve your target status this cycle." />
                  </span>
                  <span>Target: {targetXP} XP</span>
                </div>

                <div className={`relative w-full rounded-full h-[20px] shadow-inner border overflow-hidden ${
                  isUltimate 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white/70 border-white/50'
                }`}>
                  {projectedTotalXP > actualXP && (
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.projectedBar} opacity-50 transition-all duration-1000 ease-out`}
                      style={{ width: `${projectedProgress}%` }}
                    />
                  )}
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} shadow-md transition-all duration-1000 ease-out`}
                    style={{ width: `${actualProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className={`text-5xl font-black tracking-tighter ${theme.accentColor}`}>
                      {actualXP}
                    </div>
                    <div className={`text-xs font-bold uppercase mt-1 ml-1 flex items-center gap-1 ${isUltimate ? 'text-slate-400' : 'text-slate-400'}`}>
                      Actual XP
                      {projectedTotalXP > actualXP && (
                        <span className={`font-medium flex items-center gap-0.5 ${isUltimate ? 'text-amber-400' : 'text-blue-500'}`}>
                          <Clock size={10} />
                          {projectedTotalXP} projected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${theme.accentColor}`}>
                      {Math.min(300, rolloverOut)} XP
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isUltimate ? 'text-slate-400' : 'text-slate-400'}`}>
                      Next rollover
                    </div>
                  </div>
                </div>
              </div>

              {/* UXP Progress Section - Only for Platinum/Ultimate */}
              {showUltimateProgress && (
                <div className={`mb-6 p-4 rounded-2xl border ${
                  isUltimate 
                    ? 'bg-slate-700/30 border-slate-600/30' 
                    : 'bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown size={16} className={isUltimate ? 'text-slate-300' : 'text-slate-600'} />
                      <span className={`text-xs font-bold uppercase tracking-wide ${isUltimate ? 'text-slate-300' : 'text-slate-700'}`}>
                        Ultimate Progress
                      </span>
                      <Tooltip text="UXP is earned from KLM and Air France operated flights only. Earn 900 UXP as Platinum to unlock Ultimate status." />
                    </div>
                    <span className={`text-sm font-bold ${isUltimate ? 'text-slate-300' : 'text-slate-700'}`}>
                      {actualUXP} / 900 UXP
                    </span>
                  </div>
                  <div className={`relative h-2.5 rounded-full overflow-hidden ${isUltimate ? 'bg-slate-600' : 'bg-slate-200/50'}`}>
                    {projectedUXP > actualUXP && (
                      <div
                        className="absolute inset-y-0 left-0 bg-slate-400/40 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((projectedUXP / 900) * 100, 100)}%` }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-400 to-slate-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((actualUXP / 900) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {/* Ultimate Chance Alert */}
                  {ultimateChance && (
                    <div className={`mt-3 flex items-center gap-2 ${
                      ultimateChance.sentiment === 'positive' 
                        ? isUltimate ? 'text-emerald-400' : 'text-emerald-600'
                        : ultimateChance.sentiment === 'neutral'
                        ? isUltimate ? 'text-slate-300' : 'text-slate-600'
                        : isUltimate ? 'text-slate-300' : 'text-blue-600'
                    }`}>
                      {ultimateChance.sentiment === 'positive' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <TrendingUp size={14} />
                      )}
                      <span className="text-xs font-medium">{ultimateChance.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom CTA */}
              <div className={`pt-6 border-t flex items-center justify-between ${
                isUltimate ? 'border-slate-700' : 'border-slate-200/60'
              }`}>
                <div className={`flex items-center gap-2 text-xs font-semibold ${isUltimate ? 'text-slate-400' : 'text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isUltimate ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                  <span>Qualification active</span>
                </div>

                <button
                  onClick={() => navigateTo('xp')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                    isUltimate 
                      ? 'bg-slate-600 text-white hover:bg-slate-500' 
                      : 'bg-blue-900 text-white hover:bg-blue-800'
                  }`}
                >
                  XP Engine
                  <ChevronRight size={16} className={isUltimate ? 'text-slate-300' : 'text-blue-300'} />
                </button>
              </div>
            </div>
          </div>

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard
              title="Net miles balance"
              value={formatNumber(milesStats.netCurrent)}
              subtitle={`Projected: ${formatNumber(milesStats.netProjected)}`}
              icon={Wallet}
              badgeText="Accumulating"
              badgeColor="blue"
              tooltip="Current redeemable Flying Blue miles. Projected balance includes future flights already added to your ledger."
            />

            <KPICard
              title="Acquisition cost"
              value={
                <span className="font-mono text-[15px] tracking-tight">
                  {currencySymbol}{baselineEarnCpmEuro.toFixed(5)}
                </span>
              }
              subtitle="Avg cost per mile"
              icon={Target}
              badgeText="Efficiency"
              badgeColor="emerald"
              tooltip="Weighted average cost of all miles earned through subscriptions, credit cards, flights and other sources."
            />

            <KPICard
              title="Total investment"
              value={formatCurrency(milesStats.totalCost)}
              subtitle="Lifetime spend"
              icon={Plane}
              badgeText="Portfolio"
              badgeColor="violet"
              tooltip="Total cash spent on activities that generated Flying Blue miles."
            />

            <KPICard
              title="Est. portfolio value"
              value={formatCurrency(milesStats.netCurrent * milesStats.targetCPM)}
              subtitle="At target CPM"
              icon={Sparkles}
              badgeText="Asset"
              badgeColor="amber"
              tooltip="Hypothetical valuation of your miles based on your chosen target redemption rate."
            />
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <RiskMonitor
            actualStatus={actualStatus}
            projectedStatus={projectedStatus}
            actualXP={actualXP}
            projectedTotalXP={projectedTotalXP}
            targetXP={targetXP}
            rolloverOut={rolloverOut}
            hasProjectedUpgrade={hasProjectedUpgrade}
            cycleStartDate={activeCycle?.startDate ?? new Date().toISOString().slice(0, 10)}
            cycleEndDate={activeCycle?.endDate ?? new Date().toISOString().slice(0, 10)}
            isUltimate={isUltimate}
            actualUXP={actualUXP}
            projectedUXP={projectedUXP}
          />

          {/* Recent Activity */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex-1 flex flex-col max-h-[600px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Recent activity
              </h3>
              <button
                onClick={() => navigateTo('redemption')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-[6px] rounded-lg transition-colors relative top-[1px]"
              >
                View log
              </button>
            </div>

            {sortedRedemptions.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {sortedRedemptions.map((r) => {
                  const val =
                    r.award_miles > 0
                      ? (r.cash_price_estimate - r.surcharges) / r.award_miles
                      : 0;

                  const delta = baselineEarnCpmEuro > 0 ? val - baselineEarnCpmEuro : 0;

                  const valuation = getValuationStatus(val, state.targetCPM, baselineEarnCpmEuro);
                  const VerdictIcon = valuation.icon;

                  return (
                    <div
                      key={r.id}
                      className="group flex flex-col gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 text-sm uppercase tracking-wide truncate block w-full">
                              {r.description || 'Redemption'}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-400">{r.date}</div>
                        </div>

                        <div className="text-right font-mono font-bold text-base text-slate-900 whitespace-nowrap">
                          {currencySymbol}{val.toFixed(4)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${valuation.color}`}
                        >
                          <VerdictIcon size={12} />
                          {valuation.label}
                        </div>

                        <div
                          className={`text-[9px] font-bold ${
                            delta >= 0 ? 'text-emerald-600' : 'text-orange-500'
                          }`}
                        >
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(4)} vs base
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <Plane className="text-slate-300 opacity-50 mb-2" size={32} />
                <span className="text-xs font-medium">No redemptions logged</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {commandCenterContent}

      {onPdfImport && (
        <PdfImportModal
          isOpen={showPdfImport}
          onClose={() => setShowPdfImport(false)}
          onImport={(flights, miles) => {
            onPdfImport(flights, miles);
          }}
          existingFlights={state.flights}
          existingMiles={state.milesData}
        />
      )}
    </>
  );
};
