import React, { useState } from 'react';
import { ArrowLeft, Calculator, CreditCard, Plane, AlertTriangle, CheckCircle, X, ExternalLink } from 'lucide-react';

interface CalculatorPageProps {
  onBack: () => void;
}

type RedemptionType = 'europe' | 'medium' | 'long' | 'premium' | 'business';

const REDEMPTION_VALUES: Record<RedemptionType, { label: string; cpm: number; example: string }> = {
  europe: { label: 'Europe flight', cpm: 0.8, example: 'AMS → BCN round trip' },
  medium: { label: 'Medium-haul flight', cpm: 1.0, example: 'AMS → Dubai round trip' },
  long: { label: 'Long-haul Economy', cpm: 1.2, example: 'AMS → New York round trip' },
  premium: { label: 'Long-haul Premium Economy', cpm: 1.5, example: 'AMS → Tokyo round trip' },
  business: { label: 'Business Class', cpm: 2.0, example: 'AMS → New York in Business' },
};

// Current promo: up to 80% bonus (valid until Dec 22, 2025)
const PURCHASE_TIERS = [
  { min: 2000, max: 3999, bonus: 0, label: 'No bonus' },
  { min: 4000, max: 21999, bonus: 0.5, label: '50% bonus' },
  { min: 22000, max: 49999, bonus: 0.6, label: '60% bonus' },
  { min: 50000, max: 100000, bonus: 0.8, label: '80% bonus' },
];

const AMEX_CARDS = [
  {
    id: 'fb-platinum',
    name: 'Flying Blue Amex Platinum',
    milesPerEuro: 1.5,
    welcomeBonus: 40000,
    welcomeSpend: 4000,
    xpBonus: 60,
    monthlyFee: 55,
    color: 'from-slate-700 to-slate-900',
    referralUrl: 'https://americanexpress.com/nl-nl/referral/fb-platinum?ref=rEMCODtnU7&XLINK=MYCP',
  },
  {
    id: 'fb-gold',
    name: 'Flying Blue Amex Gold',
    milesPerEuro: 1.0,
    welcomeBonus: 20000, // estimated via same link
    welcomeSpend: 4000,
    xpBonus: 30,
    monthlyFee: 16.5,
    color: 'from-yellow-600 to-yellow-800',
    referralUrl: 'https://americanexpress.com/nl-nl/referral/fb-platinum?ref=rEMCODtnU7&XLINK=MYCP',
  },
  {
    id: 'fb-silver',
    name: 'Flying Blue Amex Silver',
    milesPerEuro: 0.8,
    welcomeBonus: 2500,
    welcomeSpend: 0,
    xpBonus: 10,
    monthlyFee: 0,
    color: 'from-gray-400 to-gray-600',
    referralUrl: 'https://americanexpress.com/nl-nl/creditcard/flying-blue-silver-card/',
  },
];

export function CalculatorPage({ onBack }: CalculatorPageProps) {
  const [milesNeeded, setMilesNeeded] = useState<string>('');
  const [redemptionType, setRedemptionType] = useState<RedemptionType>('europe');
  const [showResult, setShowResult] = useState(false);

  const miles = parseInt(milesNeeded) || 0;
  const redemption = REDEMPTION_VALUES[redemptionType];

  // Calculate purchase cost
  const getPurchaseCost = (miles: number): { cost: number; bonus: number; totalMiles: number; tier: string } => {
    if (miles < 2000) {
      return { cost: miles * 0.026, bonus: 0, totalMiles: miles, tier: 'Minimum 2,000 miles' };
    }

    // Find the right tier
    const tier = PURCHASE_TIERS.find(t => miles >= t.min && miles <= t.max) || PURCHASE_TIERS[PURCHASE_TIERS.length - 1];
    
    // Base miles needed (before bonus)
    const baseMiles = Math.ceil(miles / (1 + tier.bonus));
    const bonusMiles = miles - baseMiles;
    
    // Cost is €0.026 per base mile
    const cost = baseMiles * 0.026;
    
    return { cost, bonus: tier.bonus, totalMiles: miles, tier: tier.label };
  };

  const purchase = getPurchaseCost(miles);
  const redemptionValue = miles * (redemption.cpm / 100);
  const purchaseCpm = miles > 0 ? (purchase.cost / miles) * 100 : 0;
  const isWorthIt = purchaseCpm < redemption.cpm;

  const handleCalculate = () => {
    if (miles >= 2000) {
      setShowResult(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Calculator className="text-blue-400" size={24} />
              <span className="text-lg font-semibold text-white">Miles Calculator</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Should you buy Flying Blue Miles?
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Find out if purchasing miles is worth it for your next trip — or if there's a smarter way to earn them.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            {/* Miles Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                How many miles do you need?
              </label>
              <input
                type="number"
                value={milesNeeded}
                onChange={(e) => {
                  setMilesNeeded(e.target.value);
                  setShowResult(false);
                }}
                placeholder="e.g. 25000"
                min="2000"
                step="1000"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 2,000 miles</p>
            </div>

            {/* Redemption Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                What will you use them for?
              </label>
              <select
                value={redemptionType}
                onChange={(e) => {
                  setRedemptionType(e.target.value as RedemptionType);
                  setShowResult(false);
                }}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none cursor-pointer"
              >
                {Object.entries(REDEMPTION_VALUES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{redemption.example}</p>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={miles < 2000}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-lg"
          >
            Calculate
          </button>
        </div>

        {/* Results */}
        {showResult && miles >= 2000 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Verdict Card */}
            <div className={`rounded-2xl p-6 sm:p-8 border ${isWorthIt ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-amber-900/30 border-amber-700/50'}`}>
              <div className="flex items-start gap-4">
                {isWorthIt ? (
                  <CheckCircle className="text-emerald-400 flex-shrink-0 mt-1" size={28} />
                ) : (
                  <AlertTriangle className="text-amber-400 flex-shrink-0 mt-1" size={28} />
                )}
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${isWorthIt ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {isWorthIt ? 'Buying could be worth it!' : 'Buying is NOT worth it'}
                  </h2>
                  <p className="text-slate-300">
                    {isWorthIt
                      ? `For ${redemption.label.toLowerCase()}, you'd get more value than you pay.`
                      : `For ${redemption.label.toLowerCase()}, you'd pay more than the miles are worth.`}
                  </p>
                </div>
              </div>

              {/* Numbers */}
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-1">Purchase cost</p>
                  <p className="text-2xl font-bold text-white">€{purchase.cost.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">{purchase.tier}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-1">Redemption value</p>
                  <p className="text-2xl font-bold text-white">~€{redemptionValue.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">at {redemption.cpm} CPM</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-1">You {isWorthIt ? 'save' : 'lose'}</p>
                  <p className={`text-2xl font-bold ${isWorthIt ? 'text-emerald-400' : 'text-red-400'}`}>
                    €{Math.abs(redemptionValue - purchase.cost).toFixed(0)}
                  </p>
                  <p className="text-xs text-slate-500">{purchaseCpm.toFixed(2)} CPM effective</p>
                </div>
              </div>
            </div>

            {/* Alternative: Credit Cards */}
            {!isWorthIt && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="text-blue-400" size={24} />
                  <h3 className="text-xl font-semibold text-white">Smarter: Earn miles with daily spending</h3>
                </div>

                <p className="text-slate-400 mb-6">
                  Instead of buying {miles.toLocaleString()} miles for €{purchase.cost.toFixed(0)}, consider a Flying Blue credit card. 
                  You'll earn miles on every purchase — and get a welcome bonus.
                </p>

                <div className="grid gap-4">
                  {AMEX_CARDS.map((card) => {
                    const spendNeeded = card.welcomeBonus >= miles 
                      ? card.welcomeSpend 
                      : card.welcomeSpend + Math.ceil((miles - card.welcomeBonus) / card.milesPerEuro);
                    
                    return (
                      <a
                        key={card.id}
                        href={card.referralUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gradient-to-r hover:scale-[1.02] transition-transform"
                      >
                        <div className={`bg-gradient-to-r ${card.color} rounded-xl p-5 border border-white/10`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white">{card.name}</h4>
                            <ExternalLink size={16} className="text-white/60" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-white/60">Welcome bonus</p>
                              <p className="text-white font-medium">{card.welcomeBonus.toLocaleString()} miles</p>
                            </div>
                            <div>
                              <p className="text-white/60">Miles per €</p>
                              <p className="text-white font-medium">{card.milesPerEuro}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Monthly fee</p>
                              <p className="text-white font-medium">{card.monthlyFee === 0 ? 'Free' : `€${card.monthlyFee}`}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Spend to reach {miles.toLocaleString()}</p>
                              <p className="text-white font-medium">€{spendNeeded.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  💳 Card offers available in Netherlands. We may receive a referral bonus — this doesn't affect your offer.
                </p>
              </div>
            )}

            {/* Even when worth it, show cards as an option */}
            {isWorthIt && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <p className="text-slate-400 text-sm">
                  <CreditCard className="inline mr-2 text-blue-400" size={16} />
                  <strong className="text-slate-300">Tip:</strong> Even when buying makes sense, a{' '}
                  <a 
                    href={AMEX_CARDS[0].referralUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Flying Blue credit card
                  </a>{' '}
                  earns you miles on everyday purchases — building your balance for the next trip.
                </p>
              </div>
            )}

            {/* CTA to full app */}
            <div className="text-center pt-4">
              <p className="text-slate-400 mb-4">
                Want to track your Flying Blue status and optimize your strategy?
              </p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                <Plane size={18} />
                Try SkyStatus Pro — Free
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!showResult && (
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <Plane className="text-blue-400 mb-3" size={24} />
              <h3 className="font-medium text-white mb-2">Current promo</h3>
              <p className="text-sm text-slate-400">
                Up to 80% bonus miles when buying 50,000+ miles. Valid until Dec 22, 2025.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <Calculator className="text-emerald-400 mb-3" size={24} />
              <h3 className="font-medium text-white mb-2">How we calculate</h3>
              <p className="text-sm text-slate-400">
                We compare your purchase cost to the typical redemption value for your trip type.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <CreditCard className="text-amber-400 mb-3" size={24} />
              <h3 className="font-medium text-white mb-2">Honest advice</h3>
              <p className="text-sm text-slate-400">
                Buying miles is rarely the best deal. We'll tell you when earning is smarter.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            Built by frequent flyers, for frequent flyers.{' '}
            <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
              SkyStatus Pro
            </button>
          </p>
        </div>
      </footer>
    </div>
  );
}
