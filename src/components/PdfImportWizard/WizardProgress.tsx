// src/components/PdfImportWizard/WizardProgress.tsx
// Progress indicator dots for wizard steps

import React from 'react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === currentStep
              ? 'w-6 bg-blue-600'
              : index < currentStep
              ? 'w-2 bg-blue-600'
              : 'w-2 bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
};
