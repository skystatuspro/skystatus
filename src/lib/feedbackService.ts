import { supabase } from './supabase';

export type FeedbackTrigger = 'post_import' | '7_days' | '5_sessions' | 'manual' | 'contact_form' | 'bug_report';
export type FeedbackRating = 'easy' | 'okay' | 'confusing' | null;

export interface FeedbackData {
  trigger: FeedbackTrigger;
  rating?: FeedbackRating;
  message?: string;
  page?: string;
}

// Local storage keys
const STORAGE_KEYS = {
  FIRST_IMPORT_DATE: 'skystatus_first_import_date',
  SESSION_COUNT: 'skystatus_session_count',
  FEEDBACK_DISMISSED_UNTIL: 'skystatus_feedback_dismissed_until',
  POST_IMPORT_FEEDBACK_GIVEN: 'skystatus_post_import_feedback_given',
  DASHBOARD_FEEDBACK_GIVEN: 'skystatus_dashboard_feedback_given',
};

/**
 * Submit feedback to Supabase
 */
export async function submitFeedback(data: FeedbackData): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('feedback').insert({
      user_id: userData?.user?.id || null,
      user_email: userData?.user?.email || null,
      trigger: data.trigger,
      rating: data.rating || null,
      message: data.message || null,
      page: data.page || null,
    });

    if (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return false;
  }
}

/**
 * Record that user's first import happened
 */
export function recordFirstImport(): void {
  if (!localStorage.getItem(STORAGE_KEYS.FIRST_IMPORT_DATE)) {
    localStorage.setItem(STORAGE_KEYS.FIRST_IMPORT_DATE, new Date().toISOString());
  }
}

/**
 * Increment session count
 */
export function incrementSessionCount(): void {
  const current = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_COUNT) || '0', 10);
  localStorage.setItem(STORAGE_KEYS.SESSION_COUNT, String(current + 1));
}

/**
 * Get current session count
 */
export function getSessionCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_COUNT) || '0', 10);
}

/**
 * Check if user has given post-import feedback
 */
export function hasGivenPostImportFeedback(): boolean {
  return localStorage.getItem(STORAGE_KEYS.POST_IMPORT_FEEDBACK_GIVEN) === 'true';
}

/**
 * Mark post-import feedback as given
 */
export function markPostImportFeedbackGiven(): void {
  localStorage.setItem(STORAGE_KEYS.POST_IMPORT_FEEDBACK_GIVEN, 'true');
}

/**
 * Check if user has given dashboard feedback
 */
export function hasGivenDashboardFeedback(): boolean {
  return localStorage.getItem(STORAGE_KEYS.DASHBOARD_FEEDBACK_GIVEN) === 'true';
}

/**
 * Mark dashboard feedback as given
 */
export function markDashboardFeedbackGiven(): void {
  localStorage.setItem(STORAGE_KEYS.DASHBOARD_FEEDBACK_GIVEN, 'true');
}

/**
 * Dismiss dashboard feedback card for 30 days
 */
export function dismissDashboardFeedback(): void {
  const dismissUntil = new Date();
  dismissUntil.setDate(dismissUntil.getDate() + 30);
  localStorage.setItem(STORAGE_KEYS.FEEDBACK_DISMISSED_UNTIL, dismissUntil.toISOString());
}

/**
 * Check if dashboard feedback card should be shown
 */
export function shouldShowDashboardFeedback(): boolean {
  // Already given feedback
  if (hasGivenDashboardFeedback()) {
    return false;
  }

  // Dismissed recently
  const dismissedUntil = localStorage.getItem(STORAGE_KEYS.FEEDBACK_DISMISSED_UNTIL);
  if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
    return false;
  }

  // Check triggers: 7 days since first import OR 5+ sessions
  const firstImportDate = localStorage.getItem(STORAGE_KEYS.FIRST_IMPORT_DATE);
  const sessionCount = getSessionCount();

  // Trigger: 5+ sessions
  if (sessionCount >= 5) {
    return true;
  }

  // Trigger: 7+ days since first import
  if (firstImportDate) {
    const daysSinceImport = Math.floor(
      (new Date().getTime() - new Date(firstImportDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceImport >= 7) {
      return true;
    }
  }

  return false;
}

/**
 * Get the trigger reason for showing dashboard feedback
 */
export function getDashboardFeedbackTrigger(): FeedbackTrigger {
  const sessionCount = getSessionCount();
  if (sessionCount >= 5) {
    return '5_sessions';
  }
  return '7_days';
}
