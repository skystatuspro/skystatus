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
  ExternalLink, 
  Route, 
  Settings, 
  Coins, 
  FileText,
} from 'lucide-react';
import { ContactModal } from './ContactModal';

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
  const [showContactModal, setShowContactModal] = useState(false);

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
    // SECTION 1: Getting Started
    {
      title: 'Getting Started',
      icon: <Award size={20} />,
      items: [
        {
          question: 'How do I get started with SkyStatus?',
          answer: (
            <>
              <p>When you first open SkyStatus, the <strong>onboarding wizard</strong> guides you through setup:</p>
              <ol className="list-decimal list-inside mt-2 space-y-2">
                <li><strong>Choose your home airport</strong> - Used for popular route suggestions</li>
                <li><strong>Select your currency</strong> - EUR, USD, GBP, or CHF for all cost displays</li>
                <li><strong>Import your Flying Blue data</strong> - Upload your PDF or enter manually</li>
              </ol>
              <p className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Tip:</strong> You can always re-run the onboarding wizard from Data Settings if you want to change these preferences.
              </p>
            </>
          )
        },
        {
          question: 'How do I enter my current status and XP?',
          answer: (
            <>
              <p>There are two ways to sync your Flying Blue status with SkyStatus:</p>
              <ol className="list-decimal list-inside mt-2 space-y-2">
                <li>
                  <strong>Import your Flying Blue PDF</strong> (recommended)<br/>
                  <span className="text-sm text-slate-500">
                    This automatically extracts all your flights, XP, and miles. Your status is detected from the PDF header.
                  </span>
                </li>
                <li>
                  <strong>Enter manually:</strong><br/>
                  <span className="text-sm text-slate-500">
                    Go to XP Engine → click the settings icon on your cycle → set your starting status and XP rollover.
                  </span>
                </li>
              </ol>
              <p className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Tip:</strong> Find your current XP on flyingblue.com under "My Account" → "XP Overview".
              </p>
            </>
          )
        },
        {
          question: 'How do I import my Flying Blue PDF?',
          answer: (
            <>
              <div className="p-3 bg-emerald-50 rounded-lg text-sm border border-emerald-200 mb-4">
                <strong className="text-emerald-800">🔒 Privacy First:</strong>
                <p className="text-emerald-700 mt-1">
                  Your PDF is processed <strong>entirely in your browser</strong>. We never receive, upload, or store your PDF file. All parsing happens locally on your device.
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm border border-blue-200 mb-4">
                <strong className="text-blue-800">🌍 Supported Languages:</strong>
                <p className="text-blue-700 mt-1">
                  The parser is optimized for <strong>Dutch, English, and French</strong> PDFs. You can change your language on Flying Blue before downloading your activity overview.
                </p>
              </div>
              <p><strong>Step 1: Download your PDF from Flying Blue</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Log in at <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">flyingblue.com</a></li>
                <li>Go to <strong>My Account</strong> → <strong>Activity overview</strong></li>
                <li className="text-amber-700 font-medium">
                  ⚠️ <strong>Important:</strong> Click the <strong>"More"</strong> button at the bottom repeatedly until ALL your activities are visible!
                </li>
                <li>Scroll back up and click the <strong>"Download"</strong> button</li>
              </ol>
              <p className="mt-3"><strong>Step 2: Import in SkyStatus</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Click "Import PDF" (on Dashboard or in Data Settings)</li>
                <li>Drag your PDF into the drop zone or click to select</li>
                <li>Review the extracted data and click "Import"</li>
              </ol>
              <p className="mt-3 p-3 bg-amber-50 rounded-lg text-sm border border-amber-200">
                <strong className="text-amber-800">💡 Smart Duplicate Detection:</strong>
                <span className="text-amber-700"> Each transaction gets a unique ID. Re-importing your PDF automatically skips entries you already have.</span>
              </p>
            </>
          )
        },
        {
          question: 'What are the different login modes?',
          answer: (
            <>
              <p>SkyStatus offers three ways to use the app:</p>
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">🔐 Account Mode (recommended)</div>
                  <p className="text-sm mt-1">Sign in with Google or Magic Link. Your data syncs across devices and is securely stored.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">🎮 Demo Mode</div>
                  <p className="text-sm mt-1">Explore SkyStatus with sample data. No account needed. Data resets when you leave.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">💾 Local Mode</div>
                  <p className="text-sm mt-1">Data stored only in your browser. Complete privacy, but no sync and data is lost if you clear your cache.</p>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'How do I use Demo Mode?',
          answer: (
            <>
              <p>Demo Mode lets you explore all SkyStatus features with sample data before entering your own.</p>
              <div className="mt-3">
                <strong>To enter Demo Mode:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>On the login screen, click <strong>"Try Demo"</strong></li>
                  <li>You'll see sample data for a fictional Flying Blue member</li>
                  <li>Explore all features freely. Nothing you do affects real data</li>
                </ol>
              </div>
              <div className="mt-4 p-3 bg-violet-50 rounded-lg text-sm border border-violet-200">
                <strong className="text-violet-800">🎭 Switch between status levels:</strong>
                <p className="text-violet-700 mt-1">
                  In Demo Mode, a purple bar appears at the bottom. Click <strong>Silver</strong>, <strong>Gold</strong>, <strong>Platinum</strong>, or <strong>Ultimate</strong> to instantly see how SkyStatus looks for each status level!
                </p>
              </div>
            </>
          )
        }
      ]
    },
    // SECTION 2: XP Engine
    {
      title: 'XP Engine',
      icon: <Target size={20} />,
      items: [
        {
          question: 'What is the XP Engine?',
          answer: (
            <>
              <p>The <strong>XP Engine</strong> is the heart of SkyStatus. It tracks your qualification cycle and shows:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Actual XP</strong> - XP from flights you've already taken</li>
                <li><strong>Projected XP</strong> - Including scheduled/future flights</li>
                <li><strong>Status progression</strong> - Visual timeline of your status journey</li>
                <li><strong>Ultimate tracking</strong> - UXP progress for Platinum members</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I configure my qualification cycle?',
          answer: (
            <>
              <p>Click the <strong>settings icon (⚙️)</strong> on your cycle card in XP Engine to access:</p>
              <div className="mt-3 space-y-2 text-sm">
                <div><strong>Starting Status:</strong> Your status at the beginning of this cycle (Explorer, Silver, Gold, Platinum, or Ultimate)</div>
                <div><strong>XP Rollover:</strong> XP carried over from your previous qualification year (max 300)</div>
                <div><strong>UXP Rollover:</strong> For Ultimate members, UXP carried over (max 900)</div>
                <div><strong>Cycle Start Month:</strong> When your qualification year began</div>
              </div>
            </>
          )
        },
        {
          question: 'What is the difference between Actual XP and Projected XP?',
          answer: (
            <>
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="font-semibold text-indigo-800">Actual XP</div>
                  <p className="text-sm text-indigo-700 mt-1">XP from flights you have already taken. This is what Flying Blue shows as your current XP.</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="font-semibold text-amber-800">Projected XP</div>
                  <p className="text-sm text-amber-700 mt-1">Includes XP from scheduled/future flights you've added. Helps you plan whether you'll reach your status goal.</p>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'How do I add manual XP corrections?',
          answer: (
            <>
              <p>If your XP doesn't match Flying Blue exactly, you can add corrections:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to <strong>XP Engine</strong></li>
                <li>Scroll to the <strong>Monthly XP Ledger</strong></li>
                <li>Find the month you want to correct and click the <strong>edit icon</strong></li>
                <li>Enter the correction amount (positive to add, negative to subtract)</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Use this for bonus XP from promotions, credit cards, or to fix small discrepancies.
              </p>
            </>
          )
        },
        {
          question: 'How does XP "payment" work on level-up?',
          answer: (
            <>
              <p>When you reach a status threshold, that XP amount is "consumed" and your qualification year <strong>resets</strong> immediately:</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span>Explorer → Silver</span>
                  <span className="font-mono">100 XP consumed</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span>Silver → Gold</span>
                  <span className="font-mono">180 XP consumed</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span>Gold → Platinum</span>
                  <span className="font-mono">300 XP consumed</span>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <strong>Example:</strong> You have 250 XP as Silver. You earn 80 XP (total 330). You level up to Gold, paying 180 XP. You keep 150 XP, and your new qualification year starts on the 1st of the next month.
              </p>
            </>
          )
        },
        {
          question: 'What is rollover XP?',
          answer: (
            <>
              <p>At the end of your qualification year, excess XP carries over to the next year:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Maximum XP rollover:</strong> 300 XP (for Silver, Gold, Platinum)</li>
                <li><strong>Maximum UXP rollover:</strong> 900 UXP (for Ultimate members)</li>
                <li><strong>UXP Cap:</strong> Total UXP balance cannot exceed 1800 UXP</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                Example: You end the year with 450 XP as Platinum. You roll over 300 XP (the maximum) to start your next year.
              </p>
            </>
          )
        },
        {
          question: 'What is soft landing?',
          answer: (
            <>
              <p>Flying Blue has a "soft landing" rule. If you fail to requalify, <strong>you only drop one status level per year</strong>.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Platinum → Gold</li>
                <li>Gold → Silver</li>
                <li>Silver → Explorer</li>
              </ul>
              <p className="mt-3 p-3 bg-violet-50 rounded-lg text-sm text-violet-800">
                <strong>👑 Ultimate Exception:</strong> If you are Ultimate and fail to reach 900 UXP, you drop to <strong>Platinum</strong> (never lower). This ensures your Platinum for Life streak remains unbroken.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 3: XP Run Simulator
    {
      title: 'XP Run Simulator',
      icon: <Route size={20} />,
      items: [
        {
          question: 'What is the XP Run Simulator?',
          answer: (
            <>
              <p>The <strong>XP Run Simulator</strong> helps you plan mileage runs to reach your status goals. It calculates:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>XP earned for any route and cabin class</li>
                <li>Cost per XP (efficiency analysis)</li>
                <li>Status projection after the run</li>
                <li>Multi-segment routes with stopover options</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I use the XP Run Simulator?',
          answer: (
            <>
              <p><strong>Basic usage:</strong></p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter your route as airport codes: <code className="bg-slate-100 px-1 rounded">AMS CDG BKK</code></li>
                <li>Select your base cabin class</li>
                <li>Toggle "Return" if you're flying round-trip</li>
                <li>Enter the total cost to see efficiency metrics</li>
              </ol>
            </>
          )
        },
        {
          question: 'How do I change cabin class for individual segments?',
          answer: (
            <>
              <p>Each segment can have a different cabin class:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter your route to generate segments</li>
                <li>In the <strong>Segment Breakdown</strong> section, find the segment you want to change</li>
                <li>Click the <strong>cabin class dropdown</strong> next to that segment</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Useful when you're flying Business outbound but Economy on the return.
              </p>
            </>
          )
        },
        {
          question: 'What are the distance bands?',
          answer: (
            <>
              <p>XP is based on flight distance (marketed by Flying Blue) and cabin class:</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-slate-50 rounded">Short: &lt; 500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Medium: 500-2000 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 1: 2000-3500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 2: 3500-5000 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 3: &gt; 5000 mi</div>
              </div>
              <p className="mt-3 text-sm">
                <strong>XP Multipliers:</strong> Economy (1x), Premium Economy (2x), Business (3x), First (5x).
              </p>
            </>
          )
        },
        {
          question: 'What is Classic Mode vs Optimizer Mode?',
          answer: (
            <>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">Classic Mode</div>
                  <p className="text-sm mt-1">Calculates <strong>total cost ÷ total XP</strong>. Simple efficiency metric for the entire trip.</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="font-semibold text-indigo-800">Optimizer Mode</div>
                  <p className="text-sm mt-1">Calculates <strong>marginal cost ÷ marginal XP</strong>. Shows the cost of upgrading from Economy. This is useful for deciding whether to pay for a higher cabin.</p>
                </div>
              </div>
            </>
          )
        }
      ]
    },
    // SECTION 4: Flights & Data
    {
      title: 'Flights & Data',
      icon: <Plane size={20} />,
      items: [
        {
          question: 'How do I add flights manually?',
          answer: (
            <>
              <p>Go to <strong>Add Flight</strong> from the menu:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter the <strong>flight date</strong></li>
                <li>Enter <strong>route</strong> (e.g., AMS-CDG)</li>
                <li>Select <strong>airline</strong> (KL, AF, or partner)</li>
                <li>Choose <strong>cabin class</strong></li>
                <li>Mark as <strong>flown</strong> or <strong>scheduled</strong></li>
              </ol>
            </>
          )
        },
        {
          question: 'How do I edit or delete flights?',
          answer: (
            <>
              <p>In the <strong>Flight Ledger</strong> (visible on Add Flight page):</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Edit:</strong> Click the pencil icon on any flight to modify details</li>
                <li><strong>Delete:</strong> Click the trash icon to remove a flight</li>
                <li><strong>Toggle status:</strong> Click the checkbox to switch between flown/scheduled</li>
              </ul>
            </>
          )
        },
        {
          question: 'What is the difference between KL/AF and partner flights?',
          answer: (
            <>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-blue-800">KLM (KL) & Air France (AF)</div>
                  <p className="text-sm text-blue-700 mt-1">Earn both XP and UXP. UXP counts toward Ultimate status.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">Partner Airlines</div>
                  <p className="text-sm text-slate-600 mt-1">Earn XP only, not UXP. Partners include Delta, Kenya Airways, SkyTeam members, etc.</p>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <strong>Important:</strong> If you're aiming for Ultimate, focus on KL/AF flights!
              </p>
            </>
          )
        },
        {
          question: "Why doesn't my XP match exactly with Flying Blue?",
          answer: (
            <>
              <p>Small differences can occur due to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Timing:</strong> Flying Blue sometimes processes flights with a delay</li>
                <li><strong>Bonus XP:</strong> Promotions or challenges not reflected in imports</li>
                <li><strong>Distance overrides:</strong> Some routes have special XP values</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Solution:</strong> Use the manual ledger in XP Engine to add corrections.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 5: Miles & Redemptions
    {
      title: 'Miles & Redemptions',
      icon: <Coins size={20} />,
      items: [
        {
          question: 'How do I track my miles balance?',
          answer: (
            <>
              <p>The <strong>Miles Engine</strong> tracks your award miles:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>View monthly breakdown of earned and spent miles</li>
                <li>See cumulative balance over time</li>
                <li>Track cost-per-mile for purchases</li>
              </ul>
            </>
          )
        },
        {
          question: 'What is the Redemption Calculator?',
          answer: (
            <>
              <p>The <strong>Redemption Calculator</strong> helps you analyze the value of award bookings by comparing the miles used + taxes against the cash price of a ticket.</p>
              <p className="mt-3 text-sm">
                <strong>Value guide:</strong> &lt;1.0¢ = Poor, 1.0-1.5¢ = Fair, 1.5-2.5¢ = Good, &gt;2.5¢ = Excellent
              </p>
            </>
          )
        },
        {
          question: 'How is cost-per-mile calculated?',
          answer: (
            <>
              <p><strong>Formula:</strong> Total costs ÷ Total miles earned</p>
              <p className="mt-2 text-sm">
                <strong>Example:</strong> You spent €1,200 on flights and earned 100,000 miles. 
                Your CPM = €1,200 / 100,000 = 1.2 cents per mile.
              </p>
            </>
          )
        }
      ]
    },
    // SECTION 6: Data Settings
    {
      title: 'Data Settings',
      icon: <Settings size={20} />,
      items: [
        {
          question: 'How do I access Data Settings?',
          answer: (
            <>
              <p>Click the <strong>gear icon (⚙️)</strong> in the sidebar or header. You can import PDF, export/import JSON backups, change currency, or reset data.</p>
            </>
          )
        },
        {
          question: 'How do I change my currency?',
          answer: (
            <>
              <p>In <strong>Data Settings</strong>, select from EUR (€), USD ($), GBP (£), or CHF. Note: This changes the display symbol but does not convert existing numerical values.</p>
            </>
          )
        },
        {
          question: 'How do I export/import my data?',
          answer: (
            <>
              <p>Use the <strong>Export JSON</strong> and <strong>Import JSON</strong> buttons in Data Settings to backup your data or transfer it between devices.</p>
            </>
          )
        },
        {
          question: 'What does "Start Over" do?',
          answer: (
            <>
              <p><strong>"Start Over"</strong> deletes all your flights, miles, XP data, and settings, returning you to the welcome screen. This cannot be undone.</p>
            </>
          )
        },
        {
          question: 'What is the email consent toggle?',
          answer: (
            <>
              <p>This controls whether we can contact you about features and updates. Your email is never shared with third parties.</p>
            </>
          )
        }
      ]
    },
    // SECTION 7: Flying Blue Basics
    {
      title: 'Flying Blue Basics',
      icon: <Award size={20} />,
      items: [
        {
          question: 'What are the Flying Blue status levels?',
          answer: (
            <>
              <div className="space-y-3 mt-2">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="font-semibold text-slate-800">Explorer (0 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>Base level for all members</li>
                    <li>4x Miles on eligible flights</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-800">Silver (100 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>6x Miles on eligible flights</li>
                    <li>1 extra checked bag, SkyTeam Elite benefits</li>
                  </ul>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <div className="font-semibold text-amber-800">Gold (180 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>7x Miles on eligible flights</li>
                    <li>Lounge access + 1 guest</li>
                    <li>SkyPriority</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-700 text-white rounded-lg">
                  <div className="font-semibold">Platinum (300 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>8x Miles on eligible flights</li>
                    <li>Platinum Service Line, Platinum for Life eligibility</li>
                    <li>Start earning UXP toward Ultimate</li>
                  </ul>
                </div>
                <div className="p-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg">
                  <div className="font-semibold">Ultimate (300 XP + 900 UXP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>Requires 900 UXP in one cycle</li>
                    <li>4 free upgrade vouchers per year</li>
                    <li>Platinum card for 1 companion</li>
                  </ul>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'What is the difference between XP and Miles?',
          answer: (
            <>
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="font-semibold text-indigo-800">XP (Experience Points)</div>
                  <p className="text-sm text-indigo-700 mt-1">Determines your status level. Resets each qualification year (excess rolls over, max 300).</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="font-semibold text-emerald-800">Miles (Award Miles)</div>
                  <p className="text-sm text-emerald-700 mt-1">Reward currency for free flights and upgrades. Accumulates over time.</p>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'What is UXP?',
          answer: (
            <>
              <p><strong>UXP (Ultimate XP)</strong> is a special counter that runs alongside regular XP. It determines if you reach Ultimate status.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Earned on:</strong> KLM and Air France operated flights (and SAF purchases).</li>
                <li><strong>NOT Earned on:</strong> Partner flights (Delta, etc.) or Transavia.</li>
              </ul>
              <p className="mt-3">
                <strong>Key points:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>Every UXP is also an XP, but not every XP is a UXP.</li>
                <li>To reach Ultimate, you need 900 UXP within your qualification year.</li>
                <li>You typically need to be Platinum to start qualifying for Ultimate.</li>
              </ul>
            </>
          )
        },
        {
          question: 'How does Platinum for Life work?',
          answer: (
            <>
              <p>If you maintain <strong>Platinum or Ultimate</strong> status for <strong>10 consecutive years</strong>, you become Platinum for Life.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You no longer need to earn XP to maintain Platinum status.</li>
                <li>Ultimate years count towards the 10-year goal.</li>
                <li><strong>Crucial:</strong> Because Ultimate members always soft-land to Platinum, achieving Ultimate guarantees your streak remains unbroken for at least one more year.</li>
              </ul>
            </>
          )
        },
        {
          question: 'What is a qualification year?',
          answer: (
            <>
              <p>Your personal 12-month period for earning XP. It is dynamic:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Level Up:</strong> If you gain enough XP to upgrade status, your cycle <strong>resets immediately</strong>. Your new year starts the 1st day of the next month.</li>
                <li><strong>Requalification:</strong> If you maintain status, your cycle dates stay the same.</li>
              </ul>
            </>
          )
        }
      ]
    },
    // SECTION 8: Data & Privacy
    {
      title: 'Data & Privacy',
      icon: <Shield size={20} />,
      items: [
        {
          question: 'Is my data safe?',
          answer: (
            <>
              <p>Yes. SkyStatus is built with privacy as a priority:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Data stored encrypted in Supabase (SOC2 compliant)</li>
                <li>All connections secured with TLS/SSL</li>
                <li>Row-level security ensures you only see your own data</li>
                <li>We never sell or share your data with third parties</li>
                <li>You can export or delete your data anytime</li>
              </ul>
              <p className="mt-2">
                Read our full <a href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>.
              </p>
            </>
          )
        },
        {
          question: 'Can I use SkyStatus without an account?',
          answer: (
            <>
              <p><strong>Yes!</strong> SkyStatus offers <strong>Local Mode</strong>:</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>No account required</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Data never leaves your device</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <strong className="text-blue-800">💡 Protect your data with Export/Import:</strong>
                <p className="mt-2 text-blue-700">
                  You can always save your data as a JSON file via <strong>Data Settings</strong> → <strong>Export Data</strong> and restore it later.
                </p>
              </div>
            </>
          )
        }
      ]
    },
    // SECTION 9: Troubleshooting
    {
      title: 'Troubleshooting',
      icon: <FileText size={20} />,
      items: [
        {
          question: 'My PDF import failed. What should I do?',
          answer: (
            <>
              <p>Common causes and solutions:</p>
              <ul className="list-disc list-inside mt-2 space-y-2">
                <li>
                  <strong>Wrong PDF:</strong> Make sure you're importing the Flying Blue activity PDF, not a booking confirmation or ticket.
                </li>
                <li>
                  <strong>Incomplete data:</strong> Did you click "More" on Flying Blue to load all activities before downloading?
                </li>
                <li>
                  <strong>Language:</strong> The parser is optimized for <strong>Dutch, English, and French</strong> PDFs. Other languages may not parse correctly. You can change your language on Flying Blue before downloading.
                </li>
                <li>
                  <strong>Corrupted file:</strong> Try downloading the PDF again from Flying Blue.
                </li>
              </ul>
              <p className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Tip:</strong> If you're having trouble, try switching your Flying Blue account to English or Dutch before downloading the PDF.
              </p>
            </>
          )
        },
        {
          question: 'Data is not syncing between devices',
          answer: (
            <>
              <p>Make sure you are logged in with the same account on both devices. Local Mode data does not sync. Changes usually sync within a few seconds.</p>
            </>
          )
        },
        {
          question: 'How do I report a bug?',
          answer: (
            <>
              <p>Click the <strong>Bug Report</strong> button in the sidebar (or footer on mobile). Describe what happened, what you expected, and include any error messages.</p>
              <p className="mt-2 text-sm text-slate-500">
                You can also <button onClick={() => setShowContactModal(true)} className="text-brand-600 hover:underline font-medium">contact support</button> directly.
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
            <p className="text-slate-500">Everything you need to know about SkyStatus</p>
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
          <button
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            Contact Support
          </button>
        </div>

        {/* Contact Modal */}
        <ContactModal 
          isOpen={showContactModal} 
          onClose={() => setShowContactModal(false)} 
        />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.
        </div>
      </div>
    </div>
  );
};
