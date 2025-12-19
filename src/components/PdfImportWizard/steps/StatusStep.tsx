// src/components/PdfImportWizard/steps/StatusStep.tsx
// Step 1: Verify Flying Blue status

import React from 'react';
import { Award, Check } from 'lucide-react';
import { StatusStepProps } from '../types';
import { StatusLevel } from '../../../types';

const STATUS_OPTIONS: { value: StatusLevel; label: string; color: string }[] = [
  { value: 'Explorer', label: 'Explorer', color: 'bg-slate-500' },
  { value: 'Silver', label: 'Silver', color: 'bg-slate-400' },
  { value: 'Gold', label: 'Gold', color: 'bg-amber-500' },
  { value: 'Platinum', label: 'Platinum', color: 'bg-slate-600' },
  { value: 'Ultimate', label: 'Ultimate', color: 'bg-slate-900' },
];

const StatusBadge: React.FC<{ status: StatusLevel; large?: boolean }> = ({ status, large }) => {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white font-bold ${
        option?.color || 'bg-slate-500'
      } ${large ? 'text-lg px-5 py-2' : 'text-sm'}`}
    >
      <Award size={large ? 20 : 14} />
      {status}
    </span>
  );
};

export const StatusStep: React.FC<StatusStepProps> = ({
  wizardState,
  updateState,
  detectedStatus,
}) => {
  const handleConfirmChange = (confirmed: boolean) => {
    updateState({
      statusConfirmed: confirmed,
      // If confirming, use detected status; if not, keep current selection
      status: confirmed && detectedStatus ? detectedStatus : wizardState.status,
    });
  };

  const handleStatusChange = (status: StatusLevel) => {
    updateState({
      status,
      statusConfirmed: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Award className="text-blue-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Confirm Your Status
        </h2>
        <p className="text-slate-500 text-sm">
          We detected the following Flying Blue status from your PDF.
        </p>
      </div>

      {/* Detected Status Display */}
      {detectedStatus && (
        <div className="flex justify-center py-4">
          <StatusBadge status={detectedStatus} large />
        </div>
      )}

      {/* Confirmation Options */}
      <div className="space-y-3">
        {/* Yes, this is correct */}
        <label
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            wizardState.statusConfirmed
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="statusConfirm"
            checked={wizardState.statusConfirmed}
            onChange={() => handleConfirmChange(true)}
            className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
          />
          <div className="flex-1">
            <p className="font-medium text-slate-800">Yes, this is correct</p>
          </div>
          {wizardState.statusConfirmed && (
            <Check size={20} className="text-blue-600" />
          )}
        </label>

        {/* No, my status is different */}
        <label
          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            !wizardState.statusConfirmed
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="statusConfirm"
            checked={!wizardState.statusConfirmed}
            onChange={() => handleConfirmChange(false)}
            className="w-5 h-5 mt-0.5 text-blue-600 border-slate-300 focus:ring-blue-500"
          />
          <div className="flex-1 space-y-3">
            <p className="font-medium text-slate-800">No, my status is:</p>
            
            {!wizardState.statusConfirmed && (
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusChange(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      wizardState.status === option.value
                        ? `${option.color} text-white`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Info note */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-500">
          Your status determines your qualification targets and benefits. 
          This comes from the header of your Flying Blue PDF statement.
        </p>
      </div>
    </div>
  );
};
