# SkyStatus Pro - SEO & GEO Update v2.4.0

## Overzicht van wijzigingen

Deze update verbetert de vindbaarheid van SkyStatus voor zowel Google als AI/LLM systemen (ChatGPT, Claude, Perplexity, etc.).

### Belangrijkste wijzigingen

#### 1. Routing: Hash → History
- **Van:** `/#/faq`, `/#/about`, etc.
- **Naar:** `/faq`, `/about`, etc.
- Google indexeert hash URLs niet als aparte pagina's. Met history routing worden alle pagina's correct geïndexeerd.

#### 2. Uitgebreide Meta Tags (index.html)
- Open Graph tags voor Facebook/LinkedIn
- Twitter Cards voor Twitter/X
- Canonical URL
- Keywords
- JSON-LD Structured Data (SoftwareApplication + Organization schema)

#### 3. Nieuwe Statische Bestanden (public/)
- `robots.txt` - Crawler guidance voor alle bots incl. GPTBot, Claude, Perplexity
- `sitemap.xml` - Sitemap met alle belangrijke pagina's
- `ai-info.html` - **Platte HTML pagina met alle product info voor LLM crawlers**

#### 4. Vercel Configuratie (vercel.json)
- SPA fallback rewrites voor history routing
- Security headers
- Exclusies voor statische bestanden

---

## Installatie Instructies

### Stap 1: Dependencies installeren
```bash
npm install
```
Dit installeert `react-router-dom` (nieuwe dependency).

### Stap 2: Testen lokaal
```bash
npm run dev
```
Test of alle links werken:
- http://localhost:3000/faq
- http://localhost:3000/about
- http://localhost:3000/calculator
- http://localhost:3000/privacy

### Stap 3: Build & Deploy
```bash
npm run build
```
Deploy naar Vercel. De `vercel.json` zorgt voor correcte routing.

---

## Gewijzigde Bestanden

### Root
- `package.json` - react-router-dom toegevoegd, versie 2.4.0
- `index.html` - Uitgebreide meta tags + JSON-LD
- `vercel.json` - **NIEUW** - SPA routing config

### public/
- `robots.txt` - **NIEUW** - Crawler guidance
- `sitemap.xml` - **NIEUW** - Sitemap
- `ai-info.html` - **NIEUW** - LLM info page

### src/
- `main.tsx` - BrowserRouter toegevoegd
- `App.tsx` - Hash routing → path routing

### src/components/
- `LandingPage.tsx` - Links geüpdatet
- `Layout.tsx` - Footer links geüpdatet
- `FAQModal.tsx` - Links geüpdatet
- `FAQPage.tsx` - Links geüpdatet
- `LoginPage.tsx` - Footer links geüpdatet
- `CookieConsent.tsx` - Links geüpdatet
- `PdfImportModal.tsx` - Privacy link geüpdatet
- `OnboardingFlow.tsx` - Privacy link geüpdatet

---

## Nog te doen (door jou)

### 1. OG Image maken
Maak een `og-image.png` (1200x630px) en plaats in `public/`:
- SkyStatus logo
- Tagline: "Flying Blue Analytics Dashboard"
- Screenshot of feature highlights

### 2. Social Profiles toevoegen
In `index.html`, vul de `sameAs` array aan in het Organization schema:
```json
"sameAs": [
  "https://linkedin.com/company/skystatus",
  "https://twitter.com/skystatuspro"
]
```

### 3. Na deployment testen
- Google Search Console: Request indexing voor nieuwe URLs
- Test met: `site:skystatus.pro` in Google
- Test LLM visibility: Vraag ChatGPT/Claude "What is SkyStatus?"

---

## Volgende stappen (CMSEO strategie)

Gebaseerd op de CMSEO analyse, hier de prioriteiten:

### Week 1-2
- [ ] Reddit presence opbouwen (r/flyingblue, r/awardtravel)
- [ ] FlyerTalk account + helpful posts
- [ ] LinkedIn bedrijfspagina aanmaken

### Week 3-4
- [ ] "Data Stories" content: "Uit analyse van 70+ SkyStatus gebruikers..."
- [ ] Comparison content: "SkyStatus vs Excel tracking"
- [ ] YouTube tutorial: "How to track Flying Blue XP"

### Maand 2+
- [ ] Product Hunt launch
- [ ] AlternativeTo listing
- [ ] Travel blog outreach voor mentions

---

## Technische Details

### React Router Setup
```tsx
// main.tsx
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>
```

### Path Detection in App.tsx
```tsx
const location = useLocation();
const navigate = useNavigate();

useEffect(() => {
  const path = location.pathname;
  if (path === '/faq') setLegalPage('faq');
  // etc.
}, [location.pathname]);
```

### Vercel SPA Fallback
```json
{
  "rewrites": [
    {
      "source": "/((?!api|_next|static|favicon\\.svg|robots\\.txt|sitemap\\.xml|ai-info\\.html).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Contact

Vragen over deze update? De wijzigingen zijn gedocumenteerd in deze README.
