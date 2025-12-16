import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '../lib/CookieContext';
import {
  trackPageView,
  trackEvent,
  trackPdfImport,
  trackLogin,
  trackCalculatorUsage,
  trackGuideView,
  trackOnboardingComplete,
  trackFeatureUsage,
  trackError,
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
  
  const isEnabled = consent?.analytics && isAnalyticsActive();

  // Wrap all tracking functions to check consent
  const track = useCallback((eventName: string, params?: Record<string, string | number | boolean>) => {
    if (isEnabled) {
      trackEvent(eventName, params);
    }
  }, [isEnabled]);

  const trackPdf = useCallback((flightCount: number, language: string) => {
    if (isEnabled) {
      trackPdfImport(flightCount, language);
    }
  }, [isEnabled]);

  const trackUserLogin = useCallback((method: 'google' | 'demo' | 'local') => {
    if (isEnabled) {
      trackLogin(method);
    }
  }, [isEnabled]);

  const trackCalculator = useCallback((type: 'mileage_run' | 'redemption' | 'xp_simulation') => {
    if (isEnabled) {
      trackCalculatorUsage(type);
    }
  }, [isEnabled]);

  const trackGuide = useCallback((slug: string) => {
    if (isEnabled) {
      trackGuideView(slug);
    }
  }, [isEnabled]);

  const trackOnboarding = useCallback((hasPdf: boolean, hasFlights: boolean) => {
    if (isEnabled) {
      trackOnboardingComplete(hasPdf, hasFlights);
    }
  }, [isEnabled]);

  const trackFeature = useCallback((feature: string) => {
    if (isEnabled) {
      trackFeatureUsage(feature);
    }
  }, [isEnabled]);

  const logError = useCallback((errorType: string, errorMessage: string) => {
    if (isEnabled) {
      trackError(errorType, errorMessage);
    }
  }, [isEnabled]);

  return {
    isEnabled,
    track,
    trackPdf,
    trackUserLogin,
    trackCalculator,
    trackGuide,
    trackOnboarding,
    trackFeature,
    logError,
  };
}

export default useAnalytics;
