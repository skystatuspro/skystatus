import React from 'react';
import { ArrowLeft, Shield, FileText, Mail, Cookie, TrendingUp, BarChart3, Sparkles, Zap, Plane, Crown, Users, Heart } from 'lucide-react';
import { APP_VERSION } from '../config/version';
import { ContactModal } from './ContactModal';

interface LegalPageProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<LegalPageProps> = ({ onBack }) => {
  const lastUpdated = '16 December 2024';
  const [showContactModal, setShowContactModal] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to SkyStatus
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-100 rounded-xl">
            <Shield className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus ("we", "our", or "us") respects your privacy. We are committed to protecting your personal data. 
              This privacy policy explains how we collect, use, and safeguard your information when you use our 
              Flying Blue loyalty tracking application at skystatus.pro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Data We Collect</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We collect and process the following types of data:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Account data:</strong> Email address and authentication information when you sign in with Google.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Flight data:</strong> Flight records, routes, dates, and cabin class that you manually enter or import from Flying Blue PDFs.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Miles & XP data:</strong> Your Flying Blue miles balance, XP points, and redemption history.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Usage data:</strong> Basic analytics about how you use the application (if analytics are enabled).</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. PDF Import & Processing</h2>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <p className="text-emerald-800 font-medium">
                🔒 Your Flying Blue PDFs are processed entirely in your browser. The PDF file is never uploaded to our servers.
              </p>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you import a Flying Blue PDF:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Client-side processing:</strong> The PDF is parsed entirely in your browser using JavaScript (PDF.js). No server is involved.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Data extraction:</strong> We extract only flight data: dates, routes, cabin class, XP earned, and miles. Personal details like your name or Flying Blue number are not stored.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>No file storage:</strong> The original PDF is never saved. Not on our servers, not in your browser. Only the extracted flight records are kept.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Your choice:</strong> Extracted data is stored locally (Local Mode) or synced to your account (Cloud Mode). This depends on your preference.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. How We Use Your Data</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use your data exclusively to:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Provide and maintain the SkyStatus service</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Calculate and display your Flying Blue status progress</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Sync your data across devices when you're signed in</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Improve the application based on usage patterns</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Storage & Security</h2>
            <p className="text-slate-600 leading-relaxed">
              Your data is stored securely using Supabase. This is a trusted cloud database provider with enterprise-grade security. 
              All data transmission is encrypted using TLS/SSL. We implement row-level security to ensure you can only 
              access your own data. We do not sell, share, or provide your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Local Mode</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus offers a "Local Mode". In this mode, your data is stored only in your browser's local storage. It is never 
              sent to our servers. We have no access to your data whatsoever. Note that local data is 
              lost if you clear your browser data or switch devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Your Rights (GDPR)</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Under the General Data Protection Regulation (GDPR), you have the right to:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Access:</strong> Request a copy of your personal data (use Data Settings → Export JSON)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Rectification:</strong> Correct any inaccurate data directly in the application</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Erasure:</strong> Delete your account and all associated data (use Data Settings → Delete All Data)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Portability:</strong> Export your data in JSON format for use elsewhere</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Cookies & Analytics</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              SkyStatus uses cookies and analytics services. Here's what we use:
            </p>
            <ul className="space-y-2 text-slate-600 mb-4">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Essential cookies:</strong> Required for authentication and session management. These cannot be disabled.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Functional cookies:</strong> Remember your preferences like currency and home airport.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Analytics cookies:</strong> Google Analytics 4 (GA4) to understand how visitors use SkyStatus. This is optional and requires your consent.</span>
              </li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-sm">
                <strong>🔒 Privacy-first analytics:</strong> We use GA4 with enhanced privacy settings. IP addresses are anonymized, 
                Google Signals is disabled, and no advertising features are enabled. We only collect anonymous usage data to improve SkyStatus.
                You can opt out at any time via the Cookie Settings in the footer.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              We use the following third-party services:
            </p>
            <ul className="space-y-2 text-slate-600 mt-4">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Supabase:</strong> Database and authentication (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Privacy Policy</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Google OAuth:</strong> Sign-in authentication (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Privacy Policy</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Google Analytics 4:</strong> Website analytics (optional, requires consent) (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Privacy Policy</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span><strong>Vercel:</strong> Hosting and deployment (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Privacy Policy</a>)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, all your data 
              will be permanently removed from our servers within 30 days. Backup copies may persist for up to 90 days 
              for disaster recovery purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any significant changes 
              by posting the new policy on this page and updating the "Last updated" date. We encourage you to 
              review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">12. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this privacy policy or our data practices, please contact us:
            </p>
            <div className="mt-4">
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
              >
                <Mail size={18} />
                Contact Support
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export const TermsOfService: React.FC<LegalPageProps> = ({ onBack }) => {
  const lastUpdated = '11 December 2024';
  const [showContactModal, setShowContactModal] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to SkyStatus
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-100 rounded-xl">
            <FileText className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using SkyStatus ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service. We reserve the right to modify 
              these terms at any time. Your continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus is a personal tool for tracking Flying Blue loyalty program status, miles, and XP. 
              The Service allows you to import and manage flight data, calculate status progress, and analyze 
              your loyalty program performance. SkyStatus is an independent tool. It is not affiliated with, 
              endorsed by, or connected to Air France-KLM, Flying Blue, or any airline.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Accounts</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              To use certain features of the Service, you may create an account using Google authentication. You agree to:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Provide accurate and complete information</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Maintain the security of your account credentials</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Accept responsibility for all activities under your account</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Notify us immediately of any unauthorized access</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Use the Service for any unlawful purpose</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Attempt to gain unauthorized access to our systems</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Interfere with or disrupt the Service or servers</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Reverse engineer or attempt to extract source code</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>Use automated systems to access the Service without permission</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Accuracy</h2>
            <p className="text-slate-600 leading-relaxed">
              While we strive to provide accurate calculations and information, SkyStatus is provided for 
              informational purposes only. We do not guarantee the accuracy of XP calculations, status projections, 
              or miles valuations. Always verify important information directly with Flying Blue or your airline. 
              You are responsible for the accuracy of data you enter into the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              The Service, including its original content, features, and functionality, is owned by SkyStatus 
              and is protected by copyright, trademark, and other intellectual property laws. "Flying Blue" is 
              a trademark of Air France-KLM. All airline names and logos are trademarks of their respective owners. 
              Use of these names is for identification purposes only and does not imply endorsement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-slate-600 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SKYSTATUS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED 
              DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING 
              FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Service Availability</h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service at any time without notice. 
              We shall not be liable to you or any third party for any modification, suspension, or discontinuation 
              of the Service. We recommend regularly exporting your data using the provided export functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice 
              or liability, for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will cease immediately. You may delete your account at any time through Data Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Netherlands, 
              without regard to its conflict of law provisions. Any disputes arising from these Terms or the 
              Service shall be subject to the exclusive jurisdiction of the courts in the Netherlands.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">12. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4">
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
              >
                <Mail size={18} />
                Contact Support
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

// ============================================
// ABOUT PAGE
// ============================================

export const AboutPage: React.FC<LegalPageProps> = ({ onBack }) => {
  const features = [
    {
      icon: TrendingUp,
      title: 'XP Engine',
      description: 'Track your XP across qualification cycles. See your progress toward the next status level with actual vs projected calculations.',
      color: 'sky',
    },
    {
      icon: BarChart3,
      title: 'Miles Tracker',
      description: 'Monitor your miles balance, acquisition costs, and CPM metrics. Know exactly what your miles are worth.',
      color: 'amber',
    },
    {
      icon: Sparkles,
      title: 'Redemption Calculator',
      description: 'Evaluate award bookings by comparing CPM values. Maximize the value of every mile you spend.',
      color: 'emerald',
    },
    {
      icon: Zap,
      title: 'PDF Import',
      description: 'Import your flight history directly from Flying Blue statements in 7 languages. No manual data entry required.',
      color: 'purple',
    },
    {
      icon: Plane,
      title: 'Mileage Run Simulator',
      description: 'Plan strategic flights to reach your status goals. Find the best cost-per-XP routes from your home airport.',
      color: 'blue',
    },
    {
      icon: Crown,
      title: 'Ultimate Status Tracking',
      description: 'Dedicated UXP tracking for Platinum members pursuing Ultimate. Monitor both XP and UXP progress separately.',
      color: 'yellow',
    },
  ];

  const techStack = ['React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Vite', 'Vercel'];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
    };
    return colors[color] || colors.sky;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to SkyStatus
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-100 rounded-xl">
            <FileText className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">About SkyStatus</h1>
            <p className="text-slate-500">Your Flying Blue companion</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Why SkyStatus */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Why SkyStatus?</h2>
            <div className="space-y-4 text-slate-600">
              <p className="leading-relaxed">
                Flying Blue is great, but tracking your status progress shouldn't require a spreadsheet. 
                SkyStatus was built by a frequent flyer who wanted a better way to visualize XP progress, 
                understand mile valuations, and plan award redemptions.
              </p>
              <p className="leading-relaxed">
                Whether you're chasing Silver or maintaining Platinum, SkyStatus helps you stay on top 
                of your qualification cycle with real-time tracking and smart projections.
              </p>
              <p className="leading-relaxed">
                What started as a personal tool has grown into something used by <strong className="text-slate-900">200+ Flying Blue 
                members</strong> across Europe and beyond. Every feature has been shaped by real user 
                feedback from people who care about their status as much as you do.
              </p>
            </div>
          </div>

          {/* Social proof */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Trusted by the Community</h3>
            </div>
            <p className="text-slate-600">
              200+ Flying Blue members use SkyStatus to track their status qualification. 
              This ranges from casual travelers reaching for Silver to frequent flyers maintaining Ultimate.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => {
              const colors = getColorClasses(feature.color);
              return (
                <div 
                  key={feature.title}
                  className="bg-white rounded-xl border border-slate-200 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 ${colors.bg} rounded-lg`}>
                      <feature.icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <h3 className="font-bold text-slate-900">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Built With</h2>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span 
                  key={tech}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Privacy note */}
          <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-green-600">🔒</span>
              <h3 className="font-bold text-slate-900">Privacy First</h3>
            </div>
            <p className="text-slate-600 text-sm">
              Your PDF files are processed entirely in your browser. They never leave your device. 
              Use Local Mode for complete privacy, or sign in with Google to sync across devices. 
              Your data, your choice.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <span className="text-amber-600">💛</span>
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Independent Project</h3>
                <p className="text-sm text-amber-800">
                  SkyStatus is an independent project and is not affiliated with, endorsed by, or 
                  connected to Air France-KLM or the Flying Blue loyalty program. All trademarks 
                  belong to their respective owners.
                </p>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-slate-900">Feedback & Suggestions</h3>
            </div>
            <p className="text-slate-600 text-sm">
              SkyStatus is actively developed based on user feedback. Found a bug? Have an idea? 
              Use the feedback button in the app or reach out directly. Every suggestion helps 
              make SkyStatus better for everyone.
            </p>
          </div>

          {/* Version Info */}
          <div className="text-center text-sm text-slate-400">
            <p>SkyStatus Pro v{APP_VERSION}</p>
            <p className="mt-1">Made with ☕ in Amsterdam</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};

// ============================================
// CONTACT PAGE
// ============================================

import { submitFeedback } from '../lib/feedbackService';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const ContactPage: React.FC<LegalPageProps> = ({ onBack }) => {
  const [formData, setFormData] = React.useState({
    type: 'feedback',
    email: '',
    subject: '',
    message: '',
  });
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    
    try {
      // Format message with all details
      const fullMessage = [
        `**Contact Form - ${formData.type.toUpperCase()}**`,
        ``,
        `**Subject:** ${formData.subject}`,
        `**Email:** ${formData.email}`,
        ``,
        `**Message:**`,
        formData.message,
      ].join('\n');

      const success = await submitFeedback({
        trigger: 'contact_form',
        message: fullMessage,
        page: '/contact',
      });

      if (success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setSubmitStatus('error');
    }
  };

  const resetForm = () => {
    setFormData({ type: 'feedback', email: '', subject: '', message: '' });
    setSubmitStatus('idle');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to SkyStatus
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-100 rounded-xl">
            <Mail className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
            <p className="text-slate-500">We'd love to hear from you</p>
          </div>
        </div>

        {submitStatus === 'success' ? (
          /* Success State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h2>
            <p className="text-slate-600 mb-6">
              Thanks for reaching out. We'll get back to you as soon as possible.
            </p>
            <button
              onClick={resetForm}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Send another message
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Contact Options */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setFormData(prev => ({ ...prev, type: 'feedback' }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'feedback'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <svg className={`mx-auto mb-2 w-6 h-6 ${formData.type === 'feedback' ? 'text-brand-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className={`block font-medium text-sm ${formData.type === 'feedback' ? 'text-brand-700' : 'text-slate-600'}`}>
                  Feedback
                </span>
              </button>

              <button
                onClick={() => setFormData(prev => ({ ...prev, type: 'bug' }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'bug'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <svg className={`mx-auto mb-2 w-6 h-6 ${formData.type === 'bug' ? 'text-red-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className={`block font-medium text-sm ${formData.type === 'bug' ? 'text-red-700' : 'text-slate-600'}`}>
                  Report Bug
                </span>
              </button>

              <button
                onClick={() => setFormData(prev => ({ ...prev, type: 'question' }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'question'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <svg className={`mx-auto mb-2 w-6 h-6 ${formData.type === 'question' ? 'text-amber-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`block font-medium text-sm ${formData.type === 'question' ? 'text-amber-700' : 'text-slate-600'}`}>
                  Question
                </span>
              </button>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Your Email <span className="text-slate-400">(for reply)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="your@email.com"
                  disabled={submitStatus === 'submitting'}
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder={
                    formData.type === 'bug' 
                      ? 'Brief description of the issue' 
                      : formData.type === 'question'
                      ? 'What would you like to know?'
                      : "What's on your mind?"
                  }
                  disabled={submitStatus === 'submitting'}
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  placeholder={
                    formData.type === 'bug'
                      ? 'Please describe the issue in detail. Include steps to reproduce if possible.'
                      : 'Your message...'
                  }
                  disabled={submitStatus === 'submitting'}
                />
              </div>

              {/* Error message */}
              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={18} />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitStatus === 'submitting'}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitStatus === 'submitting' ? (
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
            </form>

            <p className="text-center text-sm text-slate-400">
              We typically respond within 24 hours.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};

// Cookie Policy Page
export const CookiePolicy: React.FC<LegalPageProps> = ({ onBack }) => {
  const lastUpdated = '16 December 2024';
  const [showContactModal, setShowContactModal] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to SkyStatus
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-100 rounded-xl">
            <Cookie className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cookie Policy</h1>
            <p className="text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. What Are Cookies?</h2>
            <p className="text-slate-600 leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. 
              They are widely used to make websites work more efficiently, provide a better user experience, 
              and give website owners information about how their site is being used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Cookies</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              SkyStatus uses cookies for different purposes. We categorize them as follows:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h3 className="font-bold text-emerald-800 mb-2">Strictly Necessary Cookies</h3>
                <p className="text-sm text-emerald-700 mb-2">
                  These cookies are essential for the website to function. They enable core functionality 
                  such as security, authentication, and accessibility. Without these cookies, the website 
                  cannot function properly.
                </p>
                <p className="text-xs text-emerald-600">
                  <strong>Examples:</strong> Authentication tokens, session identifiers, security preferences, 
                  cookie consent preferences.
                </p>
                <p className="text-xs text-emerald-800 font-semibold mt-2">
                  ✓ These cookies cannot be disabled.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-blue-800 mb-2">Functional Cookies</h3>
                <p className="text-sm text-blue-700 mb-2">
                  These cookies remember your preferences and settings to enhance your experience. 
                  Without these cookies, some features may not work optimally.
                </p>
                <p className="text-xs text-blue-600">
                  <strong>Examples:</strong> Currency preference (EUR, USD, GBP, CHF), home airport setting, 
                  display preferences, language settings.
                </p>
                <p className="text-xs text-blue-800 font-semibold mt-2">
                  ⚙️ You can disable these in Cookie Settings.
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="font-bold text-amber-800 mb-2">Analytics Cookies</h3>
                <p className="text-sm text-amber-700 mb-2">
                  These cookies help us understand how visitors interact with our website. 
                  All data is anonymized and used solely to improve SkyStatus.
                </p>
                <p className="text-xs text-amber-600">
                  <strong>Examples:</strong> Page views, feature usage statistics, error tracking, 
                  performance monitoring.
                </p>
                <p className="text-xs text-amber-800 font-semibold mt-2">
                  ⚙️ You can disable these in Cookie Settings.
                </p>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-700 mb-2">Marketing Cookies</h3>
                <p className="text-sm text-slate-600 mb-2">
                  These cookies are used to track visitors across websites for advertising purposes. 
                </p>
                <p className="text-xs text-slate-500">
                  <strong>Note:</strong> SkyStatus currently does not use any marketing or advertising cookies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Cookie Details</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Below is a detailed list of cookies we use:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Cookie Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Purpose</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Duration</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Type</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">skystatus_cookie_consent</td>
                    <td className="py-2 px-3">Stores your cookie preferences</td>
                    <td className="py-2 px-3">12 months</td>
                    <td className="py-2 px-3">Necessary</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 px-3">Authentication session (Supabase)</td>
                    <td className="py-2 px-3">Session</td>
                    <td className="py-2 px-3">Necessary</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">skystatus_local_*</td>
                    <td className="py-2 px-3">Local mode data storage</td>
                    <td className="py-2 px-3">Persistent</td>
                    <td className="py-2 px-3">Functional</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-blue-50/50">
                    <td className="py-2 px-3 font-mono text-xs">_ga</td>
                    <td className="py-2 px-3">Google Analytics - distinguishes users</td>
                    <td className="py-2 px-3">2 years</td>
                    <td className="py-2 px-3">Analytics</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-blue-50/50">
                    <td className="py-2 px-3 font-mono text-xs">_ga_*</td>
                    <td className="py-2 px-3">Google Analytics 4 - maintains session state</td>
                    <td className="py-2 px-3">2 years</td>
                    <td className="py-2 px-3">Analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-sm mt-3">
              <strong>Note:</strong> Analytics cookies (highlighted in blue) are only set after you give explicit consent. 
              You can opt out at any time via Cookie Settings in the footer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Managing Your Cookie Preferences</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have several options for managing cookies:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Cookie Settings:</strong> Click "Cookie Settings" in the footer to change your 
                  preferences at any time. Your choices will be saved for 12 months.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies 
                  through their settings. Note that blocking all cookies may affect website functionality.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Local Mode:</strong> Use SkyStatus in Local Mode to minimize data storage. 
                  In this mode, data is only stored in your browser and no cloud services are used.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Third-Party Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus uses the following third-party services that may set their own cookies:
            </p>
            <ul className="space-y-2 text-slate-600 mt-3">
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Supabase:</strong> For authentication and data storage. 
                  <a href="https://supabase.com/privacy" className="text-brand-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Supabase Privacy Policy
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Google Analytics 4:</strong> For website analytics (only with your consent). We use privacy-enhanced settings: 
                  IP anonymization enabled, Google Signals disabled, no advertising features.
                  <a href="https://policies.google.com/privacy" className="text-brand-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Google Privacy Policy
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>
                  <strong>Google Fonts:</strong> For typography. Google may collect anonymous usage data.
                  <a href="https://policies.google.com/privacy" className="text-brand-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Google Privacy Policy
                  </a>
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Rights Under GDPR</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you are located in the European Union, you have the following rights regarding cookies and personal data:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span><strong>Right to be informed:</strong> You have the right to know what cookies we use and why.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span><strong>Right to consent:</strong> Non-essential cookies are only set after you give explicit consent.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span><strong>Right to withdraw consent:</strong> You can change your cookie preferences at any time.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span><strong>Right to erasure:</strong> You can delete all cookies through your browser settings.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Updates to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or 
              for legal reasons. If we make significant changes, we will ask for your consent again. 
              The "Last updated" date at the top of this policy indicates when it was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <div className="mt-4">
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
              >
                <Mail size={18} />
                Contact Support
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
};
