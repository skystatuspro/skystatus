import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  Wrench, 
  FileJson,
  Zap
} from 'lucide-react';

const NOTICE_VERSION = 'pdf-import-update-v2.0'; // Change this to show the notice again after updates
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

  const handleExportClick = () => {
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
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
        
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
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                <span className="text-xs font-bold text-white">!</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-2">
            Major Update: PDF Import 2.0
          </h2>
          
          <p className="text-sm sm:text-base text-slate-400 text-center mb-4 sm:mb-6 max-w-lg mx-auto">
            We've rebuilt the PDF import with new data fields and improved accuracy.
          </p>

          {/* Content Cards - Simplified for mobile */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            
            {/* What's New Card */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-3 sm:p-4 border border-blue-500/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                    What's New
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Better XP detection, international date support, new tracking fields
                  </p>
                </div>
              </div>
            </div>

            {/* Action Required Card */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-3 sm:p-4 border border-amber-500/30">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <FileJson className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1 flex items-center gap-2">
                    Export Recommended
                    <span className="text-xs bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full">Important</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Create a fresh JSON backup via Settings → Data Management to include all new fields.
                  </p>
                </div>
              </div>
            </div>

            {/* Miles Engine Maintenance Card */}
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-xl p-3 sm:p-4 border border-red-500/30">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-1 flex items-center gap-2">
                    Miles Engine Maintenance
                    <span className="text-xs bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full">Temp</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Calculations may be inaccurate temporarily. <strong className="text-green-400">Your data is safe.</strong>
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <button
              onClick={handleExportClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Open Settings</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-slate-600 text-sm sm:text-base"
            >
              Got It, Continue
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
