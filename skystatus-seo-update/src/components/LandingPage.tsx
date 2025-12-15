import React from 'react';
import { 
  Plane, 
  TrendingUp, 
  Target, 
  Calculator, 
  Shield, 
  Zap,
  ChevronRight,
  CheckCircle,
  BarChart3,
  Upload,
  Award
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onDemo }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl">
              <Plane className="text-white transform -rotate-45" size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-xl text-slate-900">SkyStatus</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/faq"
              className="hidden sm:block px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Help & FAQ
            </a>
            <button
              onClick={onDemo}
              className="hidden sm:block px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              View Demo
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-40" />
        
        {/* Decorative plane */}
        <div className="absolute top-40 right-10 opacity-5 hidden lg:block">
          <Plane size={400} className="transform rotate-12" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Zap size={16} />
              Free Flying Blue Analytics Tool
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
              Master Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> Flying Blue </span>
              Status
            </h1>
            
            <p className="text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl">
              Track your XP, analyze miles value, plan mileage runs, and optimize your path to 
              Platinum status. Full Ultimate tracking included for those chasing the top tier.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:scale-[1.02]"
              >
                Start Tracking
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onDemo}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold text-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                Explore with sample data
              </button>
            </div>

            <div className="flex items-center gap-6 mt-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                100% free
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                Cloud sync or local-only
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Everything You Need to Maximize Your Status
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful analytics and planning tools designed specifically for Flying Blue members
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">XP Qualification Tracker</h3>
              <p className="text-slate-600">
                Real-time progress tracking across qualification cycles. See exactly how many XP you need for your next status level.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Calculator className="text-emerald-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Miles Valuation Engine</h3>
              <p className="text-slate-600">
                Calculate your true cost-per-mile and track redemption value. Know exactly what your miles are worth.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Target className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">XP Run Simulator</h3>
              <p className="text-slate-600">
                Plan mileage runs with our simulator. Find the most efficient routes to reach your status goals.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <Upload className="text-amber-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">PDF Import</h3>
              <p className="text-slate-600">
                Import your complete Flying Blue history from PDF. Automatic extraction of flights, miles, and XP data.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-rose-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Advanced Analytics</h3>
              <p className="text-slate-600">
                Visualize your earning patterns, redemption history, and ROI on miles acquisition strategies.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-slate-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Privacy First</h3>
              <p className="text-slate-600">
                Your data stays yours. Use locally without an account, or sync securely across devices with encryption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-slate-600">
              Three simple steps to take control of your Flying Blue journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <span className="text-2xl font-black text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Download Your PDF</h3>
              <p className="text-slate-600">
                Go to Flying Blue → My Account → Activity overview. Click "More" until all activities load, then click "Download".
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <span className="text-2xl font-black text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Import & Analyze</h3>
              <p className="text-slate-600">
                Upload your PDF to SkyStatus. We automatically extract all your flights, miles, and XP data.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <span className="text-2xl font-black text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Optimize Your Strategy</h3>
              <p className="text-slate-600">
                Use our tools to plan your path to the next status level and maximize your miles value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Status Levels */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Track Every Status Level
            </h2>
            <p className="text-lg text-slate-400">
              From Explorer to Ultimate, we help you reach your goals
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Explorer', xp: '0 XP', color: 'from-slate-400 to-slate-500', multiplier: '4x', subtitle: 'Starting level' },
              { name: 'Silver', xp: '100 XP', color: 'from-gray-300 to-gray-400', multiplier: '6x', subtitle: null },
              { name: 'Gold', xp: '180 XP', color: 'from-amber-400 to-amber-500', multiplier: '7x', subtitle: null },
              { name: 'Platinum', xp: '300 XP', color: 'from-slate-300 to-slate-400', multiplier: '8x', subtitle: 'Start earning UXP' },
              { name: 'Ultimate', xp: '900 UXP', color: 'from-slate-600 to-slate-800', multiplier: '9x', subtitle: 'As Platinum member' },
            ].map((level) => (
              <div key={level.name} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center mb-4`}>
                  <Award className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{level.name}</h3>
                <p className="text-slate-400 text-sm mb-1">{level.xp} required</p>
                {level.subtitle && <p className="text-slate-500 text-xs mb-2">{level.subtitle}</p>}
                <div className="text-emerald-400 font-semibold">{level.multiplier} Miles</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Ready to Optimize Your Flying Blue Journey?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of Flying Blue members who use SkyStatus to track their progress and maximize their benefits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:scale-[1.02]"
            >
              Start Tracking
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onDemo}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-all"
            >
              Explore sample data
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-xl">
                <Plane className="text-white transform -rotate-45" size={18} fill="currentColor" />
              </div>
              <span className="font-bold text-lg text-slate-900">SkyStatus</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="/faq" className="hover:text-slate-700 transition-colors">Help & FAQ</a>
              <a href="/about" className="hover:text-slate-700 transition-colors">About</a>
              <a href="/contact" className="hover:text-slate-700 transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-slate-700 transition-colors">Terms</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
            <p>© {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
