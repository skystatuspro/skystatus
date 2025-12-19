/**
 * PDF Import Diagnostic Script
 * Analyzes what the parser extracts from a Flying Blue PDF
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

// Disable worker for Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// ============================================================================
// COPY OF LEGACY PARSER (parseFlyingBluePdf.ts converted to ESM)
// ============================================================================

const MONTH_MAP = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  'mrt': 3, 'mei': 5, 'okt': 10,
  'fév': 2, 'avr': 4, 'mai': 5, 'jui': 6, 'aoû': 8, 'déc': 12,
  'mär': 3, 'mrz': 3, 'dez': 12,
  'ene': 1, 'abr': 4, 'ago': 8, 'set': 9, 'dic': 12, 'out': 10,
  'gen': 1, 'mag': 5, 'giu': 6, 'lug': 7, 'ott': 10,
};

function findMonth(str) {
  const cleaned = str.toLowerCase().replace(/[^a-zéûôàèùäöüß]/g, '');
  if (MONTH_MAP[cleaned]) return MONTH_MAP[cleaned];
  const prefix = cleaned.substring(0, 3);
  if (MONTH_MAP[prefix]) return MONTH_MAP[prefix];
  for (const [monthKey, monthNum] of Object.entries(MONTH_MAP)) {
    if (cleaned.startsWith(monthKey) || monthKey.startsWith(cleaned)) {
      return monthNum;
    }
  }
  return null;
}

function parseDate(str) {
  if (!str) return null;
  const s = str.toLowerCase().trim();
  
  // Pattern: "17 dec 2025" or "17 december 2025"
  const match1 = s.match(/(\d{1,2})\s+([a-zéûôàèùäöüß]+)\s+(\d{4})/i);
  if (match1) {
    const day = parseInt(match1[1], 10);
    const monthNum = findMonth(match1[2]);
    const year = parseInt(match1[3], 10);
    if (monthNum && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // Pattern: "op 17 dec 2025"
  const match2 = s.match(/op\s+(\d{1,2})\s+([a-zéûôàèùäöüß]+)\s+(\d{4})/i);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const monthNum = findMonth(match2[2]);
    const year = parseInt(match2[3], 10);
    if (monthNum && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return null;
}

// ============================================================================
// MAIN DIAGNOSTIC
// ============================================================================

async function extractTextFromPdf(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

function analyzeRequalifications(text) {
  const results = [];
  const lines = text.split('\n');
  
  // Pattern 1: "Surplus XP beschikbaar op XP-teller" with cycle info
  const surplusPattern = /Surplus XP beschikbaar.*?(\d+)\s*XP.*?kwalifcatieperiode\s+eindigend\s+op\s+(\d{2})\/(\d{2})\/(\d{4}).*?beginnend\s+op\s+(\d{2})\/(\d{2})\/(\d{4})/gi;
  
  // Pattern 2: "Aftrek XP-teller" with status
  const deductPattern = /Aftrek XP-teller.*?(-?\d+)\s*XP.*?(Silver|Gold|Platinum)\s+reached/gi;
  
  // Search in full text (joined)
  const fullText = text.replace(/\n/g, ' ');
  
  let match;
  
  // Find surplus events
  const surplusRegex = /(\d{1,2}\s+[a-z]{3}\s+\d{4}).*?Surplus XP beschikbaar.*?(\d+)\s*XP/gi;
  while ((match = surplusRegex.exec(fullText)) !== null) {
    const date = parseDate(match[1]);
    const xp = parseInt(match[2], 10);
    results.push({
      type: 'SURPLUS_XP',
      date,
      xp,
      raw: match[0].substring(0, 100)
    });
  }
  
  // Find deduct events
  const deductRegex = /(\d{1,2}\s+[a-z]{3}\s+\d{4}).*?Aftrek XP-teller.*?(-?\d+)\s*XP/gi;
  while ((match = deductRegex.exec(fullText)) !== null) {
    const date = parseDate(match[1]);
    const xp = parseInt(match[2], 10);
    
    // Find the status that was reached
    const statusMatch = fullText.substring(match.index, match.index + 200).match(/(Explorer|Silver|Gold|Platinum)\s+reached/i);
    const status = statusMatch ? statusMatch[1] : 'Unknown';
    
    results.push({
      type: 'XP_DEDUCT',
      date,
      xpDeducted: Math.abs(xp),
      statusReached: status,
      raw: match[0].substring(0, 100)
    });
  }
  
  // Find cycle boundaries from "eindigend op" / "beginnend op"
  const cycleRegex = /eindigend\s+op\s+(\d{2})\/(\d{2})\/(\d{4}).*?beginnend\s+op\s+(\d{2})\/(\d{2})\/(\d{4})/gi;
  while ((match = cycleRegex.exec(fullText)) !== null) {
    const endDay = match[1], endMonth = match[2], endYear = match[3];
    const startDay = match[4], startMonth = match[5], startYear = match[6];
    results.push({
      type: 'CYCLE_BOUNDARY',
      cycleEnd: `${endYear}-${endMonth}-${endDay}`,
      cycleStart: `${startYear}-${startMonth}-${startDay}`,
      raw: match[0]
    });
  }
  
  return results;
}

function analyzeFlights(text) {
  const flights = [];
  const lines = text.split(/\n/);
  
  // Look for flight patterns: route + flight number
  const flightRegex = /([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z]{2}\d{3,4})/g;
  const fullText = text;
  
  let match;
  while ((match = flightRegex.exec(fullText)) !== null) {
    // Find XP near this match
    const context = fullText.substring(Math.max(0, match.index - 100), match.index + 200);
    const xpMatch = context.match(/(\d+)\s*XP/);
    const uxpMatch = context.match(/(\d+)\s*UXP/);
    const dateMatch = context.match(/op\s+(\d{1,2}\s+[a-z]{3}\s+\d{4})/i);
    
    flights.push({
      route: `${match[1]}-${match[2]}`,
      flightNumber: match[3],
      xp: xpMatch ? parseInt(xpMatch[1], 10) : 0,
      uxp: uxpMatch ? parseInt(uxpMatch[1], 10) : 0,
      date: dateMatch ? parseDate(dateMatch[1]) : null,
    });
  }
  
  return flights;
}

function analyzeHeader(text) {
  const result = {
    miles: null,
    xp: null,
    uxp: null,
    status: null,
    memberName: null,
    memberNumber: null,
  };
  
  // Pattern: "278499 Miles 183 XP 40 UXP"
  const headerMatch = text.match(/(\d{1,3}(?:[,.\s]?\d{3})*)\s*Miles\s+(\d+)\s*XP\s+(\d+)\s*UXP/i);
  if (headerMatch) {
    result.miles = parseInt(headerMatch[1].replace(/[,.\s]/g, ''), 10);
    result.xp = parseInt(headerMatch[2], 10);
    result.uxp = parseInt(headerMatch[3], 10);
  }
  
  // Status
  const statusMatch = text.match(/\b(EXPLORER|SILVER|GOLD|PLATINUM|ULTIMATE)\b/i);
  if (statusMatch) {
    result.status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
  }
  
  // Member info
  const memberMatch = text.match(/Flying Blue-nummer:\s*(\d+)/i);
  if (memberMatch) {
    result.memberNumber = memberMatch[1];
  }
  
  const nameMatch = text.match(/^([A-Z]+\s+[A-Z]+)/m);
  if (nameMatch) {
    result.memberName = nameMatch[1];
  }
  
  return result;
}

function analyzeBonusXP(text) {
  const bonuses = [];
  const fullText = text.replace(/\n/g, ' ');
  
  // AMEX Welcome bonus
  const amexWelcome = fullText.match(/American Express Platinum Welcome.*?(\d+)\s*XP/gi);
  if (amexWelcome) {
    amexWelcome.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'AMEX_WELCOME', xp: parseInt(xp[1], 10), raw: m });
    });
  }
  
  // AMEX Annual bonus
  const amexAnnual = fullText.match(/American Express.*?Annual bonus.*?(\d+)\s*XP/gi);
  if (amexAnnual) {
    amexAnnual.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'AMEX_ANNUAL', xp: parseInt(xp[1], 10), raw: m });
    });
  }
  
  // Miles donation XP
  const donationXP = fullText.match(/Miles donation.*?XP-beloning.*?(\d+)\s*XP/gi);
  if (donationXP) {
    donationXP.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'DONATION_XP', xp: parseInt(xp[1], 10), raw: m.substring(0, 80) });
    });
  }
  
  // First flight bonus
  const firstFlight = fullText.match(/first\s*flight\s*bonus.*?(\d+)\s*XP/gi);
  if (firstFlight) {
    firstFlight.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'FIRST_FLIGHT', xp: parseInt(xp[1], 10), raw: m });
    });
  }
  
  // Air adjustments
  const airAdj = fullText.match(/Air adjustment.*?(\d+)\s*XP/gi);
  if (airAdj) {
    airAdj.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'AIR_ADJUSTMENT', xp: parseInt(xp[1], 10), raw: m });
    });
  }
  
  // Hotel XP
  const hotelXP = fullText.match(/Hotel.*?ALL.*?Accor.*?(\d+)\s*XP/gi);
  if (hotelXP) {
    hotelXP.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp && parseInt(xp[1], 10) > 0) {
        bonuses.push({ type: 'HOTEL_XP', xp: parseInt(xp[1], 10), raw: m.substring(0, 80) });
      }
    });
  }
  
  // Discount Pass
  const discountPass = fullText.match(/Discount Pass.*?(\d+)\s*XP/gi);
  if (discountPass) {
    discountPass.forEach(m => {
      const xp = m.match(/(\d+)\s*XP/);
      if (xp) bonuses.push({ type: 'DISCOUNT_PASS', xp: parseInt(xp[1], 10), raw: m.substring(0, 80) });
    });
  }
  
  return bonuses;
}

async function main() {
  const pdfPath = '/mnt/user-data/uploads/flyingblue_transaction__1_.pdf';
  
  console.log('='.repeat(80));
  console.log('PDF IMPORT DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log();
  
  // Extract text
  console.log('📄 Extracting text from PDF...');
  const text = await extractTextFromPdf(pdfPath);
  console.log(`   Extracted ${text.length} characters\n`);
  
  // Analyze header
  console.log('📊 HEADER ANALYSIS (Official Balances)');
  console.log('-'.repeat(40));
  const header = analyzeHeader(text);
  console.log(`   Status: ${header.status}`);
  console.log(`   Miles:  ${header.miles?.toLocaleString()}`);
  console.log(`   XP:     ${header.xp} (THIS IS THE TARGET)`);
  console.log(`   UXP:    ${header.uxp}`);
  console.log(`   Member: ${header.memberName} (${header.memberNumber})`);
  console.log();
  
  // Analyze requalifications
  console.log('🔄 REQUALIFICATION EVENTS');
  console.log('-'.repeat(40));
  const requalEvents = analyzeRequalifications(text);
  
  const surplusEvents = requalEvents.filter(e => e.type === 'SURPLUS_XP');
  const deductEvents = requalEvents.filter(e => e.type === 'XP_DEDUCT');
  const cycleBoundaries = requalEvents.filter(e => e.type === 'CYCLE_BOUNDARY');
  
  console.log('\n   XP Deductions (Status Reached):');
  deductEvents.forEach(e => {
    console.log(`   - ${e.date}: -${e.xpDeducted} XP → ${e.statusReached} reached`);
  });
  
  console.log('\n   Surplus XP (Rollover):');
  surplusEvents.forEach(e => {
    console.log(`   - ${e.date}: ${e.xp} XP rollover`);
  });
  
  console.log('\n   Cycle Boundaries:');
  cycleBoundaries.forEach(e => {
    console.log(`   - End: ${e.cycleEnd} → Start: ${e.cycleStart}`);
  });
  
  // Determine current cycle
  console.log('\n📅 CURRENT CYCLE DETERMINATION');
  console.log('-'.repeat(40));
  
  // Most recent requalification
  const sortedDeducts = deductEvents.sort((a, b) => b.date.localeCompare(a.date));
  if (sortedDeducts.length > 0) {
    const latest = sortedDeducts[0];
    const latestSurplus = surplusEvents.find(s => s.date === latest.date);
    console.log(`   Latest level-up: ${latest.date} → ${latest.statusReached}`);
    console.log(`   XP paid: ${latest.xpDeducted}`);
    console.log(`   Rollover XP: ${latestSurplus?.xp || 0}`);
    
    // Calculate cycle start (1st of next month per Flying Blue rules)
    const levelUpDate = new Date(latest.date);
    const cycleStartMonth = new Date(levelUpDate.getFullYear(), levelUpDate.getMonth() + 1, 1);
    const cycleStartStr = cycleStartMonth.toISOString().slice(0, 7);
    console.log(`   Cycle start (calculated): ${cycleStartStr}-01`);
  }
  
  // Analyze bonus XP
  console.log('\n🎁 BONUS XP EVENTS (Non-Flight XP)');
  console.log('-'.repeat(40));
  const bonusEvents = analyzeBonusXP(text);
  
  const bonusByType = {};
  bonusEvents.forEach(b => {
    if (!bonusByType[b.type]) bonusByType[b.type] = [];
    bonusByType[b.type].push(b);
  });
  
  let totalBonusXP = 0;
  for (const [type, events] of Object.entries(bonusByType)) {
    const sum = events.reduce((s, e) => s + e.xp, 0);
    totalBonusXP += sum;
    console.log(`   ${type}: ${events.length}x = ${sum} XP`);
  }
  console.log(`   TOTAL BONUS XP: ${totalBonusXP}`);
  
  // Flight summary
  console.log('\n✈️ FLIGHT SUMMARY');
  console.log('-'.repeat(40));
  const flights = analyzeFlights(text);
  const uniqueFlights = [...new Map(flights.map(f => [`${f.date}|${f.route}|${f.flightNumber}`, f])).values()];
  
  // Group by month
  const flightsByMonth = {};
  uniqueFlights.forEach(f => {
    if (f.date) {
      const month = f.date.slice(0, 7);
      if (!flightsByMonth[month]) flightsByMonth[month] = [];
      flightsByMonth[month].push(f);
    }
  });
  
  const sortedMonths = Object.keys(flightsByMonth).sort().reverse();
  for (const month of sortedMonths.slice(0, 6)) {
    const monthFlights = flightsByMonth[month];
    const monthXP = monthFlights.reduce((s, f) => s + f.xp, 0);
    const monthUXP = monthFlights.reduce((s, f) => s + f.uxp, 0);
    console.log(`   ${month}: ${monthFlights.length} flights, ${monthXP} XP, ${monthUXP} UXP`);
  }
  
  // XP Calculation attempt
  console.log('\n🧮 XP CALCULATION');
  console.log('-'.repeat(40));
  
  // Get latest cycle info
  const latestDeduct = sortedDeducts[0];
  if (latestDeduct) {
    const cycleStartDate = latestDeduct.date;
    const rolloverXP = surplusEvents.find(s => s.date === cycleStartDate)?.xp || 0;
    
    console.log(`   Cycle started: ${cycleStartDate}`);
    console.log(`   Rollover XP: ${rolloverXP}`);
    
    // Sum XP from flights AFTER cycle start
    let flightXPInCycle = 0;
    let flightUXPInCycle = 0;
    uniqueFlights.forEach(f => {
      if (f.date && f.date > cycleStartDate) {
        flightXPInCycle += f.xp;
        flightUXPInCycle += f.uxp;
      }
    });
    
    console.log(`   Flight XP after ${cycleStartDate}: ${flightXPInCycle}`);
    console.log(`   Flight UXP after ${cycleStartDate}: ${flightUXPInCycle}`);
    
    // Find bonus XP in current cycle (rough estimate)
    // This needs date parsing for bonus events which we don't have fully
    
    const calculatedXP = rolloverXP + flightXPInCycle;
    console.log(`\n   CALCULATED: ${rolloverXP} (rollover) + ${flightXPInCycle} (flights) = ${calculatedXP} XP`);
    console.log(`   OFFICIAL:   ${header.xp} XP`);
    console.log(`   DIFFERENCE: ${header.xp - calculatedXP} XP`);
    
    if (header.xp - calculatedXP > 0) {
      console.log(`\n   ⚠️  Missing ${header.xp - calculatedXP} XP - likely bonus XP not counted`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('END DIAGNOSTIC');
  console.log('='.repeat(80));
}

main().catch(console.error);
