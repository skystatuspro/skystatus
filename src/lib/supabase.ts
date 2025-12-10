import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gjpucmnghcopsatonqcy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHVjbW5naGNvcHNhdG9ucWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzYwNDQsImV4cCI6MjA4MDk1MjA0NH0.4VyQQBNmDOlhzjqLpbiBPi9bpMj6eqaGO8JYuC5bqlo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on our schema
export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  target_cpm: number;
  qualification_start_month: string;
  home_airport: string;
  created_at: string;
  updated_at: string;
}

export interface DbFlight {
  id: string;
  user_id: string;
  date: string;
  origin: string;
  destination: string;
  airline: string;
  flight_number: string | null;
  cabin_class: string;
  ticket_price: number;
  miles_earned: number;
  xp_earned: number;
  is_scheduled: boolean;
  notes: string | null;
  created_at: string;
}

export interface DbMilesTransaction {
  id: string;
  user_id: string;
  month: string;
  source: string;
  miles: number;
  cost: number;
  is_projected: boolean;
  notes: string | null;
  created_at: string;
}

export interface DbRedemption {
  id: string;
  user_id: string;
  date: string;
  description: string;
  award_miles: number;
  surcharges: number;
  cash_value: number;
  cpm: number;
  created_at: string;
}
