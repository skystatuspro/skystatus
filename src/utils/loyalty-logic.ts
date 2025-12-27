import {
  MilesRecord,
  RedemptionRecord,
  FlightRecord,
} from '../types';

// Types needed for this file
export interface MilesStats {
  earnedPast: number;
  burnPast: number;
  netCurrent: number;
  earnedAll: number;
  burnAll: number;
  netProjected: number;
  totalCost: number;
  globalCPM: number;
  cpmCurrent: number;
  cpmProjected: number;
  costPast: number;
  costAll: number;
  savingsCurrent: number;
  savingsProjected: number;
  targetCPM: number;
  avgBurnCpm: number;
  roiMultiplier: number;
  totalBurnValue: number;
  redeemedMiles: number;
}

export interface BurnStats {
  last12M: {
    avgBurnCpm: number;
    bestBurnCpm: number;
    worstBurnCpm: number;
    totalValueVsTarget: number;
    totalMilesRedeemed: number;
    count: number;
  };
  lifetime: {
    avgBurnCpm: number;
    totalMilesRedeemed: number;
    count: number;
  };
}

export interface ProcessedRedemption extends RedemptionRecord {
  cpm: number;
  value: number;
  vsTarget: number;
  vsAcquisition: number;
  classification: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Unknown';
}

// --- Revenue Based Logic ---

export const getStatusMultiplier = (status: string): number => {
  switch (status) {
    case 'Platinum': return 8;
    case 'Gold': return 7;
    case 'Silver': return 6;
    default: return 4;
  }
};

export const isRevenueAirline = (airline: string): boolean => {
  const code = airline.toUpperCase();
  return ['KLM', 'KL', 'AIR FRANCE', 'AF', 'AIRFRANCE', 'TRANSAVIA', 'HV', 'DELTA', 'DL', 'VIRGIN', 'VS'].some(a => code.includes(a));
};

/**
 * Miles Engine core stats - CLEAN VERSION without miles_correction
 */
export const calculateMilesStats = (
  milesData: MilesRecord[],
  currentMonth: string,
  redemptions: RedemptionRecord[] = [],
  targetCPM: number = 0.01,
  flights?: FlightRecord[]  // Optional: for accurate actual vs projected flight miles
): MilesStats => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Pre-calculate actual vs projected flight miles per month
  const flightMilesByMonth = new Map<string, { actual: number; projected: number }>();
  (flights ?? []).forEach((f) => {
    const month = f.date?.slice(0, 7);
    if (!month) return;
    const miles = f.earnedMiles || 0;
    const isFlown = f.date < today; // Flight is in the past = actual
    
    const existing = flightMilesByMonth.get(month) || { actual: 0, projected: 0 };
    if (isFlown) {
      existing.actual += miles;
    } else {
      existing.projected += miles;
    }
    flightMilesByMonth.set(month, existing);
  });
  
  let earnedPast = 0;
  let burnPast = 0;
  let earnedAll = 0;
  let burnAll = 0;
  let costPast = 0;
  let costAll = 0;

  milesData.forEach((r) => {
    // Non-flight miles
    const nonFlightEarned = r.miles_subscription + r.miles_amex + r.miles_other;
    
    // Flight miles: use actual flight date if flights array provided, otherwise fall back to month logic
    let flightMilesActual = 0;
    let flightMilesProjected = 0;
    
    if (flights && flights.length > 0) {
      const flightData = flightMilesByMonth.get(r.month) || { actual: 0, projected: 0 };
      flightMilesActual = flightData.actual;
      flightMilesProjected = flightData.projected;
    } else {
      // Fallback: treat all flight miles as actual if in past/current month
      if (r.month <= currentMonth) {
        flightMilesActual = r.miles_flight;
      } else {
        flightMilesProjected = r.miles_flight;
      }
    }
    
    const rowEarned = nonFlightEarned + flightMilesActual + flightMilesProjected;
    const rowBurn = r.miles_debit;
    const rowCost = r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other;

    earnedAll += rowEarned;
    burnAll += rowBurn;
    costAll += rowCost;

    // For "past" earnings: non-flight in past/current month + actual flight miles
    if (r.month <= currentMonth) {
      earnedPast += nonFlightEarned + flightMilesActual;
      burnPast += rowBurn;
      costPast += rowCost;
    } else {
      // Future month: only count actual flight miles (scheduled flights that have been flown - edge case)
      earnedPast += flightMilesActual;
    }
  });

  const netCurrent = earnedPast - burnPast;
  const netProjected = earnedAll - burnAll;

  const totalCost = costAll;
  const globalCPM = earnedAll > 0 ? (costAll / earnedAll) * 100 : 0;
  const cpmCurrent = earnedPast > 0 ? costPast / earnedPast : 0;
  const cpmProjected = earnedAll > 0 ? costAll / earnedAll : 0;

  const savingsCurrent = (targetCPM - cpmCurrent) * earnedPast;
  const savingsProjected = (targetCPM - cpmProjected) * earnedAll;

  const burnStats = calculateBurnStats(redemptions, targetCPM, cpmCurrent, 0);

  const totalMilesRedeemed = burnStats.lifetime.totalMilesRedeemed || 0;
  const avgBurnCpmEur = burnStats.lifetime.avgBurnCpm / 100;
  const totalBurnValue = totalMilesRedeemed * (avgBurnCpmEur - cpmCurrent);
  const roiMultiplier = cpmCurrent > 0 ? avgBurnCpmEur / cpmCurrent : 0;

  return {
    earnedPast,
    burnPast,
    netCurrent,
    earnedAll,
    burnAll,
    netProjected,
    totalCost,
    globalCPM,
    cpmCurrent,
    cpmProjected,
    costPast,
    costAll,
    savingsCurrent,
    savingsProjected,
    targetCPM,
    avgBurnCpm: burnStats.lifetime.avgBurnCpm,
    roiMultiplier,
    totalBurnValue,
    redeemedMiles: totalMilesRedeemed,
  };
};

export const calculateBurnStats = (
  redemptions: RedemptionRecord[] = [],
  targetCpm: number,
  acquisitionCpmCurrent: number,
  _acquisitionCpmProjected: number
): BurnStats & { processed: ProcessedRedemption[] } => {
  let lifetimeMiles = 0;
  let lifetimeWeightedCpmSum = 0;
  let lifetimeCount = 0;

  let l12mMiles = 0;
  let l12mWeightedCpmSum = 0;
  let l12mCount = 0;
  let l12mValueVsTarget = 0;
  let l12mBest = 0;
  let l12mWorst = Infinity;

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const safeRedemptions = (redemptions || []).filter(
    (r): r is RedemptionRecord => !!r && typeof r === 'object'
  );

  const processed = safeRedemptions.map<ProcessedRedemption>((r) => {
    let burnCpm = 0;
    let value = 0;

    if ((r as any).override_cpm && (r as any).override_cpm > 0) {
      burnCpm = (r as any).override_cpm;
      value = (burnCpm / 100) * r.award_miles;
    } else if ((r.cash_price_estimate ?? 0) > 0 && r.award_miles > 0) {
      value = (r.cash_price_estimate ?? 0) - r.surcharges;
      burnCpm = (value / r.award_miles) * 100;
    }

    const targetCpmCents = targetCpm * 100;
    let classification: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Unknown' = 'Unknown';

    if (burnCpm > 0) {
      if (burnCpm >= targetCpmCents * 1.5) classification = 'Excellent';
      else if (burnCpm >= targetCpmCents * 1.1) classification = 'Good';
      else if (burnCpm >= targetCpmCents * 0.9) classification = 'Average';
      else classification = 'Poor';
    }

    const vsTarget = (burnCpm / 100 - targetCpm) * r.award_miles;
    const vsAcquisition = (burnCpm / 100 - acquisitionCpmCurrent) * r.award_miles;

    if (burnCpm > 0) {
      lifetimeMiles += r.award_miles;
      lifetimeWeightedCpmSum += burnCpm * r.award_miles;
      lifetimeCount++;

      const rDate = new Date(r.date);
      if (!Number.isNaN(rDate.getTime()) && rDate >= oneYearAgo) {
        l12mMiles += r.award_miles;
        l12mWeightedCpmSum += burnCpm * r.award_miles;
        l12mCount++;
        l12mValueVsTarget += vsTarget;
        l12mBest = Math.max(l12mBest, burnCpm);
        l12mWorst = Math.min(l12mWorst, burnCpm);
      }
    }

    return {
      ...r,
      cpm: parseFloat(burnCpm.toFixed(2)),
      value,
      vsTarget,
      vsAcquisition,
      classification,
    };
  });

  if (l12mWorst === Infinity) l12mWorst = 0;

  return {
    processed,
    last12M: {
      avgBurnCpm: l12mMiles > 0 ? l12mWeightedCpmSum / l12mMiles : 0,
      bestBurnCpm: l12mBest,
      worstBurnCpm: l12mWorst,
      totalValueVsTarget: l12mValueVsTarget,
      totalMilesRedeemed: l12mMiles,
      count: l12mCount,
    },
    lifetime: {
      avgBurnCpm: lifetimeMiles > 0 ? lifetimeWeightedCpmSum / lifetimeMiles : 0,
      totalMilesRedeemed: lifetimeMiles,
      count: lifetimeCount,
    },
  };
};
