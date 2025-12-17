# SkyStatus Pro - Automation Update Changelog

**Datum:** 17 december 2025  
**Type:** Infrastructure & Content Freshness Automation

---

## Samenvatting

Deze update introduceert automatische content freshness management. Alle datums, user counts, en sitemap entries worden nu bij elke build automatisch bijgewerkt.

---

## Nieuwe Bestanden

### Scripts
| Bestand | Doel |
|---------|------|
| `scripts/prebuild.js` | Automatische datum/content updates bij build |
| `scripts/fetch-user-count.js` | Haalt user count op uit Supabase |

### GitHub Workflows
| Bestand | Doel | Schedule |
|---------|------|----------|
| `.github/dependabot.yml` | Automatische dependency updates | Wekelijks |
| `.github/workflows/link-check.yml` | Broken link detectie | Zondag 8:00 |
| `.github/workflows/monitor-flying-blue.yml` | Flying Blue change alerts | Dagelijks 8:00 |
| `.github/workflows/update-user-count.yml` | User count sync | 1e van de maand |

---

## Gewijzigde Bestanden

### Build Configuratie
- **package.json**: Toegevoegd `prebuild` script in build chain

### Content Updates (automatisch via prebuild.js)
Alle onderstaande bestanden zijn bijgewerkt met datum `2025-12-17`:

#### Guide Pages (16 bestanden)
- `public/guide/*.html` - Schema.org `dateModified`, "Last updated", "Last verified"

#### Andere HTML
- `public/sitemap.xml` - Alle 25 URLs hebben nu correcte `lastmod`
- `public/ai-info.html` - Alle datums bijgewerkt
- `public/about.html` - User count gecorrigeerd

#### React Components
- `src/components/LegalPages.tsx` - User count: 200+ → 140+
- `src/components/LandingPage.tsx` - "Join thousands" → "Join 140+"

---

## Wat nu automatisch gebeurt

### Bij elke `npm run build`:
1. ✅ Copyright years → huidige jaar
2. ✅ Schema.org `dateModified` → vandaag
3. ✅ Sitemap `lastmod` → vandaag
4. ✅ "Last updated" in guides → vandaag
5. ✅ "Last verified" in guides → vandaag
6. ✅ Titel jaartallen (2025) → huidig jaar
7. ✅ User count (indien `SKYSTATUS_USER_COUNT` env var gezet)

### Via GitHub Actions:
- **Wekelijks (zondag):** Broken link check → Issue bij problemen
- **Dagelijks:** Flying Blue page monitoring → Issue bij wijzigingen
- **Maandelijks:** User count update vanuit Supabase
- **Continu:** Dependabot security updates

---

## Setup Vereisten

### Voor lokale development
Geen extra setup nodig - `npm run build` werkt direct.

### Voor automatische user count updates
Voeg deze secrets toe aan je GitHub repository:
1. `SUPABASE_URL` - Je Supabase project URL
2. `SUPABASE_SERVICE_KEY` - Service role key

Ga naar: Repository → Settings → Secrets and variables → Actions

---

## Breaking Changes

**Geen.** Alle wijzigingen zijn backwards compatible.

---

## Verificatie na Deploy

Run na deploy:
```bash
# Check sitemap datums
curl -s https://skystatus.pro/sitemap.xml | grep lastmod | head -5

# Check Schema.org dateModified
curl -s https://skystatus.pro/guide/what-is-flying-blue-xp | grep dateModified
```

Verwachte output: Alle datums moeten de deploy-datum zijn.

---

## Rollback

Indien nodig, revert naar de vorige commit:
```bash
git revert HEAD
git push
```

De oude hardcoded datums worden dan hersteld (maar dat wil je niet 😉).
