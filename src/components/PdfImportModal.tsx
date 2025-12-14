// src/components/PdfImportModal.tsx
// Modal for importing Flying Blue PDF transaction history

import React, { useState, useCallback, useRef } from 'react';
import {
  X,
  FileText,
  Upload,
  Plane,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Award,
  Info,
  Smile,
  Meh,
  Frown,
  Send,
  Shield,
  ExternalLink
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  parseFlyingBlueText, 
  toFlightRecords, 
  toMilesRecords,
  ParseResult 
} from '../utils/parseFlyingBluePdf';
import { FlightRecord, MilesRecord } from '../types';
import {
  submitFeedback,
  recordFirstImport,
  hasGivenPostImportFeedback,
  markPostImportFeedbackGiven,
  FeedbackRating
} from '../lib/feedbackService';

// Set up PDF.js worker - use unpkg which has all npm versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface XPCorrection {
  month: string;
  correctionXp: number;
  reason: string;
}

interface CycleSettings {
  cycleStartMonth: string;
  cycleStartDate?: string;  // Full date for precise XP filtering
  startingStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
}

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (flights: FlightRecord[], miles: MilesRecord[], xpCorrection?: XPCorrection, cycleSettings?: CycleSettings) => void;
  existingFlights: FlightRecord[];
  existingMiles: MilesRecord[];
}

type ImportStep = 'upload' | 'parsing' | 'preview' | 'feedback' | 'error';

const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingFlights,
  existingMiles
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [showMilesDetails, setShowMilesDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>(null);
  const [showPrivacyOverlay, setShowPrivacyOverlay] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [importSummaryForFeedback, setImportSummaryForFeedback] = useState<{flights: number, miles: number} | null>(null);
  
  // XP Correction state
  const [addXpCorrection, setAddXpCorrection] = useState(true); // Default to true
  
  // Cycle settings state
  const [applyCycleSettings, setApplyCycleSettings] = useState(true); // Default to true

  // Calculate what will be imported (excluding duplicates)
  const getImportSummary = useCallback(() => {
    if (!parseResult) return null;

    const flights = toFlightRecords(parseResult.flights);
    const miles = toMilesRecords(parseResult.miles);

    // Check for duplicate flights (by date + route)
    const existingFlightKeys = new Set(existingFlights.map(f => `${f.date}-${f.route}`));
    const newFlights = flights.filter(f => !existingFlightKeys.has(`${f.date}-${f.route}`));
    const duplicateFlights = flights.length - newFlights.length;

    // Check for duplicate/updated miles (by month)
    const existingMonths = new Set(existingMiles.map(m => m.month));
    const newMiles = miles.filter(m => !existingMonths.has(m.month));
    const updatedMiles = miles.filter(m => existingMonths.has(m.month));

    const totalFlightXP = flights.reduce((sum, f) => sum + f.earnedXP, 0);
    const totalFlightSafXP = flights.reduce((sum, f) => sum + f.safXp, 0);
    const calculatedXP = totalFlightXP + totalFlightSafXP;
    
    // XP Discrepancy detection
    const pdfTotalXP = parseResult.totalXP;
    const xpDiscrepancy = pdfTotalXP !== null ? pdfTotalXP - calculatedXP : null;
    const hasXpDiscrepancy = xpDiscrepancy !== null && xpDiscrepancy !== 0;

    // Data range info
    const oldestDate = parseResult.oldestDate;
    const newestDate = parseResult.newestDate;
    const requalifications = parseResult.requalifications || [];
    
    // Determine if data might be incomplete (oldest flight is less than 12 months ago)
    let dataRangeMonths = 0;
    if (oldestDate && newestDate) {
      const oldest = new Date(oldestDate);
      const newest = new Date(newestDate);
      dataRangeMonths = Math.round((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }

    // Find suggested cycle settings from most recent requalification
    // Sort requalifications by date descending and take the most recent
    const sortedRequalifications = [...requalifications].sort((a, b) => b.date.localeCompare(a.date));
    const mostRecentRequalification = sortedRequalifications[0] || null;
    
    let suggestedCycleStart: string | null = null;
    let suggestedCycleStartDate: string | null = null;  // Full date for precise filtering
    let suggestedStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum' | null = null;
    
    if (mostRecentRequalification) {
      // Keep the full date for precise XP calculation
      suggestedCycleStartDate = mostRecentRequalification.date; // Full date YYYY-MM-DD
      // Convert date (YYYY-MM-DD) to month (YYYY-MM)
      suggestedCycleStart = mostRecentRequalification.date.substring(0, 7);
      // Map status
      const statusMap: Record<string, 'Explorer' | 'Silver' | 'Gold' | 'Platinum'> = {
        'EXPLORER': 'Explorer',
        'SILVER': 'Silver', 
        'GOLD': 'Gold',
        'PLATINUM': 'Platinum',
        'ULTIMATE': 'Platinum', // Map Ultimate to Platinum for now
      };
      suggestedStatus = mostRecentRequalification.toStatus 
        ? statusMap[mostRecentRequalification.toStatus] || null
        : null;
    }

    return {
      flights,
      miles,
      newFlights,
      duplicateFlights,
      newMiles,
      updatedMiles,
      totalFlightXP,
      totalFlightSafXP,
      totalFlightMiles: flights.reduce((sum, f) => sum + f.earnedMiles, 0),
      totalMilesEarned: miles.reduce((sum, m) => sum + m.miles_subscription + m.miles_amex + m.miles_other, 0),
      totalMilesDebit: miles.reduce((sum, m) => sum + m.miles_debit, 0),
      // XP discrepancy info
      pdfTotalXP,
      calculatedXP,
      xpDiscrepancy,
      hasXpDiscrepancy,
      // Data range info
      oldestDate,
      newestDate,
      dataRangeMonths,
      requalifications,
      // Suggested cycle settings
      suggestedCycleStart,
      suggestedCycleStartDate,  // Full date for precise filtering
      suggestedStatus,
    };
  }, [parseResult, existingFlights, existingMiles]);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let rawText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Just collect all text items
      const items = textContent.items as any[];
      for (const item of items) {
        rawText += item.str + ' ';
      }
      rawText += '\n';
    }
    
    // Split into logical lines using date patterns as delimiters
    // Universal approach: match various date formats used worldwide
    
    // Text-based dates (any language month name)
    // Matches: "10 dec 2025", "Dec 9, 2025", "9 décembre 2025", "dezembro 9 2025", etc.
    const monthNames = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mrt|mei|okt|fév|avr|mai|aoû|déc|mär|dez|ene|ago|dic|gen|mag|giu|lug|ott';
    const dateWithMonthName = new RegExp(
      `(\\d{1,2}\\s+(?:${monthNames})[a-zéûôàèùäöü]*\\s+\\d{4}|(?:${monthNames})[a-zéûôàèùäöü]*\\s+\\d{1,2},?\\s+\\d{4})`,
      'gi'
    );
    
    // Numeric dates: "30/11/2025", "2025-11-30", "11-30-2025", etc.
    const dateNumeric = /(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4})/g;
    
    let processed = rawText.replace(dateWithMonthName, '\n$1');
    processed = processed.replace(dateNumeric, '\n$1');
    
    // Also split on flight segment patterns: "AMS - BER KL1234"
    const flightPattern = /([A-Z]{3}\s*[-–]\s*[A-Z]{3}\s+[A-Z]{2}\d{2,5})/g;
    processed = processed.replace(flightPattern, '\n$1');
    
    // Split on "Sustainable Aviation Fuel"
    processed = processed.replace(/(Sustainable Aviation Fuel)/gi, '\n$1');
    
    // Split on transaction type keywords (language-neutral where possible)
    processed = processed.replace(/(Subscribe to Miles|Miles\s*Complete)/gi, '\n$1');
    processed = processed.replace(/(Hotel\s*[-–])/gi, '\n$1');
    
    // Split on "op/on <date>" patterns (multilingual date reference)
    processed = processed.replace(/((?:op|on|le|am)\s+\d{1,2}\s+\w{3,12}\s+\d{4})/gi, '\n$1');
    
    return processed;
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      setStep('error');
      return;
    }

    setStep('parsing');
    setError(null);

    try {
      const text = await extractTextFromPdf(file);
      const result = parseFlyingBlueText(text);
      
      if (result.flights.length === 0 && result.miles.length === 0) {
        setError('No Flying Blue data found in this PDF. Make sure you\'re uploading a Flying Blue transaction history export.');
        setStep('error');
        return;
      }

      setParseResult(result);
      setStep('preview');
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Failed to parse PDF. Make sure it\'s a valid Flying Blue transaction history.');
      setStep('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    const summary = getImportSummary();
    if (!summary) return;

    // Prepare XP correction if needed
    let xpCorrection: XPCorrection | undefined;
    if (summary.hasXpDiscrepancy && addXpCorrection && summary.xpDiscrepancy && summary.xpDiscrepancy > 0) {
      // Get the current month for the correction
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      xpCorrection = {
        month: currentMonth,
        correctionXp: summary.xpDiscrepancy,
        reason: `PDF import correction (PDF shows ${summary.pdfTotalXP} XP, imported flights total ${summary.calculatedXP} XP)`,
      };
    }

    // Prepare cycle settings if detected and user opted in
    let cycleSettings: CycleSettings | undefined;
    if (applyCycleSettings && summary.suggestedCycleStart && summary.suggestedStatus) {
      cycleSettings = {
        cycleStartMonth: summary.suggestedCycleStart,
        cycleStartDate: summary.suggestedCycleStartDate || undefined,  // Full date for precise XP filtering
        startingStatus: summary.suggestedStatus,
      };
    }

    // Import new flights and all miles (miles will be merged)
    onImport(summary.newFlights, summary.miles, xpCorrection, cycleSettings);
    
    // Record first import for feedback triggers
    recordFirstImport();
    
    // Check if we should show feedback
    if (!hasGivenPostImportFeedback()) {
      // Store summary for feedback display
      const totalMiles = summary.miles.reduce((sum, m) => sum + m.miles_subscription + m.miles_amex + m.miles_other, 0);
      setImportSummaryForFeedback({
        flights: summary.newFlights.length,
        miles: totalMiles
      });
      setStep('feedback');
    } else {
      handleClose();
    }
  };

  const handleFeedbackSubmit = async () => {
    setFeedbackSubmitting(true);
    
    await submitFeedback({
      trigger: 'post_import',
      rating: feedbackRating,
      message: feedbackMessage.trim() || undefined,
      page: 'pdf_import',
    });
    
    markPostImportFeedbackGiven();
    setFeedbackSubmitting(false);
    handleClose();
  };

  const handleFeedbackSkip = () => {
    markPostImportFeedbackGiven();
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParseResult(null);
    setError(null);
    setShowFlightDetails(false);
    setShowMilesDetails(false);
    setFeedbackRating(null);
    setFeedbackMessage('');
    setImportSummaryForFeedback(null);
    setAddXpCorrection(true); // Reset for next import
    setApplyCycleSettings(true); // Reset for next import
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleReset = () => {
    setStep('upload');
    setParseResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const summary = getImportSummary();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import Flying Blue PDF</h2>
              <p className="text-xs text-slate-500">Import your transaction history from Flying Blue</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How to get your Flying Blue PDF:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Log in to <span className="font-medium">flyingblue.com</span></li>
                      <li>Go to <span className="font-medium">My Account → Activity overview</span></li>
                      <li><span className="font-medium text-amber-700">Click "More" repeatedly</span> until all activities are loaded</li>
                      <li>Scroll up and click <span className="font-medium">"Download"</span></li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Important:</strong> Flying Blue only exports activities visible on screen. Click "More" until you see your full history, or your import will be incomplete!
                  </p>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }
                `}
              >
                <div className={`
                  w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-blue-200' : 'bg-slate-100'}
                `}>
                  <Upload size={28} className={isDragging ? 'text-blue-600' : 'text-slate-400'} />
                </div>
                <p className="text-slate-700 font-medium mb-1">
                  {isDragging ? 'Drop your PDF here' : 'Drag & drop your Flying Blue PDF'}
                </p>
                <p className="text-sm text-slate-400">
                  or click to browse
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Privacy Notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <Shield size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-medium mb-1">🔒 Your PDF stays private</p>
                  <p className="text-emerald-700 text-xs leading-relaxed">
                    Your PDF is processed <strong>entirely in your browser</strong> — it's never uploaded to our servers. 
                    We only extract flight data (dates, routes, XP). Personal details like your name or Flying Blue number are not stored.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyOverlay(true)}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    Read full Privacy Policy
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parsing Step */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Parsing your Flying Blue data...</p>
              <p className="text-sm text-slate-400">This may take a few seconds</p>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <p className="text-slate-800 font-medium mb-2">Import Failed</p>
                <p className="text-sm text-slate-500 text-center max-w-md">{error}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parseResult && summary && (
            <div className="space-y-6">
              {/* Member Info */}
              {(parseResult.memberName || parseResult.status) && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User size={24} className="text-blue-600" />
                  </div>
                  <div>
                    {parseResult.memberName && (
                      <p className="font-bold text-slate-800">{parseResult.memberName}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      {parseResult.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          parseResult.status === 'PLATINUM' ? 'bg-slate-800 text-white' :
                          parseResult.status === 'GOLD' ? 'bg-amber-100 text-amber-700' :
                          parseResult.status === 'SILVER' ? 'bg-slate-200 text-slate-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {parseResult.status}
                        </span>
                      )}
                      {parseResult.memberNumber && (
                        <span className="text-slate-500">#{parseResult.memberNumber}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Range Info */}
              {summary.oldestDate && summary.newestDate && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Info size={16} className="text-slate-400" />
                    <span>
                      PDF contains data from <strong>{summary.oldestDate}</strong> to <strong>{summary.newestDate}</strong>
                      {summary.dataRangeMonths > 0 && ` (${summary.dataRangeMonths} months)`}
                    </span>
                  </div>
                  {summary.requalifications.length > 0 && !summary.suggestedCycleStart && (
                    <div className="mt-2 text-xs text-slate-500">
                      {summary.requalifications.length} requalification event{summary.requalifications.length > 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>
              )}

              {/* Cycle Settings Suggestion */}
              {summary.suggestedCycleStart && summary.suggestedStatus && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <Award size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800">
                        Qualification cycle detected
                      </p>
                      <p className="text-sm mt-1 text-purple-600">
                        Your PDF shows a requalification to <strong>{summary.suggestedStatus}</strong> in <strong>{summary.suggestedCycleStart}</strong>.
                      </p>
                      
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyCycleSettings}
                          onChange={(e) => setApplyCycleSettings(e.target.checked)}
                          className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-purple-800">
                          Set my qualification cycle to start {summary.suggestedCycleStart} as {summary.suggestedStatus}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Flights Card */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Plane size={18} className="text-emerald-600" />
                    <span className="font-bold text-emerald-800">Flights</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Found:</span>
                      <span className="font-bold text-emerald-800">{summary.flights.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">New:</span>
                      <span className="font-bold text-emerald-800">{summary.newFlights.length}</span>
                    </div>
                    {summary.duplicateFlights > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Duplicates:</span>
                        <span className="text-slate-400">{summary.duplicateFlights}</span>
                      </div>
                    )}
                    <div className="border-t border-emerald-200 my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Total XP:</span>
                      <span className="font-bold text-emerald-800">{summary.totalFlightXP}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">SAF XP:</span>
                      <span className="font-bold text-emerald-800">{summary.totalFlightSafXP}</span>
                    </div>
                  </div>
                </div>

                {/* Miles Card */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins size={18} className="text-blue-600" />
                    <span className="font-bold text-blue-800">Miles</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Months:</span>
                      <span className="font-bold text-blue-800">{summary.miles.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">New:</span>
                      <span className="font-bold text-blue-800">{summary.newMiles.length}</span>
                    </div>
                    {summary.updatedMiles.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Updates:</span>
                        <span className="text-slate-400">{summary.updatedMiles.length}</span>
                      </div>
                    )}
                    <div className="border-t border-blue-200 my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Earned:</span>
                      <span className="font-bold text-blue-800">{summary.totalMilesEarned.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Debit:</span>
                      <span className="font-bold text-red-500">-{summary.totalMilesDebit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flight Details */}
              {summary.flights.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowFlightDetails(!showFlightDetails)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      Flight Details ({summary.flights.length})
                    </span>
                    {showFlightDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {showFlightDetails && (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-500">Date</th>
                            <th className="px-3 py-2 text-left text-slate-500">Route</th>
                            <th className="px-3 py-2 text-left text-slate-500">Flight</th>
                            <th className="px-3 py-2 text-right text-slate-500">Miles</th>
                            <th className="px-3 py-2 text-right text-slate-500">XP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.flights.map((f, i) => {
                            const isDuplicate = existingFlights.some(e => e.date === f.date && e.route === f.route);
                            return (
                              <tr key={i} className={`border-t border-slate-100 ${isDuplicate ? 'opacity-40' : ''}`}>
                                <td className="px-3 py-2 font-mono">{f.date}</td>
                                <td className="px-3 py-2 font-bold">{f.route}</td>
                                <td className="px-3 py-2 text-slate-500">{f.flightNumber}</td>
                                <td className="px-3 py-2 text-right">{f.earnedMiles.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right font-bold text-blue-600">+{f.earnedXP}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {summary.duplicateFlights > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">{summary.duplicateFlights} duplicate flights will be skipped</p>
                    <p className="text-amber-600">These flights already exist in your data (matched by date + route).</p>
                  </div>
                </div>
              )}

              {/* XP Discrepancy Warning */}
              {summary.hasXpDiscrepancy && summary.xpDiscrepancy !== null && (
                <div className={`p-4 rounded-xl border ${summary.xpDiscrepancy > 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-start gap-3">
                    <Info size={18} className={`flex-shrink-0 mt-0.5 ${summary.xpDiscrepancy > 0 ? 'text-blue-500' : 'text-amber-500'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${summary.xpDiscrepancy > 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                        XP discrepancy detected
                      </p>
                      <p className={`text-sm mt-1 ${summary.xpDiscrepancy > 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        Your official Flying Blue balance is <strong>{summary.pdfTotalXP} XP</strong>, but imported flights total <strong>{summary.calculatedXP} XP</strong>.
                        {summary.xpDiscrepancy > 0 
                          ? ` The ${summary.xpDiscrepancy} XP difference likely comes from credit card bonuses, status bonuses, or older flights not in this PDF.`
                          : ` This is normal — older flights in the PDF don't count towards your current qualification period.`
                        }
                      </p>
                      
                      {summary.xpDiscrepancy > 0 && (
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addXpCorrection}
                            onChange={(e) => setAddXpCorrection(e.target.checked)}
                            className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-800">
                            Add +{summary.xpDiscrepancy} XP correction to match your actual balance
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Info size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 space-y-2">
                  <p><span className="font-medium">Note:</span> All flights are imported with "Economy" cabin. You can edit the cabin class later in the Flight Ledger.</p>
                  <p><span className="font-medium">Tip:</span> If your PDF doesn't cover your full qualification period, you can manually add older flights in the Flight Ledger, or add an XP correction in the XP Engine.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && summary && (
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={summary.newFlights.length === 0 && summary.miles.length === 0}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Import {summary.newFlights.length} Flights & {summary.miles.length} Months
              </button>
            </div>
          </div>
        )}

        {/* Feedback Step */}
        {step === 'feedback' && (
          <>
            {/* Success header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Import successful!</h3>
                  <p className="text-emerald-100 text-sm">
                    {importSummaryForFeedback?.flights ? `${importSummaryForFeedback.flights} flights` : ''}
                    {importSummaryForFeedback?.flights && importSummaryForFeedback?.miles ? ' · ' : ''}
                    {importSummaryForFeedback?.miles ? `${importSummaryForFeedback.miles.toLocaleString()} miles` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback content */}
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Quick question: how was the import process?
              </p>

              {/* Rating buttons */}
              <div className="flex gap-3 mb-4">
                {[
                  { value: 'easy' as FeedbackRating, icon: <Smile size={24} />, label: 'Easy' },
                  { value: 'okay' as FeedbackRating, icon: <Meh size={24} />, label: 'Okay' },
                  { value: 'confusing' as FeedbackRating, icon: <Frown size={24} />, label: 'Confusing' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFeedbackRating(option.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      feedbackRating === option.value
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Optional message */}
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Any details? (optional)"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={2}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={handleFeedbackSkip}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {feedbackSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Privacy Policy Overlay */}
      {showPrivacyOverlay && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Privacy Policy</h3>
                <p className="text-xs text-slate-500">How we handle your data</p>
              </div>
            </div>
            <button
              onClick={() => setShowPrivacyOverlay(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 text-sm">
              
              {/* Key Point */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="font-medium text-emerald-800">
                  🔒 Your Flying Blue PDFs are processed entirely in your browser. The PDF file is never uploaded to our servers.
                </p>
              </div>

              {/* PDF Processing */}
              <section>
                <h4 className="font-bold text-slate-900 mb-2">PDF Import &amp; Processing</h4>
                <p className="text-slate-600 mb-3">When you import a Flying Blue PDF:</p>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Client-side processing:</strong> The PDF is parsed entirely in your browser using JavaScript. No server is involved.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Data extraction:</strong> We extract only flight data: dates, routes, cabin class, XP earned, and miles. Personal details like your name or Flying Blue number are not stored.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>No file storage:</strong> The original PDF is never saved — not on our servers, not in your browser. Only the extracted flight records are kept.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Your choice:</strong> Extracted data is stored locally (Local Mode) or synced to your account (Cloud Mode), depending on your preference.</span>
                  </li>
                </ul>
              </section>

              {/* Data Storage */}
              <section>
                <h4 className="font-bold text-slate-900 mb-2">Data Storage</h4>
                <p className="text-slate-600 mb-3">SkyStatus offers two storage modes:</p>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Local Mode:</strong> Data stays only in your browser. We have zero access. Use export/import to backup.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Cloud Mode:</strong> Data syncs to your account via Supabase with encryption and row-level security. Only you can access your data.</span>
                  </li>
                </ul>
              </section>

              {/* Your Rights */}
              <section>
                <h4 className="font-bold text-slate-900 mb-2">Your Rights (GDPR)</h4>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-slate-400 font-bold">•</span>
                    <span><strong>Export:</strong> Download all your data anytime (Data Settings → Export JSON)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400 font-bold">•</span>
                    <span><strong>Delete:</strong> Remove all data permanently (Data Settings → Delete All Data)</span>
                  </li>
                </ul>
              </section>

              {/* Contact */}
              <section className="pt-4 border-t border-slate-200">
                <p className="text-slate-500 text-xs">
                  Questions? Contact us at{' '}
                  <a href="mailto:privacy@skystatus.pro" className="text-blue-600 hover:underline">privacy@skystatus.pro</a>
                  {' '}or read the{' '}
                  <a href="#/privacy" className="text-blue-600 hover:underline" onClick={() => setShowPrivacyOverlay(false)}>full Privacy Policy</a>.
                </p>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setShowPrivacyOverlay(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
            >
              Got it, continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfImportModal;
