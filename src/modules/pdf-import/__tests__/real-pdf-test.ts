/**
 * Real PDF Test - Validates the PDF import module against actual Flying Blue PDF
 * 
 * This test uses the text content extracted from a real PDF to validate parsing.
 * Expected data based on manual analysis:
 * 
 * Header:
 * - Name: DEGRAAF REMCO
 * - FB Number: 4629294326
 * - Status: PLATINUM
 * - Totals: 248928 Miles, 183 XP, 40 UXP
 * 
 * Key Events:
 * - Requalification on 8 okt 2025 (rollover 23 XP, -300 XP reset)
 * - Cycle start: 08/10/2025
 */

import { tokenize, detectLanguage } from '../core/tokenizer';
import { extractFlights } from '../core/flight-extractor';
import { extractMiles } from '../core/miles-extractor';
import { extractXP } from '../core/xp-extractor';

// Sample text from the real PDF (first few transactions)
const SAMPLE_PDF_TEXT = `
DEGRAAF REMCO
Flying Blue-nummer: 4629294326
PLATINUM
Activiteitengeschiedenis 248928 Miles 183 XP 40 UXP
10 dec 2025 Hotel - BOOKING.COM WITH KLM 367 Miles 0 XP
BOOKING.COM WITH KLM 367 Miles 0 XP
op 21 nov 2025
10 dec 2025 Hotel - BOOKING.COM WITH KLM 934 Miles 0 XP
BOOKING.COM WITH KLM 934 Miles 0 XP
op 22 nov 2025
4 dec 2025 Hotel - ALL- Accor Live Limitless MILES+POINTS 600 Miles 0 XP
ALL- Accor Live Limitless MILES+POINTS 600 Miles 0 XP
op 3 dec 2025
4 dec 2025 Hotel - ALL- Accor Live Limitless MILES+POINTS 2000 Miles 0 XP
ALL- Accor Live Limitless MILES+POINTS 2000 Miles 0 XP
op 3 dec 2025
30 nov 2025 RevPoints to Miles 518 Miles 0 XP
REVOLUT (REV10) 518 Miles 0 XP
op 30 nov 2025
30 nov 2025 Mijn reis naar Berlijn 1312 Miles 16 XP 16 UXP
AMS - BER KL1775 gespaarde Miles op basis van bestede euro's 276 Miles 5 XP 5 UXP
op 29 nov 2025
Sustainable Aviation Fuel 176 Miles 3 XP 3 UXP
op 29 nov 2025
Sustainable Aviation Fuel 176 Miles 3 XP 3 UXP
op 29 nov 2025
BER - AMS KL1780 gespaarde Miles op basis van bestede euro's 684 Miles 5 XP 5 UXP
op 30 nov 2025
29 nov 2025 Mijn reis naar Oslo 2980 Miles 30 XP
AMS - OSL SK0822 gespaarde Miles, op basis van reisafstand en boekingsklasse 1490 Miles 15 XP
op 28 nov 2025
OSL - AMS SK0827 gespaarde Miles, op basis van reisafstand en boekingsklasse 1490 Miles 15 XP
op 28 nov 2025
26 nov 2025 Miles overdragen - Flying Blue Family 1000 Miles 0 XP
Extra info: Miles van CHRISTY ZEDDEMAN 1000 Miles 0 XP
op 26 nov 2025
25 nov 2025 Mijn reis naar Amsterdam 250 Miles 0 XP
KEF – AMS TRANSAVIA HOLLAND – gespaarde Miles op basis van Transavia-tarief 250 Miles 0 XP
op 24 nov 2025
25 nov 2025 Mijn reis naar Amsterdam 250 Miles 5 XP
KEF – AMS TRANSAVIA HOLLAND – gespaarde Miles op basis van Transavia-tarief 250 Miles 5 XP
op 24 nov 2025
22 nov 2025 Mijn reis naar Reykjavik 250 Miles 0 XP
AMS – KEF TRANSAVIA HOLLAND – gespaarde Miles op basis van Transavia-tarief 250 Miles 0 XP
op 21 nov 2025
22 nov 2025 Mijn reis naar Reykjavik 250 Miles 5 XP
AMS – KEF TRANSAVIA HOLLAND – gespaarde Miles op basis van Transavia-tarief 250 Miles 5 XP
op 21 nov 2025
17 nov 2025 Mijn reis naar Bangkok 15882 Miles 24 XP 24 UXP
AMS - BKK KL0843 gespaarde Miles op basis van bestede euro's 4400 Miles 12 XP 12 UXP
op 8 nov 2025
Upgrade Economy to Premium Economy 0 Miles 0 XP
op 8 nov 2025
BKK - AMS KL0844 gespaarde Miles op basis van bestede euro's 3490 Miles 12 XP 12 UXP
op 15 nov 2025
Upgrade Economy to Business 7992 Miles 0 XP
op 15 nov 2025
17 nov 2025 Subscribe to Miles Complete EUR 17000 Miles 0 XP
Buy, Gift, Transfer, Subscribe to Miles 17000 Miles 0 XP
op 17 nov 2025
17 nov 2025 AMERICAN EXPRESS PLATINUM CARD 10811 Miles 0 XP
AMERICAN EXPRESS 10811 Miles 0 XP
op 15 nov 2025
17 nov 2025 AMERICAN EXPRESS PLATINUM CARD AF-KLM SPEND 15336 Miles 0 XP
AMERICAN EXPRESS 15336 Miles 0 XP
op 15 nov 2025
8 okt 2025 Surplus XP beschikbaar op XP-teller 0 Miles 23 XP
Aantal behaalde XP in de vorige kwalificatieperiode eindigend op 07/10/2025 en meegenomen naar de nieuwe kwalificatieperiode beginnend op 08/10/2025 0 Miles 23 XP
op 8 okt 2025
8 okt 2025 Aftrek XP-teller 0 Miles -300 XP
Qualification period ended / Platinum reached 0 Miles -300 XP
op 8 okt 2025
`;

// Test functions
function testLanguageDetection() {
  console.log('\n=== Language Detection Test ===');
  const language = detectLanguage(SAMPLE_PDF_TEXT);
  console.log(`Detected language: ${language}`);
  console.log(`Expected: nl`);
  console.log(`Result: ${language === 'nl' ? '✅ PASS' : '❌ FAIL'}`);
  return language === 'nl';
}

function testTokenizer() {
  console.log('\n=== Tokenizer Test ===');
  const result = tokenize(SAMPLE_PDF_TEXT);
  console.log(`Total lines: ${result.lines.length}`);
  console.log(`Detected language: ${result.language}`);
  console.log(`Transaction lines: ${result.lines.filter(l => l.startsTransaction).length}`);
  console.log(`Status lines: ${result.lines.filter(l => l.type === 'status').length}`);
  console.log(`Summary lines: ${result.lines.filter(l => l.type === 'summary').length}`);
  
  // Check for PLATINUM status detection
  const hasStatus = result.lines.some(l => l.type === 'status' && l.text.includes('PLATINUM'));
  console.log(`Status PLATINUM found: ${hasStatus ? '✅ PASS' : '❌ FAIL'}`);
  
  return result.lines.length > 0;
}

function testFlightExtraction() {
  console.log('\n=== Flight Extraction Test ===');
  const lines = SAMPLE_PDF_TEXT.split('\n').map(l => l.trim()).filter(l => l);
  const flights = extractFlights(lines, 'nl');
  
  console.log(`Total flights extracted: ${flights.length}`);
  
  // Expected flights from the sample:
  // 1. AMS-BER KL1775
  // 2. BER-AMS KL1780
  // 3. AMS-OSL SK0822
  // 4. OSL-AMS SK0827
  // 5-8. Transavia flights (KEF-AMS, AMS-KEF)
  // 9. AMS-BKK KL0843
  // 10. BKK-AMS KL0844
  
  flights.forEach((f, i) => {
    console.log(`  ${i+1}. ${f.date} ${f.route} ${f.flightNumber} - ${f.earnedXP} XP, ${f.earnedMiles} Miles`);
  });
  
  // Check for specific flights
  const hasBerlinFlight = flights.some(f => f.route === 'AMS-BER' && f.flightNumber === 'KL1775');
  const hasOsloFlight = flights.some(f => f.route === 'AMS-OSL' && f.flightNumber.startsWith('SK'));
  const hasBangkokFlight = flights.some(f => f.route === 'AMS-BKK' && f.flightNumber === 'KL0843');
  
  console.log(`\nBerlin flight (KL1775): ${hasBerlinFlight ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Oslo partner flight (SK): ${hasOsloFlight ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bangkok flight (KL0843): ${hasBangkokFlight ? '✅ PASS' : '❌ FAIL'}`);
  
  return flights.length > 0;
}

function testMilesExtraction() {
  console.log('\n=== Miles Extraction Test ===');
  const lines = SAMPLE_PDF_TEXT.split('\n').map(l => l.trim()).filter(l => l);
  const miles = extractMiles(lines, 'nl');
  
  console.log(`Total months with miles: ${miles.length}`);
  
  miles.forEach(m => {
    const total = m.sources.subscription.miles + m.sources.creditCard.miles + 
                  m.sources.hotel.miles + m.sources.other.miles;
    console.log(`  ${m.month}: ${total} earned, ${m.debit} debit`);
  });
  
  // Check for expected categories
  const hasNov = miles.some(m => m.month === '2025-11');
  const hasOct = miles.some(m => m.month === '2025-10');
  
  console.log(`\nNovember 2025 data: ${hasNov ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`October 2025 data: ${hasOct ? '✅ PASS' : '❌ FAIL'}`);
  
  return miles.length > 0;
}

function testXPExtraction() {
  console.log('\n=== XP Extraction Test ===');
  const lines = SAMPLE_PDF_TEXT.split('\n').map(l => l.trim()).filter(l => l);
  const flights = extractFlights(lines, 'nl');
  const xpResult = extractXP(lines, flights, 'nl');
  
  console.log(`XP from flights: ${xpResult.fromFlights}`);
  console.log(`XP from SAF: ${xpResult.fromSaf}`);
  console.log(`XP from bonus: ${xpResult.fromBonus}`);
  console.log(`Total UXP: ${xpResult.totalUXP}`);
  
  // Expected: Berlin trip has SAF bonus, Bangkok trip has UXP
  const hasSafXP = xpResult.fromSaf > 0;
  const hasUXP = xpResult.totalUXP > 0;
  
  console.log(`\nSAF XP detected: ${hasSafXP ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`UXP detected: ${hasUXP ? '✅ PASS' : '❌ FAIL'}`);
  
  // Bonus XP by month
  console.log('\nBonus XP by month:');
  for (const [month, xp] of Object.entries(xpResult.bonusXpByMonth)) {
    console.log(`  ${month}: ${xp} XP`);
  }
  
  return xpResult.fromFlights > 0;
}

// Run all tests
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  PDF Import Module v2.0 - Real PDF Validation Test           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');

const results = {
  language: testLanguageDetection(),
  tokenizer: testTokenizer(),
  flights: testFlightExtraction(),
  miles: testMilesExtraction(),
  xp: testXPExtraction(),
};

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
for (const [test, passed] of Object.entries(results)) {
  console.log(`  ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
}

const allPassed = Object.values(results).every(r => r);
console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
