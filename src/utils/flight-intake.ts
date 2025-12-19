import { MilesRecord, XPRecord, FlightRecord, CabinClass } from '../types';
import { generateId } from './format'; 

export interface FlightIntakePayload {
  id?: string;
  date: string;
  route: string;
  airline: string;
  cabin: CabinClass;
  ticketPrice: number;
  earnedMiles: number;
  earnedXP: number;
  safXp?: number;
  flightNumber?: string;
  uxp?: number;
}

export const createFlightRecord = (payload: FlightIntakePayload): FlightRecord => {
  // FIX: Gebruik Math.random om te voorkomen dat 4 vluchten in 1 milliseconde dezelfde ID krijgen
  const uniqueId = payload.id ?? `flight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: uniqueId,
    date: payload.date,
    route: payload.route,
    airline: payload.airline,
    cabin: payload.cabin,
    ticketPrice: payload.ticketPrice,
    earnedMiles: payload.earnedMiles,
    earnedXP: payload.earnedXP,
    safXp: payload.safXp ?? 0,
    flightNumber: payload.flightNumber,
    uxp: payload.uxp,
  };
};

export const rebuildLedgersFromFlights = (
  milesData: MilesRecord[],
  xpData: XPRecord[],
  flights: FlightRecord[]
): { miles: MilesRecord[]; xp: XPRecord[] } => {
  const milesByMonth = new Map<string, MilesRecord>();
  const xpByMonth = new Map<string, XPRecord>();

  const getLedgerId = (prefix: string, month: string) => `${prefix}-${month}`;

  (milesData ?? []).forEach((r) => {
    if (r && typeof r.month === 'string') milesByMonth.set(r.month, { ...r });
  });

  (xpData ?? []).forEach((r) => {
    if (r && typeof r.month === 'string') xpByMonth.set(r.month, { ...r });
  });

  (flights ?? []).forEach((f) => {
    const month = (f as any).month || f.date?.slice(0, 7);
    if (!month) return;

    const flightMiles = f.earnedMiles || 0;
    const flightCost = f.ticketPrice || 0;

    const existingMiles = milesByMonth.get(month);
    if (existingMiles) {
      milesByMonth.set(month, {
        ...existingMiles,
        miles_flight: (existingMiles.miles_flight || 0) + flightMiles,
        cost_flight: (existingMiles.cost_flight || 0) + flightCost,
      });
    } else {
      milesByMonth.set(month, {
        id: getLedgerId('miles', month),
        month,
        miles_subscription: 0, miles_amex: 0, miles_flight: flightMiles, miles_other: 0, miles_debit: 0,
        cost_subscription: 0, cost_amex: 0, cost_flight: flightCost, cost_other: 0,
      });
    }

    const existingXP = xpByMonth.get(month);
    const safFromFlight = f.safXp || 0;
    const xpFromFlight = f.earnedXP || 0;

    if (existingXP) {
      xpByMonth.set(month, {
        ...existingXP,
        f1: (existingXP.f1 || 0) + xpFromFlight,
        saf: (existingXP.saf || 0) + safFromFlight,
      });
    } else {
      xpByMonth.set(month, {
        id: getLedgerId('xp', month),
        month,
        f1: xpFromFlight, f2: 0, f3: 0, f4: 0, misc: 0, saf: safFromFlight, amex_xp: 0, status_correction: 0,
      });
    }
  });

  const miles = Array.from(milesByMonth.values()).sort((a, b) => (a.month || '').localeCompare(b.month || ''));
  const xp = Array.from(xpByMonth.values()).sort((a, b) => (a.month || '').localeCompare(b.month || ''));

  return { miles, xp };
};