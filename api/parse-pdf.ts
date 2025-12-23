// api/parse-pdf.ts
// Vercel Edge Function for AI PDF parsing
// Keeps OpenAI API key server-side
//
// CHANGELOG v3.0 (2025-12-23):
// - MAJOR: Split extraction into 2 API calls for robustness
// - Call 1: flights + header (no competition with other data)
// - Call 2: milesActivities + statusEvents
// - Server-side merge of results
// - Segment-based coverage validation (not just routes)
// - Fixes issue where adding statusEvents caused flights to be dropped

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

// Call 1 output: Header + Flights
type FlightsOutput = {
  header: {
    memberName: string | null;
    memberNumber: string | null;
    currentStatus: "Explorer" | "Silver" | "Gold" | "Platinum" | "Ultimate";
    totalMiles: number;
    totalXp: number;
    totalUxp: number;
    exportDate: string;
  };
  flights: Array<{
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
  }>;
};

// Call 2 output: Miles Activities + Status Events
type ActivitiesOutput = {
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

// Combined output (what we return to client)
type ParsedOut = FlightsOutput & ActivitiesOutput;

// ============================================================================
// PROMPTS - CALL 1: FLIGHTS
// ============================================================================

const SYSTEM_PROMPT_FLIGHTS = `You are a precise data extraction engine for Flying Blue loyalty program PDF statements.
Your task is to extract the HEADER and ALL FLIGHT transactions with 100% accuracy.

## CRITICAL RULES

1. Extract EVERY flight segment. Do not skip any.
2. Use flight dates, not posting dates. Look for "op [date]" or "on [date]" patterns.
3. UXP is ONLY for KL and AF flights. Set uxp=0 for all other airlines (DL, VS, SK, HV, etc.).
4. Each flight SEGMENT is a separate entry. A trip with 4 segments = 4 flight entries.

## CRITICAL: DUPLICATE FLIGHT POSTINGS

The same flight segment can appear MULTIPLE times in the PDF with different values.
Example: KEF-AMS appears twice - once with 0 XP, once with 5 XP. Output BOTH entries.
NEVER deduplicate. Count exactly what the PDF shows.

## CRITICAL: Trip vs Individual Flight

Trips have two levels:
1. Trip header line shows totals - IGNORE these for individual flights
2. Individual flight lines show per-segment data - EXTRACT these

Rules:
- Extract each flight segment separately
- SAF bonus lines after a flight belong to that flight (sum into safMiles/safXp)

## CRITICAL: Transavia flights

- Pattern includes "TRANSAVIA" or "TRANSAVIA HOLLAND"
- Airline code must be "HV"
- Set flightNumber to empty string ""
- uxp must be 0

## OUTPUT

Return ONLY header and flights. Do not include miles activities or status events.`;

// ============================================================================
// PROMPTS - CALL 2: ACTIVITIES & STATUS EVENTS
// ============================================================================

const SYSTEM_PROMPT_ACTIVITIES = `You are a precise data extraction engine for Flying Blue loyalty program PDF statements.
Your task is to extract ALL non-flight transactions: miles activities and status events.

## WHAT TO EXTRACT

1. **milesActivities**: All non-flight transactions that earn or spend miles/XP
   - Subscriptions (Subscribe to Miles)
   - AMEX card earnings and bonuses
   - Hotel bookings (Accor, Booking.com)
   - Shopping (Amazon, Flying Blue Shop)
   - Transfers (Family transfers, Air Miles conversion)
   - Donations
   - Redemptions (award bookings, upgrades)
   - Adjustments (Air adjustment, Klantenservice)

2. **statusEvents**: XP counter resets and rollovers
   - "Aftrek XP-teller" or "Aftrek XP- teller" → type: "xp_reset"
   - "Surplus XP beschikbaar" → type: "xp_surplus"
   - "Reset XP-teller" or "Reset XP- teller" → type: "xp_reset"

## CRITICAL: DUPLICATE TRANSACTIONS

Flying Blue PDFs can have IDENTICAL transactions on the SAME DATE.
Example: "Air adjustment 0 Miles 20 XP" appears TWICE = output TWO entries.
Example: "Lastminute-upgrade -47000 Miles" appears TWICE = output TWO entries.
NEVER deduplicate. The PDF is the source of truth.

## CRITICAL: Status Events Classification

For xp_reset events, determine statusReached from XP deducted:
- xpChange = -300 → statusReached = "Platinum"
- xpChange = -180 → statusReached = "Gold"
- xpChange = -100 → statusReached = "Silver"
- Other values (like -15 for annual reset) → statusReached = null

For xp_surplus events: statusReached = null

## WHAT TO EXCLUDE

- Flight transactions (these are extracted separately)
- SAF bonus lines (these belong to flights)

## OUTPUT

Return ONLY milesActivities and statusEvents. Do not include header or flights.`;

// ============================================================================
// JSON SCHEMAS
// ============================================================================

const SCHEMA_FLIGHTS = {
  type: "object",
  properties: {
    header: {
      type: "object",
      properties: {
        memberName: { type: ["string", "null"] },
        memberNumber: { type: ["string", "null"] },
        currentStatus: { type: "string", enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate"] },
        totalMiles: { type: "integer" },
        totalXp: { type: "integer" },
        totalUxp: { type: "integer" },
        exportDate: { type: "string" }
      },
      required: ["memberName", "memberNumber", "currentStatus", "totalMiles", "totalXp", "totalUxp", "exportDate"],
      additionalProperties: false
    },
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          postingDate: { type: "string" },
          tripTitle: { type: "string" },
          route: { type: "string" },
          flightNumber: { type: "string" },
          airline: { type: "string" },
          flightDate: { type: "string" },
          miles: { type: "integer" },
          xp: { type: "integer" },
          uxp: { type: "integer" },
          safMiles: { type: "integer" },
          safXp: { type: "integer" },
          cabin: { type: "string", enum: ["Economy", "Premium Economy", "Business", "First", "Unknown"] },
          isRevenue: { type: "boolean" }
        },
        required: ["postingDate", "tripTitle", "route", "flightNumber", "airline", "flightDate", "miles", "xp", "uxp", "safMiles", "safXp", "cabin", "isRevenue"],
        additionalProperties: false
      }
    }
  },
  required: ["header", "flights"],
  additionalProperties: false
};

const SCHEMA_ACTIVITIES = {
  type: "object",
  properties: {
    milesActivities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          type: { type: "string", enum: ["subscription", "amex", "amex_bonus", "hotel", "shopping", "partner", "car_rental", "transfer_in", "transfer_out", "donation", "adjustment", "redemption", "expiry", "promo", "other"] },
          description: { type: "string" },
          miles: { type: "integer" },
          xp: { type: "integer" }
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
          date: { type: "string" },
          type: { type: "string", enum: ["xp_reset", "xp_surplus", "status_reached", "uxp_reset", "uxp_surplus"] },
          description: { type: "string" },
          xpChange: { type: "integer" },
          uxpChange: { type: "integer" },
          statusReached: { type: ["string", "null"], enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate", null] }
        },
        required: ["date", "type", "description", "xpChange", "uxpChange", "statusReached"],
        additionalProperties: false
      }
    }
  },
  required: ["milesActivities", "statusEvents"],
  additionalProperties: false
};

// ============================================================================
// HELPERS
// ============================================================================

function normalizeRoute(raw: string): string | null {
  const m = raw.match(/\b([A-Z]{3})\s*[–-]\s*([A-Z]{3})\b/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

/**
 * Extract expected flight segments with full context for validation
 */
function extractExpectedFlightPostings(pdfText: string) {
  const lines = pdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  type Expected = {
    route: string;
    flightNumber: string;
    airlineHint: string | null;
    flightDate: string | null;
    rawLine: string;
  };

  const out: Expected[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const route = normalizeRoute(line);
    if (!route) continue;

    const hasTransavia = /TRANSAVIA/i.test(line);
    const flightNoMatch = line.match(/\b([A-Z]{2}\d{2,4})\b/);
    const flightNumber = hasTransavia ? "" : (flightNoMatch?.[1] ?? "");

    const airlineHint = hasTransavia ? "HV" : (flightNumber.slice(0, 2) || null);

    // Find flight date from "op <date>" pattern in nearby lines
    let flightDate: string | null = null;
    for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
      const m = lines[j].match(/\bop\s+(\d{1,2}\s+\w+\s+\d{4})\b/i);
      if (m) { 
        flightDate = m[1]; 
        break; 
      }
    }

    // Accept if it looks like a flight segment
    if (flightNumber || hasTransavia) {
      out.push({ route, flightNumber, airlineHint, flightDate, rawLine: line });
    }
  }

  return out;
}

/**
 * Count expected status events in PDF
 */
function countExpectedStatusEvents(pdfText: string): number {
  const patterns = [
    /Aftrek XP-?\s*teller/gi,
    /Surplus XP beschikbaar/gi,
    /Reset XP-?\s*teller/gi,
  ];
  
  let count = 0;
  for (const pattern of patterns) {
    const matches = pdfText.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Count duplicate patterns for validation
 */
function countDuplicatePatterns(pdfText: string): Map<string, number> {
  const duplicateCounts = new Map<string, number>();
  
  const patterns = [
    /Air adjustment\s+0 Miles\s+20 XP/gi,
    /Lastminute-upgrade\s+-?\d+ Miles/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = pdfText.match(pattern);
    if (matches && matches.length > 1) {
      duplicateCounts.set(pattern.source, matches.length);
    }
  }
  
  return duplicateCounts;
}

/**
 * Segment-based coverage check
 */
function coverageCheckFlights(
  flights: FlightsOutput['flights'], 
  expected: ReturnType<typeof extractExpectedFlightPostings>
) {
  const key = (r: string, fn: string) => `${r}|${fn}`;

  const expectedCounts = new Map<string, number>();
  for (const e of expected) {
    const k = key(e.route, e.flightNumber);
    expectedCounts.set(k, (expectedCounts.get(k) ?? 0) + 1);
  }

  const actualCounts = new Map<string, number>();
  for (const f of flights) {
    const k = key(f.route, f.flightNumber ?? "");
    actualCounts.set(k, (actualCounts.get(k) ?? 0) + 1);
  }

  const missing: Array<{ key: string; expected: number; actual: number }> = [];
  for (const [k, exp] of expectedCounts.entries()) {
    const act = actualCounts.get(k) ?? 0;
    if (act < exp) missing.push({ key: k, expected: exp, actual: act });
  }

  return { missing, expectedCount: expected.length, actualCount: flights.length };
}

/**
 * Validate basic flight rules
 */
function validateFlights(flights: FlightsOutput['flights']) {
  const errors: string[] = [];

  for (const f of flights) {
    if (!/^[A-Z]{3}-[A-Z]{3}$/.test(f.route)) {
      errors.push(`Invalid route format: "${f.route}"`);
    }
    if (f.airline !== "KL" && f.airline !== "AF" && f.uxp !== 0) {
      errors.push(`UXP must be 0 for ${f.airline}: route=${f.route}, uxp=${f.uxp}`);
    }
  }

  return errors;
}

/**
 * Validate duplicate transactions were preserved
 */
function validateDuplicates(activities: ActivitiesOutput, pdfText: string): string[] {
  const errors: string[] = [];
  
  const airAdjustmentInPdf = (pdfText.match(/Air adjustment\s+0 Miles\s+20 XP/gi) || []).length;
  const airAdjustmentInOutput = activities.milesActivities.filter(
    a => a.type === 'adjustment' && a.xp === 20 && a.miles === 0
  ).length;
  
  if (airAdjustmentInPdf > 0 && airAdjustmentInOutput < airAdjustmentInPdf) {
    errors.push(`Air adjustment: expected ${airAdjustmentInPdf}, got ${airAdjustmentInOutput}`);
  }
  
  const upgradeInPdf = (pdfText.match(/Lastminute-upgrade\s+-?\d+ Miles/gi) || []).length;
  const upgradeInOutput = activities.milesActivities.filter(
    a => a.type === 'redemption' && a.description.toLowerCase().includes('lastminute-upgrade')
  ).length;
  
  if (upgradeInPdf > 0 && upgradeInOutput < upgradeInPdf) {
    errors.push(`Lastminute-upgrade: expected ${upgradeInPdf}, got ${upgradeInOutput}`);
  }
  
  return errors;
}

// ============================================================================
// API CALL HELPERS
// ============================================================================

async function callOpenAI<T>(
  apiKey: string, 
  model: string, 
  systemPrompt: string,
  userPrompt: string,
  schema: object,
  schemaName: string
): Promise<{ ok: true; data: T; usage: any } | { ok: false; status: number; error: string }> {
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ] as OpenAIMessage[],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, error: errorText };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    return { ok: false, status: 500, error: 'Empty response from OpenAI' };
  }

  try {
    const parsed = JSON.parse(content) as T;
    return { ok: true, data: parsed, usage: data.usage || {} };
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse JSON response' };
  }
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

  const startTime = Date.now();

  // Pre-scan for validation
  const expectedSegments = extractExpectedFlightPostings(pdfText);
  const expectedStatusEventCount = countExpectedStatusEvents(pdfText);
  const duplicatePatterns = countDuplicatePatterns(pdfText);

  // ========================================================================
  // CALL 1: Extract flights + header
  // ========================================================================
  
  const flightsUserPrompt = `Extract the header and ALL flight transactions from this Flying Blue PDF.

CRITICAL REQUIREMENTS:
- Extract EVERY flight segment individually
- A trip with 4 segments = 4 separate flight entries
- Include SAF bonus in the flight's safMiles/safXp fields
- Use actual flight date from "op [date]" pattern, not posting date
- UXP is only for KL and AF flights, set to 0 for others
- Transavia: airline="HV", flightNumber=""
- NEVER deduplicate - if same route appears twice, output twice

Expected flight segments in this PDF: approximately ${expectedSegments.length}

PDF CONTENT:
\`\`\`
${pdfText}
\`\`\`

Return header and ALL flights.`;

  const flightsResult = await callOpenAI<FlightsOutput>(
    apiKey, model, SYSTEM_PROMPT_FLIGHTS, flightsUserPrompt, SCHEMA_FLIGHTS, 'flying_blue_flights'
  );

  if (!flightsResult.ok) {
    return res.status(500).json({ 
      error: `OpenAI error (flights): ${flightsResult.status}`, 
      code: 'OPENAI_ERROR',
      details: flightsResult.error 
    });
  }

  let flightsData = flightsResult.data;
  const flightsUsage = flightsResult.usage;

  // Validate and retry if needed
  const flightErrors = validateFlights(flightsData.flights);
  const coverage = coverageCheckFlights(flightsData.flights, expectedSegments);
  
  let flightsDidRetry = false;
  let flightsRetryReason: string | null = null;

  if (coverage.missing.length > 0 || flightErrors.length > 0) {
    flightsDidRetry = true;
    flightsRetryReason = [
      coverage.missing.length > 0 ? `missing ${coverage.missing.length} segments` : null,
      flightErrors.length > 0 ? `${flightErrors.length} validation errors` : null,
    ].filter(Boolean).join('; ');

    const missingList = coverage.missing.slice(0, 20)
      .map(m => `${m.key} (expected ${m.expected}, got ${m.actual})`)
      .join('\n');

    const retryPrompt = `${flightsUserPrompt}

RETRY - MISSING FLIGHT SEGMENTS:
Your previous output had ${flightsData.flights.length} flights but we expected ~${expectedSegments.length}.

Missing segments:
${missingList}

${flightErrors.length > 0 ? `Validation errors:\n${flightErrors.slice(0, 10).join('\n')}` : ''}

Please extract ALL flight segments. Do not skip any.`;

    const retryResult = await callOpenAI<FlightsOutput>(
      apiKey, model, SYSTEM_PROMPT_FLIGHTS, retryPrompt, SCHEMA_FLIGHTS, 'flying_blue_flights'
    );

    if (retryResult.ok && retryResult.data.flights.length > flightsData.flights.length) {
      flightsData = retryResult.data;
    }
  }

  // ========================================================================
  // CALL 2: Extract miles activities + status events
  // ========================================================================

  const duplicateInfo = Array.from(duplicatePatterns.entries())
    .map(([pattern, count]) => `${pattern}: ${count}x`)
    .join(', ');

  const activitiesUserPrompt = `Extract ALL non-flight transactions from this Flying Blue PDF.

CRITICAL REQUIREMENTS:
- Extract ALL miles activities (subscriptions, AMEX, hotels, shopping, transfers, donations, redemptions, adjustments)
- Extract ALL status events (XP resets and surpluses)
- Status events go in statusEvents array, NOT milesActivities
- NEVER deduplicate - identical transactions on same date = multiple entries
${duplicateInfo ? `- Known duplicates in this PDF: ${duplicateInfo}` : ''}

Expected status events: approximately ${expectedStatusEventCount}

STATUS EVENT PATTERNS:
- "Aftrek XP-teller" or "Aftrek XP- teller" → xp_reset, negative xpChange
  - If -300 XP → statusReached: "Platinum"
  - If -180 XP → statusReached: "Gold"
  - If -100 XP → statusReached: "Silver"
- "Surplus XP beschikbaar" → xp_surplus, positive/zero xpChange, statusReached: null
- "Reset XP-teller" → xp_reset (annual), statusReached: null

PDF CONTENT:
\`\`\`
${pdfText}
\`\`\`

Return ALL milesActivities and statusEvents.`;

  const activitiesResult = await callOpenAI<ActivitiesOutput>(
    apiKey, model, SYSTEM_PROMPT_ACTIVITIES, activitiesUserPrompt, SCHEMA_ACTIVITIES, 'flying_blue_activities'
  );

  if (!activitiesResult.ok) {
    return res.status(500).json({ 
      error: `OpenAI error (activities): ${activitiesResult.status}`, 
      code: 'OPENAI_ERROR',
      details: activitiesResult.error 
    });
  }

  let activitiesData = activitiesResult.data;
  const activitiesUsage = activitiesResult.usage;

  // Validate and retry if needed
  const duplicateErrors = validateDuplicates(activitiesData, pdfText);
  const statusEventsMissing = expectedStatusEventCount > 0 && activitiesData.statusEvents.length === 0;

  let activitiesDidRetry = false;
  let activitiesRetryReason: string | null = null;

  if (duplicateErrors.length > 0 || statusEventsMissing) {
    activitiesDidRetry = true;
    activitiesRetryReason = [
      duplicateErrors.length > 0 ? duplicateErrors.join('; ') : null,
      statusEventsMissing ? `expected ~${expectedStatusEventCount} status events, got 0` : null,
    ].filter(Boolean).join('; ');

    const retryPrompt = `${activitiesUserPrompt}

RETRY - ISSUES FOUND:
${duplicateErrors.length > 0 ? `- Duplicate transactions missing: ${duplicateErrors.join('; ')}` : ''}
${statusEventsMissing ? `- Status events missing: expected ~${expectedStatusEventCount}, got 0. Look for "Aftrek XP-teller" and "Surplus XP beschikbaar" lines.` : ''}

Please extract ALL transactions including duplicates and status events.`;

    const retryResult = await callOpenAI<ActivitiesOutput>(
      apiKey, model, SYSTEM_PROMPT_ACTIVITIES, retryPrompt, SCHEMA_ACTIVITIES, 'flying_blue_activities'
    );

    if (retryResult.ok) {
      // Use retry if it has more status events or fixed duplicates
      const retryHasMoreStatusEvents = retryResult.data.statusEvents.length > activitiesData.statusEvents.length;
      const retryHasMoreActivities = retryResult.data.milesActivities.length > activitiesData.milesActivities.length;
      
      if (retryHasMoreStatusEvents || retryHasMoreActivities) {
        activitiesData = retryResult.data;
      }
    }
  }

  // ========================================================================
  // MERGE RESULTS
  // ========================================================================

  const merged: ParsedOut = {
    header: flightsData.header,
    flights: flightsData.flights,
    milesActivities: activitiesData.milesActivities,
    statusEvents: activitiesData.statusEvents,
  };

  // Final validation
  const finalCoverage = coverageCheckFlights(merged.flights, expectedSegments);
  const finalFlightErrors = validateFlights(merged.flights);
  const finalDuplicateErrors = validateDuplicates(activitiesData, pdfText);

  const parseTimeMs = Date.now() - startTime;
  const totalTokens = (flightsUsage.total_tokens ?? 0) + (activitiesUsage.total_tokens ?? 0);

  return res.status(200).json({
    success: true,
    data: merged,
    metadata: {
      model,
      parseTimeMs,
      totalTokens,
      
      // Flights call info
      flightsCall: {
        didRetry: flightsDidRetry,
        retryReason: flightsRetryReason,
        tokensUsed: flightsUsage.total_tokens ?? 0,
        expectedSegments: expectedSegments.length,
        actualFlights: merged.flights.length,
        missingSegments: finalCoverage.missing,
        validationErrors: finalFlightErrors,
      },
      
      // Activities call info
      activitiesCall: {
        didRetry: activitiesDidRetry,
        retryReason: activitiesRetryReason,
        tokensUsed: activitiesUsage.total_tokens ?? 0,
        expectedStatusEvents: expectedStatusEventCount,
        actualStatusEvents: merged.statusEvents.length,
        actualMilesActivities: merged.milesActivities.length,
        duplicateErrors: finalDuplicateErrors,
      },
      
      // Legacy fields for compatibility
      didRetry: flightsDidRetry || activitiesDidRetry,
      retryReason: [flightsRetryReason, activitiesRetryReason].filter(Boolean).join(' | ') || null,
      tokensUsed: totalTokens,
    },
  });
}
