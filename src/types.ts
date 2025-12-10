// src/types.ts

export interface MilesRecord {
  id: string;
  month: string; // Format YYYY-MM
  miles_subscription: number;
  miles_amex: number;
  miles_flight: number;
  miles_other: number;
  miles_debit: number; // Stored as POSITIVE number, treated as negative/burn in calc
  cost_subscription: number;
  cost_amex: number;
  cost_flight: number;
  cost_other: number;
}

// Legacy monthly XP structure based on Excel-style F1–F4
// Blijft bestaan voor oude data / migratie, maar wordt geen actieve bron meer.
export interface XPRecord {
  id: string;
  month: string; // Format YYYY-MM
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  misc: number;
  saf: number;
  amex_xp: number;
  status_correction: number; // Negative for requalification reset / level corrections
}

export interface RedemptionRecord {
  id: string;
  date: string;
  description: string;
  award_miles: number;
  surcharges: number;          // EUR
  cash_price_estimate: number; // EUR
  override_cpm?: number;       // optional CPM override in cents
}

export type ViewState =
  | 'dashboard'
  | 'addFlight'
  | 'addMiles'
  | 'miles'
  | 'xp'
  | 'redemption'
  | 'analytics'
  | 'mileageRun';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';

export interface FlightRecord {
  id: string;
  date: string;    // YYYY-MM-DD
  route: string;   // AMS-JFK
  airline: string; // KLM, AF, DL, etc.
  cabin: CabinClass;
  ticketPrice: number; // EUR
  earnedMiles: number;
  earnedXP: number;    // base flight XP (segment / fare)
  safXp: number;       // XP from SAF purchases linked to this flight
}

// Shared status type (XP side + eventueel miles multipliers)
export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum';

// Nieuwe handmatige XP-layer per maand
// Key in de map wordt "YYYY-MM"
export interface ManualMonthXP {
  amexXp: number;        // XP via Amex-kaarten
  bonusSafXp: number;    // Losse SAF-aankopen, niet aan een specifieke vlucht gekoppeld
  miscXp: number;        // Status matches, challenges, compensatie, etc.
  correctionXp: number;  // + of - correcties op de maand (fallback)
}

// Helper type voor de input keys in de XP Engine
export type ManualField = keyof ManualMonthXP;

export type ManualLedger = Record<string, ManualMonthXP>;

// Basisconfiguratie voor je kwalificatiejaar
export interface QualificationSettings {
  startYear: number;        // jaar waarin de huidige cycle start
  startMonth: number;       // 1–12 voor eerste maand van de cycle
  startStatus: StatusLevel; // status op de startdatum
  startXp: number;          // netto XP op de startdatum
}

export interface AppState {
  milesData: MilesRecord[];        // afgeleide miles (base + flights)
  redemptions: RedemptionRecord[];
  flights: FlightRecord[];         // alle vluchten, bron voor flight XP
  manualLedger: ManualLedger;      // handmatige XP per maand (Amex, bonus SAF, misc, correction)
  xpRollover: number;              // initial rollover bij start van eerste cycle
  currentMonth: string;            // YYYY-MM voor KPI's
  targetCPM: number;               // € per mile voor waardeberekening
  qualification?: QualificationSettings; // optioneel, voor dynamische cycles
}

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

export interface ProcessedRedemption extends RedemptionRecord {
  cpm: number;             // cent per mile
  value: number;           // EUR
  vsTarget: number;        // € vs target CPM
  vsAcquisition: number;   // € vs acquisition CPM
  classification: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Unknown';
}

export interface BurnStats {
  last12M: {
    avgBurnCpm: number;
    bestBurnCpm: number;
    totalValueVsTarget: number;
    totalMilesRedeemed: number;
    count: number;
  };
  lifetime: {
    avgBurnCpm: number;
    count: number;
  };
}
