import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, CheckCircle } from 'lucide-react';
import {
  submitFeedback,
  markDashboardFeedbackGiven,
  dismissDashboardFeedback,
  getDashboardFeedbackTrigger,
} from '../lib/feedbackService';

interface FeedbackCardProps {
  onDismiss: () => void;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ onDismiss }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    
    await submitFeedback({
      trigger: getDashboardFeedbackTrigger(),
      message: message.trim(),
      page: 'dashboard',
    });

    markDashboardFeedbackGiven();
    setIsSubmitting(false);
    setSubmitted(true);
    
    // Auto dismiss after showing success
    setTimeout(() => {
      onDismiss();
    }, 2000);
  };

  const handleDismiss = () => {
    dismissDashboardFeedback();
    onDismiss();
  };

  if (submitted) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-800">Thanks for your feedback!</h3>
            <p className="text-sm text-emerald-600">Your input helps make SkyStatus better.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-brand-50 to-indigo-50 rounded-2xl border border-brand-200 p-6 relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        title="Ask me later"
      >
        <X size={18} />
      </button>

      <div className="flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
            <MessageSquare size={20} className="text-brand-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 mb-1">Help improve SkyStatus</h3>
          <p className="text-sm text-slate-600 mb-4">
            You've been using SkyStatus for a while now. What's working well? What could be better?
          </p>

          {/* Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your feedback..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-white"
            rows={3}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
