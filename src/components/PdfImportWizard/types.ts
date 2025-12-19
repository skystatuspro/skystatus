// src/components/PdfImportWizard/types.ts
// Type definitions for PDF Import Verification Wizard

import { StatusLevel, FlightRecord, MilesRecord } from '../../types';

// ============================================================================
// WIZARD STATE
// ============================================================================

/**
 * Internal state managed by the wizard across all steps
 */
export interface WizardState {
  // Step 1: Status
  status: StatusLevel;
  statusConfirmed: boolean;
  
  // Step 2: Balances
  xpBalance: number;
  uxpBalance: number;
  milesBalance: number;
  
  // Step 3: Qualification Cycle (REQUIRED)
  cycleStartMonth: string;  // YYYY-MM format
  surplusXP: number;        // 0-300, carried over from previous cycle
}

// ============================================================================
// WIZARD PROPS
// ============================================================================

/**
 * Summary statistics from PDF parsing
 */
export interface ParseSummary {
  // Flights
  totalFlights: number;
  newFlights: number;
  duplicateFlights: number;
  totalFlightXP: number;
  totalFlightSafXP: number;
  
  // Miles
  totalMonths: number;
  totalMilesEarned: number;
  totalMilesDebit: number;
  
  // Discrepancy info
  pdfTotalXP: number | null;
  calculatedXP: number;
  hasXpDiscrepancy: boolean;
  xpDiscrepancy: number | null;
}

/**
 * Props passed to the wizard from PdfImportModal
 */
export interface PdfImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardCompleteData) => void;
  
  // Data from PDF parsing
  parseResult: {
    // Detected values from PDF header
    detectedStatus: StatusLevel | null;
    detectedXP: number;
    detectedUXP: number;
    detectedMiles: number;
    
    // Suggested cycle info (from requalification detection)
    suggestedCycleStart: string | null;  // YYYY-MM
    suggestedSurplusXP: number | null;
    
    // Parsed data
    flights: FlightRecord[];
    newFlights: FlightRecord[];
    duplicateFlights: FlightRecord[];
    milesData: MilesRecord[];
    
    // Summary stats
    summary: ParseSummary;
  };
  
  // Existing user settings (for returning users importing additional data)
  existingSettings?: {
    status: StatusLevel | null;
    cycleStartMonth: string | null;
    surplusXP: number | null;
  } | null;
}

/**
 * Data returned when wizard completes
 */
export interface WizardCompleteData {
  // Verified values
  status: StatusLevel;
  xpBalance: number;
  uxpBalance: number;
  milesBalance: number;
  cycleStartMonth: string;
  surplusXP: number;
  
  // Pass-through data
  flights: FlightRecord[];
  newFlights: FlightRecord[];
  milesData: MilesRecord[];
}

// ============================================================================
// STEP PROPS
// ============================================================================

/**
 * Common props for all step components
 */
export interface StepProps {
  wizardState: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

/**
 * Props for StatusStep
 */
export interface StatusStepProps extends StepProps {
  detectedStatus: StatusLevel | null;
}

/**
 * Props for BalanceStep
 */
export interface BalanceStepProps extends StepProps {
  detectedXP: number;
  detectedUXP: number;
  detectedMiles: number;
}

/**
 * Props for CycleStep
 */
export interface CycleStepProps extends StepProps {
  suggestedCycleStart: string | null;
  suggestedSurplusXP: number | null;
  // If true, user already has settings - step is optional (just confirm or change)
  hasExistingSettings: boolean;
}

/**
 * Props for PreviewStep
 */
export interface PreviewStepProps extends StepProps {
  flights: FlightRecord[];
  newFlights: FlightRecord[];
  duplicateFlights: FlightRecord[];
  milesData: MilesRecord[];
  summary: ParseSummary;
}

/**
 * Props for ConfirmStep
 */
export interface ConfirmStepProps extends StepProps {
  newFlightsCount: number;
  milesMonthsCount: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: ValidationError[];
}
