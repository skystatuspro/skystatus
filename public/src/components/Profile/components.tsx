// src/components/Profile/components.tsx
// Sub-components for Profile page

import React from 'react';
import {
  User,
  Award,
  Flame,
  Zap,
  Coins,
  Plane,
  Target,
  Trophy,
  HelpCircle,
  Settings,
  ChevronRight,
  Crown,
  Medal,
  Download,
  Upload,
} from 'lucide-react';
import { StatusLevel } from '../../types';
import {
  LifetimeStats,
  CabinMix,
  AirlineMix,
  EfficiencyResult,
  StatusMilestones,
  FunFact,
  UXPStats,
} from './types';
import { formatDate, formatNumber } from './helpers';

// ============================================================================
// STATUS BADGE COLORS
// ============================================================================

const statusColors: Record<StatusLevel, { bg: string; text: string; ring: string }> = {
  Explorer: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  Silver: { bg: 'bg-slate-200', text: 'text-slate-700', ring: 'ring-slate-300' },
  Gold: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  Platinum: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  Ultimate: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
};

// ============================================================================
// PROFILE HEADER
// ============================================================================

interface ProfileHeaderProps {
  userEmail?: string;
  currentStatus: StatusLevel;
  milestones: StatusMilestones;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userEmail,
  currentStatus,
  milestones,
}) => {
  const displayName = userEmail 
    ? userEmail.split('@')[0] 
    : 'Flying Blue Member';

  const colors = statusColors[currentStatus];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className={`w-20 h-20 rounded-2xl ${colors.bg} flex items-center justify-center ring-4 ${colors.ring}`}>
          {currentStatus === 'Ultimate' ? (
            <Crown size={36} className={colors.text} />
          ) : (
            <User size={36} className={colors.text} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            {displayName}
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            Flying Blue Member
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
              <Award size={14} />
              {currentStatus}
            </span>

            {/* Member Since */}
            {milestones.memberSince && (
              <span className="text-sm text-slate-500">
                Member since {milestones.memberSince}
              </span>
            )}

            {/* Streak */}
            {milestones.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-orange-600 font-medium">
                <Flame size={14} className="text-orange-500" />
                {milestones.currentStreak} year streak
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'blue' | 'amber' | 'emerald' | 'violet' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  sublabel,
  color = 'blue',
}) => {
  const colorStyles = {
    blue: 'from-blue-500 to-indigo-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    violet: 'from-violet-500 to-purple-500',
    slate: 'from-slate-500 to-gray-500',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorStyles[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-slate-800">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {sublabel && (
        <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
      )}
    </div>
  );
};

// ============================================================================
// LIFETIME STATS GRID
// ============================================================================

interface LifetimeStatsGridProps {
  stats: LifetimeStats;
}

export const LifetimeStatsGrid: React.FC<LifetimeStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Zap size={20} className="text-white" />}
        label="Total XP"
        value={stats.totalXP}
        sublabel="lifetime earned"
        color="blue"
      />
      <StatCard
        icon={<Coins size={20} className="text-white" />}
        label="Miles Earned"
        value={stats.totalMilesEarned}
        sublabel="all time"
        color="amber"
      />
      <StatCard
        icon={<Plane size={20} className="text-white" />}
        label="Flights"
        value={stats.totalFlights}
        sublabel="tracked"
        color="emerald"
      />
      <StatCard
        icon={<Target size={20} className="text-white" />}
        label="Avg XP/Flight"
        value={stats.avgXpPerFlight}
        sublabel="per segment"
        color="violet"
      />
    </div>
  );
};

// ============================================================================
// EFFICIENCY SCORE CARD
// ============================================================================

interface EfficiencyScoreCardProps {
  efficiency: EfficiencyResult;
}

export const EfficiencyScoreCard: React.FC<EfficiencyScoreCardProps> = ({ efficiency }) => {
  const scoreColor = efficiency.score >= 7 
    ? 'text-emerald-600' 
    : efficiency.score >= 5 
      ? 'text-amber-600' 
      : 'text-slate-600';

  const barColor = efficiency.score >= 7 
    ? 'from-emerald-500 to-teal-500' 
    : efficiency.score >= 5 
      ? 'from-amber-500 to-orange-500' 
      : 'from-slate-400 to-gray-400';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          XP Efficiency Score
        </h3>
        <button 
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="How is this calculated?"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      <div className="flex items-end gap-4 mb-4">
        <span className={`text-5xl font-black ${scoreColor}`}>
          {efficiency.score.toFixed(1)}
        </span>
        <span className="text-xl text-slate-400 font-medium mb-1">/ 10</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${efficiency.score * 10}%` }}
        />
      </div>

      {/* Insight */}
      <p className="text-sm text-slate-600 leading-relaxed">
        "{efficiency.insight}"
      </p>
    </div>
  );
};

// ============================================================================
// BREAKDOWN BAR
// ============================================================================

interface BreakdownBarProps {
  label: string;
  percentage: number;
  color: string;
}

const BreakdownBar: React.FC<BreakdownBarProps> = ({ label, percentage, color }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// CABIN CLASS CARD
// ============================================================================

interface CabinClassCardProps {
  cabinMix: CabinMix;
}

export const CabinClassCard: React.FC<CabinClassCardProps> = ({ cabinMix }) => {
  const businessPct = cabinMix.business + cabinMix.first;
  
  let insight = '';
  if (businessPct >= 30) {
    insight = `💡 ${businessPct}% premium is excellent! Top tier XP earning.`;
  } else if (businessPct >= 15) {
    insight = `💡 ${businessPct}% premium is good! Room to grow for more XP.`;
  } else if (businessPct > 0) {
    insight = `💡 Consider more Business class for 2x XP earnings.`;
  } else {
    insight = `💡 Business class earns 2x the XP of Economy!`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
        Cabin Class Mix
      </h3>

      <div className="space-y-3">
        {cabinMix.economy > 0 && (
          <BreakdownBar label="Economy" percentage={cabinMix.economy} color="bg-slate-400" />
        )}
        {cabinMix.premiumEconomy > 0 && (
          <BreakdownBar label="Premium Economy" percentage={cabinMix.premiumEconomy} color="bg-emerald-500" />
        )}
        {cabinMix.business > 0 && (
          <BreakdownBar label="Business" percentage={cabinMix.business} color="bg-blue-500" />
        )}
        {cabinMix.first > 0 && (
          <BreakdownBar label="First" percentage={cabinMix.first} color="bg-violet-500" />
        )}
      </div>

      {insight && (
        <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
          {insight}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// AIRLINE MIX CARD (with tabs)
// ============================================================================

interface AirlineMixCardProps {
  airlineMixCycle: AirlineMix;
  airlineMixPast12: AirlineMix;
}

export const AirlineMixCard: React.FC<AirlineMixCardProps> = ({ 
  airlineMixCycle, 
  airlineMixPast12 
}) => {
  const [activeTab, setActiveTab] = React.useState<'cycle' | 'past12'>('cycle');
  
  const airlineMix = activeTab === 'cycle' ? airlineMixCycle : airlineMixPast12;
  const klAfTotal = airlineMix.kl + airlineMix.af;
  
  // Neutral messaging
  let insight = '';
  if (klAfTotal >= 80) {
    insight = `${klAfTotal}% of your flights are on KLM/Air France.`;
  } else if (klAfTotal >= 40) {
    insight = `${klAfTotal}% KLM/AF, ${100 - klAfTotal}% partner airlines.`;
  } else if (klAfTotal > 0) {
    insight = `Mostly partner airlines (${100 - klAfTotal}%), with some KLM/AF.`;
  } else {
    insight = `All flights on SkyTeam partner airlines.`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Airline Mix
        </h3>
        {/* Tab Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('cycle')}
            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
              activeTab === 'cycle'
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            This Cycle
          </button>
          <button
            onClick={() => setActiveTab('past12')}
            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
              activeTab === 'past12'
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Past 12 Mo
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {airlineMix.kl > 0 && (
          <BreakdownBar label="KLM" percentage={airlineMix.kl} color="bg-sky-500" />
        )}
        {airlineMix.af > 0 && (
          <BreakdownBar label="Air France" percentage={airlineMix.af} color="bg-red-500" />
        )}
        {airlineMix.partners > 0 && (
          <BreakdownBar label="Partners" percentage={airlineMix.partners} color="bg-slate-400" />
        )}
        {airlineMix.kl === 0 && airlineMix.af === 0 && airlineMix.partners === 0 && (
          <p className="text-sm text-slate-400 italic">No flights in this period</p>
        )}
      </div>

      <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
        {insight}
      </p>
    </div>
  );
};

// ============================================================================
// UXP PROGRESS CARD (Platinum/Ultimate only)
// ============================================================================

interface UXPProgressCardProps {
  uxpStats: UXPStats;
  currentStatus: StatusLevel;
}

export const UXPProgressCard: React.FC<UXPProgressCardProps> = ({ uxpStats, currentStatus }) => {
  const isUltimate = currentStatus === 'Ultimate';
  const targetLabel = isUltimate ? 'to maintain Ultimate' : 'to reach Ultimate';
  
  // Calculate what's needed
  const uxpNeeded = Math.max(0, uxpStats.targetUXP - uxpStats.uxpThisCycle);
  const avgUxpPerKLAFFlight = uxpStats.klAfFlightCount > 0 
    ? Math.round(uxpStats.totalUXP / uxpStats.klAfFlightCount)
    : 25; // Default estimate
  const flightsNeeded = avgUxpPerKLAFFlight > 0 
    ? Math.ceil(uxpNeeded / avgUxpPerKLAFFlight)
    : 0;

  // Determine sentiment
  let statusMessage = '';
  let statusColor = 'text-slate-600';
  
  if (uxpStats.progressPercentage >= 100) {
    statusMessage = isUltimate ? '✓ Ultimate status secured!' : '✓ Ultimate unlocked!';
    statusColor = 'text-emerald-600';
  } else if (uxpStats.progressPercentage >= 70) {
    statusMessage = `Almost there! ${uxpNeeded} UXP to go.`;
    statusColor = 'text-blue-600';
  } else if (uxpStats.progressPercentage >= 40) {
    statusMessage = `On track — ~${flightsNeeded} more KLM/AF flights needed.`;
    statusColor = 'text-amber-600';
  } else {
    statusMessage = `${flightsNeeded} KLM/AF flights needed ${targetLabel}.`;
    statusColor = 'text-slate-500';
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-violet-600" />
          <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wide">
            Ultimate Progress
          </h3>
        </div>
        <span className="text-xs text-violet-500 font-medium">
          This cycle
        </span>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-black text-violet-700">
          {uxpStats.uxpThisCycle.toLocaleString()}
        </span>
        <span className="text-lg text-violet-400 font-medium">
          / {uxpStats.targetUXP.toLocaleString()} UXP
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-violet-100 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, uxpStats.progressPercentage)}%` }}
        />
      </div>

      {/* Status message */}
      <p className={`text-sm font-medium ${statusColor}`}>
        {statusMessage}
      </p>

      {/* Flight breakdown */}
      <div className="mt-4 pt-4 border-t border-violet-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-violet-600">
            <strong>{uxpStats.klAfFlightCount}</strong> KLM/AF flights
          </span>
          <span className="text-slate-400">
            {uxpStats.partnerFlightCount} partner flights
          </span>
        </div>
        {avgUxpPerKLAFFlight > 0 && uxpStats.klAfFlightCount > 0 && (
          <span className="text-violet-500">
            ~{avgUxpPerKLAFFlight} UXP/flight avg
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MILESTONES TIMELINE
// ============================================================================

interface MilestonesTimelineProps {
  milestones: StatusMilestones;
  currentStatus: StatusLevel;
}

export const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({ 
  milestones, 
  currentStatus 
}) => {
  const statusOrder: StatusLevel[] = ['Explorer', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const milestoneData = [
    { status: 'First Flight', date: milestones.firstFlight, icon: Plane, achieved: !!milestones.firstFlight },
    { status: 'Silver', date: milestones.silverReached, icon: Medal, achieved: currentIndex >= 1 },
    { status: 'Gold', date: milestones.goldReached, icon: Trophy, achieved: currentIndex >= 2 },
    { status: 'Platinum', date: milestones.platinumReached, icon: Award, achieved: currentIndex >= 3 },
    { status: 'Ultimate', date: milestones.ultimateReached, icon: Crown, achieved: currentIndex >= 4 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">
        Your Journey
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-100 rounded-full" />
        
        {/* Progress line */}
        <div 
          className="absolute top-4 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, (currentIndex / 4) * 100)}%` }}
        />

        {/* Milestone dots */}
        <div className="relative flex justify-between">
          {milestoneData.map((m, i) => {
            const Icon = m.icon;
            const isAchieved = m.achieved;
            const isCurrent = 
              (m.status === currentStatus) || 
              (m.status === 'First Flight' && i === 0 && currentIndex >= 0);

            return (
              <div key={m.status} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isAchieved 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-100 text-slate-400'
                  } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                >
                  <Icon size={14} />
                </div>
                <span className={`text-[10px] mt-2 font-semibold ${
                  isAchieved ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {m.status}
                </span>
                {m.date && (
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    {formatDate(m.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak badge */}
      {milestones.currentStreak > 1 && (
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
          <Flame size={16} className="text-orange-500" />
          <span className="text-sm text-slate-600">
            {milestones.currentStreak} year {currentStatus} streak
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FUN FACTS CARD
// ============================================================================

interface FunFactsCardProps {
  facts: FunFact[];
}

export const FunFactsCard: React.FC<FunFactsCardProps> = ({ facts }) => {
  if (facts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
        Fun Facts
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {facts.map((fact, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xl">{fact.icon}</span>
            <div>
              <p className="text-xs text-slate-400">{fact.label}</p>
              <p className="text-sm font-semibold text-slate-700">{fact.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// QUICK SETTINGS CARD
// ============================================================================

interface QuickSettingsCardProps {
  onOpenSettings: () => void;
}

export const QuickSettingsCard: React.FC<QuickSettingsCardProps> = ({ onOpenSettings }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
        Settings
      </h3>

      <button
        onClick={onOpenSettings}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Manage Data Settings</span>
        </div>
        <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="flex gap-3 mt-3">
        <button
          onClick={onOpenSettings}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
        >
          <Download size={16} />
          Export
        </button>
        <button
          onClick={onOpenSettings}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
        >
          <Upload size={16} />
          Import
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  onOpenSettings: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenSettings }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Plane size={28} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        No flights yet
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
        Import your Flying Blue activity to see your loyalty profile, 
        including lifetime stats, efficiency score, and milestones.
      </p>
      <button
        onClick={onOpenSettings}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
      >
        <Upload size={16} />
        Import Data
      </button>
    </div>
  );
};
