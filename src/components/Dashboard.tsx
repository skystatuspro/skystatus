import React, { useMemo, useState } from 'react';
import { AppState, FlightRecord, MilesRecord } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { calculateMilesStats } from '../utils/loyalty-logic';
import { calculateQualificationCycles, QualificationCycleStats } from '../utils/xp-logic';
import { getValuationStatus } from '../utils/valuation';
import {
  Award,
  Wallet,
  Plane,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  History,
  Sparkles,
  Target,
  Calendar,
  ChevronRight,
  Clock,
  TrendingDown,
  Upload,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { PLATINUM_THRESHOLD } from '../constants';
import { Tooltip } from './Tooltip';
import PdfImportModal from './PdfImportModal';

interface DashboardProps {
  state: AppState;
  navigateTo: (view: any) => void;
  onUpdateCurrentMonth: (month: string) => void;
  onPdfImport?: (flights: FlightRecord[], miles: MilesRecord[]) => void;
}

type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum';

type BadgeColor = 'blue' | 'amber' | 'emerald' | 'violet' | 'slate';

interface KPIProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badgeText?: string;
  badgeColor?: BadgeColor;
  tooltip?: string;
}

// ----- Helper text -----

const getProgressLabel = (status: StatusLevel, isRequalify: boolean): string => {
  if (isRequalify) return 'Progress to requalify';
  switch (status) {
    case 'Explorer':
      return 'Progress to Silver';
    case 'Silver':
      return 'Progress to Gold';
    case 'Gold':
      return 'Progress to Platinum';
    case 'Platinum':
      return 'Progress to requalify';
    default:
      return 'Progress';
  }
};

const getTargetXP = (status: StatusLevel): number => {
  switch (status) {
    case 'Explorer':
      return 100; // naar Silver
    case 'Silver':
      return 180; // naar Gold
    case 'Gold':
      return 300; // naar Platinum
    case 'Platinum':
      return 300; // requalificatie
    default:
      return 100;
  }
};

const getStatusTheme = (status: StatusLevel) => {
  switch (status) {
    case 'Platinum':
      return {
        meshGradient: 'from-blue-100/80 via-slate-100/50 to-white',
        accentColor: 'text-blue-900',
        iconColor: 'text-blue-600',
        progressBar: 'from-blue-600 to-indigo-600',
        projectedBar: 'from-blue-300 to-indigo-300',
      };
    case 'Gold':
      return {
        meshGradient: 'from-amber-100/80 via-orange-50/50 to-white',
        accentColor: 'text-amber-900',
        iconColor: 'text-amber-500',
        progressBar: 'from-amber-400 to-orange-500',
        projectedBar: 'from-amber-200 to-orange-300',
      };
    case 'Silver':
      return {
        meshGradient: 'from-slate-200/80 via-slate-100/50 to-white',
        accentColor: 'text-slate-800',
        iconColor: 'text-slate-500',
        progressBar: 'from-slate-400 to-slate-600',
        projectedBar: 'from-slate-200 to-slate-400',
      };
    default:
      return {
        meshGradient: 'from-sky-100/80 via-blue-50/50 to-white',
        accentColor: 'text-sky-900',
        iconColor: 'text-sky-500',
        progressBar: 'from-sky-400 to-blue-500',
        projectedBar: 'from-sky-200 to-blue-300',
      };
  }
};

// ----- KPI block component -----

const KPI: React.FC<KPIProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = 'slate',
  tooltip,
}) => {
  const styles: Record<BadgeColor, string> = {
    blue: 'bg-blue-50/40 border-blue-100 hover:border-blue-200',
    amber: 'bg-amber-50/40 border-amber-100 hover:border-amber-200',
    emerald: 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200',
    violet: 'bg-violet-50/40 border-violet-100 hover:border-violet-200',
    slate: 'bg-slate-50/40 border-slate-100 hover:border-slate-200',
  };

  const iconStyles: Record<BadgeColor, string> = {
    blue: 'text-blue-600 bg-white shadow-sm',
    amber: 'text-amber-600 bg-white shadow-sm',
    emerald: 'text-emerald-600 bg-white shadow-sm',
    violet: 'text-violet-600 bg-white shadow-sm',
    slate: 'text-slate-600 bg-white shadow-sm',
  };

  const styleClass = styles[badgeColor] || styles.slate;
  const iconClass = iconStyles[badgeColor] || iconStyles.slate;

  return (
    <div className={`p-5 rounded-3xl border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 group ${styleClass} h-full flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${iconClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {badgeText && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/60 text-slate-500 border border-slate-100/50">
            {badgeText}
          </span>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">
            {title}
          </p>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// ----- Risk Monitor Component -----

interface RiskMonitorProps {
  actualStatus: StatusLevel;
  projectedStatus: StatusLevel;
  actualXP: number;
  projectedTotalXP: number;
  targetXP: number;
  rolloverOut: number;
  hasProjectedUpgrade: boolean;
  cycleStartDate: string;
  cycleEndDate: string;
}

const ROLLOVER_CAP = 300;
const PLATINUM_XP = 300;

const RiskMonitor: React.FC<RiskMonitorProps> = ({
  actualStatus,
  projectedStatus,
  actualXP,
  projectedTotalXP,
  targetXP,
  rolloverOut,
  hasProjectedUpgrade,
  cycleStartDate,
  cycleEndDate,
}) => {
  // Cycle timing calculations
  const today = new Date();
  const endDate = new Date(cycleEndDate);
  const startDate = new Date(cycleStartDate);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = totalDays - daysLeft;
  const cycleProgress = Math.min(100, (daysElapsed / totalDays) * 100);

  // Status security calculations - IMPROVED LOGIC
  // For requalification: you need targetXP (300 for Platinum)
  // "Secured" means you've ACTUALLY earned enough XP
  // "Projected" means scheduled flights will get you there
  const xpNeededForStatus = Math.max(0, targetXP - actualXP);
  const statusSecuredActual = actualXP >= targetXP;
  const statusSecuredProjected = projectedTotalXP >= targetXP;
  
  // Buffer is how much EXTRA you have above the threshold
  const actualBuffer = statusSecuredActual ? actualXP - targetXP : 0;
  const projectedBuffer = statusSecuredProjected ? projectedTotalXP - targetXP : 0;

  // Rollover calculations - only applies to Platinum
  // Rollover = XP above 300, capped at 300
  const actualRollover = actualStatus === 'Platinum' 
    ? Math.min(ROLLOVER_CAP, Math.max(0, actualXP - PLATINUM_XP))
    : 0;
  const projectedRollover = Math.min(ROLLOVER_CAP, rolloverOut);
  
  // For non-Platinum: show what rollover WOULD be if they reach Platinum
  const potentialRollover = projectedStatus === 'Platinum' && actualStatus !== 'Platinum'
    ? Math.min(ROLLOVER_CAP, Math.max(0, projectedTotalXP - PLATINUM_XP))
    : null;
  
  // Waste calculations
  const actualWaste = actualStatus === 'Platinum' 
    ? Math.max(0, actualXP - PLATINUM_XP - ROLLOVER_CAP)
    : 0;
  const projectedWaste = projectedStatus === 'Platinum'
    ? Math.max(0, projectedTotalXP - PLATINUM_XP - ROLLOVER_CAP)
    : 0;
  
  // Overall health assessment
  type HealthStatus = 'optimal' | 'good' | 'warning' | 'critical';
  
  const getOverallHealth = (): { status: HealthStatus; label: string } => {
    if (!statusSecuredActual && !statusSecuredProjected) {
      return { status: 'critical', label: 'Action needed' };
    }
    if (!statusSecuredActual && statusSecuredProjected) {
      return { status: 'good', label: 'On track' };
    }
    if (projectedWaste > 100) {
      return { status: 'warning', label: 'Optimize timing' };
    }
    if (projectedWaste > 0) {
      return { status: 'good', label: 'Minor waste' };
    }
    if (statusSecuredActual && projectedRollover >= ROLLOVER_CAP) {
      return { status: 'optimal', label: 'Maximized' };
    }
    return { status: 'optimal', label: 'Healthy' };
  };

  const health = getOverallHealth();

  const healthStyles: Record<HealthStatus, string> = {
    optimal: 'text-emerald-600 bg-emerald-50',
    good: 'text-blue-600 bg-blue-50',
    warning: 'text-amber-600 bg-amber-50',
    critical: 'text-red-600 bg-red-50',
  };

  // Format date helper
  const formatShortDate = (date: Date) => 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Generate actionable tip - IMPROVED LOGIC
  const getTip = (): { icon: React.ReactNode; text: string; subtext?: string } | null => {
    // Critical: No flights booked and not enough XP
    if (!statusSecuredActual && !statusSecuredProjected) {
      return {
        icon: <AlertTriangle size={16} />,
        text: `Book ${xpNeededForStatus} XP worth of flights`,
        subtext: `${daysLeft} days left to secure your ${actualStatus} status`,
      };
    }
    
    // Good: Have scheduled flights that will secure status
    if (!statusSecuredActual && statusSecuredProjected) {
      const scheduledXP = projectedTotalXP - actualXP;
      return {
        icon: <Plane size={16} />,
        text: 'Stay on track with scheduled flights',
        subtext: `${scheduledXP} XP from upcoming trips will secure requalification`,
      };
    }
    
    // Warning: High waste projected
    if (projectedWaste > 50) {
      return {
        icon: <TrendingDown size={16} />,
        text: `${projectedWaste} XP will be lost to cap`,
        subtext: 'Consider postponing flights to next cycle if possible',
      };
    }
    
    // Optimal: Max rollover achieved
    if (statusSecuredActual && projectedRollover >= ROLLOVER_CAP && projectedWaste === 0) {
      return {
        icon: <CheckCircle2 size={16} />,
        text: 'Perfect! Maximum rollover locked in',
        subtext: 'Additional XP this cycle would be wasted',
      };
    }
    
    // Good: Status secured, rollover building
    if (statusSecuredActual && projectedRollover < ROLLOVER_CAP) {
      const potential = ROLLOVER_CAP - projectedRollover;
      return {
        icon: <Sparkles size={16} />,
        text: `Room for ${potential} more rollover XP`,
        subtext: 'Extra flights this cycle carry over to next year',
      };
    }
    
    return null;
  };

  const tip = getTip();

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
      {/* Header with cycle info */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-slate-400" />
          Risk Monitor
        </h3>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${healthStyles[health.status]}`}>
          {health.label}
        </span>
      </div>

      {/* Cycle timeline */}
      <div className="mb-5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
          <span className="font-medium">{formatShortDate(startDate)}</span>
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Calendar size={10} />
            {daysLeft} days left
          </span>
          <span className="font-medium">{formatShortDate(endDate)}</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full transition-all duration-500"
            style={{ width: `${cycleProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Security - IMPROVED */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Requalification Status
            </span>
            {statusSecuredActual ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 size={12} />
                Secured
              </span>
            ) : statusSecuredProjected ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                <Clock size={12} />
                On track
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <AlertTriangle size={12} />
                Action needed
              </span>
            )}
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-slate-800">
                {actualStatus}
              </div>
              {hasProjectedUpgrade && (
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  → {projectedStatus} projected
                </div>
              )}
            </div>
            
            <div className="text-right">
              {statusSecuredActual ? (
                <div>
                  <div className="text-lg font-bold text-emerald-600">+{actualBuffer}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">XP buffer</div>
                </div>
              ) : statusSecuredProjected ? (
                <div>
                  <div className="text-lg font-bold text-blue-600">+{projectedBuffer}</div>
                  <div className="text-[10px] text-blue-400 uppercase font-medium flex items-center gap-0.5 justify-end">
                    <Clock size={9} />
                    projected buffer
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold text-amber-600">{xpNeededForStatus}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">XP needed</div>
                </div>
              )}
            </div>
          </div>

          {/* Mini progress to target */}
          <div className="mt-3 pt-3 border-t border-slate-200/50">
            <div className="flex justify-between text-[9px] text-slate-400 mb-1">
              <span>Progress to {targetXP} XP</span>
              <span>{actualXP} / {targetXP}</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              {/* Projected bar */}
              <div className="relative h-full">
                {projectedTotalXP > actualXP && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-300 rounded-full"
                    style={{ width: `${Math.min(100, (projectedTotalXP / targetXP) * 100)}%` }}
                  />
                )}
                {/* Actual bar */}
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full ${statusSecuredActual ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  style={{ width: `${Math.min(100, (actualXP / targetXP) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rollover Forecast - Only show for Platinum or projected Platinum */}
        {(actualStatus === 'Platinum' || projectedStatus === 'Platinum') && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rollover Forecast
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Cap: {ROLLOVER_CAP} XP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Actual */}
              <div className="bg-white/60 rounded-xl p-3 border border-white">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Actual</div>
                <div className="text-xl font-black text-slate-800">{actualRollover}</div>
                <div className="text-[10px] text-slate-500">
                  {actualRollover === 0 && actualStatus === 'Platinum' 
                    ? `Need ${PLATINUM_XP - actualXP + 1}+ more XP`
                    : 'XP → next cycle'}
                </div>
              </div>
              
              {/* Projected */}
              <div className="bg-white/60 rounded-xl p-3 border border-white">
                <div className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1 mb-1">
                  <Clock size={10} />
                  Projected
                </div>
                <div className="text-xl font-black text-slate-800">
                  {potentialRollover !== null ? potentialRollover : projectedRollover}
                </div>
                <div className="text-[10px] text-slate-500">XP → next cycle</div>
              </div>
            </div>

            {/* Rollover progress bar */}
            <div className="mt-3">
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                {/* Projected */}
                <div 
                  className="absolute inset-y-0 left-0 bg-blue-300 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((potentialRollover ?? projectedRollover) / ROLLOVER_CAP) * 100)}%` }}
                />
                {/* Actual */}
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (actualRollover / ROLLOVER_CAP) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-slate-400">0</span>
                <span className="text-[9px] text-slate-400">{ROLLOVER_CAP} XP max</span>
              </div>
            </div>
          </div>
        )}

        {/* Waste Indicator */}
        {(actualWaste > 0 || projectedWaste > 0) && (
          <div className={`p-4 rounded-2xl border ${
            actualWaste > 0 
              ? 'bg-red-50 border-red-100' 
              : 'bg-amber-50 border-amber-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                XP Waste
              </span>
              <AlertTriangle size={14} className={actualWaste > 0 ? 'text-red-500' : 'text-amber-500'} />
            </div>

            <div className="flex items-end justify-between">
              <div className="flex gap-4">
                {actualWaste > 0 && (
                  <div>
                    <div className="text-xl font-black text-red-600">-{actualWaste}</div>
                    <div className="text-[10px] text-red-600/70 uppercase font-medium">Already lost</div>
                  </div>
                )}
                {projectedWaste > 0 && projectedWaste !== actualWaste && (
                  <div>
                    <div className="text-xl font-black text-amber-600">-{projectedWaste}</div>
                    <div className="text-[10px] text-amber-600/70 uppercase font-medium flex items-center gap-0.5">
                      <Clock size={9} />
                      Projected
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-[10px] text-slate-500 text-right max-w-[140px]">
                XP above {ROLLOVER_CAP} cannot roll over after requalification
              </div>
            </div>
          </div>
        )}

        {/* No waste indicator when everything is good */}
        {actualWaste === 0 && projectedWaste === 0 && statusSecuredActual && (
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800">No XP waste</div>
                <div className="text-[10px] text-emerald-600/70">All earned XP is being utilized efficiently</div>
              </div>
            </div>
          </div>
        )}

        {/* Actionable Tip */}
        {tip && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-100 text-violet-600 shrink-0">
                {tip.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-violet-900">{tip.text}</div>
                {tip.subtext && (
                  <div className="text-[11px] text-violet-600/70 mt-0.5">{tip.subtext}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----- Find active cycle helper -----

const findActiveCycle = (cycles: QualificationCycleStats[]): QualificationCycleStats | null => {
  if (cycles.length === 0) return null;
  
  const today = new Date().toISOString().slice(0, 10);
  
  // Zoek de cyclus waar vandaag in valt
  for (const cycle of cycles) {
    if (today >= cycle.startDate && today <= cycle.endDate) {
      return cycle;
    }
  }
  
  // Als geen cyclus vandaag bevat, kies de eerste die nog niet is afgesloten
  for (const cycle of cycles) {
    if (cycle.endDate >= today) {
      return cycle;
    }
  }
  
  // Fallback: laatste cyclus
  return cycles[cycles.length - 1];
};

// ----- Main Component -----

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  navigateTo,
  onUpdateCurrentMonth,
  onPdfImport,
}) => {
  const [showPdfImport, setShowPdfImport] = useState(false);
  
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

  // Gebruik dezelfde cycle berekening als de XP Engine
  const { cycles } = useMemo(
    () =>
      calculateQualificationCycles(
        state.xpData,
        state.xpRollover,
        state.flights,
        state.manualLedger
      ),
    [state.xpData, state.xpRollover, state.flights, state.manualLedger]
  );

  // Vind de actieve cyclus (dezelfde logica als XP Engine)
  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);

  // Extract data uit de actieve cyclus
  const actualStatus: StatusLevel = (activeCycle?.actualStatus as StatusLevel) ?? 'Explorer';
  const projectedStatus: StatusLevel = (activeCycle?.projectedStatus as StatusLevel) ?? actualStatus;
  const actualXP: number = activeCycle?.actualXP ?? 0;
  const rolloverIn: number = activeCycle?.rolloverIn ?? 0;
  const rolloverOut: number = activeCycle?.rolloverOut ?? 0;

  // Bereken bruto XP (rollover + alle maand XP, voor level-up correcties)
  const projectedTotalXP = useMemo(() => {
    if (!activeCycle) return 0;
    const totalMonthXP = activeCycle.ledger.reduce((sum, row) => sum + (row.xpMonth ?? 0), 0);
    return activeCycle.rolloverIn + totalMonthXP;
  }, [activeCycle]);

  // Actual cycle XP (alleen gevlogen)
  const actualCycleXP = useMemo(() => {
    if (!activeCycle) return 0;
    return activeCycle.ledger.reduce((sum, row) => sum + (row.actualXP ?? 0), 0);
  }, [activeCycle]);

  // Check of er een projected upgrade is
  const hasProjectedUpgrade = projectedStatus !== actualStatus;

  // Cycle jaar voor weergave
  const cycleYear = activeCycle 
    ? new Date(activeCycle.endDate).getFullYear()
    : new Date().getFullYear();

  const theme = getStatusTheme(actualStatus);

  const targetXP = getTargetXP(actualStatus);

  const baselineEarnCpmEuro = milesStats.globalCPM / 100;

  const sortedRedemptions = useMemo(
    () =>
      [...state.redemptions].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [state.redemptions]
  );

  // Progress percentages
  const actualProgress = Math.min(100, (actualXP / targetXP) * 100);
  const projectedProgress = Math.min(100, (projectedTotalXP / targetXP) * 100);

  // Check if user has no flight data - show onboarding
  const hasNoFlights = state.flights.length === 0;

  // Empty state for new users
  if (hasNoFlights && onPdfImport) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
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

        {/* Welcome Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-blue-600 p-8 md:p-12 shadow-2xl">
          {/* Background decoration */}
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
          </div>
        </div>

        {/* How to get PDF instructions */}
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
              <span>Go to <strong>My Account</strong> → <strong>Activity</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Click <strong>"Download transaction history"</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Select <strong>"All time"</strong> and download as PDF</span>
            </li>
          </ol>
        </div>

        {/* PDF Import Modal */}
        <PdfImportModal
          isOpen={showPdfImport}
          onClose={() => setShowPdfImport(false)}
          onImport={(flights, miles) => {
            onPdfImport(flights, miles);
            setShowPdfImport(false);
          }}
          existingFlights={state.flights}
          existingMiles={state.milesData}
        />
      </div>
    );
  }

  return (
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

        {/* Current Ledger with Tooltip - hidden on mobile */}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Status Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] pl-10 pr-8 py-8 shadow-xl border border-slate-100 bg-white">
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.meshGradient}`} />
            <div className="absolute top-1 right-0 p-12 opacity-10">
              <Award size={180} className={theme.iconColor} />
            </div>

            <div className="relative z-10 flex flex-col justify-between">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Plane
                      className={`${theme.iconColor} rotate-45`}
                      size={22}
                    />
                    <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400">
                      SkyTeam Alliance
                    </span>
                  </div>

                  <h3
                    className={`text-4xl font-black tracking-tight flex items-center gap-3 ${theme.accentColor}`}
                  >
                    {actualStatus}
                    {actualStatus === 'Platinum' && (
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    )}
                  </h3>

                  {/* Projected status badge */}
                  {hasProjectedUpgrade && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Clock size={12} className="text-blue-500" />
                      <span className="text-xs font-bold text-blue-600">
                        Projected: {projectedStatus}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold uppercase tracking-widest text-slate-400/80 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/40">
                  {cycleYear} cycle
                </div>
              </div>

              {/* Progress Section */}
              <div className="mb-8">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                  <span className="flex items-center gap-1">
                    {getProgressLabel(actualStatus, actualStatus === 'Platinum')}
                    <Tooltip text="Actual XP earned from flown flights vs. the XP required to maintain or achieve your target status this cycle." />
                  </span>
                  <span>Target: {targetXP} XP</span>
                </div>

                {/* Progress bar met actual en projected */}
                <div className="relative w-full bg-white/70 rounded-full h-[20px] shadow-inner border border-white/50 overflow-hidden">
                  {/* Projected bar (achtergrond, lichter) */}
                  {projectedTotalXP > actualXP && (
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.projectedBar} opacity-50 transition-all duration-1000 ease-out`}
                      style={{
                        width: `${projectedProgress}%`,
                      }}
                    />
                  )}
                  {/* Actual bar (voorgrond, donker) */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBar} shadow-md transition-all duration-1000 ease-out`}
                    style={{
                      width: `${actualProgress}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div
                      className={`text-5xl font-black tracking-tighter ${theme.accentColor}`}
                    >
                      {actualXP}
                    </div>
                    <div className="text-xs font-bold uppercase text-slate-400 mt-1 ml-1 flex items-center gap-1">
                      Actual XP
                      {projectedTotalXP > actualXP && (
                        <span className="text-blue-500 font-medium flex items-center gap-0.5">
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
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Next rollover
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-6 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Qualification active</span>
                </div>

                <button
                  onClick={() => navigateTo('xp')}
                  className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  XP Engine
                  <ChevronRight size={16} className="text-blue-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPI
              title="Net miles balance"
              value={formatNumber(milesStats.netCurrent)}
              subtitle={`Projected: ${formatNumber(milesStats.netProjected)}`}
              icon={Wallet}
              badgeText="Accumulating"
              badgeColor="blue"
              tooltip="Current redeemable Flying Blue miles. Projected balance includes future flights already added to your ledger."
            />

            <KPI
              title="Acquisition cost"
              value={
                <span className="font-mono text-[15px] tracking-tight">
                  €{baselineEarnCpmEuro.toFixed(5)}
                </span>
              }
              subtitle="Avg cost per mile"
              icon={Target}
              badgeText="Efficiency"
              badgeColor="emerald"
              tooltip="Weighted average cost of all miles earned through subscriptions, credit cards, flights and other sources."
            />

            <KPI
              title="Total investment"
              value={formatCurrency(milesStats.totalCost)}
              subtitle="Lifetime spend"
              icon={Plane}
              badgeText="Portfolio"
              badgeColor="violet"
              tooltip="Total cash spent on activities that generated Flying Blue miles."
            />

            <KPI
              title="Est. portfolio value"
              value={formatCurrency(
                milesStats.netCurrent * milesStats.targetCPM
              )}
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
          {/* Risk Monitor - Expanded */}
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

                  const delta =
                    baselineEarnCpmEuro > 0 ? val - baselineEarnCpmEuro : 0;

                  const valuation = getValuationStatus(
                    val,
                    state.targetCPM,
                    baselineEarnCpmEuro
                  );
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
                          <div className="text-[11px] font-medium text-slate-400">
                            {r.date}
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-base text-slate-900 whitespace-nowrap">
                          €{val.toFixed(4)}
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
                            delta >= 0
                              ? 'text-emerald-600'
                              : 'text-orange-500'
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
                <span className="text-xs font-medium">
                  No redemptions logged
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
