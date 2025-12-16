# Google Analytics 4 Implementation - SkyStatus Pro

## Overzicht

Complete GA4 analytics implementatie voor SkyStatus Pro. Alle events worden alleen gefired als de gebruiker analytics consent heeft gegeven via de cookie banner.

## Geïmplementeerde Events

### 🔐 Access & Authentication

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `access_mode_start` | Gebruiker start app (Google/Demo/Local) | `method` |
| `sign_out` | Gebruiker logt uit | - |

### 🎭 Demo Mode

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `demo_status_change` | Status wisselen (Silver/Gold/Platinum/Ultimate) | `from_status`, `to_status` |
| `demo_exit` | Demo mode verlaten | `action` (create_account/exit) |

### 👁️ View Mode

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `view_mode_change` | Simple ↔ Full toggle | `mode` |

### 🧭 Navigation

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `navigation` | Navigatie tussen secties | `from_view`, `to_view` |
| `page_view` | Pagina bekeken | `page_path`, `page_title` |

### 📄 PDF Import

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `pdf_import` | PDF succesvol geïmporteerd | `flight_count`, `miles_months`, `pdf_language` |
| `pdf_import_error` | PDF import mislukt | `error_type` (invalid_file_type, no_data_found, parse_failed) |

### ✈️ Flight Management

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `flight_add` | Vlucht toegevoegd (handmatig) | `cabin_class`, `is_af_klm` |
| `flight_delete` | Vlucht(en) verwijderd | `count` |

### 💰 Miles Management

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `miles_entry_add` | Miles entry toegevoegd | `source` (subscription/amex/other) |

### 🎁 Redemption Management

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `redemption_add` | Redemption toegevoegd | `miles_used`, `cpm_category` |
| `redemption_delete` | Redemption verwijderd | `count` |

### 💾 Data Export/Import

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `data_export` | JSON export | `format` |
| `data_import` | JSON import | `flights_count`, `redemptions_count`, `miles_months` |

### 📊 Analytics Page

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `analytics_section_view` | Sectie bekeken | `section` (overview/miles/xp/redemptions) |

### 🧮 Calculators

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `calculator_use` | Calculator gebruikt | `calculator_type` (mileage_run/redemption) |
| `mileage_run_simulation` | Mileage run simulatie | `target_status`, `current_xp` |

### 🎓 Onboarding

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `onboarding_complete` | Onboarding voltooid | `has_pdf`, `has_flights` |
| `onboarding_step` | Stap voltooid | `step_number`, `step_name` |

### ⚙️ Settings

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `settings_change` | Instelling gewijzigd | `setting_name`, `setting_value` |

### 📬 Feedback

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `bug_report_submit` | Bug report verzonden | `category` |
| `contact_form_submit` | Contact formulier verzonden | `subject` |

### ❌ Errors

| Event | Wanneer | Parameters |
|-------|---------|------------|
| `exception` | Error opgetreden | `description`, `fatal` |

## Bestanden Gewijzigd

```
src/lib/analytics.ts              - Uitgebreide event functies (25+)
src/hooks/useAnalytics.ts         - Complete hook met alle tracking methods
src/components/Layout.tsx         - View mode + navigation + sign out
src/components/DemoBar.tsx        - Demo status tracking
src/components/LoginPage.tsx      - Access mode tracking (Google/Demo/Local)
src/components/SettingsModal.tsx  - Export/Import JSON tracking
src/components/RedemptionCalc.tsx - Redemption add/delete tracking
src/components/Analytics.tsx      - Section view tracking
src/components/BugReportModal.tsx - Bug report tracking
src/components/ContactModal.tsx   - Contact form tracking
src/components/FlightIntake.tsx   - Flight add tracking
src/components/MilesIntake.tsx    - Miles add tracking
src/components/PdfImportModal.tsx - PDF import + error tracking
src/components/OnboardingFlow.tsx - Onboarding step + completion tracking
src/components/MileageRun/index.tsx - Mileage run calculator tracking
```

## Gebruik

### In een component

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function MyComponent() {
  const { trackFeature, trackNav } = useAnalytics();
  
  const handleClick = () => {
    trackFeature('my_feature');
    // ... andere logica
  };
  
  return <button onClick={handleClick}>Click</button>;
}
```

### Beschikbare tracking functies

```typescript
const {
  isEnabled,           // boolean - is analytics actief?
  track,               // generic event tracking
  trackAccessMode,     // login method
  trackUserSignOut,    // sign out
  trackDemoStatus,     // demo status change
  trackExitDemo,       // exit demo mode
  trackViewMode,       // simple/full toggle
  trackNav,            // navigation
  trackPdf,            // PDF import
  trackPdfError,       // PDF error
  trackFlight,         // add flight
  trackFlightRemove,   // delete flight
  trackMiles,          // add miles
  trackRedemption,     // add redemption
  trackRedemptionRemove, // delete redemption
  trackExport,         // JSON export
  trackImport,         // JSON import
  trackAnalyticsSection, // analytics page section
  trackCalculator,     // calculator usage
  trackMileageRun,     // mileage run simulation
  trackOnboarding,     // onboarding complete
  trackOnboardingStepComplete, // onboarding step
  trackSettings,       // settings change
  trackGuide,          // guide view
  trackFeature,        // feature usage
  trackBugReportSubmit, // bug report
  trackContactFormSubmit, // contact form
  logError,            // error logging
} = useAnalytics();
```

## GDPR Compliance

- Analytics wordt alleen geladen na expliciete consent
- Consent mode v2 is geïmplementeerd
- IP anonimisatie is ingeschakeld
- Google Signals is uitgeschakeld
- Alle tracking functies zijn no-ops als consent niet is gegeven

## GA4 Dashboard Tips

### Aanbevolen Custom Reports

1. **User Journey Report**
   - Events: `access_mode_start` → `navigation` → feature events
   - Zie hoe gebruikers door de app navigeren

2. **Feature Adoption Report**
   - Events: `pdf_import`, `redemption_add`, `calculator_use`, `flight_add`
   - Zie welke features het meest worden gebruikt

3. **Demo Conversion Report**
   - Events: `access_mode_start` (demo) → `demo_exit` (create_account)
   - Track demo-to-signup conversie

4. **Analytics Engagement Report**
   - Events: `analytics_section_view`
   - Zie welke analytics secties het populairst zijn

5. **Onboarding Funnel Report**
   - Events: `onboarding_step` (per step) → `onboarding_complete`
   - Zie waar users afhaken in de onboarding

6. **PDF Import Success Rate**
   - Events: `pdf_import` vs `pdf_import_error`
   - Monitor PDF parser quality
