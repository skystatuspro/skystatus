// api/parse-pdf.ts
// Vercel Edge Function for AI PDF parsing
// Keeps OpenAI API key server-side
//
// CHANGELOG v2.4 (2025-12-23):
// - CRITICAL FIX: Added explicit status events extraction instructions
// - AI now properly extracts XP resets, surplus/rollover events
// - These are crucial for qualification cycle detection

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

## CRITICAL: DUPLICATE TRANSACTIONS - DO NOT DEDUPLICATE

Flying Blue PDFs can contain MULTIPLE IDENTICAL transactions on the SAME DATE.
This is NOT an error - these are separate legitimate transactions.

Examples from real PDFs:
- "9 nov 2025  Air adjustment  0 Miles  20 XP" appears TWICE = output TWO separate milesActivities entries
- Two SAF bonus entries with identical values on same flight = TWO separate amounts to sum
- Two "Lastminute-upgrade -47000 Miles" on same date = TWO separate redemptions

RULES:
- NEVER deduplicate transactions just because they look identical
- Count EXACTLY what appears in the PDF line by line
- If a line appears N times, output N entries
- The PDF is the source of truth - preserve ALL occurrences

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
- SAF: sum all "Sustainable Aviation Fuel" lines after a flight until the next flight segment starts.

## CRITICAL: Transavia flights

Transavia flights can have no flight number.
- Pattern includes "TRANSAVIA" or "TRANSAVIA HOLLAND"
- Airline code must be "HV"
- Set flightNumber to empty string ""
- uxp must be 0

## CRITICAL: Status Events - XP Resets and Rollovers

Flying Blue PDFs contain STATUS EVENTS that indicate qualification cycle transitions.
These are CRUCIAL for tracking XP correctly and MUST be extracted to statusEvents array.

Look for these patterns in the transaction list:

1. **XP Reset** (type: "xp_reset"):
   - Dutch: "Aftrek XP-teller" or "Aftrek XP- teller"
   - English: "XP counter deduction"
   - Contains NEGATIVE xpChange (e.g., -300 for Platinum, -180 for Gold, -100 for Silver)
   - Determine statusReached from the XP deducted:
     - xpChange = -300 → statusReached = "Platinum"
     - xpChange = -180 → statusReached = "Gold"  
     - xpChange = -100 → statusReached = "Silver"
     - Other values → statusReached = null

2. **XP Surplus/Rollover** (type: "xp_surplus"):
   - Dutch: "Surplus XP beschikbaar" or "Surplus XP beschikbaar op XP-teller" or "Surplus XP beschikbaar op XP- teller"
   - English: "Surplus XP available"
   - Contains POSITIVE or ZERO xpChange (the rollover amount)
   - statusReached = null

3. **Annual XP Counter Reset** (type: "xp_reset"):
   - Dutch: "Reset XP-teller" or "Reset XP- teller"
   - Usually on Jan 1 with small negative value like -15
   - statusReached = null

IMPORTANT RULES for statusEvents:
- These transactions appear with 0 Miles but have XP changes
- Extract them to the statusEvents array, NOT to milesActivities
- Set uxpChange to 0 unless explicitly mentioned for UXP
- Keep the original date format from PDF (e.g., "8 okt 2025")
- Extract ALL status events - they are essential for cycle tracking

Example from PDF:
"8 okt 2025  Surplus XP beschikbaar op XP- teller  0 Miles  23 XP"
→ statusEvents entry: { date: "8 okt 2025", type: "xp_surplus", description: "Surplus XP beschikbaar op XP- teller", xpChange: 23, uxpChange: 0, statusReached: null }

"8 okt 2025  Aftrek XP- teller  0 Miles  -300 XP"
→ statusEvents entry: { date: "8 okt 2025", type: "xp_reset", description: "Aftrek XP- teller", xpChange: -300, uxpChange: 0, statusReached: "Platinum" }

## OUTPUT

Return valid JSON matching the exact schema. All fields are required.`;

// ============================================================================
// JSON SCHEMA (Structured Outputs)
// ============================================================================

const JSON_SCHEMA = {
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
          route: { type: "string", description: "Must be AAA-BBB with no spaces" },
          flightNumber: { type: "string", description: "May be empty string for Transavia and rare cases where flight number is not shown" },
          airline: { type: "string", description: "2-letter airline code when available. Use HV for Transavia" },
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
    },
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
  required: ["header", "flights", "milesActivities", "statusEvents"],
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

function extractExpectedSegments(pdfText: string) {
  const lines = pdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const carrierMarkers = ["TRANSAVIA"];

  const expected: Array<{
    route: string;
    carrierHint: string;
    flightNumber: string | null;
    raw: string;
  }> = [];

  for (const line of lines) {
    const route = normalizeRoute(line);
    if (!route) continue;

    const flightNoMatch = line.match(/\b([A-Z0-9]{2}\d{2,4})\b/);
    const flightNumber = flightNoMatch ? flightNoMatch[1] : null;
    const hasCarrierMarker = carrierMarkers.some(m => line.toUpperCase().includes(m));

    if (flightNumber || hasCarrierMarker) {
      const carrierHint = hasCarrierMarker ? "MARKER" : "FLIGHTNO";
      expected.push({ route, carrierHint, flightNumber, raw: line });
    }
  }

  const keySet = new Set<string>();
  const deduped: typeof expected = [];
  for (const e of expected) {
    const k = `${e.route}|${e.flightNumber ?? ""}|${e.raw}`;
    if (keySet.has(k)) continue;
    keySet.add(k);
    deduped.push(e);
  }

  const expectedRoutes = [...new Set(deduped.map(e => e.route))];
  const hasALC = /(\bALC\b)/.test(pdfText);

  return { expectedSegments: deduped, expectedRoutes, hasALC };
}

function countDuplicatePatterns(pdfText: string): Map<string, number> {
  const duplicateCounts = new Map<string, number>();
  
  const patterns = [
    /Air adjustment\s+0 Miles\s+20 XP/gi,
    /Lastminute-upgrade\s+-47000 Miles/gi,
    /Sustainable Aviation Fuel/gi,
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
 * Count expected status events in PDF text
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
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function validateDuplicates(parsed: ParsedOut, pdfText: string): string[] {
  const errors: string[] = [];
  
  const airAdjustmentInPdf = (pdfText.match(/Air adjustment\s+0 Miles\s+20 XP/gi) || []).length;
  const airAdjustmentInOutput = parsed.milesActivities.filter(
    a => a.type === 'adjustment' && a.xp === 20 && a.miles === 0
  ).length;
  
  if (airAdjustmentInPdf > 0 && airAdjustmentInOutput < airAdjustmentInPdf) {
    errors.push(
      `DUPLICATE_MISSING: Found ${airAdjustmentInPdf}x "Air adjustment 20 XP" in PDF but only ${airAdjustmentInOutput}x in output`
    );
  }
  
  const upgradeInPdf = (pdfText.match(/Lastminute-upgrade\s+-47000 Miles/gi) || []).length;
  const upgradeInOutput = parsed.milesActivities.filter(
    a => a.type === 'redemption' && a.miles === -47000
  ).length;
  
  if (upgradeInPdf > 0 && upgradeInOutput < upgradeInPdf) {
    errors.push(
      `DUPLICATE_MISSING: Found ${upgradeInPdf}x "Lastminute-upgrade -47000" in PDF but only ${upgradeInOutput}x in output`
    );
  }
  
  return errors;
}

function validateOutputBasic(parsed: ParsedOut) {
  const errors: string[] = [];

  for (const f of parsed.flights || []) {
    if (!/^[A-Z]{3}-[A-Z]{3}$/.test(f.route)) {
      errors.push(`Invalid route format in flight: "${f.route}"`);
    }
    if (f.airline !== "KL" && f.airline !== "AF" && f.uxp !== 0) {
      errors.push(`UXP must be 0 for non-KL/AF flight: airline=${f.airline}, uxp=${f.uxp}, route=${f.route}`);
    }
  }

  return errors;
}

function coverageCheck(parsed: ParsedOut, expectedRoutes: string[]) {
  const extractedRoutes = new Set<string>((parsed.flights || []).map(f => f.route));
  const missingRoutes = expectedRoutes.filter(r => !extractedRoutes.has(r));
  return { missingRoutes };
}

async function callOpenAIJSON(apiKey: string, model: string, pdfText: string, userPrompt: string) {
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

  const startTime = Date.now();

  // Pre-scan
  const { expectedSegments, expectedRoutes, hasALC } = extractExpectedSegments(pdfText);
  const duplicatePatterns = countDuplicatePatterns(pdfText);
  const duplicateInfo = Array.from(duplicatePatterns.entries())
    .map(([pattern, count]) => `${pattern}: ${count}x`)
    .join(', ');
  const expectedStatusEventCount = countExpectedStatusEvents(pdfText);

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

CRITICAL - DUPLICATE TRANSACTIONS:
- The PDF may contain IDENTICAL transactions on the SAME DATE
- This is NOT an error - Flying Blue legitimately posts duplicates
- NEVER merge or deduplicate - count EXACTLY what the PDF shows
${duplicateInfo ? `- Detected duplicate patterns in this PDF: ${duplicateInfo}` : ''}

CRITICAL - STATUS EVENTS:
- Extract ALL status events (XP resets, surplus/rollover) to the statusEvents array
- Look for: "Aftrek XP-teller", "Surplus XP beschikbaar", "Reset XP-teller"
- These have 0 Miles but positive or negative XP values
- Expected status events in this PDF: approximately ${expectedStatusEventCount}
- DO NOT put these in milesActivities - they MUST go in statusEvents

COVERAGE REQUIREMENT:
- Expected distinct routes: ${expectedRoutes.length}
- Expected route list: ${expectedRoutesList}
- Expected segment count: ${expectedSegmentCount}
- Raw text contains ALC: ${hasALC ? "yes" : "no"}

PDF CONTENT:
\`\`\`
${pdfText}
\`\`\`

Return the complete JSON with all transactions, including ALL status events.`;

  // First attempt
  const first = await callOpenAIJSON(apiKey, model, pdfText, baseUserPrompt);
  if (!first.ok) {
    return res.status(500).json({ error: `OpenAI error: ${first.status}`, code: 'OPENAI_ERROR', details: first.errorText });
  }

  let parsed = first.parsedContent;

  // Validation
  const basicErrors1 = validateOutputBasic(parsed);
  const duplicateErrors1 = validateDuplicates(parsed, pdfText);
  const { missingRoutes: missing1 } = coverageCheck(parsed, expectedRoutes);
  
  // Check if status events are missing
  const statusEventsMissing = expectedStatusEventCount > 0 && parsed.statusEvents.length === 0;

  let didRetry = false;
  let retryReason: string | null = null;

  if (missing1.length > 0 || basicErrors1.length > 0 || duplicateErrors1.length > 0 || statusEventsMissing) {
    didRetry = true;
    retryReason = [
      missing1.length > 0 ? `missingRoutes=${missing1.slice(0, 20).join(',')}` : null,
      basicErrors1.length > 0 ? `basicErrors=${basicErrors1.slice(0, 10).join(' | ')}` : null,
      duplicateErrors1.length > 0 ? `duplicateErrors=${duplicateErrors1.join(' | ')}` : null,
      statusEventsMissing ? `statusEventsMissing: expected ~${expectedStatusEventCount}, got 0` : null,
    ].filter(Boolean).join(' ; ');

    const retryPrompt = `${baseUserPrompt}

RETRY - YOUR PREVIOUS OUTPUT HAD ISSUES:
${missing1.length > 0 ? `- Missing routes: ${missing1.slice(0, 50).join(', ')}` : ''}
${basicErrors1.length > 0 ? `- Validation errors: ${basicErrors1.slice(0, 10).join('; ')}` : ''}
${duplicateErrors1.length > 0 ? `- DUPLICATE TRANSACTION ERRORS: ${duplicateErrors1.join('; ')}` : ''}
${statusEventsMissing ? `- STATUS EVENTS MISSING: You returned 0 statusEvents but the PDF contains ~${expectedStatusEventCount} status events (Aftrek XP-teller, Surplus XP beschikbaar, etc.). These MUST be in the statusEvents array, NOT in milesActivities.` : ''}

Return the corrected complete JSON with ALL status events included.`;

    const second = await callOpenAIJSON(apiKey, model, pdfText, retryPrompt);
    if (second.ok) {
      parsed = second.parsedContent;
    }
  }

  // Final validation
  const basicErrors2 = validateOutputBasic(parsed);
  const duplicateErrors2 = validateDuplicates(parsed, pdfText);
  const { missingRoutes: missing2 } = coverageCheck(parsed, expectedRoutes);

  const parseTimeMs = Date.now() - startTime;

  return res.status(200).json({
    success: true,
    data: parsed,
    metadata: {
      model,
      parseTimeMs,
      didRetry,
      retryReason,
      tokensUsed: first.usage?.total_tokens ?? 0,
      inputTokens: first.usage?.prompt_tokens ?? 0,
      outputTokens: first.usage?.completion_tokens ?? 0,
      expectedRoutesCount: expectedRoutes.length,
      expectedSegmentCount,
      expectedStatusEventCount,
      actualStatusEventCount: parsed.statusEvents.length,
      missingRoutes: missing2,
      basicErrors: basicErrors2,
      duplicateErrors: duplicateErrors2,
      duplicatePatternsDetected: Object.fromEntries(duplicatePatterns),
    },
  });
}
