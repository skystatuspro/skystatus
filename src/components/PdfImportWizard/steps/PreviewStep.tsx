// src/components/PdfImportWizard/steps/PreviewStep.tsx
// Step 4: Preview imported data (flights, miles)

import React, { useState } from 'react';
import { Plane, Coins, ChevronDown, ChevronUp, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { PreviewStepProps } from '../types';

export const PreviewStep: React.FC<PreviewStepProps> = ({
  flights,
  newFlights,
  duplicateFlights,
  milesData,
  summary,
}) => {
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [showMilesDetails, setShowMilesDetails] = useState(false);

  // Calculate totals
  const totalMilesEarned = milesData.reduce(
    (sum, m) => sum + m.miles_subscription + m.miles_amex + m.miles_other + m.miles_flight,
    0
  );
  const totalMilesDebit = milesData.reduce((sum, m) => sum + Math.abs(m.miles_debit), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Plane className="text-violet-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Review Your Data
        </h2>
        <p className="text-slate-500 text-sm">
          Here's what we found in your PDF.
        </p>
      </div>

      {/* Flights Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFlightDetails(!showFlightDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane size={18} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Flights</p>
              <p className="text-xs text-slate-500">
                {newFlights.length} new • {duplicateFlights.length} duplicates • {summary.totalFlightXP} XP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-600">
              {flights.length} total
            </span>
            {showFlightDetails ? (
              <ChevronUp size={18} className="text-slate-400" />
            ) : (
              <ChevronDown size={18} className="text-slate-400" />
            )}
          </div>
        </button>

        {showFlightDetails && (
          <div className="border-t border-slate-100 max-h-48 overflow-y-auto">
            {newFlights.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">
                No new flights to import
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Route</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Cabin</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-medium">XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {newFlights.slice(0, 20).map((flight, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{flight.date}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{flight.route}</td>
                      <td className="px-3 py-2 text-slate-600">{flight.cabin}</td>
                      <td className="px-3 py-2 text-right font-medium text-blue-600">
                        +{(flight.earnedXP || 0) + (flight.safXp || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {newFlights.length > 20 && (
              <p className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                ... and {newFlights.length - 20} more flights
              </p>
            )}
          </div>
        )}

        {duplicateFlights.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              <strong>{duplicateFlights.length}</strong> flights already exist and will be skipped
            </p>
          </div>
        )}
      </div>

      {/* Miles Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMilesDetails(!showMilesDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Coins size={18} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Miles Data</p>
              <p className="text-xs text-slate-500">
                +{totalMilesEarned.toLocaleString()} earned • -{totalMilesDebit.toLocaleString()} spent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-600">
              {milesData.length} months
            </span>
            {showMilesDetails ? (
              <ChevronUp size={18} className="text-slate-400" />
            ) : (
              <ChevronDown size={18} className="text-slate-400" />
            )}
          </div>
        </button>

        {showMilesDetails && (
          <div className="border-t border-slate-100 max-h-48 overflow-y-auto">
            {milesData.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">
                No miles data found
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Month</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-medium">Earned</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-medium">Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {milesData.slice(0, 15).map((month, idx) => {
                    const earned = month.miles_subscription + month.miles_amex + month.miles_other + month.miles_flight;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{month.month}</td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-600">
                          +{earned.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-red-500">
                          {month.miles_debit !== 0 ? `-${Math.abs(month.miles_debit).toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {milesData.length > 15 && (
              <p className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                ... and {milesData.length - 15} more months
              </p>
            )}
          </div>
        )}
      </div>

      {/* XP Discrepancy Warning */}
      {summary.hasXpDiscrepancy && summary.xpDiscrepancy !== null && (
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              XP Calculation Note
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Your PDF shows {summary.pdfTotalXP} XP, but flights total {summary.calculatedXP} XP. 
              This is normal — older flights outside your current qualification cycle don't count toward your XP balance.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {(newFlights.length > 0 || milesData.length > 0) && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <p className="text-sm text-emerald-700">
            Ready to import <strong>{newFlights.length}</strong> flights and <strong>{milesData.length}</strong> months of data
          </p>
        </div>
      )}
    </div>
  );
};
