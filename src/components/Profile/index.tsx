// src/components/Profile/index.tsx
// Main Profile page component

import React, { useMemo } from 'react';
import { ProfileProps } from './types';
import {
  calculateLifetimeStats,
  calculateCabinMix,
  calculateAirlineMix,
  calculateEfficiencyScore,
  extractMilestones,
  generateFunFacts,
} from './helpers';
import {
  ProfileHeader,
  LifetimeStatsGrid,
  EfficiencyScoreCard,
  CabinClassCard,
  AirlineMixCard,
  MilestonesTimeline,
  FunFactsCard,
  QuickSettingsCard,
  EmptyState,
} from './components';

export const Profile: React.FC<ProfileProps> = ({
  flights,
  xpData,
  milesData,
  currentStatus,
  qualificationSettings,
  onOpenSettings,
  userEmail,
}) => {
  // Calculate all stats using memoization
  const lifetimeStats = useMemo(
    () => calculateLifetimeStats(flights, xpData, milesData),
    [flights, xpData, milesData]
  );

  const cabinMix = useMemo(
    () => calculateCabinMix(flights),
    [flights]
  );

  const airlineMix = useMemo(
    () => calculateAirlineMix(flights),
    [flights]
  );

  const efficiency = useMemo(
    () => calculateEfficiencyScore(flights),
    [flights]
  );

  const milestones = useMemo(
    () => extractMilestones(flights, xpData),
    [flights, xpData]
  );

  const funFacts = useMemo(
    () => generateFunFacts(flights),
    [flights]
  );

  // Empty state
  if (flights.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
        <EmptyState onOpenSettings={onOpenSettings} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

      {/* Profile Header */}
      <ProfileHeader
        userEmail={userEmail}
        currentStatus={currentStatus}
        milestones={milestones}
      />

      {/* Lifetime Stats Grid */}
      <LifetimeStatsGrid stats={lifetimeStats} />

      {/* Two-column layout for efficiency + breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* XP Efficiency Score */}
        <EfficiencyScoreCard efficiency={efficiency} />

        {/* Fun Facts (if we have them) */}
        {funFacts.length > 0 && (
          <FunFactsCard facts={funFacts} />
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CabinClassCard cabinMix={cabinMix} />
        <AirlineMixCard airlineMix={airlineMix} />
      </div>

      {/* Milestones Timeline */}
      <MilestonesTimeline milestones={milestones} currentStatus={currentStatus} />

      {/* Quick Settings */}
      <QuickSettingsCard onOpenSettings={onOpenSettings} />
    </div>
  );
};

export default Profile;
