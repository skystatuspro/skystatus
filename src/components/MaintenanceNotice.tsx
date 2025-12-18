import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Wrench, CheckCircle2, Clock } from 'lucide-react';

const NOTICE_VERSION = 'pdf-import-v1'; // Change this to show the notice again after updates
const STORAGE_KEY = `skystatus_maintenance_notice_${NOTICE_VERSION}`;

interface MaintenanceNoticeProps {
  /** Only show for authenticated or local mode users */
  isActiveUser: boolean;
}

export const MaintenanceNotice: React.FC<MaintenanceNoticeProps> = ({ isActiveUser }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Only show for active users who haven't dismissed this version
    if (isActiveUser) {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Small delay for smoother UX after app loads
        const timer = setTimeout(() => setIsVisible(true), 500);
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

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
    >
      <div 
        className={`relative w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Decorative top bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Wrench className="w-10 h-10 text-amber-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border-2 border-amber-500">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            PDF Import Under Maintenance
          </h2>
          
          <p className="text-slate-400 text-center mb-6">
            We're rebuilding this feature for better accuracy
          </p>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Known Issues</h3>
                  <p className="text-sm text-slate-300">
                    The PDF import currently has problems correctly detecting your <strong className="text-amber-400">Flying Blue status</strong> and <strong className="text-amber-400">qualification cycle</strong> for all users.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white mb-1">What Still Works</h3>
                  <p className="text-sm text-slate-300">
                    Flight data and miles transactions are usually imported correctly. You can still use manual entry for full accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="space-y-3">
            <button
              onClick={handleDismiss}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25"
            >
              I Understand, Continue
            </button>
            
            <p className="text-xs text-slate-500 text-center">
              We're working hard to fix this. Thank you for your patience! 🙏
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceNotice;
