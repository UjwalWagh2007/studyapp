import { describe, it, expect } from 'vitest';
import {
  calculateOverviewMetrics,
  calculateSkillsAnalysis,
  calculateStudyTrends,
  calculateCodingInsights,
} from './insightsService';
import type { Question, Topic, StudySessionRecord, PlatformAccount, ContestRecord } from '../types';

describe('Part 11: Unified Insights & Analytics Service', () => {
  describe('calculateOverviewMetrics', () => {
    it('returns zeroes and null accuracy when there is no activity', () => {
      const result = calculateOverviewMetrics([], [], []);
      expect(result.totalStudyHours).toBe(0);
      expect(result.totalQuestions).toBe(0);
      expect(result.overallMasteryPercent).toBe(0);
      expect(result.revisionAccuracyPercent).toBeNull();
      expect(result.totalPlatformSolved).toBe(0);
    });

    it('accurately computes study hours, mastery percentage, and revision accuracy', () => {
      const mockQuestions = [
        {
          id: 'q1',
          title: 'Problem 1',
          subject: 'DSA',
          topicId: 't1',
          difficulty: 'Easy',
          pattern: 'Sliding Window',
          source: 'LeetCode',
          tags: [],
          status: 'MASTERED',
          mastery: 5,
          isArchived: false,
          createdAt: '',
          updatedAt: '',
          reviewHistory: [
            { id: 'r1', questionId: 'q1', reviewedAt: '', rating: 'EASY', previousInterval: 1, newInterval: 6, previousEaseFactor: 2.5, newEaseFactor: 2.6, previousMastery: 3, newMastery: 4, timeSpentSeconds: 60 },
            { id: 'r2', questionId: 'q1', reviewedAt: '', rating: 'GOOD', previousInterval: 6, newInterval: 15, previousEaseFactor: 2.6, newEaseFactor: 2.6, previousMastery: 4, newMastery: 5, timeSpentSeconds: 60 },
          ],
        },
        {
          id: 'q2',
          title: 'Problem 2',
          subject: 'DSA',
          topicId: 't1',
          difficulty: 'Hard',
          pattern: 'Dynamic Programming',
          source: 'LeetCode',
          tags: [],
          status: 'LEARNING',
          mastery: 2,
          isArchived: false,
          createdAt: '',
          updatedAt: '',
          reviewHistory: [
            { id: 'r3', questionId: 'q2', reviewedAt: '', rating: 'AGAIN', previousInterval: 1, newInterval: 1, previousEaseFactor: 2.5, newEaseFactor: 2.3, previousMastery: 2, newMastery: 2, timeSpentSeconds: 60 },
          ],
        },
      ] as unknown as Question[];

      const mockSessions: StudySessionRecord[] = [
        { id: 's1', topicName: 'DSA', activity: 'Problem Solving', durationSeconds: 3600, startedAt: '2026-10-01T10:00:00.000Z', endedAt: '2026-10-01T11:00:00.000Z' },
        { id: 's2', topicName: 'DSA', activity: 'Theory & Invariants', durationSeconds: 1800, startedAt: '2026-10-01T14:00:00.000Z', endedAt: '2026-10-01T14:30:00.000Z' },
      ];

      const mockPlatforms: PlatformAccount[] = [
        {
          id: 'leetcode',
          name: 'LeetCode',
          handle: 'ujwal',
          isConnected: true,
          status: 'CONNECTED',
          totalSolved: 350,
          difficultyBreakdown: { easy: 100, medium: 200, hard: 50 },
          streakDays: 10,
          contestsAttended: 5,
          ratingHistory: [],
          recentSubmissions: [],
        },
      ];

      const result = calculateOverviewMetrics(mockQuestions, mockSessions, mockPlatforms, 12, 18);

      expect(result.totalStudyHours).toBe(1.5); // (3600 + 1800) / 3600 = 1.5h
      expect(result.totalQuestions).toBe(2);
      expect(result.masteredQuestionsCount).toBe(1);
      expect(result.overallMasteryPercent).toBe(50); // 1 of 2 is Mastered
      expect(result.totalReviewsCompleted).toBe(3);
      expect(result.revisionAccuracyPercent).toBe(67); // 2 success out of 3 reviews = 66.6% -> 67%
      expect(result.totalPlatformSolved).toBe(350);
      expect(result.currentStreak).toBe(12);
      expect(result.bestStreak).toBe(18);
    });
  });

  describe('calculateSkillsAnalysis', () => {
    it('detects weak patterns and identifies sample size flags honestly', () => {
      const mockTopics: Topic[] = [
        { id: 't-dp', name: 'Dynamic Programming', subject: 'DSA', isArchived: false, createdAt: '', updatedAt: '' },
      ];

      const mockQuestions = [
        {
          id: 'q-dp-1',
          title: 'Coin Change',
          subject: 'DSA',
          topicId: 't-dp',
          difficulty: 'Medium',
          pattern: '0/1 Knapsack',
          source: 'LeetCode',
          tags: [],
          status: 'LEARNING',
          mastery: 2,
          isArchived: false,
          createdAt: '',
          updatedAt: '',
          failedReviews: 3,
          reviewHistory: [
            { id: 'r1', questionId: 'q-dp-1', reviewedAt: '', rating: 'AGAIN', previousInterval: 1, newInterval: 1, previousEaseFactor: 2.5, newEaseFactor: 2.3, previousMastery: 2, newMastery: 2 },
            { id: 'r2', questionId: 'q-dp-1', reviewedAt: '', rating: 'HARD', previousInterval: 1, newInterval: 1, previousEaseFactor: 2.3, newEaseFactor: 2.15, previousMastery: 2, newMastery: 2 },
          ],
        },
      ] as unknown as Question[];

      const result = calculateSkillsAnalysis(mockTopics, mockQuestions);

      expect(result.topicSkills.length).toBe(1);
      expect(result.topicSkills[0].topicName).toBe('Dynamic Programming');
      expect(result.topicSkills[0].averageMastery).toBe(2);
      expect(result.topicSkills[0].isWeakArea).toBe(true);

      expect(result.patternSkills.length).toBe(1);
      expect(result.patternSkills[0].pattern).toBe('0/1 Knapsack');
      expect(result.patternSkills[0].accuracyPercent).toBe(0);
      expect(result.patternSkills[0].isWeakArea).toBe(true);
      expect(result.patternSkills[0].sampleSizeWarning).toBe(true); // only 2 reviews logged (< 3)
    });
  });

  describe('calculateStudyTrends', () => {
    it('computes 7-day daily study breakdown and retention rate', () => {
      const todayIso = new Date().toISOString();
      const mockSessions: StudySessionRecord[] = [
        { id: 's1', topicName: 'Trees', activity: 'Problem Solving', durationSeconds: 2400, startedAt: todayIso, endedAt: todayIso },
      ];

      const mockQuestions = [
        {
          id: 'q1',
          title: 'Tree Traversal',
          subject: 'DSA',
          topicId: 't1',
          difficulty: 'Easy',
          pattern: 'DFS',
          source: 'LeetCode',
          tags: [],
          status: 'REVIEWING',
          mastery: 3,
          isArchived: false,
          createdAt: '',
          updatedAt: '',
          reviewHistory: [
            { id: 'r1', questionId: 'q1', reviewedAt: '', rating: 'GOOD', previousInterval: 1, newInterval: 6, previousEaseFactor: 2.5, newEaseFactor: 2.5, previousMastery: 2, newMastery: 3 },
          ],
        },
      ] as unknown as Question[];

      const result = calculateStudyTrends(mockQuestions, mockSessions);

      expect(result.dailyStudyMinutesLast7Days.length).toBe(7);
      expect(result.retentionRatePercent).toBe(100);
      expect(result.questionsLearnedCount).toBe(1);
      expect(result.questionsNewCount).toBe(0);
    });
  });

  describe('calculateCodingInsights', () => {
    it('aggregates cross-platform solved counts and contest participation', () => {
      const mockPlatforms: PlatformAccount[] = [
        {
          id: 'codeforces',
          name: 'Codeforces',
          handle: 'tourist',
          isConnected: true,
          status: 'CONNECTED',
          totalSolved: 120,
          currentRating: 1650,
          maxRating: 1720,
          difficultyBreakdown: { easy: 50, medium: 50, hard: 20 },
          streakDays: 5,
          contestsAttended: 8,
          ratingHistory: [],
          recentSubmissions: [],
        },
      ];

      const mockContests: ContestRecord[] = [
        {
          id: 'c1',
          platform: 'codeforces',
          platformName: 'Codeforces',
          contestName: 'CF Round 900',
          date: '2026-09-20T10:00:00.000Z',
          rank: 1100,
          ratingBefore: 1600,
          ratingAfter: 1650,
          ratingChange: +50,
          problemsSolved: 4,
          totalProblems: 6,
        },
      ];

      const result = calculateCodingInsights(mockPlatforms, mockContests);

      expect(result.totalSolvedAcrossPlatforms).toBe(120);
      expect(result.totalContestsAttended).toBe(1);
      expect(result.peakContestRating).toBe(1720);
      expect(result.latestRatingDeltas.length).toBe(1);
      expect(result.latestRatingDeltas[0].ratingChange).toBe(50);
    });
  });
});
