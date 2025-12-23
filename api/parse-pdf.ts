// api/parse-pdf.ts
// Vercel Edge Function for AI PDF parsing
// Keeps OpenAI API key server-side
//
// v3.3 (2025-12-23):
// - Deadline guard to avoid hitting Vercel 300s during retries
// - Coverage is heuristic: only triggers retry on medium/full keys, not minimal-only keys
// - Stronger status event expectation patterns (NL + EN)
// - Better activities exclusion for flight lines split across multiple lines (trip-aware)
// - Filtering output trims lines, removes empties, keeps stable order via index set

import type { VercelRequest, VercelResponse } from "@vercel/node"

// ============================================================================
// TYPES
// ============================================================================

interface ParseRequest {
  pdfText: string
  model?: string
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

type FlightsOutput = {
  header: {
    memberName: string | null
    memberNumber: string | null
    currentStatus: "Explorer" | "Silver" | "Gold" | "Platinum" | "Ultimate"
    totalMiles: number
    totalXp: number
    totalUxp: number
    exportDate: string
  }
  flights: Array<{
    postingDate: string
    tripTitle: string
    route: string
    flightNumber: string
    airline: string
    flightDate: string
    miles: number
    xp: number
    uxp: number
    safMiles: number
    safXp: number
    cabin: "Economy" | "Premium Economy" | "Business" | "First" | "Unknown"
    isRevenue: boolean
  }>
}

type ActivitiesOutput = {
  milesActivities: Array<{
    date: string
    type:
      | "subscription"
      | "amex"
      | "amex_bonus"
      | "hotel"
      | "shopping"
      | "partner"
      | "car_rental"
      | "transfer_in"
      | "transfer_out"
      | "donation"
      | "adjustment"
      | "redemption"
      | "expiry"
      | "promo"
      | "other"
    description: string
    miles: number
    xp: number
  }>
  statusEvents: Array<{
    date: string
    type: "xp_reset" | "xp_surplus" | "status_reached" | "uxp_reset" | "uxp_surplus"
    description: string
    xpChange: number
    uxpChange: number
    statusReached: "Explorer" | "Silver" | "Gold" | "Platinum" | "Ultimate" | null
  }>
}

type ParsedOut = FlightsOutput & ActivitiesOutput

// ============================================================================
// PROMPTS
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
Example: KEF-AMS appears twice: once with 0 XP, once with 5 XP. Output BOTH entries.
NEVER deduplicate. Count exactly what the PDF shows.

## CRITICAL: Trip vs Individual Flight
Trips have two levels:
1. Trip header line shows totals: IGNORE these for individual flights
2. Individual flight lines show per-segment data: EXTRACT these

Rules:
- Extract each flight segment separately
- SAF bonus lines after a flight belong to that flight (sum into safMiles/safXp)

## CRITICAL: Transavia flights
- Pattern includes "TRANSAVIA" or "TRANSAVIA HOLLAND"
- Airline code must be "HV"
- Set flightNumber to empty string ""
- uxp must be 0

## OUTPUT
Return ONLY header and flights. Do not include miles activities or status events.`

const SYSTEM_PROMPT_ACTIVITIES = `You are a precise data extraction engine for Flying Blue loyalty program PDF statements.
Your task is to extract ALL non-flight transactions: miles activities and status events.

## WHAT TO EXTRACT
1. milesActivities: All non-flight transactions that earn or spend miles/XP
   - Subscriptions (Subscribe to Miles)
   - AMEX card earnings and bonuses
   - Hotel bookings (Accor, Booking.com)
   - Shopping (Amazon, Flying Blue Shop)
   - Transfers (Family transfers, Air Miles conversion)
   - Donations
   - Redemptions (award bookings, upgrades)
   - Adjustments (Air adjustment, Klantenservice)

2. statusEvents: XP counter resets and rollovers
   - "Aftrek XP-teller" or "Aftrek XP- teller" -> type: "xp_reset"
   - "Surplus XP beschikbaar" -> type: "xp_surplus"
   - "Reset XP-teller" or "Reset XP- teller" -> type: "xp_reset"
   - English variants may appear too

## CRITICAL: DUPLICATE TRANSACTIONS
Flying Blue PDFs can have IDENTICAL transactions on the SAME DATE.
Example: "Air adjustment 0 Miles 20 XP" appears twice: output TWO entries.
Example: "Lastminute-upgrade -47000 Miles" appears twice: output TWO entries.
NEVER deduplicate. The PDF is the source of truth.

## CRITICAL: Status Events Classification
For xp_reset events, determine statusReached from XP deducted:
- xpChange = -300 -> statusReached = "Platinum"
- xpChange = -180 -> statusReached = "Gold"
- xpChange = -100 -> statusReached = "Silver"
- Other values (like -15 for annual reset) -> statusReached = null

For xp_surplus events: statusReached = null

## WHAT TO EXCLUDE
- Flight transactions (extracted separately)
- SAF bonus lines (belong to flights)

## OUTPUT
Return ONLY milesActivities and statusEvents. Do not include header or flights.`

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
        exportDate: { type: "string" },
      },
      required: ["memberName", "memberNumber", "currentStatus", "totalMiles", "totalXp", "totalUxp", "exportDate"],
      additionalProperties: false,
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
          isRevenue: { type: "boolean" },
        },
        required: [
          "postingDate",
          "tripTitle",
          "route",
          "flightNumber",
          "airline",
          "flightDate",
          "miles",
          "xp",
          "uxp",
          "safMiles",
          "safXp",
          "cabin",
          "isRevenue",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["header", "flights"],
  additionalProperties: false,
}

const SCHEMA_ACTIVITIES = {
  type: "object",
  properties: {
    milesActivities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          type: {
            type: "string",
            enum: [
              "subscription",
              "amex",
              "amex_bonus",
              "hotel",
              "shopping",
              "partner",
              "car_rental",
              "transfer_in",
              "transfer_out",
              "donation",
              "adjustment",
              "redemption",
              "expiry",
              "promo",
              "other",
            ],
          },
          description: { type: "string" },
          miles: { type: "integer" },
          xp: { type: "integer" },
        },
        required: ["date", "type", "description", "miles", "xp"],
        additionalProperties: false,
      },
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
          statusReached: { type: ["string", "null"], enum: ["Explorer", "Silver", "Gold", "Platinum", "Ultimate", null] },
        },
        required: ["date", "type", "description", "xpChange", "uxpChange", "statusReached"],
        additionalProperties: false,
      },
    },
  },
  required: ["milesActivities", "statusEvents"],
  additionalProperties: false,
}

// ============================================================================
// PREFILTERING
// ============================================================================

function trimLine(s: string): string {
  return s.replace(/\u00a0/g, " ").trim()
}

function buildFilteredText(lines: string[], keptIndices: Set<number>): string {
  const sorted = Array.from(keptIndices).sort((a, b) => a - b)
  const out: string[] = []
  for (const i of sorted) {
    const t = trimLine(lines[i] ?? "")
    if (!t) continue
    out.push(t)
  }
  return out.join("\n")
}

function isTripHeaderLine(line: string): boolean {
  return /Mijn reis naar/i.test(line) || /My trip to/i.test(line)
}

function filterPdfForFlights(pdfText: string): string {
  const lines = pdfText.split(/\r?\n/)
  const kept = new Set<number>()

  for (let i = 0; i < Math.min(50, lines.length); i++) kept.add(i)

  const flightPatterns = [
    /\b[A-Z]{3}\s*[-–]\s*[A-Z]{3}\b/,
    /\b[A-Z]{2}\d{2,4}\b/,
    /TRANSAVIA/i,
    /\b(?:op|on)\s+\d{1,2}\s+\w+\s+\d{4}\b/i,
    /Sustainable Aviation Fuel/i,
    /\bSAF\b/i,
    /Mijn reis naar/i,
    /My trip to/i,
  ]

  for (let i = 50; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (flightPatterns.some((p) => p.test(line))) {
      if (i > 0) kept.add(i - 1)
      kept.add(i)
      if (i + 1 < lines.length) kept.add(i + 1)
    }
  }

  return buildFilteredText(lines, kept)
}

function filterPdfForActivities(pdfText: string): string {
  const lines = pdfText.split(/\r?\n/)
  const kept = new Set<number>()

  for (let i = 0; i < Math.min(50, lines.length); i++) kept.add(i)

  const activityPatterns = [
    /Subscribe to Miles/i,
    /AMERICAN EXPRESS/i,
    /\bAMEX\b/i,
    /BOOKING\.COM/i,
    /Accor/i,
    /Winkelen/i,
    /Shopping/i,
    /Miles overdragen/i,
    /\btransfer\b/i,
    /donation/i,
    /Klantenservice/i,
    /Air adjustment/i,
    /Last\s*-?\s*minute\s*-?\s*upgrade/i,
    /redemption/i,
    /Aftrek XP/i,
    /Surplus XP/i,
    /Reset XP/i,
    /XP-?\s*(teller|counter)/i,
    /Batavia/i,
    /e-?\s*rewards/i,
    /Kolet/i,
    /\beSIM\b/i,
    /Uber/i,
    /\bAMAZON\b/i,
    /-\d+\s*Miles/i,
    /\d+\s*Miles\s+-?\d+\s*XP/i,
    /0\s*Miles\s+-?\d+\s*XP/i,
  ]

  const routePattern = /\b[A-Z]{3}\s*[-–]\s*[A-Z]{3}\b/
  const flightNoPattern = /\b[A-Z]{2}\d{2,4}\b/
  const safPattern = /Sustainable Aviation Fuel|\bSAF\b/i

  const isFlightish = (idx: number): boolean => {
    const l0 = lines[idx] ?? ""
    if (safPattern.test(l0)) return true
    if (routePattern.test(l0) && flightNoPattern.test(l0)) return true
    if (isTripHeaderLine(l0)) return true

    // Trip-aware exclusion for split lines
    const nearby = [idx - 2, idx - 1, idx, idx + 1, idx + 2].filter((x) => x >= 0 && x < lines.length)
    const hasTrip = nearby.some((j) => isTripHeaderLine(lines[j] ?? ""))
    if (!hasTrip) return false

    const hasRoute = nearby.some((j) => routePattern.test(lines[j] ?? ""))
    const hasFlightNo = nearby.some((j) => flightNoPattern.test(lines[j] ?? ""))
    return hasRoute || hasFlightNo
  }

  for (let i = 50; i < lines.length; i++) {
    if (isFlightish(i)) continue
    const line = lines[i] ?? ""
    if (activityPatterns.some((p) => p.test(line))) {
      if (i > 50) kept.add(i - 1)
      kept.add(i)
      if (i + 1 < lines.length) kept.add(i + 1)
    }
  }

  return buildFilteredText(lines, kept)
}

// ============================================================================
// VALIDATION + EXPECTATIONS
// ============================================================================

function normalizeRoute(raw: string): string | null {
  const m = raw.match(/\b([A-Z]{3})\s*[–-]\s*([A-Z]{3})\b/)
  if (!m) return null
  return `${m[1]}-${m[2]}`
}

function normDate(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim()
}

function extractExpectedFlightPostings(pdfText: string) {
  const lines = pdfText.split(/\r?\n/).map((l) => trimLine(l)).filter(Boolean)

  type Expected = {
    route: string
    flightNumber: string
    airlineHint: string | null
    flightDate: string | null
    miles: number | null
    xp: number | null
    rawLine: string
  }

  const out: Expected[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const route = normalizeRoute(line)
    if (!route) continue

    const hasTransavia = /TRANSAVIA/i.test(line)
    const flightNoMatch = line.match(/\b([A-Z]{2}\d{2,4})\b/)
    const flightNumber = hasTransavia ? "" : flightNoMatch?.[1] ?? ""

    const airlineHint = hasTransavia ? "HV" : flightNumber.slice(0, 2) || null

    let flightDate: string | null = null
    for (let j = i + 1; j <= Math.min(i + 6, lines.length - 1); j++) {
      const m = lines[j].match(/\b(?:op|on)\s+(\d{1,2}\s+\w+\s+\d{4})\b/i)
      if (m) {
        flightDate = m[1]
        break
      }
    }

    let miles: number | null = null
    let xp: number | null = null
    for (let j = i; j <= Math.min(i + 4, lines.length - 1); j++) {
      const milesMatch = lines[j].match(/(\d+)\s*Miles/i)
      const xpMatch = lines[j].match(/(-?\d+)\s*XP/i)
      if (milesMatch && miles === null) miles = parseInt(milesMatch[1], 10)
      if (xpMatch && xp === null) xp = parseInt(xpMatch[1], 10)
    }

    if (flightNumber || hasTransavia) {
      out.push({ route, flightNumber, airlineHint, flightDate, miles, xp, rawLine: line })
    }
  }

  return out
}

function countExpectedStatusEvents(pdfText: string): number {
  const patterns = [
    /Aftrek XP-?\s*teller/gi,
    /Surplus XP beschikbaar/gi,
    /Reset XP-?\s*teller/gi,

    // English-ish
    /XP\s*(counter|teller)\s*(reset|deduction|adjustment)/gi,
    /Surplus\s*XP/gi,
  ]

  let count = 0
  for (const p of patterns) {
    const m = pdfText.match(p)
    if (m) count += m.length
  }
  return count
}

function countDuplicatePatterns(pdfText: string): Map<string, number> {
  const dup = new Map<string, number>()
  const patterns = [
    { pattern: /Air adjustment\s+0 Miles\s+20 XP/gi, name: "Air adjustment 20 XP" },
    { pattern: /Last\s*-?\s*minute\s*-?\s*upgrade/gi, name: "Lastminute-upgrade" },
  ]
  for (const { pattern, name } of patterns) {
    const m = pdfText.match(pattern)
    if (m && m.length > 1) dup.set(name, m.length)
  }
  return dup
}

function validateFlights(flights: FlightsOutput["flights"]) {
  const errors: string[] = []

  for (const f of flights) {
    if (!/^[A-Z]{3}-[A-Z]{3}$/.test(f.route)) {
      errors.push(`Invalid route format: "${f.route}"`)
    }

    if (f.airline !== "KL" && f.airline !== "AF" && f.uxp !== 0) {
      errors.push(`UXP must be 0 for ${f.airline}: route=${f.route}, uxp=${f.uxp}`)
    }

    if (f.airline === "HV" && f.flightNumber !== "") {
      errors.push(`Transavia (HV) must have empty flightNumber: got "${f.flightNumber}"`)
    }
    if (f.flightNumber === "" && f.airline !== "HV") {
      errors.push(`Empty flightNumber only allowed for HV: airline=${f.airline}, route=${f.route}`)
    }
  }

  return errors
}

function validateDuplicates(activities: ActivitiesOutput, pdfText: string) {
  const errors: string[] = []

  const airAdjInPdf = (pdfText.match(/Air adjustment\s+0 Miles\s+20 XP/gi) || []).length
  const airAdjOut = activities.milesActivities.filter((a) => a.type === "adjustment" && a.xp === 20 && a.miles === 0)
    .length
  if (airAdjInPdf > 0 && airAdjOut < airAdjInPdf) {
    errors.push(`Air adjustment: expected ${airAdjInPdf}, got ${airAdjOut}`)
  }

  const upInPdf = (pdfText.match(/Last\s*-?\s*minute\s*-?\s*upgrade/gi) || []).length
  const upOut = activities.milesActivities.filter(
    (a) => a.type === "redemption" && /last\s*-?\s*minute\s*-?\s*upgrade/i.test(a.description),
  ).length
  if (upInPdf > 0 && upOut < upInPdf) {
    errors.push(`Lastminute-upgrade: expected ${upInPdf}, got ${upOut}`)
  }

  return errors
}

// Heuristic coverage check.
// Important: only trigger retry on medium/full missing, not minimal-only missing.
function coverageCheckFlightsHeuristic(
  flights: FlightsOutput["flights"],
  expected: ReturnType<typeof extractExpectedFlightPostings>,
) {
  const expectedCounts = new Map<string, number>()
  const expectedKeyMeta = new Map<string, { level: "full" | "medium" | "minimal" }>()

  const makeExpectedKey = (e: { route: string; flightNumber: string; flightDate: string | null; miles: number | null; xp: number | null }) => {
    const d = normDate(e.flightDate)
    if (d && e.miles != null && e.xp != null) {
      const k = `${e.route}|${e.flightNumber}|${d}|${e.miles}|${e.xp}`
      expectedKeyMeta.set(k, { level: "full" })
      return k
    }
    if (d) {
      const k = `${e.route}|${e.flightNumber}|${d}`
      expectedKeyMeta.set(k, { level: "medium" })
      return k
    }
    const k = `${e.route}|${e.flightNumber}`
    expectedKeyMeta.set(k, { level: "minimal" })
    return k
  }

  const actualFull = new Map<string, number>()
  const actualMedium = new Map<string, number>()
  const actualMinimal = new Map<string, number>()

  for (const f of flights) {
    const d = normDate(f.flightDate)
    const kFull = `${f.route}|${f.flightNumber}|${d}|${f.miles}|${f.xp}`
    const kMed = `${f.route}|${f.flightNumber}|${d}`
    const kMin = `${f.route}|${f.flightNumber}`
    actualFull.set(kFull, (actualFull.get(kFull) ?? 0) + 1)
    actualMedium.set(kMed, (actualMedium.get(kMed) ?? 0) + 1)
    actualMinimal.set(kMin, (actualMinimal.get(kMin) ?? 0) + 1)
  }

  for (const e of expected) {
    const k = makeExpectedKey(e)
    expectedCounts.set(k, (expectedCounts.get(k) ?? 0) + 1)
  }

  const missing: Array<{ key: string; expected: number; actual: number; level: "full" | "medium" | "minimal" }> = []
  for (const [k, exp] of expectedCounts.entries()) {
    const meta = expectedKeyMeta.get(k) ?? { level: "minimal" as const }
    let act = 0
    if (meta.level === "full") act = actualFull.get(k) ?? 0
    else if (meta.level === "medium") act = actualMedium.get(k) ?? 0
    else act = actualMinimal.get(k) ?? 0

    if (act < exp) missing.push({ key: k, expected: exp, actual: act, level: meta.level })
  }

  const missingForRetry = missing.filter((m) => m.level !== "minimal")

  return {
    missing,
    missingForRetry,
    expectedCount: expected.length,
    actualCount: flights.length,
  }
}

// ============================================================================
// OPENAI CALL
// ============================================================================

async function callOpenAI<T>(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  schema: object,
  schemaName: string,
): Promise<{ ok: true; data: T; usage: any } | { ok: false; status: number; error: string }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ] as OpenAIMessage[],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
      temperature: 0.1,
      max_tokens: 16000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { ok: false, status: response.status, error: errorText }
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) return { ok: false, status: 500, error: "Empty response from OpenAI" }

  try {
    const parsed = JSON.parse(content) as T
    return { ok: true, data: parsed, usage: data.usage || {} }
  } catch {
    return { ok: false, status: 500, error: "Failed to parse JSON response" }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: "Server configuration error", code: "API_KEY_MISSING" })

  let body: ParseRequest
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: "Invalid request body" })
  }

  const { pdfText, model = "gpt-4o" } = body
  if (!pdfText || typeof pdfText !== "string") return res.status(400).json({ error: "pdfText is required" })

  const allowedModels = ["gpt-4o", "gpt-4o-mini", "gpt-4o-2024-08-06"]
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: `Invalid model. Allowed: ${allowedModels.join(", ")}` })
  }

  const startTime = Date.now()

  const deadlineMs = 300_000
  const retryCutoffMs = 210_000
  const timeLeft = () => deadlineMs - (Date.now() - startTime)
  const allowRetry = () => Date.now() - startTime < retryCutoffMs

  const expectedSegments = extractExpectedFlightPostings(pdfText)
  const expectedStatusEventCount = countExpectedStatusEvents(pdfText)
  const duplicatePatterns = countDuplicatePatterns(pdfText)

  const flightsPdfText = filterPdfForFlights(pdfText)
  const activitiesPdfText = filterPdfForActivities(pdfText)

  // ========================================================================
  // CALL 1: FLIGHTS
  // ========================================================================

  const flightsUserPrompt = `Extract the header and ALL flight transactions from this Flying Blue PDF.

CRITICAL REQUIREMENTS:
- Extract EVERY flight segment individually
- A trip with 4 segments = 4 separate flight entries
- Include SAF bonus in the flight's safMiles/safXp fields
- Use actual flight date from "op [date]" or "on [date]" pattern, not posting date
- UXP is only for KL and AF flights, set to 0 for others
- Transavia: airline="HV", flightNumber=""
- NEVER deduplicate: if same segment appears twice with different values, output both

Expected flight segments: approximately ${expectedSegments.length}

PDF CONTENT:
\`\`\`
${flightsPdfText}
\`\`\`

Return header and ALL flights.`

  const flightsResult = await callOpenAI<FlightsOutput>(
    apiKey,
    model,
    SYSTEM_PROMPT_FLIGHTS,
    flightsUserPrompt,
    SCHEMA_FLIGHTS,
    "flying_blue_flights",
  )

  if (!flightsResult.ok) {
    return res.status(500).json({
      error: `OpenAI error (flights): ${flightsResult.status}`,
      code: "OPENAI_ERROR",
      details: flightsResult.error,
      metadata: { timeLeftMs: timeLeft() },
    })
  }

  let flightsData = flightsResult.data
  const flightsUsage = flightsResult.usage

  let flightErrors = validateFlights(flightsData.flights)
  let coverage = coverageCheckFlightsHeuristic(flightsData.flights, expectedSegments)

  let flightsDidRetry = false
  let flightsRetryReason: string | null = null

  if (allowRetry() && (coverage.missingForRetry.length > 0 || flightErrors.length > 0)) {
    flightsDidRetry = true
    flightsRetryReason = [
      coverage.missingForRetry.length > 0 ? `missing ${coverage.missingForRetry.length} segments (medium/full)` : null,
      flightErrors.length > 0 ? `${flightErrors.length} validation errors` : null,
    ]
      .filter(Boolean)
      .join(", ")

    const missingList = coverage.missingForRetry
      .slice(0, 25)
      .map((m) => `${m.level}: ${m.key} (expected ${m.expected}, got ${m.actual})`)
      .join("\n")

    const retryPrompt = `${flightsUserPrompt}

RETRY:
We detected missing flight segments or validation errors.

Missing segments (medium/full keys only):
${missingList}

${flightErrors.length > 0 ? `Validation errors:\n${flightErrors.slice(0, 15).join("\n")}` : ""}

Please extract ALL flight segments including duplicates. Do not skip any.`

    const retryResult = await callOpenAI<FlightsOutput>(
      apiKey,
      model,
      SYSTEM_PROMPT_FLIGHTS,
      retryPrompt,
      SCHEMA_FLIGHTS,
      "flying_blue_flights",
    )

    if (retryResult.ok) {
      const retryErrors = validateFlights(retryResult.data.flights)
      const retryCoverage = coverageCheckFlightsHeuristic(retryResult.data.flights, expectedSegments)

      const currentScore = coverage.missingForRetry.length * 2 + flightErrors.length
      const retryScore = retryCoverage.missingForRetry.length * 2 + retryErrors.length

      if (retryScore < currentScore) {
        flightsData = retryResult.data
        flightErrors = retryErrors
        coverage = retryCoverage
      }
    }
  }

  // ========================================================================
  // CALL 2: ACTIVITIES
  // ========================================================================

  const duplicateInfo = Array.from(duplicatePatterns.entries())
    .map(([name, count]) => `${name}: ${count}x`)
    .join(", ")

  const activitiesUserPrompt = `Extract ALL non-flight transactions from this Flying Blue PDF.

CRITICAL REQUIREMENTS:
- Extract ALL miles activities (subscriptions, AMEX, hotels, shopping, transfers, donations, redemptions, adjustments)
- Extract ALL status events (XP resets and surpluses)
- Status events go in statusEvents array, NOT milesActivities
- NEVER deduplicate: identical transactions on same date = multiple entries
${duplicateInfo ? `- Known duplicates in this PDF: ${duplicateInfo}` : ""}

Expected status events: approximately ${expectedStatusEventCount}

STATUS EVENT PATTERNS:
- "Aftrek XP-teller" or "Aftrek XP- teller" -> xp_reset, negative xpChange
  - If -300 XP -> statusReached: "Platinum"
  - If -180 XP -> statusReached: "Gold"
  - If -100 XP -> statusReached: "Silver"
- "Surplus XP beschikbaar" -> xp_surplus, statusReached: null
- "Reset XP-teller" -> xp_reset (annual), statusReached: null
- English variants may also appear

PDF CONTENT:
\`\`\`
${activitiesPdfText}
\`\`\`

Return ALL milesActivities and statusEvents.`

  const activitiesResult = await callOpenAI<ActivitiesOutput>(
    apiKey,
    model,
    SYSTEM_PROMPT_ACTIVITIES,
    activitiesUserPrompt,
    SCHEMA_ACTIVITIES,
    "flying_blue_activities",
  )

  if (!activitiesResult.ok) {
    return res.status(500).json({
      error: `OpenAI error (activities): ${activitiesResult.status}`,
      code: "OPENAI_ERROR",
      details: activitiesResult.error,
      metadata: { timeLeftMs: timeLeft() },
    })
  }

  let activitiesData = activitiesResult.data
  const activitiesUsage = activitiesResult.usage

  let duplicateErrors = validateDuplicates(activitiesData, pdfText)

  const statusEventsDelta = expectedStatusEventCount - activitiesData.statusEvents.length
  const statusEventsInsufficient = expectedStatusEventCount > 0 && statusEventsDelta > 1

  let activitiesDidRetry = false
  let activitiesRetryReason: string | null = null

  if (allowRetry() && (duplicateErrors.length > 0 || statusEventsInsufficient)) {
    activitiesDidRetry = true
    activitiesRetryReason = [
      duplicateErrors.length > 0 ? duplicateErrors.join(", ") : null,
      statusEventsInsufficient ? `expected ~${expectedStatusEventCount}, got ${activitiesData.statusEvents.length}` : null,
    ]
      .filter(Boolean)
      .join(", ")

    const retryPrompt = `${activitiesUserPrompt}

RETRY:
Issues found:
${duplicateErrors.length > 0 ? `- Missing duplicates: ${duplicateErrors.join(", ")}` : ""}
${statusEventsInsufficient ? `- Status events count low: expected ~${expectedStatusEventCount}, got ${activitiesData.statusEvents.length}` : ""}

Please extract ALL transactions including duplicates and ALL status events.`

    const retryResult = await callOpenAI<ActivitiesOutput>(
      apiKey,
      model,
      SYSTEM_PROMPT_ACTIVITIES,
      retryPrompt,
      SCHEMA_ACTIVITIES,
      "flying_blue_activities",
    )

    if (retryResult.ok) {
      const retryDuplicateErrors = validateDuplicates(retryResult.data, pdfText)
      const retryDelta = expectedStatusEventCount - retryResult.data.statusEvents.length

      const currentScore = duplicateErrors.length * 3 + Math.abs(statusEventsDelta)
      const retryScore = retryDuplicateErrors.length * 3 + Math.abs(retryDelta)

      if (retryScore < currentScore) {
        activitiesData = retryResult.data
        duplicateErrors = retryDuplicateErrors
      }
    }
  }

  // ========================================================================
  // MERGE + FINAL
  // ========================================================================

  const merged: ParsedOut = {
    header: flightsData.header,
    flights: flightsData.flights,
    milesActivities: activitiesData.milesActivities,
    statusEvents: activitiesData.statusEvents,
  }

  const finalCoverage = coverageCheckFlightsHeuristic(merged.flights, expectedSegments)
  const finalFlightErrors = validateFlights(merged.flights)
  const finalDuplicateErrors = validateDuplicates(activitiesData, pdfText)

  const parseTimeMs = Date.now() - startTime
  const totalTokens = (flightsUsage.total_tokens ?? 0) + (activitiesUsage.total_tokens ?? 0)

  return res.status(200).json({
    success: true,
    data: merged,
    metadata: {
      model,
      parseTimeMs,
      timeLeftMs: timeLeft(),
      totalTokens,

      originalTextLength: pdfText.length,
      flightsTextLength: flightsPdfText.length,
      activitiesTextLength: activitiesPdfText.length,

      flightsCall: {
        didRetry: flightsDidRetry,
        retryReason: flightsRetryReason,
        tokensUsed: flightsUsage.total_tokens ?? 0,
        expectedSegments: expectedSegments.length,
        actualFlights: merged.flights.length,
        missingSegments: finalCoverage.missing.slice(0, 25),
        missingForRetry: finalCoverage.missingForRetry.slice(0, 25),
        validationErrors: finalFlightErrors,
      },

      activitiesCall: {
        didRetry: activitiesDidRetry,
        retryReason: activitiesRetryReason,
        tokensUsed: activitiesUsage.total_tokens ?? 0,
        expectedStatusEvents: expectedStatusEventCount,
        actualStatusEvents: merged.statusEvents.length,
        actualMilesActivities: merged.milesActivities.length,
        duplicateErrors: finalDuplicateErrors,
      },

      didRetry: flightsDidRetry || activitiesDidRetry,
      retryReason: [flightsRetryReason, activitiesRetryReason].filter(Boolean).join(" | ") || null,
      tokensUsed: totalTokens,
    },
  })
}
