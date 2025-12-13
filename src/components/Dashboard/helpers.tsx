// src/components/Dashboard/helpers.tsx
// Helper functions and utilities for Dashboard

import { QualificationCycleStats } from '../../utils/xp-logic';

export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
export type BadgeColor = 'blue' | 'amber' | 'emerald' | 'violet' | 'slate';

export const getProgressLabel = (status: StatusLevel, isRequalify: boolean): string => {
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

export const getTargetXP = (status: StatusLevel): number => {
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

export interface StatusTheme {
  meshGradient: string;
  accentColor: string;
  iconColor: string;
  progressBar: string;
  projectedBar: string;
  // Ultimate-specific
  cardBg?: string;
  borderColor?: string;
}

export const getStatusTheme = (status: StatusLevel, isUltimate: boolean = false): StatusTheme => {
  // Ultimate theme - black with subtle amber accents
  if (isUltimate) {
    return {
      meshGradient: 'from-slate-900 via-slate-800 to-slate-900',
      accentColor: 'text-white',
      iconColor: 'text-amber-400',
      progressBar: 'from-amber-500 to-amber-400',
      projectedBar: 'from-amber-600 to-amber-500',
      cardBg: 'bg-slate-900',
      borderColor: 'border-slate-700',
    };
  }

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
        iconColor: 'text-amber-600',
        progressBar: 'from-amber-500 to-orange-500',
        projectedBar: 'from-amber-300 to-orange-300',
      };
    case 'Silver':
      return {
        meshGradient: 'from-slate-100/80 via-gray-100/50 to-white',
        accentColor: 'text-slate-700',
        iconColor: 'text-slate-500',
        progressBar: 'from-slate-500 to-gray-500',
        projectedBar: 'from-slate-300 to-gray-300',
      };
    default:
      return {
        meshGradient: 'from-emerald-100/80 via-teal-50/50 to-white',
        accentColor: 'text-emerald-800',
        iconColor: 'text-emerald-600',
        progressBar: 'from-emerald-500 to-teal-500',
        projectedBar: 'from-emerald-300 to-teal-300',
      };
  }
};

// Calculate Ultimate achievement probability
export const calculateUltimateChance = (
  actualUXP: number,
  projectedUXP: number,
  monthsRemaining: number
): { percentage: number; message: string; sentiment: 'positive' | 'neutral' | 'encouraging' } => {
  const target = 900;
  
  // Already achieved or will achieve with booked flights
  if (actualUXP >= target) {
    return { percentage: 100, message: "You've achieved Ultimate!", sentiment: 'positive' };
  }
  
  if (projectedUXP >= target) {
    return { percentage: 100, message: 'Ultimate secured with booked flights!', sentiment: 'positive' };
  }
  
  // Calculate based on projected UXP
  const progressPercent = Math.round((projectedUXP / target) * 100);
  
  // High chance - over 70% there
  if (progressPercent >= 70) {
    const uxpNeeded = target - projectedUXP;
    return { 
      percentage: progressPercent, 
      message: `Only ${uxpNeeded} UXP to go – you're almost there!`, 
      sentiment: 'positive' 
    };
  }
  
  // Medium chance - 40-70%
  if (progressPercent >= 40) {
    const uxpPerMonth = monthsRemaining > 0 ? Math.ceil((target - projectedUXP) / monthsRemaining) : target - projectedUXP;
    return { 
      percentage: progressPercent, 
      message: `${uxpPerMonth} UXP/month on KLM/AF to reach Ultimate`, 
      sentiment: 'neutral' 
    };
  }
  
  // Lower chance - under 40%
  const flightsNeeded = Math.ceil((target - projectedUXP) / 40); // ~40 UXP per avg EU flight
  return { 
    percentage: progressPercent, 
    message: `Book ${flightsNeeded} more KLM/AF flights to unlock Ultimate`, 
    sentiment: 'encouraging' 
  };
};

export const findActiveCycle = (cycles: QualificationCycleStats[]): QualificationCycleStats | null => {
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
