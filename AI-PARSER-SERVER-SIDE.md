# AI Parser - Server-Side Implementation

## Wat is er veranderd?

De AI parser is nu **productie-klaar** met de OpenAI API key veilig opgeslagen op de server.

### Architectuur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │────▶│   Vercel API    │────▶│   OpenAI API    │
│   (frontend)    │     │   /api/parse-pdf│     │                 │
│                 │◀────│                 │◀────│                 │
│   Geen API key  │     │   OPENAI_API_KEY│     │   gpt-4o        │
│   nodig!        │     │   (server-side) │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Nieuwe/gewijzigde bestanden

### 1. API Route (NIEUW)
```
api/parse-pdf.ts
```
- Vercel serverless function
- OpenAI API key blijft server-side
- Maximale runtime: 60 seconden

### 2. Frontend Parser (GEWIJZIGD)
```
src/modules/ai-pdf-parser/parser.ts
```
- Roept nu `/api/parse-pdf` aan i.p.v. direct OpenAI
- Geen apiKey parameter meer nodig

### 3. Types (GEWIJZIGD)
```
src/modules/ai-pdf-parser/types.ts
```
- `apiKey` is nu optioneel (deprecated)
- Nieuwe error code: `NETWORK_ERROR`

### 4. Test Component (GEWIJZIGD)
```
src/components/AIParserTest.tsx
```
- API key input verwijderd
- Privacy notice aangepast

### 5. Vercel Config (GEWIJZIGD)
```
vercel.json
```
- Function config toegevoegd voor api/parse-pdf.ts
- Max duration: 60 seconden

## Vercel Environment Variables

### TE VERWIJDEREN:
```
VITE_OPENAI_API_KEY  ❌ (wordt gebundeld in frontend!)
```

### TOE TE VOEGEN:
```
OPENAI_API_KEY       ✅ (alleen server-side)
```

## Stappen om te deployen

### 1. Vercel Environment Variables aanpassen

1. Ga naar je Vercel project → Settings → Environment Variables
2. **Verwijder**: `VITE_OPENAI_API_KEY` 
3. **Voeg toe**: `OPENAI_API_KEY` met dezelfde waarde
4. Zorg dat deze NIET begint met `VITE_` (anders wordt ie gebundeld in frontend)

### 2. Deploy de nieuwe code

```bash
git add .
git commit -m "feat: server-side AI parser for production security"
git push
```

### 3. Test de implementatie

1. Ga naar `https://skystatus.pro/ai-parser`
2. Upload een Flying Blue PDF
3. De parser zou moeten werken zonder API key input

## Model keuze

De API route gebruikt standaard `gpt-4o` wat de beste balans biedt:
- 100% betrouwbare structured output
- Goede prijs/kwaliteit verhouding
- Snel genoeg voor PDF parsing

Toegestane modellen:
- `gpt-4o` (default, aanbevolen)
- `gpt-4o-mini` (goedkoper, iets minder accuraat)
- `gpt-4o-2024-08-06` (specifieke versie)

## Kosten inschatting

Per PDF parse (gemiddeld 5000-10000 tokens):
- **gpt-4o**: ~$0.05-0.15 per PDF
- **gpt-4o-mini**: ~$0.005-0.015 per PDF

Met 150+ gebruikers en occasioneel gebruik, verwacht ~$5-20/maand.

## Troubleshooting

### "AI Parser is not configured"
→ `OPENAI_API_KEY` environment variable niet gezet in Vercel

### "Rate limit exceeded"
→ OpenAI rate limit bereikt, wacht even en probeer opnieuw

### "Request timed out"
→ PDF te groot of OpenAI traag, probeer met kleinere PDF

### API key nog steeds zichtbaar in DevTools?
→ Check of je `VITE_OPENAI_API_KEY` hebt verwijderd en opnieuw deployed
