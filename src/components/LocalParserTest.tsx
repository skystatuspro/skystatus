// src/components/LocalParserTest.tsx
// Test page for Local Text Parser - accessible at /local-parser
// 100% client-side parsing, no data sent to servers

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plane,
  Coins,
  Zap,
  Award,
  Clock,
  Shield,
  ArrowRight,
  Clipboard,
  Sparkles,
} from 'lucide-react';
import { localParseText, isLikelyFlyingBlueContent, type AIParsedResult, type AIParserError } from '../modules/local-text-parser';
import { useUserData } from '../hooks/useUserData';
import { useAuth } from '../lib/AuthContext';

type ParseState = 'idle' | 'parsing' | 'success' | 'error';

interface ParseStats {
  parseTimeMs: number;
  textLength: number;
  language: string;
}

export const LocalParserTest: React.FC = () => {
  const { user } = useAuth();
  const { actions } = useUserData();
  
  // State
  const [text, setText] = useState('');
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [error, setError] = useState<AIParserError | null>(null);
  const [result, setResult] = useState<AIParsedResult | null>(null);
  const [stats, setStats] = useState<ParseStats | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [showMiles, setShowMiles] = useState(false);
  const [showBonusXp, setShowBonusXp] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [includeHistoricalBalance, setIncludeHistoricalBalance] = useState(true);

  // Check if text looks valid
  const isValidContent = text.length > 100 && isLikelyFlyingBlueContent(text);

  // Handle parse
  const handleParse = useCallback(async () => {
    if (!isValidContent) return;

    setParseState('parsing');
    setError(null);
    setResult(null);
    setImportComplete(false);

    try {
      const parseResult = await localParseText(text, { debug: true });

      if (parseResult.success) {
        setResult(parseResult.data);
        setStats({
          parseTimeMs: parseResult.data.metadata.parseTimeMs,
          textLength: text.length,
          language: parseResult.data.metadata.language,
        });
        setParseState('success');
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
  }, [text, isValidContent]);

  // Handle import to dashboard
  const handleImportToDashboard = useCallback(() => {
    if (!result) return;
    
    // Prepare activity transactions, optionally including historical balance
    let transactions = [...result.activityTransactions];
    
    if (includeHistoricalBalance && result.milesReconciliation?.needsCorrection) {
      const correction = result.milesReconciliation.suggestedCorrection;
      if (correction) {
        // Add historical balance correction transaction
        const correctionTransaction = {
          id: `starting-balance-${correction.date}`,
          date: correction.date,
          type: 'starting_balance' as const,
          description: correction.description,
          miles: correction.miles,
          xp: 0,
          source: 'pdf' as const,
          sourceDate: result.pdfHeader.exportDate,
        };
        transactions = [correctionTransaction, ...transactions];
      }
    }
    
    actions.handlePdfImport(
      result.flights,
      transactions,
      undefined,
      result.qualificationSettings ? {
        cycleStartMonth: result.qualificationSettings.cycleStartMonth,
        cycleStartDate: result.qualificationSettings.cycleStartDate,
        startingStatus: result.qualificationSettings.startingStatus,
        startingXP: result.qualificationSettings.startingXP,
      } : undefined,
    );
    setImportComplete(true);
  }, [result, actions, includeHistoricalBalance]);

  // Reset handler
  const handleReset = () => {
    setParseState('idle');
    setError(null);
    setResult(null);
    setStats(null);
    setText('');
    setImportComplete(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Local Parser</h1>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              100% Private
            </span>
          </div>
          <p className="text-slate-600">
            Parse your Flying Blue PDF locally. Your data never leaves your device.
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-emerald-800 font-medium">Privacy Guaranteed</p>
              <p className="text-sm text-emerald-700 mt-1">
                All parsing happens in your browser. No data is sent to any server.
                Your Flying Blue information stays completely private.
              </p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        {parseState === 'idle' && (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clipboard size={20} className="text-slate-600" />
                <h3 className="font-bold text-slate-900">How to copy your data</h3>
              </div>
              <ol className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open your Flying Blue PDF in any viewer (browser, Preview, Adobe)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">Ctrl+A</kbd> (or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">⌘+A</kbd>) to select all
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">Ctrl+C</kbd> (or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">⌘+C</kbd>) to copy
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Paste below and click "Parse Data"</span>
                </li>
              </ol>
              
              {/* Language recommendation */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Sparkles size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">Best results with Dutch, English, or French.</span>
                    {' '}You can change your language on{' '}
                    <a 
                      href="https://www.flyingblue.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-800"
                    >
                      flyingblue.com
                    </a>
                    {' '}(top right corner) before downloading your statement.
                  </div>
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your Flying Blue activity text here..."
                className="w-full h-64 p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl resize-none font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-colors"
              />
              {text.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-slate-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p>Paste your PDF content here</p>
                    <p className="text-xs mt-1">Ctrl+V or ⌘+V</p>
                  </div>
                </div>
              )}
            </div>

            {/* Validation indicator */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">
                {text.length.toLocaleString()} characters
              </span>
              {text.length > 0 && (
                <span className={isValidContent ? 'text-emerald-600 flex items-center gap-1' : 'text-amber-600 flex items-center gap-1'}>
                  {isValidContent ? (
                    <>
                      <CheckCircle2 size={16} />
                      Flying Blue data detected
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      Doesn't look like Flying Blue data
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Parse button */}
            <button
              onClick={handleParse}
              disabled={!isValidContent}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              Parse Data
            </button>
          </div>
        )}

        {/* Parsing State */}
        {parseState === 'parsing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Loader2 size={48} className="mx-auto mb-4 text-emerald-500 animate-spin" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Parsing your data locally...
            </p>
            <p className="text-sm text-slate-500">
              This only takes a moment
            </p>
          </div>
        )}

        {/* Error State */}
        {parseState === 'error' && error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Parse Failed</h3>
                <p className="text-red-600 mb-4">{error.message}</p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {parseState === 'success' && result && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Parse Complete!</h3>
                  <p className="text-emerald-100">
                    All data extracted locally — nothing sent to any server
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Clock size={16} />
                    <span className="text-xs">Parse Time</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.parseTimeMs}ms
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <FileText size={16} />
                    <span className="text-xs">Text Size</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {(stats.textLength / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Shield size={16} />
                    <span className="text-xs">Privacy</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    100%
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Award size={16} />
                    <span className="text-xs">Status</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {result.pdfHeader.status}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">PDF Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total XP</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {result.pdfHeader.xp.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total UXP</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {result.pdfHeader.uxp.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Miles</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {result.pdfHeader.miles.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Export Date</p>
                  <p className="text-lg font-medium text-slate-700">
                    {result.pdfHeader.exportDate}
                  </p>
                </div>
              </div>
              
              {result.qualificationSettings && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="font-medium text-slate-700 mb-3">Qualification Cycle Detected</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Cycle Start:</span>{' '}
                      <span className="font-medium">{result.qualificationSettings.cycleStartMonth}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Starting Status:</span>{' '}
                      <span className="font-medium">{result.qualificationSettings.startingStatus}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Rollover XP:</span>{' '}
                      <span className="font-medium">{result.qualificationSettings.startingXP}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Historical Balance Detection */}
              {result.milesReconciliation?.needsCorrection && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-amber-800 mb-2">Historical Balance Detected</h4>
                        <div className="text-sm text-amber-700 space-y-1 mb-4">
                          <p>Your statement shows <strong>{result.milesReconciliation.headerBalance.toLocaleString()}</strong> Miles</p>
                          <p>Transactions found: <strong>{result.milesReconciliation.parsedTotal.toLocaleString()}</strong> Miles</p>
                          <p className="pt-2 border-t border-amber-200 mt-2">
                            Historical balance: <strong className="text-amber-900">+{result.milesReconciliation.difference.toLocaleString()}</strong> Miles
                          </p>
                          <p className="text-xs text-amber-600 mt-2">
                            This likely represents miles earned before {result.milesReconciliation.oldestMonth} (oldest transaction in statement).
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
                            Add historical balance correction
                          </span>
                          <span className="text-xs text-amber-600">(Recommended)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Flights Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setShowFlights(!showFlights)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <Plane size={20} className="text-blue-500" />
                  <span className="font-medium text-slate-900">Flights</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {result.flights.length}
                  </span>
                </div>
                {showFlights ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {showFlights && (
                <div className="px-6 pb-4 max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500 border-b">
                      <tr>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Route</th>
                        <th className="pb-2">Flight</th>
                        <th className="pb-2 text-right">Miles</th>
                        <th className="pb-2 text-right">XP</th>
                        <th className="pb-2 text-right">UXP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.flights.map((f, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2">{f.date}</td>
                          <td className="py-2 font-mono">{f.route}</td>
                          <td className="py-2">{f.flightNumber}</td>
                          <td className="py-2 text-right">{f.earnedMiles?.toLocaleString()}</td>
                          <td className="py-2 text-right">{f.earnedXP}</td>
                          <td className="py-2 text-right">{f.uxp || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Activity Transactions Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setShowActivities(!showActivities)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <Zap size={20} className="text-purple-500" />
                  <span className="font-medium text-slate-900">Activity Transactions</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                    {result.activityTransactions.length}
                  </span>
                </div>
                {showActivities ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {showActivities && (
                <div className="px-6 pb-4 max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500 border-b">
                      <tr>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Miles</th>
                        <th className="pb-2 text-right">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.activityTransactions.slice(0, 50).map((t, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2">{t.date}</td>
                          <td className="py-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                              {t.type}
                            </span>
                          </td>
                          <td className="py-2 truncate max-w-xs" title={t.description}>
                            {t.description.slice(0, 40)}{t.description.length > 40 ? '...' : ''}
                          </td>
                          <td className={`py-2 text-right ${t.miles < 0 ? 'text-red-600' : ''}`}>
                            {t.miles.toLocaleString()}
                          </td>
                          <td className="py-2 text-right">{t.xp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.activityTransactions.length > 50 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Showing first 50 of {result.activityTransactions.length} transactions
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Miles Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setShowMiles(!showMiles)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <Coins size={20} className="text-emerald-500" />
                  <span className="font-medium text-slate-900">Miles by Month</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                    {result.milesRecords.length}
                  </span>
                </div>
                {showMiles ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {showMiles && (
                <div className="px-6 pb-4 max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500 border-b">
                      <tr>
                        <th className="pb-2">Month</th>
                        <th className="pb-2 text-right">Subscription</th>
                        <th className="pb-2 text-right">AMEX</th>
                        <th className="pb-2 text-right">Flight</th>
                        <th className="pb-2 text-right">Other</th>
                        <th className="pb-2 text-right">Debit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.milesRecords.map((m, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 font-medium">{m.month}</td>
                          <td className="py-2 text-right">{m.miles_subscription.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.miles_amex.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.miles_flight.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.miles_other.toLocaleString()}</td>
                          <td className="py-2 text-right text-red-600">-{m.miles_debit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bonus XP Section */}
            {Object.keys(result.bonusXpByMonth).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <button
                  onClick={() => setShowBonusXp(!showBonusXp)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-violet-500" />
                    <span className="font-medium text-slate-900">Bonus XP</span>
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">
                      {Object.values(result.bonusXpByMonth).reduce((a, b) => a + b, 0)} XP
                    </span>
                  </div>
                  {showBonusXp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {showBonusXp && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-slate-500 mb-3">
                      XP from non-flight activities (AMEX bonus, donations, adjustments, etc.)
                    </p>
                    <div className="space-y-2">
                      {Object.entries(result.bonusXpByMonth)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([month, xp]) => (
                          <div key={month} className="flex justify-between py-2 border-b border-slate-100">
                            <span className="font-medium">{month}</span>
                            <span className="text-violet-600">+{xp} XP</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-slate-500" />
                  <span className="font-medium text-slate-900">Raw Parser Response</span>
                </div>
                {showRawJson ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {showRawJson && (
                <div className="px-6 pb-4">
                  <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-auto max-h-96">
                    {JSON.stringify(result.rawResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Parse Another
              </button>
              {user && !importComplete && (
                <button
                  onClick={handleImportToDashboard}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Import to Dashboard
                  <ArrowRight size={18} />
                </button>
              )}
              {importComplete && (
                <div className="flex-1 px-6 py-3 bg-emerald-100 text-emerald-700 font-medium rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />
                  Imported Successfully!
                </div>
              )}
              {!user && (
                <div className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-medium rounded-xl text-center">
                  Log in to import to dashboard
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalParserTest;
