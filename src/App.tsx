import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
// React Query based user data hook
import { useUserData } from './hooks/useUserData';
import { useAcquisitionCPM } from './hooks/useAcquisitionCPM';
import { usePageTracking } from './hooks/useAnalytics';
import { CurrencyProvider } from './lib/CurrencyContext';
import { CookieConsentProvider } from './lib/CookieContext';
import { CookieConsentUI } from './components/CookieConsent';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MilesEngine } from './components/MilesEngine';
import { XPEngine } from './components/XPEngine';
import { RedemptionCalc } from './components/RedemptionCalc';
import { Analytics } from './components/Analytics';
import { FlightLedger } from './components/FlightLedger';
import { FlightIntake } from './components/FlightIntake';
import { MilesIntake } from './components/MilesIntake';
import { MileageRun } from './components/MileageRun/index';
import { Profile } from './components/Profile';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { OnboardingFlow, OnboardingData } from './components/OnboardingFlow';
import { LoginPage } from './components/LoginPage';
import { PrivacyPolicy, TermsOfService, AboutPage, ContactPage, CookiePolicy } from './components/LegalPages';
import { FAQPage } from './components/FAQPage';
import { LandingPage } from './components/LandingPage';
import { CalculatorPage } from './components/CalculatorPage';
import { AIParserTest } from './components/AIParserTest';
import { LocalParserTest } from './components/LocalParserTest';
import { PdfImportModal } from './components/PdfImportModal';
import { DemoBar } from './components/DemoBar';
import { useToast } from './components/Toast';
import { MaintenanceNotice } from './components/MaintenanceNotice';
import { UpdateNotice } from './components/UpdateNotice';
import { Loader2, FileText, Upload } from 'lucide-react';
import { ViewState, StatusLevel, ActivityTransaction, FlightRecord } from './types';
import type { AIParsedResult } from './modules/local-text-parser';

// Inner component that uses page tracking (must be inside CookieConsentProvider)
function PageTracker() {
  usePageTracking();
  return null;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { state, actions, meta } = useUserData();
  const location = useLocation();
  const navigate = useNavigate();

  // Calculate user's personal acquisition CPM (used for ROI calculations)
  const acquisitionCPM = useAcquisitionCPM({
    activityTransactions: state.activityTransactions,
    flights: state.flights,
    legacyMilesData: state.milesData,
    useNewTransactions: state.useNewTransactions,
  });

  // -------------------------------------------------------------------------
  // UI STATE
  // -------------------------------------------------------------------------

  const [view, setView] = useState<ViewState>('dashboard');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'faq' | 'about' | 'contact' | 'calculator' | 'cookies' | 'ai-parser' | 'local-parser' | null>(null);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPdfInstructions, setShowPdfInstructions] = useState(false);
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  
  // Onboarding state
  const [showOnboardingPdfModal, setShowOnboardingPdfModal] = useState(false);
  const [onboardingPdfResult, setOnboardingPdfResult] = useState<{
    flightsCount: number;
    xpDetected: number;
    statusDetected: StatusLevel | null;
    milesBalance: number;
  } | null>(null);

  // -------------------------------------------------------------------------
  // PATH ROUTING (replaces hash routing)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const path = location.pathname;
    if (path === '/privacy') {
      setLegalPage('privacy');
      window.scrollTo(0, 0);
    } else if (path === '/terms') {
      setLegalPage('terms');
      window.scrollTo(0, 0);
    } else if (path === '/faq' || path === '/help') {
      setLegalPage('faq');
      window.scrollTo(0, 0);
    } else if (path === '/about') {
      setLegalPage('about');
      window.scrollTo(0, 0);
    } else if (path === '/contact') {
      setLegalPage('contact');
      window.scrollTo(0, 0);
    } else if (path === '/calculator') {
      setLegalPage('calculator');
      window.scrollTo(0, 0);
    } else if (path === '/cookies') {
      setLegalPage('cookies');
      window.scrollTo(0, 0);
    } else if (path === '/ai-parser') {
      setLegalPage('ai-parser');
      window.scrollTo(0, 0);
    } else if (path === '/local-parser') {
      setLegalPage('local-parser');
      window.scrollTo(0, 0);
    } else {
      setLegalPage(null);
    }
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // PDF IMPORT HANDLER (wraps actions.handlePdfImport with toast)
  // Updated Dec 2025: Uses ActivityTransaction[] for deduplication
  // -------------------------------------------------------------------------

  const handlePdfImportWithToast = (
    importedFlights: FlightRecord[],
    importedTransactions: ActivityTransaction[],
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { 
      cycleStartMonth: string; 
      cycleStartDate?: string;
      startingStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
      startingXP?: number;
    },
  ) => {
    // Count flights for toast message
    const flightCount = importedFlights.length;
    const txCount = importedTransactions.length;

    actions.handlePdfImport(importedFlights, importedTransactions, xpCorrection, cycleSettings);

    // Show success toast
    const rolloverMsg = cycleSettings?.startingXP ? ` (${cycleSettings.startingXP} XP rollover)` : '';
    const cycleMsg = cycleSettings ? ` · Cycle: ${cycleSettings.startingStatus} from ${cycleSettings.cycleStartMonth}${rolloverMsg}` : '';
    showToast(`Imported ${flightCount} flights, ${txCount} transactions${cycleMsg}. Duplicates auto-skipped.`, 'success');
  };

  // Handle PDF import from modal (Add Flight / Add Miles pages)
  const handlePdfImportFromModal = (result: AIParsedResult, includeHistoricalBalance: boolean) => {
    // Prepare transactions with optional historical balance
    let transactions = [...result.activityTransactions];
    
    // IMPORTANT: Only add historical balance if:
    // 1. User opted in (includeHistoricalBalance checkbox)
    // 2. Parser detected a difference (needsCorrection)
    // 3. There are NO existing transactions (fresh account)
    // This prevents duplicate historical balance entries on subsequent imports
    const hasExistingData = state.activityTransactions.length > 0;
    
    if (includeHistoricalBalance && !hasExistingData && result.milesReconciliation?.needsCorrection) {
      const correction = result.milesReconciliation.suggestedCorrection;
      if (correction) {
        const correctionTransaction: ActivityTransaction = {
          id: `starting-balance-${correction.date}`,
          date: correction.date,
          type: 'starting_balance',
          description: correction.description,
          miles: correction.miles,
          xp: 0,
          source: 'pdf',
          sourceDate: result.pdfHeader.exportDate,
        };
        transactions = [correctionTransaction, ...transactions];
      }
    }
    
    // Import using existing handler
    handlePdfImportWithToast(
      result.flights,
      transactions,
      undefined,
      result.qualificationSettings ? {
        cycleStartMonth: result.qualificationSettings.cycleStartMonth,
        cycleStartDate: result.qualificationSettings.cycleStartDate,
        startingStatus: result.qualificationSettings.startingStatus,
        startingXP: result.qualificationSettings.startingXP,
      } : undefined
    );
    
    setShowPdfImportModal(false);
  };

  // -------------------------------------------------------------------------
  // LEGAL PAGES (accessible without login)
  // -------------------------------------------------------------------------

  const handleLegalBack = () => {
    navigate('/');
    setLegalPage(null);
  };

  // Legal pages - wrap with cookie consent
  if (legalPage === 'privacy') return (
    <CookieConsentProvider>
      <PrivacyPolicy onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'terms') return (
    <CookieConsentProvider>
      <TermsOfService onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'faq') return (
    <CookieConsentProvider>
      <FAQPage onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'about') return (
    <CookieConsentProvider>
      <AboutPage onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'contact') return (
    <CookieConsentProvider>
      <ContactPage onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'cookies') return (
    <CookieConsentProvider>
      <CookiePolicy onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'calculator') return (
    <CookieConsentProvider>
      <CalculatorPage onBack={handleLegalBack} />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'ai-parser') return (
    <CookieConsentProvider>
      <AIParserTest />
      <CookieConsentUI />
    </CookieConsentProvider>
  );
  if (legalPage === 'local-parser') return (
    <CookieConsentProvider>
      <LocalParserTest />
      <CookieConsentUI />
    </CookieConsentProvider>
  );

  // -------------------------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------------------------

  if (authLoading) {
    return (
      <CookieConsentProvider>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
        <CookieConsentUI />
      </CookieConsentProvider>
    );
  }

  // -------------------------------------------------------------------------
  // NOT AUTHENTICATED
  // -------------------------------------------------------------------------

  if (!user && !meta.isDemoMode && !meta.isLocalMode) {
    if (showLoginPage) {
      return (
        <CookieConsentProvider>
          <LoginPage
            onDemoMode={actions.handleEnterDemoMode}
            onLocalMode={actions.handleEnterLocalMode}
            onBack={() => setShowLoginPage(false)}
          />
          <CookieConsentUI />
        </CookieConsentProvider>
      );
    }
    return (
      <CookieConsentProvider>
        <LandingPage
          onGetStarted={() => setShowLoginPage(true)}
          onDemo={actions.handleEnterDemoMode}
        />
        <CookieConsentUI />
      </CookieConsentProvider>
    );
  }

  // -------------------------------------------------------------------------
  // LOADING USER DATA
  // -------------------------------------------------------------------------

  if (meta.isLoading) {
    return (
      <CookieConsentProvider>
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-500">Loading your portfolio...</p>
          </div>
        </div>
        <CookieConsentUI />
      </CookieConsentProvider>
    );
  }

  // -------------------------------------------------------------------------
  // PDF IMPORT BANNER (reused in addFlight and addMiles views)
  // -------------------------------------------------------------------------

  const PdfImportBanner = () => (
    <div className="bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-100 rounded-xl">
            <FileText className="text-brand-600" size={22} />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Have your Flying Blue PDF?</p>
            <p className="text-sm text-slate-500">
              Import all your {view === 'addFlight' ? 'flights' : 'miles transactions'} at once instead of adding them manually
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

      {showPdfInstructions && (
        <div className="mt-4 pt-4 border-t border-brand-200 space-y-3">
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Log in to <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold hover:underline">flyingblue.com</a></span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Go to <strong>My Account</strong> → <strong>Activity overview</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span className="text-amber-700"><strong>Click "More"</strong> repeatedly until <em>all</em> your activities are visible</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Scroll back up and click <strong>"Download"</strong></span>
            </li>
          </ol>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>⚠️ Important:</strong> Flying Blue only exports what's visible on screen. If you skip the "More" step, your PDF will be incomplete!
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <strong>💡 Tip:</strong> For best results, download your statement in <strong>Dutch, English, or French</strong>. Change your language in the top right corner of flyingblue.com.
          </div>
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------------------
  // DATA LOADING STATE
  // -------------------------------------------------------------------------

  // Show loading spinner when user data is being loaded
  // This prevents race conditions where the UI shows incomplete data
  if (user && meta.isLoading && !meta.isDemoMode && !meta.isLocalMode) {
    return (
      <CookieConsentProvider>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading your data...</p>
          </div>
        </div>
        <CookieConsentUI />
      </CookieConsentProvider>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN CONTENT RENDERER
  // -------------------------------------------------------------------------

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            state={{
              milesData: state.milesData,
              xpData: state.xpData,
              redemptions: state.redemptions,
              xpRollover: state.xpRollover,
              currentMonth: state.currentMonth,
              flights: state.flights,
              targetCPM: state.targetCPM,
              manualLedger: state.manualLedger,
              qualificationSettings: state.qualificationSettings,
              activityTransactions: state.activityTransactions,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={actions.setCurrentMonth}
            onPdfImport={handlePdfImportWithToast}
            onTransactionImport={handlePdfImportWithToast}
            demoStatus={meta.isDemoMode ? meta.demoStatus : undefined}
          />
        );

      case 'addFlight':
        return (
          <div className="space-y-6">
            <PdfImportBanner />
            <FlightIntake
              onApply={actions.handleFlightIntakeApply}
              currentStatus={state.currentStatus}
            />
            <FlightLedger
              flights={state.flights}
              onChange={actions.handleFlightsUpdate}
              xpData={state.xpData}
              currentRollover={state.xpRollover}
            />
          </div>
        );

      case 'addMiles':
        return (
          <div className="space-y-6">
            <PdfImportBanner />
            <MilesIntake
              milesData={state.milesData}
              onUpdate={actions.handleManualLedgerUpdate}
              onAddTransaction={actions.handleAddManualTransaction}
              useNewTransactions={state.useNewTransactions}
              currentMonth={state.currentMonth}
              activityTransactions={state.activityTransactions}
              flights={state.flights}
              onUpdateTransactionCost={actions.handleUpdateTransactionCost}
              onDeleteTransaction={actions.handleDeleteTransaction}
            />
          </div>
        );

      case 'miles':
        return (
          <MilesEngine
            data={state.milesData}
            onUpdate={actions.handleManualLedgerUpdate}
            currentMonth={state.currentMonth}
            onUpdateCurrentMonth={actions.setCurrentMonth}
            targetCPM={state.targetCPM}
            onUpdateTargetCPM={actions.handleTargetCPMUpdate}
            redemptions={state.redemptions}
            activityTransactions={state.activityTransactions}
            useNewTransactions={state.useNewTransactions}
            onUpdateTransactionCost={actions.handleUpdateTransactionCost}
            onDeleteTransaction={actions.handleDeleteTransaction}
            flights={state.flights}
          />
        );

      case 'xp':
        return (
          <XPEngine
            data={state.xpData}
            baseData={state.baseXpData}
            onUpdate={actions.setBaseXpData}
            rollover={state.xpRollover}
            onUpdateRollover={actions.handleXPRolloverUpdate}
            uxpRollover={state.uxpRollover}
            onUpdateUxpRollover={actions.handleUxpRolloverUpdate}
            flights={state.flights}
            onUpdateFlights={actions.handleFlightsUpdate}
            manualLedger={state.manualLedger}
            onUpdateManualLedger={actions.handleManualXPLedgerUpdate}
            qualificationSettings={state.qualificationSettings}
            onUpdateQualificationSettings={actions.handleQualificationSettingsUpdate}
            demoStatus={meta.isDemoMode ? meta.demoStatus : undefined}
          />
        );

      case 'redemption':
        return (
          <RedemptionCalc
            redemptions={state.redemptions}
            onUpdate={actions.handleRedemptionsUpdate}
            baselineCpm={acquisitionCPM.hasData ? acquisitionCPM.cpm * 100 : actions.calculateGlobalCPM()}
            targetCpm={state.targetCPM}
          />
        );

      case 'analytics':
        return (
          <Analytics
            xpData={state.xpData}
            rollover={state.xpRollover}
            redemptions={state.redemptions}
            milesData={state.milesData}
            currentMonth={state.currentMonth}
            targetCPM={state.targetCPM}
          />
        );

      case 'mileageRun':
        return (
          <MileageRun 
            xpData={state.xpData} 
            rollover={state.xpRollover}
            flights={state.flights}
            manualLedger={state.manualLedger}
            qualificationSettings={state.qualificationSettings}
            demoStatus={meta.isDemoMode ? meta.demoStatus : undefined}
          />
        );

      case 'profile':
        return (
          <Profile
            flights={state.flights}
            xpData={state.xpData}
            milesData={state.milesData}
            currentStatus={state.currentStatus}
            qualificationSettings={state.qualificationSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            userEmail={user?.email}
          />
        );

      default:
        return (
          <Dashboard
            state={{
              milesData: state.milesData,
              xpData: state.xpData,
              redemptions: state.redemptions,
              xpRollover: state.xpRollover,
              currentMonth: state.currentMonth,
              flights: state.flights,
              targetCPM: state.targetCPM,
              manualLedger: state.manualLedger,
              qualificationSettings: state.qualificationSettings,
              activityTransactions: state.activityTransactions,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={actions.setCurrentMonth}
            onPdfImport={handlePdfImportWithToast}
            onTransactionImport={handlePdfImportWithToast}
            demoStatus={meta.isDemoMode ? meta.demoStatus : undefined}
          />
        );
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <CookieConsentProvider>
    <PageTracker />
    <CurrencyProvider currency={state.currency}>
      <Layout
        currentView={view}
        onNavigate={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDemoMode={meta.isDemoMode || meta.isLocalMode}
        isLocalMode={meta.isLocalMode}
      >
        {/* Saving indicator */}
        {meta.isSaving && (
          <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        )}

        {renderContent()}
      </Layout>

      {/* WelcomeModal disabled - landing page and demo mode selector handle this now */}
      {/* 
      <WelcomeModal
        isOpen={meta.showWelcome && !user}
        onLoadDemo={actions.handleLoadDemo}
        onStartEmpty={actions.handleStartEmpty}
      />
      */}

      {/* Onboarding Flow for logged-in users */}
      {user && !meta.onboardingCompleted && !meta.isDemoMode && !meta.isLocalMode && (
        <OnboardingFlow
          userEmail={user.email || ''}
          isReturningUser={state.flights.length > 0}
          existingData={{
            currency: state.currency,
            homeAirport: state.homeAirport,
            currentStatus: state.currentStatus,
            currentXP: state.qualificationSettings?.startingXP || 0,
            currentUXP: state.currentUXP,
            rolloverXP: state.xpRollover,
            milesBalance: state.milesBalance,
            ultimateCycleType: state.qualificationSettings?.ultimateCycleType || 'qualification',
            targetCPM: state.targetCPM,
            emailConsent: meta.emailConsent,
          }}
          onComplete={(data: OnboardingData) => {
            actions.handleOnboardingComplete(data);
            // Show appropriate toast
            if (data.pdfImported) {
              showToast(`Imported ${data.pdfFlightsCount} flights.`, 'success');
            } else if (state.flights.length > 0) {
              showToast('Settings updated!', 'success');
            } else {
              showToast('Welcome to SkyStatus Pro!', 'success');
            }
          }}
          onPdfParsed={(result, includeHistoricalBalance) => {
            // Import the parsed PDF data
            handlePdfImportFromModal(result, includeHistoricalBalance);
            // Update the legacy pdfImportResult for the onboarding flow UI
            setOnboardingPdfResult({
              flightsCount: result.flights.length,
              xpDetected: result.pdfHeader.xp,
              statusDetected: result.pdfHeader.status,
              milesBalance: result.pdfHeader.miles,
            });
          }}
          onPdfImport={() => setShowOnboardingPdfModal(true)}
          pdfImportResult={onboardingPdfResult}
          onSkip={() => {
            // Quick skip - just mark onboarding complete with current/default values
            actions.handleOnboardingComplete({
              currency: state.currency || 'EUR',
              homeAirport: state.homeAirport || null,
              currentStatus: state.currentStatus || 'Explorer',
              currentXP: state.qualificationSettings?.startingXP || 0,
              currentUXP: state.currentUXP || 0,
              rolloverXP: state.xpRollover || 0,
              milesBalance: state.milesBalance || 0,
              ultimateCycleType: state.qualificationSettings?.ultimateCycleType || 'qualification',
              targetCPM: state.targetCPM || 0.012,
              emailConsent: meta.emailConsent || false,
              isReturningUser: state.flights.length > 0,
            });
          }}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={{
          baseMilesData: state.baseMilesData,
          baseXpData: state.baseXpData,
          redemptions: state.redemptions,
          flights: state.flights,
          xpRollover: state.xpRollover,
          currentMonth: state.currentMonth,
          targetCPM: state.targetCPM,
          currency: state.currency,
          manualLedger: state.manualLedger,
          qualificationSettings: state.qualificationSettings,
          homeAirport: state.homeAirport,
          // New transaction system
          activityTransactions: state.activityTransactions,
          useNewTransactions: state.useNewTransactions,
        }}
        setters={{
          setBaseMilesData: actions.setBaseMilesData,
          setBaseXpData: actions.setBaseXpData,
          setRedemptions: actions.setRedemptions,
          setFlights: actions.setFlights,
          setXpRollover: actions.setXpRollover,
          setCurrentMonth: actions.setCurrentMonth,
          setTargetCPM: actions.setTargetCPM,
          setCurrency: actions.handleCurrencyUpdate,
          setManualLedger: actions.setManualLedger,
          setQualificationSettings: actions.setQualificationSettings,
        }}
        onReset={actions.handleStartEmpty}
        onLoadDemo={actions.handleLoadDemo}
        onStartOver={actions.handleStartOver}
        onRerunOnboarding={actions.handleRerunOnboarding}
        onUndoImport={actions.handleUndoImport}
        canUndoImport={actions.canUndoImport}
        importBackupInfo={actions.importBackupInfo}
        emailConsent={meta.emailConsent}
        onEmailConsentChange={actions.handleEmailConsentChange}
        isDemoMode={meta.isDemoMode || meta.isLocalMode}
        isLocalMode={meta.isLocalMode}
        onExitDemo={actions.handleExitDemoMode}
        isLoggedIn={!!user}
        markDataChanged={actions.markDataChanged}
        forceSave={actions.forceSave}
        handleJsonImport={actions.handleJsonImport}
        showToast={showToast}
      />

      <ToastContainer />
      <CookieConsentUI />
      
      {/* PDF Import Modal (for Add Flight / Add Miles) */}
      <PdfImportModal
        isOpen={showPdfImportModal}
        onClose={() => setShowPdfImportModal(false)}
        onImportComplete={handlePdfImportFromModal}
        existingTransactions={state.activityTransactions}
      />
      
      {/* Update Notice for PDF Import 2.0 and Miles Engine Maintenance */}
      <UpdateNotice 
        isActiveUser={!!user || meta.isLocalMode} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      {/* Demo Mode Bar */}
      <DemoBar
        isDemoMode={meta.isDemoMode}
        demoStatus={meta.demoStatus}
        onSetDemoStatus={actions.handleSetDemoStatus}
        onExitDemo={actions.handleExitDemoMode}
        onCreateAccount={() => setShowLoginPage(true)}
      />
    </CurrencyProvider>
    </CookieConsentProvider>
  );
}
