// src/components/PdfImportWizard/index.tsx
// PDF Import Verification Wizard - Main container component

import React, { useState, useMemo } from 'react';
import { X, FileText } from 'lucide-react';

// Types
import { 
  PdfImportWizardProps, 
  WizardState, 
  WizardCompleteData,
} from './types';

// Components
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';

// Steps
import { StatusStep } from './steps/StatusStep';
import { BalanceStep } from './steps/BalanceStep';
import { CycleStep } from './steps/CycleStep';
import { PreviewStep } from './steps/PreviewStep';
import { ConfirmStep } from './steps/ConfirmStep';

// Helpers
import { isStepValid } from './helpers/validation';

const TOTAL_STEPS = 5;

const STEP_TITLES = [
  'Verify Status',
  'Verify Balances',
  'Qualification Cycle',
  'Preview Data',
  'Confirm Import',
];

export const PdfImportWizard: React.FC<PdfImportWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  parseResult,
  existingSettings,
}) => {
  // =========================================================================
  // STATE
  // =========================================================================
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Determine if user has existing settings in the database
  const hasExistingSettings = !!(existingSettings?.cycleStartMonth);
  const hasExistingStatus = !!(existingSettings?.status);
  
  // Initialize wizard state with detected values OR existing settings
  // Priority: 1. PDF detected values, 2. Existing settings, 3. Defaults
  const [wizardState, setWizardState] = useState<WizardState>(() => ({
    // Step 1: Status - prefer PDF detected, then existing, then Explorer
    status: parseResult.detectedStatus || existingSettings?.status || 'Explorer',
    statusConfirmed: !!(parseResult.detectedStatus || existingSettings?.status),
    
    // Step 2: Balances - always from PDF
    xpBalance: parseResult.detectedXP,
    uxpBalance: parseResult.detectedUXP,
    milesBalance: parseResult.detectedMiles,
    
    // Step 3: Cycle - prefer PDF suggested, then existing settings
    cycleStartMonth: parseResult.suggestedCycleStart || existingSettings?.cycleStartMonth || '',
    surplusXP: parseResult.suggestedSurplusXP ?? existingSettings?.surplusXP ?? 0,
  }));

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1 && isStepValid(currentStep, wizardState)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    // Validate all steps before completing
    for (let i = 0; i < TOTAL_STEPS; i++) {
      if (!isStepValid(i, wizardState)) {
        setCurrentStep(i);
        return;
      }
    }

    // Prepare complete data
    const completeData: WizardCompleteData = {
      status: wizardState.status,
      xpBalance: wizardState.xpBalance,
      uxpBalance: wizardState.uxpBalance,
      milesBalance: wizardState.milesBalance,
      cycleStartMonth: wizardState.cycleStartMonth,
      surplusXP: wizardState.surplusXP,
      flights: parseResult.flights,
      newFlights: parseResult.newFlights,
      milesData: parseResult.milesData,
    };

    onComplete(completeData);
  };

  // =========================================================================
  // COMPUTED
  // =========================================================================

  const canContinue = useMemo(() => {
    return isStepValid(currentStep, wizardState, hasExistingSettings);
  }, [currentStep, wizardState, hasExistingSettings]);

  // Step 2 (Cycle) is skippable if user has existing settings
  const showSkip = currentStep !== 2 || hasExistingSettings;

  // =========================================================================
  // RENDER CURRENT STEP
  // =========================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StatusStep
            wizardState={wizardState}
            updateState={updateState}
            detectedStatus={parseResult.detectedStatus}
          />
        );
      case 1:
        return (
          <BalanceStep
            wizardState={wizardState}
            updateState={updateState}
            detectedXP={parseResult.detectedXP}
            detectedUXP={parseResult.detectedUXP}
            detectedMiles={parseResult.detectedMiles}
          />
        );
      case 2:
        return (
          <CycleStep
            wizardState={wizardState}
            updateState={updateState}
            suggestedCycleStart={parseResult.suggestedCycleStart}
            suggestedSurplusXP={parseResult.suggestedSurplusXP}
            hasExistingSettings={hasExistingSettings}
          />
        );
      case 3:
        return (
          <PreviewStep
            wizardState={wizardState}
            updateState={updateState}
            flights={parseResult.flights}
            newFlights={parseResult.newFlights}
            duplicateFlights={parseResult.duplicateFlights}
            milesData={parseResult.milesData}
            summary={parseResult.summary}
          />
        );
      case 4:
        return (
          <ConfirmStep
            wizardState={wizardState}
            updateState={updateState}
            newFlightsCount={parseResult.newFlights.length}
            milesMonthsCount={parseResult.milesData.length}
          />
        );
      default:
        return null;
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
        {/* Header with progress */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              <span className="font-bold text-slate-800">PDF Import</span>
              <span className="text-xs text-slate-400">
                Step {currentStep + 1} of {TOTAL_STEPS}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Progress dots */}
          <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          
          {/* Step title */}
          <p className="text-center text-sm text-slate-500 mt-2">
            {STEP_TITLES[currentStep]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer with navigation */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
            onComplete={handleComplete}
            completeLabel={`Import ${parseResult.newFlights.length} Flights & ${parseResult.milesData.length} Months`}
            showSkip={showSkip}
            onSkip={goNext}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfImportWizard;
