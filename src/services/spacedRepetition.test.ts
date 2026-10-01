import { describe, it, expect } from 'vitest';
import type { Question } from '../types';
import {
  scheduleInitialLearning,
  calculateNextReview,
  isQuestionDue,
  isQuestionOverdue,
  getDueToday,
  getOverdue,
  getUpcoming,
  getRecentlyReviewed,
  getSpacedRepetitionStats,
  normalizeDate,
  addDays,
  daysBetween,
  SR_CONSTANTS,
} from './spacedRepetition';

const createMockQuestion = (overrides?: Partial<Question>): Question => ({
  id: 'test-q-1',
  title: 'Two Sum',
  subject: 'Data Structures & Algorithms',
  topicId: 'top-1',
  topicName: 'Arrays & Hashing',
  difficulty: 'Medium',
  pattern: 'Two Pointers',
  source: 'LeetCode',
  tags: ['Array', 'Hash Table'],
  notes: 'Use a hash map to store complements.',
  status: 'NEW',
  mastery: 0,
  isArchived: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  reviewCount: 0,
  successfulReviews: 0,
  failedReviews: 0,
  consecutiveSuccesses: 0,
  currentIntervalDays: 0,
  easeFactor: 2.50,
  reviewHistory: [],
  ...overrides,
});

describe('Spaced Repetition Engine (SM-2 Adaptative)', () => {
  const BASE_DATE = '2026-10-01';

  describe('Date Utilities', () => {
    it('normalizes Date objects and strings to YYYY-MM-DD', () => {
      expect(normalizeDate(new Date(2026, 9, 1))).toBe('2026-10-01');
      expect(normalizeDate('2026-10-01T15:30:00.000Z')).toBe('2026-10-01');
      expect(normalizeDate('2026-10-01')).toBe('2026-10-01');
    });

    it('adds days correctly across month and year boundaries', () => {
      expect(addDays('2026-10-01', 5)).toBe('2026-10-06');
      expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
      expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
    });

    it('calculates calendar days difference accurately', () => {
      expect(daysBetween('2026-10-01', '2026-10-06')).toBe(5);
      expect(daysBetween('2026-10-06', '2026-10-01')).toBe(-5);
      expect(daysBetween('2026-10-01', '2026-10-01')).toBe(0);
    });
  });

  describe('Initial Learning Schedule', () => {
    it('schedules a new medium question for review in 1 day', () => {
      const q = createMockQuestion({ difficulty: 'Medium' });
      const scheduled = scheduleInitialLearning(q, BASE_DATE);

      expect(scheduled.status).toBe('LEARNING');
      expect(scheduled.currentIntervalDays).toBe(1);
      expect(scheduled.nextReviewAt).toBe('2026-10-02');
      expect(scheduled.easeFactor).toBe(SR_CONSTANTS.DEFAULT_EASE_FACTOR);
      expect(scheduled.reviewCount).toBe(0);
      expect(scheduled.consecutiveSuccesses).toBe(0);
      expect(scheduled.mastery).toBeGreaterThanOrEqual(1);
    });

    it('schedules an easy question for initial review in 1 day', () => {
      const q = createMockQuestion({ difficulty: 'Easy' });
      const scheduled = scheduleInitialLearning(q, BASE_DATE);

      expect(scheduled.currentIntervalDays).toBe(1);
      expect(scheduled.nextReviewAt).toBe('2026-10-02');
    });
  });

  describe('Rating: AGAIN (Lapse)', () => {
    it('resets interval to 1 day, drops ease factor, decreases mastery, and marks failed review', () => {
      const q = createMockQuestion({
        currentIntervalDays: 14,
        easeFactor: 2.50,
        consecutiveSuccesses: 3,
        mastery: 4,
        reviewCount: 3,
        successfulReviews: 3,
        failedReviews: 0,
        status: 'REVIEWING',
      });

      const { updatedQuestion, reviewLog } = calculateNextReview(q, 'AGAIN', BASE_DATE);

      expect(updatedQuestion.currentIntervalDays).toBe(1);
      expect(updatedQuestion.nextReviewAt).toBe('2026-10-02');
      expect(updatedQuestion.easeFactor).toBe(2.30); // 2.50 - 0.20
      expect(updatedQuestion.consecutiveSuccesses).toBe(0);
      expect(updatedQuestion.failedReviews).toBe(1);
      expect(updatedQuestion.successfulReviews).toBe(3);
      expect(updatedQuestion.reviewCount).toBe(4);
      expect(updatedQuestion.mastery).toBe(3); // 4 - 1
      expect(updatedQuestion.status).toBe('LEARNING');

      expect(reviewLog.rating).toBe('AGAIN');
      expect(reviewLog.previousInterval).toBe(14);
      expect(reviewLog.newInterval).toBe(1);
      expect(reviewLog.previousEaseFactor).toBe(2.50);
      expect(reviewLog.newEaseFactor).toBe(2.30);
    });

    it('does not let ease factor drop below MIN_EASE_FACTOR (1.30)', () => {
      const q = createMockQuestion({
        easeFactor: 1.40,
        mastery: 0,
      });

      const { updatedQuestion } = calculateNextReview(q, 'AGAIN', BASE_DATE);
      expect(updatedQuestion.easeFactor).toBe(1.30);
      expect(updatedQuestion.mastery).toBe(0); // cannot go below 0
    });
  });

  describe('Rating: HARD (Difficult recall)', () => {
    it('applies a conservative interval multiplier (1.2x) and slightly reduces ease factor', () => {
      const q = createMockQuestion({
        currentIntervalDays: 5,
        easeFactor: 2.50,
        consecutiveSuccesses: 1,
        mastery: 2,
        status: 'REVIEWING',
      });

      const { updatedQuestion, reviewLog } = calculateNextReview(q, 'HARD', BASE_DATE);

      expect(updatedQuestion.currentIntervalDays).toBe(6); // round(5 * 1.2) = 6
      expect(updatedQuestion.nextReviewAt).toBe('2026-10-07');
      expect(updatedQuestion.easeFactor).toBe(2.35); // 2.50 - 0.15
      expect(updatedQuestion.consecutiveSuccesses).toBe(2);
      expect(updatedQuestion.successfulReviews).toBe(1);
      expect(updatedQuestion.status).toBe('REVIEWING');

      expect(reviewLog.rating).toBe('HARD');
      expect(reviewLog.previousInterval).toBe(5);
      expect(reviewLog.newInterval).toBe(6);
    });
  });

  describe('Rating: GOOD (Standard recall)', () => {
    it('expands interval by ease factor and maintains ease factor', () => {
      const q = createMockQuestion({
        currentIntervalDays: 6,
        easeFactor: 2.50,
        consecutiveSuccesses: 2,
        mastery: 3,
        status: 'REVIEWING',
      });

      const { updatedQuestion, reviewLog } = calculateNextReview(q, 'GOOD', BASE_DATE);

      // 6 * 2.50 = 15 days
      expect(updatedQuestion.currentIntervalDays).toBe(15);
      expect(updatedQuestion.nextReviewAt).toBe('2026-10-16');
      expect(updatedQuestion.easeFactor).toBe(2.50);
      expect(updatedQuestion.consecutiveSuccesses).toBe(3);
      expect(updatedQuestion.mastery).toBe(4);
      expect(updatedQuestion.status).toBe('REVIEWING');

      expect(reviewLog.rating).toBe('GOOD');
      expect(reviewLog.previousInterval).toBe(6);
      expect(reviewLog.newInterval).toBe(15);
    });
  });

  describe('Rating: EASY (Effortless recall)', () => {
    it('increases ease factor and applies easy bonus multiplier (1.30x)', () => {
      const q = createMockQuestion({
        currentIntervalDays: 6,
        easeFactor: 2.50,
        consecutiveSuccesses: 2,
        mastery: 3,
        status: 'REVIEWING',
      });

      const { updatedQuestion, reviewLog } = calculateNextReview(q, 'EASY', BASE_DATE);

      // 6 * 2.65 (new EF) * 1.30 = 20.67 -> 21 days
      expect(updatedQuestion.currentIntervalDays).toBe(21);
      expect(updatedQuestion.nextReviewAt).toBe('2026-10-22');
      expect(updatedQuestion.easeFactor).toBe(2.65); // 2.50 + 0.15
      expect(updatedQuestion.consecutiveSuccesses).toBe(3);
      expect(updatedQuestion.mastery).toBe(4);
      expect(updatedQuestion.status).toBe('MASTERED');

      expect(reviewLog.rating).toBe('EASY');
    });

    it('does not exceed MAX_EASE_FACTOR (3.00)', () => {
      const q = createMockQuestion({
        currentIntervalDays: 10,
        easeFactor: 2.95,
        consecutiveSuccesses: 2,
        mastery: 4,
      });

      const { updatedQuestion } = calculateNextReview(q, 'EASY', BASE_DATE);
      expect(updatedQuestion.easeFactor).toBe(3.00);
    });
  });

  describe('Mastered State Progression', () => {
    it('does NOT mark a new question as MASTERED after a single review', () => {
      const q = scheduleInitialLearning(createMockQuestion(), BASE_DATE);
      const { updatedQuestion } = calculateNextReview(q, 'EASY', BASE_DATE);

      expect(updatedQuestion.status).not.toBe('MASTERED');
      expect(updatedQuestion.status).toBe('REVIEWING');
    });

    it('transitions to MASTERED only after repeated successful reviews reach threshold interval and mastery', () => {
      let q = scheduleInitialLearning(createMockQuestion(), '2026-09-01');

      // Review 1 (Day 1) -> GOOD (interval: 3 days)
      let res = calculateNextReview(q, 'GOOD', '2026-09-02');
      q = res.updatedQuestion;
      expect(q.currentIntervalDays).toBe(3);
      expect(q.status).toBe('REVIEWING');

      // Review 2 (Day 5) -> GOOD (interval: 8 days)
      res = calculateNextReview(q, 'GOOD', '2026-09-05');
      q = res.updatedQuestion;
      expect(q.currentIntervalDays).toBe(8);
      expect(q.status).toBe('REVIEWING');

      // Review 3 (Day 15) -> GOOD (interval expands: 8 * 2.5 = 20 days)
      res = calculateNextReview(q, 'GOOD', '2026-09-15');
      q = res.updatedQuestion;
      expect(q.currentIntervalDays).toBe(20);
      expect(q.status).toBe('REVIEWING');

      // Review 4 (Day 35) -> GOOD (interval expands: 20 * 2.5 = 50 days, >= 21 threshold, consecutive >= 3, mastery >= 4)
      res = calculateNextReview(q, 'GOOD', '2026-10-05');
      q = res.updatedQuestion;
      expect(q.currentIntervalDays).toBe(50);
      expect(q.consecutiveSuccesses).toBe(4);
      expect(q.mastery).toBe(5);
      expect(q.status).toBe('MASTERED');
    });
  });

  describe('Repeated Failures / Lapses', () => {
    it('handles multiple consecutive lapses gracefully down to minimum ease factor', () => {
      let q = createMockQuestion({
        currentIntervalDays: 10,
        easeFactor: 2.00,
        mastery: 3,
      });

      // 4 lapses
      for (let i = 0; i < 4; i++) {
        const res = calculateNextReview(q, 'AGAIN', BASE_DATE);
        q = res.updatedQuestion;
      }

      expect(q.currentIntervalDays).toBe(1);
      expect(q.easeFactor).toBe(1.30); // Capped at MIN_EASE_FACTOR
      expect(q.consecutiveSuccesses).toBe(0);
      expect(q.failedReviews).toBe(4);
      expect(q.mastery).toBe(0);
      expect(q.status).toBe('LEARNING');
      expect(q.reviewHistory.length).toBe(4);
    });
  });

  describe('Due, Overdue, and Upcoming Queries', () => {
    const qDueToday = createMockQuestion({ id: 'q-today', nextReviewAt: '2026-10-01' });
    const qOverdue = createMockQuestion({ id: 'q-overdue', nextReviewAt: '2026-09-28' });
    const qUpcomingTomorrow = createMockQuestion({ id: 'q-up-1', nextReviewAt: '2026-10-02' });
    const qUpcomingFar = createMockQuestion({ id: 'q-up-far', nextReviewAt: '2026-10-15' });
    const qArchivedDue = createMockQuestion({ id: 'q-archived', nextReviewAt: '2026-10-01', isArchived: true });

    const allQuestions = [qDueToday, qOverdue, qUpcomingTomorrow, qUpcomingFar, qArchivedDue];

    it('identifies due questions correctly (today or past, non-archived)', () => {
      expect(isQuestionDue(qDueToday, '2026-10-01')).toBe(true);
      expect(isQuestionDue(qOverdue, '2026-10-01')).toBe(true);
      expect(isQuestionDue(qUpcomingTomorrow, '2026-10-01')).toBe(false);
      expect(isQuestionDue(qArchivedDue, '2026-10-01')).toBe(false);

      const dueList = getDueToday(allQuestions, '2026-10-01');
      expect(dueList.map((q) => q.id)).toEqual(['q-today', 'q-overdue']);
    });

    it('identifies strictly overdue questions correctly', () => {
      expect(isQuestionOverdue(qOverdue, '2026-10-01')).toBe(true);
      expect(isQuestionOverdue(qDueToday, '2026-10-01')).toBe(false);

      const overdueList = getOverdue(allQuestions, '2026-10-01');
      expect(overdueList.map((q) => q.id)).toEqual(['q-overdue']);
    });

    it('identifies upcoming questions in a 7-day window', () => {
      const upcomingList = getUpcoming(allQuestions, 7, '2026-10-01');
      expect(upcomingList.map((q) => q.id)).toEqual(['q-up-1']);
    });

    it('computes accurate spaced repetition statistics', () => {
      const stats = getSpacedRepetitionStats(allQuestions, '2026-10-01');

      expect(stats.totalActive).toBe(4);
      expect(stats.dueTodayCount).toBe(2);
      expect(stats.overdueCount).toBe(1);
      expect(stats.upcomingCount).toBe(1);
    });

    it('sorts recently reviewed questions properly', () => {
      const qRevRecent = createMockQuestion({ id: 'recent', lastReviewedAt: '2026-10-01T12:00:00Z' });
      const qRevOlder = createMockQuestion({ id: 'older', lastReviewedAt: '2026-09-20T12:00:00Z' });
      const qRevNone = createMockQuestion({ id: 'none' });

      const sorted = getRecentlyReviewed([qRevOlder, qRevNone, qRevRecent]);
      expect(sorted.map((q) => q.id)).toEqual(['recent', 'older']);
    });
  });
});
