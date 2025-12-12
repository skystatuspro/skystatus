import React from 'react';
import { ArrowLeft, Shield, FileText, Mail } from 'lucide-react';

interface LegalPageProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<LegalPageProps> = ({ onBack }) => {
  const lastUpdated = '11 December 2024';
  
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
              SkyStatus ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. 
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
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Data</h2>
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
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Storage & Security</h2>
            <p className="text-slate-600 leading-relaxed">
              Your data is stored securely using Supabase, a trusted cloud database provider with enterprise-grade security. 
              All data transmission is encrypted using TLS/SSL. We implement row-level security to ensure you can only 
              access your own data. We do not sell, share, or provide your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Local Mode</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus offers a "Local Mode" where your data is stored only in your browser's local storage and is never 
              sent to our servers. In this mode, we have no access to your data whatsoever. Note that local data is 
              lost if you clear your browser data or switch devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Rights (GDPR)</h2>
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
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus uses only essential cookies required for authentication and session management. 
              We do not use tracking cookies or third-party advertising cookies. If we add optional analytics 
              in the future, we will update this policy and request your consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Third-Party Services</h2>
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
                <span><strong>Vercel:</strong> Hosting and deployment (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Privacy Policy</a>)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, all your data 
              will be permanently removed from our servers within 30 days. Backup copies may persist for up to 90 days 
              for disaster recovery purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any significant changes 
              by posting the new policy on this page and updating the "Last updated" date. We encourage you to 
              review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this privacy policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 flex items-center gap-2 text-brand-600">
              <Mail size={18} />
              <a href="mailto:privacy@skystatus.pro" className="hover:underline">privacy@skystatus.pro</a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};

export const TermsOfService: React.FC<LegalPageProps> = ({ onBack }) => {
  const lastUpdated = '11 December 2024';
  
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
              these terms at any time, and your continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              SkyStatus is a personal tool for tracking Flying Blue loyalty program status, miles, and XP. 
              The Service allows you to import and manage flight data, calculate status progress, and analyze 
              your loyalty program performance. SkyStatus is an independent tool and is not affiliated with, 
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
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 flex items-center gap-2 text-brand-600">
              <Mail size={18} />
              <a href="mailto:support@skystatus.pro" className="hover:underline">support@skystatus.pro</a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};
