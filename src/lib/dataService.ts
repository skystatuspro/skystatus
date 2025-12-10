import { supabase } from './supabase';
import type { FlightRecord, MilesRecord, RedemptionRecord, ManualLedger } from '../types';

// ============================================
// FLIGHTS
// ============================================

export async function fetchFlights(userId: string): Promise<FlightRecord[]> {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching flights:', error);
    return [];
  }

  // Transform DB format to app format
  return (data || []).map(f => ({
    id: f.id,
    date: f.date,
    route: `${f.origin}-${f.destination}`,
    airline: f.airline,
    cabin: f.cabin_class as FlightRecord['cabin'],
    ticketPrice: f.ticket_price,
    earnedMiles: f.miles_earned,
    earnedXP: f.xp_earned,
    safXp: 0, // Not stored separately in DB yet
  }));
}

export async function saveFlight(userId: string, flight: FlightRecord): Promise<boolean> {
  const [origin, destination] = flight.route.split('-');
  
  const { error } = await supabase
    .from('flights')
    .upsert({
      id: flight.id,
      user_id: userId,
      date: flight.date,
      origin,
      destination,
      airline: flight.airline,
      cabin_class: flight.cabin,
      ticket_price: flight.ticketPrice,
      miles_earned: flight.earnedMiles,
      xp_earned: flight.earnedXP,
      is_scheduled: new Date(flight.date) > new Date(),
    });

  if (error) {
    console.error('Error saving flight:', error);
    return false;
  }
  return true;
}

export async function saveFlights(userId: string, flights: FlightRecord[]): Promise<boolean> {
  const records = flights.map(flight => {
    const [origin, destination] = flight.route.split('-');
    return {
      id: flight.id,
      user_id: userId,
      date: flight.date,
      origin,
      destination,
      airline: flight.airline,
      cabin_class: flight.cabin,
      ticket_price: flight.ticketPrice,
      miles_earned: flight.earnedMiles,
      xp_earned: flight.earnedXP,
      is_scheduled: new Date(flight.date) > new Date(),
    };
  });

  const { error } = await supabase
    .from('flights')
    .upsert(records);

  if (error) {
    console.error('Error saving flights:', error);
    return false;
  }
  return true;
}

export async function deleteFlight(flightId: string): Promise<boolean> {
  const { error } = await supabase
    .from('flights')
    .delete()
    .eq('id', flightId);

  if (error) {
    console.error('Error deleting flight:', error);
    return false;
  }
  return true;
}

// ============================================
// MILES TRANSACTIONS
// ============================================

export async function fetchMilesTransactions(userId: string): Promise<MilesRecord[]> {
  const { data, error } = await supabase
    .from('miles_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching miles:', error);
    return [];
  }

  // Group by month and transform to MilesRecord format
  const byMonth: Record<string, MilesRecord> = {};
  
  (data || []).forEach(t => {
    if (!byMonth[t.month]) {
      byMonth[t.month] = {
        id: t.month,
        month: t.month,
        miles_subscription: 0,
        miles_amex: 0,
        miles_flight: 0,
        miles_other: 0,
        miles_debit: 0,
        cost_subscription: 0,
        cost_amex: 0,
        cost_flight: 0,
        cost_other: 0,
      };
    }

    const record = byMonth[t.month];
    switch (t.source) {
      case 'subscription':
        record.miles_subscription += t.miles;
        record.cost_subscription += t.cost;
        break;
      case 'amex':
        record.miles_amex += t.miles;
        record.cost_amex += t.cost;
        break;
      case 'flight':
        record.miles_flight += t.miles;
        record.cost_flight += t.cost;
        break;
      case 'debit':
        record.miles_debit += t.miles;
        break;
      default:
        record.miles_other += t.miles;
        record.cost_other += t.cost;
    }
  });

  return Object.values(byMonth);
}

export async function saveMilesRecord(userId: string, record: MilesRecord): Promise<boolean> {
  // Convert single MilesRecord to multiple transactions
  const transactions = [];

  if (record.miles_subscription > 0 || record.cost_subscription > 0) {
    transactions.push({
      user_id: userId,
      month: record.month,
      source: 'subscription',
      miles: record.miles_subscription,
      cost: record.cost_subscription,
      is_projected: false,
    });
  }

  if (record.miles_amex > 0 || record.cost_amex > 0) {
    transactions.push({
      user_id: userId,
      month: record.month,
      source: 'amex',
      miles: record.miles_amex,
      cost: record.cost_amex,
      is_projected: false,
    });
  }

  if (record.miles_other > 0 || record.cost_other > 0) {
    transactions.push({
      user_id: userId,
      month: record.month,
      source: 'other',
      miles: record.miles_other,
      cost: record.cost_other,
      is_projected: false,
    });
  }

  if (record.miles_debit > 0) {
    transactions.push({
      user_id: userId,
      month: record.month,
      source: 'debit',
      miles: record.miles_debit,
      cost: 0,
      is_projected: false,
    });
  }

  if (transactions.length === 0) return true;

  // Delete existing transactions for this month first
  await supabase
    .from('miles_transactions')
    .delete()
    .eq('user_id', userId)
    .eq('month', record.month);

  const { error } = await supabase
    .from('miles_transactions')
    .insert(transactions);

  if (error) {
    console.error('Error saving miles:', error);
    return false;
  }
  return true;
}

export async function saveMilesRecords(userId: string, records: MilesRecord[]): Promise<boolean> {
  // Delete all existing transactions for this user
  await supabase
    .from('miles_transactions')
    .delete()
    .eq('user_id', userId);

  // Convert all records to transactions
  const transactions: any[] = [];

  records.forEach(record => {
    if (record.miles_subscription > 0 || record.cost_subscription > 0) {
      transactions.push({
        user_id: userId,
        month: record.month,
        source: 'subscription',
        miles: record.miles_subscription,
        cost: record.cost_subscription,
        is_projected: false,
      });
    }

    if (record.miles_amex > 0 || record.cost_amex > 0) {
      transactions.push({
        user_id: userId,
        month: record.month,
        source: 'amex',
        miles: record.miles_amex,
        cost: record.cost_amex,
        is_projected: false,
      });
    }

    if (record.miles_other > 0 || record.cost_other > 0) {
      transactions.push({
        user_id: userId,
        month: record.month,
        source: 'other',
        miles: record.miles_other,
        cost: record.cost_other,
        is_projected: false,
      });
    }

    if (record.miles_debit > 0) {
      transactions.push({
        user_id: userId,
        month: record.month,
        source: 'debit',
        miles: record.miles_debit,
        cost: 0,
        is_projected: false,
      });
    }
  });

  if (transactions.length === 0) return true;

  const { error } = await supabase
    .from('miles_transactions')
    .insert(transactions);

  if (error) {
    console.error('Error saving miles:', error);
    return false;
  }
  return true;
}

// ============================================
// REDEMPTIONS
// ============================================

export async function fetchRedemptions(userId: string): Promise<RedemptionRecord[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching redemptions:', error);
    return [];
  }

  return (data || []).map(r => ({
    id: r.id,
    date: r.date,
    description: r.description,
    award_miles: r.award_miles,
    surcharges: r.surcharges,
    cash_price_estimate: r.cash_value,
  }));
}

export async function saveRedemption(userId: string, redemption: RedemptionRecord): Promise<boolean> {
  const { error } = await supabase
    .from('redemptions')
    .upsert({
      id: redemption.id,
      user_id: userId,
      date: redemption.date,
      description: redemption.description,
      award_miles: redemption.award_miles,
      surcharges: redemption.surcharges,
      cash_value: redemption.cash_price_estimate,
    });

  if (error) {
    console.error('Error saving redemption:', error);
    return false;
  }
  return true;
}

export async function saveRedemptions(userId: string, redemptions: RedemptionRecord[]): Promise<boolean> {
  // Delete all existing redemptions for this user
  await supabase
    .from('redemptions')
    .delete()
    .eq('user_id', userId);

  if (redemptions.length === 0) return true;

  const records = redemptions.map(r => ({
    id: r.id,
    user_id: userId,
    date: r.date,
    description: r.description,
    award_miles: r.award_miles,
    surcharges: r.surcharges,
    cash_value: r.cash_price_estimate,
  }));

  const { error } = await supabase
    .from('redemptions')
    .insert(records);

  if (error) {
    console.error('Error saving redemptions:', error);
    return false;
  }
  return true;
}

export async function deleteRedemption(redemptionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('redemptions')
    .delete()
    .eq('id', redemptionId);

  if (error) {
    console.error('Error deleting redemption:', error);
    return false;
  }
  return true;
}

// ============================================
// PROFILE / SETTINGS
// ============================================

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function updateProfile(userId: string, updates: {
  target_cpm?: number;
  qualification_start_month?: string;
  home_airport?: string;
  display_name?: string;
}): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  return true;
}

// ============================================
// FULL DATA SYNC
// ============================================

export interface UserData {
  flights: FlightRecord[];
  milesData: MilesRecord[];
  redemptions: RedemptionRecord[];
  profile: {
    targetCPM: number;
    qualificationStartMonth: string;
    homeAirport: string;
  } | null;
}

export async function fetchAllUserData(userId: string): Promise<UserData> {
  const [flights, milesData, redemptions, profile] = await Promise.all([
    fetchFlights(userId),
    fetchMilesTransactions(userId),
    fetchRedemptions(userId),
    fetchProfile(userId),
  ]);

  return {
    flights,
    milesData,
    redemptions,
    profile: profile ? {
      targetCPM: profile.target_cpm,
      qualificationStartMonth: profile.qualification_start_month,
      homeAirport: profile.home_airport,
    } : null,
  };
}

export async function saveAllUserData(
  userId: string,
  data: {
    flights?: FlightRecord[];
    milesData?: MilesRecord[];
    redemptions?: RedemptionRecord[];
    targetCPM?: number;
  }
): Promise<boolean> {
  const promises: Promise<boolean>[] = [];

  if (data.flights) {
    promises.push(saveFlights(userId, data.flights));
  }
  if (data.milesData) {
    promises.push(saveMilesRecords(userId, data.milesData));
  }
  if (data.redemptions) {
    promises.push(saveRedemptions(userId, data.redemptions));
  }
  if (data.targetCPM !== undefined) {
    promises.push(updateProfile(userId, { target_cpm: data.targetCPM }));
  }

  const results = await Promise.all(promises);
  return results.every(r => r);
}
