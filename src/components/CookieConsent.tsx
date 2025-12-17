import React, { useState } from 'react';
import { 
  Cookie, 
  X, 
  Shield, 
  Settings, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Info, 
} from 'lucide-react';
import { useCookieConsent, CookieConsent } from '../lib/CookieContext';

// Cookie category descriptions for transparency
const COOKIE_CATEGORIES = [
  {
    id: 'necessary' as const,
    name: 'Strictly Necessary',
    description: 'Essential for the website. These cookies enable core functionality like security, authentication, and accessibility. They cannot be disabled.',
    required: true,
    examples: ['Session management', 'Authentication tokens', 'Security preferences'],
  },
  {
    id: 'functional' as const,
    name: 'Functional',
    description: 'Remembers your preferences and settings. Without these, some features may not work optimally.',
    required: false,
    examples: ['Currency preference', 'Home airport setting', 'Display preferences'],
  },
  {
    id: 'analytics' as const,
    name: 'Analytics',
    description: 'Helps us understand visitor interaction. This data is anonymized and used to improve SkyStatus.',
    required: false,
    examples: ['Page views', 'Feature usage', 'Error tracking'],
  },
  {
    id: 'marketing' as const,
    name: 'Marketing',
    description: 'Tracks visitors across websites for advertising. We currently do not use marketing cookies.',
    required: false,
    examples: ['Currently not used'],
    disabled: true,
  },
];

// Main Cookie Banner Component - Non-intrusive bottom banner
export const CookieBanner: React.FC = () => {
  const { showBanner, acceptAll, rejectAll, openSettings } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon & Text */}
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0 hidden sm:flex">
              <Cookie size={20} className="text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600 leading-relaxed">
                We use cookies to improve your experience. Analytics help us make SkyStatus better.{' '}
                <button 
                  onClick={openSettings}
                  className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                >
                  Customize
                </button>
                {' '}or read our{' '}
                <a 
                  href="/privacy" 
                  className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                >
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={rejectAll}
              className="flex-1 sm:flex-none px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              Decline
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-brand-600/25"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Detailed Cookie Settings Modal
export const CookieSettingsModal: React.FC = () => {
  const { showSettings, closeSettings, acceptSelected, consent } = useCookieConsent();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selections, setSelections] = useState<Partial<CookieConsent>>({
    functional: consent?.functional ?? false,
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
  });

  if (!showSettings) return null;

  const toggleCategory = (id: keyof CookieConsent) => {
    if (id === 'necessary') return; // Can't toggle necessary
    setSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    acceptSelected(selections);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-xl">
              <Settings size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cookie Settings</h2>
              <p className="text-xs text-slate-500">Manage your cookie preferences</p>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {COOKIE_CATEGORIES.map((category) => {
            const isExpanded = expanded === category.id;
            const isEnabled = category.required || selections[category.id];
            const isDisabled = category.required || category.disabled;

            return (
              <div 
                key={category.id} 
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isEnabled ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200'
                }`}
              >
                {/* Category Header */}
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : category.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {category.required ? <Shield size={16} /> : <Cookie size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        {category.name}
                        {category.required && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                        {category.disabled && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            Not used
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {category.description}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    disabled={isDisabled}
                    className={`ml-3 relative w-12 h-7 rounded-full transition-colors ${
                      isDisabled
                        ? 'bg-slate-200 cursor-not-allowed'
                        : isEnabled
                          ? 'bg-brand-500'
                          : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}>
                      {isEnabled && <Check size={12} className="text-brand-500 m-1" />}
                    </div>
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white/50">
                    <p className="text-xs text-slate-600 mb-3">{category.description}</p>
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700">Examples:</span>
                      <ul className="mt-1 space-y-0.5">
                        {category.examples.map((example, idx) => (
                          <li key={idx} className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 mt-4">
            <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              You can change these preferences at any time by clicking "Cookie Settings" in the footer 
              of any page. Your choice will be remembered for 12 months.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={closeSettings}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-500 to-blue-600 text-white font-semibold rounded-xl hover:from-brand-600 hover:to-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

// Small footer link to reopen settings
export const CookieSettingsLink: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { openSettings, hasConsented } = useCookieConsent();

  // Only show if user has already consented (so they can change it)
  if (!hasConsented) return null;

  return (
    <button
      onClick={openSettings}
      className={`inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 transition-colors ${className}`}
    >
      <Cookie size={12} />
      Cookie Settings
    </button>
  );
};

// Combined component for easy integration
export const CookieConsentUI: React.FC = () => {
  return (
    <>
      <CookieBanner />
      <CookieSettingsModal />
    </>
  );
};
