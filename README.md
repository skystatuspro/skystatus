# SkyStatus Pro - Flying Blue Analytics

A comprehensive analytics dashboard for tracking your Flying Blue loyalty program portfolio. Track XP qualification, miles balance, and optimize your loyalty strategy.

![Version](https://img.shields.io/badge/Version-2.1.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ecf8e)

## Features

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
- **Full Ultimate status support**

### 🎖️ Ultimate Status Tracking
- UXP automatically calculated from KLM/AF flights
- Separate UXP rollover input (max 900)
- Ultimate Requalification monitoring in Risk Monitor
- UXP Rollover Forecast with 900 UXP cap
- UXP Waste indicator based on 1800 total cap
- Cycle type toggle (Qualification vs Calendar year)

### 💰 Miles Engine
- Track miles from all sources (Subscriptions, Amex, Flights, Other)
- Cost per mile (CPM) analysis in your preferred currency
- Source efficiency comparison
- ROI multiplier tracking
- Projected portfolio value

### ✈️ Flight Management
- PDF import from Flying Blue activity statements
- Manual flight entry with multi-leg support
- Automatic XP calculation based on cabin, status, fare class
- Revenue-based miles for KLM/AF
- SkyTeam partner support

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
-- Add new profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_airport VARCHAR(3);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS miles_balance INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_uxp INTEGER DEFAULT 0;
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

1. **Cloud Sync** (Authenticated) - Data stored in Supabase, syncs across devices
2. **Local Mode** - Data stored in browser localStorage
3. **Demo Mode** - Sample data for exploration, no persistence

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

## License

MIT License - feel free to use this for personal projects.

## Disclaimer

This is an unofficial tool and is not affiliated with Air France-KLM or the Flying Blue program. All calculations are estimates based on publicly available information.

---

Built with ❤️ for Flying Blue enthusiasts | [skystatus.pro](https://skystatus.pro)
