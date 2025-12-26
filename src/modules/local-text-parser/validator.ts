// src/modules/local-text-parser/validator.ts
// Validate input text before parsing

import type { ValidationResult, DetectedLanguage } from './types';
import { FLYING_BLUE_CONTENT_INDICATORS } from './patterns';
import { detectLanguage } from './header-parser';

/**
 * Minimum text length for valid Flying Blue PDF content
 * A single-page PDF with a few transactions is typically 500+ characters
 */
const MIN_TEXT_LENGTH = 200;

/**
 * Maximum text length we'll process
 * Prevents memory issues with extremely large pastes
 */
const MAX_TEXT_LENGTH = 500000;  // ~500KB

/**
 * Minimum number of indicators that must match for valid content
 */
const MIN_INDICATORS_REQUIRED = 2;

/**
 * Check if text looks like Flying Blue content
 */
function isFlyingBlueContent(text: string): { isValid: boolean; matchCount: number } {
  let matchCount = 0;
  
  for (const pattern of FLYING_BLUE_CONTENT_INDICATORS) {
    if (pattern.test(text)) {
      matchCount++;
    }
  }
  
  return {
    isValid: matchCount >= MIN_INDICATORS_REQUIRED,
    matchCount,
  };
}

/**
 * Validate input text for parsing
 * 
 * @param text - Raw pasted text from user
 * @returns Validation result with errors and warnings
 */
export function validateInput(text: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let language: DetectedLanguage | null = null;
  
  // Check if text is provided
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      isFlyingBlueContent: false,
      language: null,
      errors: ['No text provided'],
      warnings: [],
    };
  }
  
  const trimmedText = text.trim();
  
  // Check minimum length
  if (trimmedText.length < MIN_TEXT_LENGTH) {
    errors.push(`Text is too short (${trimmedText.length} characters). Flying Blue activity statements are typically much longer. Make sure you copied the entire PDF content with Ctrl+A.`);
  }
  
  // Check maximum length
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    errors.push(`Text is too long (${trimmedText.length} characters). Please contact support if you have an exceptionally large activity statement.`);
  }
  
  // Check if it looks like Flying Blue content
  const contentCheck = isFlyingBlueContent(trimmedText);
  
  if (!contentCheck.isValid) {
    errors.push('This doesn\'t appear to be Flying Blue activity data. Make sure you copied from your Flying Blue "Activity overview" or "Activiteitengeschiedenis" PDF.');
  }
  
  // Detect language if content looks valid
  if (contentCheck.isValid) {
    language = detectLanguage(trimmedText);
    
    // Add warning for less common languages
    if (language === 'de') {
      warnings.push('German language detected. Some transaction types may not be fully supported yet.');
    }
  }
  
  // Check for common copy issues
  if (trimmedText.includes('�')) {
    warnings.push('Some characters may not have copied correctly. This usually doesn\'t affect parsing, but some names might appear incorrectly.');
  }
  
  // Check for HTML content (user might have copied from web)
  if (/<html|<div|<span|<table/i.test(trimmedText)) {
    errors.push('It looks like you copied HTML content from a webpage. Please copy from the PDF file directly, not from the Flying Blue website.');
  }
  
  // Check for very few lines (might be partial copy)
  const lineCount = trimmedText.split('\n').length;
  if (lineCount < 10 && contentCheck.isValid) {
    warnings.push(`Only ${lineCount} lines detected. Make sure you copied the entire PDF with Ctrl+A (select all).`);
  }
  
  return {
    isValid: errors.length === 0,
    isFlyingBlueContent: contentCheck.isValid,
    language,
    errors,
    warnings,
  };
}

/**
 * Quick check if text is likely Flying Blue content
 * Used for UI feedback before full validation
 */
export function isLikelyFlyingBlueContent(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  const { isValid } = isFlyingBlueContent(text);
  return isValid;
}

/**
 * Get user-friendly error message for validation result
 */
export function getValidationErrorMessage(result: ValidationResult): string {
  if (result.isValid) return '';
  
  if (result.errors.length === 1) {
    return result.errors[0];
  }
  
  return `Multiple issues found:\n• ${result.errors.join('\n• ')}`;
}

/**
 * Get user-friendly warning message for validation result
 */
export function getValidationWarningMessage(result: ValidationResult): string {
  if (result.warnings.length === 0) return '';
  
  if (result.warnings.length === 1) {
    return result.warnings[0];
  }
  
  return `Note:\n• ${result.warnings.join('\n• ')}`;
}
