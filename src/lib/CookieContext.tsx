import React, { createContext, useContext, useState, useCallback } from 'react';

// Cookie categories following GDPR guidelines
export interface CookieConsent {
  necessary: boolean;      // Always true - required for app to function
  functional: boolean;     // Remember preferences (currency, home airport)
  analytics: boolean;      // Usage analytics (if implemented)
  marketing: boolean;      // Marketing/advertising (if implemented)
}

export interface CookieConsentContextType {
  consent: CookieConsent | null;
  hasConsented: boolean;
  showBanner: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (selected: Partial<CookieConsent>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  showSettings: boolean;
}

const CONSENT_STORAGE_KEY = 'skystatus_cookie_consent';
const CONSENT_VERSION = '1.0'; // Bump this to re-ask consent after policy changes

const defaultConsent: CookieConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
};

// Helper to check if specific cookie type is allowed
export const useCookieAllowed = (type: keyof CookieConsent): boolean => {
  const { consent } = useCookieConsent();
  if (!consent) return type === 'necessary';
  return consent[type];
};

interface StoredConsent {
  version: string;
  consent: CookieConsent;
  timestamp: string;
}

// Check localStorage synchronously to determine initial state
const getInitialState = (): { consent: CookieConsent | null; showBanner: boolean } => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const parsed: StoredConsent = JSON.parse(stored);
      if (parsed.version === CONSENT_VERSION) {
        return { consent: parsed.consent, showBanner: false };
      }
    }
  } catch {
    // localStorage not available or parse error
  }
  // No valid consent found - show banner
  return { consent: null, showBanner: true };
};

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state synchronously from localStorage
  const [state, setState] = useState(getInitialState);
  const [showSettings, setShowSettings] = useState(false);

  const saveConsent = useCallback((newConsent: CookieConsent) => {
    const stored: StoredConsent = {
      version: CONSENT_VERSION,
      consent: newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    setState({ consent: newConsent, showBanner: false });
    setShowSettings(false);

    // Trigger analytics initialization if accepted
    if (newConsent.analytics) {
      initializeAnalytics();
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  }, [saveConsent]);

  const acceptSelected = useCallback((selected: Partial<CookieConsent>) => {
    saveConsent({
      necessary: true, // Always required
      functional: selected.functional ?? false,
      analytics: selected.analytics ?? false,
      marketing: selected.marketing ?? false,
    });
  }, [saveConsent]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent: state.consent,
        hasConsented: state.consent !== null,
        showBanner: state.showBanner,
        acceptAll,
        rejectAll,
        acceptSelected,
        openSettings,
        closeSettings,
        showSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};

// Placeholder for analytics initialization
// Replace with actual analytics (GA4, Plausible, etc.) when needed
function initializeAnalytics() {
  // Example: Initialize Google Analytics 4
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('consent', 'update', {
  //     analytics_storage: 'granted',
  //   });
  // }
  
  console.log('[Cookie Consent] Analytics consent granted - ready to initialize tracking');
}

// Export for use in index.html or external scripts
export const getStoredConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const parsed: StoredConsent = JSON.parse(stored);
      if (parsed.version === CONSENT_VERSION) {
        return parsed.consent;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
};
