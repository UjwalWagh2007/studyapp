import { describe, it, expect } from 'vitest';
import type { Problem } from '../types';
import {
  scheduleInitialLearning,
  calculateNextReview,
  getNextLadderInterval,
  isProblemDue,
  isProblemOverdue,
  getDueToday,
  getOverdue,
  getUpcoming,
  REVISION_INTERVAL_LADDER,
} from './spacedRepetition';

const createMockProblem = (overrides?: Partial<Problem>): Problem => ({
  id: 'test-p-1',
  topicId: 'top-1',
  topicName: 'Arrays & Hashing',
  title: 'Two Sum',
  difficulty: 'Medium',
  pattern: 'Two Pointers',
  solvedAt: '2026-10-01T10:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  status: 'LEARNING',
  reviewCount: 0,
  successfulReviews: 0,
  failedReviews: 0,
  consecutiveSuccesses: 0,
  currentIntervalDays: 1,
  easeFactor: 2.5,
  reviewHistory: [],
  ...overrides,
});

describe('Deterministic Spaced Repetition Pipeline (+1 → +3 → +7 → +14 → +30 → +60 → +120 → +180)', () => {
  const BASE_DATE = '2026-10-01';

  describe('Interval Ladder Constants & Helper', () => {
    it('contains the exact intervals: 1, 3, 7, 14, 30, 60, 120, 180', () => {
      expect(REVISION_INTERVAL_LADDER).toEqual([1, 3, 7, 14, 30, 60, 120, 180]);
    });

    it('advances 1 step correctly along the ladder', () => {
      expect(getNextLadderInterval(1, 1)).toBe(3);
      expect(getNextLadderInterval(3, 1)).toBe(7);
      expect(getNextLadderInterval(7, 1)).toBe(14);
      expect(getNextLadderInterval(14, 1)).toBe(30);
      expect(getNextLadderInterval(30, 1)).toBe(60);
      expect(getNextLadderInterval(60, 1)).toBe(120);
      expect(getNextLadderInterval(120, 1)).toBe(180);
      expect(getNextLadderInterval(180, 1)).toBe(180);
    });

    it('advances 2 steps for EASY reviews', () => {
      expect(getNextLadderInterval(1, 2)).toBe(7);
      expect(getNextLadderInterval(3, 2)).toBe(14);
      expect(getNextLadderInterval(7, 2)).toBe(30);
      expect(getNextLadderInterval(14, 2)).toBe(60);
      expect(getNextLadderInterval(30, 2)).toBe(120);
      expect(getNextLadderInterval(60, 2)).toBe(180);
      expect(getNextLadderInterval(120, 2)).toBe(180);
    });
  });

  describe('Initial Learning Schedule', () => {
    it('schedules a new problem for review in +1 day', () => {
      const p = createMockProblem();
      const scheduled = scheduleInitialLearning(p, BASE_DATE);

      expect(scheduled.status).toBe('LEARNING');
      expect(scheduled.currentIntervalDays).toBe(1);
      expect(scheduled.nextReviewAt).toBe('2026-10-02');
    });
  });

  describe('Sequential Stage Progression via GOOD Ratings', () => {
    it('progresses sequentially: 1 -> 3 -> 7 -> 14 -> 30 -> 60 -> 120 -> 180', () => {
      let p = scheduleInitialLearning(createMockProblem(), '2026-10-01');
      expect(p.currentIntervalDays).toBe(1);

      // Review 1 (Day 1): 1 -> 3
      let res = calculateNextReview(p, 'GOOD', '2026-10-02');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(3);
      expect(p.nextReviewAt).toBe('2026-10-05');

      // Review 2 (Day 4): 3 -> 7
      res = calculateNextReview(p, 'GOOD', '2026-10-05');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(7);
      expect(p.nextReviewAt).toBe('2026-10-12');

      // Review 3 (Day 11): 7 -> 14
      res = calculateNextReview(p, 'GOOD', '2026-10-12');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(14);
      expect(p.nextReviewAt).toBe('2026-10-26');

      // Review 4 (Day 25): 14 -> 30
      res = calculateNextReview(p, 'GOOD', '2026-10-26');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(30);

      // Review 5 (Day 55): 30 -> 60
      res = calculateNextReview(p, 'GOOD', '2026-11-25');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(60);

      // Review 6 (Day 115): 60 -> 120
      res = calculateNextReview(p, 'GOOD', '2027-01-24');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(120);

      // Review 7 (Day 235): 120 -> 180
      res = calculateNextReview(p, 'GOOD', '2027-05-24');
      p = res.updatedProblem;
      expect(p.currentIntervalDays).toBe(180);
      expect(p.status).toBe('MASTERED');
    });
  });

  describe('Rating: AGAIN (Lapse)', () => {
    it('resets interval back to 1 day on lapse', () => {
      const p = createMockProblem({
        currentIntervalDays: 60,
        consecutiveSuccesses: 5,
        reviewCount: 5,
        successfulReviews: 5,
      });

      const { updatedProblem, reviewLog } = calculateNextReview(p, 'AGAIN', BASE_DATE);

      expect(updatedProblem.currentIntervalDays).toBe(1);
      expect(updatedProblem.nextReviewAt).toBe('2026-10-02');
      expect(updatedProblem.consecutiveSuccesses).toBe(0);
      expect(updatedProblem.failedReviews).toBe(1);
      expect(updatedProblem.status).toBe('LEARNING');

      expect(reviewLog.rating).toBe('AGAIN');
      expect(reviewLog.newInterval).toBe(1);
    });
  });

  describe('Rating: HARD (Repeat stage)', () => {
    it('repeats current interval stage without resetting completely', () => {
      const p = createMockProblem({
        currentIntervalDays: 14,
        consecutiveSuccesses: 3,
      });

      const { updatedProblem, reviewLog } = calculateNextReview(p, 'HARD', BASE_DATE);

      expect(updatedProblem.currentIntervalDays).toBe(14);
      expect(updatedProblem.nextReviewAt).toBe('2026-10-15');
      expect(reviewLog.rating).toBe('HARD');
    });
  });

  describe('Due and Overdue Queries', () => {
    const pDueToday = createMockProblem({ id: 'p-today', nextReviewAt: '2026-10-01' });
    const pOverdue = createMockProblem({ id: 'p-overdue', nextReviewAt: '2026-09-28' });
    const pUpcomingTomorrow = createMockProblem({ id: 'p-up-1', nextReviewAt: '2026-10-02' });
    const allProblems = [pDueToday, pOverdue, pUpcomingTomorrow];

    it('identifies due and overdue problems accurately', () => {
      expect(isProblemDue(pDueToday, '2026-10-01')).toBe(true);
      expect(isProblemDue(pOverdue, '2026-10-01')).toBe(true);
      expect(isProblemDue(pUpcomingTomorrow, '2026-10-01')).toBe(false);

      expect(isProblemOverdue(pOverdue, '2026-10-01')).toBe(true);
      expect(isProblemOverdue(pDueToday, '2026-10-01')).toBe(false);

      const dueList = getDueToday(allProblems, '2026-10-01');
      expect(dueList.map((p) => p.id)).toEqual(['p-today', 'p-overdue']);

      const overdueList = getOverdue(allProblems, '2026-10-01');
      expect(overdueList.map((p) => p.id)).toEqual(['p-overdue']);

      const upcomingList = getUpcoming(allProblems, 7, '2026-10-01');
      expect(upcomingList.map((p) => p.id)).toEqual(['p-up-1']);
    });
  });
});
