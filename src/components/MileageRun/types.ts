import { CabinClass, XPRecord, FlightRecord, ManualXPLedger, QualificationSettings } from '../../types';
import { DistanceBand } from '../../utils/airports';

export interface EditableSegment {
  id: string;
  from: string;
  to: string;
  distance: number;
  band: DistanceBand;
  xp: number;
  cabin: CabinClass;
}

export interface MileageRunProps {
  xpData: XPRecord[];
  rollover: number;
  flights: FlightRecord[];
  manualLedger: ManualXPLedger;
  qualificationSettings: QualificationSettings;
}

export type StatusLevel = 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
export type RunMode = 'classic' | 'optimizer';

export interface PopularRoute {
  code: string;
  label: string;
  icon: string;
}

export interface StatusTheme {
  gradient: string;
  lightGradient: string;
  border: string;
  text: string;
  bg: string;
  accent: string;
}

export interface DistanceInsight {
  diff: number;
  message: string;
}

export interface ReportFormData {
  route: string;
  calculatedXP: string;
  actualXP: string;
  cabin: CabinClass;
  notes: string;
}
