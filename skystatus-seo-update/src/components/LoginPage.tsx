import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Plane, Mail, Lock, AlertCircle, CheckCircle, Loader2, Info, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onDemoMode: () => void;
  onLocalMode?: () => void;
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onDemoMode, onLocalMode, onBack }) => {
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Check your email to confirm your account!');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Check your email for a password reset link!');
          setMode('login');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signInWithGoogle) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-white p-3 rounded-2xl shadow-lg">
          <Plane className="text-slate-900 transform -rotate-45" size={32} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">SkyStatus</h1>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Pro Analytics
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {mode === 'login' && 'Welcome back'}
          {mode === 'signup' && 'Create account'}
          {mode === 'reset' && 'Reset password'}
        </h2>
        <p className="text-slate-500 mb-6">
          {mode === 'login' && 'Sign in to access your Flying Blue portfolio'}
          {mode === 'signup' && 'Start tracking your loyalty status'}
          {mode === 'reset' && 'Enter your email to receive a reset link'}
        </p>

        {/* Google Sign In */}
        {mode === 'login' && signInWithGoogle && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-400">or continue with email</span>
              </div>
            </div>
          </>
        )}

        {/* Error/Success messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Send Reset Link'}
          </button>
        </form>

        {/* Info box for login */}
        {mode === 'login' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-2 text-blue-700 text-sm">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span><strong>Not a Flying Blue login.</strong> This account only saves your manually entered data. We never ask for or connect to your Flying Blue credentials.</span>
          </div>
        )}

        {/* Toggle modes */}
        <div className="mt-6 text-center text-sm">
          {mode === 'login' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </button>
              <div className="mt-3 text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div className="text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </button>
            </div>
          )}
          {mode === 'reset' && (
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to sign in
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-slate-400">or</span>
          </div>
        </div>

        {/* Demo Mode */}
        <button
          onClick={onDemoMode}
          className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
        >
          Explore Demo
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          Try with sample data to see how it works
        </p>

        {/* Local Mode */}
        {onLocalMode && (
          <>
            <button
              onClick={onLocalMode}
              className="w-full mt-3 py-3 bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all border border-dashed border-slate-300"
            >
              Use Locally
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Start empty, no account — use Export/Import in Data Settings to save your data
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm mb-4">
          Track your Flying Blue XP, miles, and redemptions
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
          <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};
