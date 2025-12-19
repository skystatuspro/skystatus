/**
 * PDF Import Diagnostic Script - Simple Version
 * Extracts and analyzes text from Flying Blue PDF
 */

const fs = require('fs');

// Simple PDF text extraction using basic parsing
function extractTextFromPdfBuffer(buffer) {
  const str = buffer.toString('latin1');
  const textParts = [];
  
  // Find all text streams in PDF
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  
  while ((match = streamRegex.exec(str)) !== null) {
    const content = match[1];
    // Look for text operators
    const textRegex = /\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g;
    let textMatch;
    while ((textMatch = textRegex.exec(content)) !== null) {
      const text = textMatch[1] || textMatch[2];
      if (text) {
        // Basic decoding
        const decoded = text.replace(/\\([0-7]{3})/g, (_, oct) => 
          String.fromCharCode(parseInt(oct, 8))
        ).replace(/\\(.)/g, '$1');
        textParts.push(decoded);
      }
    }
  }
  
  return textParts.join(' ');
}

// Alternative: Look for specific patterns directly in PDF
function findPatternsInPdf(buffer) {
  const str = buffer.toString('latin1');
  const results = {
    miles: [],
    xp: [],
    status: [],
    dates: [],
    transactions: []
  };
  
  // Pattern for numbers followed by "Miles", "XP", "UXP"
  const milesPattern = /(\d{1,3}(?:[\s,.]?\d{3})*)\s*Miles/gi;
  const xpPattern = /(\d+)\s*XP/gi;
  const uxpPattern = /(\d+)\s*UXP/gi;
  const statusPattern = /(Explorer|Silver|Gold|Platinum|Ultimate)/gi;
  const datePattern = /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mrt|mei|okt)\s+(\d{4})/gi;
  
  let match;
  
  while ((match = milesPattern.exec(str)) !== null) {
    results.miles.push(match[0]);
  }
  
  while ((match = xpPattern.exec(str)) !== null) {
    results.xp.push(match[0]);
  }
  
  while ((match = uxpPattern.exec(str)) !== null) {
    results.xp.push(match[0]);
  }
  
  while ((match = statusPattern.exec(str)) !== null) {
    results.status.push(match[0]);
  }
  
  while ((match = datePattern.exec(str)) !== null) {
    results.dates.push(match[0]);
  }
  
  return results;
}

// Read the actual TypeScript parser to understand the patterns
function readLegacyParser() {
  const parserPath = './src/utils/parseFlyingBluePdf.ts';
  if (fs.existsSync(parserPath)) {
    const content = fs.readFileSync(parserPath, 'utf8');
    
    // Extract key patterns used
    const patterns = {
      requalification: [],
      bonusXP: [],
      flights: []
    };
    
    // Find regex patterns
    const regexMatches = content.matchAll(/\/([^\/]+)\/[gim]*/g);
    for (const match of regexMatches) {
      patterns.requalification.push(match[0]);
    }
    
    return patterns;
  }
  return null;
}

async function main() {
  console.log('='.repeat(80));
  console.log('PDF IMPORT DIAGNOSTIC - DIRECT ANALYSIS');
  console.log('='.repeat(80));
  console.log();
  
  const pdfPath = '/mnt/user-data/uploads/flyingblue_transaction__1_.pdf';
  
  // Read PDF
  console.log('📄 Reading PDF file...');
  const buffer = fs.readFileSync(pdfPath);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB\n`);
  
  // Find patterns directly
  console.log('🔍 SEARCHING FOR KEY PATTERNS');
  console.log('-'.repeat(50));
  
  const patterns = findPatternsInPdf(buffer);
  
  console.log(`\n   Miles mentions: ${patterns.miles.length}`);
  if (patterns.miles.length > 0) {
    // Show first few unique ones
    const unique = [...new Set(patterns.miles)].slice(0, 10);
    unique.forEach(m => console.log(`      - ${m}`));
  }
  
  console.log(`\n   XP mentions: ${patterns.xp.length}`);
  if (patterns.xp.length > 0) {
    const unique = [...new Set(patterns.xp)].slice(0, 20);
    unique.forEach(x => console.log(`      - ${x}`));
  }
  
  console.log(`\n   Status mentions: ${patterns.status.length}`);
  if (patterns.status.length > 0) {
    const unique = [...new Set(patterns.status)];
    unique.forEach(s => console.log(`      - ${s}`));
  }
  
  console.log(`\n   Date mentions: ${patterns.dates.length}`);
  if (patterns.dates.length > 0) {
    const unique = [...new Set(patterns.dates)].slice(0, 15);
    unique.forEach(d => console.log(`      - ${d}`));
  }
  
  // Check for specific keywords related to requalification
  console.log('\n');
  console.log('🔄 REQUALIFICATION KEYWORDS');
  console.log('-'.repeat(50));
  
  const str = buffer.toString('latin1');
  
  const keywords = [
    'Aftrek XP-teller',
    'XP-teller',
    'Surplus XP',
    'reached',
    'eindigend op',
    'beginnend op',
    'kwalificatieperiode',
    'Qualification period',
    'level reached'
  ];
  
  keywords.forEach(kw => {
    const count = (str.match(new RegExp(kw, 'gi')) || []).length;
    console.log(`   "${kw}": ${count} occurrences`);
  });
  
  // Check for bonus XP sources
  console.log('\n');
  console.log('🎁 BONUS XP SOURCE KEYWORDS');
  console.log('-'.repeat(50));
  
  const bonusKeywords = [
    'American Express',
    'AMEX',
    'Welcome bonus',
    'Annual bonus',
    'Miles donation',
    'XP-beloning',
    'first flight bonus',
    'Hotel',
    'Accor',
    'Discount Pass',
    'Air adjustment'
  ];
  
  bonusKeywords.forEach(kw => {
    const count = (str.match(new RegExp(kw, 'gi')) || []).length;
    console.log(`   "${kw}": ${count} occurrences`);
  });
  
  // Now let's analyze the legacy parser
  console.log('\n');
  console.log('📜 ANALYZING LEGACY PARSER');
  console.log('-'.repeat(50));
  
  const parserPath = './src/utils/parseFlyingBluePdf.ts';
  if (fs.existsSync(parserPath)) {
    const parserContent = fs.readFileSync(parserPath, 'utf8');
    
    // Find the requalification detection logic
    const requalSection = parserContent.match(/requalification[^{]*\{[^}]+\}/gi);
    console.log(`   Requalification sections found: ${requalSection?.length || 0}`);
    
    // Find bonus XP handling
    const bonusSection = parserContent.match(/bonusXp/gi);
    console.log(`   BonusXP mentions: ${bonusSection?.length || 0}`);
    
    // Check if SAF XP is handled
    const safXp = parserContent.match(/safXp/gi);
    console.log(`   SAF XP mentions: ${safXp?.length || 0}`);
    
    // Look for cycle calculation
    const cycleCalc = parserContent.match(/cycle.*start/gi);
    console.log(`   Cycle start mentions: ${cycleCalc?.length || 0}`);
  } else {
    console.log('   Parser file not found!');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('END DIAGNOSTIC');
  console.log('='.repeat(80));
}

main().catch(console.error);
