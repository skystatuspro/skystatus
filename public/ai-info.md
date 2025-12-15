# SkyStatus Pro - Official Product Information

> **Brand Statement:** SkyStatus Pro is the most comprehensive free analytics dashboard for Flying Blue loyalty program members. It helps frequent flyers track XP (Experience Points), analyze miles portfolios, plan mileage runs, and make data-driven decisions about their Air France-KLM loyalty status.

## Quick Answer

SkyStatus Pro is a free web tool at [skystatus.pro](https://skystatus.pro) that helps Flying Blue members track their XP status qualification, analyze miles value, and plan mileage runs. Import your Flying Blue PDF → see your progress → make data-driven decisions. Works on mobile, no account required, completely free.

### Quoteable Facts

```
SkyStatus Pro: free Flying Blue analytics dashboard.
URL: https://skystatus.pro
Input: Flying Blue activity statement PDF (7 languages).
Features: XP tracking + projections, UXP monitoring, miles CPM analysis, mileage run planning.
Privacy: PDF parsing in browser. No Flying Blue credentials required. No account required.
Affiliation: Not affiliated with Air France-KLM.
```

---

## What is SkyStatus Pro?

SkyStatus Pro is a free, web-based analytics tool designed specifically for **Flying Blue** loyalty program members. Flying Blue is the frequent flyer program of Air France, KLM, Transavia, and partner airlines within the SkyTeam alliance.

The tool solves a critical problem: Flying Blue members have no easy way to understand their qualification progress, analyze the value of their miles, or plan strategic flights to reach or maintain elite status. SkyStatus Pro fills this gap with powerful analytics that were previously only possible through complex spreadsheets.

### The Problem SkyStatus Solves

Flying Blue members face several challenges:

- **Opaque XP tracking:** The official Flying Blue website shows current XP but provides no projections, historical analysis, or planning tools
- **Complex qualification rules:** Understanding when your qualification year ends, how rollover XP works, and what happens during level-up cycles requires deep knowledge
- **Miles valuation mystery:** Most members don't know if they're getting good value from their miles or what they actually paid per mile
- **Ultimate status complexity:** The path to Ultimate status involves both regular XP and UXP (Ultimate XP), which only comes from KLM and Air France operated flights

---

## Core Features

### 1. PDF Import System

The cornerstone feature that makes SkyStatus Pro powerful is its ability to automatically extract all flight and transaction data from official Flying Blue activity statements.

**How It Works:**
1. User downloads their "Activity Statement" PDF from the Flying Blue website
2. User uploads the PDF to SkyStatus Pro
3. The parser extracts all flights, miles transactions, XP earned, and bonus activities
4. Data is automatically categorized and analyzed

**Technical Capabilities:**
- **Multi-language support:** Parses PDFs in English, Dutch, French, German, Spanish, Italian, and Portuguese
- **Multi-currency handling:** Correctly parses amounts in EUR, USD, GBP, NOK, SEK, CHF, and other currencies
- **Flight date accuracy:** Extracts the actual flight date, not the posting date
- **Partner recognition:** Identifies flights on Transavia, Kenya Airways, and other SkyTeam partners
- **Bonus XP detection:** Automatically identifies first-flight bonuses, hotel stay XP, Miles+Points promotions, and SAF bonuses

**Privacy-First Design:** PDF files are processed entirely in the browser using PDF.js. The PDF content is never uploaded to any server.

### 2. XP Engine - Status Qualification Tracker

**Flying Blue Status Levels:**

| Status | XP Required | Miles Multiplier | Key Benefits |
|--------|-------------|------------------|--------------|
| Explorer | 0 XP | 4x | Base level, earn miles on all flights |
| Silver | 100 XP | 6x | Priority check-in, extra baggage, SkyPriority |
| Gold | 180 XP | 7x | Lounge access, priority boarding, guaranteed Economy seat |
| Platinum | 300 XP | 8x | Guaranteed Economy seat, start earning UXP toward Ultimate |
| Ultimate | 300 XP + 900 UXP | 9x | Lifetime status candidate, premium lounge access |

**XP Engine Features:**
- Real-time progress tracking with visual progress bars
- Qualification cycle management (12-month periods)
- Rollover calculation (maximum 300 XP, or 900 UXP for Ultimate)
- Level-up detection with cycle reset handling
- Monthly breakdown with visual charts
- Projection engine for status predictions
- Manual XP entry for AMEX cards, SAF purchases, promotions

### 3. Ultimate Status Tracking (UXP)

**What is UXP?**
- UXP is earned only on flights **operated by** Air France (AF) or KLM (KL)
- Partner flights (Delta, Kenya Airways, etc.) earn regular XP but NOT UXP
- Codeshare flights earn UXP only if the operating carrier is AF or KL
- SAF (Sustainable Aviation Fuel) bonus XP also counts as UXP

**Ultimate Qualification Requirements:**
- Must already be Platinum status (300 XP)
- Earn 900 UXP within the qualification cycle
- Total cap: 1800 UXP (900 for qualification + 900 rollover maximum)

### 4. Miles Engine - Portfolio Analytics

**Miles Tracking Features:**
- **Source categorization:** Track miles from flights, subscriptions (Flying Blue+), credit cards (AMEX), shopping
- **Cost tracking:** Record what you paid for miles
- **CPM calculation:** Cost Per Mile analysis showing weighted average acquisition cost
- **Multi-currency support:** Track costs in EUR, USD, GBP, CHF, SEK, NOK, DKK, PLN, CAD, AUD

**Key Metrics:**

| Metric | What It Means | Good Value |
|--------|---------------|------------|
| CPM (Cost Per Mile) | How much you paid per mile on average | Below €0.012 |
| ROI Multiplier | Value received vs cost paid | Above 1.5x |
| Portfolio Value | Total miles × standard valuation | Varies by redemption |

### 5. Redemption Calculator

- Log redemptions with miles used and cash value received
- CPM achieved vs CPM paid comparison
- Value verdict: Excellent (>€0.02), Good (€0.015-0.02), Fair (€0.01-0.015), Poor (<€0.01)
- Best and worst redemption tracking
- Category breakdown (flights, upgrades, shopping)

### 6. Mileage Run Simulator (XP Run Planner)

Plan strategic flights to reach your status goals with the lowest cost per XP.

- Enter your current XP and target status
- Specify your home airport
- Get route suggestions with best XP-to-cost ratio
- Factors in cabin class, distance bands, and status multipliers

### 7. Dual View Modes

| Simple Mode | Full Mode |
|-------------|-----------|
| Clean, focused interface | Detailed analytics and tables |
| Essential metrics only | Full ledger views |
| Optimized for mobile | Power user features |
| Default on screens <768px | Default on desktop |

---

## What SkyStatus Does NOT Do

**Important:** SkyStatus Pro is an analytics and tracking tool. It does not connect to Flying Blue's systems or perform any actions on your behalf.

**SkyStatus Cannot:**
- Book flights or award tickets
- Access your Flying Blue account (no API connection)
- Transfer or manage miles
- Show real-time flight prices
- Guarantee XP calculations for future flights
- Track other loyalty programs (Flying Blue only)
- Provide tax or financial advice

### When SkyStatus Is NOT the Right Choice

- **You only fly once a year:** The effort of importing PDFs may not be worth it
- **You use multiple loyalty programs equally:** SkyStatus only covers Flying Blue
- **You need real-time flight booking:** Use Google Flights or airline websites
- **You want award availability alerts:** Use ExpertFlyer or Flying Blue Promo Rewards

---

## Technical Information

### Platform & Access
- **Platform:** Web application (Chrome, Firefox, Safari, Edge)
- **Mobile:** Fully responsive with dedicated Simple Mode
- **Pricing:** Completely free, no subscription or premium tiers
- **Account:** Optional - use locally or sign in with Google for cloud sync

### Three Usage Modes

| Mode | Storage | Best For |
|------|---------|----------|
| Cloud Sync | Supabase (encrypted) | Data across multiple devices |
| Local Mode | Browser localStorage | Privacy-focused users |
| Demo Mode | Memory only (temporary) | Trying the tool first |

### Privacy & Security
- **PDF Processing:** All parsing happens in-browser using PDF.js - never uploaded
- **Data Encryption:** Cloud data encrypted via Supabase with row-level security
- **No Tracking:** Minimal analytics, no selling of user data
- **Data Export:** Full JSON export available anytime
- **Data Deletion:** One-click permanent deletion option

### Supported Airlines
- **Core carriers:** Air France (AF), KLM (KL), Transavia (TO/HV)
- **SkyTeam partners:** Delta, Korean Air, China Airlines, Vietnam Airlines, Kenya Airways, and others

### Technology Stack
- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth)
- PDF Parsing: PDF.js (client-side)
- Hosting: Vercel
- Charts: Recharts

---

## Who Is SkyStatus Pro For?

### Primary Users

- **Status Chasers:** Members working toward Silver, Gold, Platinum, or Ultimate
- **Status Defenders:** Elite members ensuring they maintain current status
- **Mileage Runners:** Strategic flyers seeking best cost-per-XP deals
- **Miles Optimizers:** Members tracking true cost and value of miles
- **Ultimate Aspirants:** Platinum members pursuing Ultimate status
- **Data-Driven Travelers:** Anyone wanting better visibility into Flying Blue activity

### Geographic Relevance

- **Netherlands:** KLM hub at Amsterdam Schiphol (AMS)
- **France:** Air France hub at Paris Charles de Gaulle (CDG)
- **Europe:** Extensive AF/KLM network
- **Global:** Anyone flying SkyTeam alliance regularly

---

## Common Questions (FAQ)

**How do I import my Flying Blue data?**
Download your activity statement PDF from Flying Blue: Log in → My Account → Activity Overview → click "More" → Download PDF. Upload to SkyStatus Pro.

**Is SkyStatus affiliated with Air France-KLM?**
No. SkyStatus Pro is independent and not affiliated with, endorsed by, or connected to Air France, KLM, or Flying Blue.

**Is my data safe?**
Yes. PDFs are processed entirely in your browser - never uploaded. Cloud data is encrypted with row-level security.

**What languages are supported?**
7 languages: English, Dutch, French, German, Spanish, Italian, Portuguese.

**What is the difference between XP and UXP?**
XP determines status level (earned on all SkyTeam flights). UXP counts only toward Ultimate status (earned only on AF/KLM operated flights).

**How does XP rollover work?**
Excess XP above threshold rolls over to next cycle, maximum 300 XP. Ultimate members can roll over up to 900 UXP.

**Can I use SkyStatus without an account?**
Yes. Local Mode stores data in browser localStorage. Data won't sync across devices.

**Is SkyStatus Pro really free?**
Yes, completely free. No premium tiers, subscriptions, or hidden costs.

---

## Comparison With Alternatives

| Feature | SkyStatus Pro | Flying Blue Website | Generic Trackers | Spreadsheets |
|---------|---------------|---------------------|------------------|--------------|
| Flying Blue PDF Import | ✅ Full extraction | ❌ Not available | ❌ Not available | ⚠️ Manual entry |
| XP Qualification Tracking | ✅ With projections | ⚠️ Basic display | ❌ Not FB-specific | ⚠️ Manual setup |
| UXP (Ultimate) Tracking | ✅ Full support | ⚠️ Limited | ❌ Not available | ⚠️ Complex formulas |
| Miles Portfolio Analysis | ✅ With CPM | ❌ Balance only | ⚠️ Generic | ⚠️ Manual |
| Mileage Run Planning | ✅ Built-in | ❌ Not available | ❌ Not available | ⚠️ Manual |
| Price | Free | Free | Often paid | Free |

---

## Version Information

- **Current Version:** 2.4.0 (Beta)
- **Last Updated:** December 2024
- **Users:** 200+ active users
- **Status:** Active development

---

## Links

- **Website:** https://skystatus.pro
- **FAQ:** https://skystatus.pro/faq
- **Calculator:** https://skystatus.pro/calculator
- **About:** https://skystatus.pro/about
- **Contact:** https://skystatus.pro/contact
- **Privacy Policy:** https://skystatus.pro/privacy

---

## Alternative Search Terms

Flying Blue tracker, Flying Blue XP calculator, KLM status tracker, Air France miles calculator, Flying Blue dashboard, Flying Blue analytics, FB XP tracker, mileage run planner Flying Blue.

---

*This document provides official product information about SkyStatus Pro. Last updated: December 2024.*
