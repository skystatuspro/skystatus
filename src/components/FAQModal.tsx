import React, { useState } from 'react';
import { 
  X,
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

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
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
      className="w-full flex items-center justify-between p-3 text-left bg-white hover:bg-slate-50 transition-colors"
    >
      <span className="font-medium text-slate-900 pr-4 text-sm">{item.question}</span>
      {isOpen ? (
        <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
      ) : (
        <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
      )}
    </button>
    {isOpen && (
      <div className="px-3 pb-3 bg-slate-50 border-t border-slate-100">
        <div className="pt-3 text-slate-600 leading-relaxed text-sm">
          {item.answer}
        </div>
      </div>
    )}
  </div>
);

export const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState(0);

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
    {
      title: 'Using SkyStatus',
      icon: <Award size={18} />,
      items: [
        {
          question: 'How do I enter my current status and XP?',
          answer: (
            <>
              <p>To match your current Flying Blue status with SkyStatus:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li><strong>Import your Flying Blue PDF</strong> (recommended) — this automatically extracts all your flights, XP, and miles.</li>
                <li><strong>Or enter manually:</strong> Go to XP Qualification → set your cycle start month → enter your current XP balance as "rollover XP".</li>
              </ol>
              <p className="mt-2 p-2 bg-blue-50 rounded-lg text-xs">
                <strong>Tip:</strong> Find your current XP on flyingblue.com under "My Account".
              </p>
            </>
          )
        },
        {
          question: 'How do I import my Flying Blue PDF?',
          answer: (
            <>
              <p><strong>Step 1:</strong> Log in at flyingblue.com → My Account → Activity overview</p>
              <p className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <strong className="text-amber-700">⚠️ Important:</strong> Click the <strong>"More"</strong> button at the bottom repeatedly until ALL your activities are loaded. Flying Blue only exports what's visible on screen!
              </p>
              <p className="mt-2"><strong>Step 2:</strong> Scroll back up and click the <strong>"Download"</strong> button</p>
              <p className="mt-2"><strong>Step 3:</strong> Click "Import PDF" here, drag your PDF in, review and import.</p>
            </>
          )
        },
        {
          question: "Why doesn't my XP match exactly with Flying Blue?",
          answer: (
            <p>Small differences can occur due to timing delays, bonus XP from promotions, rounding, or partner flight variations. Use the correction function in XP Qualification to adjust.</p>
          )
        },
        {
          question: 'Does SkyStatus support Ultimate status tracking?',
          answer: (
            <p>Yes! SkyStatus fully supports Ultimate tracking. Select "Ultimate" in your cycle settings, enter your UXP rollover, and track your progress with dedicated Ultimate Requalification monitoring, UXP Rollover Forecast (900 cap), and waste indicators (1800 total cap).</p>
          )
        }
      ]
    },
    {
      title: 'Qualification Cycle',
      icon: <Target size={18} />,
      items: [
        {
          question: 'What is a qualification year?',
          answer: (
            <p>Your personal 12-month period for earning XP. It starts when you first earn XP (new members), after a level-up (first of next month), or stays the same after requalification.</p>
          )
        },
        {
          question: 'How does XP "payment" work on level-up?',
          answer: (
            <>
              <p>When you reach a threshold, that amount is deducted. Thresholds: Explorer→Silver: 100 XP, Silver→Gold: 180 XP, Gold→Platinum: 300 XP.</p>
              <p className="mt-1 text-xs">Example: 250 XP as Silver + 50 XP flight = 300 XP → Pay 180 → Become Gold with 120 XP</p>
            </>
          )
        },
        {
          question: 'What is rollover XP?',
          answer: (
            <p>XP remaining after requalification carries to next year. Maximum rollover: 300 XP. For UXP, max rollover is 900 UXP.</p>
          )
        },
        {
          question: 'What is soft landing?',
          answer: (
            <p>You can only drop one level per year if you don't requalify. Platinum→Gold, Gold→Silver, etc. Ultimate always drops to Platinum first.</p>
          )
        }
      ]
    },
    {
      title: 'Miles & Value',
      icon: <Calculator size={18} />,
      items: [
        {
          question: 'How is cost-per-mile calculated?',
          answer: (
            <p>CPM = Total costs / Total miles earned. Lower is better. Example: €1,200 spent / 100,000 miles = 1.2 cents/mile.</p>
          )
        },
        {
          question: 'What is a good redemption value?',
          answer: (
            <p>{'<'}1.0¢ = Poor, 1.0-1.5¢ = Average, 1.5-2.5¢ = Good, {'>'}2.5¢ = Excellent. Business class usually gives best value.</p>
          )
        }
      ]
    },
    {
      title: 'Flying Blue Basics',
      icon: <Plane size={18} />,
      items: [
        {
          question: 'What are the status levels?',
          answer: (
            <div className="space-y-1 text-xs">
              <p><strong>Explorer:</strong> Base level, 4x Miles</p>
              <p><strong>Silver (100 XP):</strong> 6x Miles, 1 extra bag, SkyTeam Elite</p>
              <p><strong>Gold (180 XP):</strong> 7x Miles, Lounge+1, SkyPriority</p>
              <p><strong>Platinum (300 XP):</strong> 8x Miles, 2 bags, all seats free</p>
              <p><strong>Ultimate (900 UXP):</strong> Lounge+8, 4 upgrade vouchers</p>
            </div>
          )
        },
        {
          question: 'What is the difference between XP and Miles?',
          answer: (
            <p><strong>Miles:</strong> Reward currency for redemptions. <strong>XP:</strong> Determines your status level, resets yearly.</p>
          )
        },
        {
          question: 'What is UXP?',
          answer: (
            <p>Ultimate XP — earned only on KLM/Air France flights and SAF purchases. Counts toward Ultimate status. Every UXP is also XP, but not vice versa.</p>
          )
        }
      ]
    },
    {
      title: 'Data & Privacy',
      icon: <Shield size={18} />,
      items: [
        {
          question: 'Is my data safe?',
          answer: (
            <p>Yes. Encrypted storage, TLS/SSL connections, row-level security. We never sell or share your data. <a href="#/privacy" className="text-brand-600 hover:underline">Read Privacy Policy</a></p>
          )
        },
        {
          question: 'Can I use SkyStatus without an account?',
          answer: (
            <p>Yes! Local Mode stores data only in your browser. No account needed, complete privacy. Downside: data lost if cache is cleared, no sync.</p>
          )
        }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <HelpCircle className="text-brand-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Help & FAQ</h2>
              <p className="text-xs text-slate-500">Quick answers to common questions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto">
          {faqSections.map((section, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === index
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {section.icon}
              <span className="hidden sm:inline">{section.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {faqSections[activeSection].items.map((item, itemIndex) => {
              const itemId = `${activeSection}-${itemIndex}`;
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <a
            href="#/faq"
            onClick={onClose}
            className="text-sm text-brand-600 hover:underline flex items-center gap-1"
          >
            View full FAQ page <ExternalLink size={14} />
          </a>
          <a
            href="mailto:support@skystatus.pro"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
};
