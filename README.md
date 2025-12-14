```markdown
# SkyStatus Pro - Flying Blue Analytics

A comprehensive analytics dashboard for tracking your Flying Blue loyalty program portfolio. Track XP qualification, miles balance, and optimize your loyalty strategy.

![Version](https://img.shields.io/badge/Version-2.3.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ecf8e)

## What's New in v2.3.0

### 📱 Mobile-First Experience
- **Simple Mode** now defaults on mobile devices (< 768px)
- Optimized touch interfaces for all components
- Responsive cabin class selector (2 columns on mobile, 4 on desktop)
- Improved mobile sidebar with proper z-index layering

### 🔧 PDF Parser Improvements
- **Multi-language support**: Dutch, English, French, German, Spanish, Portuguese, Italian
- **Correct flight dates**: Now extracts actual flight date, not posting date
- **Multi-currency support**: EUR, USD, GBP, NOK, SEK, CHF, and more
- **Partner flight recognition**: Transavia, Kenya Airways, and other SkyTeam partners
- **Bonus XP detection**: First flight bonuses, hotel stay XP, Miles+Points promotions
- **Requalification detection**: Automatic cycle settings from status changes

### 🎯 XP Rollover Fix
- **Accurate rollover calculation**: XP is now correctly split when reaching status thresholds
- Flights on requalification day properly attributed to old vs. new cycle
- Automatic rollover XP displayed in import summary

### 🛡️ Data Safety
- **Safer database operations**: Upsert-based saving prevents accidental data loss
- **Replace mode for PDF import**: Clean imports without merge conflicts
- **JSON backup/restore**: Full data export and import functionality

## Features

### 📊 Dual View Modes
Toggle between **Simple Mode** and **Full Mode** based on your needs:

| Simple Mode | Full Mode |
|-------------|-----------|
| Clean, focused interface | Detailed analytics |
| Essential metrics only | Full ledger tables |
| Perfect for mobile | Power user features |
| Quick status checks | Deep dive analysis |

### 🚀 Onboarding Wizard
- 6-step guided setup for new users
- PDF import integration during onboarding
- Home airport selector (500+ airports, Flying Blue hubs prioritized)
- Status and XP pre-configuration
- Email consent management
- Returning user support with prefilled settings

### 🌍 Multi-Currency Support
- 10 currencies: EUR, USD, GBP, CHF, SEK, NOK, DKK, PLN, CAD, AUD
- Automatic conversion for all costs and valuations
- Currency selector in settings and onboarding
- Consistent formatting across all components

### 📊 Command Center (Dashboard)
- Real-time Flying Blue status overview
- XP qualification progress with actual vs projected
- Miles portfolio value estimation
- Risk monitoring with actionable tips
- Recent redemption activity
- **Ultimate Requalification tracking** (900 UXP target)

### 🎯 XP Engine
- Multi-cycle qualification tracking
- Automatic cycle detection from PDF imports
- Manual ledger for AMEX, SAF bonus, misc XP
- Level-up cycle detection and chaining
- Rollover calculations (max 300 XP, max 900 UXP)
- **Full Ultimate status support with direct selection**

### 🎖️ Ultimate Status Tracking
- UXP automatically calculated from KLM/AF flights
- Separate UXP rollover input (max 900)
- Ultimate Requalification monitoring in Risk Monitor
- UXP Rollover Forecast with 900 UXP cap
- UXP Waste indicator based on 1800 total cap
- Cycle type toggle (Qualification vs Calendar year)
- Select Ultimate as starting status directly

### 💰 Miles Engine
- Track miles from all sources (Subscriptions, Amex, Flights, Other)
- Cost per mile (CPM) analysis in your preferred currency
- Source efficiency comparison
- ROI multiplier tracking
- Projected portfolio value

### ✈️ Flight Management
- **PDF import** from Flying Blue activity statements (multi-language)
- Manual flight entry with multi-leg support
- Automatic XP calculation based on cabin, status, fare class
- Revenue-based miles for KLM/AF
- SkyTeam partner support
- Edit flights with automatic recalculation

### 🔥 Redemption Analyzer
- Track award bookings and their value
- CPM achieved vs acquisition cost
- Best/worst redemption tracking
- Value verdict (Excellent/Good/Fair/Poor)

### 📈 Analytics Center
- Miles accumulation trends
- XP efficiency analysis
- Source diversification charts
- Historical performance

### 🛫 XP Run Simulator
- Plan mileage runs for status qualification
- Route suggestions with XP/cost analysis
- Quick route calculator
- Ultimate status projection support

### 💬 Feedback System
- Post-import feedback collection
- Triggered feedback after 7 days or 5 sessions
- Bug reporting with context
- XP discrepancy reporting

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/skystatus.git

# Navigate to project directory
cd skystatus

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file for Supabase integration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Migration

Run the following SQL in Supabase SQL Editor for full functionality:

```sql
-- Core profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_airport VARCHAR(3);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS miles_balance INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_uxp INTEGER DEFAULT 0;

-- Qualification settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualification_start_month VARCHAR(7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualification_start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS starting_status VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS starting_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ultimate_cycle_type VARCHAR(20) DEFAULT 'qualification';

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  trigger TEXT NOT NULL,
  rating TEXT,
  message TEXT,
  page TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);
```

### Build for Production

```bash
npm run build
```

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Recharts** - Data Visualization
- **Lucide React** - Icons
- **Supabase** - Authentication & Database
- **PDF.js** - PDF parsing for Flying Blue imports

## Data Storage

SkyStatus supports three storage modes:

| Mode | Storage | Trigger | Best For |
|------|---------|---------|----------|
| **Cloud Sync** | Supabase | User logged in | Cross-device access |
| **Local Mode** | localStorage | "Continue without account" | Privacy-focused users |
| **Demo Mode** | Memory only | "Try Demo" button | Exploration |

## PDF Import

### Supported Languages
- 🇬🇧 English
- 🇳🇱 Dutch
- 🇫🇷 French
- 🇩🇪 German
- 🇪🇸 Spanish
- 🇵🇹 Portuguese
- 🇮🇹 Italian

### What Gets Imported
- ✈️ All flights with XP, miles, and UXP
- 💳 Miles from subscriptions, AMEX, shopping
- 🏨 Hotel bonuses and partner activity
- 🎁 First flight bonuses and promotions
- 📅 Requalification events for cycle detection

### Import Tips
1. Download "Activity Statement" from Flying Blue website
2. Select date range covering your qualification period
3. Upload PDF in SkyStatus
4. Review summary before confirming
5. Cycle settings are auto-detected from requalifications

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically

### Netlify

1. Push your code to GitHub
2. Connect repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables

## Documentation

- [Architecture Overview](./ARCHITECTURE.md) - Technical documentation for developers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for personal projects.

## Disclaimer

This is an unofficial tool and is not affiliated with Air France-KLM or the Flying Blue program. All calculations are estimates based on publicly available information.

---

Built with ❤️ for Flying Blue enthusiasts | [skystatus.pro](https://skystatus.pro)
```

---

Wil je nu de ARCHITECTURE.md?
