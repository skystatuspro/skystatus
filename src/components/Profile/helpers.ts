// src/components/Profile/helpers.ts
// Calculation functions for Profile page

import { FlightRecord, XPRecord, MilesRecord } from '../../types';
import {
  LifetimeStats,
  CabinMix,
  AirlineMix,
  EfficiencyResult,
  StatusMilestones,
  FunFact,
} from './types';

// ============================================================================
// LIFETIME STATS
// ============================================================================

export function calculateLifetimeStats(
  flights: FlightRecord[],
  xpData: XPRecord[],
  milesData: MilesRecord[]
): LifetimeStats {
  // Total XP from flights
  const flightXP = flights.reduce((sum, f) => sum + (f.earnedXP || 0), 0);
  
  // Also add XP from xpData (manual entries like AMEX, SAF, misc)
  const manualXP = xpData.reduce((sum, r) => {
    return sum + r.amex_xp + r.saf + r.misc + r.status_correction;
  }, 0);
  
  const totalXP = flightXP + manualXP;

  // Total miles earned from flights and milesData
  const flightMiles = flights.reduce((sum, f) => sum + (f.earnedMiles || 0), 0);
  const otherMiles = milesData.reduce((sum, m) => {
    return sum + m.miles_subscription + m.miles_amex + m.miles_flight + m.miles_other;
  }, 0);
  const totalMilesEarned = flightMiles + otherMiles;

  // Total flights
  const totalFlights = flights.length;

  // KL/AF ratio
  const klAfFlights = flights.filter(f => 
    f.airline === 'KL' || f.airline === 'AF'
  ).length;
  const klAfRatio = totalFlights > 0 
    ? Math.round((klAfFlights / totalFlights) * 100) 
    : 0;

  return {
    totalXP,
    totalMilesEarned,
    totalFlights,
    klAfRatio,
  };
}

// ============================================================================
// CABIN CLASS MIX
// ============================================================================

export function calculateCabinMix(flights: FlightRecord[]): CabinMix {
  if (flights.length === 0) {
    return { economy: 0, premiumEconomy: 0, business: 0, first: 0 };
  }

  const counts = {
    Economy: 0,
    'Premium Economy': 0,
    Business: 0,
    First: 0,
  };

  flights.forEach(f => {
    if (f.cabin in counts) {
      counts[f.cabin as keyof typeof counts]++;
    }
  });

  const total = flights.length;

  return {
    economy: Math.round((counts.Economy / total) * 100),
    premiumEconomy: Math.round((counts['Premium Economy'] / total) * 100),
    business: Math.round((counts.Business / total) * 100),
    first: Math.round((counts.First / total) * 100),
  };
}

// ============================================================================
// AIRLINE MIX
// ============================================================================

export function calculateAirlineMix(flights: FlightRecord[]): AirlineMix {
  if (flights.length === 0) {
    return { kl: 0, af: 0, partners: 0 };
  }

  let klCount = 0;
  let afCount = 0;
  let partnerCount = 0;

  flights.forEach(f => {
    if (f.airline === 'KL') {
      klCount++;
    } else if (f.airline === 'AF') {
      afCount++;
    } else {
      partnerCount++;
    }
  });

  const total = flights.length;

  return {
    kl: Math.round((klCount / total) * 100),
    af: Math.round((afCount / total) * 100),
    partners: Math.round((partnerCount / total) * 100),
  };
}

// ============================================================================
// XP EFFICIENCY SCORE
// ============================================================================

export function calculateEfficiencyScore(flights: FlightRecord[]): EfficiencyResult {
  if (flights.length === 0) {
    return {
      score: 0,
      percentage: 0,
      insight: 'Add flights to see your efficiency score.',
      factors: { cabinScore: 0, airlineScore: 0, routeScore: 0 },
    };
  }

  // Calculate actual XP earned
  const actualXP = flights.reduce((sum, f) => sum + (f.earnedXP || 0), 0);

  // Calculate potential max XP (as if all flights were Business class)
  // Business class earns 2x Economy XP
  const potentialXP = flights.reduce((sum, f) => {
    const baseXP = f.earnedXP || 0;
    // If already Business or First, XP is already maximized for that route
    if (f.cabin === 'Business' || f.cabin === 'First') {
      return sum + baseXP;
    }
    // Premium Economy earns 1.5x, so potential is 2x/1.5x = 1.33x more
    if (f.cabin === 'Premium Economy') {
      return sum + baseXP * 1.33;
    }
    // Economy earns 1x, potential is 2x
    return sum + baseXP * 2;
  }, 0);

  // Calculate cabin score (percentage of potential achieved)
  const cabinEfficiency = potentialXP > 0 ? (actualXP / potentialXP) * 100 : 0;

  // Airline score: KL/AF flights earn UXP, partners don't
  const airlineMix = calculateAirlineMix(flights);
  const airlineScore = (airlineMix.kl + airlineMix.af); // 0-100

  // Route score: longer routes = more XP per flight
  // Average XP per flight compared to benchmark
  const avgXPPerFlight = actualXP / flights.length;
  // Benchmark: ~15 XP is a medium haul Economy flight
  const routeScore = Math.min(100, (avgXPPerFlight / 20) * 100);

  // Combined score (weighted average)
  const combinedPercentage = (cabinEfficiency * 0.4) + (airlineScore * 0.35) + (routeScore * 0.25);
  const score = Math.round((combinedPercentage / 100) * 10 * 10) / 10; // 0-10 with 1 decimal

  // Generate insight based on weakest factor
  let insight = '';
  const factors = { cabinScore: cabinEfficiency, airlineScore, routeScore };
  
  if (score >= 8) {
    insight = 'Excellent! You\'re maximizing your XP potential. Keep up the great work!';
  } else if (score >= 6) {
    if (cabinEfficiency < airlineScore && cabinEfficiency < routeScore) {
      insight = 'Good efficiency! Consider flying Business class more often for a boost.';
    } else if (airlineScore < cabinEfficiency && airlineScore < routeScore) {
      insight = 'Solid score! Flying more KLM/AF instead of partners would help your UXP.';
    } else {
      insight = 'Good efficiency! Longer routes could help maximize your XP earnings.';
    }
  } else if (score >= 4) {
    if (cabinEfficiency < 50) {
      insight = 'Your cabin class mix has room for improvement. Business class earns 2x XP!';
    } else if (airlineScore < 50) {
      insight = 'You fly a lot of partner airlines. KLM/AF flights earn valuable UXP.';
    } else {
      insight = 'Consider longer routes or premium cabins to boost your XP efficiency.';
    }
  } else {
    insight = 'There\'s significant room to optimize your Flying Blue strategy!';
  }

  return {
    score: Math.max(1, Math.min(10, score)), // Clamp between 1-10
    percentage: Math.round(combinedPercentage),
    insight,
    factors,
  };
}

// ============================================================================
// STATUS MILESTONES
// ============================================================================

export function extractMilestones(
  flights: FlightRecord[],
  xpData: XPRecord[]
): StatusMilestones {
  const result: StatusMilestones = {
    firstFlight: null,
    silverReached: null,
    goldReached: null,
    platinumReached: null,
    ultimateReached: null,
    currentStreak: 0,
    memberSince: null,
  };

  if (flights.length === 0) {
    return result;
  }

  // Sort flights by date
  const sortedFlights = [...flights].sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  // First flight
  result.firstFlight = sortedFlights[0].date;
  result.memberSince = sortedFlights[0].date.slice(0, 4); // YYYY

  // Calculate cumulative XP over time to find status milestones
  let cumulativeXP = 0;
  let silverDate: string | null = null;
  let goldDate: string | null = null;
  let platinumDate: string | null = null;

  // Group flights by month and add XP data
  const monthlyXP: Record<string, number> = {};

  // Add flight XP
  sortedFlights.forEach(f => {
    const month = f.date.slice(0, 7); // YYYY-MM
    monthlyXP[month] = (monthlyXP[month] || 0) + (f.earnedXP || 0);
  });

  // Add manual XP from xpData
  xpData.forEach(r => {
    const manualXP = r.amex_xp + r.saf + r.misc;
    monthlyXP[r.month] = (monthlyXP[r.month] || 0) + manualXP;
  });

  // Sort months and calculate cumulative
  const sortedMonths = Object.keys(monthlyXP).sort();
  
  for (const month of sortedMonths) {
    cumulativeXP += monthlyXP[month];

    // Check thresholds (simplified - doesn't account for cycle resets)
    if (!silverDate && cumulativeXP >= 100) {
      silverDate = `${month}-01`;
    }
    if (!goldDate && cumulativeXP >= 280) { // 100 (Silver) + 180 (Gold)
      goldDate = `${month}-01`;
    }
    if (!platinumDate && cumulativeXP >= 580) { // 100 + 180 + 300
      platinumDate = `${month}-01`;
    }
  }

  result.silverReached = silverDate;
  result.goldReached = goldDate;
  result.platinumReached = platinumDate;

  // Calculate streak (simplified - years with sufficient XP)
  const currentYear = new Date().getFullYear();
  const yearlyXP: Record<number, number> = {};
  
  Object.entries(monthlyXP).forEach(([month, xp]) => {
    const year = parseInt(month.slice(0, 4));
    yearlyXP[year] = (yearlyXP[year] || 0) + xp;
  });

  // Count consecutive years with 100+ XP from most recent
  let streak = 0;
  for (let year = currentYear; year >= currentYear - 10; year--) {
    if ((yearlyXP[year] || 0) >= 100) {
      streak++;
    } else {
      break;
    }
  }
  result.currentStreak = streak;

  return result;
}

// ============================================================================
// FUN FACTS
// ============================================================================

export function generateFunFacts(flights: FlightRecord[]): FunFact[] {
  const facts: FunFact[] = [];

  if (flights.length === 0) return facts;

  // Most visited destination
  const destinationCounts: Record<string, number> = {};
  flights.forEach(f => {
    const dest = f.route.split('-')[1];
    if (dest) {
      destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
    }
  });
  
  const topDestination = Object.entries(destinationCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (topDestination) {
    facts.push({
      icon: '🎯',
      label: 'Most visited',
      value: `${topDestination[0]} (${topDestination[1]}x)`,
    });
  }

  // Total distance (estimate based on XP)
  // Rough conversion: 1 XP ≈ 200km on average
  const totalXP = flights.reduce((sum, f) => sum + (f.earnedXP || 0), 0);
  const estimatedKm = totalXP * 200;
  
  if (estimatedKm > 0) {
    const formatted = estimatedKm > 100000 
      ? `${Math.round(estimatedKm / 1000)}k km`
      : `${Math.round(estimatedKm).toLocaleString()} km`;
    facts.push({
      icon: '🌍',
      label: 'Est. distance',
      value: formatted,
    });
  }

  // Favorite cabin
  const cabinMix = calculateCabinMix(flights);
  const favoriteCabin = Object.entries(cabinMix)
    .filter(([, pct]) => pct > 0)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (favoriteCabin) {
    const cabinNames: Record<string, string> = {
      economy: 'Economy',
      premiumEconomy: 'Premium Eco',
      business: 'Business',
      first: 'First',
    };
    facts.push({
      icon: '✈️',
      label: 'Favorite cabin',
      value: cabinNames[favoriteCabin[0]] || favoriteCabin[0],
    });
  }

  // Busiest month
  const monthCounts: Record<string, number> = {};
  flights.forEach(f => {
    const month = f.date.slice(5, 7); // MM
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const busiestMonth = Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (busiestMonth) {
    facts.push({
      icon: '📅',
      label: 'Busiest month',
      value: monthNames[parseInt(busiestMonth[0])] || busiestMonth[0],
    });
  }

  return facts.slice(0, 4); // Max 4 facts
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
