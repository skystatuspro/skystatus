import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '../lib/CookieContext';
import {
  trackPageView,
  trackEvent,
  trackAccessModeStart,
  trackSignOut,
  trackDemoStatusChange,
  trackDemoExit,
  trackViewModeChange,
  trackNavigation,
  trackPdfImport,
  trackPdfImportError,
  trackFlightAdd,
  trackFlightDelete,
  trackMilesAdd,
  trackRedemptionAdd,
  trackRedemptionDelete,
  trackDataExport,
  trackDataImport,
  trackAnalyticsSectionView,
  trackCalculatorUsage,
  trackMileageRunSimulation,
  trackOnboardingComplete,
  trackOnboardingStep,
  trackSettingsChange,
  trackGuideView,
  trackFeatureUsage,
  trackBugReport,
  trackContactForm,
  trackError,
  trackSearchOpen,
  trackSearchQuery,
  trackSearchResultClick,
  trackSearchResultOpen,
  isAnalyticsActive,
} from '../lib/analytics';

/**
 * Hook for tracking page views in SPA
 * Automatically tracks route changes
 */
export function usePageTracking(): void {
  const location = useLocation();
  const { consent } = useCookieConsent();

  useEffect(() => {
    // Only track if analytics consent is given
    if (consent?.analytics && isAnalyticsActive()) {
      // Small delay to ensure title has updated
      const timer = setTimeout(() => {
        trackPageView(location.pathname + location.search);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, consent?.analytics]);
}

/**
 * Hook providing analytics event tracking functions
 * All functions are no-ops if consent is not given
 */
export function useAnalytics() {
  const { consent } = useCookieConsent();
  const previousViewRef = useRef<string | null>(null);
  
  const isEnabled = consent?.analytics && isAnalyticsActive();

  // Generic event tracking
  const track = useCallback((eventName: string, params?: Record<string, string | number | boolean>) => {
    if (isEnabled) {
      trackEvent(eventName, params);
    }
  }, [isEnabled]);

  // --- ACCESS & AUTHENTICATION ---

  const trackAccessMode = useCallback((method: 'google' | 'demo' | 'local') => {
    if (isEnabled) {
      trackAccessModeStart(method);
    }
  }, [isEnabled]);

  const trackUserSignOut = useCallback(() => {
    if (isEnabled) {
      trackSignOut();
    }
  }, [isEnabled]);

  // --- DEMO MODE ---

  const trackDemoStatus = useCallback((fromStatus: string, toStatus: string) => {
    if (isEnabled) {
      trackDemoStatusChange(fromStatus, toStatus);
    }
  }, [isEnabled]);

  const trackExitDemo = useCallback((action: 'create_account' | 'exit') => {
    if (isEnabled) {
      trackDemoExit(action);
    }
  }, [isEnabled]);

  // --- VIEW MODE ---

  const trackViewMode = useCallback((mode: 'simple' | 'full') => {
    if (isEnabled) {
      trackViewModeChange(mode);
    }
  }, [isEnabled]);

  // --- NAVIGATION ---

  const trackNav = useCallback((toView: string) => {
    if (isEnabled) {
      const fromView = previousViewRef.current || 'unknown';
      trackNavigation(fromView, toView);
      previousViewRef.current = toView;
    }
  }, [isEnabled]);

  // --- PDF IMPORT ---

  const trackPdf = useCallback((flightCount: number, milesMonths: number, language?: string) => {
    if (isEnabled) {
      trackPdfImport(flightCount, milesMonths, language);
    }
  }, [isEnabled]);

  const trackPdfError = useCallback((errorType: string) => {
    if (isEnabled) {
      trackPdfImportError(errorType);
    }
  }, [isEnabled]);

  // --- FLIGHT MANAGEMENT ---

  const trackFlight = useCallback((cabinClass: string, isAfKlm: boolean) => {
    if (isEnabled) {
      trackFlightAdd(cabinClass, isAfKlm);
    }
  }, [isEnabled]);

  const trackFlightRemove = useCallback((count: number) => {
    if (isEnabled) {
      trackFlightDelete(count);
    }
  }, [isEnabled]);

  // --- MILES MANAGEMENT ---

  const trackMiles = useCallback((source: 'subscription' | 'amex' | 'flight' | 'other') => {
    if (isEnabled) {
      trackMilesAdd(source);
    }
  }, [isEnabled]);

  // --- REDEMPTION MANAGEMENT ---

  const trackRedemption = useCallback((milesUsed: number, cpmCategory: 'excellent' | 'good' | 'fair' | 'poor') => {
    if (isEnabled) {
      trackRedemptionAdd(milesUsed, cpmCategory);
    }
  }, [isEnabled]);

  const trackRedemptionRemove = useCallback((count: number) => {
    if (isEnabled) {
      trackRedemptionDelete(count);
    }
  }, [isEnabled]);

  // --- DATA EXPORT/IMPORT ---

  const trackExport = useCallback(() => {
    if (isEnabled) {
      trackDataExport();
    }
  }, [isEnabled]);

  const trackImport = useCallback((flightsCount: number, redemptionsCount: number, milesMonths: number) => {
    if (isEnabled) {
      trackDataImport(flightsCount, redemptionsCount, milesMonths);
    }
  }, [isEnabled]);

  // --- ANALYTICS PAGE ---

  const trackAnalyticsSection = useCallback((section: 'overview' | 'miles' | 'xp' | 'redemptions') => {
    if (isEnabled) {
      trackAnalyticsSectionView(section);
    }
  }, [isEnabled]);

  // --- CALCULATORS ---

  const trackCalculator = useCallback((type: 'mileage_run' | 'redemption' | 'xp_simulation') => {
    if (isEnabled) {
      trackCalculatorUsage(type);
    }
  }, [isEnabled]);

  const trackMileageRun = useCallback((targetStatus: string, currentXp: number) => {
    if (isEnabled) {
      trackMileageRunSimulation(targetStatus, currentXp);
    }
  }, [isEnabled]);

  // --- ONBOARDING ---

  const trackOnboarding = useCallback((hasPdf: boolean, hasFlights: boolean) => {
    if (isEnabled) {
      trackOnboardingComplete(hasPdf, hasFlights);
    }
  }, [isEnabled]);

  const trackOnboardingStepComplete = useCallback((step: number, stepName: string) => {
    if (isEnabled) {
      trackOnboardingStep(step, stepName);
    }
  }, [isEnabled]);

  // --- SETTINGS ---

  const trackSettings = useCallback((setting: string, value: string | number | boolean) => {
    if (isEnabled) {
      trackSettingsChange(setting, value);
    }
  }, [isEnabled]);

  // --- CONTENT ---

  const trackGuide = useCallback((slug: string) => {
    if (isEnabled) {
      trackGuideView(slug);
    }
  }, [isEnabled]);

  // --- SEARCH ---

  const trackSearch = useCallback((trigger: 'keyboard' | 'button') => {
    if (isEnabled) {
      trackSearchOpen(trigger);
    }
  }, [isEnabled]);

  const trackSearchTerm = useCallback((query: string, resultCount: number) => {
    if (isEnabled) {
      trackSearchQuery(query, resultCount);
    }
  }, [isEnabled]);

  const trackSearchClick = useCallback((
    query: string,
    resultType: 'guide' | 'faq' | 'page',
    resultTitle: string,
    resultPosition: number
  ) => {
    if (isEnabled) {
      trackSearchResultClick(query, resultType, resultTitle, resultPosition);
    }
  }, [isEnabled]);

  const trackSearchExternal = useCallback((
    resultType: 'guide' | 'faq' | 'page',
    resultUrl: string
  ) => {
    if (isEnabled) {
      trackSearchResultOpen(resultType, resultUrl);
    }
  }, [isEnabled]);

  // --- FEATURE USAGE ---

  const trackFeature = useCallback((feature: string) => {
    if (isEnabled) {
      trackFeatureUsage(feature);
    }
  }, [isEnabled]);

  // --- FEEDBACK ---

  const trackBugReportSubmit = useCallback((category: string) => {
    if (isEnabled) {
      trackBugReport(category);
    }
  }, [isEnabled]);

  const trackContactFormSubmit = useCallback((subject: string) => {
    if (isEnabled) {
      trackContactForm(subject);
    }
  }, [isEnabled]);

  // --- ERRORS ---

  const logError = useCallback((errorType: string, errorMessage: string) => {
    if (isEnabled) {
      trackError(errorType, errorMessage);
    }
  }, [isEnabled]);

  return {
    isEnabled,
    track,
    // Authentication
    trackAccessMode,
    trackUserSignOut,
    // Demo mode
    trackDemoStatus,
    trackExitDemo,
    // View mode
    trackViewMode,
    // Navigation
    trackNav,
    // PDF Import
    trackPdf,
    trackPdfError,
    // Flights
    trackFlight,
    trackFlightRemove,
    // Miles
    trackMiles,
    // Redemptions
    trackRedemption,
    trackRedemptionRemove,
    // Export/Import
    trackExport,
    trackImport,
    // Analytics page
    trackAnalyticsSection,
    // Calculators
    trackCalculator,
    trackMileageRun,
    // Onboarding
    trackOnboarding,
    trackOnboardingStepComplete,
    // Settings
    trackSettings,
    // Content
    trackGuide,
    // Search
    trackSearch,
    trackSearchTerm,
    trackSearchClick,
    trackSearchExternal,
    // Features
    trackFeature,
    // Feedback
    trackBugReportSubmit,
    trackContactFormSubmit,
    // Errors
    logError,
  };
}

export default useAnalytics;
