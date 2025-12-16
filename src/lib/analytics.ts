/**
 * Google Analytics 4 Integration for SkyStatus Pro
 * 
 * GDPR-compliant implementation:
 * - GA4 only loads AFTER explicit user consent
 * - Uses consent mode v2 for granular control
 * - IP anonymization is default in GA4
 * - No Google Signals (disabled for privacy)
 */

// Your GA4 Measurement ID - replace with actual ID from Google Analytics
export const GA_MEASUREMENT_ID = 'G-9846CTNB76';

// Declare gtag on window
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Track if GA4 script has been loaded
let isGtagLoaded = false;
let isAnalyticsInitialized = false;

/**
 * Initialize gtag with default denied consent state
 * This should be called early, before any tracking
 */
export function initializeGtagDefaults(): void {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  
  // Set timestamp
  window.gtag('js', new Date());
  
  // Default: deny all consent until user accepts
  // This is required for GDPR compliance
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500, // Wait 500ms for consent update
  });
  
  // Configure GA4 with privacy settings
  window.gtag('config', GA_MEASUREMENT_ID, {
    // Privacy settings
    anonymize_ip: true, // Redundant in GA4 but explicit
    allow_google_signals: false, // Disable for GDPR
    allow_ad_personalization_signals: false,
    
    // Don't send pageview automatically - we control this
    send_page_view: false,
  });
}

/**
 * Load the Google Analytics script dynamically
 * Only call this after consent is granted
 */
export function loadGtagScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }
    
    if (isGtagLoaded) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    
    script.onload = () => {
      isGtagLoaded = true;
      console.log('[Analytics] GA4 script loaded');
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load GA4 script'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize analytics after consent is granted
 * This loads the script and updates consent state
 */
export async function initializeAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isAnalyticsInitialized) return;
  
  try {
    // Initialize gtag defaults first
    initializeGtagDefaults();
    
    // Load the script
    await loadGtagScript();
    
    // Update consent to granted
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
    
    isAnalyticsInitialized = true;
    console.log('[Analytics] GA4 initialized with consent');
    
    // Send initial pageview
    trackPageView();
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Revoke analytics consent
 * Called when user opts out
 */
export function revokeAnalyticsConsent(): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('consent', 'update', {
    analytics_storage: 'denied',
  });
  
  console.log('[Analytics] Consent revoked');
}

/**
 * Track a page view
 * Called on route changes in SPA
 */
export function trackPageView(path?: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag || !isAnalyticsInitialized) return;
  
  const pagePath = path || window.location.pathname + window.location.search;
  const pageTitle = title || document.title;
  
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: window.location.href,
  });
  
  console.log('[Analytics] Page view:', pagePath);
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  parameters?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined' || !window.gtag || !isAnalyticsInitialized) return;
  
  window.gtag('event', eventName, parameters);
  console.log('[Analytics] Event:', eventName, parameters);
}

// ============================================================================
// PRE-DEFINED EVENTS FOR SKYSTATUS
// ============================================================================

// --- ACCESS & AUTHENTICATION ---

/**
 * Track when user starts using the app (login/demo/local mode)
 */
export function trackAccessModeStart(mode: 'google' | 'demo' | 'local'): void {
  trackEvent('access_mode_start', {
    method: mode,
    event_category: 'authentication',
  });
}

/**
 * Track user login (alias for backwards compatibility)
 */
export function trackLogin(method: 'google' | 'demo' | 'local'): void {
  trackAccessModeStart(method);
}

/**
 * Track user sign out
 */
export function trackSignOut(): void {
  trackEvent('sign_out', {
    event_category: 'authentication',
  });
}

// --- DEMO MODE ---

/**
 * Track demo status level change
 */
export function trackDemoStatusChange(fromStatus: string, toStatus: string): void {
  trackEvent('demo_status_change', {
    from_status: fromStatus,
    to_status: toStatus,
    event_category: 'demo',
  });
}

/**
 * Track when user exits demo mode
 */
export function trackDemoExit(action: 'create_account' | 'exit'): void {
  trackEvent('demo_exit', {
    action: action,
    event_category: 'demo',
  });
}

// --- VIEW MODE ---

/**
 * Track view mode toggle (Simple vs Full)
 */
export function trackViewModeChange(mode: 'simple' | 'full'): void {
  trackEvent('view_mode_change', {
    mode: mode,
    event_category: 'preferences',
  });
}

// --- NAVIGATION ---

/**
 * Track navigation between app sections
 */
export function trackNavigation(fromView: string, toView: string): void {
  trackEvent('navigation', {
    from_view: fromView,
    to_view: toView,
    event_category: 'navigation',
  });
}

// --- PDF IMPORT ---

/**
 * Track when user imports a PDF
 */
export function trackPdfImport(flightCount: number, milesMonths: number, language?: string): void {
  trackEvent('pdf_import', {
    flight_count: flightCount,
    miles_months: milesMonths,
    pdf_language: language || 'unknown',
    event_category: 'data_import',
  });
}

/**
 * Track PDF import errors
 */
export function trackPdfImportError(errorType: string): void {
  trackEvent('pdf_import_error', {
    error_type: errorType,
    event_category: 'data_import',
  });
}

// --- FLIGHT MANAGEMENT ---

/**
 * Track when a flight is added manually
 */
export function trackFlightAdd(cabinClass: string, isAfKlm: boolean): void {
  trackEvent('flight_add', {
    cabin_class: cabinClass,
    is_af_klm: isAfKlm,
    event_category: 'data_entry',
  });
}

/**
 * Track when flights are deleted
 */
export function trackFlightDelete(count: number): void {
  trackEvent('flight_delete', {
    count: count,
    event_category: 'data_entry',
  });
}

// --- MILES MANAGEMENT ---

/**
 * Track when miles are added
 */
export function trackMilesAdd(source: 'subscription' | 'amex' | 'flight' | 'other'): void {
  trackEvent('miles_entry_add', {
    source: source,
    event_category: 'data_entry',
  });
}

// --- REDEMPTION MANAGEMENT ---

/**
 * Track when a redemption is added
 */
export function trackRedemptionAdd(milesUsed: number, cpmCategory: 'excellent' | 'good' | 'fair' | 'poor'): void {
  trackEvent('redemption_add', {
    miles_used: milesUsed,
    cpm_category: cpmCategory,
    event_category: 'data_entry',
  });
}

/**
 * Track when redemptions are deleted
 */
export function trackRedemptionDelete(count: number): void {
  trackEvent('redemption_delete', {
    count: count,
    event_category: 'data_entry',
  });
}

// --- DATA EXPORT/IMPORT ---

/**
 * Track JSON data export
 */
export function trackDataExport(): void {
  trackEvent('data_export', {
    format: 'json',
    event_category: 'data_management',
  });
}

/**
 * Track JSON data import
 */
export function trackDataImport(flightsCount: number, redemptionsCount: number, milesMonths: number): void {
  trackEvent('data_import', {
    flights_count: flightsCount,
    redemptions_count: redemptionsCount,
    miles_months: milesMonths,
    format: 'json',
    event_category: 'data_management',
  });
}

// --- ANALYTICS PAGE ---

/**
 * Track which analytics section is viewed
 */
export function trackAnalyticsSectionView(section: 'overview' | 'miles' | 'xp' | 'redemptions'): void {
  trackEvent('analytics_section_view', {
    section: section,
    event_category: 'analytics',
  });
}

// --- CALCULATORS ---

/**
 * Track calculator usage
 */
export function trackCalculatorUsage(calculatorType: 'mileage_run' | 'redemption' | 'xp_simulation'): void {
  trackEvent('calculator_use', {
    calculator_type: calculatorType,
    event_category: 'engagement',
  });
}

/**
 * Track mileage run simulation
 */
export function trackMileageRunSimulation(targetStatus: string, currentXp: number): void {
  trackEvent('mileage_run_simulation', {
    target_status: targetStatus,
    current_xp: currentXp,
    event_category: 'engagement',
  });
}

// --- ONBOARDING ---

/**
 * Track onboarding completion
 */
export function trackOnboardingComplete(hasPdf: boolean, hasFlights: boolean): void {
  trackEvent('onboarding_complete', {
    has_pdf: hasPdf,
    has_flights: hasFlights,
    event_category: 'engagement',
  });
}

/**
 * Track onboarding step completion
 */
export function trackOnboardingStep(step: number, stepName: string): void {
  trackEvent('onboarding_step', {
    step_number: step,
    step_name: stepName,
    event_category: 'engagement',
  });
}

// --- SETTINGS ---

/**
 * Track settings changes
 */
export function trackSettingsChange(setting: string, value: string | number | boolean): void {
  trackEvent('settings_change', {
    setting_name: setting,
    setting_value: String(value),
    event_category: 'preferences',
  });
}

// --- CONTENT ---

/**
 * Track guide page view (for cross-referencing with static pages)
 */
export function trackGuideView(guideSlug: string): void {
  trackEvent('guide_view', {
    guide_slug: guideSlug,
    event_category: 'content',
  });
}

// --- FEATURE USAGE ---

/**
 * Track feature usage
 */
export function trackFeatureUsage(feature: string): void {
  trackEvent('feature_use', {
    feature_name: feature,
    event_category: 'engagement',
  });
}

// --- FEEDBACK ---

/**
 * Track bug report submission
 */
export function trackBugReport(category: string): void {
  trackEvent('bug_report_submit', {
    category: category,
    event_category: 'feedback',
  });
}

/**
 * Track contact form submission
 */
export function trackContactForm(subject: string): void {
  trackEvent('contact_form_submit', {
    subject: subject,
    event_category: 'feedback',
  });
}

// --- ERRORS ---

/**
 * Track errors for debugging
 */
export function trackError(errorType: string, errorMessage: string): void {
  trackEvent('exception', {
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
  });
}

// ============================================================================
// UTILITY: Check if analytics is active
// ============================================================================

export function isAnalyticsActive(): boolean {
  return isAnalyticsInitialized;
}
