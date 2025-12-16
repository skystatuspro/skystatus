# SkyStatus Pro - Google Analytics 4 Setup & Compliance Guide

## 📋 Quick Setup Checklist

### Step 1: Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon)
3. In the Account column, ensure your Google Workspace account is selected
4. Click **+ Create Property**
5. Enter:
   - Property name: `SkyStatus Pro`
   - Reporting time zone: `(GMT+01:00) Amsterdam`
   - Currency: `Euro (€)`
6. Click **Next** → Select your business details → Click **Create**

### Step 2: Create Web Data Stream
1. In your new property, click **Data Streams**
2. Click **Web**
3. Enter:
   - Website URL: `https://skystatus.pro`
   - Stream name: `SkyStatus Pro Website`
4. Click **Create stream**
5. **Copy the Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 3: ✅ Measurement ID Already Configured
The Measurement ID `G-9846CTNB76` is already configured in the code. No action needed!

### Step 4: Configure GA4 for GDPR Compliance

In Google Analytics Admin:

#### Data Collection Settings
1. Go to **Admin** → **Data collection and modification** → **Data collection**
2. **Disable Google Signals** ✅ (already disabled by code, but verify in dashboard)
3. Set **User data collection acknowledgement** = Acknowledged

#### Data Retention
1. Go to **Admin** → **Data collection and modification** → **Data retention**
2. Set **Event data retention** = `2 months` (minimum for GDPR)
3. **Reset user data on new activity** = OFF

#### IP Anonymization
- ✅ GA4 anonymizes IPs by default (no action needed)
- Our code explicitly sets `anonymize_ip: true` as extra assurance

### Step 5: Deploy
1. Commit all changes to your repository
2. Push to Vercel: `git push origin main`
3. Verify in Vercel dashboard that deployment succeeded

### Step 6: Verify Installation
1. Open [skystatus.pro](https://skystatus.pro)
2. Accept cookies in the consent banner
3. In GA4, go to **Reports** → **Realtime**
4. You should see your visit appear

---

## ✅ GDPR Compliance Audit Results

### P0 - Critical (Must Have) ✅ COMPLETED

| Item | Status | Notes |
|------|--------|-------|
| Cookie Consent Banner | ✅ Done | Full GDPR-compliant banner with opt-in/opt-out |
| Analytics loads AFTER consent | ✅ Done | GA4 only initializes when `analytics: true` in consent |
| Privacy Policy - GA4 mention | ✅ Done | Section 8 updated with GA4 details |
| Cookie Policy - GA4 cookies | ✅ Done | Added `_ga` and `_ga_*` to cookie table |
| IP Anonymization | ✅ Done | Default in GA4 + explicit in code |
| Google Signals disabled | ✅ Done | Set in code: `allow_google_signals: false` |

### P1 - Important (Should Have) ✅ COMPLETED

| Item | Status | Notes |
|------|--------|-------|
| Consent Mode v2 | ✅ Done | Uses `gtag('consent', 'default/update')` |
| Opt-out mechanism | ✅ Done | Cookie Settings in footer |
| Third-party services listed | ✅ Done | GA4 added to Privacy Policy section 9 |
| Cookie descriptions | ✅ Done | `_ga`, `_ga_*` cookies documented |
| Static pages tracking | ✅ Done | `/guide/*` pages have consent-aware GA4 |

### P2 - Nice to Have (Recommended)

| Item | Status | Notes |
|------|--------|-------|
| Event tracking | ✅ Ready | Pre-built events for PDF import, login, calculator use |
| Data retention config | ⏳ Manual | Configure in GA4 dashboard (see Step 4) |
| Consent analytics | 📝 Optional | Could track consent rates |
| Server-side validation | 📝 Future | Not needed for current scale |

---

## 🔧 Technical Implementation Details

### Files Created/Modified

```
src/lib/analytics.ts          # NEW - GA4 integration with consent
src/hooks/useAnalytics.ts     # NEW - React hooks for tracking
src/lib/CookieContext.tsx     # MODIFIED - Integrated GA4 init
src/App.tsx                   # MODIFIED - Added PageTracker component
src/components/LegalPages.tsx # MODIFIED - Updated Privacy & Cookie Policy
public/js/ga4-static.js       # NEW - GA4 for static HTML pages
public/guide/*.html           # MODIFIED - Added GA4 script reference
public/about.html             # MODIFIED - Added GA4 script reference
public/ai-info.html           # MODIFIED - Added GA4 script reference
```

### How Consent Flow Works

```
User visits site
    │
    ▼
Cookie banner appears
    │
    ├─── "Accept All" ───► analytics: true ───► initializeAnalytics() ───► GA4 loads
    │
    ├─── "Reject Optional" ───► analytics: false ───► GA4 never loads
    │
    └─── "Customize" ───► User toggles ───► saveConsent() ───► Conditional load
```

### Available Tracking Events

```typescript
// Import the hook
import { useAnalytics } from './hooks/useAnalytics';

// In your component
const { trackPdf, trackUserLogin, trackCalculator, trackFeature } = useAnalytics();

// Track PDF import
trackPdf(flightCount, 'en'); // e.g., trackPdf(42, 'en')

// Track login
trackUserLogin('google'); // 'google' | 'demo' | 'local'

// Track calculator usage
trackCalculator('mileage_run'); // 'mileage_run' | 'redemption' | 'xp_simulation'

// Track feature usage
trackFeature('easy_mode_toggle');
```

### Pageview Tracking

Pageviews are tracked automatically via the `<PageTracker />` component in App.tsx. It uses React Router's `useLocation` to detect route changes.

---

## 🔍 Post-Deployment Verification

### Check GA4 is Working

1. **Clear cookies** in your browser
2. Visit [skystatus.pro](https://skystatus.pro)
3. **Accept cookies** in the banner
4. Open browser DevTools → Console
5. Look for: `[Analytics] GA4 initialized with consent`
6. Check GA4 Realtime reports

### Check Consent is Working

1. **Reject cookies** or only accept "Necessary"
2. Check Console: should NOT see GA4 initialization
3. No `_ga` cookie should be set (check Application → Cookies)

### Check Static Pages

1. Visit [skystatus.pro/guide](https://skystatus.pro/guide)
2. If you previously accepted analytics, check for `[GA4 Static]` in console
3. Page views should appear in GA4 under the `/guide/` path

---

## 📊 Recommended GA4 Dashboard Setup

### Key Reports to Create

1. **Pages and screens** → See which guide articles are popular
2. **Events** → Monitor PDF imports, logins, calculator usage
3. **User acquisition** → See how users find SkyStatus
4. **Engagement** → Track session duration and pages per session

### Suggested Goals/Conversions

- `pdf_import` - User imported their Flying Blue data
- `login` (method: google) - User created an account
- `onboarding_complete` - User finished onboarding

---

## 🛡️ Ongoing Compliance

### Monthly Tasks
- [ ] Review data retention settings
- [ ] Check consent rates (if tracking implemented)
- [ ] Verify no PII in custom events

### Policy Updates
If you add new tracking features:
1. Update Privacy Policy section 8
2. Update Cookie Policy section 3 (if new cookies)
3. Bump `CONSENT_VERSION` in CookieContext.tsx to re-ask consent

---

## 📞 Support

Questions about this implementation? Contact: support@skystatus.pro
