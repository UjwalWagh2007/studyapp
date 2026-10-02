import { describe, it, expect } from 'vitest';
import type { Problem } from '../types';
import {
  scheduleInitialLearning,
  calculateNextReview,
  isProblemDue,
  isProblemOverdue,
  getDueToday,
  getOverdue,
  getUpcoming,
  normalizeDate,
  addDays,
  daysBetween,
  SR_CONSTANTS,
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

describe('Spaced Repetition Engine', () => {
  const BASE_DATE = '2026-10-01';

  describe('Date Utilities', () => {
    it('normalizes Date objects and strings to YYYY-MM-DD', () => {
      expect(normalizeDate(new Date(2026, 9, 1))).toBe('2026-10-01');
      expect(normalizeDate('2026-10-01T15:30:00.000Z')).toBe('2026-10-01');
      expect(normalizeDate('2026-10-01')).toBe('2026-10-01');
    });

    it('adds days correctly across month boundaries', () => {
      expect(addDays('2026-10-01', 5)).toBe('2026-10-06');
      expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    });

    it('calculates calendar days difference', () => {
      expect(daysBetween('2026-10-01', '2026-10-06')).toBe(5);
    });
  });

  describe('Initial Learning Schedule', () => {
    it('schedules a new problem for review in 1 day', () => {
      const p = createMockProblem();
      const scheduled = scheduleInitialLearning(p, BASE_DATE);

      expect(scheduled.status).toBe('LEARNING');
      expect(scheduled.currentIntervalDays).toBe(1);
      expect(scheduled.nextReviewAt).toBe('2026-10-02');
      expect(scheduled.easeFactor).toBe(SR_CONSTANTS.DEFAULT_EASE_FACTOR);
    });
  });

  describe('Rating: AGAIN (Lapse)', () => {
    it('resets interval to 1 day and drops ease factor', () => {
      const p = createMockProblem({
        currentIntervalDays: 14,
        easeFactor: 2.5,
        consecutiveSuccesses: 3,
        reviewCount: 3,
        successfulReviews: 3,
      });

      const { updatedProblem, reviewLog } = calculateNextReview(p, 'AGAIN', BASE_DATE);

      expect(updatedProblem.currentIntervalDays).toBe(1);
      expect(updatedProblem.nextReviewAt).toBe('2026-10-02');
      expect(updatedProblem.easeFactor).toBe(2.3);
      expect(updatedProblem.consecutiveSuccesses).toBe(0);
      expect(updatedProblem.failedReviews).toBe(1);
      expect(updatedProblem.status).toBe('LEARNING');

      expect(reviewLog.rating).toBe('AGAIN');
      expect(reviewLog.newInterval).toBe(1);
    });
  });

  describe('Rating: GOOD (Standard recall)', () => {
    it('expands interval by ease factor and maintains ease factor', () => {
      const p = createMockProblem({
        currentIntervalDays: 6,
        easeFactor: 2.5,
        consecutiveSuccesses: 2,
      });

      const { updatedProblem, reviewLog } = calculateNextReview(p, 'GOOD', BASE_DATE);

      expect(updatedProblem.currentIntervalDays).toBe(15);
      expect(updatedProblem.nextReviewAt).toBe('2026-10-16');
      expect(updatedProblem.easeFactor).toBe(2.5);
      expect(updatedProblem.consecutiveSuccesses).toBe(3);
      expect(updatedProblem.status).toBe('REVIEWING');

      expect(reviewLog.rating).toBe('GOOD');
      expect(reviewLog.newInterval).toBe(15);
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
