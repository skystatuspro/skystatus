/**
 * PDF Import Diagnostic Script
 * Analyzes what the parser extracts from a Flying Blue PDF
 */

const { PDFParse } = require('pdf-parse');
const fs = require('fs');

// ============================================================================
// MONTH PARSING
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
  
  return null;
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

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
  
  return result;
}

function analyzeRequalifications(text) {
  const results = [];
  const fullText = text.replace(/\n/g, ' ');
  
  // Find "Aftrek XP-teller" with status reached
  // Pattern: date ... Aftrek XP-teller ... -300 XP ... Platinum reached
  const deductRegex = /(\d{1,2}\s+[a-zéûô]{3}\s+\d{4})\s+Aftrek XP-teller\s+.*?(-?\d+)\s*XP/gi;
  let match;
  
  while ((match = deductRegex.exec(fullText)) !== null) {
    const date = parseDate(match[1]);
    const xp = parseInt(match[2], 10);
    
    // Find the status that was reached (look ahead)
    const contextAfter = fullText.substring(match.index, match.index + 300);
    const statusMatch = contextAfter.match(/(Explorer|Silver|Gold|Platinum)\s+reached/i);
    const status = statusMatch ? statusMatch[1] : 'Unknown';
    
    results.push({
      type: 'XP_DEDUCT',
      date,
      xpDeducted: Math.abs(xp),
      statusReached: status,
    });
  }
  
  // Find "Surplus XP beschikbaar" events
  const surplusRegex = /(\d{1,2}\s+[a-zéûô]{3}\s+\d{4})\s+Surplus XP beschikbaar.*?(\d+)\s*XP/gi;
  
  while ((match = surplusRegex.exec(fullText)) !== null) {
    const date = parseDate(match[1]);
    const xp = parseInt(match[2], 10);
    
    results.push({
      type: 'SURPLUS_XP',
      date,
      rolloverXP: xp,
    });
  }
  
  // Find cycle boundaries
  const cycleRegex = /eindigend\s+op\s+(\d{2})\/(\d{2})\/(\d{4}).*?beginnend\s+op\s+(\d{2})\/(\d{2})\/(\d{4})/gi;
  while ((match = cycleRegex.exec(fullText)) !== null) {
    const endDay = match[1], endMonth = match[2], endYear = match[3];
    const startDay = match[4], startMonth = match[5], startYear = match[6];
    results.push({
      type: 'CYCLE_BOUNDARY',
      cycleEnd: `${endYear}-${endMonth}-${endDay}`,
      cycleStart: `${startYear}-${startMonth}-${startDay}`,
    });
  }
  
  return results;
}

function analyzeBonusXP(text) {
  const bonuses = [];
  const fullText = text.replace(/\n/g, ' ');
  
  // Patterns for various bonus XP types
  const patterns = [
    { type: 'AMEX_WELCOME', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+American Express Platinum Welcome.*?(\d+)\s*XP/gi },
    { type: 'AMEX_ANNUAL', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+American Express.*?Annual bonus.*?(\d+)\s*XP/gi },
    { type: 'DONATION_XP', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+Miles donation.*?(\d+)\s*XP/gi },
    { type: 'FIRST_FLIGHT', regex: /Miles\+Points\s+first\s*flight\s*bonus.*?(\d+)\s*XP/gi },
    { type: 'AIR_ADJUSTMENT', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+Air adjustment.*?(\d+)\s*XP/gi },
    { type: 'HOTEL_XP', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+Hotel.*?(\d+)\s*XP/gi },
    { type: 'DISCOUNT_PASS', regex: /(\d{1,2}\s+[a-z]{3}\s+\d{4})\s+.*?Discount Pass.*?(\d+)\s*XP/gi },
  ];
  
  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const xpMatch = match[0].match(/(\d+)\s*XP/);
      const xp = xpMatch ? parseInt(xpMatch[1], 10) : 0;
      if (xp > 0) {
        const dateMatch = match[1] ? parseDate(match[1]) : null;
        bonuses.push({ type, xp, date: dateMatch });
      }
    }
  }
  
  return bonuses;
}

function analyzeFlights(text) {
  const flights = [];
  const fullText = text.replace(/\n/g, ' ');
  
  // Look for "Mijn reis naar X" patterns followed by flight details
  const tripRegex = /Mijn reis naar\s+(\w+)\s+(\d+)\s*Miles\s+(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/gi;
  
  let match;
  while ((match = tripRegex.exec(fullText)) !== null) {
    // Find the date before this match
    const contextBefore = fullText.substring(Math.max(0, match.index - 50), match.index);
    const dateMatch = contextBefore.match(/(\d{1,2}\s+[a-z]{3}\s+\d{4})/i);
    
    flights.push({
      destination: match[1],
      miles: parseInt(match[2], 10),
      xp: parseInt(match[3], 10),
      uxp: match[4] ? parseInt(match[4], 10) : 0,
      date: dateMatch ? parseDate(dateMatch[1]) : null,
    });
  }
  
  // Also look for individual flight segments
  const segmentRegex = /([A-Z]{3})\s*[-–]\s*([A-Z]{3})\s+([A-Z]{2}\d{3,4}).*?(\d+)\s*Miles.*?(\d+)\s*XP(?:\s+(\d+)\s*UXP)?/gi;
  
  while ((match = segmentRegex.exec(fullText)) !== null) {
    // Find the date (look for "op DD MMM YYYY")
    const contextBefore = fullText.substring(Math.max(0, match.index - 100), match.index + 300);
    const dateMatch = contextBefore.match(/op\s+(\d{1,2}\s+[a-z]{3}\s+\d{4})/i);
    
    flights.push({
      route: `${match[1]}-${match[2]}`,
      flightNumber: match[3],
      miles: parseInt(match[4], 10),
      xp: parseInt(match[5], 10),
      uxp: match[6] ? parseInt(match[6], 10) : 0,
      date: dateMatch ? parseDate(dateMatch[1]) : null,
      type: 'segment',
    });
  }
  
  return flights;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const pdfPath = '/mnt/user-data/uploads/flyingblue_transaction__1_.pdf';
  
  console.log('='.repeat(80));
  console.log('PDF IMPORT DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log();
  
  // Extract text
  console.log('📄 Extracting text from PDF...');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  const text = data.text;
  console.log(`   Extracted ${text.length} characters from ${data.numpages} pages\n`);
  
  // Analyze header
  console.log('📊 HEADER ANALYSIS (Official Balances)');
  console.log('-'.repeat(50));
  const header = analyzeHeader(text);
  console.log(`   Status: ${header.status}`);
  console.log(`   Miles:  ${header.miles?.toLocaleString()}`);
  console.log(`   XP:     ${header.xp} ← THIS IS THE TARGET`);
  console.log(`   UXP:    ${header.uxp}`);
  console.log();
  
  // Analyze requalifications
  console.log('🔄 REQUALIFICATION EVENTS');
  console.log('-'.repeat(50));
  const requalEvents = analyzeRequalifications(text);
  
  const deductEvents = requalEvents.filter(e => e.type === 'XP_DEDUCT').sort((a, b) => a.date?.localeCompare(b.date) || 0);
  const surplusEvents = requalEvents.filter(e => e.type === 'SURPLUS_XP');
  const cycleBoundaries = requalEvents.filter(e => e.type === 'CYCLE_BOUNDARY');
  
  console.log('\n   Status Level-Ups (XP Deductions):');
  deductEvents.forEach(e => {
    console.log(`   📈 ${e.date}: -${e.xpDeducted} XP → ${e.statusReached} reached`);
  });
  
  console.log('\n   Rollover XP (Surplus):');
  surplusEvents.forEach(e => {
    console.log(`   💰 ${e.date}: ${e.rolloverXP} XP carried forward`);
  });
  
  console.log('\n   Cycle Boundaries Detected:');
  cycleBoundaries.forEach(e => {
    console.log(`   📅 Old cycle ended: ${e.cycleEnd} → New cycle started: ${e.cycleStart}`);
  });
  
  // Determine current cycle
  console.log('\n');
  console.log('📅 CURRENT CYCLE ANALYSIS');
  console.log('-'.repeat(50));
  
  // Most recent requalification
  const sortedDeducts = [...deductEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (sortedDeducts.length > 0) {
    const latest = sortedDeducts[0];
    const latestSurplus = surplusEvents.find(s => s.date === latest.date);
    
    console.log(`   Latest level-up: ${latest.date}`);
    console.log(`   Status reached: ${latest.statusReached}`);
    console.log(`   XP paid for level-up: ${latest.xpDeducted}`);
    console.log(`   Rollover XP into new cycle: ${latestSurplus?.rolloverXP || 0}`);
    
    // Calculate cycle start (1st of next month per Flying Blue rules)
    if (latest.date) {
      const levelUpDate = new Date(latest.date);
      const cycleStartMonth = new Date(levelUpDate.getFullYear(), levelUpDate.getMonth() + 1, 1);
      const cycleStartStr = cycleStartMonth.toISOString().slice(0, 10);
      console.log(`   Cycle start (calculated): ${cycleStartStr}`);
      console.log(`   Cycle start month (YYYY-MM): ${cycleStartStr.slice(0, 7)}`);
    }
  }
  
  // Analyze bonus XP
  console.log('\n');
  console.log('🎁 BONUS XP EVENTS');
  console.log('-'.repeat(50));
  const bonusEvents = analyzeBonusXP(text);
  
  // Group by type
  const bonusByType = {};
  bonusEvents.forEach(b => {
    if (!bonusByType[b.type]) bonusByType[b.type] = [];
    bonusByType[b.type].push(b);
  });
  
  let totalBonusXP = 0;
  for (const [type, events] of Object.entries(bonusByType)) {
    const sum = events.reduce((s, e) => s + e.xp, 0);
    totalBonusXP += sum;
    console.log(`   ${type}: ${events.length} events = ${sum} XP`);
    events.forEach(e => {
      console.log(`      - ${e.date || 'unknown'}: ${e.xp} XP`);
    });
  }
  console.log(`\n   TOTAL BONUS XP DETECTED: ${totalBonusXP}`);
  
  // Flight analysis
  console.log('\n');
  console.log('✈️  FLIGHT ANALYSIS');
  console.log('-'.repeat(50));
  const flights = analyzeFlights(text);
  
  // Filter to trip summaries
  const trips = flights.filter(f => f.destination);
  console.log(`\n   Found ${trips.length} trips:`);
  trips.slice(0, 10).forEach(t => {
    console.log(`   - ${t.date || '?'}: ${t.destination} - ${t.xp} XP, ${t.uxp} UXP`);
  });
  
  // XP Calculation
  console.log('\n');
  console.log('🧮 XP CALCULATION ANALYSIS');
  console.log('-'.repeat(50));
  
  const latestDeduct = sortedDeducts[0];
  if (latestDeduct) {
    const cycleStartDate = latestDeduct.date;
    const rolloverXP = surplusEvents.find(s => s.date === cycleStartDate)?.rolloverXP || 0;
    
    console.log(`\n   Current cycle started: ${cycleStartDate}`);
    console.log(`   Starting rollover: ${rolloverXP} XP`);
    
    // Sum XP from trips AFTER cycle start
    let flightXPInCycle = 0;
    let flightUXPInCycle = 0;
    const tripsInCycle = trips.filter(t => t.date && t.date > cycleStartDate);
    
    tripsInCycle.forEach(t => {
      flightXPInCycle += t.xp;
      flightUXPInCycle += t.uxp;
    });
    
    console.log(`\n   Trips after ${cycleStartDate}: ${tripsInCycle.length}`);
    tripsInCycle.forEach(t => {
      console.log(`      ${t.date}: ${t.destination} - ${t.xp} XP`);
    });
    
    console.log(`\n   Flight XP in current cycle: ${flightXPInCycle}`);
    console.log(`   Flight UXP in current cycle: ${flightUXPInCycle}`);
    
    // Find bonus XP in current cycle
    let bonusXPInCycle = 0;
    bonusEvents.filter(b => b.date && b.date > cycleStartDate).forEach(b => {
      bonusXPInCycle += b.xp;
    });
    console.log(`   Bonus XP in current cycle: ${bonusXPInCycle}`);
    
    const calculatedXP = rolloverXP + flightXPInCycle + bonusXPInCycle;
    
    console.log('\n   ' + '='.repeat(40));
    console.log(`   CALCULATED XP: ${rolloverXP} + ${flightXPInCycle} + ${bonusXPInCycle} = ${calculatedXP}`);
    console.log(`   OFFICIAL XP:   ${header.xp}`);
    console.log(`   DIFFERENCE:    ${header.xp - calculatedXP} XP`);
    console.log('   ' + '='.repeat(40));
    
    if (header.xp - calculatedXP !== 0) {
      console.log(`\n   ⚠️  XP MISMATCH DETECTED!`);
      if (header.xp > calculatedXP) {
        console.log(`   Missing ${header.xp - calculatedXP} XP from calculation`);
        console.log(`   Possible causes:`);
        console.log(`   - Bonus XP not detected (AMEX, hotel, etc.)`);
        console.log(`   - SAF XP not included in trip totals`);
        console.log(`   - Flight date parsing issues`);
      } else {
        console.log(`   Overcounting ${calculatedXP - header.xp} XP`);
        console.log(`   Possible causes:`);
        console.log(`   - Flights from PREVIOUS cycle included`);
        console.log(`   - Cycle start date calculated incorrectly`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
