// src/modules/local-text-parser/__tests__/parser.test.ts
// Basic tests for the local text parser

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { localParseText, isLikelyFlyingBlueContent } from '../index';
import { parseHeader, detectLanguage } from '../header-parser';
import { splitAndClassifyTransactions } from '../transaction-splitter';
import { validateInput } from '../validator';

// Load sample fixture
const fixturePath = join(__dirname, 'fixtures', 'sample-paste.txt');
let sampleText: string;

beforeAll(() => {
  sampleText = readFileSync(fixturePath, 'utf-8');
});

describe('Validator', () => {
  it('should detect valid Flying Blue content', () => {
    const result = validateInput(sampleText);
    expect(result.isValid).toBe(true);
    expect(result.isFlyingBlueContent).toBe(true);
    expect(result.language).toBe('nl');
  });

  it('should reject non-Flying Blue content', () => {
    const result = validateInput('This is just random text without any Flying Blue content');
    expect(result.isValid).toBe(false);
    expect(result.isFlyingBlueContent).toBe(false);
  });

  it('should reject very short text', () => {
    const result = validateInput('Too short');
    expect(result.isValid).toBe(false);
    // Check that at least one error mentions length or short
    const hasLengthError = result.errors.some(e => 
      e.toLowerCase().includes('short') || e.toLowerCase().includes('characters')
    );
    expect(hasLengthError).toBe(true);
  });
});

describe('isLikelyFlyingBlueContent', () => {
  it('should return true for valid content', () => {
    expect(isLikelyFlyingBlueContent(sampleText)).toBe(true);
  });

  it('should return false for invalid content', () => {
    expect(isLikelyFlyingBlueContent('random text')).toBe(false);
  });
});

describe('Header Parser', () => {
  it('should detect Dutch language', () => {
    const lang = detectLanguage(sampleText);
    expect(lang).toBe('nl');
  });

  it('should extract header information', () => {
    const header = parseHeader(sampleText);
    
    expect(header.memberName).toBe('DEGRAAF REMCO');
    expect(header.memberNumber).toBe('4629294326');
    expect(header.currentStatus).toBe('Platinum');
    expect(header.totalMiles).toBe(248928);
    expect(header.totalXp).toBe(183);
    expect(header.totalUxp).toBe(40);
    expect(header.language).toBe('nl');
  });
});

describe('Transaction Splitter', () => {
  it('should split text into transactions', () => {
    const transactions = splitAndClassifyTransactions(sampleText);
    
    expect(transactions.length).toBeGreaterThan(10);
  });

  it('should classify flight transactions', () => {
    const transactions = splitAndClassifyTransactions(sampleText);
    
    const flights = transactions.filter(t => t.type.startsWith('FLIGHT_'));
    expect(flights.length).toBeGreaterThan(0);
  });

  it('should classify AMEX transactions', () => {
    const transactions = splitAndClassifyTransactions(sampleText);
    
    const amex = transactions.filter(t => t.type === 'CREDIT_CARD');
    expect(amex.length).toBeGreaterThan(0);
  });

  it('should classify XP rollover events', () => {
    const transactions = splitAndClassifyTransactions(sampleText);
    
    const rollover = transactions.filter(t => t.type === 'XP_ROLLOVER');
    expect(rollover.length).toBe(1);
  });

  it('should classify XP deduction events', () => {
    const transactions = splitAndClassifyTransactions(sampleText);
    
    const deduction = transactions.filter(t => t.type === 'XP_DEDUCTION');
    expect(deduction.length).toBe(1);
  });
});

describe('Full Parser', () => {
  it('should successfully parse sample text', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    const data = result.data;
    
    // Check header
    expect(data.pdfHeader.miles).toBe(248928);
    expect(data.pdfHeader.xp).toBe(183);
    expect(data.pdfHeader.status).toBe('Platinum');
    
    // Check flights
    expect(data.flights.length).toBeGreaterThan(0);
    
    // Check activity transactions
    expect(data.activityTransactions.length).toBeGreaterThan(0);
    
    // Check metadata
    expect(data.metadata.model).toBe('local-text-parser-v1');
    expect(data.metadata.tokensUsed).toBe(0);
    expect(data.metadata.language).toBe('nl');
  });

  it('should detect qualification settings from XP events', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Should detect qualification cycle from XP deduction
    expect(result.data.qualificationSettings).not.toBeNull();
    
    if (result.data.qualificationSettings) {
      expect(result.data.qualificationSettings.startingStatus).toBe('Platinum');
      expect(result.data.qualificationSettings.startingXP).toBe(23); // Rollover XP
    }
  });

  it('should generate unique transaction IDs', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    const ids = result.data.activityTransactions.map(t => t.id);
    const uniqueIds = new Set(ids);
    
    // All IDs should be unique
    expect(uniqueIds.size).toBe(ids.length);
    
    // All IDs should start with 'tx-'
    for (const id of ids) {
      expect(id.startsWith('tx-')).toBe(true);
    }
  });
});

describe('Flight Parsing', () => {
  it('should parse KLM flights with SAF bonus', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Find the Berlin flight
    const berlinFlights = result.data.flights.filter(f => 
      f.route.includes('BER') || f.route.includes('AMS-BER')
    );
    
    expect(berlinFlights.length).toBeGreaterThan(0);
  });

  it('should parse partner flights (SAS)', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Find the Oslo flight (SAS)
    const osloFlights = result.data.flights.filter(f => 
      f.route.includes('OSL') && f.airline === 'SK'
    );
    
    expect(osloFlights.length).toBeGreaterThan(0);
  });

  it('should parse Transavia flights', async () => {
    const result = await localParseText(sampleText, { debug: false });
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Find the Transavia flight (KEF-AMS)
    const transaviaFlights = result.data.flights.filter(f => 
      f.route.includes('KEF') && f.airline === 'HV'
    );
    
    expect(transaviaFlights.length).toBeGreaterThan(0);
  });
});
