// src/components/DemoBar.tsx
// Floating demo mode controls

import React, { useState } from 'react';
import { Sparkles, X, User, ChevronRight, ChevronUp, Award, Crown } from 'lucide-react';
import { StatusLevel } from '../types';

// ============================================================================
// STATUS OPTIONS
// ============================================================================

interface StatusOption {
  value: StatusLevel;
  label: string;
  tagline: string;
  colorActive: string;
  colorInactive: string;
  icon: React.ReactNode;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'Silver',
    label: 'Silver',
    tagline: 'The Newcomer',
    colorActive: 'bg-slate-100 text-slate-700 border-slate-400 ring-slate-200',
    colorInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-slate-300',
    icon: <Award size={14} />,
  },
  {
    value: 'Gold',
    label: 'Gold',
    tagline: 'The Regular',
    colorActive: 'bg-amber-100 text-amber-700 border-amber-400 ring-amber-200',
    colorInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-amber-400',
    icon: <Award size={14} />,
  },
  {
    value: 'Platinum',
    label: 'Platinum',
    tagline: 'Road Warrior',
    colorActive: 'bg-blue-100 text-blue-700 border-blue-400 ring-blue-200',
    colorInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-blue-400',
    icon: <Award size={14} />,
  },
  {
    value: 'Ultimate',
    label: 'Ultimate',
    tagline: 'The Elite',
    colorActive: 'bg-violet-100 text-violet-700 border-violet-400 ring-violet-200',
    colorInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-violet-400',
    icon: <Crown size={14} />,
  },
];

// ============================================================================
// DEMO BAR COMPONENT
// ============================================================================

interface DemoBarProps {
  isDemoMode: boolean;
  demoStatus: StatusLevel;
  onSetDemoStatus: (status: StatusLevel) => void;
  onExitDemo: () => void;
  onCreateAccount?: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({ 
  isDemoMode,
  demoStatus,
  onSetDemoStatus,
  onExitDemo,
  onCreateAccount,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showMobileSelector, setShowMobileSelector] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (!isDemoMode) return null;

  const currentOption = STATUS_OPTIONS.find(o => o.value === demoStatus);

  const handleSetStatus = (status: StatusLevel) => {
    if (status === demoStatus) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onSetDemoStatus(status);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  // Minimized state - compact button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 lg:bottom-4 right-4 z-[60] bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 hover:bg-slate-800 transition-all group"
      >
        <div className="p-1 bg-amber-500/20 rounded-lg">
          <Sparkles size={14} className="text-amber-400" />
        </div>
        <span className="text-sm font-medium">Demo: {demoStatus}</span>
        <ChevronUp size={14} className="text-slate-500 group-hover:text-white transition-colors" />
      </button>
    );
  }

  // Desktop: Full bar
  return (
    <>
      {/* Mobile Status Selector Sheet */}
      {showMobileSelector && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[70] lg:hidden"
            onClick={() => setShowMobileSelector(false)}
          />
          <div className="fixed bottom-0 inset-x-0 z-[75] lg:hidden animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
              <h3 className="text-white font-bold mb-4">Select Status Level</h3>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleSetStatus(option.value);
                      setShowMobileSelector(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      demoStatus === option.value
                        ? option.colorActive + ' ring-2'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div className="text-left">
                        <span className="font-semibold">{option.label}</span>
                        <p className="text-xs opacity-70">{option.tagline}</p>
                      </div>
                    </div>
                    {demoStatus === option.value && (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowMobileSelector(false)}
                className="w-full mt-4 py-3 text-slate-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Demo Bar */}
      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-[60] p-4 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div 
            className={`bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden transition-opacity duration-150 ${
              isTransitioning ? 'opacity-70' : 'opacity-100'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg">
                  <Sparkles size={16} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-white font-bold text-sm">Demo Mode</span>
                  <span className="hidden sm:inline text-slate-500 text-xs ml-2">Experience SkyStatus</span>
                </div>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                title="Minimize"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status Selector - Desktop */}
            <div className="hidden sm:block px-5 py-4">
              <p className="text-slate-500 text-xs mb-3 font-medium">Experience SkyStatus as:</p>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSetStatus(option.value)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      demoStatus === option.value
                        ? option.colorActive + ' ring-2'
                        : option.colorInactive
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {option.icon}
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Selector - Mobile */}
            <div className="sm:hidden px-5 py-4">
              <button
                onClick={() => setShowMobileSelector(true)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  currentOption?.colorActive || ''
                } ring-2`}
              >
                <div className="flex items-center gap-2">
                  {currentOption?.icon}
                  <span className="font-semibold">{currentOption?.label}</span>
                  <span className="text-xs opacity-70">• {currentOption?.tagline}</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-t border-slate-800">
              <p className="text-slate-500 text-xs hidden sm:block">
                Ready to track your own Flying Blue status?
              </p>
              <p className="text-slate-500 text-xs sm:hidden">
                Track your own status
              </p>
              <button
                onClick={() => {
                  onExitDemo();
                  if (onCreateAccount) onCreateAccount();
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/25"
              >
                <User size={14} />
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Sign Up</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoBar;
