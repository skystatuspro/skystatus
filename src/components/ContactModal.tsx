// src/components/ContactModal.tsx
// Contact form modal - sends messages via Supabase (no exposed email address)

import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitFeedback } from '../lib/feedbackService';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Format message with contact details
      const fullMessage = [
        `**Contact Form Submission**`,
        ``,
        `**From:** ${name || 'Not provided'}`,
        `**Email:** ${email || 'Not provided'}`,
        ``,
        `**Message:**`,
        message,
      ].join('\n');

      const success = await submitFeedback({
        trigger: 'contact_form',
        message: fullMessage,
        page: window.location.pathname,
      });

      if (success) {
        setSubmitStatus('success');
        // Reset form after short delay
        setTimeout(() => {
          setName('');
          setEmail('');
          setMessage('');
          setSubmitStatus('idle');
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setEmail('');
      setMessage('');
      setSubmitStatus('idle');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Contact Support</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 bg-emerald-100 rounded-full mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Message Sent!</h3>
              <p className="text-slate-600">We'll get back to you as soon as possible.</p>
            </div>
          ) : (
            <>
              {/* Name field */}
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-slate-50 disabled:opacity-50"
                />
              </div>

              {/* Email field */}
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-slate-400">(optional, for reply)</span>
                </label>
                <input
                  type="email"
                  id="contact-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-slate-50 disabled:opacity-50"
                />
              </div>

              {/* Message field */}
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={4}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:opacity-50"
                />
              </div>

              {/* Error message */}
              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={18} />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </button>

              <p className="text-xs text-center text-slate-400">
                We typically respond within 24 hours.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
