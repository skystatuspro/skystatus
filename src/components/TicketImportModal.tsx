// src/components/TicketImportModal.tsx
// Modal for importing KLM/Air France e-ticket confirmations via paste

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Clipboard,
  Plane,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Ticket,
  Award,
  Fuel,
  Pencil,
} from 'lucide-react';
import { parseTicketEmail, ticketToFlightPayloads, ParsedTicket } from '../utils/parseTicketEmail';
import { useCurrency } from '../lib/CurrencyContext';

interface TicketImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (flights: ReturnType<typeof ticketToFlightPayloads>) => void;
  currentStatus: string;
}

export const TicketImportModal: React.FC<TicketImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentStatus,
}) => {
  const { format: formatCurrency } = useCurrency();
  const [inputText, setInputText] = useState('');
  const [parsedTicket, setParsedTicket] = useState<ParsedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [manualRevenueBase, setManualRevenueBase] = useState<number | null>(null);
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);

  // Reset manual revenue base when ticket changes
  useEffect(() => {
    if (parsedTicket) {
      setManualRevenueBase(null);
      setIsEditingRevenue(parsedTicket.pricing.ticketPriceMissing);
    }
  }, [parsedTicket]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
      handleParse(text);
    } catch (err) {
      // Clipboard API might be blocked, user can paste manually
      console.warn('Could not read clipboard:', err);
    }
  }, []);

  const handleParse = useCallback((text: string) => {
    const result = parseTicketEmail(text);
    
    if (result.success && result.ticket) {
      setParsedTicket(result.ticket);
      setError(null);
      setWarnings(result.warnings);
      setStep('preview');
    } else {
      setError(result.error || 'Failed to parse ticket');
      setWarnings(result.warnings);
      setParsedTicket(null);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setError(null);
    setParsedTicket(null);
    setStep('paste');
  };

  const handleAnalyze = () => {
    if (inputText.trim()) {
      handleParse(inputText);
    }
  };

  const handleImport = () => {
    if (parsedTicket) {
      // If user manually entered a revenue base, use that instead
      const effectiveRevenueBase = manualRevenueBase ?? parsedTicket.pricing.revenueBase;
      
      // Create a modified ticket with the effective revenue base
      const ticketWithAdjustedPricing: ParsedTicket = {
        ...parsedTicket,
        pricing: {
          ...parsedTicket.pricing,
          revenueBase: effectiveRevenueBase,
        },
      };
      
      const payloads = ticketToFlightPayloads(ticketWithAdjustedPricing, currentStatus);
      onImport(payloads);
      handleClose();
    }
  };

  const handleClose = () => {
    setInputText('');
    setParsedTicket(null);
    setError(null);
    setWarnings([]);
    setStep('paste');
    setManualRevenueBase(null);
    setIsEditingRevenue(false);
    onClose();
  };

  const handleBack = () => {
    setStep('paste');
    setParsedTicket(null);
    setManualRevenueBase(null);
    setIsEditingRevenue(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Ticket</h2>
              <p className="text-xs text-slate-500">Paste your KLM or Air France e-ticket email</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'paste' ? (
            <>
              {/* Experimental Banner */}
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 bg-violet-200 text-violet-800 rounded text-[10px] font-bold mt-0.5">BETA</span>
                  <div className="text-sm text-violet-700">
                    <span className="font-medium">Experimental feature</span> — Works well with KLM and Air France e-tickets. 
                    Currently only tested with Dutch emails. We'd love your feedback!
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">How to use:</h3>
                <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                  <li>Open your KLM/Air France confirmation email</li>
                  <li>Select all text (Ctrl+A / Cmd+A) and copy (Ctrl+C / Cmd+C)</li>
                  <li>Paste it below or click the paste button</li>
                </ol>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="Paste your e-ticket email content here..."
                  className="w-full h-48 p-4 border border-slate-200 rounded-xl resize-none text-sm font-mono bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
                />
                <button
                  onClick={handlePaste}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <Clipboard size={14} />
                  Paste
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Analyze Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!inputText.trim()}
                  className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  Analyze Ticket
                </button>
              </div>
            </>
          ) : parsedTicket ? (
            <>
              {/* Parsed Ticket Preview */}
              <div className="space-y-4">
                {/* Booking Info */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Booking</div>
                    <div className="text-lg font-bold text-slate-900 font-mono">
                      {parsedTicket.bookingCode || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Passenger</div>
                    <div className="text-sm font-medium text-slate-700">
                      {parsedTicket.passengerName}
                    </div>
                  </div>
                  {parsedTicket.isAward && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      <Award size={14} />
                      Award Ticket
                    </div>
                  )}
                </div>

                {/* Flights */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {parsedTicket.flights.length} Flight{parsedTicket.flights.length !== 1 ? 's' : ''} Detected
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {parsedTicket.flights.map((flight, idx) => (
                      <div key={idx} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <Plane size={18} className="text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{flight.origin}</span>
                            <ArrowRight size={14} className="text-slate-400" />
                            <span className="font-bold text-slate-900">{flight.destination}</span>
                            <span className="text-xs font-mono text-slate-500">{flight.flightNumber}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {flight.date}
                            </span>
                            <span>{flight.departureTime} → {flight.arrivalTime}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-700">{flight.cabin}</div>
                          <div className="text-xs text-slate-400">Class {flight.bookingClass}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl ${parsedTicket.pricing.ticketPriceMissing && !parsedTicket.isAward ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${parsedTicket.pricing.ticketPriceMissing && !parsedTicket.isAward ? 'text-amber-600' : 'text-slate-500'}`}>
                        Miles Base
                      </span>
                      {!parsedTicket.isAward && (
                        <button
                          onClick={() => setIsEditingRevenue(!isEditingRevenue)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title="Edit miles base"
                        >
                          <Pencil size={12} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                    {parsedTicket.isAward ? (
                      <div className="text-lg font-bold text-amber-600">Award</div>
                    ) : isEditingRevenue ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">€</span>
                        <input
                          type="number"
                          value={manualRevenueBase ?? parsedTicket.pricing.revenueBase}
                          onChange={(e) => setManualRevenueBase(parseFloat(e.target.value) || 0)}
                          className="w-full text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-slate-900">
                        {formatCurrency(manualRevenueBase ?? parsedTicket.pricing.revenueBase)}
                      </div>
                    )}
                    {!parsedTicket.isAward && (
                      <div className={`text-[10px] mt-0.5 ${parsedTicket.pricing.ticketPriceMissing ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                        {parsedTicket.pricing.ticketPriceMissing 
                          ? '⚠ Not found in email - please enter manually'
                          : 'excl. taxes'}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                      <Fuel size={12} />
                      SAF Contribution
                    </div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatCurrency(parsedTicket.pricing.safContribution)}
                    </div>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl">
                    <div className="text-xs text-sky-600 mb-1">Total Paid</div>
                    <div className="text-lg font-bold text-sky-700">
                      {formatCurrency(parsedTicket.pricing.totalPrice)}
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                      <AlertTriangle size={14} />
                      Warnings
                    </div>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  Import {parsedTicket.flights.length} Flight{parsedTicket.flights.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
