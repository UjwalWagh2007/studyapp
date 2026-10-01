import type { Question, ReviewRating, ReviewLog } from '../types';

/**
 * SPACED REPETITION ENGINE CONSTANTS
 * Based on SuperMemo SM-2 & modern cognitive recall adaptation.
 */
export const SR_CONSTANTS = {
  DEFAULT_EASE_FACTOR: 2.50,
  MIN_EASE_FACTOR: 1.30,
  MAX_EASE_FACTOR: 3.00,
  MASTERY_INTERVAL_THRESHOLD: 21, // days
  MASTERY_CONSECUTIVE_SUCCESSES_THRESHOLD: 3,
  MAX_MASTERY_SCORE: 5,
};

/**
 * Normalizes a Date or date string to standard YYYY-MM-DD format (local date)
 */
export function normalizeDate(dateInput?: Date | string | null): string {
  if (!dateInput) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput === 'string') {
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateInput.substring(0, 10);
  }

  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds integer days to a given reference date, returning YYYY-MM-DD
 */
export function addDays(dateInput: Date | string, days: number): string {
  const norm = normalizeDate(dateInput);
  const [year, month, day] = norm.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return normalizeDate(d);
}

/**
 * Calculates calendar days difference between two dates: (toDate - fromDate)
 */
export function daysBetween(fromDate: Date | string, toDate: Date | string): number {
  const normFrom = normalizeDate(fromDate);
  const normTo = normalizeDate(toDate);
  const [y1, m1, d1] = normFrom.split('-').map(Number);
  const [y2, m2, d2] = normTo.split('-').map(Number);

  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffMs = t2 - t1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Initializes a new question into the Spaced Repetition queue.
 * Does not use a hardcoded 1->3->7->14->30 pipeline.
 */
export function scheduleInitialLearning(
  question: Question,
  referenceDate?: Date | string
): Question {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const refDateStr = normalizeDate(refDate);

  // Initial interval: 1 day for all newly learned questions so they are due for first review tomorrow
  const initialInterval = 1;
  const nextDate = addDays(refDateStr, initialInterval);

  return {
    ...question,
    firstLearnedAt: question.firstLearnedAt || refDate.toISOString(),
    lastReviewedAt: undefined,
    nextReviewAt: nextDate,
    currentIntervalDays: initialInterval,
    easeFactor: question.easeFactor || SR_CONSTANTS.DEFAULT_EASE_FACTOR,
    reviewCount: question.reviewCount || 0,
    successfulReviews: question.successfulReviews || 0,
    failedReviews: question.failedReviews || 0,
    consecutiveSuccesses: 0,
    status: 'LEARNING',
    mastery: Math.max(1, question.mastery || 1),
    updatedAt: refDate.toISOString(),
    reviewHistory: question.reviewHistory || [],
  };
}

/**
 * Calculates next interval, ease factor, mastery score, and status based on review rating.
 * 
 * Ratings:
 * - AGAIN: Total recall lapse -> Ease Factor decreases, interval resets to 1 day, mastery drops.
 * - HARD: Recalled with severe difficulty -> Small interval bump (1.2x), ease decreases slightly.
 * - GOOD: Standard recall -> Interval expands by (Interval * EF), ease stable, mastery increases.
 * - EASY: Effortless recall -> Interval expands by (Interval * EF * 1.3), ease increases, mastery jumps.
 */
export function calculateNextReview(
  question: Question,
  rating: ReviewRating,
  reviewDateInput?: Date | string,
  options?: { timeSpentSeconds?: number; notes?: string }
): { updatedQuestion: Question; reviewLog: ReviewLog } {
  const reviewDate = reviewDateInput ? new Date(reviewDateInput) : new Date();
  const reviewDateNorm = normalizeDate(reviewDate);

  const prevInterval = question.currentIntervalDays ?? 0;
  const prevEF = Number(question.easeFactor ?? SR_CONSTANTS.DEFAULT_EASE_FACTOR);
  const prevMastery = Number(question.mastery ?? 0);
  const prevConsecutive = Number(question.consecutiveSuccesses ?? 0);
  const prevReviewCount = Number(question.reviewCount ?? 0);
  const prevSuccessful = Number(question.successfulReviews ?? 0);
  const prevFailed = Number(question.failedReviews ?? 0);

  let newInterval: number;
  let newEF: number = prevEF;
  let newConsecutive: number = prevConsecutive;
  let newMastery: number = prevMastery;
  let newSuccessful: number = prevSuccessful;
  let newFailed: number = prevFailed;
  let newStatus = question.status;

  switch (rating) {
    case 'AGAIN': {
      // Lapse: drop ease factor, reset interval to 1 day, reset consecutive streak
      newEF = Math.max(SR_CONSTANTS.MIN_EASE_FACTOR, Number((prevEF - 0.20).toFixed(2)));
      newInterval = 1;
      newConsecutive = 0;
      newFailed = prevFailed + 1;
      newMastery = Math.max(0, prevMastery - 1);
      newStatus = 'LEARNING';
      break;
    }

    case 'HARD': {
      // Recalled with high effort: slight decrease in EF, modest interval multiplier (1.2x)
      newEF = Math.max(SR_CONSTANTS.MIN_EASE_FACTOR, Number((prevEF - 0.15).toFixed(2)));
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;

      if (prevConsecutive === 0 || prevInterval <= 1) {
        newInterval = 2;
      } else {
        newInterval = Math.max(prevInterval + 1, Math.round(prevInterval * 1.2));
      }

      newMastery = Math.min(SR_CONSTANTS.MAX_MASTERY_SCORE, prevMastery + (prevMastery < 3 ? 1 : 0));
      newStatus = 'REVIEWING';
      break;
    }

    case 'GOOD': {
      // Successful normal recall: EF maintained, interval expanded by EF
      newEF = Math.max(
        SR_CONSTANTS.MIN_EASE_FACTOR,
        Math.min(SR_CONSTANTS.MAX_EASE_FACTOR, Number(prevEF.toFixed(2)))
      );
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;

      if (newConsecutive === 1) {
        newInterval = prevInterval <= 1 ? 3 : Math.max(prevInterval + 1, Math.round(prevInterval * 1.5));
      } else if (newConsecutive === 2) {
        newInterval = Math.max(6, Math.round(prevInterval * newEF));
      } else {
        newInterval = Math.max(prevInterval + 1, Math.round(prevInterval * newEF));
      }

      newMastery = Math.min(SR_CONSTANTS.MAX_MASTERY_SCORE, prevMastery + 1);

      // Check Mastered state conditions:
      // Must have repeated successes, interval >= 21 days, mastery >= 4
      if (
        newInterval >= SR_CONSTANTS.MASTERY_INTERVAL_THRESHOLD &&
        newConsecutive >= SR_CONSTANTS.MASTERY_CONSECUTIVE_SUCCESSES_THRESHOLD &&
        newMastery >= 4
      ) {
        newStatus = 'MASTERED';
      } else {
        newStatus = 'REVIEWING';
      }
      break;
    }

    case 'EASY': {
      // Effortless recall: increase EF, apply easy bonus multiplier (1.30x)
      newEF = Math.min(SR_CONSTANTS.MAX_EASE_FACTOR, Number((prevEF + 0.15).toFixed(2)));
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;

      if (newConsecutive === 1) {
        newInterval = prevInterval <= 1 ? 4 : Math.max(4, Math.round(prevInterval * 2));
      } else if (newConsecutive === 2) {
        newInterval = Math.max(9, Math.round(prevInterval * newEF * 1.3));
      } else {
        newInterval = Math.max(prevInterval + 2, Math.round(prevInterval * newEF * 1.3));
      }

      newMastery = Math.min(SR_CONSTANTS.MAX_MASTERY_SCORE, prevMastery + (prevMastery < 3 ? 2 : 1));

      // Mastered state check for easy reviews
      if (
        newInterval >= SR_CONSTANTS.MASTERY_INTERVAL_THRESHOLD &&
        newConsecutive >= 2 &&
        newMastery >= 4
      ) {
        newStatus = 'MASTERED';
      } else {
        newStatus = 'REVIEWING';
      }
      break;
    }
  }

  const nextReviewDate = addDays(reviewDateNorm, newInterval);

  const reviewLog: ReviewLog = {
    id: 'rev-' + Math.random().toString(36).substring(2, 9),
    questionId: question.id,
    reviewedAt: reviewDate.toISOString(),
    rating,
    previousInterval: prevInterval,
    newInterval,
    previousEaseFactor: prevEF,
    newEaseFactor: newEF,
    previousMastery: prevMastery,
    newMastery,
    timeSpentSeconds: options?.timeSpentSeconds,
    notes: options?.notes,
  };

  const updatedQuestion: Question = {
    ...question,
    firstLearnedAt: question.firstLearnedAt || reviewDate.toISOString(),
    lastReviewedAt: reviewDate.toISOString(),
    nextReviewAt: nextReviewDate,
    currentIntervalDays: newInterval,
    easeFactor: newEF,
    reviewCount: prevReviewCount + 1,
    successfulReviews: newSuccessful,
    failedReviews: newFailed,
    consecutiveSuccesses: newConsecutive,
    mastery: newMastery,
    status: newStatus,
    updatedAt: reviewDate.toISOString(),
    reviewHistory: [reviewLog, ...(question.reviewHistory || [])],
  };

  return { updatedQuestion, reviewLog };
}

// ==========================================================================
// DUE, OVERDUE & UPCOMING QUERY SERVICES
// ==========================================================================

/**
 * Checks if a question is due on or before the reference date
 */
export function isQuestionDue(question: Question, referenceDate?: Date | string): boolean {
  if (question.isArchived) return false;
  if (!question.nextReviewAt) return false;

  const refNorm = normalizeDate(referenceDate);
  const dueNorm = normalizeDate(question.nextReviewAt);

  return refNorm >= dueNorm;
}

/**
 * Checks if a question is strictly overdue (due date is in the past compared to reference date)
 */
export function isQuestionOverdue(question: Question, referenceDate?: Date | string): boolean {
  if (question.isArchived) return false;
  if (!question.nextReviewAt) return false;

  const refNorm = normalizeDate(referenceDate);
  const dueNorm = normalizeDate(question.nextReviewAt);

  return refNorm > dueNorm;
}

/**
 * Returns all active questions that are due today or overdue
 */
export function getDueToday(questions: Question[], referenceDate?: Date | string): Question[] {
  const refNorm = normalizeDate(referenceDate);
  return questions.filter((q) => !q.isArchived && q.nextReviewAt && refNorm >= normalizeDate(q.nextReviewAt));
}

/**
 * Returns all active questions that are strictly overdue (nextReviewAt < referenceDate)
 */
export function getOverdue(questions: Question[], referenceDate?: Date | string): Question[] {
  const refNorm = normalizeDate(referenceDate);
  return questions.filter((q) => !q.isArchived && q.nextReviewAt && refNorm > normalizeDate(q.nextReviewAt));
}

/**
 * Returns all active questions scheduled within the upcoming window (e.g. next N days)
 */
export function getUpcoming(
  questions: Question[],
  daysAhead: number = 7,
  referenceDate?: Date | string
): Question[] {
  const refNorm = normalizeDate(referenceDate);
  const maxNorm = addDays(refNorm, daysAhead);

  return questions.filter((q) => {
    if (q.isArchived || !q.nextReviewAt) return false;
    const dueNorm = normalizeDate(q.nextReviewAt);
    return dueNorm > refNorm && dueNorm <= maxNorm;
  });
}

/**
 * Returns recently reviewed questions sorted by review date descending
 */
export function getRecentlyReviewed(questions: Question[], limit: number = 10): Question[] {
  return questions
    .filter((q) => !q.isArchived && q.lastReviewedAt)
    .sort((a, b) => new Date(b.lastReviewedAt!).getTime() - new Date(a.lastReviewedAt!).getTime())
    .slice(0, limit);
}

/**
 * Aggregates high-level spaced repetition analytics
 */
export function getSpacedRepetitionStats(questions: Question[], referenceDate?: Date | string) {
  const activeQuestions = questions.filter((q) => !q.isArchived);
  const dueTodayQuestions = getDueToday(activeQuestions, referenceDate);
  const overdueQuestions = getOverdue(activeQuestions, referenceDate);
  const upcomingQuestions = getUpcoming(activeQuestions, 7, referenceDate);
  const masteredQuestions = activeQuestions.filter((q) => q.status === 'MASTERED');
  const learningQuestions = activeQuestions.filter((q) => q.status === 'LEARNING');
  const reviewingQuestions = activeQuestions.filter((q) => q.status === 'REVIEWING');

  const totalReviews = activeQuestions.reduce((sum, q) => sum + (q.reviewCount || 0), 0);
  const totalSuccessful = activeQuestions.reduce((sum, q) => sum + (q.successfulReviews || 0), 0);
  const recallAccuracyPercent = totalReviews > 0 ? Math.round((totalSuccessful / totalReviews) * 100) : null;

  return {
    totalActive: activeQuestions.length,
    dueTodayCount: dueTodayQuestions.length,
    overdueCount: overdueQuestions.length,
    upcomingCount: upcomingQuestions.length,
    masteredCount: masteredQuestions.length,
    learningCount: learningQuestions.length,
    reviewingCount: reviewingQuestions.length,
    totalReviews,
    recallAccuracyPercent,
  };
}
