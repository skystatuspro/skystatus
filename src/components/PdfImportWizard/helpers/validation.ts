// src/components/PdfImportWizard/helpers/validation.ts
// Input validation utilities for PDF Import Wizard

import { WizardState, StepValidation } from '../types';

/**
 * Validate Step 1: Status
 * Always valid - we use detected status as default
 */
export function validateStatusStep(state: WizardState): StepValidation {
  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Validate Step 2: Balances
 */
export function validateBalanceStep(state: WizardState): StepValidation {
  const errors: { field: string; message: string }[] = [];

  // XP Balance
  if (isNaN(state.xpBalance) || state.xpBalance < 0) {
    errors.push({ field: 'xpBalance', message: 'XP must be 0 or higher' });
  } else if (state.xpBalance > 1000) {
    errors.push({ field: 'xpBalance', message: 'XP seems unusually high (max ~400 for requalification)' });
  }

  // UXP Balance
  if (isNaN(state.uxpBalance) || state.uxpBalance < 0) {
    errors.push({ field: 'uxpBalance', message: 'UXP must be 0 or higher' });
  } else if (state.uxpBalance > 1000) {
    errors.push({ field: 'uxpBalance', message: 'UXP seems unusually high' });
  }

  // Miles Balance
  if (isNaN(state.milesBalance) || state.milesBalance < 0) {
    errors.push({ field: 'milesBalance', message: 'Miles must be 0 or higher' });
  } else if (state.milesBalance > 10000000) {
    errors.push({ field: 'milesBalance', message: 'Miles balance seems unusually high' });
  }

  return {
    isValid: errors.filter(e => !e.message.includes('unusually')).length === 0,
    errors,
  };
}

/**
 * Validate Step 3: Qualification Cycle (REQUIRED)
 * This step MUST be completed - no skipping allowed
 */
export function validateCycleStep(state: WizardState): StepValidation {
  const errors: { field: string; message: string }[] = [];

  // Cycle Start Month is REQUIRED
  if (!state.cycleStartMonth || state.cycleStartMonth.trim() === '') {
    errors.push({ 
      field: 'cycleStartMonth', 
      message: 'Qualification cycle start month is required' 
    });
  } else {
    // Validate format YYYY-MM
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(state.cycleStartMonth)) {
      errors.push({ 
        field: 'cycleStartMonth', 
        message: 'Invalid month format' 
      });
    }
  }

  // Surplus XP validation
  if (isNaN(state.surplusXP) || state.surplusXP < 0) {
    errors.push({ field: 'surplusXP', message: 'Surplus XP must be 0 or higher' });
  } else if (state.surplusXP > 300) {
    errors.push({ field: 'surplusXP', message: 'Maximum surplus XP is 300' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Step 4: Preview
 * Always valid - purely informational
 */
export function validatePreviewStep(): StepValidation {
  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Validate Step 5: Confirm
 * Always valid if we got here
 */
export function validateConfirmStep(): StepValidation {
  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Check if a specific step is valid
 * @param hasExistingSettings - If true, cycle step is optional (pre-filled from existing data)
 */
export function isStepValid(step: number, state: WizardState, hasExistingSettings: boolean = false): boolean {
  switch (step) {
    case 0:
      return validateStatusStep(state).isValid;
    case 1:
      return validateBalanceStep(state).isValid;
    case 2:
      // If user has existing settings AND cycleStartMonth is pre-filled, it's valid
      if (hasExistingSettings && state.cycleStartMonth) {
        return true;
      }
      return validateCycleStep(state).isValid;
    case 3:
      return validatePreviewStep().isValid;
    case 4:
      return validateConfirmStep().isValid;
    default:
      return false;
  }
}

/**
 * Parse numeric input, returning 0 for invalid values
 */
export function parseNumericInput(value: string): number {
  const parsed = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('nl-NL');
}
