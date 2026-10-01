import { describe, it, expect } from 'vitest';
import {
  calculateQuestionMockWeight,
  getDifficultySlotTargets,
  generateMockTest,
  calculateMockResults,
} from './mockTest';
import type { Question, MockTestConfig, MistakeEntry, MockQuestionResult } from '../types';

describe('Part 7: Mock Test Service Engine', () => {
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      title: 'Valid Palindrome',
      subject: 'Data Structures & Algorithms',
      topicId: 'top-tp',
      topicName: 'Two Pointers',
      difficulty: 'Easy',
      pattern: 'Two Pointers',
      source: 'LeetCode',
      tags: ['String'],
      notes: 'Notes',
      status: 'LEARNING',
      mastery: 2,
      isArchived: false,
      createdAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
      reviewCount: 2,
      successfulReviews: 1,
      failedReviews: 1,
      consecutiveSuccesses: 1,
      currentIntervalDays: 1,
      easeFactor: 2.30,
      reviewHistory: [],
    },
    {
      id: 'q2',
      title: 'Longest Substring Without Repeating Characters',
      subject: 'Data Structures & Algorithms',
      topicId: 'top-sw',
      topicName: 'Sliding Window',
      difficulty: 'Medium',
      pattern: 'Sliding Window',
      source: 'LeetCode',
      tags: ['Hash Table', 'Sliding Window'],
      notes: 'Notes',
      status: 'REVIEWING',
      mastery: 3,
      isArchived: false,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
      reviewCount: 3,
      successfulReviews: 2,
      failedReviews: 1,
      consecutiveSuccesses: 2,
      currentIntervalDays: 3,
      easeFactor: 2.40,
      reviewHistory: [],
    },
    {
      id: 'q3',
      title: 'Course Schedule II',
      subject: 'Data Structures & Algorithms',
      topicId: 'top-graphs',
      topicName: 'Graphs',
      difficulty: 'Medium',
      pattern: 'Topological Sort',
      source: 'LeetCode',
      tags: ['Graph'],
      notes: 'Notes',
      status: 'LEARNING',
      mastery: 1,
      isArchived: false,
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
      reviewCount: 2,
      successfulReviews: 0,
      failedReviews: 2,
      consecutiveSuccesses: 0,
      currentIntervalDays: 1,
      easeFactor: 2.10,
      reviewHistory: [],
    },
    {
      id: 'q4',
      title: 'Trapping Rain Water',
      subject: 'Data Structures & Algorithms',
      topicId: 'top-tp',
      topicName: 'Two Pointers',
      difficulty: 'Hard',
      pattern: 'Two Pointers',
      source: 'LeetCode',
      tags: ['Array'],
      notes: 'Notes',
      status: 'MASTERED',
      mastery: 5,
      isArchived: false,
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      reviewCount: 5,
      successfulReviews: 5,
      failedReviews: 0,
      consecutiveSuccesses: 5,
      currentIntervalDays: 21,
      easeFactor: 2.65,
      reviewHistory: [],
    },
    {
      id: 'q-archived',
      title: 'Archived Question',
      subject: 'Data Structures & Algorithms',
      topicId: 'top-tp',
      topicName: 'Two Pointers',
      difficulty: 'Easy',
      pattern: 'Two Pointers',
      source: 'LeetCode',
      tags: [],
      notes: '',
      status: 'ARCHIVED',
      mastery: 1,
      isArchived: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      reviewCount: 0,
      successfulReviews: 0,
      failedReviews: 0,
      consecutiveSuccesses: 0,
      currentIntervalDays: 0,
      easeFactor: 2.50,
      reviewHistory: [],
    },
  ];

  const sampleMistakes: MistakeEntry[] = [
    {
      id: 'm1',
      questionId: 'q3',
      questionTitle: 'Course Schedule II',
      category: 'Logic error',
      notes: 'Forgot cycle check in Kahn algorithm',
      isResolved: false,
      createdAt: '2026-09-26T00:00:00.000Z',
    },
  ];

  describe('calculateQuestionMockWeight', () => {
    it('gives higher priority weight to difficult/failed questions with unresolved mistakes', () => {
      const weightQ3 = calculateQuestionMockWeight(sampleQuestions[2], sampleMistakes);
      const weightQ4Mastered = calculateQuestionMockWeight(sampleQuestions[3], sampleMistakes);

      expect(weightQ3).toBeGreaterThan(weightQ4Mastered);
    });
  });

  describe('getDifficultySlotTargets', () => {
    it('calculates balanced quotas for standard 4-question mock', () => {
      const slots = getDifficultySlotTargets(4, 'Balanced');
      expect(slots.Easy).toBe(1);
      expect(slots.Medium).toBe(2);
      expect(slots.Hard).toBe(1);
    });

    it('calculates mostly medium quotas', () => {
      const slots = getDifficultySlotTargets(3, 'Mostly Medium');
      expect(slots.Medium).toBe(2);
    });

    it('calculates hard heavy quotas', () => {
      const slots = getDifficultySlotTargets(3, 'Hard Heavy');
      expect(slots.Hard).toBe(2);
    });
  });

  describe('generateMockTest', () => {
    it('filters out archived questions and respects personal database only', () => {
      const config: MockTestConfig = {
        title: 'Saturday Mock',
        questionCount: 4,
        timeLimitMinutes: 60,
        difficultyDistribution: 'Balanced',
        selectedTopicIds: [],
        selectedPatterns: [],
      };

      const { selectedQuestions } = generateMockTest(sampleQuestions, config, sampleMistakes);
      expect(selectedQuestions.some((q) => q.isArchived)).toBe(false);
      expect(selectedQuestions.length).toBe(4);
    });

    it('filters by selected pattern when specified', () => {
      const config: MockTestConfig = {
        title: 'Two Pointers Mock',
        questionCount: 2,
        timeLimitMinutes: 30,
        difficultyDistribution: 'All Difficulties',
        selectedTopicIds: [],
        selectedPatterns: ['Two Pointers'],
      };

      const { selectedQuestions } = generateMockTest(sampleQuestions, config, sampleMistakes);
      expect(selectedQuestions.every((q) => q.pattern === 'Two Pointers')).toBe(true);
      expect(selectedQuestions.length).toBe(2);
    });
  });

  describe('calculateMockResults', () => {
    it('computes correct score, accuracy, difficulty and pattern breakdown', () => {
      const config: MockTestConfig = {
        title: 'Test Mock',
        questionCount: 3,
        timeLimitMinutes: 60,
        difficultyDistribution: 'Balanced',
        selectedTopicIds: [],
        selectedPatterns: [],
      };

      const results: MockQuestionResult[] = [
        {
          questionId: 'q1',
          questionTitle: 'Valid Palindrome',
          difficulty: 'Easy',
          pattern: 'Two Pointers',
          topicName: 'Two Pointers',
          outcome: 'SOLVED_CLEANLY',
          timeSpentSeconds: 600,
        },
        {
          questionId: 'q2',
          questionTitle: 'Longest Substring',
          difficulty: 'Medium',
          pattern: 'Sliding Window',
          topicName: 'Sliding Window',
          outcome: 'SOLVED_WITH_HINTS',
          timeSpentSeconds: 900,
        },
        {
          questionId: 'q4',
          questionTitle: 'Trapping Rain Water',
          difficulty: 'Hard',
          pattern: 'Two Pointers',
          topicName: 'Two Pointers',
          outcome: 'COULD_NOT_SOLVE',
          timeSpentSeconds: 1200,
        },
      ];

      const record = calculateMockResults(config, results, 2700);

      expect(record.totalQuestions).toBe(3);
      expect(record.solvedCount).toBe(1);
      expect(record.partiallySolvedCount).toBe(1);
      expect(record.failedCount).toBe(1);
      expect(record.score).toBeGreaterThan(0);
      expect(record.accuracyPercent).toBe(50); // (1 + 0.5) / 3 = 50%
      expect(record.difficultyBreakdown.easy.solved).toBe(1);
      expect(record.difficultyBreakdown.medium.solved).toBe(1);
      expect(record.difficultyBreakdown.hard.solved).toBe(0);
    });
  });
});
