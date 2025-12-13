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
    description: 'Essential for the website to function. These cookies enable core functionality such as security, authentication, and accessibility. Cannot be disabled.',
    required: true,
    examples: ['Session management', 'Authentication tokens', 'Security preferences'],
  },
  {
    id: 'functional' as const,
    name: 'Functional',
    description: 'Remember your preferences and settings to enhance your experience. Without these, some features may not work optimally.',
    required: false,
    examples: ['Currency preference', 'Home airport setting', 'Display preferences'],
  },
  {
    id: 'analytics' as const,
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website. This data is anonymized and used to improve SkyStatus.',
    required: false,
    examples: ['Page views', 'Feature usage', 'Error tracking'],
  },
  {
    id: 'marketing' as const,
    name: 'Marketing',
    description: 'Used to track visitors across websites for advertising purposes. We currently do not use marketing cookies.',
    required: false,
    examples: ['Currently not used'],
    disabled: true,
  },
];

// Main Cookie Banner Component
export const CookieBanner: React.FC = () => {
  const { showBanner, acceptAll, rejectAll, openSettings } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-blue-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Cookie size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cookie Preferences</h2>
              <p className="text-sm text-white/80">We respect your privacy</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            SkyStatus uses cookies to ensure the website functions properly and to improve your experience. 
            You can choose which cookies you want to allow. Your preferences will be saved and you can 
            change them at any time via the cookie settings in the footer.
          </p>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-5">
            <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              <strong>Your privacy matters.</strong> We only use essential cookies by default. 
              Analytics help us improve SkyStatus but are entirely optional. We never sell your data.
            </p>
          </div>

          {/* Quick summary of categories */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {COOKIE_CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                className={`p-2 rounded-lg text-center text-xs ${
                  cat.required 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                    : cat.disabled 
                      ? 'bg-slate-50 border border-slate-200 text-slate-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                }`}
              >
                <div className="font-semibold">{cat.name}</div>
                <div className="text-[10px] mt-0.5">
                  {cat.required ? 'Required' : cat.disabled ? 'Not used' : 'Optional'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={rejectAll}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Reject Optional
          </button>
          <button
            onClick={openSettings}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Settings size={16} />
            Customize
          </button>
          <button
            onClick={acceptAll}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-500 to-blue-600 text-white font-semibold rounded-xl hover:from-brand-600 hover:to-blue-700 transition-colors text-sm"
          >
            Accept All
          </button>
        </div>

        {/* Legal links */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-400">
          <a href="#/privacy" className="hover:text-brand-600 flex items-center gap-1">
            Privacy Policy <ExternalLink size={10} />
          </a>
          <span>•</span>
          <a href="#/cookies" className="hover:text-brand-600 flex items-center gap-1">
            Cookie Policy <ExternalLink size={10} />
          </a>
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
