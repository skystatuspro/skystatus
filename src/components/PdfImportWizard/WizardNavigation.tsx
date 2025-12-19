// src/components/PdfImportWizard/WizardNavigation.tsx
// Navigation buttons for wizard steps

import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  onComplete?: () => void;
  continueLabel?: string;
  completeLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  canContinue,
  onBack,
  onContinue,
  onComplete,
  continueLabel = 'Continue',
  completeLabel = 'Import',
  showSkip = false,
  onSkip,
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="flex items-center justify-between">
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={isFirstStep}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
          isFirstStep
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-600 hover:bg-slate-200'
        }`}
      >
        <ChevronLeft size={18} />
        Back
      </button>

      {/* Skip button (optional, middle position) */}
      {showSkip && onSkip && (
        <button
          onClick={onSkip}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip
        </button>
      )}

      {/* Continue/Complete button */}
      {isLastStep ? (
        <button
          onClick={onComplete}
          disabled={!canContinue}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            canContinue
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Check size={18} />
          {completeLabel}
        </button>
      ) : (
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            canContinue
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {continueLabel}
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};
