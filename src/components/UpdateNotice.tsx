import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  RotateCcw, 
  RefreshCw,
  Zap,
  Shield,
  Languages
} from 'lucide-react';

const NOTICE_VERSION = 'v3.0-launch'; // Change this to show the notice again after updates
const STORAGE_KEY = `skystatus_update_notice_${NOTICE_VERSION}`;

interface UpdateNoticeProps {
  /** Only show for authenticated or local mode users */
  isActiveUser: boolean;
  /** Callback when user wants to open settings/export */
  onOpenSettings?: () => void;
}

export const UpdateNotice: React.FC<UpdateNoticeProps> = ({ 
  isActiveUser, 
  onOpenSettings 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Only show for active users who haven't dismissed this version
    if (isActiveUser) {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Small delay for smoother UX after app loads
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isActiveUser]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setIsVisible(false);
    }, 300);
  };

  const handleStartOverClick = () => {
    handleDismiss();
    // Small delay before opening settings to let animation complete
    setTimeout(() => {
      onOpenSettings?.();
    }, 350);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
    >
      <div 
        className={`relative w-full max-w-2xl my-4 sm:my-0 bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Animated gradient top bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 animate-pulse" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Header with icon */}
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                <span className="text-[10px] font-bold text-white">3.0</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-2">
            Welcome to SkyStatus 3.0
          </h2>
          
          <p className="text-sm sm:text-base text-slate-400 text-center mb-4 sm:mb-6 max-w-lg mx-auto">
            A completely rebuilt import system with smart duplicate detection.
          </p>

          {/* Content Cards */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            
            {/* What's New Card */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-3 sm:p-4 border border-emerald-500/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                    What's New
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Smart duplicate detection, 7-language PDF support, improved XP tracking, and transaction-level detail.
                  </p>
                </div>
              </div>
            </div>

            {/* Duplicate Detection Card */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-3 sm:p-4 border border-blue-500/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                    No More Duplicates
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Each transaction now gets a unique ID. Re-importing your PDF automatically skips entries you already have.
                  </p>
                </div>
              </div>
            </div>

            {/* Fresh Start Recommended Card */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-3 sm:p-4 border border-amber-500/30">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1 flex items-center gap-2">
                    Fresh Start Recommended
                    <span className="text-xs bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full">Best Results</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    For optimal tracking, use <strong className="text-white">Settings → Start Over</strong> and re-import your PDF. This ensures all transactions get unique IDs for accurate duplicate detection.
                  </p>
                </div>
              </div>
            </div>

            {/* Language Support Card */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-3 sm:p-4 border border-purple-500/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                    7 Languages Supported
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Dutch, English, French, German, Spanish, Italian, and Portuguese PDFs now parse correctly.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <button
              onClick={handleStartOverClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Open Settings</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-slate-600 text-sm sm:text-base"
            >
              Continue Without Changes
            </button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-500 text-center mt-4">
            Thank you for using SkyStatus Pro! 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotice;
