import type { Problem, ReviewRating, ReviewLog } from '../types';

/**
 * DETERMINISTIC SPATIAL REPETITION INTERVAL LADDER:
 * +1 → +3 → +7 → +14 → +30 → +60 → +120 → +180
 */
export const REVISION_INTERVAL_LADDER = [1, 3, 7, 14, 30, 60, 120, 180] as const;

export function getNextLadderInterval(
  currentInterval: number,
  steps: number = 1
): number {
  let currentIndex = REVISION_INTERVAL_LADDER.findIndex((i) => i === currentInterval);
  if (currentIndex === -1) {
    // Find closest index
    currentIndex = REVISION_INTERVAL_LADDER.reduce((closestIdx, val, idx, arr) => {
      return Math.abs(val - currentInterval) < Math.abs(arr[closestIdx] - currentInterval)
        ? idx
        : closestIdx;
    }, 0);
  }

  const targetIndex = Math.min(
    REVISION_INTERVAL_LADDER.length - 1,
    Math.max(0, currentIndex + steps)
  );

  return REVISION_INTERVAL_LADDER[targetIndex];
}

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
 * By default, schedules first revision for +1 day (tomorrow).
 */
export function scheduleInitialLearning(
  problem: Problem,
  referenceDate?: Date | string
): Problem {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const refDateStr = normalizeDate(refDate);

  const initialInterval = 1; // Stage 0: +1 day
  const nextDate = addDays(refDateStr, initialInterval);

  return {
    ...problem,
    nextReviewAt: nextDate,
    currentIntervalDays: initialInterval,
    easeFactor: 2.5,
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
 * Calculates next interval following the pipeline:
 * +1 → +3 → +7 → +14 → +30 → +60 → +120 → +180
 *
 * Ratings:
 * - AGAIN: Reset to stage 0 (+1 day).
 * - HARD: Repeat current interval stage.
 * - GOOD: Advance 1 stage in the ladder (+1 → +3 → +7 → +14 → +30 → +60 → +120 → +180).
 * - EASY: Advance 2 stages in the ladder (e.g. +1 → +7, +3 → +14, +7 → +30, etc.).
 */
export function calculateNextReview(
  problem: Problem,
  rating: ReviewRating,
  reviewDateInput?: Date | string,
  options?: { timeSpentSeconds?: number; notes?: string }
): { updatedProblem: Problem; reviewLog: ReviewLog } {
  const reviewDate = reviewDateInput ? new Date(reviewDateInput) : new Date();
  const reviewDateNorm = normalizeDate(reviewDate);

  const prevInterval = problem.currentIntervalDays ?? 1;
  const prevConsecutive = Number(problem.consecutiveSuccesses ?? 0);
  const prevReviewCount = Number(problem.reviewCount ?? 0);
  const prevSuccessful = Number(problem.successfulReviews ?? 0);
  const prevFailed = Number(problem.failedReviews ?? 0);

  let newInterval: number;
  let newConsecutive: number = prevConsecutive;
  let newSuccessful: number = prevSuccessful;
  let newFailed: number = prevFailed;
  let newStatus = problem.status;

  switch (rating) {
    case 'AGAIN': {
      // Reset back to +1 day
      newInterval = 1;
      newConsecutive = 0;
      newFailed = prevFailed + 1;
      newStatus = 'LEARNING';
      break;
    }

    case 'HARD': {
      // Repeat current interval stage
      newInterval = prevInterval;
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;
      newStatus = newInterval >= 120 ? 'MASTERED' : newInterval >= 14 ? 'REVIEWING' : 'LEARNING';
      break;
    }

    case 'GOOD': {
      // Advance 1 stage in ladder (+1 → +3 → +7 → +14 → +30 → +60 → +120 → +180)
      newInterval = getNextLadderInterval(prevInterval, 1);
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;
      newStatus = newInterval >= 120 ? 'MASTERED' : newInterval >= 14 ? 'REVIEWING' : 'LEARNING';
      break;
    }

    case 'EASY': {
      // Advance 2 stages in ladder
      newInterval = getNextLadderInterval(prevInterval, 2);
      newConsecutive = prevConsecutive + 1;
      newSuccessful = prevSuccessful + 1;
      newStatus = newInterval >= 60 ? 'MASTERED' : 'REVIEWING';
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
    timeSpentSeconds: options?.timeSpentSeconds,
    notes: options?.notes,
  };

  const updatedProblem: Problem = {
    ...problem,
    lastReviewedAt: reviewDate.toISOString(),
    nextReviewAt: nextReviewDate,
    currentIntervalDays: newInterval,
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
