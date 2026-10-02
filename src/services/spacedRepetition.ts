import type { Problem, ReviewRating, ReviewLog } from '../types';

/**
 * SPACED REPETITION ENGINE CONSTANTS
 * Based on SuperMemo SM-2.
 */
export const SR_CONSTANTS = {
  DEFAULT_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
  MAX_EASE_FACTOR: 3.0,
  MASTERY_INTERVAL_THRESHOLD: 21, // days
  MASTERY_CONSECUTIVE_SUCCESSES_THRESHOLD: 3,
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
 * Initializes a new problem into the Spaced Repetition queue.
 * By default, schedules first revision for tomorrow (interval: 1 day).
 */
export function scheduleInitialLearning(
  problem: Problem,
  referenceDate?: Date | string
): Problem {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const refDateStr = normalizeDate(refDate);

  const initialInterval = 1;
  const nextDate = addDays(refDateStr, initialInterval);

  return {
    ...problem,
    nextReviewAt: nextDate,
    currentIntervalDays: initialInterval,
    easeFactor: problem.easeFactor || SR_CONSTANTS.DEFAULT_EASE_FACTOR,
    reviewCount: problem.reviewCount || 0,
    consecutiveSuccesses: 0,
    successfulReviews: 0,
    failedReviews: 0,
    status: 'LEARNING',
    updatedAt: refDate.toISOString(),
    reviewHistory: problem.reviewHistory || [],
  };
}

/**
 * Calculates next interval, ease factor, and status based on review rating.
 * 
 * Ratings:
 * - AGAIN: Total recall lapse -> Ease Factor decreases, interval resets to 1 day.
 * - HARD: Recalled with difficulty -> Small interval bump (1.2x), ease decreases slightly.
 * - GOOD: Standard recall -> Interval expands by (Interval * EF).
 * - EASY: Effortless recall -> Interval expands by (Interval * EF * 1.3), ease increases.
 */
export function calculateNextReview(
  problem: Problem,
  rating: ReviewRating,
  reviewDateInput?: Date | string,
  options?: { timeSpentSeconds?: number; notes?: string }
): { updatedProblem: Problem; reviewLog: ReviewLog } {
  const reviewDate = reviewDateInput ? new Date(reviewDateInput) : new Date();
  const reviewDateNorm = normalizeDate(reviewDate);

  const prevInterval = problem.currentIntervalDays ?? 0;
  const prevEF = Number(problem.easeFactor ?? SR_CONSTANTS.DEFAULT_EASE_FACTOR);
  const prevConsecutive = Number(problem.consecutiveSuccesses ?? 0);
  const prevReviewCount = Number(problem.reviewCount ?? 0);
  const prevSuccessful = Number(problem.successfulReviews ?? 0);
  const prevFailed = Number(problem.failedReviews ?? 0);

  let newInterval: number;
  let newEF: number = prevEF;
  let newConsecutive: number = prevConsecutive;
  let newSuccessful: number = prevSuccessful;
  let newFailed: number = prevFailed;
  let newStatus = problem.status;

  switch (rating) {
    case 'AGAIN': {
      newEF = Math.max(SR_CONSTANTS.MIN_EASE_FACTOR, Number((prevEF - 0.2).toFixed(2)));
      newInterval = 1;
      newConsecutive = 0;
      newFailed = prevFailed + 1;
      newStatus = 'LEARNING';
      break;
    }

    case 'HARD': {
      newEF = Math.max(SR_CONSTANTS.MIN_EASE_FACTOR, Number((prevEF - 0.15).toFixed(2)));
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;

      if (prevConsecutive === 0 || prevInterval <= 1) {
        newInterval = 2;
      } else {
        newInterval = Math.max(prevInterval + 1, Math.round(prevInterval * 1.2));
      }
      newStatus = 'REVIEWING';
      break;
    }

    case 'GOOD': {
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

      if (
        newInterval >= SR_CONSTANTS.MASTERY_INTERVAL_THRESHOLD &&
        newConsecutive >= SR_CONSTANTS.MASTERY_CONSECUTIVE_SUCCESSES_THRESHOLD
      ) {
        newStatus = 'MASTERED';
      } else {
        newStatus = 'REVIEWING';
      }
      break;
    }

    case 'EASY': {
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

      if (newInterval >= SR_CONSTANTS.MASTERY_INTERVAL_THRESHOLD && newConsecutive >= 2) {
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
    problemId: problem.id,
    reviewedAt: reviewDate.toISOString(),
    rating,
    previousInterval: prevInterval,
    newInterval,
    previousEaseFactor: prevEF,
    newEaseFactor: newEF,
    timeSpentSeconds: options?.timeSpentSeconds,
    notes: options?.notes,
  };

  const updatedProblem: Problem = {
    ...problem,
    lastReviewedAt: reviewDate.toISOString(),
    nextReviewAt: nextReviewDate,
    currentIntervalDays: newInterval,
    easeFactor: newEF,
    reviewCount: prevReviewCount + 1,
    successfulReviews: newSuccessful,
    failedReviews: newFailed,
    consecutiveSuccesses: newConsecutive,
    status: newStatus,
    updatedAt: reviewDate.toISOString(),
    reviewHistory: [reviewLog, ...(problem.reviewHistory || [])],
  };

  return { updatedProblem, reviewLog };
}

/**
 * Checks if a problem is due on or before the reference date
 */
export function isProblemDue(problem: Problem, referenceDate?: Date | string): boolean {
  if (!problem.nextReviewAt) return false;
  const refNorm = normalizeDate(referenceDate);
  const dueNorm = normalizeDate(problem.nextReviewAt);
  return refNorm >= dueNorm;
}

/**
 * Checks if a problem is strictly overdue (due date is in the past)
 */
export function isProblemOverdue(problem: Problem, referenceDate?: Date | string): boolean {
  if (!problem.nextReviewAt) return false;
  const refNorm = normalizeDate(referenceDate);
  const dueNorm = normalizeDate(problem.nextReviewAt);
  return refNorm > dueNorm;
}

/**
 * Returns all active problems that are due today or overdue
 */
export function getDueToday(problems: Problem[], referenceDate?: Date | string): Problem[] {
  const refNorm = normalizeDate(referenceDate);
  return problems.filter((p) => p.nextReviewAt && refNorm >= normalizeDate(p.nextReviewAt));
}

/**
 * Returns all active problems that are strictly overdue
 */
export function getOverdue(problems: Problem[], referenceDate?: Date | string): Problem[] {
  const refNorm = normalizeDate(referenceDate);
  return problems.filter((p) => p.nextReviewAt && refNorm > normalizeDate(p.nextReviewAt));
}

/**
 * Returns all active problems scheduled within the upcoming window
 */
export function getUpcoming(
  problems: Problem[],
  daysAhead: number = 7,
  referenceDate?: Date | string
): Problem[] {
  const refNorm = normalizeDate(referenceDate);
  const maxNorm = addDays(refNorm, daysAhead);

  return problems.filter((p) => {
    if (!p.nextReviewAt) return false;
    const dueNorm = normalizeDate(p.nextReviewAt);
    return dueNorm > refNorm && dueNorm <= maxNorm;
  });
}
