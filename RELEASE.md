# Release Process

Dit project gebruikt [Conventional Commits](https://www.conventionalcommits.org/) en [standard-version](https://github.com/conventional-changelog/standard-version) voor automatische versie-bumping.

## Commit Message Format

```
<type>: <description>

[optional body]
```

### Types en hun effect op versienummers

| Type | Versie Bump | Voorbeeld |
|------|-------------|-----------|
| `fix:` | Patch (2.4.0 → 2.4.1) | `fix: XP rollover berekening` |
| `feat:` | Minor (2.4.1 → 2.5.0) | `feat: Easy Mode toegevoegd` |
| `feat!:` of `BREAKING CHANGE` | Major (2.5.0 → 3.0.0) | `feat!: nieuwe data structuur` |
| `docs:`, `style:`, `refactor:`, `test:`, `chore:` | Geen bump | `docs: README update` |

### Voorbeelden

```bash
# Bug fix → patch bump
git commit -m "fix: PDF parser crash bij Duitse datums"

# Nieuwe feature → minor bump  
git commit -m "feat: donkere modus toegevoegd"

# Breaking change → major bump
git commit -m "feat!: nieuwe API structuur voor vluchten

BREAKING CHANGE: vlucht objecten hebben nu 'departureDate' ipv 'date'"

# Geen versie bump (interne wijziging)
git commit -m "refactor: XP berekening opgeschoond"
git commit -m "docs: README bijgewerkt"
```

## Release Workflow

### Automatisch (aanbevolen)

```bash
# Na één of meer commits:
npm run release

# Dit doet automatisch:
# 1. Bepaalt versie bump op basis van commits
# 2. Update package.json
# 3. Synct versie naar version.ts en ai-info.html
# 4. Genereert/update CHANGELOG.md
# 5. Maakt git commit en tag
```

### Handmatige override

```bash
# Forceer specifieke bump type:
npm run release:patch   # 2.4.0 → 2.4.1
npm run release:minor   # 2.4.0 → 2.5.0
npm run release:major   # 2.4.0 → 3.0.0
```

### Na release

```bash
# Push changes en tags
git push --follow-tags origin main

# Deploy (gebeurt automatisch via Vercel)
```

## Wat wordt automatisch gesynchroniseerd

| Bestand | Wat |
|---------|-----|
| `package.json` | `version` veld |
| `src/config/version.ts` | `APP_VERSION` constant |
| `public/ai-info.html` | Current Version tekst |

### React componenten die automatisch updaten

Deze componenten importeren `APP_VERSION` en tonen altijd de juiste versie:

- `Layout.tsx` - Sidebar en floating beta bar
- `LegalPages.tsx` - About pagina footer

## Wat handmatig blijft

Bij grotere releases moet je mogelijk nog handmatig:

- [ ] `ai-info.html` - Release notes in Version History sectie
- [ ] `ai-info.html` - Nieuwe features toevoegen aan feature list
- [ ] `FAQPage.tsx` - Nieuwe FAQ items
- [ ] `AboutPage` - Nieuwe features in features grid

## Troubleshooting

### Script werkt niet

```bash
# Eerst npm install voor standard-version
npm install

# Dan opnieuw proberen
npm run release
```

### Versie handmatig synchroniseren

```bash
# Als je package.json handmatig hebt gewijzigd:
npm run sync-version
```

### Eerste keer releasen

Bij eerste gebruik maakt standard-version automatisch een `CHANGELOG.md` aan.
