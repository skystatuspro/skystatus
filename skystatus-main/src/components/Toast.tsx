import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const backgrounds = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center gap-3 
        px-4 py-3 rounded-xl border shadow-lg
        ${backgrounds[type]}
        transition-all duration-300 ease-out
        ${isLeaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
        animate-in slide-in-from-bottom-4
      `}
    >
      {icons[type]}
      <span className="text-slate-700 font-medium pr-2">{message}</span>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X size={16} className="text-slate-400" />
      </button>
    </div>
  );
};

// Hook for managing toasts
interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ bottom: `${24 + index * 72}px` }}
          className="fixed right-6 z-50"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );

  return { showToast, ToastContainer };
};
