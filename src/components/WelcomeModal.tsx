// src/components/WelcomeModal.tsx
import React from 'react';
import { ShieldCheck, Plane, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onLoadDemo: () => void;
  onStartEmpty: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onLoadDemo,
  onStartEmpty,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Brand / Visual */}
        <div className="bg-slate-900 p-8 text-white md:w-2/5 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
              <Plane className="text-white transform -rotate-45" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">
              SkyStatus <span className="text-blue-400">Pro</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              The loyalty analytics suite for strategic flyers.
            </p>
          </div>

          {/* Abstract Circles */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        {/* Right: Content */}
        <div className="p-8 md:w-3/5">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Welcome Aboard
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              SkyStatus helps you optimize your Flying Blue strategy. Track XP,
              calculate waste, and analyze redemption value.
            </p>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
              <ShieldCheck className="text-blue-600 shrink-0" size={20} />
              <div className="text-xs text-blue-800">
                <strong>Privacy First:</strong> No account needed. Your data is
                stored locally in your browser. We see nothing. If you clear
                your browser cache, your data will be removed. Use Export JSON
                to keep backups.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onLoadDemo}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group text-left"
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  Load Demo Data
                </div>
                <div className="text-xs text-slate-500">
                  Explore with pre-filled flights &amp; stats
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-slate-300 group-hover:text-blue-500 transition-colors"
              />
            </button>

            <button
              onClick={onStartEmpty}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group text-left"
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  Start Fresh
                </div>
                <div className="text-xs text-slate-500">
                  Begin with an empty portfolio
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-slate-300 group-hover:text-slate-600 transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
