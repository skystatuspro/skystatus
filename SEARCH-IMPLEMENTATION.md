# Search Feature Implementation

Dit document beschrijft hoe de zoekfunctie is geïmplementeerd en hoe je het kunt integreren.

## Overzicht

De zoekfunctie indexeert:
- 16 guide HTML pagina's
- 39 FAQ items (uit FAQPage.tsx)
- 2 statische pagina's (about, ai-info)

Totaal: 57 doorzoekbare items

## Bestanden

### Nieuwe bestanden
- `scripts/build-search-index.js` - Genereert de search index bij build
- `src/components/SearchModal.tsx` - React search component
- `public/search-index.json` - Gegenereerde index (automatisch bij build)

### Gewijzigde bestanden
- `scripts/prebuild.js` - Roept build-search-index.js aan
- `src/components/Layout.tsx` - Search button en modal geïntegreerd

## Gebruik

### Keyboard shortcut
- `Cmd+K` (Mac) of `Ctrl+K` (Windows) opent de zoekmodal

### UI locaties
- Desktop sidebar: Search button boven de navigatie
- Mobile header: Search icon naast het hamburger menu

## Build process

De search index wordt automatisch gegenereerd bij `npm run build`:

```
npm run build
```

Dit roept `prebuild.js` aan, wat op zijn beurt `build-search-index.js` importeert.

### Handmatig index genereren

```bash
node scripts/build-search-index.js
```

## Index structuur

Elk item in de index bevat:

```typescript
{
  id: string;           // Unieke ID (guide-slug, faq-N, page-slug)
  title: string;        // Paginatitel
  description: string;  // Meta description
  content: string;      // Volledige tekst (max 5000 chars voor guides)
  url: string;          // Relatieve URL
  type: 'guide' | 'faq' | 'page';
  headings: Array<{     // H2/H3 headings voor section jumping
    level: number;
    id: string;
    text: string;
  }>;
}
```

## Zoeklogica

De zoekfunctie gebruikt een simpele fuzzy matching zonder externe dependencies:

1. Exact phrase match: +100 score
2. Word matches: +20 per woord
3. Word at start bonus: +10

Velden worden gewogen:
- Title: 3x
- Description: 2x
- Content: 0.5x
- Headings: 2.5x

Resultaten worden gesorteerd op score (hoogste eerst), max 10 resultaten.

## Styling

De component gebruikt bestaande Tailwind klassen:
- Primary blue: `brand-600` / `blue-600`
- Dark background: `slate-900`
- Modal overlay: `slate-900/60` met `backdrop-blur-sm`

## Dependencies

Geen nieuwe npm dependencies nodig. De fuzzy search is ingebouwd.

Als je betere zoekresultaten wilt, kun je later Fuse.js toevoegen:

```bash
npm install fuse.js
```

## Toekomstige verbeteringen

1. Section jumping met heading anchors (headings hebben nu vaak geen id)
2. Recent searches opslaan in localStorage
3. Analytics tracking voor zoekqueries
4. Highlight matched text in resultaten
5. Fuse.js voor geavanceerdere fuzzy matching

## Troubleshooting

### Search index niet gevonden
Controleer of `public/search-index.json` bestaat. Run:
```bash
node scripts/build-search-index.js
```

### Nieuwe content wordt niet gevonden
De index wordt alleen bij build gegenereerd. Run opnieuw:
```bash
npm run build
```

### Modal opent niet met Cmd+K
Controleer of `useSearchShortcut` correct is geïmporteerd in Layout.tsx.
