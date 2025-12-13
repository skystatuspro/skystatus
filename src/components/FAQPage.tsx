import React, { useState } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Plane,
  Award,
  Calculator,
  Shield,
  Target,
  ExternalLink
} from 'lucide-react';

interface FAQPageProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const FAQAccordion: React.FC<{ item: FAQItem; isOpen: boolean; onToggle: () => void }> = ({ 
  item, 
  isOpen, 
  onToggle 
}) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-slate-50 transition-colors"
    >
      <span className="font-semibold text-slate-900 pr-4">{item.question}</span>
      {isOpen ? (
        <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
      ) : (
        <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
      )}
    </button>
    {isOpen && (
      <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
        <div className="pt-4 text-slate-600 leading-relaxed prose prose-sm max-w-none">
          {item.answer}
        </div>
      </div>
    )}
  </div>
);

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  const faqSections: FAQSection[] = [
    // SECTION 1: Using SkyStatus (most important - how to use the product)
    {
      title: 'Using SkyStatus',
      icon: <Award size={20} />,
      items: [
        {
          question: 'How do I enter my current status and XP?',
          answer: (
            <>
              <p>
                To match your current Flying Blue status with SkyStatus:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-2">
                <li>
                  <strong>Import your Flying Blue PDF</strong> (recommended)<br/>
                  <span className="text-sm text-slate-500">
                    This automatically extracts all your flights, XP, and miles. Go to Flying Blue → 
                    My Account → Activity overview → click "More" until all activities load → Download.
                  </span>
                </li>
                <li>
                  <strong>Or enter manually:</strong><br/>
                  <span className="text-sm text-slate-500">
                    Go to XP Qualification → set your cycle start month → enter your current XP 
                    balance as "rollover XP" for that start month.
                  </span>
                </li>
              </ol>
              <p className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Tip:</strong> You can find your current XP on flyingblue.com under "My Account". 
                This is the number you enter as rollover at your cycle start date.
              </p>
            </>
          )
        },
        {
          question: 'How do I set my qualification cycle start date?',
          answer: (
            <>
              <p>
                You can find your cycle start month on flyingblue.com — it's the month when your current 
                status began.
              </p>
              <p className="mt-2"><strong>In SkyStatus:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to XP Qualification</li>
                <li>Look at "Qualification Cycle"</li>
                <li>Adjust the start month to match your cycle start</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                If you don't know this: check on Flying Blue when your current status expires and 
                count back 12 months.
              </p>
            </>
          )
        },
        {
          question: 'How do I import my Flying Blue PDF?',
          answer: (
            <>
              <p><strong>Step 1: Download your PDF from Flying Blue</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Log in at <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">flyingblue.com</a></li>
                <li>Go to <strong>My Account</strong> → <strong>Activity overview</strong></li>
                <li className="text-amber-700 font-medium">
                  ⚠️ <strong>Important:</strong> Click the <strong>"More"</strong> button at the bottom repeatedly until ALL your activities are visible. Flying Blue only downloads what's currently displayed on screen!
                </li>
                <li>Scroll back up and click the <strong>"Download"</strong> button to save the PDF</li>
              </ol>
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm border border-amber-200">
                <strong className="text-amber-800">Why is this important?</strong>
                <p className="text-amber-700 mt-1">
                  Flying Blue uses "lazy loading" — it only shows recent activities at first. If you don't click "More" to load everything, your downloaded PDF will only contain a few months of data, and your flight history in SkyStatus will be incomplete.
                </p>
              </div>
              <p className="mt-3"><strong>Step 2: Import in SkyStatus</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Click "Import PDF" (Dashboard or Add Flight page)</li>
                <li>Drag your PDF into the field or click to select</li>
                <li>Review the preview and click "Import"</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                SkyStatus automatically extracts all your flights, miles, and XP from the PDF.
              </p>
            </>
          )
        },
        {
          question: "Why doesn't my XP match exactly with Flying Blue?",
          answer: (
            <>
              <p>There may be small differences due to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Timing:</strong> Flying Blue sometimes processes flights with a delay</li>
                <li><strong>Bonus XP:</strong> Promotions or challenges not shown in the PDF</li>
                <li><strong>Rounding:</strong> Small rounding differences in calculations</li>
                <li><strong>Partner flights:</strong> XP from some partners may differ</li>
              </ul>
              <p className="mt-2">
                <strong>Solution:</strong> Use the correction function in XP Qualification to 
                manually adjust small differences.
              </p>
            </>
          )
        },
        {
          question: 'Does SkyStatus support Ultimate status tracking?',
          answer: (
            <>
              <p>
                <strong>Yes! SkyStatus fully supports Ultimate status tracking.</strong>
              </p>
              <p className="mt-2">
                Here's what's included:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>UXP is automatically calculated from KLM/AF flights</li>
                <li>SAF XP is tracked separately</li>
                <li>Ultimate Requalification section in Risk Monitor (900 UXP target)</li>
                <li>UXP Rollover Forecast with correct 900 UXP cap</li>
                <li>UXP Waste indicator based on 1800 total cap</li>
                <li>Dual XP/UXP rollover inputs in cycle settings</li>
                <li>Ultimate Cycle Type toggle (Qualification vs Calendar year)</li>
              </ul>
              <p className="mt-3">
                <strong>To set up:</strong> Go to XP Engine → Edit your cycle settings → Select "Ultimate" as your starting status and enter your UXP rollover balance.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 2: Qualification Cycle (the mechanics)
    {
      title: 'Qualification Cycle',
      icon: <Target size={20} />,
      items: [
        {
          question: 'What is a qualification year and when does it start?',
          answer: (
            <>
              <p>
                Your qualification year is the 12-month period during which you earn XP for your status. 
                Everyone has a <em>personal</em> qualification year.
              </p>
              <p className="mt-2"><strong>It starts:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>For new members: when you earn your first XP</li>
                <li>After a level-up: the first day of the following month</li>
                <li>After requalification: stays the same as before</li>
              </ul>
              <p className="mt-2">
                <strong>Example:</strong> You reach Gold on May 15 → your new qualification year runs 
                from June 1 through May 31 next year.
              </p>
            </>
          )
        },
        {
          question: 'How does the XP "payment" mechanism work on level-up?',
          answer: (
            <>
              <p>
                When you have enough XP for a higher level, the threshold is "paid" 
                (deducted) from your balance. The rest remains.
              </p>
              <p className="mt-2"><strong>The thresholds:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Explorer → Silver: 100 XP</li>
                <li>Silver → Gold: 180 XP</li>
                <li>Gold → Platinum: 300 XP</li>
              </ul>
              <p className="mt-2"><strong>Example:</strong></p>
              <p className="mt-1 p-3 bg-slate-100 rounded-lg text-sm">
                You have 250 XP as Silver and fly a trip worth 50 XP.<br/>
                → New balance: 300 XP<br/>
                → Gold threshold (180 XP) is paid<br/>
                → You become Gold with 120 XP remaining
              </p>
            </>
          )
        },
        {
          question: 'What happens if I reach a higher status mid-year?',
          answer: (
            <>
              <p>
                On a level-up, a <em>new</em> qualification year starts on the first day of the following month.
              </p>
              <p className="mt-2"><strong>Example:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Your qualification year runs until October 31</li>
                <li>On May 3 you reach Gold</li>
                <li>Your new qualification year becomes June 1 through May 31</li>
              </ul>
              <p className="mt-2">
                <strong>Note:</strong> This only applies to XP levels (Silver, Gold, Platinum). 
                Ultimate does not change your qualification year — it's a layer on top of Platinum.
              </p>
            </>
          )
        },
        {
          question: 'What is rollover XP and how much can I carry over?',
          answer: (
            <>
              <p>
                Rollover XP is the balance you have left after requalification that carries over to your next year.
              </p>
              <p className="mt-2"><strong>Rules:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>First, the threshold for your current status is deducted</li>
                <li>What remains is your rollover</li>
                <li>Maximum rollover: <strong>300 XP</strong></li>
                <li>Anything above 300 XP is lost</li>
              </ul>
              <p className="mt-2"><strong>Example:</strong></p>
              <p className="mt-1 p-3 bg-slate-100 rounded-lg text-sm">
                You end as Platinum with 470 XP<br/>
                → Pay 300 XP for requalification<br/>
                → Rollover: 170 XP (under the cap)<br/>
                → Start new year as Platinum with 170 XP
              </p>
              <p className="mt-2 text-sm text-slate-500">
                For UXP, a separate rollover of max 900 UXP applies.
              </p>
            </>
          )
        },
        {
          question: 'What is soft landing?',
          answer: (
            <>
              <p>
                Soft landing means you can only drop <strong>one level per year</strong> if you 
                don't have enough XP to requalify.
              </p>
              <p className="mt-2"><strong>Examples:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Platinum without 300 XP → drops to Gold (not Silver)</li>
                <li>Gold without 180 XP → drops to Silver</li>
                <li>Silver without 100 XP → drops to Explorer</li>
              </ul>
              <p className="mt-2"><strong>Special rule for Ultimate:</strong></p>
              <p className="mt-1">
                If you're Ultimate but don't earn 900 UXP, you always drop back to Platinum 
                (not further). Even if you earned 0 XP. From the following year, normal XP rules 
                apply again.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 3: Miles & Value
    {
      title: 'Miles & Value',
      icon: <Calculator size={20} />,
      items: [
        {
          question: 'How is cost-per-mile calculated?',
          answer: (
            <>
              <p>
                Cost-per-mile (CPM) is how much you pay per mile earned.
              </p>
              <p className="mt-2"><strong>Formula:</strong></p>
              <p className="mt-1 p-3 bg-slate-100 rounded-lg font-mono text-sm">
                CPM = Total costs / Total miles earned
              </p>
              <p className="mt-2"><strong>Example:</strong></p>
              <p className="mt-1 text-sm">
                You spend €1,200 on flights and Amex fees and earn 100,000 miles.<br/>
                → CPM = €1,200 / 100,000 = €0.012 = 1.2 cents per mile
              </p>
              <p className="mt-2 text-sm text-slate-500">
                A lower CPM is better — you're paying less per mile.
              </p>
            </>
          )
        },
        {
          question: 'What is a good redemption value?',
          answer: (
            <>
              <p>
                Redemption value is how much your miles are "worth" when redeeming.
              </p>
              <p className="mt-2"><strong>Rule of thumb:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><span className="text-red-600">{'<'} 1.0 cent/mile:</span> Poor value</li>
                <li><span className="text-amber-600">1.0 - 1.5 cent/mile:</span> Average</li>
                <li><span className="text-emerald-600">1.5 - 2.5 cent/mile:</span> Good</li>
                <li><span className="text-emerald-700">{'>'} 2.5 cent/mile:</span> Excellent</li>
              </ul>
              <p className="mt-2"><strong>Calculation:</strong></p>
              <p className="mt-1 p-3 bg-slate-100 rounded-lg font-mono text-sm">
                Value = (Cash price - Taxes) / Miles used × 100
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Business class tickets often give the best value, economy the worst.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 4: Flying Blue Basics (for those who need a refresher)
    {
      title: 'Flying Blue Basics',
      icon: <Plane size={20} />,
      items: [
        {
          question: 'What is Flying Blue?',
          answer: (
            <>
              <p>
                Flying Blue is the loyalty program of Air France and KLM. As a member, you earn Miles 
                when flying and with partners, which you can redeem for flights, upgrades, and more.
              </p>
              <p className="mt-2">
                You also earn Experience Points (XP) which determine your status level, unlocking 
                benefits like lounge access, extra baggage, and priority services.
              </p>
            </>
          )
        },
        {
          question: 'What status levels are there?',
          answer: (
            <>
              <p>Flying Blue has four main levels, plus Ultimate as an extra tier on top of Platinum:</p>
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="font-semibold text-slate-700">Explorer (base)</div>
                  <div className="text-sm text-slate-500">4x Miles per €1 • Entry level for everyone</div>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="font-semibold text-gray-700">Silver (100 XP)</div>
                  <div className="text-sm text-gray-500">6x Miles • 1 extra bag • Priority check-in • SkyTeam Elite</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="font-semibold text-amber-700">Gold (180 XP)</div>
                  <div className="text-sm text-amber-600">7x Miles • Lounge + 1 guest • SkyPriority • SkyTeam Elite Plus</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                  <div className="font-semibold text-slate-700">Platinum (300 XP)</div>
                  <div className="text-sm text-slate-500">8x Miles • 2 extra bags • All seats free • 24/7 Platinum Line</div>
                  <div className="text-xs text-slate-400 mt-1">Start earning UXP toward Ultimate</div>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-100 to-amber-50 rounded-lg border border-amber-200">
                  <div className="font-semibold text-slate-800">Ultimate (900 UXP as Platinum)</div>
                  <div className="text-sm text-slate-600">9x Miles • Lounge + 8 guests • 4 upgrade vouchers • Ultimate Assistant</div>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'What is the difference between XP and Miles?',
          answer: (
            <>
              <p><strong>Miles</strong> are your reward currency:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Earned on flights, credit cards, partners</li>
                <li>Can be redeemed for flights, upgrades, products</li>
                <li>Don't expire as long as you stay active</li>
              </ul>
              <p className="mt-3"><strong>XP (Experience Points)</strong> determine your status:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Earned only on qualifying flights and certain activities</li>
                <li>Determine whether you become Silver, Gold, or Platinum</li>
                <li>Reset (partially) at the end of your qualification year</li>
              </ul>
            </>
          )
        },
        {
          question: 'What is UXP and how does it differ from XP?',
          answer: (
            <>
              <p>
                <strong>UXP (Ultimate XP)</strong> is a special type of XP that only counts toward Ultimate status.
              </p>
              <p className="mt-2"><strong>Key differences:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>UXP is earned <em>only</em> on KLM and Air France flights</li>
                <li>SAF (Sustainable Aviation Fuel) purchases with KL/AF also give UXP</li>
                <li>Every UXP also counts as XP, but not all XP is UXP</li>
                <li>Partner flights (Delta, SkyTeam, etc.) give XP but no UXP</li>
              </ul>
              <p className="mt-2">
                You need 900 UXP in one qualification year to reach Ultimate (while being Platinum).
              </p>
            </>
          )
        },
        {
          question: 'What is Ultimate status and how do you reach it?',
          answer: (
            <>
              <p>
                Ultimate is the highest status within Flying Blue, an extra tier on top of Platinum.
              </p>
              <p className="mt-2"><strong>Requirements:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>You must have Platinum status</li>
                <li>You must earn 900 UXP in one qualification year</li>
                <li>UXP comes only from KLM/Air France flights and SAF</li>
              </ul>
              <p className="mt-2"><strong>Extra benefits vs. Platinum:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Lounge access for up to 8 travel companions</li>
                <li>4 free upgrade vouchers per year</li>
                <li>Ultimate Assistant (personal 24/7 service)</li>
                <li>Platinum card for 1 travel companion</li>
              </ul>
            </>
          )
        },
        {
          question: 'What benefits do I get per status level?',
          answer: (
            <>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-slate-700">Explorer</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>4 Miles per €1 spent</li>
                    <li>10% discount on seat selection</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">Silver</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>6 Miles per €1 spent</li>
                    <li>1 extra bag on KLM/AF and partners</li>
                    <li>Priority check-in and baggage drop-off</li>
                    <li>Premium Service Line</li>
                    <li>SkyTeam Elite status</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-700">Gold</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>7 Miles per €1 spent</li>
                    <li>Free lounge access with 1 guest (750+ lounges)</li>
                    <li>SkyPriority throughout the airport</li>
                    <li>Priority baggage handling</li>
                    <li>Guaranteed seat on full long-haul flights</li>
                    <li>SkyTeam Elite Plus status</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Platinum</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>8 Miles per €1 spent</li>
                    <li>2 extra bags</li>
                    <li>All seats free (incl. exit rows)</li>
                    <li>Platinum Service Line 24/7</li>
                    <li>Possible upgrades to La Première</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Ultimate</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>Lounge access for up to 8 travel companions</li>
                    <li>SkyPriority for all your travel companions</li>
                    <li>Ultimate Assistant 24/7</li>
                    <li>4 free one-cabin upgrade vouchers per year</li>
                    <li>Platinum card for 1 travel companion</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <a 
                  href="https://www.flyingblue.com/en/programme/more-info/tier-benefits" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  Full list on flyingblue.com <ExternalLink size={14} />
                </a>
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 5: Data & Privacy (always last)
    {
      title: 'Data & Privacy',
      icon: <Shield size={20} />,
      items: [
        {
          question: 'Is my data safe?',
          answer: (
            <>
              <p>
                Yes. SkyStatus is built with privacy as a priority:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Data is stored encrypted (Supabase)</li>
                <li>All connections are secured with TLS/SSL</li>
                <li>Row-level security ensures you only see your own data</li>
                <li>We never sell or share your data with third parties</li>
                <li>You can always export or delete your data</li>
              </ul>
              <p className="mt-2">
                Read our full <a href="#/privacy" className="text-brand-600 hover:underline">Privacy Policy</a> for more details.
              </p>
            </>
          )
        },
        {
          question: 'Can I use SkyStatus without an account?',
          answer: (
            <>
              <p>
                <strong>Yes!</strong> SkyStatus offers a "Local Mode" where your data is stored 
                only in your browser.
              </p>
              <p className="mt-2"><strong>Advantages of Local Mode:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>No account needed</li>
                <li>Data never leaves your device</li>
                <li>Complete privacy</li>
              </ul>
              <p className="mt-2"><strong>Disadvantages:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Data disappears when browser cache is cleared</li>
                <li>No sync between devices</li>
                <li>You need to make your own backups via Export</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I export or delete my data?',
          answer: (
            <>
              <p><strong>Export data:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to Data Settings (gear icon)</li>
                <li>Click "Export JSON"</li>
                <li>Save the file</li>
              </ol>
              <p className="mt-3"><strong>Delete data:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to Data Settings</li>
                <li>Scroll to "Danger Zone"</li>
                <li>Click "Delete All Data"</li>
                <li>Confirm the deletion</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                After deletion, your data is permanently gone and cannot be recovered.
              </p>
            </>
          )
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
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
            <HelpCircle className="text-brand-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Help & FAQ</h1>
            <p className="text-slate-500">Frequently asked questions about Flying Blue and SkyStatus</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-4">Jump to topic</h2>
          <div className="flex flex-wrap gap-2">
            {faqSections.map((section, index) => (
              <a
                key={index}
                href={`#section-${index}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
              >
                {section.icon}
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} id={`section-${sectionIndex}`} className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
              </div>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => {
                  const itemId = `${sectionIndex}-${itemIndex}`;
                  return (
                    <FAQAccordion
                      key={itemId}
                      item={item}
                      isOpen={openItems.has(itemId)}
                      onToggle={() => toggleItem(itemId)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 bg-gradient-to-br from-brand-500 to-blue-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-white/80 mb-6">
            Get in touch and we'll be happy to help.
          </p>
          <a
            href="mailto:support@skystatus.pro"
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};
