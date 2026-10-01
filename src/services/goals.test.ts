import { describe, it, expect } from 'vitest';
import { calculateGoalProgress, getTodayMetrics } from './goals';
import type { StudyGoal, Question, StudySessionRecord, MockTestRecord, DailyTargetsConfig } from '../types';

describe('Part 8: Goals & Daily Targets Service', () => {
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      title: 'Valid Palindrome',
      subject: 'DSA',
      topicId: 'top-1',
      topicName: 'Two Pointers',
      difficulty: 'Easy',
      pattern: 'Two Pointers',
      source: 'LeetCode',
      tags: [],
      notes: '',
      status: 'MASTERED',
      mastery: 5,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewCount: 3,
      successfulReviews: 3,
      failedReviews: 0,
      consecutiveSuccesses: 3,
      currentIntervalDays: 15,
      easeFactor: 2.6,
      reviewHistory: [
        {
          id: 'r1',
          questionId: 'q1',
          reviewedAt: new Date().toISOString(),
          rating: 'GOOD',
          previousInterval: 5,
          newInterval: 15,
          previousEaseFactor: 2.5,
          newEaseFactor: 2.6,
          previousMastery: 4,
          newMastery: 5,
          timeSpentSeconds: 600, // 10 mins
        },
      ],
    },
    {
      id: 'q2',
      title: 'Longest Substring',
      subject: 'DSA',
      topicId: 'top-2',
      topicName: 'Sliding Window',
      difficulty: 'Medium',
      pattern: 'Sliding Window',
      source: 'LeetCode',
      tags: [],
      notes: '',
      status: 'LEARNING',
      mastery: 2,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewCount: 1,
      successfulReviews: 1,
      failedReviews: 0,
      consecutiveSuccesses: 1,
      currentIntervalDays: 1,
      easeFactor: 2.5,
      reviewHistory: [],
    },
  ];

  const sampleSessions: StudySessionRecord[] = [
    {
      id: 'sess-1',
      topicName: 'Sliding Window',
      activity: 'Problem Solving',
      durationSeconds: 3600, // 1 hour = 60 mins
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    },
  ];

  const sampleMocks: MockTestRecord[] = [
    {
      id: 'm1',
      title: 'Saturday Mock',
      completedAt: new Date().toISOString(),
      timeLimitMinutes: 60,
      timeSpentSeconds: 1800, // 30 mins
      totalQuestions: 2,
      score: 90,
      accuracyPercent: 100,
      solvedCount: 2,
      partiallySolvedCount: 0,
      failedCount: 0,
      difficultyBreakdown: {
        easy: { total: 1, solved: 1 },
        medium: { total: 1, solved: 1 },
        hard: { total: 0, solved: 0 },
      },
      patternBreakdown: [],
      questionResults: [],
    },
  ];

  describe('calculateGoalProgress', () => {
    it('calculates DSA_QUESTIONS goal progress correctly', () => {
      const goal: StudyGoal = {
        id: 'g1',
        title: 'Solve 10 Questions',
        horizon: 'WEEKLY',
        type: 'DSA_QUESTIONS',
        targetValue: 10,
        unit: 'questions',
        autoTrack: true,
        isCompleted: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const result = calculateGoalProgress(goal, sampleQuestions, sampleSessions, sampleMocks);
      expect(result.currentValue).toBe(2);
      expect(result.progressPercent).toBe(20);
      expect(result.isCompleted).toBe(false);
    });

    it('calculates MASTERED_PATTERNS goal progress correctly', () => {
      const goal: StudyGoal = {
        id: 'g2',
        title: 'Master 5 Patterns',
        horizon: 'MONTHLY',
        type: 'MASTERED_PATTERNS',
        targetValue: 5,
        unit: 'patterns',
        autoTrack: true,
        isCompleted: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const result = calculateGoalProgress(goal, sampleQuestions, sampleSessions, sampleMocks);
      // Only 'Two Pointers' has a status === 'MASTERED'
      expect(result.currentValue).toBe(1);
      expect(result.progressPercent).toBe(20);
    });

    it('calculates CONTESTS goal progress correctly', () => {
      const goal: StudyGoal = {
        id: 'g3',
        title: 'Complete 2 Contests',
        horizon: 'MONTHLY',
        type: 'CONTESTS',
        targetValue: 2,
        unit: 'contests',
        autoTrack: true,
        isCompleted: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const result = calculateGoalProgress(goal, sampleQuestions, sampleSessions, sampleMocks);
      expect(result.currentValue).toBe(1);
      expect(result.progressPercent).toBe(50);
    });

    it('supports custom manual tracking goals', () => {
      const goal: StudyGoal = {
        id: 'g4',
        title: 'Reach 1800 Rating',
        horizon: 'YEARLY',
        type: 'CUSTOM',
        targetValue: 1800,
        unit: 'rating',
        autoTrack: false,
        currentValue: 1650,
        isCompleted: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const result = calculateGoalProgress(goal, sampleQuestions, sampleSessions, sampleMocks);
      expect(result.currentValue).toBe(1650);
      expect(result.progressPercent).toBe(92);
      expect(result.isCompleted).toBe(false);
    });
  });

  describe('getTodayMetrics', () => {
    it('computes today progress from new questions, revisions, and study sessions', () => {
      const targets: DailyTargetsConfig = {
        newQuestionsTarget: 3,
        revisionsTarget: 5,
        studyTimeTargetMinutes: 90,
      };

      const todayMetrics = getTodayMetrics(targets, sampleQuestions, sampleSessions, 4);

      expect(todayMetrics.newQuestionsCompleted).toBe(2);
      expect(todayMetrics.revisionsCompleted).toBe(1);
      // 10 mins SRS + 60 mins session = 70 mins
      expect(todayMetrics.studyTimeCompletedMinutes).toBe(70);
      expect(todayMetrics.streakDays).toBe(4);
    });
  });
});
