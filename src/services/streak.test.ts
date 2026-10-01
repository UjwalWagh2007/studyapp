import { describe, it, expect } from 'vitest';
import {
  getDayActivitySummary,
  calculateActivityIntensity,
  generateYearConsistencyHeatmapData,
} from './streak';
import type { Question, StudySessionRecord, MockTestRecord, DailyTargetsConfig } from '../types';

describe('Part 8 & Consistency Heatmap: Streak & Meaningful Activity Engine', () => {
  const today = new Date('2026-10-01T12:00:00.000Z');
  const todayStr = '2026-10-01';
  const yesterdayStr = '2026-09-30';
  const twoDaysAgoStr = '2026-09-29';

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      title: 'Question 1',
      subject: 'DSA',
      topicId: 'top-1',
      topicName: 'Two Pointers',
      difficulty: 'Easy',
      pattern: 'Two Pointers',
      source: 'LeetCode',
      tags: [],
      notes: '',
      status: 'LEARNING',
      mastery: 2,
      isArchived: false,
      createdAt: '2026-09-29T10:00:00.000Z', // 2 days ago
      updatedAt: '2026-10-01T10:00:00.000Z',
      reviewCount: 2,
      successfulReviews: 2,
      failedReviews: 0,
      consecutiveSuccesses: 2,
      currentIntervalDays: 3,
      easeFactor: 2.5,
      reviewHistory: [
        {
          id: 'r1',
          questionId: 'q1',
          reviewedAt: '2026-10-01T10:00:00.000Z', // today
          rating: 'GOOD',
          previousInterval: 1,
          newInterval: 3,
          previousEaseFactor: 2.5,
          newEaseFactor: 2.5,
          previousMastery: 1,
          newMastery: 2,
          timeSpentSeconds: 600,
        },
      ],
    },
  ];

  const sampleSessions: StudySessionRecord[] = [
    {
      id: 's1',
      topicName: 'Sliding Window',
      activity: 'Problem Solving',
      durationSeconds: 1800, // 30 mins
      startedAt: '2026-09-30T10:00:00.000Z', // yesterday
      endedAt: '2026-09-30T10:30:00.000Z',
    },
  ];

  const sampleMocks: MockTestRecord[] = [
    {
      id: 'mock-1',
      title: 'Saturday Timed Assessment',
      completedAt: '2026-09-26T11:00:00.000Z',
      timeLimitMinutes: 60,
      totalQuestions: 3,
      timeSpentSeconds: 3600,
      score: 85,
      accuracyPercent: 85,
      solvedCount: 2,
      partiallySolvedCount: 1,
      failedCount: 0,
      difficultyBreakdown: {
        easy: { total: 1, solved: 1 },
        medium: { total: 1, solved: 1 },
        hard: { total: 1, solved: 0 },
      },
      patternBreakdown: [],
      questionResults: [],
    },
  ];

  describe('getDayActivitySummary', () => {
    it('marks day completed if SRS review was logged', () => {
      const summary = getDayActivitySummary(todayStr, sampleQuestions, sampleSessions, sampleMocks);
      expect(summary.isCompleted).toBe(true);
      expect(summary.revisionsCount).toBe(1);
    });

    it('marks day completed if >= 15 mins study session was logged', () => {
      const summary = getDayActivitySummary(yesterdayStr, sampleQuestions, sampleSessions, sampleMocks);
      expect(summary.isCompleted).toBe(true);
      expect(summary.studyMinutes).toBe(30);
    });

    it('marks day completed if new question was created', () => {
      const summary = getDayActivitySummary(twoDaysAgoStr, sampleQuestions, sampleSessions, sampleMocks);
      expect(summary.isCompleted).toBe(true);
      expect(summary.newQuestionsCount).toBe(1);
    });

    it('records mock test activity on completion date', () => {
      const summary = getDayActivitySummary('2026-09-26', sampleQuestions, sampleSessions, sampleMocks);
      expect(summary.isCompleted).toBe(true);
      expect(summary.mockTestsCount).toBe(1);
      expect(summary.studyMinutes).toBe(60);
      expect(summary.mockTestsDetails.length).toBe(1);
    });
  });

  describe('calculateActivityIntensity (Configurable Thresholds)', () => {
    it('returns Level 0 for no logged activity', () => {
      const res = calculateActivityIntensity({
        revisionsCount: 0,
        questionsCount: 0,
        studyMinutes: 0,
        mockTestsCount: 0,
      });
      expect(res.intensity).toBe(0);
      expect(res.intensityLabel).toContain('Level 0');
    });

    it('returns Level 1 for light activity (e.g. 1 revision or 15 mins)', () => {
      const res1 = calculateActivityIntensity({
        revisionsCount: 1,
        questionsCount: 0,
        studyMinutes: 0,
      });
      expect(res1.intensity).toBe(1);

      const res2 = calculateActivityIntensity({
        revisionsCount: 0,
        questionsCount: 0,
        studyMinutes: 20,
      });
      expect(res2.intensity).toBe(1);
    });

    it('returns Level 2 for moderate activity (e.g. 3 revisions or 40m study)', () => {
      const res = calculateActivityIntensity({
        revisionsCount: 3,
        questionsCount: 0,
        studyMinutes: 40,
      });
      expect(res.intensity).toBe(2);
    });

    it('returns Level 3 for strong activity or mock test completion', () => {
      const res1 = calculateActivityIntensity({
        revisionsCount: 6,
        questionsCount: 0,
        studyMinutes: 30,
      });
      expect(res1.intensity).toBe(3);

      const res2 = calculateActivityIntensity({
        revisionsCount: 0,
        questionsCount: 0,
        studyMinutes: 0,
        mockTestsCount: 1,
      });
      expect(res2.intensity).toBe(3);
    });

    it('returns Level 4 for excellent activity or target completion', () => {
      const res1 = calculateActivityIntensity({
        revisionsCount: 12,
        questionsCount: 3,
        studyMinutes: 70,
      });
      expect(res1.intensity).toBe(4);

      const res2 = calculateActivityIntensity({
        revisionsCount: 2,
        questionsCount: 1,
        studyMinutes: 30,
        targetMet: true,
      });
      expect(res2.intensity).toBe(4);
      expect(res2.intensityLabel).toContain('Daily Target Met');
    });
  });

  describe('generateYearConsistencyHeatmapData', () => {
    const dailyTargets: DailyTargetsConfig = {
      newQuestionsTarget: 2,
      revisionsTarget: 5,
      studyTimeTargetMinutes: 60,
    };

    it('generates 52 full weeks with 7 day cells per week', () => {
      const data = generateYearConsistencyHeatmapData(
        sampleQuestions,
        sampleSessions,
        sampleMocks,
        dailyTargets,
        today
      );

      expect(data.weeks.length).toBe(52);
      data.weeks.forEach((week) => {
        expect(week.days.length).toBe(7);
      });
      expect(data.monthHeaders.length).toBeGreaterThan(0);
    });

    it('calculates accurate summary stats over the rolling year', () => {
      const data = generateYearConsistencyHeatmapData(
        sampleQuestions,
        sampleSessions,
        sampleMocks,
        dailyTargets,
        today
      );

      expect(data.summary.currentStreak).toBe(3);
      expect(data.summary.longestStreak).toBeGreaterThanOrEqual(3);
      expect(data.summary.activeDaysYear).toBeGreaterThanOrEqual(3);
      expect(data.summary.totalDaysYear).toBeGreaterThan(0);
      expect(data.summary.yearConsistencyPercent).toBeGreaterThan(0);
    });

    it('flags future days correctly without assigning activity intensity', () => {
      const data = generateYearConsistencyHeatmapData(
        sampleQuestions,
        sampleSessions,
        sampleMocks,
        dailyTargets,
        today
      );

      const lastWeek = data.weeks[data.weeks.length - 1];
      const futureDays = lastWeek.days.filter((d) => d && d.isFuture);
      futureDays.forEach((fd) => {
        expect(fd?.intensity).toBe(0);
        expect(fd?.isCompleted).toBe(false);
      });
    });
  });
});
