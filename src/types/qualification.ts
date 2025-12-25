// src/types/qualification.ts
// Qualification cycle settings - extracted for clean imports

import type { StatusLevel } from '../types';

export interface QualificationSettings {
  cycleStartMonth: string;
  startingStatus: StatusLevel;
  startingXP: number;
  startingUXP?: number;
  ultimateCycleType?: 'qualification' | 'calendar';
  cycleStartDate?: string; // Full date for precise XP filtering
}
