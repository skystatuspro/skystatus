import {
  MilesRecord,
  MilesStats,
  RedemptionRecord,
  BurnStats,
  ProcessedRedemption,
} from '../types';

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
  // Belangrijkste Revenue Based airlines voor FB
  return ['KLM', 'KL', 'AIR FRANCE', 'AF', 'AIRFRANCE', 'TRANSAVIA', 'HV', 'DELTA', 'DL', 'VIRGIN', 'VS'].some(a => code.includes(a));
};

/**
 * Miles Engine core stats
 */
export const calculateMilesStats = (
  milesData: MilesRecord[],
  currentMonth: string,
  redemptions: RedemptionRecord[] = [],
  targetCPM: number = 0.01
): MilesStats => {
  let earnedPast = 0;
  let burnPast = 0;
  let earnedAll = 0;
  let burnAll = 0;
  let costPast = 0;
  let costAll = 0;
  let correctionTotal = 0;

  milesData.forEach((r) => {
    const rowEarned =
      r.miles_subscription +
      r.miles_amex +
      r.miles_flight +
      r.miles_other;
    const rowBurn = r.miles_debit;
    const rowCost =
      r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other;
    const rowCorrection = r.miles_correction || 0;

    // Debug: log any records with corrections
    if (rowCorrection !== 0) {
      console.log(`[calculateMilesStats] Found correction in month ${r.month}: ${rowCorrection}`);
    }

    earnedAll += rowEarned;
    burnAll += rowBurn;
    costAll += rowCost;
    correctionTotal += rowCorrection;

    if (r.month <= currentMonth) {
      earnedPast += rowEarned;
      burnPast += rowBurn;
      costPast += rowCost;
    }
  });

  console.log(`[calculateMilesStats] Total correction: ${correctionTotal}, earnedPast: ${earnedPast}, burnPast: ${burnPast}, netCurrent will be: ${earnedPast - burnPast + correctionTotal}`);

  // Include correction in net calculations (correction can be positive or negative)
  const netCurrent = earnedPast - burnPast + correctionTotal;
  const netProjected = earnedAll - burnAll + correctionTotal;

  const totalCost = costAll;

  const globalCPM = earnedAll > 0 ? (costAll / earnedAll) * 100 : 0;

  const cpmCurrent = earnedPast > 0 ? costPast / earnedPast : 0; // EUR per mile
  const cpmProjected = earnedAll > 0 ? costAll / earnedAll : 0; // EUR per mile

  const savingsCurrent = (targetCPM - cpmCurrent) * earnedPast;
  const savingsProjected = (targetCPM - cpmProjected) * earnedAll;

  const burnStats = calculateBurnStats(redemptions, targetCPM, cpmCurrent, 0);

  // FIX: Gebruik totalMilesRedeemed ipv count voor correcte value berekening
  const totalMilesRedeemed = burnStats.lifetime.totalMilesRedeemed || 0;
  const avgBurnCpmEur = burnStats.lifetime.avgBurnCpm / 100; // Convert cents to EUR
  
  // Total value created = (waarde per mile bij redemption - acquisitiekost per mile) * aantal miles
  const totalBurnValue = totalMilesRedeemed * (avgBurnCpmEur - cpmCurrent);
  
  // ROI multiplier = redemption waarde / acquisitie kost
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
  acquisitionCpmProjected: number
): BurnStats & { processed: ProcessedRedemption[] } => {
  let lifetimeMiles = 0;
  let lifetimeWeightedCpmSum = 0;
  let lifetimeCount = 0;

  let l12mMiles = 0;
  let l12mWeightedCpmSum = 0;
  let l12mCount = 0;
  let l12mValueVsTarget = 0;
  
  let l12mBest = 0;
  // FIX: Start met Infinity zodat elk lager getal wordt opgepikt
  let l12mWorst = Infinity; 

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // Defensief filteren
  const safeRedemptions = (redemptions || []).filter(
    (r): r is RedemptionRecord => !!r && typeof r === 'object'
  );

  const processed = safeRedemptions.map<ProcessedRedemption>((r) => {
    let burnCpm = 0;
    let value = 0;

    if (r.override_cpm && r.override_cpm > 0) {
      burnCpm = r.override_cpm;
      value = (burnCpm / 100) * r.award_miles;
    } else if (r.cash_price_estimate > 0 && r.award_miles > 0) {
      value = r.cash_price_estimate - r.surcharges;
      burnCpm = (value / r.award_miles) * 100;
    }

    const targetCpmCents = targetCpm * 100;
    let classification: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Unknown' =
      'Unknown';

    if (burnCpm > 0) {
      if (burnCpm >= targetCpmCents * 1.5) classification = 'Excellent';
      else if (burnCpm >= targetCpmCents * 1.1) classification = 'Good';
      else if (burnCpm >= targetCpmCents * 0.9) classification = 'Average';
      else classification = 'Poor';
    }

    const vsTarget = (burnCpm / 100 - targetCpm) * r.award_miles;
    const vsAcquisition =
      (burnCpm / 100 - acquisitionCpmCurrent) * r.award_miles;

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
        
        // Bereken min/max
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

  // Als er geen redemptions waren, reset worst naar 0 ipv Infinity
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
      totalMilesRedeemed: lifetimeMiles, // ADDED: voor correcte totalBurnValue
      count: lifetimeCount,
    },
  };
};
