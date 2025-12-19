import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  Sparkles, 
  Download, 
  Wrench, 
  ArrowRight,
  FileJson,
  Database,
  CheckCircle2,
  Info,
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
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
    >
      <div 
        className={`relative w-full max-w-2xl bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Animated gradient top bar */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header with icon */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                <span className="text-xs font-bold text-white">!</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
            Major Update: PDF Import 2.0
          </h2>
          
          <p className="text-slate-400 text-center mb-8 max-w-lg mx-auto">
            We've completely rebuilt the PDF import with new data fields and improved accuracy.
            Here's what you need to know:
          </p>

          {/* Content Cards */}
          <div className="space-y-4 mb-8">
            
            {/* What's New Card */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    What's New
                    <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">v2.0</span>
                  </h3>
                  <ul className="text-sm text-slate-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>New data fields for better tracking accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Improved XP and status detection from PDFs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Better support for international date formats</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Required Card */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/30">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <FileJson className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    Action Recommended
                    <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">Important</span>
                  </h3>
                  <p className="text-sm text-slate-300 mb-3">
                    Your existing JSON backup may be missing new data fields. We recommend creating a 
                    <strong className="text-amber-300"> fresh export</strong> via the JSON module in Settings 
                    to ensure you have a complete backup with all the new fields.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>Go to Settings → Data Management → Export JSON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Miles Engine Maintenance Card */}
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-xl p-5 border border-red-500/30">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-red-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    Miles Engine Under Maintenance
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">Temporary</span>
                  </h3>
                  <p className="text-sm text-slate-300 mb-2">
                    The Miles Engine calculations are being recalibrated for the new data structure. 
                    <strong className="text-red-300"> Some calculations may be inaccurate</strong> until 
                    this maintenance is complete.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 text-sm">
                    <Database className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">
                      <strong className="text-green-400">Your data is safe.</strong> All entered information is preserved.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportClick}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
            >
              <Download className="w-5 h-5" />
              <span>Open Settings to Export</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none py-3.5 px-6 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-slate-600"
            >
              Got It, Continue
            </button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-500 text-center mt-6">
            Thank you for using SkyStatus Pro! We're working hard to improve your experience. 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotice;
