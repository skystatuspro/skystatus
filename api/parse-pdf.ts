// api/parse-pdf.ts
// Vercel Edge Function for AI PDF parsing
// Keeps OpenAI API key server-side
//
// CHANGELOG v2.2.2 (2025-12-23):
// - v2.2 base: Generalized segment detection, route coverage validation, auto-retry
// - v2.2.1 fix: Added date format descriptions to JSON schema (YYYY-MM-DD)
// - v2.2.2 fix: Fixed statusEvents classification - XP reset/surplus now correctly
//   goes to statusEvents instead of milesActivities. This fixes qualification
//   cycle detection and XP calculation in the dashboard.

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

type FlightOut = {
  postingDate: string;
  tripTitle: string;
  route: string;
  flightNumber: string;
  airline: string;
  flightDate: string;
  miles: number;
  xp: number;
  uxp: number;
  safMiles: number;
  safXp: number;
  cabin: "Economy" | "Premium Economy" | "Business" | "First" | "Unknown";
  isRevenue: boolean;
};

type ParsedOut = {
  header: {
    memberName: string | null;
    memberNumber: string | null;
    currentStatus: "Explorer" | "Silver" | "Gold" | "Platinum" | "Ultimate";
    totalMiles: number;
    totalXp: number;
    totalUxp: number;
    exportDate: string;
  };
  flights: FlightOut[];
  milesActivities: Array<{
    date: string;
    type: "subscription" | "amex" | "amex_bonus" | "hotel" | "shopping" | "partner" | "car_rental" | "transfer_in" | "transfer_out" | "donation" | "adjustment" | "redemption" | "expiry" | "promo" | "other";
    description: string;
    miles: number;
    xp: number;
  }>;
  statusEvents: Array<{
    date: string;
    type: "xp_reset" | "xp_surplus" | "status_reached" | "uxp_reset" | "uxp_surplus";
    description: string;
    xpChange: number;
    uxpChange: number;
    statusReached: "Explorer" | "Silver" | "Gold" | "Platinum" | "Ultimate" | null;
  }>;
};

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `You are a precise data extraction engine for Flying Blue loyalty program PDF statements. Your task is to extract ALL transaction data with 100% accuracy.

## CRITICAL RULES

1. Extract EVERY transaction. Do not skip any line items.
2. Use flight dates, not posting dates. Look for "op [date]" or "on [date]" patterns for actual flight date.
3. UXP is ONLY for KL and AF flights. Set uxp=0 for all other airlines (DL, VS, SK, HV, etc.).
4. Preserve negative values. Miles can be negative (redemptions, adjustments, deductions).
5. XP from non-flight activities goes to milesActivities, not to flights.
6. Flights can be detected by either:
   - Route + flight number (KL1234, AF0123, DL456, SK0822, etc.)
   - Route + explicit carrier label when flight number is missing (for example TRANSAVIA HOLLAND)

## DATE FORMAT

ALL dates must be output in YYYY-MM-DD format.

Input date formats to convert:
- "30 nov 2025" -> "2025-11-30"
- "Nov 30, 2025" -> "2025-11-30"
- "30-11-2025" -> "2025-11-30"
- "30/11/2025" -> "2025-11-30"

Multi-language months:
- Dutch: jan, feb, mrt, apr, mei, jun, jul, aug, sep, okt, nov, dec
- French: jan, fev, mar, avr, mai, juin, juil, aout, sep, oct, nov, dec
- English: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec

## PDF STRUCTURE

Flying Blue PDFs have:
- Header section: member name, number, current status, total balances
- Transaction list: newest first

## CRITICAL: Trip vs Individual Flight XP

Trips have two levels:
1. Trip header line shows totals for the whole trip. Never use those totals as a flight segment.
2. Individual flight lines show miles, XP, UXP per segment.
3. SAF lines show bonuses that must be attributed to the preceding flight segment.

Rules:
- Extract each flight segment separately.
- Use XP and UXP from the individual flight line.
- SAF: sum all "Sustainable Aviation Fuel" lines after a flight until the next flight, and assign to that flight.

## CRITICAL: Transavia flights

Transavia flights can have no flight number.
- Pattern includes "TRANSAVIA" or "TRANSAVIA HOLLAND"
- Airline code must be "HV"
- Set flightNumber to empty string ""
- uxp must be 0

## CRITICAL: Status Events vs Miles Activities

This is VERY IMPORTANT for correct classification:

### statusEvents (qualification cycle events) - PUT THESE IN statusEvents ARRAY:
These are XP/UXP counter events that mark qualification cycle boundaries:

1. **xp_reset**: "Aftrek XP-teller" / "Deduction XP counter" / "Reset XP-teller"
   - Dutch: "Aftrek XP-teller", "Reset XP-teller"
   - French: "Deduction compteur XP"
   - English: "XP counter deduction"
   - xpChange should be NEGATIVE (e.g., -300, -180, -100)
   - This happens when you reach a new status level

2. **xp_surplus**: "Surplus XP beschikbaar" / "Excess XP available"
   - Dutch: "Surplus XP beschikbaar op XP-teller"
   - French: "XP excedentaires disponibles"
   - English: "Surplus XP available"
   - xpChange should be POSITIVE (the rollover amount, e.g., 23, 5, 0)
   - This is XP that carries over to the new cycle

3. **uxp_reset**: Same as xp_reset but for UXP counter
4. **uxp_surplus**: Same as xp_surplus but for UXP counter

### milesActivities (miles earning/spending) - PUT THESE IN milesActivities ARRAY:
- Subscriptions, credit cards, hotels, shopping, donations, redemptions, etc.
- Promotional miles bonuses
- Any activity that earns or spends MILES

### How to decide:
- If it mentions "XP-teller", "XP counter", "Aftrek", "Surplus", "Reset" -> statusEvents
- If it mentions miles earned/spent from partners, subscriptions, etc. -> milesActivities

## OUTPUT

Return valid JSON matching the exact schema. All fields are required. All dates must be YYYY-MM-DD format.`;

// ============================================================================
// JSON SCHEMA (Structured Outputs)
// ============================================================================

const JSON_SCHEMA = {
  type: "object",
  properties: {
    header: {
      type: "object",
      properties: {
        memberName: { type: ["string", "null"], description: "Member full name" },
        memberNumber: { type: ["string", "null"], description: "Flying Blue member number" },
        currentStatus: { type: "string", enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate"], description: "Current status level" },
        totalMiles: { type: "integer", description: "Total miles balance" },
        totalXp: { type: "integer", description: "Total XP balance" },
        totalUxp: { type: "integer", description: "Total UXP balance (0 if not shown)" },
        exportDate: { type: "string", description: "PDF export date in YYYY-MM-DD format" }
      },
      required: ["memberName", "memberNumber", "currentStatus", "totalMiles", "totalXp", "totalUxp", "exportDate"],
      additionalProperties: false
    },
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          postingDate: { type: "string", description: "Transaction posting date in YYYY-MM-DD format" },
          tripTitle: { type: "string", description: "Trip description text" },
          route: { type: "string", description: "Route as AAA-BBB with no spaces (e.g., AMS-BER)" },
          flightNumber: { type: "string", description: "Flight number (e.g., KL1234). Empty string for Transavia flights" },
          airline: { type: "string", description: "2-letter airline code. Use HV for Transavia" },
          flightDate: { type: "string", description: "Actual flight date in YYYY-MM-DD format (from op/on pattern)" },
          miles: { type: "integer", description: "Miles earned from flight" },
          xp: { type: "integer", description: "XP earned from flight" },
          uxp: { type: "integer", description: "UXP earned (only KL/AF, else 0)" },
          safMiles: { type: "integer", description: "SAF bonus miles (0 if none)" },
          safXp: { type: "integer", description: "SAF bonus XP (0 if none)" },
          cabin: { type: "string", enum: ["Economy", "Premium Economy", "Business", "First", "Unknown"], description: "Cabin class" },
          isRevenue: { type: "boolean", description: "True if paid ticket" }
        },
        required: ["postingDate", "tripTitle", "route", "flightNumber", "airline", "flightDate", "miles", "xp", "uxp", "safMiles", "safXp", "cabin", "isRevenue"],
        additionalProperties: false
      }
    },
    milesActivities: {
      type: "array",
      description: "Miles earning/spending activities. Do NOT include XP reset/surplus events here.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
          type: { type: "string", enum: ["subscription", "amex", "amex_bonus", "hotel", "shopping", "partner", "car_rental", "transfer_in", "transfer_out", "donation", "adjustment", "redemption", "expiry", "promo", "other"], description: "Activity category - NOT for XP counter events" },
          description: { type: "string", description: "Original description from PDF" },
          miles: { type: "integer", description: "Miles amount (negative for deductions)" },
          xp: { type: "integer", description: "Bonus XP if any (0 if none) - NOT for XP counter reset/surplus" }
        },
        required: ["date", "type", "description", "miles", "xp"],
        additionalProperties: false
      }
    },
    statusEvents: {
      type: "array",
      description: "XP/UXP counter events that mark qualification cycle boundaries. MUST include Aftrek XP-teller and Surplus XP events here.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Event date in YYYY-MM-DD format" },
          type: { 
            type: "string", 
            enum: ["xp_reset", "xp_surplus", "status_reached", "uxp_reset", "uxp_surplus"], 
            description: "xp_reset for 'Aftrek XP-teller', xp_surplus for 'Surplus XP beschikbaar'" 
          },
          description: { type: "string", description: "Original description from PDF" },
          xpChange: { type: "integer", description: "XP change - NEGATIVE for reset (e.g., -300), POSITIVE for surplus (e.g., 23)" },
          uxpChange: { type: "integer", description: "UXP change (0 if this is an XP event, not UXP)" },
          statusReached: { type: ["string", "null"], enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate", null], description: "Status level reached, or null" }
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
// HELPERS
// ============================================================================

function normalizeRoute(raw: string): string | null {
  // Converts "AMS - BER" or "AMS – BER" into "AMS-BER"
  const m = raw.match(/\b([A-Z]{3})\s*[-–]\s*([A-Z]{3})\b/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function extractExpectedSegments(pdfText: string) {
  // Goal: find likely flight segment lines in raw pdfText
  // We keep it conservative: route + (flight number OR explicit carrier markers)
  
  // Split on common separators - pdfText from pdf.js may have various formats
  const lines = pdfText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  
  // If no newlines, try splitting on page markers or double spaces
  const effectiveLines = lines.length > 10 
    ? lines 
    : pdfText.split(/\s{2,}/).map(l => l.trim()).filter(Boolean);

  const carrierMarkers = [
    "TRANSAVIA",
  ];

  const expected: Array<{
    route: string;
    carrierHint: string;
    flightNumber: string | null;
    raw: string;
  }> = [];

  for (const line of effectiveLines) {
    const route = normalizeRoute(line);
    if (!route) continue;

    const flightNoMatch = line.match(/\b([A-Z]{2}\d{2,4})\b/);
    const flightNumber = flightNoMatch ? flightNoMatch[1] : null;

    const hasCarrierMarker = carrierMarkers.some(m => line.toUpperCase().includes(m));

    // Keep if it looks like a flight segment:
    // - Has a flight number, OR
    // - Has a carrier marker like TRANSAVIA
    if (flightNumber || hasCarrierMarker) {
      const carrierHint = hasCarrierMarker ? "MARKER" : "FLIGHTNO";
      expected.push({ route, carrierHint, flightNumber, raw: line.slice(0, 100) });
    }
  }

  // Deduplicate expected segments by route + flightNumber
  const keySet = new Set<string>();
  const deduped: typeof expected = [];
  for (const e of expected) {
    const k = `${e.route}|${e.flightNumber ?? ""}`;
    if (keySet.has(k)) continue;
    keySet.add(k);
    deduped.push(e);
  }

  // Build a route set for coverage checks
  const expectedRoutes = [...new Set(deduped.map(e => e.route))];

  // Special: detect if ALC appears anywhere, useful for debugging
  const hasALC = /\bALC\b/.test(pdfText);
  
  // Detect status events in PDF text
  const hasXpReset = /aftrek\s*xp|reset\s*xp|deduction.*xp/i.test(pdfText);
  const hasXpSurplus = /surplus\s*xp|excedent/i.test(pdfText);

  return {
    expectedSegments: deduped,
    expectedRoutes,
    hasALC,
    hasXpReset,
    hasXpSurplus
  };
}

function validateOutputBasic(parsed: ParsedOut) {
  const errors: string[] = [];

  // Route regex check
  for (const f of parsed.flights || []) {
    if (!/^[A-Z]{3}-[A-Z]{3}$/.test(f.route)) {
      errors.push(`Invalid route format: "${f.route}"`);
    }
    // UXP sanity
    if (f.airline !== "KL" && f.airline !== "AF" && f.uxp !== 0) {
      errors.push(`UXP must be 0 for ${f.airline}: route=${f.route}, uxp=${f.uxp}`);
    }
    // Date format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.flightDate)) {
      errors.push(`Invalid flightDate format: "${f.flightDate}" (expected YYYY-MM-DD)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.postingDate)) {
      errors.push(`Invalid postingDate format: "${f.postingDate}" (expected YYYY-MM-DD)`);
    }
  }

  // Check milesActivities dates
  for (const a of parsed.milesActivities || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
      errors.push(`Invalid milesActivity date format: "${a.date}" (expected YYYY-MM-DD)`);
    }
  }

  // Check statusEvents dates
  for (const e of parsed.statusEvents || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      errors.push(`Invalid statusEvent date format: "${e.date}" (expected YYYY-MM-DD)`);
    }
  }

  return errors;
}

function coverageCheck(parsed: ParsedOut, expectedRoutes: string[]) {
  const extractedRoutes = new Set<string>((parsed.flights || []).map(f => f.route));
  const missingRoutes = expectedRoutes.filter(r => !extractedRoutes.has(r));
  return { missingRoutes };
}

function statusEventsCheck(parsed: ParsedOut, hasXpReset: boolean, hasXpSurplus: boolean) {
  const issues: string[] = [];
  
  const hasResetEvent = (parsed.statusEvents || []).some(e => e.type === 'xp_reset');
  const hasSurplusEvent = (parsed.statusEvents || []).some(e => e.type === 'xp_surplus');
  
  if (hasXpReset && !hasResetEvent) {
    issues.push('PDF contains XP reset but statusEvents is missing xp_reset');
  }
  if (hasXpSurplus && !hasSurplusEvent) {
    issues.push('PDF contains XP surplus but statusEvents is missing xp_surplus');
  }
  
  // Check if XP events were incorrectly put in milesActivities
  for (const a of parsed.milesActivities || []) {
    const desc = a.description.toLowerCase();
    if (desc.includes('aftrek') && desc.includes('xp')) {
      issues.push(`XP reset incorrectly in milesActivities: "${a.description}"`);
    }
    if (desc.includes('surplus') && desc.includes('xp')) {
      issues.push(`XP surplus incorrectly in milesActivities: "${a.description}"`);
    }
  }
  
  return issues;
}

async function callOpenAIJSON(apiKey: string, model: string, userPrompt: string) {
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

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false as const, status: response.status, errorText };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false as const, status: 500, errorText: 'EMPTY_RESPONSE' };
  }

  let parsedContent: ParsedOut;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return { ok: false as const, status: 500, errorText: 'PARSE_ERROR' };
  }

  return {
    ok: true as const,
    parsedContent,
    usage: data.usage || {},
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error', code: 'API_KEY_MISSING' });
  }

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

  const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06'];
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: `Invalid model. Allowed: ${allowedModels.join(', ')}` });
  }

  console.log(`[API] Parsing PDF with ${model}, text length: ${pdfText.length}`);

  const startTime = Date.now();

  // Pre-scan expected segments and routes
  const { expectedSegments, expectedRoutes, hasALC, hasXpReset, hasXpSurplus } = extractExpectedSegments(pdfText);
  console.log(`[API] Expected segments: ${expectedSegments.length}, routes: ${expectedRoutes.length}, hasALC: ${hasALC}, hasXpReset: ${hasXpReset}, hasXpSurplus: ${hasXpSurplus}`);

  // Keep prompt smaller: only include route list, not raw lines
  const expectedRoutesList = expectedRoutes.slice(0, 50).join(', ');
  const expectedSegmentCount = expectedSegments.length;

  const baseUserPrompt = `Extract all data from this Flying Blue PDF statement.

CRITICAL RULES:
- Extract EACH FLIGHT SEGMENT separately. Never use trip totals as a flight segment.
- Flight segments are detected by route + flight number, OR route + carrier label (for example TRANSAVIA HOLLAND).
- For SAF: attribute SAF miles and SAF XP to the immediately preceding flight segment until the next flight segment starts.
- Use the actual flight date from "op [date]" or "on [date]".
- UXP is only for KL and AF flights. For all other airlines, uxp must be 0.
- Transavia flights: airline must be HV and flightNumber must be empty string "".
- ALL dates must be in YYYY-MM-DD format. Convert "30 nov 2025" to "2025-11-30".

CRITICAL - STATUS EVENTS CLASSIFICATION:
- "Aftrek XP-teller" or "Reset XP-teller" -> statusEvents with type "xp_reset", xpChange should be NEGATIVE
- "Surplus XP beschikbaar" -> statusEvents with type "xp_surplus", xpChange should be POSITIVE
- These are NOT milesActivities! They go in statusEvents array.
- PDF contains XP reset events: ${hasXpReset ? "YES - must extract to statusEvents" : "no"}
- PDF contains XP surplus events: ${hasXpSurplus ? "YES - must extract to statusEvents" : "no"}

COVERAGE REQUIREMENT:
- You must cover ALL routes that appear as flight segment lines in the raw text.
- Expected distinct routes found in raw text: ${expectedRoutes.length}
- Expected route list (sample): ${expectedRoutesList}
- Expected segment-like line count (heuristic): ${expectedSegmentCount}
- Raw text contains ALC: ${hasALC ? "yes" : "no"}

PDF CONTENT:
\`\`\`
${pdfText}
\`\`\`

Return the complete JSON with all transactions. All dates must be YYYY-MM-DD format.`;

  // First attempt
  const first = await callOpenAIJSON(apiKey, model, baseUserPrompt);
  if (!first.ok) {
    console.error(`[API] OpenAI error: ${first.status}`, first.errorText);
    return res.status(500).json({ error: `OpenAI error: ${first.status}`, code: 'OPENAI_ERROR', details: first.errorText });
  }

  let parsed = first.parsedContent;

  // Basic validation
  const basicErrors1 = validateOutputBasic(parsed);
  const { missingRoutes: missing1 } = coverageCheck(parsed, expectedRoutes);
  const statusIssues1 = statusEventsCheck(parsed, hasXpReset, hasXpSurplus);

  let didRetry = false;
  let retryReason: string | null = null;

  const allIssues1 = [...basicErrors1, ...statusIssues1];

  if (missing1.length > 0 || allIssues1.length > 0) {
    didRetry = true;
    retryReason = [
      missing1.length > 0 ? `missingRoutes=${missing1.slice(0, 20).join(',')}` : null,
      allIssues1.length > 0 ? `issues=${allIssues1.slice(0, 10).join(' | ')}` : null,
    ].filter(Boolean).join(' ; ');

    console.log(`[API] Retry needed: ${retryReason}`);

    const retryPrompt = `${baseUserPrompt}

RETRY INSTRUCTIONS:
- Your previous output is invalid or incomplete.
- Missing routes detected: ${missing1.slice(0, 50).join(', ')}
- Issues detected: ${allIssues1.slice(0, 10).join(', ')}
- Fix the issues and return the full JSON again.
- Do not drop flights to satisfy the schema. Use empty string for missing flightNumber when the PDF shows no flight number.
- Ensure every expected route appears at least once in flights.
- CRITICAL: "Aftrek XP-teller" and "Surplus XP beschikbaar" MUST go in statusEvents, NOT in milesActivities!
- CRITICAL: All dates MUST be in YYYY-MM-DD format (e.g., "2025-11-30").`;

    const second = await callOpenAIJSON(apiKey, model, retryPrompt);
    if (!second.ok) {
      // Return first output but flag issues, do not fail hard
      console.warn(`[API] Retry failed: ${second.status}`);
      const parseTimeMs = Date.now() - startTime;
      return res.status(200).json({
        success: true,
        data: parsed,
        metadata: {
          model,
          parseTimeMs,
          flightCount: parsed.flights?.length || 0,
          statusEventsCount: parsed.statusEvents?.length || 0,
          didRetry,
          retryFailed: true,
          retryReason,
          tokensUsed: first.usage?.total_tokens ?? 0,
          inputTokens: first.usage?.prompt_tokens ?? 0,
          outputTokens: first.usage?.completion_tokens ?? 0,
          expectedRoutesCount: expectedRoutes.length,
          expectedSegmentCount,
          missingRoutes: missing1,
          basicErrors: basicErrors1,
          statusIssues: statusIssues1,
        },
      });
    }

    parsed = second.parsedContent;
  }

  // Final checks
  const basicErrors2 = validateOutputBasic(parsed);
  const { missingRoutes: missing2 } = coverageCheck(parsed, expectedRoutes);
  const statusIssues2 = statusEventsCheck(parsed, hasXpReset, hasXpSurplus);

  const parseTimeMs = Date.now() - startTime;
  console.log(`[API] Parse complete in ${parseTimeMs}ms, flights: ${parsed.flights?.length || 0}, statusEvents: ${parsed.statusEvents?.length || 0}, missing: ${missing2.length}`);

  return res.status(200).json({
    success: true,
    data: parsed,
    metadata: {
      model,
      parseTimeMs,
      flightCount: parsed.flights?.length || 0,
      statusEventsCount: parsed.statusEvents?.length || 0,
      didRetry,
      retryReason,
      tokensUsed: first.usage?.total_tokens ?? 0,
      inputTokens: first.usage?.prompt_tokens ?? 0,
      outputTokens: first.usage?.completion_tokens ?? 0,
      expectedRoutesCount: expectedRoutes.length,
      expectedSegmentCount,
      hasXpReset,
      hasXpSurplus,
      missingRoutes: missing2,
      basicErrors: basicErrors2,
      statusIssues: statusIssues2,
    },
  });
}
