import React, { useState } from 'react';
import { X, CheckCircle, Smile, Meh, Frown, Send, Loader2 } from 'lucide-react';
import { submitFeedback, markPostImportFeedbackGiven, FeedbackRating } from '../lib/feedbackService';

interface PostImportFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  flightsImported: number;
  milesImported: number;
}

export const PostImportFeedback: React.FC<PostImportFeedbackProps> = ({
  isOpen,
  onClose,
  flightsImported,
  milesImported,
}) => {
  const [rating, setRating] = useState<FeedbackRating>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    await submitFeedback({
      trigger: 'post_import',
      rating,
      message: message.trim() || undefined,
      page: 'pdf_import',
    });

    markPostImportFeedbackGiven();
    setIsSubmitting(false);
    setSubmitted(true);
    
    // Auto close after showing success
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleSkip = () => {
    markPostImportFeedbackGiven();
    onClose();
  };

  const ratingOptions: { value: FeedbackRating; icon: React.ReactNode; label: string }[] = [
    { value: 'easy', icon: <Smile size={24} />, label: 'Easy' },
    { value: 'okay', icon: <Meh size={24} />, label: 'Okay' },
    { value: 'confusing', icon: <Frown size={24} />, label: 'Confusing' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Success header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Import successful!</h3>
                <p className="text-emerald-100 text-sm">
                  {flightsImported > 0 && `${flightsImported} flights`}
                  {flightsImported > 0 && milesImported > 0 && ' · '}
                  {milesImported > 0 && `${milesImported.toLocaleString()} miles`}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feedback content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
              <p className="font-medium text-slate-800">Thanks for your feedback!</p>
            </div>
          ) : (
            <>
              <p className="text-slate-600 mb-4">
                Quick question: how was the import process?
              </p>

              {/* Rating buttons */}
              <div className="flex gap-3 mb-4">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRating(option.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      rating === option.value
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Optional message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any details? (optional)"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={2}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
