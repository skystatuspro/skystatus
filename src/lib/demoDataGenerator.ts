// src/lib/demoDataGenerator.ts
// Generates realistic demo data for each Flying Blue status level

import {
  FlightRecord,
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  ManualLedger,
  StatusLevel,
  QualificationSettings,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface DemoDataSet {
  flights: FlightRecord[];
  milesData: MilesRecord[];
  xpData: XPRecord[];
  redemptions: RedemptionRecord[];
  manualLedger: ManualLedger;
  qualificationSettings: QualificationSettings;
  xpRollover: number;
  uxpRollover: number;
  currentStatus: StatusLevel;
  targetCPM: number;
}

export interface DemoStatusConfig {
  status: StatusLevel;
  totalFlights: number;
  flownFlights: number;
  scheduledFlights: number;
  memberSinceYear: number;
  statusStreak: number;
  currentXP: number;
  projectedXP: number;
  currentUXP: number;
  projectedUXP: number;
  xpRollover: number;
  uxpRollover: number;
  milesBalance: number;
  lifetimeMiles: number;
  cabinMix: { economy: number; premiumEconomy: number; business: number; first: number };
  airlineMix: { kl: number; af: number; partners: number };
  efficiencyScore: number;
}

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

const STATUS_CONFIGS: Record<StatusLevel, DemoStatusConfig> = {
  Explorer: {
    status: 'Explorer',
    totalFlights: 6,
    flownFlights: 4,
    scheduledFlights: 2,
    memberSinceYear: 2024,
    statusStreak: 0,
    currentXP: 25,
    projectedXP: 45,
    currentUXP: 20,
    projectedUXP: 38,
    xpRollover: 0,
    uxpRollover: 0,
    milesBalance: 18500,
    lifetimeMiles: 24000,
    cabinMix: { economy: 100, premiumEconomy: 0, business: 0, first: 0 },
    airlineMix: { kl: 50, af: 17, partners: 33 },
    efficiencyScore: 4.8,
  },
  Silver: {
    status: 'Silver',
    totalFlights: 18,
    flownFlights: 14,
    scheduledFlights: 4,
    memberSinceYear: 2023,
    statusStreak: 1,
    currentXP: 45,
    projectedXP: 110,
    currentUXP: 40,
    projectedUXP: 95,
    xpRollover: 0,
    uxpRollover: 0,
    milesBalance: 42350,
    lifetimeMiles: 125000,
    cabinMix: { economy: 88, premiumEconomy: 8, business: 4, first: 0 },
    airlineMix: { kl: 52, af: 20, partners: 28 },
    efficiencyScore: 6.2,
  },
  Gold: {
    status: 'Gold',
    totalFlights: 47,
    flownFlights: 38,
    scheduledFlights: 9,
    memberSinceYear: 2021,
    statusStreak: 2,
    currentXP: 135,
    projectedXP: 210,
    currentUXP: 120,
    projectedUXP: 190,
    xpRollover: 20,
    uxpRollover: 0,
    milesBalance: 156800,
    lifetimeMiles: 480000,
    cabinMix: { economy: 68, premiumEconomy: 15, business: 16, first: 1 },
    airlineMix: { kl: 48, af: 33, partners: 19 },
    efficiencyScore: 7.4,
  },
  Platinum: {
    status: 'Platinum',
    totalFlights: 112,
    flownFlights: 94,
    scheduledFlights: 18,
    memberSinceYear: 2019,
    statusStreak: 4,
    currentXP: 265,
    projectedXP: 340,
    currentUXP: 245,
    projectedUXP: 315,
    xpRollover: 85,
    uxpRollover: 150,
    milesBalance: 324500,
    lifetimeMiles: 1250000,
    cabinMix: { economy: 45, premiumEconomy: 18, business: 34, first: 3 },
    airlineMix: { kl: 51, af: 38, partners: 11 },
    efficiencyScore: 8.1,
  },
  Ultimate: {
    status: 'Ultimate',
    totalFlights: 234,
    flownFlights: 206,
    scheduledFlights: 28,
    memberSinceYear: 2016,
    statusStreak: 6,
    currentXP: 720,
    projectedXP: 945,
    currentUXP: 870,
    projectedUXP: 920,
    xpRollover: 300,
    uxpRollover: 450,
    milesBalance: 687200,
    lifetimeMiles: 2850000,
    cabinMix: { economy: 22, premiumEconomy: 12, business: 54, first: 12 },
    airlineMix: { kl: 54, af: 40, partners: 6 },
    efficiencyScore: 9.2,
  },
};

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

interface RouteDefinition {
  route: string;
  distance: 'short' | 'medium' | 'long1' | 'long2' | 'long3';
  xpEconomy: number;
  xpBusiness: number;
  xpFirst: number;
  miles: number;
}

const ROUTES: RouteDefinition[] = [
  // Short haul Europe (< 1000 mi)
  { route: 'AMS-CDG', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 430 },
  { route: 'AMS-LHR', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 370 },
  { route: 'AMS-BER', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 580 },
  { route: 'AMS-BCN', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 1090 },
  { route: 'AMS-FCO', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 1290 },
  { route: 'AMS-VIE', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 940 },
  { route: 'AMS-CPH', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 620 },
  { route: 'AMS-ZRH', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 660 },
  { route: 'CDG-LHR', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 340 },
  { route: 'CDG-FCO', distance: 'short', xpEconomy: 5, xpBusiness: 10, xpFirst: 15, miles: 1100 },
  
  // Medium haul (1000-2000 mi)
  { route: 'AMS-ATH', distance: 'medium', xpEconomy: 8, xpBusiness: 15, xpFirst: 23, miles: 2160 },
  { route: 'AMS-IST', distance: 'medium', xpEconomy: 8, xpBusiness: 15, xpFirst: 23, miles: 2200 },
  { route: 'CDG-CMN', distance: 'medium', xpEconomy: 8, xpBusiness: 15, xpFirst: 23, miles: 1820 },
  { route: 'AMS-DXB', distance: 'medium', xpEconomy: 8, xpBusiness: 15, xpFirst: 23, miles: 5140 },
  
  // Long haul 1 (2000-3500 mi)
  { route: 'AMS-JFK', distance: 'long1', xpEconomy: 15, xpBusiness: 30, xpFirst: 45, miles: 5850 },
  { route: 'CDG-JFK', distance: 'long1', xpEconomy: 15, xpBusiness: 30, xpFirst: 45, miles: 5840 },
  { route: 'AMS-BOS', distance: 'long1', xpEconomy: 15, xpBusiness: 30, xpFirst: 45, miles: 5540 },
  { route: 'CDG-BOS', distance: 'long1', xpEconomy: 15, xpBusiness: 30, xpFirst: 45, miles: 5550 },
  
  // Long haul 2 (3500-5000 mi)
  { route: 'AMS-LAX', distance: 'long2', xpEconomy: 20, xpBusiness: 40, xpFirst: 60, miles: 8960 },
  { route: 'CDG-LAX', distance: 'long2', xpEconomy: 20, xpBusiness: 40, xpFirst: 60, miles: 9120 },
  { route: 'AMS-SFO', distance: 'long2', xpEconomy: 20, xpBusiness: 40, xpFirst: 60, miles: 8520 },
  { route: 'AMS-NRT', distance: 'long2', xpEconomy: 20, xpBusiness: 40, xpFirst: 60, miles: 9290 },
  { route: 'CDG-NRT', distance: 'long2', xpEconomy: 20, xpBusiness: 40, xpFirst: 60, miles: 9710 },
  
  // Long haul 3 (>5000 mi)
  { route: 'AMS-SIN', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 10340 },
  { route: 'CDG-SIN', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 10740 },
  { route: 'AMS-BKK', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 9070 },
  { route: 'AMS-SYD', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 16650 },
  { route: 'CDG-SYD', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 16960 },
  { route: 'AMS-JNB', distance: 'long3', xpEconomy: 25, xpBusiness: 50, xpFirst: 75, miles: 9040 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().slice(0, 10);
}

function getAirlineForRoute(route: string, mix: { kl: number; af: number; partners: number }): string {
  const rand = Math.random() * 100;
  const isCDGRoute = route.includes('CDG');
  
  // Slightly bias Air France routes for CDG
  if (isCDGRoute) {
    if (rand < mix.af + 10) return 'AF';
    if (rand < mix.af + mix.kl) return 'KLM';
    return pickPartnerAirline();
  }
  
  if (rand < mix.kl) return 'KLM';
  if (rand < mix.kl + mix.af) return 'AF';
  return pickPartnerAirline();
}

function pickPartnerAirline(): string {
  const partners = ['DL', 'KE', 'VS', 'AM', 'CI', 'GA', 'SU', 'ME'];
  return partners[Math.floor(Math.random() * partners.length)];
}

function getCabinForFlight(mix: { economy: number; premiumEconomy: number; business: number; first: number }): 'Economy' | 'Premium Economy' | 'Business' | 'First' {
  const rand = Math.random() * 100;
  if (rand < mix.economy) return 'Economy';
  if (rand < mix.economy + mix.premiumEconomy) return 'Premium Economy';
  if (rand < mix.economy + mix.premiumEconomy + mix.business) return 'Business';
  return 'First';
}

function getXPForCabin(route: RouteDefinition, cabin: string): number {
  switch (cabin) {
    case 'First': return route.xpFirst;
    case 'Business': return route.xpBusiness;
    case 'Premium Economy': return Math.round(route.xpEconomy * 1.5);
    default: return route.xpEconomy;
  }
}

function isKLorAF(airline: string): boolean {
  return airline === 'KLM' || airline === 'AF';
}

// ============================================================================
// FLIGHT GENERATOR
// ============================================================================

function generateFlights(config: DemoStatusConfig): FlightRecord[] {
  const flights: FlightRecord[] = [];
  const currentYear = new Date().getFullYear();
  const startYear = config.memberSinceYear;
  
  // Generate flown flights
  for (let i = 0; i < config.flownFlights; i++) {
    const routeDef = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    const airline = getAirlineForRoute(routeDef.route, config.airlineMix);
    const cabin = getCabinForFlight(config.cabinMix);
    const xp = getXPForCabin(routeDef, cabin);
    const date = randomDate(startYear, currentYear);
    
    // Create outbound flight
    flights.push({
      id: generateId(),
      date,
      route: routeDef.route,
      airline,
      cabin,
      earnedXP: xp,
      earnedMiles: routeDef.miles * (cabin === 'Business' ? 1.5 : cabin === 'First' ? 2 : 1),
      uxp: isKLorAF(airline) ? xp : 0,
      ticketPrice: cabin === 'First' ? 2500 + Math.random() * 5000 : cabin === 'Business' ? 800 + Math.random() * 2000 : 150 + Math.random() * 400,
    });
  }
  
  // Generate scheduled flights (future dates)
  const futureMonths = [1, 2, 3, 4, 5, 6];
  for (let i = 0; i < config.scheduledFlights; i++) {
    const routeDef = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    const airline = getAirlineForRoute(routeDef.route, config.airlineMix);
    const cabin = getCabinForFlight(config.cabinMix);
    const xp = getXPForCabin(routeDef, cabin);
    
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + futureMonths[i % futureMonths.length]);
    const date = futureDate.toISOString().slice(0, 10);
    
    flights.push({
      id: generateId(),
      date,
      route: routeDef.route,
      airline,
      cabin,
      earnedXP: xp,
      earnedMiles: routeDef.miles * (cabin === 'Business' ? 1.5 : cabin === 'First' ? 2 : 1),
      uxp: isKLorAF(airline) ? xp : 0,
      ticketPrice: cabin === 'First' ? 2500 + Math.random() * 5000 : cabin === 'Business' ? 800 + Math.random() * 2000 : 150 + Math.random() * 400,
    });
  }
  
  // Sort by date
  flights.sort((a, b) => a.date.localeCompare(b.date));
  
  return flights;
}

// ============================================================================
// MILES DATA GENERATOR
// ============================================================================

function generateMilesData(config: DemoStatusConfig): MilesRecord[] {
  const milesData: MilesRecord[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Generate 24 months of data
  for (let i = 23; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const isRecentMonth = i < 12;
    
    // Scale based on status level
    const statusMultiplier = config.status === 'Ultimate' ? 4 : 
                             config.status === 'Platinum' ? 3 : 
                             config.status === 'Gold' ? 2 : 1;
    
    milesData.push({
      id: generateId(),
      month: monthStr,
      miles_subscription: isRecentMonth ? 17000 : 0,
      miles_amex: Math.round((8000 + Math.random() * 12000) * statusMultiplier),
      miles_flight: Math.round((5000 + Math.random() * 15000) * statusMultiplier),
      miles_other: Math.random() > 0.7 ? Math.round(Math.random() * 5000) : 0,
      miles_debit: Math.random() > 0.85 ? Math.round(Math.random() * 50000) : 0,
      cost_subscription: isRecentMonth ? 186 : 0,
      cost_amex: 55,
      cost_flight: 0,
      cost_other: 0,
    });
  }
  
  return milesData;
}

// ============================================================================
// XP DATA GENERATOR
// ============================================================================

function generateXPData(config: DemoStatusConfig): XPRecord[] {
  const xpData: XPRecord[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  for (let i = 23; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    xpData.push({
      month: monthStr,
      f1: 0,
      f2: 0,
      f3: 0,
      f4: 0,
      misc: 0,
      saf: Math.random() > 0.7 ? Math.round(Math.random() * 15) : 0,
      amex_xp: Math.random() > 0.9 ? 60 : 0, // Yearly AMEX bonus
      status_correction: 0,
    });
  }
  
  return xpData;
}

// ============================================================================
// REDEMPTIONS GENERATOR
// ============================================================================

function generateRedemptions(config: DemoStatusConfig): RedemptionRecord[] {
  const redemptions: RedemptionRecord[] = [];
  
  if (config.status === 'Explorer' || config.status === 'Silver') {
    // Occasional upgrade
    if (Math.random() > 0.5) {
      redemptions.push({
        id: generateId(),
        date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
        description: 'Upgrade AMS-CDG',
        award_miles: 15000,
        cash_price_estimate: 180,
        surcharges: 25,
      });
    }
  } else if (config.status === 'Gold') {
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Europe Award Flight',
      award_miles: 30000,
      cash_price_estimate: 420,
      surcharges: 85,
    });
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Upgrade to Business',
      award_miles: 20000,
      cash_price_estimate: 350,
      surcharges: 0,
    });
  } else if (config.status === 'Platinum') {
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Business Award JFK',
      award_miles: 85000,
      cash_price_estimate: 2800,
      surcharges: 450,
    });
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Europe Award Flight',
      award_miles: 25000,
      cash_price_estimate: 380,
      surcharges: 75,
    });
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Upgrade to Business',
      award_miles: 35000,
      cash_price_estimate: 900,
      surcharges: 0,
    });
  } else if (config.status === 'Ultimate') {
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'La Première CDG-JFK',
      award_miles: 150000,
      cash_price_estimate: 8500,
      surcharges: 850,
    });
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Business Award SIN',
      award_miles: 95000,
      cash_price_estimate: 3200,
      surcharges: 520,
    });
    redemptions.push({
      id: generateId(),
      date: randomDate(new Date().getFullYear() - 1, new Date().getFullYear()),
      description: 'Companion Ticket Used',
      award_miles: 0,
      cash_price_estimate: 1200,
      surcharges: 0,
    });
  }
  
  return redemptions;
}

// ============================================================================
// MANUAL LEDGER GENERATOR
// ============================================================================

function generateManualLedger(config: DemoStatusConfig): ManualLedger {
  const ledger: ManualLedger = {};
  const currentYear = new Date().getFullYear();
  
  // Add yearly AMEX bonus
  ledger[`${currentYear}-03`] = {
    amexXp: 60,
    bonusSafXp: 0,
    miscXp: 0,
    correctionXp: 0,
  };
  
  // Add some SAF XP
  if (config.status !== 'Explorer') {
    ledger[`${currentYear}-06`] = {
      amexXp: 0,
      bonusSafXp: 12,
      miscXp: 0,
      correctionXp: 0,
    };
  }
  
  return ledger;
}

// ============================================================================
// QUALIFICATION SETTINGS GENERATOR
// ============================================================================

function generateQualificationSettings(config: DemoStatusConfig): QualificationSettings {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Cycle starts in November
  const cycleYear = currentMonth >= 11 ? currentYear : currentYear - 1;
  
  return {
    cycleStartMonth: `${cycleYear}-11`,
    startingStatus: config.status === 'Ultimate' ? 'Platinum' : 
                   config.status === 'Platinum' ? 'Gold' : 
                   config.status === 'Gold' ? 'Silver' : 'Explorer',
    startingXP: config.xpRollover,
    startingUXP: config.uxpRollover,
    ultimateCycleType: config.status === 'Ultimate' ? 'calendar' : 'qualification',
  };
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export function generateDemoDataForStatus(status: StatusLevel): DemoDataSet {
  const config = STATUS_CONFIGS[status];
  
  return {
    flights: generateFlights(config),
    milesData: generateMilesData(config),
    xpData: generateXPData(config),
    redemptions: generateRedemptions(config),
    manualLedger: generateManualLedger(config),
    qualificationSettings: generateQualificationSettings(config),
    xpRollover: config.xpRollover,
    uxpRollover: config.uxpRollover,
    currentStatus: config.status,
    targetCPM: 0.012,
  };
}

// Export configs for reference
export { STATUS_CONFIGS };
