import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

  // Initialize analytics on mount if consent was previously granted
  useEffect(() => {
    if (state.consent?.analytics) {
      initializeAnalytics();
    }
  }, []); // Only run once on mount

  const saveConsent = useCallback((newConsent: CookieConsent) => {
    const previousConsent = state.consent;
    
    const stored: StoredConsent = {
      version: CONSENT_VERSION,
      consent: newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    setState({ consent: newConsent, showBanner: false });
    setShowSettings(false);

    // Handle analytics consent changes
    if (newConsent.analytics && (!previousConsent || !previousConsent.analytics)) {
      // Analytics newly enabled
      initializeAnalytics();
    } else if (!newConsent.analytics && previousConsent?.analytics) {
      // Analytics was enabled, now disabled
      revokeAnalytics();
    }
  }, [state.consent]);

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

// Initialize Google Analytics 4 when consent is granted
async function initializeAnalytics() {
  try {
    const { initializeAnalytics: initGA4 } = await import('./analytics');
    await initGA4();
    console.log('[Cookie Consent] Analytics consent granted - GA4 initialized');
  } catch (error) {
    console.error('[Cookie Consent] Failed to initialize analytics:', error);
  }
}

// Revoke analytics when consent is withdrawn
async function revokeAnalytics() {
  try {
    const { revokeAnalyticsConsent } = await import('./analytics');
    revokeAnalyticsConsent();
    console.log('[Cookie Consent] Analytics consent revoked');
  } catch (error) {
    console.error('[Cookie Consent] Failed to revoke analytics:', error);
  }
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
