// src/components/AIParserTest.tsx
// Test page for AI PDF Parser - accessible at /ai-parser
// Production-ready component for testing and using the AI parser

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
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
  X,
  ArrowRight,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { aiParseFlyingBlue, type AIParsedResult, type AIParserError } from '../modules/ai-pdf-parser';
import { useUserData } from '../hooks/useUserData';
import { useAuth } from '../lib/AuthContext';

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type ParseState = 'idle' | 'extracting' | 'parsing' | 'success' | 'error';

interface ParseStats {
  extractTimeMs: number;
  parseTimeMs: number;
  textLength: number;
  tokensUsed: number;
}

export const AIParserTest: React.FC = () => {
  const { user } = useAuth();
  const { actions } = useUserData();
  
  // State
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [error, setError] = useState<AIParserError | null>(null);
  const [result, setResult] = useState<AIParsedResult | null>(null);
  const [stats, setStats] = useState<ParseStats | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [showMiles, setShowMiles] = useState(false);
  const [showBonusXp, setShowBonusXp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract text from PDF
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let rawText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{ str: string }>;
      for (const item of items) {
        rawText += item.str + ' ';
      }
      rawText += '\n';
    }
    
    return rawText;
  };

  // Handle file selection
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError({ code: 'VALIDATION_ERROR', message: 'Please select a PDF file' });
      setParseState('error');
      return;
    }

    setParseState('extracting');
    setError(null);
    setResult(null);
    setImportComplete(false);

    try {
      // Step 1: Extract text from PDF
      const extractStart = performance.now();
      const text = await extractTextFromPdf(file);
      const extractTimeMs = Math.round(performance.now() - extractStart);

      // Step 2: Parse with AI (API key is handled server-side)
      setParseState('parsing');
      const parseResult = await aiParseFlyingBlue(text, {
        debug: true,
      });

      if (parseResult.success) {
        setResult(parseResult.data);
        setStats({
          extractTimeMs,
          parseTimeMs: parseResult.data.metadata.parseTimeMs,
          textLength: text.length,
          tokensUsed: parseResult.data.metadata.tokensUsed,
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
  }, []);

  // Handle import to dashboard
  const handleImportToDashboard = useCallback(() => {
    if (!result) return;
    
    // Use clean handlePdfImport - data flows through XP/Miles Engines
    actions.handlePdfImport(
      result.flights,
      result.milesRecords,
      undefined, // xpCorrection not needed with AI parser
      result.qualificationSettings ? {
        cycleStartMonth: result.qualificationSettings.cycleStartMonth,
        cycleStartDate: result.qualificationSettings.cycleStartDate,
        startingStatus: result.qualificationSettings.startingStatus,
      } : undefined,
      result.bonusXpByMonth
    );
    setImportComplete(true);
  }, [result, actions]);

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Reset handler
  const handleReset = () => {
    setParseState('idle');
    setError(null);
    setResult(null);
    setStats(null);
    setImportComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <Zap size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AI PDF Parser</h1>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
              Beta
            </span>
          </div>
          <p className="text-slate-600">
            Parse your Flying Blue PDF with AI for 100% accurate data extraction.
            No corrections needed.
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Privacy Notice</p>
              <p className="text-sm text-amber-700 mt-1">
                Your PDF text will be sent to our secure server for AI processing. 
                The PDF file itself is never stored.{' '}
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="text-amber-800 underline hover:no-underline"
                >
                  Learn more
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {parseState === 'idle' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-violet-500 bg-violet-50' 
                : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload size={48} className={`mx-auto mb-4 ${isDragging ? 'text-violet-500' : 'text-slate-400'}`} />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Drop your Flying Blue PDF here
            </p>
            <p className="text-sm text-slate-500">
              or click to browse
            </p>
          </div>
        )}

        {/* Parsing State */}
        {(parseState === 'extracting' || parseState === 'parsing') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Loader2 size={48} className="mx-auto mb-4 text-violet-500 animate-spin" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              {parseState === 'extracting' ? 'Extracting PDF text...' : 'AI is analyzing your data...'}
            </p>
            <p className="text-sm text-slate-500">
              {parseState === 'parsing' && 'This may take 10-30 seconds'}
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
                {error.code === 'RATE_LIMIT' && (
                  <p className="text-sm text-slate-600 mb-4">
                    OpenAI rate limits have been exceeded. Please wait a moment and try again.
                  </p>
                )}
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
                    AI extracted all data with 100% confidence
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
                    <span className="text-xs">Total Time</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {((stats.extractTimeMs + stats.parseTimeMs) / 1000).toFixed(1)}s
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
                    <Zap size={16} />
                    <span className="text-xs">AI Tokens</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.tokensUsed.toLocaleString()}
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
                  <span className="font-medium text-slate-900">Raw AI Response</span>
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
                Parse Another PDF
              </button>
              {user && !importComplete && (
                <button
                  onClick={handleImportToDashboard}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
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

        {/* Privacy Modal */}
        {showPrivacy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="font-bold text-slate-900">AI Parser Privacy</h3>
                <button onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-sm text-slate-600">
                <p>
                  <strong>What happens when you use the AI Parser:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Your PDF is processed locally in your browser to extract text</li>
                  <li>The extracted text (not the PDF file) is sent to OpenAI's API</li>
                  <li>OpenAI processes the text and returns structured data</li>
                  <li>The structured data is stored in your SkyStatus account</li>
                </ul>
                <p>
                  <strong>Data sent to OpenAI may include:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Your Flying Blue member name and number</li>
                  <li>Flight history (dates, routes, airlines)</li>
                  <li>Miles transaction history</li>
                  <li>Status and XP information</li>
                </ul>
                <p>
                  OpenAI's data handling is governed by their{' '}
                  <a 
                    href="https://openai.com/policies/privacy-policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-violet-600 underline"
                  >
                    privacy policy
                  </a>.
                </p>
                <p className="font-medium text-slate-700">
                  If you prefer complete privacy, use the standard Local Parser instead.
                </p>
              </div>
              <div className="px-6 py-4 border-t">
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="w-full py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIParserTest;
