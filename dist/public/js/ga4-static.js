/**
 * GA4 snippet for static HTML guide pages
 * This script should be added to the <head> of each guide page
 * It checks for cookie consent before loading GA4
 * 
 * Usage: Add this to each guide HTML file's <head>:
 * <script src="/js/ga4-static.js"></script>
 */

(function() {
  'use strict';
  
  // GA4 Measurement ID - must match the one in analytics.ts
  var GA_MEASUREMENT_ID = 'G-9846CTNB76';
  
  // Cookie consent storage key - must match CookieContext.tsx
  var CONSENT_STORAGE_KEY = 'skystatus_cookie_consent';
  var CONSENT_VERSION = '1.0';
  
  /**
   * Check if analytics consent was given
   */
  function hasAnalyticsConsent() {
    try {
      var stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION && parsed.consent) {
          return parsed.consent.analytics === true;
        }
      }
    } catch (e) {
      // localStorage not available or parse error
    }
    return false;
  }
  
  /**
   * Initialize dataLayer and gtag function
   */
  function initGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
  }
  
  /**
   * Load GA4 script
   */
  function loadGA4Script(callback) {
    var script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    script.async = true;
    script.onload = callback;
    document.head.appendChild(script);
  }
  
  /**
   * Configure GA4 with privacy settings
   */
  function configureGA4() {
    // Set consent to granted (we only load if consent was given)
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    
    // Configure GA4
    window.gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_path: window.location.pathname,
      page_title: document.title
    });
    
    console.log('[GA4 Static] Page view tracked:', window.location.pathname);
  }
  
  /**
   * Main initialization
   */
  function init() {
    // Only proceed if consent was given
    if (!hasAnalyticsConsent()) {
      console.log('[GA4 Static] Analytics consent not given, skipping');
      return;
    }
    
    // Initialize gtag
    initGtag();
    
    // Load script and configure
    loadGA4Script(function() {
      configureGA4();
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
