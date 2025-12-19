import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { useUserData } from './hooks/useUserData';
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
import PdfImportModal from './components/PdfImportModal';
import { PrivacyPolicy, TermsOfService, AboutPage, ContactPage, CookiePolicy } from './components/LegalPages';
import { FAQPage } from './components/FAQPage';
import { LandingPage } from './components/LandingPage';
import { CalculatorPage } from './components/CalculatorPage';
import { DemoBar } from './components/DemoBar';
import { useToast } from './components/Toast';
import { MaintenanceNotice } from './components/MaintenanceNotice';
import { Loader2, FileText, Upload } from 'lucide-react';
import { ViewState, StatusLevel } from './types';

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

  // -------------------------------------------------------------------------
  // UI STATE
  // -------------------------------------------------------------------------

  const [view, setView] = useState<ViewState>('dashboard');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'faq' | 'about' | 'contact' | 'calculator' | 'cookies' | null>(null);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [showPdfInstructions, setShowPdfInstructions] = useState(false);
  
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
    } else {
      setLegalPage(null);
    }
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // PDF IMPORT HANDLER (wraps actions.handlePdfImport with toast)
  // -------------------------------------------------------------------------

  const handlePdfImportWithToast = (
    importedFlights: typeof state.flights,
    importedMiles: typeof state.milesData,
    xpCorrection?: { month: string; correctionXp: number; reason: string },
    cycleSettings?: { 
      cycleStartMonth: string; 
      cycleStartDate?: string;
      startingStatus: 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
      startingXP?: number;
    },
    bonusXpByMonth?: Record<string, number>
  ) => {
    // Count new flights before import (note: in replace mode, all flights are "new")
    const newFlightCount = importedFlights.length;

    actions.handlePdfImport(importedFlights, importedMiles, xpCorrection, cycleSettings, bonusXpByMonth);

    // Show success toast - note: actual merge happens in handlePdfImport
    // newFlightCount here is what PDF contained, actual added may be less due to duplicates
    const rolloverMsg = cycleSettings?.startingXP ? ` (${cycleSettings.startingXP} XP rollover)` : '';
    const cycleMsg = cycleSettings ? ` · Cycle: ${cycleSettings.startingStatus} from ${cycleSettings.cycleStartMonth}${rolloverMsg}` : '';
    const bonusXpTotal = bonusXpByMonth ? Object.values(bonusXpByMonth).reduce((a, b) => a + b, 0) : 0;
    const bonusMsg = bonusXpTotal > 0 ? ` (+${bonusXpTotal} bonus XP)` : '';
    showToast(`Merged ${newFlightCount} flights from PDF${bonusMsg}${cycleMsg}. Duplicates skipped. Use Data Settings to undo.`, 'success');
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
        </div>
      )}
    </div>
  );

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
              // PDF Baseline display values
              displayXP: state.displayXP,
              displayUXP: state.displayUXP,
              displayMiles: state.displayMiles,
              displayStatus: state.displayStatus,
              hasPdfBaseline: !!state.pdfBaseline,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={actions.setCurrentMonth}
            onPdfImport={handlePdfImportWithToast}
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
              currentMonth={state.currentMonth}
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
            baselineCpm={actions.calculateGlobalCPM()}
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
              // PDF Baseline display values
              displayXP: state.displayXP,
              displayUXP: state.displayUXP,
              displayMiles: state.displayMiles,
              displayStatus: state.displayStatus,
              hasPdfBaseline: !!state.pdfBaseline,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={actions.setCurrentMonth}
            onPdfImport={handlePdfImportWithToast}
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

      {/* PDF Import Modal for Onboarding */}
      <PdfImportModal
        isOpen={showOnboardingPdfModal}
        onClose={() => setShowOnboardingPdfModal(false)}
        onImport={(importedFlights, importedMiles, xpCorrection, cycleSettings, bonusXpByMonth) => {
          // Save the flights
          actions.handlePdfImport(importedFlights, importedMiles, xpCorrection, cycleSettings, bonusXpByMonth);
          
          // Calculate summary for onboarding display
          const totalXP = importedFlights.reduce((sum, f) => sum + (f.earnedXP || 0), 0);
          const milesBalance = importedMiles.reduce((sum, m) => 
            sum + m.miles_subscription + m.miles_amex + m.miles_flight + m.miles_other - m.miles_debit, 0
          );
          
          setOnboardingPdfResult({
            flightsCount: importedFlights.length,
            xpDetected: totalXP,
            statusDetected: cycleSettings?.startingStatus || null,
            milesBalance: Math.max(0, milesBalance),
          });
          
          setShowOnboardingPdfModal(false);
        }}
        existingFlights={state.flights}
        existingMiles={state.baseMilesData}
        existingQualificationSettings={state.qualificationSettings}
        existingStatus={state.currentStatus}
      />

      <PdfImportModal
        isOpen={showPdfImportModal}
        onClose={() => setShowPdfImportModal(false)}
        onImport={(importedFlights, importedMiles, xpCorrection, cycleSettings, bonusXpByMonth) => {
          handlePdfImportWithToast(importedFlights, importedMiles, xpCorrection, cycleSettings, bonusXpByMonth);
        }}
        existingFlights={state.flights}
        existingMiles={state.baseMilesData}
        existingQualificationSettings={state.qualificationSettings}
        existingStatus={state.currentStatus}
      />

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
      
      {/* Maintenance Notice for PDF Import Issues */}
      <MaintenanceNotice isActiveUser={!!user || meta.isLocalMode} />
      
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
