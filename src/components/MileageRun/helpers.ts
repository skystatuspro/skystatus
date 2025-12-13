import { CabinClass } from '../../types';
import { DistanceBand, calculateXPForRoute } from '../../utils/airports';
import { PLATINUM_THRESHOLD, GOLD_THRESHOLD, SILVER_THRESHOLD } from '../../constants';
import { StatusLevel, StatusTheme, DistanceInsight } from './types';
import { BAND_LIMITS } from './constants';

/**
 * Calculate XP for a route string (e.g., "AMS CDG BKK")
 */
export const calculateRouteXP = (
  routeCode: string, 
  cabin: CabinClass, 
  isReturn: boolean
): { xp: number; distance: number } => {
  const codes = routeCode.split(' ');
  if (codes.length < 2) return { xp: 0, distance: 0 };
  
  let totalXP = 0;
  let totalDistance = 0;
  
  // Outbound
  for (let i = 0; i < codes.length - 1; i++) {
    const result = calculateXPForRoute(codes[i], codes[i + 1], cabin);
    totalXP += result.xp;
    totalDistance += result.distance;
  }
  
  // Return
  if (isReturn) {
    for (let i = codes.length - 1; i > 0; i--) {
      const result = calculateXPForRoute(codes[i], codes[i - 1], cabin);
      totalXP += result.xp;
      totalDistance += result.distance;
    }
  }
  
  return { xp: totalXP, distance: totalDistance };
};

/**
 * Get theme colors for a status level
 */
export const getStatusTheme = (status: StatusLevel): StatusTheme => {
  switch (status) {
    case 'Platinum': 
      return {
        gradient: 'from-blue-600 to-indigo-700',
        lightGradient: 'from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        bg: 'bg-blue-500',
        accent: 'text-blue-600',
      };
    case 'Gold': 
      return {
        gradient: 'from-amber-500 to-orange-600',
        lightGradient: 'from-amber-50 to-orange-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        bg: 'bg-amber-500',
        accent: 'text-amber-600',
      };
    case 'Silver': 
      return {
        gradient: 'from-slate-400 to-slate-600',
        lightGradient: 'from-slate-100 to-slate-200',
        border: 'border-slate-300',
        text: 'text-slate-700',
        bg: 'bg-slate-500',
        accent: 'text-slate-600',
      };
    default: 
      return {
        gradient: 'from-sky-400 to-blue-500',
        lightGradient: 'from-sky-50 to-blue-50',
        border: 'border-sky-200',
        text: 'text-sky-700',
        bg: 'bg-sky-500',
        accent: 'text-sky-600',
      };
  }
};

/**
 * Get status level from XP amount
 */
export const getStatusFromXP = (xp: number): StatusLevel => {
  if (xp >= PLATINUM_THRESHOLD) return 'Platinum';
  if (xp >= GOLD_THRESHOLD) return 'Gold';
  if (xp >= SILVER_THRESHOLD) return 'Silver';
  return 'Explorer';
};

/**
 * Get the next status threshold to reach
 */
export const getNextThreshold = (currentXP: number): { level: StatusLevel; xp: number } => {
  if (currentXP >= PLATINUM_THRESHOLD) return { level: 'Platinum', xp: PLATINUM_THRESHOLD };
  if (currentXP >= GOLD_THRESHOLD) return { level: 'Platinum', xp: PLATINUM_THRESHOLD };
  if (currentXP >= SILVER_THRESHOLD) return { level: 'Gold', xp: GOLD_THRESHOLD };
  return { level: 'Silver', xp: SILVER_THRESHOLD };
};

/**
 * Check if a route is close to the next distance band
 */
export const getDistanceInsight = (miles: number, currentBand: DistanceBand): DistanceInsight | null => {
  if (currentBand === 'Domestic' || currentBand === 'Long 3') return null;
  
  const nextLimit = BAND_LIMITS[currentBand];
  if (!nextLimit) return null;
  
  const diff = nextLimit - miles;
  if (diff > 0 && diff <= 150) {
    return { diff, message: `Only ${diff}mi short of next band!` };
  }
  return null;
};

/**
 * Format efficiency rating
 */
export const getEfficiencyRating = (costPerXP: number): { label: string; color: string } => {
  if (costPerXP === 0) return { label: 'N/A', color: 'text-slate-400' };
  if (costPerXP <= 5) return { label: 'Excellent', color: 'text-emerald-600' };
  if (costPerXP <= 10) return { label: 'Good', color: 'text-green-600' };
  if (costPerXP <= 15) return { label: 'Fair', color: 'text-amber-600' };
  if (costPerXP <= 25) return { label: 'Poor', color: 'text-orange-600' };
  return { label: 'Expensive', color: 'text-red-600' };
};

/**
 * Parse route string into airport codes
 */
export const parseRouteString = (routeString: string): string[] => {
  return routeString
    .toUpperCase()
    .replace(/[^A-Z]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((c) => c.length === 3);
};
