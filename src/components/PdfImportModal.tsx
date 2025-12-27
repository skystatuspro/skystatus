// src/components/PdfImportModal.tsx
// Beautiful modal for importing Flying Blue PDF data using local parser
// 100% client-side - no data sent to servers

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plane,
  Coins,
  Zap,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ExternalLink,
  Info,
} from 'lucide-react';
import { localParseText, isLikelyFlyingBlueContent, type AIParsedResult, type AIParserError } from '../modules/local-text-parser';
import type { ActivityTransaction } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: AIParsedResult, includeHistoricalBalance: boolean) => void;
  /** For onboarding: auto-close modal after successful import */
  autoCloseOnSuccess?: boolean;
  /** Optional: Show compact version for smaller modals */
  compact?: boolean;
  /** Existing transactions in the system - used to detect duplicates */
  existingTransactions?: ActivityTransaction[];
}

type ParseState = 'idle' | 'parsing' | 'success' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  autoCloseOnSuccess = false,
  compact = false,
  existingTransactions = [],
}) => {
  // State
  const [text, setText] = useState('');
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [error, setError] = useState<AIParserError | null>(null);
  const [result, setResult] = useState<AIParsedResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Check if this is a fresh account (no existing transactions)
  const isFreshAccount = existingTransactions.length === 0;

  // Historical balance should ONLY be included for fresh accounts
  // For existing accounts, the historical balance was already added on first import
  const [includeHistoricalBalance, setIncludeHistoricalBalance] = useState(true);
  
  // Reset includeHistoricalBalance when account state changes
  // This ensures it's false for existing accounts
  React.useEffect(() => {
    setIncludeHistoricalBalance(isFreshAccount);
  }, [isFreshAccount]);

  // Build set of existing transaction IDs for quick lookup
  // These IDs are deterministic based on date/type/miles/xp/description
  const existingIds = React.useMemo(() => {
    return new Set(existingTransactions.map(tx => tx.id));
  }, [existingTransactions]);

  // Calculate new vs duplicate transactions from parsed result
  const { newTransactions, duplicateCount, newMilesTotal } = React.useMemo(() => {
    if (!result) return { newTransactions: [], duplicateCount: 0, newMilesTotal: 0 };
    
    const newTxs: typeof result.activityTransactions = [];
    let dupes = 0;
    let milesSum = 0;
    
    for (const tx of result.activityTransactions) {
      // Use the deterministic transaction ID for comparison
      if (existingIds.has(tx.id)) {
        dupes++;
      } else {
        newTxs.push(tx);
        milesSum += tx.miles;
      }
    }
    
    return { newTransactions: newTxs, duplicateCount: dupes, newMilesTotal: milesSum };
  }, [result, existingIds]);

  // Check if text looks valid
  const isValidContent = text.length > 100 && isLikelyFlyingBlueContent(text);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay before resetting to allow animation
      const timer = setTimeout(() => {
        setText('');
        setParseState('idle');
        setError(null);
        setResult(null);
        setShowDetails(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle parse
  const handleParse = useCallback(async () => {
    if (!isValidContent) return;

    setParseState('parsing');
    setError(null);
    setResult(null);

    try {
      const parseResult = await localParseText(text, { debug: false });

      if (parseResult.success) {
        setResult(parseResult.data);
        setParseState('success');
        
        // Auto-close for onboarding flow
        if (autoCloseOnSuccess) {
          setTimeout(() => {
            onImportComplete(parseResult.data, includeHistoricalBalance);
          }, 1500);
        }
      } else {
        setError(parseResult.error);
        setParseState('error');
      }
    } catch (e) {
      setError({
        code: 'PARSE_ERROR',
        message: e instanceof Error ? e.message : 'Unknown error occurred',
      });
      setParseState('error');
    }
  }, [text, isValidContent, autoCloseOnSuccess, onImportComplete, includeHistoricalBalance]);

  // Handle import
  const handleImport = useCallback(() => {
    if (!result) return;
    onImportComplete(result, includeHistoricalBalance);
    onClose();
  }, [result, includeHistoricalBalance, onImportComplete, onClose]);

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch {
      // Clipboard API might not be available
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full ${compact ? 'max-w-xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Flying Blue Data</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Shield size={12} />
                <span>100% Private - Data never leaves your device</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {parseState === 'idle' || parseState === 'error' ? (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  How to get your data
                </h3>
                <ol className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span>
                      Go to{' '}
                      <a 
                        href="https://www.flyingblue.com/en/account/activity" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        flyingblue.com/account/activity
                        <ExternalLink size={12} />
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span>Click <strong>"More"</strong> until all activities are loaded</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span>Click <strong>"Download"</strong> to save the PDF</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                    <span>Open the PDF, select all (<kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">Ctrl+A</kbd>), copy (<kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">Ctrl+C</kbd>)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">5</span>
                    <span>Paste it below</span>
                  </li>
                </ol>
              </div>

              {/* Language recommendation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">
                      Best results with Dutch, English, or French
                    </p>
                    <p className="text-blue-600 text-xs leading-relaxed">
                      For the most reliable import, we recommend downloading your statement in one of these languages. 
                      You can temporarily change your language on{' '}
                      <a 
                        href="https://www.flyingblue.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-800"
                      >
                        flyingblue.com
                      </a>
                      {' '}via the language selector in the top right corner.
                    </p>
                  </div>
                </div>
              </div>

              {/* Text area */}
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your Flying Blue PDF content here..."
                  className={`w-full ${compact ? 'h-40' : 'h-56'} p-4 border-2 rounded-xl resize-none font-mono text-sm transition-colors focus:outline-none focus:ring-0 relative z-10 ${
                    text && !isValidContent
                      ? 'border-amber-300 bg-amber-50'
                      : isValidContent
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 focus:border-blue-400 bg-white'
                  }`}
                />
                
                {/* Paste hint overlay - only show when empty and not focused */}
                {!text && (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-0"
                  >
                    <Clipboard size={32} className="text-slate-300" />
                    <span className="text-sm text-slate-400">Paste your PDF content here</span>
                    <span className="text-xs text-slate-300">Ctrl+V / Cmd+V</span>
                  </div>
                )}
              </div>

              {/* Validation feedback */}
              {text && !isValidContent && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle size={16} />
                  <span>This doesn't look like Flying Blue data. Make sure to copy the entire PDF content.</span>
                </div>
              )}

              {/* Error message */}
              {parseState === 'error' && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle size={18} />
                    <span className="font-medium">Parse Error</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{error.message}</p>
                </div>
              )}
            </div>
          ) : parseState === 'parsing' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Analyzing your data...</p>
              <p className="text-sm text-slate-400 mt-1">This only takes a few seconds</p>
            </div>
          ) : parseState === 'success' && result ? (
            <div className="space-y-4">
              {/* Success header - different message based on new vs all duplicates */}
              {newTransactions.length === 0 && duplicateCount > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <Info size={24} className="text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-800">All transactions already exist</p>
                    <p className="text-sm text-blue-600">
                      {duplicateCount} transaction{duplicateCount !== 1 ? 's' : ''} found, but {duplicateCount === 1 ? 'it' : 'they'} already {duplicateCount === 1 ? 'exists' : 'exist'} in your account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-800">Data extracted successfully!</p>
                    <p className="text-sm text-emerald-600">
                      {isFreshAccount 
                        ? 'Your Flying Blue information is ready to import.'
                        : `${newTransactions.length} new transaction${newTransactions.length !== 1 ? 's' : ''} found${duplicateCount > 0 ? `, ${duplicateCount} already exist${duplicateCount === 1 ? 's' : ''}` : ''}.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <Plane size={20} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{result.flights.length}</p>
                  <p className="text-xs text-blue-600">Flights</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <Coins size={20} className="text-emerald-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{result.pdfHeader.miles.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600">Miles</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <Zap size={20} className="text-violet-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-violet-700">{result.pdfHeader.xp}</p>
                  <p className="text-xs text-violet-600">XP</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="w-5 h-5 bg-amber-500 rounded-full mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-700">{result.pdfHeader.status}</p>
                  <p className="text-xs text-amber-600">Status</p>
                </div>
              </div>

              {/* Duplicate info for existing accounts */}
              {!isFreshAccount && duplicateCount > 0 && newTransactions.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Info size={16} className="text-slate-400" />
                    <span>
                      <strong>{newTransactions.length}</strong> new transaction{newTransactions.length !== 1 ? 's' : ''} will be added 
                      ({newMilesTotal >= 0 ? '+' : ''}{newMilesTotal.toLocaleString()} Miles).
                      {' '}<strong>{duplicateCount}</strong> existing transaction{duplicateCount !== 1 ? 's' : ''} will be skipped.
                    </span>
                  </div>
                </div>
              )}

              {/* Historical balance detection - ONLY for fresh accounts */}
              {isFreshAccount && result.milesReconciliation?.needsCorrection && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800 mb-2">Historical Balance Detected</h4>
                      <div className="text-sm text-amber-700 space-y-1 mb-3">
                        <p>Statement balance: <strong>{result.milesReconciliation.headerBalance.toLocaleString()}</strong> Miles</p>
                        <p>Transactions found: <strong>{result.milesReconciliation.parsedTotal.toLocaleString()}</strong> Miles</p>
                        <p className="pt-2 border-t border-amber-200">
                          Historical balance: <strong className="text-amber-900">+{result.milesReconciliation.difference.toLocaleString()}</strong> Miles
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeHistoricalBalance}
                          onChange={(e) => setIncludeHistoricalBalance(e.target.checked)}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium text-amber-800">
                          Include historical balance
                        </span>
                        <span className="text-xs text-amber-600">(Recommended)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-sm text-slate-600"
              >
                <span>Show details</span>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showDetails && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Activity Transactions</span>
                    <span className="font-medium">{result.activityTransactions.length}</span>
                  </div>
                  {result.qualificationSettings && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Qualification Cycle Start</span>
                        <span className="font-medium">{result.qualificationSettings.cycleStartMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Starting Status</span>
                        <span className="font-medium">{result.qualificationSettings.startingStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rollover XP</span>
                        <span className="font-medium">{result.qualificationSettings.startingXP}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Export Date</span>
                    <span className="font-medium">{result.pdfHeader.exportDate}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          {parseState === 'idle' || parseState === 'error' ? (
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!isValidContent}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                  isValidContent
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Analyze Data
              </button>
            </div>
          ) : parseState === 'success' ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setText('');
                  setParseState('idle');
                  setResult(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Try Different Data
              </button>
              {newTransactions.length === 0 && duplicateCount > 0 ? (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-medium bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {isFreshAccount ? 'Import to Dashboard' : `Import ${newTransactions.length} New`}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PdfImportModal;
