import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './lib/AuthContext';
import { 
  fetchAllUserData, 
  saveFlights, 
  saveMilesRecords, 
  saveRedemptions, 
  saveXPLedger,
  updateProfile,
  XPLedgerEntry 
} from './lib/dataService';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MilesEngine } from './components/MilesEngine';
import { XPEngine } from './components/XPEngine';
import { RedemptionCalc } from './components/RedemptionCalc';
import { Analytics } from './components/Analytics';
import { FlightLedger } from './components/FlightLedger';
import { FlightIntake } from './components/FlightIntake';
import { MilesIntake } from './components/MilesIntake';
import { MileageRun } from './components/MileageRun';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { LoginPage } from './components/LoginPage';
import PdfImportModal from './components/PdfImportModal';
import { PrivacyPolicy, TermsOfService } from './components/LegalPages';
import { LandingPage } from './components/LandingPage';
import { useToast } from './components/Toast';
import { Loader2, FileText, Upload } from 'lucide-react';

import {
  ViewState,
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  FlightRecord,
  ManualLedger,
} from './types';

import {
  INITIAL_MILES_DATA,
  INITIAL_XP_DATA,
  INITIAL_REDEMPTIONS,
  INITIAL_FLIGHTS,
  INITIAL_MANUAL_LEDGER,
} from './constants';

import {
  rebuildLedgersFromFlights,
  FlightIntakePayload,
  createFlightRecord,
} from './utils/flight-intake';

import { calculateMultiYearStats } from './utils/xp-logic';

// Debounce helper for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  // UI State
  const [view, setView] = useState<ViewState>('dashboard');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [showPdfInstructions, setShowPdfInstructions] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle hash-based routing for legal pages
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/privacy') {
        setLegalPage('privacy');
      } else if (hash === '#/terms') {
        setLegalPage('terms');
      } else {
        setLegalPage(null);
      }
    };
    
    // Check on mount
    handleHashChange();
    
    // Listen for changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Track if initial data load has completed (prevents reload on window focus)
  const hasInitiallyLoaded = useRef(false);
  // Track the user ID we loaded data for (to reload if user changes)
  const loadedForUserId = useRef<string | null>(null);

  // Data State
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [baseMilesData, setBaseMilesData] = useState<MilesRecord[]>([]);
  const [baseXpData, setBaseXpData] = useState<XPRecord[]>([]);
  const [manualLedger, setManualLedger] = useState<ManualLedger>({});
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [xpRollover, setXpRollover] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState<string>(defaultMonth);
  const [targetCPM, setTargetCPM] = useState<number>(0.012);

  // Track if data has been modified (for auto-save)
  const [dataVersion, setDataVersion] = useState(0);
  const debouncedDataVersion = useDebounce(dataVersion, 2000); // Auto-save after 2 seconds of inactivity

  // Load user data when authenticated (only once per user session)
  useEffect(() => {
    // Only load if:
    // 1. We have a user
    // 2. Not in demo mode
    // 3. Either haven't loaded yet, or user changed
    const shouldLoad = user && !isDemoMode && 
      (!hasInitiallyLoaded.current || loadedForUserId.current !== user.id);
    
    if (shouldLoad) {
      loadUserData();
    }
  }, [user, isDemoMode]);

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (user && !isDemoMode && debouncedDataVersion > 0) {
      saveUserData();
    }
  }, [debouncedDataVersion]);

  const loadUserData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      const data = await fetchAllUserData(user.id);
      
      if (data.flights.length === 0 && data.milesData.length === 0 && data.redemptions.length === 0) {
        // New user - show welcome
        setShowWelcome(true);
      } else {
        setFlights(data.flights);
        setBaseMilesData(data.milesData);
        setRedemptions(data.redemptions);
        
        // Load XP Ledger - convert from DB format to app format
        const loadedLedger: ManualLedger = {};
        Object.entries(data.xpLedger).forEach(([month, entry]) => {
          loadedLedger[month] = {
            amexXp: entry.amexXp,
            bonusSafXp: entry.bonusSafXp,
            miscXp: entry.miscXp,
            correctionXp: entry.correctionXp,
          };
        });
        setManualLedger(loadedLedger);
        
        if (data.profile) {
          setTargetCPM(data.profile.targetCPM);
          setXpRollover(data.profile.xpRollover || 0);
        }
      }
      
      // Mark as loaded to prevent reload on window focus
      hasInitiallyLoaded.current = true;
      loadedForUserId.current = user.id;
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const saveUserData = async () => {
    if (!user || isDemoMode) return;
    
    setIsSaving(true);
    try {
      // Convert manualLedger to XPLedgerEntry format for database
      const xpLedgerToSave: Record<string, XPLedgerEntry> = {};
      Object.entries(manualLedger).forEach(([month, entry]) => {
        xpLedgerToSave[month] = {
          month,
          amexXp: entry.amexXp || 0,
          bonusSafXp: entry.bonusSafXp || 0,
          miscXp: entry.miscXp || 0,
          correctionXp: entry.correctionXp || 0,
        };
      });

      await Promise.all([
        saveFlights(user.id, flights),
        saveMilesRecords(user.id, baseMilesData),
        saveRedemptions(user.id, redemptions),
        saveXPLedger(user.id, xpLedgerToSave),
        updateProfile(user.id, { 
          target_cpm: targetCPM,
          xp_rollover: xpRollover,
        }),
      ]);
    } catch (error) {
      console.error('Error saving user data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark data as changed
  const markDataChanged = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  // Computed data
  const { miles: milesData, xp: xpData } = useMemo(
    () => rebuildLedgersFromFlights(baseMilesData, baseXpData, flights),
    [baseMilesData, baseXpData, flights]
  );

  // Event handlers with auto-save trigger
  const handleFlightsUpdate = (nextFlights: FlightRecord[]) => {
    setFlights(nextFlights);
    markDataChanged();
  };

  const handleFlightIntakeApply = (payloads: FlightIntakePayload[]) => {
    const newRecords = payloads.map(createFlightRecord);
    setFlights(prevFlights => [...prevFlights, ...newRecords]);
    markDataChanged();
  };

  const handleManualLedgerUpdate = (newData: MilesRecord[]) => {
    const sanitizedData = newData.map(record => ({
      ...record,
      miles_flight: 0,
      cost_flight: 0,
    }));
    setBaseMilesData(sanitizedData);
    markDataChanged();
  };

  const handleRedemptionsUpdate = (newRedemptions: RedemptionRecord[]) => {
    setRedemptions(newRedemptions);
    markDataChanged();
  };

  const handleTargetCPMUpdate = (newTargetCPM: number) => {
    setTargetCPM(newTargetCPM);
    markDataChanged();
  };

  // XP Ledger handlers with auto-save
  const handleManualXPLedgerUpdate = (newLedger: ManualLedger | ((prev: ManualLedger) => ManualLedger)) => {
    if (typeof newLedger === 'function') {
      setManualLedger(prev => {
        const updated = newLedger(prev);
        return updated;
      });
    } else {
      setManualLedger(newLedger);
    }
    markDataChanged();
  };

  const handleXPRolloverUpdate = (newRollover: number) => {
    setXpRollover(newRollover);
    markDataChanged();
  };

  // PDF import handler for Dashboard empty state
  const handlePdfImport = (importedFlights: FlightRecord[], importedMiles: MilesRecord[]) => {
    // Merge flights (skip duplicates by date + route)
    const existingFlightKeys = new Set(flights.map(f => `${f.date}-${f.route}`));
    const newFlights = importedFlights.filter(f => !existingFlightKeys.has(`${f.date}-${f.route}`));
    if (newFlights.length > 0) {
      setFlights(prev => [...prev, ...newFlights]);
    }

    // Merge miles (update existing months, add new)
    const existingMonths = new Set(baseMilesData.map(m => m.month));
    const updatedMiles = [...baseMilesData];
    
    for (const incoming of importedMiles) {
      const existingIndex = updatedMiles.findIndex(m => m.month === incoming.month);
      if (existingIndex >= 0) {
        // Update existing month
        updatedMiles[existingIndex] = incoming;
      } else {
        // Add new month
        updatedMiles.push(incoming);
      }
    }
    
    setBaseMilesData(updatedMiles);
    markDataChanged();

    // Show success message
    const flightCount = newFlights.length;
    const milesCount = importedMiles.length;
    showToast(`Imported ${flightCount} flights and ${milesCount} months of miles data`, 'success');
  };

  // Demo mode handlers
  const handleLoadDemo = () => {
    setBaseMilesData(INITIAL_MILES_DATA);
    setBaseXpData(INITIAL_XP_DATA);
    setRedemptions(INITIAL_REDEMPTIONS);
    setFlights(INITIAL_FLIGHTS);
    setXpRollover(103);
    setManualLedger(INITIAL_MANUAL_LEDGER);
    setIsDemoMode(true);
    setShowWelcome(false);
  };

  const handleStartEmpty = () => {
    setBaseMilesData([]);
    setBaseXpData([]);
    setRedemptions([]);
    setFlights([]);
    setXpRollover(0);
    setManualLedger({});
    setShowWelcome(false);
    markDataChanged();
  };

  const handleStartOver = () => {
    if (!window.confirm('Are you sure you want to start over? This wipes all data.')) {
      return;
    }

    setBaseMilesData([]);
    setBaseXpData([]);
    setRedemptions([]);
    setFlights([]);
    setXpRollover(0);
    setManualLedger({});
    setIsDemoMode(false);
    setIsLocalMode(false);
    setIsSettingsOpen(false);
    
    // Reset load tracking so data can be reloaded if needed
    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;
    
    if (user) {
      // Clear data in database
      markDataChanged();
    }
    
    setShowWelcome(true);
  };

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    handleLoadDemo();
  };

  const handleEnterLocalMode = () => {
    setIsLocalMode(true);
    // Start with empty data, no account
    setBaseMilesData([]);
    setBaseXpData([]);
    setRedemptions([]);
    setFlights([]);
    setXpRollover(0);
    setManualLedger({});
  };

  const handleExitDemoMode = () => {
    setIsDemoMode(false);
    setIsLocalMode(false);
    // Reset load tracking to allow fresh load
    hasInitiallyLoaded.current = false;
    loadedForUserId.current = null;
    
    if (user) {
      loadUserData();
    } else {
      setBaseMilesData([]);
      setBaseXpData([]);
      setRedemptions([]);
      setFlights([]);
      setXpRollover(0);
      setManualLedger({});
    }
  };

  // Calculate current status
  const calculateGlobalCPM = () => {
    const earned = milesData.reduce(
      (acc, r) => acc + r.miles_subscription + r.miles_amex + r.miles_flight + r.miles_other,
      0
    );
    const cost = milesData.reduce(
      (acc, r) => acc + r.cost_subscription + r.cost_amex + r.cost_flight + r.cost_other,
      0
    );
    return earned > 0 ? (cost / earned) * 100 : 0;
  };

  const currentStatus = useMemo(() => {
    const stats = calculateMultiYearStats(xpData, xpRollover, flights, manualLedger);
    const now = new Date();
    const currentQYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    const cycle = stats[currentQYear];
    const status = cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer';
    return status as 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
  }, [xpData, xpRollover, flights, manualLedger]);

  // Legal pages (accessible without login)
  if (legalPage === 'privacy') {
    return (
      <PrivacyPolicy
        onBack={() => {
          window.location.hash = '';
          setLegalPage(null);
        }}
      />
    );
  }
  
  if (legalPage === 'terms') {
    return (
      <TermsOfService
        onBack={() => {
          window.location.hash = '';
          setLegalPage(null);
        }}
      />
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated and not in demo/local mode - show landing or login
  if (!user && !isDemoMode && !isLocalMode) {
    if (showLoginPage) {
      return (
        <LoginPage 
          onDemoMode={handleEnterDemoMode} 
          onLocalMode={handleEnterLocalMode}
          onBack={() => setShowLoginPage(false)}
        />
      );
    }
    return (
      <LandingPage 
        onGetStarted={() => setShowLoginPage(true)}
        onDemo={handleEnterDemoMode}
      />
    );
  }

  // Loading user data
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            state={{
              milesData,
              xpData,
              redemptions,
              xpRollover,
              currentMonth,
              flights,
              targetCPM,
              manualLedger,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={setCurrentMonth}
            onPdfImport={handlePdfImport}
          />
        );
      case 'addFlight':
        return (
          <div className="space-y-6">
            {/* PDF Import suggestion banner */}
            <div className="bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-brand-100 rounded-xl">
                    <FileText className="text-brand-600" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Have your Flying Blue PDF?</p>
                    <p className="text-sm text-slate-500">
                      Import all your flights at once instead of adding them manually
                      <button
                        onClick={() => setShowPdfInstructions(prev => !prev)}
                        className="ml-2 text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                      >
                        {showPdfInstructions ? 'Hide instructions' : 'How to get it?'}
                      </button>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPdfImportModal(true)}
                  className="flex-shrink-0 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Import PDF</span>
                  <span className="sm:hidden">Import</span>
                </button>
              </div>
              
              {/* Expandable instructions */}
              {showPdfInstructions && (
                <div className="mt-4 pt-4 border-t border-brand-200">
                  <ol className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span>Log in to <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold hover:underline">flyingblue.com</a></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span>Go to <strong>My Account</strong> → <strong>Activity</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span>Click <strong>"Download transaction history"</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      <span>Select <strong>"All time"</strong> and download as PDF</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
            
            <FlightIntake
              onApply={handleFlightIntakeApply}
              currentStatus={currentStatus}
            />
            <FlightLedger
              flights={flights}
              onChange={handleFlightsUpdate}
              xpData={xpData}
              currentRollover={xpRollover}
            />
          </div>
        );
      case 'addMiles':
        return (
          <MilesIntake
            milesData={milesData}
            onUpdate={handleManualLedgerUpdate}
            currentMonth={currentMonth}
          />
        );
      case 'miles':
        return (
          <MilesEngine
            data={milesData}
            onUpdate={handleManualLedgerUpdate}
            currentMonth={currentMonth}
            onUpdateCurrentMonth={setCurrentMonth}
            targetCPM={targetCPM}
            onUpdateTargetCPM={handleTargetCPMUpdate}
            redemptions={redemptions}
          />
        );
      case 'xp':
        return (
          <XPEngine
            data={xpData}
            baseData={baseXpData}
            onUpdate={setBaseXpData}
            rollover={xpRollover}
            onUpdateRollover={handleXPRolloverUpdate}
            flights={flights}
            onUpdateFlights={handleFlightsUpdate}
            manualLedger={manualLedger}
            onUpdateManualLedger={handleManualXPLedgerUpdate}
          />
        );
      case 'redemption':
        return (
          <RedemptionCalc
            redemptions={redemptions}
            onUpdate={handleRedemptionsUpdate}
            baselineCpm={calculateGlobalCPM()}
            targetCpm={targetCPM}
          />
        );
      case 'analytics':
        return (
          <Analytics
            xpData={xpData}
            rollover={xpRollover}
            redemptions={redemptions}
            milesData={milesData}
            currentMonth={currentMonth}
            targetCPM={targetCPM}
          />
        );
      case 'mileageRun':
        return <MileageRun xpData={xpData} rollover={xpRollover} />;
      default:
        return (
          <Dashboard
            state={{
              milesData,
              xpData,
              redemptions,
              xpRollover,
              currentMonth,
              flights,
              targetCPM,
              manualLedger,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={setCurrentMonth}
            onPdfImport={handlePdfImport}
          />
        );
    }
  };

  return (
    <>
      <Layout
        currentView={view}
        onNavigate={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDemoMode={isDemoMode || isLocalMode}
        isLocalMode={isLocalMode}
      >
        {/* Saving indicator */}
        {isSaving && (
          <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        )}
        
        {renderContent()}
      </Layout>

      <WelcomeModal
        isOpen={showWelcome}
        onLoadDemo={handleLoadDemo}
        onStartEmpty={handleStartEmpty}
      />

      <PdfImportModal
        isOpen={showPdfImportModal}
        onClose={() => setShowPdfImportModal(false)}
        onImport={(importedFlights, importedMiles) => {
          handlePdfImport(importedFlights, importedMiles);
          setShowPdfImportModal(false);
        }}
        existingFlights={flights}
        existingMiles={baseMilesData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={{
          baseMilesData,
          baseXpData,
          redemptions,
          flights,
          xpRollover,
          currentMonth,
          targetCPM,
          manualLedger,
        }}
        setters={{
          setBaseMilesData,
          setBaseXpData,
          setRedemptions,
          setFlights,
          setXpRollover,
          setCurrentMonth,
          setTargetCPM,
          setManualLedger,
        }}
        onReset={handleStartEmpty}
        onLoadDemo={handleLoadDemo}
        onStartOver={handleStartOver}
        isDemoMode={isDemoMode || isLocalMode}
        isLocalMode={isLocalMode}
        onExitDemo={handleExitDemoMode}
        isLoggedIn={!!user}
        markDataChanged={markDataChanged}
      />

      <ToastContainer />
    </>
  );
}
