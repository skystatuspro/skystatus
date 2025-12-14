// src/components/Profile/types.ts
// TypeScript interfaces for Profile page

import { FlightRecord, XPRecord, MilesRecord, QualificationSettings, StatusLevel } from '../../types';

// ============================================================================
// PROPS
// ============================================================================

export interface ProfileProps {
  flights: FlightRecord[];
  xpData: XPRecord[];
  milesData: MilesRecord[];
  currentStatus: StatusLevel;
  qualificationSettings: QualificationSettings | null;
  onOpenSettings: () => void;
  userEmail?: string;
}

// ============================================================================
// LIFETIME STATS
// ============================================================================

export interface LifetimeStats {
  totalXP: number;
  totalMilesEarned: number;
  totalFlights: number;
  avgXpPerFlight: number;
}

// ============================================================================
// UXP STATS (for Platinum/Ultimate)
// ============================================================================

export interface UXPStats {
  totalUXP: number;
  uxpThisCycle: number;
  targetUXP: number;           // 900 for Ultimate
  uxpFromFlights: number;
  klAfFlightCount: number;
  partnerFlightCount: number;
  progressPercentage: number;  // 0-100
}

// ============================================================================
// CABIN CLASS MIX
// ============================================================================

export interface CabinMix {
  economy: number;        // percentage (0-100)
  premiumEconomy: number;
  business: number;
  first: number;
}

// ============================================================================
// AIRLINE MIX
// ============================================================================

export interface AirlineMix {
  kl: number;      // percentage (0-100)
  af: number;
  partners: number;
}

// ============================================================================
// XP EFFICIENCY
// ============================================================================

export interface EfficiencyResult {
  score: number;   // 1-10
  percentage: number; // actual percentage (for calculation display)
  insight: string;
  factors: {
    cabinScore: number;
    airlineScore: number;
    routeScore: number;
  };
}

// ============================================================================
// STATUS MILESTONES
// ============================================================================

export interface StatusMilestones {
  firstFlight: string | null;    // Date string YYYY-MM-DD
  silverReached: string | null;
  goldReached: string | null;
  platinumReached: string | null;
  ultimateReached: string | null;
  currentStreak: number;         // years at current or higher status
  memberSince: string | null;    // Year string YYYY
}

// ============================================================================
// FUN FACTS
// ============================================================================

export interface FunFact {
  icon: string;  // emoji
  label: string;
  value: string;
}
