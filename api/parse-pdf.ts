// api/parse-pdf.ts
// Vercel Edge Function for AI PDF parsing
// This keeps the OpenAI API key server-side - never exposed to frontend

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES
// ============================================================================

interface ParseRequest {
  pdfText: string;
  model?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// PROMPTS (duplicated here to avoid import issues in serverless)
// ============================================================================

const SYSTEM_PROMPT = `You are a precise data extraction engine for Flying Blue loyalty program PDF statements. Your task is to extract ALL transaction data with 100% accuracy.

## CRITICAL RULES

1. **Extract EVERY transaction** - Do not skip any line items
2. **Use flight dates, not posting dates** - Look for "op [date]" or "on [date]" patterns for actual flight date
3. **UXP is ONLY for KL and AF flights** - Set uxp=0 for all other airlines (DL, VS, SK, HV, etc.)
4. **Preserve negative values** - Miles can be negative (redemptions, adjustments, deductions)
5. **XP from non-flight activities goes to milesActivities** - Not to flights array

## PDF STRUCTURE

Flying Blue PDFs have this structure:
- **Header section**: Member name, number, current status, total balances (Miles, XP, UXP)
- **Transaction list**: Chronologically sorted, newest first

## TRANSACTION PATTERNS

### Flight patterns:
- "Vlucht [City] - [City]" (Dutch)
- "Vol [City] - [City]" (French)  
- "Flight [City] - [City]" (English)
- Contains: route (XXX - YYY), flight number, XP earned, miles earned
- Actual flight date in "op/on [date]" pattern

### CRITICAL: Trip vs Individual Flight XP

Trips in the PDF have TWO levels of data:
1. **Trip header line**: Shows TOTAL for the entire trip (sum of all legs + SAF)
2. **Individual flight lines**: Shows XP/UXP for EACH flight segment
3. **SAF (Sustainable Aviation Fuel) lines**: Shows BONUS XP/UXP from SAF purchase

Example:
\`\`\`
30 nov 2025  Mijn reis naar Berlijn         1312 Miles   16 XP   16 UXP  <-- TRIP TOTAL (ignore!)
             AMS - BER KL1775               276 Miles    5 XP    5 UXP   <-- FLIGHT 1
             Sustainable Aviation Fuel      176 Miles    3 XP    3 UXP   <-- SAF for flight 1
             Sustainable Aviation Fuel      176 Miles    3 XP    3 UXP   <-- SAF for flight 1
             BER - AMS KL1780               684 Miles    5 XP    5 UXP   <-- FLIGHT 2
\`\`\`

**RULES FOR EXTRACTING FLIGHTS:**
- Extract EACH flight segment as a SEPARATE flight entry
- For the flight's xp/uxp: Use the XP/UXP from the INDIVIDUAL FLIGHT LINE (with flight number)
- For safXp: SUM all "Sustainable Aviation Fuel" lines that appear BETWEEN this flight and the next flight (or end of trip)
- In this example:
  - Flight 1 (AMS-BER): xp=5, uxp=5, safXp=6 (3+3 from two SAF lines), safMiles=352
  - Flight 2 (BER-AMS): xp=5, uxp=5, safXp=0, safMiles=0

**WRONG:** One flight with xp=16 (using trip total)
**CORRECT:** Two flights with individual XP + their SAF bonuses attributed correctly

### Status events:
- "Aftrek XP-teller" / "Déduction XP" = XP reset when reaching new status (NEGATIVE XP)
- "Surplus XP beschikbaar" / "XP excédentaires" = Rollover XP to new cycle (POSITIVE XP)
- These events mark qualification cycle boundaries

### Miles activities:
- "Subscribe to Miles" / "Abonnement Miles" = Subscription miles
- "American Express" / "AMEX" = Credit card miles
- Hotel names (Accor, Marriott, etc.) = Hotel partner miles
- "Donation" / "Donatie" = Miles donation (often has XP bonus!)
- "Air adjustment" = Manual adjustment (often has XP!)
- "Promo" / "Bonus" / "Welcome" = Promotional miles

## DATE HANDLING

Always output dates in YYYY-MM-DD format.

Input date formats to handle:
- "30 nov 2025" → "2025-11-30"
- "Nov 30, 2025" → "2025-11-30"
- "30-11-2025" → "2025-11-30"
- "30/11/2025" → "2025-11-30"
- "2025-11-30" → "2025-11-30"

Multi-language months:
- Dutch: jan, feb, mrt, apr, mei, jun, jul, aug, sep, okt, nov, dec
- French: jan, fév, mar, avr, mai, juin, juil, août, sep, oct, nov, déc
- English: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec

## AIRLINE CODES

Common codes in Flying Blue:
- KL = KLM (earns UXP)
- AF = Air France (earns UXP)
- DL = Delta (NO UXP)
- VS = Virgin Atlantic (NO UXP)
- SK = SAS (NO UXP)
- HV = Transavia (NO UXP)
- TO = Transavia France (NO UXP)
- KQ = Kenya Airways (NO UXP)
- MU = China Eastern (NO UXP)

## CABIN CLASS DETECTION

Look for these indicators:
- "Economy" / "Eco" / "M class" / "Light" → Economy
- "Premium" / "PY" / "W class" → Premium Economy
- "Business" / "J class" / "C class" → Business
- "First" / "La Première" / "F class" → First

## OUTPUT FORMAT

Return valid JSON matching the exact structure specified. All fields are required.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    header: {
      type: "object",
      properties: {
        memberName: { type: ["string", "null"], description: "Member's full name" },
        memberNumber: { type: ["string", "null"], description: "Flying Blue member number" },
        currentStatus: { 
          type: "string", 
          enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate"],
          description: "Current status level shown in PDF header"
        },
        totalMiles: { type: "integer", description: "Total miles balance from header" },
        totalXp: { type: "integer", description: "Total XP balance from header" },
        totalUxp: { type: "integer", description: "Total UXP balance from header (0 if not shown)" },
        exportDate: { type: "string", description: "PDF export date in YYYY-MM-DD format (use newest transaction date if not explicit)" }
      },
      required: ["memberName", "memberNumber", "currentStatus", "totalMiles", "totalXp", "totalUxp", "exportDate"],
      additionalProperties: false
    },
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          postingDate: { type: "string", description: "Transaction posting date YYYY-MM-DD" },
          tripTitle: { type: "string", description: "Trip description text" },
          route: { type: "string", description: "Route in XXX - YYY format" },
          flightNumber: { type: "string", description: "Flight number with airline code (e.g., KL1234)" },
          airline: { type: "string", description: "2-letter airline code" },
          flightDate: { type: "string", description: "Actual flight date YYYY-MM-DD (from 'op/on [date]' pattern)" },
          miles: { type: "integer", description: "Miles earned from INDIVIDUAL FLIGHT LINE (not trip header)" },
          xp: { type: "integer", description: "XP from INDIVIDUAL FLIGHT LINE with flight number (NOT trip header total)" },
          uxp: { type: "integer", description: "UXP from INDIVIDUAL FLIGHT LINE (ONLY for KL/AF flights, else 0)" },
          safMiles: { type: "integer", description: "SUM of SAF bonus miles from 'Sustainable Aviation Fuel' lines following this flight (0 if none)" },
          safXp: { type: "integer", description: "SUM of SAF bonus XP from 'Sustainable Aviation Fuel' lines following this flight (0 if none)" },
          cabin: { 
            type: "string", 
            enum: ["Economy", "Premium Economy", "Business", "First", "Unknown"],
            description: "Cabin class"
          },
          isRevenue: { type: "boolean", description: "True if paid ticket, false if award" }
        },
        required: ["postingDate", "tripTitle", "route", "flightNumber", "airline", "flightDate", "miles", "xp", "uxp", "safMiles", "safXp", "cabin", "isRevenue"],
        additionalProperties: false
      }
    },
    milesActivities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Transaction date YYYY-MM-DD" },
          type: { 
            type: "string",
            enum: ["subscription", "amex", "amex_bonus", "hotel", "shopping", "partner", "car_rental", "transfer_in", "transfer_out", "donation", "adjustment", "redemption", "expiry", "promo", "other"],
            description: "Category of miles activity"
          },
          description: { type: "string", description: "Original description from PDF" },
          miles: { type: "integer", description: "Miles amount (negative for deductions)" },
          xp: { type: "integer", description: "Bonus XP earned (0 if none)" }
        },
        required: ["date", "type", "description", "miles", "xp"],
        additionalProperties: false
      }
    },
    statusEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Event date YYYY-MM-DD" },
          type: {
            type: "string",
            enum: ["xp_reset", "xp_surplus", "status_reached", "uxp_reset", "uxp_surplus"],
            description: "Type of status event"
          },
          description: { type: "string", description: "Original description" },
          xpChange: { type: "integer", description: "XP change (negative for reset)" },
          uxpChange: { type: "integer", description: "UXP change (0 if N/A)" },
          statusReached: { 
            type: ["string", "null"],
            enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate", null],
            description: "Status reached if applicable"
          }
        },
        required: ["date", "type", "description", "xpChange", "uxpChange", "statusReached"],
        additionalProperties: false
      }
    }
  },
  required: ["header", "flights", "milesActivities", "statusEvents"],
  additionalProperties: false
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key (server-side only - never exposed to frontend!)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[API] OPENAI_API_KEY not configured');
    return res.status(500).json({ 
      error: 'Server configuration error',
      code: 'API_KEY_MISSING' 
    });
  }

  // Parse request body
  let body: ParseRequest;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { pdfText, model = 'gpt-4o' } = body;

  if (!pdfText || typeof pdfText !== 'string') {
    return res.status(400).json({ error: 'pdfText is required' });
  }

  // Validate model (only allow specific models)
  const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06'];
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ 
      error: `Invalid model. Allowed: ${allowedModels.join(', ')}` 
    });
  }

  console.log(`[API] Parsing PDF with ${model}, text length: ${pdfText.length}`);

  try {
    const startTime = Date.now();

    // Build user prompt
    const userPrompt = `Extract all data from this Flying Blue PDF statement.

CRITICAL RULES:
- Extract EACH FLIGHT SEGMENT separately (not trip totals)
- Use XP/UXP from the INDIVIDUAL FLIGHT LINE (the line with the flight number like KL1234)
- Do NOT use the trip header XP/UXP (the line with "Mijn reis naar..." total)
- For SAF: Attribute the SAF XP/Miles to the flight that PRECEDES the SAF line(s)
- Use the actual flight date (from "op [date]" pattern), not the posting date
- UXP is ONLY earned on KL and AF flights

IMPORTANT:
- Extract EVERY transaction, do not skip any
- Include all status events (XP reset, surplus XP)
- Include all bonus XP from non-flight activities

PDF CONTENT:
\`\`\`
${pdfText}
\`\`\`

Return the complete JSON with all transactions.`;

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ] as OpenAIMessage[],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'flying_blue_pdf',
            strict: true,
            schema: JSON_SCHEMA,
          },
        },
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    // Handle OpenAI errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] OpenAI error: ${response.status}`, errorText);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again in a moment.',
          code: 'RATE_LIMIT',
        });
      }

      if (response.status === 401) {
        return res.status(500).json({
          error: 'API key configuration error',
          code: 'API_KEY_INVALID',
        });
      }

      return res.status(500).json({
        error: `OpenAI error: ${response.status}`,
        code: 'OPENAI_ERROR',
      });
    }

    // Parse response
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[API] No content in OpenAI response');
      return res.status(500).json({
        error: 'No content in AI response',
        code: 'EMPTY_RESPONSE',
      });
    }

    // Parse JSON from response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('[API] Failed to parse JSON from OpenAI:', content.slice(0, 500));
      return res.status(500).json({
        error: 'Failed to parse AI response as JSON',
        code: 'PARSE_ERROR',
      });
    }

    const parseTimeMs = Date.now() - startTime;
    console.log(`[API] Parse complete in ${parseTimeMs}ms`);

    // Return successful response
    return res.status(200).json({
      success: true,
      data: parsedContent,
      metadata: {
        model,
        parseTimeMs,
        tokensUsed: data.usage?.total_tokens ?? 0,
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR',
    });
  }
}
