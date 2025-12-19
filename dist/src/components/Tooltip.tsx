// src/components/Tooltip.tsx
import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right'; // Voor de toekomst
}

export const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible((prev) => !prev);
  const hide = () => setIsVisible(false);

  return (
    <div
      className="relative inline-flex items-center ml-1.5"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={hide}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-label="More information"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          hide();
        }
      }}
    >
      <Info
        size={12}
        className="text-slate-300 hover:text-blue-500 cursor-help transition-colors"
      />

      {isVisible && (
        // Tooltip: iets hoger (mb-2), breed genoeg, hoge z-index
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 text-white text-[11px] font-medium leading-relaxed rounded-xl shadow-2xl z-[9999]">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
};
