import { PopularRoute } from './types';

export const INPUT_BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500';

export const NO_SPINNER_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Popular mileage run routes from AMS
export const POPULAR_ROUTES: PopularRoute[] = [
  { code: 'AMS SIN', label: 'Singapore', icon: '🇸🇬' },
  { code: 'AMS JNB', label: 'Johannesburg', icon: '🇿🇦' },
  { code: 'AMS GRU', label: 'São Paulo', icon: '🇧🇷' },
  { code: 'AMS NRT', label: 'Tokyo', icon: '🇯🇵' },
  { code: 'AMS LAX', label: 'Los Angeles', icon: '🇺🇸' },
  { code: 'AMS DXB', label: 'Dubai', icon: '🇦🇪' },
];

// Cabin class options
export const CABIN_OPTIONS = [
  { value: 'Economy', label: 'Economy', short: 'Y' },
  { value: 'PremiumEconomy', label: 'Premium Economy', short: 'W' },
  { value: 'Business', label: 'Business', short: 'J' },
  { value: 'First', label: 'First / La Première', short: 'F' },
] as const;

// Distance band limits for insights
export const BAND_LIMITS: Record<string, number> = { 
  Medium: 2000, 
  'Long 1': 3500, 
  'Long 2': 5000 
};
