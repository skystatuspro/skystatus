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
                <li><strong>Choose your home airport</strong> — Used for popular route suggestions</li>
                <li><strong>Select your currency</strong> — EUR, USD, GBP, or CHF for all cost displays</li>
                <li><strong>Import your Flying Blue data</strong> — Upload your PDF or enter manually</li>
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
              <p><strong>Step 1: Download your PDF from Flying Blue</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Log in at <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">flyingblue.com</a></li>
                <li>Go to <strong>My Account</strong> → <strong>Activity overview</strong></li>
                <li className="text-amber-700 font-medium">
                  ⚠️ <strong>Important:</strong> Click the <strong>"More"</strong> button at the bottom repeatedly until ALL your activities are visible!
                </li>
                <li>Scroll back up and click the <strong>"Download"</strong> button</li>
              </ol>
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm border border-amber-200">
                <strong className="text-amber-800">Why click "More" repeatedly?</strong>
                <p className="text-amber-700 mt-1">
                  Flying Blue uses "lazy loading" — it only shows recent activities at first. If you don't click "More" to load everything, your PDF will only contain a few months of data!
                </p>
              </div>
              <p className="mt-3"><strong>Step 2: Import in SkyStatus</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Click "Import PDF" (on Dashboard or in Data Settings)</li>
                <li>Drag your PDF into the drop zone or click to select</li>
                <li>Review the extracted data and click "Import"</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                SkyStatus automatically extracts flights, miles, XP, and your current status from the PDF.
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
                  <li>Explore all features freely — nothing you do affects real data</li>
                </ol>
              </div>
              
              <div className="mt-4 p-3 bg-violet-50 rounded-lg text-sm border border-violet-200">
                <strong className="text-violet-800">🎭 Switch between status levels:</strong>
                <p className="text-violet-700 mt-1">
                  In Demo Mode, a purple bar appears at the bottom of the screen. Click <strong>Silver</strong>, <strong>Gold</strong>, <strong>Platinum</strong>, or <strong>Ultimate</strong> to instantly see how SkyStatus looks for each status level!
                </p>
              </div>
              
              <div className="mt-3">
                <strong>To exit Demo Mode:</strong>
                <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                  <li>Click <strong>"Create Account"</strong> in the demo bar to sign up</li>
                  <li>Or go to <strong>Data Settings</strong> → <strong>"Start Over"</strong> to start fresh</li>
                  <li>Or simply close the browser — demo data is not saved</li>
                </ul>
              </div>
              
              <p className="mt-3 text-sm text-slate-500">
                Demo Mode is perfect for understanding the app before importing your own Flying Blue data.
              </p>
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
                <li><strong>Actual XP</strong> — XP from flights you've already taken</li>
                <li><strong>Projected XP</strong> — Including scheduled/future flights</li>
                <li><strong>Status progression</strong> — Visual timeline of your status journey</li>
                <li><strong>Ultimate tracking</strong> — UXP progress for Platinum members</li>
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
                <div><strong>Ultimate Cycle Type:</strong> Whether your Ultimate qualification follows your XP cycle or calendar year</div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>How to find your qualification cycle dates:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Log in at <a href="https://www.flyingblue.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">flyingblue.com</a></li>
                  <li>Click <strong>"View your Flying Blue space"</strong> or go to your profile</li>
                  <li>Look for <strong>"Reach before [date]"</strong> or <strong>"Maintain [status], 300 XP — Reach before [date]"</strong></li>
                  <li>This date is the <strong>end</strong> of your qualification period</li>
                  <li>Your cycle <strong>start month</strong> = 12 months before this date</li>
                </ol>
                <p className="mt-2 text-slate-600">
                  <strong>Example:</strong> If it says "Reach before 31 Oct 2026", your cycle started November 2025.
                </p>
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
              <p className="mt-3 text-sm">
                The dashboard ring shows both: the solid part is actual, the lighter part is projected.
              </p>
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
                <li>Find the month you want to correct</li>
                <li>Click the <strong>edit icon</strong></li>
                <li>Enter the correction amount (positive to add, negative to subtract)</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Use this for bonus XP from promotions, challenges, or to fix small discrepancies.
              </p>
            </>
          )
        },
        {
          question: 'How does XP "payment" work on level-up?',
          answer: (
            <>
              <p>When you reach a status threshold, that XP amount is "consumed":</p>
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
                <strong>Example:</strong> You have 250 XP as Silver. You earn 80 XP on a flight (total 330 XP). 
                You level up to Gold, paying 180 XP, leaving you with 150 XP toward Platinum.
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
                <li><strong>Maximum XP rollover:</strong> 300 XP</li>
                <li><strong>Maximum UXP rollover:</strong> 900 UXP (for Ultimate)</li>
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
              <p>Flying Blue has a "soft landing" rule: <strong>you can only drop one status level per year</strong>.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Platinum → Gold (if you don't requalify for Platinum)</li>
                <li>Gold → Silver</li>
                <li>Silver → Explorer</li>
                <li>Ultimate always drops to Platinum first, not lower</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                This gives you a safety net — even if you don't fly much one year, you won't lose all your benefits immediately.
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
              <p className="mt-3 text-sm">
                <strong>Route format:</strong> Enter 3-letter airport codes separated by spaces. 
                Example: <code className="bg-slate-100 px-1 rounded">AMS CDG BKK</code> creates segments AMS→CDG and CDG→BKK.
              </p>
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
                <li>Select Economy, Premium Economy, Business, or First</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Useful when you're flying Business outbound but Economy on the return, for example.
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
                  <p className="text-sm mt-1">Calculates <strong>marginal cost ÷ marginal XP</strong>. Shows the cost of upgrading from Economy — useful for deciding whether to pay for a higher cabin.</p>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <strong>Example:</strong> Economy costs €500 (34 XP), Business costs €1,500 (102 XP). 
                Optimizer shows: (€1,500 - €500) / (102 - 34) = €14.71 per extra XP.
              </p>
            </>
          )
        },
        {
          question: 'What does the Status Projection card show?',
          answer: (
            <>
              <p>The Status Projection card adapts to your situation:</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2 p-2 bg-slate-50 rounded">
                  <span className="font-semibold w-32">Explorer-Gold:</span>
                  <span>Shows <strong>Status Upgrade</strong> — XP needed to reach the next level</span>
                </div>
                <div className="flex gap-2 p-2 bg-slate-50 rounded">
                  <span className="font-semibold w-32">Platinum (0-599 XP):</span>
                  <span>Shows <strong>Requalification</strong> — XP needed to keep Platinum (300 XP)</span>
                </div>
                <div className="flex gap-2 p-2 bg-violet-50 rounded">
                  <span className="font-semibold w-32">Platinum (600+ XP):</span>
                  <span>Shows <strong>Ultimate Goal</strong> — UXP needed for Ultimate (900 UXP)</span>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'How accurate are the XP calculations?',
          answer: (
            <>
              <p>XP calculations are <strong>estimates based on flight distance</strong>. They may differ from actual Flying Blue values because:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>AF/KLM sometimes override distance bands for specific routes</li>
                <li>Partner airlines may have different XP multipliers</li>
                <li>Promotional bonuses aren't included</li>
              </ul>
              <p className="mt-3 p-3 bg-amber-50 rounded-lg text-sm">
                <strong>Report discrepancies:</strong> Use the "Report Issue" button in the simulator to help us improve calculations. We collect reports to identify routes that need corrections.
              </p>
            </>
          )
        },
        {
          question: 'What are the distance bands?',
          answer: (
            <>
              <p>XP is based on flight distance, grouped into bands:</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-slate-50 rounded">Short: 0-500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Medium: 501-1,500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 1: 1,501-2,500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 2: 2,501-3,500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 3: 3,501-4,500 mi</div>
                <div className="p-2 bg-slate-50 rounded">Long 4: 4,501+ mi</div>
              </div>
              <p className="mt-3 text-sm">
                XP varies by cabin: Economy earns base XP, Business earns 3x, First earns 4x (approximately).
              </p>
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
                <li>Enter <strong>route</strong> (e.g., AMS-CDG or AMS CDG)</li>
                <li>Select <strong>airline</strong> (KL, AF, or partner)</li>
                <li>Choose <strong>cabin class</strong></li>
                <li>Mark as <strong>flown</strong> or <strong>scheduled</strong></li>
                <li>Click Add Flight</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Scheduled flights show as "projected" XP until the date passes or you mark them as flown.
              </p>
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
              <p className="mt-2 text-sm text-slate-500">
                Changes are auto-saved for logged-in users.
              </p>
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
                <li><strong>Partner variations:</strong> Partner XP can differ from calculated values</li>
              </ul>
              <p className="mt-3">
                <strong>Solutions:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Use manual XP corrections in XP Engine</li>
                <li>Re-import your Flying Blue PDF for the latest data</li>
                <li>Report route discrepancies in the XP Run Simulator</li>
              </ul>
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
                <li>Compare expiring miles</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                Miles data is automatically imported from your Flying Blue PDF.
              </p>
            </>
          )
        },
        {
          question: 'What is the Redemption Calculator?',
          answer: (
            <>
              <p>The <strong>Redemption Calculator</strong> helps you analyze the value of award bookings:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter the <strong>miles used</strong> for the booking</li>
                <li>Enter the <strong>cash price</strong> of an equivalent paid ticket</li>
                <li>Add any <strong>taxes/fees</strong> paid</li>
                <li>See your <strong>cents-per-mile value</strong></li>
              </ol>
              <p className="mt-3 text-sm">
                <strong>Value guide:</strong> {"<"}1.0¢ = Poor, 1.0-1.5¢ = Fair, 1.5-2.5¢ = Good, {">"}2.5¢ = Excellent
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
              <p className="mt-3">
                <strong>What's a good CPM?</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>{"<"}0.8¢ — Excellent (you're getting miles cheaply)</li>
                <li>0.8-1.2¢ — Good</li>
                <li>1.2-1.5¢ — Average</li>
                <li>{">"}1.5¢ — Consider if the miles are worth it</li>
              </ul>
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
              <p>Click the <strong>gear icon (⚙️)</strong> in the sidebar or header to open Data Settings.</p>
              <p className="mt-2">Available options:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Import Flying Blue PDF</li>
                <li>Export / Import JSON backup</li>
                <li>Change currency</li>
                <li>Re-run onboarding wizard</li>
                <li>Reset or delete data</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I change my currency?',
          answer: (
            <>
              <p>In <strong>Data Settings</strong>:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Find the <strong>Currency</strong> section</li>
                <li>Select from EUR (€), USD ($), GBP (£), or CHF</li>
                <li>All costs throughout the app will update</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Note: This only changes the display currency. It doesn't convert existing data — you'll need to re-enter costs in the new currency.
              </p>
            </>
          )
        },
        {
          question: 'How do I export my data?',
          answer: (
            <>
              <p>In <strong>Data Settings</strong>:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click <strong>"Export JSON"</strong></li>
                <li>Save the file to your device</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                This exports all your flights, miles, XP data, settings, and redemptions. Use it as a backup or to transfer data between devices.
              </p>
            </>
          )
        },
        {
          question: 'How do I import a JSON backup?',
          answer: (
            <>
              <p>In <strong>Data Settings</strong>:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click <strong>"Import JSON"</strong></li>
                <li>Select your backup file</li>
                <li>Data is <strong>merged</strong> — existing entries are preserved, new entries are added</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                Safe to import the same file multiple times — duplicates are detected automatically.
              </p>
            </>
          )
        },
        {
          question: 'What does "Start Over" do?',
          answer: (
            <>
              <p><strong>"Start Over"</strong> clears all your data and restarts the onboarding wizard:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Deletes all flights, miles, XP data, and settings</li>
                <li>Returns you to the welcome screen</li>
                <li>Cannot be undone!</li>
              </ul>
              <p className="mt-3 p-3 bg-amber-50 rounded-lg text-sm border border-amber-200">
                <strong>Tip:</strong> Export your data first if you might want it later.
              </p>
            </>
          )
        },
        {
          question: 'What is the email consent toggle?',
          answer: (
            <>
              <p>The <strong>email consent toggle</strong> controls whether we can contact you about:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>New features and updates</li>
                <li>Tips for using SkyStatus</li>
                <li>Flying Blue news and insights</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                Your email is never shared with third parties. You can toggle this anytime in Data Settings.
              </p>
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
                    <li>1 extra checked bag</li>
                    <li>SkyTeam Elite benefits</li>
                  </ul>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <div className="font-semibold text-amber-800">Gold (180 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>7x Miles on eligible flights</li>
                    <li>Lounge access + 1 guest</li>
                    <li>SkyPriority (boarding, baggage)</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-700 text-white rounded-lg">
                  <div className="font-semibold">Platinum (300 XP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>8x Miles on eligible flights</li>
                    <li>2 extra bags, all seats free</li>
                    <li>Start earning UXP toward Ultimate</li>
                  </ul>
                </div>
                <div className="p-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg">
                  <div className="font-semibold">Ultimate (900 UXP)</div>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li>Lounge access for up to 8 guests</li>
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
                  <p className="text-sm text-emerald-700 mt-1">Reward currency for free flights and upgrades. Accumulates over time, expires after 24 months of inactivity.</p>
                </div>
              </div>
            </>
          )
        },
        {
          question: 'What is UXP?',
          answer: (
            <>
              <p><strong>UXP (Ultimate XP)</strong> is earned only on:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>KLM-operated flights</li>
                <li>Air France-operated flights</li>
                <li>SAF (Sustainable Aviation Fuel) purchases</li>
              </ul>
              <p className="mt-3">
                <strong>Key points:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>Every UXP is also XP, but not every XP is UXP</li>
                <li>You need 900 UXP to reach Ultimate status</li>
                <li>Only Platinum members can start earning toward Ultimate</li>
                <li>UXP rolls over (max 900) but can't exceed 1,800 total per cycle</li>
              </ul>
            </>
          )
        },
        {
          question: 'What is a qualification year?',
          answer: (
            <>
              <p>Your personal 12-month period for earning XP. It can start:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>First XP earned:</strong> For new members</li>
                <li><strong>First of next month after level-up:</strong> When you reach a new status</li>
                <li><strong>Same month:</strong> After successful requalification</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                At the end of your qualification year, you either requalify for your status (keep or upgrade) or drop one level (soft landing).
              </p>
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
                Read our full <a href="#/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>.
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
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Complete privacy</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">!</span>
                  <span>Data lost if browser cache is cleared</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">!</span>
                  <span>No sync between devices</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <strong className="text-blue-800">💡 Protect your data with Export/Import:</strong>
                <p className="mt-2 text-blue-700">
                  You can always save your data as a JSON file and restore it later:
                </p>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>To Export (backup your data):</strong>
                    <ol className="list-decimal list-inside mt-1 ml-2">
                      <li>Go to <strong>Data Settings</strong></li>
                      <li>Click <strong>"Export Data"</strong></li>
                      <li>Save the JSON file to your computer</li>
                    </ol>
                  </div>
                  <div>
                    <strong>To Import (restore your data):</strong>
                    <ol className="list-decimal list-inside mt-1 ml-2">
                      <li>Go to <strong>Data Settings</strong></li>
                      <li>Click <strong>"Import JSON"</strong></li>
                      <li>Select your previously exported JSON file</li>
                    </ol>
                  </div>
                </div>
                <p className="mt-2 text-blue-600 font-medium">
                  We recommend exporting regularly, especially before clearing your browser cache!
                </p>
              </div>
            </>
          )
        },
        {
          question: 'How do I delete my data?',
          answer: (
            <>
              <p>In <strong>Data Settings</strong>, scroll to the <strong>Danger Zone</strong>:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click <strong>"Start Over"</strong> to clear all data and restart</li>
                <li>Or <strong>"Delete Account"</strong> to permanently remove your account and all data</li>
                <li>Confirm the action when prompted</li>
              </ol>
              <p className="mt-3 p-3 bg-red-50 rounded-lg text-sm border border-red-200">
                <strong className="text-red-800">Warning:</strong> Deletion is permanent and cannot be undone. Export your data first if you might need it.
              </p>
            </>
          )
        },
        {
          question: 'What data does SkyStatus collect?',
          answer: (
            <>
              <p>We only store data you explicitly provide:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Flight details (dates, routes, cabins)</li>
                <li>Miles and XP records</li>
                <li>Redemption records</li>
                <li>Settings and preferences</li>
                <li>Email (if you create an account)</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                We don't track your browsing, sell data, or use it for advertising.
              </p>
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
                  <strong>Wrong PDF:</strong> Make sure you're importing the Flying Blue activity PDF, not a booking confirmation or other document.
                </li>
                <li>
                  <strong>Incomplete data:</strong> Did you click "More" on Flying Blue to load all activities before downloading?
                </li>
                <li>
                  <strong>Corrupted file:</strong> Try downloading the PDF again from Flying Blue.
                </li>
                <li>
                  <strong>Browser issue:</strong> Try a different browser or clear your cache.
                </li>
              </ul>
              <p className="mt-3 text-sm">
                Still having issues? Use the <strong>Bug Report</strong> button to let us know.
              </p>
            </>
          )
        },
        {
          question: 'The app is showing wrong status or XP. How do I fix it?',
          answer: (
            <>
              <ol className="list-decimal list-inside mt-2 space-y-2">
                <li>
                  <strong>Check your cycle settings:</strong> Go to XP Engine → click settings on your cycle → verify starting status and rollover XP match Flying Blue.
                </li>
                <li>
                  <strong>Check the cycle start date:</strong> Make sure your qualification cycle start month is correct.
                </li>
                <li>
                  <strong>Add corrections:</strong> Use the manual ledger to add XP corrections for promotions or discrepancies.
                </li>
                <li>
                  <strong>Re-import your PDF:</strong> Download a fresh PDF from Flying Blue with all activities loaded.
                </li>
              </ol>
            </>
          )
        },
        {
          question: 'Data is not syncing between devices',
          answer: (
            <>
              <p>This can happen if:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>You're in Local Mode:</strong> Local data doesn't sync. Create an account to enable sync.</li>
                <li><strong>Different accounts:</strong> Make sure you're signed in with the same account on both devices.</li>
                <li><strong>Network issues:</strong> Check your internet connection and try refreshing.</li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                Changes are auto-saved within a few seconds. If you make changes and immediately switch devices, wait a moment for sync to complete.
              </p>
            </>
          )
        },
        {
          question: 'How do I report a bug?',
          answer: (
            <>
              <p>Click the <strong>Bug Report</strong> button in the sidebar (or footer on mobile):</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Describe what happened</li>
                <li>Describe what you expected</li>
                <li>Include any error messages you saw</li>
                <li>Submit — we'll investigate!</li>
              </ol>
              <p className="mt-2 text-sm text-slate-500">
                You can also email us at <a href="mailto:support@skystatus.pro" className="text-brand-600 hover:underline">support@skystatus.pro</a>
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
